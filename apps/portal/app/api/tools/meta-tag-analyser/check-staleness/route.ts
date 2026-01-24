import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, MetaTagAnalysis } from '@tds/database';
import {
  requireClientAccess,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tools/meta-tag-analyser/check-staleness
 *
 * Check which analyses are stale for a client.
 * An analysis is stale when its analyzedSnapshotId differs from currentSnapshotId,
 * meaning the page has been re-archived since the analysis was performed.
 *
 * Body: { clientId }
 * Returns: { stale: [{ _id, url, analyzedSnapshotId, currentSnapshotId, analyzedAt }] }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this client
    await requireClientAccess(clientId);

    await connectDB();

    // Find analyses where:
    // 1. Both analyzedSnapshotId and currentSnapshotId exist (has been linked to Page Library)
    // 2. analyzedSnapshotId !== currentSnapshotId (page has been updated since analysis)
    const staleAnalyses = await MetaTagAnalysis.find({
      clientId,
      analyzedSnapshotId: { $exists: true, $ne: null },
      currentSnapshotId: { $exists: true, $ne: null },
      $expr: { $ne: ['$analyzedSnapshotId', '$currentSnapshotId'] },
    })
      .select('_id url analyzedSnapshotId currentSnapshotId analyzedAt lastScannedAt title')
      .sort({ lastScannedAt: -1 })
      .lean();

    return NextResponse.json({
      stale: staleAnalyses,
      count: staleAnalyses.length,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Check staleness error:', error);
    return NextResponse.json(
      { error: 'Failed to check staleness' },
      { status: 500 }
    );
  }
}
