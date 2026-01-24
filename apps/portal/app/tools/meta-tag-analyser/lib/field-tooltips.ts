/**
 * Field tooltips for Meta Tag Analyzer
 *
 * Provides descriptions, best practices, and criticality levels for all 64 meta fields.
 */

export interface FieldTooltip {
  /** Brief field name/title */
  title: string;
  /** What this field is (1-2 sentences) */
  description: string;
  /** Optimal values/guidelines */
  bestPractice: string;
  /** How important this field is for SEO/functionality */
  criticality: 'critical' | 'important' | 'optional';
}

export const FIELD_TOOLTIPS: Record<string, FieldTooltip> = {
  // ===================
  // Basic SEO Fields (7)
  // ===================
  title: {
    title: 'Page Title',
    description:
      'The title tag defines your page title that appears in browser tabs, search results, and social shares.',
    bestPractice: '30-60 characters. Primary keyword first. Unique per page.',
    criticality: 'critical',
  },
  description: {
    title: 'Meta Description',
    description:
      'A summary of your page content that search engines may display in search results below your title.',
    bestPractice:
      '120-160 characters. Include target keywords naturally. Compelling call-to-action.',
    criticality: 'critical',
  },
  canonical: {
    title: 'Canonical URL',
    description:
      'Tells search engines the preferred URL for this content, preventing duplicate content issues.',
    bestPractice:
      'Use absolute URLs. Point to the primary version of your page. Self-referencing canonicals are valid.',
    criticality: 'important',
  },
  robots: {
    title: 'Robots Meta Tag',
    description:
      'Instructs search engine crawlers how to index and follow links on this page.',
    bestPractice:
      'Use "index, follow" for most pages. Use "noindex" for private pages or duplicates.',
    criticality: 'important',
  },
  viewport: {
    title: 'Viewport',
    description:
      'Controls how your page is displayed on mobile devices and responsive layouts.',
    bestPractice:
      'Use "width=device-width, initial-scale=1" for responsive design.',
    criticality: 'critical',
  },
  charset: {
    title: 'Character Encoding',
    description:
      'Specifies the character encoding for the document to ensure text displays correctly.',
    bestPractice: 'Use "UTF-8" for universal character support.',
    criticality: 'important',
  },
  language: {
    title: 'Language',
    description:
      'Declares the primary language of the page content for search engines and accessibility tools.',
    bestPractice:
      'Use ISO 639-1 codes (e.g., "en", "en-GB", "de"). Set on the html element.',
    criticality: 'important',
  },
  author: {
    title: 'Author',
    description:
      'Identifies the author or creator of the page content.',
    bestPractice:
      'Include for articles and blog posts. Use consistent author names across your site.',
    criticality: 'optional',
  },
  themeColor: {
    title: 'Theme Color',
    description:
      'Sets the browser toolbar color on mobile devices, enhancing brand presence.',
    bestPractice:
      'Use your brand color as a hex code. Test across browsers.',
    criticality: 'optional',
  },
  favicon: {
    title: 'Favicon',
    description:
      'The small icon displayed in browser tabs, bookmarks, and history.',
    bestPractice:
      'Use multiple sizes (16x16, 32x32, 180x180). Include ICO and PNG formats.',
    criticality: 'important',
  },
  hreflang: {
    title: 'Hreflang Tags',
    description:
      'Tells search engines about language and regional variants of a page for international SEO.',
    bestPractice:
      'Include self-referencing hreflang. Use x-default for fallback. All variants must link to each other.',
    criticality: 'optional',
  },

  // ===================
  // Open Graph Fields (14)
  // ===================
  'og:title': {
    title: 'OG Title',
    description:
      'The title that appears when your page is shared on Facebook, LinkedIn, and other social platforms.',
    bestPractice:
      '40-60 characters. Can differ from page title for social optimization.',
    criticality: 'critical',
  },
  'og:description': {
    title: 'OG Description',
    description:
      'The description shown in social media previews when your page is shared.',
    bestPractice:
      '60-200 characters. Compelling summary that encourages clicks.',
    criticality: 'critical',
  },
  'og:image': {
    title: 'OG Image',
    description:
      'The image displayed in social media preview cards when sharing your page.',
    bestPractice:
      '1200x630 pixels (1.91:1 ratio). Under 8MB. High-contrast, readable text if any.',
    criticality: 'critical',
  },
  'og:url': {
    title: 'OG URL',
    description:
      'The canonical URL for the shared content that social platforms will use.',
    bestPractice:
      'Use absolute URL. Should match your canonical URL.',
    criticality: 'critical',
  },
  'og:type': {
    title: 'OG Type',
    description:
      'Categorizes your content type for social platforms (website, article, product, etc.).',
    bestPractice:
      'Use "website" for homepages, "article" for blog posts, "product" for e-commerce.',
    criticality: 'important',
  },
  'og:site_name': {
    title: 'OG Site Name',
    description:
      'Your website or brand name that appears alongside shared content.',
    bestPractice:
      'Use consistent brand name. Keep it short and recognizable.',
    criticality: 'important',
  },
  'og:locale': {
    title: 'OG Locale',
    description:
      'The language and territory of your content in the format language_TERRITORY.',
    bestPractice:
      'Use format like "en_US", "en_GB", "de_DE". Match your content language.',
    criticality: 'optional',
  },
  'og:image:alt': {
    title: 'OG Image Alt',
    description:
      'Alternative text description of the OG image for accessibility.',
    bestPractice:
      'Describe the image content. Keep under 420 characters.',
    criticality: 'optional',
  },
  'og:image:width': {
    title: 'OG Image Width',
    description:
      'The width of the OG image in pixels. Helps platforms render correctly.',
    bestPractice:
      '1200 pixels for optimal display. Specify along with height.',
    criticality: 'optional',
  },
  'og:image:height': {
    title: 'OG Image Height',
    description:
      'The height of the OG image in pixels. Helps platforms render correctly.',
    bestPractice:
      '630 pixels for optimal display (1.91:1 ratio with 1200 width).',
    criticality: 'optional',
  },
  'og:image:type': {
    title: 'OG Image Type',
    description:
      'The MIME type of the OG image (e.g., image/jpeg, image/png).',
    bestPractice:
      'Use image/jpeg for photos, image/png for graphics with text.',
    criticality: 'optional',
  },
  'og:article:published_time': {
    title: 'Article Published Time',
    description:
      'When the article was first published, shown on article shares.',
    bestPractice:
      'ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ). Include for news/blog content.',
    criticality: 'optional',
  },
  'og:article:author': {
    title: 'Article Author',
    description:
      'The author of the article, displayed in article type shares.',
    bestPractice:
      'Use author name or profile URL. Consistent with bylines.',
    criticality: 'optional',
  },
  'og:article:section': {
    title: 'Article Section',
    description:
      'The section or category the article belongs to.',
    bestPractice:
      'Use your site\'s main content categories.',
    criticality: 'optional',
  },

  // ===================
  // Twitter Card Fields (10)
  // ===================
  'twitter:card': {
    title: 'Twitter Card Type',
    description:
      'Defines the type of Twitter card to display (summary, summary_large_image, player, app).',
    bestPractice:
      'Use "summary_large_image" for impactful visuals. "summary" for compact previews.',
    criticality: 'critical',
  },
  'twitter:site': {
    title: 'Twitter Site',
    description:
      'The @username of the website or publisher for attribution.',
    bestPractice:
      'Include the @ symbol. Use your brand\'s main Twitter account.',
    criticality: 'important',
  },
  'twitter:creator': {
    title: 'Twitter Creator',
    description:
      'The @username of the content creator or author.',
    bestPractice:
      'Include for articles and posts with individual authors.',
    criticality: 'optional',
  },
  'twitter:title': {
    title: 'Twitter Title',
    description:
      'The title shown in Twitter card previews. Falls back to og:title if not set.',
    bestPractice:
      'Under 70 characters. Compelling and descriptive.',
    criticality: 'critical',
  },
  'twitter:description': {
    title: 'Twitter Description',
    description:
      'The description in Twitter card previews. Falls back to og:description if not set.',
    bestPractice:
      'Under 200 characters. Engaging summary with clear value proposition.',
    criticality: 'critical',
  },
  'twitter:image': {
    title: 'Twitter Image',
    description:
      'The image displayed in Twitter card previews. Falls back to og:image if not set.',
    bestPractice:
      'Minimum 300x157, recommended 1200x628. Under 5MB.',
    criticality: 'critical',
  },
  'twitter:image:alt': {
    title: 'Twitter Image Alt',
    description:
      'Alternative text for the Twitter card image for accessibility.',
    bestPractice:
      'Describe the image content. Under 420 characters.',
    criticality: 'optional',
  },
  'twitter:player': {
    title: 'Twitter Player URL',
    description:
      'URL to an HTTPS iframe for video/audio player cards.',
    bestPractice:
      'Must be HTTPS. Required for player card type.',
    criticality: 'optional',
  },
  'twitter:player:width': {
    title: 'Twitter Player Width',
    description:
      'Width of the player iframe in pixels.',
    bestPractice:
      'Match your video player dimensions.',
    criticality: 'optional',
  },
  'twitter:player:height': {
    title: 'Twitter Player Height',
    description:
      'Height of the player iframe in pixels.',
    bestPractice:
      'Match your video player dimensions.',
    criticality: 'optional',
  },

  // ===================
  // Structured Data Fields (4)
  // ===================
  'structuredData:found': {
    title: 'Structured Data Found',
    description:
      'Whether JSON-LD structured data markup was detected on the page.',
    bestPractice:
      'Include structured data for rich snippets in search results.',
    criticality: 'important',
  },
  'structuredData:isValidJson': {
    title: 'Valid JSON-LD',
    description:
      'Whether the JSON-LD structured data is valid and parseable.',
    bestPractice:
      'Validate with Google Rich Results Test or Schema.org validator.',
    criticality: 'important',
  },
  'structuredData:types': {
    title: 'Schema Types',
    description:
      'The Schema.org types detected in your structured data (Article, Product, Organization, etc.).',
    bestPractice:
      'Use types relevant to your content. Common: Organization, WebPage, Article, Product.',
    criticality: 'important',
  },
  'structuredData:validationErrors': {
    title: 'Structured Data Errors',
    description:
      'Parsing or validation errors found in the structured data.',
    bestPractice:
      'Fix all errors to ensure rich results eligibility.',
    criticality: 'important',
  },

  // ===================
  // Technical SEO Fields (9)
  // ===================
  'robots:index': {
    title: 'Index Directive',
    description:
      'Whether search engines should add this page to their index.',
    bestPractice:
      'Use "index" for public pages, "noindex" for private or duplicate content.',
    criticality: 'critical',
  },
  'robots:follow': {
    title: 'Follow Directive',
    description:
      'Whether search engines should follow links on this page.',
    bestPractice:
      'Use "follow" for most pages. "nofollow" for untrusted external links.',
    criticality: 'important',
  },
  'robots:noarchive': {
    title: 'No Archive Directive',
    description:
      'Prevents search engines from caching/archiving the page.',
    bestPractice:
      'Use for time-sensitive content or when fresh content is important.',
    criticality: 'optional',
  },
  'robots:nosnippet': {
    title: 'No Snippet Directive',
    description:
      'Prevents search engines from showing text snippets in results.',
    bestPractice:
      'Rarely used. Consider max-snippet for more control.',
    criticality: 'optional',
  },
  'robots:maxSnippet': {
    title: 'Max Snippet',
    description:
      'Maximum length of text snippet in search results (-1 for no limit).',
    bestPractice:
      'Use -1 to allow full snippets, or set character limit.',
    criticality: 'optional',
  },
  'robots:maxImagePreview': {
    title: 'Max Image Preview',
    description:
      'Maximum size of image preview in search results (none, standard, large).',
    bestPractice:
      'Use "large" for best visual presence in search results.',
    criticality: 'optional',
  },
  prevUrl: {
    title: 'Previous Page URL',
    description:
      'Points to the previous page in a paginated series.',
    bestPractice:
      'Use for multi-page content. Include with rel="prev" link tag.',
    criticality: 'optional',
  },
  nextUrl: {
    title: 'Next Page URL',
    description:
      'Points to the next page in a paginated series.',
    bestPractice:
      'Use for multi-page content. Include with rel="next" link tag.',
    criticality: 'optional',
  },
  keywords: {
    title: 'Meta Keywords',
    description:
      'A list of keywords relevant to the page. No longer used by major search engines.',
    bestPractice:
      'Not recommended. Focus on content optimization instead.',
    criticality: 'optional',
  },
  generator: {
    title: 'Generator',
    description:
      'Identifies the software that generated the page (WordPress, Next.js, etc.).',
    bestPractice:
      'Consider removing to avoid exposing technology stack.',
    criticality: 'optional',
  },

  // ===================
  // Site Verification Fields (5)
  // ===================
  'verification:google': {
    title: 'Google Site Verification',
    description:
      'Verification code for Google Search Console ownership.',
    bestPractice:
      'Required to access Search Console. Keep the tag after verification.',
    criticality: 'important',
  },
  'verification:bing': {
    title: 'Bing Site Verification',
    description:
      'Verification code for Bing Webmaster Tools ownership.',
    bestPractice:
      'Required for Bing Webmaster Tools access.',
    criticality: 'optional',
  },
  'verification:pinterest': {
    title: 'Pinterest Site Verification',
    description:
      'Verification code for Pinterest business account.',
    bestPractice:
      'Required for Pinterest Analytics and rich pins.',
    criticality: 'optional',
  },
  'verification:facebook': {
    title: 'Facebook Domain Verification',
    description:
      'Verification code for Facebook Business domain ownership.',
    bestPractice:
      'Required for editing link previews and ad tracking.',
    criticality: 'optional',
  },
  'verification:yandex': {
    title: 'Yandex Site Verification',
    description:
      'Verification code for Yandex Webmaster Tools.',
    bestPractice:
      'Required for Yandex search presence in Russia.',
    criticality: 'optional',
  },

  // ===================
  // Mobile/PWA Fields (6)
  // ===================
  manifest: {
    title: 'Web App Manifest',
    description:
      'Link to the PWA manifest file defining app-like behavior and install prompts.',
    bestPractice:
      'Include for Progressive Web Apps. Define icons, theme, display mode.',
    criticality: 'optional',
  },
  'apple:webAppCapable': {
    title: 'Apple Web App Capable',
    description:
      'Enables full-screen mode when added to iOS home screen.',
    bestPractice:
      'Set to "yes" for app-like experience. Pair with status bar style.',
    criticality: 'optional',
  },
  'apple:webAppTitle': {
    title: 'Apple Web App Title',
    description:
      'The name displayed when added to iOS home screen.',
    bestPractice:
      'Keep short (12 characters max). Match your brand name.',
    criticality: 'optional',
  },
  'apple:webAppStatusBarStyle': {
    title: 'Apple Status Bar Style',
    description:
      'Controls iOS status bar appearance in standalone mode.',
    bestPractice:
      'Use "default", "black", or "black-translucent".',
    criticality: 'optional',
  },
  'apple:touchIcon': {
    title: 'Apple Touch Icon',
    description:
      'The icon displayed when saved to iOS home screen.',
    bestPractice:
      '180x180 pixels. Include multiple sizes for different devices.',
    criticality: 'important',
  },
  'apple:touchIconCount': {
    title: 'Apple Touch Icon Count',
    description:
      'Number of Apple touch icons defined on the page.',
    bestPractice:
      'Include sizes: 57x57, 72x72, 114x114, 120x120, 144x144, 180x180.',
    criticality: 'optional',
  },

  // ===================
  // Security Fields (3)
  // ===================
  referrerPolicy: {
    title: 'Referrer Policy',
    description:
      'Controls what referrer information is sent when navigating away from your page.',
    bestPractice:
      'Use "strict-origin-when-cross-origin" for balanced privacy/analytics.',
    criticality: 'optional',
  },
  contentSecurityPolicy: {
    title: 'Content Security Policy',
    description:
      'Defines allowed content sources to prevent XSS and injection attacks.',
    bestPractice:
      'Define strict policies. Allow only trusted sources.',
    criticality: 'optional',
  },
  xUaCompatible: {
    title: 'X-UA-Compatible',
    description:
      'Controls IE rendering mode. Legacy tag for Internet Explorer.',
    bestPractice:
      'Use "IE=edge" if needed. Can be removed if not supporting IE.',
    criticality: 'optional',
  },

  // ===================
  // Image Validation Fields (2)
  // ===================
  'imageValidation:ogImage': {
    title: 'OG Image Validation',
    description:
      'Whether the OG image URL is accessible and returns a valid image.',
    bestPractice:
      'Ensure image URL returns 200 status and correct content type.',
    criticality: 'important',
  },
  'imageValidation:twitterImage': {
    title: 'Twitter Image Validation',
    description:
      'Whether the Twitter image URL is accessible and returns a valid image.',
    bestPractice:
      'Ensure image URL returns 200 status and correct content type.',
    criticality: 'important',
  },
};

/**
 * Get tooltip for a field, with fallback to field key as title
 */
export function getFieldTooltip(fieldKey: string): FieldTooltip {
  const tooltip = FIELD_TOOLTIPS[fieldKey];
  if (tooltip) return tooltip;

  // Fallback for unknown fields
  return {
    title: fieldKey,
    description: 'Meta tag field.',
    bestPractice: 'Refer to documentation for best practices.',
    criticality: 'optional',
  };
}
