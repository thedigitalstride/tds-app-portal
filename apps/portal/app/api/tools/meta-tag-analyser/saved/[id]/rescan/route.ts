import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, MetaTagAnalysis } from '@tds/database';

export const dynamic = 'force-dynamic';

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

// POST - Rescan a saved analysis
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    // Find the existing analysis
    const existingAnalysis = await MetaTagAnalysis.findById(id);
    if (!existingAnalysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Store previous values for history
    const previousTitle = existingAnalysis.title;
    const previousDescription = existingAnalysis.description;
    const previousScore = existingAnalysis.score;

    // Fetch the page again
    const response = await fetch(existingAnalysis.url, {
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

    // Parse meta tags using regex
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

    const getFavicon = (): string => {
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

    const hreflangEntries = getHreflang();

    const result: MetaTagResult = {
      url: existingAnalysis.url,
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
    };

    const issues = analyzeMetaTags(result);

    // Calculate new score
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;
    const newScore = Math.max(0, 100 - (errorCount * 20) - (warningCount * 10));

    // Detect if changes were made
    const changesDetected =
      previousTitle !== result.title ||
      previousDescription !== result.description ||
      existingAnalysis.canonical !== result.canonical ||
      existingAnalysis.openGraph?.image !== result.openGraph?.image;

    // Add to scan history with full snapshot
    const historyEntry = {
      scannedAt: new Date(),
      scannedBy: session.user.id,
      score: previousScore,
      changesDetected,
      // Full snapshot of all fields at this point in time
      snapshot: {
        title: existingAnalysis.title || '',
        description: existingAnalysis.description || '',
        canonical: existingAnalysis.canonical,
        robots: existingAnalysis.robots,
        viewport: existingAnalysis.viewport,
        charset: existingAnalysis.charset,
        author: existingAnalysis.author,
        themeColor: existingAnalysis.themeColor,
        language: existingAnalysis.language,
        favicon: existingAnalysis.favicon,
        hreflang: existingAnalysis.hreflang,
        openGraph: existingAnalysis.openGraph ? {
          title: existingAnalysis.openGraph.title,
          description: existingAnalysis.openGraph.description,
          image: existingAnalysis.openGraph.image,
          url: existingAnalysis.openGraph.url,
          type: existingAnalysis.openGraph.type,
          siteName: existingAnalysis.openGraph.siteName,
        } : undefined,
        twitter: existingAnalysis.twitter ? {
          card: existingAnalysis.twitter.card,
          title: existingAnalysis.twitter.title,
          description: existingAnalysis.twitter.description,
          image: existingAnalysis.twitter.image,
          site: existingAnalysis.twitter.site,
        } : undefined,
        issues: existingAnalysis.issues || [],
      },
      // Legacy fields for backwards compatibility
      previousTitle,
      previousDescription,
    };

    // Update the analysis with new data
    const updatedAnalysis = await MetaTagAnalysis.findByIdAndUpdate(
      id,
      {
        $set: {
          title: result.title,
          description: result.description,
          canonical: result.canonical,
          robots: result.robots,
          viewport: result.viewport,
          charset: result.charset,
          author: result.author,
          themeColor: result.themeColor,
          language: result.language,
          favicon: result.favicon,
          hreflang: result.hreflang,
          openGraph: result.openGraph,
          twitter: result.twitter,
          issues,
          score: newScore,
          lastScannedAt: new Date(),
          lastScannedBy: session.user.id,
        },
        $push: {
          scanHistory: {
            $each: [historyEntry],
            $slice: -50, // Keep last 50 scans
          },
        },
        $inc: { scanCount: 1 },
      },
      { new: true }
    ).populate('lastScannedBy', 'name email');

    return NextResponse.json({
      analysis: updatedAnalysis,
      changesDetected,
      previousTitle,
      previousDescription,
      previousScore,
    });
  } catch (error) {
    console.error('Rescan error:', error);
    return NextResponse.json(
      { error: 'Failed to rescan URL' },
      { status: 500 }
    );
  }
}
