import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, PpcPageAnalysis } from '@tds/database';
import {
  requireClientAccess,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET - Fetch saved analyses for a client
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    await connectDB();

    const analyses = await PpcPageAnalysis.find({ clientId })
      .sort({ lastScannedAt: -1, analyzedAt: -1 })
      .limit(100)
      .populate('analyzedBy', 'name email')
      .populate('lastScannedBy', 'name email')
      .populate('scanHistory.scannedBy', 'name email')
      .lean();

    return NextResponse.json(analyses);
  } catch (error) {
    console.error('Failed to fetch analyses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analyses' },
      { status: 500 }
    );
  }
}

// POST - Save analysis with upsert logic
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, url, headline, subheadline, conversionElements, issues, score, snapshotId } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    await connectDB();

    const now = new Date();

    // Check if URL already exists for this client
    const existingAnalysis = await PpcPageAnalysis.findOne({ clientId, url });

    if (existingAnalysis) {
      // Update existing analysis
      const changesDetected = existingAnalysis.headline !== headline;

      const historyEntry = {
        scannedAt: now,
        scannedBy: session.user.id,
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

      const updatedAnalysis = await PpcPageAnalysis.findByIdAndUpdate(
        existingAnalysis._id,
        {
          $set: {
            headline,
            subheadline,
            conversionElements: conversionElements || [],
            issues: issues || [],
            score: score || 0,
            lastScannedAt: now,
            lastScannedBy: session.user.id,
            ...(snapshotId && {
              analyzedSnapshotId: snapshotId,
              currentSnapshotId: snapshotId,
            }),
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

      return NextResponse.json({
        ...JSON.parse(JSON.stringify(updatedAnalysis)),
        isUpdate: true,
        message: 'URL updated with new scan',
      }, { status: 201 });
    }

    // Create new analysis
    const newAnalysis = await PpcPageAnalysis.create({
      clientId,
      url,
      headline,
      subheadline,
      conversionElements: conversionElements || [],
      issues: issues || [],
      score: score || 0,
      analyzedBy: session.user.id,
      analyzedAt: now,
      scanCount: 1,
      lastScannedAt: now,
      lastScannedBy: session.user.id,
      ...(snapshotId && {
        analyzedSnapshotId: snapshotId,
        currentSnapshotId: snapshotId,
      }),
      scanHistory: [],
    });

    return NextResponse.json({
      ...JSON.parse(JSON.stringify(newAnalysis)),
      isUpdate: false,
      message: 'New URL saved',
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to save analysis:', error);
    return NextResponse.json(
      { error: 'Failed to save analysis' },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete analyses
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, ids } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    await requireClientAccess(clientId);
    await connectDB();

    const result = await PpcPageAnalysis.deleteMany({
      _id: { $in: ids },
      clientId,
    });

    return NextResponse.json({
      deleted: result.deletedCount,
      message: `${result.deletedCount} landing page${result.deletedCount !== 1 ? 's' : ''} deleted`,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to delete analyses:', error);
    return NextResponse.json(
      { error: 'Failed to delete analyses' },
      { status: 500 }
    );
  }
}
