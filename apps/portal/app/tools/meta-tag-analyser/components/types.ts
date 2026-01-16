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

export interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
}

export interface TwitterData {
  card?: string;
  title?: string;
  description?: string;
  image?: string;
  site?: string;
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
  issues?: AnalysisIssue[];
}

export interface ScanHistoryEntry {
  scannedAt: string;
  scannedBy: { name: string; email: string };
  score: number;
  changesDetected: boolean;
  snapshot?: MetadataSnapshot;
}

export interface SavedAnalysis extends MetadataSnapshot {
  _id: string;
  url: string;
  score: number;
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
