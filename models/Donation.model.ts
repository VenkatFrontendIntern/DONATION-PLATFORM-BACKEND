import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDonation extends Document {
  campaignId: Types.ObjectId;
  donorId?: Types.ObjectId | null;
  amount: number;
  isAnonymous: boolean;
  paymentMethod: 'razorpay' | 'upi';
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  upiTransactionId?: string | null;
  status: 'pending' | 'success' | 'failed';
  donorName: string;
  donorEmail: string;
  donorPhone?: string | null;
  donorPan?: string | null;
  message?: string | null;
  certificateNumber?: string;
  certificateUrl?: string | null;
  certificateSent: boolean;
  utn?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const donationSchema = new Schema<IDonation>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    donorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for anonymous donations
    },
    amount: {
      type: Number,
      required: [true, 'Donation amount is required'],
      min: [1, 'Minimum donation is ₹1'],
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'upi'],
      required: true,
    },
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    upiTransactionId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    donorName: {
      type: String,
      required: true,
    },
    donorEmail: {
      type: String,
      required: true,
    },
    donorPhone: {
      type: String,
      default: null,
    },
    donorPan: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      default: null,
    },
    certificateNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    certificateUrl: {
      type: String,
      default: null,
    },
    certificateSent: {
      type: Boolean,
      default: false,
    },
    utn: {
      type: String,
      default: null, // Unique Transaction Number for 80G
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
donationSchema.index({ campaignId: 1, createdAt: -1 });
donationSchema.index({ donorId: 1 });
donationSchema.index({ status: 1 });
// certificateNumber index is automatically created by unique: true constraint

export const Donation = mongoose.model<IDonation>('Donation', donationSchema);

