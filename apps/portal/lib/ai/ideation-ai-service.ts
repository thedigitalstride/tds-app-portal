import type Anthropic from '@anthropic-ai/sdk';
import type { IdeaStage, IIdeaMessage, IStageData, IAttachment } from '@tds/database';
import {
  sendClaudeConversation,
  type ClaudeConversationMessage,
} from './claude-client';
import { type RawAIResponse } from './types';
import { buildSystemPrompt } from './prompts/ideation';
import { fetchBlobAsBuffer } from '@/lib/vercel-blob';

type ContentBlockParam = Anthropic.Messages.ContentBlockParam;

export interface IdeationAIResponse {
  message: string;
  options?: Array<{ id: string; label: string; value: string }>;
  extractedData: Record<string, unknown>;
  stageReadiness: number;
  suggestedTitle?: string | null;
}

export interface IdeationAIResult {
  response: IdeationAIResponse;
  raw: RawAIResponse;
}

const SPREADSHEET_TEXT_LIMIT = 50_000;

async function parseSpreadsheetToText(attachment: IAttachment): Promise<string> {
  const buffer = await fetchBlobAsBuffer(attachment.blobUrl);

  if (attachment.mimeType === 'text/csv') {
    const text = buffer.toString('utf-8');
    if (text.length > SPREADSHEET_TEXT_LIMIT) {
      return text.slice(0, SPREADSHEET_TEXT_LIMIT) + '\n[...truncated]';
    }
    return text;
  }

  // XLSX
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    parts.push(`--- Sheet: ${sheetName} ---\n${csv}`);
  }
  const text = parts.join('\n\n');
  if (text.length > SPREADSHEET_TEXT_LIMIT) {
    return text.slice(0, SPREADSHEET_TEXT_LIMIT) + '\n[...truncated]';
  }
  return text;
}

async function buildContentBlocks(
  text: string,
  attachments: IAttachment[]
): Promise<string | ContentBlockParam[]> {
  if (!attachments.length) return text;

  const blocks: ContentBlockParam[] = [];

  for (const att of attachments) {
    try {
      if (att.type === 'image') {
        blocks.push({
          type: 'image',
          source: { type: 'url', url: att.blobUrl },
        });
      } else if (att.type === 'pdf') {
        const buffer = await fetchBlobAsBuffer(att.blobUrl);
        const data = buffer.toString('base64');
        blocks.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data },
        });
      } else if (att.type === 'spreadsheet') {
        const spreadsheetText = await parseSpreadsheetToText(att);
        blocks.push({
          type: 'text',
          text: `[Spreadsheet: ${att.filename}]\n${spreadsheetText}`,
        });
      }
    } catch (error) {
      console.error(`Failed to process attachment ${att.filename}:`, error);
      blocks.push({
        type: 'text',
        text: `[Failed to process: ${att.filename}]`,
      });
    }
  }

  // User's text message as the final block
  if (text) {
    blocks.push({ type: 'text', text });
  }

  return blocks;
}

function buildAttachmentSummary(attachments: IAttachment[]): string {
  if (!attachments.length) return '';
  return attachments
    .map((a) => `[Attached: ${a.filename} (${a.type})]`)
    .join(' ');
}

function buildConversationMessages(
  stageMessages: IIdeaMessage[],
  previousStagesData: Record<string, Record<string, unknown>>
): ClaudeConversationMessage[] {
  const messages: ClaudeConversationMessage[] = [];

  // If there's data from previous stages, inject it as context
  const hasData = Object.values(previousStagesData).some(
    (d) => Object.keys(d).length > 0
  );
  if (hasData) {
    messages.push({
      role: 'user',
      content: `[System context - data collected from previous stages]\n${JSON.stringify(previousStagesData, null, 2)}`,
    });
    messages.push({
      role: 'assistant',
      content: JSON.stringify({
        message: "I've reviewed the context from previous stages. Let me continue building on this.",
        extractedData: {},
        stageReadiness: 0,
      }),
    });
  }

  // Add all messages from this stage
  for (const msg of stageMessages) {
    let content: string =
      msg.role === 'user' && msg.selectedOptionId
        ? `Selected: "${msg.content}" (option ${msg.selectedOptionId})`
        : msg.content;

    // For historical messages, append text summary of attachments
    if (msg.attachments?.length) {
      const summary = buildAttachmentSummary(msg.attachments);
      content = content ? `${content}\n${summary}` : summary;
    }

    messages.push({
      role: msg.role,
      content,
    });
  }

  return messages;
}

