import { NextRequest, NextResponse } from 'next/server';
import {
  requireClientAccess,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/permissions';
import { getSnapshots } from '@/lib/services/page-store-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const clientId = searchParams.get('clientId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!url || !clientId) {
      return NextResponse.json(
        { error: 'url and clientId are required' },
        { status: 400 }
      );
    }

    await requireClientAccess(clientId);

    const snapshots = await getSnapshots(url, clientId, limit);

    return NextResponse.json({ snapshots });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Get snapshots error:', error);
    return NextResponse.json(
      { error: 'Failed to get snapshots' },
      { status: 500 }
    );
  }
}
