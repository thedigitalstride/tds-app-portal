import type { IAdData, IV2CategoryScores } from '@tds/database';

// AI Provider types
export type AIProvider = 'claude' | 'openai';

// Analysis focus types
export type AnalysisFocus = 'ecommerce' | 'leadgen' | 'b2b' | 'general';

// Model options for each provider
export const CLAUDE_MODELS = {
  'claude-sonnet-4-20250514': 'Claude Sonnet 4 (Recommended)',
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
  'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku (Faster)',
} as const;

export const OPENAI_MODELS = {
  'gpt-4o': 'GPT-4o (Recommended)',
  'gpt-4o-mini': 'GPT-4o Mini (Faster)',
  'gpt-4-turbo': 'GPT-4 Turbo',
} as const;

export type ClaudeModel = keyof typeof CLAUDE_MODELS;
export type OpenAIModel = keyof typeof OPENAI_MODELS;

// Default models
export const DEFAULT_CLAUDE_MODEL: ClaudeModel = 'claude-sonnet-4-20250514';
export const DEFAULT_OPENAI_MODEL: OpenAIModel = 'gpt-4o';

// Request types
export interface PageContent {
  html: string;
  url: string;
  title?: string;
  metaDescription?: string;
}

export interface AnalyzeRequest {
  pageContent: PageContent;
  adData: IAdData;
  provider: AIProvider;
  model?: string;
  focus?: AnalysisFocus;
}

// Response types matching the V2 schema
export interface AIIssue {
  severity: 'critical' | 'warning' | 'suggestion';
  category: keyof IV2CategoryScores;
  element: string;
  problem: string;
  location?: string;
  impact: string;
}

export interface AIRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: keyof IV2CategoryScores;
  action: string;
  currentState: string;
  suggestedChange: string;
  estimatedImpact: string;
}

export interface AIMessageMatchItem {
  adElement: string;
  pageElement?: string;
  matchStrength: 'strong' | 'partial' | 'weak' | 'missing';
  notes?: string;
}

export interface AISummary {
  strengths: string[];
  weaknesses: string[];
  quickWins: string[];
}

export interface AIAnalysisResult {
  overallScore: number;
  categoryScores: IV2CategoryScores;
  issues: AIIssue[];
  recommendations: AIRecommendation[];
  messageMatchMap: AIMessageMatchItem[];
  summary: AISummary;
}

// Raw AI response (before validation)
export interface RawAIResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// Error types
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly provider: AIProvider,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}
