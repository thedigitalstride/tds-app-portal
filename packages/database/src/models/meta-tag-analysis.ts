import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHreflangEntry {
  lang: string;
  url: string;
}

// Extended Open Graph interfaces
export interface IOpenGraphImage {
  alt?: string;
  width?: number;
  height?: number;
  type?: string;
}

export interface IOpenGraphArticle {
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

// Extended Twitter interfaces
export interface ITwitterPlayer {
  url?: string;
  width?: number;
  height?: number;
}

export interface ITwitterApp {
  nameIphone?: string;
  idIphone?: string;
  urlIphone?: string;
  nameAndroid?: string;
  idAndroid?: string;
  urlAndroid?: string;
}

// Structured Data interface
export interface IStructuredData {
  found: boolean;
  isValidJson: boolean;
  types: string[];
  validationErrors: string[];
  rawScripts?: string[];
  /** @deprecated Use validationErrors instead. Kept for backwards compatibility with existing data. */
  errors?: string[];
}

// Technical SEO interfaces
export interface IRobotsDirectives {
  index?: boolean;
  follow?: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  maxSnippet?: number;
  maxImagePreview?: string;
  maxVideoPreview?: number;
}

export interface ITechnicalSeo {
  robotsDirectives?: IRobotsDirectives;
  prevUrl?: string;
  nextUrl?: string;
  keywords?: string;
  generator?: string;
}

// Site Verification interface
export interface ISiteVerification {
  google?: string;
  bing?: string;
  pinterest?: string;
  facebook?: string;
  yandex?: string;
}

// Mobile/PWA interfaces
export interface IAppleTouchIcon {
  href: string;
  sizes?: string;
}

export interface IMobile {
  appleWebAppCapable?: string;
  appleWebAppStatusBarStyle?: string;
  appleWebAppTitle?: string;
  appleTouchIcons?: IAppleTouchIcon[];
  manifest?: string;
  formatDetection?: string;
}

// Security interface
export interface ISecurity {
  referrerPolicy?: string;
  contentSecurityPolicy?: string;
  xUaCompatible?: string;
}

// Image Validation interface
export interface IImageValidation {
  url: string;
  exists: boolean;
  statusCode?: number;
  contentType?: string;
  error?: string;
}

export interface ICategoryScores {
  basicSeo: number;
  social: number;
  twitter: number;
  technical: number;
}

export interface IScanHistoryEntry {
  scannedAt: Date;
  scannedBy: mongoose.Types.ObjectId;
  score: number;
  categoryScores?: ICategoryScores;
  changesDetected: boolean;
  // Full snapshot of data at this point in time
  snapshot: {
    title: string;
    description: string;
    canonical?: string;
    robots?: string;
    // Additional meta tags
    viewport?: string;
    charset?: string;
    author?: string;
    themeColor?: string;
    language?: string;
    favicon?: string;
    hreflang?: IHreflangEntry[];
    // Social tags
    openGraph?: {
      title?: string;
      description?: string;
      image?: string;
      url?: string;
      type?: string;
      siteName?: string;
      // Extended OG fields
      imageDetails?: IOpenGraphImage;
      locale?: string;
      localeAlternate?: string[];
      article?: IOpenGraphArticle;
      fbAppId?: string;
    };
    twitter?: {
      card?: string;
      title?: string;
      description?: string;
      image?: string;
      site?: string;
      // Extended Twitter fields
      creator?: string;
      imageAlt?: string;
      player?: ITwitterPlayer;
      app?: ITwitterApp;
    };
    // New categories
    structuredData?: IStructuredData;
    technicalSeo?: ITechnicalSeo;
    siteVerification?: ISiteVerification;
    mobile?: IMobile;
    security?: ISecurity;
    imageValidation?: {
      ogImage?: IImageValidation;
      twitterImage?: IImageValidation;
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
  // Additional meta tags
  viewport?: string;
  charset?: string;
  author?: string;
  themeColor?: string;
  language?: string;
  favicon?: string;
  hreflang?: IHreflangEntry[];
  // Social tags
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
    // Extended OG fields
    imageDetails?: IOpenGraphImage;
    locale?: string;
    localeAlternate?: string[];
    article?: IOpenGraphArticle;
    fbAppId?: string;
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
    // Extended Twitter fields
    creator?: string;
    imageAlt?: string;
    player?: ITwitterPlayer;
    app?: ITwitterApp;
  };
  // New categories
  structuredData?: IStructuredData;
  technicalSeo?: ITechnicalSeo;
  siteVerification?: ISiteVerification;
  mobile?: IMobile;
  security?: ISecurity;
  imageValidation?: {
    ogImage?: IImageValidation;
    twitterImage?: IImageValidation;
  };
  issues: Array<{
    type: 'error' | 'warning' | 'success';
    field: string;
    message: string;
  }>;
  plannedTitle?: string;
  plannedDescription?: string;
  score: number;
  categoryScores?: ICategoryScores;
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

// Extended OG Image details
const openGraphImageSchema = new Schema(
  {
    alt: String,
    width: Number,
    height: Number,
    type: String,
  },
  { _id: false }
);

// OG Article metadata
const openGraphArticleSchema = new Schema(
  {
    publishedTime: String,
    modifiedTime: String,
    author: String,
    section: String,
    tags: [String],
  },
  { _id: false }
);

const openGraphSchema = new Schema(
  {
    title: String,
    description: String,
    image: String,
    url: String,
    type: String,
    siteName: String,
    // Extended OG fields
    imageDetails: openGraphImageSchema,
    locale: String,
    localeAlternate: [String],
    article: openGraphArticleSchema,
    fbAppId: String,
  },
  { _id: false }
);

// Twitter Player schema
const twitterPlayerSchema = new Schema(
  {
    url: String,
    width: Number,
    height: Number,
  },
  { _id: false }
);

// Twitter App schema
const twitterAppSchema = new Schema(
  {
    nameIphone: String,
    idIphone: String,
    urlIphone: String,
    nameAndroid: String,
    idAndroid: String,
    urlAndroid: String,
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
    // Extended Twitter fields
    creator: String,
    imageAlt: String,
    player: twitterPlayerSchema,
    app: twitterAppSchema,
  },
  { _id: false }
);

// Structured Data schema
const structuredDataSchema = new Schema(
  {
    found: Boolean,
    isValidJson: Boolean,
    types: [String],
    validationErrors: [String],
    rawScripts: [String],
  },
  { _id: false }
);

// Robots Directives schema
const robotsDirectivesSchema = new Schema(
  {
    index: Boolean,
    follow: Boolean,
    noarchive: Boolean,
    nosnippet: Boolean,
    maxSnippet: Number,
    maxImagePreview: String,
    maxVideoPreview: Number,
  },
  { _id: false }
);

// Technical SEO schema
const technicalSeoSchema = new Schema(
  {
    robotsDirectives: robotsDirectivesSchema,
    prevUrl: String,
    nextUrl: String,
    keywords: String,
    generator: String,
  },
  { _id: false }
);

// Site Verification schema
const siteVerificationSchema = new Schema(
  {
    google: String,
    bing: String,
    pinterest: String,
    facebook: String,
    yandex: String,
  },
  { _id: false }
);

// Apple Touch Icon schema
const appleTouchIconSchema = new Schema(
  {
    href: String,
    sizes: String,
  },
  { _id: false }
);

// Mobile/PWA schema
const mobileSchema = new Schema(
  {
    appleWebAppCapable: String,
    appleWebAppStatusBarStyle: String,
    appleWebAppTitle: String,
    appleTouchIcons: [appleTouchIconSchema],
    manifest: String,
    formatDetection: String,
  },
  { _id: false }
);

// Security schema
const securitySchema = new Schema(
  {
    referrerPolicy: String,
    contentSecurityPolicy: String,
    xUaCompatible: String,
  },
  { _id: false }
);

// Image Validation schema
const imageValidationSchema = new Schema(
  {
    url: String,
    exists: Boolean,
    statusCode: Number,
    contentType: String,
    error: String,
  },
  { _id: false }
);

// Combined image validations schema
const imageValidationsSchema = new Schema(
  {
    ogImage: imageValidationSchema,
    twitterImage: imageValidationSchema,
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

// Category scores schema for severity-based scoring
const categoryScoresSchema = new Schema(
  {
    basicSeo: { type: Number, min: 0, max: 100 },
    social: { type: Number, min: 0, max: 100 },
    twitter: { type: Number, min: 0, max: 100 },
    technical: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

// Hreflang entry schema for internationalization
const hreflangSchema = new Schema(
  {
    lang: String,
    url: String,
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
    // Additional meta tags
    viewport: String,
    charset: String,
    author: String,
    themeColor: String,
    language: String,
    favicon: String,
    hreflang: [hreflangSchema],
    // Social tags
    openGraph: {
      type: openGraphSchema,
      default: undefined,
    },
    twitter: {
      type: twitterSchema,
      default: undefined,
    },
    // New categories
    structuredData: {
      type: structuredDataSchema,
      default: undefined,
    },
    technicalSeo: {
      type: technicalSeoSchema,
      default: undefined,
    },
    siteVerification: {
      type: siteVerificationSchema,
      default: undefined,
    },
    mobile: {
      type: mobileSchema,
      default: undefined,
    },
    security: {
      type: securitySchema,
      default: undefined,
    },
    imageValidation: {
      type: imageValidationsSchema,
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
    categoryScores: {
      type: categoryScoresSchema,
      default: undefined,
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
    // Additional meta tags
    viewport: String,
    charset: String,
    author: String,
    themeColor: String,
    language: String,
    favicon: String,
    hreflang: [hreflangSchema],
    // Social tags
    openGraph: {
      type: openGraphSchema,
      default: () => ({}),
    },
    twitter: {
      type: twitterSchema,
      default: () => ({}),
    },
    // New categories
    structuredData: {
      type: structuredDataSchema,
      default: undefined,
    },
    technicalSeo: {
      type: technicalSeoSchema,
      default: undefined,
    },
    siteVerification: {
      type: siteVerificationSchema,
      default: undefined,
    },
    mobile: {
      type: mobileSchema,
      default: undefined,
    },
    security: {
      type: securitySchema,
      default: undefined,
    },
    imageValidation: {
      type: imageValidationsSchema,
      default: undefined,
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
