import crypto from 'crypto';

/**
 * Normalise a URL for consistent storage and lookup.
 * - Converts to lowercase
 * - Removes trailing slashes
 * - Removes default ports
 * - Sorts query parameters
 * - Removes fragment identifiers
 */
export function normaliseUrl(urlString: string): string {
  try {
    // Add protocol if missing
    if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
      urlString = `https://${urlString}`;
    }

    const url = new URL(urlString);

    // Lowercase hostname
    url.hostname = url.hostname.toLowerCase();

    // Remove default ports
    if ((url.protocol === 'https:' && url.port === '443') ||
        (url.protocol === 'http:' && url.port === '80')) {
      url.port = '';
    }

    // Sort query parameters for consistency
    const params = new URLSearchParams(url.searchParams);
    const sortedParams = new URLSearchParams([...params.entries()].sort());
    url.search = sortedParams.toString();

    // Remove fragment
    url.hash = '';

    // Build normalised URL
    let normalised = url.toString();

    // Remove trailing slash (except for root)
    if (normalised.endsWith('/') && url.pathname !== '/') {
      normalised = normalised.slice(0, -1);
    }

    return normalised;
  } catch {
    // If URL parsing fails, return as-is
    return urlString;
  }
}

/**
 * Generate a hash for a normalised URL.
 * Used for efficient database lookups.
 */
export function hashUrl(url: string): string {
  const normalised = normaliseUrl(url);
  return crypto.createHash('sha256').update(normalised).digest('hex').substring(0, 16);
}
