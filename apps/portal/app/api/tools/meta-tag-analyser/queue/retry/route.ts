import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, PendingScan } from '@tds/database';

export const dynamic = 'force-dynamic';

// POST - Reset failed URLs to pending status for retry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, batchId } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    await connectDB();

    // Build query for failed URLs
    const query: { clientId: string; status: string; batchId?: string } = {
      clientId,
      status: 'failed',
    };

    if (batchId) {
      query.batchId = batchId;
    }

    // Reset failed URLs to pending and reset retry count
    const result = await PendingScan.updateMany(query, {
      $set: {
        status: 'pending',
        retryCount: 0,
        error: null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      reset: result.modifiedCount,
      message: `${result.modifiedCount} URLs reset for retry`,
    });
  } catch (error) {
    console.error('Retry failed URLs error:', error);
    return NextResponse.json(
      { error: 'Failed to retry URLs' },
      { status: 500 }
    );
  }
}
