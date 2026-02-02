import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPageSnapshot extends Document {
  _id: mongoose.Types.ObjectId;
  url: string;
  urlHash: string;

  // Snapshot metadata
  fetchedAt: Date;
  fetchedBy: mongoose.Types.ObjectId;
  triggeredByClient: mongoose.Types.ObjectId;
  triggeredByTool: string;

  // Storage reference (Vercel Blob)
  blobUrl: string;
  contentSize: number;

  // Key HTTP headers
  httpStatus: number;
  contentType?: string;
  lastModified?: string;
  cacheControl?: string;
  xRobotsTag?: string;

  // Screenshot storage (Vercel Blob URLs)
  screenshotDesktopUrl?: string;
  screenshotMobileUrl?: string;
  screenshotDesktopSize?: number;
  screenshotMobileSize?: number;

  // Render metadata
  renderMethod: 'fetch' | 'scrapingbee';
  jsRendered: boolean;
  renderTimeMs?: number;

  // ScrapingBee metadata
  scrapingBeeCreditsUsed?: number;
  resolvedUrl?: string;
  /** Which proxy tier was used ('standard' | 'premium' | 'stealth') */
  proxyTierUsed?: 'standard' | 'premium' | 'stealth';

  createdAt: Date;
}

const pageSnapshotSchema = new Schema<IPageSnapshot>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    urlHash: {
      type: String,
      required: true,
      index: true,
    },
    fetchedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    fetchedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    triggeredByClient: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    triggeredByTool: {
      type: String,
      required: true,
    },
    blobUrl: {
      type: String,
      required: true,
    },
    contentSize: {
      type: Number,
      required: true,
      min: 0,
    },
    httpStatus: {
      type: Number,
      required: true,
      min: 100,
      max: 599,
    },
    contentType: String,
    lastModified: String,
    cacheControl: String,
    xRobotsTag: String,
    // Screenshot storage
    screenshotDesktopUrl: String,
    screenshotMobileUrl: String,
    screenshotDesktopSize: {
      type: Number,
      min: 0,
    },
    screenshotMobileSize: {
      type: Number,
      min: 0,
    },
    // Render metadata
    renderMethod: {
      type: String,
      enum: ['fetch', 'scrapingbee'],
      default: 'fetch',
    },
    jsRendered: {
      type: Boolean,
      default: false,
    },
    renderTimeMs: Number,
    // ScrapingBee metadata
    scrapingBeeCreditsUsed: Number,
    resolvedUrl: String,
    proxyTierUsed: {
      type: String,
      enum: ['standard', 'premium', 'stealth'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes for efficient queries
pageSnapshotSchema.index({ urlHash: 1, fetchedAt: -1 });
pageSnapshotSchema.index({ triggeredByClient: 1, fetchedAt: -1 });

// Delete cached model in development
if (process.env.NODE_ENV !== 'production' && mongoose.models.PageSnapshot) {
  delete mongoose.models.PageSnapshot;
}

export const PageSnapshot: Model<IPageSnapshot> =
  mongoose.models.PageSnapshot || mongoose.model<IPageSnapshot>('PageSnapshot', pageSnapshotSchema);
