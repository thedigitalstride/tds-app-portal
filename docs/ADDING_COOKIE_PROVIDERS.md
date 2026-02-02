# Adding New Cookie Consent Providers

This guide explains how to identify, test, and implement support for new cookie consent providers in the Page Library's configurable cookie handling system.

## Overview

The system uses ScrapingBee's `js_scenario` feature to dismiss cookie dialogs before taking screenshots. Each provider has specific button selectors that need to be identified and added to the codebase.

**Key files:**
- `apps/portal/lib/services/scrapingbee-service.ts` - Provider scenarios defined here
- `packages/database/src/models/cookie-domain-config.ts` - Provider enum
- `apps/portal/app/tools/page-library/page.tsx` - UI dropdown options

## Step 1: Identify the Cookie Provider

When a user reports that cookie dialogs aren't being dismissed on a specific site:

1. **Navigate to the site** using Claude-in-Chrome browser tools:
   ```
   Use mcp__claude-in-chrome__tabs_context_mcp to get a tab
   Use mcp__claude-in-chrome__navigate to go to the URL
   ```

2. **Identify the provider** by inspecting the dialog:
   ```javascript
   // Run this via mcp__claude-in-chrome__javascript_tool

   // Check for common providers
   const providers = {
     cookiebot: !!document.querySelector('#CybotCookiebotDialog'),
     onetrust: !!document.querySelector('#onetrust-banner-sdk'),
     quantcast: !!document.querySelector('.qc-cmp2-container'),
     cookieyes: !!document.querySelector('.cky-consent-container'),
     termly: !!document.querySelector('#termly-code-snippet-support'),
     iubenda: !!document.querySelector('#iubenda-cs-banner'),
     trustArc: !!document.querySelector('#truste-consent-track'),
     didomi: !!document.querySelector('#didomi-host'),
     usercentrics: !!document.querySelector('#usercentrics-root'),
     complianz: !!document.querySelector('.cmplz-cookiebanner'),
   };

   Object.entries(providers).filter(([k, v]) => v).map(([k]) => k);
   ```

## Step 2: Find the Accept/Allow Button Selectors

Once you've identified the provider, find the button selectors:

```javascript
// Run via mcp__claude-in-chrome__javascript_tool

// Generic search for accept/allow buttons
const dialog = document.querySelector('[class*="cookie"], [id*="cookie"], [class*="consent"], [id*="consent"]');
const buttons = dialog ? Array.from(dialog.querySelectorAll('button, a[role="button"]')).filter(el => {
  const text = (el.textContent || '').toLowerCase();
  const id = (el.id || '').toLowerCase();
  return text.includes('accept') || text.includes('allow') || text.includes('agree') ||
         text.includes('ok') || text.includes('got it') ||
         id.includes('accept') || id.includes('allow');
}).map(el => ({
  selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`,
  id: el.id,
  className: el.className,
  text: el.textContent?.trim().slice(0, 50)
})) : [];

JSON.stringify(buttons, null, 2);
```

### Provider-Specific Selector Patterns

**Cookiebot:**
```javascript
// Primary selectors (try in order)
'#CybotCookiebotDialogBodyLevelButtonAccept'        // "Accept" button
'#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll'  // "Allow All" button
'#CybotCookiebotDialogBodyButtonAccept'             // Legacy
```

**OneTrust:**
```javascript
'#onetrust-accept-btn-handler'                      // "Accept All" button
'#accept-recommended-btn-handler'                   // "Accept Recommended"
'.onetrust-close-btn-handler'                       // Close button
```

**Quantcast (CMP2):**
```javascript
'.qc-cmp2-summary-buttons button[mode="primary"]'   // Accept button
'button.qc-cmp2-button[mode="primary"]'
```

**CookieYes:**
```javascript
'.cky-btn-accept'                                   // Accept All
'#cky-accept-btn'
```

**Complianz (WordPress):**
```javascript
'.cmplz-accept'                                     // Accept button
'.cmplz-btn.cmplz-accept'
```

## Step 3: Test the Selectors

Before implementing, verify the selectors work:

```javascript
// Run via mcp__claude-in-chrome__javascript_tool

// Test if clicking would work
const selector = '#onetrust-accept-btn-handler';  // Replace with your selector
const button = document.querySelector(selector);
if (button) {
  console.log('Button found:', button.textContent?.trim());
  console.log('Visible:', button.offsetParent !== null);
  // Uncomment to actually click: button.click();
} else {
  console.log('Button not found with selector:', selector);
}
```

## Step 4: Implement the Provider

### 4.1 Add to ScrapingBee Service

Edit `apps/portal/lib/services/scrapingbee-service.ts`:

```typescript
// 1. Update the type
export type CookieConsentProvider = 'none' | 'cookiebot' | 'onetrust';  // Add new provider

