import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  requireClientAccess,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/permissions';
import { getPage } from '@/lib/services/page-store-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { url, clientId, toolId, forceRefresh } = await request.json();

    if (!url || !clientId || !toolId) {
      return NextResponse.json(
        { error: 'url, clientId, and toolId are required' },
        { status: 400 }
      );
    }

    const session = await requireClientAccess(clientId);

    const result = await getPage({
      url,
      clientId,
      userId: session.user.id,
      toolId,
      forceRefresh,
    });

    return NextResponse.json({
      html: result.html,
      snapshot: {
        _id: result.snapshot._id,
        url: result.snapshot.url,
        fetchedAt: result.snapshot.fetchedAt,
        fetchedBy: result.snapshot.fetchedBy,
        triggeredByTool: result.snapshot.triggeredByTool,
        contentSize: result.snapshot.contentSize,
        httpStatus: result.snapshot.httpStatus,
        contentType: result.snapshot.contentType,
        lastModified: result.snapshot.lastModified,
        cacheControl: result.snapshot.cacheControl,
        xRobotsTag: result.snapshot.xRobotsTag,
      },
      wasCached: result.wasCached,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Page store error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get page' },
      { status: 500 }
    );
  }
}
