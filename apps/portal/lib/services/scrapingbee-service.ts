/**
 * ScrapingBee Service
 *
 * Handles all interactions with ScrapingBee API for web scraping,
 * JavaScript rendering, and screenshot capture.
 */

// ScrapingBee js_scenario instruction types
export type JsScenarioInstruction =
  | { click: string }
  | { wait: number }
  | { wait_for: string }
  | { wait_for_and_click: string }
  | { scroll_x: number }
  | { scroll_y: number }
  | { fill: [string, string] }
  | { evaluate: string };

/**
 * Proxy tier for ScrapingBee requests.
 * - 'standard': Basic proxy (~5 credits with JS rendering) - try first
 * - 'premium': Premium proxy (~25 credits with JS rendering) - for sites that block standard
 * - 'stealth': Stealth proxy (~75 credits with JS rendering) - for extra-difficult sites
 */
export type ProxyTier = 'standard' | 'premium' | 'stealth';

export interface ScrapingBeeOptions {
  url: string;
  device?: 'desktop' | 'mobile';
  captureScreenshot?: boolean;
  fullPageScreenshot?: boolean;
  waitMs?: number;
  jsScenario?: JsScenarioInstruction[];
  blockAds?: boolean;
  /** @deprecated Use proxyTier instead */
  premiumProxy?: boolean;
  /** Proxy tier to use ('standard' | 'premium' | 'stealth'). Default: 'standard' */
  proxyTier?: ProxyTier;
  /** Cookie consent provider to use ('none' skips cookie handling) */
  cookieConsentProvider?: CookieConsentProvider;
}

export interface ScrapingBeeResult {
  html: string;
  screenshot?: Buffer;
  resolvedUrl: string;
  statusCode: number;
  creditsUsed: number;
  renderTimeMs: number;
  /** Which proxy tier was actually used for this request */
  proxyTierUsed: ProxyTier;
}

export interface ScrapingBeeError {
  message: string;
  statusCode?: number;
  creditsUsed: number;
}

const SCRAPINGBEE_API_URL = 'https://app.scrapingbee.com/api/v1/';
const DEFAULT_WAIT_MS = 5000; // Increased from 3000 for mobile responsive layouts with animations
const DEFAULT_TIMEOUT_MS = 60000;

// Cookie consent providers and their click scenarios
// Uses strict: false + click (not wait_for_and_click) so missing elements fail silently
export type CookieConsentProvider = 'none' | 'cookiebot';

const COOKIE_CONSENT_SCENARIOS: Record<string, JsScenarioInstruction[]> = {
  cookiebot: [
    // Wait for page and cookie dialog to load
    { wait: 2000 },
    // Try multiple Cookiebot selectors (click fails silently if not found with strict: false)
    // Different Cookiebot configs use different button IDs
    { click: '#CybotCookiebotDialogBodyLevelButtonAccept' },           // "Accept" button (common)
    { click: '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll' }, // "Allow All" button (some configs)
    { click: '#CybotCookiebotDialogBodyButtonAccept' },                // Legacy selector
    { click: '#CybotCookiebotDialogBodyContentButtonAccept' },         // Another variant
    // Wait for dialog to animate away
    { wait: 500 },
  ],
  // Future providers can be added here:
  // onetrust: [{ wait: 2000 }, { click: '#onetrust-accept-btn-handler' }, { wait: 500 }],
};

/**
 * Fetch a URL using ScrapingBee API
 *
 * Uses json_response=true to get both HTML and screenshot in a single request.
 * Response format: { body: "html content", screenshot: "base64 encoded png" }
 */
