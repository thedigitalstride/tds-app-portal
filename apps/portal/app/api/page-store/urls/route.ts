import { NextRequest, NextResponse } from 'next/server';
import {
  requireClientAccess,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/permissions';
import { getClientUrls, deleteUrls } from '@/lib/services/page-store-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    await requireClientAccess(clientId);

    const urls = await getClientUrls(clientId);

    return NextResponse.json({ urls });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Get client URLs error:', error);
    return NextResponse.json(
      { error: 'Failed to get URLs' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, urlHashes } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    if (!urlHashes || !Array.isArray(urlHashes) || urlHashes.length === 0) {
      return NextResponse.json(
        { error: 'urlHashes array is required' },
        { status: 400 }
      );
    }

    await requireClientAccess(clientId);

    const result = await deleteUrls(urlHashes, clientId);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Delete URLs error:', error);
    return NextResponse.json(
      { error: 'Failed to delete URLs' },
      { status: 500 }
    );
  }
}
