import { NextRequest, NextResponse } from 'next/server';
import { connectDB, MetaTagAnalysis } from '@tds/database';
import {
  requireClientAccess,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tools/meta-tag-analyser/check-urls
 * Check which URLs already have meta tag analysis results for a client.
 * Used by the Page Archive importer to show "New" vs "Already analyzed" status.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, urls } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'urls array is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this client
    await requireClientAccess(clientId);

    await connectDB();

    // Find all URLs that already exist for this client
    const existingAnalyses = await MetaTagAnalysis.find(
      {
        clientId,
        url: { $in: urls },
      },
      { url: 1 } // Only return the URL field
    ).lean();

    const existingUrlSet = new Set(existingAnalyses.map((a) => a.url));

    // Categorize URLs
    const existing: string[] = [];
    const newUrls: string[] = [];

    for (const url of urls) {
      if (existingUrlSet.has(url)) {
        existing.push(url);
      } else {
        newUrls.push(url);
      }
    }

    return NextResponse.json({
      existing,
      new: newUrls,
      total: urls.length,
      existingCount: existing.length,
      newCount: newUrls.length,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Check URLs error:', error);
    return NextResponse.json(
      { error: 'Failed to check URLs' },
      { status: 500 }
    );
  }
}
