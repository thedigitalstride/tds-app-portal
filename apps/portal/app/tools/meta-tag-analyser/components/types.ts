/**
 * Shared type definitions for the Meta Tag Analyser tool
 */

export interface HreflangEntry {
  lang: string;
  url: string;
}

export interface AnalysisIssue {
  type: 'error' | 'warning' | 'success';
  message: string;
  field: string;
}

// Extended Open Graph interfaces
export interface OpenGraphImage {
  alt?: string;
  width?: number;
  height?: number;
  type?: string;
}

export interface OpenGraphArticle {
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

export interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
  // Extended OG fields
  imageDetails?: OpenGraphImage;
  locale?: string;
  localeAlternate?: string[];
  article?: OpenGraphArticle;
  fbAppId?: string;
}

// Extended Twitter interfaces
export interface TwitterPlayer {
  url?: string;
  width?: number;
  height?: number;
}

export interface TwitterApp {
  nameIphone?: string;
  idIphone?: string;
  urlIphone?: string;
  nameAndroid?: string;
  idAndroid?: string;
  urlAndroid?: string;
}

export interface TwitterData {
  card?: string;
  title?: string;
  description?: string;
  image?: string;
  site?: string;
  // Extended Twitter fields
  creator?: string;
  imageAlt?: string;
  player?: TwitterPlayer;
  app?: TwitterApp;
}

// Structured Data interface
export interface StructuredData {
  found: boolean;
  isValidJson: boolean;
  types: string[];
  validationErrors: string[];
  rawScripts?: string[];
  /** @deprecated Use validationErrors instead. Kept for backwards compatibility with existing data. */
  errors?: string[];
}

// Technical SEO interfaces
export interface RobotsDirectives {
  index?: boolean;
  follow?: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  maxSnippet?: number;
  maxImagePreview?: string;
  maxVideoPreview?: number;
}

export interface TechnicalSeo {
  robotsDirectives?: RobotsDirectives;
  prevUrl?: string;
  nextUrl?: string;
  keywords?: string;
  generator?: string;
}

// Site Verification interface
export interface SiteVerification {
  google?: string;
  bing?: string;
  pinterest?: string;
  facebook?: string;
  yandex?: string;
}

// Mobile/PWA interfaces
export interface AppleTouchIcon {
  href: string;
  sizes?: string;
}

export interface Mobile {
  appleWebAppCapable?: string;
  appleWebAppStatusBarStyle?: string;
  appleWebAppTitle?: string;
  appleTouchIcons?: AppleTouchIcon[];
  manifest?: string;
  formatDetection?: string;
}

// Security interface
export interface Security {
  referrerPolicy?: string;
  contentSecurityPolicy?: string;
  xUaCompatible?: string;
}

// Image Validation interface
export interface ImageValidation {
  url: string;
  exists: boolean;
  statusCode?: number;
  contentType?: string;
  error?: string;
}

export interface ImageValidations {
  ogImage?: ImageValidation;
  twitterImage?: ImageValidation;
}

/**
 * Common structure for both main analysis and history snapshots
 */
export interface MetadataSnapshot {
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  viewport?: string;
  charset?: string;
  author?: string;
  themeColor?: string;
  language?: string;
  favicon?: string;
  hreflang?: HreflangEntry[];
  openGraph?: OpenGraphData;
  twitter?: TwitterData;
  // New categories
  structuredData?: StructuredData;
  technicalSeo?: TechnicalSeo;
  siteVerification?: SiteVerification;
  mobile?: Mobile;
  security?: Security;
  imageValidation?: ImageValidations;
  issues?: AnalysisIssue[];
}

export interface CategoryScores {
  basicSeo: number;
  social: number;
  twitter: number;
  technical: number;
}

export interface ScanHistoryEntry {
  scannedAt: string;
  scannedBy: { name: string; email: string };
  score: number;
  categoryScores?: CategoryScores;
  changesDetected: boolean;
  snapshot?: MetadataSnapshot;
}

export interface SavedAnalysis extends MetadataSnapshot {
  _id: string;
  url: string;
  score: number;
  categoryScores?: CategoryScores;
  issues: AnalysisIssue[];
  plannedTitle?: string;
  plannedDescription?: string;
  analyzedAt: string;
  analyzedBy?: { name: string; email: string };
  scanCount?: number;
  lastScannedAt?: string;
  lastScannedBy?: { name: string; email: string };
  scanHistory?: ScanHistoryEntry[];
  isNew?: boolean;
}
