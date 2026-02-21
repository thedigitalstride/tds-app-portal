import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getTimeEntries,
  isTracketConfigured,
} from '@/lib/services/tracket-service';

/**
 * GET /api/tools/data-flow/tracket
 *
 * Fetch time entries from the Tracket API for a given date range.
 *
 * Query params:
 *   - from (required): Start date YYYY-MM-DD
 *   - to   (required): End date YYYY-MM-DD
 *   - userId (optional): Filter by Tracket user ID
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isTracketConfigured()) {
    return NextResponse.json(
      {
        error: 'Tracket integration not configured',
        message:
          'Add TRACKET_CLIENT_ID and TRACKET_CLIENT_SECRET to your environment variables.',
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const userId = searchParams.get('userId') ?? undefined;

  if (!from || !to) {
    return NextResponse.json(
      { error: 'Missing required query parameters: from, to (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(from) || !dateRegex.test(to)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD.' },
      { status: 400 }
    );
  }

  try {
    const entries = await getTimeEntries({ from, to, userId });

    // Compute summary stats
    const totalMinutes = entries.reduce(
      (sum, e) => sum + (e.hours ?? 0) * 60 + (e.minutes ?? 0),
      0
    );

    return NextResponse.json({
      entries,
      summary: {
        totalEntries: entries.length,
        totalHours: Math.floor(totalMinutes / 60),
        totalMinutes: totalMinutes % 60,
        from,
        to,
      },
    });
  } catch (err) {
    console.error('[Tracket API] Error fetching time entries:', err);
    return NextResponse.json(
      {
        error: 'Failed to fetch time entries from Tracket',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
