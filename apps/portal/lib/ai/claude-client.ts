import Anthropic from '@anthropic-ai/sdk';
import {
  type RawAIResponse,
  type ClaudeModel,
  DEFAULT_CLAUDE_MODEL,
  AIServiceError,
} from './types';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AIServiceError(
        'ANTHROPIC_API_KEY environment variable is not set',
        'claude',
        'MISSING_API_KEY'
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export interface ClaudeRequestOptions {
  systemPrompt: string;
  userPrompt: string;
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Send a request to Claude and get a response.
 */
export async function sendClaudeRequest(
  options: ClaudeRequestOptions
): Promise<RawAIResponse> {
  const {
    systemPrompt,
    userPrompt,
    model = DEFAULT_CLAUDE_MODEL,
    maxTokens = 4096,
    temperature = 0.3,
  } = options;

  const anthropic = getClient();

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract text content from the response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new AIServiceError(
        'No text content in Claude response',
        'claude',
        'EMPTY_RESPONSE'
      );
    }

    return {
      content: textContent.text,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error) {
    if (error instanceof AIServiceError) {
      throw error;
    }

    if (error instanceof Anthropic.APIError) {
      throw new AIServiceError(
        error.message,
        'claude',
        error.status?.toString() || 'API_ERROR',
        error.status
      );
    }

    throw new AIServiceError(
      error instanceof Error ? error.message : 'Unknown error',
      'claude',
      'UNKNOWN_ERROR'
    );
  }
}

type ContentBlockParam = Anthropic.Messages.ContentBlockParam;

export interface ClaudeConversationMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlockParam[];
}

export interface ClaudeConversationOptions {
  systemPrompt: string;
  messages: ClaudeConversationMessage[];
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Send a multi-turn conversation to Claude and get a response.
 */
export async function sendClaudeConversation(
  options: ClaudeConversationOptions
): Promise<RawAIResponse> {
  const {
    systemPrompt,
    messages,
    model = DEFAULT_CLAUDE_MODEL,
    maxTokens = 4096,
    temperature = 0.7,
  } = options;

  const anthropic = getClient();

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new AIServiceError(
        'No text content in Claude response',
        'claude',
        'EMPTY_RESPONSE'
      );
    }

    return {
      content: textContent.text,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error) {
    if (error instanceof AIServiceError) {
      throw error;
    }

    if (error instanceof Anthropic.APIError) {
      throw new AIServiceError(
        error.message,
        'claude',
        error.status?.toString() || 'API_ERROR',
        error.status
      );
    }

    throw new AIServiceError(
      error instanceof Error ? error.message : 'Unknown error',
      'claude',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Check if Claude API is configured.
 */
export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
