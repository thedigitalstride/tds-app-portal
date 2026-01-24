import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, ScanBatch, MetaTagAnalysis, ISucceededUrl, IFailedUrl, ISkippedUrl } from '@tds/database';
import { calculateScore } from '@/app/tools/meta-tag-analyser/lib/scoring';
import { getPage } from '@/lib/services/page-store-service';

export const dynamic = 'force-dynamic';

// Number of URLs to process per poll request
const URLS_PER_BATCH = 5;

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
    imageDetails?: {
      alt?: string;
      width?: number;
      height?: number;
    };
    locale?: string;
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

// Analyze a single URL and save to library
async function analyzeAndSaveUrl(
  url: string,
  clientId: string,
  userId: string
): Promise<{ success: boolean; score?: number; analysisId?: string; error?: string }> {
  try {
    // Get HTML from Page Store
    const pageResult = await getPage({
      url,
      clientId,
      userId,
      toolId: 'meta-tag-analyser',
    });
    const html = pageResult.html;
    const snapshotId = pageResult.snapshot._id.toString();

    // Parse meta tags
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

    // Calculate score
    const { score, categoryScores } = calculateScore(result, issues);
    const now = new Date();

    // Check if URL already exists for this client
    const existingAnalysis = await MetaTagAnalysis.findOne({
      clientId,
      url: result.url,
    });

    let analysisId: string;

    if (existingAnalysis) {
      // Update existing record
      const changesDetected =
        existingAnalysis.title !== result.title ||
        existingAnalysis.description !== result.description;

      const historyEntry = {
        scannedAt: now,
        scannedBy: userId,
        score: existingAnalysis.score,
        categoryScores: existingAnalysis.categoryScores,
        changesDetected,
        pageSnapshotId: existingAnalysis.analyzedSnapshotId,
        snapshot: {
          title: existingAnalysis.title || '',
          description: existingAnalysis.description || '',
          canonical: existingAnalysis.canonical,
          robots: existingAnalysis.robots,
          viewport: existingAnalysis.viewport,
          charset: existingAnalysis.charset,
          language: existingAnalysis.language,
          openGraph: existingAnalysis.openGraph,
          twitter: existingAnalysis.twitter,
          structuredData: existingAnalysis.structuredData,
          mobile: existingAnalysis.mobile,
          issues: existingAnalysis.issues,
        },
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
            language: result.language,
            openGraph: result.openGraph,
            twitter: result.twitter,
            structuredData: result.structuredData,
            mobile: result.mobile,
            issues,
            score,
            categoryScores,
            lastScannedAt: now,
            lastScannedBy: userId,
            analyzedSnapshotId: snapshotId,
            currentSnapshotId: snapshotId,
          },
          $push: {
            scanHistory: {
              $each: [historyEntry],
              $slice: -50,
            },
          },
          $inc: { scanCount: 1 },
        }
      );

      analysisId = existingAnalysis._id.toString();
    } else {
      // Create new record
      const newAnalysis = await MetaTagAnalysis.create({
        clientId,
        url: result.url,
        title: result.title || '',
        description: result.description || '',
        canonical: result.canonical,
        robots: result.robots,
        viewport: result.viewport,
        charset: result.charset,
        language: result.language,
        openGraph: result.openGraph,
        twitter: result.twitter,
        structuredData: result.structuredData,
        mobile: result.mobile,
        issues,
        score,
        categoryScores,
        analyzedBy: userId,
        analyzedAt: now,
        scanCount: 1,
        lastScannedAt: now,
        lastScannedBy: userId,
        analyzedSnapshotId: snapshotId,
        currentSnapshotId: snapshotId,
        scanHistory: [],
      });

      analysisId = newAnalysis._id.toString();
    }

    return { success: true, score, analysisId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze',
    };
  }
}

// POST - Create a new batch scan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, urls, source, sourceUrl } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'urls array is required' }, { status: 400 });
    }

    await connectDB();

    // Normalize URLs
    const normalizedUrls = urls.map((u: string) =>
      u.startsWith('http') ? u : `https://${u}`
    );

    // Create batch record
    const batch = await ScanBatch.create({
      clientId,
      createdBy: session.user.id,
      status: 'pending',
      urls: normalizedUrls,
      totalUrls: normalizedUrls.length,
      processedCount: 0,
      succeeded: [],
      failed: [],
      skipped: [],
      processingUrls: [],
      source: source || 'url_list',
      sourceUrl,
    });

    return NextResponse.json({
      batchId: batch._id.toString(),
      totalUrls: normalizedUrls.length,
      status: 'pending',
    });
  } catch (error) {
    console.error('Create batch error:', error);
    return NextResponse.json(
      { error: 'Failed to create batch' },
      { status: 500 }
    );
  }
}

