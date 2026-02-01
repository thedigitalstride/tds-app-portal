import {
  connectDB,
  PageSnapshot,
  PageStore,
  Client,
  MetaTagAnalysis,
  normaliseUrl,
  hashUrl,
  type IPageSnapshot,
} from '@tds/database';
import { uploadPageHtml, deletePageHtml, fetchPageHtml, uploadScreenshot } from '@/lib/vercel-blob';
import { fetchWithDualScreenshots } from './scrapingbee-service';

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
  screenshotDesktopBuffer?: Buffer;
  screenshotMobileBuffer?: Buffer;
  resolvedUrl: string;
  renderTimeMs: number;
  creditsUsed: number;
}

/**
 * Fetch a page using ScrapingBee with JavaScript rendering and screenshots.
 */
async function fetchFromWeb(url: string): Promise<FetchResult> {
  // Check if ScrapingBee API key is configured
  if (!process.env.SCRAPINGBEE_API_KEY) {
    // Fallback to simple fetch if no API key (for development/testing)
    console.warn('SCRAPINGBEE_API_KEY not set, using fallback fetch');
    return fetchFromWebFallback(url);
  }

  try {
    const result = await fetchWithDualScreenshots(url, {
      blockAds: true,
      waitMs: 3000,
    });

    return {
      html: result.html,
      screenshotDesktopBuffer: result.screenshotDesktop,
      screenshotMobileBuffer: result.screenshotMobile,
      httpStatus: result.statusCode,
      resolvedUrl: result.resolvedUrl,
      renderTimeMs: result.renderTimeMs,
      creditsUsed: result.totalCreditsUsed,
    };
  } catch (error) {
    console.error('ScrapingBee fetch failed, using fallback:', error);
    return fetchFromWebFallback(url);
  }
}

/**
 * Fallback fetch using native fetch (no JS rendering, no screenshots).
 * Used when ScrapingBee is not configured or fails.
 */
async function fetchFromWebFallback(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
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
      resolvedUrl: url,
      renderTimeMs: Date.now() - startTime,
      creditsUsed: 0,
    };
  } finally {
    clearTimeout(timeoutId);
  }
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

  const freshnessHours = maxAgeOverride ?? client.pageFreshnessHours ?? 24;

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

  // Upload screenshots to Vercel Blob
  let screenshotDesktopUrl: string | undefined;
  let screenshotMobileUrl: string | undefined;
  let screenshotDesktopSize: number | undefined;
  let screenshotMobileSize: number | undefined;

  if (fetchResult.screenshotDesktopBuffer) {
    const desktopBlob = await uploadScreenshot(
      `page-store/${urlHash}/${fetchedAt.getTime()}-desktop.png`,
      fetchResult.screenshotDesktopBuffer
    );
    screenshotDesktopUrl = desktopBlob.url;
    screenshotDesktopSize = fetchResult.screenshotDesktopBuffer.length;
  }

  if (fetchResult.screenshotMobileBuffer) {
    const mobileBlob = await uploadScreenshot(
      `page-store/${urlHash}/${fetchedAt.getTime()}-mobile.png`,
      fetchResult.screenshotMobileBuffer
    );
    screenshotMobileUrl = mobileBlob.url;
    screenshotMobileSize = fetchResult.screenshotMobileBuffer.length;
  }

  // Determine render method based on whether ScrapingBee was used
  const usedScrapingBee = fetchResult.creditsUsed > 0;

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
    // Screenshot fields
    screenshotDesktopUrl,
    screenshotMobileUrl,
    screenshotDesktopSize,
    screenshotMobileSize,
    // Render metadata
    renderMethod: usedScrapingBee ? 'scrapingbee' : 'fetch',
    jsRendered: usedScrapingBee,
    renderTimeMs: fetchResult.renderTimeMs,
    // ScrapingBee metadata
    scrapingBeeCreditsUsed: fetchResult.creditsUsed || undefined,
    resolvedUrl: fetchResult.resolvedUrl !== normalisedUrl ? fetchResult.resolvedUrl : undefined,
  });

  // Update or create page store entry using atomic operations
  if (pageStore) {
    await PageStore.updateOne(
      { urlHash },
      {
        $set: {
          latestSnapshotId: snapshot._id,
          latestFetchedAt: fetchedAt,
        },
        $inc: { snapshotCount: 1 },
        $addToSet: { clientsWithAccess: clientId },
      }
    );
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

  // Update currentSnapshotId on any MetaTagAnalysis records for this URL
  // This marks existing analyses as stale (analyzedSnapshotId !== currentSnapshotId)
  await MetaTagAnalysis.updateMany(
    { url: normalisedUrl },
    { $set: { currentSnapshotId: snapshot._id } }
  );

  // Enforce retention limit
  await enforceRetentionLimit(urlHash, client.maxSnapshotsPerUrl ?? 10);

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

export interface PopulatedPageStoreEntry {
  _id: string;
  url: string;
  urlHash: string;
  latestFetchedAt: Date;
  snapshotCount: number;
  latestSnapshot?: {
    _id: string;
    fetchedAt: Date;
    httpStatus: number;
    contentSize: number;
    screenshotDesktopUrl?: string;
    screenshotMobileUrl?: string;
    renderMethod?: string;
  };
}

/**
 * Get all stored URLs for a client.
 * Populates latestSnapshot with screenshot URLs for display.
 */
export async function getClientUrls(clientId: string): Promise<PopulatedPageStoreEntry[]> {
  await connectDB();

  const docs = await PageStore.find({ clientsWithAccess: clientId })
    .populate({
      path: 'latestSnapshotId',
      select: 'fetchedAt httpStatus contentSize screenshotDesktopUrl screenshotMobileUrl renderMethod',
    })
    .sort({ latestFetchedAt: -1 })
    .lean();

  // Transform to include latestSnapshot as a nested object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return docs.map((doc: any) => ({
    _id: doc._id.toString(),
    url: doc.url,
    urlHash: doc.urlHash,
    latestFetchedAt: doc.latestFetchedAt,
    snapshotCount: doc.snapshotCount,
    latestSnapshot: doc.latestSnapshotId ? {
      _id: doc.latestSnapshotId._id.toString(),
      fetchedAt: doc.latestSnapshotId.fetchedAt,
      httpStatus: doc.latestSnapshotId.httpStatus,
      contentSize: doc.latestSnapshotId.contentSize,
      screenshotDesktopUrl: doc.latestSnapshotId.screenshotDesktopUrl,
      screenshotMobileUrl: doc.latestSnapshotId.screenshotMobileUrl,
      renderMethod: doc.latestSnapshotId.renderMethod,
    } : undefined,
  }));
}

