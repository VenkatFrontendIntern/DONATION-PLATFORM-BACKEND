import { Request, Response } from 'express';
import { Donation } from '../../models/Donation.model.js';
import { Campaign } from '../../models/Campaign.model.js';
import { createRazorpayOrder } from '../../services/razorpay.service.js';
import { logger } from '../../utils/logger.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

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

