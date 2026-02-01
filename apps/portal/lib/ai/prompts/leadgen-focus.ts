/**
 * Lead generation specific additions to the analysis prompt.
 */
export const LEADGEN_FOCUS = `
## Lead Generation Specific Evaluation:

Pay special attention to these lead gen conversion factors:

### Form Optimization
- Is the form visible above the fold?
- How many form fields are required?
- Are field labels clear and helpful?
- Is there inline validation?
- Is the submit button compelling (not just "Submit")?

### Lead Magnet/Offer
- Is the offer or lead magnet clearly explained?
- What value does the user get for their information?
- Is there urgency or scarcity messaging?
- Is the benefit of filling out the form obvious?

### Trust for Lead Capture
- Privacy policy link near form
- "No spam" or data usage guarantees
- Social proof near the form
- Company contact information visible

### Friction Reduction
- Can users complete the form without scrolling?
- Are there unnecessary fields that could be removed?
- Is there a multi-step form option for complex requests?
- Are there micro-commitments before the main form?

### Follow-up Expectations
- Is it clear what happens after form submission?
- Response time expectations
- Next steps in the process

### Alternative Contact Methods
- Phone number for immediate contact
- Live chat option
- Email address displayed

Weight form-related elements heavily in conversionElements score.
Check that any "free consultation," "quote," or "demo" messaging in ads is reflected on the page.`;