/**
 * Delete URLs and all associated snapshots for a client.
 */
export async function deleteUrls(
  urlHashes: string[],
  clientId: string
): Promise<{ deleted: number; errors: string[] }> {
  await connectDB();

  const errors: string[] = [];
  let deleted = 0;

  for (const urlHash of urlHashes) {
    try {
      // Verify client has access
      const pageStore = await PageStore.findOne({ urlHash });
      if (!pageStore || !pageStore.clientsWithAccess.some(id => id.toString() === clientId)) {
        errors.push(`No access to URL with hash ${urlHash}`);
        continue;
      }

      // If this client is the only one with access, delete everything
      if (pageStore.clientsWithAccess.length === 1) {
        // Delete all snapshots and their blob storage
        const snapshots = await PageSnapshot.find({ urlHash });
        for (const snapshot of snapshots) {
          try {
            await deletePageHtml(snapshot.blobUrl);
          } catch (blobError) {
            console.error(`Failed to delete blob for snapshot ${snapshot._id}:`, blobError);
          }
          await PageSnapshot.findByIdAndDelete(snapshot._id);
        }

        // Delete the page store entry
        await PageStore.findByIdAndDelete(pageStore._id);
      } else {
        // Remove this client from the access list
        await PageStore.updateOne(
          { urlHash },
          { $pull: { clientsWithAccess: clientId } }
        );
      }

      deleted++;
    } catch (error) {
      console.error(`Failed to delete URL with hash ${urlHash}:`, error);
      errors.push(`Failed to delete URL with hash ${urlHash}`);
    }
  }

  return { deleted, errors };
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
  let deletedCount = 0;

  for (const snapshot of toDelete) {
    try {
      // Delete from Vercel Blob
      await deletePageHtml(snapshot.blobUrl);
      // Delete from MongoDB
      await PageSnapshot.findByIdAndDelete(snapshot._id);
      deletedCount++;
    } catch (error) {
      // Log but continue with other deletions
      console.error(`Failed to delete snapshot ${snapshot._id}:`, error);
    }
  }

  // Update count based on actual deletions
  if (deletedCount > 0) {
    await PageStore.updateOne(
      { urlHash },
      { $inc: { snapshotCount: -deletedCount } }
    );
  }
}
