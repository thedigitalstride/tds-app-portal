import mongoose, { Schema, Document, Model } from 'mongoose';

export type CookieConsentProvider = 'none' | 'cookiebot';

export interface ICookieDomainConfig extends Document {
  _id: mongoose.Types.ObjectId;
  /** Domain without protocol, e.g., "thedigitalstride.co.uk" */
  domain: string;
  /** Client this config belongs to */
  clientId: mongoose.Types.ObjectId;
  /** Cookie consent provider to use for this domain */
  cookieConsentProvider: CookieConsentProvider;
  createdAt: Date;
  updatedAt: Date;
}

const cookieDomainConfigSchema = new Schema<ICookieDomainConfig>(
  {
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    cookieConsentProvider: {
      type: String,
      enum: ['none', 'cookiebot'],
      default: 'none',
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: one config per domain per client
cookieDomainConfigSchema.index({ domain: 1, clientId: 1 }, { unique: true });

// Delete cached model in development
if (process.env.NODE_ENV !== 'production' && mongoose.models.CookieDomainConfig) {
  delete mongoose.models.CookieDomainConfig;
}

export const CookieDomainConfig: Model<ICookieDomainConfig> =
  mongoose.models.CookieDomainConfig ||
  mongoose.model<ICookieDomainConfig>('CookieDomainConfig', cookieDomainConfigSchema);
