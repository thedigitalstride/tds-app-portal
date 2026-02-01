/**
 * Field tooltips for PPC Page Analyser
 *
 * Provides descriptions, best practices, and criticality levels for all PPC analysis metrics.
 */

export interface PPCTooltip {
  /** Brief field name/title */
  title: string;
  /** What this metric measures (1-2 sentences) */
  description: string;
  /** Optimal values/guidelines */
  bestPractice: string;
  /** How important this metric is for PPC landing page performance */
  criticality: 'critical' | 'important' | 'optional';
}

export const PPC_TOOLTIPS: Record<string, PPCTooltip> = {
  // ===================
  // Overall Score
  // ===================
  overallScore: {
    title: 'Overall Score',
    description:
      'A weighted composite score (0-100) measuring how well your landing page aligns with your Google Ads campaign. Higher scores indicate better ad-to-page alignment.',
    bestPractice:
      '80+ is excellent, 60-79 needs improvement, below 60 requires urgent attention. Focus on critical categories first.',
    criticality: 'critical',
  },

  // ===================
  // Category Scores (6)
  // ===================
  messageMatch: {
    title: 'Message Match',
    description:
      'Measures how well your landing page headline and content align with your ad copy. Strong message match reduces bounce rates and improves Quality Score.',
    bestPractice:
      'Your page headline should contain the same keywords and value proposition as your ad headlines. Aim for 80%+ alignment.',
    criticality: 'critical',
  },
  adScent: {
    title: 'Ad Scent',
    description:
      'Evaluates the visual and contextual connection between your ad and landing page. Users should immediately recognise they\'re in the right place.',
    bestPractice:
      'Use consistent colours, imagery, and language from your ad. The first 5 seconds determine if users stay or leave.',
    criticality: 'critical',
  },
  conversionElements: {
    title: 'Conversion Elements',
    description:
      'Checks for CTAs, forms, phone numbers, and chat widgets that enable visitors to convert. These should be visible without scrolling.',
    bestPractice:
      'Primary CTA should be above the fold. Include multiple contact options (phone, form, chat) for different user preferences.',
    criticality: 'critical',
  },
  technicalQuality: {
    title: 'Technical Quality',
    description:
      'Assesses page speed, mobile responsiveness, and technical SEO factors that affect both user experience and Quality Score.',
    bestPractice:
      'Page should load in under 3 seconds. Ensure mobile-friendly design and proper meta tags.',
    criticality: 'important',
  },
  contentRelevance: {
    title: 'Content Relevance',
    description:
      'Measures how relevant your page content is to the target keywords and user search intent.',
    bestPractice:
      'Include target keywords naturally throughout the page. Address the specific problem or need your audience has.',
    criticality: 'important',
  },
  trustCredibility: {
    title: 'Trust & Credibility',
    description:
      'Evaluates trust signals like testimonials, reviews, certifications, security badges, and social proof that build visitor confidence.',
    bestPractice:
      'Display customer reviews, trust badges, case studies, and any relevant certifications prominently.',
    criticality: 'important',
  },

  // ===================
  // Severity Levels (3)
  // ===================
  severityCritical: {
    title: 'Critical Issue',
    description:
      'A severe problem that significantly harms conversion rates or Quality Score. These issues cause visitors to leave immediately or prevent conversions entirely.',
    bestPractice:
      'Address critical issues first. These typically include missing CTAs, broken forms, or major message mismatch.',
    criticality: 'critical',
  },
  severityWarning: {
    title: 'Warning',
    description:
      'A moderate issue that negatively impacts performance but doesn\'t completely prevent conversions. These reduce effectiveness over time.',
    bestPractice:
      'Fix after critical issues. Common warnings include slow load times, weak headlines, or missing trust signals.',
    criticality: 'important',
  },
  severitySuggestion: {
    title: 'Suggestion',
    description:
      'An opportunity for improvement that could enhance performance. Not fixing these won\'t break anything but addressing them can boost results.',
    bestPractice:
      'Consider these for optimisation sprints. They often include copy tweaks, layout improvements, or A/B test ideas.',
    criticality: 'optional',
  },

  // ===================
  // Priority Levels (3)
  // ===================
  priorityHigh: {
    title: 'High Priority',
    description:
      'This recommendation should be implemented first. It will have the greatest impact on your conversion rate and campaign performance.',
    bestPractice:
      'Implement high-priority changes immediately. These typically address fundamental alignment or conversion issues.',
    criticality: 'critical',
  },
  priorityMedium: {
    title: 'Medium Priority',
    description:
      'Important improvement that will noticeably enhance performance. Implement after addressing high-priority items.',
    bestPractice:
      'Schedule medium-priority changes for your next update cycle. They improve the overall experience.',
    criticality: 'important',
  },
  priorityLow: {
    title: 'Low Priority',
    description:
      'Nice-to-have improvement that provides incremental benefits. Address when you have bandwidth after higher priorities.',
    bestPractice:
      'Keep these in your backlog for continuous improvement. Good candidates for A/B testing.',
    criticality: 'optional',
  },

  // ===================
  // Match Strength (4)
  // ===================
  matchStrong: {
    title: 'Strong Match',
    description:
      'This ad element appears directly on your landing page with identical or near-identical wording. Creates seamless user experience.',
    bestPractice:
      'Excellent! This creates a seamless experience from ad to page. Maintain this alignment.',
    criticality: 'optional',
  },
  matchPartial: {
    title: 'Partial Match',
    description:
      'The ad element is present but with different wording or placement. Users can find it but the connection isn\'t immediately obvious.',
    bestPractice:
      'Consider strengthening the match by using more similar language or making the element more prominent.',
    criticality: 'important',
  },
  matchWeak: {
    title: 'Weak Match',
    description:
      'The concept exists on the page but the wording is quite different from the ad. Users may not recognise the connection.',
    bestPractice:
      'Rewrite the page element to more closely mirror the ad copy, especially for key value propositions.',
    criticality: 'important',
  },
  matchMissing: {
    title: 'Missing Match',
    description:
      'This ad element is not found anywhere on your landing page. Visitors may feel disconnected from what the ad promised.',
    bestPractice:
      'Add this element to your page, ideally in the headline or first paragraph visible above the fold.',
    criticality: 'critical',
  },

  // ===================
  // Summary Sections (3)
  // ===================
  summaryStrengths: {
    title: 'Strengths',
    description:
      'Things your landing page does well. These are elements working in your favour that you should maintain and potentially expand upon.',
    bestPractice:
      'Use your strengths as a foundation. Consider how to apply similar approaches to weaker areas of your page.',
    criticality: 'optional',
  },
  summaryWeaknesses: {
    title: 'Weaknesses',
    description:
      'Areas where your landing page falls short. These represent opportunities to improve conversion rates and Quality Score.',
    bestPractice:
      'Prioritise weaknesses that align with critical issues. Address the biggest gaps between your ad promise and page delivery.',
    criticality: 'important',
  },
  summaryQuickWins: {
    title: 'Quick Wins',
    description:
      'Easy-to-implement changes that can improve performance without major development work. Often copy or layout tweaks.',
    bestPractice:
      'Start here for immediate improvements. Quick wins can often be implemented in a single session.',
    criticality: 'important',
  },

  // ===================
  // Table Metrics (4)
  // ===================
  tableScore: {
    title: 'Score',
    description:
      'The overall alignment score for this landing page, ranging from 0-100. Based on message match, conversion elements, and technical factors.',
    bestPractice:
      'Green (80+) means good alignment. Amber (50-79) needs attention. Red (below 50) requires urgent fixes.',
    criticality: 'important',
  },
  tableScans: {
    title: 'Scan Count',
    description:
      'How many times this page has been analysed. Use scan history to track improvements over time.',
    bestPractice:
      'Regular rescans help you monitor progress after making changes. Aim for improvement trends.',
    criticality: 'optional',
  },
  tableHeadline: {
    title: 'Page Headline',
    description:
      'The primary headline detected on your landing page. This is the first thing visitors read and should match your ad.',
    bestPractice:
      'Your headline should clearly reflect your ad\'s main message. Include the primary keyword when natural.',
    criticality: 'important',
  },
  tableLastScanned: {
    title: 'Last Scanned',
    description:
      'When this page was last analysed. Older scans may not reflect current page content if changes have been made.',
    bestPractice:
      'Rescan after making changes to measure improvement. Rescan periodically to catch any regressions.',
    criticality: 'optional',
  },

  // ===================
  // Score Filters (3)
  // ===================
  filterGood: {
    title: 'Good (80+)',
    description:
      'Pages with strong ad alignment scoring 80 or higher. These are performing well but may still have optimisation opportunities.',
    bestPractice:
      'Monitor these pages to maintain performance. Look for quick wins to push them even higher.',
    criticality: 'optional',
  },
  filterWarning: {
    title: 'Warning (50-79)',
    description:
      'Pages with moderate alignment that need improvement. These are functional but leaving performance on the table.',
    bestPractice:
      'Prioritise these for optimisation. Focus on message match and conversion elements first.',
    criticality: 'important',
  },
  filterError: {
    title: 'Error (Below 50)',
    description:
      'Pages with poor alignment that urgently need attention. These likely have high bounce rates and low Quality Scores.',
    bestPractice:
      'Address these immediately. Major misalignment is costing you money on every click.',
    criticality: 'critical',
  },

  // ===================
  // Ad Entry Fields (4)
  // ===================
  pinnedPosition: {
    title: 'Pinned Position',
    description:
      'In Google Ads, you can pin headlines to specific positions (1, 2, or 3). Pinned headlines always appear in that position.',
    bestPractice:
      'Pin your most important headline to position 1. This ensures your key message always shows first.',
    criticality: 'optional',
  },
  matchTypeExact: {
    title: 'Exact Match',
    description:
      'Your ad shows only when someone searches for this exact keyword or close variants (plurals, misspellings).',
    bestPractice:
      'Use for high-intent keywords where you want precise control. Highest conversion rates but lowest reach.',
    criticality: 'important',
  },
  matchTypePhrase: {
    title: 'Phrase Match',
    description:
      'Your ad shows when the search includes the meaning of your keyword, in the same order, with words before or after.',
    bestPractice:
      'Good balance of reach and relevance. Use for key phrases where word order matters.',
    criticality: 'important',
  },
  matchTypeBroad: {
    title: 'Broad Match',
    description:
      'Your ad can show for searches related to your keyword, including synonyms, related searches, and variations.',
    bestPractice:
      'Use with Smart Bidding. Provides maximum reach but requires negative keywords to avoid irrelevant traffic.',
    criticality: 'important',
  },
  aiProvider: {
    title: 'AI Provider',
    description:
      'The AI model used to analyse your landing page. Different providers may produce slightly different insights.',
    bestPractice:
      'Claude and GPT-4 both provide quality analysis. Choose based on availability and preference.',
    criticality: 'optional',
  },
  analysisFocus: {
    title: 'Analysis Focus',
    description:
      'Tailors the analysis to your business type. Different focus areas emphasise different conversion elements and best practices.',
    bestPractice:
      'Select the option that best matches your page type for more relevant recommendations.',
    criticality: 'optional',
  },

  // ===================
  // General Concepts (8)
  // ===================
  aboveFold: {
    title: 'Above the Fold',
    description:
      'Content visible without scrolling. This is the most valuable real estate on your page as most visitors see only this before deciding to stay or leave.',
    bestPractice:
      'Include your headline, value proposition, and primary CTA above the fold. On mobile, this is roughly the first 600 pixels.',
    criticality: 'critical',
  },
  qualityScore: {
    title: 'Quality Score',
    description:
      'Google\'s rating of your ad relevance on a 1-10 scale. Higher scores mean lower costs and better ad positions.',
    bestPractice:
      'Landing page experience is 1 of 3 Quality Score factors. Good alignment directly improves your Quality Score.',
    criticality: 'critical',
  },
  messagingConsistency: {
    title: 'Messaging Consistency',
    description:
      'The degree to which your ad copy, landing page, and overall messaging tell the same story and make the same promises.',
    bestPractice:
      'Every touchpoint should reinforce the same core message. Inconsistency creates confusion and reduces trust.',
    criticality: 'critical',
  },
  conversionRate: {
    title: 'Conversion Rate',
    description:
      'The percentage of visitors who complete a desired action. Better page alignment typically leads to higher conversion rates.',
    bestPractice:
      'Track conversion rate changes after implementing recommendations. Even small improvements compound over time.',
    criticality: 'critical',
  },
  bounceRate: {
    title: 'Bounce Rate',
    description:
      'The percentage of visitors who leave without interacting. High bounce rates often indicate poor message match or slow load times.',
    bestPractice:
      'Aim for bounce rates below 50%. Message match issues are a common cause of high bounce rates.',
    criticality: 'important',
  },
  ctaButton: {
    title: 'Call-to-Action Button',
    description:
      'A button that prompts visitors to take action. Effective CTAs are visible, compelling, and clearly state what happens next.',
    bestPractice:
      'Use action verbs and create urgency. Make buttons visually distinct with contrasting colours.',
    criticality: 'critical',
  },
  formFields: {
    title: 'Form Fields',
    description:
      'Input fields visitors must complete. Fewer fields typically mean higher completion rates, but ensure you collect necessary information.',
    bestPractice:
      'Only ask for essential information. Each additional field can reduce form completion by 5-10%.',
    criticality: 'important',
  },
  trustSignals: {
    title: 'Trust Signals',
    description:
      'Elements that build credibility: reviews, testimonials, certifications, security badges, client logos, and guarantees.',
    bestPractice:
      'Include at least 3 trust signals. Place them near conversion points where visitors need reassurance.',
    criticality: 'important',
  },
};

/**
 * Get tooltip for a field, with fallback to field key as title
 */
export function getTooltip(tooltipKey: string): PPCTooltip {
  const tooltip = PPC_TOOLTIPS[tooltipKey];
  if (tooltip) return tooltip;

  // Fallback for unknown fields
  return {
    title: tooltipKey,
    description: 'PPC analysis metric.',
    bestPractice: 'Refer to documentation for best practices.',
    criticality: 'optional',
  };
}
