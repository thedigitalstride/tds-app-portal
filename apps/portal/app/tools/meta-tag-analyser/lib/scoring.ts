/**
 * Meta Tag Analyser Scoring Algorithm v2
 *
 * PHILOSOPHY:
 * This scoring system guides toward the IDEAL SEO state. It evaluates
 * pages based on field criticality tiers aligned with SEO best practices.
 *
 * SCORING CATEGORIES:
 * - Basic SEO (40%): title, description, canonical, viewport, charset, language
 * - Social/OG (30%): og:title, og:description, og:image, og:url, og:type, og:site_name
 * - Twitter (20%): twitter:card, twitter:title, twitter:description, twitter:image, twitter:site
 * - Technical (10%): structured data, web manifest
 *
 * FIELD CRITICALITY:
 * - Critical: Must have. Missing = 0 points for that field.
 * - Important: Should have. Missing = 50 points (partial credit).
 * - Optional: Nice to have. Missing = 100 points (no penalty).
 *
 * QUALITY ISSUES:
 * Quality problems (e.g., title too long) are treated the same as missing
 * fields - a suboptimal field provides no SEO value.
 *
 * FORMULA:
 * CategoryScore = average(scoredFields) where scoredFields excludes optionals
 * OverallScore = (BasicSEO × 0.4) + (Social × 0.3) + (Twitter × 0.2) + (Technical × 0.1)
 *
 * EXAMPLES:
 * - All critical + important present: 100%
 * - Missing 1 critical in Social (4 critical fields): Social = 75%, Overall = 93%
 * - Missing title + description: BasicSEO = 50%, Overall = 80%
 */

import type { AnalysisIssue, ImageValidations, MetadataSnapshot } from '../components/types';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type FieldCriticality = 'critical' | 'important' | 'optional';

export interface CategoryScores {
  basicSeo: number;
  social: number;
  twitter: number;
  technical: number;
}

export interface ScoringResult {
  score: number;
  categoryScores: CategoryScores;
}

interface FieldDefinition {
  name: string;
  criticality: FieldCriticality;
  category: 'basicSeo' | 'social' | 'twitter' | 'technical';
}

interface FieldEvaluation {
  name: string;
  criticality: FieldCriticality;
  isPresent: boolean;
  hasQualityIssue: boolean;
}

// =============================================================================
// FIELD DEFINITIONS BY CATEGORY
// =============================================================================

/**
 * Complete mapping of all fields to their categories and criticality levels.
 * This is the single source of truth for field importance.
 */
export const FIELD_DEFINITIONS: FieldDefinition[] = [
  // Basic SEO (40% weight)
  { name: 'title', criticality: 'critical', category: 'basicSeo' },
  { name: 'description', criticality: 'critical', category: 'basicSeo' },
  { name: 'viewport', criticality: 'critical', category: 'basicSeo' },
  { name: 'canonical', criticality: 'important', category: 'basicSeo' },
  { name: 'charset', criticality: 'important', category: 'basicSeo' },
  { name: 'language', criticality: 'important', category: 'basicSeo' },
  { name: 'robots', criticality: 'optional', category: 'basicSeo' },

  // Social/Open Graph (30% weight)
  { name: 'og:title', criticality: 'critical', category: 'social' },
  { name: 'og:description', criticality: 'critical', category: 'social' },
  { name: 'og:image', criticality: 'critical', category: 'social' },
  { name: 'og:url', criticality: 'critical', category: 'social' },
  { name: 'og:type', criticality: 'important', category: 'social' },
  { name: 'og:site_name', criticality: 'important', category: 'social' },
  { name: 'og:locale', criticality: 'optional', category: 'social' },
  { name: 'og:image:alt', criticality: 'optional', category: 'social' },
  { name: 'og:image:width', criticality: 'optional', category: 'social' },
  { name: 'og:image:height', criticality: 'optional', category: 'social' },

  // Twitter (20% weight)
  { name: 'twitter:card', criticality: 'critical', category: 'twitter' },
  { name: 'twitter:title', criticality: 'critical', category: 'twitter' },
  { name: 'twitter:description', criticality: 'critical', category: 'twitter' },
  { name: 'twitter:image', criticality: 'critical', category: 'twitter' },
  { name: 'twitter:site', criticality: 'important', category: 'twitter' },
  { name: 'twitter:creator', criticality: 'optional', category: 'twitter' },
  { name: 'twitter:image:alt', criticality: 'optional', category: 'twitter' },

  // Technical (10% weight)
  { name: 'structured-data', criticality: 'important', category: 'technical' },
  { name: 'web-manifest', criticality: 'optional', category: 'technical' },
];

/**
 * Category weights for overall score calculation.
 * Must sum to 1.0 (100%).
 */
const CATEGORY_WEIGHTS: Record<keyof CategoryScores, number> = {
  basicSeo: 0.40,
  social: 0.30,
  twitter: 0.20,
  technical: 0.10,
};

