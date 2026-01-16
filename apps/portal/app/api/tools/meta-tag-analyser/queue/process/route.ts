import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, PendingScan, MetaTagAnalysis } from '@tds/database';

export const dynamic = 'force-dynamic';

interface MetaTagResult {
  url: string;
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  viewport?: string;
  charset?: string;
  author?: string;
  themeColor?: string;
  language?: string;
  favicon?: string;
  hreflang?: Array<{ lang: string; url: string }>;
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

  const namedEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&nbsp;': ' ',
    '&ndash;': '\u2013',
    '&mdash;': '\u2014',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&ldquo;': '\u201C',
    '&rdquo;': '\u201D',
    '&hellip;': '\u2026',
    '&copy;': '\u00A9',
    '&reg;': '\u00AE',
    '&trade;': '\u2122',
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(namedEntities)) {
    decoded = decoded.split(entity).join(char);
  }

  decoded = decoded.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  return decoded;
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

  const result: MetaTagResult = {
    url,
    title: getTitle(),
    description: getMetaContent('description'),
    canonical: getCanonical(),
    robots: getMetaContent('robots'),
    viewport: getMetaContent('viewport'),
    charset: getMetaContent('charset'),
    author: getMetaContent('author'),
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

// Calculate score from issues
function calculateScore(issues: AnalysisIssue[]): number {
  const errorCount = issues?.filter(i => i.type === 'error').length || 0;
  const warningCount = issues?.filter(i => i.type === 'warning').length || 0;
  return Math.max(0, 100 - (errorCount * 20) - (warningCount * 10));
}

// Upsert analysis result
async function upsertAnalysis(
  clientId: string,
  result: MetaTagResult,
  issues: AnalysisIssue[],
  userId: string
): Promise<{ isUpdate: boolean }> {
  const now = new Date();
  const score = calculateScore(issues);

  const existingAnalysis = await MetaTagAnalysis.findOne({
    clientId,
    url: result.url,
  });

  if (existingAnalysis) {
    const changesDetected =
      existingAnalysis.title !== result.title ||
      existingAnalysis.description !== result.description ||
      existingAnalysis.canonical !== result.canonical ||
      existingAnalysis.openGraph?.image !== result.openGraph?.image;

    const historyEntry = {
      scannedAt: now,
      scannedBy: userId,
      score: existingAnalysis.score,
      changesDetected,
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
      previousTitle: existingAnalysis.title,
      previousDescription: existingAnalysis.description,
    };

    await MetaTagAnalysis.findByIdAndUpdate(
      existingAnalysis._id,
      {
        $set: {
          title: result.title || '',
          description: result.description || '',
          canonical: result.canonical,
          robots: result.robots,
          viewport: result.viewport,
          charset: result.charset,
          author: result.author,
          openGraph: result.openGraph,
          twitter: result.twitter,
          issues,
          score,
          lastScannedAt: now,
          lastScannedBy: userId,
        },
        $push: {
          scanHistory: {
            $each: [historyEntry],
            $slice: -50,
          },
        },
        $inc: { scanCount: 1 },
      },
      { new: true }
    );

    return { isUpdate: true };
  }

  await MetaTagAnalysis.create({
    clientId,
    url: result.url,
    title: result.title || '',
    description: result.description || '',
    canonical: result.canonical,
    robots: result.robots,
    viewport: result.viewport,
    charset: result.charset,
    author: result.author,
    openGraph: result.openGraph,
    twitter: result.twitter,
    issues,
    score,
    analyzedBy: userId,
    analyzedAt: now,
    scanCount: 1,
    lastScannedAt: now,
    lastScannedBy: userId,
    scanHistory: [],
  });

  return { isUpdate: false };
}

const MAX_RETRIES = 3;
const BATCH_SIZE = 10;

// POST - Process pending URLs in the queue
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    await connectDB();

    // Get pending URLs for this client
    const pendingUrls = await PendingScan.find({
      clientId,
      status: { $in: ['pending', 'failed'] },
      retryCount: { $lt: MAX_RETRIES },
    })
      .sort({ submittedAt: 1 })
      .limit(BATCH_SIZE);

    if (pendingUrls.length === 0) {
      // Get counts for response
      const remaining = await PendingScan.countDocuments({
        clientId,
        status: { $in: ['pending', 'failed'] },
        retryCount: { $lt: MAX_RETRIES },
      });

      return NextResponse.json({
        processed: 0,
        remaining,
        completed: [],
        failed: [],
      });
    }

    // Mark as processing
    const urlIds = pendingUrls.map(u => u._id);
    await PendingScan.updateMany(
      { _id: { $in: urlIds } },
      { $set: { status: 'processing' } }
    );

    const completed: { url: string; score: number }[] = [];
    const failed: { url: string; error: string }[] = [];

    for (const pendingUrl of pendingUrls) {
      try {
        const { result, issues } = await analyzeUrl(pendingUrl.url);
        const score = calculateScore(issues);

        // Auto-save to MetaTagAnalysis
        await upsertAnalysis(clientId, result, issues, session.user.id);

        // Mark as completed
        await PendingScan.findByIdAndUpdate(pendingUrl._id, {
          $set: {
            status: 'completed',
            processedAt: new Date(),
          },
        });

        completed.push({ url: pendingUrl.url, score });

        // Small delay to be respectful to servers
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to analyze';
        const newRetryCount = pendingUrl.retryCount + 1;

        // Mark as failed with retry count
        await PendingScan.findByIdAndUpdate(pendingUrl._id, {
          $set: {
            status: newRetryCount >= MAX_RETRIES ? 'failed' : 'pending',
            error: errorMessage,
            processedAt: new Date(),
          },
          $inc: { retryCount: 1 },
        });

        failed.push({ url: pendingUrl.url, error: errorMessage });
      }
    }

    // Get remaining count
    const remaining = await PendingScan.countDocuments({
      clientId,
      status: { $in: ['pending', 'failed'] },
      retryCount: { $lt: MAX_RETRIES },
    });

    return NextResponse.json({
      processed: completed.length + failed.length,
      remaining,
      completed,
      failed,
    });
  } catch (error) {
    console.error('Process queue error:', error);
    return NextResponse.json(
      { error: 'Failed to process queue' },
      { status: 500 }
    );
  }
}
