/**
 * B2B specific additions to the analysis prompt.
 */
export const B2B_FOCUS = `
## B2B Specific Evaluation:

Pay special attention to these B2B conversion factors:

### Professional Credibility
- Client logos and case studies
- Industry certifications and awards
- Team/company credentials
- Years in business or company size indicators

### B2B-Specific Trust Signals
- Enterprise security certifications (SOC 2, ISO, GDPR)
- Integration partners and technology stack
- Customer testimonials from recognizable companies
- Industry-specific compliance badges

### Decision-Maker Focus
- Content speaks to business outcomes, not just features
- ROI or business impact messaging
- Comparison tools or competitive differentiation
- Multiple stakeholder consideration (technical + business)

### B2B Conversion Paths
- Demo request option
- Free trial or proof of concept
- Contact sales team
- Resource downloads (whitepapers, case studies)
- Pricing request or custom quote

### Sales Cycle Support
- Multiple touchpoints for different funnel stages
- Educational content availability
- Self-service vs. sales-assisted paths
- Clear next steps for enterprise inquiries

### Professional Design
- Clean, corporate aesthetic
- No stock photos of obvious "business people"
- Professional copywriting tone
- No aggressive pop-ups or gimmicky elements

Weight trustCredibility and contentRelevance higher for B2B pages.
Verify that business-focused messaging in ads ("for enterprises," "teams," "businesses") is reflected on the landing page.
Check that technical or industry-specific terms in keywords appear in page content.`;
