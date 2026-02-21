/**
 * Tracket API Service
 *
 * Handles authentication and data fetching from the Tracket time tracking API
 * (monday.com integration by Avisi Apps).
 *
 * Base URL: https://tracket.dev/api/2.0
 * Auth: OAuth2 client_credentials flow
 * Token lifetime: 1 hour
 *
 * @see https://docs.apps.avisi.com/en/tracket/latest/api-reference
 */

interface TracketTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface TracketTimeEntry {
  id: string;
  date: string;
  hours: number;
  minutes: number;
  note: string;
  userId?: number;
  userName?: string;
  itemId?: number;
  itemName?: string;
  boardId?: number;
  boardName?: string;
  billable?: boolean;
  categoryName?: string;
}

interface TracketApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

const BASE_URL = 'https://tracket.dev/api/2.0';

// In-memory token cache (serverless-safe per instance)
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Authenticate with Tracket using OAuth2 client_credentials grant.
 * Caches the token until 5 minutes before expiry.
 */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.TRACKET_CLIENT_ID;
  const clientSecret = process.env.TRACKET_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing TRACKET_CLIENT_ID or TRACKET_CLIENT_SECRET environment variables'
    );
  }

  // Return cached token if still valid (with 5-min buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const res = await fetch(`${BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tracket auth failed (${res.status}): ${text}`);
  }

  const data: TracketTokenResponse = await res.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Make an authenticated GET request to the Tracket API.
 */
async function tracketGet<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const token = await getAccessToken();

  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tracket API error (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Fetch time entries from Tracket for a given date range.
 *
 * @param from - Start date (YYYY-MM-DD)
 * @param to   - End date (YYYY-MM-DD)
 * @returns Array of time entries with date, hours, minutes, and notes
 */
export async function getTimeEntries(params: {
  from: string;
  to: string;
  userId?: string;
}): Promise<TracketTimeEntry[]> {
  const queryParams: Record<string, string> = {
    from: params.from,
    to: params.to,
  };

  if (params.userId) {
    queryParams.user_id = params.userId;
  }

  const response = await tracketGet<TracketApiResponse<TracketTimeEntry[]>>(
    '/time-entries',
    queryParams
  );

  return response.data;
}

/**
 * Check if the Tracket integration is configured (env vars present).
 */
export function isTracketConfigured(): boolean {
  return !!(process.env.TRACKET_CLIENT_ID && process.env.TRACKET_CLIENT_SECRET);
}
