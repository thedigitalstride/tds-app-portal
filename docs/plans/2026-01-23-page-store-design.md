# Page Store Design

**Date:** 2026-01-23
**Status:** Approved
**Author:** Brainstorm session

---

## Overview

A shared page source storage system that captures and versions webpage HTML for reuse across multiple tools. Instead of each tool fetching pages independently, they request pages from a central store that handles caching, freshness, and version history.

---

## Goals

1. **Efficiency** - Avoid redundant page fetches across tools
2. **Version history** - Keep timestamped snapshots for change detection and historical analysis
3. **Audit trail** - Track which client/user/tool triggered each fetch
4. **Flexibility** - Configurable freshness thresholds per client
5. **Seamless integration** - Existing tools (Meta Tag Analyser) work identically from user perspective

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | All tool types (SEO, technical, monitoring) | Digital marketing agency needs full spectrum |
| Versioning | Keep multiple timestamped snapshots | Enables change detection, historical comparisons |
| Client relationship | Hybrid - global store, snapshots tagged with triggering client | Efficient storage with full audit trail |
| Storage content | Raw HTML + key headers only | Each tool parses what it needs, clean separation |
| Integration | Full migration - tools use page store exclusively | Single source of truth, cleanest architecture |
| Request model | Implicit fetch - auto-fetch if stale | Simplest developer experience |
| Freshness | Configurable per client (default: 24 hours) | News sites need hourly, brochure sites weekly |
| Retention | Rolling window per URL (default: 10 snapshots) | Bounded storage with useful history |
| HTML storage | Vercel Blob | Native to Vercel hosting, simple API, easy migration path |
| UI | Admin-only Page Archive tool + invisible infrastructure | Power users get visibility, regular users unaffected |

---

## Data Model

### PageSnapshot (MongoDB)

Stores metadata for each captured page snapshot. HTML content stored in Vercel Blob.

```typescript
interface IPageSnapshot {
  _id: ObjectId;
  url: string;                    // Normalised URL
  urlHash: string;                // For efficient lookups

  // Snapshot metadata
  fetchedAt: Date;
  fetchedBy: ObjectId;            // User who triggered
  triggeredByClient: ObjectId;    // Client context
  triggeredByTool: string;        // 'meta-tag-analyser', etc.

  // Storage reference
  blobUrl: string;                // Vercel Blob URL
  contentSize: number;            // Bytes

  // Key HTTP headers
  httpStatus: number;
  contentType?: string;
  lastModified?: string;
  cacheControl?: string;
  xRobotsTag?: string;

  createdAt: Date;
}
```

### PageStore (MongoDB)

Index and configuration per unique URL.

```typescript
interface IPageStore {
  _id: ObjectId;
  url: string;
  urlHash: string;

  // Latest snapshot (quick access)
  latestSnapshotId: ObjectId;
  latestFetchedAt: Date;

  // Snapshot management
  snapshotCount: number;

  // Access tracking
  clientsWithAccess: ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}
```

### Client Model Additions

```typescript
// Add to existing Client model
pageFreshnessHours: number;       // Default: 24
maxSnapshotsPerUrl: number;       // Default: 10
```

---

## Service Layer

### PageStoreService

Central service that all tools use to get page content.

```typescript
interface GetPageOptions {
  url: string;
  clientId: string;
  userId: string;
  toolId: string;
  forceRefresh?: boolean;
  maxAgeOverride?: number;        // Hours
}

interface PageResult {
  html: string;
  snapshot: IPageSnapshot;
  wasCached: boolean;
}

class PageStoreService {
  async getPage(options: GetPageOptions): Promise<PageResult>
  async getSnapshots(url: string, clientId: string, limit?: number): Promise<IPageSnapshot[]>
  async getSnapshotById(snapshotId: string): Promise<PageResult>
  async refreshPage(options: Omit<GetPageOptions, 'forceRefresh'>): Promise<PageResult>
  async getClientUrls(clientId: string): Promise<IPageStore[]>
  private async enforceRetentionLimit(url: string, maxSnapshots: number): Promise<void>
}
```

