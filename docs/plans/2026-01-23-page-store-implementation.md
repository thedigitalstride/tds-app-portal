# Page Store Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a shared page source storage system that captures and versions webpage HTML for reuse across tools.

**Architecture:** Global page store with client-tagged snapshots. Vercel Blob stores HTML content, MongoDB stores metadata. Tools call a service layer that auto-fetches if cached content is stale. Rolling window retention (default 10 snapshots per URL).

**Tech Stack:** Next.js 15, MongoDB/Mongoose, Vercel Blob (`@vercel/blob`), TypeScript

**Working Directory:** `/Users/ianhancock/My Repos/tds-app-portal/.worktrees/page-store`

---

## Task 1: Install Vercel Blob dependency

**Files:**
- Modify: `package.json` (root)

**Step 1: Install @vercel/blob package**

Run:
```bash
cd /Users/ianhancock/My\ Repos/tds-app-portal/.worktrees/page-store
pnpm add @vercel/blob -w
```

Expected: Package added to root dependencies

**Step 2: Verify installation**

Run:
```bash
pnpm list @vercel/blob
```

Expected: Shows @vercel/blob in dependencies

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @vercel/blob dependency for page store"
```

---

## Task 2: Add page store fields to Client model

**Files:**
- Modify: `packages/database/src/models/client.ts`

**Step 1: Add interface fields**

In `packages/database/src/models/client.ts`, add to the `IClient` interface after `createdBy`:

```typescript
export interface IClient extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  website: string;
  description?: string;
  contactEmail?: string;
  contactName?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  // Page store settings
  pageFreshnessHours: number;
  maxSnapshotsPerUrl: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Step 2: Add schema fields**

In the same file, add to the schema definition before the closing `}` of the schema object:

```typescript
    // Page store settings
    pageFreshnessHours: {
      type: Number,
      default: 24,
      min: 1,
      max: 168, // 1 week max
    },
    maxSnapshotsPerUrl: {
      type: Number,
      default: 10,
      min: 1,
      max: 100,
    },
```

**Step 3: Run type-check to verify**

Run:
```bash
cd /Users/ianhancock/My\ Repos/tds-app-portal/.worktrees/page-store
pnpm run type-check
```

Expected: All tasks successful

**Step 4: Commit**

```bash
git add packages/database/src/models/client.ts
git commit -m "feat(database): add page store settings to Client model"
```

---

## Task 3: Create PageSnapshot model

**Files:**
- Create: `packages/database/src/models/page-snapshot.ts`

**Step 1: Create the model file**

Create `packages/database/src/models/page-snapshot.ts`:

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPageSnapshot extends Document {
  _id: mongoose.Types.ObjectId;
  url: string;
  urlHash: string;

  // Snapshot metadata
  fetchedAt: Date;
  fetchedBy: mongoose.Types.ObjectId;
  triggeredByClient: mongoose.Types.ObjectId;
  triggeredByTool: string;

  // Storage reference (Vercel Blob)
  blobUrl: string;
  contentSize: number;

  // Key HTTP headers
  httpStatus: number;
  contentType?: string;
  lastModified?: string;
  cacheControl?: string;
  xRobotsTag?: string;

  createdAt: Date;
}

const pageSnapshotSchema = new Schema<IPageSnapshot>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    urlHash: {
      type: String,
      required: true,
      index: true,
    },
    fetchedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    fetchedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    triggeredByClient: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    triggeredByTool: {
      type: String,
      required: true,
    },
    blobUrl: {
      type: String,
      required: true,
    },
    contentSize: {
      type: Number,
      required: true,
    },
    httpStatus: {
      type: Number,
      required: true,
    },
    contentType: String,
    lastModified: String,
    cacheControl: String,
    xRobotsTag: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes for efficient queries
pageSnapshotSchema.index({ urlHash: 1, fetchedAt: -1 });
pageSnapshotSchema.index({ triggeredByClient: 1, fetchedAt: -1 });

