import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPendingScan extends Document {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  batchId: string;
  submittedBy: mongoose.Types.ObjectId;
  submittedAt: Date;
  processedAt?: Date;
  error?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const pendingScanSchema = new Schema<IPendingScan>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    batchId: {
      type: String,
      required: true,
      index: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    error: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queue queries
pendingScanSchema.index({ clientId: 1, status: 1 });
pendingScanSchema.index({ batchId: 1, status: 1 });

// Delete cached model in development to pick up schema changes
if (process.env.NODE_ENV !== 'production' && mongoose.models.PendingScan) {
  delete mongoose.models.PendingScan;
}

export const PendingScan: Model<IPendingScan> =
  mongoose.models.PendingScan || mongoose.model<IPendingScan>('PendingScan', pendingScanSchema);
