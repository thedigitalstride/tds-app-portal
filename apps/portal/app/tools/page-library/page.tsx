'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@tds/ui';
import {
  Archive,
  RefreshCw,
  ExternalLink,
  Clock,
  Database,
  Trash2,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  Square,
  CheckSquare,
  History,
  Plus,
} from 'lucide-react';
import { useClient } from '@/components/client-context';
import { AddUrlsPanel } from './components/AddUrlsPanel';

interface PageStoreEntry {
  _id: string;
  url: string;
  urlHash: string;
  latestFetchedAt: string;
  snapshotCount: number;
}

interface Snapshot {
  _id: string;
  url: string;
  fetchedAt: string;
  triggeredByTool: string;
  contentSize: number;
  httpStatus: number;
}

export default function PageLibraryPage() {
  const { selectedClientId, selectedClient } = useClient();
  const [urls, setUrls] = useState<PageStoreEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Table state
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedUrlHashes, setSelectedUrlHashes] = useState<Set<string>>(new Set());

  // Snapshot data for expanded rows
  const [snapshotsCache, setSnapshotsCache] = useState<Record<string, Snapshot[]>>({});
  const [loadingSnapshots, setLoadingSnapshots] = useState<Set<string>>(new Set());

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add URLs panel
  const [showAddUrlsPanel, setShowAddUrlsPanel] = useState(false);

  // Fetch URLs function
  const fetchUrls = async () => {
    if (!selectedClientId) return;

    setLoading(true);
    setExpandedRows(new Set());
    setSelectedUrlHashes(new Set());
    setSnapshotsCache({});

    try {
      const res = await fetch(`/api/page-store/urls?clientId=${selectedClientId}`);
      const data = await res.json();
      setUrls(data.urls || []);
    } finally {
      setLoading(false);
    }
  };

  // Fetch URLs when client changes
  useEffect(() => {
    fetchUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  // Fetch snapshots when a row is expanded
  const fetchSnapshots = async (url: string, urlHash: string) => {
    if (snapshotsCache[urlHash]) return;

    setLoadingSnapshots(prev => new Set(prev).add(urlHash));

    try {
      const res = await fetch(`/api/page-store/snapshots?url=${encodeURIComponent(url)}&clientId=${selectedClientId}`);
      const data = await res.json();
      setSnapshotsCache(prev => ({ ...prev, [urlHash]: data.snapshots || [] }));
    } catch (error) {
      console.error('Failed to fetch snapshots:', error);
    } finally {
      setLoadingSnapshots(prev => {
        const next = new Set(prev);
        next.delete(urlHash);
        return next;
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleRowExpand = (entry: PageStoreEntry) => {
    const urlHash = entry.urlHash;
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(urlHash)) {
        next.delete(urlHash);
      } else {
        next.add(urlHash);
        // Fetch snapshots when expanding
        fetchSnapshots(entry.url, urlHash);
      }
      return next;
    });
  };

  const toggleRowSelection = (urlHash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUrlHashes(prev => {
      const next = new Set(prev);
      if (next.has(urlHash)) {
        next.delete(urlHash);
      } else {
        next.add(urlHash);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUrlHashes.size === filteredUrls.length) {
      setSelectedUrlHashes(new Set());
    } else {
      setSelectedUrlHashes(new Set(filteredUrls.map(u => u.urlHash)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedUrlHashes.size === 0) return;

    setDeleting(true);
    try {
      const response = await fetch('/api/page-store/urls', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          urlHashes: Array.from(selectedUrlHashes),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete URLs');
      }

      // Refresh the URL list
      const urlsResponse = await fetch(`/api/page-store/urls?clientId=${selectedClientId}`);
      const data = await urlsResponse.json();
      setUrls(data.urls || []);
      setExpandedRows(new Set());
      setSelectedUrlHashes(new Set());
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete URLs. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Filter URLs by search query
  const filteredUrls = urls.filter(entry =>
    searchQuery === '' || entry.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allSelected = filteredUrls.length > 0 && selectedUrlHashes.size === filteredUrls.length;
  const someSelected = selectedUrlHashes.size > 0 && selectedUrlHashes.size < filteredUrls.length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Archive className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-semibold text-neutral-900">Page Library</h1>
          </div>
          <p className="mt-1 text-neutral-500">
            {selectedClient ? (
              <>Manage page collection for <span className="font-medium text-neutral-700">{selectedClient.name}</span></>
            ) : (
              'Select a client from the sidebar to manage pages'
            )}
          </p>
        </div>
        {selectedClientId && (
          <Button onClick={() => setShowAddUrlsPanel(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add URLs
          </Button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-neutral-300" />
          </CardContent>
        </Card>
      )}

      {/* Empty State - No Client */}
      {!loading && !selectedClientId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Archive className="h-16 w-16 text-neutral-200 mb-4" />
            <p className="text-lg font-medium text-neutral-600">Select a client to view URLs</p>
            <p className="text-sm text-neutral-400 mt-1">Choose a client from the sidebar to get started</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State - No URLs */}
      {!loading && selectedClientId && urls.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
              <Database className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="text-lg font-medium text-neutral-700">No stored pages yet</p>
            <p className="text-sm text-neutral-500 mt-1 text-center max-w-sm">
              Add URLs to build your page library.
            </p>
            <Button className="mt-4" onClick={() => setShowAddUrlsPanel(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add URLs
            </Button>
          </CardContent>
        </Card>
      )}

      {/* URL Table */}
      {!loading && selectedClientId && urls.length > 0 && (
        <div className="space-y-4">
          {/* Search & Bulk Actions */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search URLs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Bulk Delete */}
            {selectedUrlHashes.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedUrlHashes.size} Selected
              </Button>
            )}
          </div>

          {/* Results count */}
          <p className="text-sm text-neutral-500">
            {filteredUrls.length} of {urls.length} URLs
            {searchQuery && ` matching "${searchQuery}"`}
            {selectedUrlHashes.size > 0 && ` (${selectedUrlHashes.size} selected)`}
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
                    <TableHead className="w-24">Snapshots</TableHead>
                    <TableHead className="w-32">Last Fetched</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUrls.map((entry) => (
                    <React.Fragment key={entry._id}>
                      <TableRow
                        className={`cursor-pointer hover:bg-neutral-50 ${selectedUrlHashes.has(entry.urlHash) ? 'bg-blue-50/50' : ''}`}
                        onClick={() => toggleRowExpand(entry)}
                      >
                        <TableCell onClick={(e) => toggleRowSelection(entry.urlHash, e)}>
                          <div className="p-1">
                            {selectedUrlHashes.has(entry.urlHash) ? (
                              <CheckSquare className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Square className="h-4 w-4 text-neutral-400" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {expandedRows.has(entry.urlHash) ? (
                            <ChevronUp className="h-4 w-4 text-neutral-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-neutral-400" />
                          )}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <span
                            className="font-mono text-xs text-neutral-700 truncate block"
                            title={entry.url}
                          >
                            {entry.url.replace(/^https?:\/\//, '').slice(0, 60)}
                            {entry.url.length > 68 && '...'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-neutral-500 text-sm">
                            <History className="h-3 w-3" />
                            {entry.snapshotCount}
                          </div>
                        </TableCell>
                        <TableCell className="text-neutral-500 text-xs">
                          {formatDate(entry.latestFetchedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(entry.url, '_blank')}
                              title="Open URL"
                            >
                              <ExternalLink className="h-4 w-4 text-neutral-400 hover:text-blue-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Row - Snapshot History */}
                      {expandedRows.has(entry.urlHash) && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-neutral-50/50 p-0">
                            <div className="p-4 space-y-4">
                              {/* URL Header with Open Link */}
                              <div className="flex items-center gap-2 pb-2 border-b">
                                <a
                                  href={entry.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-sm text-blue-600 hover:underline flex items-center gap-2"
                                >
                                  {entry.url}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>

                              {/* Snapshot History */}
                              <div>
                                <h4 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  Snapshot History
                                </h4>

                                {loadingSnapshots.has(entry.urlHash) ? (
                                  <div className="flex items-center gap-2 text-neutral-500 text-sm">
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Loading snapshots...
                                  </div>
                                ) : snapshotsCache[entry.urlHash]?.length === 0 ? (
                                  <p className="text-sm text-neutral-500">No snapshots found</p>
                                ) : (
                                  <div className="relative pl-4">
                                    <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-neutral-200" />
                                    <div className="space-y-2">
                                      {snapshotsCache[entry.urlHash]?.map((snapshot) => (
                                        <div key={snapshot._id} className="relative">
                                          <div className={`absolute -left-2.5 top-2 w-2 h-2 rounded-full ${
                                            snapshot.httpStatus === 200 ? 'bg-green-500' : 'bg-amber-500'
                                          }`} />
                                          <div className="rounded border bg-white p-3">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2 text-xs">
                                                <Clock className="h-3 w-3 text-neutral-400" />
                                                <span>{formatDateTime(snapshot.fetchedAt)}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                                  snapshot.httpStatus === 200
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                  {snapshot.httpStatus}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                                              <span className="flex items-center gap-1">
                                                <Database className="h-3 w-3" />
                                                {formatBytes(snapshot.contentSize)}
                                              </span>
                                              <span>
                                                via <span className="font-medium">{snapshot.triggeredByTool}</span>
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
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

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete URLs
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUrlHashes.size} URL{selectedUrlHashes.size !== 1 ? 's' : ''} and all their snapshots? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm mb-4">
            <strong>Warning:</strong> This will permanently delete:
            <ul className="list-disc ml-5 mt-1">
              <li>{selectedUrlHashes.size} stored URL{selectedUrlHashes.size !== 1 ? 's' : ''}</li>
              <li>All associated page snapshots</li>
              <li>All stored HTML content</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={deleting}
            >
              {deleting ? (
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

      {/* Add URLs Panel */}
      <AddUrlsPanel
        isOpen={showAddUrlsPanel}
        onClose={() => setShowAddUrlsPanel(false)}
        clientId={selectedClientId}
        clientName={selectedClient?.name || ''}
        onUrlsAdded={fetchUrls}
      />
    </div>
  );
}
