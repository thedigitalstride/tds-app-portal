import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { captureScreenshots } from '@/lib/services/page-store-service';

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
    const result = await captureScreenshots(url, clientId, session.user.id);

    return NextResponse.json({
      success: true,
      screenshotDesktopUrl: result.screenshotDesktopUrl,
      screenshotMobileUrl: result.screenshotMobileUrl,
      snapshotId: result.snapshotId,
    });
  } catch (error) {
    console.error('Screenshot capture error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to capture screenshots' },
      { status: 500 }
    );
  }
}
