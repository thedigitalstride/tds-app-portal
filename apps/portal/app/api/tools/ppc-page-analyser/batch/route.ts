import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, UrlBatch } from '@tds/database';

export const dynamic = 'force-dynamic';

// GET - Fetch batch history for a client
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

    const batches = await UrlBatch.find({
      clientId,
      toolId: 'ppc-page-analyser',
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json({ batches });
  } catch (error) {
    console.error('Failed to fetch batch history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch history' },
      { status: 500 }
    );
  }
}
