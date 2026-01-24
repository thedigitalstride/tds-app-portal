'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Archive,
  Play,
  Square,
  FileText,
} from 'lucide-react';
import { PageArchiveImporter } from '@/components/page-archive-importer';
import { BatchReport } from './BatchReport';
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
  snapshotId?: string;
}

interface BatchStatus {
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: { completed: number; total: number };
  currentUrl?: string;
  results: {
    succeeded: Array<{ url: string; score: number; analysisId: string; processedAt: string }>;
    failed: Array<{ url: string; error: string; attempts: number; lastAttemptAt: string }>;
    skipped: Array<{ url: string; reason: 'duplicate' | 'nested_sitemap' | 'invalid' | 'already_exists' }>;
  };
  averageScore?: number;
  completedAt?: string;
}

interface ParsedUrls {
  urls: string[];
  totalUrls: number;
  filteredUrls?: {
    nestedSitemaps: number;
    duplicates: number;
    total: number;
  };
}

interface ScanPanelProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
  clientName: string;
  onScanComplete: () => void;
}

export function ScanPanel({
  isOpen,
  onClose,
  clientId,
  clientName,
  onScanComplete,
}: ScanPanelProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Single URL state
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Bulk scan state - Phase 1: Parse URLs
  const [bulkMode, setBulkMode] = useState<'sitemap' | 'urls'>('sitemap');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [urlList, setUrlList] = useState('');
  const [parsedUrls, setParsedUrls] = useState<ParsedUrls | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Bulk scan state - Phase 2: Batch Processing
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [, setIsPolling] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Batch Report state
  const [showReport, setShowReport] = useState(false);
  const [completedBatch, setCompletedBatch] = useState<BatchStatus | null>(null);

  // Legacy bulk results for immediate small scans
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkStats, setBulkStats] = useState<{
    totalUrls: number;
    analyzed: number;
    failed: number;
    averageScore: number;
  } | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Page Archive importer state
  const [showArchiveImporter, setShowArchiveImporter] = useState(false);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Stop polling when panel closes
  useEffect(() => {
    if (!isOpen && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      setIsPolling(false);
    }
  }, [isOpen]);

  // Check which URLs already exist in the library for this client
  const checkExistingUrls = useCallback(async (urls: string[]) => {
    if (!clientId) return { existing: [], new: urls };

    try {
      const res = await fetch('/api/tools/meta-tag-analyser/check-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, urls }),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall through to default
    }
    return { existing: [], new: urls };
  }, [clientId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  // Single URL scan
  const analyzeSingleUrl = async () => {
    if (!url || !clientId) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const analyzeRes = await fetch('/api/tools/meta-tag-analyser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, clientId }),
      });

      const analyzeData = await analyzeRes.json();

      if (!analyzeRes.ok) {
        throw new Error(analyzeData.error || 'Failed to analyze URL');
      }

      const saveRes = await fetch('/api/tools/meta-tag-analyser/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          result: analyzeData.result,
          issues: analyzeData.issues,
          snapshotId: analyzeData.snapshotId,
        }),
      });

      if (saveRes.ok) {
        const saveData = await saveRes.json();
        setSuccess(saveData.message || (saveData.isUpdate ? 'URL updated' : 'URL saved'));
        setUrl('');
        onScanComplete();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Phase 1: Parse URLs (for bulk mode)
  const parseUrls = async () => {
    if (!clientId) return;

    setParseLoading(true);
    setParseError(null);
    setParsedUrls(null);

    try {
      if (bulkMode === 'sitemap') {
        if (!sitemapUrl) {
          setParseError('Sitemap URL is required');
          setParseLoading(false);
          return;
        }

        const res = await fetch('/api/tools/meta-tag-analyser/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'sitemap',
            sitemapUrl,
            clientId,
            parseOnly: true,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to parse sitemap');
        }

        setParsedUrls({
          urls: data.urls,
          totalUrls: data.totalUrls,
          filteredUrls: data.filteredUrls,
        });
      } else {
        // URL list mode
        const urls = urlList.split('\n').map(u => u.trim()).filter(Boolean);
        if (urls.length === 0) {
          setParseError('No URLs provided');
          setParseLoading(false);
          return;
        }

        setParsedUrls({
          urls: urls.map(u => u.startsWith('http') ? u : `https://${u}`),
          totalUrls: urls.length,
        });
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse URLs');
    } finally {
      setParseLoading(false);
    }
  };

  // Phase 2: Start batch processing
  const startBatchScan = async () => {
    if (!clientId || !parsedUrls?.urls.length) return;

    // For small batches (10 or fewer), use immediate processing
    if (parsedUrls.urls.length <= 10) {
      await runImmediateScan(parsedUrls.urls);
      return;
    }

    try {
      // Create batch
      const res = await fetch('/api/tools/meta-tag-analyser/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          urls: parsedUrls.urls,
          source: bulkMode,
          sourceUrl: bulkMode === 'sitemap' ? sitemapUrl : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create batch');
      }

      setBatchStatus({
        batchId: data.batchId,
        status: 'pending',
        progress: { completed: 0, total: data.totalUrls },
        results: { succeeded: [], failed: [], skipped: [] },
      });

      // Start polling for progress
      startPolling(data.batchId);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to start batch');
    }
  };

  // Immediate scan for small batches
  const runImmediateScan = async (urls: string[]) => {
    setParseLoading(true);
    setBulkResults([]);
    setBulkStats(null);

    try {
      const res = await fetch('/api/tools/meta-tag-analyser/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'urls',
          urls,
          clientId,
        }),
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
      setParsedUrls(null);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Bulk scan failed');
    } finally {
      setParseLoading(false);
    }
  };

  // Poll for batch progress
  const startPolling = (batchId: string) => {
    setIsPolling(true);

    const poll = async () => {
      try {
        const res = await fetch(`/api/tools/meta-tag-analyser/batch?batchId=${batchId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to get batch status');
        }

        setBatchStatus(data);

        // Check if batch is complete
        if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
          setIsPolling(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          // Show report
          setCompletedBatch(data);
          setShowReport(true);

          // Refresh library
          onScanComplete();
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    // Poll immediately, then every 1 second
    poll();
    pollingRef.current = setInterval(poll, 1000);
  };

  // Cancel batch
  const cancelBatch = async () => {
    if (!batchStatus?.batchId) return;

    try {
      await fetch(`/api/tools/meta-tag-analyser/batch?batchId=${batchStatus.batchId}`, {
        method: 'DELETE',
      });

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setIsPolling(false);
      setBatchStatus(null);
      setParsedUrls(null);
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  // Handle import from Page Archive
  const handleImportFromArchive = async (urls: string[]) => {
    setShowArchiveImporter(false);
    if (urls.length === 0) return;

    // Set up the URL list and parse
    const normalizedUrls = urls.map(u => u.startsWith('http') ? u : `https://${u}`);
    setParsedUrls({
      urls: normalizedUrls,
      totalUrls: normalizedUrls.length,
    });
  };

  // Legacy: Toggle result selection
  const toggleResultSelection = (index: number) => {
    setBulkResults(prev => prev.map((r, i) =>
      i === index ? { ...r, selected: !r.selected } : r
    ));
  };

  // Legacy: Save bulk results
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
        resetBulkState();
        onClose();
      } else {
        const data = await res.json();
        setParseError(data.error || 'Failed to save results');
      }
    } catch (_err) {
      setParseError('Failed to save bulk results');
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

  const resetBulkState = () => {
    setParsedUrls(null);
    setBatchStatus(null);
    setBulkResults([]);
    setBulkStats(null);
    setParseError(null);
    setSitemapUrl('');
    setUrlList('');
    setExpandedRows(new Set());
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
            onClick={() => { setMode('single'); resetBulkState(); }}
          >
            <Search className="mr-2 h-4 w-4" />
            Single URL
          </Button>
          <Button
            variant={mode === 'bulk' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setMode('bulk'); resetBulkState(); }}
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

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

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
              {/* Bulk Mode Selection - only show if not processing */}
              {!batchStatus && !bulkStats && (
                <>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={bulkMode === 'sitemap' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setBulkMode('sitemap'); setParsedUrls(null); setParseError(null); }}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      From Sitemap
                    </Button>
                    <Button
                      variant={bulkMode === 'urls' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setBulkMode('urls'); setParsedUrls(null); setParseError(null); }}
                    >
                      <List className="mr-2 h-4 w-4" />
                      URL List
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowArchiveImporter(true)}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      From Library
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
                        onChange={(e) => { setSitemapUrl(e.target.value); setParsedUrls(null); }}
                        disabled={parseLoading}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        URLs (one per line)
                      </label>
                      <Textarea
                        placeholder={'https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3'}
                        value={urlList}
                        onChange={(e) => { setUrlList(e.target.value); setParsedUrls(null); }}
                        rows={6}
                        disabled={parseLoading}
                      />
                      <p className="mt-1 text-xs text-neutral-500">
                        {urlList.split('\n').filter(Boolean).length} URLs entered
                      </p>
                    </div>
                  )}

                  {/* Parse Button - Phase 1 */}
                  {!parsedUrls && (
                    <Button
                      onClick={parseUrls}
                      disabled={parseLoading || (bulkMode === 'sitemap' ? !sitemapUrl : !urlList.trim())}
                      className="w-full"
                    >
                      {parseLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          {bulkMode === 'sitemap' ? 'Parsing Sitemap...' : 'Preparing URLs...'}
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          {bulkMode === 'sitemap' ? 'Parse Sitemap' : 'Prepare URLs'}
                        </>
                      )}
                    </Button>
                  )}

                  {/* Parsed URLs Summary - Phase 1 Complete */}
                  {parsedUrls && !batchStatus && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="flex items-center gap-3 mb-3">
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-800">
                            {parsedUrls.totalUrls} URLs ready to scan
                          </span>
                        </div>

                        {parsedUrls.filteredUrls && parsedUrls.filteredUrls.total > 0 && (
                          <div className="text-xs text-blue-700 mb-3">
                            <span className="font-medium">{parsedUrls.filteredUrls.total} URLs filtered:</span>
                            {parsedUrls.filteredUrls.nestedSitemaps > 0 && (
                              <span className="ml-1">
                                {parsedUrls.filteredUrls.nestedSitemaps} nested sitemap{parsedUrls.filteredUrls.nestedSitemaps !== 1 ? 's' : ''} (processed recursively)
                              </span>
                            )}
                            {parsedUrls.filteredUrls.nestedSitemaps > 0 && parsedUrls.filteredUrls.duplicates > 0 && ', '}
                            {parsedUrls.filteredUrls.duplicates > 0 && (
                              <span>
                                {parsedUrls.filteredUrls.duplicates} duplicate{parsedUrls.filteredUrls.duplicates !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            onClick={startBatchScan}
                            disabled={parseLoading}
                            className="flex-1"
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Scan {parsedUrls.totalUrls} URL{parsedUrls.totalUrls !== 1 ? 's' : ''}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setParsedUrls(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Batch Processing Progress - Phase 2 */}
              {batchStatus && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                        <span className="font-medium text-blue-800">
                          Scanning URLs...
                        </span>
                      </div>
                      <span className="text-sm text-blue-700 font-mono">
                        {batchStatus.progress.completed}/{batchStatus.progress.total}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-blue-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.round((batchStatus.progress.completed / batchStatus.progress.total) * 100)}%`,
                        }}
                      />
                    </div>

                    {/* Current URL */}
                    {batchStatus.currentUrl && (
                      <p className="text-xs text-blue-600 font-mono truncate">
                        {batchStatus.currentUrl.replace(/^https?:\/\//, '').slice(0, 50)}...
                      </p>
                    )}

                    {/* Live Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white/50 rounded p-2">
                        <p className="text-xs text-neutral-500">Succeeded</p>
                        <p className="font-semibold text-green-600">{batchStatus.results.succeeded.length}</p>
                      </div>
                      <div className="bg-white/50 rounded p-2">
                        <p className="text-xs text-neutral-500">Failed</p>
                        <p className="font-semibold text-red-600">{batchStatus.results.failed.length}</p>
                      </div>
                      <div className="bg-white/50 rounded p-2">
                        <p className="text-xs text-neutral-500">Remaining</p>
                        <p className="font-semibold text-neutral-600">
                          {batchStatus.progress.total - batchStatus.progress.completed}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-blue-600">
                      You can close this panel - processing will continue. Results are saved automatically.
                    </p>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelBatch}
                      className="w-full"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Cancel Scan
                    </Button>
                  </div>
                </div>
              )}

              {/* Error */}
              {parseError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {parseError}
                </div>
              )}

              {/* Legacy: Bulk Results Review (for small immediate scans) */}
              {bulkStats && !parseLoading && (
                <div className="space-y-4">
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

                            <span
                              className={`flex-1 font-mono text-xs truncate ${item.error ? 'text-red-600' : ''}`}
                              title={item.url}
                            >
                              {item.url.replace(/^https?:\/\//, '').slice(0, 40)}
                            </span>

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
          </div>
        )}
      </div>

      {/* Page Archive Importer Modal */}
      <PageArchiveImporter
        clientId={clientId || ''}
        isOpen={showArchiveImporter}
        onClose={() => setShowArchiveImporter(false)}
        onImport={handleImportFromArchive}
        checkExistingUrls={checkExistingUrls}
        toolName="Meta Tag Analyser"
      />

      {/* Batch Report Modal */}
      {showReport && completedBatch && (
        <BatchReport
          batchId={completedBatch.batchId}
          status={completedBatch.status as 'completed' | 'failed' | 'cancelled'}
          results={completedBatch.results}
          averageScore={completedBatch.averageScore}
          totalUrls={completedBatch.progress.total}
          completedAt={completedBatch.completedAt}
          onClose={() => {
            setShowReport(false);
            setCompletedBatch(null);
            resetBulkState();
          }}
        />
      )}
    </>
  );
}
