'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ExternalLink,
  RefreshCw,
  Download,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  History,
  RotateCcw,
  Plus,
  Square,
  CheckSquare,
  AlertTriangle,
  Eye,
  Sparkles,
} from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';
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
import type { SavedAnalysis } from './types';
import {
  getScoreBadgeColor,
  matchesScoreFilter,
  getDisplayScore,
  type ScoreCategory,
} from '../lib/score-utils';

interface LibraryTableProps {
  analyses: SavedAnalysis[];
  isLoading: boolean;
  clientId: string | null;
  clientName: string;
  onRescan: (id: string) => Promise<void>;
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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [rescanning, setRescanning] = useState<Set<string>>(new Set());
  const [scoreFilter, setScoreFilter] = useState<'all' | ScoreCategory>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [bulkRescanning, setBulkRescanning] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleViewDetails = (id: string) => {
    router.push(`/tools/ppc-page-analyser/${id}`);
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

  const handleRescan = async (id: string) => {
    setRescanning(prev => new Set(prev).add(id));
    await onRescan(id);
    setRescanning(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleBulkRescan = async (ids: string[]) => {
    if (ids.length === 0) return;

    setBulkRescanning(true);
    setRescanning(new Set(ids));

    for (const id of ids) {
      await onRescan(id);
      setRescanning(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }

    setBulkRescanning(false);
    setSelectedRows(new Set());
  };

  const handleRescanSelected = () => {
    handleBulkRescan(Array.from(selectedRows));
  };

  const handleRescanAll = () => {
    handleBulkRescan(filteredAnalyses.map(a => a._id));
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

  const filteredAnalyses = analyses.filter(a => {
    const matchesSearch = searchQuery === '' ||
      a.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.headline?.toLowerCase().includes(searchQuery.toLowerCase());

    const displayScore = getDisplayScore(a);
    const matchesScoreValue = matchesScoreFilter(displayScore, scoreFilter);

    return matchesSearch && matchesScoreValue;
  });

  const allSelected = filteredAnalyses.length > 0 && selectedRows.size === filteredAnalyses.length;
  const someSelected = selectedRows.size > 0 && selectedRows.size < filteredAnalyses.length;

  if (!clientId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileText className="h-16 w-16 text-neutral-200 mb-4" />
          <p className="text-lg font-medium text-neutral-600">Select a client to view landing pages</p>
          <p className="text-sm text-neutral-400 mt-1">Choose a client from the sidebar to get started</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-neutral-300" />
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-neutral-400" />
          </div>
          <p className="text-lg font-medium text-neutral-700">No landing pages analysed yet</p>
          <p className="text-sm text-neutral-500 mt-1 mb-6 text-center max-w-sm">
            Start by adding your first landing page URL. Results will be saved here automatically.
          </p>
          <Button onClick={onAddUrls}>
            <Plus className="mr-2 h-4 w-4" />
            Add Landing Pages
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
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

          <div className="flex items-center gap-1 border rounded-lg p-1">
            <button
              onClick={() => setScoreFilter('all')}
              className={`px-2 py-1 text-xs rounded ${scoreFilter === 'all' ? 'bg-neutral-200 font-medium' : 'hover:bg-neutral-100'}`}
            >
              All
            </button>
            <button
              onClick={() => setScoreFilter('good')}
              className={`px-2 py-1 text-xs rounded inline-flex items-center gap-1 ${scoreFilter === 'good' ? 'bg-green-100 text-green-700 font-medium' : 'hover:bg-neutral-100'}`}
            >
              Good
              <InfoTooltip tooltipKey="filterGood" iconOnly size="xs" asSpan />
            </button>
            <button
              onClick={() => setScoreFilter('warning')}
              className={`px-2 py-1 text-xs rounded inline-flex items-center gap-1 ${scoreFilter === 'warning' ? 'bg-amber-100 text-amber-700 font-medium' : 'hover:bg-neutral-100'}`}
            >
              Warning
              <InfoTooltip tooltipKey="filterWarning" iconOnly size="xs" asSpan />
            </button>
            <button
              onClick={() => setScoreFilter('error')}
              className={`px-2 py-1 text-xs rounded inline-flex items-center gap-1 ${scoreFilter === 'error' ? 'bg-red-100 text-red-700 font-medium' : 'hover:bg-neutral-100'}`}
            >
              Error
              <InfoTooltip tooltipKey="filterError" iconOnly size="xs" asSpan />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
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

      <p className="text-sm text-neutral-500">
        {filteredAnalyses.length} of {analyses.length} landing pages
        {searchQuery && ` matching "${searchQuery}"`}
        {selectedRows.size > 0 && ` (${selectedRows.size} selected)`}
      </p>

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
                <TableHead>
                  <span className="inline-flex items-center gap-1">
                    Headline
                    <InfoTooltip tooltipKey="tableHeadline" iconOnly size="xs" />
                  </span>
                </TableHead>
                <TableHead className="w-20">
                  <span className="inline-flex items-center gap-1">
                    Score
                    <InfoTooltip tooltipKey="tableScore" iconOnly size="xs" />
                  </span>
                </TableHead>
                <TableHead className="w-20">
                  <span className="inline-flex items-center gap-1">
                    Scans
                    <InfoTooltip tooltipKey="tableScans" iconOnly size="xs" />
                  </span>
                </TableHead>
                <TableHead className="w-28">
                  <span className="inline-flex items-center gap-1">
                    Last Scanned
                    <InfoTooltip tooltipKey="tableLastScanned" iconOnly size="xs" />
                  </span>
                </TableHead>
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
                    <TableCell className="max-w-xs truncate text-sm" title={analysis.headline}>
                      {analysis.headline || <span className="text-neutral-400 italic">No headline</span>}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const displayScore = getDisplayScore(analysis);
                        return (
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getScoreBadgeColor(displayScore)}`}>
                            {displayScore}%
                          </span>
                        );
                      })()}
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

                  {expandedRows.has(analysis._id) && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-neutral-50/50 p-0">
                        <div className="p-4 space-y-4">
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

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-neutral-700 mb-2">Headline</h4>
                              <p className="text-sm text-neutral-600">{analysis.headline || 'No headline detected'}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-neutral-700 mb-2">Subheadline</h4>
                              <p className="text-sm text-neutral-600">{analysis.subheadline || 'No subheadline detected'}</p>
                            </div>
                          </div>

                          {analysis.issues && analysis.issues.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-neutral-700 mb-2">Issues</h4>
                              <div className="space-y-1">
                                {analysis.issues.map((issue, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-sm">
                                    <Badge variant={issue.type === 'error' ? 'destructive' : issue.type === 'warning' ? 'warning' : 'success'}>
                                      {issue.type}
                                    </Badge>
                                    <span className="text-neutral-600">{issue.message}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* V2 Analysis indicator and View Details button */}
                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center gap-2">
                              {analysis.analysisV2 && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  AI Analysis
                                </Badge>
                              )}
                              {analysis.aiProvider && (
                                <span className="text-xs text-neutral-500">
                                  via {analysis.aiProvider === 'claude' ? 'Claude' : 'OpenAI'}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(analysis._id);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
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

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Landing Pages
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedRows.size} landing page{selectedRows.size !== 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm mb-4">
            <strong>Warning:</strong> This will permanently delete:
            <ul className="list-disc ml-5 mt-1">
              <li>{selectedRows.size} saved landing page{selectedRows.size !== 1 ? 's' : ''}</li>
              <li>All scan history for these pages</li>
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
                  Delete Landing Pages
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
