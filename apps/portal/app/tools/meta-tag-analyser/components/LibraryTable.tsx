'use client';

import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  RefreshCw,
  Download,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  History,
  RotateCcw,
  Plus,
  Square,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Input,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@tds/ui';
import { MetadataViewer } from './MetadataViewer';
import { StaleIndicator } from './StaleIndicator';
import type { SavedAnalysis, MetadataSnapshot } from './types';

// Helper to check if an analysis is stale (page updated since analysis)
function isAnalysisStale(analysis: SavedAnalysis): boolean {
  return !!(
    analysis.analyzedSnapshotId &&
    analysis.currentSnapshotId &&
    analysis.analyzedSnapshotId !== analysis.currentSnapshotId
  );
}

interface LibraryTableProps {
  analyses: SavedAnalysis[];
  isLoading: boolean;
  clientId: string | null;
  clientName: string;
  onRescan: (id: string, includeScreenshots: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onExport: (format: 'csv' | 'json') => void;
  onAddUrls: () => void;
}

export function LibraryTable({
  analyses,
  isLoading,
  clientId,
  clientName: _clientName,
  onRescan,
  onDelete,
  onBulkDelete,
  onExport,
  onAddUrls,
}: LibraryTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedHistories, setExpandedHistories] = useState<Set<string>>(new Set());
  const [expandedSnapshots, setExpandedSnapshots] = useState<Set<string>>(new Set());
  const [rescanning, setRescanning] = useState<Set<string>>(new Set());
  const [scoreFilter, setScoreFilter] = useState<'all' | 'good' | 'warning' | 'error' | 'stale'>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkRescanning, setBulkRescanning] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  // Rescan confirmation dialog state
  const [showRescanDialog, setShowRescanDialog] = useState(false);
  const [rescanTargetIds, setRescanTargetIds] = useState<string[]>([]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleRowSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredAnalyses.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredAnalyses.map(a => a._id)));
    }
  };

  const toggleSnapshotExpand = (snapshotKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSnapshots(prev => {
      const next = new Set(prev);
      if (next.has(snapshotKey)) {
        next.delete(snapshotKey);
      } else {
        next.add(snapshotKey);
      }
      return next;
    });
  };

  // Opens the rescan confirmation dialog for a single page
  const handleRescan = (id: string) => {
    setRescanTargetIds([id]);
    setShowRescanDialog(true);
  };

  // Opens the rescan confirmation dialog for selected pages
  const handleRescanSelected = () => {
    if (selectedRows.size === 0) return;
    setRescanTargetIds(Array.from(selectedRows));
    setShowRescanDialog(true);
  };

  // Opens the rescan confirmation dialog for all filtered pages
  const handleRescanAll = () => {
    if (filteredAnalyses.length === 0) return;
    setRescanTargetIds(filteredAnalyses.map(a => a._id));
    setShowRescanDialog(true);
  };

  // Execute the actual rescan after user confirms
  const handleRescanConfirm = async (includeScreenshots: boolean) => {
    setShowRescanDialog(false);
    const ids = rescanTargetIds;

    if (ids.length === 0) return;

    setBulkRescanning(true);
    setRescanning(new Set(ids));

    // Rescan sequentially to avoid overwhelming the server
    for (const id of ids) {
      await onRescan(id, includeScreenshots);
      setRescanning(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }

    setBulkRescanning(false);
    setSelectedRows(new Set());
    setRescanTargetIds([]);
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0 || !onBulkDelete) return;

    setBulkDeleting(true);
    try {
      await onBulkDelete(Array.from(selectedRows));
      setSelectedRows(new Set());
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setBulkDeleting(false);
    }
  };

  // Count stale analyses
  const staleCount = analyses.filter(isAnalysisStale).length;

  // Filter and search
  const filteredAnalyses = analyses.filter(a => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      a.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.title?.toLowerCase().includes(searchQuery.toLowerCase());

    // Score filter
    let matchesScore = true;
    if (scoreFilter === 'good') matchesScore = a.score >= 80;
    else if (scoreFilter === 'warning') matchesScore = a.score >= 50 && a.score < 80;
    else if (scoreFilter === 'error') matchesScore = a.score < 50;
    else if (scoreFilter === 'stale') matchesScore = isAnalysisStale(a);

    return matchesSearch && matchesScore;
  });

  const allSelected = filteredAnalyses.length > 0 && selectedRows.size === filteredAnalyses.length;
  const someSelected = selectedRows.size > 0 && selectedRows.size < filteredAnalyses.length;

  // Empty state when no client selected
  if (!clientId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileText className="h-16 w-16 text-neutral-200 mb-4" />
          <p className="text-lg font-medium text-neutral-600">Select a client to view URLs</p>
          <p className="text-sm text-neutral-400 mt-1">Choose a client from the sidebar to get started</p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-neutral-300" />
        </CardContent>
      </Card>
    );
  }

  // Empty state for client with no URLs
  if (analyses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-neutral-400" />
          </div>
          <p className="text-lg font-medium text-neutral-700">No URLs scanned yet</p>
          <p className="text-sm text-neutral-500 mt-1 mb-6 text-center max-w-sm">
            Start by scanning your first URL. Results will be saved here automatically.
          </p>
          <Button onClick={onAddUrls}>
            <Plus className="mr-2 h-4 w-4" />
            Add URLs
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 items-center w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search URLs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Score Filter */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <button
              onClick={() => setScoreFilter('all')}
              className={`px-2 py-1 text-xs rounded ${scoreFilter === 'all' ? 'bg-neutral-200 font-medium' : 'hover:bg-neutral-100'}`}
            >
              All
            </button>
            <button
              onClick={() => setScoreFilter('good')}
              className={`px-2 py-1 text-xs rounded ${scoreFilter === 'good' ? 'bg-green-100 text-green-700 font-medium' : 'hover:bg-neutral-100'}`}
            >
              Good
            </button>
            <button
              onClick={() => setScoreFilter('warning')}
              className={`px-2 py-1 text-xs rounded ${scoreFilter === 'warning' ? 'bg-amber-100 text-amber-700 font-medium' : 'hover:bg-neutral-100'}`}
            >
              Warning
            </button>
            <button
              onClick={() => setScoreFilter('error')}
              className={`px-2 py-1 text-xs rounded ${scoreFilter === 'error' ? 'bg-red-100 text-red-700 font-medium' : 'hover:bg-neutral-100'}`}
            >
              Error
            </button>
            {staleCount > 0 && (
              <button
                onClick={() => setScoreFilter('stale')}
                className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${scoreFilter === 'stale' ? 'bg-orange-100 text-orange-700 font-medium' : 'hover:bg-neutral-100'}`}
              >
                <AlertTriangle className="h-3 w-3" />
                Stale ({staleCount})
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {/* Bulk Rescan Buttons */}
          {selectedRows.size > 0 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRescanSelected}
                disabled={bulkRescanning || bulkDeleting}
              >
                {bulkRescanning ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Rescan {selectedRows.size} Selected
              </Button>
              {onBulkDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={bulkRescanning || bulkDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedRows.size} Selected
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRescanAll}
              disabled={bulkRescanning || filteredAnalyses.length === 0}
            >
              {bulkRescanning ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Rescan All
            </Button>
          )}

          {/* Export Buttons */}
          <Button variant="outline" size="sm" onClick={() => onExport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport('json')}>
            <Download className="mr-2 h-4 w-4" />
            JSON
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-neutral-500">
        {filteredAnalyses.length} of {analyses.length} URLs
        {searchQuery && ` matching "${searchQuery}"`}
        {selectedRows.size > 0 && ` (${selectedRows.size} selected)`}
      </p>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 hover:bg-neutral-100 rounded"
                    title={allSelected ? 'Deselect all' : 'Select all'}
                  >
                    {allSelected ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : someSelected ? (
                      <div className="h-4 w-4 border-2 border-blue-600 rounded bg-blue-600/20" />
                    ) : (
                      <Square className="h-4 w-4 text-neutral-400" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-8"></TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-20">Score</TableHead>
                <TableHead className="w-20">Scans</TableHead>
                <TableHead className="w-28">Last Scanned</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnalyses.map((analysis) => (
                <React.Fragment key={analysis._id}>
                  <TableRow
                    className={`cursor-pointer hover:bg-neutral-50 ${analysis.isNew ? 'animate-highlight' : ''} ${selectedRows.has(analysis._id) ? 'bg-blue-50/50' : ''}`}
                    onClick={() => toggleRowExpand(analysis._id)}
                  >
                    <TableCell onClick={(e) => toggleRowSelection(analysis._id, e)}>
                      <div className="p-1">
                        {selectedRows.has(analysis._id) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4 text-neutral-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {expandedRows.has(analysis._id) ? (
                        <ChevronUp className="h-4 w-4 text-neutral-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-neutral-400" />
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span
                        className="font-mono text-xs text-neutral-700 truncate block"
                        title={analysis.url}
                      >
                        {analysis.url.replace(/^https?:\/\//, '').slice(0, 40)}
                        {analysis.url.length > 48 && '...'}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm" title={analysis.title}>
                      {analysis.title || <span className="text-neutral-400 italic">No title</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getScoreColor(analysis.score)}`}>
                          {analysis.score}%
                        </span>
                        {isAnalysisStale(analysis) && (
                          <StaleIndicator compact showRescanButton={false} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-neutral-500 text-sm">
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
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(analysis.url, '_blank')}
                          title="Open URL"
                        >
                          <ExternalLink className="h-4 w-4 text-neutral-400 hover:text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRescan(analysis._id)}
                          disabled={rescanning.has(analysis._id)}
                          title="Rescan URL"
                        >
                          {rescanning.has(analysis._id) ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                          ) : (
                            <RotateCcw className="h-4 w-4 text-neutral-400 hover:text-blue-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(analysis._id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-neutral-400 hover:text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row Details */}
                  {expandedRows.has(analysis._id) && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-neutral-50/50 p-0">
                        <div className="p-4 space-y-4">
                          {/* URL Header with Open Link */}
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <a
                              href={analysis.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-sm text-blue-600 hover:underline flex items-center gap-2"
                            >
                              {analysis.url}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>

                          {/* Use MetadataViewer for current analysis */}
                          <MetadataViewer
                            data={analysis}
                            url={analysis.url}
                            showIssues={true}
                          />

                          {/* Scan History */}
                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-neutral-700">Scan History</h4>
                              {analysis.scanHistory && analysis.scanHistory.length > 3 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedHistories(prev => {
                                      const next = new Set(prev);
                                      if (next.has(analysis._id)) {
                                        next.delete(analysis._id);
                                      } else {
                                        next.add(analysis._id);
                                      }
                                      return next;
                                    });
                                  }}
                                >
                                  {expandedHistories.has(analysis._id) ? 'Show less' : `Show all ${analysis.scanHistory.length}`}
                                </Button>
                              )}
                            </div>

                            <div className="space-y-2">
                              {/* First Analyzed */}
                              <div className="rounded border bg-white p-2 text-xs flex items-center justify-between">
                                <span className="text-neutral-500">First analyzed</span>
                                <span>
                                  {new Date(analysis.analyzedAt).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                  {analysis.analyzedBy && ` by ${analysis.analyzedBy.name}`}
                                </span>
                              </div>

                              {/* History Entries */}
                              {analysis.scanHistory && analysis.scanHistory.length > 0 && (
                                <div className="relative pl-4">
                                  <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-neutral-200" />
                                  <div className="space-y-2">
                                    {(expandedHistories.has(analysis._id)
                                      ? [...analysis.scanHistory].reverse()
                                      : analysis.scanHistory.slice(-3).reverse()
                                    ).map((scan, idx) => {
                                      const snapshotKey = `${analysis._id}-${idx}`;
                                      const hasSnapshot = scan.snapshot && Object.keys(scan.snapshot).length > 0;

                                      return (
                                        <div key={idx} className="relative">
                                          <div className={`absolute -left-2.5 top-2 w-2 h-2 rounded-full ${
                                            scan.changesDetected ? 'bg-amber-500' : 'bg-neutral-300'
                                          }`} />
                                          <div className="rounded border bg-white overflow-hidden">
                                            <div
                                              className={`p-2 text-xs ${hasSnapshot ? 'cursor-pointer hover:bg-neutral-50' : ''}`}
                                              onClick={hasSnapshot ? (e) => toggleSnapshotExpand(snapshotKey, e) : undefined}
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  {hasSnapshot && (
                                                    expandedSnapshots.has(snapshotKey) ? (
                                                      <ChevronUp className="h-3 w-3 text-neutral-400" />
                                                    ) : (
                                                      <ChevronDown className="h-3 w-3 text-neutral-400" />
                                                    )
                                                  )}
                                                  <Clock className="h-3 w-3 text-neutral-400" />
                                                  <span>
                                                    {new Date(scan.scannedAt).toLocaleDateString('en-GB', {
                                                      day: 'numeric',
                                                      month: 'short',
                                                      year: 'numeric',
                                                    })}
                                                  </span>
                                                  <span className="text-neutral-400">
                                                    {new Date(scan.scannedAt).toLocaleTimeString('en-GB', {
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                    })}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className={`rounded px-1.5 py-0.5 font-medium ${getScoreColor(scan.score)}`}>
                                                    {scan.score}%
                                                  </span>
                                                  {scan.changesDetected && (
                                                    <Badge variant="warning" className="text-[10px]">Changed</Badge>
                                                  )}
                                                </div>
                                              </div>
                                              {scan.scannedBy && (
                                                <div className="flex items-center gap-1 mt-1 text-neutral-500 pl-5">
                                                  <User className="h-3 w-3" />
                                                  <span>{scan.scannedBy.name}</span>
                                                </div>
                                              )}
                                            </div>

                                            {/* Expanded Snapshot View - layout matches current analysis (two columns) */}
                                            {expandedSnapshots.has(snapshotKey) && hasSnapshot && (
                                              <div className="border-t bg-neutral-50/50 p-3">
                                                <MetadataViewer
                                                  data={scan.snapshot as MetadataSnapshot}
                                                  url={analysis.url}
                                                  showIssues={true}
                                                  compareWith={analysis}
                                                />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
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

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete URLs
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedRows.size} URL{selectedRows.size !== 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm mb-4">
            <strong>Warning:</strong> This will permanently delete:
            <ul className="list-disc ml-5 mt-1">
              <li>{selectedRows.size} saved URL{selectedRows.size !== 1 ? 's' : ''}</li>
              <li>All scan history for these URLs</li>
              <li>All metadata snapshots</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={bulkDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete URLs
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rescan Confirmation Modal */}
      <Dialog open={showRescanDialog} onOpenChange={setShowRescanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              {rescanTargetIds.length > 1
                ? `Rescan ${rescanTargetIds.length} Pages`
                : 'Rescan Page'}
            </DialogTitle>
            <DialogDescription>
              Include screenshots in the rescan?
              <span className="text-muted-foreground block text-sm mt-1">
                Skipping screenshots is faster and uses fewer credits
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRescanDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleRescanConfirm(true)}
            >
              Full Rescan
            </Button>
            <Button
              onClick={() => handleRescanConfirm(false)}
            >
              Quick Rescan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