// Delete cached model in development
if (process.env.NODE_ENV !== 'production' && mongoose.models.PageSnapshot) {
  delete mongoose.models.PageSnapshot;
}

export const PageSnapshot: Model<IPageSnapshot> =
  mongoose.models.PageSnapshot || mongoose.model<IPageSnapshot>('PageSnapshot', pageSnapshotSchema);
```

**Step 2: Run type-check to verify**

Run:
```bash
pnpm run type-check
```

Expected: All tasks successful

**Step 3: Commit**

```bash
git add packages/database/src/models/page-snapshot.ts
git commit -m "feat(database): add PageSnapshot model for page source storage"
```

---

## Task 4: Create PageStore model

**Files:**
- Create: `packages/database/src/models/page-store.ts`

**Step 1: Create the model file**

Create `packages/database/src/models/page-store.ts`:

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPageStore extends Document {
  _id: mongoose.Types.ObjectId;
  url: string;
  urlHash: string;

  // Latest snapshot reference
  latestSnapshotId: mongoose.Types.ObjectId;
  latestFetchedAt: Date;

  // Snapshot management
  snapshotCount: number;

  // Access tracking
  clientsWithAccess: mongoose.Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const pageStoreSchema = new Schema<IPageStore>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    urlHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    latestSnapshotId: {
      type: Schema.Types.ObjectId,
      ref: 'PageSnapshot',
    },
    latestFetchedAt: {
      type: Date,
    },
    snapshotCount: {
      type: Number,
      default: 0,
    },
    clientsWithAccess: [{
      type: Schema.Types.ObjectId,
      ref: 'Client',
    }],
  },
  {
    timestamps: true,
  }
);

// Index for client access queries
pageStoreSchema.index({ clientsWithAccess: 1 });

// Delete cached model in development
if (process.env.NODE_ENV !== 'production' && mongoose.models.PageStore) {
  delete mongoose.models.PageStore;
}

export const PageStore: Model<IPageStore> =
  mongoose.models.PageStore || mongoose.model<IPageStore>('PageStore', pageStoreSchema);
```

**Step 2: Run type-check to verify**

Run:
```bash
pnpm run type-check
```

Expected: All tasks successful

**Step 3: Commit**

```bash
git add packages/database/src/models/page-store.ts
git commit -m "feat(database): add PageStore model for URL indexing"
```

---

## Task 5: Export new models from database package

**Files:**
- Modify: `packages/database/src/index.ts`

**Step 1: Add exports**

Add these lines to `packages/database/src/index.ts`:

```typescript
export { PageSnapshot, type IPageSnapshot } from './models/page-snapshot';
export { PageStore, type IPageStore } from './models/page-store';
```

**Step 2: Run type-check to verify**

Run:
```bash
pnpm run type-check
```

Expected: All tasks successful

**Step 3: Commit**

```bash
git add packages/database/src/index.ts
git commit -m "feat(database): export PageSnapshot and PageStore models"
```

---

## Task 6: Create URL normalisation utility

**Files:**
- Create: `packages/database/src/utils/url-utils.ts`

**Step 1: Create the utility file**

Create `packages/database/src/utils/url-utils.ts`:

```typescript
import crypto from 'crypto';

/**
 * Normalise a URL for consistent storage and lookup.
 * - Converts to lowercase
 * - Removes trailing slashes
 * - Removes default ports
 * - Sorts query parameters
 * - Removes fragment identifiers
 */
export function normaliseUrl(urlString: string): string {
  try {
    // Add protocol if missing
    if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
      urlString = `https://${urlString}`;
    }

    const url = new URL(urlString);

    // Lowercase hostname
    url.hostname = url.hostname.toLowerCase();

    // Remove default ports
    if ((url.protocol === 'https:' && url.port === '443') ||
        (url.protocol === 'http:' && url.port === '80')) {
      url.port = '';
    }

    // Sort query parameters for consistency
    const params = new URLSearchParams(url.searchParams);
    const sortedParams = new URLSearchParams([...params.entries()].sort());
    url.search = sortedParams.toString();

    // Remove fragment
    url.hash = '';

    // Build normalised URL
    let normalised = url.toString();

    // Remove trailing slash (except for root)
    if (normalised.endsWith('/') && url.pathname !== '/') {
      normalised = normalised.slice(0, -1);
    }

    return normalised;
  } catch {
    // If URL parsing fails, return as-is
    return urlString;
  }
}

