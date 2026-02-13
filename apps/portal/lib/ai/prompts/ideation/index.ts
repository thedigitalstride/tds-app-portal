import type { IdeaStage } from '@tds/database';
import { IDEATION_SYSTEM_BASE } from './system-base';
import { SEED_STAGE_PROMPT } from './seed-stage';
import { SHAPE_STAGE_PROMPT } from './shape-stage';
import { RESEARCH_STAGE_PROMPT } from './research-stage';
import { REFINE_STAGE_PROMPT } from './refine-stage';
import { PRD_STAGE_PROMPT } from './prd-stage';

export { IDEATION_SYSTEM_BASE } from './system-base';
export { SEED_STAGE_PROMPT } from './seed-stage';
export { SHAPE_STAGE_PROMPT } from './shape-stage';
export { RESEARCH_STAGE_PROMPT } from './research-stage';
export { REFINE_STAGE_PROMPT } from './refine-stage';
export { PRD_STAGE_PROMPT } from './prd-stage';

const stagePrompts: Record<IdeaStage, string> = {
  seed: SEED_STAGE_PROMPT,
  shape: SHAPE_STAGE_PROMPT,
  research: RESEARCH_STAGE_PROMPT,
  refine: REFINE_STAGE_PROMPT,
  prd: PRD_STAGE_PROMPT,
};

export function getStagePrompt(stage: IdeaStage): string {
  return stagePrompts[stage];
}

export function buildSystemPrompt(stage: IdeaStage, templateContext?: string): string {
  let prompt = IDEATION_SYSTEM_BASE + '\n\n' + getStagePrompt(stage);

  if (templateContext) {
    prompt += `\n\n## Template Context\nThis idea was started from a template. Here is the pre-seeded context:\n${templateContext}`;
  }

  return prompt;
}
