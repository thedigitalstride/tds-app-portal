import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
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
  errors: string[];
  rawScripts?: string[];
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
    // Extended OG fields
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
    // Extended Twitter fields
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
  other: Array<{ name: string; content: string }>;
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

// Helper to get all values for a meta tag (for tags that can appear multiple times)
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
    types: [...new Set(types)], // Deduplicate
    errors,
  };
}

// Parse robots meta tag into individual directives
function parseRobotsDirectives(robotsContent: string): RobotsDirectives | undefined {
  if (!robotsContent) return undefined;

  const directives: RobotsDirectives = {};
  const lower = robotsContent.toLowerCase();

  // Boolean directives
  if (lower.includes('noindex')) directives.index = false;
  else if (lower.includes('index')) directives.index = true;

  if (lower.includes('nofollow')) directives.follow = false;
  else if (lower.includes('follow')) directives.follow = true;

  if (lower.includes('noarchive')) directives.noarchive = true;
  if (lower.includes('nosnippet')) directives.nosnippet = true;

  // Numeric directives
  const maxSnippetMatch = robotsContent.match(/max-snippet:\s*(-?\d+)/i);
  if (maxSnippetMatch) directives.maxSnippet = parseInt(maxSnippetMatch[1], 10);

  const maxImageMatch = robotsContent.match(/max-image-preview:\s*(\w+)/i);
  if (maxImageMatch) directives.maxImagePreview = maxImageMatch[1];

  const maxVideoMatch = robotsContent.match(/max-video-preview:\s*(-?\d+)/i);
  if (maxVideoMatch) directives.maxVideoPreview = parseInt(maxVideoMatch[1], 10);

  return Object.keys(directives).length > 0 ? directives : undefined;
}

