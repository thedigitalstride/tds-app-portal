/**
 * Application version information
 *
 * IMPORTANT: This file is managed by Claude Code during commits.
 * Do not edit manually unless necessary.
 *
 * Versioning follows Semantic Versioning (semver.org):
 * - MAJOR: Breaking changes (BREAKING CHANGE: or ! in commit)
 * - MINOR: New features (feat: commits)
 * - PATCH: Bug fixes & improvements (fix:, refactor:, etc.)
 */

export const VERSION = {
  major: 1,
  minor: 13,
  patch: 0,
  /** ISO date of last version bump */
  buildDate: '2026-02-19',
} as const;

export const VERSION_STRING = `${VERSION.major}.${VERSION.minor}.${VERSION.patch}`;

export function getVersionDisplay(): string {
  const date = new Date(VERSION.buildDate);
  const monthShort = date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  return `v${VERSION_STRING} · ${monthShort}`;
}
