import type { AnalysisFocus } from '../types';

export { SYSTEM_PROMPT, buildUserPrompt } from './base-analysis';
export { ECOMMERCE_FOCUS } from './ecommerce-focus';
export { LEADGEN_FOCUS } from './leadgen-focus';
export { B2B_FOCUS } from './b2b-focus';

import { ECOMMERCE_FOCUS } from './ecommerce-focus';
import { LEADGEN_FOCUS } from './leadgen-focus';
import { B2B_FOCUS } from './b2b-focus';

/**
 * Get the focus-specific prompt additions based on analysis type.
 */
export function getFocusAdditions(focus?: AnalysisFocus): string | undefined {
  switch (focus) {
    case 'ecommerce':
      return ECOMMERCE_FOCUS;
    case 'leadgen':
      return LEADGEN_FOCUS;
    case 'b2b':
      return B2B_FOCUS;
    case 'general':
    default:
      return undefined;
  }
}
