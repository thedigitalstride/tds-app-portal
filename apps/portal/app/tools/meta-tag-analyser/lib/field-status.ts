/**
 * Unified Field Status Logic
 *
 * This module is the SINGLE SOURCE OF TRUTH for determining field validity.
 * Both scoring (scoring.ts) and UI (MetadataViewer.tsx) consume this.
 *
 * The key insight: a field like og:image can have a URL present but still be
 * "invalid" if the image returns 404. This module handles that unified logic.
 */

import type { AnalysisIssue, ImageValidation, ImageValidations } from '../components/types';
import { FIELD_DEFINITIONS, type FieldCriticality } from './scoring';

export interface FieldStatusResult {
  status: 'error' | 'warning' | 'success';
  isPresent: boolean;
  issue?: AnalysisIssue;
}

/**
 * Maps issue field names to normalized field names.
 * The analyzeMetaTags function uses different field names than our definitions.
 */
const FIELD_ISSUE_MAP: Record<string, string[]> = {
  'og:image': ['og:image', 'og image', 'OG Image', 'OG Image Status'],
  'twitter:image': ['twitter:image', 'twitter image', 'Twitter Image', 'Twitter Image Status'],
  'title': ['title', 'Title'],
  'description': ['description', 'Description'],
  'viewport': ['viewport', 'Viewport'],
  'canonical': ['canonical', 'Canonical'],
  'charset': ['charset', 'Charset'],
  'language': ['language', 'Language'],
  'robots': ['robots', 'Robots'],
  'og:title': ['og:title', 'Open Graph'],
  'og:description': ['og:description'],
  'og:url': ['og:url'],
  'og:type': ['og:type'],
  'og:site_name': ['og:site_name'],
  'og:image:alt': ['og:image:alt', 'OG Image Alt'],
  'og:image:width': ['og:image:width', 'OG Image Dimensions'],
  'og:image:height': ['og:image:height'],
  'twitter:card': ['twitter:card', 'Twitter Card'],
  'twitter:title': ['twitter:title'],
  'twitter:description': ['twitter:description'],
  'twitter:site': ['twitter:site'],
  'twitter:creator': ['twitter:creator', 'Twitter Creator'],
  'twitter:image:alt': ['twitter:image:alt', 'Twitter Image Alt'],
  'structured-data': ['structured-data', 'Structured Data'],
  'web-manifest': ['web-manifest', 'Web Manifest'],
};

/**
 * Find a relevant issue for a given field name.
 */
function findRelevantIssue(fieldName: string, issues: AnalysisIssue[]): AnalysisIssue | undefined {
  const normalizedField = fieldName.toLowerCase();
  const possibleNames = FIELD_ISSUE_MAP[normalizedField] || [fieldName];

  return issues.find(i =>
    possibleNames.some(name => i.field.toLowerCase() === name.toLowerCase())
  );
}

/**
 * Get the criticality level for a field.
 */
function getFieldCriticality(fieldName: string): FieldCriticality {
  const def = FIELD_DEFINITIONS.find(d => d.name === fieldName);
  return def?.criticality || 'optional';
}

/**
 * Check if an image field's validation indicates the image is broken.
 */
function isImageBroken(
  fieldName: string,
  value: string | undefined | null,
  imageValidation?: ImageValidations
): { broken: boolean; validation?: ImageValidation } {
  if (!value) return { broken: false };

  const isOgImage = fieldName === 'og:image';
  const isTwitterImage = fieldName === 'twitter:image';

  if (!isOgImage && !isTwitterImage) return { broken: false };

  let validation = isOgImage
    ? imageValidation?.ogImage
    : imageValidation?.twitterImage;

  // If twitter:image has no validation but uses the same URL as og:image,
  // use the og:image validation (they're the same image)
  if (isTwitterImage && !validation && imageValidation?.ogImage) {
    const ogImageUrl = imageValidation.ogImage.url;
    if (ogImageUrl && value === ogImageUrl) {
      validation = imageValidation.ogImage;
    }
  }

  // If validation was performed and image doesn't exist, it's broken
  if (validation?.exists === false) {
    return { broken: true, validation };
  }

  // If validation shows image exists but content type is not an image, it's broken
  // This catches "soft 404s" where server returns 200 but with HTML error page
  if (validation?.exists === true && validation?.contentType && !validation.contentType.startsWith('image/')) {
    return {
      broken: true,
      validation: {
        ...validation,
        exists: false, // Override to indicate it's not a valid image
        error: `Invalid content type: ${validation.contentType} (expected image/*)`,
      },
    };
  }

  return { broken: false, validation };
}

/**
 * Unified field status determination for both scoring and UI.
 * Single source of truth for whether a field is valid.
 *
 * @param fieldName - The normalized field name (e.g., 'og:image', 'title')
 * @param value - The field's value (can be undefined/null/empty)
 * @param issues - List of analysis issues
 * @param imageValidation - Optional image validation results for og:image and twitter:image
 * @returns FieldStatusResult with status, isPresent flag, and optional issue
 */
export function getFieldStatus(
  fieldName: string,
  value: string | undefined | null,
  issues: AnalysisIssue[],
  imageValidation?: ImageValidations
): FieldStatusResult {
  // Find any issue for this field
  const issue = findRelevantIssue(fieldName, issues);

  // Special handling for image fields - check validation status
  const { broken: isImageFieldBroken, validation } = isImageBroken(fieldName, value, imageValidation);

  if (isImageFieldBroken) {
    // Image URL exists but the image is not accessible
    const errorMessage = validation?.error || `Image is not accessible (${validation?.statusCode || 'unknown status'})`;
    return {
      status: 'error',
      isPresent: false, // Treat broken images as "not present" for scoring
      issue: issue || {
        type: 'error',
        field: fieldName,
        message: errorMessage,
      },
    };
  }

  // If explicit issue exists, use its type
  if (issue) {
    return {
      status: issue.type === 'success' ? 'success' : issue.type,
      isPresent: Boolean(value && value.trim()),
      issue,
    };
  }

  // Field has valid value
  if (value && value.trim() !== '') {
    return { status: 'success', isPresent: true };
  }

  // Field is empty - use criticality to determine status
  const criticality = getFieldCriticality(fieldName);
  return {
    status: criticality === 'critical' ? 'error' : 'warning',
    isPresent: false,
  };
}

/**
 * Check if a field is present and valid.
 * Convenience wrapper for scoring that just returns the isPresent boolean.
 */
export function isFieldPresent(
  fieldName: string,
  value: string | undefined | null,
  issues: AnalysisIssue[],
  imageValidation?: ImageValidations
): boolean {
  return getFieldStatus(fieldName, value, issues, imageValidation).isPresent;
}

/**
 * Check if an image validation indicates a broken image.
 * This is for section-level status calculations that need to determine
 * if an image is broken without going through getFieldStatus.
 *
 * @param validation - The image validation object (ogImage or twitterImage)
 * @returns true if the image is broken (doesn't exist or has wrong content type)
 */
export function isImageValidationBroken(validation?: ImageValidation): boolean {
  if (!validation) return false;

  // Image explicitly doesn't exist
  if (validation.exists === false) {
    return true;
  }

  // Image returns 200 but wrong content type (soft 404)
  if (validation.exists === true && validation.contentType && !validation.contentType.startsWith('image/')) {
    return true;
  }

  return false;
}
