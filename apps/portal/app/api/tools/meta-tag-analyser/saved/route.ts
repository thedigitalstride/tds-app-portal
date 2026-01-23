import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, MetaTagAnalysis } from '@tds/database';
import { calculateScore } from '@/app/tools/meta-tag-analyser/lib/scoring';

export const dynamic = 'force-dynamic';

interface HreflangEntry {
  lang: string;
  url: string;
}

// Extended Open Graph interfaces
interface OpenGraphImage {
  alt?: string;
  width?: number;
  height?: number;
  type?: string;
}

interface OpenGraphArticle {
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

// Extended Twitter interfaces
interface TwitterPlayer {
  url?: string;
  width?: number;
  height?: number;
}

interface TwitterApp {
  nameIphone?: string;
  idIphone?: string;
  urlIphone?: string;
  nameAndroid?: string;
  idAndroid?: string;
  urlAndroid?: string;
}

// Structured Data interface
interface StructuredData {
  found: boolean;
  isValidJson: boolean;
  types: string[];
  validationErrors: string[];
}

// Technical SEO interfaces
interface RobotsDirectives {
  index?: boolean;
  follow?: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  maxSnippet?: number;
  maxImagePreview?: string;
  maxVideoPreview?: number;
}

interface TechnicalSeo {
  robotsDirectives?: RobotsDirectives;
  prevUrl?: string;
  nextUrl?: string;
  keywords?: string;
  generator?: string;
}

// Site Verification interface
interface SiteVerification {
  google?: string;
  bing?: string;
  pinterest?: string;
  facebook?: string;
  yandex?: string;
}

// Mobile/PWA interfaces
interface AppleTouchIcon {
  href: string;
  sizes?: string;
}

interface Mobile {
  appleWebAppCapable?: string;
  appleWebAppStatusBarStyle?: string;
  appleWebAppTitle?: string;
  appleTouchIcons?: AppleTouchIcon[];
  manifest?: string;
  formatDetection?: string;
}

// Security interface
interface Security {
  referrerPolicy?: string;
  contentSecurityPolicy?: string;
  xUaCompatible?: string;
}

// Image Validation interface
interface ImageValidation {
  url: string;
  exists: boolean;
  statusCode?: number;
  contentType?: string;
  error?: string;
}

interface ScanResult {
  url: string;
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  // Additional meta tags
  viewport?: string;
  charset?: string;
  author?: string;
  themeColor?: string;
  language?: string;
  favicon?: string;
  hreflang?: HreflangEntry[];
  // Social tags
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
    imageDetails?: OpenGraphImage;
    locale?: string;
    localeAlternate?: string[];
    article?: OpenGraphArticle;
    fbAppId?: string;
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
    creator?: string;
    imageAlt?: string;
    player?: TwitterPlayer;
    app?: TwitterApp;
  };
  // New categories
  structuredData?: StructuredData;
  technicalSeo?: TechnicalSeo;
  siteVerification?: SiteVerification;
  mobile?: Mobile;
  security?: Security;
  imageValidation?: {
    ogImage?: ImageValidation;
    twitterImage?: ImageValidation;
  };
}

interface AnalysisIssue {
  type: 'error' | 'warning' | 'success';
  field: string;
  message: string;
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
  // Use new severity-based scoring algorithm
  const { score, categoryScores } = calculateScore(result, issues);

  // Check if this URL already exists for this client
  const existingAnalysis = await MetaTagAnalysis.findOne({
    clientId,
    url: result.url,
  });

  if (existingAnalysis) {
    // URL exists - update it and add to scan history
    const changesDetected =
      existingAnalysis.title !== result.title ||
      existingAnalysis.description !== result.description ||
      existingAnalysis.canonical !== result.canonical ||
      existingAnalysis.openGraph?.image !== result.openGraph?.image;

    // Create full snapshot of current state before updating
    const historyEntry = {
      scannedAt: now,
      scannedBy: userId,
      score: existingAnalysis.score,
      categoryScores: existingAnalysis.categoryScores,
      changesDetected,
      // Full snapshot of all fields at this point in time
      snapshot: {
        title: existingAnalysis.title || '',
        description: existingAnalysis.description || '',
        canonical: existingAnalysis.canonical,
        robots: existingAnalysis.robots,
        // Additional meta tags
        viewport: existingAnalysis.viewport,
        charset: existingAnalysis.charset,
        author: existingAnalysis.author,
        themeColor: existingAnalysis.themeColor,
        language: existingAnalysis.language,
        favicon: existingAnalysis.favicon,
        hreflang: existingAnalysis.hreflang,
        // Social tags
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
        // New categories
        structuredData: existingAnalysis.structuredData,
        technicalSeo: existingAnalysis.technicalSeo,
        siteVerification: existingAnalysis.siteVerification,
        mobile: existingAnalysis.mobile,
        security: existingAnalysis.security,
        imageValidation: existingAnalysis.imageValidation,
        issues: existingAnalysis.issues || [],
      },
      // Legacy fields for backwards compatibility
      previousTitle: existingAnalysis.title,
      previousDescription: existingAnalysis.description,
    };

    const updatedAnalysis = await MetaTagAnalysis.findByIdAndUpdate(
      existingAnalysis._id,
      {
        $set: {
          title: result.title || '',
          description: result.description || '',
          canonical: result.canonical,
          robots: result.robots,
          // Additional meta tags
          viewport: result.viewport,
          charset: result.charset,
          author: result.author,
          themeColor: result.themeColor,
          language: result.language,
          favicon: result.favicon,
          hreflang: result.hreflang,
          // Social tags
          openGraph: result.openGraph,
          twitter: result.twitter,
          // New categories
          structuredData: result.structuredData,
          technicalSeo: result.technicalSeo,
          siteVerification: result.siteVerification,
          mobile: result.mobile,
          security: result.security,
          imageValidation: result.imageValidation,
          issues,
          score,
          categoryScores,
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
    // Additional meta tags
    viewport: result.viewport,
    charset: result.charset,
    author: result.author,
    themeColor: result.themeColor,
    language: result.language,
    favicon: result.favicon,
    hreflang: result.hreflang,
    // Social tags
    openGraph: result.openGraph,
    twitter: result.twitter,
    // New categories
    structuredData: result.structuredData,
    technicalSeo: result.technicalSeo,
    siteVerification: result.siteVerification,
    mobile: result.mobile,
    security: result.security,
    imageValidation: result.imageValidation,
    issues,
    plannedTitle,
    plannedDescription,
    score,
    categoryScores,
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
    const session = await getServerSession();
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
      .populate('scanHistory.scannedBy', 'name email')
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
    const session = await getServerSession();
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

// DELETE - Bulk delete analyses
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, ids } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Delete all analyses matching the IDs and clientId (security check)
    const result = await MetaTagAnalysis.deleteMany({
      _id: { $in: ids },
      clientId,
    });

    return NextResponse.json({
      deleted: result.deletedCount,
      message: `${result.deletedCount} URL${result.deletedCount !== 1 ? 's' : ''} deleted`,
    });
  } catch (error) {
    console.error('Failed to delete analyses:', error);
    return NextResponse.json(
      { error: 'Failed to delete analyses' },
      { status: 500 }
    );
  }
}
