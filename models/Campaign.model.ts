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
      min: [0, 'Raised amount cannot be negative'],
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
      validate: {
        validator: function(value: Date) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return value >= tomorrow;
        },
        message: 'End date must be at least 1 day in the future',
      },
    },
    donorCount: {
      type: Number,
      default: 0,
      min: [0, 'Donor count cannot be negative'],
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
      min: [0, 'Views cannot be negative'],
    },
    shares: {
      type: Number,
      default: 0,
      min: [0, 'Shares cannot be negative'],
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

campaignSchema.index({ status: 1, createdAt: -1 });
campaignSchema.index({ status: 1, category: 1, createdAt: -1 });
campaignSchema.index({ category: 1 });
campaignSchema.index({ organizerId: 1 });

export const Campaign = mongoose.model<ICampaign>('Campaign', campaignSchema);

