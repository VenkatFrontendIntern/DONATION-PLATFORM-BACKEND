import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Donation } from '../models/Donation.model.js';
import { Campaign } from '../models/Campaign.model.js';
import { 
  createRazorpayOrder, 
  verifyRazorpayWebhookSignature,
} from '../services/razorpay.service.js';
import { generateCertificate } from '../services/pdf.service.js';
import { logger } from '../utils/logger.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { verifyAndProcessPayment, handlePostPaymentSuccess } from '../services/donationProcessing.service.js';
import { processPaymentCapturedWebhook } from '../services/webhook.service.js';

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

    // Validate required fields
    if (!campaignId) {
      sendError(res, 'Campaign ID is required', 400);
      return;
    }

    if (!amount || amount <= 0) {
      sendError(res, 'Valid donation amount is required', 400);
      return;
    }

    if (!donorName || donorName.trim() === '') {
      sendError(res, 'Donor name is required', 400);
      return;
    }

    if (!donorEmail || donorEmail.trim() === '') {
      sendError(res, 'Donor email is required', 400);
      return;
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(donorEmail)) {
      sendError(res, 'Please provide a valid email address', 400);
      return;
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      sendError(res, 'Campaign not found', 404);
      return;
    }

    const order = await createRazorpayOrder(amount);

    // Create donation without razorpayPaymentId - it will be undefined (not null)
    // This prevents sparse index issues with null values
    const donation = await Donation.create({
      campaignId,
      donorId: isAnonymous ? null : req.user._id,
      amount,
      isAnonymous,
      paymentMethod: 'razorpay',
      razorpayOrderId: order.id,
      status: 'pending',
      donorName: donorName.trim(),
      donorEmail: donorEmail.trim().toLowerCase(),
      donorPhone: donorPhone?.trim() || undefined,
      donorPan: donorPan?.trim().toUpperCase() || undefined,
      // Explicitly omit razorpayPaymentId so it's undefined, not null
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
    logger.error('Create order error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      body: req.body,
    });
    
    // Handle duplicate key error for razorpayPaymentId (null values)
    if (error.code === 11000 && error.keyPattern?.razorpayPaymentId) {
      logger.error('Duplicate razorpayPaymentId error - likely sparse index issue with null values');
      logger.error('Please run the database migration script to fix the index');
      sendError(res, 'Database configuration issue detected. Please contact support or try again in a moment.', 500);
      return;
    }
    
    sendError(res, undefined, 500, error);
  }
};

interface VerifyPaymentBody {
  donationId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}


