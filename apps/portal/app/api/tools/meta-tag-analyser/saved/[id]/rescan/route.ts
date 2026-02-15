import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, MetaTagAnalysis } from '@tds/database';
import { calculateScore } from '@/app/tools/meta-tag-analyser/lib/scoring';
import { getPage } from '@/lib/services/page-store-service';
import { parseAllMetaTags } from '@/app/api/tools/meta-tag-analyser/lib/parse-html';
import { analyzeMetaTags } from '@/app/api/tools/meta-tag-analyser/lib/analyze';

export const dynamic = 'force-dynamic';

// POST - Rescan a saved analysis
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    // Find the existing analysis
    const existingAnalysis = await MetaTagAnalysis.findById(id);
    if (!existingAnalysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Store previous values for history
    const previousTitle = existingAnalysis.title;
    const previousDescription = existingAnalysis.description;
    const previousScore = existingAnalysis.score;

    // Use Page Store to get fresh content - this is the ONLY place pages should be fetched
    if (!existingAnalysis.clientId) {
      return NextResponse.json(
        { error: 'Cannot rescan: analysis has no associated client' },
        { status: 400 }
      );
    }

    let html: string;
    let snapshotId: string;

    try {
      const pageResult = await getPage({
        url: existingAnalysis.url,
        clientId: existingAnalysis.clientId.toString(),
        userId: session.user.id,
        toolId: 'meta-tag-analyser',
        forceRefresh: true,
        skipScreenshots: true,
      });
      html = pageResult.html;
      snapshotId = pageResult.snapshot._id.toString();
    } catch (pageError) {
      return NextResponse.json(
        { error: pageError instanceof Error ? pageError.message : 'Failed to fetch URL' },
        { status: 400 }
      );
    }

    // Parse all meta tags using shared library
    const result = await parseAllMetaTags(html, existingAnalysis.url);

    // Run comprehensive analysis
    const issues = analyzeMetaTags(result);

    // Calculate new score — pass imageValidation so broken images are not counted as "present"
    const { score: newScore, categoryScores: newCategoryScores } = calculateScore(result, issues, result.imageValidation);

    // Detect if changes were made
    const changesDetected =
      previousTitle !== result.title ||
      previousDescription !== result.description ||
      existingAnalysis.canonical !== result.canonical ||
      existingAnalysis.openGraph?.image !== result.openGraph?.image;

    // Add to scan history with full snapshot
    const historyEntry = {
      scannedAt: new Date(),
      scannedBy: session.user.id,
      pageSnapshotId: snapshotId,
      score: previousScore,
      categoryScores: existingAnalysis.categoryScores,
      changesDetected,
      snapshot: {
        title: existingAnalysis.title || '',
        description: existingAnalysis.description || '',
        canonical: existingAnalysis.canonical,
        robots: existingAnalysis.robots,
        viewport: existingAnalysis.viewport,
        charset: existingAnalysis.charset,
        author: existingAnalysis.author,
        themeColor: existingAnalysis.themeColor,
        language: existingAnalysis.language,
        favicon: existingAnalysis.favicon,
        hreflang: existingAnalysis.hreflang,
        openGraph: existingAnalysis.openGraph ? {
          title: existingAnalysis.openGraph.title,
          description: existingAnalysis.openGraph.description,
          image: existingAnalysis.openGraph.image,
          url: existingAnalysis.openGraph.url,
          type: existingAnalysis.openGraph.type,
          siteName: existingAnalysis.openGraph.siteName,
          imageDetails: existingAnalysis.openGraph.imageDetails,
          locale: existingAnalysis.openGraph.locale,
          localeAlternate: existingAnalysis.openGraph.localeAlternate,
          article: existingAnalysis.openGraph.article,
          fbAppId: existingAnalysis.openGraph.fbAppId,
        } : undefined,
        twitter: existingAnalysis.twitter ? {
          card: existingAnalysis.twitter.card,
          title: existingAnalysis.twitter.title,
          description: existingAnalysis.twitter.description,
          image: existingAnalysis.twitter.image,
          site: existingAnalysis.twitter.site,
          creator: existingAnalysis.twitter.creator,
          imageAlt: existingAnalysis.twitter.imageAlt,
          player: existingAnalysis.twitter.player,
          app: existingAnalysis.twitter.app,
        } : undefined,
        structuredData: existingAnalysis.structuredData,
        technicalSeo: existingAnalysis.technicalSeo,
        siteVerification: existingAnalysis.siteVerification,
        mobile: existingAnalysis.mobile,
        security: existingAnalysis.security,
        imageValidation: existingAnalysis.imageValidation,
        issues: existingAnalysis.issues || [],
      },
      previousTitle,
      previousDescription,
    };

    // Update the analysis with new data
    const updatedAnalysis = await MetaTagAnalysis.findByIdAndUpdate(
      id,
      {
        $set: {
          title: result.title,
          description: result.description,
          canonical: result.canonical,
          robots: result.robots,
          viewport: result.viewport,
          charset: result.charset,
          author: result.author,
          themeColor: result.themeColor,
          language: result.language,
          favicon: result.favicon,
          hreflang: result.hreflang,
          openGraph: result.openGraph,
          twitter: result.twitter,
          structuredData: result.structuredData,
          technicalSeo: result.technicalSeo,
          siteVerification: result.siteVerification,
          mobile: result.mobile,
          security: result.security,
          imageValidation: result.imageValidation,
          issues,
          score: newScore,
          categoryScores: newCategoryScores,
          lastScannedAt: new Date(),
          lastScannedBy: session.user.id,
          analyzedSnapshotId: snapshotId,
          currentSnapshotId: snapshotId,
        },
        $push: {
          scanHistory: {
            $each: [historyEntry],
            $slice: -50,
          },
        },
        $inc: { scanCount: 1 },
      },
      { new: true }
    ).populate('lastScannedBy', 'name email');

    return NextResponse.json({
      analysis: updatedAnalysis,
      changesDetected,
      previousTitle,
      previousDescription,
      previousScore,
    });
  } catch (error) {
    console.error('Rescan error:', error);
    return NextResponse.json(
      { error: 'Failed to rescan URL' },
      { status: 500 }
    );
  }
}
