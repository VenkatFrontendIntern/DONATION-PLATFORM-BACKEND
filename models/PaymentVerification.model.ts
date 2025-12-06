import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPaymentVerification extends Document {
  donationId: Types.ObjectId;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  status: 'verified' | 'failed';
  verificationData: Record<string, any>;
  verifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentVerificationSchema = new Schema<IPaymentVerification>(
  {
    donationId: {
      type: Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
    },
    razorpayPaymentId: {
      type: String,
      required: [true, 'Razorpay payment ID is required'],
      unique: true,
    },
    razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay order ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR'],
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['verified', 'failed'],
      required: [true, 'Verification status is required'],
    },
    verificationData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

paymentVerificationSchema.index({ razorpayPaymentId: 1 }, { unique: true });
paymentVerificationSchema.index({ donationId: 1 });
paymentVerificationSchema.index({ status: 1 });
paymentVerificationSchema.index({ verifiedAt: -1 });

export const PaymentVerification = mongoose.model<IPaymentVerification>('PaymentVerification', paymentVerificationSchema);

