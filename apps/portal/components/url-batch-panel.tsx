'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  List,
  MapPin,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Plus,
  Play,
  Square,
  FileText,
  Archive,
  Cookie,
} from 'lucide-react';
import { PageArchiveImporter } from '@/components/page-archive-importer';
import { useToast } from '@/components/toast-context';
import { Button, Input, Textarea } from '@tds/ui';

interface BatchStatus {
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: { completed: number; total: number };
  currentUrl?: string;
  results: {
    succeeded: Array<{ url: string; result?: unknown; processedAt: string }>;
    failed: Array<{ url: string; error: string; processedAt: string }>;
  };
  completedAt?: string;
}

type CookieConsentProvider = 'none' | 'cookiebot';

interface ParsedUrls {
  urls: string[];
  totalUrls: number;
  filteredUrls?: {
    nestedSitemaps: number;
    duplicates: number;
    total: number;
  };
  /** Unique domains extracted from URLs */
  uniqueDomains?: string[];
}

export interface CheckUrlsResult {
  existing: string[];
  new: string[];
}

export interface UrlBatchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
  clientName: string;
  toolId: string;
  onUrlsProcessed: () => void;

  // Optional customization
  title?: string;
  singleUrlLabel?: string;
  processingLabel?: string;
  singleButtonLabel?: string;
  bulkButtonLabel?: string;

  // Page Archive integration (only for analysis tools, NOT Page Library)
  enablePageArchive?: boolean;
  checkExistingUrls?: (urls: string[]) => Promise<CheckUrlsResult>;
  toolName?: string;

  // Cookie consent handling for bulk imports (Page Library only)
  enableCookieConfig?: boolean;
}