// Validate an image URL by making a HEAD request
async function validateImageUrl(imageUrl: string): Promise<ImageValidation> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(imageUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'TDS Meta Tag Analyser/1.0',
      },
    });

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

  // --- New Analysis Rules ---

  // OG Image Alt
  if (result.openGraph.image && !result.openGraph.imageDetails?.alt) {
    issues.push({
      type: 'warning',
      field: 'OG Image Alt',
      message: 'Open Graph image has no alt text (og:image:alt). Add alt text for accessibility.',
    });
  }

  // OG Image Dimensions
  if (result.openGraph.image && (!result.openGraph.imageDetails?.width || !result.openGraph.imageDetails?.height)) {
    issues.push({
      type: 'warning',
      field: 'OG Image Dimensions',
      message: 'Open Graph image dimensions not specified. Add og:image:width and og:image:height for faster rendering.',
    });
  }

  // Twitter Creator
  if (result.twitter.site && !result.twitter.creator) {
    issues.push({
      type: 'warning',
      field: 'Twitter Creator',
      message: 'Twitter site is set but creator is missing. Consider adding twitter:creator for attribution.',
    });
  }

  // Twitter Image Alt
  if (result.twitter.image && !result.twitter.imageAlt) {
    issues.push({
      type: 'warning',
      field: 'Twitter Image Alt',
      message: 'Twitter image has no alt text (twitter:image:alt). Add alt text for accessibility.',
    });
  }

  // Structured Data / JSON-LD
  if (!result.structuredData?.found) {
    issues.push({
      type: 'warning',
      field: 'Structured Data',
      message: 'No JSON-LD structured data found. Consider adding Schema.org markup for rich search results.',
    });
  } else if (!result.structuredData.isValidJson) {
    issues.push({
      type: 'error',
      field: 'Structured Data',
      message: `JSON-LD structured data contains invalid JSON: ${result.structuredData.errors.join(', ')}`,
    });
  } else {
    issues.push({
      type: 'success',
      field: 'Structured Data',
      message: `JSON-LD found with types: ${result.structuredData.types.join(', ') || 'unknown'}`,
    });
  }

  // Image Validation - OG Image
  if (result.imageValidation?.ogImage) {
    if (!result.imageValidation.ogImage.exists) {
      issues.push({
        type: 'error',
        field: 'OG Image Status',
        message: `Open Graph image is broken (${result.imageValidation.ogImage.statusCode || result.imageValidation.ogImage.error}).`,
      });
    } else {
      issues.push({
        type: 'success',
        field: 'OG Image Status',
        message: 'Open Graph image is accessible.',
      });
    }
  }

  // Image Validation - Twitter Image
  if (result.imageValidation?.twitterImage) {
    if (!result.imageValidation.twitterImage.exists) {
      issues.push({
        type: 'error',
        field: 'Twitter Image Status',
        message: `Twitter image is broken (${result.imageValidation.twitterImage.statusCode || result.imageValidation.twitterImage.error}).`,
      });
    } else {
      issues.push({
        type: 'success',
        field: 'Twitter Image Status',
        message: 'Twitter image is accessible.',
      });
    }
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    let validUrl: URL;
    try {
      validUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Fetch the page
    const response = await fetch(validUrl.toString(), {
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

    // Parse meta tags using regex (works without jsdom)
    const getMetaContent = (name: string): string => {
      // Try name attribute
      const nameMatch = html.match(
        new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i')
      ) || html.match(
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i')
      );
      if (nameMatch) return decodeHtmlEntities(nameMatch[1]);

      // Try property attribute (for OG tags)
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
      // Try <meta charset="...">
      const charsetMatch = html.match(/<meta[^>]*charset=["']([^"']*)["']/i);
      if (charsetMatch) return charsetMatch[1];

      // Try <meta http-equiv="Content-Type" content="...;charset=...">
      const httpEquivMatch = html.match(/<meta[^>]*http-equiv=["']Content-Type["'][^>]*content=["'][^"']*charset=([^"'\s;]+)/i);
      return httpEquivMatch ? httpEquivMatch[1] : '';
    };

    const getLanguage = (): string => {
      const match = html.match(/<html[^>]*lang=["']([^"']*)["']/i);
      return match ? match[1] : '';
    };

    const getFavicon = (): string => {
      // Try various favicon link types
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

    // Extract other meta tags
    const otherMetas: Array<{ name: string; content: string }> = [];
    const metaRegex = /<meta[^>]*name=["']([^"']*)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
    let match;
    const knownMetas = ['description', 'robots', 'viewport', 'author', 'keywords'];

    while ((match = metaRegex.exec(html)) !== null) {
      const name = match[1].toLowerCase();
      if (!knownMetas.includes(name) && !name.startsWith('og:') && !name.startsWith('twitter:')) {
        otherMetas.push({ name: match[1], content: decodeHtmlEntities(match[2]) });
      }
    }

    const hreflangEntries = getHreflang();

    // Extract link rel tags for pagination and manifest
    const getPrevUrl = (): string => {
      const match = html.match(/<link[^>]*rel=["']prev["'][^>]*href=["']([^"']*)["']/i) ||
        html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']prev["']/i);
      return match ? match[1] : '';
    };

    const getNextUrl = (): string => {
      const match = html.match(/<link[^>]*rel=["']next["'][^>]*href=["']([^"']*)["']/i) ||
        html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']next["']/i);
      return match ? match[1] : '';
    };

    const getManifest = (): string => {
      const match = html.match(/<link[^>]*rel=["']manifest["'][^>]*href=["']([^"']*)["']/i) ||
        html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']manifest["']/i);
      return match ? match[1] : '';
    };

    // Extract apple touch icons
    const getAppleTouchIcons = (): AppleTouchIcon[] => {
      const icons: AppleTouchIcon[] = [];
      const regex = /<link[^>]*rel=["']apple-touch-icon[^"']*["'][^>]*(?:sizes=["']([^"']*)["'][^>]*)?href=["']([^"']*)["']|<link[^>]*href=["']([^"']*)["'][^>]*(?:sizes=["']([^"']*)["'][^>]*)?rel=["']apple-touch-icon[^"']*["']/gi;
      let iconMatch;
      while ((iconMatch = regex.exec(html)) !== null) {
        const href = iconMatch[2] || iconMatch[3];
        const sizes = iconMatch[1] || iconMatch[4];
        if (href) {
          icons.push({ href, sizes: sizes || undefined });
        }
      }
      return icons;
    };

    // Extract robots content for parsing
    const robotsContent = getMetaContent('robots');

    // Extract structured data
    const structuredData = extractStructuredData(html);

    // Build technical SEO object
    const technicalSeo: TechnicalSeo = {
      robotsDirectives: parseRobotsDirectives(robotsContent),
      prevUrl: getPrevUrl() || undefined,
      nextUrl: getNextUrl() || undefined,
      keywords: getMetaContent('keywords') || undefined,
      generator: getMetaContent('generator') || undefined,
    };

    // Build site verification object
    const siteVerification: SiteVerification = {
      google: getMetaContent('google-site-verification') || undefined,
      bing: getMetaContent('msvalidate.01') || undefined,
      pinterest: getMetaContent('p:domain_verify') || undefined,
      facebook: getMetaContent('facebook-domain-verification') || undefined,
      yandex: getMetaContent('yandex-verification') || undefined,
    };

    // Build mobile/PWA object
    const appleTouchIcons = getAppleTouchIcons();
    const mobile: Mobile = {
      appleWebAppCapable: getMetaContent('apple-mobile-web-app-capable') || undefined,
      appleWebAppStatusBarStyle: getMetaContent('apple-mobile-web-app-status-bar-style') || undefined,
      appleWebAppTitle: getMetaContent('apple-mobile-web-app-title') || undefined,
      appleTouchIcons: appleTouchIcons.length > 0 ? appleTouchIcons : undefined,
      manifest: getManifest() || undefined,
      formatDetection: getMetaContent('format-detection') || undefined,
    };

    // Build security object
    const security: Security = {
      referrerPolicy: getMetaContent('referrer') || undefined,
      contentSecurityPolicy: getMetaContent('content-security-policy') || undefined,
      xUaCompatible: getMetaContent('x-ua-compatible') || undefined,
    };

    // Extract OG and Twitter image URLs for validation
    const ogImage = getMetaContent('og:image');
    const twitterImage = getMetaContent('twitter:image');

    // Validate images in parallel (with timeout protection)
    const [ogImageValidation, twitterImageValidation] = await Promise.all([
      ogImage ? validateImageUrl(ogImage) : Promise.resolve(undefined),
      twitterImage && twitterImage !== ogImage ? validateImageUrl(twitterImage) : Promise.resolve(undefined),
    ]);

    // Build extended OG image details
    const ogImageWidth = getMetaContent('og:image:width');
    const ogImageHeight = getMetaContent('og:image:height');
    const ogImageDetails: OpenGraphImage | undefined = (
      getMetaContent('og:image:alt') || ogImageWidth || ogImageHeight || getMetaContent('og:image:type')
    ) ? {
      alt: getMetaContent('og:image:alt') || undefined,
      width: ogImageWidth ? parseInt(ogImageWidth, 10) : undefined,
      height: ogImageHeight ? parseInt(ogImageHeight, 10) : undefined,
      type: getMetaContent('og:image:type') || undefined,
    } : undefined;

    // Build OG article metadata
    const articleTags = getAllMetaContent(html, 'og:article:tag');
    const ogArticle: OpenGraphArticle | undefined = (
      getMetaContent('og:article:published_time') ||
      getMetaContent('og:article:modified_time') ||
      getMetaContent('og:article:author') ||
      getMetaContent('og:article:section') ||
      articleTags.length > 0
    ) ? {
      publishedTime: getMetaContent('og:article:published_time') || undefined,
      modifiedTime: getMetaContent('og:article:modified_time') || undefined,
      author: getMetaContent('og:article:author') || undefined,
      section: getMetaContent('og:article:section') || undefined,
      tags: articleTags.length > 0 ? articleTags : undefined,
    } : undefined;

    // Build Twitter player details
    const twitterPlayerUrl = getMetaContent('twitter:player');
    const twitterPlayerWidth = getMetaContent('twitter:player:width');
    const twitterPlayerHeight = getMetaContent('twitter:player:height');
    const twitterPlayer: TwitterPlayer | undefined = twitterPlayerUrl ? {
      url: twitterPlayerUrl,
      width: twitterPlayerWidth ? parseInt(twitterPlayerWidth, 10) : undefined,
      height: twitterPlayerHeight ? parseInt(twitterPlayerHeight, 10) : undefined,
    } : undefined;

    // Build Twitter app details
    const twitterApp: TwitterApp | undefined = (
      getMetaContent('twitter:app:name:iphone') ||
      getMetaContent('twitter:app:name:googleplay')
    ) ? {
      nameIphone: getMetaContent('twitter:app:name:iphone') || undefined,
      idIphone: getMetaContent('twitter:app:id:iphone') || undefined,
      urlIphone: getMetaContent('twitter:app:url:iphone') || undefined,
      nameAndroid: getMetaContent('twitter:app:name:googleplay') || undefined,
      idAndroid: getMetaContent('twitter:app:id:googleplay') || undefined,
      urlAndroid: getMetaContent('twitter:app:url:googleplay') || undefined,
    } : undefined;

    // Check if objects have any values
    const hasValue = <T extends object>(obj: T): boolean =>
      Object.values(obj).some(v => v !== undefined);

    const result: MetaTagResult = {
      url: validUrl.toString(),
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
      // Social tags - Extended Open Graph
      openGraph: {
        title: getMetaContent('og:title'),
        description: getMetaContent('og:description'),
        image: ogImage,
        url: getMetaContent('og:url'),
        type: getMetaContent('og:type'),
        siteName: getMetaContent('og:site_name'),
        // Extended OG fields
        imageDetails: ogImageDetails,
        locale: getMetaContent('og:locale') || undefined,
        localeAlternate: getAllMetaContent(html, 'og:locale:alternate').length > 0
          ? getAllMetaContent(html, 'og:locale:alternate')
          : undefined,
        article: ogArticle,
        fbAppId: getMetaContent('fb:app_id') || undefined,
      },
      // Extended Twitter
      twitter: {
        card: getMetaContent('twitter:card'),
        title: getMetaContent('twitter:title'),
        description: getMetaContent('twitter:description'),
        image: twitterImage,
        site: getMetaContent('twitter:site'),
        // Extended Twitter fields
        creator: getMetaContent('twitter:creator') || undefined,
        imageAlt: getMetaContent('twitter:image:alt') || undefined,
        player: twitterPlayer,
        app: twitterApp,
      },
      // New categories
      structuredData: structuredData.found ? structuredData : undefined,
      technicalSeo: hasValue(technicalSeo) ? technicalSeo : undefined,
      siteVerification: hasValue(siteVerification) ? siteVerification : undefined,
      mobile: hasValue(mobile) ? mobile : undefined,
      security: hasValue(security) ? security : undefined,
      imageValidation: (ogImageValidation || twitterImageValidation) ? {
        ogImage: ogImageValidation,
        twitterImage: twitterImageValidation,
      } : undefined,
      other: otherMetas.slice(0, 20), // Limit to 20 other tags
    };

    const issues = analyzeMetaTags(result);

    // Calculate score using the new severity-based algorithm
    const { score, categoryScores } = calculateScore(result, issues);

    return NextResponse.json({ result, issues, score, categoryScores });
  } catch (error) {
    console.error('Meta tag analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze URL. Please check the URL and try again.' },
      { status: 500 }
    );
  }
}
