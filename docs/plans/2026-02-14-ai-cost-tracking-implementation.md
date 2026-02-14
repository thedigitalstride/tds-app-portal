# AI Cost Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Track all AI API calls with cost attribution (tool, user, client, purpose) and display in an admin-only GBP dashboard.

**Architecture:** New `AiUsageLog` Mongoose model stores every AI call. The Claude and OpenAI clients accept an optional `tracking` context — when provided, they automatically log usage after each call. An admin dashboard at `/admin/ai-costs` mirrors the ScrapingBee usage pattern with summary cards, breakdowns, trend chart, and filterable logs. Costs stored in USD, converted to GBP at display time via exchangerate-api.com.

**Tech Stack:** MongoDB/Mongoose, Next.js 15 API routes, React 19, Tailwind CSS, `@tds/ui` components.

---

### Task 1: Create AiUsageLog Database Model

**Files:**
- Create: `packages/database/src/models/ai-usage-log.ts`
- Modify: `packages/database/src/index.ts`

**Step 1: Create the model file**

Create `packages/database/src/models/ai-usage-log.ts`:

```typescript
import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAiUsageLog extends Document {
  toolId: string;
  userId: Types.ObjectId;
  clientId?: Types.ObjectId;
  purpose: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
  totalCost: number;
  resourceId?: string;
  resourceType?: string;
  createdAt: Date;
}

const aiUsageLogSchema = new Schema<IAiUsageLog>(
  {
    toolId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    purpose: { type: String, required: true },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    inputTokens: { type: Number, required: true, default: 0 },
    outputTokens: { type: Number, required: true, default: 0 },
    inputCostPer1M: { type: Number, required: true, default: 0 },
    outputCostPer1M: { type: Number, required: true, default: 0 },
    totalCost: { type: Number, required: true, default: 0 },
    resourceId: { type: String },
    resourceType: { type: String },
  },
  { timestamps: true }
);

aiUsageLogSchema.index({ createdAt: 1 });
aiUsageLogSchema.index({ toolId: 1, createdAt: 1 });
aiUsageLogSchema.index({ userId: 1, createdAt: 1 });
aiUsageLogSchema.index({ clientId: 1, createdAt: 1 });

export const AiUsageLog: Model<IAiUsageLog> =
  mongoose.models.AiUsageLog || mongoose.model<IAiUsageLog>('AiUsageLog', aiUsageLogSchema);
```

**Step 2: Export from database index**

In `packages/database/src/index.ts`, add this export line after the existing exports:

```typescript
export { AiUsageLog, type IAiUsageLog } from './models/ai-usage-log';
```

**Step 3: Verify build**

Run: `npm run type-check --workspace=packages/database`

---

### Task 2: Create AI Tracking Types and Logger

**Files:**
- Create: `apps/portal/lib/ai/ai-tracking-types.ts`
- Create: `apps/portal/lib/ai/ai-usage-logger.ts`

**Step 1: Create tracking types**

Create `apps/portal/lib/ai/ai-tracking-types.ts`:

```typescript
export interface AiTrackingContext {
  toolId: string;
  userId: string;
  clientId?: string;
  purpose: string;
  resourceId?: string;
  resourceType?: string;
}
```

**Step 2: Create AI usage logger**

Create `apps/portal/lib/ai/ai-usage-logger.ts`:

