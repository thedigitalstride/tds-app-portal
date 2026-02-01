# ScrapingBee Integration Implementation Plan

## Overview

Replace the current `fetch()` based web scraping in `page-store-service.ts` with ScrapingBee API to provide JavaScript rendering, anti-bot bypass, and full-page screenshot capture (desktop + mobile).

**Branch:** `claude/chromium-web-scraping-zfO1M`

---

## Goals

1. Replace `fetch()` with ScrapingBee API for all page fetching
2. Capture full-page screenshots (desktop + mobile) for every fetch
3. Store screenshots in Vercel Blob alongside HTML
4. Display screenshots in Page Library UI with lightbox viewer
5. Track ScrapingBee credits usage

---

## Dependencies

### NPM Package

No SDK required. Use native `fetch()` to call ScrapingBee REST API.

### Environment Variable

Add to `apps/portal/.env.local`:

```
SCRAPINGBEE_API_KEY=your_api_key_here
```

Add to `apps/portal/.env.example`:

```
SCRAPINGBEE_API_KEY=
```

---

## Phase 1: Database Model Updates

### File: `packages/database/src/models/page-snapshot.ts`

**Add these fields to `IPageSnapshot` interface (after line 24):**

```typescript
// Screenshot storage (Vercel Blob URLs)
screenshotDesktopUrl?: string;
screenshotMobileUrl?: string;
screenshotDesktopSize?: number;
screenshotMobileSize?: number;

// Render metadata
renderMethod: 'fetch' | 'scrapingbee';
jsRendered: boolean;
renderTimeMs?: number;

// ScrapingBee metadata
scrapingBeeCreditsUsed?: number;
resolvedUrl?: string;  // Final URL after redirects
```

**Add these fields to `pageSnapshotSchema` (after line 78):**

```typescript
screenshotDesktopUrl: String,
screenshotMobileUrl: String,
screenshotDesktopSize: {
  type: Number,
  min: 0,
},
screenshotMobileSize: {
  type: Number,
  min: 0,
},
renderMethod: {
  type: String,
  enum: ['fetch', 'scrapingbee'],
  default: 'scrapingbee',
},
jsRendered: {
  type: Boolean,
  default: true,
},
renderTimeMs: Number,
scrapingBeeCreditsUsed: Number,
resolvedUrl: String,
```

---

## Phase 2: ScrapingBee Service

### File: `apps/portal/lib/services/scrapingbee-service.ts` (NEW)

Create this new file with the following content:

