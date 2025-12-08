import { logger } from './logger.js';
import {
  verifyRazorpayPayment,
  fetchPaymentDetails,
  fetchOrderDetails,
} from '../services/razorpay.service.js';

/**
 * Retry function with exponential backoff for network operations
 */
export const retryWithBackoff = async <T>(
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
      
      if (error.statusCode && error.statusCode < 500) {
        throw error;
      }
      
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

/**
 * Verify payment signature
 */
export const verifyPaymentSignature = async (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<boolean> => {
  return await retryWithBackoff(
    () => verifyRazorpayPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature),
    3,
    1000
  );
};

/**
 * Verify payment amount matches expected amount
 */
export const verifyPaymentAmount = async (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  expectedAmount: number
): Promise<boolean> => {
  try {
    const paymentDetails = await retryWithBackoff(
      () => fetchPaymentDetails(razorpayPaymentId),
      3,
      1000
    );
    const orderDetails = await retryWithBackoff(
      () => fetchOrderDetails(razorpayOrderId),
      3,
      1000
    );

    // Amount in paise from Razorpay, convert to rupees
    const paymentAmountInRupees = paymentDetails.amount / 100;
    const orderAmountInRupees = orderDetails.amount / 100;

    return paymentAmountInRupees === expectedAmount && orderAmountInRupees === expectedAmount;
  } catch (error: any) {
    logger.warn('Amount verification failed (non-critical):', error);
    return false; // Don't fail verification if amount check fails
  }
};

