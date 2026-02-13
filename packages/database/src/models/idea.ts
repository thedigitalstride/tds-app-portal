import mongoose, { Schema, Document, Model } from 'mongoose';

// Stage names
export type IdeaStage = 'seed' | 'shape' | 'research' | 'refine' | 'prd';

// Pipeline statuses
export type IdeaStatus = 'draft' | 'approved' | 'in-progress' | 'completed' | 'archived';

// Scoring recommendation
export type ScoreRecommendation = 'strong-go' | 'go' | 'conditional' | 'reconsider' | 'no-go';

// Attachment types
export type AttachmentType = 'image' | 'pdf' | 'spreadsheet';

export interface IAttachment {
  id: string;
  filename: string;
  blobUrl: string;
  type: AttachmentType;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

// Message option for multiple choice
export interface IMessageOption {
  id: string;
  label: string;
  value: string;
}

// Conversation message
export interface IIdeaMessage {
  role: 'assistant' | 'user';
  content: string;
  options?: IMessageOption[];
  selectedOptionId?: string;
  attachments?: IAttachment[];
  timestamp: Date;
}

// Extracted data per stage
export interface ISeedData {
  problemStatement?: string;
  targetAudience?: string;
  successDefinition?: string;
  rawIdea?: string;
}

export interface IShapeData {
  targetUsers?: string;
  keyFeatures?: string[];
  constraints?: string[];
  platform?: string;
  complexity?: string;
}

export interface IResearchData {
  existingSolutions?: string[];
  marketGaps?: string[];
  opportunities?: string[];
  userResearchNotes?: string;
  userResearchLinks?: string[];
}

export interface IRefineData {
  assumptions?: string[];
  risks?: string[];
  mustHaveFeatures?: string[];
  niceToHaveFeatures?: string[];
  outOfScope?: string[];
  mvpDefinition?: string;
}

export interface IPrdSection {
  title: string;
  content: string;
}

export interface IPrdData {
  title?: string;
  summary?: string;
  sections?: IPrdSection[];
  fullMarkdown?: string;
  generatedAt?: Date;
}

// Stage data container
export interface IStageData {
  messages: IIdeaMessage[];
  isComplete: boolean;
  extractedData: Record<string, unknown>;
}

// Scoring
export interface IScoreDimension {
  score: number;
  reasoning: string;
}

export interface IIdeaScoring {
  viability: IScoreDimension;
  uniqueness: IScoreDimension;
  effort: IScoreDimension;
  overall: {
    score: number;
    recommendation: ScoreRecommendation;
  };
  scoredAt: Date;
}

// Comment
export interface IIdeaComment {
  userId: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

// Vote
export interface IIdeaVote {
  userId: mongoose.Types.ObjectId;
  value: 1 | -1;
  createdAt: Date;
}

// Main Idea interface
export interface IIdea extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  status: IdeaStatus;
  currentStage: IdeaStage;
  template: string | null;
  stages: {
    seed: IStageData;
    shape: IStageData;
    research: IStageData;
    refine: IStageData;
    prd: IStageData;
  };
  scoring?: IIdeaScoring;
  collaborators: mongoose.Types.ObjectId[];
  comments: IIdeaComment[];
  votes: IIdeaVote[];
  voteScore: number;
  createdBy: mongoose.Types.ObjectId;
  totalTokensUsed: number;
  aiModel: string;
  createdAt: Date;
  updatedAt: Date;
}

// Subdocument schemas

const messageOptionSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const attachmentSchema = new Schema(
  {
    id: { type: String, required: true },
    filename: { type: String, required: true },
    blobUrl: { type: String, required: true },
    type: { type: String, enum: ['image', 'pdf', 'spreadsheet'], required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new Schema(
  {
    role: { type: String, enum: ['assistant', 'user'], required: true },
    content: { type: String, required: true },
    options: [messageOptionSchema],
    selectedOptionId: String,
    attachments: [attachmentSchema],
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const stageDataSchema = new Schema(
  {
    messages: [messageSchema],
    isComplete: { type: Boolean, default: false },
    extractedData: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { _id: false }
);

const scoreDimensionSchema = new Schema(
  {
    score: { type: Number, min: 1, max: 10 },
    reasoning: String,
  },
  { _id: false }
);

const scoringSchema = new Schema(
  {
    viability: scoreDimensionSchema,
    uniqueness: scoreDimensionSchema,
    effort: scoreDimensionSchema,
    overall: {
      score: { type: Number, min: 1, max: 10 },
      recommendation: {
        type: String,
        enum: ['strong-go', 'go', 'conditional', 'reconsider', 'no-go'],
      },
    },
    scoredAt: Date,
  },
  { _id: false }
);

const commentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const voteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    value: { type: Number, enum: [1, -1], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const defaultStage = () => ({
  messages: [],
  isComplete: false,
  extractedData: {},
});

const ideaSchema = new Schema<IIdea>(
  {
    title: {
      type: String,
      default: 'Untitled Idea',
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'in-progress', 'completed', 'archived'],
      default: 'draft',
    },
    currentStage: {
      type: String,
      enum: ['seed', 'shape', 'research', 'refine', 'prd'],
      default: 'seed',
    },
    template: {
      type: String,
      default: null,
    },
    stages: {
      seed: { type: stageDataSchema, default: defaultStage },
      shape: { type: stageDataSchema, default: defaultStage },
      research: { type: stageDataSchema, default: defaultStage },
      refine: { type: stageDataSchema, default: defaultStage },
      prd: { type: stageDataSchema, default: defaultStage },
    },
    scoring: {
      type: scoringSchema,
      default: undefined,
    },
    collaborators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
    votes: [voteSchema],
    voteScore: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalTokensUsed: {
      type: Number,
      default: 0,
    },
    aiModel: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ideaSchema.index({ createdBy: 1, createdAt: -1 });
ideaSchema.index({ status: 1, updatedAt: -1 });
ideaSchema.index({ voteScore: -1 });

// Delete cached model in development to pick up schema changes
if (process.env.NODE_ENV !== 'production' && mongoose.models.Idea) {
  delete mongoose.models.Idea;
}

export const Idea: Model<IIdea> =
  mongoose.models.Idea || mongoose.model<IIdea>('Idea', ideaSchema);
