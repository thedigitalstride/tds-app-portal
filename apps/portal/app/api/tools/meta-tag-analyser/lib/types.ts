/**
 * Shared API types for Meta Tag Analyser routes.
 *
 * Re-exports common types from the frontend types module and adds
 * API-specific types (MetaTagResult) that include fields not needed
 * by the frontend (e.g., `other` meta tags, `url`).
 */

export type {
  HreflangEntry,
  AnalysisIssue,
  OpenGraphImage,
  OpenGraphArticle,
  OpenGraphData,
  TwitterPlayer,
  TwitterApp,
  TwitterData,
  StructuredData,
  RobotsDirectives,
  TechnicalSeo,
  SiteVerification,
  AppleTouchIcon,
  Mobile,
  Security,
  ImageValidation,
  ImageValidations,
  MetadataSnapshot,
  CategoryScores,
} from '@/app/tools/meta-tag-analyser/components/types';

import type {
  HreflangEntry,
  OpenGraphImage,
  OpenGraphArticle,
  TwitterPlayer,
  TwitterApp,
  StructuredData,
  TechnicalSeo,
  SiteVerification,
  Mobile,
  Security,
  ImageValidation,
} from '@/app/tools/meta-tag-analyser/components/types';

/**
 * API-specific result type returned by parsing functions.
 * Extends MetadataSnapshot with `url` and `other` meta tags.
 */
export interface MetaTagResult {
  url: string;
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
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
    imageDetails?: OpenGraphImage;
    locale?: string;
    localeAlternate?: string[];
    article?: OpenGraphArticle;
    fbAppId?: string;
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
    creator?: string;
    imageAlt?: string;
    player?: TwitterPlayer;
    app?: TwitterApp;
  };
  structuredData?: StructuredData;
  technicalSeo?: TechnicalSeo;
  siteVerification?: SiteVerification;
  mobile?: Mobile;
  security?: Security;
  imageValidation?: {
    ogImage?: ImageValidation;
    twitterImage?: ImageValidation;
  };
  other?: Array<{ name: string; content: string }>;
}
