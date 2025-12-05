import { Request, Response } from 'express';
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
    sendError(res, 'Server error', 500, error);
  }
};

interface VerifyPaymentBody {
  donationId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export const verifyPayment = async (req: Request<{}, {}, VerifyPaymentBody>, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { donationId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const donation = await Donation.findById(donationId);
    if (!donation) {
      sendError(res, 'Donation not found', 404);
      return;
    }

    // Verify payment with Razorpay
    const isValid = await verifyRazorpayPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    if (!isValid) {
      donation.status = 'failed';
      await donation.save();
      sendError(res, 'Payment verification failed', 400);
      return;
    }

    // Update donation
    donation.status = 'success';
    donation.razorpayPaymentId = razorpayPaymentId;
    donation.razorpaySignature = razorpaySignature;
    donation.certificateNumber = `80G-${uuidv4().substring(0, 8).toUpperCase()}`;
    await donation.save();

    // Update campaign
    const campaign = await Campaign.findById(donation.campaignId);
    if (campaign) {
      campaign.raisedAmount += donation.amount;
      campaign.donorCount += 1;
      await campaign.save();
    }

    // Generate and send certificate
    try {
      const certificateBuffer = await generateCertificate(donation);
      const certificateUrl = await uploadCertificate(certificateBuffer, donation.certificateNumber!);
      donation.certificateUrl = certificateUrl;
      donation.certificateSent = true;
      await donation.save();

      // Send email with certificate
      await sendEmail({
        to: donation.donorEmail,
        subject: '80G Tax Exemption Certificate - Engala Trust',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Thank you for your donation!</h2>
            <p>Your 80G tax exemption certificate is attached.</p>
            <p>Certificate Number: ${donation.certificateNumber}</p>
            <p>Donation Amount: ₹${donation.amount.toLocaleString('en-IN')}</p>
          </div>
        `,
      });
    } catch (certError: any) {
      logger.error('Certificate generation error:', certError);
    }

    sendSuccess(res, { donation }, 'Payment verified successfully');
  } catch (error: any) {
    logger.error('Verify payment error:', error);
    sendError(res, 'Server error', 500, error);
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
    res.status(500).json({ message: 'Server error' });
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
    sendError(res, 'Server error', 500, error);
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
    sendError(res, 'Server error', 500, error);
  }
};

// Helper function to upload certificate (placeholder - implement based on your storage)
const uploadCertificate = async (buffer: Buffer, certificateNumber: string): Promise<string> => {
  // This should upload to your storage (S3, Cloudinary, etc.)
  // For now, return a placeholder
  return `certificates/${certificateNumber}.pdf`;
};

