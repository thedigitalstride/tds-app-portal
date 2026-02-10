/**
 * Shared HTML parsing functions for Meta Tag Analyser.
 *
 * This module is the SINGLE SOURCE OF TRUTH for extracting meta tags
 * from HTML content. All API routes use parseAllMetaTags() instead of
 * duplicating parsing logic.
 */

import type {
  HreflangEntry,
  OpenGraphImage,
  OpenGraphArticle,
  TwitterPlayer,
  TwitterApp,
  StructuredData,
  RobotsDirectives,
  TechnicalSeo,
  SiteVerification,
  AppleTouchIcon,
  Mobile,
  Security,
  ImageValidation,
  MetaTagResult,
} from './types';

// =============================================================================
// TEXT UTILITIES
// =============================================================================

export function decodeHtmlEntities(text: string): string {
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

// =============================================================================
// META TAG EXTRACTION
// =============================================================================

export function getMetaContent(html: string, name: string): string {
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
}

export function getAllMetaContent(html: string, name: string): string[] {
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

// =============================================================================
// HTML ELEMENT EXTRACTION
// =============================================================================

export function getTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '';
}

export function getCanonical(html: string): string {
  const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) ||
    html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
  return match ? match[1] : '';
}

export function getCharset(html: string): string {
  const charsetMatch = html.match(/<meta[^>]*charset=["']([^"']*)["']/i);
  if (charsetMatch) return charsetMatch[1];
  const httpEquivMatch = html.match(/<meta[^>]*http-equiv=["']Content-Type["'][^>]*content=["'][^"']*charset=([^"'\s;]+)/i);
  return httpEquivMatch ? httpEquivMatch[1] : '';
}

export function getLanguage(html: string): string {
  const match = html.match(/<html[^>]*lang=["']([^"']*)["']/i);
  return match ? match[1] : '';
}

export function getFavicon(html: string): string {
  const iconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']*)["']/i) ||
    html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i);
  return iconMatch ? iconMatch[1] : '';
}

