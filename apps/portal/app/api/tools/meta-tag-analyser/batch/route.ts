import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, ScanBatch, MetaTagAnalysis, ISucceededUrl, IFailedUrl, ISkippedUrl } from '@tds/database';
import { calculateScore } from '@/app/tools/meta-tag-analyser/lib/scoring';
import { getPage } from '@/lib/services/page-store-service';
import { parseAllMetaTags } from '@/app/api/tools/meta-tag-analyser/lib/parse-html';
import { analyzeMetaTags } from '@/app/api/tools/meta-tag-analyser/lib/analyze';

export const dynamic = 'force-dynamic';

// Number of URLs to process per poll request
const URLS_PER_BATCH = 5;

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

    // Parse all meta tags using shared library (comprehensive extraction)
    const result = await parseAllMetaTags(html, url);

    // Run comprehensive analysis (20+ rules)
    const issues = analyzeMetaTags(result);

    // Calculate score — pass imageValidation so broken images are not scored as "present"
    const { score, categoryScores } = calculateScore(result, issues, result.imageValidation);
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
        existingAnalysis.description !== result.description ||
        existingAnalysis.canonical !== result.canonical ||
        existingAnalysis.openGraph?.image !== result.openGraph?.image;

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
          author: existingAnalysis.author,
          themeColor: existingAnalysis.themeColor,
          language: existingAnalysis.language,
          favicon: existingAnalysis.favicon,
          hreflang: existingAnalysis.hreflang,
          openGraph: existingAnalysis.openGraph,
          twitter: existingAnalysis.twitter,
          structuredData: existingAnalysis.structuredData,
          technicalSeo: existingAnalysis.technicalSeo,
          siteVerification: existingAnalysis.siteVerification,
          mobile: existingAnalysis.mobile,
          security: existingAnalysis.security,
          imageValidation: existingAnalysis.imageValidation,
          issues: existingAnalysis.issues || [],
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
            author: result.author,
            themeColor: result.themeColor,
            language: result.language,
            favicon: result.favicon,
            hreflang: result.hreflang,
            openGraph: result.openGraph,
            twitter: result.twitter,
            structuredData: result.structuredData,
            technicalSeo: result.technicalSeo,
            siteVerification: result.siteVerification,
            mobile: result.mobile,
            security: result.security,
            imageValidation: result.imageValidation,
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
        author: result.author,
        themeColor: result.themeColor,
        language: result.language,
        favicon: result.favicon,
        hreflang: result.hreflang,
        openGraph: result.openGraph,
        twitter: result.twitter,
        structuredData: result.structuredData,
        technicalSeo: result.technicalSeo,
        siteVerification: result.siteVerification,
        mobile: result.mobile,
        security: result.security,
        imageValidation: result.imageValidation,
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
      'succeeded.url': { $ne: url },
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
      'failed.url': { $ne: url },
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

  const updateData: Record<string, unknown> = {
    processedCount: uniqueProcessedCount,
  };

  if (uniqueProcessedCount >= batch.totalUrls && batch.status !== 'completed') {
    updateData.status = 'completed';
    updateData.completedAt = new Date();
    updateData.currentUrl = null;
    updateData.processingUrls = [];

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
      const claimed = await claimUrlForProcessing(batchId, url);

      if (!claimed) {
        continue;
      }

      const result = await analyzeAndSaveUrl(
        url,
        batch.clientId.toString(),
        session.user.id
      );

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

    // Deduplicate results for response
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
