import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Donation, IDonation } from '../models/Donation.model.js';
import { Campaign } from '../models/Campaign.model.js';
import { createRazorpayOrder, verifyRazorpayPayment } from '../services/razorpay.service.js';
import { generateCertificate } from '../services/pdf.service.js';
import { sendEmail } from '../utils/email.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

interface CreateOrderBody {
  campaignId: string;
  amount: number;
  isAnonymous: boolean;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  donorPan?: string;
}

export const createOrder = async (req: Request<{}, {}, CreateOrderBody>, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { campaignId, amount, isAnonymous, donorName, donorEmail, donorPhone, donorPan } = req.body;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      sendError(res, 'Campaign not found', 404);
      return;
    }

    // Create Razorpay order
    const order = await createRazorpayOrder(amount);

    // Create donation record
    const donation = await Donation.create({
      campaignId,
      donorId: isAnonymous ? null : req.user._id,
      amount,
      isAnonymous,
      paymentMethod: 'razorpay',
      razorpayOrderId: order.id,
      status: 'pending',
      donorName,
      donorEmail,
      donorPhone,
      donorPan,
    });

    sendSuccess(
      res,
      {
        order,
        donationId: donation._id.toString(),
      },
      'Order created successfully'
    );
  } catch (error: any) {
    logger.error('Create order error:', error);
    sendError(res, undefined, 500, error);
  }
};

interface VerifyPaymentBody {
  donationId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

// Retry utility for network failures
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on non-network errors (validation, auth, etc.)
      if (error.statusCode && error.statusCode < 500) {
        throw error;
      }
      
      // Check if it's a network error
      const isNetworkError = 
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNREFUSED');
      
      if (!isNetworkError && attempt < maxRetries - 1) {
        throw error; // Not a network error, don't retry
      }
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`Network error on attempt ${attempt + 1}, retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

export const verifyPayment = async (req: Request<{}, {}, VerifyPaymentBody>, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.user) {
      await session.abortTransaction();
      await session.endSession();
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { donationId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Idempotency check: If payment is already verified, return success
    const existingDonation = await Donation.findById(donationId).session(session);
    if (!existingDonation) {
      await session.abortTransaction();
      await session.endSession();
      sendError(res, 'Donation not found', 404);
      return;
    }

    // Check if already processed
    if (existingDonation.status === 'success' && existingDonation.razorpayPaymentId === razorpayPaymentId) {
      await session.commitTransaction();
      await session.endSession();
      logger.info(`Payment ${razorpayPaymentId} already verified for donation ${donationId}`);
      sendSuccess(res, { donation: existingDonation }, 'Payment already verified');
      return;
    }

    // Prevent duplicate processing
    if (existingDonation.status === 'success' && existingDonation.razorpayPaymentId !== razorpayPaymentId) {
      await session.abortTransaction();
      await session.endSession();
      logger.warn(`Donation ${donationId} already has a different successful payment`);
      sendError(res, 'Donation already has a successful payment', 400);
      return;
    }

    // Verify payment with Razorpay (with retry for network failures)
    const isValid = await retryWithBackoff(
      () => verifyRazorpayPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature),
      3,
      1000
    );

    if (!isValid) {
      existingDonation.status = 'failed';
      await existingDonation.save({ session });
      await session.commitTransaction();
      await session.endSession();
      sendError(res, 'Payment verification failed', 400);
      return;
    }

    // Atomic transaction: Update donation and campaign together
    const certificateNumber = `80G-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    // Update donation within transaction
    existingDonation.status = 'success';
    existingDonation.razorpayPaymentId = razorpayPaymentId;
    existingDonation.razorpaySignature = razorpaySignature;
    existingDonation.certificateNumber = certificateNumber;
    await existingDonation.save({ session });

    // Update campaign within transaction
    const campaign = await Campaign.findById(existingDonation.campaignId).session(session);
    if (campaign) {
      campaign.raisedAmount += existingDonation.amount;
      campaign.donorCount += 1;
      await campaign.save({ session });
    }

