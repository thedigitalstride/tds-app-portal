import OpenAI from 'openai';
import {
  type RawAIResponse,
  type OpenAIModel,
  DEFAULT_OPENAI_MODEL,
  AIServiceError,
} from './types';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AIServiceError(
        'OPENAI_API_KEY environment variable is not set',
        'openai',
        'MISSING_API_KEY'
      );
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export interface OpenAIRequestOptions {
  systemPrompt: string;
  userPrompt: string;
  model?: OpenAIModel;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Send a request to OpenAI and get a response.
 */
export async function sendOpenAIRequest(
  options: OpenAIRequestOptions
): Promise<RawAIResponse> {
  const {
    systemPrompt,
    userPrompt,
    model = DEFAULT_OPENAI_MODEL,
    maxTokens = 4096,
    temperature = 0.3,
  } = options;

  const openai = getClient();

  try {
    const response = await openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const choice = response.choices[0];
    if (!choice || !choice.message.content) {
      throw new AIServiceError(
        'No content in OpenAI response',
        'openai',
        'EMPTY_RESPONSE'
      );
    }

    return {
      content: choice.message.content,
      model: response.model,
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
          }
        : undefined,
    };
  } catch (error) {
    if (error instanceof AIServiceError) {
      throw error;
    }

    if (error instanceof OpenAI.APIError) {
      throw new AIServiceError(
        error.message,
        'openai',
        error.status?.toString() || 'API_ERROR',
        error.status
      );
    }

    throw new AIServiceError(
      error instanceof Error ? error.message : 'Unknown error',
      'openai',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Check if OpenAI API is configured.
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
