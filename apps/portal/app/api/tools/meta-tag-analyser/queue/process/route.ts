import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, PendingScan, MetaTagAnalysis } from '@tds/database';
import { calculateScore } from '@/app/tools/meta-tag-analyser/lib/scoring';
import { getPage } from '@/lib/services/page-store-service';
import { parseAllMetaTags } from '@/app/api/tools/meta-tag-analyser/lib/parse-html';
import { analyzeMetaTags } from '@/app/api/tools/meta-tag-analyser/lib/analyze';
import type { MetaTagResult, AnalysisIssue } from '@/app/api/tools/meta-tag-analyser/lib/types';

export const dynamic = 'force-dynamic';

// Analyze a single URL using Page Store and shared parsing/analysis
async function analyzeUrl(
  url: string,
  clientId: string,
  userId: string
): Promise<{ result: MetaTagResult; issues: AnalysisIssue[]; snapshotId: string }> {
  // Use Page Store — the SINGLE SOURCE OF TRUTH for all page content
  const pageResult = await getPage({
    url,
    clientId,
    userId,
    toolId: 'meta-tag-analyser',
  });
  const html = pageResult.html;
  const snapshotId = pageResult.snapshot._id.toString();

  // Parse all meta tags using shared library
  const result = await parseAllMetaTags(html, url);

  // Run comprehensive analysis (20+ rules)
  const issues = analyzeMetaTags(result);

  return { result, issues, snapshotId };
}

// Upsert analysis result
async function upsertAnalysis(
  clientId: string,
  result: MetaTagResult,
  issues: AnalysisIssue[],
  userId: string,
  snapshotId: string
): Promise<{ isUpdate: boolean; score: number }> {
  const now = new Date();
  // Pass imageValidation so broken images are not counted as "present"
  const { score, categoryScores } = calculateScore(result, issues, result.imageValidation);

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
      },
      { new: true }
    );

    return { isUpdate: true, score };
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

  return { isUpdate: false, score };
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
        const { result, issues, snapshotId } = await analyzeUrl(
          pendingUrl.url,
          clientId,
          session.user.id
        );

        const { score } = await upsertAnalysis(clientId, result, issues, session.user.id, snapshotId);

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
