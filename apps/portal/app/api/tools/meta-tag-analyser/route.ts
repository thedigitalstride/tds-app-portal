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

    const result: MetaTagResult = {
      url: validUrl.toString(),
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
