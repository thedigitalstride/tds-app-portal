import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { connectDB, PendingScan, MetaTagAnalysis } from '@tds/database';
import { calculateScore } from '@/app/tools/meta-tag-analyser/lib/scoring';

export const dynamic = 'force-dynamic';

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
  errors: string[];
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

interface MetaTagResult {
  url: string;
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  viewport?: string;
  charset?: string;
  author?: string;
  themeColor?: string;
  language?: string;
  favicon?: string;
  hreflang?: Array<{ lang: string; url: string }>;
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
  message: string;
  field: string;
}

// Decode HTML entities in scraped text
function decodeHtmlEntities(text: string): string {
  if (!text) return text;

  const namedEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&nbsp;': ' ',
    '&ndash;': '\u2013',
    '&mdash;': '\u2014',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&ldquo;': '\u201C',
    '&rdquo;': '\u201D',
    '&hellip;': '\u2026',
    '&copy;': '\u00A9',
    '&reg;': '\u00AE',
    '&trade;': '\u2122',
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(namedEntities)) {
    decoded = decoded.split(entity).join(char);
  }

  decoded = decoded.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  return decoded;
}

// Helper to get all values for a meta tag
function getAllMetaContent(html: string, name: string): string[] {
  const values: string[] = [];
  const regex = new RegExp(
    `<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`,
    'gi'
  );
  let match;
  while ((match = regex.exec(html)) !== null) {
    const value = match[1] || match[2];
    if (value) values.push(decodeHtmlEntities(value));
  }
  return values;
}

// Extract JSON-LD structured data
function extractStructuredData(html: string): StructuredData {
  const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const types: string[] = [];
  const errors: string[] = [];
  let isValidJson = true;

  scripts.forEach((script) => {
    const content = script.replace(/<script[^>]*>|<\/script>/gi, '').trim();
    try {
      const json = JSON.parse(content);
      if (json['@type']) types.push(json['@type']);
      if (Array.isArray(json['@graph'])) {
        json['@graph'].forEach((item: { '@type'?: string }) => {
          if (item['@type']) types.push(item['@type']);
        });
      }
    } catch (e) {
      isValidJson = false;
      errors.push(e instanceof Error ? e.message : 'Invalid JSON');
    }
  });

  return {
    found: scripts.length > 0,
    isValidJson: scripts.length === 0 || isValidJson,
    types: [...new Set(types)],
    errors,
  };
}

// Parse robots meta tag into individual directives
function parseRobotsDirectives(robotsContent: string): RobotsDirectives | undefined {
  if (!robotsContent) return undefined;

  const directives: RobotsDirectives = {};
  const lower = robotsContent.toLowerCase();

  if (lower.includes('noindex')) directives.index = false;
  else if (lower.includes('index')) directives.index = true;

  if (lower.includes('nofollow')) directives.follow = false;
  else if (lower.includes('follow')) directives.follow = true;

  if (lower.includes('noarchive')) directives.noarchive = true;
  if (lower.includes('nosnippet')) directives.nosnippet = true;

  const maxSnippetMatch = robotsContent.match(/max-snippet:\s*(-?\d+)/i);
  if (maxSnippetMatch) directives.maxSnippet = parseInt(maxSnippetMatch[1], 10);

  const maxImageMatch = robotsContent.match(/max-image-preview:\s*(\w+)/i);
  if (maxImageMatch) directives.maxImagePreview = maxImageMatch[1];

  return Object.keys(directives).length > 0 ? directives : undefined;
}

// Validate an image URL with GET fallback
async function validateImageUrl(imageUrl: string): Promise<ImageValidation> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Try HEAD first (faster, no body download)
    let response = await fetch(imageUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'TDS Meta Tag Analyser/1.0' },
    });

    // Fallback to GET if HEAD returns 404 or 405 (Method Not Allowed)
    // Many CDNs and image services don't support HEAD requests properly
    if (response.status === 404 || response.status === 405) {
      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), 5000);

      response = await fetch(imageUrl, {
        method: 'GET',
        signal: getController.signal,
        headers: { 'User-Agent': 'TDS Meta Tag Analyser/1.0' },
      });

      clearTimeout(getTimeoutId);
    }

    clearTimeout(timeoutId);

    return {
      url: imageUrl,
      exists: response.ok,
      statusCode: response.status,
      contentType: response.headers.get('content-type') || undefined,
    };
  } catch (e) {
    return {
      url: imageUrl,
      exists: false,
      error: e instanceof Error ? e.message : 'Failed to validate',
    };
  }
}

// Check if object has any values
const hasValue = <T extends object>(obj: T): boolean =>
  Object.values(obj).some(v => v !== undefined);

