'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Search,
  RefreshCw,
  AlertCircle,
  Archive,
  Check,
  CheckCircle,
} from 'lucide-react';
import { Button, Input, Badge } from '@tds/ui';

interface ArchivedUrl {
  url: string;
  urlHash: string;
  latestFetchedAt: string;
  snapshotCount: number;
}

interface CheckUrlsResult {
  existing: string[];
  new: string[];
}

type ImportMode = 'new_only' | 'all' | 'manual';

interface PageArchiveImporterProps {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
  onImport: (urls: string[]) => void;
  checkExistingUrls: (urls: string[]) => Promise<CheckUrlsResult>;
  toolName?: string; // For display purposes, e.g., "Meta Tag Analyser"
}

export function PageArchiveImporter({
  clientId,
  isOpen,
  onClose,
  onImport,
  checkExistingUrls,
  toolName = 'this tool',
}: PageArchiveImporterProps) {
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivedUrls, setArchivedUrls] = useState<ArchivedUrl[]>([]);
  const [existingUrls, setExistingUrls] = useState<Set<string>>(new Set());
  const [newUrls, setNewUrls] = useState<Set<string>>(new Set());
  const [importMode, setImportMode] = useState<ImportMode>('new_only');
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);

  // Fetch and check URLs function
  const fetchAndCheckUrls = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch archived URLs from Page Archive
      const res = await fetch(`/api/page-store/urls?clientId=${clientId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch archived URLs');
      }

      const urls: ArchivedUrl[] = data.urls || [];
      setArchivedUrls(urls);

      if (urls.length === 0) {
        setExistingUrls(new Set());
        setNewUrls(new Set());
        return;
      }

      // Check which URLs already have analysis results
      const urlStrings = urls.map((u) => u.url);
      const checkResult = await checkExistingUrls(urlStrings);

      setExistingUrls(new Set(checkResult.existing));
      setNewUrls(new Set(checkResult.new));

      // Default to selecting new URLs only
      setSelectedUrls(new Set(checkResult.new));
      setImportMode('new_only');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [clientId, checkExistingUrls]);

  // Fetch archived URLs and check existing on open
  useEffect(() => {
    if (isOpen && clientId) {
      fetchAndCheckUrls();
    }
  }, [isOpen, clientId, fetchAndCheckUrls]);

  // Update selected URLs when mode changes
  useEffect(() => {
    if (importMode === 'new_only') {
      setSelectedUrls(new Set(newUrls));
    } else if (importMode === 'all') {
      setSelectedUrls(new Set(archivedUrls.map((u) => u.url)));
    }
    // 'manual' mode keeps existing selection
  }, [importMode, newUrls, archivedUrls]);

  // Filter URLs by search query
  const filteredUrls = useMemo(() => {
    if (!searchQuery.trim()) {
      return archivedUrls;
    }
    const query = searchQuery.toLowerCase();
    return archivedUrls.filter((u) => u.url.toLowerCase().includes(query));
  }, [archivedUrls, searchQuery]);

  // Toggle URL selection (for manual mode)
  const toggleUrlSelection = (url: string) => {
    if (importMode !== 'manual') {
      setImportMode('manual');
    }
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  // Handle import
  const handleImport = () => {
    if (selectedUrls.size === 0) return;

    setImporting(true);
    onImport(Array.from(selectedUrls));
    // The parent component handles the rest; close the modal
    onClose();
    setImporting(false);
  };

  // Stats
  const stats = {
    total: archivedUrls.length,
    new: newUrls.size,
    existing: existingUrls.size,
    selected: selectedUrls.size,
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Archive className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Import from Page Archive
                </h2>
                <p className="text-sm text-neutral-500">
                  Select URLs to analyze in {toolName}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-3" />
                <p className="text-neutral-500">Loading archived URLs...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                <p className="text-red-600 font-medium">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAndCheckUrls}
                  className="mt-4"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : archivedUrls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Archive className="h-12 w-12 text-neutral-300 mb-4" />
                <p className="text-neutral-500 font-medium">
                  No archived URLs found
                </p>
                <p className="text-sm text-neutral-400 mt-1">
                  Archive some pages first using the Page Archive tool
                </p>
              </div>
            ) : (
              <>
                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-neutral-50 p-3 text-center">
                    <p className="text-xs text-neutral-500 uppercase tracking-wide">
                      Archived
                    </p>
                    <p className="text-2xl font-semibold text-neutral-900">
                      {stats.total}
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3 text-center">
                    <p className="text-xs text-green-600 uppercase tracking-wide">
                      New
                    </p>
                    <p className="text-2xl font-semibold text-green-600">
                      {stats.new}
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 text-center">
                    <p className="text-xs text-amber-600 uppercase tracking-wide">
                      Already Analyzed
                    </p>
                    <p className="text-2xl font-semibold text-amber-600">
                      {stats.existing}
                    </p>
                  </div>
                </div>

                {/* Import Mode Selection */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-neutral-700">
                    Import mode
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={importMode === 'new_only' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setImportMode('new_only')}
                      disabled={stats.new === 0}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      New only ({stats.new})
                    </Button>
                    <Button
                      variant={importMode === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setImportMode('all')}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      All (rescan) ({stats.total})
                    </Button>
                    <Button
                      variant={importMode === 'manual' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setImportMode('manual')}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Select manually
                    </Button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    type="text"
                    placeholder="Filter URLs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* URL List */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-neutral-50 px-3 py-2 border-b flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-700">
                      {filteredUrls.length === archivedUrls.length
                        ? `${archivedUrls.length} URLs`
                        : `${filteredUrls.length} of ${archivedUrls.length} URLs`}
                    </span>
                    {importMode === 'manual' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const allSelected = filteredUrls.every((u) =>
                            selectedUrls.has(u.url)
                          );
                          if (allSelected) {
                            // Deselect filtered URLs
                            setSelectedUrls((prev) => {
                              const next = new Set(prev);
                              filteredUrls.forEach((u) => next.delete(u.url));
                              return next;
                            });
                          } else {
                            // Select all filtered URLs
                            setSelectedUrls((prev) => {
                              const next = new Set(prev);
                              filteredUrls.forEach((u) => next.add(u.url));
                              return next;
                            });
                          }
                        }}
                      >
                        {filteredUrls.every((u) => selectedUrls.has(u.url))
                          ? 'Deselect all'
                          : 'Select all'}
                      </Button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y">
                    {filteredUrls.map((item) => {
                      const isExisting = existingUrls.has(item.url);
                      const isSelected = selectedUrls.has(item.url);

                      return (
                        <div
                          key={item.urlHash}
                          className={`px-3 py-2 flex items-center gap-3 text-sm cursor-pointer hover:bg-neutral-50 ${
                            isSelected ? 'bg-blue-50/50' : ''
                          }`}
                          onClick={() => toggleUrlSelection(item.url)}
                        >
                          {/* Checkbox */}
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-neutral-300'
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>

                          {/* URL */}
                          <span
                            className="flex-1 font-mono text-xs truncate"
                            title={item.url}
                          >
                            {item.url.replace(/^https?:\/\//, '')}
                          </span>

                          {/* Status Badge */}
                          {isExisting ? (
                            <Badge
                              variant="warning"
                              className="text-xs flex-shrink-0"
                            >
                              Analyzed
                            </Badge>
                          ) : (
                            <Badge
                              variant="success"
                              className="text-xs flex-shrink-0"
                            >
                              New
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!loading && !error && archivedUrls.length > 0 && (
            <div className="p-4 border-t bg-neutral-50 flex items-center justify-between">
              <p className="text-sm text-neutral-600">
                {stats.selected} URL{stats.selected !== 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={stats.selected === 0 || importing}
                >
                  {importing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Archive className="mr-2 h-4 w-4" />
                      Import {stats.selected} URL
                      {stats.selected !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
