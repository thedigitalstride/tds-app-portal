/**
 * Utility functions for comparing metadata snapshots
 * Used to highlight differences between historical and current data
 */

import type { MetadataSnapshot, OpenGraphData, TwitterData } from './types';

/**
 * Represents the difference status for a single field
 */
export interface FieldDiff {
  changed: boolean;
  currentValue?: string;
}

/**
 * Compares two field values and returns diff information
 */
export function compareFields(
  historicValue: string | undefined | null,
  currentValue: string | undefined | null
): FieldDiff {
  const normalizedHistoric = historicValue?.trim() || '';
  const normalizedCurrent = currentValue?.trim() || '';

  const changed = normalizedHistoric !== normalizedCurrent;

  return {
    changed,
    // Keep empty string when changed (don't convert to undefined) so UI can show "Now: Not set"
    currentValue: changed ? normalizedCurrent : undefined,
  };
}

/**
 * Flattens nested object values into comparable strings
 */
function flattenValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(flattenValue).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return '';
}

/**
 * Compares two metadata snapshots and returns a map of field diffs
 */
export function compareSnapshots(
  historic: MetadataSnapshot,
  current: MetadataSnapshot
): Record<string, FieldDiff> {
  const diffs: Record<string, FieldDiff> = {};

  // Basic meta fields
  const basicFields = [
    'title',
    'description',
    'canonical',
    'robots',
    'viewport',
    'charset',
    'author',
    'themeColor',
    'language',
    'favicon',
  ] as const;

  for (const field of basicFields) {
    diffs[field] = compareFields(
      historic[field] as string | undefined,
      current[field] as string | undefined
    );
  }

  // Open Graph fields
  if (historic.openGraph || current.openGraph) {
    const historicOg = historic.openGraph || {} as OpenGraphData;
    const currentOg = current.openGraph || {} as OpenGraphData;

    const ogFields = [
      'title',
      'description',
      'image',
      'url',
      'type',
      'siteName',
      'locale',
    ] as const;

    for (const field of ogFields) {
      diffs[`og:${field}`] = compareFields(
        historicOg[field] as string | undefined,
        currentOg[field] as string | undefined
      );
    }

    // OG image alt
    diffs['og:image:alt'] = compareFields(
      historicOg.imageDetails?.alt,
      currentOg.imageDetails?.alt
    );
  }

  // Twitter fields
  if (historic.twitter || current.twitter) {
    const historicTwitter = historic.twitter || {} as TwitterData;
    const currentTwitter = current.twitter || {} as TwitterData;

    const twitterFields = [
      'card',
      'title',
      'description',
      'image',
      'site',
      'creator',
      'imageAlt',
    ] as const;

    for (const field of twitterFields) {
      diffs[`twitter:${field}`] = compareFields(
        historicTwitter[field] as string | undefined,
        currentTwitter[field] as string | undefined
      );
    }
  }

  // Structured data comparison (simplified - just check if found/types changed)
  if (historic.structuredData || current.structuredData) {
    const historicSD = historic.structuredData;
    const currentSD = current.structuredData;

    diffs['structuredData:found'] = compareFields(
      String(historicSD?.found || false),
      String(currentSD?.found || false)
    );

    diffs['structuredData:types'] = compareFields(
      (historicSD?.types || []).join(', '),
      (currentSD?.types || []).join(', ')
    );
  }

  // Technical SEO fields
  if (historic.technicalSeo || current.technicalSeo) {
    const historicTech = historic.technicalSeo || {};
    const currentTech = current.technicalSeo || {};

    diffs['keywords'] = compareFields(
      historicTech.keywords,
      currentTech.keywords
    );

    diffs['generator'] = compareFields(
      historicTech.generator,
      currentTech.generator
    );

    // Robots directives
    const historicRobots = historicTech.robotsDirectives || {};
    const currentRobots = currentTech.robotsDirectives || {};

    diffs['robots:index'] = compareFields(
      String(historicRobots.index ?? ''),
      String(currentRobots.index ?? '')
    );

    diffs['robots:follow'] = compareFields(
      String(historicRobots.follow ?? ''),
      String(currentRobots.follow ?? '')
    );
  }

  return diffs;
}

/**
 * Returns border class for changed field input elements
 */
export function getChangedFieldBorder(isChanged: boolean): string {
  return isChanged ? 'border-2 border-[#178bff]' : '';
}
