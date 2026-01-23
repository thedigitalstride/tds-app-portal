import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClient extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  website: string;
  description?: string;
  contactEmail?: string;
  contactName?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  // Page store settings
  pageFreshnessHours: number;
  maxSnapshotsPerUrl: number;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    website: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    contactName: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Page store settings
    pageFreshnessHours: {
      type: Number,
      default: 24,
      min: 1,
      max: 168, // 1 week max
    },
    maxSnapshotsPerUrl: {
      type: Number,
      default: 10,
      min: 1,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
clientSchema.index({ name: 'text', website: 'text' });
clientSchema.index({ isActive: 1 });

export const Client: Model<IClient> =
  mongoose.models.Client || mongoose.model<IClient>('Client', clientSchema);
