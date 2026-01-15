import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMetaTagAnalysis extends Document {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  url: string;
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
  };
  issues: Array<{
    type: 'error' | 'warning' | 'success';
    field: string;
    message: string;
  }>;
  plannedTitle?: string;
  plannedDescription?: string;
  score: number;
  analyzedBy: mongoose.Types.ObjectId;
  analyzedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

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
    openGraph: {
      title: String,
      description: String,
      image: String,
      url: String,
      type: String,
      siteName: String,
    },
    twitter: {
      card: String,
      title: String,
      description: String,
      image: String,
      site: String,
    },
    issues: [{
      type: {
        type: String,
        enum: ['error', 'warning', 'success'],
        required: true,
      },
      field: {
        type: String,
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
    }],
    plannedTitle: String,
    plannedDescription: String,
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
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
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
metaTagAnalysisSchema.index({ clientId: 1, url: 1 });
metaTagAnalysisSchema.index({ clientId: 1, analyzedAt: -1 });

export const MetaTagAnalysis: Model<IMetaTagAnalysis> =
  mongoose.models.MetaTagAnalysis || mongoose.model<IMetaTagAnalysis>('MetaTagAnalysis', metaTagAnalysisSchema);
