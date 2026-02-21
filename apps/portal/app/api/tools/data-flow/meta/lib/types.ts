export interface MetaAdAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  accountStatus: number;
}

export interface MetaInsightsQuery {
  accountId: string;
  fields: string[];
  breakdowns?: string[];
  datePreset?: string;
  timeRange?: { since: string; until: string };
  level: 'account' | 'campaign' | 'adset' | 'ad';
  timeIncrement?: number | 'monthly';
  filtering?: Array<{ field: string; operator: string; value: string }>;
  limit?: number;
}

export interface MetaFetchRequest {
  clientId: string;
  accountId: string;
  accountName: string;
  preset?: string;
  datePreset?: string;
  customDateRange?: { since: string; until: string };
  query?: MetaInsightsQuery;
  // Custom query fields (sent when preset === 'custom')
  customFields?: string[];
  customBreakdowns?: string[];
  level?: 'account' | 'campaign' | 'adset' | 'ad';
  timeIncrement?: number | 'monthly';
}

export interface MetaFetchResponse {
  success: boolean;
  fetchId: string;
  rowCount: number;
  rows: Record<string, unknown>[];
  fields: string[];
  error?: string;
}
