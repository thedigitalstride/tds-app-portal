import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface HreflangEntry {
  lang: string;
  url: string;
}

interface MetaTagResult {
  url: string;
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  // Additional meta tags
  viewport?: string;
  charset?: string;
  author?: string;
  themeColor?: string;
  language?: string;
  favicon?: string;
  hreflang?: HreflangEntry[];
  // Social tags
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
  other: Array<{ name: string; content: string }>;
}

interface AnalysisIssue {
  type: 'error' | 'warning' | 'success';
  message: string;
  field: string;
}

function analyzeMetaTags(result: MetaTagResult): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  // Title analysis
  if (!result.title) {
    issues.push({
      type: 'error',
      field: 'Title',
      message: 'Page title is missing. This is critical for SEO.',
    });
  } else if (result.title.length < 30) {
    issues.push({
      type: 'warning',
      field: 'Title',
      message: `Title is too short (${result.title.length} chars). Aim for 50-60 characters.`,
    });
  } else if (result.title.length > 60) {
    issues.push({
      type: 'warning',
      field: 'Title',
      message: `Title is too long (${result.title.length} chars). It may be truncated in search results.`,
    });
  } else {
    issues.push({
      type: 'success',
      field: 'Title',
      message: `Title length is optimal (${result.title.length} chars).`,
    });
  }

  // Description analysis
  if (!result.description) {
    issues.push({
      type: 'error',
      field: 'Description',
      message: 'Meta description is missing. This is important for SEO and click-through rates.',
    });
  } else if (result.description.length < 70) {
    issues.push({
      type: 'warning',
      field: 'Description',
      message: `Description is too short (${result.description.length} chars). Aim for 120-160 characters.`,
    });
  } else if (result.description.length > 160) {
    issues.push({
      type: 'warning',
      field: 'Description',
      message: `Description is too long (${result.description.length} chars). It may be truncated in search results.`,
    });
  } else {
    issues.push({
      type: 'success',
      field: 'Description',
      message: `Description length is optimal (${result.description.length} chars).`,
    });
  }

  // Canonical URL
  if (!result.canonical) {
    issues.push({
      type: 'warning',
      field: 'Canonical',
      message: 'No canonical URL specified. Consider adding one to prevent duplicate content issues.',
    });
  }

  // Open Graph
  if (!result.openGraph.title && !result.openGraph.description) {
    issues.push({
      type: 'warning',
      field: 'Open Graph',
      message: 'Open Graph tags are missing. Social sharing previews may not display correctly.',
    });
  }

  if (!result.openGraph.image) {
    issues.push({
      type: 'warning',
      field: 'OG Image',
      message: 'No Open Graph image specified. Social shares will lack a preview image.',
    });
  }

  // Twitter Cards
  if (!result.twitter.card) {
    issues.push({
      type: 'warning',
      field: 'Twitter Card',
      message: 'No Twitter card type specified. Twitter/X previews may not display correctly.',
    });
  }

  // Viewport (critical for mobile)
  if (!result.viewport) {
    issues.push({
      type: 'error',
      field: 'Viewport',
      message: 'No viewport meta tag. Page may not display correctly on mobile devices.',
    });
  } else if (!result.viewport.includes('width=device-width')) {
    issues.push({
      type: 'warning',
      field: 'Viewport',
      message: 'Viewport should include "width=device-width" for proper mobile scaling.',
    });
  } else {
    issues.push({
      type: 'success',
      field: 'Viewport',
      message: 'Viewport is configured for mobile devices.',
    });
  }

  // Charset
  if (!result.charset) {
    issues.push({
      type: 'warning',
      field: 'Charset',
      message: 'No character encoding specified. Consider adding <meta charset="UTF-8">.',
    });
  }

  // Language
  if (!result.language) {
    issues.push({
      type: 'warning',
      field: 'Language',
      message: 'No language attribute on <html> tag. This helps search engines and accessibility.',
    });
  }

  return issues;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

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

    // Parse meta tags using regex (works without jsdom)
    const getMetaContent = (name: string): string => {
      // Try name attribute
      const nameMatch = html.match(
        new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i')
      ) || html.match(
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i')
      );
      if (nameMatch) return nameMatch[1];

      // Try property attribute (for OG tags)
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

    const getCharset = (): string => {
      // Try <meta charset="...">
      const charsetMatch = html.match(/<meta[^>]*charset=["']([^"']*)["']/i);
      if (charsetMatch) return charsetMatch[1];

      // Try <meta http-equiv="Content-Type" content="...;charset=...">
      const httpEquivMatch = html.match(/<meta[^>]*http-equiv=["']Content-Type["'][^>]*content=["'][^"']*charset=([^"'\s;]+)/i);
      return httpEquivMatch ? httpEquivMatch[1] : '';
    };

    const getLanguage = (): string => {
      const match = html.match(/<html[^>]*lang=["']([^"']*)["']/i);
      return match ? match[1] : '';
    };

    const getFavicon = (): string => {
      // Try various favicon link types
      const iconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']*)["']/i) ||
        html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i);
      return iconMatch ? iconMatch[1] : '';
    };

    const getHreflang = (): HreflangEntry[] => {
      const entries: HreflangEntry[] = [];
      const hreflangRegex = /<link[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']*)["'][^>]*href=["']([^"']*)["']/gi;
      const hreflangRegex2 = /<link[^>]*hreflang=["']([^"']*)["'][^>]*rel=["']alternate["'][^>]*href=["']([^"']*)["']/gi;
      const hreflangRegex3 = /<link[^>]*href=["']([^"']*)["'][^>]*hreflang=["']([^"']*)["'][^>]*rel=["']alternate["']/gi;

      let match;
      while ((match = hreflangRegex.exec(html)) !== null) {
        entries.push({ lang: match[1], url: match[2] });
      }
      while ((match = hreflangRegex2.exec(html)) !== null) {
        entries.push({ lang: match[1], url: match[2] });
      }
      while ((match = hreflangRegex3.exec(html)) !== null) {
        entries.push({ lang: match[2], url: match[1] });
      }

      // Deduplicate
      const seen = new Set<string>();
      return entries.filter(e => {
        const key = `${e.lang}:${e.url}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    // Extract other meta tags
    const otherMetas: Array<{ name: string; content: string }> = [];
    const metaRegex = /<meta[^>]*name=["']([^"']*)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
    let match;
    const knownMetas = ['description', 'robots', 'viewport', 'author', 'keywords'];

    while ((match = metaRegex.exec(html)) !== null) {
      const name = match[1].toLowerCase();
      if (!knownMetas.includes(name) && !name.startsWith('og:') && !name.startsWith('twitter:')) {
        otherMetas.push({ name: match[1], content: match[2] });
      }
    }

    const hreflangEntries = getHreflang();

    const result: MetaTagResult = {
      url: validUrl.toString(),
      title: getTitle(),
      description: getMetaContent('description'),
      canonical: getCanonical(),
      robots: getMetaContent('robots'),
      // Additional meta tags
      viewport: getMetaContent('viewport'),
      charset: getCharset(),
      author: getMetaContent('author'),
      themeColor: getMetaContent('theme-color'),
      language: getLanguage(),
      favicon: getFavicon(),
      hreflang: hreflangEntries.length > 0 ? hreflangEntries : undefined,
      // Social tags
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
      other: otherMetas.slice(0, 20), // Limit to 20 other tags
    };

    const issues = analyzeMetaTags(result);

    return NextResponse.json({ result, issues });
  } catch (error) {
    console.error('Meta tag analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze URL. Please check the URL and try again.' },
      { status: 500 }
    );
  }
}
