import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Donation } from '../../models/Donation.model.js';
import { verifyRazorpayWebhookSignature } from '../../services/razorpay.service.js';
import { logger } from '../../utils/logger.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import { verifyAndProcessPayment, handlePostPaymentSuccess } from '../../services/donationProcessing.service.js';
import { processPaymentCapturedWebhook } from '../../services/webhook.service.js';

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