```typescript
import { connectDB, AiUsageLog } from '@tds/database';
import mongoose from 'mongoose';

// USD per 1M tokens
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-sonnet-4-20250514':      { input: 3.00,  output: 15.00 },
  'claude-3-5-sonnet-20241022':    { input: 3.00,  output: 15.00 },
  'claude-3-5-haiku-20241022':     { input: 0.80,  output: 4.00  },
  // OpenAI
  'gpt-4o':                        { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':                   { input: 0.15,  output: 0.60  },
  'gpt-4-turbo':                   { input: 10.00, output: 30.00 },
};

export function getModelPricing(model: string): { input: number; output: number } {
  return MODEL_PRICING[model] || { input: 0, output: 0 };
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: { input: number; output: number }
): number {
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

export async function logAiUsage(params: {
  toolId: string;
  userId: string;
  clientId?: string;
  purpose: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  resourceId?: string;
  resourceType?: string;
}): Promise<void> {
  try {
    await connectDB();

    const pricing = getModelPricing(params.model);
    const totalCost = calculateCost(params.inputTokens, params.outputTokens, pricing);

    if (pricing.input === 0 && pricing.output === 0) {
      console.warn(`[AI Usage] Unknown model pricing for: ${params.model}`);
    }

    await AiUsageLog.create({
      toolId: params.toolId,
      userId: new mongoose.Types.ObjectId(params.userId),
      clientId: params.clientId ? new mongoose.Types.ObjectId(params.clientId) : undefined,
      purpose: params.purpose,
      provider: params.provider,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      inputCostPer1M: pricing.input,
      outputCostPer1M: pricing.output,
      totalCost,
      resourceId: params.resourceId,
      resourceType: params.resourceType,
    });
  } catch (error) {
    // Never let logging failures break the actual AI call
    console.error('[AI Usage] Failed to log:', error);
  }
}

// Exchange rate cache
let cachedRate: { rate: number; fetchedAt: number } | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export async function getUsdToGbpRate(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < CACHE_DURATION_MS) {
    return cachedRate.rate;
  }

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!res.ok) throw new Error(`Exchange rate API returned ${res.status}`);
    const data = await res.json();
    const rate = data.rates?.GBP;
    if (typeof rate !== 'number') throw new Error('GBP rate not found');

    cachedRate = { rate, fetchedAt: Date.now() };
    return rate;
  } catch (error) {
    console.error('[Exchange Rate] Failed to fetch:', error);
    // Fallback rate if API fails
    return cachedRate?.rate ?? 0.79;
  }
}
```

**Step 3: Verify build**

Run: `npm run type-check --workspace=apps/portal`

---

### Task 3: Add Tracking to Claude Client

**Files:**
- Modify: `apps/portal/lib/ai/claude-client.ts`

**Step 1: Add tracking import and parameter to `sendClaudeRequest`**

At the top of `claude-client.ts`, add:

```typescript
import type { AiTrackingContext } from './ai-tracking-types';
import { logAiUsage } from './ai-usage-logger';
```

Change the `sendClaudeRequest` function signature to accept an optional second parameter:

```typescript
export async function sendClaudeRequest(
  options: ClaudeRequestOptions,
  tracking?: AiTrackingContext
): Promise<RawAIResponse> {
```

After the return object is built (line 74-82), before returning, add logging:

```typescript
    const result: RawAIResponse = {
      content: textContent.text,
      model: response.model,
      stopReason: response.stop_reason ?? undefined,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };

    if (tracking && result.usage) {
      logAiUsage({
        ...tracking,
        provider: 'anthropic',
        model: response.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      });
    }

    return result;
```

**Step 2: Add tracking parameter to `sendClaudeConversation`**

Same pattern — add optional `tracking` parameter:

```typescript
export async function sendClaudeConversation(
  options: ClaudeConversationOptions,
  tracking?: AiTrackingContext
): Promise<RawAIResponse> {
```

After the return object is built (line 157-165), before returning, add:

```typescript
    const result: RawAIResponse = {
      content: textContent.text,
      model: response.model,
      stopReason: response.stop_reason ?? undefined,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };

    if (tracking && result.usage) {
      logAiUsage({
        ...tracking,
        provider: 'anthropic',
        model: response.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      });
    }

    return result;
```

**Step 3: Verify build**

Run: `npm run type-check --workspace=apps/portal`

---

### Task 4: Add Tracking to OpenAI Client

**Files:**
- Modify: `apps/portal/lib/ai/openai-client.ts`

**Step 1: Add tracking import and parameter to `sendOpenAIRequest`**

At the top, add:

```typescript
import type { AiTrackingContext } from './ai-tracking-types';
import { logAiUsage } from './ai-usage-logger';
```

Change the function signature:

```typescript
export async function sendOpenAIRequest(
  options: OpenAIRequestOptions,
  tracking?: AiTrackingContext
): Promise<RawAIResponse> {
```

After the return object is built (line 77-86), before returning, add:

```typescript
    const result: RawAIResponse = {
      content: choice.message.content,
      model: response.model,
      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
          }
        : undefined,
    };

    if (tracking && result.usage) {
      logAiUsage({
        ...tracking,
        provider: 'openai',
        model: response.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      });
    }

    return result;
```

**Step 2: Verify build**

Run: `npm run type-check --workspace=apps/portal`

---

### Task 5: Wire Up Ideation AI Service

**Files:**
- Modify: `apps/portal/lib/ai/ideation-ai-service.ts`

The ideation AI service has three functions that call the Claude client: `sendIdeationMessage`, `generatePRD`, `scoreIdea`, and `generateInspiration`. Each needs to accept and pass through tracking.

**Step 1: Add tracking import**

```typescript
import type { AiTrackingContext } from './ai-tracking-types';
```

**Step 2: Update `sendIdeationMessage`**

Add `tracking?: AiTrackingContext` to the params:

```typescript
export async function sendIdeationMessage(params: {
  stage: IdeaStage;
  stageMessages: IIdeaMessage[];
  previousStagesData: Record<string, Record<string, unknown>>;
  templateContext?: string;
  currentMessageAttachments?: IAttachment[];
  tracking?: AiTrackingContext;
}): Promise<IdeationAIResult> {
```

Pass tracking to `sendClaudeConversation` (line 255):

```typescript
  const raw = await sendClaudeConversation({
    systemPrompt,
    messages,
    maxTokens: 4096,
    temperature: stage === 'prd' ? 0.7 : 0.4,
  }, params.tracking);
```

**Step 3: Update `generatePRD`**

Add `tracking?: AiTrackingContext` to params:

```typescript
export async function generatePRD(params: {
  stages: Record<IdeaStage, IStageData>;
  title: string;
  tracking?: AiTrackingContext;
}): Promise<IdeationAIResult> {
```

Pass tracking to both `sendClaudeConversation` calls (initial generation at line 290, and retry at line 324):

```typescript
  // Initial generation
  const raw = await sendClaudeConversation({
    systemPrompt,
    messages,
    maxTokens: 8192,
    temperature: 0.5,
  }, params.tracking);
```

```typescript
  // Retry
  const retryRaw = await sendClaudeConversation({
    systemPrompt,
    messages: retryMessages,
    maxTokens: 12288,
    temperature: 0.4,
  }, params.tracking);
```

**Note:** For PRD with retries, both calls get tracked individually since the client logs per-call. This is correct — each API call has its own cost.

**Step 4: Update `scoreIdea`**

Add `tracking?: AiTrackingContext` to params:

```typescript
export async function scoreIdea(params: {
  stages: Record<IdeaStage, IStageData>;
  title: string;
  tracking?: AiTrackingContext;
}): Promise<{...}> {
```

Pass tracking to `sendClaudeConversation` (line 380):

```typescript
  const raw = await sendClaudeConversation({
    systemPrompt,
    messages,
    maxTokens: 2048,
    temperature: 0.3,
  }, params.tracking);
```

**Step 5: Update `generateInspiration`**

Add `tracking?: AiTrackingContext` to params:

```typescript
export async function generateInspiration(params?: {
  tracking?: AiTrackingContext;
}): Promise<{...}> {
```

Pass tracking to `sendClaudeConversation` (line 413):

```typescript
  const raw = await sendClaudeConversation({
    systemPrompt,
    messages,
    maxTokens: 2048,
    temperature: 0.9,
  }, params?.tracking);
```

**Step 6: Verify build**

Run: `npm run type-check --workspace=apps/portal`

---

### Task 6: Wire Up Ideation API Routes

**Files:**
- Modify: `apps/portal/app/api/tools/ideation/[id]/message/route.ts`
- Modify: `apps/portal/app/api/tools/ideation/[id]/stage/route.ts`
- Modify: `apps/portal/app/api/tools/ideation/[id]/score/route.ts`
- Modify: `apps/portal/app/api/tools/ideation/[id]/prd/route.ts`

Each route already has `session.user.id` and `idea._id`. We need to add the tracking context to each AI call.

**Step 1: Update message route**

In `message/route.ts`, add tracking to `sendIdeationMessage` call (around line 132):