export function getHreflang(html: string): HreflangEntry[] {
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

  const seen = new Set<string>();
  return entries.filter(e => {
    const key = `${e.lang}:${e.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// =============================================================================
// STRUCTURED DATA
// =============================================================================

export function extractStructuredData(html: string): StructuredData {
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

// =============================================================================
// ROBOTS DIRECTIVES
// =============================================================================

export function parseRobotsDirectives(robotsContent: string): RobotsDirectives | undefined {
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

  const maxVideoMatch = robotsContent.match(/max-video-preview:\s*(-?\d+)/i);
  if (maxVideoMatch) directives.maxVideoPreview = parseInt(maxVideoMatch[1], 10);

  return Object.keys(directives).length > 0 ? directives : undefined;
}

// =============================================================================
// LINK TAG EXTRACTION
// =============================================================================

export function getPrevUrl(html: string): string {
  const match = html.match(/<link[^>]*rel=["']prev["'][^>]*href=["']([^"']*)["']/i) ||
    html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']prev["']/i);
  return match ? match[1] : '';
}

export function getNextUrl(html: string): string {
  const match = html.match(/<link[^>]*rel=["']next["'][^>]*href=["']([^"']*)["']/i) ||
    html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']next["']/i);
  return match ? match[1] : '';
}

export function getManifest(html: string): string {
  const match = html.match(/<link[^>]*rel=["']manifest["'][^>]*href=["']([^"']*)["']/i) ||
    html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']manifest["']/i);
  return match ? match[1] : '';
}

export function getAppleTouchIcons(html: string): AppleTouchIcon[] {
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
}

// =============================================================================
// IMAGE VALIDATION
// =============================================================================

export async function validateImageUrl(imageUrl: string): Promise<ImageValidation> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response = await fetch(imageUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'TDS Meta Tag Analyser/1.0' },
    });

    // Fallback to GET if HEAD returns 404 or 405
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

// =============================================================================
// MAIN PARSING FUNCTION
// =============================================================================

const hasValue = <T extends object>(obj: T): boolean =>
  Object.values(obj).some(v => v !== undefined);

/**
 * Parse all meta tags from HTML and return a complete MetaTagResult.
 * Includes image validation (HEAD/GET requests to OG and Twitter images).
 *
 * This is the single entry point that replaces ~200 lines of duplicated
 * parsing code across the 4 API routes.
 */
export async function parseAllMetaTags(html: string, url: string): Promise<MetaTagResult> {
  const robotsContent = getMetaContent(html, 'robots');
  const ogImage = getMetaContent(html, 'og:image');
  const twitterImage = getMetaContent(html, 'twitter:image');
  const hreflangEntries = getHreflang(html);

  // Validate images in parallel
  const [ogImageValidation, twitterImageValidation] = await Promise.all([
    ogImage ? validateImageUrl(ogImage) : Promise.resolve(undefined),
    twitterImage && twitterImage !== ogImage ? validateImageUrl(twitterImage) : Promise.resolve(undefined),
  ]);

  // Build extended OG image details
  const ogImageAlt = getMetaContent(html, 'og:image:alt');
  const ogImageWidth = getMetaContent(html, 'og:image:width');
  const ogImageHeight = getMetaContent(html, 'og:image:height');
  const ogImageType = getMetaContent(html, 'og:image:type');
  const ogImageDetails: OpenGraphImage | undefined = (
    ogImageAlt || ogImageWidth || ogImageHeight || ogImageType
  ) ? {
    alt: ogImageAlt || undefined,
    width: ogImageWidth ? parseInt(ogImageWidth, 10) : undefined,
    height: ogImageHeight ? parseInt(ogImageHeight, 10) : undefined,
    type: ogImageType || undefined,
  } : undefined;

  // Build OG article metadata
  const articleTags = getAllMetaContent(html, 'og:article:tag');
  const articlePublishedTime = getMetaContent(html, 'og:article:published_time') || getMetaContent(html, 'article:published_time');
  const articleModifiedTime = getMetaContent(html, 'og:article:modified_time') || getMetaContent(html, 'article:modified_time');
  const articleAuthor = getMetaContent(html, 'og:article:author') || getMetaContent(html, 'article:author');
  const articleSection = getMetaContent(html, 'og:article:section') || getMetaContent(html, 'article:section');
  const ogArticle: OpenGraphArticle | undefined = (
    articlePublishedTime || articleModifiedTime || articleAuthor || articleSection || articleTags.length > 0
  ) ? {
    publishedTime: articlePublishedTime || undefined,
    modifiedTime: articleModifiedTime || undefined,
    author: articleAuthor || undefined,
    section: articleSection || undefined,
    tags: articleTags.length > 0 ? articleTags : undefined,
  } : undefined;

  // Build Twitter player details
  const twitterPlayerUrl = getMetaContent(html, 'twitter:player');
  const twitterPlayerWidth = getMetaContent(html, 'twitter:player:width');
  const twitterPlayerHeight = getMetaContent(html, 'twitter:player:height');
  const twitterPlayer: TwitterPlayer | undefined = twitterPlayerUrl ? {
    url: twitterPlayerUrl,
    width: twitterPlayerWidth ? parseInt(twitterPlayerWidth, 10) : undefined,
    height: twitterPlayerHeight ? parseInt(twitterPlayerHeight, 10) : undefined,
  } : undefined;

  // Build Twitter app details
  const twitterApp: TwitterApp | undefined = (
    getMetaContent(html, 'twitter:app:name:iphone') ||
    getMetaContent(html, 'twitter:app:name:googleplay')
  ) ? {
    nameIphone: getMetaContent(html, 'twitter:app:name:iphone') || undefined,
    idIphone: getMetaContent(html, 'twitter:app:id:iphone') || undefined,
    urlIphone: getMetaContent(html, 'twitter:app:url:iphone') || undefined,
    nameAndroid: getMetaContent(html, 'twitter:app:name:googleplay') || undefined,
    idAndroid: getMetaContent(html, 'twitter:app:id:googleplay') || undefined,
    urlAndroid: getMetaContent(html, 'twitter:app:url:googleplay') || undefined,
  } : undefined;

  // Build structured data
  const structuredData = extractStructuredData(html);

  // Build technical SEO
  const technicalSeo: TechnicalSeo = {
    robotsDirectives: parseRobotsDirectives(robotsContent),
    prevUrl: getPrevUrl(html) || undefined,
    nextUrl: getNextUrl(html) || undefined,
    keywords: getMetaContent(html, 'keywords') || undefined,
    generator: getMetaContent(html, 'generator') || undefined,
  };

  // Build site verification
  const siteVerification: SiteVerification = {
    google: getMetaContent(html, 'google-site-verification') || undefined,
    bing: getMetaContent(html, 'msvalidate.01') || undefined,
    pinterest: getMetaContent(html, 'p:domain_verify') || undefined,
    facebook: getMetaContent(html, 'facebook-domain-verification') || undefined,
    yandex: getMetaContent(html, 'yandex-verification') || undefined,
  };

  // Build mobile/PWA
  const appleTouchIcons = getAppleTouchIcons(html);
  const mobile: Mobile = {
    appleWebAppCapable: getMetaContent(html, 'apple-mobile-web-app-capable') || undefined,
    appleWebAppStatusBarStyle: getMetaContent(html, 'apple-mobile-web-app-status-bar-style') || undefined,
    appleWebAppTitle: getMetaContent(html, 'apple-mobile-web-app-title') || undefined,
    appleTouchIcons: appleTouchIcons.length > 0 ? appleTouchIcons : undefined,
    manifest: getManifest(html) || undefined,
    formatDetection: getMetaContent(html, 'format-detection') || undefined,
  };

  // Build security
  const security: Security = {
    referrerPolicy: getMetaContent(html, 'referrer') || undefined,
    contentSecurityPolicy: getMetaContent(html, 'content-security-policy') || undefined,
    xUaCompatible: getMetaContent(html, 'x-ua-compatible') || undefined,
  };

  // Build locale alternates
  const localeAlternates = getAllMetaContent(html, 'og:locale:alternate');

  return {
    url,
    title: getTitle(html),
    description: getMetaContent(html, 'description'),
    canonical: getCanonical(html),
    robots: robotsContent,
    viewport: getMetaContent(html, 'viewport'),
    charset: getCharset(html),
    author: getMetaContent(html, 'author'),
    themeColor: getMetaContent(html, 'theme-color'),
    language: getLanguage(html),
    favicon: getFavicon(html),
    hreflang: hreflangEntries.length > 0 ? hreflangEntries : undefined,
    openGraph: {
      title: getMetaContent(html, 'og:title'),
      description: getMetaContent(html, 'og:description'),
      image: ogImage,
      url: getMetaContent(html, 'og:url'),
      type: getMetaContent(html, 'og:type'),
      siteName: getMetaContent(html, 'og:site_name'),
      imageDetails: ogImageDetails,
      locale: getMetaContent(html, 'og:locale') || undefined,
      localeAlternate: localeAlternates.length > 0 ? localeAlternates : undefined,
      article: ogArticle,
      fbAppId: getMetaContent(html, 'fb:app_id') || undefined,
    },
    twitter: {
      card: getMetaContent(html, 'twitter:card'),
      title: getMetaContent(html, 'twitter:title'),
      description: getMetaContent(html, 'twitter:description'),
      image: twitterImage,
      site: getMetaContent(html, 'twitter:site'),
      creator: getMetaContent(html, 'twitter:creator') || undefined,
      imageAlt: getMetaContent(html, 'twitter:image:alt') || undefined,
      player: twitterPlayer,
      app: twitterApp,
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
}
