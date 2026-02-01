// Main exports
export {
  analyzeWithAI,
  getAvailableProviders,
  isAIConfigured,
  type AnalysisResponse,
} from './unified-ai-service';

// Type exports
export {
  type AIProvider,
  type AnalysisFocus,
  type AIAnalysisResult,
  type AIIssue,
  type AIRecommendation,
  type AIMessageMatchItem,
  type AISummary,
  type AnalyzeRequest,
  type PageContent,
  CLAUDE_MODELS,
  OPENAI_MODELS,
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_OPENAI_MODEL,
  AIServiceError,
} from './types';

// Provider-specific exports (for advanced use)
export { isClaudeConfigured } from './claude-client';
export { isOpenAIConfigured } from './openai-client';