```typescript
    const { response: aiResponse, raw } = await sendIdeationMessage({
      stage: currentStage,
      stageMessages: stageData.messages,
      previousStagesData,
      templateContext,
      currentMessageAttachments: attachments?.length ? attachments : undefined,
      tracking: {
        toolId: 'ideation',
        userId,
        purpose: `conversation-${currentStage}`,
        resourceId: id,
        resourceType: 'idea',
      },
    });
```

**Step 2: Update stage route**

In `stage/route.ts`, add tracking to `sendIdeationMessage` call (around line 54):

```typescript
      const { response: aiResponse, raw } = await sendIdeationMessage({
        stage: targetStage,
        stageMessages: [],
        previousStagesData,
        tracking: {
          toolId: 'ideation',
          userId: session.user.id,
          purpose: `stage-intro-${targetStage}`,
          resourceId: id,
          resourceType: 'idea',
        },
      });
```

**Step 3: Update score route**

In `score/route.ts`, add tracking to `scoreIdea` call (around line 27):

```typescript
    const { scoring, raw } = await scoreIdea({
      stages: idea.stages,
      title: idea.title,
      tracking: {
        toolId: 'ideation',
        userId: session.user.id,
        purpose: 'scoring',
        resourceId: id,
        resourceType: 'idea',
      },
    });
```

**Step 4: Update PRD route**

In `prd/route.ts`, add tracking to `generatePRD` call (around line 27):

```typescript
    const { response: aiResponse, raw, validation, retried, totalUsage } = await generatePRD({
      stages: idea.stages,
      title: idea.title,
      tracking: {
        toolId: 'ideation',
        userId: session.user.id,
        purpose: 'prd-generation',
        resourceId: id,
        resourceType: 'idea',
      },
    });
```

**Step 5: Verify build**

Run: `npm run type-check --workspace=apps/portal`

---

### Task 7: Wire Up PPC Page Analyser

**Files:**
- Modify: `apps/portal/lib/ai/unified-ai-service.ts`
- Modify: `apps/portal/app/api/tools/ppc-page-analyser/analyze-ai/route.ts`

**Step 1: Update `analyzeWithAI` to accept tracking**

In `unified-ai-service.ts`, add imports:

```typescript
import type { AiTrackingContext } from './ai-tracking-types';
```

Add `tracking` to the `AnalyzeRequest` type or add a second parameter:

```typescript
export async function analyzeWithAI(
  request: AnalyzeRequest,
  tracking?: AiTrackingContext
): Promise<AnalysisResponse> {
```

Pass tracking to both `sendClaudeRequest` and `sendOpenAIRequest` calls:

```typescript
  if (provider === 'claude') {
    rawResponse = await sendClaudeRequest({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      model: (model as ClaudeModel) || DEFAULT_CLAUDE_MODEL,
      maxTokens: 4096,
      temperature: 0.3,
    }, tracking);
  } else {
    rawResponse = await sendOpenAIRequest({
      systemPrompt: SYSTEM_PROMPT + '\n\nRespond with valid JSON only.',
      userPrompt,
      model: (model as OpenAIModel) || DEFAULT_OPENAI_MODEL,
      maxTokens: 4096,
      temperature: 0.3,
    }, tracking);
  }
```

**Step 2: Update PPC analyze-ai route**

In `analyze-ai/route.ts`, pass tracking to `analyzeWithAI` (around line 129):

```typescript
    const analysisResponse = await analyzeWithAI({
      pageContent: {
        html: pageResult.html,
        url,
      },
      adData,
      provider: aiProvider,
      model: aiModel,
      focus: analysisFocus,
    }, {
      toolId: 'ppc-page-analyser',
      userId: session.user.id,
      clientId,
      purpose: 'page-analysis',
      resourceId: existingAnalysis?._id?.toString(),
      resourceType: 'ppc-analysis',
    });
```

**Step 3: Verify build**

Run: `npm run type-check --workspace=apps/portal`

---

### Task 8: Create AI Costs API Route

**Files:**
- Create: `apps/portal/app/api/admin/ai-costs/route.ts`

**Step 1: Create the API route**

