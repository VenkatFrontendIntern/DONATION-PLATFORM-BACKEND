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
    throw new Error('Razorpay not configured');
  }

  const options = {
    amount: amount * 100, // Convert to paise
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
  };

  try {
    const order = await razorpayInstance.orders.create(options);
    return order;
  } catch (error: any) {
    logger.error('Razorpay order creation error:', error);
    throw error;
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

