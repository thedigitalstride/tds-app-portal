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
        pageStore.clientsWithAccess.push(clientId as unknown as typeof pageStore.clientsWithAccess[0]);
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
      pageStore.clientsWithAccess.push(clientId as unknown as typeof pageStore.clientsWithAccess[0]);
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
