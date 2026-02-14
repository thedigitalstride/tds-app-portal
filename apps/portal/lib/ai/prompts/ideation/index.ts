import type { IdeaStage } from '@tds/database';
import type { IdeationPromptKey } from '@tds/database';
import { getPrompt } from './prompt-service';

export { IDEATION_SYSTEM_BASE } from './system-base';
export { SEED_STAGE_PROMPT } from './seed-stage';
export { SHAPE_STAGE_PROMPT } from './shape-stage';
export { RESEARCH_STAGE_PROMPT } from './research-stage';
export { REFINE_STAGE_PROMPT } from './refine-stage';
export { PRD_STAGE_PROMPT } from './prd-stage';
export { SCORING_PROMPT } from './scoring';
export { INSPIRATION_PROMPT } from './inspiration';
export { getPrompt, getDefaultPrompt, getAllPrompts, invalidatePromptCache } from './prompt-service';

const stageToKey: Record<IdeaStage, IdeationPromptKey> = {
  seed: 'seed',
  shape: 'shape',
  research: 'research',
  refine: 'refine',
  prd: 'prd',
};

export async function buildSystemPrompt(stage: IdeaStage, templateContext?: string): Promise<string> {
  const [systemBase, stagePrompt] = await Promise.all([
    getPrompt('system-base'),
    getPrompt(stageToKey[stage]),
  ]);

  let prompt = systemBase + '\n\n' + stagePrompt;

  if (templateContext) {
    prompt += `\n\n## Template Context\nThis idea was started from a template. Here is the pre-seeded context:\n${templateContext}`;
  }

  return prompt;
}