/**
 * Generate a hash for a normalised URL.
 * Used for efficient database lookups.
 */
export function hashUrl(url: string): string {
  const normalised = normaliseUrl(url);
  return crypto.createHash('sha256').update(normalised).digest('hex').substring(0, 16);
}
```

**Step 2: Export from index**

Add to `packages/database/src/index.ts`:

```typescript
export { normaliseUrl, hashUrl } from './utils/url-utils';
```

**Step 3: Run type-check to verify**

Run:
```bash
pnpm run type-check
```

Expected: All tasks successful

**Step 4: Commit**

```bash
git add packages/database/src/utils/url-utils.ts packages/database/src/index.ts
git commit -m "feat(database): add URL normalisation utilities"
```

---

## Task 7: Create Vercel Blob helper

**Files:**
- Create: `apps/portal/lib/vercel-blob.ts`

**Step 1: Create the helper file**

Create `apps/portal/lib/vercel-blob.ts`:

```typescript
import { put, del } from '@vercel/blob';

const BLOB_PREFIX = 'page-store';

/**
 * Upload HTML content to Vercel Blob storage.
 * Returns the blob URL.
 */
export async function uploadPageHtml(
  urlHash: string,
  html: string,
  timestamp: Date
): Promise<{ url: string; size: number }> {
  const filename = `${BLOB_PREFIX}/${urlHash}/${timestamp.getTime()}.html`;

  const blob = await put(filename, html, {
    access: 'public',
    contentType: 'text/html; charset=utf-8',
  });

  return {
    url: blob.url,
    size: Buffer.byteLength(html, 'utf-8'),
  };
}

/**
 * Delete a page snapshot from Vercel Blob storage.
 */
export async function deletePageHtml(blobUrl: string): Promise<void> {
  try {
    await del(blobUrl);
  } catch (error) {
    // Log but don't throw - blob may already be deleted
    console.warn('Failed to delete blob:', blobUrl, error);
  }
}

/**
 * Fetch HTML content from Vercel Blob storage.
 */
