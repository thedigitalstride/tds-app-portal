# AI Cost Tracking Dashboard — Design

**Date:** 2026-02-14
**Status:** Approved

## Overview

Centralized AI cost tracking across all tools in the TDS App Portal. Every AI call (Anthropic, OpenAI) is automatically logged at the client level with full attribution: tool, user, client, and purpose. An admin-only dashboard displays costs in GBP with live exchange rate conversion.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data collection | Going forward only | Clean data, accurate from day one |
| Attribution dimensions | Tool + User + Client + Purpose | Maximum reporting flexibility |
| Dashboard pattern | Mirror ScrapingBee usage | Consistent admin UX |
| Cost storage | USD in DB, GBP at display | Matches provider invoices, clean data |
| Exchange rate | exchangerate-api.com, 1hr cache | Free tier, no API key needed |
| Pricing storage | Stored per log entry | Full audit trail of rates applied |
| Logging mechanism | Built into AI clients | Automatic — tools can't skip tracking |
| Tool coverage | All current AI tools (ideation + PPC) | Centralized helper, future tools get it free |

## Data Model — `AiUsageLog`

```typescript
// packages/database/src/models/ai-usage-log.ts

{
  // Attribution
  toolId:        String,     // "ideation", "ppc-page-analyser"
  userId:        ObjectId,   // ref → User
  clientId:      ObjectId,   // ref → Client (nullable)
  purpose:       String,     // "conversation", "scoring", "prd-generation", "page-analysis"

  // AI call details
  provider:      String,     // "anthropic", "openai"
  model:         String,     // "claude-sonnet-4-20250514", "gpt-4o"
  inputTokens:   Number,
  outputTokens:  Number,

  // Cost (calculated + stored at log time, in USD)
  inputCostPer1M:  Number,   // rate applied, e.g. 3.00
  outputCostPer1M: Number,   // rate applied, e.g. 15.00
  totalCost:       Number,   // calculated cost in USD

  // Context
  resourceId:    String,     // optional — idea ID, analysis ID
  resourceType:  String,     // optional — "idea", "ppc-analysis"

  createdAt:     Date,       // auto, indexed
}

// Indexes
{ createdAt: 1 }
{ toolId: 1, createdAt: 1 }
{ userId: 1, createdAt: 1 }
{ clientId: 1, createdAt: 1 }
```

## Centralized Logging — Client-Level Integration

### Tracking Context Type

```typescript
// apps/portal/lib/ai/ai-tracking-types.ts

interface AiTrackingContext {
  toolId: string;
  userId: string;
  clientId?: string;
  purpose: string;
  resourceId?: string;
  resourceType?: string;
}
```

### AI Usage Logger

```typescript
// apps/portal/lib/ai/ai-usage-logger.ts

// Static pricing map (USD per 1M tokens)
const MODEL_PRICING = {
  'claude-sonnet-4-20250514':   { input: 3.00,  output: 15.00 },
  'claude-3-5-sonnet-20241022': { input: 3.00,  output: 15.00 },
  'claude-3-5-haiku-20241022':  { input: 0.80,  output: 4.00  },
  'gpt-4o':                     { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':                { input: 0.15,  output: 0.60  },
  'gpt-4-turbo':                { input: 10.00, output: 30.00 },
};

// logAiUsage() — looks up pricing, calculates cost, writes to AiUsageLog
// Fire-and-forget, never blocks or fails the AI response
// Unknown models log with 0 cost + console warning
```

### Client Modifications

Both AI clients get an optional `tracking` parameter added to their functions:

```typescript
// claude-client.ts
sendClaudeRequest(prompt, options?, tracking?: AiTrackingContext)
sendClaudeConversation(messages, options?, tracking?: AiTrackingContext)

// openai-client.ts
sendOpenAIRequest(prompt, options?, tracking?: AiTrackingContext)
```

When `tracking` is provided, the client automatically calls `logAiUsage()` after getting the response. When omitted, no logging happens (backwards compatible).

## Admin Dashboard

### Page: `/admin/ai-costs/`

**Summary Cards (top row):**
- All Time — total GBP cost + token count
- This Month — current month
- This Week — current week
- Today — today

**Breakdown Tables:**
- By Tool — cost per tool with token counts
- By User — cost per user, sortable
- By Client — cost per client
- By Model — cost per AI model

**Daily Trend Chart:**
- Line chart, daily cost over last 30 days
- Matches ScrapingBee chart pattern

**Detailed Logs:**
- Paginated table of individual AI calls
- Columns: Date, User, Tool, Client, Purpose, Model, Tokens (in/out), Cost
- Filterable by date range, tool, user, client

**Footer note:** "Rate: 1 USD = X GBP" showing the current exchange rate

### API: `/api/admin/ai-costs/route.ts`

- `GET ?view=stats` — aggregated summaries + breakdowns via MongoDB aggregation
- `GET ?view=logs&page=1&limit=50&toolId=&userId=&clientId=` — paginated log entries
- Admin-only auth guard

### Exchange Rate

- Fetched from `https://api.exchangerate-api.com/v4/latest/USD`
- Cached in-memory for 1 hour
- Dashboard converts all USD values to GBP at display time
- Rate shown in dashboard footer

## File Changes

### New Files
| File | Purpose |
|------|---------|
| `packages/database/src/models/ai-usage-log.ts` | AiUsageLog Mongoose model |
| `apps/portal/lib/ai/ai-usage-logger.ts` | Pricing map, `logAiUsage()`, exchange rate cache |
| `apps/portal/lib/ai/ai-tracking-types.ts` | `AiTrackingContext` type |
| `apps/portal/app/admin/ai-costs/page.tsx` | Dashboard UI |
| `apps/portal/app/admin/ai-costs/layout.tsx` | Admin auth guard + sidebar |
| `apps/portal/app/api/admin/ai-costs/route.ts` | Stats + logs API |

### Modified Files
| File | Change |
|------|--------|
| `packages/database/src/index.ts` | Export AiUsageLog model |
| `apps/portal/lib/ai/claude-client.ts` | Add optional `tracking` param, auto-log |
| `apps/portal/lib/ai/openai-client.ts` | Add optional `tracking` param, auto-log |
| `apps/portal/components/sidebar.tsx` | Add "AI Costs" to admin nav |
| `apps/portal/app/api/tools/ideation/[id]/message/route.ts` | Pass tracking context |
| `apps/portal/app/api/tools/ideation/[id]/stage/route.ts` | Pass tracking context |
| `apps/portal/app/api/tools/ideation/[id]/score/route.ts` | Pass tracking context |
| `apps/portal/app/api/tools/ideation/[id]/prd/route.ts` | Pass tracking context |
| PPC analyser API route(s) | Pass tracking context |
