import mongoose from 'mongoose';
import { Donation } from '../models/Donation.model.js';
import { Campaign } from '../models/Campaign.model.js';
import { verifyPaymentSignature } from '../utils/paymentVerification.js';
import { processSuccessfulPayment, handlePostPaymentSuccess } from './donationProcessing.service.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Process payment.captured webhook event
 */
export const processPaymentCapturedWebhook = async (
  payment: any,
  orderId: string
): Promise<{ success: boolean; message: string }> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find donation by order ID
    const donation = await Donation.findOne({ razorpayOrderId: orderId });
    
    if (!donation) {
      logger.warn(`Donation not found for order ${orderId}`);
      return { success: false, message: 'Donation not found' };
    }

    // Skip if already verified
    if (donation.status === 'success' && donation.razorpayPaymentId === payment.id) {
      logger.info(`Payment ${payment.id} already verified for donation ${donation._id}`);
      return { success: true, message: 'Already verified' };
    }

    // Verify signature
    const isValid = await verifyPaymentSignature(
      orderId,
      payment.id,
      payment.signature || ''
    );

    if (!isValid) {
      logger.warn(`Invalid signature for payment ${payment.id}`);
      return { success: false, message: 'Invalid signature' };
    }

    // Verify amount
    const paymentAmountInRupees = payment.amount / 100;
    if (paymentAmountInRupees !== donation.amount) {
      logger.warn(`Amount mismatch for donation ${donation._id}. Expected: ${donation.amount}, Payment: ${paymentAmountInRupees}`);
      return { success: false, message: 'Amount mismatch' };
    }

    // Process payment
    if (!donation.certificateNumber) {
      donation.certificateNumber = `80G-${uuidv4().substring(0, 8).toUpperCase()}`;
    }

    await processSuccessfulPayment(
      donation,
      payment.id,
      payment.signature || '',
      session
    );

    await session.commitTransaction();
    await session.endSession();

    logger.info(`Payment ${payment.id} verified via webhook for donation ${donation._id}`);

    // Handle post-payment tasks (non-blocking)
    handlePostPaymentSuccess(donation._id.toString()).catch((error: any) => {
      logger.error('Post-payment processing error (non-critical):', error);
    });

    return { success: true, message: 'Webhook processed successfully' };
  } catch (error: any) {
    await session.abortTransaction();
    await session.endSession();
    logger.error('Webhook processing error:', error);
    throw error;
  }
};

