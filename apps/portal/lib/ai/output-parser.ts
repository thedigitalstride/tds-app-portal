import type { IV2CategoryScores } from '@tds/database';
import type {
  AIAnalysisResult,
  AIIssue,
  AIRecommendation,
  AIMessageMatchItem,
  AISummary,
} from './types';

// Valid category keys
const VALID_CATEGORIES: (keyof IV2CategoryScores)[] = [
  'messageMatch',
  'adScent',
  'conversionElements',
  'technicalQuality',
  'contentRelevance',
  'trustCredibility',
];

// Valid severity levels
const VALID_SEVERITIES = ['critical', 'warning', 'suggestion'] as const;

// Valid priority levels
const VALID_PRIORITIES = ['high', 'medium', 'low'] as const;

// Valid match strengths
const VALID_MATCH_STRENGTHS = ['strong', 'partial', 'weak', 'missing'] as const;

/**
 * Extract JSON from a string that might contain markdown code blocks or other text.
 */
function extractJSON(content: string): string {
  // Try to find JSON in markdown code blocks first
  const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }

  // Try to find JSON object directly
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  // Return as-is if no JSON found
  return content;
}

/**
 * Clamp a number to a valid score range (0-100).
 */
function clampScore(value: unknown): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return 50; // Default to middle score
  return Math.max(0, Math.min(100, Math.round(num)));
}

/**
 * Validate and normalize a category string.
 */
function normalizeCategory(category: unknown): keyof IV2CategoryScores {
  if (typeof category !== 'string') return 'messageMatch';

  // Direct match
  if (VALID_CATEGORIES.includes(category as keyof IV2CategoryScores)) {
    return category as keyof IV2CategoryScores;
  }

  // Handle common variations
  const lower = category.toLowerCase().replace(/[_\s-]/g, '');
  const mapping: Record<string, keyof IV2CategoryScores> = {
    messagematch: 'messageMatch',
    adscent: 'adScent',
    conversionelements: 'conversionElements',
    conversion: 'conversionElements',
    technicalquality: 'technicalQuality',
    technical: 'technicalQuality',
    contentrelevance: 'contentRelevance',
    content: 'contentRelevance',
    trustcredibility: 'trustCredibility',
    trust: 'trustCredibility',
    credibility: 'trustCredibility',
  };

  return mapping[lower] || 'messageMatch';
}

/**
 * Validate and normalize a severity string.
 */
function normalizeSeverity(severity: unknown): AIIssue['severity'] {
  if (typeof severity !== 'string') return 'suggestion';

  const lower = severity.toLowerCase();
  if (VALID_SEVERITIES.includes(lower as AIIssue['severity'])) {
    return lower as AIIssue['severity'];
  }

  // Handle common variations
  if (lower === 'error' || lower === 'high') return 'critical';
  if (lower === 'medium' || lower === 'warn') return 'warning';
  return 'suggestion';
}

/**
 * Validate and normalize a priority string.
 */
function normalizePriority(priority: unknown): AIRecommendation['priority'] {
  if (typeof priority !== 'string') return 'medium';

  const lower = priority.toLowerCase();
  if (VALID_PRIORITIES.includes(lower as AIRecommendation['priority'])) {
    return lower as AIRecommendation['priority'];
  }

  // Handle common variations
  if (lower === 'critical' || lower === 'urgent') return 'high';
  if (lower === 'minor' || lower === 'optional') return 'low';
  return 'medium';
}

/**
 * Validate and normalize a match strength string.
 */
function normalizeMatchStrength(
  strength: unknown
): AIMessageMatchItem['matchStrength'] {
  if (typeof strength !== 'string') return 'weak';

  const lower = strength.toLowerCase();
  if (VALID_MATCH_STRENGTHS.includes(lower as AIMessageMatchItem['matchStrength'])) {
    return lower as AIMessageMatchItem['matchStrength'];
  }

  // Handle common variations
  if (lower === 'exact' || lower === 'full' || lower === 'complete') return 'strong';
  if (lower === 'some' || lower === 'moderate') return 'partial';
  if (lower === 'none' || lower === 'absent') return 'missing';
  return 'weak';
}

/**
 * Ensure a value is a string, with fallback.
 */
function ensureString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
}

/**
 * Ensure a value is an array of strings.
 */
function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => String(item).trim());
}

/**
 * Parse and validate an issue from raw data.
 */
function parseIssue(raw: unknown): AIIssue | null {
  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;

  return {
    severity: normalizeSeverity(obj.severity),
    category: normalizeCategory(obj.category),
    element: ensureString(obj.element, 'Unknown element'),
    problem: ensureString(obj.problem, 'Issue detected'),
    location: typeof obj.location === 'string' ? obj.location : undefined,
    impact: ensureString(obj.impact, 'May affect performance'),
  };
}

/**
 * Parse and validate a recommendation from raw data.
 */
function parseRecommendation(raw: unknown): AIRecommendation | null {
  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;

  return {
    priority: normalizePriority(obj.priority),
    category: normalizeCategory(obj.category),
    action: ensureString(obj.action, 'Review and improve'),
    currentState: ensureString(obj.currentState, 'Current state'),
    suggestedChange: ensureString(obj.suggestedChange, 'Suggested improvement'),
    estimatedImpact: ensureString(obj.estimatedImpact, 'Potential improvement'),
  };
}

/**
 * Parse and validate a message match item from raw data.
 */
