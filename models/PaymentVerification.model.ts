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
      required: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['verified', 'failed'],
      required: true,
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

paymentVerificationSchema.index({ razorpayPaymentId: 1 });

export const PaymentVerification = mongoose.model<IPaymentVerification>('PaymentVerification', paymentVerificationSchema);

