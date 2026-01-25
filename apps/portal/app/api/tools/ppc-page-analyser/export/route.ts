import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, PpcPageAnalysis } from '@tds/database';

export const dynamic = 'force-dynamic';

// GET - Export analyses for a client
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const format = searchParams.get('format') || 'csv';

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    await connectDB();

    const analyses = await PpcPageAnalysis.find({ clientId })
      .sort({ lastScannedAt: -1 })
      .lean();

    if (format === 'json') {
      return new NextResponse(JSON.stringify(analyses, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="ppc-analysis-${clientId}.json"`,
        },
      });
    }

    // CSV format
    const headers = ['URL', 'Headline', 'Subheadline', 'Score', 'Scan Count', 'Last Scanned', 'Issues'];
    const rows = analyses.map((a) => [
      a.url,
      a.headline || '',
      a.subheadline || '',
      a.score.toString(),
      (a.scanCount || 1).toString(),
      new Date(a.lastScannedAt || a.analyzedAt).toISOString(),
      a.issues?.length?.toString() || '0',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="ppc-analysis-${clientId}.csv"`,
      },
    });
  } catch (error) {
    console.error('Failed to export analyses:', error);
    return NextResponse.json(
      { error: 'Failed to export analyses' },
      { status: 500 }
    );
  }
}
