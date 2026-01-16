'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  RefreshCw,
  Save,
  Download,
  FileText,
  List,
  Trash2,
  MapPin,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Clock,
  User,
  History,
  RotateCcw,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Badge,
  Textarea,
  Skeleton,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@tds/ui';

interface HreflangEntry {
  lang: string;
  url: string;
}

interface MetaTagResult {
  url: string;
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  // Additional meta tags
  viewport?: string;
  charset?: string;
  author?: string;
  themeColor?: string;
  language?: string;
  favicon?: string;
  hreflang?: HreflangEntry[];
  // Social tags
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
  };
  other?: Array<{ name: string; content: string }>;
}

interface AnalysisIssue {
  type: 'error' | 'warning' | 'success';
  message: string;
  field: string;
}

interface Client {
  _id: string;
  name: string;
  website: string;
}

interface SavedAnalysis {
  _id: string;
  url: string;
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  // Additional meta tags
  viewport?: string;
  charset?: string;
  author?: string;
  themeColor?: string;
  language?: string;
  favicon?: string;
  hreflang?: HreflangEntry[];
  // Social tags
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
  };
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
  };
  score: number;
  issues: AnalysisIssue[];
  plannedTitle?: string;
  plannedDescription?: string;
  analyzedAt: string;
  analyzedBy?: { name: string; email: string };
  scanCount?: number;
  lastScannedAt?: string;
  lastScannedBy?: { name: string; email: string };
  scanHistory?: Array<{
    scannedAt: string;
    scannedBy: { name: string; email: string };
    score: number;
    changesDetected: boolean;
    snapshot?: {
      title: string;
      description: string;
      canonical?: string;
      robots?: string;
      // Additional meta tags
      viewport?: string;
      charset?: string;
      author?: string;
      themeColor?: string;
      language?: string;
      favicon?: string;
      hreflang?: HreflangEntry[];
      // Social tags
      openGraph?: {
        title?: string;
        description?: string;
        image?: string;
        url?: string;
        type?: string;
        siteName?: string;
      };
      twitter?: {
        card?: string;
        title?: string;
        description?: string;
        image?: string;
        site?: string;
      };
      issues?: Array<{
        type: string;
        field: string;
        message: string;
      }>;
    };
    // Legacy fields
    previousTitle?: string;
    previousDescription?: string;
  }>;
}

interface DashboardClient {
  client: {
    _id: string;
    name: string;
    website: string;
  };
  stats: {
    totalUrls: number;
    totalScanRuns: number;
    averageScore: number;
    errorCount: number;
    warningCount: number;
    lastScanDate: string | null;
    lastScannedBy: { name: string; email: string } | null;
  };
  recentScans: Array<{
    _id: string;
    url: string;
    title: string;
    score: number;
    scanCount: number;
    analyzedAt: string;
    lastScannedAt: string;
    lastScannedBy: { name: string; email: string } | null;
    issueCount: { errors: number; warnings: number };
  }>;
}

interface DashboardData {
  globalStats: {
    totalClients: number;
    totalUrls: number;
    totalScans: number;
    averageScore: number;
    totalErrors: number;
    totalWarnings: number;
  };
  clientData: DashboardClient[];
}

interface BulkResult {
  url: string;
  result?: MetaTagResult;
  issues?: AnalysisIssue[];
  error?: string;
  score: number;
}

