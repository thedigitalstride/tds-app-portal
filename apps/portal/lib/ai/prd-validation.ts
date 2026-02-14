import type { IdeationAIResponse } from './ideation-ai-service';

export interface PrdValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface PrdValidationResult {
  valid: boolean;
  issues: PrdValidationIssue[];
  sectionCount: number;
  expectedSectionCount: number;
  missingSections: string[];
  truncated: boolean;
}

const EXPECTED_SECTIONS = [
  'Executive Summary',
  'Problem Statement',
  'Target Users',
  'User Stories',
  'Goals & Success Metrics',
  'Competitive Landscape',
  'Core Features (MVP)',
  'Future Features (v2+)',
  'Technical Considerations',
  'Risks & Assumptions',
  'MVP Definition',
  'Open Questions',
];

/**
 * Normalize a section title for fuzzy matching:
 * lowercase, replace `&` with `and`, strip parenthetical suffixes, collapse whitespace.
 */
function normalize(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sectionMatches(actual: string, expected: string): boolean {
  const a = normalize(actual);
  const e = normalize(expected);
  return a === e || a.includes(e) || e.includes(a);
}

/**
 * Validate a parsed PRD response without any AI calls.
 */
export function validatePrdResponse(
  parsed: IdeationAIResponse,
  stopReason?: string
): PrdValidationResult {
  const issues: PrdValidationIssue[] = [];
  const sections = (parsed.extractedData?.sections as Array<{ title?: string; content?: string }>) || [];
  const title = parsed.extractedData?.title as string | undefined;
  const summary = parsed.extractedData?.summary as string | undefined;
  const fullMarkdown = parsed.extractedData?.fullMarkdown as string | undefined;

  // Check for truncation
  const truncated = stopReason === 'max_tokens';
  if (truncated) {
    issues.push({
      code: 'TRUNCATED',
      message: 'Response was truncated (hit token limit). Content is likely incomplete.',
      severity: 'error',
    });
  }

  // Check extractedData exists and is non-empty
  if (!parsed.extractedData || Object.keys(parsed.extractedData).length === 0) {
    issues.push({
      code: 'NO_EXTRACTED_DATA',
      message: 'No structured data was extracted from the response.',
      severity: 'error',
    });
  }

  // Check title and summary
  if (!title) {
    issues.push({
      code: 'MISSING_TITLE',
      message: 'PRD title is missing from extracted data.',
      severity: 'warning',
    });
  }
  if (!summary) {
    issues.push({
      code: 'MISSING_SUMMARY',
      message: 'PRD summary is missing from extracted data.',
      severity: 'warning',
    });
  }

  // Check sections array
  if (!Array.isArray(sections) || sections.length === 0) {
    issues.push({
      code: 'NO_SECTIONS',
      message: 'No PRD sections were generated.',
      severity: 'error',
    });
  } else if (sections.length < 8) {
    issues.push({
      code: 'TOO_FEW_SECTIONS',
      message: `Only ${sections.length} sections generated (expected ${EXPECTED_SECTIONS.length}).`,
      severity: 'error',
    });
  }

  // Check each section has content
  for (const section of sections) {
    if (!section.content || section.content.trim().length === 0) {
      issues.push({
        code: 'EMPTY_SECTION',
        message: `Section "${section.title || 'unknown'}" has no content.`,
        severity: 'warning',
      });
    }
  }

  // Check fullMarkdown
  if (!fullMarkdown || fullMarkdown.trim().length < 100) {
    issues.push({
      code: 'MISSING_MARKDOWN',
      message: 'Full markdown PRD is missing or trivially short.',
      severity: 'warning',
    });
  }

  // Fuzzy match sections against expected names
  const missingSections: string[] = [];
  for (const expected of EXPECTED_SECTIONS) {
    const found = sections.some((s) => s.title && sectionMatches(s.title, expected));
    if (!found) {
      missingSections.push(expected);
    }
  }

  if (missingSections.length > 4) {
    issues.push({
      code: 'MANY_MISSING_SECTIONS',
      message: `${missingSections.length} expected sections are missing: ${missingSections.slice(0, 4).join(', ')}...`,
      severity: 'error',
    });
  } else if (missingSections.length > 0) {
    issues.push({
      code: 'SOME_MISSING_SECTIONS',
      message: `Missing sections: ${missingSections.join(', ')}.`,
      severity: 'warning',
    });
  }

  const hasError = issues.some((i) => i.severity === 'error');

  return {
    valid: !hasError,
    issues,
    sectionCount: sections.length,
    expectedSectionCount: EXPECTED_SECTIONS.length,
    missingSections,
    truncated,
  };
}

/**
 * Build a corrective user message for the retry attempt.
 */
export function buildCorrectionPrompt(
  originalOutput: string,
  validation: PrdValidationResult
): string {
  const errorLines = validation.issues
    .filter((i) => i.severity === 'error')
    .map((i) => `- ${i.message}`);

  const warningLines = validation.issues
    .filter((i) => i.severity === 'warning')
    .map((i) => `- ${i.message}`);

  const trimmedOutput = originalOutput.length > 6000
    ? originalOutput.slice(0, 6000) + '\n[...truncated for retry]'
    : originalOutput;

  let prompt = `Your previous PRD generation had quality issues that need to be fixed.\n\n`;
  prompt += `**Errors (must fix):**\n${errorLines.join('\n')}\n\n`;
  if (warningLines.length > 0) {
    prompt += `**Warnings:**\n${warningLines.join('\n')}\n\n`;
  }
  if (validation.missingSections.length > 0) {
    prompt += `**Missing sections:** ${validation.missingSections.join(', ')}\n\n`;
  }
  prompt += `Your previous output (may be truncated):\n\`\`\`\n${trimmedOutput}\n\`\`\`\n\n`;
  prompt += `Please regenerate the COMPLETE PRD with ALL 12 sections. Ensure your response is valid JSON with extractedData containing title, summary, sections (all 12), and fullMarkdown. Do NOT omit any sections.`;

  return prompt;
}