### getPage() Flow

```
1. Normalise URL
2. Check PageStore for existing entry
3. If exists, check latest snapshot age vs client's freshnessHours
4. If fresh enough (and not forceRefresh):
   - Fetch HTML from Vercel Blob
   - Return { html, snapshot, wasCached: true }
5. If stale or missing:
   - Fetch page from web
   - Upload HTML to Vercel Blob
   - Create PageSnapshot record
   - Update PageStore
   - Enforce retention limit (delete old snapshots + blobs)
   - Return { html, snapshot, wasCached: false }
```

---

## API Routes

```
POST /api/page-store
  Body: { url, clientId, toolId, forceRefresh? }
  Returns: { html, snapshot, wasCached }

GET /api/page-store/snapshots?url=...&clientId=...&limit=10
  Returns: { snapshots: IPageSnapshot[] }

GET /api/page-store/snapshots/[id]
  Returns: { html, snapshot }

GET /api/page-store/urls?clientId=...
  Returns: { urls: IPageStore[] }
```

---

## Tool Integration

### Meta Tag Analyser Migration

The refactor is invisible to users. UI and functionality remain identical.

**Before:**
```typescript
const response = await fetch(validUrl.toString(), {
  headers: { 'User-Agent': 'TDS Meta Tag Analyser/1.0' }
});
const html = await response.text();
```

**After:**
```typescript
const { html, snapshot, wasCached } = await pageStoreService.getPage({
  url: validUrl.toString(),
  clientId,
  userId: session.user.id,
  toolId: 'meta-tag-analyser',
});
```

Parsing logic unchanged. Scan history unchanged. User workflow unchanged.

---

## Page Archive Tool

Admin-only utility for viewing and managing stored pages.

**Features:**
- URL browser (all stored URLs for selected client)
- Snapshot history table (date, triggered by, tool, size)
- View source (opens HTML in modal/new tab)
- Compare snapshots (diff view)
- Force refresh button
- Storage stats (total snapshots, size per client)

**Registration:**
```typescript
{
  id: 'page-archive',
  name: 'Page Archive',
  description: 'View and manage stored page snapshots across all tools.',
  icon: Archive,
  href: '/tools/page-archive',
  category: 'utility',
  requiredRole: 'admin',
  hasClientData: true,
}
```

---

## Implementation Plan

### Phase 1: Foundation
- Create `PageSnapshot` model
- Create `PageStore` model
- Add fields to `Client` model
- Set up Vercel Blob integration

### Phase 2: Service Layer
- Implement `PageStoreService`
- URL normalisation utility
- Retention enforcement

### Phase 3: Meta Tag Analyser Migration
- Replace direct fetch with page store service
- Verify identical behaviour
- No UI changes

### Phase 4: Page Archive Tool
- Admin-only tool UI
- URL browser, history, view source, compare

### Phase 5: Cleanup
- Remove redundant code
- Add monitoring/logging
- Documentation

---

## Files to Create

```
packages/database/src/models/page-snapshot.ts
packages/database/src/models/page-store.ts
packages/database/src/services/page-store-service.ts
apps/portal/app/api/page-store/route.ts
apps/portal/app/api/page-store/snapshots/route.ts
apps/portal/app/api/page-store/snapshots/[id]/route.ts
apps/portal/app/api/page-store/urls/route.ts
apps/portal/app/tools/page-archive/page.tsx
apps/portal/lib/vercel-blob.ts
```

## Files to Modify

```
packages/database/src/models/client.ts
packages/database/src/index.ts
apps/portal/app/api/tools/meta-tag-analyser/route.ts
apps/portal/lib/tools.ts
```

---

## Future Considerations

- **Storage migration**: If Vercel Blob limits are hit, design supports easy migration to S3
- **Additional tools**: New tools built page-store-first from day one
- **Change detection**: Snapshot history enables automated change alerts
- **Visual regression**: Could extend to store screenshots alongside HTML