// Helper to atomically claim a URL for processing
async function claimUrlForProcessing(batchId: string, url: string): Promise<boolean> {
  // Atomically check the URL isn't already processed/being processed and claim it
  const result = await ScanBatch.findOneAndUpdate(
    {
      _id: batchId,
      status: { $in: ['pending', 'processing'] },
      'succeeded.url': { $ne: url },
      'failed.url': { $ne: url },
      'skipped.url': { $ne: url },
      processingUrls: { $ne: url },
    },
    {
      $addToSet: { processingUrls: url },
      $set: { currentUrl: url },
    },
    { new: true }
  );

  return result !== null;
}

// Helper to atomically add a succeeded result
async function addSucceededResult(
  batchId: string,
  url: string,
  score: number,
  analysisId: string
): Promise<void> {
  await ScanBatch.findOneAndUpdate(
    {
      _id: batchId,
      'succeeded.url': { $ne: url }, // Only add if not already succeeded
    },
    {
      $push: {
        succeeded: {
          url,
          score,
          analysisId,
          processedAt: new Date(),
        },
      },
      $pull: { processingUrls: url },
    }
  );
}

// Helper to atomically add a failed result
async function addFailedResult(
  batchId: string,
  url: string,
  error: string
): Promise<void> {
  await ScanBatch.findOneAndUpdate(
    {
      _id: batchId,
      'failed.url': { $ne: url }, // Only add if not already failed
    },
    {
      $push: {
        failed: {
          url,
          error,
          attempts: 1,
          lastAttemptAt: new Date(),
        },
      },
      $pull: { processingUrls: url },
    }
  );
}

// Helper to check and update batch completion status
async function checkAndUpdateCompletion(batchId: string) {
  const batch = await ScanBatch.findById(batchId);
  if (!batch) return null;

  // Count unique processed URLs using objects
  const uniqueSucceeded: Record<string, ISucceededUrl> = {};
  batch.succeeded.forEach(s => { uniqueSucceeded[s.url] = s; });

  const uniqueFailed: Record<string, IFailedUrl> = {};
  batch.failed.forEach(f => { uniqueFailed[f.url] = f; });

  const uniqueSkipped: Record<string, ISkippedUrl> = {};
  batch.skipped.forEach(s => { uniqueSkipped[s.url] = s; });

  const succeededCount = Object.keys(uniqueSucceeded).length;
  const failedCount = Object.keys(uniqueFailed).length;
  const skippedCount = Object.keys(uniqueSkipped).length;
  const uniqueProcessedCount = succeededCount + failedCount + skippedCount;

  // Update processedCount based on unique URLs
  const updateData: Record<string, unknown> = {
    processedCount: uniqueProcessedCount,
  };

  // Check if complete
  if (uniqueProcessedCount >= batch.totalUrls && batch.status !== 'completed') {
    updateData.status = 'completed';
    updateData.completedAt = new Date();
    updateData.currentUrl = null;
    updateData.processingUrls = [];

    // Calculate average score from unique succeeded URLs
    if (succeededCount > 0) {
      const totalScore = Object.values(uniqueSucceeded).reduce((sum, s) => sum + s.score, 0);
      updateData.averageScore = Math.round(totalScore / succeededCount);
    }
  }

  return ScanBatch.findByIdAndUpdate(batchId, { $set: updateData }, { new: true });
}

