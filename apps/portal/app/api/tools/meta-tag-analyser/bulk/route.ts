import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { calculateScore, type CategoryScores } from '@/app/tools/meta-tag-analyser/lib/scoring';
import { getPage } from '@/lib/services/page-store-service';

export const dynamic = 'force-dynamic';

interface FilteredUrl {
  url: string;
  reason: 'nested_sitemap' | 'duplicate';
}

interface ParseSitemapResult {
  urls: string[];
  filteredUrls: FilteredUrl[];
}

interface MetaTagResult {
  url: string;
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  viewport?: string;
  charset?: string;
  language?: string;
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
    locale?: string;
    imageDetails?: {
      alt?: string;
      width?: number;
      height?: number;
    };
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
    creator?: string;
    imageAlt?: string;
  };
  structuredData?: {
    found: boolean;
    isValidJson: boolean;
    types: string[];
    validationErrors: string[];
  };
  mobile?: {
    manifest?: string;
  };
}

interface AnalysisIssue {
  type: 'error' | 'warning' | 'success';
  message: string;
  field: string;
}

// Decode HTML entities in scraped text
function decodeHtmlEntities(text: string): string {
  if (!text) return text;

  // Map of common named entities
  const namedEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&nbsp;': ' ',
    '&ndash;': '\u2013', // en dash
    '&mdash;': '\u2014', // em dash
    '&lsquo;': '\u2018', // left single quote
    '&rsquo;': '\u2019', // right single quote
    '&ldquo;': '\u201C', // left double quote
    '&rdquo;': '\u201D', // right double quote
    '&hellip;': '\u2026', // ellipsis
    '&copy;': '\u00A9', // copyright
    '&reg;': '\u00AE', // registered
    '&trade;': '\u2122', // trademark
  };

  // First, replace named entities
  let decoded = text;
  for (const [entity, char] of Object.entries(namedEntities)) {
    decoded = decoded.split(entity).join(char);
  }

  // Decode numeric entities (decimal: &#39; and hex: &#x27;)
  decoded = decoded.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  return decoded;
}

// Parse sitemap XML and extract URLs with filtered URL tracking
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
      'User-Agent': 'TDS Meta Tag Analyser/1.0',
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

interface AnalyzeOptions {
  clientId: string;
  userId: string;
}

