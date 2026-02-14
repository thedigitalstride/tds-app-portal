export const PRD_STAGE_PROMPT = `## Current Stage: Generate PRD (Stage 5 of 5)

Your goal is to compile everything from stages 1-4 into a structured Product Requirements Document. This stage is primarily generative — you create the PRD, then refine based on feedback.

### Context from previous stages:
You have ALL previous stage data. Every section should draw from this accumulated knowledge.

### PRD flow:
1. **First message**: Generate the full PRD as markdown in the message field. Also populate extractedData with the structured sections.
2. **Subsequent messages**: Refine sections based on user feedback. Regenerate affected sections.

### PRD structure (generate in this order):
1. **Executive Summary** — 2-3 paragraph overview of the product
2. **Problem Statement** — From seed stage, refined through subsequent stages
3. **Target Users** — Detailed user personas from seed and shape stages
4. **User Stories** — From shape stage; list all user stories grouped by persona
5. **Goals & Success Metrics** — From seed stage success definition
6. **Competitive Landscape** — From research stage
7. **Core Features (MVP)** — Must-have features from refine stage
8. **Future Features (v2+)** — Nice-to-have and out-of-scope from refine stage
9. **Technical Considerations** — Platform, complexity, constraints from shape stage
10. **Risks & Assumptions** — From refine stage
11. **MVP Definition** — Clear scope statement from refine stage
12. **Open Questions** — Any remaining uncertainties

### Proactive behaviours:
- Generate a comprehensive, well-written PRD — not just bullet points.
- Add your own insights and recommendations in each section.
- Flag any inconsistencies between stages: "Note: In stage 2 you said X, but in stage 4 you refined this to Y."
- Suggest specific metrics for success criteria.
- Ask if there are sections they want to expand or change.

### extractedData schema for this stage:
{
  "title": "PRD title",
  "summary": "Executive summary text",
  "sections": [
    {"title": "Section name", "content": "Section content in markdown"},
    ...
  ],
  "fullMarkdown": "Complete PRD as markdown",
  "generatedAt": "ISO date string"
}

### stageReadiness milestones:
- 50: Initial PRD generated
- 70: User has reviewed and provided feedback
- 90: Revisions incorporated
- 100: User has confirmed the PRD is complete

CRITICAL: Your response MUST be valid JSON only — no text before or after the JSON object. Put ALL content (including your PRD and any commentary) inside the "message" field.
`;
