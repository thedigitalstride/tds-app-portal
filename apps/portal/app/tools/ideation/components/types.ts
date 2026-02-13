import {
  Sprout,
  PenTool,
  Telescope,
  Gem,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';
import type {
  IdeaStage,
  IdeaStatus,
  ScoreRecommendation,
  IIdeaMessage,
  IMessageOption,
  IAttachment,
  AttachmentType,
  IStageData,
  ISeedData,
  IShapeData,
  IResearchData,
  IRefineData,
  IPrdData,
  IPrdSection,
  IIdeaScoring,
  IScoreDimension,
  IIdeaComment,
  IIdeaVote,
} from '@tds/database';

// Re-export database types for frontend use
export type {
  IdeaStage,
  IdeaStatus,
  ScoreRecommendation,
  IIdeaMessage,
  IMessageOption,
  IAttachment,
  AttachmentType,
  IStageData,
  ISeedData,
  IShapeData,
  IResearchData,
  IRefineData,
  IPrdData,
  IPrdSection,
  IIdeaScoring,
  IScoreDimension,
  IIdeaComment,
  IIdeaVote,
};

// Frontend-specific types

export interface IdeaSummary {
  _id: string;
  title: string;
  status: IdeaStatus;
  currentStage: IdeaStage;
  template: string | null;
  scoring?: {
    overall: {
      score: number;
      recommendation: ScoreRecommendation;
    };
  };
  voteScore: number;
  commentCount: number;
  createdBy: {
    _id: string;
    name: string;
    image?: string;
  };
  collaborators: Array<{ _id: string; name: string; image?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface IdeaFull extends IdeaSummary {
  stages: {
    seed: IStageData;
    shape: IStageData;
    research: IStageData;
    refine: IStageData;
    prd: IStageData;
  };
  scoring?: IIdeaScoring;
  comments: Array<IIdeaComment & { userId: { _id: string; name: string; image?: string } }>;
  votes: Array<IIdeaVote & { userId: string }>;
  totalTokensUsed: number;
  aiModel: string;
}

export interface AIResponse {
  message: string;
  options?: Array<{ id: string; label: string; value: string }>;
  extractedData: Record<string, unknown>;
  stageReadiness: number;
  suggestedTitle?: string | null;
}

export interface InspirationIdea {
  title: string;
  description: string;
  category: string;
}

export const STAGE_ORDER: IdeaStage[] = ['seed', 'shape', 'research', 'refine', 'prd'];

export const STAGE_LABELS: Record<IdeaStage, string> = {
  seed: 'Seed the Idea',
  shape: 'Shape & Scope',
  research: 'Research & Validate',
  refine: 'Refine & Prioritise',
  prd: 'Generate PRD',
};

export const STAGE_SHORT_LABELS: Record<IdeaStage, string> = {
  seed: 'Seed',
  shape: 'Shape',
  research: 'Research',
  refine: 'Refine',
  prd: 'PRD',
};

export const STAGE_DESCRIPTIONS: Record<IdeaStage, { description: string; outcome: string }> = {
  seed: {
    description: 'Capture the raw idea, the problem it solves, who it\'s for, and what success looks like.',
    outcome: 'Clear problem statement, target audience, and success criteria.',
  },
  shape: {
    description: 'Define boundaries — platform, key features, constraints, and complexity level.',
    outcome: 'Scoped feature list, platform choice, and complexity assessment.',
  },
  research: {
    description: 'Explore existing solutions, identify market gaps, and add your own research.',
    outcome: 'Competitive landscape and clear differentiation angle.',
  },
  refine: {
    description: 'Challenge assumptions, identify risks, and prioritise features into MVP.',
    outcome: 'Validated MVP definition with must-have vs nice-to-have features.',
  },
  prd: {
    description: 'Compile everything into a structured Product Requirements Document.',
    outcome: 'Downloadable PRD ready for the team.',
  },
};

export const STATUS_LABELS: Record<IdeaStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  'in-progress': 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
};

export const STATUS_COLOURS: Record<IdeaStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-700',
  approved: 'bg-green-100 text-green-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-purple-100 text-purple-700',
  archived: 'bg-neutral-100 text-neutral-400',
};

export const RECOMMENDATION_LABELS: Record<ScoreRecommendation, string> = {
  'strong-go': 'Strong Go',
  go: 'Go',
  conditional: 'Conditional',
  reconsider: 'Reconsider',
  'no-go': 'No Go',
};

export const RECOMMENDATION_COLOURS: Record<ScoreRecommendation, string> = {
  'strong-go': 'bg-green-100 text-green-700',
  go: 'bg-emerald-100 text-emerald-700',
  conditional: 'bg-amber-100 text-amber-700',
  reconsider: 'bg-orange-100 text-orange-700',
  'no-go': 'bg-red-100 text-red-700',
};

// Stage visual configuration for the Journey Bar

export interface StageConfig {
  icon: LucideIcon;
  primary: string;
  lightBg: string;
  gradientFrom: string;
  gradientTo: string;
  accent: string;
}

export const STAGE_CONFIG: Record<IdeaStage, StageConfig> = {
  seed: {
    icon: Sprout,
    primary: '#8B6F47',
    lightBg: '#FAF5EF',
    gradientFrom: '#C4A46C',
    gradientTo: '#8B6F47',
    accent: '#D4A843',
  },
  shape: {
    icon: PenTool,
    primary: '#B85C3A',
    lightBg: '#FDF2EE',
    gradientFrom: '#D4845A',
    gradientTo: '#B85C3A',
    accent: '#E8A07A',
  },
  research: {
    icon: Telescope,
    primary: '#2D7A8A',
    lightBg: '#EDF7F9',
    gradientFrom: '#4DA6B5',
    gradientTo: '#2D7A8A',
    accent: '#6EC5D4',
  },
  refine: {
    icon: Gem,
    primary: '#6B4FA0',
    lightBg: '#F5F0FB',
    gradientFrom: '#9B7FCC',
    gradientTo: '#6B4FA0',
    accent: '#B89DE8',
  },
  prd: {
    icon: ScrollText,
    primary: '#1A6B3C',
    lightBg: '#EFF8F2',
    gradientFrom: '#3DA066',
    gradientTo: '#1A6B3C',
    accent: '#5CC080',
  },
};