// GET - Get batch status and process more URLs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const clientId = searchParams.get('clientId');

    await connectDB();

    // If no batchId, return list of recent batches for client
    if (!batchId && clientId) {
      const limitParam = searchParams.get('limit');
      const limit = limitParam ? parseInt(limitParam, 10) : 50;

      const batches = await ScanBatch.find({ clientId })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return NextResponse.json({ batches });
    }

    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    let batch = await ScanBatch.findById(batchId);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // If batch is already completed or cancelled, just return status
    if (batch.status === 'completed' || batch.status === 'cancelled' || batch.status === 'failed') {
      // Deduplicate results for response using objects
      const uniqueSucceeded: Record<string, ISucceededUrl> = {};
      batch.succeeded.forEach(s => { uniqueSucceeded[s.url] = s; });

      const uniqueFailed: Record<string, IFailedUrl> = {};
      batch.failed.forEach(f => { uniqueFailed[f.url] = f; });

      const deduplicatedSucceeded = Object.values(uniqueSucceeded);
      const deduplicatedFailed = Object.values(uniqueFailed);

      return NextResponse.json({
        batchId: batch._id.toString(),
        status: batch.status,
        progress: {
          completed: deduplicatedSucceeded.length + deduplicatedFailed.length + batch.skipped.length,
          total: batch.totalUrls,
        },
        results: {
          succeeded: deduplicatedSucceeded,
          failed: deduplicatedFailed,
          skipped: batch.skipped,
        },
        averageScore: batch.averageScore,
        completedAt: batch.completedAt,
      });
    }

    // Atomically start batch if pending
    if (batch.status === 'pending') {
      await ScanBatch.findByIdAndUpdate(batchId, {
        $set: { status: 'processing', startedAt: new Date() },
      });
    }

    // Build set of already processed URLs (including those being processed)
    const processedUrls = new Set([
      ...batch.succeeded.map(s => s.url),
      ...batch.failed.map(f => f.url),
      ...batch.skipped.map(s => s.url),
      ...(batch.processingUrls || []),
    ]);

    // Find URLs that need processing
    const urlsToProcess = batch.urls.filter(url => !processedUrls.has(url)).slice(0, URLS_PER_BATCH);

    // Process URLs with atomic claiming
    for (const url of urlsToProcess) {
      // Try to atomically claim this URL
      const claimed = await claimUrlForProcessing(batchId, url);

      if (!claimed) {
        // Another request already claimed this URL, skip
        continue;
      }

      // Process the URL
      const result = await analyzeAndSaveUrl(
        url,
        batch.clientId.toString(),
        session.user.id
      );

      // Atomically add the result
      if (result.success && result.analysisId) {
        await addSucceededResult(batchId, url, result.score || 0, result.analysisId);
      } else {
        await addFailedResult(batchId, url, result.error || 'Unknown error');
      }

      // Small delay between URLs
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Check and update completion status
    batch = await checkAndUpdateCompletion(batchId);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Deduplicate results for response using objects
    const finalUniqueSucceeded: Record<string, ISucceededUrl> = {};
    batch.succeeded.forEach(s => { finalUniqueSucceeded[s.url] = s; });

    const finalUniqueFailed: Record<string, IFailedUrl> = {};
    batch.failed.forEach(f => { finalUniqueFailed[f.url] = f; });

    const finalDeduplicatedSucceeded = Object.values(finalUniqueSucceeded);
    const finalDeduplicatedFailed = Object.values(finalUniqueFailed);

    return NextResponse.json({
      batchId: batch._id.toString(),
      status: batch.status,
      progress: {
        completed: finalDeduplicatedSucceeded.length + finalDeduplicatedFailed.length + batch.skipped.length,
        total: batch.totalUrls,
      },
      currentUrl: batch.currentUrl,
      results: {
        succeeded: finalDeduplicatedSucceeded,
        failed: finalDeduplicatedFailed,
        skipped: batch.skipped,
      },
      averageScore: batch.averageScore,
      completedAt: batch.completedAt,
    });
  } catch (error) {
    console.error('Get batch status error:', error);
    return NextResponse.json(
      { error: 'Failed to get batch status' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel a batch
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    await connectDB();

    const batch = await ScanBatch.findById(batchId);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (batch.status === 'completed' || batch.status === 'cancelled') {
      return NextResponse.json({
        message: 'Batch already finished',
        status: batch.status,
      });
    }

    batch.status = 'cancelled';
    batch.completedAt = new Date();
    await batch.save();

    return NextResponse.json({
      message: 'Batch cancelled',
      processedCount: batch.processedCount,
      totalUrls: batch.totalUrls,
    });
  } catch (error) {
    console.error('Cancel batch error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel batch' },
      { status: 500 }
    );
  }
}
