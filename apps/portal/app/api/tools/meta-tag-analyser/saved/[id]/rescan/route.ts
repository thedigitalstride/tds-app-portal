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

interface MetaTagResult {
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

  // Map of common named entities
  const namedEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&nbsp;': ' ',
    '&ndash;': '\u2013', // en dash
    '&mdash;': '\u2014', // em dash
    '&lsquo;': '\u2018', // left single quote
    '&rsquo;': '\u2019', // right single quote
    '&ldquo;': '\u201C', // left double quote
    '&rdquo;': '\u201D', // right double quote
    '&hellip;': '\u2026', // ellipsis
    '&copy;': '\u00A9', // copyright
    '&reg;': '\u00AE', // registered
    '&trade;': '\u2122', // trademark
  };

  // First, replace named entities
  let decoded = text;
  for (const [entity, char] of Object.entries(namedEntities)) {
    decoded = decoded.split(entity).join(char);
  }

  // Decode numeric entities (decimal: &#39; and hex: &#x27;)
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
  const validationErrors: string[] = [];
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
      validationErrors.push(e instanceof Error ? e.message : 'Invalid JSON');
    }
  });

  return {
    found: scripts.length > 0,
    isValidJson: scripts.length === 0 || isValidJson,
    types: [...new Set(types)],
    validationErrors,
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

function analyzeMetaTags(result: MetaTagResult): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  // Title analysis
  if (!result.title) {
    issues.push({
      type: 'error',
      field: 'Title',
      message: 'Page title is missing. This is critical for SEO.',
    });
  } else if (result.title.length < 30) {
    issues.push({
      type: 'warning',
      field: 'Title',
      message: `Title is too short (${result.title.length} chars). Aim for 50-60 characters.`,
    });
  } else if (result.title.length > 60) {
    issues.push({
      type: 'warning',
      field: 'Title',
      message: `Title is too long (${result.title.length} chars). It may be truncated in search results.`,
    });
  } else {
    issues.push({
      type: 'success',
      field: 'Title',
      message: `Title length is optimal (${result.title.length} chars).`,
    });
  }

  // Description analysis
  if (!result.description) {
    issues.push({
      type: 'error',
      field: 'Description',
      message: 'Meta description is missing. This is important for SEO and click-through rates.',
    });
  } else if (result.description.length < 70) {
    issues.push({
      type: 'warning',
      field: 'Description',
      message: `Description is too short (${result.description.length} chars). Aim for 120-160 characters.`,
    });
  } else if (result.description.length > 160) {
    issues.push({
      type: 'warning',
      field: 'Description',
      message: `Description is too long (${result.description.length} chars). It may be truncated in search results.`,
    });
  } else {
    issues.push({
      type: 'success',
      field: 'Description',
      message: `Description length is optimal (${result.description.length} chars).`,
    });
  }

  // Canonical URL
  if (!result.canonical) {
    issues.push({
      type: 'warning',
      field: 'Canonical',
      message: 'No canonical URL specified. Consider adding one to prevent duplicate content issues.',
    });
  }

  // Open Graph
  if (!result.openGraph.title && !result.openGraph.description) {
    issues.push({
      type: 'warning',
      field: 'Open Graph',
      message: 'Open Graph tags are missing. Social sharing previews may not display correctly.',
    });
  }

  if (!result.openGraph.image) {
    issues.push({
      type: 'warning',
      field: 'OG Image',
      message: 'No Open Graph image specified. Social shares will lack a preview image.',
    });
  }

  // Twitter Cards
  if (!result.twitter.card) {
    issues.push({
      type: 'warning',
      field: 'Twitter Card',
      message: 'No Twitter card type specified. Twitter/X previews may not display correctly.',
    });
  }

  // Viewport (critical for mobile)
  if (!result.viewport) {
    issues.push({
      type: 'error',
      field: 'Viewport',
      message: 'No viewport meta tag. Page may not display correctly on mobile devices.',
    });
  } else if (!result.viewport.includes('width=device-width')) {
    issues.push({
      type: 'warning',
      field: 'Viewport',
      message: 'Viewport should include "width=device-width" for proper mobile scaling.',
    });
  } else {
    issues.push({
      type: 'success',
      field: 'Viewport',
      message: 'Viewport is configured for mobile devices.',
    });
  }

  // Charset
  if (!result.charset) {
    issues.push({
      type: 'warning',
      field: 'Charset',
      message: 'No character encoding specified. Consider adding <meta charset="UTF-8">.',
    });
  }

  // Language
  if (!result.language) {
    issues.push({
      type: 'warning',
      field: 'Language',
      message: 'No language attribute on <html> tag. This helps search engines and accessibility.',
    });
  }

  // OG Image Alt
  if (result.openGraph.image && !result.openGraph.imageDetails?.alt) {
    issues.push({
      type: 'warning',
      field: 'OG Image Alt',
      message: 'Open Graph image has no alt text. Add og:image:alt for accessibility.',
    });
  }

  // OG Image Dimensions
  if (result.openGraph.image && (!result.openGraph.imageDetails?.width || !result.openGraph.imageDetails?.height)) {
    issues.push({
      type: 'warning',
      field: 'OG Image Dimensions',
      message: 'Open Graph image dimensions not specified. Add og:image:width and og:image:height.',
    });
  }

  // Twitter Creator
  if (result.twitter.site && !result.twitter.creator) {
    issues.push({
      type: 'warning',
      field: 'Twitter Creator',
      message: 'Twitter site is set but no creator specified. Consider adding twitter:creator.',
    });
  }

  // Twitter Image Alt
  if (result.twitter.image && !result.twitter.imageAlt) {
    issues.push({
      type: 'warning',
      field: 'Twitter Image Alt',
      message: 'Twitter image has no alt text. Add twitter:image:alt for accessibility.',
    });
  }

  // Structured Data
  if (!result.structuredData?.found) {
    issues.push({
      type: 'warning',
      field: 'Structured Data',
      message: 'No JSON-LD structured data found. Consider adding schema.org markup.',
    });
  } else if (!result.structuredData.isValidJson) {
    issues.push({
      type: 'error',
      field: 'Structured Data',
      message: `JSON-LD contains invalid JSON: ${result.structuredData.validationErrors.join(', ')}`,
    });
  } else {
    issues.push({
      type: 'success',
      field: 'Structured Data',
      message: `Found valid JSON-LD with types: ${result.structuredData.types.join(', ') || 'none'}`,
    });
  }

  // Image Validation
  if (result.imageValidation?.ogImage && !result.imageValidation.ogImage.exists) {
    issues.push({
      type: 'error',
      field: 'OG Image',
      message: `Open Graph image is broken (${result.imageValidation.ogImage.statusCode || 'unreachable'}).`,
    });
  }

  if (result.imageValidation?.twitterImage && !result.imageValidation.twitterImage.exists) {
    issues.push({
      type: 'error',
      field: 'Twitter Image',
      message: `Twitter image is broken (${result.imageValidation.twitterImage.statusCode || 'unreachable'}).`,
    });
  }

  // Web Manifest
  if (!result.mobile?.manifest) {
    issues.push({
      type: 'warning',
      field: 'Web Manifest',
      message: 'No web app manifest found. Consider adding one for PWA support.',
    });
  }

  return issues;
}

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

    // Fetch the page again
    const response = await fetch(existingAnalysis.url, {
      headers: {
        'User-Agent': 'TDS Meta Tag Analyser/1.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 400 }
      );
    }

    const html = await response.text();

    // Parse meta tags using regex
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
      const iconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']*)["']/i) ||
        html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i);
      return iconMatch ? iconMatch[1] : '';
    };

    const getHreflang = (): HreflangEntry[] => {
      const entries: HreflangEntry[] = [];
      const hreflangRegex = /<link[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']*)["'][^>]*href=["']([^"']*)["']/gi;
      const hreflangRegex2 = /<link[^>]*hreflang=["']([^"']*)["'][^>]*rel=["']alternate["'][^>]*href=["']([^"']*)["']/gi;
      const hreflangRegex3 = /<link[^>]*href=["']([^"']*)["'][^>]*hreflang=["']([^"']*)["'][^>]*rel=["']alternate["']/gi;

      let match;
      while ((match = hreflangRegex.exec(html)) !== null) {
        entries.push({ lang: match[1], url: match[2] });
      }
      while ((match = hreflangRegex2.exec(html)) !== null) {
        entries.push({ lang: match[1], url: match[2] });
      }
      while ((match = hreflangRegex3.exec(html)) !== null) {
        entries.push({ lang: match[2], url: match[1] });
      }

      // Deduplicate
      const seen = new Set<string>();
      return entries.filter(e => {
        const key = `${e.lang}:${e.url}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const hreflangEntries = getHreflang();

    // Extract robots for directive parsing
    const robotsContent = getMetaContent('robots');

    // Extract structured data
    const structuredData = extractStructuredData(html);

    // Extract OG and Twitter images for validation
    const ogImage = getMetaContent('og:image');
    const twitterImage = getMetaContent('twitter:image');

    // Validate images in parallel
    const [ogImageValidation, twitterImageValidation] = await Promise.all([
      ogImage ? validateImageUrl(ogImage) : Promise.resolve(undefined),
      twitterImage && twitterImage !== ogImage ? validateImageUrl(twitterImage) : Promise.resolve(undefined),
    ]);

    // Extract extended Open Graph image details
    const ogImageDetails: OpenGraphImage = {};
    const ogImageAlt = getMetaContent('og:image:alt');
    const ogImageWidth = getMetaContent('og:image:width');
    const ogImageHeight = getMetaContent('og:image:height');
    const ogImageType = getMetaContent('og:image:type');
    if (ogImageAlt) ogImageDetails.alt = ogImageAlt;
    if (ogImageWidth) ogImageDetails.width = parseInt(ogImageWidth, 10);
    if (ogImageHeight) ogImageDetails.height = parseInt(ogImageHeight, 10);
    if (ogImageType) ogImageDetails.type = ogImageType;

    // Extract Open Graph article metadata
    const ogArticle: OpenGraphArticle = {};
    const articlePublished = getMetaContent('article:published_time') || getMetaContent('og:article:published_time');
    const articleModified = getMetaContent('article:modified_time') || getMetaContent('og:article:modified_time');
    const articleAuthor = getMetaContent('article:author') || getMetaContent('og:article:author');
    const articleSection = getMetaContent('article:section') || getMetaContent('og:article:section');
    const articleTags = getAllMetaContent(html, 'article:tag');
    if (articlePublished) ogArticle.publishedTime = articlePublished;
    if (articleModified) ogArticle.modifiedTime = articleModified;
    if (articleAuthor) ogArticle.author = articleAuthor;
    if (articleSection) ogArticle.section = articleSection;
    if (articleTags.length > 0) ogArticle.tags = articleTags;

    // Extract Twitter player metadata
    const twitterPlayer: TwitterPlayer = {};
    const playerUrl = getMetaContent('twitter:player');
    const playerWidth = getMetaContent('twitter:player:width');
    const playerHeight = getMetaContent('twitter:player:height');
    if (playerUrl) twitterPlayer.url = playerUrl;
    if (playerWidth) twitterPlayer.width = parseInt(playerWidth, 10);
    if (playerHeight) twitterPlayer.height = parseInt(playerHeight, 10);

    // Extract Twitter app metadata
    const twitterApp: TwitterApp = {};
    const appNameIphone = getMetaContent('twitter:app:name:iphone');
    const appIdIphone = getMetaContent('twitter:app:id:iphone');
    const appUrlIphone = getMetaContent('twitter:app:url:iphone');
    const appNameAndroid = getMetaContent('twitter:app:name:googleplay');
    const appIdAndroid = getMetaContent('twitter:app:id:googleplay');
    const appUrlAndroid = getMetaContent('twitter:app:url:googleplay');
    if (appNameIphone) twitterApp.nameIphone = appNameIphone;
    if (appIdIphone) twitterApp.idIphone = appIdIphone;
    if (appUrlIphone) twitterApp.urlIphone = appUrlIphone;
    if (appNameAndroid) twitterApp.nameAndroid = appNameAndroid;
    if (appIdAndroid) twitterApp.idAndroid = appIdAndroid;
    if (appUrlAndroid) twitterApp.urlAndroid = appUrlAndroid;

    // Extract Technical SEO
    const technicalSeo: TechnicalSeo = {};
    const robotsDirectives = parseRobotsDirectives(robotsContent);
    if (robotsDirectives) technicalSeo.robotsDirectives = robotsDirectives;

    const prevMatch = html.match(/<link[^>]*rel=["']prev["'][^>]*href=["']([^"']*)["']/i);
    const nextMatch = html.match(/<link[^>]*rel=["']next["'][^>]*href=["']([^"']*)["']/i);
    if (prevMatch) technicalSeo.prevUrl = prevMatch[1];
    if (nextMatch) technicalSeo.nextUrl = nextMatch[1];

    const keywords = getMetaContent('keywords');
    const generator = getMetaContent('generator');
    if (keywords) technicalSeo.keywords = keywords;
    if (generator) technicalSeo.generator = generator;

    // Extract Site Verification tags
    const siteVerification: SiteVerification = {};
    const googleVerify = getMetaContent('google-site-verification');
    const bingVerify = getMetaContent('msvalidate.01');
    const pinterestVerify = getMetaContent('p:domain_verify');
    const facebookVerify = getMetaContent('facebook-domain-verification');
    const yandexVerify = getMetaContent('yandex-verification');
    if (googleVerify) siteVerification.google = googleVerify;
    if (bingVerify) siteVerification.bing = bingVerify;
    if (pinterestVerify) siteVerification.pinterest = pinterestVerify;
    if (facebookVerify) siteVerification.facebook = facebookVerify;
    if (yandexVerify) siteVerification.yandex = yandexVerify;

    // Extract Mobile/PWA metadata
    const mobile: Mobile = {};
    const appleCapable = getMetaContent('apple-mobile-web-app-capable');
    const appleStatusBar = getMetaContent('apple-mobile-web-app-status-bar-style');
    const appleTitle = getMetaContent('apple-mobile-web-app-title');
    const formatDetection = getMetaContent('format-detection');
    if (appleCapable) mobile.appleWebAppCapable = appleCapable;
    if (appleStatusBar) mobile.appleWebAppStatusBarStyle = appleStatusBar;
    if (appleTitle) mobile.appleWebAppTitle = appleTitle;
    if (formatDetection) mobile.formatDetection = formatDetection;

    // Extract apple-touch-icons
    const appleTouchIcons: AppleTouchIcon[] = [];
    const touchIconRegex = /<link[^>]*rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*>/gi;
    let touchIconMatch;
    while ((touchIconMatch = touchIconRegex.exec(html)) !== null) {
      const hrefMatch = touchIconMatch[0].match(/href=["']([^"']*)["']/i);
      const sizesMatch = touchIconMatch[0].match(/sizes=["']([^"']*)["']/i);
      if (hrefMatch) {
        appleTouchIcons.push({
          href: hrefMatch[1],
          sizes: sizesMatch ? sizesMatch[1] : undefined,
        });
      }
    }
    if (appleTouchIcons.length > 0) mobile.appleTouchIcons = appleTouchIcons;

    // Extract manifest link
    const manifestMatch = html.match(/<link[^>]*rel=["']manifest["'][^>]*href=["']([^"']*)["']/i);
    if (manifestMatch) mobile.manifest = manifestMatch[1];

    // Extract Security meta tags
    const security: Security = {};
    const referrerPolicy = getMetaContent('referrer');
    const csp = getMetaContent('Content-Security-Policy');
    const xUaCompatible = getMetaContent('X-UA-Compatible');
    if (referrerPolicy) security.referrerPolicy = referrerPolicy;
    if (csp) security.contentSecurityPolicy = csp;
    if (xUaCompatible) security.xUaCompatible = xUaCompatible;

    const result: MetaTagResult = {
      url: existingAnalysis.url,
      title: getTitle(),
      description: getMetaContent('description'),
      canonical: getCanonical(),
      robots: robotsContent,
      // Additional meta tags
      viewport: getMetaContent('viewport'),
      charset: getCharset(),
      author: getMetaContent('author'),
      themeColor: getMetaContent('theme-color'),
      language: getLanguage(),
      favicon: getFavicon(),
      hreflang: hreflangEntries.length > 0 ? hreflangEntries : undefined,
      // Social tags
      openGraph: {
        title: getMetaContent('og:title'),
        description: getMetaContent('og:description'),
        image: ogImage,
        url: getMetaContent('og:url'),
        type: getMetaContent('og:type'),
        siteName: getMetaContent('og:site_name'),
        ...(hasValue(ogImageDetails) && { imageDetails: ogImageDetails }),
        locale: getMetaContent('og:locale') || undefined,
        localeAlternate: getAllMetaContent(html, 'og:locale:alternate').length > 0
          ? getAllMetaContent(html, 'og:locale:alternate') : undefined,
        ...(hasValue(ogArticle) && { article: ogArticle }),
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
        ...(hasValue(twitterPlayer) && { player: twitterPlayer }),
        ...(hasValue(twitterApp) && { app: twitterApp }),
      },
      // New categories
      structuredData,
      ...(hasValue(technicalSeo) && { technicalSeo }),
      ...(hasValue(siteVerification) && { siteVerification }),
      ...(hasValue(mobile) && { mobile }),
      ...(hasValue(security) && { security }),
      imageValidation: (ogImageValidation || twitterImageValidation) ? {
        ...(ogImageValidation && { ogImage: ogImageValidation }),
        ...(twitterImageValidation && { twitterImage: twitterImageValidation }),
      } : undefined,
    };

    const issues = analyzeMetaTags(result);

    // Calculate new score using severity-based algorithm
    const { score: newScore, categoryScores: newCategoryScores } = calculateScore(result, issues);

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
      score: previousScore,
      categoryScores: existingAnalysis.categoryScores,
      changesDetected,
      // Full snapshot of all fields at this point in time
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
      // Legacy fields for backwards compatibility
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