export default function MetaTagAnalyserPage() {
  const [activeTab, setActiveTab] = useState('single');

  // Client state
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [loadingClients, setLoadingClients] = useState(true);

  // Single analysis state
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MetaTagResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<AnalysisIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Planner state
  const [plannerMode, setPlannerMode] = useState(false);
  const [plannedTitle, setPlannedTitle] = useState('');
  const [plannedDescription, setPlannedDescription] = useState('');

  // Bulk scan state
  const [bulkMode, setBulkMode] = useState<'sitemap' | 'urls'>('sitemap');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [urlList, setUrlList] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkStats, setBulkStats] = useState<{
    totalUrls: number;
    analyzed: number;
    failed: number;
    averageScore: number;
  } | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkSaveSuccess, setBulkSaveSuccess] = useState<string | null>(null);

  // Saved analyses state
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [rescanning, setRescanning] = useState<string | null>(null);
  const [expandedSavedRows, setExpandedSavedRows] = useState<Set<string>>(new Set());
  const [expandedHistories, setExpandedHistories] = useState<Set<string>>(new Set());
  const [expandedHistoryEntries, setExpandedHistoryEntries] = useState<Set<string>>(new Set());

  // Dashboard state
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Fetch clients on mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Fetch saved analyses when client changes
  useEffect(() => {
    if (selectedClientId) {
      fetchSavedAnalyses();
    }
  }, [selectedClientId]);

  // Fetch dashboard when dashboard tab is active
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
    }
  }, [activeTab]);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchSavedAnalyses = async () => {
    if (!selectedClientId) return;
    setLoadingSaved(true);
    try {
      const res = await fetch(`/api/tools/meta-tag-analyser/saved?clientId=${selectedClientId}`);
      if (res.ok) {
        const data = await res.json();
        setSavedAnalyses(data);
      }
    } catch (error) {
      console.error('Failed to fetch saved analyses:', error);
    } finally {
      setLoadingSaved(false);
    }
  };

  const fetchDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const res = await fetch('/api/tools/meta-tag-analyser/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const rescanAnalysis = async (id: string) => {
    setRescanning(id);
    try {
      const res = await fetch(`/api/tools/meta-tag-analyser/saved/${id}/rescan`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        // Update the analysis in the list
        setSavedAnalyses(prev =>
          prev.map(a => a._id === id ? { ...a, ...data.analysis } : a)
        );
        // Show feedback if changes detected
        if (data.changesDetected) {
          alert(`Changes detected! Previous score: ${data.previousScore}%, New score: ${data.analysis.score}%`);
        }
      }
    } catch (error) {
      console.error('Failed to rescan:', error);
    } finally {
      setRescanning(null);
    }
  };

  const toggleSavedRowExpand = (id: string) => {
    setExpandedSavedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const analyzeUrl = async () => {
    if (!url) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setIssues([]);
    setSaveSuccess(null);

    try {
      const res = await fetch('/api/tools/meta-tag-analyser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze URL');
      }

      setResult(data.result);
      setIssues(data.issues);
      setPlannedTitle(data.result.title || '');
      setPlannedDescription(data.result.description || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveAnalysis = async () => {
    if (!selectedClientId || !result) return;

    setSaving(true);
    try {
      const res = await fetch('/api/tools/meta-tag-analyser/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          result,
          issues,
          plannedTitle,
          plannedDescription,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSaveSuccess(data.message || (data.isUpdate ? 'URL updated' : 'URL saved'));
        fetchSavedAnalyses();
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch (error) {
      console.error('Failed to save analysis:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleRowExpand = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const saveBulkResults = async () => {
    if (!selectedClientId || bulkResults.length === 0) return;

    setBulkSaving(true);
    setBulkSaveSuccess(null);
    try {
      const res = await fetch('/api/tools/meta-tag-analyser/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          bulk: true,
          results: bulkResults,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBulkSaveSuccess(data.message || `${data.saved} URLs saved`);
        fetchSavedAnalyses();
        setTimeout(() => setBulkSaveSuccess(null), 5000);
      } else {
        const data = await res.json();
        setBulkError(data.error || 'Failed to save results');
      }
    } catch (error) {
      console.error('Failed to save bulk results:', error);
      setBulkError('Failed to save bulk results');
    } finally {
      setBulkSaving(false);
    }
  };

  const runBulkScan = async () => {
    setBulkLoading(true);
    setBulkError(null);
    setBulkResults([]);
    setBulkStats(null);
    setExpandedRows(new Set());
    setBulkSaveSuccess(null);

    try {
      const body = bulkMode === 'sitemap'
        ? { mode: 'sitemap', sitemapUrl }
        : { mode: 'urls', urls: urlList.split('\n').map(u => u.trim()).filter(Boolean) };

      const res = await fetch('/api/tools/meta-tag-analyser/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Bulk scan failed');
      }

      setBulkResults(data.results);
      setBulkStats({
        totalUrls: data.totalUrls,
        analyzed: data.analyzed,
        failed: data.failed,
        averageScore: data.averageScore,
      });
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setBulkLoading(false);
    }
  };

  const deleteAnalysis = async (id: string) => {
    if (!confirm('Delete this analysis?')) return;
    try {
      const res = await fetch(`/api/tools/meta-tag-analyser/saved/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchSavedAnalyses();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const exportAnalyses = (format: 'csv' | 'json') => {
    if (!selectedClientId) return;
    window.open(`/api/tools/meta-tag-analyser/export?clientId=${selectedClientId}&format=${format}`, '_blank');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  // Get field status from issues array
  // Maps UI field names to API field names
  const fieldNameMap: Record<string, string[]> = {
    'title': ['title'],
    'description': ['description'],
    'canonical': ['canonical'],
    'viewport': ['viewport'],
    'charset': ['charset'],
    'language': ['language'],
    'og:image': ['og image'],
    'og:title': ['open graph'],
    'og:description': ['open graph'],
    'twitter:card': ['twitter card'],
    'twitter:site': ['twitter card'],
    'twitter:title': ['twitter card'],
  };

  const getFieldStatus = (fieldName: string): 'error' | 'warning' | 'success' => {
    const possibleNames = fieldNameMap[fieldName.toLowerCase()] || [fieldName.toLowerCase()];
    const fieldIssue = issues.find(i =>
      possibleNames.some(name => i.field.toLowerCase() === name)
    );
    if (!fieldIssue) return 'success';
    return fieldIssue.type as 'error' | 'warning' | 'success';
  };

  // Get field issue message
  const getFieldMessage = (fieldName: string): string | null => {
    const possibleNames = fieldNameMap[fieldName.toLowerCase()] || [fieldName.toLowerCase()];
    const fieldIssue = issues.find(i =>
      possibleNames.some(name => i.field.toLowerCase() === name)
    );
    return fieldIssue?.message || null;
  };

  // Field styling based on status
  const getFieldContainerStyles = (status: 'error' | 'warning' | 'success') => {
    switch (status) {
      case 'error':
        return 'border-red-300 bg-red-50/50';
      case 'warning':
        return 'border-amber-300 bg-amber-50/50';
      case 'success':
        return 'border-green-300 bg-green-50/50';
    }
  };

  // Status badge component
  const FieldStatusBadge = ({ status, message }: { status: 'error' | 'warning' | 'success'; message?: string | null }) => {
    const config = {
      error: { icon: AlertCircle, bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
      warning: { icon: AlertTriangle, bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
      success: { icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    };
    const { icon: Icon, bg, text, border } = config[status];

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text} ${border} border`} title={message || undefined}>
        <Icon className="h-3 w-3" />
        <span className="capitalize">{status === 'success' ? 'Good' : status}</span>
      </div>
    );
  };

  const titleLength = plannedTitle.length;
  const descriptionLength = plannedDescription.length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Meta Tag Analyser
          </h1>
          <p className="mt-1 text-neutral-500">
            Analyse, plan, and track meta tags for client websites
          </p>
        </div>

        {/* Client Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-neutral-600">Client:</label>
          {loadingClients ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <Select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              options={clients.map(c => ({ value: c._id, label: c.name }))}
              placeholder="Select a client..."
              className="w-48"
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="single">
            <Search className="mr-2 h-4 w-4" />
            Single URL
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <List className="mr-2 h-4 w-4" />
            Bulk Scan
          </TabsTrigger>
          <TabsTrigger value="saved">
            <FileText className="mr-2 h-4 w-4" />
            Saved ({savedAnalyses.length})
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          {loadingDashboard ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
              </CardContent>
            </Card>
          ) : !dashboardData ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-neutral-300" />
                <p className="mt-4 text-neutral-500">No scan data available yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Global Stats */}
              <div className="grid gap-4 md:grid-cols-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Clients</CardDescription>
                    <CardTitle className="text-2xl">{dashboardData.globalStats.totalClients}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>URLs Tracked</CardDescription>
                    <CardTitle className="text-2xl">{dashboardData.globalStats.totalUrls}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Scans</CardDescription>
                    <CardTitle className="text-2xl">{dashboardData.globalStats.totalScans}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Avg Score</CardDescription>
                    <CardTitle className={`text-2xl ${getScoreColor(dashboardData.globalStats.averageScore).split(' ')[0]}`}>
                      {dashboardData.globalStats.averageScore}%
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Errors</CardDescription>
                    <CardTitle className="text-2xl text-red-600">{dashboardData.globalStats.totalErrors}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Warnings</CardDescription>
                    <CardTitle className="text-2xl text-amber-600">{dashboardData.globalStats.totalWarnings}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Client Reports */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-neutral-900">Reports by Client</h2>
                {dashboardData.clientData.map((clientData) => (
                  <Card key={clientData.client._id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{clientData.client.name}</CardTitle>
                          <CardDescription>{clientData.client.website}</CardDescription>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-neutral-500">
                            <Clock className="h-4 w-4" />
                            {clientData.stats.lastScanDate ? (
                              <span>
                                Last scan: {new Date(clientData.stats.lastScanDate).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            ) : (
                              <span>No scans yet</span>
                            )}
                          </div>
                          {clientData.stats.lastScannedBy && (
                            <div className="flex items-center gap-1 text-neutral-500">
                              <User className="h-4 w-4" />
                              <span>{clientData.stats.lastScannedBy.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-5 mb-4">
                        <div className="rounded-lg bg-neutral-50 p-3 text-center">
                          <p className="text-xs text-neutral-500">URLs</p>
                          <p className="text-xl font-semibold">{clientData.stats.totalUrls}</p>
                        </div>
                        <div className="rounded-lg bg-neutral-50 p-3 text-center">
                          <p className="text-xs text-neutral-500">Scans</p>
                          <p className="text-xl font-semibold">{clientData.stats.totalScanRuns}</p>
                        </div>
                        <div className="rounded-lg bg-neutral-50 p-3 text-center">
                          <p className="text-xs text-neutral-500">Avg Score</p>
                          <p className={`text-xl font-semibold ${getScoreColor(clientData.stats.averageScore).split(' ')[0]}`}>
                            {clientData.stats.averageScore}%
                          </p>
                        </div>
                        <div className="rounded-lg bg-red-50 p-3 text-center">
                          <p className="text-xs text-neutral-500">Errors</p>
                          <p className="text-xl font-semibold text-red-600">{clientData.stats.errorCount}</p>
                        </div>
                        <div className="rounded-lg bg-amber-50 p-3 text-center">
                          <p className="text-xs text-neutral-500">Warnings</p>
                          <p className="text-xl font-semibold text-amber-600">{clientData.stats.warningCount}</p>
                        </div>
                      </div>

                      {/* Recent Scans */}
                      {clientData.recentScans.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-neutral-700 mb-2">Recent Scans</p>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>URL</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Scans</TableHead>
                                <TableHead>Last Scanned</TableHead>
                                <TableHead>By</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clientData.recentScans.map((scan) => (
                                <TableRow key={scan._id}>
                                  <TableCell className="max-w-xs truncate font-mono text-xs">
                                    <a href={scan.url} target="_blank" rel="noopener noreferrer" className="hover:underline" title={scan.url}>
                                      {scan.url.replace(/^https?:\/\//, '').slice(0, 50)}
                                    </a>
                                  </TableCell>
                                  <TableCell>
                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getScoreColor(scan.score)}`}>
                                      {scan.score}%
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1 text-neutral-500">
                                      <History className="h-3 w-3" />
                                      {scan.scanCount}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-neutral-500 text-xs">
                                    {new Date(scan.lastScannedAt).toLocaleDateString('en-GB', {
                                      day: 'numeric',
                                      month: 'short',
                                    })}
                                  </TableCell>
                                  <TableCell className="text-neutral-500 text-xs">
                                    {scan.lastScannedBy?.name || '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <div className="mt-2 flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedClientId(clientData.client._id);
                                setActiveTab('saved');
                              }}
                            >
                              View All Scans
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Single URL Tab */}
        <TabsContent value="single">
          {/* URL Input */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    type="url"
                    placeholder="Enter URL to analyse (e.g., https://example.com)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && analyzeUrl()}
                  />
                </div>
                <Button onClick={analyzeUrl} disabled={loading || !url}>
                  {loading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Analyse
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-3 pt-6">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="space-y-6">
              {/* Save Bar */}
              {selectedClientId && (
                <Card className={saveSuccess ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}>
                  <CardContent className="flex items-center justify-between pt-6">
                    <div className="flex items-center gap-2">
                      {saveSuccess ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-green-700">{saveSuccess}</span>
                        </>
                      ) : (
                        <span className="text-blue-700">
                          Save this analysis to {clients.find(c => c._id === selectedClientId)?.name}
                        </span>
                      )}
                    </div>
                    <Button onClick={saveAnalysis} disabled={saving || !!saveSuccess}>
                      {saving ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {saveSuccess ? 'Saved!' : 'Save Analysis'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Analysis Score Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Analysis Results</span>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(Math.max(0, 100 - (issues.filter(i => i.type === 'error').length * 20) - (issues.filter(i => i.type === 'warning').length * 10)))}`}>
                      Score: {Math.max(0, 100 - (issues.filter(i => i.type === 'error').length * 20) - (issues.filter(i => i.type === 'warning').length * 10))}%
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {issues.length === 0
                      ? 'All meta tags look good!'
                      : `Found ${issues.filter(i => i.type === 'error').length} errors and ${issues.filter(i => i.type === 'warning').length} warnings`
                    }
                  </CardDescription>
                </CardHeader>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Basic Meta Tags */}
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Meta Tags</CardTitle>
                    <CardDescription>Title and description tags</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Title Field */}
                    <div className={`relative rounded-lg border-2 p-3 ${getFieldContainerStyles(getFieldStatus('title'))}`}>
                      <div className="absolute -top-3 right-2">
                        <FieldStatusBadge status={getFieldStatus('title')} message={getFieldMessage('title')} />
                      </div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium">Title</label>
                        <span className={`text-xs ${result.title.length > 60 ? 'text-red-500' : 'text-neutral-500'}`}>
                          {result.title.length}/60 characters
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input value={result.title} readOnly className="bg-white/80" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(result.title)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      {getFieldMessage('title') && (
                        <p className="mt-2 text-xs text-neutral-600">{getFieldMessage('title')}</p>
                      )}
                    </div>

                    {/* Description Field */}
                    <div className={`relative rounded-lg border-2 p-3 ${getFieldContainerStyles(getFieldStatus('description'))}`}>
                      <div className="absolute -top-3 right-2">
                        <FieldStatusBadge status={getFieldStatus('description')} message={getFieldMessage('description')} />
                      </div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium">Description</label>
                        <span className={`text-xs ${result.description.length > 160 ? 'text-red-500' : 'text-neutral-500'}`}>
                          {result.description.length}/160 characters
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Textarea value={result.description} readOnly className="bg-white/80" rows={3} />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(result.description)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      {getFieldMessage('description') && (
                        <p className="mt-2 text-xs text-neutral-600">{getFieldMessage('description')}</p>
                      )}
                    </div>

                    {/* Canonical URL Field */}
                    {result.canonical && (
                      <div className={`relative rounded-lg border-2 p-3 ${getFieldContainerStyles(getFieldStatus('canonical'))}`}>
                        <div className="absolute -top-3 right-2">
                          <FieldStatusBadge status={getFieldStatus('canonical')} message={getFieldMessage('canonical')} />
                        </div>
                        <label className="mb-2 block text-sm font-medium">Canonical URL</label>
                        <div className="flex items-center gap-2">
                          <Input value={result.canonical} readOnly className="bg-white/80" title={result.canonical} />
                          <Button variant="outline" size="icon" onClick={() => window.open(result.canonical, '_blank')}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Open Graph */}
                <Card>
                  <CardHeader>
                    <CardTitle>Open Graph Tags</CardTitle>
                    <CardDescription>Social sharing preview</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* OG Image */}
                    <div className={`relative rounded-lg border-2 p-3 ${getFieldContainerStyles(getFieldStatus('og:image'))}`}>
                      <div className="absolute -top-3 right-2">
                        <FieldStatusBadge status={getFieldStatus('og:image')} message={getFieldMessage('og:image')} />
                      </div>
                      <label className="mb-2 block text-sm font-medium">OG Image</label>
                      {result.openGraph.image ? (
                        <div className="overflow-hidden rounded-lg border bg-white">
                          <img src={result.openGraph.image} alt="OG Preview" className="h-32 w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-500 italic">Not set</p>
                      )}
                      {getFieldMessage('og:image') && (
                        <p className="mt-2 text-xs text-neutral-600">{getFieldMessage('og:image')}</p>
                      )}
                    </div>

                    {/* OG Title */}
                    <div className={`relative rounded-lg border-2 p-3 ${getFieldContainerStyles(getFieldStatus('og:title'))}`}>
                      <div className="absolute -top-3 right-2">
                        <FieldStatusBadge status={getFieldStatus('og:title')} message={getFieldMessage('og:title')} />
                      </div>
                      <label className="mb-2 block text-sm font-medium">OG Title</label>
                      <Input value={result.openGraph.title || 'Not set'} readOnly className="bg-white/80" />
                      {getFieldMessage('og:title') && (
                        <p className="mt-2 text-xs text-neutral-600">{getFieldMessage('og:title')}</p>
                      )}
                    </div>

                    {/* OG Description */}
                    <div className={`relative rounded-lg border-2 p-3 ${getFieldContainerStyles(getFieldStatus('og:description'))}`}>
                      <div className="absolute -top-3 right-2">
                        <FieldStatusBadge status={getFieldStatus('og:description')} message={getFieldMessage('og:description')} />
                      </div>
                      <label className="mb-2 block text-sm font-medium">OG Description</label>
                      <Textarea value={result.openGraph.description || 'Not set'} readOnly className="bg-white/80" rows={2} />
                      {getFieldMessage('og:description') && (
                        <p className="mt-2 text-xs text-neutral-600">{getFieldMessage('og:description')}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Twitter Cards */}
                <Card>
                  <CardHeader>
                    <CardTitle>Twitter Card Tags</CardTitle>
                    <CardDescription>Twitter/X sharing preview</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Twitter Card Type */}
                      <div className={`relative rounded-lg border-2 p-3 ${getFieldContainerStyles(getFieldStatus('twitter:card'))}`}>
                        <div className="absolute -top-3 right-2">
                          <FieldStatusBadge status={getFieldStatus('twitter:card')} message={getFieldMessage('twitter:card')} />
                        </div>
                        <label className="mb-2 block text-sm font-medium">Card Type</label>
                        <Input value={result.twitter.card || 'Not set'} readOnly className="bg-white/80" />
                      </div>

                      {/* Twitter Site */}
                      <div className={`relative rounded-lg border-2 p-3 ${getFieldContainerStyles(getFieldStatus('twitter:site'))}`}>
                        <div className="absolute -top-3 right-2">
                          <FieldStatusBadge status={getFieldStatus('twitter:site')} message={getFieldMessage('twitter:site')} />
                        </div>
                        <label className="mb-2 block text-sm font-medium">Twitter Site</label>
                        <Input value={result.twitter.site || 'Not set'} readOnly className="bg-white/80" />
                      </div>
                    </div>

                    {/* Twitter Title */}
                    <div className={`relative rounded-lg border-2 p-3 ${getFieldContainerStyles(getFieldStatus('twitter:title'))}`}>
                      <div className="absolute -top-3 right-2">
                        <FieldStatusBadge status={getFieldStatus('twitter:title')} message={getFieldMessage('twitter:title')} />
                      </div>
                      <label className="mb-2 block text-sm font-medium">Twitter Title</label>
                      <Input value={result.twitter.title || 'Not set'} readOnly className="bg-white/80" />
                      {getFieldMessage('twitter:title') && (
                        <p className="mt-2 text-xs text-neutral-600">{getFieldMessage('twitter:title')}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Technical Meta Tags */}
                <Card>
                  <CardHeader>
                    <CardTitle>Technical Meta Tags</CardTitle>
                    <CardDescription>Page configuration and accessibility</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Viewport */}
                      <div className={`relative rounded-lg border-2 p-3 ${getFieldContainerStyles(getFieldStatus('viewport'))}`}>
                        <div className="absolute -top-3 right-2">
                          <FieldStatusBadge status={getFieldStatus('viewport')} message={getFieldMessage('viewport')} />
                        </div>
                        <label className="mb-2 block text-sm font-medium">Viewport</label>
                        <p className="font-mono text-xs bg-white/80 p-2 rounded border truncate" title={result.viewport || ''}>
                          {result.viewport || <span className="text-neutral-400 italic">Not set</span>}
                        </p>
                      </div>

                      {/* Charset */}
                      <div className={`relative rounded-lg border-2 p-3 ${getFieldContainerStyles(getFieldStatus('charset'))}`}>
                        <div className="absolute -top-3 right-2">
                          <FieldStatusBadge status={getFieldStatus('charset')} message={getFieldMessage('charset')} />
                        </div>
                        <label className="mb-2 block text-sm font-medium">Charset</label>
                        <p className="font-mono text-xs bg-white/80 p-2 rounded border">
                          {result.charset || <span className="text-neutral-400 italic">Not set</span>}
                        </p>
                      </div>

                      {/* Language */}
                      <div className={`relative rounded-lg border-2 p-3 ${getFieldContainerStyles(getFieldStatus('language'))}`}>
                        <div className="absolute -top-3 right-2">
                          <FieldStatusBadge status={getFieldStatus('language')} message={getFieldMessage('language')} />
                        </div>
                        <label className="mb-2 block text-sm font-medium">Language</label>
                        <p className="font-mono text-xs bg-white/80 p-2 rounded border">
                          {result.language || <span className="text-neutral-400 italic">Not set</span>}
                        </p>
                      </div>

                      {/* Robots */}
                      <div className="relative rounded-lg border-2 p-3 border-neutral-300 bg-neutral-50/50">
                        <label className="mb-2 block text-sm font-medium">Robots</label>
                        <p className="font-mono text-xs bg-white/80 p-2 rounded border">
                          {result.robots || <span className="text-neutral-400 italic">Not set</span>}
                        </p>
                      </div>
                    </div>

                    {/* Additional fields */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Author */}
                      {result.author && (
                        <div className="relative rounded-lg border-2 p-3 border-neutral-300 bg-neutral-50/50">
                          <label className="mb-2 block text-sm font-medium">Author</label>
                          <p className="font-mono text-xs bg-white/80 p-2 rounded border">
                            {result.author}
                          </p>
                        </div>
                      )}

                      {/* Theme Color */}
                      {result.themeColor && (
                        <div className="relative rounded-lg border-2 p-3 border-neutral-300 bg-neutral-50/50">
                          <label className="mb-2 block text-sm font-medium">Theme Color</label>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 w-6 rounded border"
                              style={{ backgroundColor: result.themeColor }}
                              title={result.themeColor}
                            />
                            <span className="font-mono text-xs">{result.themeColor}</span>
                          </div>
                        </div>
                      )}

                      {/* Favicon */}
                      {result.favicon && (
                        <div className="relative rounded-lg border-2 p-3 border-neutral-300 bg-neutral-50/50">
                          <label className="mb-2 block text-sm font-medium">Favicon</label>
                          <div className="flex items-center gap-2">
                            <img
                              src={result.favicon.startsWith('http') ? result.favicon : new URL(result.favicon, result.url).toString()}
                              alt="Favicon"
                              className="h-6 w-6"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <span className="font-mono text-xs truncate flex-1" title={result.favicon}>
                              {result.favicon}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hreflang entries */}
                    {result.hreflang && result.hreflang.length > 0 && (
                      <div className="relative rounded-lg border-2 p-3 border-neutral-300 bg-neutral-50/50">
                        <label className="mb-2 block text-sm font-medium">Hreflang Tags ({result.hreflang.length})</label>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {result.hreflang.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <Badge variant="secondary" className="font-mono">{entry.lang}</Badge>
                              <span className="font-mono truncate flex-1" title={entry.url}>{entry.url}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Meta Tag Planner */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Meta Tag Planner</CardTitle>
                        <CardDescription>Plan optimised meta tags</CardDescription>
                      </div>
                      <Button variant={plannerMode ? 'default' : 'outline'} size="sm" onClick={() => setPlannerMode(!plannerMode)}>
                        {plannerMode ? 'View Mode' : 'Edit Mode'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-sm font-medium">Planned Title</label>
                        <span className={`text-xs ${titleLength > 60 ? 'text-red-500' : titleLength > 50 ? 'text-amber-500' : 'text-green-500'}`}>
                          {titleLength}/60 characters
                        </span>
                      </div>
                      <Input value={plannedTitle} onChange={(e) => setPlannedTitle(e.target.value)} readOnly={!plannerMode} className={!plannerMode ? 'bg-neutral-50' : ''} placeholder="Enter optimised title..." />
                      {plannerMode && (
                        <div className="mt-2 h-2 rounded-full bg-neutral-200">
                          <div className={`h-2 rounded-full transition-all ${titleLength > 60 ? 'bg-red-500' : titleLength > 50 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min((titleLength / 60) * 100, 100)}%` }} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-sm font-medium">Planned Description</label>
                        <span className={`text-xs ${descriptionLength > 160 ? 'text-red-500' : descriptionLength > 140 ? 'text-amber-500' : 'text-green-500'}`}>
                          {descriptionLength}/160 characters
                        </span>
                      </div>
                      <Textarea value={plannedDescription} onChange={(e) => setPlannedDescription(e.target.value)} readOnly={!plannerMode} className={!plannerMode ? 'bg-neutral-50' : ''} rows={3} placeholder="Enter optimised description..." />
                      {plannerMode && (
                        <div className="mt-2 h-2 rounded-full bg-neutral-200">
                          <div className={`h-2 rounded-full transition-all ${descriptionLength > 160 ? 'bg-red-500' : descriptionLength > 140 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min((descriptionLength / 160) * 100, 100)}%` }} />
                        </div>
                      )}
                    </div>
                    {plannerMode && (
                      <Button variant="outline" className="w-full" onClick={() => copyToClipboard(`Title: ${plannedTitle}\nDescription: ${plannedDescription}`)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Planned Tags
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Bulk Scan Tab */}
        <TabsContent value="bulk">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Bulk Meta Tag Scan</CardTitle>
              <CardDescription>Scan multiple URLs at once via sitemap or URL list</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode Selection */}
              <div className="flex gap-2">
                <Button variant={bulkMode === 'sitemap' ? 'default' : 'outline'} onClick={() => setBulkMode('sitemap')}>
                  <MapPin className="mr-2 h-4 w-4" />
                  From Sitemap
                </Button>
                <Button variant={bulkMode === 'urls' ? 'default' : 'outline'} onClick={() => setBulkMode('urls')}>
                  <List className="mr-2 h-4 w-4" />
                  URL List
                </Button>
              </div>

              {bulkMode === 'sitemap' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium">Sitemap URL</label>
                  <div className="flex gap-4">
                    <Input
                      type="url"
                      placeholder="https://example.com/sitemap.xml"
                      value={sitemapUrl}
                      onChange={(e) => setSitemapUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={runBulkScan} disabled={bulkLoading || !sitemapUrl}>
                      {bulkLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                      Scan Sitemap
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">
                    Enter the URL to your XML sitemap. Maximum 50 URLs will be scanned.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-sm font-medium">URLs (one per line)</label>
                  <Textarea
                    placeholder={'https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3'}
                    value={urlList}
                    onChange={(e) => setUrlList(e.target.value)}
                    rows={6}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-neutral-500">
                      {urlList.split('\n').filter(Boolean).length} URLs - Maximum 50
                    </p>
                    <Button onClick={runBulkScan} disabled={bulkLoading || !urlList.trim()}>
                      {bulkLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                      Scan URLs
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bulk Error */}
          {bulkError && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-3 pt-6">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700">{bulkError}</p>
              </CardContent>
            </Card>
          )}

          {/* Bulk Loading */}
          {bulkLoading && (
            <Card>
              <CardContent className="flex items-center justify-center gap-3 py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
                <span className="text-neutral-500">Scanning URLs... This may take a minute.</span>
              </CardContent>
            </Card>
          )}

          {/* Bulk Results */}
          {bulkStats && !bulkLoading && (
            <div className="space-y-6">
              {/* Save All Bar */}
              {selectedClientId && bulkStats.analyzed > 0 && (
                <Card className={bulkSaveSuccess ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}>
                  <CardContent className="flex items-center justify-between pt-6">
                    <div className="flex items-center gap-2">
                      {bulkSaveSuccess ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-green-700">{bulkSaveSuccess}</span>
                        </>
                      ) : (
                        <span className="text-blue-700">
                          Save all {bulkStats.analyzed} successful analyses to {clients.find(c => c._id === selectedClientId)?.name}
                        </span>
                      )}
                    </div>
                    <Button onClick={saveBulkResults} disabled={bulkSaving || !!bulkSaveSuccess}>
                      {bulkSaving ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {bulkSaveSuccess ? 'Saved!' : 'Save All to Client'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Stats */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total URLs</CardDescription>
                    <CardTitle className="text-2xl">{bulkStats.totalUrls}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Analyzed</CardDescription>
                    <CardTitle className="text-2xl text-green-600">{bulkStats.analyzed}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Failed</CardDescription>
                    <CardTitle className="text-2xl text-red-600">{bulkStats.failed}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Avg Score</CardDescription>
                    <CardTitle className={`text-2xl ${getScoreColor(bulkStats.averageScore).split(' ')[0]}`}>
                      {bulkStats.averageScore}%
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Results Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Scan Results</CardTitle>
                    <p className="text-sm text-neutral-500">Click a row to view full meta data</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Issues</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkResults.map((item, index) => (
                        <React.Fragment key={index}>
                          <TableRow
                            className="cursor-pointer hover:bg-neutral-50"
                            onClick={() => !item.error && toggleRowExpand(index)}
                          >
                            <TableCell>
                              {!item.error && (
                                expandedRows.has(index) ? (
                                  <ChevronUp className="h-4 w-4 text-neutral-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                                )
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs truncate font-mono text-xs" title={item.url}>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                                onClick={(e) => e.stopPropagation()}
                                title={item.url}
                              >
                                {item.url.replace(/^https?:\/\//, '').slice(0, 40)}...
                              </a>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {item.error ? (
                                <span className="text-red-500">{item.error}</span>
                              ) : (
                                item.result?.title || 'No title'
                              )}
                            </TableCell>
                            <TableCell>
                              {!item.error && (
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getScoreColor(item.score)}`}>
                                  {item.score}%
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.issues && (
                                <div className="flex gap-1">
                                  {item.issues.filter(i => i.type === 'error').length > 0 && (
                                    <Badge variant="destructive" className="text-xs">
                                      {item.issues.filter(i => i.type === 'error').length} errors
                                    </Badge>
                                  )}
                                  {item.issues.filter(i => i.type === 'warning').length > 0 && (
                                    <Badge variant="warning" className="text-xs">
                                      {item.issues.filter(i => i.type === 'warning').length} warnings
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                          {/* Expanded Row Details */}
                          {expandedRows.has(index) && item.result && (
                            <TableRow key={`${index}-expanded`}>
                              <TableCell colSpan={5} className="bg-neutral-50 p-0">
                                <div className="p-4 space-y-4">
                                  {/* Basic Meta Tags */}
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                      <h4 className="text-sm font-medium text-neutral-700 mb-2">Basic Meta Tags</h4>
                                      <div className="space-y-2 text-sm">
                                        <div>
                                          <span className="text-neutral-500">Title:</span>
                                          <p className="font-mono text-xs bg-white p-2 rounded border mt-1">
                                            {item.result.title || <span className="text-neutral-400 italic">Not set</span>}
                                          </p>
                                          <span className={`text-xs ${(item.result.title?.length || 0) > 60 ? 'text-red-500' : 'text-neutral-400'}`}>
                                            {item.result.title?.length || 0}/60 characters
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-neutral-500">Description:</span>
                                          <p className="font-mono text-xs bg-white p-2 rounded border mt-1">
                                            {item.result.description || <span className="text-neutral-400 italic">Not set</span>}
                                          </p>
                                          <span className={`text-xs ${(item.result.description?.length || 0) > 160 ? 'text-red-500' : 'text-neutral-400'}`}>
                                            {item.result.description?.length || 0}/160 characters
                                          </span>
                                        </div>
                                        {item.result.canonical && (
                                          <div>
                                            <span className="text-neutral-500">Canonical:</span>
                                            <p className="font-mono text-xs bg-white p-2 rounded border mt-1 truncate" title={item.result.canonical}>
                                              {item.result.canonical}
                                            </p>
                                          </div>
                                        )}
                                        {item.result.robots && (
                                          <div>
                                            <span className="text-neutral-500">Robots:</span>
                                            <p className="font-mono text-xs bg-white p-2 rounded border mt-1">
                                              {item.result.robots}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div>
                                      <h4 className="text-sm font-medium text-neutral-700 mb-2">Open Graph Tags</h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <span className="text-neutral-500 text-xs">og:title</span>
                                            <p className="font-mono text-xs bg-white p-2 rounded border mt-1 truncate" title={item.result.openGraph?.title || ''}>
                                              {item.result.openGraph?.title || <span className="text-neutral-400 italic">Not set</span>}
                                            </p>
                                          </div>
                                          <div>
                                            <span className="text-neutral-500 text-xs">og:type</span>
                                            <p className="font-mono text-xs bg-white p-2 rounded border mt-1">
                                              {item.result.openGraph?.type || <span className="text-neutral-400 italic">Not set</span>}
                                            </p>
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-neutral-500 text-xs">og:description</span>
                                          <p className="font-mono text-xs bg-white p-2 rounded border mt-1">
                                            {item.result.openGraph?.description || <span className="text-neutral-400 italic">Not set</span>}
                                          </p>
                                        </div>
                                        {item.result.openGraph?.image && (
                                          <div>
                                            <span className="text-neutral-500 text-xs">og:image</span>
                                            <div className="mt-1 flex items-center gap-2">
                                              <img
                                                src={item.result.openGraph.image}
                                                alt="OG Preview"
                                                className="h-16 w-24 object-cover rounded border"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                              />
                                              <p className="font-mono text-xs truncate flex-1" title={item.result.openGraph.image}>
                                                {item.result.openGraph.image}
                                              </p>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <h4 className="text-sm font-medium text-neutral-700 mb-2 mt-4">Twitter Card Tags</h4>
                                      <div className="space-y-2 text-sm">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <span className="text-neutral-500 text-xs">twitter:card</span>
                                            <p className="font-mono text-xs bg-white p-2 rounded border mt-1">
                                              {item.result.twitter?.card || <span className="text-neutral-400 italic">Not set</span>}
                                            </p>
                                          </div>
                                          <div>
                                            <span className="text-neutral-500 text-xs">twitter:site</span>
                                            <p className="font-mono text-xs bg-white p-2 rounded border mt-1">
                                              {item.result.twitter?.site || <span className="text-neutral-400 italic">Not set</span>}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Issues List */}
                                  {item.issues && item.issues.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-medium text-neutral-700 mb-2">Issues Found</h4>
                                      <div className="grid gap-2 md:grid-cols-2">
                                        {item.issues.map((issue, issueIndex) => (
                                          <div
                                            key={issueIndex}
                                            className="flex items-start gap-2 rounded border bg-white p-2 text-xs"
                                          >
                                            {getIssueIcon(issue.type)}
                                            <div>
                                              <Badge
                                                variant={issue.type === 'error' ? 'destructive' : issue.type === 'warning' ? 'warning' : 'success'}
                                                className="text-xs mb-1"
                                              >
                                                {issue.field}
                                              </Badge>
                                              <p className="text-neutral-600">{issue.message}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Saved Tab */}
        <TabsContent value="saved">
          {!selectedClientId ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-neutral-300" />
                <p className="mt-4 text-neutral-500">Select a client to view saved analyses</p>
              </CardContent>
            </Card>
          ) : loadingSaved ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
              </CardContent>
            </Card>
          ) : savedAnalyses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-neutral-300" />
                <p className="mt-4 text-neutral-500">No saved analyses for this client yet</p>
                <p className="text-sm text-neutral-400">Analyse a URL and save it to see it here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Export Buttons */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => exportAnalyses('csv')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => exportAnalyses('json')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export JSON
                </Button>
              </div>

              {/* Saved Analyses Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Saved Analyses</CardTitle>
                      <CardDescription>
                        {savedAnalyses.length} analyses for {clients.find(c => c._id === selectedClientId)?.name}
                      </CardDescription>
                    </div>
                    <p className="text-sm text-neutral-500">Click a row to view details</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Scans</TableHead>
                        <TableHead>Last Scanned</TableHead>
                        <TableHead>By</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {savedAnalyses.map((analysis) => (
                        <React.Fragment key={analysis._id}>
                          <TableRow
                            className="cursor-pointer hover:bg-neutral-50"
                            onClick={() => toggleSavedRowExpand(analysis._id)}
                          >
                            <TableCell>
                              {expandedSavedRows.has(analysis._id) ? (
                                <ChevronUp className="h-4 w-4 text-neutral-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-neutral-400" />
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs truncate font-mono text-xs" title={analysis.url}>
                              <a
                                href={analysis.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                                onClick={(e) => e.stopPropagation()}
                                title={analysis.url}
                              >
                                {analysis.url.replace(/^https?:\/\//, '').slice(0, 35)}
                              </a>
                            </TableCell>
                            <TableCell className="max-w-xs truncate" title={analysis.title}>
                              {analysis.title || 'No title'}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getScoreColor(analysis.score)}`}>
                                {analysis.score}%
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-neutral-500">
                                <History className="h-3 w-3" />
                                {analysis.scanCount || 1}
                              </div>
                            </TableCell>
                            <TableCell className="text-neutral-500 text-xs">
                              {new Date(analysis.lastScannedAt || analysis.analyzedAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </TableCell>
                            <TableCell className="text-neutral-500 text-xs">
                              {analysis.lastScannedBy?.name || analysis.analyzedBy?.name || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => rescanAnalysis(analysis._id)}
                                  disabled={rescanning === analysis._id}
                                  title="Rescan URL"
                                >
                                  {rescanning === analysis._id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                                  ) : (
                                    <RotateCcw className="h-4 w-4 text-neutral-400 hover:text-blue-500" />
                                  )}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteAnalysis(analysis._id)}>
                                  <Trash2 className="h-4 w-4 text-neutral-400 hover:text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {/* Expanded Details */}
                          {expandedSavedRows.has(analysis._id) && (
                            <TableRow key={`${analysis._id}-expanded`}>
                              <TableCell colSpan={8} className="bg-neutral-50 p-0">
                                <div className="p-4 space-y-4">
                                  {/* Current Meta Data - All Fields */}
                                  <div>
                                    <h4 className="text-sm font-medium text-neutral-700 mb-3">Current Meta Tags</h4>
                                    <div className="grid gap-4 md:grid-cols-2">
                                      {/* Left Column - Basic Meta Tags */}
                                      <div className="space-y-3">
                                        {/* Title Field */}
                                        {(() => {
                                          const titleIssue = analysis.issues?.find(i => i.field.toLowerCase() === 'title');
                                          const titleStatus = titleIssue?.type || 'success';
                                          const statusStyles = {
                                            error: 'border-red-300 bg-red-50/50',
                                            warning: 'border-amber-300 bg-amber-50/50',
                                            success: 'border-green-300 bg-green-50/50',
                                          };
                                          const badgeStyles = {
                                            error: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
                                            warning: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
                                            success: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
                                          };
                                          const badge = badgeStyles[titleStatus as keyof typeof badgeStyles];
                                          const BadgeIcon = badge.icon;
                                          return (
                                            <div className={`relative rounded-lg border-2 p-3 ${statusStyles[titleStatus as keyof typeof statusStyles]}`}>
                                              <div className="absolute -top-2.5 right-2">
                                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text} ${badge.border} border`}>
                                                  <BadgeIcon className="h-3 w-3" />
                                                  <span>{titleStatus === 'success' ? 'Good' : titleStatus === 'error' ? 'Error' : 'Warning'}</span>
                                                </div>
                                              </div>
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-neutral-700 font-medium text-sm">Title</span>
                                                <span className={`text-xs ${(analysis.title?.length || 0) > 60 ? 'text-red-500' : 'text-neutral-400'}`}>
                                                  {analysis.title?.length || 0}/60
                                                </span>
                                              </div>
                                              <p className="font-mono text-xs bg-white/80 p-2 rounded border">
                                                {analysis.title || <span className="text-neutral-400 italic">Not set</span>}
                                              </p>
                                              {titleIssue && (
                                                <p className="mt-1 text-xs text-neutral-600">{titleIssue.message}</p>
                                              )}
                                            </div>
                                          );
                                        })()}

                                        {/* Description Field */}
                                        {(() => {
                                          const descIssue = analysis.issues?.find(i => i.field.toLowerCase() === 'description');
                                          const descStatus = descIssue?.type || 'success';
                                          const statusStyles = {
                                            error: 'border-red-300 bg-red-50/50',
                                            warning: 'border-amber-300 bg-amber-50/50',
                                            success: 'border-green-300 bg-green-50/50',
                                          };
                                          const badgeStyles = {
                                            error: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
                                            warning: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
                                            success: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
                                          };
                                          const badge = badgeStyles[descStatus as keyof typeof badgeStyles];
                                          const BadgeIcon = badge.icon;
                                          return (
                                            <div className={`relative rounded-lg border-2 p-3 ${statusStyles[descStatus as keyof typeof statusStyles]}`}>
                                              <div className="absolute -top-2.5 right-2">
                                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text} ${badge.border} border`}>
                                                  <BadgeIcon className="h-3 w-3" />
                                                  <span>{descStatus === 'success' ? 'Good' : descStatus === 'error' ? 'Error' : 'Warning'}</span>
                                                </div>
                                              </div>
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-neutral-700 font-medium text-sm">Description</span>
                                                <span className={`text-xs ${(analysis.description?.length || 0) > 160 ? 'text-red-500' : 'text-neutral-400'}`}>
                                                  {analysis.description?.length || 0}/160
                                                </span>
                                              </div>
                                              <p className="font-mono text-xs bg-white/80 p-2 rounded border">
                                                {analysis.description || <span className="text-neutral-400 italic">Not set</span>}
                                              </p>
                                              {descIssue && (
                                                <p className="mt-1 text-xs text-neutral-600">{descIssue.message}</p>
                                              )}
                                            </div>
                                          );
                                        })()}

                                        {/* Canonical Field */}
                                        {(() => {
                                          const canonicalIssue = analysis.issues?.find(i => i.field.toLowerCase() === 'canonical');
                                          const canonicalStatus = canonicalIssue?.type || 'success';
                                          const statusStyles = {
                                            error: 'border-red-300 bg-red-50/50',
                                            warning: 'border-amber-300 bg-amber-50/50',
                                            success: 'border-green-300 bg-green-50/50',
                                          };
                                          const badgeStyles = {
                                            error: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
                                            warning: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
                                            success: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
                                          };
                                          const badge = badgeStyles[canonicalStatus as keyof typeof badgeStyles];
                                          const BadgeIcon = badge.icon;
                                          return (
                                            <div className={`relative rounded-lg border-2 p-3 ${statusStyles[canonicalStatus as keyof typeof statusStyles]}`}>
                                              <div className="absolute -top-2.5 right-2">
                                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text} ${badge.border} border`}>
                                                  <BadgeIcon className="h-3 w-3" />
                                                  <span>{canonicalStatus === 'success' ? 'Good' : canonicalStatus === 'error' ? 'Error' : 'Warning'}</span>
                                                </div>
                                              </div>
                                              <span className="text-neutral-700 font-medium text-sm">Canonical URL</span>
                                              <p className="font-mono text-xs bg-white/80 p-2 rounded border mt-1 truncate" title={analysis.canonical || ''}>
                                                {analysis.canonical || <span className="text-neutral-400 italic">Not set</span>}
                                              </p>
                                              {canonicalIssue && (
                                                <p className="mt-1 text-xs text-neutral-600">{canonicalIssue.message}</p>
                                              )}
                                            </div>
                                          );
                                        })()}

                                        {/* Robots Field */}
                                        <div className="rounded-lg border-2 border-neutral-200 bg-neutral-50/50 p-3">
                                          <span className="text-neutral-700 font-medium text-sm">Robots</span>
                                          <p className="font-mono text-xs bg-white/80 p-2 rounded border mt-1">
                                            {analysis.robots || <span className="text-neutral-400 italic">Not set</span>}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Right Column - Open Graph & Twitter */}
                                      <div className="space-y-3">
                                        {/* OG Image Field - with full status styling */}
                                        {(() => {
                                          const ogImageIssue = analysis.issues?.find(i => i.field.toLowerCase() === 'og image');
                                          const ogImageStatus = ogImageIssue?.type || 'success';
                                          const statusStyles = {
                                            error: 'border-red-300 bg-red-50/50',
                                            warning: 'border-amber-300 bg-amber-50/50',
                                            success: 'border-green-300 bg-green-50/50',
                                          };
                                          const badgeStyles = {
                                            error: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
                                            warning: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
                                            success: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
                                          };
                                          const badge = badgeStyles[ogImageStatus as keyof typeof badgeStyles];
                                          const BadgeIcon = badge.icon;
                                          return (
                                            <div className={`relative rounded-lg border-2 p-3 ${statusStyles[ogImageStatus as keyof typeof statusStyles]}`}>
                                              <div className="absolute -top-2.5 right-2">
                                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text} ${badge.border} border`}>
                                                  <BadgeIcon className="h-3 w-3" />
                                                  <span>{ogImageStatus === 'success' ? 'Good' : ogImageStatus === 'error' ? 'Error' : 'Warning'}</span>
                                                </div>
                                              </div>
                                              <span className="text-neutral-700 font-medium text-sm">OG Image</span>
                                              {analysis.openGraph?.image ? (
                                                <div className="mt-2 flex items-center gap-2">
                                                  <img
                                                    src={analysis.openGraph.image}
                                                    alt="OG Preview"
                                                    className="h-12 w-20 object-cover rounded border"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                  />
                                                  <p className="font-mono text-xs bg-white/80 p-2 rounded border truncate flex-1" title={analysis.openGraph.image}>
                                                    {analysis.openGraph.image}
                                                  </p>
                                                </div>
                                              ) : (
                                                <p className="font-mono text-xs bg-white/80 p-2 rounded border mt-1 text-neutral-400 italic">Not set</p>
                                              )}
                                              {ogImageIssue && (
                                                <p className="mt-1 text-xs text-neutral-600">{ogImageIssue.message}</p>
                                              )}
                                            </div>
                                          );
                                        })()}

                                        {/* Twitter Card Field - with full status styling */}
                                        {(() => {
                                          const twitterIssue = analysis.issues?.find(i => i.field.toLowerCase() === 'twitter card');
                                          const twitterStatus = twitterIssue?.type || 'success';
                                          const statusStyles = {
                                            error: 'border-red-300 bg-red-50/50',
                                            warning: 'border-amber-300 bg-amber-50/50',
                                            success: 'border-green-300 bg-green-50/50',
                                          };
                                          const badgeStyles = {
                                            error: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
                                            warning: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
                                            success: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
                                          };
                                          const badge = badgeStyles[twitterStatus as keyof typeof badgeStyles];
                                          const BadgeIcon = badge.icon;
                                          return (
                                            <div className={`relative rounded-lg border-2 p-3 ${statusStyles[twitterStatus as keyof typeof statusStyles]}`}>
                                              <div className="absolute -top-2.5 right-2">
                                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text} ${badge.border} border`}>
                                                  <BadgeIcon className="h-3 w-3" />
                                                  <span>{twitterStatus === 'success' ? 'Good' : twitterStatus === 'error' ? 'Error' : 'Warning'}</span>
                                                </div>
                                              </div>
                                              <span className="text-neutral-700 font-medium text-sm">Twitter Card</span>
                                              <p className="font-mono text-xs bg-white/80 p-2 rounded border mt-1">
                                                {analysis.twitter?.card || <span className="text-neutral-400 italic">Not set</span>}
                                              </p>
                                              {twitterIssue && (
                                                <p className="mt-1 text-xs text-neutral-600">{twitterIssue.message}</p>
                                              )}
                                            </div>
                                          );
                                        })()}

                                        {/* Viewport Field - with full status styling */}
                                        {(() => {
                                          const viewportIssue = analysis.issues?.find(i => i.field.toLowerCase() === 'viewport');
                                          const viewportStatus = viewportIssue?.type || 'success';
                                          const statusStyles = {
                                            error: 'border-red-300 bg-red-50/50',
                                            warning: 'border-amber-300 bg-amber-50/50',
                                            success: 'border-green-300 bg-green-50/50',
                                          };
                                          const badgeStyles = {
                                            error: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
                                            warning: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
                                            success: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
                                          };
                                          const badge = badgeStyles[viewportStatus as keyof typeof badgeStyles];
                                          const BadgeIcon = badge.icon;
                                          return (
                                            <div className={`relative rounded-lg border-2 p-3 ${statusStyles[viewportStatus as keyof typeof statusStyles]}`}>
                                              <div className="absolute -top-2.5 right-2">
                                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text} ${badge.border} border`}>
                                                  <BadgeIcon className="h-3 w-3" />
                                                  <span>{viewportStatus === 'success' ? 'Good' : viewportStatus === 'error' ? 'Error' : 'Warning'}</span>
                                                </div>
                                              </div>
                                              <span className="text-neutral-700 font-medium text-sm">Viewport</span>
                                              <p className="font-mono text-xs bg-white/80 p-2 rounded border mt-1 truncate" title={analysis.viewport || ''}>
                                                {analysis.viewport || <span className="text-neutral-400 italic">Not set</span>}
                                              </p>
                                              {viewportIssue && (
                                                <p className="mt-1 text-xs text-neutral-600">{viewportIssue.message}</p>
                                              )}
                                            </div>
                                          );
                                        })()}

                                        {/* Additional Open Graph fields - info only, neutral styling */}
                                        <div className="rounded-lg border-2 border-neutral-300 bg-neutral-50/50 p-3">
                                          <span className="text-neutral-700 font-medium text-sm">Open Graph Details</span>
                                          <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div>
                                              <span className="text-neutral-500 text-xs">og:title</span>
                                              <p className="font-mono text-xs bg-white/80 p-1.5 rounded border mt-0.5 truncate" title={analysis.openGraph?.title || ''}>
                                                {analysis.openGraph?.title || <span className="text-neutral-400 italic">Not set</span>}
                                              </p>
                                            </div>
                                            <div>
                                              <span className="text-neutral-500 text-xs">og:type</span>
                                              <p className="font-mono text-xs bg-white/80 p-1.5 rounded border mt-0.5">
                                                {analysis.openGraph?.type || <span className="text-neutral-400 italic">Not set</span>}
                                              </p>
                                            </div>
                                            <div className="col-span-2">
                                              <span className="text-neutral-500 text-xs">og:description</span>
                                              <p className="font-mono text-xs bg-white/80 p-1.5 rounded border mt-0.5 line-clamp-2" title={analysis.openGraph?.description || ''}>
                                                {analysis.openGraph?.description || <span className="text-neutral-400 italic">Not set</span>}
                                              </p>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Additional Twitter fields - info only, neutral styling */}
                                        <div className="rounded-lg border-2 border-neutral-300 bg-neutral-50/50 p-3">
                                          <span className="text-neutral-700 font-medium text-sm">Twitter Details</span>
                                          <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div>
                                              <span className="text-neutral-500 text-xs">twitter:title</span>
                                              <p className="font-mono text-xs bg-white/80 p-1.5 rounded border mt-0.5 truncate" title={analysis.twitter?.title || ''}>
                                                {analysis.twitter?.title || <span className="text-neutral-400 italic">Not set</span>}
                                              </p>
                                            </div>
                                            <div>
                                              <span className="text-neutral-500 text-xs">twitter:site</span>
                                              <p className="font-mono text-xs bg-white/80 p-1.5 rounded border mt-0.5">
                                                {analysis.twitter?.site || <span className="text-neutral-400 italic">Not set</span>}
                                              </p>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Technical Details - info only, neutral styling */}
                                        <div className="rounded-lg border-2 border-neutral-300 bg-neutral-50/50 p-3">
                                          <span className="text-neutral-700 font-medium text-sm">Technical Details</span>
                                          <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div>
                                              <span className="text-neutral-500 text-xs">charset</span>
                                              <p className="font-mono text-xs bg-white/80 p-1.5 rounded border mt-0.5">
                                                {analysis.charset || <span className="text-neutral-400 italic">Not set</span>}
                                              </p>
                                            </div>
                                            <div>
                                              <span className="text-neutral-500 text-xs">language</span>
                                              <p className="font-mono text-xs bg-white/80 p-1.5 rounded border mt-0.5">
                                                {analysis.language || <span className="text-neutral-400 italic">Not set</span>}
                                              </p>
                                            </div>
                                            <div className="col-span-2">
                                              <span className="text-neutral-500 text-xs">robots</span>
                                              <p className="font-mono text-xs bg-white/80 p-1.5 rounded border mt-0.5">
                                                {analysis.robots || <span className="text-neutral-400 italic">Not set</span>}
                                              </p>
                                            </div>
                                            {analysis.favicon && (
                                              <div className="col-span-2">
                                                <span className="text-neutral-500 text-xs">favicon</span>
                                                <p className="font-mono text-xs bg-white/80 p-1.5 rounded border mt-0.5 truncate" title={analysis.favicon}>
                                                  {analysis.favicon}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Planned Values */}
                                        {(analysis.plannedTitle || analysis.plannedDescription) && (
                                          <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-3">
                                            <h5 className="text-sm font-medium text-blue-700 mb-2">Planned Changes</h5>
                                            {analysis.plannedTitle && (
                                              <div className="mb-2">
                                                <span className="text-blue-600 text-xs font-medium">Planned Title</span>
                                                <p className="font-mono text-xs bg-white/80 p-2 rounded border mt-1">
                                                  {analysis.plannedTitle}
                                                </p>
                                              </div>
                                            )}
                                            {analysis.plannedDescription && (
                                              <div>
                                                <span className="text-blue-600 text-xs font-medium">Planned Description</span>
                                                <p className="font-mono text-xs bg-white/80 p-2 rounded border mt-1">
                                                  {analysis.plannedDescription}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Scan History */}
                                  <div className="border-t pt-4">
                                    <h4 className="text-sm font-medium text-neutral-700 mb-2">Scan History</h4>
                                      <div className="space-y-2">
                                        <div className="rounded border bg-white p-3 text-sm">
                                          <div className="flex items-center justify-between">
                                            <span className="text-neutral-500">First analyzed:</span>
                                            <span>
                                              {new Date(analysis.analyzedAt).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                              })}
                                            </span>
                                          </div>
                                          {analysis.analyzedBy && (
                                            <div className="flex items-center justify-between mt-1">
                                              <span className="text-neutral-500">By:</span>
                                              <span>{analysis.analyzedBy.name}</span>
                                            </div>
                                          )}
                                        </div>
                                        {analysis.scanHistory && analysis.scanHistory.length > 0 && (
                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                              <p className="text-xs text-neutral-500 font-medium">
                                                Scan History ({analysis.scanHistory.length} previous {analysis.scanHistory.length === 1 ? 'scan' : 'scans'})
                                              </p>
                                              {analysis.scanHistory.length > 3 && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 text-xs"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedHistories(prev => {
                                                      const next = new Set(prev);
                                                      next.has(analysis._id) ? next.delete(analysis._id) : next.add(analysis._id);
                                                      return next;
                                                    });
                                                  }}
                                                >
                                                  {expandedHistories.has(analysis._id) ? 'Show less' : `Show all ${analysis.scanHistory.length}`}
                                                </Button>
                                              )}
                                            </div>
                                            <div className="relative">
                                              {/* Timeline line */}
                                              <div className="absolute left-2 top-3 bottom-3 w-0.5 bg-neutral-200" />

                                              <div className="space-y-3">
                                                {(expandedHistories.has(analysis._id)
                                                  ? [...analysis.scanHistory].reverse()
                                                  : analysis.scanHistory.slice(-3).reverse()
                                                ).map((scan, idx) => {
                                                  const entryKey = `${analysis._id}-${idx}`;
                                                  const isExpanded = expandedHistoryEntries.has(entryKey);
                                                  return (
                                                    <div key={idx} className="relative pl-6">
                                                      {/* Timeline dot */}
                                                      <div className={`absolute left-0.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                                                        scan.changesDetected ? 'bg-amber-500' : 'bg-neutral-300'
                                                      }`} />

                                                      <div
                                                        className={`rounded border bg-white text-xs shadow-sm cursor-pointer transition-all hover:shadow-md ${isExpanded ? 'ring-2 ring-blue-200' : ''}`}
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setExpandedHistoryEntries(prev => {
                                                            const next = new Set(prev);
                                                            next.has(entryKey) ? next.delete(entryKey) : next.add(entryKey);
                                                            return next;
                                                          });
                                                        }}
                                                      >
                                                        <div className="p-3">
                                                          <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                              <Clock className="h-3 w-3 text-neutral-400" />
                                                              <span className="font-medium">
                                                                {new Date(scan.scannedAt).toLocaleDateString('en-GB', {
                                                                  day: 'numeric',
                                                                  month: 'short',
                                                                  year: 'numeric',
                                                                })}
                                                                {' '}
                                                                <span className="text-neutral-400">
                                                                  {new Date(scan.scannedAt).toLocaleTimeString('en-GB', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                  })}
                                                                </span>
                                                              </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                              <span className={`rounded px-1.5 py-0.5 font-medium ${getScoreColor(scan.score)}`}>
                                                                {scan.score}%
                                                              </span>
                                                              {isExpanded ? (
                                                                <ChevronUp className="h-4 w-4 text-neutral-400" />
                                                              ) : (
                                                                <ChevronDown className="h-4 w-4 text-neutral-400" />
                                                              )}
                                                            </div>
                                                          </div>

                                                          <div className="flex items-center gap-2 text-neutral-500">
                                                            <User className="h-3 w-3" />
                                                            <span>{scan.scannedBy?.name || 'Unknown'}</span>
                                                            {scan.changesDetected && (
                                                              <Badge variant="warning" className="text-xs ml-auto">Changes detected</Badge>
                                                            )}
                                                          </div>
                                                        </div>

                                                        {/* Expanded view with full data snapshot */}
                                                        {isExpanded && (
                                                          <div className="border-t border-neutral-100 bg-neutral-50 p-3 space-y-3">
                                                            <p className="text-xs font-medium text-neutral-700">State before this rescan:</p>

                                                            {/* Use snapshot if available, fall back to legacy fields */}
                                                            {scan.snapshot ? (
                                                              <>
                                                                {/* Helper to get issue status for a field */}
                                                                {(() => {
                                                                  const getFieldStatus = (fieldName: string) => {
                                                                    const issue = scan.snapshot?.issues?.find(
                                                                      i => i.field.toLowerCase() === fieldName.toLowerCase()
                                                                    );
                                                                    return issue?.type || 'success';
                                                                  };
                                                                  const getFieldMessage = (fieldName: string) => {
                                                                    const issue = scan.snapshot?.issues?.find(
                                                                      i => i.field.toLowerCase() === fieldName.toLowerCase()
                                                                    );
                                                                    return issue?.message;
                                                                  };
                                                                  const statusStyles = {
                                                                    error: 'border-red-300 bg-red-50/50',
                                                                    warning: 'border-amber-300 bg-amber-50/50',
                                                                    success: 'border-green-300 bg-green-50/50',
                                                                  };
                                                                  const badgeStyles = {
                                                                    error: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', Icon: AlertCircle },
                                                                    warning: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', Icon: AlertTriangle },
                                                                    success: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', Icon: CheckCircle },
                                                                  };

                                                                  const StatusField = ({ label, value, fieldName, truncate = false }: { label: string; value?: string; fieldName: string; truncate?: boolean }) => {
                                                                    const status = getFieldStatus(fieldName) as keyof typeof statusStyles;
                                                                    const message = getFieldMessage(fieldName);
                                                                    const badge = badgeStyles[status];
                                                                    return (
                                                                      <div className={`relative rounded-lg border-2 p-2 ${statusStyles[status]}`}>
                                                                        <div className="absolute -top-2 right-2">
                                                                          <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text} ${badge.border} border`}>
                                                                            <badge.Icon className="h-2.5 w-2.5" />
                                                                            <span>{status === 'success' ? 'Good' : status === 'error' ? 'Error' : 'Warning'}</span>
                                                                          </div>
                                                                        </div>
                                                                        <span className="text-neutral-700 font-medium text-xs">{label}</span>
                                                                        <p className={`font-mono text-xs bg-white/80 p-1.5 rounded border mt-1 ${truncate ? 'truncate' : 'line-clamp-2'}`} title={value || ''}>
                                                                          {value || <span className="text-neutral-400 italic">Not set</span>}
                                                                        </p>
                                                                        {message && (
                                                                          <p className="mt-1 text-[10px] text-neutral-600">{message}</p>
                                                                        )}
                                                                      </div>
                                                                    );
                                                                  };

                                                                  const InfoField = ({ label, value, truncate = false }: { label: string; value?: string; truncate?: boolean }) => (
                                                                    <div className="rounded-lg border-2 border-neutral-200 bg-white p-2">
                                                                      <span className="text-neutral-700 font-medium text-xs">{label}</span>
                                                                      <p className={`font-mono text-xs bg-neutral-50 p-1.5 rounded border mt-1 ${truncate ? 'truncate' : ''}`} title={value || ''}>
                                                                        {value || <span className="text-neutral-400 italic">Not set</span>}
                                                                      </p>
                                                                    </div>
                                                                  );

                                                                  return (
                                                                    <div className="space-y-2">
                                                                      {/* Row 1: Title & Description */}
                                                                      <div className="grid gap-2 md:grid-cols-2">
                                                                        <StatusField label="Title" value={scan.snapshot?.title} fieldName="title" />
                                                                        <StatusField label="Description" value={scan.snapshot?.description} fieldName="description" />
                                                                      </div>

                                                                      {/* Row 2: Canonical & Viewport */}
                                                                      <div className="grid gap-2 md:grid-cols-2">
                                                                        <StatusField label="Canonical" value={scan.snapshot?.canonical} fieldName="canonical" truncate />
                                                                        <StatusField label="Viewport" value={scan.snapshot?.viewport} fieldName="viewport" truncate />
                                                                      </div>

                                                                      {/* Row 3: OG Image & Twitter Card */}
                                                                      <div className="grid gap-2 md:grid-cols-2">
                                                                        <StatusField label="OG Image" value={scan.snapshot?.openGraph?.image} fieldName="og image" truncate />
                                                                        <StatusField label="Twitter Card" value={scan.snapshot?.twitter?.card} fieldName="twitter card" />
                                                                      </div>

                                                                      {/* Row 4: Technical Details */}
                                                                      <div className="grid gap-2 md:grid-cols-3">
                                                                        <InfoField label="Charset" value={scan.snapshot?.charset} />
                                                                        <InfoField label="Language" value={scan.snapshot?.language} />
                                                                        <InfoField label="Robots" value={scan.snapshot?.robots} />
                                                                      </div>

                                                                      {/* Additional OG & Twitter Details (collapsed) */}
                                                                      {(scan.snapshot?.openGraph?.title || scan.snapshot?.twitter?.title) && (
                                                                        <div className="grid gap-2 md:grid-cols-2">
                                                                          {scan.snapshot?.openGraph && (
                                                                            <div className="rounded-lg border-2 border-neutral-200 bg-white p-2">
                                                                              <span className="text-neutral-700 font-medium text-xs">Open Graph Details</span>
                                                                              <div className="grid gap-1 mt-1 text-[10px] font-mono">
                                                                                {scan.snapshot.openGraph.title && (
                                                                                  <p className="truncate"><span className="text-neutral-400">og:title:</span> {scan.snapshot.openGraph.title}</p>
                                                                                )}
                                                                                {scan.snapshot.openGraph.type && (
                                                                                  <p><span className="text-neutral-400">og:type:</span> {scan.snapshot.openGraph.type}</p>
                                                                                )}
                                                                              </div>
                                                                            </div>
                                                                          )}
                                                                          {scan.snapshot?.twitter && (
                                                                            <div className="rounded-lg border-2 border-neutral-200 bg-white p-2">
                                                                              <span className="text-neutral-700 font-medium text-xs">Twitter Details</span>
                                                                              <div className="grid gap-1 mt-1 text-[10px] font-mono">
                                                                                {scan.snapshot.twitter.title && (
                                                                                  <p className="truncate"><span className="text-neutral-400">twitter:title:</span> {scan.snapshot.twitter.title}</p>
                                                                                )}
                                                                                {scan.snapshot.twitter.site && (
                                                                                  <p><span className="text-neutral-400">twitter:site:</span> {scan.snapshot.twitter.site}</p>
                                                                                )}
                                                                              </div>
                                                                            </div>
                                                                          )}
                                                                        </div>
                                                                      )}
                                                                    </div>
                                                                  );
                                                                })()}
                                                              </>
                                                            ) : (
                                                              // Legacy display for old records without snapshot
                                                              <div className="grid gap-2 md:grid-cols-2">
                                                                <div className="rounded-lg border-2 border-neutral-200 bg-white p-2">
                                                                  <span className="text-neutral-700 font-medium text-xs">Title</span>
                                                                  <p className="font-mono text-xs bg-neutral-50 p-1.5 rounded border mt-1">
                                                                    {scan.previousTitle || <span className="text-neutral-400 italic">Not recorded</span>}
                                                                  </p>
                                                                </div>
                                                                <div className="rounded-lg border-2 border-neutral-200 bg-white p-2">
                                                                  <span className="text-neutral-700 font-medium text-xs">Description</span>
                                                                  <p className="font-mono text-xs bg-neutral-50 p-1.5 rounded border mt-1">
                                                                    {scan.previousDescription || <span className="text-neutral-400 italic">Not recorded</span>}
                                                                  </p>
                                                                </div>
                                                              </div>
                                                            )}

                                                            {/* Show what changed if changes detected */}
                                                            {scan.changesDetected && (
                                                              <div className="rounded-lg border-2 border-amber-300 bg-amber-50/50 p-2">
                                                                <span className="text-amber-700 text-xs font-medium flex items-center gap-1">
                                                                  <AlertTriangle className="h-3 w-3" />
                                                                  Changes were detected after this scan
                                                                </span>
                                                              </div>
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