Create `apps/portal/app/api/admin/ai-costs/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, AiUsageLog } from '@tds/database';
import { getUsdToGbpRate } from '@/lib/ai/ai-usage-logger';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

interface SummaryStats {
  allTime: number;
  thisMonth: number;
  thisWeek: number;
  today: number;
  allTimeTokens: number;
  thisMonthTokens: number;
  thisWeekTokens: number;
  todayTokens: number;
}

interface ToolStats {
  toolId: string;
  totalCost: number;
  totalTokens: number;
}

interface UserStats {
  userId: string;
  userName: string;
  userEmail: string;
  totalCost: number;
  totalTokens: number;
}

interface ClientStats {
  clientId: string;
  clientName: string;
  totalCost: number;
  totalTokens: number;
}

interface ModelStats {
  model: string;
  provider: string;
  totalCost: number;
  totalTokens: number;
}

interface DailyTrend {
  date: string;
  totalCost: number;
}

interface StatsResponse {
  summary: SummaryStats;
  byTool: ToolStats[];
  byUser: UserStats[];
  byClient: ClientStats[];
  byModel: ModelStats[];
  dailyTrend: DailyTrend[];
  exchangeRate: number;
}

interface LogEntry {
  _id: string;
  createdAt: string;
  toolId: string;
  userName: string;
  clientName: string;
  purpose: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

interface LogsResponse {
  logs: LogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  exchangeRate: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'stats';

    if (view === 'stats') {
      return NextResponse.json(await getStats());
    } else if (view === 'logs') {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const toolId = searchParams.get('toolId');
      const userId = searchParams.get('userId');
      const clientId = searchParams.get('clientId');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      return NextResponse.json(
        await getLogs({ page, limit, toolId, userId, clientId, startDate, endDate })
      );
    }

    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 });
  } catch (error) {
    console.error('Failed to fetch AI costs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI costs' },
      { status: 500 }
    );
  }
}

async function getStats(): Promise<StatsResponse> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const exchangeRate = await getUsdToGbpRate();

  // Summary stats using facets
  const summaryResult = await AiUsageLog.aggregate([
    {
      $facet: {
        allTime: [
          {
            $group: {
              _id: null,
              totalCost: { $sum: '$totalCost' },
              totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
            },
          },
        ],
        thisMonth: [
          { $match: { createdAt: { $gte: startOfMonth } } },
          {
            $group: {
              _id: null,
              totalCost: { $sum: '$totalCost' },
              totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
            },
          },
        ],
        thisWeek: [
          { $match: { createdAt: { $gte: startOfWeek } } },
          {
            $group: {
              _id: null,
              totalCost: { $sum: '$totalCost' },
              totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
            },
          },
        ],
        today: [
          { $match: { createdAt: { $gte: startOfToday } } },
          {
            $group: {
              _id: null,
              totalCost: { $sum: '$totalCost' },
              totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
            },
          },
        ],
      },
    },
  ]);

  const s = summaryResult[0];
  const summary: SummaryStats = {
    allTime: s?.allTime?.[0]?.totalCost || 0,
    thisMonth: s?.thisMonth?.[0]?.totalCost || 0,
    thisWeek: s?.thisWeek?.[0]?.totalCost || 0,
    today: s?.today?.[0]?.totalCost || 0,
    allTimeTokens: s?.allTime?.[0]?.totalTokens || 0,
    thisMonthTokens: s?.thisMonth?.[0]?.totalTokens || 0,
    thisWeekTokens: s?.thisWeek?.[0]?.totalTokens || 0,
    todayTokens: s?.today?.[0]?.totalTokens || 0,
  };

  // By tool
  const toolResult = await AiUsageLog.aggregate([
    {
      $group: {
        _id: '$toolId',
        totalCost: { $sum: '$totalCost' },
        totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
      },
    },
    { $sort: { totalCost: -1 } },
  ]);

  const byTool: ToolStats[] = toolResult.map((item) => ({
    toolId: item._id,
    totalCost: item.totalCost,
    totalTokens: item.totalTokens,
  }));

  // By user (top 10)
  const userResult = await AiUsageLog.aggregate([
    {
      $group: {
        _id: '$userId',
        totalCost: { $sum: '$totalCost' },
        totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
      },
    },
    { $sort: { totalCost: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
  ]);

  const byUser: UserStats[] = userResult.map((item) => ({
    userId: item._id?.toString() || 'unknown',
    userName: item.user?.name || 'Unknown User',
    userEmail: item.user?.email || '',
    totalCost: item.totalCost,
    totalTokens: item.totalTokens,
  }));

  // By client (top 10)
  const clientResult = await AiUsageLog.aggregate([
    { $match: { clientId: { $ne: null } } },
    {
      $group: {
        _id: '$clientId',
        totalCost: { $sum: '$totalCost' },
        totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
      },
    },
    { $sort: { totalCost: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'clients',
        localField: '_id',
        foreignField: '_id',
        as: 'client',
      },
    },
    { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
  ]);

  const byClient: ClientStats[] = clientResult.map((item) => ({
    clientId: item._id?.toString() || 'unknown',
    clientName: item.client?.name || 'Unknown Client',
    totalCost: item.totalCost,
    totalTokens: item.totalTokens,
  }));

  // By model
  const modelResult = await AiUsageLog.aggregate([
    {
      $group: {
        _id: { model: '$model', provider: '$provider' },
        totalCost: { $sum: '$totalCost' },
        totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
      },
    },
    { $sort: { totalCost: -1 } },
  ]);

  const byModel: ModelStats[] = modelResult.map((item) => ({
    model: item._id.model,
    provider: item._id.provider,
    totalCost: item.totalCost,
    totalTokens: item.totalTokens,
  }));

  // Daily trend (last 30 days)
  const dailyResult = await AiUsageLog.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        totalCost: { $sum: '$totalCost' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dailyMap = new Map<string, number>();
  for (const item of dailyResult) {
    dailyMap.set(item._id, item.totalCost);
  }

  const dailyTrend: DailyTrend[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyTrend.push({
      date: dateStr,
      totalCost: dailyMap.get(dateStr) || 0,
    });
  }

  return {
    summary,
    byTool,
    byUser,
    byClient,
    byModel,
    dailyTrend,
    exchangeRate,
  };
}

async function getLogs(params: {
  page: number;
  limit: number;
  toolId: string | null;
  userId: string | null;
  clientId: string | null;
  startDate: string | null;
  endDate: string | null;
}): Promise<LogsResponse> {
  const { page, limit, toolId, userId, clientId, startDate, endDate } = params;

  const exchangeRate = await getUsdToGbpRate();

  const matchConditions: Record<string, unknown> = {};
  if (toolId) matchConditions.toolId = toolId;
  if (userId) matchConditions.userId = new mongoose.Types.ObjectId(userId);
  if (clientId) matchConditions.clientId = new mongoose.Types.ObjectId(clientId);
  if (startDate || endDate) {
    matchConditions.createdAt = {};
    if (startDate) {
      (matchConditions.createdAt as Record<string, Date>).$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      (matchConditions.createdAt as Record<string, Date>).$lt = end;
    }
  }

  const total = await AiUsageLog.countDocuments(matchConditions);

  const logs = await AiUsageLog.aggregate([
    { $match: matchConditions },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'clients',
        localField: 'clientId',
        foreignField: '_id',
        as: 'client',
      },
    },
    { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        createdAt: 1,
        toolId: 1,
        userName: { $ifNull: ['$user.name', 'Unknown User'] },
        clientName: { $ifNull: ['$client.name', 'N/A'] },
        purpose: 1,
        provider: 1,
        model: 1,
        inputTokens: 1,
        outputTokens: 1,
        totalCost: 1,
      },
    },
  ]);

  return {
    logs: logs.map((log) => ({
      _id: log._id.toString(),
      createdAt: log.createdAt.toISOString(),
      toolId: log.toolId,
      userName: log.userName,
      clientName: log.clientName,
      purpose: log.purpose,
      provider: log.provider,
      model: log.model,
      inputTokens: log.inputTokens,
      outputTokens: log.outputTokens,
      totalCost: log.totalCost,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    exchangeRate,
  };
}
```