function parseAIResponse(content: string): IdeationAIResponse {
  // Try to extract JSON from the response
  let jsonStr = content.trim();

  // Handle markdown code blocks
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      message: parsed.message || content,
      options: Array.isArray(parsed.options) ? parsed.options : undefined,
      extractedData: parsed.extractedData || {},
      stageReadiness: typeof parsed.stageReadiness === 'number' ? parsed.stageReadiness : 0,
      suggestedTitle: parsed.suggestedTitle || null,
    };
  } catch {
    // Scan forward through { characters to find an embedded JSON response object
    for (let i = jsonStr.indexOf('{'); i !== -1; i = jsonStr.indexOf('{', i + 1)) {
      try {
        const parsed = JSON.parse(jsonStr.substring(i));
        if (parsed.message) {
          return {
            message: parsed.message,
            options: Array.isArray(parsed.options) ? parsed.options : undefined,
            extractedData: parsed.extractedData || {},
            stageReadiness: typeof parsed.stageReadiness === 'number' ? parsed.stageReadiness : 0,
            suggestedTitle: parsed.suggestedTitle || null,
          };
        }
      } catch {
        continue;
      }
    }

    // Final fallback — treat entire content as the message
    return {
      message: content,
      extractedData: {},
      stageReadiness: 0,
    };
  }
}

/**
 * Send a message in an ideation conversation and get the AI response.
 */
export async function sendIdeationMessage(params: {
  stage: IdeaStage;
  stageMessages: IIdeaMessage[];
  previousStagesData: Record<string, Record<string, unknown>>;
  templateContext?: string;
  currentMessageAttachments?: IAttachment[];
}): Promise<IdeationAIResult> {
  const { stage, stageMessages, previousStagesData, templateContext, currentMessageAttachments } = params;

  const systemPrompt = buildSystemPrompt(stage, templateContext);
  const messages = buildConversationMessages(stageMessages, previousStagesData);

  // If no messages yet, this is the initial message — add a trigger
  if (messages.length === 0) {
    messages.push({
      role: 'user',
      content: 'Start the conversation. Ask me about my idea.',
    });
  }

  // Replace the last user message with multimodal content blocks if attachments present
  if (currentMessageAttachments?.length && messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'user') {
      const textContent = typeof lastMsg.content === 'string' ? lastMsg.content : '';
      lastMsg.content = await buildContentBlocks(textContent, currentMessageAttachments);
    }
  }

  const raw = await sendClaudeConversation({
    systemPrompt,
    messages,
    maxTokens: 4096,
    temperature: stage === 'prd' ? 0.7 : 0.4,
  });

  const response = parseAIResponse(raw.content);
  return { response, raw };
}

/**
 * Generate a PRD from all stage data.
 */
export async function generatePRD(params: {
  stages: Record<IdeaStage, IStageData>;
  title: string;
}): Promise<IdeationAIResult> {
  const { stages, title } = params;

  const allStageData: Record<string, Record<string, unknown>> = {};
  for (const [stage, data] of Object.entries(stages)) {
    if (stage !== 'prd') {
      allStageData[stage] = data.extractedData;
    }
  }

  const systemPrompt = buildSystemPrompt('prd');
  const messages: ClaudeConversationMessage[] = [
    {
      role: 'user',
      content: `Generate a comprehensive PRD for the idea "${title}" based on all the data gathered:\n\n${JSON.stringify(allStageData, null, 2)}\n\nPlease generate the full PRD now.`,
    },
  ];

  const raw = await sendClaudeConversation({
    systemPrompt,
    messages,
    maxTokens: 8192,
    temperature: 0.5,
  });

  const response = parseAIResponse(raw.content);
  return { response, raw };
}