```typescript
/**
 * ScrapingBee Service
 *
 * Handles all interactions with ScrapingBee API for web scraping,
 * JavaScript rendering, and screenshot capture.
 */

export interface ScrapingBeeOptions {
  url: string;
  device?: 'desktop' | 'mobile';
  captureScreenshot?: boolean;
  fullPageScreenshot?: boolean;
  waitMs?: number;
  jsScenario?: string;
  blockAds?: boolean;
  premiumProxy?: boolean;
}

export interface ScrapingBeeResult {
  html: string;
  screenshot?: Buffer;
  resolvedUrl: string;
  statusCode: number;
  creditsUsed: number;
  renderTimeMs: number;
}

export interface ScrapingBeeError {
  message: string;
  statusCode?: number;
  creditsUsed: number;
}

const SCRAPINGBEE_API_URL = 'https://app.scrapingbee.com/api/v1/';
const DEFAULT_WAIT_MS = 3000;
const DEFAULT_TIMEOUT_MS = 60000;

/**
 * Fetch a URL using ScrapingBee API
 */
export async function fetchWithScrapingBee(
  options: ScrapingBeeOptions
): Promise<ScrapingBeeResult> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;

  if (!apiKey) {
    throw new Error('SCRAPINGBEE_API_KEY environment variable is not set');
  }

  const startTime = Date.now();

  const params = new URLSearchParams({
    api_key: apiKey,
    url: options.url,
    render_js: 'true',
    wait: String(options.waitMs ?? DEFAULT_WAIT_MS),
    block_ads: String(options.blockAds ?? true),
    return_page_source: 'true',
  });

  // Device emulation
  if (options.device) {
    params.set('device', options.device);
  }

  // Screenshot options
  if (options.captureScreenshot) {
    params.set('screenshot', 'true');
    if (options.fullPageScreenshot !== false) {
      params.set('screenshot_full_page', 'true');
    }
  }

  // Premium proxy for difficult sites
  if (options.premiumProxy) {
    params.set('stealth_proxy', 'true');
  }

  // Custom JavaScript execution
  if (options.jsScenario) {
    params.set('js_scenario', JSON.stringify({ instructions: options.jsScenario }));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${SCRAPINGBEE_API_URL}?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const renderTimeMs = Date.now() - startTime;

    // Extract credits used from response headers
    const creditsUsed = parseInt(response.headers.get('spb-cost') || '0', 10);
    const resolvedUrl = response.headers.get('spb-resolved-url') || options.url;

    if (!response.ok) {
      const errorBody = await response.text();
      throw {
        message: `ScrapingBee request failed: ${response.status} - ${errorBody}`,
        statusCode: response.status,
        creditsUsed,
      } as ScrapingBeeError;
    }

    // Check if response is screenshot (binary) or HTML
    const contentType = response.headers.get('content-type') || '';

    let html: string;
    let screenshot: Buffer | undefined;

    if (options.captureScreenshot && contentType.includes('image/')) {
      // When screenshot is requested, response is the image
      // HTML is in the spb-initial-status-code header scenario
      // Actually, ScrapingBee returns base64 screenshot in header when both are requested
      screenshot = Buffer.from(await response.arrayBuffer());
      html = ''; // HTML comes separately when screenshot is primary
    } else {
      html = await response.text();

      // Screenshot is returned as base64 in header when render_js is true
      const screenshotBase64 = response.headers.get('spb-screenshot');
      if (screenshotBase64) {
        screenshot = Buffer.from(screenshotBase64, 'base64');
      }
    }

    return {
      html,
      screenshot,
      resolvedUrl,
      statusCode: parseInt(response.headers.get('spb-initial-status-code') || '200', 10),
      creditsUsed,
      renderTimeMs,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw {
        message: 'ScrapingBee request timed out',
        creditsUsed: 0,
      } as ScrapingBeeError;
    }

    throw error;
  }
}

/**
 * Fetch a page with both desktop and mobile screenshots
 */
export async function fetchWithDualScreenshots(
  url: string,
  options?: Omit<ScrapingBeeOptions, 'url' | 'device' | 'captureScreenshot'>
): Promise<{
  html: string;
  screenshotDesktop?: Buffer;
  screenshotMobile?: Buffer;
  resolvedUrl: string;
  statusCode: number;
  totalCreditsUsed: number;
  renderTimeMs: number;
}> {
  const startTime = Date.now();

  // Fetch desktop (with HTML) and mobile (screenshot only) in parallel
  const [desktopResult, mobileResult] = await Promise.all([
    fetchWithScrapingBee({
      url,
      device: 'desktop',
      captureScreenshot: true,
      fullPageScreenshot: true,
      ...options,
    }),
    fetchWithScrapingBee({
      url,
      device: 'mobile',
      captureScreenshot: true,
      fullPageScreenshot: true,
      blockAds: options?.blockAds ?? true,
      waitMs: options?.waitMs,
      premiumProxy: options?.premiumProxy,
    }),
  ]);

  return {
    html: desktopResult.html,
    screenshotDesktop: desktopResult.screenshot,
    screenshotMobile: mobileResult.screenshot,
    resolvedUrl: desktopResult.resolvedUrl,
    statusCode: desktopResult.statusCode,
    totalCreditsUsed: desktopResult.creditsUsed + mobileResult.creditsUsed,
    renderTimeMs: Date.now() - startTime,
  };
}

/**
 * Calculate expected credits for a request
 */
export function calculateCredits(options: {
  jsRendering: boolean;
  screenshot: boolean;
  premiumProxy: boolean;
  dualDevice: boolean;
}): number {
  let credits = 1; // Base cost

  if (options.jsRendering) credits = 5;
  if (options.screenshot) credits += 5;
  if (options.premiumProxy) credits = credits * 5; // 25 with JS
  if (options.dualDevice) credits = credits * 2;

  return credits;
}
```

---

## Phase 3: Update Page Store Service

