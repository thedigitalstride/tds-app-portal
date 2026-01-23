'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  MapPin,
  List,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Check,
  Pause,
  Play,
  Square,
  Clock,
  RotateCcw,
} from 'lucide-react';
import {
  Button,
  Input,
  Textarea,
  Badge,
} from '@tds/ui';

interface MetaTagResult {
  url: string;
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  viewport?: string;
  charset?: string;
  author?: string;
  themeColor?: string;
  language?: string;
  favicon?: string;
  hreflang?: Array<{ lang: string; url: string }>;
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

interface BulkResult {
  url: string;
  result?: MetaTagResult;
  issues?: AnalysisIssue[];
  error?: string;
  score: number;
  selected?: boolean;
}

interface QueueStatus {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  permanentlyFailed: number;
  remainingToProcess: number;
  failedUrls: Array<{ url: string; error: string; retryCount: number; batchId: string }>;
  activeBatches: string[];
  hasQueuedUrls: boolean;
}

interface ScanPanelProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
  clientName: string;
  onScanComplete: () => void;
  // Polling props (lifted from page)
  queueStatus: QueueStatus | null;
  isPolling: boolean;
  isPaused: boolean;
  queueLoading: boolean;
  queueProgress: { completed: number; total: number } | null;
  startPolling: () => void;
  stopPolling: () => void;
  pausePolling: () => void;
  resumePolling: () => void;
  cancelQueue: (batchId?: string, clearAll?: boolean) => Promise<void>;
  refreshStatus: () => Promise<void>;
  queueUrls: (urls: string[], clearExisting?: boolean) => Promise<{ queued: number; batchId: string }>;
  retryFailed: () => Promise<{ reset: number }>;
  totalProcessed: number;
}

const IMMEDIATE_SCAN_LIMIT = 50;

