'use client';

import React, { useState } from 'react';
import {
  X,
  Search,
  List,
  MapPin,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Plus,
} from 'lucide-react';
import { Button, Input, Textarea } from '@tds/ui';

interface AddUrlsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
  clientName: string;
  onUrlsAdded: () => void;
}

const IMMEDIATE_ARCHIVE_LIMIT = 50;

export function AddUrlsPanel({
  isOpen,
  onClose,
  clientId,
  clientName,
  onUrlsAdded,
}: AddUrlsPanelProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [bulkMode, setBulkMode] = useState<'sitemap' | 'urls'>('sitemap');

  // Single URL state
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Bulk state
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [urlList, setUrlList] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
  } | null>(null);

  const archiveSingleUrl = async () => {
    if (!url || !clientId) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/page-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          clientId,
          toolId: 'page-library',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to archive URL');
      }

      setSuccess(data.wasCached ? 'URL already cached' : 'URL archived successfully');
      setUrl('');
      onUrlsAdded();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const archiveBulkUrls = async () => {
    if (!clientId) return;

    setBulkLoading(true);
    setBulkError(null);
    setBulkProgress(null);

    try {
      let urlsToArchive: string[] = [];

      if (bulkMode === 'sitemap') {
        // First fetch and parse the sitemap
        const sitemapRes = await fetch('/api/page-store/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'sitemap',
            sitemapUrl,
            clientId,
          }),
        });

        const sitemapData = await sitemapRes.json();

        if (!sitemapRes.ok) {
          throw new Error(sitemapData.error || 'Failed to parse sitemap');
        }

        setBulkProgress({
          total: sitemapData.total,
          processed: sitemapData.processed,
          succeeded: sitemapData.succeeded,
          failed: sitemapData.failed,
        });

        if (sitemapData.succeeded > 0) {
          setSuccess(`Archived ${sitemapData.succeeded} URLs from sitemap`);
          onUrlsAdded();
        }

        setBulkLoading(false);
        return;
      }

      // URL list mode
      urlsToArchive = urlList
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);

      if (urlsToArchive.length === 0) {
        throw new Error('No valid URLs provided');
      }

      // Archive via bulk endpoint
      const res = await fetch('/api/page-store/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'urls',
          urls: urlsToArchive,
          clientId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to archive URLs');
      }

      setBulkProgress({
        total: data.total,
        processed: data.processed,
        succeeded: data.succeeded,
        failed: data.failed,
      });

      if (data.succeeded > 0) {
        setSuccess(`Archived ${data.succeeded} of ${data.total} URLs`);
        setUrlList('');
        onUrlsAdded();
      }
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setBulkLoading(false);
    }
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
            <h2 className="text-lg font-semibold text-neutral-900">Add URLs</h2>
            <p className="text-sm text-neutral-500">
              {clientName ? `Adding pages for ${clientName}` : 'Select a client first'}
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
            <Plus className="mr-2 h-4 w-4" />
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
              <p className="text-neutral-500">Select a client to start adding URLs</p>
            </div>
          ) : mode === 'single' ? (
            /* Single URL Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  URL to archive
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com/page"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && archiveSingleUrl()}
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Page will be fetched and stored in the library
                </p>
              </div>

              <Button
                onClick={archiveSingleUrl}
                disabled={loading || !url}
                className="w-full"
              >
                {loading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add URL
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
                    URLs from the sitemap will be fetched and archived
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
                    {urlList.split('\n').filter(Boolean).length > IMMEDIATE_ARCHIVE_LIMIT && (
                      <span className="text-amber-600">
                        {' '}- First {IMMEDIATE_ARCHIVE_LIMIT} archived immediately, rest queued
                      </span>
                    )}
                  </p>
                </div>
              )}

              <Button
                onClick={archiveBulkUrls}
                disabled={bulkLoading || (bulkMode === 'sitemap' ? !sitemapUrl : !urlList.trim())}
                className="w-full"
              >
                {bulkLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Archive {bulkMode === 'sitemap' ? 'Sitemap' : 'URLs'}
                  </>
                )}
              </Button>

              {/* Progress */}
              {bulkProgress && (
                <div className="p-4 rounded-lg bg-neutral-50 space-y-2">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-neutral-500">Total</p>
                      <p className="text-lg font-semibold">{bulkProgress.total}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Processed</p>
                      <p className="text-lg font-semibold">{bulkProgress.processed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Succeeded</p>
                      <p className="text-lg font-semibold text-green-600">{bulkProgress.succeeded}</p>
                    </div>
                    <div>
                      <p className="text-xs text-red-600">Failed</p>
                      <p className="text-lg font-semibold text-red-600">{bulkProgress.failed}</p>
                    </div>
                  </div>
                </div>
              )}

              {bulkError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {bulkError}
                </div>
              )}

              {success && mode === 'bulk' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  {success}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