export async function fetchWithScrapingBee(
  options: ScrapingBeeOptions
): Promise<ScrapingBeeResult> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;

  if (!apiKey) {
    throw new Error('SCRAPINGBEE_API_KEY environment variable is not set');
  }

  const startTime = Date.now();

  // Determine proxy tier (support legacy premiumProxy option)
  const proxyTier: ProxyTier = options.proxyTier ?? (options.premiumProxy ? 'stealth' : 'standard');

  const params = new URLSearchParams({
    api_key: apiKey,
    url: options.url,
    render_js: 'true',
    wait: String(options.waitMs ?? DEFAULT_WAIT_MS),
    wait_browser: 'networkidle2', // Allow up to 2 connections (analytics/tracking scripts)
    block_ads: String(options.blockAds ?? true),
    block_resources: 'false', // Keep images/CSS for accurate screenshots
    json_response: 'true', // Critical: returns JSON with both body and screenshot
    country_code: 'gb', // UK-based proxy (ISO 3166-1 alpha-2: Great Britain)
  });

  // Configure proxy based on tier
  // - standard: No premium_proxy flag (uses standard proxies, ~5 credits with JS)
  // - premium: premium_proxy=true (~25 credits with JS)
  // - stealth: premium_proxy=true + stealth_proxy=true (~75 credits with JS)
  if (proxyTier === 'premium' || proxyTier === 'stealth') {
    params.set('premium_proxy', 'true');
  }
  if (proxyTier === 'stealth') {
    params.set('stealth_proxy', 'true');
  }

  // Device emulation with viewport width for responsive CSS
  if (options.device === 'mobile') {
    params.set('device', 'mobile');
    params.set('window_width', '375'); // iPhone viewport width triggers responsive CSS breakpoints
  } else if (options.device === 'desktop') {
    params.set('device', 'desktop');
    // Desktop uses default viewport (1920px)
  }

  // Screenshot options
  if (options.captureScreenshot) {
    params.set('screenshot', 'true');
    if (options.fullPageScreenshot !== false) {
      params.set('screenshot_full_page', 'true');
    }
  }

  // Build JS scenario: cookie consent handling (if provider specified) + custom instructions
  const provider = options.cookieConsentProvider ?? 'none';
  const cookieInstructions = provider !== 'none' && COOKIE_CONSENT_SCENARIOS[provider]
    ? COOKIE_CONSENT_SCENARIOS[provider]
    : [];

  const customInstructions = options.jsScenario ?? [];
  const allInstructions = [...cookieInstructions, ...customInstructions];

  // Only set js_scenario if we have instructions to run
  if (allInstructions.length > 0) {
    const scenario = {
      strict: false, // Fail silently if elements don't exist
      instructions: allInstructions,
    };
    params.set('js_scenario', JSON.stringify(scenario));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${SCRAPINGBEE_API_URL}?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const renderTimeMs = Date.now() - startTime;

    // Extract credits used from response headers
    const creditsUsed = parseInt(response.headers.get('spb-cost') || '0', 10);
    const resolvedUrl = response.headers.get('spb-resolved-url') || options.url;
    const initialStatusCode = parseInt(
      response.headers.get('spb-initial-status-code') || '200',
      10
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw {
        message: `ScrapingBee request failed: ${response.status} - ${errorBody}`,
        statusCode: response.status,
        creditsUsed,
      } as ScrapingBeeError;
    }

    // With json_response=true, we get a JSON object
    const jsonResponse = await response.json();

    let html: string = '';
    let screenshot: Buffer | undefined;

    // Extract HTML from body field
    if (jsonResponse.body) {
      html = jsonResponse.body;
    }

    // Extract screenshot from base64
    if (jsonResponse.screenshot) {
      screenshot = Buffer.from(jsonResponse.screenshot, 'base64');
    }

    return {
      html,
      screenshot,
      resolvedUrl,
      statusCode: initialStatusCode,
      creditsUsed,
      renderTimeMs,
      proxyTierUsed: proxyTier,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw {
        message: 'ScrapingBee request timed out',
        creditsUsed: 0,
      } as ScrapingBeeError;
    }

    throw error;
  }
}

// HTTP status codes that indicate blocking (should retry with premium)
const BLOCKED_STATUS_CODES = [
  403, // Forbidden
  407, // Proxy Authentication Required
  429, // Too Many Requests
  503, // Service Unavailable (often used for blocking)
];

/**
 * Check if an error indicates the request was blocked and should retry with a higher proxy tier.
 */
