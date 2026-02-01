/**
 * ScrapingBee Service
 *
 * Handles all interactions with ScrapingBee API for web scraping,
 * JavaScript rendering, and screenshot capture.
 */

export interface ScrapingBeeOptions {
  url: string;
  device?: 'desktop' | 'mobile';
  captureScreenshot?: boolean;
  fullPageScreenshot?: boolean;
  waitMs?: number;
  jsScenario?: string;
  blockAds?: boolean;
  premiumProxy?: boolean;
}

export interface ScrapingBeeResult {
  html: string;
  screenshot?: Buffer;
  resolvedUrl: string;
  statusCode: number;
  creditsUsed: number;
  renderTimeMs: number;
}

export interface ScrapingBeeError {
  message: string;
  statusCode?: number;
  creditsUsed: number;
}

const SCRAPINGBEE_API_URL = 'https://app.scrapingbee.com/api/v1/';
const DEFAULT_WAIT_MS = 3000;
const DEFAULT_TIMEOUT_MS = 60000;

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

  const params = new URLSearchParams({
    api_key: apiKey,
    url: options.url,
    render_js: 'true',
    wait: String(options.waitMs ?? DEFAULT_WAIT_MS),
    block_ads: String(options.blockAds ?? true),
    json_response: 'true', // Critical: returns JSON with both body and screenshot
  });

  // Device emulation
  if (options.device) {
    params.set('device', options.device);
  }

  // Screenshot options
  if (options.captureScreenshot) {
    params.set('screenshot', 'true');
    if (options.fullPageScreenshot !== false) {
      params.set('screenshot_full_page', 'true');
    }
  }

  // Premium proxy for difficult sites
  if (options.premiumProxy) {
    params.set('stealth_proxy', 'true');
  }

  // Custom JavaScript execution
  if (options.jsScenario) {
    params.set('js_scenario', JSON.stringify({ instructions: options.jsScenario }));
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

/**
 * Fetch a page with both desktop and mobile screenshots
 */
export async function fetchWithDualScreenshots(
  url: string,
  options?: Omit<ScrapingBeeOptions, 'url' | 'device' | 'captureScreenshot'>
): Promise<{
  html: string;
  screenshotDesktop?: Buffer;
  screenshotMobile?: Buffer;
  resolvedUrl: string;
  statusCode: number;
  totalCreditsUsed: number;
  renderTimeMs: number;
}> {
  const startTime = Date.now();

  // Fetch desktop (with HTML) and mobile (screenshot only) in parallel
  const [desktopResult, mobileResult] = await Promise.all([
    fetchWithScrapingBee({
      url,
      device: 'desktop',
      captureScreenshot: true,
      fullPageScreenshot: true,
      ...options,
    }),
    fetchWithScrapingBee({
      url,
      device: 'mobile',
      captureScreenshot: true,
      fullPageScreenshot: true,
      blockAds: options?.blockAds ?? true,
      waitMs: options?.waitMs,
      premiumProxy: options?.premiumProxy,
    }),
  ]);

  return {
    html: desktopResult.html,
    screenshotDesktop: desktopResult.screenshot,
    screenshotMobile: mobileResult.screenshot,
    resolvedUrl: desktopResult.resolvedUrl,
    statusCode: desktopResult.statusCode,
    totalCreditsUsed: desktopResult.creditsUsed + mobileResult.creditsUsed,
    renderTimeMs: Date.now() - startTime,
  };
}

/**
 * Calculate expected credits for a request
 */
export function calculateCredits(options: {
  jsRendering: boolean;
  screenshot: boolean;
  premiumProxy: boolean;
  dualDevice: boolean;
}): number {
  let credits = 1; // Base cost

  if (options.jsRendering) credits = 5;
  if (options.screenshot) credits += 5;
  if (options.premiumProxy) credits = credits * 5; // 25 with JS
  if (options.dualDevice) credits = credits * 2;

  return credits;
}