// Analyze a single URL - uses Page Store as the SINGLE SOURCE OF TRUTH
async function analyzeUrl(
  url: string,
  options: AnalyzeOptions
): Promise<{ result: MetaTagResult; issues: AnalysisIssue[]; snapshotId: string }> {
  // Use page store service - the ONLY place pages should be fetched
  const pageResult = await getPage({
    url,
    clientId: options.clientId,
    userId: options.userId,
    toolId: 'meta-tag-analyser',
  });
  const html = pageResult.html;
  const snapshotId = pageResult.snapshot._id.toString();

  const getMetaContent = (name: string): string => {
    const nameMatch = html.match(
      new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i')
    ) || html.match(
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i')
    );
    if (nameMatch) return decodeHtmlEntities(nameMatch[1]);

    const propMatch = html.match(
      new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i')
    ) || html.match(
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${name}["']`, 'i')
    );
    return propMatch ? decodeHtmlEntities(propMatch[1]) : '';
  };

  const getTitle = (): string => {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '';
  };

  const getCanonical = (): string => {
    const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) ||
      html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
    return match ? match[1] : '';
  };

  const getCharset = (): string => {
    const charsetMatch = html.match(/<meta[^>]*charset=["']([^"']*)["']/i);
    if (charsetMatch) return charsetMatch[1];
    const httpEquivMatch = html.match(/<meta[^>]*http-equiv=["']Content-Type["'][^>]*content=["'][^"']*charset=([^"'\s;]+)/i);
    return httpEquivMatch ? httpEquivMatch[1] : '';
  };

  const getLanguage = (): string => {
    const match = html.match(/<html[^>]*lang=["']([^"']*)["']/i);
    return match ? match[1] : '';
  };

  const getManifest = (): string => {
    const match = html.match(/<link[^>]*rel=["']manifest["'][^>]*href=["']([^"']*)["']/i);
    return match ? match[1] : '';
  };

  // Extract structured data
  const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const structuredDataFound = scripts.length > 0;
  let structuredDataValid = true;
  const structuredDataTypes: string[] = [];
  const structuredDataErrors: string[] = [];
  scripts.forEach((script) => {
    const content = script.replace(/<script[^>]*>|<\/script>/gi, '').trim();
    try {
      const json = JSON.parse(content);
      if (json['@type']) structuredDataTypes.push(json['@type']);
    } catch (e) {
      structuredDataValid = false;
      structuredDataErrors.push(e instanceof Error ? e.message : 'Invalid JSON');
    }
  });

  const result: MetaTagResult = {
    url,
    title: getTitle(),
    description: getMetaContent('description'),
    canonical: getCanonical(),
    robots: getMetaContent('robots'),
    viewport: getMetaContent('viewport'),
    charset: getCharset(),
    language: getLanguage(),
    openGraph: {
      title: getMetaContent('og:title'),
      description: getMetaContent('og:description'),
      image: getMetaContent('og:image'),
      url: getMetaContent('og:url'),
      type: getMetaContent('og:type'),
      siteName: getMetaContent('og:site_name'),
      locale: getMetaContent('og:locale') || undefined,
      imageDetails: getMetaContent('og:image:alt') || getMetaContent('og:image:width') ? {
        alt: getMetaContent('og:image:alt') || undefined,
        width: getMetaContent('og:image:width') ? parseInt(getMetaContent('og:image:width'), 10) : undefined,
        height: getMetaContent('og:image:height') ? parseInt(getMetaContent('og:image:height'), 10) : undefined,
      } : undefined,
    },
    twitter: {
      card: getMetaContent('twitter:card'),
      title: getMetaContent('twitter:title'),
      description: getMetaContent('twitter:description'),
      image: getMetaContent('twitter:image'),
      site: getMetaContent('twitter:site'),
      creator: getMetaContent('twitter:creator') || undefined,
      imageAlt: getMetaContent('twitter:image:alt') || undefined,
    },
    structuredData: structuredDataFound ? {
      found: true,
      isValidJson: structuredDataValid,
      types: [...new Set(structuredDataTypes)],
      validationErrors: structuredDataErrors,
    } : undefined,
    mobile: getManifest() ? {
      manifest: getManifest(),
    } : undefined,
  };

  // Analyze for issues
  const issues: AnalysisIssue[] = [];

  if (!result.title) {
    issues.push({ type: 'error', field: 'Title', message: 'Missing title tag' });
  } else if (result.title.length > 60) {
    issues.push({ type: 'warning', field: 'Title', message: `Title too long (${result.title.length}/60)` });
  } else if (result.title.length < 30) {
    issues.push({ type: 'warning', field: 'Title', message: `Title too short (${result.title.length}/60)` });
  }

  if (!result.description) {
    issues.push({ type: 'error', field: 'Description', message: 'Missing meta description' });
  } else if (result.description.length > 160) {
    issues.push({ type: 'warning', field: 'Description', message: `Description too long (${result.description.length}/160)` });
  } else if (result.description.length < 70) {
    issues.push({ type: 'warning', field: 'Description', message: `Description too short (${result.description.length}/160)` });
  }

  if (!result.openGraph.title && !result.openGraph.description) {
    issues.push({ type: 'warning', field: 'Open Graph', message: 'Missing OG tags' });
  }

  if (!result.openGraph.image) {
    issues.push({ type: 'warning', field: 'OG Image', message: 'Missing OG image' });
  }

  return { result, issues, snapshotId };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mode, sitemapUrl, urls, clientId, parseOnly } = body;

    // clientId is REQUIRED - Page Store is the single source of truth
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    let urlsToAnalyze: string[] = [];
    let filteredUrlsInfo: FilteredUrl[] = [];

    if (mode === 'sitemap') {
      if (!sitemapUrl) {
        return NextResponse.json({ error: 'sitemapUrl is required' }, { status: 400 });
      }

      try {
        const parseResult = await parseSitemap(sitemapUrl);
        urlsToAnalyze = parseResult.urls;
        filteredUrlsInfo = parseResult.filteredUrls;
      } catch (error) {
        return NextResponse.json(
          { error: `Failed to parse sitemap: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 400 }
        );
      }
    } else if (mode === 'urls') {
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json({ error: 'urls array is required' }, { status: 400 });
      }
      urlsToAnalyze = urls.map((u: string) => u.startsWith('http') ? u : `https://${u}`);
    } else {
      return NextResponse.json({ error: 'Invalid mode. Use "sitemap" or "urls"' }, { status: 400 });
    }

    // If parseOnly mode, return URLs without analyzing
    // This allows frontend to queue ALL URLs for consistent progress tracking
    if (parseOnly) {
      const filteredSummary = {
        nestedSitemaps: filteredUrlsInfo.filter(f => f.reason === 'nested_sitemap').length,
        duplicates: filteredUrlsInfo.filter(f => f.reason === 'duplicate').length,
        total: filteredUrlsInfo.length,
      };

      return NextResponse.json({
        urls: urlsToAnalyze,
        totalUrls: urlsToAnalyze.length,
        filteredUrls: filteredSummary,
      });
    }

    // Prepare options for analyzeUrl
    const analyzeOptions: AnalyzeOptions = {
      clientId,
      userId: session.user.id,
    };

    // Store all URLs before limiting
    const allDiscoveredUrls = [...urlsToAnalyze];

    // Limit to prevent abuse
    const maxUrls = 50;
    if (urlsToAnalyze.length > maxUrls) {
      urlsToAnalyze = urlsToAnalyze.slice(0, maxUrls);
    }

    // Analyze all URLs with rate limiting
    const results: Array<{
      url: string;
      result?: MetaTagResult;
      issues?: AnalysisIssue[];
      error?: string;
      score: number;
      categoryScores?: CategoryScores;
      snapshotId?: string;  // Will be present on success, absent on error
    }> = [];

    for (const url of urlsToAnalyze) {
      try {
        const { result, issues, snapshotId } = await analyzeUrl(url, analyzeOptions);
        // Use new severity-based scoring algorithm
        // Note: This bulk route doesn't perform image validation for performance,
        // so images are scored based on URL presence only
        const { score, categoryScores } = calculateScore(result, issues);

        results.push({ url, result, issues, score, categoryScores, snapshotId });

        // Small delay to be respectful to servers
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        results.push({
          url,
          error: error instanceof Error ? error.message : 'Failed to analyze',
          score: 0,
        });
      }
    }

    // Calculate overall stats
    const successful = results.filter(r => !r.error);
    const avgScore = successful.length > 0
      ? Math.round(successful.reduce((sum, r) => sum + r.score, 0) / successful.length)
      : 0;

    // Get remaining URLs that weren't scanned
    const remainingUrls = allDiscoveredUrls.slice(maxUrls);

    // Summarize filtered URLs by reason
    const filteredSummary = {
      nestedSitemaps: filteredUrlsInfo.filter(f => f.reason === 'nested_sitemap').length,
      duplicates: filteredUrlsInfo.filter(f => f.reason === 'duplicate').length,
      total: filteredUrlsInfo.length,
    };

    return NextResponse.json({
      totalUrls: allDiscoveredUrls.length,
      scannedUrls: urlsToAnalyze.length,
      analyzed: successful.length,
      failed: results.filter(r => r.error).length,
      averageScore: avgScore,
      results,
      remainingUrls,
      hasMoreUrls: remainingUrls.length > 0,
      filteredUrls: filteredSummary,
    });
  } catch (error) {
    console.error('Bulk analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk analysis' },
      { status: 500 }
    );
  }
}