// =============================================================================
// FIELD VALUE EXTRACTION
// =============================================================================

import { isFieldPresent as checkFieldPresent } from './field-status';

/**
 * Extracts the value of a field from the metadata result.
 * Returns the value as a string, or undefined if not present.
 */
function getFieldValue(
  fieldName: string,
  result: MetadataSnapshot
): string | undefined {
  switch (fieldName) {
    // Basic SEO fields
    case 'title':
      return result.title || undefined;
    case 'description':
      return result.description || undefined;
    case 'viewport':
      return result.viewport;
    case 'canonical':
      return result.canonical;
    case 'charset':
      return result.charset;
    case 'language':
      return result.language;
    case 'robots':
      return result.robots;

    // Open Graph fields
    case 'og:title':
      return result.openGraph?.title;
    case 'og:description':
      return result.openGraph?.description;
    case 'og:image':
      return result.openGraph?.image;
    case 'og:url':
      return result.openGraph?.url;
    case 'og:type':
      return result.openGraph?.type;
    case 'og:site_name':
      return result.openGraph?.siteName;
    case 'og:locale':
      return result.openGraph?.locale;
    case 'og:image:alt':
      return result.openGraph?.imageDetails?.alt;
    case 'og:image:width':
      return result.openGraph?.imageDetails?.width?.toString();
    case 'og:image:height':
      return result.openGraph?.imageDetails?.height?.toString();

    // Twitter fields
    case 'twitter:card':
      return result.twitter?.card;
    case 'twitter:title':
      return result.twitter?.title;
    case 'twitter:description':
      return result.twitter?.description;
    case 'twitter:image':
      return result.twitter?.image;
    case 'twitter:site':
      return result.twitter?.site;
    case 'twitter:creator':
      return result.twitter?.creator;
    case 'twitter:image:alt':
      return result.twitter?.imageAlt;

    // Technical fields - special handling
    case 'structured-data':
      // Structured data is "present" if found AND valid JSON
      return (result.structuredData?.found && result.structuredData?.isValidJson) ? 'true' : undefined;
    case 'web-manifest':
      return result.mobile?.manifest;

    default:
      return undefined;
  }
}

/**
 * Checks if a specific field is present and valid in the analysis result.
 * Delegates to the shared field-status utility for consistent logic.
 */
function isFieldPresent(
  fieldName: string,
  result: MetadataSnapshot,
  issues: AnalysisIssue[],
  imageValidation?: ImageValidations
): boolean {
  const value = getFieldValue(fieldName, result);
  return checkFieldPresent(fieldName, value, issues, imageValidation);
}

// =============================================================================
// QUALITY ISSUE DETECTION
// =============================================================================

/**
 * Maps issue field names to our normalized field names.
 * The analyzeMetaTags function uses different field names than our definitions.
 */
function normalizeIssueFieldName(field: string): string {
  const fieldMap: Record<string, string> = {
    'Title': 'title',
    'Description': 'description',
    'Viewport': 'viewport',
    'Canonical': 'canonical',
    'Charset': 'charset',
    'Language': 'language',
    'Robots': 'robots',
    'Open Graph': 'og:title', // Generic OG issue - maps to title
    'OG Image': 'og:image',
    'OG Image Alt': 'og:image:alt',
    'OG Image Dimensions': 'og:image:width', // Maps to dimensions
    'OG Image Status': 'og:image', // Broken image is a quality issue
    'Twitter Card': 'twitter:card',
    'Twitter Creator': 'twitter:creator',
    'Twitter Image Alt': 'twitter:image:alt',
    'Twitter Image': 'twitter:image',
    'Twitter Image Status': 'twitter:image', // Broken image is a quality issue
    'Structured Data': 'structured-data',
    'Web Manifest': 'web-manifest',
  };
  return fieldMap[field] || field.toLowerCase();
}

/**
 * Determines if a field has quality issues based on the issues list.
 * Quality issues are warnings or errors on fields that ARE present.
 */
function hasQualityIssue(
  fieldName: string,
  issues: AnalysisIssue[]
): boolean {
  // Fields with quality checks
  const qualityCheckFields = [
    'title',           // length 30-60
    'description',     // length 70-160
    'viewport',        // must include width=device-width
    'og:image',        // must be accessible
    'twitter:image',   // must be accessible
    'structured-data', // must be valid JSON
  ];

  if (!qualityCheckFields.includes(fieldName)) {
    return false;
  }

  // Check if there's a warning or error for this field
  return issues.some(issue => {
    const normalizedField = normalizeIssueFieldName(issue.field);
    // Include both warnings and errors as quality issues
    // Success means the field passed quality checks
    return normalizedField === fieldName && issue.type !== 'success';
  });
}

// =============================================================================
// SCORE CALCULATION
// =============================================================================

/**
 * Evaluates all fields and returns their status.
 */
