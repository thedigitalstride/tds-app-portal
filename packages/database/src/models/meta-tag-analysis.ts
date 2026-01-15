import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IScanHistoryEntry {
  scannedAt: Date;
  scannedBy: mongoose.Types.ObjectId;
  score: number;
  previousTitle?: string;
  previousDescription?: string;
  changesDetected: boolean;
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
    issues: [{
      type: {
        type: String,
        enum: ['error', 'warning', 'success'],
        required: true,
      },
      field: {
        type: String,
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
    }],
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
    scanHistory: [{
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
      previousTitle: String,
      previousDescription: String,
      changesDetected: {
        type: Boolean,
        default: false,
      },
    }],
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

export const MetaTagAnalysis: Model<IMetaTagAnalysis> =
  mongoose.models.MetaTagAnalysis || mongoose.model<IMetaTagAnalysis>('MetaTagAnalysis', metaTagAnalysisSchema);
