export interface ConversionElement {
  type: 'cta_button' | 'form' | 'phone_number' | 'chat_widget' | 'email_link';
  found: boolean;
  count: number;
  aboveFold: boolean;
  details?: string;
}

export interface PageSpeedMetrics {
  loadTime?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;
  cumulativeLayoutShift?: number;
}

export interface AdRelevance {
  keywordDensity?: number;
  headlineMatch?: boolean;
  messageMatch?: boolean;
  brandConsistency?: boolean;
}

export interface TrustSignals {
  hasTestimonials: boolean;
  hasReviews: boolean;
  hasTrustBadges: boolean;
  hasGuarantee: boolean;
  hasSocialProof: boolean;
  hasSecurityIndicators: boolean;
}

export interface MobileOptimisation {
  isResponsive: boolean;
  hasMobileMenu: boolean;
  hasTapTargets: boolean;
  hasReadableText: boolean;
  viewportConfigured: boolean;
}

export interface CategoryScores {
  conversionElements: number;
  trustSignals: number;
  mobileOptimisation: number;
  pageSpeed: number;
  adRelevance: number;
}

export interface Issue {
  type: 'error' | 'warning' | 'success';
  field: string;
  message: string;
}

export interface ScanHistoryEntry {
  scannedAt: string;
  scannedBy: {
    _id: string;
    name: string;
    email: string;
  };
  score: number;
  categoryScores?: CategoryScores;
  changesDetected: boolean;
  pageSnapshotId?: string;
  snapshot: {
    headline?: string;
    subheadline?: string;
    conversionElements?: ConversionElement[];
    pageSpeedMetrics?: PageSpeedMetrics;
    adRelevance?: AdRelevance;
    trustSignals?: TrustSignals;
    mobileOptimisation?: MobileOptimisation;
    issues?: Issue[];
  };
}

// V2 Types
export interface AdHeadline {
  text: string;
  pinnedPosition?: 1 | 2 | 3;
}

export interface AdDescription {
  text: string;
  pinnedPosition?: 1 | 2;
}

export interface AdKeyword {
  text: string;
  matchType: 'exact' | 'phrase' | 'broad';
}

export interface AdData {
  headlines: AdHeadline[];
  descriptions: AdDescription[];
  keywords: AdKeyword[];
  displayPaths?: [string, string];
  finalUrl?: string;
  qualityScore?: number;
  landingPageExperience?: 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE';
  adRelevance?: 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE';
  expectedCtr?: 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE';
  adStrength?: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR' | 'UNSPECIFIED';
}

export interface V2CategoryScores {
  messageMatch: number;
  adScent: number;
  conversionElements: number;
  technicalQuality: number;
  contentRelevance: number;
  trustCredibility: number;
}

export interface V2Issue {
  severity: 'critical' | 'warning' | 'suggestion';
  category: keyof V2CategoryScores;
  element: string;
  problem: string;
  location?: string;
  impact: string;
}

export interface V2Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: keyof V2CategoryScores;
  action: string;
  currentState: string;
  suggestedChange: string;
  estimatedImpact: string;
}

export interface MessageMatchItem {
  adElement: string;
  pageElement?: string;
  matchStrength: 'strong' | 'partial' | 'weak' | 'missing';
  notes?: string;
}

export interface V2Summary {
  strengths: string[];
  weaknesses: string[];
  quickWins: string[];
}

export interface AnalysisV2 {
  overallScore: number;
  categoryScores: V2CategoryScores;
  issues: V2Issue[];
  recommendations: V2Recommendation[];
  messageMatchMap: MessageMatchItem[];
  summary: V2Summary;
}

/**
 * SavedAnalysis represents a stored URL analysis with both V1 (DOM) and V2 (AI) results.
 *
 * Score Fields:
 * - `score`: Primary display score. For V2 analyses, this should equal `analysisV2.overallScore`.
 *            For V1-only analyses, this is the DOM analysis score.
 * - `analysisV2?.overallScore`: AI-generated score (0-100) if V2 analysis was performed.
 * - `categoryScores`: V1 category scores from DOM analysis.
 * - `analysisV2?.categoryScores`: V2 category scores from AI analysis.
 *
 * When displaying scores, prefer using `getDisplayScore()` from `lib/score-utils.ts`
 * which returns `analysisV2?.overallScore` if available, falling back to `score`.
 */
export interface SavedAnalysis {
  _id: string;
  clientId: string;
  url: string;
  headline?: string;
  subheadline?: string;
  conversionElements: ConversionElement[];
  pageSpeedMetrics?: PageSpeedMetrics;
  adRelevance?: AdRelevance;
  trustSignals?: TrustSignals;
  mobileOptimisation?: MobileOptimisation;
  /** V1 issues from DOM analysis */
  issues: Issue[];
  /**
   * Primary score (0-100). For entries with V2 AI analysis, this equals analysisV2.overallScore.
   * For V1-only entries, this is the DOM analysis score.
   */
  score: number;
  /** V1 category scores from DOM analysis */
  categoryScores?: CategoryScores;
  analyzedBy: {
    _id: string;
    name: string;
    email: string;
  };
  analyzedAt: string;
  scanHistory: ScanHistoryEntry[];
  scanCount: number;
  lastScannedAt: string;
  lastScannedBy: {
    _id: string;
    name: string;
    email: string;
  };
  analyzedSnapshotId?: string;
  currentSnapshotId?: string;
  createdAt: string;
  updatedAt: string;
  isNew?: boolean;
  // V2 Fields
  sourceType?: 'manual_entry' | 'google_import';
  analysisType?: 'single_ad' | 'ad_group';
  adData?: AdData;
  aiProvider?: 'claude' | 'openai';
  aiModel?: string;
  analysisFocus?: 'ecommerce' | 'leadgen' | 'b2b' | 'general';
  analysisV2?: AnalysisV2;
  analysisTimeMs?: number;
}
