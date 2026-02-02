import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPage } from '@/lib/services/page-store-service';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { url, clientId } = await request.json();

  if (!url || !clientId) {
    return NextResponse.json({ error: 'Missing url or clientId' }, { status: 400 });
  }

  try {
    const result = await getPage({
      url,
      clientId,
      userId: session.user.id,
      toolId: 'page-library',
      forceRefresh: true,
    });

    return NextResponse.json({
      success: true,
      snapshotId: result.snapshot._id.toString(),
      fetchedAt: result.snapshot.fetchedAt,
    });
  } catch (error) {
    console.error('Rescan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to rescan URL' },
      { status: 500 }
    );
  }
}
