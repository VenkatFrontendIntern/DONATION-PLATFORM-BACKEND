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

