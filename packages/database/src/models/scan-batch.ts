import mongoose, { Schema, Document, Model } from 'mongoose';

export type ScanBatchStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ISucceededUrl {
  url: string;
  score: number;
  analysisId: mongoose.Types.ObjectId;
  processedAt: Date;
}

export interface IFailedUrl {
  url: string;
  error: string;
  attempts: number;
  lastAttemptAt: Date;
}

export interface ISkippedUrl {
  url: string;
  reason: 'duplicate' | 'nested_sitemap' | 'invalid' | 'already_exists';
}

export interface IScanBatch extends Document {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: ScanBatchStatus;

  // URLs to process
  urls: string[];
  totalUrls: number;

  // Progress tracking
  processedCount: number;
  currentUrl?: string;
  processingUrls: string[]; // URLs currently being processed (for race condition prevention)

  // Results
  succeeded: ISucceededUrl[];
  failed: IFailedUrl[];
  skipped: ISkippedUrl[];

  // Summary stats
  averageScore?: number;

  // Metadata
  source: 'sitemap' | 'url_list' | 'page_library';
  sourceUrl?: string; // Original sitemap URL if applicable
}

const succeededUrlSchema = new Schema<ISucceededUrl>(
  {
    url: { type: String, required: true },
    score: { type: Number, required: true },
    analysisId: { type: Schema.Types.ObjectId, ref: 'MetaTagAnalysis', required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const failedUrlSchema = new Schema<IFailedUrl>(
  {
    url: { type: String, required: true },
    error: { type: String, required: true },
    attempts: { type: Number, default: 1 },
    lastAttemptAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const skippedUrlSchema = new Schema<ISkippedUrl>(
  {
    url: { type: String, required: true },
    reason: {
      type: String,
      enum: ['duplicate', 'nested_sitemap', 'invalid', 'already_exists'],
      required: true,
    },
  },
  { _id: false }
);

const scanBatchSchema = new Schema<IScanBatch>(
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
    startedAt: Date,
    completedAt: Date,
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
      type: [succeededUrlSchema],
      default: [],
    },
    failed: {
      type: [failedUrlSchema],
      default: [],
    },
    skipped: {
      type: [skippedUrlSchema],
      default: [],
    },

    // Summary stats
    averageScore: Number,

    // Metadata
    source: {
      type: String,
      enum: ['sitemap', 'url_list', 'page_library'],
      required: true,
    },
    sourceUrl: String,
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
scanBatchSchema.index({ clientId: 1, createdAt: -1 });
scanBatchSchema.index({ clientId: 1, status: 1 });
scanBatchSchema.index({ status: 1, createdAt: -1 });

// Delete cached model in development to pick up schema changes
if (process.env.NODE_ENV !== 'production' && mongoose.models.ScanBatch) {
  delete mongoose.models.ScanBatch;
}

export const ScanBatch: Model<IScanBatch> =
  mongoose.models.ScanBatch || mongoose.model<IScanBatch>('ScanBatch', scanBatchSchema);
