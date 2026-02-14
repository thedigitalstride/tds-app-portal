import mongoose, { Schema, Document, Model } from 'mongoose';

export const IDEATION_PROMPT_KEYS = [
  'system-base',
  'seed',
  'shape',
  'research',
  'refine',
  'prd',
  'scoring',
  'inspiration',
] as const;

export type IdeationPromptKey = (typeof IDEATION_PROMPT_KEYS)[number];

export interface IIdeationPromptOverride extends Document {
  _id: mongoose.Types.ObjectId;
  promptKey: IdeationPromptKey;
  content: string;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ideationPromptOverrideSchema = new Schema<IIdeationPromptOverride>(
  {
    promptKey: {
      type: String,
      required: true,
      enum: IDEATION_PROMPT_KEYS,
      unique: true,
    },
    content: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Delete cached model in development
if (process.env.NODE_ENV !== 'production' && mongoose.models.IdeationPromptOverride) {
  delete mongoose.models.IdeationPromptOverride;
}

export const IdeationPromptOverride: Model<IIdeationPromptOverride> =
  mongoose.models.IdeationPromptOverride ||
  mongoose.model<IIdeationPromptOverride>('IdeationPromptOverride', ideationPromptOverrideSchema);
