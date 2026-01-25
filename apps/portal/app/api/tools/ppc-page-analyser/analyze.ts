import * as cheerio from 'cheerio';

interface ConversionElement {
  type: 'cta_button' | 'form' | 'phone_number' | 'chat_widget' | 'email_link';
  found: boolean;
  count: number;
  aboveFold: boolean;
  details?: string;
}

interface Issue {
  type: 'error' | 'warning' | 'success';
  field: string;
  message: string;
}

interface AnalysisResult {
  headline?: string;
  subheadline?: string;
  conversionElements: ConversionElement[];
  issues: Issue[];
  score: number;
}

export function analyzePageContent(html: string, url: string): AnalysisResult {
  const $ = cheerio.load(html);
  const issues: Issue[] = [];
  const conversionElements: ConversionElement[] = [];

  // Extract headline (h1)
  const h1 = $('h1').first().text().trim();
  const headline = h1 || undefined;

  // Extract subheadline (first h2 or prominent paragraph)
  const h2 = $('h2').first().text().trim();
  const subheadline = h2 || undefined;

  // Check for headline
  if (!headline) {
    issues.push({
      type: 'error',
      field: 'headline',
      message: 'No H1 headline found on page',
    });
  } else {
    issues.push({
      type: 'success',
      field: 'headline',
      message: 'Page has a clear H1 headline',
    });
  }

  // Check for CTA buttons
  const ctaButtons = $('button, a.btn, a.button, [class*="cta"], [class*="button"], input[type="submit"]');
  const ctaCount = ctaButtons.length;
  conversionElements.push({
    type: 'cta_button',
    found: ctaCount > 0,
    count: ctaCount,
    aboveFold: true, // Simplified - would need viewport analysis
    details: ctaCount > 0 ? `Found ${ctaCount} potential CTA element(s)` : undefined,
  });

  if (ctaCount === 0) {
    issues.push({
      type: 'error',
      field: 'cta',
      message: 'No clear call-to-action buttons found',
    });
  } else {
    issues.push({
      type: 'success',
      field: 'cta',
      message: `Found ${ctaCount} CTA element(s)`,
    });
  }

  // Check for forms
  const forms = $('form');
  const formCount = forms.length;
  conversionElements.push({
    type: 'form',
    found: formCount > 0,
    count: formCount,
    aboveFold: true,
    details: formCount > 0 ? `Found ${formCount} form(s)` : undefined,
  });

  if (formCount > 0) {
    issues.push({
      type: 'success',
      field: 'form',
      message: `Page contains ${formCount} form(s) for lead capture`,
    });
  }

  // Check for phone numbers
  const phonePattern = /(\+?[\d\s\-().]{10,})/g;
  const phoneLinks = $('a[href^="tel:"]');
  const phoneCount = phoneLinks.length;
  const pageText = $('body').text();
  const phoneMatches = pageText.match(phonePattern) || [];

  conversionElements.push({
    type: 'phone_number',
    found: phoneCount > 0 || phoneMatches.length > 0,
    count: phoneCount || phoneMatches.length,
    aboveFold: true,
    details: phoneCount > 0 ? `Found ${phoneCount} clickable phone link(s)` : undefined,
  });

  // Check for email links
  const emailLinks = $('a[href^="mailto:"]');
  const emailCount = emailLinks.length;
  conversionElements.push({
    type: 'email_link',
    found: emailCount > 0,
    count: emailCount,
    aboveFold: true,
    details: emailCount > 0 ? `Found ${emailCount} email link(s)` : undefined,
  });

  // Check for chat widgets (common patterns)
  const chatIndicators = $('[class*="chat"], [id*="chat"], [class*="intercom"], [class*="drift"], [class*="zendesk"], [class*="crisp"], [class*="hubspot"]');
  const hasChatWidget = chatIndicators.length > 0;
  conversionElements.push({
    type: 'chat_widget',
    found: hasChatWidget,
    count: hasChatWidget ? 1 : 0,
    aboveFold: true,
    details: hasChatWidget ? 'Chat widget detected' : undefined,
  });

  // Check meta viewport for mobile
  const viewport = $('meta[name="viewport"]').attr('content');
  if (!viewport) {
    issues.push({
      type: 'warning',
      field: 'mobile',
      message: 'No viewport meta tag found - page may not be mobile-friendly',
    });
  } else {
    issues.push({
      type: 'success',
      field: 'mobile',
      message: 'Viewport meta tag present for mobile responsiveness',
    });
  }

  // Check page title
  const title = $('title').text().trim();
  if (!title) {
    issues.push({
      type: 'warning',
      field: 'title',
      message: 'Page is missing a title tag',
    });
  }

  // Check meta description
  const metaDesc = $('meta[name="description"]').attr('content');
  if (!metaDesc) {
    issues.push({
      type: 'warning',
      field: 'meta_description',
      message: 'Page is missing a meta description',
    });
  }

  // Calculate score
  let score = 50; // Base score

  // Headline present: +15
  if (headline) score += 15;

  // CTA buttons present: +20
  if (ctaCount > 0) score += 20;

  // Form present: +10
  if (formCount > 0) score += 10;

  // Phone number present: +5
  if (phoneCount > 0 || phoneMatches.length > 0) score += 5;

  // Viewport present: +5
  if (viewport) score += 5;

  // Deductions
  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  score -= errorCount * 10;
  score -= warningCount * 5;

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return {
    headline,
    subheadline,
    conversionElements,
    issues,
    score,
  };
}