export async function fetchPageHtml(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch blob: ${response.status}`);
  }
  return response.text();
}
```

**Step 2: Run type-check to verify**

Run:
```bash
pnpm run type-check
```

Expected: All tasks successful

**Step 3: Commit**

```bash
git add apps/portal/lib/vercel-blob.ts
git commit -m "feat(portal): add Vercel Blob helper for page HTML storage"
```

---

## Task 8: Create PageStoreService

**Files:**
- Create: `apps/portal/lib/services/page-store-service.ts`

**Step 1: Create the service file**

Create `apps/portal/lib/services/page-store-service.ts`:

```typescript
import {
  connectDB,
  PageSnapshot,
  PageStore,
  Client,
  normaliseUrl,
  hashUrl,
  type IPageSnapshot,
  type IPageStore,
} from '@tds/database';
import { uploadPageHtml, deletePageHtml, fetchPageHtml } from '@/lib/vercel-blob';

export interface GetPageOptions {
  url: string;
  clientId: string;
  userId: string;
  toolId: string;
  forceRefresh?: boolean;
  maxAgeOverride?: number; // Hours
}

export interface PageResult {
  html: string;
  snapshot: IPageSnapshot;
  wasCached: boolean;
}

interface FetchResult {
  html: string;
  httpStatus: number;
  contentType?: string;
  lastModified?: string;
  cacheControl?: string;
  xRobotsTag?: string;
}

/**
 * Fetch a page from the web.
 */
async function fetchFromWeb(url: string): Promise<FetchResult> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'TDS Page Store/1.0',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  return {
    html,
    httpStatus: response.status,
    contentType: response.headers.get('content-type') || undefined,
    lastModified: response.headers.get('last-modified') || undefined,
    cacheControl: response.headers.get('cache-control') || undefined,
    xRobotsTag: response.headers.get('x-robots-tag') || undefined,
  };
}

/**
 * Check if a snapshot is fresh enough based on client settings.
 */
function isSnapshotFresh(
  snapshot: IPageSnapshot,
  freshnessHours: number
): boolean {
  const ageMs = Date.now() - snapshot.fetchedAt.getTime();
  const maxAgeMs = freshnessHours * 60 * 60 * 1000;
  return ageMs < maxAgeMs;
}

/**
 * Main method to get a page. Auto-fetches if stale or missing.
 */
export async function getPage(options: GetPageOptions): Promise<PageResult> {
  const { url, clientId, userId, toolId, forceRefresh, maxAgeOverride } = options;

  await connectDB();

  const normalisedUrl = normaliseUrl(url);
  const urlHash = hashUrl(url);

  // Get client settings for freshness
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  const freshnessHours = maxAgeOverride ?? client.pageFreshnessHours;

  // Check for existing page store entry
  let pageStore = await PageStore.findOne({ urlHash });

  // If we have a cached version and it's fresh enough, use it
  if (pageStore && pageStore.latestSnapshotId && !forceRefresh) {
    const latestSnapshot = await PageSnapshot.findById(pageStore.latestSnapshotId);

    if (latestSnapshot && isSnapshotFresh(latestSnapshot, freshnessHours)) {
      // Fetch HTML from blob storage
      const html = await fetchPageHtml(latestSnapshot.blobUrl);

      // Ensure client has access tracked
      if (!pageStore.clientsWithAccess.some(id => id.toString() === clientId)) {
        pageStore.clientsWithAccess.push(clientId as any);
        await pageStore.save();
      }

      return {
        html,
        snapshot: latestSnapshot,
        wasCached: true,
      };
    }
  }

  // Need to fetch fresh content
  const fetchResult = await fetchFromWeb(normalisedUrl);
  const fetchedAt = new Date();

  // Upload HTML to Vercel Blob
  const { url: blobUrl, size: contentSize } = await uploadPageHtml(
    urlHash,
    fetchResult.html,
    fetchedAt
  );

  // Create snapshot record
  const snapshot = await PageSnapshot.create({
    url: normalisedUrl,
    urlHash,
    fetchedAt,
    fetchedBy: userId,
    triggeredByClient: clientId,
    triggeredByTool: toolId,
    blobUrl,
    contentSize,
    httpStatus: fetchResult.httpStatus,
    contentType: fetchResult.contentType,
    lastModified: fetchResult.lastModified,
    cacheControl: fetchResult.cacheControl,
    xRobotsTag: fetchResult.xRobotsTag,
  });

  // Update or create page store entry
  if (pageStore) {
    pageStore.latestSnapshotId = snapshot._id;
    pageStore.latestFetchedAt = fetchedAt;
    pageStore.snapshotCount += 1;

    if (!pageStore.clientsWithAccess.some(id => id.toString() === clientId)) {
      pageStore.clientsWithAccess.push(clientId as any);
    }

    await pageStore.save();
  } else {
    pageStore = await PageStore.create({
      url: normalisedUrl,
      urlHash,
      latestSnapshotId: snapshot._id,
      latestFetchedAt: fetchedAt,
      snapshotCount: 1,
      clientsWithAccess: [clientId],
    });
  }

  // Enforce retention limit
  await enforceRetentionLimit(urlHash, client.maxSnapshotsPerUrl);

  return {
    html: fetchResult.html,
    snapshot,
    wasCached: false,
  };
}

/**
 * Get historical snapshots for a URL.
 */
export async function getSnapshots(
  url: string,
  clientId: string,
  limit: number = 10
): Promise<IPageSnapshot[]> {
  await connectDB();

  const urlHash = hashUrl(url);

  // Verify client has access
  const pageStore = await PageStore.findOne({ urlHash });
  if (!pageStore || !pageStore.clientsWithAccess.some(id => id.toString() === clientId)) {
    return [];
  }

  return PageSnapshot.find({ urlHash })
    .sort({ fetchedAt: -1 })
    .limit(limit);
}

/**
 * Get a specific snapshot by ID.
 */
export async function getSnapshotById(
  snapshotId: string,
  clientId: string
): Promise<PageResult | null> {
  await connectDB();

  const snapshot = await PageSnapshot.findById(snapshotId);
  if (!snapshot) {
    return null;
  }

  // Verify client has access
  const pageStore = await PageStore.findOne({ urlHash: snapshot.urlHash });
  if (!pageStore || !pageStore.clientsWithAccess.some(id => id.toString() === clientId)) {
    return null;
  }

  const html = await fetchPageHtml(snapshot.blobUrl);

  return {
    html,
    snapshot,
    wasCached: true,
  };
}

/**
 * Get all stored URLs for a client.
 */
export async function getClientUrls(clientId: string): Promise<IPageStore[]> {
  await connectDB();

  return PageStore.find({ clientsWithAccess: clientId })
    .sort({ latestFetchedAt: -1 });
}

/**
 * Enforce rolling window retention limit.
 */
async function enforceRetentionLimit(
  urlHash: string,
  maxSnapshots: number
): Promise<void> {
  const snapshots = await PageSnapshot.find({ urlHash })
    .sort({ fetchedAt: -1 });

  if (snapshots.length <= maxSnapshots) {
    return;
  }

  // Delete old snapshots beyond the limit
  const toDelete = snapshots.slice(maxSnapshots);

  for (const snapshot of toDelete) {
    // Delete from Vercel Blob
    await deletePageHtml(snapshot.blobUrl);

    // Delete from MongoDB
    await PageSnapshot.findByIdAndDelete(snapshot._id);
  }

  // Update count
  await PageStore.updateOne(
    { urlHash },
    { snapshotCount: maxSnapshots }
  );
}
```

**Step 2: Run type-check to verify**

Run:
```bash
pnpm run type-check
```

Expected: All tasks successful

**Step 3: Commit**

```bash
git add apps/portal/lib/services/page-store-service.ts
git commit -m "feat(portal): add PageStoreService for page source management"
```

---

## Task 9: Create page store API routes

**Files:**
- Create: `apps/portal/app/api/page-store/route.ts`
- Create: `apps/portal/app/api/page-store/snapshots/route.ts`
- Create: `apps/portal/app/api/page-store/snapshots/[id]/route.ts`
- Create: `apps/portal/app/api/page-store/urls/route.ts`

**Step 1: Create main page-store route**

Create `apps/portal/app/api/page-store/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/permissions';
import { getPage } from '@/lib/services/page-store-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { url, clientId, toolId, forceRefresh } = await request.json();

    if (!url || !clientId || !toolId) {
      return NextResponse.json(
        { error: 'url, clientId, and toolId are required' },
        { status: 400 }
      );
    }

    const result = await getPage({
      url,
      clientId,
      userId: session.user.id,
      toolId,
      forceRefresh,
    });

    return NextResponse.json({
      html: result.html,
      snapshot: {
        _id: result.snapshot._id,
        url: result.snapshot.url,
        fetchedAt: result.snapshot.fetchedAt,
        fetchedBy: result.snapshot.fetchedBy,
        triggeredByTool: result.snapshot.triggeredByTool,
        contentSize: result.snapshot.contentSize,
        httpStatus: result.snapshot.httpStatus,
        contentType: result.snapshot.contentType,
        lastModified: result.snapshot.lastModified,
        cacheControl: result.snapshot.cacheControl,
        xRobotsTag: result.snapshot.xRobotsTag,
      },
      wasCached: result.wasCached,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Page store error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get page' },
      { status: 500 }
    );
  }
}
```

**Step 2: Create snapshots list route**

Create `apps/portal/app/api/page-store/snapshots/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/permissions';
import { getSnapshots } from '@/lib/services/page-store-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const clientId = searchParams.get('clientId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!url || !clientId) {
      return NextResponse.json(
        { error: 'url and clientId are required' },
        { status: 400 }
      );
    }

    const snapshots = await getSnapshots(url, clientId, limit);

    return NextResponse.json({ snapshots });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get snapshots error:', error);
    return NextResponse.json(
      { error: 'Failed to get snapshots' },
      { status: 500 }
    );
  }
}
```

**Step 3: Create snapshot by ID route**

Create `apps/portal/app/api/page-store/snapshots/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/permissions';
import { getSnapshotById } from '@/lib/services/page-store-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    const result = await getSnapshotById(id, clientId);

    if (!result) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      html: result.html,
      snapshot: result.snapshot,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get snapshot error:', error);
    return NextResponse.json(
      { error: 'Failed to get snapshot' },
      { status: 500 }
    );
  }
}
```

**Step 4: Create client URLs route**

Create `apps/portal/app/api/page-store/urls/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/permissions';
import { getClientUrls } from '@/lib/services/page-store-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    const urls = await getClientUrls(clientId);

    return NextResponse.json({ urls });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get client URLs error:', error);
    return NextResponse.json(
      { error: 'Failed to get URLs' },
      { status: 500 }
    );
  }
}
```

**Step 5: Run type-check to verify**

Run:
```bash
pnpm run type-check
```

Expected: All tasks successful

**Step 6: Commit**

```bash
git add apps/portal/app/api/page-store/
git commit -m "feat(portal): add page store API routes"
```

---

## Task 10: Migrate Meta Tag Analyser to use PageStoreService

**Files:**
- Modify: `apps/portal/app/api/tools/meta-tag-analyser/route.ts`

**Step 1: Add import for page store service**

At the top of `apps/portal/app/api/tools/meta-tag-analyser/route.ts`, add:

```typescript
import { getPage } from '@/lib/services/page-store-service';
```

**Step 2: Modify POST handler to use page store**

Replace the URL fetching section (approximately lines 571-607) in the POST function. Find this code:

```typescript
    // Validate URL format
    let validUrl: URL;
    try {
      validUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Fetch the page
    const response = await fetch(validUrl.toString(), {
      headers: {
        'User-Agent': 'TDS Meta Tag Analyser/1.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 400 }
      );
    }

    const html = await response.text();
```

Replace it with:

```typescript
    // Validate URL format
    let validUrl: URL;
    try {
      validUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Get clientId from request body (required for page store)
    const { clientId } = await request.json().catch(() => ({}));

    // For backwards compatibility, allow scanning without clientId
    // but page store requires it for the full flow
    let html: string;

    if (clientId) {
      // Use page store service
      try {
        const pageResult = await getPage({
          url: validUrl.toString(),
          clientId,
          userId: session.user.id,
          toolId: 'meta-tag-analyser',
        });
        html = pageResult.html;
      } catch (pageError) {
        return NextResponse.json(
          { error: pageError instanceof Error ? pageError.message : 'Failed to fetch URL' },
          { status: 400 }
        );
      }
    } else {
      // Fallback: direct fetch (for backwards compatibility)
      const response = await fetch(validUrl.toString(), {
        headers: {
          'User-Agent': 'TDS Meta Tag Analyser/1.0',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
          { status: 400 }
        );
      }

      html = await response.text();
    }
```

**Note:** The above is a backwards-compatible migration. Since the existing code already parses `url` from the body, we need to parse `clientId` at the same time. The actual implementation may need adjustment based on how the request body is currently parsed.

**Step 3: Actually, let's review the current body parsing**

Looking at the current code, the body is parsed once at line 578:
```typescript
const { url } = await request.json();
```

We need to also extract `clientId`:
```typescript
const { url, clientId } = await request.json();
```

Then use the conditional logic from Step 2 (without the re-parsing).

**Step 4: Run type-check to verify**

Run:
```bash
pnpm run type-check
```

Expected: All tasks successful

**Step 5: Commit**

```bash
git add apps/portal/app/api/tools/meta-tag-analyser/route.ts
git commit -m "feat(meta-tag-analyser): integrate with page store service"
```

---

## Task 11: Update Meta Tag Analyser frontend to pass clientId

**Files:**
- Modify: `apps/portal/app/tools/meta-tag-analyser/components/ScanPanel.tsx`

**Step 1: Find the scan API call**

Locate where the API call to `/api/tools/meta-tag-analyser` is made and ensure `clientId` is included in the request body.

**Step 2: Verify clientId is passed**

The frontend likely already passes clientId for saving results. Verify and ensure the scan request includes it:

```typescript
const response = await fetch('/api/tools/meta-tag-analyser', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url, clientId }), // Ensure clientId is included
});
```

**Step 3: Run type-check to verify**

Run:
```bash
pnpm run type-check
```

Expected: All tasks successful

**Step 4: Commit (if changes were needed)**

```bash
git add apps/portal/app/tools/meta-tag-analyser/components/ScanPanel.tsx
git commit -m "feat(meta-tag-analyser): ensure clientId is passed to scan API"
```

---

## Task 12: Create Page Archive tool page

**Files:**
- Create: `apps/portal/app/tools/page-archive/page.tsx`
- Create: `apps/portal/app/tools/page-archive/layout.tsx`

**Step 1: Create layout file**

Create `apps/portal/app/tools/page-archive/layout.tsx`:

```typescript
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function PageArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Admin only
  if (session.user.role !== 'admin') {
    redirect('/tools');
  }

  return <>{children}</>;
}
```

**Step 2: Create page file**

Create `apps/portal/app/tools/page-archive/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@tds/ui';
import { Archive, RefreshCw, ExternalLink, Clock, Database } from 'lucide-react';

interface PageStoreEntry {
  _id: string;
  url: string;
  latestFetchedAt: string;
  snapshotCount: number;
}

interface Snapshot {
  _id: string;
  url: string;
  fetchedAt: string;
  triggeredByTool: string;
  contentSize: number;
  httpStatus: number;
}

export default function PageArchivePage() {
  const [clients, setClients] = useState<Array<{ _id: string; name: string }>>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [urls, setUrls] = useState<PageStoreEntry[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch clients on mount
  useEffect(() => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => {
        setClients(data);
        if (data.length > 0) {
          setSelectedClientId(data[0]._id);
        }
      });
  }, []);

  // Fetch URLs when client changes
  useEffect(() => {
    if (!selectedClientId) return;

    setLoading(true);
    fetch(`/api/page-store/urls?clientId=${selectedClientId}`)
      .then(res => res.json())
      .then(data => {
        setUrls(data.urls || []);
        setSelectedUrl('');
        setSnapshots([]);
      })
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  // Fetch snapshots when URL changes
  useEffect(() => {
    if (!selectedUrl || !selectedClientId) return;

    setLoading(true);
    fetch(`/api/page-store/snapshots?url=${encodeURIComponent(selectedUrl)}&clientId=${selectedClientId}`)
      .then(res => res.json())
      .then(data => {
        setSnapshots(data.snapshots || []);
      })
      .finally(() => setLoading(false));
  }, [selectedUrl, selectedClientId]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Archive className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Page Archive</h1>
          <p className="text-muted-foreground">
            View and manage stored page snapshots
          </p>
        </div>
      </div>

      {/* Client Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <label className="block text-sm font-medium mb-2">Select Client</label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {clients.map(client => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* URL List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Stored URLs ({urls.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !urls.length ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : urls.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No stored pages for this client
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {urls.map(entry => (
                  <button
                    key={entry._id}
                    onClick={() => setSelectedUrl(entry.url)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      selectedUrl === entry.url
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm truncate flex-1">
                        {entry.url}
                      </span>
                      <ExternalLink className="h-4 w-4 ml-2 flex-shrink-0" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {entry.snapshotCount} snapshots · Last: {formatDate(entry.latestFetchedAt)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Snapshot History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Snapshot History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedUrl ? (
              <p className="text-muted-foreground text-center py-8">
                Select a URL to view snapshots
              </p>
            ) : snapshots.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No snapshots found
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {snapshots.map(snapshot => (
                  <div
                    key={snapshot._id}
                    className="p-3 rounded-md border"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {formatDate(snapshot.fetchedAt)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        snapshot.httpStatus === 200
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {snapshot.httpStatus}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {snapshot.triggeredByTool} · {formatBytes(snapshot.contentSize)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Step 3: Run type-check to verify**

Run:
```bash
pnpm run type-check
```

Expected: All tasks successful

**Step 4: Commit**

```bash
git add apps/portal/app/tools/page-archive/
git commit -m "feat(portal): add Page Archive tool for admin users"
```

---

## Task 13: Register Page Archive tool

**Files:**
- Modify: `apps/portal/lib/tools.ts`

**Step 1: Add import for Archive icon**

Update the import at the top of `apps/portal/lib/tools.ts`:

```typescript
import { LucideIcon, Search, Users, Settings, FolderOpen, Archive } from 'lucide-react';
```

**Step 2: Add Page Archive to tools array**

Add to the `tools` array:

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
  },
```

**Step 3: Run type-check to verify**

Run:
```bash
pnpm run type-check
```

Expected: All tasks successful

**Step 4: Commit**

```bash
git add apps/portal/lib/tools.ts
git commit -m "feat(portal): register Page Archive tool in tools list"
```

---

## Task 14: Add BLOB_READ_WRITE_TOKEN to environment

**Files:**
- Modify: `apps/portal/.env.local.example` (if exists) or document in README

**Step 1: Document required environment variable**

The `BLOB_READ_WRITE_TOKEN` environment variable is required for Vercel Blob. In production, this is auto-configured when you connect Blob storage in Vercel dashboard.

For local development, add to `.env.local`:

```
BLOB_READ_WRITE_TOKEN=your_token_here
```

**Step 2: Commit documentation update (if applicable)**

If there's an `.env.local.example` file, update it and commit.

---

## Task 15: Final verification

**Step 1: Run full type-check**

Run:
```bash
cd /Users/ianhancock/My\ Repos/tds-app-portal/.worktrees/page-store
pnpm run type-check
```

Expected: All tasks successful

**Step 2: Run build to verify everything compiles**

Run:
```bash
pnpm run build
```

Expected: Build successful

**Step 3: Create summary commit**

```bash
git log --oneline -10
```

Review the commits made during this implementation.

---

## Summary of Files Created/Modified

### Created:
- `packages/database/src/models/page-snapshot.ts`
- `packages/database/src/models/page-store.ts`
- `packages/database/src/utils/url-utils.ts`
- `apps/portal/lib/vercel-blob.ts`
- `apps/portal/lib/services/page-store-service.ts`
- `apps/portal/app/api/page-store/route.ts`
- `apps/portal/app/api/page-store/snapshots/route.ts`
- `apps/portal/app/api/page-store/snapshots/[id]/route.ts`
- `apps/portal/app/api/page-store/urls/route.ts`
- `apps/portal/app/tools/page-archive/page.tsx`
- `apps/portal/app/tools/page-archive/layout.tsx`

### Modified:
- `package.json` (root - @vercel/blob dependency)
- `packages/database/src/models/client.ts` (page store settings)
- `packages/database/src/index.ts` (exports)
- `apps/portal/app/api/tools/meta-tag-analyser/route.ts` (page store integration)
- `apps/portal/lib/tools.ts` (Page Archive registration)

---

## Environment Setup

Ensure these are configured before running:

1. **Vercel Blob**: Connect Blob storage in Vercel dashboard (auto-adds `BLOB_READ_WRITE_TOKEN`)
2. **MongoDB**: Existing setup continues to work
