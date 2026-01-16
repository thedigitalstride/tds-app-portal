import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB, MetaTagAnalysis } from '@tds/database';

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

// POST - Rescan a saved analysis
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
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
      url: existingAnalysis.url,
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
