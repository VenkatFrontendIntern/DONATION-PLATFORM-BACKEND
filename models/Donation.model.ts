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
      required: [true, 'Campaign ID is required'],
    },
    donorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    amount: {
      type: Number,
      required: [true, 'Donation amount is required'],
      min: [1, 'Minimum donation is ₹1'],
      max: [10000000, 'Maximum donation is ₹1,00,00,000'],
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'upi'],
      required: [true, 'Payment method is required'],
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
      required: [true, 'Donor name is required'],
      trim: true,
    },
    donorEmail: {
      type: String,
      required: [true, 'Donor email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    donorPhone: {
      type: String,
      default: null,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian phone number'],
      sparse: true,
    },
    donorPan: {
      type: String,
      default: null,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please provide a valid PAN number'],
      sparse: true,
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
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

donationSchema.index({ campaignId: 1, createdAt: -1 });
donationSchema.index({ donorId: 1 });
donationSchema.index({ status: 1 });
donationSchema.index({ donorEmail: 1 });
donationSchema.index({ createdAt: -1 });
donationSchema.index({ paymentMethod: 1, status: 1 });

export const Donation = mongoose.model<IDonation>('Donation', donationSchema);