/**
 * Generate AI scoring for an idea.
 */
export async function scoreIdea(params: {
  stages: Record<IdeaStage, IStageData>;
  title: string;
}): Promise<{
  scoring: {
    viability: { score: number; reasoning: string };
    uniqueness: { score: number; reasoning: string };
    effort: { score: number; reasoning: string };
    overall: { score: number; recommendation: string };
  };
  raw: RawAIResponse;
}> {
  const { stages, title } = params;

  const allStageData: Record<string, Record<string, unknown>> = {};
  for (const [stage, data] of Object.entries(stages)) {
    allStageData[stage] = data.extractedData;
  }

  const systemPrompt = `You are a product viability assessor. Analyze the idea data and score it on three dimensions.

Respond with valid JSON only:
{
  "viability": { "score": 1-10, "reasoning": "Why this score for market viability" },
  "uniqueness": { "score": 1-10, "reasoning": "Why this score for uniqueness/differentiation" },
  "effort": { "score": 1-10, "reasoning": "Why this score (1=huge effort, 10=quick win)" },
  "overall": { "score": 1-10, "recommendation": "strong-go|go|conditional|reconsider|no-go" }
}

Score guidelines:
- **Viability**: Is there a real market need? Will people use/pay for this? (1=no market, 10=urgent need)
- **Uniqueness**: How differentiated is this from existing solutions? (1=copycat, 10=truly novel)
- **Effort**: How much effort to build? (1=massive multi-month project, 10=can build in days)
- **Overall**: Weighted assessment. Recommendation thresholds: 8-10=strong-go, 6-7=go, 5=conditional, 3-4=reconsider, 1-2=no-go

Be honest and specific in reasoning. Reference the actual data.`;

  const messages: ClaudeConversationMessage[] = [
    {
      role: 'user',
      content: `Score this idea: "${title}"\n\nCollected data:\n${JSON.stringify(allStageData, null, 2)}`,
    },
  ];

  const raw = await sendClaudeConversation({
    systemPrompt,
    messages,
    maxTokens: 2048,
    temperature: 0.3,
  });

  let jsonStr = raw.content.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const scoring = JSON.parse(jsonStr);
  return { scoring, raw };
}

/**
 * Generate inspiration idea seeds.
 */
export async function generateInspiration(): Promise<{
  ideas: Array<{ title: string; description: string; category: string }>;
  raw: RawAIResponse;
}> {
  const systemPrompt = `You are a creative product strategist for a digital marketing agency. Generate idea seeds for tools and products the agency could build.

Respond with valid JSON only:
{
  "ideas": [
    {
      "title": "Short idea title",
      "description": "2-3 sentence description of the idea, the problem it solves, and who it's for",
      "category": "tool|process|deliverable|integration"
    }
  ]
}

Focus on:
- Digital agency pain points (reporting, client management, content creation, SEO, analytics)
- Gaps in existing tooling
- Industry trends (AI automation, privacy, accessibility)
- Things that would save the team time or make clients happier

Generate 3-5 diverse ideas. Be specific and practical.`;

  const messages: ClaudeConversationMessage[] = [
    {
      role: 'user',
      content: 'Suggest some ideas for tools and products our digital agency could build. Focus on practical, impactful ideas.',
    },
  ];

  const raw = await sendClaudeConversation({
    systemPrompt,
    messages,
    maxTokens: 2048,
    temperature: 0.9,
  });

  let jsonStr = raw.content.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);
  return { ideas: parsed.ideas, raw };
}
