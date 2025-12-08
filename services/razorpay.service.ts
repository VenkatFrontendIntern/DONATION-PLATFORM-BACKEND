import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let razorpayInstance: Razorpay | null = null;

if (config.razorpayKeyId && config.razorpayKeySecret) {
  razorpayInstance = new Razorpay({
    key_id: config.razorpayKeyId,
    key_secret: config.razorpayKeySecret,
  });
}

export const createRazorpayOrder = async (amount: number): Promise<any> => {
  if (!razorpayInstance) {
    logger.error('Razorpay instance not initialized. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
    throw new Error('Payment gateway is not configured. Please contact support.');
  }

  if (!amount || amount <= 0) {
    throw new Error('Invalid amount for order creation');
  }

  const options = {
    amount: amount * 100, // Convert to paise
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
  };

  try {
    const order = await razorpayInstance.orders.create(options);
    logger.info(`Razorpay order created: ${order.id} for amount ${amount}`);
    return order;
  } catch (error: any) {
    logger.error('Razorpay order creation error:', {
      message: error.message,
      description: error.description,
      field: error.field,
      source: error.source,
      step: error.step,
      reason: error.reason,
      metadata: error.metadata,
    });
    
    // Provide user-friendly error messages
    if (error.statusCode === 401) {
      throw new Error('Payment gateway authentication failed. Please contact support.');
    } else if (error.statusCode === 400) {
      throw new Error(error.description || 'Invalid payment request. Please check the amount and try again.');
    } else {
      throw new Error('Failed to create payment order. Please try again or contact support if the issue persists.');
    }
  }
};

export const verifyRazorpayPayment = async (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<boolean> => {
  if (!config.razorpayKeySecret) {
    logger.error('Razorpay key secret not configured');
    return false;
  }

  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpayKeySecret)
    .update(body.toString())
    .digest('hex');

  return expectedSignature === razorpaySignature;
};

export const verifyRazorpayWebhookSignature = (
  webhookBody: string,
  webhookSignature: string
): boolean => {
  if (!config.razorpayKeySecret) {
    logger.error('Razorpay key secret not configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', config.razorpayKeySecret)
    .update(webhookBody)
    .digest('hex');

  return expectedSignature === webhookSignature;
};

export const fetchPaymentDetails = async (razorpayPaymentId: string): Promise<any> => {
  if (!razorpayInstance) {
    throw new Error('Razorpay not configured');
  }

  try {
    const payment = await razorpayInstance.payments.fetch(razorpayPaymentId);
    return payment;
  } catch (error: any) {
    logger.error('Razorpay payment fetch error:', error);
    throw error;
  }
};

export const fetchOrderDetails = async (razorpayOrderId: string): Promise<any> => {
  if (!razorpayInstance) {
    throw new Error('Razorpay not configured');
  }

  try {
    const order = await razorpayInstance.orders.fetch(razorpayOrderId);
    return order;
  } catch (error: any) {
    logger.error('Razorpay order fetch error:', error);
    throw error;
  }
};

