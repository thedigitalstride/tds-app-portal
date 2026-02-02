'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Activity,
  Users,
  Wrench,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Select,
  Skeleton,
  Button,
  Input,
} from '@tds/ui';

interface SummaryStats {
  allTime: number;
  thisMonth: number;
  thisWeek: number;
  today: number;
}

interface ProxyTierStats {
  standard: number;
  premium: number;
  stealth: number;
}

interface ClientStats {
  clientId: string;
  clientName: string;
  creditsUsed: number;
}

interface ToolStats {
  toolId: string;
  creditsUsed: number;
}

interface DailyTrend {
  date: string;
  creditsUsed: number;
}

interface StatsResponse {
  summary: SummaryStats;
  byProxyTier: ProxyTierStats;
  byClient: ClientStats[];
  byTool: ToolStats[];
  dailyTrend: DailyTrend[];
}

interface LogEntry {
  _id: string;
  fetchedAt: string;
  url: string;
  clientName: string;
  triggeredByTool: string;
  proxyTierUsed: string;
  scrapingBeeCreditsUsed: number;
  renderTimeMs?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ClientOption {
  _id: string;
  name: string;
}

const proxyTierConfig = {
  standard: { label: 'Standard', color: 'bg-green-100 text-green-700' },
  premium: { label: 'Premium', color: 'bg-amber-100 text-amber-700' },
  stealth: { label: 'Stealth', color: 'bg-red-100 text-red-700' },
};

export default function ScrapingBeeUsagePage() {
  // Stats state
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filter state
  const [clientFilter, setClientFilter] = useState('');
  const [toolFilter, setToolFilter] = useState('');
  const [proxyTierFilter, setProxyTierFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Client options for filter dropdown
  const [clients, setClients] = useState<ClientOption[]>([]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const res = await fetch('/api/admin/scrapingbee-usage?view=stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  // Fetch clients for filter
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients');
        if (res.ok) {
          const data = await res.json();
          setClients(data);
        }
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      }
    };
    fetchClients();
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      params.set('view', 'logs');
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());
      if (clientFilter) params.set('clientId', clientFilter);
      if (toolFilter) params.set('toolId', toolFilter);
      if (proxyTierFilter) params.set('proxyTier', proxyTierFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/admin/scrapingbee-usage?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  }, [pagination.page, pagination.limit, clientFilter, toolFilter, proxyTierFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const goToPage = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const resetFilters = () => {
    setClientFilter('');
    setToolFilter('');
    setProxyTierFilter('');
    setStartDate('');
    setEndDate('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-GB');
  };

  const truncateUrl = (url: string, maxLength = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  // Get unique tools from stats for filter dropdown
  const toolOptions = stats?.byTool.map((t) => t.toolId) || [];

  // Calculate max credits for chart scaling
  const maxCredits = stats?.dailyTrend.reduce((max, d) => Math.max(max, d.creditsUsed), 0) || 1;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">ScrapingBee Usage</h1>
        <p className="mt-1 text-neutral-500">
          Monitor credit consumption and usage patterns
        </p>
      </div>

      {/* Summary Stats Cards */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        {loadingStats ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-neutral-500">All Time</p>
                <p className="mt-1 text-3xl font-semibold text-neutral-900">
                  {formatNumber(stats?.summary.allTime || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-neutral-500">This Month</p>
                <p className="mt-1 text-3xl font-semibold text-neutral-900">
                  {formatNumber(stats?.summary.thisMonth || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-neutral-500">This Week</p>
                <p className="mt-1 text-3xl font-semibold text-neutral-900">
                  {formatNumber(stats?.summary.thisWeek || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-neutral-500">Today</p>
                <p className="mt-1 text-3xl font-semibold text-neutral-900">
                  {formatNumber(stats?.summary.today || 0)}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Breakdown Cards */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {/* By Proxy Tier */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-neutral-500" />
              By Proxy Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(proxyTierConfig).map(([tier, config]) => (
                  <div key={tier} className="flex items-center justify-between">
                    <Badge className={config.color} variant="secondary">
                      {config.label}
                    </Badge>
                    <span className="font-medium text-neutral-900">
                      {formatNumber(stats?.byProxyTier[tier as keyof ProxyTierStats] || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Client */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-neutral-500" />
              By Client (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : stats?.byClient.length === 0 ? (
              <p className="text-sm text-neutral-500">No data yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats?.byClient.map((client) => (
                  <div key={client.clientId} className="flex items-center justify-between text-sm">
                    <span className="truncate text-neutral-700" title={client.clientName}>
                      {client.clientName}
                    </span>
                    <span className="font-medium text-neutral-900 ml-2">
                      {formatNumber(client.creditsUsed)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Tool */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4 text-neutral-500" />
              By Tool
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : stats?.byTool.length === 0 ? (
              <p className="text-sm text-neutral-500">No data yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats?.byTool.map((tool) => (
                  <div key={tool.toolId} className="flex items-center justify-between text-sm">
                    <span className="truncate text-neutral-700">{tool.toolId}</span>
                    <span className="font-medium text-neutral-900 ml-2">
                      {formatNumber(tool.creditsUsed)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Usage Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-neutral-500" />
            Daily Usage (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStats ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="flex items-end gap-1 h-24">
              {stats?.dailyTrend.map((day) => {
                const height = maxCredits > 0 ? (day.creditsUsed / maxCredits) * 100 : 0;
                return (
                  <div
                    key={day.date}
                    className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer group relative"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${day.date}: ${formatNumber(day.creditsUsed)} credits`}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-neutral-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      {day.date}: {formatNumber(day.creditsUsed)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usage Logs</CardTitle>
              <CardDescription>
                {pagination.total} total records
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={clientFilter}
                onChange={(e) => {
                  setClientFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-40"
                options={[
                  { value: '', label: 'All clients' },
                  ...clients.map((c) => ({ value: c._id, label: c.name })),
                ]}
              />
              <Select
                value={toolFilter}
                onChange={(e) => {
                  setToolFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-40"
                options={[
                  { value: '', label: 'All tools' },
                  ...toolOptions.map((t) => ({ value: t, label: t })),
                ]}
              />
              <Select
                value={proxyTierFilter}
                onChange={(e) => {
                  setProxyTierFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-36"
                options={[
                  { value: '', label: 'All tiers' },
                  { value: 'standard', label: 'Standard' },
                  { value: 'premium', label: 'Premium' },
                  { value: 'stealth', label: 'Stealth' },
                ]}
              />
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-neutral-400" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-36"
                />
                <span className="text-neutral-400">-</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-36"
                />
              </div>
              {(clientFilter || toolFilter || proxyTierFilter || startDate || endDate) && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">
              <CreditCard className="mx-auto h-12 w-12 text-neutral-300" />
              <p className="mt-4 text-lg font-medium">No usage logs yet</p>
              <p className="mt-1">ScrapingBee usage will appear here</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="py-3 px-4 text-left font-medium text-neutral-500">Date</th>
                      <th className="py-3 px-4 text-left font-medium text-neutral-500">URL</th>
                      <th className="py-3 px-4 text-left font-medium text-neutral-500">Client</th>
                      <th className="py-3 px-4 text-left font-medium text-neutral-500">Tool</th>
                      <th className="py-3 px-4 text-left font-medium text-neutral-500">Tier</th>
                      <th className="py-3 px-4 text-right font-medium text-neutral-500">Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log._id} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="py-3 px-4 text-neutral-600 whitespace-nowrap">
                          {formatDate(log.fetchedAt)}
                        </td>
                        <td className="py-3 px-4 text-neutral-900" title={log.url}>
                          {truncateUrl(log.url)}
                        </td>
                        <td className="py-3 px-4 text-neutral-700">{log.clientName}</td>
                        <td className="py-3 px-4 text-neutral-700">{log.triggeredByTool}</td>
                        <td className="py-3 px-4">
                          <Badge
                            className={
                              proxyTierConfig[log.proxyTierUsed as keyof typeof proxyTierConfig]?.color ||
                              'bg-neutral-100 text-neutral-700'
                            }
                            variant="secondary"
                          >
                            {proxyTierConfig[log.proxyTierUsed as keyof typeof proxyTierConfig]?.label ||
                              log.proxyTierUsed}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-neutral-900">
                          {log.scrapingBeeCreditsUsed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-4">
                  <p className="text-sm text-neutral-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} results
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-neutral-600">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
