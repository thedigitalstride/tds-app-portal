'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Users,
  Wrench,
  Building2,
  Cpu,
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
  allTimeTokens: number;
  thisMonthTokens: number;
  thisWeekTokens: number;
  todayTokens: number;
}

interface ToolStats {
  toolId: string;
  totalCost: number;
  totalTokens: number;
}

interface UserStats {
  userId: string;
  userName: string;
  userEmail: string;
  totalCost: number;
  totalTokens: number;
}

interface ClientStats {
  clientId: string;
  clientName: string;
  totalCost: number;
  totalTokens: number;
}

interface ModelStats {
  aiModel: string;
  provider: string;
  totalCost: number;
  totalTokens: number;
}

interface DailyTrend {
  date: string;
  totalCost: number;
}

interface StatsResponse {
  summary: SummaryStats;
  byTool: ToolStats[];
  byUser: UserStats[];
  byClient: ClientStats[];
  byModel: ModelStats[];
  dailyTrend: DailyTrend[];
  exchangeRate: number;
}

interface LogEntry {
  _id: string;
  createdAt: string;
  toolId: string;
  userName: string;
  clientName: string;
  purpose: string;
  provider: string;
  aiModel: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface LogsResponse {
  logs: LogEntry[];
  pagination: PaginationInfo;
  exchangeRate: number;
}

interface ClientOption {
  _id: string;
  name: string;
}

const formatCost = (usdCost: number, rate: number) => {
  const gbp = usdCost * rate;
  return gbp < 1 ? `\u00a3${gbp.toFixed(4)}` : `\u00a3${gbp.toFixed(2)}`;
};

const providerBadgeConfig: Record<string, { label: string; color: string }> = {
  anthropic: { label: 'Anthropic', color: 'bg-purple-100 text-purple-700' },
  openai: { label: 'OpenAI', color: 'bg-green-100 text-green-700' },
};

export default function AiCostsPage() {
  // Stats state
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsRate, setLogsRate] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filter state
  const [toolFilter, setToolFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Client options for filter dropdown
  const [clients, setClients] = useState<ClientOption[]>([]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const res = await fetch('/api/admin/ai-costs?view=stats');
        if (res.ok) {
          const data: StatsResponse = await res.json();
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
      if (toolFilter) params.set('toolId', toolFilter);
      if (userFilter) params.set('userId', userFilter);
      if (clientFilter) params.set('clientId', clientFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/admin/ai-costs?${params}`);
      if (res.ok) {
        const data: LogsResponse = await res.json();
        setLogs(data.logs);
        setPagination(data.pagination);
        setLogsRate(data.exchangeRate);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  }, [pagination.page, pagination.limit, toolFilter, userFilter, clientFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const goToPage = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const resetFilters = () => {
    setToolFilter('');
    setUserFilter('');
    setClientFilter('');
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

  const formatTokens = (num: number) => {
    return num.toLocaleString('en-GB');
  };

  const rate = stats?.exchangeRate || 1;

  // Get unique tools and users from stats for filter dropdowns
  const toolOptions = stats?.byTool.map((t) => t.toolId) || [];
  const userOptions = stats?.byUser.map((u) => ({ id: u.userId, name: u.userName })) || [];

  // Calculate max cost for chart scaling
  const maxCost = stats?.dailyTrend.reduce((max, d) => Math.max(max, d.totalCost), 0) || 1;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">AI Costs</h1>
        <p className="mt-1 text-neutral-500">
          Monitor AI usage and costs across all tools
        </p>
        {!loadingStats && stats && (
          <p className="mt-1 text-xs text-neutral-400">
            Rate: 1 USD = {stats.exchangeRate.toFixed(4)} GBP &middot; Updated hourly
          </p>
        )}
      </div>

      {/* Summary Stats Cards */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        {loadingStats ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-24 mb-1" />
                  <Skeleton className="h-3 w-28" />
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
                  {formatCost(stats?.summary.allTime || 0, rate)}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {formatTokens(stats?.summary.allTimeTokens || 0)} tokens
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-neutral-500">This Month</p>
                <p className="mt-1 text-3xl font-semibold text-neutral-900">
                  {formatCost(stats?.summary.thisMonth || 0, rate)}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {formatTokens(stats?.summary.thisMonthTokens || 0)} tokens
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-neutral-500">This Week</p>
                <p className="mt-1 text-3xl font-semibold text-neutral-900">
                  {formatCost(stats?.summary.thisWeek || 0, rate)}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {formatTokens(stats?.summary.thisWeekTokens || 0)} tokens
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-neutral-500">Today</p>
                <p className="mt-1 text-3xl font-semibold text-neutral-900">
                  {formatCost(stats?.summary.today || 0, rate)}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {formatTokens(stats?.summary.todayTokens || 0)} tokens
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Breakdown Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4">
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
                    <Skeleton className="h-4 w-16" />
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
                      {formatCost(tool.totalCost, rate)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By User */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-neutral-500" />
              By User
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : stats?.byUser.length === 0 ? (
              <p className="text-sm text-neutral-500">No data yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats?.byUser.map((user) => (
                  <div key={user.userId} className="flex items-center justify-between text-sm">
                    <span className="truncate text-neutral-700" title={user.userEmail}>
                      {user.userName}
                    </span>
                    <span className="font-medium text-neutral-900 ml-2">
                      {formatCost(user.totalCost, rate)}
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
              <Building2 className="h-4 w-4 text-neutral-500" />
              By Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
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
                      {formatCost(client.totalCost, rate)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Model */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="h-4 w-4 text-neutral-500" />
              By Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : stats?.byModel.length === 0 ? (
              <p className="text-sm text-neutral-500">No data yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats?.byModel.map((model) => {
                  const badge = providerBadgeConfig[model.provider.toLowerCase()] || {
                    label: model.provider,
                    color: 'bg-neutral-100 text-neutral-700',
                  };
                  return (
                    <div key={model.aiModel} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 truncate">
                        <Badge className={badge.color} variant="secondary">
                          {badge.label}
                        </Badge>
                        <span className="truncate text-neutral-700">{model.aiModel}</span>
                      </div>
                      <span className="font-medium text-neutral-900 ml-2">
                        {formatCost(model.totalCost, rate)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Cost Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-neutral-500" />
            Daily Cost (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStats ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="flex items-end gap-1 h-24">
              {stats?.dailyTrend.map((day) => {
                const height = maxCost > 0 ? (day.totalCost / maxCost) * 100 : 0;
                return (
                  <div
                    key={day.date}
                    className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer group relative"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${day.date}: ${formatCost(day.totalCost, rate)}`}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-neutral-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      {day.date}: {formatCost(day.totalCost, rate)}
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
                value={userFilter}
                onChange={(e) => {
                  setUserFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-40"
                options={[
                  { value: '', label: 'All users' },
                  ...userOptions.map((u) => ({ value: u.id, label: u.name })),
                ]}
              />
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
              {(toolFilter || userFilter || clientFilter || startDate || endDate) && (
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
              <DollarSign className="mx-auto h-12 w-12 text-neutral-300" />
              <p className="mt-4 text-lg font-medium">No usage logs yet</p>
              <p className="mt-1">AI usage will appear here</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="py-3 px-4 text-left font-medium text-neutral-500">Date</th>
                      <th className="py-3 px-4 text-left font-medium text-neutral-500">User</th>
                      <th className="py-3 px-4 text-left font-medium text-neutral-500">Tool</th>
                      <th className="py-3 px-4 text-left font-medium text-neutral-500">Client</th>
                      <th className="py-3 px-4 text-left font-medium text-neutral-500">Purpose</th>
                      <th className="py-3 px-4 text-left font-medium text-neutral-500">Model</th>
                      <th className="py-3 px-4 text-right font-medium text-neutral-500">Tokens In</th>
                      <th className="py-3 px-4 text-right font-medium text-neutral-500">Tokens Out</th>
                      <th className="py-3 px-4 text-right font-medium text-neutral-500">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const badge = providerBadgeConfig[log.provider.toLowerCase()] || {
                        label: log.provider,
                        color: 'bg-neutral-100 text-neutral-700',
                      };
                      return (
                        <tr key={log._id} className="border-b border-neutral-100 hover:bg-neutral-50">
                          <td className="py-3 px-4 text-neutral-600 whitespace-nowrap">
                            {formatDate(log.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-neutral-700">{log.userName}</td>
                          <td className="py-3 px-4 text-neutral-700">{log.toolId}</td>
                          <td className="py-3 px-4 text-neutral-700">{log.clientName}</td>
                          <td className="py-3 px-4 text-neutral-700 max-w-[200px] truncate" title={log.purpose}>
                            {log.purpose}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <Badge className={badge.color} variant="secondary">
                                {badge.label}
                              </Badge>
                              <span className="text-neutral-700 text-xs">{log.aiModel}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-neutral-700">
                            {formatTokens(log.inputTokens)}
                          </td>
                          <td className="py-3 px-4 text-right text-neutral-700">
                            {formatTokens(log.outputTokens)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-neutral-900">
                            {formatCost(log.totalCost, logsRate)}
                          </td>
                        </tr>
                      );
                    })}
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
