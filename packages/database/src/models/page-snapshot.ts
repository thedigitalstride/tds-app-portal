import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPageSnapshot extends Document {
  _id: mongoose.Types.ObjectId;
  url: string;
  urlHash: string;

  // Snapshot metadata
  fetchedAt: Date;
  fetchedBy: mongoose.Types.ObjectId;
  triggeredByClient: mongoose.Types.ObjectId;
  triggeredByTool: string;

  // Storage reference (Vercel Blob)
  blobUrl: string;
  contentSize: number;

  // Key HTTP headers
  httpStatus: number;
  contentType?: string;
  lastModified?: string;
  cacheControl?: string;
  xRobotsTag?: string;

  createdAt: Date;
}

const pageSnapshotSchema = new Schema<IPageSnapshot>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    urlHash: {
      type: String,
      required: true,
      index: true,
    },
    fetchedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    fetchedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    triggeredByClient: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    triggeredByTool: {
      type: String,
      required: true,
    },
    blobUrl: {
      type: String,
      required: true,
    },
    contentSize: {
      type: Number,
      required: true,
    },
    httpStatus: {
      type: Number,
      required: true,
    },
    contentType: String,
    lastModified: String,
    cacheControl: String,
    xRobotsTag: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes for efficient queries
pageSnapshotSchema.index({ urlHash: 1, fetchedAt: -1 });
pageSnapshotSchema.index({ triggeredByClient: 1, fetchedAt: -1 });

// Delete cached model in development
if (process.env.NODE_ENV !== 'production' && mongoose.models.PageSnapshot) {
  delete mongoose.models.PageSnapshot;
}

export const PageSnapshot: Model<IPageSnapshot> =
  mongoose.models.PageSnapshot || mongoose.model<IPageSnapshot>('PageSnapshot', pageSnapshotSchema);
