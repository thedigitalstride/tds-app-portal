import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB, MetaTagAnalysis } from '@tds/database';

interface ScanResult {
  url: string;
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
  };
}

interface AnalysisIssue {
  type: 'error' | 'warning' | 'success';
  field: string;
  message: string;
}

// Helper to calculate score from issues
function calculateScore(issues: AnalysisIssue[]): number {
  const errorCount = issues?.filter(i => i.type === 'error').length || 0;
  const warningCount = issues?.filter(i => i.type === 'warning').length || 0;
  return Math.max(0, 100 - (errorCount * 20) - (warningCount * 10));
}

// Helper to upsert a single URL analysis
// If URL exists for client, update and add to history. Otherwise create new.
async function upsertAnalysis(
  clientId: string,
  result: ScanResult,
  issues: AnalysisIssue[],
  userId: string,
  plannedTitle?: string,
  plannedDescription?: string
): Promise<{ analysis: unknown; isUpdate: boolean }> {
  const now = new Date();
  const score = calculateScore(issues);

  // Check if this URL already exists for this client
  const existingAnalysis = await MetaTagAnalysis.findOne({
    clientId,
    url: result.url,
  });

  if (existingAnalysis) {
    // URL exists - update it and add to scan history
    const changesDetected =
      existingAnalysis.title !== result.title ||
      existingAnalysis.description !== result.description;

    const historyEntry = {
      scannedAt: now,
      scannedBy: userId,
      score: existingAnalysis.score,
      previousTitle: existingAnalysis.title,
      previousDescription: existingAnalysis.description,
      changesDetected,
    };

    const updatedAnalysis = await MetaTagAnalysis.findByIdAndUpdate(
      existingAnalysis._id,
      {
        $set: {
          title: result.title || '',
          description: result.description || '',
          canonical: result.canonical,
          robots: result.robots,
          openGraph: result.openGraph,
          twitter: result.twitter,
          issues,
          score,
          lastScannedAt: now,
          lastScannedBy: userId,
          // Update planned values if provided
          ...(plannedTitle !== undefined && { plannedTitle }),
          ...(plannedDescription !== undefined && { plannedDescription }),
        },
        $push: {
          scanHistory: {
            $each: [historyEntry],
            $slice: -50, // Keep last 50 scans
          },
        },
        $inc: { scanCount: 1 },
      },
      { new: true }
    );

    return { analysis: updatedAnalysis, isUpdate: true };
  }

  // URL doesn't exist - create new record
  const newAnalysis = await MetaTagAnalysis.create({
    clientId,
    url: result.url,
    title: result.title || '',
    description: result.description || '',
    canonical: result.canonical,
    robots: result.robots,
    openGraph: result.openGraph,
    twitter: result.twitter,
    issues,
    plannedTitle,
    plannedDescription,
    score,
    analyzedBy: userId,
    analyzedAt: now,
    scanCount: 1,
    lastScannedAt: now,
    lastScannedBy: userId,
    scanHistory: [],
  });

  return { analysis: newAnalysis, isUpdate: false };
}

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

// POST - Save analysis (single or bulk) with intelligent upsert
// If a URL already exists for the client, it updates and adds to history
// Otherwise creates a new record
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

    // Bulk save mode - upsert each URL
    if (bulk && results && Array.isArray(results)) {
      const validResults = results.filter(
        (r: { result?: ScanResult; error?: string }) => r.result && !r.error
      );

      if (validResults.length === 0) {
        return NextResponse.json(
          { error: 'No valid results to save' },
          { status: 400 }
        );
      }

      let created = 0;
      let updated = 0;

      // Process each URL with upsert logic
      for (const r of validResults) {
        const { isUpdate } = await upsertAnalysis(
          clientId,
          r.result as ScanResult,
          r.issues || [],
          session.user.id
        );
        if (isUpdate) {
          updated++;
        } else {
          created++;
        }
      }

      return NextResponse.json(
        {
          saved: validResults.length,
          created,
          updated,
          message: updated > 0
            ? `${created} new URLs saved, ${updated} existing URLs updated`
            : `${created} URLs saved`
        },
        { status: 201 }
      );
    }

    // Single save mode - upsert the URL
    if (!result) {
      return NextResponse.json(
        { error: 'result is required' },
        { status: 400 }
      );
    }

    const { analysis, isUpdate } = await upsertAnalysis(
      clientId,
      result,
      issues || [],
      session.user.id,
      plannedTitle,
      plannedDescription
    );

    return NextResponse.json(
      {
        ...JSON.parse(JSON.stringify(analysis)),
        isUpdate,
        message: isUpdate ? 'URL updated with new scan' : 'New URL saved'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to save analysis:', error);
    return NextResponse.json(
      { error: 'Failed to save analysis' },
      { status: 500 }
    );
  }
}