function isBlockedError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const e = error as ScrapingBeeError;

    // Check status code
    if (e.statusCode && BLOCKED_STATUS_CODES.includes(e.statusCode)) {
      return true;
    }

    // Check error message patterns
    const msg = e.message?.toLowerCase() || '';
    if (
      msg.includes('blocked') ||
      msg.includes('captcha') ||
      msg.includes('access denied') ||
      msg.includes('forbidden') ||
      msg.includes('bot detected') ||
      msg.includes('rate limit')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Get the next proxy tier in the escalation chain.
 */
function getNextProxyTier(current: ProxyTier): ProxyTier | null {
  switch (current) {
    case 'standard':
      return 'premium';
    case 'premium':
      return 'stealth';
    case 'stealth':
      return null; // Already at max tier
  }
}

export interface FetchWithRetryOptions extends ScrapingBeeOptions {
  /** Whether to auto-escalate to higher proxy tiers on blocking errors. Default: true */
  autoEscalate?: boolean;
}

/**
 * Fetch a URL with automatic proxy tier escalation on blocking errors.
 *
 * This is a credit-efficient wrapper around fetchWithScrapingBee that:
 * 1. Starts with the specified tier (default: 'standard' - cheapest)
 * 2. If blocked, automatically retries with the next tier
 * 3. Returns the result with the actual tier used
 *
 * Cost savings: ~80% when sites work with standard proxy
 * Cost increase: ~20% when premium is required (standard fails + premium succeeds)
 */
export async function fetchWithRetry(
  options: FetchWithRetryOptions
): Promise<ScrapingBeeResult> {
  const { autoEscalate = true, proxyTier = 'standard', ...opts } = options;

  try {
    // First attempt with specified tier (default: standard)
    return await fetchWithScrapingBee({ ...opts, proxyTier });
  } catch (error) {
    // If auto-escalate disabled or already at max tier, rethrow
    if (!autoEscalate) {
      throw error;
    }

    const nextTier = getNextProxyTier(proxyTier);
    if (!nextTier) {
      // Already at stealth (max tier), can't escalate further
      throw error;
    }

    // Check if error indicates blocking
    if (!isBlockedError(error)) {
      // Not a blocking error, don't retry with premium
      throw error;
    }

    // Log escalation for monitoring
    console.log(
      `[ScrapingBee] Escalating from ${proxyTier} to ${nextTier} for ${opts.url} ` +
        `(blocked: ${(error as ScrapingBeeError).statusCode || (error as ScrapingBeeError).message})`
    );

    // Retry with next tier (recursively to handle standard → premium → stealth)
    return await fetchWithRetry({
      ...opts,
      proxyTier: nextTier,
      autoEscalate, // Keep auto-escalate enabled for potential stealth escalation
    });
  }
}

export interface DualScreenshotOptions
  extends Omit<ScrapingBeeOptions, 'url' | 'device' | 'captureScreenshot'> {
  /** Whether to auto-escalate proxy tier on blocking errors. Default: true */
  autoEscalate?: boolean;
}

export interface HtmlOnlyOptions
  extends Omit<ScrapingBeeOptions, 'url' | 'device' | 'captureScreenshot' | 'fullPageScreenshot'> {
  /** Whether to auto-escalate proxy tier on blocking errors. Default: true */
  autoEscalate?: boolean;
}

export interface HtmlOnlyResult {
  html: string;
  resolvedUrl: string;
  statusCode: number;
  creditsUsed: number;
  renderTimeMs: number;
  /** Which proxy tier was used */
  proxyTierUsed: ProxyTier;
}

export interface DualScreenshotResult {
  html: string;
  screenshotDesktop?: Buffer;
  screenshotMobile?: Buffer;
  resolvedUrl: string;
  statusCode: number;
  totalCreditsUsed: number;
  renderTimeMs: number;
  /** The highest proxy tier used (may differ between desktop/mobile) */
  proxyTierUsed: ProxyTier;
}

/**
 * Fetch a page with both desktop and mobile screenshots
 *
 * Uses Promise.allSettled to handle partial failures - if one screenshot fails,
 * we still return the successful one rather than losing both.
 *
 * Uses fetchWithRetry for automatic proxy tier escalation on blocking errors,
 * starting with standard proxy (cheapest) and escalating to premium/stealth if needed.
 */
export async function fetchWithDualScreenshots(
  url: string,
  options?: DualScreenshotOptions
): Promise<DualScreenshotResult> {
  const startTime = Date.now();
  const proxyTier = options?.proxyTier ?? 'standard';
  const autoEscalate = options?.autoEscalate ?? true;

  console.log(
    `[ScrapingBee] Starting dual screenshot fetch for ${url} (tier: ${proxyTier}, autoEscalate: ${autoEscalate})`
  );

  // Fetch desktop (with HTML) and mobile (screenshot only) in parallel
  // Use Promise.allSettled to handle partial failures gracefully
  // Use fetchWithRetry for automatic proxy tier escalation
  const [desktopSettled, mobileSettled] = await Promise.allSettled([
    fetchWithRetry({
      url,
      device: 'desktop',
      captureScreenshot: true,
      fullPageScreenshot: true,
      proxyTier,
      autoEscalate,
      blockAds: options?.blockAds ?? true,
      waitMs: options?.waitMs,
      jsScenario: options?.jsScenario,
      cookieConsentProvider: options?.cookieConsentProvider,
    }),
    fetchWithRetry({
      url,
      device: 'mobile',
      captureScreenshot: true,
      fullPageScreenshot: true,
      proxyTier,
      autoEscalate,
      blockAds: options?.blockAds ?? true,
      waitMs: options?.waitMs,
      jsScenario: options?.jsScenario,
      cookieConsentProvider: options?.cookieConsentProvider,
    }),
  ]);

  // Extract results, handling partial failures
  let desktopResult: ScrapingBeeResult | undefined;
  let mobileResult: ScrapingBeeResult | undefined;
  let totalCreditsUsed = 0;

  if (desktopSettled.status === 'fulfilled') {
    desktopResult = desktopSettled.value;
    totalCreditsUsed += desktopResult.creditsUsed;
    console.log(
      `[ScrapingBee] Desktop fetch succeeded for ${url}: ${desktopResult.creditsUsed} credits, ` +
        `${desktopResult.renderTimeMs}ms, tier: ${desktopResult.proxyTierUsed}`
    );
  } else {
    console.error(`[ScrapingBee] Desktop fetch failed for ${url}:`, desktopSettled.reason);
  }

  if (mobileSettled.status === 'fulfilled') {
    mobileResult = mobileSettled.value;
    totalCreditsUsed += mobileResult.creditsUsed;
    console.log(
      `[ScrapingBee] Mobile fetch succeeded for ${url}: ${mobileResult.creditsUsed} credits, ` +
        `${mobileResult.renderTimeMs}ms, tier: ${mobileResult.proxyTierUsed}`
    );
  } else {
    console.error(`[ScrapingBee] Mobile fetch failed for ${url}:`, mobileSettled.reason);
  }

  // If both failed, throw an error
  if (!desktopResult && !mobileResult) {
    throw new Error(
      `Both desktop and mobile fetches failed for ${url}. ` +
        `Desktop error: ${desktopSettled.status === 'rejected' ? desktopSettled.reason : 'N/A'}. ` +
        `Mobile error: ${mobileSettled.status === 'rejected' ? mobileSettled.reason : 'N/A'}.`
    );
  }

  // Use desktop result for HTML/resolvedUrl/statusCode, fallback to mobile if desktop failed
  const primaryResult = desktopResult || mobileResult!;

  // Track the highest proxy tier used (for analytics)
  // If either required escalation, report the higher tier
  const tierPriority: Record<ProxyTier, number> = { standard: 0, premium: 1, stealth: 2 };
  const desktopTierPriority = desktopResult ? tierPriority[desktopResult.proxyTierUsed] : -1;
  const mobileTierPriority = mobileResult ? tierPriority[mobileResult.proxyTierUsed] : -1;
  const highestTierUsed =
    desktopTierPriority >= mobileTierPriority
      ? desktopResult?.proxyTierUsed ?? 'standard'
      : mobileResult?.proxyTierUsed ?? 'standard';

  return {
    html: desktopResult?.html || '', // Only desktop provides HTML
    screenshotDesktop: desktopResult?.screenshot,
    screenshotMobile: mobileResult?.screenshot,
    resolvedUrl: primaryResult.resolvedUrl,
    statusCode: primaryResult.statusCode,
    totalCreditsUsed,
    renderTimeMs: Date.now() - startTime,
    proxyTierUsed: highestTierUsed,
  };
}

/**
 * Fetch a page HTML only (no screenshots).
 *
 * This is a lighter-weight alternative to fetchWithDualScreenshots that:
 * - Makes a single request (instead of two for desktop/mobile)
 * - Doesn't capture screenshots (saves ~5 credits per request)
 * - Uses fetchWithRetry for automatic proxy tier escalation
 *
 * Use this for "quick rescan" operations where you only need updated HTML content.
 *
 * Credit savings vs fetchWithDualScreenshots:
 * - Best case: ~15 credits saved (20 → 5)
 * - Worst case: ~55 credits saved (80 → 25) if escalation needed
 */
export async function fetchHtmlOnly(
  url: string,
  options?: HtmlOnlyOptions
): Promise<HtmlOnlyResult> {
  const startTime = Date.now();
  const proxyTier = options?.proxyTier ?? 'standard';
  const autoEscalate = options?.autoEscalate ?? true;

  console.log(
    `[ScrapingBee] Starting HTML-only fetch for ${url} (tier: ${proxyTier}, autoEscalate: ${autoEscalate})`
  );

  const result = await fetchWithRetry({
    url,
    device: 'desktop', // Desktop provides full HTML
    captureScreenshot: false, // No screenshot
    proxyTier,
    autoEscalate,
    blockAds: options?.blockAds ?? true,
    waitMs: options?.waitMs,
    jsScenario: options?.jsScenario,
    cookieConsentProvider: options?.cookieConsentProvider,
  });

  console.log(
    `[ScrapingBee] HTML-only fetch succeeded for ${url}: ${result.creditsUsed} credits, ` +
      `${result.renderTimeMs}ms, tier: ${result.proxyTierUsed}`
  );

  return {
    html: result.html,
    resolvedUrl: result.resolvedUrl,
    statusCode: result.statusCode,
    creditsUsed: result.creditsUsed,
    renderTimeMs: Date.now() - startTime,
    proxyTierUsed: result.proxyTierUsed,
  };
}

/**
 * Calculate expected credits for a request based on proxy tier.
 *
 * Credit costs (approximate, with JS rendering + screenshot):
 * - Standard: ~10 credits per request (5 base + 5 screenshot)
 * - Premium: ~30 credits per request (25 base + 5 screenshot)
 * - Stealth: ~80 credits per request (75 base + 5 screenshot)
 *
 * With two-tier system and dual screenshots:
 * - Best case (standard works): ~20 credits (10 × 2 devices)
 * - Worst case (escalates to premium): ~80 credits (10 + 30 per device, both escalate)
 * - Old system (premium always): ~60 credits (30 × 2 devices)
 */
export function calculateCredits(options: {
  jsRendering: boolean;
  screenshot: boolean;
  proxyTier?: ProxyTier;
  dualDevice: boolean;
}): number {
  const tier = options.proxyTier ?? 'standard';

  // Base credits by tier
  let credits: number;
  switch (tier) {
    case 'standard':
      credits = options.jsRendering ? 5 : 1;
      break;
    case 'premium':
      credits = options.jsRendering ? 25 : 10;
      break;
    case 'stealth':
      credits = options.jsRendering ? 75 : 25;
      break;
  }

  if (options.screenshot) credits += 5;
  if (options.dualDevice) credits = credits * 2;

  return credits;
}
