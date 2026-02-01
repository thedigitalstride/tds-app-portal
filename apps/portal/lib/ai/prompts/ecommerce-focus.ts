/**
 * E-commerce specific additions to the analysis prompt.
 */
export const ECOMMERCE_FOCUS = `
## E-commerce Specific Evaluation:

Pay special attention to these e-commerce conversion factors:

### Product Presentation
- Is the product clearly visible above the fold?
- Are product images high quality and zoomable?
- Is pricing clearly displayed?
- Are product variants (size, color) easy to select?

### Purchase Confidence
- Is there a clear "Add to Cart" or "Buy Now" button?
- Are shipping costs and times visible?
- Is there a return/refund policy displayed?
- Are stock availability indicators present?

### E-commerce Trust Signals
- Customer reviews and ratings
- Secure checkout badges
- Payment method icons
- Money-back guarantees

### Price-Related Elements
- Is the price prominent and matches ad expectations?
- Are there any promotions or discounts clearly shown?
- Is the value proposition clear relative to price?

### Product Page SEO
- Does the product title include target keywords?
- Is the product description comprehensive?
- Are there schema markup indicators for products?

Weight these factors heavily in your conversionElements and trustCredibility scores.
When mapping ad headlines about products, promotions, or prices, verify they match the landing page exactly.`;
