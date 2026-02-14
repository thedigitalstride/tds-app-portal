import { connectDB, IdeationPromptOverride, type IdeationPromptKey, IDEATION_PROMPT_KEYS } from '@tds/database';
import { IDEATION_SYSTEM_BASE } from './system-base';
import { SEED_STAGE_PROMPT } from './seed-stage';
import { SHAPE_STAGE_PROMPT } from './shape-stage';
import { RESEARCH_STAGE_PROMPT } from './research-stage';
import { REFINE_STAGE_PROMPT } from './refine-stage';
import { PRD_STAGE_PROMPT } from './prd-stage';
import { SCORING_PROMPT } from './scoring';
import { INSPIRATION_PROMPT } from './inspiration';

const DEFAULTS: Record<IdeationPromptKey, string> = {
  'system-base': IDEATION_SYSTEM_BASE,
  seed: SEED_STAGE_PROMPT,
  shape: SHAPE_STAGE_PROMPT,
  research: RESEARCH_STAGE_PROMPT,
  refine: REFINE_STAGE_PROMPT,
  prd: PRD_STAGE_PROMPT,
  scoring: SCORING_PROMPT,
  inspiration: INSPIRATION_PROMPT,
};

// 60-second in-memory cache
let cache: { data: Map<IdeationPromptKey, { content: string; updatedAt: Date }>; fetchedAt: number } | null = null;
const CACHE_TTL = 60_000;

async function loadOverrides(): Promise<Map<IdeationPromptKey, { content: string; updatedAt: Date }>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }

  await connectDB();
  const overrides = await IdeationPromptOverride.find({}).lean();
  const map = new Map<IdeationPromptKey, { content: string; updatedAt: Date }>();
  for (const o of overrides) {
    map.set(o.promptKey as IdeationPromptKey, { content: o.content, updatedAt: o.updatedAt });
  }
  cache = { data: map, fetchedAt: Date.now() };
  return map;
}

export function invalidatePromptCache(): void {
  cache = null;
}

export async function getPrompt(key: IdeationPromptKey): Promise<string> {
  const overrides = await loadOverrides();
  const override = overrides.get(key);
  return override ? override.content : DEFAULTS[key];
}

export function getDefaultPrompt(key: IdeationPromptKey): string {
  return DEFAULTS[key];
}

export interface PromptInfo {
  key: IdeationPromptKey;
  defaultContent: string;
  overrideContent: string | null;
  isOverridden: boolean;
  updatedAt: Date | null;
}

export async function getAllPrompts(): Promise<PromptInfo[]> {
  const overrides = await loadOverrides();

  return IDEATION_PROMPT_KEYS.map((key) => {
    const override = overrides.get(key);
    return {
      key,
      defaultContent: DEFAULTS[key],
      overrideContent: override ? override.content : null,
      isOverridden: !!override,
      updatedAt: override ? override.updatedAt : null,
    };
  });
}
