import mongoose, { Schema, Document, Model } from 'mongoose';

export type FeedbackType = 'bug' | 'feature' | 'question' | 'other';
export type FeedbackUrgency = 'low' | 'medium' | 'high';
export type FeedbackStatus = 'new' | 'reviewed' | 'resolved';

export interface IFeedbackNote {
  _id: mongoose.Types.ObjectId;
  text: string;
  author: mongoose.Types.ObjectId | { _id: string; name: string; email: string; image?: string };
  createdAt: Date;
}

export interface IFeedback extends Document {
  _id: mongoose.Types.ObjectId;
  description: string;
  type: FeedbackType;
  urgency: FeedbackUrgency;

  // Auto-captured context
  pageUrl: string;
  toolId: string | null;
  toolName: string | null;
  clientId: mongoose.Types.ObjectId | null;
  browser: string;
  viewport: { width: number; height: number };
  userAgent: string;
  consoleErrors: string[];

  // Optional screenshot
  screenshotUrl: string | null;

  // Metadata
  submittedBy: mongoose.Types.ObjectId;
  status: FeedbackStatus;
  resolvedNotificationSeen: boolean;
  notes?: IFeedbackNote[];
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['bug', 'feature', 'question', 'other'],
      required: true,
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },

    // Auto-captured context
    pageUrl: {
      type: String,
      required: true,
    },
    toolId: {
      type: String,
      default: null,
    },
    toolName: {
      type: String,
      default: null,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    browser: {
      type: String,
      required: true,
    },
    viewport: {
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    },
    userAgent: {
      type: String,
      required: true,
    },
    consoleErrors: {
      type: [String],
      default: [],
    },

    // Optional screenshot
    screenshotUrl: {
      type: String,
      default: null,
    },

    // Metadata
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'resolved'],
      default: 'new',
    },
    resolvedNotificationSeen: {
      type: Boolean,
      default: false,
    },
    notes: [{
      text: { type: String, required: true },
      author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      createdAt: { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ type: 1 });
feedbackSchema.index({ toolId: 1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ submittedBy: 1, status: 1, resolvedNotificationSeen: 1 });

export const Feedback: Model<IFeedback> =
  mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', feedbackSchema);
