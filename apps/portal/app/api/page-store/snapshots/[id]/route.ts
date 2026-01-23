import { NextRequest, NextResponse } from 'next/server';
import {
  requireClientAccess,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/permissions';
import { getSnapshotById } from '@/lib/services/page-store-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    await requireClientAccess(clientId);

    const result = await getSnapshotById(id, clientId);

    if (!result) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      html: result.html,
      snapshot: result.snapshot,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Get snapshot error:', error);
    return NextResponse.json(
      { error: 'Failed to get snapshot' },
      { status: 500 }
    );
  }
}
