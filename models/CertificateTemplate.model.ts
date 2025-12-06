import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICertificateTemplate extends Document {
  name: string;
  templateData: Record<string, any>;
  isActive: boolean;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const certificateTemplateSchema = new Schema<ICertificateTemplate>(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      default: 'Default 80G Certificate',
    },
    templateData: {
      type: Schema.Types.Mixed,
      required: [true, 'Template data is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

certificateTemplateSchema.index({ isActive: 1 });
certificateTemplateSchema.index({ uploadedBy: 1 });

export const CertificateTemplate = mongoose.model<ICertificateTemplate>('CertificateTemplate', certificateTemplateSchema);

