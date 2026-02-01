import { sendClaudeRequest, isClaudeConfigured } from './claude-client';
import { sendOpenAIRequest, isOpenAIConfigured } from './openai-client';
import { parseAIResponse } from './output-parser';
import { SYSTEM_PROMPT, buildUserPrompt, getFocusAdditions } from './prompts';
import type {
  AnalyzeRequest,
  AIAnalysisResult,
  AIProvider,
  ClaudeModel,
  OpenAIModel,
} from './types';
import { DEFAULT_CLAUDE_MODEL, DEFAULT_OPENAI_MODEL, AIServiceError } from './types';

export interface AnalysisResponse {
  result: AIAnalysisResult;
  model: string;
  provider: AIProvider;
  analysisTimeMs: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Extract key content from HTML to reduce token usage.
 * Removes scripts, styles, and extracts text content while preserving structure.
 */
function extractKeyContent(html: string, maxLength: number = 15000): string {
  // Remove script and style tags
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');

  // Remove excessive whitespace but keep structure
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/> </g, '>\n<')
    .trim();

  // If still too long, truncate intelligently
  if (cleaned.length > maxLength) {
    // Try to find a good break point
    const truncated = cleaned.substring(0, maxLength);
    const lastClosingTag = truncated.lastIndexOf('</');
    if (lastClosingTag > maxLength * 0.8) {
      return truncated.substring(0, lastClosingTag) + '... [truncated]';
    }
    return truncated + '... [truncated]';
  }

  return cleaned;
}

/**
 * Extract title and meta description from HTML.
 */
function extractMetadata(html: string): { title?: string; metaDescription?: string } {
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : undefined;

  const metaMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i
  ) || html.match(
    /<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i
  );
  const metaDescription = metaMatch ? metaMatch[1].trim() : undefined;

  return { title, metaDescription };
}

/**
 * Analyze a landing page against ad creative using AI.
 */
export async function analyzeWithAI(
  request: AnalyzeRequest
): Promise<AnalysisResponse> {
  const { pageContent, adData, provider, model, focus } = request;

  const startTime = Date.now();

  // Validate provider is configured
  if (provider === 'claude' && !isClaudeConfigured()) {
    throw new AIServiceError(
      'Claude API is not configured. Please set ANTHROPIC_API_KEY.',
      'claude',
      'NOT_CONFIGURED'
    );
  }

  if (provider === 'openai' && !isOpenAIConfigured()) {
    throw new AIServiceError(
      'OpenAI API is not configured. Please set OPENAI_API_KEY.',
      'openai',
      'NOT_CONFIGURED'
    );
  }

  // Extract key content and metadata
  const cleanedHtml = extractKeyContent(pageContent.html);
  const metadata = extractMetadata(pageContent.html);

  // Build the prompt
  const focusAdditions = getFocusAdditions(focus);
  const userPrompt = buildUserPrompt(
    {
      ...pageContent,
      html: cleanedHtml,
      title: pageContent.title || metadata.title,
      metaDescription: pageContent.metaDescription || metadata.metaDescription,
    },
    adData,
    focusAdditions
  );

  // Send request to the appropriate provider
  let rawResponse;

  if (provider === 'claude') {
    rawResponse = await sendClaudeRequest({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      model: (model as ClaudeModel) || DEFAULT_CLAUDE_MODEL,
      maxTokens: 4096,
      temperature: 0.3,
    });
  } else {
    rawResponse = await sendOpenAIRequest({
      systemPrompt: SYSTEM_PROMPT + '\n\nRespond with valid JSON only.',
      userPrompt,
      model: (model as OpenAIModel) || DEFAULT_OPENAI_MODEL,
      maxTokens: 4096,
      temperature: 0.3,
    });
  }

  // Parse the response
  const result = parseAIResponse(rawResponse.content);

  const analysisTimeMs = Date.now() - startTime;

  return {
    result,
    model: rawResponse.model,
    provider,
    analysisTimeMs,
    usage: rawResponse.usage,
  };
}

/**
 * Check which AI providers are configured.
 */
export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  if (isClaudeConfigured()) providers.push('claude');
  if (isOpenAIConfigured()) providers.push('openai');
  return providers;
}

/**
 * Check if at least one AI provider is configured.
 */
export function isAIConfigured(): boolean {
  return isClaudeConfigured() || isOpenAIConfigured();
}

// Re-export types and constants for convenience
export {
  type AIProvider,
  type AnalysisFocus,
  type AIAnalysisResult,
  CLAUDE_MODELS,
  OPENAI_MODELS,
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_OPENAI_MODEL,
} from './types';
