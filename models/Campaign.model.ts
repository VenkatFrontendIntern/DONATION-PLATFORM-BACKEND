import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICampaign extends Document {
  title: string;
  description: string;
  organizer: string;
  organizerId: Types.ObjectId;
  goalAmount: number;
  raisedAmount: number;
  category: Types.ObjectId;
  coverImage: string;
  galleryImages: string[];
  status: 'pending' | 'approved' | 'rejected' | 'closed';
  endDate: Date;
  donorCount: number;
  rejectionReason?: string | null;
  approvedBy?: Types.ObjectId | null;
  approvedAt?: Date | null;
  views: number;
  shares: number;
  socialMedia: {
    facebook?: string | null;
    instagram?: string | null;
    twitter?: string | null;
    linkedin?: string | null;
    whatsapp?: string | null;
    youtube?: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    title: {
      type: String,
      required: [true, 'Campaign title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Campaign description is required'],
    },
    organizer: {
      type: String,
      required: [true, 'Organizer name is required'],
      trim: true,
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    goalAmount: {
      type: Number,
      required: [true, 'Goal amount is required'],
      min: [100, 'Minimum goal amount is ₹100'],
    },
    raisedAmount: {
      type: Number,
      default: 0,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    coverImage: {
      type: String,
      required: [true, 'Cover image is required'],
    },
    galleryImages: [{
      type: String,
    }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'closed'],
      default: 'pending',
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    donorCount: {
      type: Number,
      default: 0,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    views: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
    socialMedia: {
      facebook: { type: String, default: null },
      instagram: { type: String, default: null },
      twitter: { type: String, default: null },
      linkedin: { type: String, default: null },
      whatsapp: { type: String, default: null },
      youtube: { type: String, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for optimized query performance
// Compound index for status filtering and createdAt sorting (most common query pattern)
campaignSchema.index({ status: 1, createdAt: -1 });

// Compound index for status + category filtering and createdAt sorting (common filtered query)
campaignSchema.index({ status: 1, category: 1, createdAt: -1 });

// Index for category filtering (used when filtering by category alone)
campaignSchema.index({ category: 1 });

// Index for organizer queries
campaignSchema.index({ organizerId: 1 });

export const Campaign = mongoose.model<ICampaign>('Campaign', campaignSchema);

