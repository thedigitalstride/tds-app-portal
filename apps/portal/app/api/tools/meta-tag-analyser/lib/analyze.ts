/**
 * Shared analysis rules for Meta Tag Analyser.
 *
 * This module is the SINGLE SOURCE OF TRUTH for issue detection.
 * All API routes use analyzeMetaTags() instead of duplicating
 * analysis logic with varying rule sets.
 */

import type { AnalysisIssue, MetaTagResult } from './types';

/**
 * Comprehensive meta tag analysis with 20+ rules.
 * Returns a list of issues (errors, warnings, successes) for the given result.
 */
export function analyzeMetaTags(result: MetaTagResult): AnalysisIssue[] {
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
      message: `JSON-LD structured data contains invalid JSON: ${result.structuredData.validationErrors.join(', ')}`,
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