function evaluateFields(
  result: MetadataSnapshot,
  issues: AnalysisIssue[],
  imageValidation?: ImageValidations
): FieldEvaluation[] {
  return FIELD_DEFINITIONS.map(field => ({
    name: field.name,
    criticality: field.criticality,
    isPresent: isFieldPresent(field.name, result, issues, imageValidation),
    hasQualityIssue: hasQualityIssue(field.name, issues),
  }));
}

/**
 * Calculates the score for a single field.
 *
 * @returns
 * - 100: Field is present and valid
 * - 0: Field has quality issue OR missing critical field
 * - 50: Missing important field (partial credit)
 * - 100: Missing optional field (no penalty)
 */
function calculateFieldScore(field: FieldEvaluation): number {
  // Quality issue = same as missing (0 points)
  if (field.hasQualityIssue) {
    return 0;
  }

  // Field is present and valid
  if (field.isPresent) {
    return 100;
  }

  // Field is missing - score based on criticality
  switch (field.criticality) {
    case 'critical':
      return 0;
    case 'important':
      return 50;
    case 'optional':
      return 100; // No penalty for missing optional fields
    default:
      return 0;
  }
}

/**
 * Calculates the score for a category.
 * Only critical and important fields contribute to the category score.
 * Optional fields are excluded from scoring (they can't hurt you).
 */
function calculateCategoryScore(
  evaluations: FieldEvaluation[],
  category: keyof CategoryScores
): number {
  const categoryFields = evaluations.filter(e => {
    const def = FIELD_DEFINITIONS.find(d => d.name === e.name);
    return def?.category === category;
  });

  // Only score critical and important fields
  const scoredFields = categoryFields.filter(
    f => f.criticality !== 'optional'
  );

  if (scoredFields.length === 0) {
    return 100; // No scored fields means perfect score for this category
  }

  const totalScore = scoredFields.reduce(
    (sum, field) => sum + calculateFieldScore(field),
    0
  );

  return Math.round(totalScore / scoredFields.length);
}

/**
 * Calculates all category scores.
 */
function calculateCategoryScores(
  evaluations: FieldEvaluation[]
): CategoryScores {
  return {
    basicSeo: calculateCategoryScore(evaluations, 'basicSeo'),
    social: calculateCategoryScore(evaluations, 'social'),
    twitter: calculateCategoryScore(evaluations, 'twitter'),
    technical: calculateCategoryScore(evaluations, 'technical'),
  };
}

/**
 * Calculates the overall score from category scores.
 * Uses weighted average based on CATEGORY_WEIGHTS.
 */
function calculateOverallScore(categories: CategoryScores): number {
  return Math.round(
    categories.basicSeo * CATEGORY_WEIGHTS.basicSeo +
    categories.social * CATEGORY_WEIGHTS.social +
    categories.twitter * CATEGORY_WEIGHTS.twitter +
    categories.technical * CATEGORY_WEIGHTS.technical
  );
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Main scoring function. Calculates the overall score and category breakdown
 * for a meta tag analysis result.
 *
 * @param result - The metadata snapshot from the analysis
 * @param issues - The list of issues found during analysis
 * @param imageValidation - Optional image validation results for og:image and twitter:image
 * @returns Score (0-100) and category breakdown
 *
 * @example
 * const { score, categoryScores } = calculateScore(result, issues, result.imageValidation);
 * // score: 85
 * // categoryScores: { basicSeo: 100, social: 75, twitter: 80, technical: 100 }
 */
export function calculateScore(
  result: MetadataSnapshot,
  issues: AnalysisIssue[],
  imageValidation?: ImageValidations
): ScoringResult {
  const evaluations = evaluateFields(result, issues, imageValidation);
  const categoryScores = calculateCategoryScores(evaluations);
  const score = calculateOverallScore(categoryScores);

  return {
    score,
    categoryScores,
  };
}

/**
 * Legacy function for backwards compatibility.
 * Returns just the overall score number.
 *
 * @deprecated Use calculateScore() instead to get category breakdown.
 */
export function calculateScoreFromIssues(issues: AnalysisIssue[]): number {
  // Legacy behavior: simple penalty system
  const errorCount = issues?.filter(i => i.type === 'error').length || 0;
  const warningCount = issues?.filter(i => i.type === 'warning').length || 0;
  return Math.max(0, 100 - (errorCount * 20) - (warningCount * 10));
}

/**
 * Gets the criticality level for a field.
 * Useful for UI display.
 */
export function getFieldCriticality(fieldName: string): FieldCriticality | undefined {
  const def = FIELD_DEFINITIONS.find(d => d.name === fieldName);
  return def?.criticality;
}

/**
 * Gets the category for a field.
 * Useful for UI grouping.
 */
export function getFieldCategory(fieldName: string): keyof CategoryScores | undefined {
  const def = FIELD_DEFINITIONS.find(d => d.name === fieldName);
  return def?.category;
}