    // Commit transaction - all database operations succeed or fail together
    await session.commitTransaction();
    await session.endSession();

    logger.info(`Payment ${razorpayPaymentId} verified successfully for donation ${donationId}`);

    // Reload donation after transaction to get latest data
    const updatedDonation = await Donation.findById(donationId);
    if (!updatedDonation) {
      sendError(res, 'Donation not found after update', 500);
      return;
    }

    // Generate and send certificate (outside transaction - non-critical operation)
    // If this fails, payment is still successful
    try {
      const certificateBuffer = await generateCertificate(updatedDonation);
      const certificateUrl = await uploadCertificate(certificateBuffer, certificateNumber);
      updatedDonation.certificateUrl = certificateUrl;
      updatedDonation.certificateSent = true;
      await updatedDonation.save();

      // Send email with certificate (non-blocking)
      sendEmail({
        to: updatedDonation.donorEmail,
        subject: '80G Tax Exemption Certificate - Engala Trust',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Thank you for your donation!</h2>
            <p>Your 80G tax exemption certificate is attached.</p>
            <p>Certificate Number: ${certificateNumber}</p>
            <p>Donation Amount: ₹${updatedDonation.amount.toLocaleString('en-IN')}</p>
          </div>
        `,
      }).catch((emailError: any) => {
        logger.error('Email sending failed (non-critical):', emailError);
      });
    } catch (certError: any) {
      logger.error('Certificate generation error (non-critical):', certError);
      // Don't fail the request if certificate generation fails
    }

    sendSuccess(res, { donation: updatedDonation }, 'Payment verified successfully');
  } catch (error: any) {
    // Rollback transaction on any error
    await session.abortTransaction();
    await session.endSession();
    
    logger.error('Verify payment error:', error);
    
    // Check if it's a network error
    const isNetworkError = 
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.message?.includes('network') ||
      error.message?.includes('timeout');
    
    if (isNetworkError) {
      sendError(res, 'Network error occurred. Please check your payment status and try again if needed.', 503);
    } else {
      sendError(res, undefined, 500, error);
    }
  }
};

export const getCertificate = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      sendError(res, 'Donation not found', 404);
      return;
    }

    // Check if user owns the donation
    if (donation.donorId && donation.donorId.toString() !== req.user._id.toString()) {
      logger.warn(`Authorization failed: User ${req.user._id} attempted to access donation ${req.params.id} owned by ${donation.donorId}`);
      sendError(res, 'You are not authorized to access this donation certificate. Only the donor can access their own certificate.', 403);
      return;
    }

    if (!donation.certificateUrl) {
      sendError(res, 'Certificate not available', 404);
      return;
    }

    // In a real implementation, you would fetch the PDF from storage
    // For now, generate it on the fly
    const certificateBuffer = await generateCertificate(donation);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="80G-Certificate-${donation.certificateNumber}.pdf"`);
    res.send(certificateBuffer);
  } catch (error: any) {
    logger.error('Get certificate error:', error);
    sendError(res, undefined, 500, error);
  }
};

export const getMyDonations = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const donations = await Donation.find({ donorId: req.user._id })
      .populate('campaignId', 'title coverImage')
      .sort({ createdAt: -1 });

    sendSuccess(res, { donations }, 'Donations retrieved successfully');
  } catch (error: any) {
    logger.error('Get my donations error:', error);
    sendError(res, undefined, 500, error);
  }
};

export const getCampaignDonations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const donations = await Donation.find({ campaignId, status: 'success' })
      .select('donorName amount message createdAt isAnonymous')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    sendSuccess(res, { donations }, 'Donations retrieved successfully');
  } catch (error: any) {
    logger.error('Get campaign donations error:', error);
    sendError(res, undefined, 500, error);
  }
};

// Helper function to upload certificate (placeholder - implement based on your storage)
const uploadCertificate = async (buffer: Buffer, certificateNumber: string): Promise<string> => {
  // This should upload to your storage (S3, Cloudinary, etc.)
  // For now, return a placeholder
  return `certificates/${certificateNumber}.pdf`;
};