export const verifyPayment = async (req: Request<{}, {}, VerifyPaymentBody>, res: Response): Promise<void> => {
  let session: mongoose.ClientSession | null = null;
  let useTransaction = true;

  try {
    // Attempt to start a transaction session
    // Some MongoDB instances (standalone) don't support transactions
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (transactionError: any) {
      // Check if transaction is not supported (error code 20 or message contains "transaction")
      const isTransactionNotSupported = 
        transactionError.code === 20 ||
        transactionError.message?.toLowerCase().includes('transaction') ||
        transactionError.message?.toLowerCase().includes('standalone');
      
      if (isTransactionNotSupported) {
        logger.warn('MongoDB transactions not supported, falling back to non-transactional mode:', transactionError.message);
        useTransaction = false;
        if (session) {
          await session.endSession();
          session = null;
        }
      } else {
        throw transactionError;
      }
    }

    if (!req.user) {
      if (session) {
        await session.abortTransaction();
        await session.endSession();
      }
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { donationId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const existingDonation = useTransaction && session
      ? await Donation.findById(donationId).session(session)
      : await Donation.findById(donationId);
      
    if (!existingDonation) {
      if (session) {
        await session.abortTransaction();
        await session.endSession();
      }
      sendError(res, 'Donation not found', 404);
      return;
    }

    if (existingDonation.status === 'success' && existingDonation.razorpayPaymentId === razorpayPaymentId) {
      if (session) {
        await session.commitTransaction();
        await session.endSession();
      }
      logger.info(`Payment ${razorpayPaymentId} already verified for donation ${donationId}`);
      sendSuccess(res, { donation: existingDonation }, 'Payment already verified');
      return;
    }

    if (existingDonation.status === 'success' && existingDonation.razorpayPaymentId !== razorpayPaymentId) {
      if (session) {
        await session.abortTransaction();
        await session.endSession();
      }
      logger.warn(`Donation ${donationId} already has a different successful payment`);
      sendError(res, 'Donation already has a successful payment', 400);
      return;
    }

    // Check if this payment ID already exists in another donation
    const existingPaymentDonation = await Donation.findOne({ 
      razorpayPaymentId,
      _id: { $ne: donationId } 
    });
    
    if (existingPaymentDonation) {
      if (existingPaymentDonation.status === 'success') {
        if (session) {
          await session.abortTransaction();
          await session.endSession();
        }
        logger.warn(`Payment ID ${razorpayPaymentId} already used by donation ${existingPaymentDonation._id}`);
        sendError(res, 'This payment has already been processed for another donation', 400);
        return;
      } else {
        // Payment ID exists in a failed/pending donation, allow reusing it
        logger.info(`Payment ID ${razorpayPaymentId} found in ${existingPaymentDonation.status} donation, proceeding with verification`);
      }
    }

    const verificationResult = await verifyAndProcessPayment(
      existingDonation,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      session
    );

    if (!verificationResult.isValid) {
      if (session) {
        await session.commitTransaction();
        await session.endSession();
      }
      sendError(res, verificationResult.error || 'Payment verification failed', 400);
      return;
    }

    if (session) {
      await session.commitTransaction();
      await session.endSession();
    }

    logger.info(`Payment ${razorpayPaymentId} verified successfully for donation ${donationId}`);

    handlePostPaymentSuccess(donationId).catch((error: any) => {
      logger.error('Post-payment processing error (non-critical):', error);
    });

    const updatedDonation = await Donation.findById(donationId);
    if (!updatedDonation) {
      sendError(res, 'Donation not found after update', 500);
      return;
    }

    sendSuccess(res, { donation: updatedDonation }, 'Payment verified successfully');
  } catch (error: any) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        // Ignore abort errors if transaction wasn't started
      }
      await session.endSession();
    }
    
    logger.error('Verify payment error:', error);
    
    // Handle duplicate payment ID errors specifically
    if (error.code === 11000 && error.keyPattern?.razorpayPaymentId) {
      logger.warn(`Duplicate payment ID error: ${error.message}`);
      sendError(res, 'This payment has already been processed. If you closed the payment dialog, please try making a new donation.', 400);
      return;
    }
    
    // Handle custom duplicate payment ID errors from processSuccessfulPayment
    if (error.message?.includes('already been used') || error.message?.includes('already been verified')) {
      sendError(res, error.message || 'This payment has already been processed. Please try making a new donation if needed.', 400);
      return;
    }
    
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

    if (donation.donorId && donation.donorId.toString() !== req.user._id.toString()) {
      logger.warn(`Authorization failed: User ${req.user._id} attempted to access donation ${req.params.id} owned by ${donation.donorId}`);
      sendError(res, 'You are not authorized to access this donation certificate. Only the donor can access their own certificate.', 403);
      return;
    }

    if (!donation.certificateUrl) {
      sendError(res, 'Certificate not available', 404);
      return;
    }

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
export const handleRazorpayWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookBody = JSON.stringify(req.body);

    if (!webhookSignature) {
      logger.warn('Webhook request missing signature');
      sendError(res, 'Missing signature', 400);
      return;
    }

    const isValidSignature = verifyRazorpayWebhookSignature(webhookBody, webhookSignature);
    if (!isValidSignature) {
      logger.warn('Invalid webhook signature');
      sendError(res, 'Invalid signature', 401);
      return;
    }

    const event = req.body;
    logger.info(`Received Razorpay webhook event: ${event.event}`);

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;

      const result = await processPaymentCapturedWebhook(payment, orderId);
      
      if (result.success) {
        sendSuccess(res, { message: result.message }, 'Payment verified');
      } else {
        sendError(res, result.message, 400);
      }
      return;
    } else {
      logger.info(`Unhandled webhook event: ${event.event}`);
      sendSuccess(res, { message: 'Event received' }, 'Webhook received');
    }
  } catch (error: any) {
    logger.error('Webhook handler error:', error);
    sendError(res, undefined, 500, error);
  }
};

