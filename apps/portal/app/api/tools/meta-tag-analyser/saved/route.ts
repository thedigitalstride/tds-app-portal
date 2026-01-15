import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB, MetaTagAnalysis } from '@tds/database';

// GET - Fetch saved analyses for a client
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    await connectDB();

    const analyses = await MetaTagAnalysis.find({ clientId })
      .sort({ lastScannedAt: -1, analyzedAt: -1 })
      .limit(100)
      .populate('analyzedBy', 'name email')
      .populate('lastScannedBy', 'name email')
      .lean();

    return NextResponse.json(analyses);
  } catch (error) {
    console.error('Failed to fetch analyses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analyses' },
      { status: 500 }
    );
  }
}

// POST - Save analysis (single or bulk)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, result, issues, plannedTitle, plannedDescription, bulk, results } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Bulk save mode
    if (bulk && results && Array.isArray(results)) {
      const now = new Date();
      const analysesToCreate = results
        .filter((r: { result?: object; error?: string }) => r.result && !r.error)
        .map((r: { result: { url: string; title: string; description: string; canonical?: string; robots?: string; openGraph: object; twitter: object }; issues: Array<{ type: string }>; score: number }) => {
          return {
            clientId,
            url: r.result.url,
            title: r.result.title || '',
            description: r.result.description || '',
            canonical: r.result.canonical,
            robots: r.result.robots,
            openGraph: r.result.openGraph,
            twitter: r.result.twitter,
            issues: r.issues || [],
            score: r.score,
            analyzedBy: session.user.id,
            analyzedAt: now,
            scanCount: 1,
            lastScannedAt: now,
            lastScannedBy: session.user.id,
            scanHistory: [],
          };
        });

      if (analysesToCreate.length === 0) {
        return NextResponse.json(
          { error: 'No valid results to save' },
          { status: 400 }
        );
      }

      const saved = await MetaTagAnalysis.insertMany(analysesToCreate);
      return NextResponse.json({ saved: saved.length }, { status: 201 });
    }

    // Single save mode
    if (!result) {
      return NextResponse.json(
        { error: 'result is required' },
        { status: 400 }
      );
    }

    // Calculate score based on issues
    const errorCount = issues?.filter((i: { type: string }) => i.type === 'error').length || 0;
    const warningCount = issues?.filter((i: { type: string }) => i.type === 'warning').length || 0;
    const score = Math.max(0, 100 - (errorCount * 20) - (warningCount * 10));

    const analysis = await MetaTagAnalysis.create({
      clientId,
      url: result.url,
      title: result.title,
      description: result.description,
      canonical: result.canonical,
      robots: result.robots,
      openGraph: result.openGraph,
      twitter: result.twitter,
      issues: issues || [],
      plannedTitle,
      plannedDescription,
      score,
      analyzedBy: session.user.id,
      analyzedAt: new Date(),
      scanCount: 1,
      lastScannedAt: new Date(),
      lastScannedBy: session.user.id,
      scanHistory: [],
    });

    return NextResponse.json(analysis, { status: 201 });
  } catch (error) {
    console.error('Failed to save analysis:', error);
    return NextResponse.json(
      { error: 'Failed to save analysis' },
      { status: 500 }
    );
  }
}
