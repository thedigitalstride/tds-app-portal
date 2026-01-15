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
      .sort({ analyzedAt: -1 })
      .limit(100)
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

// POST - Save a new analysis
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, result, issues, plannedTitle, plannedDescription } = body;

    if (!clientId || !result) {
      return NextResponse.json(
        { error: 'clientId and result are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Calculate score based on issues
    const errorCount = issues.filter((i: { type: string }) => i.type === 'error').length;
    const warningCount = issues.filter((i: { type: string }) => i.type === 'warning').length;
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
      issues,
      plannedTitle,
      plannedDescription,
      score,
      analyzedBy: session.user.id,
      analyzedAt: new Date(),
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
