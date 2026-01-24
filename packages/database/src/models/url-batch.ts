import mongoose, { Schema, Document, Model } from 'mongoose';

export type UrlBatchStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface IUrlBatchSucceeded {
  url: string;
  result?: unknown;
  processedAt: Date;
}

export interface IUrlBatchFailed {
  url: string;
  error: string;
  processedAt: Date;
}

export interface IUrlBatch extends Document {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  toolId: string; // 'page-library', 'meta-tag-analyser', etc.
  status: UrlBatchStatus;

  urls: string[];
  totalUrls: number;
  processedCount: number;
  currentUrl?: string;
  processingUrls: string[];

  succeeded: IUrlBatchSucceeded[];
  failed: IUrlBatchFailed[];

  source: 'sitemap' | 'url_list' | 'manual';
  sourceUrl?: string;

  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

const succeededSchema = new Schema<IUrlBatchSucceeded>(
  {
    url: { type: String, required: true },
    result: { type: Schema.Types.Mixed },
    processedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const failedSchema = new Schema<IUrlBatchFailed>(
  {
    url: { type: String, required: true },
    error: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const urlBatchSchema = new Schema<IUrlBatch>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toolId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // URLs to process
    urls: {
      type: [String],
      required: true,
    },
    totalUrls: {
      type: Number,
      required: true,
    },

    // Progress tracking
    processedCount: {
      type: Number,
      default: 0,
    },
    currentUrl: String,
    processingUrls: {
      type: [String],
      default: [],
    },

    // Results
    succeeded: {
      type: [succeededSchema],
      default: [],
    },
    failed: {
      type: [failedSchema],
      default: [],
    },

    // Metadata
    source: {
      type: String,
      enum: ['sitemap', 'url_list', 'manual'],
      required: true,
    },
    sourceUrl: String,

    startedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
urlBatchSchema.index({ clientId: 1, toolId: 1, createdAt: -1 });
urlBatchSchema.index({ clientId: 1, status: 1 });
urlBatchSchema.index({ status: 1, createdAt: -1 });

// Delete cached model in development to pick up schema changes
if (process.env.NODE_ENV !== 'production' && mongoose.models.UrlBatch) {
  delete mongoose.models.UrlBatch;
}

export const UrlBatch: Model<IUrlBatch> =
  mongoose.models.UrlBatch || mongoose.model<IUrlBatch>('UrlBatch', urlBatchSchema);