**Step 2: Verify build**

Run: `npm run type-check --workspace=apps/portal`

---

### Task 9: Create AI Costs Dashboard Page

**Files:**
- Create: `apps/portal/app/admin/ai-costs/layout.tsx`
- Create: `apps/portal/app/admin/ai-costs/page.tsx`

**Step 1: Create layout**

Create `apps/portal/app/admin/ai-costs/layout.tsx` (copy from ScrapingBee pattern):

```typescript
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';

export default async function AiCostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
```

**Step 2: Create dashboard page**

Create `apps/portal/app/admin/ai-costs/page.tsx`. This mirrors the ScrapingBee usage page structure with these changes:
- Summary cards show GBP costs + token counts
- Breakdown cards: By Tool, By User, By Client, By Model (instead of By Proxy Tier)
- Daily trend chart shows GBP costs
- Logs table: Date, User, Tool, Client, Purpose, Model, Tokens (in/out), Cost
- Filters: tool, user, client, date range
- Footer shows exchange rate

The page should:
- Fetch stats via `GET /api/admin/ai-costs?view=stats`
- Fetch logs via `GET /api/admin/ai-costs?view=logs&page=X&...`
- Multiply all USD `totalCost` values by `exchangeRate` for GBP display
- Format costs as `£X.XX` using `toFixed(4)` for small amounts or `toFixed(2)` for larger
- Format token counts with `toLocaleString('en-GB')`
- Show "Rate: 1 USD = X GBP" in the page subtitle area

