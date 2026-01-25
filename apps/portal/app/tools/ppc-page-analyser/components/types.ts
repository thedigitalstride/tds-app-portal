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
  issues: Issue[];
  score: number;
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
}
