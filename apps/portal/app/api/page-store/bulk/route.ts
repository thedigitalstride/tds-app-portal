import { NextRequest, NextResponse } from 'next/server';
import {
  requireClientAccess,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/permissions';
import { getPage } from '@/lib/services/page-store-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow longer timeout for bulk operations

interface ArchiveResult {
  url: string;
  success: boolean;
  error?: string;
  wasCached?: boolean;
}

/**
 * Parse a sitemap XML and extract URLs.
 */
async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  const response = await fetch(sitemapUrl, {
    headers: {
      'User-Agent': 'TDS Page Store/1.0',
      'Accept': 'application/xml, text/xml, */*',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap: ${response.status}`);
  }

  const xml = await response.text();
  const urls: string[] = [];

  // Extract <loc> URLs from sitemap
  const locMatches = xml.matchAll(/<loc>(.*?)<\/loc>/gi);
  for (const match of locMatches) {
    const url = match[1].trim();
    // Check if it's a nested sitemap
    if (url.endsWith('.xml') || url.includes('sitemap')) {
      // Recursively parse nested sitemaps
      try {
        const nestedUrls = await parseSitemap(url);
        urls.push(...nestedUrls);
      } catch (err) {
        console.warn(`Failed to parse nested sitemap ${url}:`, err);
      }
    } else {
      urls.push(url);
    }
  }

  return [...new Set(urls)]; // Remove duplicates
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const session = await requireClientAccess(clientId);
    const userId = session.user.id;

    let urlsToArchive: string[] = [];

    if (mode === 'sitemap') {
      const { sitemapUrl } = body;
      if (!sitemapUrl) {
        return NextResponse.json({ error: 'sitemapUrl is required' }, { status: 400 });
      }

      urlsToArchive = await parseSitemap(sitemapUrl);

      if (urlsToArchive.length === 0) {
        return NextResponse.json({ error: 'No URLs found in sitemap' }, { status: 400 });
      }
    } else if (mode === 'urls') {
      const { urls } = body;
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json({ error: 'urls array is required' }, { status: 400 });
      }
      urlsToArchive = urls;
    } else {
      return NextResponse.json({ error: 'Invalid mode. Use "sitemap" or "urls"' }, { status: 400 });
    }

    // Limit to 100 URLs per request to prevent timeout
    const maxUrls = 100;
    const limitedUrls = urlsToArchive.slice(0, maxUrls);

    const results: ArchiveResult[] = [];
    let succeeded = 0;
    let failed = 0;

    // Process URLs sequentially to avoid overwhelming the server
    for (const url of limitedUrls) {
      try {
        const result = await getPage({
          url,
          clientId,
          userId,
          toolId: 'page-library',
        });

        results.push({
          url,
          success: true,
          wasCached: result.wasCached,
        });
        succeeded++;
      } catch (error) {
        results.push({
          url,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    return NextResponse.json({
      total: urlsToArchive.length,
      processed: limitedUrls.length,
      succeeded,
      failed,
      results,
      hasMore: urlsToArchive.length > maxUrls,
      remainingCount: Math.max(0, urlsToArchive.length - maxUrls),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Bulk archive error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to archive URLs' },
      { status: 500 }
    );
  }
}