export function ScanPanel({
  isOpen,
  onClose,
  clientId,
  clientName,
  onScanComplete,
  // Polling props
  queueStatus,
  isPolling,
  isPaused,
  queueLoading: _queueLoading,
  queueProgress,
  startPolling,
  stopPolling: _stopPolling,
  pausePolling,
  resumePolling,
  cancelQueue,
  refreshStatus,
  queueUrls,
  retryFailed,
  totalProcessed: _totalProcessed,
}: ScanPanelProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Single URL state
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    filteredUrls?: {
      nestedSitemaps: number;
      duplicates: number;
      total: number;
    };
  } | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [retryLoading, setRetryLoading] = useState(false);
  // Track total URLs discovered (may be more than queued after filtering)
  const [_totalDiscovered, setTotalDiscovered] = useState<number | null>(null);

  // Show resume prompt if there are pending URLs and not already polling
  const showResumePrompt = queueStatus?.hasQueuedUrls && !isPolling;

  // Check for pending URLs when client changes
  useEffect(() => {
    if (clientId && isOpen) {
      refreshStatus();
    }
  }, [clientId, isOpen, refreshStatus]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const analyzeSingleUrl = async () => {
    if (!url || !clientId) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // First analyze
      const analyzeRes = await fetch('/api/tools/meta-tag-analyser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, clientId }),
      });

      const analyzeData = await analyzeRes.json();

      if (!analyzeRes.ok) {
        throw new Error(analyzeData.error || 'Failed to analyze URL');
      }

      // Then save immediately
      const saveRes = await fetch('/api/tools/meta-tag-analyser/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          result: analyzeData.result,
          issues: analyzeData.issues,
        }),
      });

      if (saveRes.ok) {
        const saveData = await saveRes.json();
        setSuccess(saveData.message || (saveData.isUpdate ? 'URL updated' : 'URL saved'));
        setUrl(''); // Clear for next scan
        onScanComplete(); // Refresh the library
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const runBulkScan = async () => {
    setBulkLoading(true);
    setBulkError(null);
    setBulkResults([]);
    setBulkStats(null);
    setExpandedRows(new Set());
    setTotalDiscovered(null);

    try {
      let urlsToScan: string[] = [];

      if (bulkMode === 'sitemap') {
        // For sitemap, fetch and parse first to get URL list
        const res = await fetch('/api/tools/meta-tag-analyser/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'sitemap', sitemapUrl, clientId }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Bulk scan failed');
        }

        // Mark all successful results as selected by default
        const resultsWithSelection = data.results.map((r: BulkResult) => ({
          ...r,
          selected: !r.error,
        }));

        setBulkResults(resultsWithSelection);
        setBulkStats({
          totalUrls: data.totalUrls,
          analyzed: data.analyzed,
          failed: data.failed,
          averageScore: data.averageScore,
          filteredUrls: data.filteredUrls,
        });

        // Queue remaining URLs if there are more than 50
        if (data.hasMoreUrls && data.remainingUrls?.length > 0) {
          const queueResult = await queueUrls(data.remainingUrls);

          // Start background processing
          startPolling();

          setSuccess(`First ${IMMEDIATE_SCAN_LIMIT} URLs scanned. ${queueResult.queued} URLs queued for background processing.`);
          setTimeout(() => setSuccess(null), 5000);
        }

        setBulkLoading(false);
        return;
      }

      // For URL list mode, handle the split
      urlsToScan = urlList.split('\n').map(u => u.trim()).filter(Boolean);

      if (urlsToScan.length <= IMMEDIATE_SCAN_LIMIT) {
        // All URLs can be scanned immediately
        const res = await fetch('/api/tools/meta-tag-analyser/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'urls', urls: urlsToScan, clientId }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Bulk scan failed');
        }

        const resultsWithSelection = data.results.map((r: BulkResult) => ({
          ...r,
          selected: !r.error,
        }));

        setBulkResults(resultsWithSelection);
        setBulkStats({
          totalUrls: data.totalUrls,
          analyzed: data.analyzed,
          failed: data.failed,
          averageScore: data.averageScore,
        });
      } else {
        // Split: first 50 immediate, rest queued
        const immediateUrls = urlsToScan.slice(0, IMMEDIATE_SCAN_LIMIT);
        const queuedUrls = urlsToScan.slice(IMMEDIATE_SCAN_LIMIT);

        // Scan first 50 immediately
        const res = await fetch('/api/tools/meta-tag-analyser/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'urls', urls: immediateUrls, clientId }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Bulk scan failed');
        }

        const resultsWithSelection = data.results.map((r: BulkResult) => ({
          ...r,
          selected: !r.error,
        }));

        setBulkResults(resultsWithSelection);
        setBulkStats({
          totalUrls: urlsToScan.length,
          analyzed: data.analyzed,
          failed: data.failed,
          averageScore: data.averageScore,
        });

        // Queue remaining URLs
        const queueResult = await queueUrls(queuedUrls);

        // Start background processing
        startPolling();

        setSuccess(`First ${IMMEDIATE_SCAN_LIMIT} URLs scanned. ${queueResult.queued} URLs queued for background processing.`);
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setBulkLoading(false);
    }
  };

  // Handle retry failed URLs
  const handleRetryFailed = async () => {
    setRetryLoading(true);
    try {
      const result = await retryFailed();
      if (result.reset > 0) {
        setSuccess(`${result.reset} URLs reset for retry.`);
        startPolling();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Failed to retry');
    } finally {
      setRetryLoading(false);
    }
  };

  const toggleResultSelection = (index: number) => {
    setBulkResults(prev => prev.map((r, i) =>
      i === index ? { ...r, selected: !r.selected } : r
    ));
  };

  const saveBulkResults = async () => {
    if (!clientId || bulkResults.length === 0) return;

    const selectedResults = bulkResults.filter(r => r.selected && !r.error);
    if (selectedResults.length === 0) return;

    setBulkSaving(true);
    try {
      const res = await fetch('/api/tools/meta-tag-analyser/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          bulk: true,
          results: selectedResults,
        }),
      });

      if (res.ok) {
        onScanComplete();
        // Reset bulk state
        setBulkResults([]);
        setBulkStats(null);
        setSitemapUrl('');
        setUrlList('');
        onClose();
      } else {
        const data = await res.json();
        setBulkError(data.error || 'Failed to save results');
      }
    } catch (_err) {
      setBulkError('Failed to save bulk results');
    } finally {
      setBulkSaving(false);
    }
  };

  const toggleRowExpand = (index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectedCount = bulkResults.filter(r => r.selected && !r.error).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Add URLs</h2>
            <p className="text-sm text-neutral-500">
              {clientName ? `Scanning for ${clientName}` : 'Select a client first'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-4 border-b">
          <Button
            variant={mode === 'single' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('single')}
          >
            <Search className="mr-2 h-4 w-4" />
            Single URL
          </Button>
          <Button
            variant={mode === 'bulk' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('bulk')}
          >
            <List className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!clientId ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-neutral-300 mb-4" />
              <p className="text-neutral-500">Select a client to start scanning</p>
            </div>
          ) : mode === 'single' ? (
            /* Single URL Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  URL to scan
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com/page"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && analyzeSingleUrl()}
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-neutral-500">
                  URL will be scanned and automatically saved to the library
                </p>
              </div>

              <Button
                onClick={analyzeSingleUrl}
                disabled={loading || !url}
                className="w-full"
              >
                {loading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Scan & Save
              </Button>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  {success}
                </div>
              )}
            </div>
          ) : (
            /* Bulk Import Mode */
            <div className="space-y-4">
              {/* Bulk Mode Selection */}
              <div className="flex gap-2">
                <Button
                  variant={bulkMode === 'sitemap' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBulkMode('sitemap')}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  From Sitemap
                </Button>
                <Button
                  variant={bulkMode === 'urls' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBulkMode('urls')}
                >
                  <List className="mr-2 h-4 w-4" />
                  URL List
                </Button>
              </div>

              {bulkMode === 'sitemap' ? (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Sitemap URL
                  </label>
                  <Input
                    type="url"
                    placeholder="https://example.com/sitemap.xml"
                    value={sitemapUrl}
                    onChange={(e) => setSitemapUrl(e.target.value)}
                    disabled={bulkLoading}
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    First 50 URLs scanned immediately, rest processed in background
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    URLs (one per line)
                  </label>
                  <Textarea
                    placeholder={'https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3'}
                    value={urlList}
                    onChange={(e) => setUrlList(e.target.value)}
                    rows={6}
                    disabled={bulkLoading}
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    {urlList.split('\n').filter(Boolean).length} URLs
                    {urlList.split('\n').filter(Boolean).length > IMMEDIATE_SCAN_LIMIT && (
                      <span className="text-amber-600">
                        {' '}- First {IMMEDIATE_SCAN_LIMIT} scanned immediately, rest queued
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Scan Button (only show if no results yet) */}
              {!bulkStats && (
                <Button
                  onClick={runBulkScan}
                  disabled={bulkLoading || (bulkMode === 'sitemap' ? !sitemapUrl : !urlList.trim())}
                  className="w-full"
                >
                  {bulkLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Scan {bulkMode === 'sitemap' ? 'Sitemap' : 'URLs'}
                    </>
                  )}
                </Button>
              )}

              {/* Resume Prompt */}
              {showResumePrompt && queueStatus && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-800">
                        Resume background processing?
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        {queueStatus.remainingToProcess} URLs are waiting to be processed.
                        {queueStatus.permanentlyFailed > 0 && (
                          <span> ({queueStatus.permanentlyFailed} failed)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={startPolling}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelQueue()}
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Cancel All
                    </Button>
                  </div>
                </div>
              )}

              {/* Queue Progress */}
              {isPolling && queueProgress && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                      <span className="font-medium text-blue-800">
                        Background processing...
                      </span>
                    </div>
                    <span className="text-sm text-blue-700">
                      {queueProgress.completed}/{queueProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round((queueProgress.completed / queueProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-blue-600">
                    You can close this panel - processing will continue in the background.
                  </p>
                  <div className="flex gap-2">
                    {isPaused ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resumePolling}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Resume
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={pausePolling}
                      >
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelQueue()}
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Failed URLs Section */}
              {queueStatus && queueStatus.failedUrls && queueStatus.failedUrls.length > 0 && !isPolling && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-red-800">
                        {queueStatus.failedUrls.length} URL{queueStatus.failedUrls.length !== 1 ? 's' : ''} failed
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        These URLs could not be scanned after multiple attempts.
                      </p>
                    </div>
                  </div>

                  {/* Failed URLs List */}
                  <div className="max-h-32 overflow-y-auto bg-white/50 rounded border border-red-200">
                    {queueStatus.failedUrls.slice(0, 10).map((f, i) => (
                      <div key={i} className="px-2 py-1 border-b border-red-100 last:border-b-0">
                        <p className="font-mono text-xs text-red-800 truncate" title={f.url}>
                          {f.url.replace(/^https?:\/\//, '')}
                        </p>
                        <p className="text-xs text-red-600">{f.error}</p>
                      </div>
                    ))}
                    {queueStatus.failedUrls.length > 10 && (
                      <div className="px-2 py-1 text-xs text-red-600 italic">
                        ...and {queueStatus.failedUrls.length - 10} more
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetryFailed}
                      disabled={retryLoading}
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      {retryLoading ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                      )}
                      Retry Failed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelQueue(undefined, true)}
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear All
                    </Button>
                  </div>
                </div>
              )}

              {/* Error */}
              {bulkError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {bulkError}
                </div>
              )}

              {/* Success message for queue */}
              {success && mode === 'bulk' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  {success}
                </div>
              )}

              {/* Bulk Results Review */}
              {bulkStats && !bulkLoading && (
                <div className="space-y-4">
                  {/* Stats Summary */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-lg bg-neutral-50 p-2 text-center">
                      <p className="text-xs text-neutral-500">Total</p>
                      <p className="text-lg font-semibold">{bulkStats.totalUrls}</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-2 text-center">
                      <p className="text-xs text-neutral-500">Success</p>
                      <p className="text-lg font-semibold text-green-600">{bulkStats.analyzed}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2 text-center">
                      <p className="text-xs text-neutral-500">Failed</p>
                      <p className="text-lg font-semibold text-red-600">{bulkStats.failed}</p>
                    </div>
                    <div className="rounded-lg bg-neutral-50 p-2 text-center">
                      <p className="text-xs text-neutral-500">Avg Score</p>
                      <p className={`text-lg font-semibold ${getScoreColor(bulkStats.averageScore).split(' ')[0]}`}>
                        {bulkStats.averageScore}%
                      </p>
                    </div>
                  </div>

                  {/* Filtered URLs Info */}
                  {bulkStats.filteredUrls && bulkStats.filteredUrls.total > 0 && (
                    <div className="text-xs text-neutral-500 bg-neutral-50 rounded-lg p-2">
                      <span className="font-medium">{bulkStats.filteredUrls.total} URLs filtered:</span>
                      {bulkStats.filteredUrls.nestedSitemaps > 0 && (
                        <span className="ml-1">
                          {bulkStats.filteredUrls.nestedSitemaps} nested sitemap{bulkStats.filteredUrls.nestedSitemaps !== 1 ? 's' : ''} (processed recursively)
                        </span>
                      )}
                      {bulkStats.filteredUrls.nestedSitemaps > 0 && bulkStats.filteredUrls.duplicates > 0 && (
                        <span>, </span>
                      )}
                      {bulkStats.filteredUrls.duplicates > 0 && (
                        <span>
                          {bulkStats.filteredUrls.duplicates} duplicate{bulkStats.filteredUrls.duplicates !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Results List with Checkboxes */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-neutral-50 px-3 py-2 border-b flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-700">
                        Select URLs to add ({selectedCount} selected)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const allSelected = bulkResults.filter(r => !r.error).every(r => r.selected);
                          setBulkResults(prev => prev.map(r => ({
                            ...r,
                            selected: r.error ? false : !allSelected,
                          })));
                        }}
                      >
                        {bulkResults.filter(r => !r.error).every(r => r.selected) ? 'Deselect all' : 'Select all'}
                      </Button>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y">
                      {bulkResults.map((item, index) => (
                        <div key={index}>
                          <div
                            className={`px-3 py-2 flex items-center gap-3 text-sm ${item.error ? 'bg-red-50/50' : 'hover:bg-neutral-50 cursor-pointer'}`}
                            onClick={() => !item.error && toggleResultSelection(index)}
                          >
                            {/* Checkbox */}
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                item.error
                                  ? 'bg-neutral-100 border-neutral-300'
                                  : item.selected
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'border-neutral-300'
                              }`}
                            >
                              {item.selected && !item.error && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>

                            {/* URL */}
                            <span
                              className={`flex-1 font-mono text-xs truncate ${item.error ? 'text-red-600' : ''}`}
                              title={item.url}
                            >
                              {item.url.replace(/^https?:\/\//, '').slice(0, 40)}
                            </span>

                            {/* Status/Score */}
                            {item.error ? (
                              <Badge variant="destructive" className="text-xs">Failed</Badge>
                            ) : (
                              <>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${getScoreColor(item.score)}`}>
                                  {item.score}%
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRowExpand(index);
                                  }}
                                  className="p-1 hover:bg-neutral-100 rounded"
                                >
                                  {expandedRows.has(index) ? (
                                    <ChevronUp className="h-4 w-4 text-neutral-400" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-neutral-400" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>

                          {/* Expanded Details */}
                          {expandedRows.has(index) && item.result && (
                            <div className="px-3 py-2 bg-neutral-50 border-t text-xs space-y-2">
                              <div>
                                <span className="text-neutral-500">Title:</span>
                                <p className="font-mono mt-0.5">{item.result.title || 'Not set'}</p>
                              </div>
                              <div>
                                <span className="text-neutral-500">Description:</span>
                                <p className="font-mono mt-0.5 line-clamp-2">{item.result.description || 'Not set'}</p>
                              </div>
                              {item.issues && item.issues.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
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
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Add Selected Button for Bulk Mode */}
        {mode === 'bulk' && bulkStats && selectedCount > 0 && (
          <div className="p-4 border-t bg-neutral-50 space-y-2">
            <Button
              onClick={saveBulkResults}
              disabled={bulkSaving}
              className="w-full"
            >
              {bulkSaving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Add {selectedCount} URL{selectedCount !== 1 ? 's' : ''} to Library
                </>
              )}
            </Button>
            {isPolling && queueProgress && (
              <p className="text-xs text-center text-neutral-500">
                + {queueProgress.total - queueProgress.completed} more URLs processing in background
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
