export interface IdeaTemplate {
  id: string;
  name: string;
  description: string;
  preSeededContext: string;
}

export const ideaTemplates: IdeaTemplate[] = [
  {
    id: 'new-tool',
    name: 'New Tool for Toolbox',
    description: 'A new tool to add to the agency toolbox — something the team uses daily.',
    preSeededContext:
      'This idea is for a new internal tool that the agency team will use. It should integrate with the existing TDS App Portal. Consider how it fits alongside existing tools (Meta Tag Analyser, PPC Page Analyser, Page Library). Focus on practical, daily-use value.',
  },
  {
    id: 'process-improvement',
    name: 'Process Improvement',
    description: 'Improve an existing workflow or process within the agency.',
    preSeededContext:
      'This idea is about improving an existing process at the agency. Think about current pain points in client management, reporting, project delivery, or team collaboration. The goal is to save time, reduce errors, or improve quality of output.',
  },
  {
    id: 'client-deliverable',
    name: 'Client Deliverable',
    description: 'A new service or deliverable to offer clients.',
    preSeededContext:
      'This idea is for something the agency can offer to clients. It could be a new service, audit, report, or tool that clients interact with. Consider pricing, competitive differentiation, and how it fits into the agency service portfolio.',
  },
  {
    id: 'integration',
    name: 'Third-Party Integration',
    description: 'Connect with an external tool, API, or service.',
    preSeededContext:
      'This idea involves integrating with a third-party service or API. Consider which platforms would be most valuable to connect with (Google Analytics, Search Console, Slack, LinkedIn, etc.). Think about data flow, authentication, and what unique value the integration provides.',
  },
];

export function getTemplate(id: string): IdeaTemplate | undefined {
  return ideaTemplates.find((t) => t.id === id);
}
