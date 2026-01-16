import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IScanHistoryEntry {
  scannedAt: Date;
  scannedBy: mongoose.Types.ObjectId;
  score: number;
  changesDetected: boolean;
  // Full snapshot of data at this point in time
  snapshot: {
    title: string;
    description: string;
    canonical?: string;
    robots?: string;
    openGraph?: {
      title?: string;
      description?: string;
      image?: string;
      url?: string;
      type?: string;
      siteName?: string;
    };
    twitter?: {
      card?: string;
      title?: string;
      description?: string;
      image?: string;
      site?: string;
    };
    issues?: Array<{
      type: string;
      field: string;
      message: string;
    }>;
  };
  // Legacy fields for backwards compatibility
  previousTitle?: string;
  previousDescription?: string;
}

export interface IMetaTagAnalysis extends Document {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  url: string;
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
  };
  issues: Array<{
    type: 'error' | 'warning' | 'success';
    field: string;
    message: string;
  }>;
  plannedTitle?: string;
  plannedDescription?: string;
  score: number;
  analyzedBy: mongoose.Types.ObjectId;
  analyzedAt: Date;
  scanHistory: IScanHistoryEntry[];
  scanCount: number;
  lastScannedAt: Date;
  lastScannedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Subdocument schemas for nested objects
const openGraphSchema = new Schema(
  {
    title: String,
    description: String,
    image: String,
    url: String,
    type: String,
    siteName: String,
  },
  { _id: false }
);

const twitterSchema = new Schema(
  {
    card: String,
    title: String,
    description: String,
    image: String,
    site: String,
  },
  { _id: false }
);

// Issue schema for tracking problems
const issueSchema = new Schema(
  {
    type: { type: String, enum: ['error', 'warning', 'success'] },
    field: String,
    message: String,
  },
  { _id: false }
);

// Snapshot schema for history entries - captures complete state at a point in time
const snapshotSchema = new Schema(
  {
    title: String,
    description: String,
    canonical: String,
    robots: String,
    openGraph: {
      type: openGraphSchema,
      default: undefined,
    },
    twitter: {
      type: twitterSchema,
      default: undefined,
    },
    issues: [issueSchema],
  },
  { _id: false }
);

// Scan history entry schema
const scanHistoryEntrySchema = new Schema(
  {
    scannedAt: {
      type: Date,
      required: true,
    },
    scannedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    changesDetected: {
      type: Boolean,
      default: false,
    },
    // Full snapshot of all fields at this point
    snapshot: {
      type: snapshotSchema,
      default: undefined,
    },
    // Legacy fields for backwards compatibility
    previousTitle: String,
    previousDescription: String,
  },
  { _id: false }
);

const metaTagAnalysisSchema = new Schema<IMetaTagAnalysis>(
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
    title: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    canonical: String,
    robots: String,
    openGraph: {
      type: openGraphSchema,
      default: () => ({}),
    },
    twitter: {
      type: twitterSchema,
      default: () => ({}),
    },
    issues: [issueSchema],
    plannedTitle: String,
    plannedDescription: String,
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    analyzedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    analyzedAt: {
      type: Date,
      default: Date.now,
    },
    scanHistory: [scanHistoryEntrySchema],
    scanCount: {
      type: Number,
      default: 1,
    },
    lastScannedAt: {
      type: Date,
      default: Date.now,
    },
    lastScannedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
metaTagAnalysisSchema.index({ clientId: 1, url: 1 });
metaTagAnalysisSchema.index({ clientId: 1, analyzedAt: -1 });

// Delete cached model in development to pick up schema changes
if (process.env.NODE_ENV !== 'production' && mongoose.models.MetaTagAnalysis) {
  delete mongoose.models.MetaTagAnalysis;
}

export const MetaTagAnalysis: Model<IMetaTagAnalysis> =
  mongoose.models.MetaTagAnalysis || mongoose.model<IMetaTagAnalysis>('MetaTagAnalysis', metaTagAnalysisSchema);
