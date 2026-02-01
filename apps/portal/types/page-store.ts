/**
 * TypeScript types for Page Store entities.
 * These types are used in the frontend for API responses.
 */

export interface PageSnapshot {
  _id: string;
  url: string;
  urlHash: string;
  fetchedAt: Date;
  fetchedBy: string;
  triggeredByClient: string;
  triggeredByTool: string;
  blobUrl: string;
  contentSize: number;
  httpStatus: number;
  contentType?: string;
  lastModified?: string;
  cacheControl?: string;
  xRobotsTag?: string;
  // Screenshot fields
  screenshotDesktopUrl?: string;
  screenshotMobileUrl?: string;
  screenshotDesktopSize?: number;
  screenshotMobileSize?: number;
  // Render metadata
  renderMethod: 'fetch' | 'scrapingbee';
  jsRendered: boolean;
  renderTimeMs?: number;
  scrapingBeeCreditsUsed?: number;
  resolvedUrl?: string;
  // Timestamps
  createdAt: Date;
}

export interface PageStoreEntry {
  _id: string;
  url: string;
  urlHash: string;
  latestSnapshotId: string;
  latestFetchedAt: Date;
  snapshotCount: number;
  clientsWithAccess: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PopulatedPageStoreEntry extends Omit<PageStoreEntry, 'latestSnapshotId'> {
  latestSnapshot?: Pick<
    PageSnapshot,
    | '_id'
    | 'fetchedAt'
    | 'httpStatus'
    | 'contentSize'
    | 'screenshotDesktopUrl'
    | 'screenshotMobileUrl'
    | 'renderMethod'
  >;
}

export interface PageStoreUrlsResponse {
  urls: PopulatedPageStoreEntry[];
}

export interface PageStoreSnapshotsResponse {
  snapshots: PageSnapshot[];
}

export interface PageStoreSnapshotResponse {
  html: string;
  snapshot: PageSnapshot;
}
