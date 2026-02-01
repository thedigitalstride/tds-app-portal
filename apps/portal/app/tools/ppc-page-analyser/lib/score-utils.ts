/**
 * Centralized score utilities for consistent display across the PPC Page Analyser.
 *
 * Score Thresholds:
 * - 80-100: Good (green) - Page is well-optimized
 * - 60-79: Warning (yellow) - Some improvements needed
 * - 40-59: Needs Work (orange) - Significant issues
 * - 0-39: Poor (red) - Critical issues
 */

export const SCORE_THRESHOLDS = {
  GOOD: 80,
  WARNING: 60,
  NEEDS_WORK: 40,
} as const;

/**
 * Get the text color class for a score.
 */
export function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.GOOD) return 'text-green-600';
  if (score >= SCORE_THRESHOLDS.WARNING) return 'text-yellow-600';
  if (score >= SCORE_THRESHOLDS.NEEDS_WORK) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get the background color class for a score.
 */
export function getScoreBgColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.GOOD) return 'bg-green-500';
  if (score >= SCORE_THRESHOLDS.WARNING) return 'bg-yellow-500';
  if (score >= SCORE_THRESHOLDS.NEEDS_WORK) return 'bg-orange-500';
  return 'bg-red-500';
}

/**
 * Get the combined text and background color classes for a score badge.
 */
export function getScoreBadgeColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.GOOD) return 'text-green-600 bg-green-50';
  if (score >= SCORE_THRESHOLDS.WARNING) return 'text-yellow-600 bg-yellow-50';
  if (score >= SCORE_THRESHOLDS.NEEDS_WORK) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
}

/**
 * Get the ring/stroke color class for circular progress indicators.
 */
export function getScoreRingColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.GOOD) return 'stroke-green-500';
  if (score >= SCORE_THRESHOLDS.WARNING) return 'stroke-yellow-500';
  if (score >= SCORE_THRESHOLDS.NEEDS_WORK) return 'stroke-orange-500';
  return 'stroke-red-500';
}

/**
 * Get the score category for filtering.
 */
export type ScoreCategory = 'good' | 'warning' | 'error';

export function getScoreCategory(score: number): ScoreCategory {
  if (score >= SCORE_THRESHOLDS.GOOD) return 'good';
  if (score >= SCORE_THRESHOLDS.WARNING) return 'warning';
  return 'error';
}

/**
 * Check if a score matches a filter category.
 */
export function matchesScoreFilter(
  score: number,
  filter: 'all' | ScoreCategory
): boolean {
  if (filter === 'all') return true;
  if (filter === 'good') return score >= SCORE_THRESHOLDS.GOOD;
  if (filter === 'warning') {
    return score >= SCORE_THRESHOLDS.WARNING && score < SCORE_THRESHOLDS.GOOD;
  }
  // 'error' - below warning threshold
  return score < SCORE_THRESHOLDS.WARNING;
}

/**
 * Get the primary display score for an analysis.
 * Prefers V2 AI score if available, falls back to V1 DOM score.
 */
export function getDisplayScore(analysis: {
  score: number;
  analysisV2?: { overallScore: number } | null;
}): number {
  return analysis.analysisV2?.overallScore ?? analysis.score;
}
