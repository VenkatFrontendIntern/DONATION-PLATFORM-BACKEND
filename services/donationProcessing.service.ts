import mongoose from 'mongoose';
import { Donation, IDonation } from '../models/Donation.model.js';
import { Campaign } from '../models/Campaign.model.js';
import { PaymentVerification } from '../models/PaymentVerification.model.js';
import { verifyPaymentSignature, verifyPaymentAmount } from '../utils/paymentVerification.js';
import { generateAndSendCertificate } from './certificate.service.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Process successful payment verification
 */
export const processSuccessfulPayment = async (
  donation: IDonation,
  razorpayPaymentId: string,
  razorpaySignature: string,
  session: mongoose.ClientSession | null
): Promise<void> => {
  // Check if payment ID already exists in another donation or PaymentVerification
  const existingDonationWithPaymentId = await Donation.findOne({ 
    razorpayPaymentId,
    _id: { $ne: donation._id },
    status: 'success'
  });
  
  if (existingDonationWithPaymentId) {
    logger.warn(`Payment ID ${razorpayPaymentId} already exists in successful donation ${existingDonationWithPaymentId._id}`);
    throw new Error(`Payment ID ${razorpayPaymentId} has already been used for another successful donation`);
  }

  // Check PaymentVerification table as well
  const existingVerification = await PaymentVerification.findOne({ razorpayPaymentId });
  if (existingVerification && existingVerification.status === 'verified') {
    // Check if it's for the same donation
    if (existingVerification.donationId.toString() !== donation._id.toString()) {
      logger.warn(`Payment ID ${razorpayPaymentId} already verified for donation ${existingVerification.donationId}`);
      throw new Error(`Payment ID ${razorpayPaymentId} has already been verified for another donation`);
    }
    // Same donation, already verified - this is fine (idempotent operation)
    return;
  }

  const certificateNumber = `80G-${uuidv4().substring(0, 8).toUpperCase()}`;
  
  donation.status = 'success';
  donation.razorpayPaymentId = razorpayPaymentId;
  donation.razorpaySignature = razorpaySignature;
  donation.certificateNumber = certificateNumber;
  
  try {
    if (session) {
      await donation.save({ session });
    } else {
      await donation.save();
    }
  } catch (error: any) {
    // Handle duplicate key error (E11000) for razorpayPaymentId
    if (error.code === 11000 && error.keyPattern?.razorpayPaymentId) {
      logger.warn(`Duplicate payment ID ${razorpayPaymentId} detected, checking existing donation`);
      
      // Check if another donation has this payment ID and is successful
      const conflictingDonation = await Donation.findOne({ razorpayPaymentId, status: 'success' });
      if (conflictingDonation && conflictingDonation._id.toString() !== donation._id.toString()) {
        throw new Error(`Payment ID ${razorpayPaymentId} has already been processed for another donation`);
      }
      
      // If the current donation already has this payment ID set, it's a duplicate save attempt (idempotent)
      if (donation.razorpayPaymentId === razorpayPaymentId && donation.status === 'success') {
        logger.info(`Payment ${razorpayPaymentId} already processed for donation ${donation._id}, skipping save`);
        return;
      }
      
      // Otherwise, re-throw the error
      throw error;
    }
    throw error;
  }

  const campaign = session
    ? await Campaign.findById(donation.campaignId).session(session)
    : await Campaign.findById(donation.campaignId);
    
  if (campaign) {
    campaign.raisedAmount += donation.amount;
    campaign.donorCount += 1;
    
    if (session) {
      await campaign.save({ session });
    } else {
      await campaign.save();
    }
  }
};

/**
 * Verify payment and process donation
 */
export const verifyAndProcessPayment = async (
  donation: IDonation,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  session: mongoose.ClientSession | null
): Promise<{ isValid: boolean; error?: string }> => {
  const isValidSignature = await verifyPaymentSignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  );

  if (!isValidSignature) {
    donation.status = 'failed';
    if (session) {
      await donation.save({ session });
    } else {
      await donation.save();
    }
    return { isValid: false, error: 'Payment verification failed' };
  }

  const isValidAmount = await verifyPaymentAmount(
    razorpayOrderId,
    razorpayPaymentId,
    donation.amount
  );

  if (!isValidAmount) {
    logger.warn(`Amount mismatch for donation ${donation._id}. Expected: ${donation.amount}`);
    donation.status = 'failed';
    if (session) {
      await donation.save({ session });
    } else {
      await donation.save();
    }
    return { isValid: false, error: 'Payment amount mismatch' };
  }

  await processSuccessfulPayment(donation, razorpayPaymentId, razorpaySignature, session);
  
  return { isValid: true };
};

/**
 * Handle post-payment success tasks (certificate generation, email)
 */
export const handlePostPaymentSuccess = async (donationId: string): Promise<void> => {
  try {
    const updatedDonation = await Donation.findById(donationId);
    if (!updatedDonation) {
      logger.error(`Donation ${donationId} not found after payment verification`);
      return;
    }

    await generateAndSendCertificate(updatedDonation);
  } catch (error: any) {
    logger.error('Post-payment success handling error (non-critical):', error);
  }
};