### File: `apps/portal/lib/services/page-store-service.ts`

**Replace the `fetchFromWeb` function (lines 41-71) with:**

```typescript
import { fetchWithDualScreenshots } from './scrapingbee-service';
import { uploadScreenshot } from '@/lib/vercel-blob';

interface FetchFromWebResult {
  html: string;
  screenshotDesktopBuffer?: Buffer;
  screenshotMobileBuffer?: Buffer;
  httpStatus: number;
  resolvedUrl: string;
  renderTimeMs: number;
  creditsUsed: number;
}

async function fetchFromWeb(url: string): Promise<FetchFromWebResult> {
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
    // Return error state
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      html: '',
      httpStatus: 0,
      resolvedUrl: url,
      renderTimeMs: 0,
      creditsUsed: 0,
    };
  }
}
```

**Update the `getPage` function to handle screenshots. Find the section where PageSnapshot is created (around line 130-160) and update to:**

```typescript
// Upload HTML to Vercel Blob
const htmlBlob = await uploadToBlob(
  `page-store/${urlHash}/${Date.now()}.html`,
  fetchResult.html,
  'text/html'
);

// Upload screenshots to Vercel Blob
let screenshotDesktopUrl: string | undefined;
let screenshotMobileUrl: string | undefined;
let screenshotDesktopSize: number | undefined;
let screenshotMobileSize: number | undefined;

if (fetchResult.screenshotDesktopBuffer) {
  const desktopBlob = await uploadScreenshot(
    `page-store/${urlHash}/${Date.now()}-desktop.png`,
    fetchResult.screenshotDesktopBuffer
  );
  screenshotDesktopUrl = desktopBlob.url;
  screenshotDesktopSize = fetchResult.screenshotDesktopBuffer.length;
}

if (fetchResult.screenshotMobileBuffer) {
  const mobileBlob = await uploadScreenshot(
    `page-store/${urlHash}/${Date.now()}-mobile.png`,
    fetchResult.screenshotMobileBuffer
  );
  screenshotMobileUrl = mobileBlob.url;
  screenshotMobileSize = fetchResult.screenshotMobileBuffer.length;
}

// Create snapshot record
const snapshot = await PageSnapshot.create({
  url,
  urlHash,
  fetchedAt: new Date(),
  fetchedBy: new mongoose.Types.ObjectId(userId),
  triggeredByClient: new mongoose.Types.ObjectId(clientId),
  triggeredByTool: toolId,
  blobUrl: htmlBlob.url,
  contentSize: Buffer.byteLength(fetchResult.html, 'utf-8'),
  httpStatus: fetchResult.httpStatus,
  // New fields
  screenshotDesktopUrl,
  screenshotMobileUrl,
  screenshotDesktopSize,
  screenshotMobileSize,
  renderMethod: 'scrapingbee',
  jsRendered: true,
  renderTimeMs: fetchResult.renderTimeMs,
  scrapingBeeCreditsUsed: fetchResult.creditsUsed,
  resolvedUrl: fetchResult.resolvedUrl,
});
```

---

## Phase 4: Vercel Blob Screenshot Upload

### File: `apps/portal/lib/vercel-blob.ts`

**Add this new function after existing upload functions:**

```typescript
/**
 * Upload a screenshot buffer to Vercel Blob
 */
export async function uploadScreenshot(
  pathname: string,
  buffer: Buffer
): Promise<{ url: string }> {
  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType: 'image/png',
  });

  return { url: blob.url };
}
```

---

## Phase 5: API Route Updates

### File: `apps/portal/app/api/page-store/[urlHash]/route.ts`

**Update the GET response to include screenshot URLs. Find the response object and add:**

```typescript
return NextResponse.json({
  // ...existing fields
  screenshotDesktopUrl: snapshot.screenshotDesktopUrl,
  screenshotMobileUrl: snapshot.screenshotMobileUrl,
});
```

---

## Phase 6: UI Components

### File: `apps/portal/components/screenshot/screenshot-thumbnail.tsx` (NEW)

