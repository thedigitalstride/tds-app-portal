import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, PpcPageAnalysis } from '@tds/database';
import { getPage } from '@/lib/services/page-store-service';
import { analyzePageContent } from '../../../analyze';

export const dynamic = 'force-dynamic';

// POST - Rescan a URL
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

    const analysis = await PpcPageAnalysis.findById(id);

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Fetch fresh page content via Page Store
    const { html, snapshot } = await getPage({
      url: analysis.url,
      clientId: analysis.clientId.toString(),
      userId: session.user.id,
      toolId: 'ppc-page-analyser',
      forceRefresh: true,
    });

    // Analyze the page content
    const analysisResult = analyzePageContent(html, analysis.url);

    const now = new Date();
    const changesDetected = analysis.headline !== analysisResult.headline;

    // Create history entry
    const historyEntry = {
      scannedAt: now,
      scannedBy: session.user.id,
      score: analysis.score,
      changesDetected,
      pageSnapshotId: analysis.analyzedSnapshotId,
      snapshot: {
        headline: analysis.headline,
        subheadline: analysis.subheadline,
        conversionElements: analysis.conversionElements,
        issues: analysis.issues,
      },
    };

    // Update the analysis
    const snapshotId = snapshot._id.toString();
    const updatedAnalysis = await PpcPageAnalysis.findByIdAndUpdate(
      id,
      {
        $set: {
          headline: analysisResult.headline,
          subheadline: analysisResult.subheadline,
          conversionElements: analysisResult.conversionElements,
          issues: analysisResult.issues,
          score: analysisResult.score,
          lastScannedAt: now,
          lastScannedBy: session.user.id,
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
    )
      .populate('analyzedBy', 'name email')
      .populate('lastScannedBy', 'name email')
      .populate('scanHistory.scannedBy', 'name email')
      .lean();

    return NextResponse.json({
      analysis: updatedAnalysis,
      changesDetected,
    });
  } catch (error) {
    console.error('Failed to rescan:', error);
    return NextResponse.json(
      { error: 'Failed to rescan' },
      { status: 500 }
    );
  }
}