This is a large UI file — model it closely on `apps/portal/app/admin/scrapingbee-usage/page.tsx` with these structural differences:
- 4 summary cards (same pattern, but show `£` and token count sub-text)
- 4 breakdown cards instead of 3 (Tool, User, Client, Model)
- Same bar chart pattern for daily trend
- Logs table with different columns
- Different filter dropdowns (tool, user, client — no proxy tier)

**Step 3: Verify build**

Run: `npm run type-check --workspace=apps/portal`

---

### Task 10: Add Sidebar Navigation Entry

**Files:**
- Modify: `apps/portal/components/sidebar.tsx`

**Step 1: Add DollarSign import**

In the lucide-react import at the top of `sidebar.tsx`, add `DollarSign`:

```typescript
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Building2,
  X,
  MessageSquare,
  Shield,
  CreditCard,
  Sparkles,
  DollarSign,
} from 'lucide-react';
```

**Step 2: Add AI Costs to adminNavigation**

Add entry to the `adminNavigation` array:

```typescript
const adminNavigation = [
  { name: 'User Management', href: '/admin/users', icon: Settings },
  { name: 'Profiles', href: '/admin/profiles', icon: Shield },
  { name: 'Feedback', href: '/admin/feedback', icon: MessageSquare },
  { name: 'ScrapingBee Usage', href: '/admin/scrapingbee-usage', icon: CreditCard },
  { name: 'AI Costs', href: '/admin/ai-costs', icon: DollarSign },
  { name: 'Ideation Prompts', href: '/admin/ideation-prompts', icon: Sparkles },
];
```

**Step 3: Verify build**

Run: `npm run type-check --workspace=apps/portal`

---

### Task 11: Full Build Verification and Manual Test

**Step 1: Run full type check**

Run: `npm run type-check`

Expected: Pass with no new errors (3 pre-existing `<img>` warnings expected).

**Step 2: Run full build**

Run: `npm run build`

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add packages/database/src/models/ai-usage-log.ts packages/database/src/index.ts apps/portal/lib/ai/ai-tracking-types.ts apps/portal/lib/ai/ai-usage-logger.ts apps/portal/lib/ai/claude-client.ts apps/portal/lib/ai/openai-client.ts apps/portal/lib/ai/ideation-ai-service.ts apps/portal/lib/ai/unified-ai-service.ts apps/portal/app/api/tools/ideation/[id]/message/route.ts apps/portal/app/api/tools/ideation/[id]/stage/route.ts apps/portal/app/api/tools/ideation/[id]/score/route.ts apps/portal/app/api/tools/ideation/[id]/prd/route.ts apps/portal/app/api/tools/ppc-page-analyser/analyze-ai/route.ts apps/portal/app/api/admin/ai-costs/route.ts apps/portal/app/admin/ai-costs/layout.tsx apps/portal/app/admin/ai-costs/page.tsx apps/portal/components/sidebar.tsx
git commit -m "feat(admin): add AI cost tracking dashboard with automatic usage logging"
```
