# Meta Tag Analyser - Complete Checks Reference

This document contains all metadata validation checks implemented in the Meta Tag Analyser tool. Use this as a reference for making these checks administrable.

---

## Table of Contents

1. [Basic SEO Fields](#1-basic-seo-fields)
2. [Open Graph Fields](#2-open-graph-fields)
3. [Twitter Card Fields](#3-twitter-card-fields)
4. [Structured Data](#4-structured-data)
5. [Site Verification](#5-site-verification)
6. [Mobile / PWA](#6-mobile--pwa)
7. [Security](#7-security)
8. [Technical SEO](#8-technical-seo)
9. [Scoring System](#scoring-system)
10. [Severity Levels](#severity-levels)

---

## 1. Basic SEO Fields

### Title

| Property | Value |
|----------|-------|
| **Field Key** | `title` |
| **Display Name** | Page Title |
| **Description** | The title tag defines your page title that appears in browser tabs, search results, and social shares. |
| **Best Practice** | 30-60 characters. Primary keyword first. Unique per page. |
| **Criticality** | `critical` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Missing | `error` | Page title is missing. This is critical for SEO. |
| Length < 30 | `warning` | Title is too short ({length} chars). Aim for 50-60 characters. |
| Length > 60 | `warning` | Title is too long ({length} chars). It may be truncated in search results. |
| Length 30-60 | `success` | Title length is optimal ({length} chars). |

---

### Meta Description

| Property | Value |
|----------|-------|
| **Field Key** | `description` |
| **Display Name** | Meta Description |
| **Description** | A summary of your page content that search engines may display in search results below your title. |
| **Best Practice** | 120-160 characters. Include target keywords naturally. Compelling call-to-action. |
| **Criticality** | `critical` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Missing | `error` | Meta description is missing. This is important for SEO and click-through rates. |
| Length < 70 | `warning` | Description is too short ({length} chars). Aim for 120-160 characters. |
| Length > 160 | `warning` | Description is too long ({length} chars). It may be truncated in search results. |
| Length 70-160 | `success` | Description length is optimal ({length} chars). |

---

### Canonical URL

| Property | Value |
|----------|-------|
| **Field Key** | `canonical` |
| **Display Name** | Canonical URL |
| **Description** | Tells search engines the preferred URL for this content, preventing duplicate content issues. |
| **Best Practice** | Use absolute URLs. Point to the primary version of your page. Self-referencing canonicals are valid. |
| **Criticality** | `critical` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Missing | `warning` | No canonical URL specified. Consider adding one to prevent duplicate content issues. |

---

### Viewport

| Property | Value |
|----------|-------|
| **Field Key** | `viewport` |
| **Display Name** | Viewport |
| **Description** | Controls how your page is displayed on mobile devices and responsive layouts. |
| **Best Practice** | Use "width=device-width, initial-scale=1" for responsive design. |
| **Criticality** | `critical` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Missing | `error` | No viewport meta tag. Page may not display correctly on mobile devices. |
| Missing width=device-width | `warning` | Viewport should include "width=device-width" for proper mobile scaling. |
| Valid configuration | `success` | Viewport is configured for mobile devices. |

---

### Character Encoding

| Property | Value |
|----------|-------|
| **Field Key** | `charset` |
| **Display Name** | Character Encoding |
| **Description** | Specifies the character encoding for the document to ensure text displays correctly. |
| **Best Practice** | Use "UTF-8" for universal character support. |
| **Criticality** | `important` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Missing | `warning` | No character encoding specified. Consider adding \<meta charset="UTF-8"\>. |

---

### Language

| Property | Value |
|----------|-------|
| **Field Key** | `language` |
| **Display Name** | Language |
| **Description** | Declares the primary language of the page content for search engines and accessibility tools. |
| **Best Practice** | Use ISO 639-1 codes (e.g., "en", "en-GB", "de"). Set on the html element. |
| **Criticality** | `important` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Missing | `warning` | No language attribute on \<html\> tag. This helps search engines and accessibility. |

---

### Robots Meta Tag

| Property | Value |
|----------|-------|
| **Field Key** | `robots` |
| **Display Name** | Robots Meta Tag |
| **Description** | Instructs search engine crawlers how to index and follow links on this page. |
| **Best Practice** | Use "index, follow" for most pages. Use "noindex" for private pages or duplicates. |
| **Criticality** | `important` |

**Parsed Directives:**

| Directive | Type | Description |
|-----------|------|-------------|
| `index` | Boolean | Whether the page should be indexed |
| `noindex` | Boolean | Prevent indexing |
| `follow` | Boolean | Whether to follow links |
| `nofollow` | Boolean | Don't follow links |
| `noarchive` | Boolean | Prevent caching/archiving |
| `nosnippet` | Boolean | Prevent text snippets |
| `max-snippet` | Number | Max snippet length (-1 = unlimited) |
| `max-image-preview` | String | "none", "standard", or "large" |
| `max-video-preview` | Number | Max video preview in seconds |

---

### Author

| Property | Value |
|----------|-------|
| **Field Key** | `author` |
| **Display Name** | Author |
| **Description** | Identifies the author or creator of the page content. |
| **Best Practice** | Include for articles and blog posts. Use consistent author names across your site. |
| **Criticality** | `optional` |

---

### Theme Color

| Property | Value |
|----------|-------|
| **Field Key** | `themeColor` |
| **Display Name** | Theme Color |
| **Meta Name** | `theme-color` |
| **Description** | Sets the browser toolbar color on mobile devices, enhancing brand presence. |
| **Best Practice** | Use your brand color as a hex code. Test across browsers. |
| **Criticality** | `optional` |

---

### Favicon

| Property | Value |
|----------|-------|
| **Field Key** | `favicon` |
| **Display Name** | Favicon |
| **Description** | The small icon displayed in browser tabs, bookmarks, and history. |
| **Best Practice** | Use multiple sizes (16x16, 32x32, 180x180). Include ICO and PNG formats. |
| **Criticality** | `important` |

---

### Hreflang Tags

| Property | Value |
|----------|-------|
| **Field Key** | `hreflang` |
| **Display Name** | Hreflang Tags |
| **Description** | Tells search engines about language and regional variants of a page for international SEO. |
| **Best Practice** | Include self-referencing hreflang. Use x-default for fallback. All variants must link to each other. |
| **Criticality** | `optional` |

---

## 2. Open Graph Fields

### OG Title

| Property | Value |
|----------|-------|
| **Field Key** | `og:title` |
| **Display Name** | OG Title |
| **Meta Property** | `og:title` |
| **Description** | The title that appears when your page is shared on Facebook, LinkedIn, and other social platforms. |
| **Best Practice** | 40-60 characters. Can differ from page title for social optimization. |
| **Criticality** | `critical` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Missing (with og:description) | `warning` | Open Graph tags are missing. Social sharing previews may not display correctly. |

---

### OG Description

| Property | Value |
|----------|-------|
| **Field Key** | `og:description` |
| **Display Name** | OG Description |
| **Meta Property** | `og:description` |
| **Description** | The description shown in social media previews when your page is shared. |
| **Best Practice** | 60-200 characters. Compelling summary that encourages clicks. |
| **Criticality** | `critical` |

---

### OG Image

| Property | Value |
|----------|-------|
| **Field Key** | `og:image` |
| **Display Name** | OG Image |
| **Meta Property** | `og:image` |
| **Description** | The image displayed in social media preview cards when sharing your page. |
| **Best Practice** | 1200x630 pixels (1.91:1 ratio). Under 8MB. High-contrast, readable text if any. |
| **Criticality** | `critical` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Missing | `warning` | No Open Graph image specified. Social shares will lack a preview image. |
| Image broken (HTTP error) | `error` | Open Graph image is broken ({status} or {error}). |
| Image accessible | `success` | Open Graph image is accessible. |

---

### OG Image Alt

| Property | Value |
|----------|-------|
| **Field Key** | `og:image:alt` |
| **Display Name** | OG Image Alt |
| **Meta Property** | `og:image:alt` |
| **Description** | Alternative text description of the OG image for accessibility. |
| **Best Practice** | Describe the image content. Keep under 420 characters. |
| **Criticality** | `optional` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Missing (when og:image exists) | `warning` | Open Graph image has no alt text (og:image:alt). Add alt text for accessibility. |

---

### OG Image Width

| Property | Value |
|----------|-------|
| **Field Key** | `og:image:width` |
| **Display Name** | OG Image Width |
| **Meta Property** | `og:image:width` |
| **Description** | The width of the OG image in pixels. Helps platforms render correctly. |
| **Best Practice** | 1200 pixels for optimal display. Specify along with height. |
| **Criticality** | `optional` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Missing (when og:image exists) | `warning` | Open Graph image dimensions not specified. Add og:image:width and og:image:height for faster rendering. |

---

### OG Image Height

| Property | Value |
|----------|-------|
| **Field Key** | `og:image:height` |
| **Display Name** | OG Image Height |
| **Meta Property** | `og:image:height` |
| **Description** | The height of the OG image in pixels. Helps platforms render correctly. |
| **Best Practice** | 630 pixels for optimal display (1.91:1 ratio with 1200 width). |
| **Criticality** | `optional` |

---

### OG Image Type

| Property | Value |
|----------|-------|
| **Field Key** | `og:image:type` |
| **Display Name** | OG Image Type |
| **Meta Property** | `og:image:type` |
| **Description** | The MIME type of the OG image (e.g., image/jpeg, image/png). |
| **Best Practice** | Use image/jpeg for photos, image/png for graphics with text. |
| **Criticality** | `optional` |

---

### OG URL

| Property | Value |
|----------|-------|
| **Field Key** | `og:url` |
| **Display Name** | OG URL |
| **Meta Property** | `og:url` |
| **Description** | The canonical URL for the shared content that social platforms will use. |
| **Best Practice** | Use absolute URL. Should match your canonical URL. |
| **Criticality** | `critical` |

---

### OG Type

| Property | Value |
|----------|-------|
| **Field Key** | `og:type` |
| **Display Name** | OG Type |
| **Meta Property** | `og:type` |
| **Description** | Categorizes your content type for social platforms (website, article, product, etc.). |
| **Best Practice** | Use "website" for homepages, "article" for blog posts, "product" for e-commerce. |
| **Criticality** | `important` |

---

### OG Site Name

| Property | Value |
|----------|-------|
| **Field Key** | `og:site_name` |
| **Display Name** | OG Site Name |
| **Meta Property** | `og:site_name` |
| **Description** | Your website or brand name that appears alongside shared content. |
| **Best Practice** | Use consistent brand name. Keep it short and recognizable. |
| **Criticality** | `important` |

---

### OG Locale

| Property | Value |
|----------|-------|
| **Field Key** | `og:locale` |
| **Display Name** | OG Locale |
| **Meta Property** | `og:locale` |
| **Description** | The language and territory of your content in the format language_TERRITORY. |
| **Best Practice** | Use format like "en_US", "en_GB", "de_DE". Match your content language. |
| **Criticality** | `optional` |

---

### Article Published Time

| Property | Value |
|----------|-------|
| **Field Key** | `og:article:published_time` |
| **Display Name** | Article Published Time |
| **Meta Property** | `og:article:published_time` |
| **Description** | When the article was first published, shown on article shares. |
| **Best Practice** | ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ). Include for news/blog content. |
| **Criticality** | `optional` |

---

### Article Modified Time

| Property | Value |
|----------|-------|
| **Field Key** | `og:article:modified_time` |
| **Display Name** | Article Modified Time |
| **Meta Property** | `og:article:modified_time` |
| **Description** | When the article was last modified. |
| **Best Practice** | ISO 8601 format. Update when content changes significantly. |
| **Criticality** | `optional` |

---

### Article Author

| Property | Value |
|----------|-------|
| **Field Key** | `og:article:author` |
| **Display Name** | Article Author |
| **Meta Property** | `og:article:author` |
| **Description** | The author of the article, displayed in article type shares. |
| **Best Practice** | Use author name or profile URL. Consistent with bylines. |
| **Criticality** | `optional` |

---

### Article Section

| Property | Value |
|----------|-------|
| **Field Key** | `og:article:section` |
| **Display Name** | Article Section |
| **Meta Property** | `og:article:section` |
| **Description** | The section or category the article belongs to. |
| **Best Practice** | Use your site's main content categories. |
| **Criticality** | `optional` |

---

### Article Tags

| Property | Value |
|----------|-------|
| **Field Key** | `og:article:tag` |
| **Display Name** | Article Tags |
| **Meta Property** | `og:article:tag` |
| **Description** | Tags associated with the article (can have multiple). |
| **Best Practice** | Use relevant keywords. Multiple tags allowed. |
| **Criticality** | `optional` |

---

### Facebook App ID

| Property | Value |
|----------|-------|
| **Field Key** | `fb:app_id` |
| **Display Name** | Facebook App ID |
| **Meta Property** | `fb:app_id` |
| **Description** | Your Facebook App ID for insights and moderation. |
| **Best Practice** | Required for Facebook Insights on shares. |
| **Criticality** | `optional` |

---

## 3. Twitter Card Fields

### Twitter Card Type

| Property | Value |
|----------|-------|
| **Field Key** | `twitter:card` |
| **Display Name** | Twitter Card Type |
| **Meta Name** | `twitter:card` |
| **Description** | Defines the type of Twitter card to display (summary, summary_large_image, player, app). |
| **Best Practice** | Use "summary_large_image" for impactful visuals. "summary" for compact previews. |
| **Criticality** | `critical` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Missing | `warning` | No Twitter card type specified. Twitter/X previews may not display correctly. |

**Valid Values:**
- `summary` - Small square image with title/description
- `summary_large_image` - Large rectangular image
- `player` - Video/audio player
- `app` - Mobile app promotion

---

### Twitter Title

| Property | Value |
|----------|-------|
| **Field Key** | `twitter:title` |
| **Display Name** | Twitter Title |
| **Meta Name** | `twitter:title` |
| **Description** | The title shown in Twitter card previews. Falls back to og:title if not set. |
| **Best Practice** | Under 70 characters. Compelling and descriptive. |
| **Criticality** | `critical` |

---

### Twitter Description

| Property | Value |
|----------|-------|
| **Field Key** | `twitter:description` |
| **Display Name** | Twitter Description |
| **Meta Name** | `twitter:description` |
| **Description** | The description in Twitter card previews. Falls back to og:description if not set. |
| **Best Practice** | Under 200 characters. Engaging summary with clear value proposition. |
| **Criticality** | `critical` |

---

### Twitter Image

| Property | Value |
|----------|-------|
| **Field Key** | `twitter:image` |
| **Display Name** | Twitter Image |
| **Meta Name** | `twitter:image` |
| **Description** | The image displayed in Twitter card previews. Falls back to og:image if not set. |
| **Best Practice** | Minimum 300x157, recommended 1200x628. Under 5MB. |
| **Criticality** | `critical` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Image broken (HTTP error) | `error` | Twitter image is broken ({status} or {error}). |
| Image accessible | `success` | Twitter image is accessible. |

---

### Twitter Image Alt

| Property | Value |
|----------|-------|
| **Field Key** | `twitter:image:alt` |
| **Display Name** | Twitter Image Alt |
| **Meta Name** | `twitter:image:alt` |
| **Description** | Alternative text for the Twitter card image for accessibility. |
| **Best Practice** | Describe the image content. Under 420 characters. |
| **Criticality** | `optional` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Missing (when twitter:image exists) | `warning` | Twitter image has no alt text (twitter:image:alt). Add alt text for accessibility. |

---

### Twitter Site

| Property | Value |
|----------|-------|
| **Field Key** | `twitter:site` |
| **Display Name** | Twitter Site |
| **Meta Name** | `twitter:site` |
| **Description** | The @username of the website or publisher for attribution. |
| **Best Practice** | Include the @ symbol. Use your brand's main Twitter account. |
| **Criticality** | `important` |

---

### Twitter Creator

| Property | Value |
|----------|-------|
| **Field Key** | `twitter:creator` |
| **Display Name** | Twitter Creator |
| **Meta Name** | `twitter:creator` |
| **Description** | The @username of the content creator or author. |
| **Best Practice** | Include for articles and posts with individual authors. |
| **Criticality** | `optional` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Missing (when twitter:site exists) | `warning` | Twitter site is set but creator is missing. Consider adding twitter:creator for attribution. |

---

### Twitter Player URL

| Property | Value |
|----------|-------|
| **Field Key** | `twitter:player` |
| **Display Name** | Twitter Player URL |
| **Meta Name** | `twitter:player` |
| **Description** | URL to an HTTPS iframe for video/audio player cards. |
| **Best Practice** | Must be HTTPS. Required for player card type. |
| **Criticality** | `optional` |

---

### Twitter Player Width

| Property | Value |
|----------|-------|
| **Field Key** | `twitter:player:width` |
| **Display Name** | Twitter Player Width |
| **Meta Name** | `twitter:player:width` |
| **Description** | Width of the player iframe in pixels. |
| **Best Practice** | Match your video player dimensions. |
| **Criticality** | `optional` |

---

### Twitter Player Height

| Property | Value |
|----------|-------|
| **Field Key** | `twitter:player:height` |
| **Display Name** | Twitter Player Height |
| **Meta Name** | `twitter:player:height` |
| **Description** | Height of the player iframe in pixels. |
| **Best Practice** | Match your video player dimensions. |
| **Criticality** | `optional` |

---

### Twitter App (iOS)

| Property | Value |
|----------|-------|
| **Field Keys** | `twitter:app:name:iphone`, `twitter:app:id:iphone`, `twitter:app:url:iphone` |
| **Description** | iOS app details for app cards. |
| **Best Practice** | Include all three for proper app card display. |
| **Criticality** | `optional` |

---

### Twitter App (Android)

| Property | Value |
|----------|-------|
| **Field Keys** | `twitter:app:name:googleplay`, `twitter:app:id:googleplay`, `twitter:app:url:googleplay` |
| **Description** | Android app details for app cards. |
| **Best Practice** | Include all three for proper app card display. |
| **Criticality** | `optional` |

---

## 4. Structured Data

### Structured Data Found

| Property | Value |
|----------|-------|
| **Field Key** | `structuredData:found` |
| **Display Name** | Structured Data Found |
| **Description** | Whether JSON-LD structured data markup was detected on the page. |
| **Best Practice** | Include structured data for rich snippets in search results. |
| **Criticality** | `important` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Not found | `warning` | No JSON-LD structured data found. Consider adding Schema.org markup for rich search results. |
| Found | `success` | JSON-LD found with types: {types}. |

---

### Valid JSON-LD

| Property | Value |
|----------|-------|
| **Field Key** | `structuredData:isValidJson` |
| **Display Name** | Valid JSON-LD |
| **Description** | Whether the JSON-LD structured data is valid and parseable. |
| **Best Practice** | Validate with Google Rich Results Test or Schema.org validator. |
| **Criticality** | `important` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Invalid JSON | `error` | JSON-LD structured data contains invalid JSON: {error messages}. |

---

### Schema Types

| Property | Value |
|----------|-------|
| **Field Key** | `structuredData:types` |
| **Display Name** | Schema Types |
| **Description** | The Schema.org types detected in your structured data (Article, Product, Organization, etc.). |
| **Best Practice** | Use types relevant to your content. Common: Organization, WebPage, Article, Product. |
| **Criticality** | `important` |

---

### Structured Data Errors

| Property | Value |
|----------|-------|
| **Field Key** | `structuredData:validationErrors` |
| **Display Name** | Structured Data Errors |
| **Description** | Parsing or validation errors found in the structured data. |
| **Best Practice** | Fix all errors to ensure rich results eligibility. |
| **Criticality** | `important` |

---

## 5. Site Verification

### Google Site Verification

| Property | Value |
|----------|-------|
| **Field Key** | `verification:google` |
| **Display Name** | Google Site Verification |
| **Meta Name** | `google-site-verification` |
| **Description** | Verification code for Google Search Console ownership. |
| **Best Practice** | Required to access Search Console. Keep the tag after verification. |
| **Criticality** | `important` |

---

### Bing Site Verification

| Property | Value |
|----------|-------|
| **Field Key** | `verification:bing` |
| **Display Name** | Bing Site Verification |
| **Meta Name** | `msvalidate.01` |
| **Description** | Verification code for Bing Webmaster Tools ownership. |
| **Best Practice** | Required for Bing Webmaster Tools access. |
| **Criticality** | `optional` |

---

### Pinterest Site Verification

| Property | Value |
|----------|-------|
| **Field Key** | `verification:pinterest` |
| **Display Name** | Pinterest Site Verification |
| **Meta Name** | `p:domain_verify` |
| **Description** | Verification code for Pinterest business account. |
| **Best Practice** | Required for Pinterest Analytics and rich pins. |
| **Criticality** | `optional` |

---

### Facebook Domain Verification

| Property | Value |
|----------|-------|
| **Field Key** | `verification:facebook` |
| **Display Name** | Facebook Domain Verification |
| **Meta Name** | `facebook-domain-verification` |
| **Description** | Verification code for Facebook Business domain ownership. |
| **Best Practice** | Required for editing link previews and ad tracking. |
| **Criticality** | `optional` |

---

### Yandex Site Verification

| Property | Value |
|----------|-------|
| **Field Key** | `verification:yandex` |
| **Display Name** | Yandex Site Verification |
| **Meta Name** | `yandex-verification` |
| **Description** | Verification code for Yandex Webmaster Tools. |
| **Best Practice** | Required for Yandex search presence in Russia. |
| **Criticality** | `optional` |

---

## 6. Mobile / PWA

### Web App Manifest

| Property | Value |
|----------|-------|
| **Field Key** | `manifest` |
| **Display Name** | Web App Manifest |
| **Link Rel** | `manifest` |
| **Description** | Link to the PWA manifest file defining app-like behavior and install prompts. |
| **Best Practice** | Include for Progressive Web Apps. Define icons, theme, display mode. |
| **Criticality** | `optional` |

**Validation Rules:**

| Condition | Severity | Message |
|-----------|----------|---------|
| Missing | `warning` | No web app manifest found. Consider adding one for PWA support. |

---

### Apple Web App Capable

| Property | Value |
|----------|-------|
| **Field Key** | `apple:webAppCapable` |
| **Display Name** | Apple Web App Capable |
| **Meta Name** | `apple-mobile-web-app-capable` |
| **Description** | Enables full-screen mode when added to iOS home screen. |
| **Best Practice** | Set to "yes" for app-like experience. Pair with status bar style. |
| **Criticality** | `optional` |

---

### Apple Web App Title

| Property | Value |
|----------|-------|
| **Field Key** | `apple:webAppTitle` |
| **Display Name** | Apple Web App Title |
| **Meta Name** | `apple-mobile-web-app-title` |
| **Description** | The name displayed when added to iOS home screen. |
| **Best Practice** | Keep short (12 characters max). Match your brand name. |
| **Criticality** | `optional` |

---

### Apple Status Bar Style

| Property | Value |
|----------|-------|
| **Field Key** | `apple:webAppStatusBarStyle` |
| **Display Name** | Apple Status Bar Style |
| **Meta Name** | `apple-mobile-web-app-status-bar-style` |
| **Description** | Controls iOS status bar appearance in standalone mode. |
| **Best Practice** | Use "default", "black", or "black-translucent". |
| **Criticality** | `optional` |

**Valid Values:**
- `default` - Default grey status bar
- `black` - Black status bar
- `black-translucent` - Transparent with white text

---

### Apple Touch Icon

| Property | Value |
|----------|-------|
| **Field Key** | `apple:touchIcon` |
| **Display Name** | Apple Touch Icon |
| **Link Rel** | `apple-touch-icon` |
| **Description** | The icon displayed when saved to iOS home screen. |
| **Best Practice** | 180x180 pixels. Include multiple sizes for different devices. |
| **Criticality** | `important` |

**Recommended Sizes:**
- 57x57 - iPhone (non-Retina)
- 72x72 - iPad (non-Retina)
- 114x114 - iPhone (Retina)
- 120x120 - iPhone (Retina, iOS 7+)
- 144x144 - iPad (Retina)
- 180x180 - iPhone 6 Plus

---

### Format Detection

| Property | Value |
|----------|-------|
| **Field Key** | `formatDetection` |
| **Display Name** | Format Detection |
| **Meta Name** | `format-detection` |
| **Description** | Controls automatic detection and linking of phone numbers, addresses, etc. |
| **Best Practice** | Use "telephone=no" to prevent unwanted linking. |
| **Criticality** | `optional` |

---

## 7. Security

### Referrer Policy

| Property | Value |
|----------|-------|
| **Field Key** | `referrerPolicy` |
| **Display Name** | Referrer Policy |
| **Meta Name** | `referrer` |
| **Description** | Controls what referrer information is sent when navigating away from your page. |
| **Best Practice** | Use "strict-origin-when-cross-origin" for balanced privacy/analytics. |
| **Criticality** | `optional` |

**Valid Values:**
- `no-referrer` - Never send referrer
- `no-referrer-when-downgrade` - Send for same/upgrade, not downgrade
- `origin` - Send origin only
- `origin-when-cross-origin` - Full URL same-origin, origin cross-origin
- `same-origin` - Send for same-origin only
- `strict-origin` - Origin for same/upgrade, nothing for downgrade
- `strict-origin-when-cross-origin` - Full same-origin, origin cross-origin (recommended)
- `unsafe-url` - Always send full URL

---

### Content Security Policy

| Property | Value |
|----------|-------|
| **Field Key** | `contentSecurityPolicy` |
| **Display Name** | Content Security Policy |
| **Meta Name** | `content-security-policy` |
| **Description** | Defines allowed content sources to prevent XSS and injection attacks. |
| **Best Practice** | Define strict policies. Allow only trusted sources. |
| **Criticality** | `optional` |

---

### X-UA-Compatible

| Property | Value |
|----------|-------|
| **Field Key** | `xUaCompatible` |
| **Display Name** | X-UA-Compatible |
| **Meta Name** | `x-ua-compatible` |
| **Description** | Controls IE rendering mode. Legacy tag for Internet Explorer. |
| **Best Practice** | Use "IE=edge" if needed. Can be removed if not supporting IE. |
| **Criticality** | `optional` |

---

## 8. Technical SEO

### Index Directive

| Property | Value |
|----------|-------|
| **Field Key** | `robots:index` |
| **Display Name** | Index Directive |
| **Description** | Whether search engines should add this page to their index. |
| **Best Practice** | Use "index" for public pages, "noindex" for private or duplicate content. |
| **Criticality** | `critical` |

---

### Follow Directive

| Property | Value |
|----------|-------|
| **Field Key** | `robots:follow` |
| **Display Name** | Follow Directive |
| **Description** | Whether search engines should follow links on this page. |
| **Best Practice** | Use "follow" for most pages. "nofollow" for untrusted external links. |
| **Criticality** | `important` |

---

### No Archive Directive

| Property | Value |
|----------|-------|
| **Field Key** | `robots:noarchive` |
| **Display Name** | No Archive Directive |
| **Description** | Prevents search engines from caching/archiving the page. |
| **Best Practice** | Use for time-sensitive content or when fresh content is important. |
| **Criticality** | `optional` |

---

### No Snippet Directive

| Property | Value |
|----------|-------|
| **Field Key** | `robots:nosnippet` |
| **Display Name** | No Snippet Directive |
| **Description** | Prevents search engines from showing text snippets in results. |
| **Best Practice** | Rarely used. Consider max-snippet for more control. |
| **Criticality** | `optional` |

---

### Max Snippet

| Property | Value |
|----------|-------|
| **Field Key** | `robots:maxSnippet` |
| **Display Name** | Max Snippet |
| **Description** | Maximum length of text snippet in search results (-1 for no limit). |
| **Best Practice** | Use -1 to allow full snippets, or set character limit. |
| **Criticality** | `optional` |

---

### Max Image Preview

| Property | Value |
|----------|-------|
| **Field Key** | `robots:maxImagePreview` |
| **Display Name** | Max Image Preview |
| **Description** | Maximum size of image preview in search results (none, standard, large). |
| **Best Practice** | Use "large" for best visual presence in search results. |
| **Criticality** | `optional` |

---

### Previous Page URL

| Property | Value |
|----------|-------|
| **Field Key** | `prevUrl` |
| **Display Name** | Previous Page URL |
| **Link Rel** | `prev` |
| **Description** | Points to the previous page in a paginated series. |
| **Best Practice** | Use for multi-page content. Include with rel="prev" link tag. |
| **Criticality** | `optional` |

---

### Next Page URL

| Property | Value |
|----------|-------|
| **Field Key** | `nextUrl` |
| **Display Name** | Next Page URL |
| **Link Rel** | `next` |
| **Description** | Points to the next page in a paginated series. |
| **Best Practice** | Use for multi-page content. Include with rel="next" link tag. |
| **Criticality** | `optional` |

---

### Meta Keywords

| Property | Value |
|----------|-------|
| **Field Key** | `keywords` |
| **Display Name** | Meta Keywords |
| **Meta Name** | `keywords` |
| **Description** | A list of keywords relevant to the page. No longer used by major search engines. |
| **Best Practice** | Not recommended. Focus on content optimization instead. |
| **Criticality** | `optional` |

---

### Generator

| Property | Value |
|----------|-------|
| **Field Key** | `generator` |
| **Display Name** | Generator |
| **Meta Name** | `generator` |
| **Description** | Identifies the software that generated the page (WordPress, Next.js, etc.). |
| **Best Practice** | Consider removing to avoid exposing technology stack. |
| **Criticality** | `optional` |

---

## Scoring System

### Category Weights

| Category | Weight | Fields Scored |
|----------|--------|---------------|
| Basic SEO | 40% | Critical + Important fields only |
| Open Graph / Social | 30% | Critical + Important fields only |
| Twitter Cards | 20% | Critical + Important fields only |
| Technical (Structured Data) | 10% | Important fields only |

### Field Scoring

| Condition | Points |
|-----------|--------|
| Field present and valid | 100 |
| Field missing (critical) | 0 |
| Field missing (important) | 50 |
| Field missing (optional) | 100 (no penalty) |
| Quality issue detected | 0 |

### Quality Checks Applied to Score

- Title length (30-60 optimal)
- Description length (70-160 optimal)
- Viewport includes "width=device-width"
- OG/Twitter images are accessible (HTTP 200)
- JSON-LD is valid parseable JSON

---

## Severity Levels

| Level | Color | Usage |
|-------|-------|-------|
| `error` | Red | Critical issues that significantly impact SEO or functionality |
| `warning` | Yellow/Orange | Important issues that should be addressed |
| `success` | Green | Validation passed, good practice confirmed |

---

## Source Files

| File | Purpose |
|------|---------|
| `apps/portal/app/api/tools/meta-tag-analyser/route.ts` | Main validation logic (lines 335-569) |
| `apps/portal/app/tools/meta-tag-analyser/lib/scoring.ts` | Scoring algorithm |
| `apps/portal/app/tools/meta-tag-analyser/lib/field-tooltips.ts` | Field definitions & best practices |
| `packages/database/src/models/meta-tag-analysis.ts` | Database model |

---

## Image Validation

Images (OG and Twitter) are validated using HTTP requests:

1. **HEAD request** first (faster, no body download)
2. **GET fallback** if HEAD returns 404 or 405 (some CDNs don't support HEAD)
3. **5 second timeout** per request
4. Returns: `exists`, `statusCode`, `contentType`, `error`

---

*Last updated: January 2026*
