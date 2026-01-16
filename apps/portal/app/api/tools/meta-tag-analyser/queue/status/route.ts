import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, PendingScan } from '@tds/database';

export const dynamic = 'force-dynamic';

const MAX_RETRIES = 3;

// GET - Get queue status for a client
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const batchId = searchParams.get('batchId');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    await connectDB();

    // Build query
    const baseQuery: { clientId: string; batchId?: string } = { clientId };
    if (batchId) {
      baseQuery.batchId = batchId;
    }

    // Get counts for each status
    const [pending, processing, completed, failed, permanentlyFailed] = await Promise.all([
      PendingScan.countDocuments({ ...baseQuery, status: 'pending' }),
      PendingScan.countDocuments({ ...baseQuery, status: 'processing' }),
      PendingScan.countDocuments({ ...baseQuery, status: 'completed' }),
      PendingScan.countDocuments({ ...baseQuery, status: 'failed', retryCount: { $lt: MAX_RETRIES } }),
      PendingScan.countDocuments({ ...baseQuery, status: 'failed', retryCount: { $gte: MAX_RETRIES } }),
    ]);

    const total = pending + processing + completed + failed + permanentlyFailed;
    const remainingToProcess = pending + failed;

    // Get failed URLs with their errors
    const failedUrls = await PendingScan.find({
      ...baseQuery,
      status: 'failed',
      retryCount: { $gte: MAX_RETRIES },
    })
      .select('url error retryCount batchId')
      .limit(100)
      .lean();

    // Get active batch IDs if not filtering by batchId
    let activeBatches: string[] = [];
    if (!batchId) {
      const batches = await PendingScan.distinct('batchId', {
        clientId,
        status: { $in: ['pending', 'processing'] },
      });
      activeBatches = batches;
    }

    return NextResponse.json({
      total,
      pending,
      processing,
      completed,
      failed,
      permanentlyFailed,
      remainingToProcess,
      failedUrls,
      activeBatches,
      hasQueuedUrls: remainingToProcess > 0 || processing > 0,
    });
  } catch (error) {
    console.error('Queue status error:', error);
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}
