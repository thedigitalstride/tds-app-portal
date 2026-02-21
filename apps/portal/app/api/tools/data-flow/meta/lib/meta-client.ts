import type { MetaAdAccount, MetaInsightsQuery } from './types';

const META_API_VERSION = 'v24.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

// Rate-limit error codes from Meta
const RATE_LIMIT_CODES = new Set([4, 17, 32]);

export function getMetaToken(): string {
  const token = process.env.META_SYSTEM_USER_TOKEN;
  if (!token) {
    throw new Error('META_SYSTEM_USER_TOKEN environment variable is not set');
  }
  return token;
}

async function fetchWithRetry(url: string, attempt = 0): Promise<unknown> {
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const errorCode = (body as Record<string, Record<string, unknown>>)?.error?.code;

    if (typeof errorCode === 'number' && RATE_LIMIT_CODES.has(errorCode) && attempt < MAX_RETRIES) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchWithRetry(url, attempt + 1);
    }

    const message =
      (body as Record<string, Record<string, unknown>>)?.error?.message ?? `Meta API error: ${res.status}`;
    throw new Error(String(message));
  }

  return res.json();
}

export async function fetchAdAccounts(): Promise<MetaAdAccount[]> {
  const token = getMetaToken();
  const url = `${META_BASE_URL}/me/adaccounts?fields=name,currency,timezone_name,account_status&limit=100&access_token=${token}`;

  const data = (await fetchWithRetry(url)) as {
    data: Array<{
      id: string;
      name: string;
      currency: string;
      timezone_name: string;
      account_status: number;
    }>;
  };

  return data.data.map((acc) => ({
    id: acc.id,
    name: acc.name,
    currency: acc.currency,
    timezone: acc.timezone_name,
    accountStatus: acc.account_status,
  }));
}

/**
 * Flatten action-type array fields into individual keys.
 * e.g. actions: [{action_type: 'purchase', value: '5'}] -> actions_purchase: '5'
 */
function flattenActionFields(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null && 'action_type' in value[0]) {
      for (const item of value as Array<{ action_type: string; value: string }>) {
        result[`${key}_${item.action_type}`] = item.value;
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

export async function fetchInsights(query: MetaInsightsQuery): Promise<{
  rows: Record<string, unknown>[];
  fields: string[];
}> {
  const token = getMetaToken();

  const params = new URLSearchParams();
  params.set('access_token', token);
  params.set('fields', query.fields.join(','));
  params.set('level', query.level);

  if (query.datePreset) {
    params.set('date_preset', query.datePreset);
  } else if (query.timeRange) {
    params.set('time_range', JSON.stringify(query.timeRange));
  }

  if (query.breakdowns && query.breakdowns.length > 0) {
    params.set('breakdowns', query.breakdowns.join(','));
  }

  if (query.timeIncrement !== undefined) {
    params.set('time_increment', String(query.timeIncrement));
  }

  if (query.filtering && query.filtering.length > 0) {
    params.set('filtering', JSON.stringify(query.filtering));
  }

  params.set('limit', String(query.limit ?? 500));

  const url = `${META_BASE_URL}/${query.accountId}/insights?${params.toString()}`;

  const allRows: Record<string, unknown>[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const data = (await fetchWithRetry(nextUrl)) as {
      data: Record<string, unknown>[];
      paging?: { next?: string };
    };

    if (data.data) {
      for (const row of data.data) {
        allRows.push(flattenActionFields(row));
      }
    }

    nextUrl = data.paging?.next ?? null;
  }

  // Collect all field keys across rows
  const fieldSet = new Set<string>();
  for (const row of allRows) {
    for (const key of Object.keys(row)) {
      fieldSet.add(key);
    }
  }

  return {
    rows: allRows,
    fields: [...fieldSet].sort(),
  };
}
