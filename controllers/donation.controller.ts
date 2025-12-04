import { Request, Response } from 'express';
import { Donation, IDonation } from '../models/Donation.model.js';
import { Campaign } from '../models/Campaign.model.js';
import { createRazorpayOrder, verifyRazorpayPayment } from '../services/razorpay.service.js';
import { generateCertificate } from '../services/pdf.service.js';
import { sendEmail } from '../utils/email.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

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
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { campaignId, amount, isAnonymous, donorName, donorEmail, donorPhone, donorPan } = req.body;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found' });
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

    res.json({
      success: true,
      order,
      donationId: donation._id.toString(),
    });
  } catch (error: any) {
    logger.error('Create order error:', error);
    res.status(500).json({ message: 'Server error' });
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
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { donationId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const donation = await Donation.findById(donationId);
    if (!donation) {
      res.status(404).json({ message: 'Donation not found' });
      return;
    }

    // Verify payment with Razorpay
    const isValid = await verifyRazorpayPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    if (!isValid) {
      donation.status = 'failed';
      await donation.save();
      res.status(400).json({ message: 'Payment verification failed' });
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

    res.json({
      success: true,
      message: 'Payment verified successfully',
      donation,
    });
  } catch (error: any) {
    logger.error('Verify payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCertificate = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      res.status(404).json({ message: 'Donation not found' });
      return;
    }

    // Check if user owns the donation
    if (donation.donorId && donation.donorId.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    if (!donation.certificateUrl) {
      res.status(404).json({ message: 'Certificate not available' });
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
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const donations = await Donation.find({ donorId: req.user._id })
      .populate('campaignId', 'title coverImage')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      donations,
    });
  } catch (error: any) {
    logger.error('Get my donations error:', error);
    res.status(500).json({ message: 'Server error' });
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

    res.json({
      success: true,
      donations,
    });
  } catch (error: any) {
    logger.error('Get campaign donations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to upload certificate (placeholder - implement based on your storage)
const uploadCertificate = async (buffer: Buffer, certificateNumber: string): Promise<string> => {
  // This should upload to your storage (S3, Cloudinary, etc.)
  // For now, return a placeholder
  return `certificates/${certificateNumber}.pdf`;
};

