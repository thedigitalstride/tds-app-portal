import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// V2 Interfaces (AI-powered analysis)
// ============================================

// Headline with optional pinned position (for RSA ads)
export interface IAdHeadline {
  text: string;
  pinnedPosition?: 1 | 2 | 3;
}

// Description with optional pinned position
export interface IAdDescription {
  text: string;
  pinnedPosition?: 1 | 2;
}

// Keyword with match type
export interface IAdKeyword {
  text: string;
  matchType: 'exact' | 'phrase' | 'broad';
}

// Ad data from manual entry or Google Ads import
export interface IAdData {
  headlines: IAdHeadline[];
  descriptions: IAdDescription[];
  keywords: IAdKeyword[];
  displayPaths?: [string, string];
  finalUrl?: string;
  // Google Ads quality metrics (if imported)
  qualityScore?: number;
  landingPageExperience?: 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE';
  adRelevance?: 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE';
  expectedCtr?: 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE';
  adStrength?: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR' | 'UNSPECIFIED';
}

// V2 Category scores (6 categories with weights)
export interface IV2CategoryScores {
  messageMatch: number; // 25% weight
  adScent: number; // 20% weight
  conversionElements: number; // 20% weight
  technicalQuality: number; // 15% weight
  contentRelevance: number; // 10% weight
  trustCredibility: number; // 10% weight
}

// Issue identified by AI analysis
export interface IV2Issue {
  severity: 'critical' | 'warning' | 'suggestion';
  category: keyof IV2CategoryScores;
  element: string;
  problem: string;
  location?: string;
  impact: string;
}

// Recommendation from AI analysis
export interface IV2Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: keyof IV2CategoryScores;
  action: string;
  currentState: string;
  suggestedChange: string;
  estimatedImpact: string;
}

// Message match mapping between ad and page elements
export interface IMessageMatchItem {
  adElement: string;
  pageElement?: string;
  matchStrength: 'strong' | 'partial' | 'weak' | 'missing';
  notes?: string;
}

// Summary of the analysis
export interface IV2Summary {
  strengths: string[];
  weaknesses: string[];
  quickWins: string[];
}

// Complete V2 analysis structure
export interface IAnalysisV2 {
  overallScore: number;
  categoryScores: IV2CategoryScores;
  issues: IV2Issue[];
  recommendations: IV2Recommendation[];
  messageMatchMap: IMessageMatchItem[];
  summary: IV2Summary;
}

// ============================================
// V1 Interfaces (existing)
// ============================================

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
  // Analysis data (V1)
  conversionElements: IConversionElement[];
  pageSpeedMetrics?: IPageSpeedMetrics;
  adRelevance?: IAdRelevance;
  trustSignals?: ITrustSignals;
  mobileOptimisation?: IMobileOptimisation;
  // Issues and scoring (V1)
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

  // ============================================
  // V2 Fields (AI-powered analysis)
  // ============================================

  // Source information
  sourceType?: 'manual_entry' | 'google_import';
  analysisType?: 'single_ad' | 'ad_group';

  // Ad data for AI analysis
  adData?: IAdData;

  // AI configuration
  aiProvider?: 'claude' | 'openai';
  aiModel?: string;
  analysisFocus?: 'ecommerce' | 'leadgen' | 'b2b' | 'general';

  // V2 analysis structure
  analysisV2?: IAnalysisV2;

  // Performance tracking
  analysisTimeMs?: number;

  // Google Ads references (Phase 3)
  importedCampaignId?: mongoose.Types.ObjectId;
  googleAdGroupId?: string;
  googleAdId?: string;

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

// ============================================
// V2 Subdocument schemas
// ============================================

const adHeadlineSchema = new Schema(
  {
    text: { type: String, required: true },
    pinnedPosition: { type: Number, enum: [1, 2, 3] },
  },
  { _id: false }
);

const adDescriptionSchema = new Schema(
  {
    text: { type: String, required: true },
    pinnedPosition: { type: Number, enum: [1, 2] },
  },
  { _id: false }
);

const adKeywordSchema = new Schema(
  {
    text: { type: String, required: true },
    matchType: { type: String, enum: ['exact', 'phrase', 'broad'], required: true },
  },
  { _id: false }
);

