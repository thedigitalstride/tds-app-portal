import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, ApiDataRow } from '@tds/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tools/data-flow/meta/data
 * Retrieve stored ApiDataRow documents for rehydration.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const clientId = searchParams.get('clientId');
    const sourceAccountId = searchParams.get('sourceAccountId');

    if (!clientId || !sourceAccountId) {
      return NextResponse.json(
        { error: 'clientId and sourceAccountId are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const filter: Record<string, unknown> = {
      clientId,
      sourceType: 'meta-ads',
      sourceAccountId,
    };

    const dateStart = searchParams.get('dateStart');
    const dateStop = searchParams.get('dateStop');

    if (dateStart || dateStop) {
      const dateFilter: Record<string, Date> = {};
      if (dateStart) dateFilter.$gte = new Date(dateStart);
      if (dateStop) dateFilter.$lte = new Date(dateStop);
      filter.dateStart = dateFilter;
    }

    const rows = await ApiDataRow.find(filter)
      .sort({ dateStart: -1 })
      .limit(5000)
      .lean();

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error retrieving Meta data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
