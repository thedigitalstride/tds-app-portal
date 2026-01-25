import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface FilteredUrl {
  url: string;
  reason: 'nested_sitemap' | 'duplicate';
}

interface ParseSitemapResult {
  urls: string[];
  filteredUrls: FilteredUrl[];
}

/**
 * Parse sitemap XML and extract URLs with filtered URL tracking.
 * Handles nested sitemaps recursively (up to 3 levels deep).
 */
async function parseSitemap(
  sitemapUrl: string,
  seenUrls: Set<string> = new Set(),
  filteredUrls: FilteredUrl[] = [],
  depth: number = 0
): Promise<ParseSitemapResult> {
  // Prevent infinite recursion
  if (depth > 3) {
    return { urls: [], filteredUrls };
  }

  const response = await fetch(sitemapUrl, {
    headers: {
      'User-Agent': 'TDS Sitemap Parser/1.0',
      'Accept': 'application/xml, text/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap: ${response.status}`);
  }

  const xml = await response.text();
  const urls: string[] = [];
  const nestedSitemapUrls: string[] = [];

  // Extract URLs from <loc> tags
  const locRegex = /<loc>([^<]+)<\/loc>/gi;
  let match;

  while ((match = locRegex.exec(xml)) !== null) {
    const url = match[1].trim();

    // Check for nested sitemaps (XML files)
    if (url.endsWith('.xml')) {
      // Track as filtered URL and collect for recursive fetch
      filteredUrls.push({ url, reason: 'nested_sitemap' });
      nestedSitemapUrls.push(url);
      continue;
    }

    // Check for duplicates
    if (seenUrls.has(url)) {
      filteredUrls.push({ url, reason: 'duplicate' });
      continue;
    }

    // Add to seen set and URLs list
    seenUrls.add(url);
    urls.push(url);
  }

  // Recursively fetch nested sitemaps (limit to 5 per level)
  for (const nestedSitemapUrl of nestedSitemapUrls.slice(0, 5)) {
    try {
      const nestedResult = await parseSitemap(nestedSitemapUrl, seenUrls, filteredUrls, depth + 1);
      urls.push(...nestedResult.urls);
    } catch {
      // Skip failed nested sitemaps
    }
  }

  return { urls, filteredUrls };
}

/**
 * POST /api/sitemap/parse
 *
 * Parse a sitemap URL and return all discovered page URLs.
 * Handles nested sitemaps recursively and deduplicates URLs.
 *
 * Request body:
 * - sitemapUrl: string - The URL of the sitemap to parse
 *
 * Response:
 * - urls: string[] - Unique page URLs found in the sitemap
 * - totalUrls: number - Total count of unique URLs
 * - filteredUrls: { nestedSitemaps: number, duplicates: number, total: number }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sitemapUrl } = body;

    if (!sitemapUrl) {
      return NextResponse.json({ error: 'sitemapUrl is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(sitemapUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid sitemap URL format' }, { status: 400 });
    }

    const parseResult = await parseSitemap(sitemapUrl);

    const filteredSummary = {
      nestedSitemaps: parseResult.filteredUrls.filter(f => f.reason === 'nested_sitemap').length,
      duplicates: parseResult.filteredUrls.filter(f => f.reason === 'duplicate').length,
      total: parseResult.filteredUrls.length,
    };

    return NextResponse.json({
      urls: parseResult.urls,
      totalUrls: parseResult.urls.length,
      filteredUrls: filteredSummary,
    });
  } catch (error) {
    console.error('Sitemap parse error:', error);
    return NextResponse.json(
      { error: `Failed to parse sitemap: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 400 }
    );
  }
}