const adDataSchema = new Schema(
  {
    headlines: [adHeadlineSchema],
    descriptions: [adDescriptionSchema],
    keywords: [adKeywordSchema],
    displayPaths: { type: [String], validate: [(v: string[]) => v.length <= 2, 'Max 2 display paths'] },
    finalUrl: String,
    qualityScore: { type: Number, min: 1, max: 10 },
    landingPageExperience: { type: String, enum: ['ABOVE_AVERAGE', 'AVERAGE', 'BELOW_AVERAGE'] },
    adRelevance: { type: String, enum: ['ABOVE_AVERAGE', 'AVERAGE', 'BELOW_AVERAGE'] },
    expectedCtr: { type: String, enum: ['ABOVE_AVERAGE', 'AVERAGE', 'BELOW_AVERAGE'] },
    adStrength: { type: String, enum: ['EXCELLENT', 'GOOD', 'AVERAGE', 'POOR', 'UNSPECIFIED'] },
  },
  { _id: false }
);

const v2CategoryScoresSchema = new Schema(
  {
    messageMatch: { type: Number, min: 0, max: 100 },
    adScent: { type: Number, min: 0, max: 100 },
    conversionElements: { type: Number, min: 0, max: 100 },
    technicalQuality: { type: Number, min: 0, max: 100 },
    contentRelevance: { type: Number, min: 0, max: 100 },
    trustCredibility: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const v2IssueSchema = new Schema(
  {
    severity: { type: String, enum: ['critical', 'warning', 'suggestion'], required: true },
    category: {
      type: String,
      enum: ['messageMatch', 'adScent', 'conversionElements', 'technicalQuality', 'contentRelevance', 'trustCredibility'],
      required: true,
    },
    element: { type: String, required: true },
    problem: { type: String, required: true },
    location: String,
    impact: { type: String, required: true },
  },
  { _id: false }
);

const v2RecommendationSchema = new Schema(
  {
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
    category: {
      type: String,
      enum: ['messageMatch', 'adScent', 'conversionElements', 'technicalQuality', 'contentRelevance', 'trustCredibility'],
      required: true,
    },
    action: { type: String, required: true },
    currentState: { type: String, required: true },
    suggestedChange: { type: String, required: true },
    estimatedImpact: { type: String, required: true },
  },
  { _id: false }
);

const messageMatchItemSchema = new Schema(
  {
    adElement: { type: String, required: true },
    pageElement: String,
    matchStrength: { type: String, enum: ['strong', 'partial', 'weak', 'missing'], required: true },
    notes: String,
  },
  { _id: false }
);

const v2SummarySchema = new Schema(
  {
    strengths: [String],
    weaknesses: [String],
    quickWins: [String],
  },
  { _id: false }
);

const analysisV2Schema = new Schema(
  {
    overallScore: { type: Number, min: 0, max: 100, required: true },
    categoryScores: { type: v2CategoryScoresSchema, required: true },
    issues: [v2IssueSchema],
    recommendations: [v2RecommendationSchema],
    messageMatchMap: [messageMatchItemSchema],
    summary: { type: v2SummarySchema, required: true },
  },
  { _id: false }
);

// ============================================
// Main schema
// ============================================

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

    // ============================================
    // V2 Fields (AI-powered analysis)
    // ============================================

    // Source information
    sourceType: {
      type: String,
      enum: ['manual_entry', 'google_import'],
    },
    analysisType: {
      type: String,
      enum: ['single_ad', 'ad_group'],
    },

    // Ad data for AI analysis
    adData: {
      type: adDataSchema,
      default: undefined,
    },

    // AI configuration
    aiProvider: {
      type: String,
      enum: ['claude', 'openai'],
    },
    aiModel: String,
    analysisFocus: {
      type: String,
      enum: ['ecommerce', 'leadgen', 'b2b', 'general'],
    },

    // V2 analysis structure
    analysisV2: {
      type: analysisV2Schema,
      default: undefined,
    },

    // Performance tracking
    analysisTimeMs: Number,

    // Google Ads references (Phase 3)
    importedCampaignId: {
      type: Schema.Types.ObjectId,
      ref: 'ImportedCampaign',
    },
    googleAdGroupId: String,
    googleAdId: String,
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
