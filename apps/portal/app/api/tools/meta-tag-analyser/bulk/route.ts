import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface MetaTagResult {
  url: string;
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
  };
}

interface AnalysisIssue {
  type: 'error' | 'warning' | 'success';
  message: string;
  field: string;
}

// Parse sitemap XML and extract URLs
async function parseSitemap(sitemapUrl: string): Promise<string[]> {
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

  // Extract URLs from <loc> tags
  const locRegex = /<loc>([^<]+)<\/loc>/gi;
  let match;

  while ((match = locRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    // Skip XML files entirely - they're either nested sitemaps or non-webpage files
    // Nested sitemaps are handled separately below
    if (url.endsWith('.xml')) {
      continue;
    }
    // Add all non-XML URLs as pages to analyse
    urls.push(url);
  }

  // If we found sitemap index entries, try to fetch them
  const sitemapUrls = Array.from(xml.matchAll(/<loc>([^<]*sitemap[^<]*\.xml)<\/loc>/gi))
    .map(m => m[1].trim());

  for (const nestedSitemapUrl of sitemapUrls.slice(0, 5)) { // Limit nested sitemaps
    try {
      const nestedUrls = await parseSitemap(nestedSitemapUrl);
      urls.push(...nestedUrls);
    } catch {
      // Skip failed nested sitemaps
    }
  }

  return [...new Set(urls)]; // Remove duplicates
}

// Analyze a single URL
async function analyzeUrl(url: string): Promise<{ result: MetaTagResult; issues: AnalysisIssue[] }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'TDS Meta Tag Analyser/1.0',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const html = await response.text();

  const getMetaContent = (name: string): string => {
    const nameMatch = html.match(
      new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i')
    ) || html.match(
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i')
    );
    if (nameMatch) return nameMatch[1];

    const propMatch = html.match(
      new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i')
    ) || html.match(
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${name}["']`, 'i')
    );
    return propMatch ? propMatch[1] : '';
  };

  const getTitle = (): string => {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : '';
  };

  const getCanonical = (): string => {
    const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) ||
      html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
    return match ? match[1] : '';
  };

  const result: MetaTagResult = {
    url,
    title: getTitle(),
    description: getMetaContent('description'),
    canonical: getCanonical(),
    robots: getMetaContent('robots'),
    openGraph: {
      title: getMetaContent('og:title'),
      description: getMetaContent('og:description'),
      image: getMetaContent('og:image'),
      url: getMetaContent('og:url'),
      type: getMetaContent('og:type'),
      siteName: getMetaContent('og:site_name'),
    },
    twitter: {
      card: getMetaContent('twitter:card'),
      title: getMetaContent('twitter:title'),
      description: getMetaContent('twitter:description'),
      image: getMetaContent('twitter:image'),
      site: getMetaContent('twitter:site'),
    },
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

  return { result, issues };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mode, sitemapUrl, urls } = body;

    let urlsToAnalyze: string[] = [];

    if (mode === 'sitemap') {
      if (!sitemapUrl) {
        return NextResponse.json({ error: 'sitemapUrl is required' }, { status: 400 });
      }

      try {
        urlsToAnalyze = await parseSitemap(sitemapUrl);
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
    }> = [];

    for (const url of urlsToAnalyze) {
      try {
        const { result, issues } = await analyzeUrl(url);
        const errorCount = issues.filter(i => i.type === 'error').length;
        const warningCount = issues.filter(i => i.type === 'warning').length;
        const score = Math.max(0, 100 - (errorCount * 20) - (warningCount * 10));

        results.push({ url, result, issues, score });

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

    return NextResponse.json({
      totalUrls: urlsToAnalyze.length,
      analyzed: successful.length,
      failed: results.filter(r => r.error).length,
      averageScore: avgScore,
      results,
    });
  } catch (error) {
    console.error('Bulk analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk analysis' },
      { status: 500 }
    );
  }
}