// Analyze a single URL
async function analyzeUrl(url: string): Promise<{ result: MetaTagResult; issues: AnalysisIssue[] }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'TDS Meta Tag Analyser/1.0',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const html = await response.text();

  const getMetaContent = (name: string): string => {
    const nameMatch = html.match(
      new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i')
    ) || html.match(
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i')
    );
    if (nameMatch) return decodeHtmlEntities(nameMatch[1]);

    const propMatch = html.match(
      new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i')
    ) || html.match(
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${name}["']`, 'i')
    );
    return propMatch ? decodeHtmlEntities(propMatch[1]) : '';
  };

  const getTitle = (): string => {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '';
  };

  const getCanonical = (): string => {
    const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) ||
      html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
    return match ? match[1] : '';
  };

  const getCharset = (): string => {
    const charsetMatch = html.match(/<meta[^>]*charset=["']([^"']*)["']/i);
    if (charsetMatch) return charsetMatch[1];
    const httpEquivMatch = html.match(/<meta[^>]*http-equiv=["']Content-Type["'][^>]*content=["'][^"']*charset=([^"'\s;]+)/i);
    return httpEquivMatch ? httpEquivMatch[1] : '';
  };

  const getLanguage = (): string => {
    const match = html.match(/<html[^>]*lang=["']([^"']*)["']/i);
    return match ? match[1] : '';
  };

  const getFavicon = (): string => {
    const iconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']*)["']/i) ||
      html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:icon|shortcut icon)["']/i);
    return iconMatch ? iconMatch[1] : '';
  };

  const getHreflang = (): Array<{ lang: string; url: string }> => {
    const entries: Array<{ lang: string; url: string }> = [];
    const regex = /<link[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']*)["'][^>]*href=["']([^"']*)["']/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      entries.push({ lang: match[1], url: match[2] });
    }
    return entries;
  };

  const getPrevUrl = (): string => {
    const match = html.match(/<link[^>]*rel=["']prev["'][^>]*href=["']([^"']*)["']/i);
    return match ? match[1] : '';
  };

  const getNextUrl = (): string => {
    const match = html.match(/<link[^>]*rel=["']next["'][^>]*href=["']([^"']*)["']/i);
    return match ? match[1] : '';
  };

  const getManifest = (): string => {
    const match = html.match(/<link[^>]*rel=["']manifest["'][^>]*href=["']([^"']*)["']/i);
    return match ? match[1] : '';
  };

  const getAppleTouchIcons = (): AppleTouchIcon[] => {
    const icons: AppleTouchIcon[] = [];
    const regex = /<link[^>]*rel=["']apple-touch-icon[^"']*["'][^>]*href=["']([^"']*)["'](?:[^>]*sizes=["']([^"']*)["'])?/gi;
    let iconMatch;
    while ((iconMatch = regex.exec(html)) !== null) {
      icons.push({ href: iconMatch[1], sizes: iconMatch[2] || undefined });
    }
    return icons;
  };

  const robotsContent = getMetaContent('robots');
  const ogImage = getMetaContent('og:image');
  const twitterImage = getMetaContent('twitter:image');
  const hreflangEntries = getHreflang();

  // Validate images in parallel
  const [ogImageValidation, twitterImageValidation] = await Promise.all([
    ogImage ? validateImageUrl(ogImage) : Promise.resolve(undefined),
    twitterImage && twitterImage !== ogImage ? validateImageUrl(twitterImage) : Promise.resolve(undefined),
  ]);

  // Build extended data
  const structuredData = extractStructuredData(html);

  const ogImageWidth = getMetaContent('og:image:width');
  const ogImageHeight = getMetaContent('og:image:height');
  const ogImageDetails: OpenGraphImage | undefined = (
    getMetaContent('og:image:alt') || ogImageWidth || ogImageHeight
  ) ? {
    alt: getMetaContent('og:image:alt') || undefined,
    width: ogImageWidth ? parseInt(ogImageWidth, 10) : undefined,
    height: ogImageHeight ? parseInt(ogImageHeight, 10) : undefined,
    type: getMetaContent('og:image:type') || undefined,
  } : undefined;

  const articleTags = getAllMetaContent(html, 'og:article:tag');
  const ogArticle: OpenGraphArticle | undefined = (
    getMetaContent('og:article:published_time') || getMetaContent('og:article:author')
  ) ? {
    publishedTime: getMetaContent('og:article:published_time') || undefined,
    modifiedTime: getMetaContent('og:article:modified_time') || undefined,
    author: getMetaContent('og:article:author') || undefined,
    section: getMetaContent('og:article:section') || undefined,
    tags: articleTags.length > 0 ? articleTags : undefined,
  } : undefined;

  const twitterPlayerUrl = getMetaContent('twitter:player');
  const twitterPlayer: TwitterPlayer | undefined = twitterPlayerUrl ? {
    url: twitterPlayerUrl,
    width: parseInt(getMetaContent('twitter:player:width'), 10) || undefined,
    height: parseInt(getMetaContent('twitter:player:height'), 10) || undefined,
  } : undefined;

  const technicalSeo: TechnicalSeo = {
    robotsDirectives: parseRobotsDirectives(robotsContent),
    prevUrl: getPrevUrl() || undefined,
    nextUrl: getNextUrl() || undefined,
    keywords: getMetaContent('keywords') || undefined,
    generator: getMetaContent('generator') || undefined,
  };

  const siteVerification: SiteVerification = {
    google: getMetaContent('google-site-verification') || undefined,
    bing: getMetaContent('msvalidate.01') || undefined,
    pinterest: getMetaContent('p:domain_verify') || undefined,
    facebook: getMetaContent('facebook-domain-verification') || undefined,
    yandex: getMetaContent('yandex-verification') || undefined,
  };

  const appleTouchIcons = getAppleTouchIcons();
  const mobile: Mobile = {
    appleWebAppCapable: getMetaContent('apple-mobile-web-app-capable') || undefined,
    appleWebAppStatusBarStyle: getMetaContent('apple-mobile-web-app-status-bar-style') || undefined,
    appleWebAppTitle: getMetaContent('apple-mobile-web-app-title') || undefined,
    appleTouchIcons: appleTouchIcons.length > 0 ? appleTouchIcons : undefined,
    manifest: getManifest() || undefined,
    formatDetection: getMetaContent('format-detection') || undefined,
  };

  const security: Security = {
    referrerPolicy: getMetaContent('referrer') || undefined,
    contentSecurityPolicy: getMetaContent('content-security-policy') || undefined,
    xUaCompatible: getMetaContent('x-ua-compatible') || undefined,
  };

  const result: MetaTagResult = {
    url,
    title: getTitle(),
    description: getMetaContent('description'),
    canonical: getCanonical(),
    robots: robotsContent,
    viewport: getMetaContent('viewport'),
    charset: getCharset(),
    author: getMetaContent('author'),
    themeColor: getMetaContent('theme-color'),
    language: getLanguage(),
    favicon: getFavicon(),
    hreflang: hreflangEntries.length > 0 ? hreflangEntries : undefined,
    openGraph: {
      title: getMetaContent('og:title'),
      description: getMetaContent('og:description'),
      image: ogImage,
      url: getMetaContent('og:url'),
      type: getMetaContent('og:type'),
      siteName: getMetaContent('og:site_name'),
      imageDetails: ogImageDetails,
      locale: getMetaContent('og:locale') || undefined,
      localeAlternate: getAllMetaContent(html, 'og:locale:alternate').length > 0
        ? getAllMetaContent(html, 'og:locale:alternate') : undefined,
      article: ogArticle,
      fbAppId: getMetaContent('fb:app_id') || undefined,
    },
    twitter: {
      card: getMetaContent('twitter:card'),
      title: getMetaContent('twitter:title'),
      description: getMetaContent('twitter:description'),
      image: twitterImage,
      site: getMetaContent('twitter:site'),
      creator: getMetaContent('twitter:creator') || undefined,
      imageAlt: getMetaContent('twitter:image:alt') || undefined,
      player: twitterPlayer,
    },
    structuredData: structuredData.found ? structuredData : undefined,
    technicalSeo: hasValue(technicalSeo) ? technicalSeo : undefined,
    siteVerification: hasValue(siteVerification) ? siteVerification : undefined,
    mobile: hasValue(mobile) ? mobile : undefined,
    security: hasValue(security) ? security : undefined,
    imageValidation: (ogImageValidation || twitterImageValidation) ? {
      ogImage: ogImageValidation,
      twitterImage: twitterImageValidation,
    } : undefined,
  };

  // Analyze for issues
  const issues: AnalysisIssue[] = [];

  if (!result.title) {
    issues.push({ type: 'error', field: 'Title', message: 'Missing title tag' });
  } else if (result.title.length > 60) {
    issues.push({ type: 'warning', field: 'Title', message: `Title too long (${result.title.length}/60)` });
  } else if (result.title.length < 30) {
    issues.push({ type: 'warning', field: 'Title', message: `Title too short (${result.title.length}/60)` });
  }

  if (!result.description) {
    issues.push({ type: 'error', field: 'Description', message: 'Missing meta description' });
  } else if (result.description.length > 160) {
    issues.push({ type: 'warning', field: 'Description', message: `Description too long (${result.description.length}/160)` });
  } else if (result.description.length < 70) {
    issues.push({ type: 'warning', field: 'Description', message: `Description too short (${result.description.length}/160)` });
  }

  if (!result.openGraph.title && !result.openGraph.description) {
    issues.push({ type: 'warning', field: 'Open Graph', message: 'Missing OG tags' });
  }

  if (!result.openGraph.image) {
    issues.push({ type: 'warning', field: 'OG Image', message: 'Missing OG image' });
  }

  return { result, issues };
}

// Upsert analysis result
async function upsertAnalysis(
  clientId: string,
  result: MetaTagResult,
  issues: AnalysisIssue[],
  userId: string
): Promise<{ isUpdate: boolean; score: number }> {
  const now = new Date();
  // Use new severity-based scoring algorithm
  const { score, categoryScores } = calculateScore(result, issues);

  const existingAnalysis = await MetaTagAnalysis.findOne({
    clientId,
    url: result.url,
  });

  if (existingAnalysis) {
    const changesDetected =
      existingAnalysis.title !== result.title ||
      existingAnalysis.description !== result.description ||
      existingAnalysis.canonical !== result.canonical ||
      existingAnalysis.openGraph?.image !== result.openGraph?.image;

    const historyEntry = {
      scannedAt: now,
      scannedBy: userId,
      score: existingAnalysis.score,
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
        openGraph: existingAnalysis.openGraph,
        twitter: existingAnalysis.twitter,
        structuredData: existingAnalysis.structuredData,
        technicalSeo: existingAnalysis.technicalSeo,
        siteVerification: existingAnalysis.siteVerification,
        mobile: existingAnalysis.mobile,
        security: existingAnalysis.security,
        imageValidation: existingAnalysis.imageValidation,
        issues: existingAnalysis.issues || [],
      },
      previousTitle: existingAnalysis.title,
      previousDescription: existingAnalysis.description,
    };

    await MetaTagAnalysis.findByIdAndUpdate(
      existingAnalysis._id,
      {
        $set: {
          title: result.title || '',
          description: result.description || '',
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
          score,
          categoryScores,
          lastScannedAt: now,
          lastScannedBy: userId,
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
    );

    return { isUpdate: true, score };
  }

  await MetaTagAnalysis.create({
    clientId,
    url: result.url,
    title: result.title || '',
    description: result.description || '',
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
    score,
    categoryScores,
    analyzedBy: userId,
    analyzedAt: now,
    scanCount: 1,
    lastScannedAt: now,
    lastScannedBy: userId,
    scanHistory: [],
  });

  return { isUpdate: false, score };
}

const MAX_RETRIES = 3;
const BATCH_SIZE = 10;

// POST - Process pending URLs in the queue
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    await connectDB();

    // Get pending URLs for this client
    const pendingUrls = await PendingScan.find({
      clientId,
      status: { $in: ['pending', 'failed'] },
      retryCount: { $lt: MAX_RETRIES },
    })
      .sort({ submittedAt: 1 })
      .limit(BATCH_SIZE);

    if (pendingUrls.length === 0) {
      // Get counts for response
      const remaining = await PendingScan.countDocuments({
        clientId,
        status: { $in: ['pending', 'failed'] },
        retryCount: { $lt: MAX_RETRIES },
      });

      return NextResponse.json({
        processed: 0,
        remaining,
        completed: [],
        failed: [],
      });
    }

    // Mark as processing
    const urlIds = pendingUrls.map(u => u._id);
    await PendingScan.updateMany(
      { _id: { $in: urlIds } },
      { $set: { status: 'processing' } }
    );

    const completed: { url: string; score: number }[] = [];
    const failed: { url: string; error: string }[] = [];

    for (const pendingUrl of pendingUrls) {
      try {
        const { result, issues } = await analyzeUrl(pendingUrl.url);

        // Auto-save to MetaTagAnalysis (score is calculated by upsertAnalysis)
        const { score } = await upsertAnalysis(clientId, result, issues, session.user.id);

        // Mark as completed
        await PendingScan.findByIdAndUpdate(pendingUrl._id, {
          $set: {
            status: 'completed',
            processedAt: new Date(),
          },
        });

        completed.push({ url: pendingUrl.url, score });

        // Small delay to be respectful to servers
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to analyze';
        const newRetryCount = pendingUrl.retryCount + 1;

        // Mark as failed with retry count
        await PendingScan.findByIdAndUpdate(pendingUrl._id, {
          $set: {
            status: newRetryCount >= MAX_RETRIES ? 'failed' : 'pending',
            error: errorMessage,
            processedAt: new Date(),
          },
          $inc: { retryCount: 1 },
        });

        failed.push({ url: pendingUrl.url, error: errorMessage });
      }
    }

    // Get remaining count
    const remaining = await PendingScan.countDocuments({
      clientId,
      status: { $in: ['pending', 'failed'] },
      retryCount: { $lt: MAX_RETRIES },
    });

    return NextResponse.json({
      processed: completed.length + failed.length,
      remaining,
      completed,
      failed,
    });
  } catch (error) {
    console.error('Process queue error:', error);
    return NextResponse.json(
      { error: 'Failed to process queue' },
      { status: 500 }
    );
  }
}
