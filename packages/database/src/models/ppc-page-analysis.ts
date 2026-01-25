import mongoose, { Schema, Document, Model } from 'mongoose';

// Conversion elements interface
export interface IConversionElement {
  type: 'cta_button' | 'form' | 'phone_number' | 'chat_widget' | 'email_link';
  found: boolean;
  count: number;
  aboveFold: boolean;
  details?: string;
}

// Page speed metrics interface
export interface IPageSpeedMetrics {
  loadTime?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;
  cumulativeLayoutShift?: number;
}

// Ad relevance interface
export interface IAdRelevance {
  keywordDensity?: number;
  headlineMatch?: boolean;
  messageMatch?: boolean;
  brandConsistency?: boolean;
}

// Trust signals interface
export interface ITrustSignals {
  hasTestimonials: boolean;
  hasReviews: boolean;
  hasTrustBadges: boolean;
  hasGuarantee: boolean;
  hasSocialProof: boolean;
  hasSecurityIndicators: boolean;
}

// Mobile optimisation interface
export interface IMobileOptimisation {
  isResponsive: boolean;
  hasMobileMenu: boolean;
  hasTapTargets: boolean;
  hasReadableText: boolean;
  viewportConfigured: boolean;
}

// Category scores interface
export interface ICategoryScores {
  conversionElements: number;
  trustSignals: number;
  mobileOptimisation: number;
  pageSpeed: number;
  adRelevance: number;
}

// Scan history entry interface
export interface IScanHistoryEntry {
  scannedAt: Date;
  scannedBy: mongoose.Types.ObjectId;
  score: number;
  categoryScores?: ICategoryScores;
  changesDetected: boolean;
  pageSnapshotId?: mongoose.Types.ObjectId;
  snapshot: {
    headline?: string;
    subheadline?: string;
    conversionElements?: IConversionElement[];
    pageSpeedMetrics?: IPageSpeedMetrics;
    adRelevance?: IAdRelevance;
    trustSignals?: ITrustSignals;
    mobileOptimisation?: IMobileOptimisation;
    issues?: Array<{
      type: string;
      field: string;
      message: string;
    }>;
  };
}

export interface IPpcPageAnalysis extends Document {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  url: string;
  // Core content
  headline?: string;
  subheadline?: string;
  // Analysis data
  conversionElements: IConversionElement[];
  pageSpeedMetrics?: IPageSpeedMetrics;
  adRelevance?: IAdRelevance;
  trustSignals?: ITrustSignals;
  mobileOptimisation?: IMobileOptimisation;
  // Issues and scoring
  issues: Array<{
    type: 'error' | 'warning' | 'success';
    field: string;
    message: string;
  }>;
  score: number;
  categoryScores?: ICategoryScores;
  // Tracking
  analyzedBy: mongoose.Types.ObjectId;
  analyzedAt: Date;
  scanHistory: IScanHistoryEntry[];
  scanCount: number;
  lastScannedAt: Date;
  lastScannedBy: mongoose.Types.ObjectId;
  // Page Store integration
  analyzedSnapshotId?: mongoose.Types.ObjectId;
  currentSnapshotId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Subdocument schemas

const conversionElementSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['cta_button', 'form', 'phone_number', 'chat_widget', 'email_link'],
    },
    found: Boolean,
    count: Number,
    aboveFold: Boolean,
    details: String,
  },
  { _id: false }
);

const pageSpeedMetricsSchema = new Schema(
  {
    loadTime: Number,
    firstContentfulPaint: Number,
    largestContentfulPaint: Number,
    timeToInteractive: Number,
    cumulativeLayoutShift: Number,
  },
  { _id: false }
);

const adRelevanceSchema = new Schema(
  {
    keywordDensity: Number,
    headlineMatch: Boolean,
    messageMatch: Boolean,
    brandConsistency: Boolean,
  },
  { _id: false }
);

const trustSignalsSchema = new Schema(
  {
    hasTestimonials: Boolean,
    hasReviews: Boolean,
    hasTrustBadges: Boolean,
    hasGuarantee: Boolean,
    hasSocialProof: Boolean,
    hasSecurityIndicators: Boolean,
  },
  { _id: false }
);

const mobileOptimisationSchema = new Schema(
  {
    isResponsive: Boolean,
    hasMobileMenu: Boolean,
    hasTapTargets: Boolean,
    hasReadableText: Boolean,
    viewportConfigured: Boolean,
  },
  { _id: false }
);

const categoryScoresSchema = new Schema(
  {
    conversionElements: { type: Number, min: 0, max: 100 },
    trustSignals: { type: Number, min: 0, max: 100 },
    mobileOptimisation: { type: Number, min: 0, max: 100 },
    pageSpeed: { type: Number, min: 0, max: 100 },
    adRelevance: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const issueSchema = new Schema(
  {
    type: { type: String, enum: ['error', 'warning', 'success'] },
    field: String,
    message: String,
  },
  { _id: false }
);

const snapshotSchema = new Schema(
  {
    headline: String,
    subheadline: String,
    conversionElements: [conversionElementSchema],
    pageSpeedMetrics: {
      type: pageSpeedMetricsSchema,
      default: undefined,
    },
    adRelevance: {
      type: adRelevanceSchema,
      default: undefined,
    },
    trustSignals: {
      type: trustSignalsSchema,
      default: undefined,
    },
    mobileOptimisation: {
      type: mobileOptimisationSchema,
      default: undefined,
    },
    issues: [issueSchema],
  },
  { _id: false }
);

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
    categoryScores: {
      type: categoryScoresSchema,
      default: undefined,
    },
    changesDetected: {
      type: Boolean,
      default: false,
    },
    pageSnapshotId: {
      type: Schema.Types.ObjectId,
      ref: 'PageSnapshot',
    },
    snapshot: {
      type: snapshotSchema,
      default: undefined,
    },
  },
  { _id: false }
);

const ppcPageAnalysisSchema = new Schema<IPpcPageAnalysis>(
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
    headline: String,
    subheadline: String,
    conversionElements: [conversionElementSchema],
    pageSpeedMetrics: {
      type: pageSpeedMetricsSchema,
      default: undefined,
    },
    adRelevance: {
      type: adRelevanceSchema,
      default: undefined,
    },
    trustSignals: {
      type: trustSignalsSchema,
      default: undefined,
    },
    mobileOptimisation: {
      type: mobileOptimisationSchema,
      default: undefined,
    },
    issues: [issueSchema],
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    categoryScores: {
      type: categoryScoresSchema,
      default: undefined,
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
    analyzedSnapshotId: {
      type: Schema.Types.ObjectId,
      ref: 'PageSnapshot',
    },
    currentSnapshotId: {
      type: Schema.Types.ObjectId,
      ref: 'PageSnapshot',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ppcPageAnalysisSchema.index({ clientId: 1, url: 1 });
ppcPageAnalysisSchema.index({ clientId: 1, analyzedAt: -1 });
ppcPageAnalysisSchema.index({ clientId: 1, analyzedSnapshotId: 1, currentSnapshotId: 1 });

// Clear cache in development
if (process.env.NODE_ENV !== 'production' && mongoose.models.PpcPageAnalysis) {
  delete mongoose.models.PpcPageAnalysis;
}

export const PpcPageAnalysis: Model<IPpcPageAnalysis> =
  mongoose.models.PpcPageAnalysis || mongoose.model<IPpcPageAnalysis>('PpcPageAnalysis', ppcPageAnalysisSchema);