```tsx
'use client';

import React, { useState } from 'react';
import { ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@tds/ui';

interface ScreenshotThumbnailProps {
  desktopUrl?: string;
  mobileUrl?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const sizes = {
  sm: { desktop: 'w-12 h-9', mobile: 'w-6 h-9' },
  md: { desktop: 'w-60 h-44', mobile: 'w-28 h-44' },
  lg: { desktop: 'w-80 h-60', mobile: 'w-40 h-60' },
};

export function ScreenshotThumbnail({
  desktopUrl,
  mobileUrl,
  alt,
  size = 'sm',
  onClick,
  className,
}: ScreenshotThumbnailProps) {
  const [desktopError, setDesktopError] = useState(false);
  const [mobileError, setMobileError] = useState(false);
  const [desktopLoaded, setDesktopLoaded] = useState(false);
  const [mobileLoaded, setMobileLoaded] = useState(false);

  const sizeClasses = sizes[size];

  const renderPlaceholder = (type: 'desktop' | 'mobile') => (
    <div
      className={cn(
        'flex items-center justify-center bg-neutral-100 border border-neutral-200 rounded',
        type === 'desktop' ? sizeClasses.desktop : sizeClasses.mobile
      )}
    >
      <ImageIcon className="h-4 w-4 text-neutral-400" />
    </div>
  );

  const renderError = (type: 'desktop' | 'mobile') => (
    <div
      className={cn(
        'flex items-center justify-center bg-red-50 border border-red-200 rounded',
        type === 'desktop' ? sizeClasses.desktop : sizeClasses.mobile
      )}
    >
      <AlertCircle className="h-4 w-4 text-red-400" />
    </div>
  );

  return (
    <div
      className={cn('flex gap-1 cursor-pointer group', className)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={`View screenshots for ${alt}`}
    >
      {/* Desktop thumbnail */}
      {!desktopUrl ? (
        renderPlaceholder('desktop')
      ) : desktopError ? (
        renderError('desktop')
      ) : (
        <div className="relative">
          {!desktopLoaded && (
            <div
              className={cn(
                'absolute inset-0 bg-neutral-100 animate-pulse rounded',
                sizeClasses.desktop
              )}
            />
          )}
          <img
            src={desktopUrl}
            alt={`Desktop screenshot of ${alt}`}
            className={cn(
              'object-cover object-top rounded border border-neutral-200',
              'group-hover:border-blue-400 group-hover:shadow-sm transition-all',
              sizeClasses.desktop,
              !desktopLoaded && 'opacity-0'
            )}
            onLoad={() => setDesktopLoaded(true)}
            onError={() => setDesktopError(true)}
          />
        </div>
      )}

      {/* Mobile thumbnail */}
      {!mobileUrl ? (
        renderPlaceholder('mobile')
      ) : mobileError ? (
        renderError('mobile')
      ) : (
        <div className="relative">
          {!mobileLoaded && (
            <div
              className={cn(
                'absolute inset-0 bg-neutral-100 animate-pulse rounded',
                sizeClasses.mobile
              )}
            />
          )}
          <img
            src={mobileUrl}
            alt={`Mobile screenshot of ${alt}`}
            className={cn(
              'object-cover object-top rounded border border-neutral-200',
              'group-hover:border-blue-400 group-hover:shadow-sm transition-all',
              sizeClasses.mobile,
              !mobileLoaded && 'opacity-0'
            )}
            onLoad={() => setMobileLoaded(true)}
            onError={() => setMobileError(true)}
          />
        </div>
      )}
    </div>
  );
}
```

### File: `apps/portal/components/screenshot/screenshot-lightbox.tsx` (NEW)

```tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, Monitor, Smartphone, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@tds/ui';
import { cn } from '@tds/ui';

interface ScreenshotLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  desktopUrl?: string;
  mobileUrl?: string;
  pageUrl: string;
  capturedAt?: Date;
}

export function ScreenshotLightbox({
  isOpen,
  onClose,
  desktopUrl,
  mobileUrl,
  pageUrl,
  capturedAt,
}: ScreenshotLightboxProps) {
  const [activeDevice, setActiveDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);

  const activeUrl = activeDevice === 'desktop' ? desktopUrl : mobileUrl;

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleDownload = useCallback(async () => {
    if (!activeUrl) return;

    try {
      const response = await fetch(activeUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screenshot-${activeDevice}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [activeUrl, activeDevice]);

  const handleCopyLink = useCallback(async () => {
    if (!activeUrl) return;

    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }, [activeUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[90vh] mx-4 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-neutral-50">
          <div className="flex items-center gap-4">
            {/* Device toggle */}
            <div className="flex rounded-lg border border-neutral-200 p-1 bg-white">
              <button
                onClick={() => setActiveDevice('desktop')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeDevice === 'desktop'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                )}
                disabled={!desktopUrl}
              >
                <Monitor className="h-4 w-4" />
                Desktop
              </button>
              <button
                onClick={() => setActiveDevice('mobile')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeDevice === 'mobile'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                )}
                disabled={!mobileUrl}
              >
                <Smartphone className="h-4 w-4" />
                Mobile
              </button>
            </div>

            {/* Page URL */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-neutral-600">
              <span className="font-mono truncate max-w-md">
                {pageUrl.replace(/^https?:\/\//, '')}
              </span>
              <a
                href={pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Screenshot container */}
        <div className="flex-1 overflow-auto p-4 bg-neutral-100">
          {activeUrl ? (
            <div className="flex justify-center">
              <img
                src={activeUrl}
                alt={`${activeDevice} screenshot of ${pageUrl}`}
                className={cn(
                  'max-w-full h-auto rounded-lg shadow-lg border border-neutral-200',
                  activeDevice === 'mobile' && 'max-w-sm'
                )}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-neutral-500">
              No screenshot available for this device
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-neutral-50">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!activeUrl}>
              <Download className="h-4 w-4 mr-2" />
              Download PNG
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink} disabled={!activeUrl}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          </div>

          {capturedAt && (
            <span className="text-sm text-neutral-500">
              Captured: {new Date(capturedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

### File: `apps/portal/components/screenshot/index.ts` (NEW)

```typescript
export { ScreenshotThumbnail } from './screenshot-thumbnail';
export { ScreenshotLightbox } from './screenshot-lightbox';
```

---

## Phase 7: Page Library Integration

### File: `apps/portal/app/tools/page-library/page.tsx`

**Step 1: Add imports at top of file:**

```typescript
import { ScreenshotThumbnail, ScreenshotLightbox } from '@/components/screenshot';
```

**Step 2: Add state for lightbox (after other useState declarations around line 45):**

```typescript
const [lightboxData, setLightboxData] = useState<{
  isOpen: boolean;
  desktopUrl?: string;
  mobileUrl?: string;
  pageUrl: string;
  capturedAt?: Date;
} | null>(null);
```

**Step 3: Add table column header for screenshots. Find the TableHeader section and add after the checkbox column:**

```tsx
<TableHead className="w-20">Preview</TableHead>
```

**Step 4: Add thumbnail to each table row. Find the TableRow mapping and add after the checkbox TableCell:**

```tsx
<TableCell>
  <ScreenshotThumbnail
    desktopUrl={entry.latestSnapshot?.screenshotDesktopUrl}
    mobileUrl={entry.latestSnapshot?.screenshotMobileUrl}
    alt={entry.url}
    size="sm"
    onClick={() => setLightboxData({
      isOpen: true,
      desktopUrl: entry.latestSnapshot?.screenshotDesktopUrl,
      mobileUrl: entry.latestSnapshot?.screenshotMobileUrl,
      pageUrl: entry.url,
      capturedAt: entry.latestSnapshot?.fetchedAt,
    })}
  />
</TableCell>
```

**Step 5: Add larger preview to expanded row section. Find the expanded row content area and add:**

```tsx
<div className="flex gap-4">
  <ScreenshotThumbnail
    desktopUrl={entry.latestSnapshot?.screenshotDesktopUrl}
    mobileUrl={entry.latestSnapshot?.screenshotMobileUrl}
    alt={entry.url}
    size="md"
    onClick={() => setLightboxData({
      isOpen: true,
      desktopUrl: entry.latestSnapshot?.screenshotDesktopUrl,
      mobileUrl: entry.latestSnapshot?.screenshotMobileUrl,
      pageUrl: entry.url,
      capturedAt: entry.latestSnapshot?.fetchedAt,
    })}
  />
  <div className="flex-1">
    {/* Existing snapshot history content */}
  </div>