function parseMessageMatchItem(raw: unknown): AIMessageMatchItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;

  if (!obj.adElement) return null;

  return {
    adElement: ensureString(obj.adElement, ''),
    pageElement: typeof obj.pageElement === 'string' ? obj.pageElement : undefined,
    matchStrength: normalizeMatchStrength(obj.matchStrength),
    notes: typeof obj.notes === 'string' ? obj.notes : undefined,
  };
}

/**
 * Parse and validate category scores from raw data.
 */
function parseCategoryScores(raw: unknown): IV2CategoryScores {
  const defaults: IV2CategoryScores = {
    messageMatch: 50,
    adScent: 50,
    conversionElements: 50,
    technicalQuality: 50,
    contentRelevance: 50,
    trustCredibility: 50,
  };

  if (!raw || typeof raw !== 'object') return defaults;

  const obj = raw as Record<string, unknown>;

  return {
    messageMatch: clampScore(obj.messageMatch ?? obj.message_match),
    adScent: clampScore(obj.adScent ?? obj.ad_scent),
    conversionElements: clampScore(
      obj.conversionElements ?? obj.conversion_elements ?? obj.conversion
    ),
    technicalQuality: clampScore(
      obj.technicalQuality ?? obj.technical_quality ?? obj.technical
    ),
    contentRelevance: clampScore(
      obj.contentRelevance ?? obj.content_relevance ?? obj.content
    ),
    trustCredibility: clampScore(
      obj.trustCredibility ?? obj.trust_credibility ?? obj.trust
    ),
  };
}

/**
 * Parse and validate summary from raw data.
 */
function parseSummary(raw: unknown): AISummary {
  const defaults: AISummary = {
    strengths: [],
    weaknesses: [],
    quickWins: [],
  };

  if (!raw || typeof raw !== 'object') return defaults;

  const obj = raw as Record<string, unknown>;

  return {
    strengths: ensureStringArray(obj.strengths),
    weaknesses: ensureStringArray(obj.weaknesses),
    quickWins: ensureStringArray(obj.quickWins ?? obj.quick_wins),
  };
}

/**
 * Calculate overall score from category scores using weights.
 */
function calculateOverallScore(categoryScores: IV2CategoryScores): number {
  const weights = {
    messageMatch: 0.25,
    adScent: 0.2,
    conversionElements: 0.2,
    technicalQuality: 0.15,
    contentRelevance: 0.1,
    trustCredibility: 0.1,
  };

  let totalScore = 0;
  for (const [category, weight] of Object.entries(weights)) {
    totalScore += categoryScores[category as keyof IV2CategoryScores] * weight;
  }

  return Math.round(totalScore);
}

/**
 * Parse and validate the AI response content into a structured result.
 */
export function parseAIResponse(content: string): AIAnalysisResult {
  // Extract JSON from the content
  const jsonStr = extractJSON(content);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse AI response JSON:', error);
    // Return default result if parsing fails
    return getDefaultResult();
  }

  if (!parsed || typeof parsed !== 'object') {
    return getDefaultResult();
  }

  const obj = parsed as Record<string, unknown>;

  // Parse category scores
  const categoryScores = parseCategoryScores(obj.categoryScores ?? obj.category_scores);

  // Parse overall score (recalculate if not provided or invalid)
  let overallScore = clampScore(obj.overallScore ?? obj.overall_score);
  if (!obj.overallScore && !obj.overall_score) {
    overallScore = calculateOverallScore(categoryScores);
  }

  // Parse issues array
  const issues: AIIssue[] = [];
  const rawIssues = Array.isArray(obj.issues) ? obj.issues : [];
  for (const rawIssue of rawIssues) {
    const issue = parseIssue(rawIssue);
    if (issue) issues.push(issue);
  }

  // Parse recommendations array
  const recommendations: AIRecommendation[] = [];
  const rawRecs = Array.isArray(obj.recommendations) ? obj.recommendations : [];
  for (const rawRec of rawRecs) {
    const rec = parseRecommendation(rawRec);
    if (rec) recommendations.push(rec);
  }

  // Parse message match map
  const messageMatchMap: AIMessageMatchItem[] = [];
  const rawMatches = Array.isArray(obj.messageMatchMap ?? obj.message_match_map)
    ? (obj.messageMatchMap ?? obj.message_match_map) as unknown[]
    : [];
  for (const rawMatch of rawMatches) {
    const match = parseMessageMatchItem(rawMatch);
    if (match) messageMatchMap.push(match);
  }

  // Parse summary
  const summary = parseSummary(obj.summary);

  return {
    overallScore,
    categoryScores,
    issues,
    recommendations,
    messageMatchMap,
    summary,
  };
}

/**
 * Get a default result when parsing fails completely.
 */
function getDefaultResult(): AIAnalysisResult {
  return {
    overallScore: 50,
    categoryScores: {
      messageMatch: 50,
      adScent: 50,
      conversionElements: 50,
      technicalQuality: 50,
      contentRelevance: 50,
      trustCredibility: 50,
    },
    issues: [
      {
        severity: 'warning',
        category: 'messageMatch',
        element: 'AI Analysis',
        problem: 'Unable to fully parse AI response',
        impact: 'Some analysis details may be missing',
      },
    ],
    recommendations: [],
    messageMatchMap: [],
    summary: {
      strengths: [],
      weaknesses: ['Analysis incomplete due to parsing error'],
      quickWins: [],
    },
  };
}