export function UrlBatchPanel({
  isOpen,
  onClose,
  clientId,
  clientName,
  toolId,
  onUrlsProcessed,
  title = 'Add URLs',
  singleUrlLabel = 'URL to add',
  processingLabel = 'Processing URLs...',
  singleButtonLabel = 'Add URL',
  bulkButtonLabel = 'Process',
  enablePageArchive = false,
  checkExistingUrls,
  toolName,
  enableCookieConfig = false,
}: UrlBatchPanelProps) {
  const { addToast, updateToast } = useToast();
  const toastIdRef = useRef<string | null>(null);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Page Archive importer state
  const [showArchiveImporter, setShowArchiveImporter] = useState(false);

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

  // Cookie consent config state
  const [cookieProvider, setCookieProvider] = useState<CookieConsentProvider>('none');
  const [configuringCookies, setConfiguringCookies] = useState(false);

  // Helper to extract domain from URL (strips www. for consistent matching)
  const extractDomain = (url: string): string => {
    try {
      let hostname = new URL(url).hostname.toLowerCase();
      if (hostname.startsWith('www.')) {
        hostname = hostname.slice(4);
      }
      return hostname;
    } catch {
      let hostname = url.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
      if (hostname.startsWith('www.')) {
        hostname = hostname.slice(4);
      }
      return hostname;
    }
  };

  // Helper to get unique domains from URLs
  const getUniqueDomains = (urls: string[]): string[] => {
    const domains = new Set(urls.map(extractDomain));
    return Array.from(domains).sort();
  };

  // Save domain configs before starting batch
  const saveDomainConfigs = async (domains: string[], provider: CookieConsentProvider) => {
    if (!clientId || provider === 'none') return;

    setConfiguringCookies(true);
    try {
      // Save config for each domain and validate responses
      const results = await Promise.all(
        domains.map(async (domain) => {
          const res = await fetch('/api/cookie-domain-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId,
              domain,
              cookieConsentProvider: provider,
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Failed to save config for ${domain}`);
          }
          return { domain, success: true };
        })
      );
      return results;
    } catch (error) {
      console.error('Failed to save domain configs:', error);
      throw error; // Re-throw to allow caller to handle
    } finally {
      setConfiguringCookies(false);
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Single URL processing
  const processSingleUrl = async () => {
    if (!url || !clientId) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const truncatedUrl = url.replace(/^https?:\/\//, '').slice(0, 50);
    const toastId = addToast({
      type: 'progress',
      message: `Adding ${truncatedUrl}...`,
    });

    try {
      // Create a single-URL batch and process it
      const res = await fetch('/api/url-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          toolId,
          urls: [url],
          source: 'manual',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process URL');
      }

      // Poll until complete (for single URL, should be quick)
      const batchId = data.batchId;
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max

      while (attempts < maxAttempts) {
        const statusRes = await fetch(`/api/url-batch?batchId=${batchId}`);
        const statusData = await statusRes.json();

        if (statusData.status === 'completed') {
          if (statusData.results.succeeded.length > 0) {
            setSuccess('URL added successfully');
            setUrl('');
            onUrlsProcessed();
            updateToast(toastId, { type: 'success', message: `Added ${truncatedUrl}` });
            setTimeout(() => setSuccess(null), 3000);
          } else if (statusData.results.failed.length > 0) {
            throw new Error(statusData.results.failed[0].error);
          }
          break;
        } else if (statusData.status === 'failed' || statusData.status === 'cancelled') {
          throw new Error('Processing failed');
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Processing timed out');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      updateToast(toastId, { type: 'error', message: errorMsg });
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

        // Fetch and parse sitemap using generic endpoint
        const res = await fetch('/api/sitemap/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sitemapUrl }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to parse sitemap');
        }

        const parsedData = {
          urls: data.urls,
          totalUrls: data.totalUrls,
          filteredUrls: data.filteredUrls,
          uniqueDomains: getUniqueDomains(data.urls),
        };
        setParsedUrls(parsedData);
      } else {
        // URL list mode
        const urls = urlList.split('\n').map((u) => u.trim()).filter(Boolean);
        if (urls.length === 0) {
          setParseError('No URLs provided');
          setParseLoading(false);
          return;
        }

        const normalizedUrls = urls.map((u) => (u.startsWith('http') ? u : `https://${u}`));
        setParsedUrls({
          urls: normalizedUrls,
          totalUrls: urls.length,
          uniqueDomains: getUniqueDomains(normalizedUrls),
        });
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse URLs');
    } finally {
      setParseLoading(false);
    }
  };

  // Phase 2: Start batch processing
  const startBatchProcessing = async () => {
    if (!clientId || !parsedUrls?.urls.length) return;

    try {
      // Save domain configs if cookie handling is enabled and provider is selected
      if (enableCookieConfig && cookieProvider !== 'none' && parsedUrls.uniqueDomains) {
        await saveDomainConfigs(parsedUrls.uniqueDomains, cookieProvider);
      }

      // Create batch
      const res = await fetch('/api/url-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          toolId,
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
        results: { succeeded: [], failed: [] },
      });

      toastIdRef.current = addToast({
        type: 'progress',
        message: processingLabel,
        progress: { current: 0, total: data.totalUrls },
      });

      // Start polling for progress
      startPolling(data.batchId);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to start batch');
    }
  };

  // Poll for batch progress
  const startPolling = (batchId: string) => {
    setIsPolling(true);

    const poll = async () => {
      try {
        const res = await fetch(`/api/url-batch?batchId=${batchId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to get batch status');
        }

        setBatchStatus(data);

        // Update toast with progress
        if (toastIdRef.current) {
          const currentUrl = data.currentUrl?.replace(/^https?:\/\//, '').slice(0, 50);
          updateToast(toastIdRef.current, {
            message: currentUrl ? `${processingLabel.replace('...', '')}: ${currentUrl}...` : processingLabel,
            progress: { current: data.progress.completed, total: data.progress.total },
          });
        }

        // Check if batch is complete
        if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
          setIsPolling(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          if (toastIdRef.current) {
            const succeeded = data.results.succeeded.length;
            const failed = data.results.failed.length;
            updateToast(toastIdRef.current, {
              type: failed > 0 ? 'info' : 'success',
              message: `Processed ${succeeded + failed} URLs (${succeeded} succeeded${failed > 0 ? `, ${failed} failed` : ''})`,
            });
            toastIdRef.current = null;
          }

          // Refresh library
          onUrlsProcessed();
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
      await fetch(`/api/url-batch?batchId=${batchStatus.batchId}`, {
        method: 'DELETE',
      });

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setIsPolling(false);

      if (toastIdRef.current) {
        updateToast(toastIdRef.current, { type: 'info', message: 'Batch processing cancelled' });
        toastIdRef.current = null;
      }

      setBatchStatus(null);
      setParsedUrls(null);
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  const resetBulkState = () => {
    setParsedUrls(null);
    setBatchStatus(null);
    setParseError(null);
    setSitemapUrl('');
    setUrlList('');
    setCookieProvider('none');
  };

  // Handle import from Page Archive
  const handleImportFromArchive = async (urls: string[]) => {
    setShowArchiveImporter(false);
    if (urls.length === 0) return;

    // Set up the URL list and populate parsedUrls
    const normalizedUrls = urls.map((u) => (u.startsWith('http') ? u : `https://${u}`));
    setParsedUrls({
      urls: normalizedUrls,
      totalUrls: normalizedUrls.length,
      uniqueDomains: getUniqueDomains(normalizedUrls),
    });
  };

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
            <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
            <p className="text-sm text-neutral-500">
              {clientName ? `Adding for ${clientName}` : 'Select a client first'}
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
            onClick={() => {
              setMode('single');
              resetBulkState();
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Single URL
          </Button>
          <Button
            variant={mode === 'bulk' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setMode('bulk');
              resetBulkState();
            }}
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
              <p className="text-neutral-500">Select a client to start</p>
            </div>
          ) : mode === 'single' ? (
            /* Single URL Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {singleUrlLabel}
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com/page"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && processSingleUrl()}
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-neutral-500">
                  URL will be processed and saved
                </p>
              </div>

              <Button
                onClick={processSingleUrl}
                disabled={loading || !url}
                className="w-full"
              >
                {loading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {singleButtonLabel}
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
              {!batchStatus && (
                <>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={bulkMode === 'sitemap' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setBulkMode('sitemap');
                        setParsedUrls(null);
                        setParseError(null);
                      }}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      From Sitemap
                    </Button>
                    <Button
                      variant={bulkMode === 'urls' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setBulkMode('urls');
                        setParsedUrls(null);
                        setParseError(null);
                      }}
                    >
                      <List className="mr-2 h-4 w-4" />
                      URL List
                    </Button>
                    {enablePageArchive && checkExistingUrls && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowArchiveImporter(true)}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        From Library
                      </Button>
                    )}
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
                        onChange={(e) => {
                          setSitemapUrl(e.target.value);
                          setParsedUrls(null);
                        }}
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
                        onChange={(e) => {
                          setUrlList(e.target.value);
                          setParsedUrls(null);
                        }}
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
                            {parsedUrls.totalUrls} URLs ready to process
                          </span>
                        </div>

                        {parsedUrls.uniqueDomains && parsedUrls.uniqueDomains.length > 0 && (
                          <div className="text-xs text-blue-700 mb-3">
                            <span className="font-medium">{parsedUrls.uniqueDomains.length} unique domain{parsedUrls.uniqueDomains.length !== 1 ? 's' : ''}</span>
                            {parsedUrls.uniqueDomains.length <= 3 && (
                              <span className="ml-1">
                                ({parsedUrls.uniqueDomains.join(', ')})
                              </span>
                            )}
                          </div>
                        )}

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

                        {/* Cookie consent config (only for Page Library) */}
                        {enableCookieConfig && parsedUrls.uniqueDomains && parsedUrls.uniqueDomains.length > 0 && (
                          <div className="border-t border-blue-200 pt-3 mt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Cookie className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800">Cookie Consent Handling</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={cookieProvider}
                                onChange={(e) => setCookieProvider(e.target.value as CookieConsentProvider)}
                                className="flex-1 px-3 py-2 border border-blue-200 rounded-md text-sm bg-white"
                              >
                                <option value="none">No cookie handling</option>
                                <option value="cookiebot">Cookiebot (auto-dismiss)</option>
                              </select>
                            </div>
                            {cookieProvider !== 'none' && (
                              <p className="text-xs text-blue-600 mt-2">
                                Will configure {cookieProvider} for {parsedUrls.uniqueDomains.length} domain{parsedUrls.uniqueDomains.length !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={startBatchProcessing}
                            disabled={parseLoading || configuringCookies}
                            className="flex-1"
                          >
                            {configuringCookies ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Configuring...
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 h-4 w-4" />
                                {bulkButtonLabel} {parsedUrls.totalUrls} URL{parsedUrls.totalUrls !== 1 ? 's' : ''}
                              </>
                            )}
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
                        {batchStatus.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                        )}
                        <span className="font-medium text-blue-800">
                          {batchStatus.status === 'completed' ? 'Complete!' : processingLabel}
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
                    {batchStatus.currentUrl && batchStatus.status !== 'completed' && (
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

                    {batchStatus.status !== 'completed' && (
                      <>
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
                          Cancel
                        </Button>
                      </>
                    )}

                    {batchStatus.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          resetBulkState();
                        }}
                        className="w-full"
                      >
                        <Search className="mr-2 h-4 w-4" />
                        Add More URLs
                      </Button>
                    )}
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
            </div>
          )}
        </div>
      </div>

      {/* Page Archive Importer Modal */}
      {enablePageArchive && checkExistingUrls && (
        <PageArchiveImporter
          clientId={clientId || ''}
          isOpen={showArchiveImporter}
          onClose={() => setShowArchiveImporter(false)}
          onImport={handleImportFromArchive}
          checkExistingUrls={checkExistingUrls}
          toolName={toolName}
        />
      )}
    </>
  );
}