// 2. Add the scenario
const COOKIE_CONSENT_SCENARIOS: Record<string, JsScenarioInstruction[]> = {
  cookiebot: [
    { wait: 2000 },
    { click: '#CybotCookiebotDialogBodyLevelButtonAccept' },
    { click: '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll' },
    { wait: 500 },
  ],
  // ADD NEW PROVIDER HERE:
  onetrust: [
    { wait: 2000 },
    { click: '#onetrust-accept-btn-handler' },
    { click: '#accept-recommended-btn-handler' },
    { wait: 500 },
  ],
};
```

### 4.2 Update the Database Model

Edit `packages/database/src/models/cookie-domain-config.ts`:

```typescript
export type CookieConsentProvider = 'none' | 'cookiebot' | 'onetrust';  // Add here

// Update the enum in the schema
cookieConsentProvider: {
  type: String,
  enum: ['none', 'cookiebot', 'onetrust'],  // Add here
  default: 'none',
},
```

### 4.3 Update PageStore Model

Edit `packages/database/src/models/page-store.ts`:

```typescript
cookieConsentProvider: {
  type: String,
  enum: ['none', 'cookiebot', 'onetrust', null],  // Add here
  default: null,
},
```

### 4.4 Update the API Validation

Edit `apps/portal/app/api/cookie-domain-config/route.ts`:

```typescript
// Update validation
if (!['none', 'cookiebot', 'onetrust'].includes(cookieConsentProvider)) {
  return NextResponse.json(
    { error: 'Invalid cookieConsentProvider' },
    { status: 400 }
  );
}
```

### 4.5 Update the UI Dropdowns

Edit `apps/portal/app/tools/page-library/page.tsx` (Domain Settings modal):

```tsx
<select ...>
  <option value="cookiebot">Cookiebot</option>
  <option value="onetrust">OneTrust</option>  {/* Add here */}
  <option value="none">None</option>
</select>
```

Edit `apps/portal/components/url-batch-panel.tsx` (Bulk import):

```tsx
<select ...>
  <option value="none">No cookie handling</option>
  <option value="cookiebot">Cookiebot (auto-dismiss)</option>
  <option value="onetrust">OneTrust (auto-dismiss)</option>  {/* Add here */}
</select>
```

## Step 5: Test the Implementation

1. **Run type check:**
   ```bash
   npm run type-check
   ```

2. **Start dev server:**
   ```bash
   npm run dev
   ```

3. **Configure the domain:**
   - Go to Page Library
   - Click "Domain Settings"
   - Add the domain with the new provider

4. **Test a scan:**
   - Add a URL from that domain
   - Check the screenshot - cookie dialog should be dismissed

5. **Verify in logs (if debugging needed):**
   Add temporary logging to `scrapingbee-service.ts`:
   ```typescript
   console.log(`[ScrapingBee] Provider: ${provider}, Instructions:`, JSON.stringify(cookieInstructions));
   ```

## Troubleshooting

### Dialog still showing in screenshot

1. **Timing issue:** Increase the initial wait time:
   ```typescript
   { wait: 3000 },  // Try 3000ms instead of 2000ms
   ```

2. **Wrong selector:** Use browser tools to verify the exact selector on the live page

3. **Multiple buttons:** Some dialogs have multiple accept buttons - add all variants:
   ```typescript
   { click: '#primary-accept' },
   { click: '#secondary-accept' },
   { click: '.accept-button' },
   ```

### Domain not matching

Domains are normalized by stripping `www.` prefix. Both `www.example.com` and `example.com` URLs will match a config for `example.com`.

### Provider detection tips

- Check the page source for provider-specific scripts (e.g., `cookiebot.com`, `onetrust.com`)
- Look at the dialog's outermost container ID/class
- Check network requests for provider domains

## Common Provider Reference

| Provider | Detection Selector | Accept Button |
|----------|-------------------|---------------|
| Cookiebot | `#CybotCookiebotDialog` | `#CybotCookiebotDialogBodyLevelButtonAccept` |
| OneTrust | `#onetrust-banner-sdk` | `#onetrust-accept-btn-handler` |
| Quantcast | `.qc-cmp2-container` | `.qc-cmp2-summary-buttons button[mode="primary"]` |
| CookieYes | `.cky-consent-container` | `.cky-btn-accept` |
| Complianz | `.cmplz-cookiebanner` | `.cmplz-accept` |
| Iubenda | `#iubenda-cs-banner` | `.iubenda-cs-accept-btn` |
| Didomi | `#didomi-host` | `#didomi-notice-agree-button` |

## Notes

- ScrapingBee uses `strict: false` so clicks fail silently if elements don't exist
- Each scan uses a fresh browser session - cookies aren't persisted
- Multiple click instructions are tried in sequence (first match wins)
- The `wait` instruction uses milliseconds
