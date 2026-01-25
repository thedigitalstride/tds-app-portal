import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, UrlBatch, PpcPageAnalysis, type IUrlBatchSucceeded, type IUrlBatchFailed } from '@tds/database';
import { getPage } from '@/lib/services/page-store-service';
import { analyzePageContent } from '@/app/api/tools/ppc-page-analyser/analyze';

export const dynamic = 'force-dynamic';

// Number of URLs to process per poll request
const URLS_PER_BATCH = 5;

// Processor result type
interface ProcessResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

// Processor function type
type UrlProcessor = (
  url: string,
  clientId: string,
  userId: string
) => Promise<ProcessResult>;

// Processor registry - tool-specific processing logic
const processors: Record<string, UrlProcessor> = {
  'page-library': async (url, clientId, userId) => {
    try {
      const result = await getPage({
        url,
        clientId,
        userId,
        toolId: 'page-library',
      });
      return {
        success: true,
        result: {
          snapshotId: result.snapshot._id.toString(),
          wasCached: result.wasCached,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to archive URL',
      };
    }
  },
  'ppc-page-analyser': async (url, clientId, userId) => {
    try {
      // Get page content via Page Store
      const { html, snapshot } = await getPage({
        url,
        clientId,
        userId,
        toolId: 'ppc-page-analyser',
      });

      // Analyze the page
      const analysisResult = analyzePageContent(html, url);
      const snapshotId = snapshot._id.toString();
      const now = new Date();

      // Check if URL already exists for this client
      const existingAnalysis = await PpcPageAnalysis.findOne({ clientId, url });

      if (existingAnalysis) {
        // Update existing analysis
        const changesDetected = existingAnalysis.headline !== analysisResult.headline;

        const historyEntry = {
          scannedAt: now,
          scannedBy: userId,
          score: existingAnalysis.score,
          changesDetected,
          pageSnapshotId: existingAnalysis.analyzedSnapshotId,
          snapshot: {
            headline: existingAnalysis.headline,
            subheadline: existingAnalysis.subheadline,
            conversionElements: existingAnalysis.conversionElements,
            issues: existingAnalysis.issues,
          },
        };

        await PpcPageAnalysis.findByIdAndUpdate(
          existingAnalysis._id,
          {
            $set: {
              headline: analysisResult.headline,
              subheadline: analysisResult.subheadline,
              conversionElements: analysisResult.conversionElements,
              issues: analysisResult.issues,
              score: analysisResult.score,
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

        return {
          success: true,
          result: {
            analysisId: existingAnalysis._id.toString(),
            snapshotId,
            score: analysisResult.score,
            isUpdate: true,
          },
        };
      }

      // Create new analysis
      const newAnalysis = await PpcPageAnalysis.create({
        clientId,
        url,
        headline: analysisResult.headline,
        subheadline: analysisResult.subheadline,
        conversionElements: analysisResult.conversionElements,
        issues: analysisResult.issues,
        score: analysisResult.score,
        analyzedBy: userId,
        analyzedAt: now,
        scanCount: 1,
        lastScannedAt: now,
        lastScannedBy: userId,
        analyzedSnapshotId: snapshotId,
        currentSnapshotId: snapshotId,
        scanHistory: [],
      });

      return {
        success: true,
        result: {
          analysisId: newAnalysis._id.toString(),
          snapshotId,
          score: analysisResult.score,
          isUpdate: false,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze landing page',
      };
    }
  },
};

// Helper to atomically claim a URL for processing
async function claimUrlForProcessing(batchId: string, url: string): Promise<boolean> {
  const result = await UrlBatch.findOneAndUpdate(
    {
      _id: batchId,
      status: { $in: ['pending', 'processing'] },
      'succeeded.url': { $ne: url },
      'failed.url': { $ne: url },
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
  result?: unknown
): Promise<void> {
  await UrlBatch.findOneAndUpdate(
    {
      _id: batchId,
      'succeeded.url': { $ne: url },
    },
    {
      $push: {
        succeeded: {
          url,
          result,
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
  await UrlBatch.findOneAndUpdate(
    {
      _id: batchId,
      'failed.url': { $ne: url },
    },
    {
      $push: {
        failed: {
          url,
          error,
          processedAt: new Date(),
        },
      },
      $pull: { processingUrls: url },
    }
  );
}

// Helper to check and update batch completion status
async function checkAndUpdateCompletion(batchId: string) {
  const batch = await UrlBatch.findById(batchId);
  if (!batch) return null;

  // Count unique processed URLs
  const uniqueSucceeded: Record<string, IUrlBatchSucceeded> = {};
  batch.succeeded.forEach((s) => {
    uniqueSucceeded[s.url] = s;
  });

  const uniqueFailed: Record<string, IUrlBatchFailed> = {};
  batch.failed.forEach((f) => {
    uniqueFailed[f.url] = f;
  });

  const succeededCount = Object.keys(uniqueSucceeded).length;
  const failedCount = Object.keys(uniqueFailed).length;
  const uniqueProcessedCount = succeededCount + failedCount;

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
  }

  return UrlBatch.findByIdAndUpdate(batchId, { $set: updateData }, { new: true });
}

// POST - Create a new batch
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, urls, toolId, source, sourceUrl } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    if (!toolId) {
      return NextResponse.json({ error: 'toolId is required' }, { status: 400 });
    }

    if (!processors[toolId]) {
      return NextResponse.json({ error: `Unknown toolId: ${toolId}` }, { status: 400 });
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
    const batch = await UrlBatch.create({
      clientId,
      createdBy: session.user.id,
      toolId,
      status: 'pending',
      urls: normalizedUrls,
      totalUrls: normalizedUrls.length,
      processedCount: 0,
      succeeded: [],
      failed: [],
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

// GET - Get batch status and process more URLs
export async function GET(request: NextRequest) {
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

    let batch = await UrlBatch.findById(batchId);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // If batch is already completed or cancelled, just return status
    if (batch.status === 'completed' || batch.status === 'cancelled' || batch.status === 'failed') {
      // Deduplicate results for response
      const uniqueSucceeded: Record<string, IUrlBatchSucceeded> = {};
      batch.succeeded.forEach((s) => {
        uniqueSucceeded[s.url] = s;
      });

      const uniqueFailed: Record<string, IUrlBatchFailed> = {};
      batch.failed.forEach((f) => {
        uniqueFailed[f.url] = f;
      });

      const deduplicatedSucceeded = Object.values(uniqueSucceeded);
      const deduplicatedFailed = Object.values(uniqueFailed);

      return NextResponse.json({
        batchId: batch._id.toString(),
        status: batch.status,
        progress: {
          completed: deduplicatedSucceeded.length + deduplicatedFailed.length,
          total: batch.totalUrls,
        },
        results: {
          succeeded: deduplicatedSucceeded,
          failed: deduplicatedFailed,
        },
        completedAt: batch.completedAt,
      });
    }

    // Get the processor for this tool
    const processor = processors[batch.toolId];
    if (!processor) {
      return NextResponse.json(
        { error: `Unknown toolId: ${batch.toolId}` },
        { status: 400 }
      );
    }

    // Atomically start batch if pending
    if (batch.status === 'pending') {
      await UrlBatch.findByIdAndUpdate(batchId, {
        $set: { status: 'processing', startedAt: new Date() },
      });
    }

    // Build set of already processed URLs (including those being processed)
    const processedUrls = new Set([
      ...batch.succeeded.map((s) => s.url),
      ...batch.failed.map((f) => f.url),
      ...(batch.processingUrls || []),
    ]);

    // Find URLs that need processing
    const urlsToProcess = batch.urls.filter((url) => !processedUrls.has(url)).slice(0, URLS_PER_BATCH);

    // Process URLs with atomic claiming
    for (const url of urlsToProcess) {
      // Try to atomically claim this URL
      const claimed = await claimUrlForProcessing(batchId, url);

      if (!claimed) {
        // Another request already claimed this URL, skip
        continue;
      }

      // Process the URL
      const result = await processor(
        url,
        batch.clientId.toString(),
        session.user.id
      );

      // Atomically add the result
      if (result.success) {
        await addSucceededResult(batchId, url, result.result);
      } else {
        await addFailedResult(batchId, url, result.error || 'Unknown error');
      }

      // Small delay between URLs
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Check and update completion status
    batch = await checkAndUpdateCompletion(batchId);

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Deduplicate results for response
    const finalUniqueSucceeded: Record<string, IUrlBatchSucceeded> = {};
    batch.succeeded.forEach((s) => {
      finalUniqueSucceeded[s.url] = s;
    });

    const finalUniqueFailed: Record<string, IUrlBatchFailed> = {};
    batch.failed.forEach((f) => {
      finalUniqueFailed[f.url] = f;
    });

    const finalDeduplicatedSucceeded = Object.values(finalUniqueSucceeded);
    const finalDeduplicatedFailed = Object.values(finalUniqueFailed);

    return NextResponse.json({
      batchId: batch._id.toString(),
      status: batch.status,
      progress: {
        completed: finalDeduplicatedSucceeded.length + finalDeduplicatedFailed.length,
        total: batch.totalUrls,
      },
      currentUrl: batch.currentUrl,
      results: {
        succeeded: finalDeduplicatedSucceeded,
        failed: finalDeduplicatedFailed,
      },
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

    const batch = await UrlBatch.findById(batchId);

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
