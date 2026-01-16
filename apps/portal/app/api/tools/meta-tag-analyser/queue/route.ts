import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, PendingScan } from '@tds/database';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// POST - Queue URLs for background processing
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, urls } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'urls array is required' }, { status: 400 });
    }

    await connectDB();

    const batchId = randomUUID();
    const now = new Date();

    // Normalize URLs
    const normalizedUrls = urls.map((u: string) =>
      u.startsWith('http') ? u : `https://${u}`
    );

    // Create pending scan records
    const pendingScans = normalizedUrls.map((url: string) => ({
      clientId,
      url,
      status: 'pending' as const,
      batchId,
      submittedBy: session.user.id,
      submittedAt: now,
      retryCount: 0,
    }));

    await PendingScan.insertMany(pendingScans);

    return NextResponse.json({
      queued: pendingScans.length,
      batchId,
    });
  } catch (error) {
    console.error('Queue error:', error);
    return NextResponse.json(
      { error: 'Failed to queue URLs' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel all pending URLs for a batch or client
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const clientId = searchParams.get('clientId');

    if (!batchId && !clientId) {
      return NextResponse.json(
        { error: 'batchId or clientId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const query: { status: string; batchId?: string; clientId?: string } = {
      status: 'pending',
    };

    if (batchId) {
      query.batchId = batchId;
    } else if (clientId) {
      query.clientId = clientId;
    }

    const result = await PendingScan.deleteMany(query);

    return NextResponse.json({
      cancelled: result.deletedCount,
    });
  } catch (error) {
    console.error('Cancel queue error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel queue' },
      { status: 500 }
    );
  }
}