</div>
```

**Step 6: Add lightbox component at end of JSX, before final closing tags:**

```tsx
{lightboxData && (
  <ScreenshotLightbox
    isOpen={lightboxData.isOpen}
    onClose={() => setLightboxData(null)}
    desktopUrl={lightboxData.desktopUrl}
    mobileUrl={lightboxData.mobileUrl}
    pageUrl={lightboxData.pageUrl}
    capturedAt={lightboxData.capturedAt}
  />
)}
```

---

## Phase 8: TypeScript Types Update

### File: `apps/portal/types/page-store.ts` (NEW or update existing)

```typescript
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
}

export interface PageStoreEntry {
  _id: string;
  url: string;
  urlHash: string;
  latestSnapshotId: string;
  latestSnapshot?: PageSnapshot;
  snapshotCount: number;
  clientsWithAccess: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Phase 9: Environment Configuration

### File: `apps/portal/lib/env.ts` (update or create)

Add validation for the new environment variable:

```typescript
export function validateEnv() {
  const required = [
    'MONGODB_URI',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'BLOB_READ_WRITE_TOKEN',
    'SCRAPINGBEE_API_KEY', // NEW
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

---

## Testing Checklist

### Unit Tests

1. [ ] `scrapingbee-service.ts` - Mock API responses, test error handling
2. [ ] `screenshot-thumbnail.tsx` - Render states (loading, error, success)
3. [ ] `screenshot-lightbox.tsx` - Device toggle, download, copy link

### Integration Tests

1. [ ] Fetch URL and verify screenshots saved to Vercel Blob
2. [ ] Page Library displays thumbnails correctly
3. [ ] Lightbox opens with correct screenshots
4. [ ] Credits tracking is accurate

### Manual Tests

1. [ ] Fetch a JavaScript-heavy page (e.g., React SPA)
2. [ ] Fetch a page with cookie consent popup
3. [ ] Verify both desktop and mobile screenshots are captured
4. [ ] Test lightbox on mobile viewport
5. [ ] Test download functionality
6. [ ] Verify error states display correctly

---

## Deployment Checklist

1. [ ] Add `SCRAPINGBEE_API_KEY` to Vercel environment variables
2. [ ] Deploy database model changes (no migration needed, fields are optional)
3. [ ] Deploy in order: database package → service → UI components
4. [ ] Monitor ScrapingBee dashboard for credit usage
5. [ ] Set up usage alerts in ScrapingBee (80% threshold)

---

## File Summary

### New Files

| Path | Description |
|------|-------------|
| `apps/portal/lib/services/scrapingbee-service.ts` | ScrapingBee API wrapper |
| `apps/portal/components/screenshot/screenshot-thumbnail.tsx` | Thumbnail component |
| `apps/portal/components/screenshot/screenshot-lightbox.tsx` | Full-view modal |
| `apps/portal/components/screenshot/index.ts` | Barrel export |
| `apps/portal/types/page-store.ts` | TypeScript interfaces |

### Modified Files

| Path | Changes |
|------|---------|
| `packages/database/src/models/page-snapshot.ts` | Add screenshot and metadata fields |
| `apps/portal/lib/services/page-store-service.ts` | Replace fetch with ScrapingBee |
| `apps/portal/lib/vercel-blob.ts` | Add uploadScreenshot function |
| `apps/portal/app/tools/page-library/page.tsx` | Add screenshot UI integration |
| `apps/portal/.env.example` | Add SCRAPINGBEE_API_KEY |

---

## Rollback Plan

If issues occur:

1. Set `renderMethod` check in `page-store-service.ts` to use old `fetch()` as fallback
2. Screenshots are optional fields - UI handles missing data gracefully
3. No data migration needed - old snapshots continue working

---

## Credits Budget

| Plan | Monthly Credits | Pages with Dual Screenshots |
|------|-----------------|----------------------------|
| Freelance ($49) | 150,000 | ~7,500 |
| Startup ($99) | 500,000 | ~25,000 |
| Business ($249) | 2,000,000 | ~100,000 |

**Cost per page:** 20 credits (10 desktop + 10 mobile with JS rendering)
