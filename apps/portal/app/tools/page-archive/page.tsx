'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@tds/ui';
import { Archive, RefreshCw, ExternalLink, Clock, Database, Trash2, AlertTriangle } from 'lucide-react';

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

export default function PageArchivePage() {
  const [clients, setClients] = useState<Array<{ _id: string; name: string }>>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [urls, setUrls] = useState<PageStoreEntry[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUrlHashes, setSelectedUrlHashes] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch clients on mount
  useEffect(() => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => {
        setClients(data);
        if (data.length > 0) {
          setSelectedClientId(data[0]._id);
        }
      });
  }, []);

  // Fetch URLs when client changes
  useEffect(() => {
    if (!selectedClientId) return;

    setLoading(true);
    fetch(`/api/page-store/urls?clientId=${selectedClientId}`)
      .then(res => res.json())
      .then(data => {
        setUrls(data.urls || []);
        setSelectedUrl('');
        setSnapshots([]);
        setSelectedUrlHashes(new Set());
      })
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  // Fetch snapshots when URL changes
  useEffect(() => {
    if (!selectedUrl || !selectedClientId) return;

    setLoading(true);
    fetch(`/api/page-store/snapshots?url=${encodeURIComponent(selectedUrl)}&clientId=${selectedClientId}`)
      .then(res => res.json())
      .then(data => {
        setSnapshots(data.snapshots || []);
      })
      .finally(() => setLoading(false));
  }, [selectedUrl, selectedClientId]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const toggleUrlSelection = (urlHash: string) => {
    setSelectedUrlHashes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(urlHash)) {
        newSet.delete(urlHash);
      } else {
        newSet.add(urlHash);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUrlHashes.size === urls.length) {
      setSelectedUrlHashes(new Set());
    } else {
      setSelectedUrlHashes(new Set(urls.map(u => u.urlHash)));
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
      setSelectedUrl('');
      setSnapshots([]);
      setSelectedUrlHashes(new Set());
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete URLs. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Archive className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Page Archive</h1>
          <p className="text-muted-foreground">
            View and manage stored page snapshots
          </p>
        </div>
      </div>

      {/* Client Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <label className="block text-sm font-medium mb-2">Select Client</label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {clients.map(client => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* URL List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Stored URLs ({urls.length})
              </CardTitle>
              {urls.length > 0 && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={urls.length > 0 && selectedUrlHashes.size === urls.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                    Select All
                  </label>
                  {selectedUrlHashes.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete ({selectedUrlHashes.size})
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading && !urls.length ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : urls.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No stored pages for this client
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {urls.map(entry => (
                  <div
                    key={entry._id}
                    className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                      selectedUrl === entry.url
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUrlHashes.has(entry.urlHash)}
                      onChange={() => toggleUrlSelection(entry.urlHash)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 rounded border-gray-300"
                    />
                    <button
                      onClick={() => setSelectedUrl(entry.url)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm truncate flex-1">
                          {entry.url}
                        </span>
                        <ExternalLink className="h-4 w-4 ml-2 flex-shrink-0" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {entry.snapshotCount} snapshots · Last: {formatDate(entry.latestFetchedAt)}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Snapshot History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Snapshot History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedUrl ? (
              <p className="text-muted-foreground text-center py-8">
                Select a URL to view snapshots
              </p>
            ) : snapshots.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No snapshots found
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {snapshots.map(snapshot => (
                  <div
                    key={snapshot._id}
                    className="p-3 rounded-md border"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {formatDate(snapshot.fetchedAt)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        snapshot.httpStatus === 200
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {snapshot.httpStatus}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {snapshot.triggeredByTool} · {formatBytes(snapshot.contentSize)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm">
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
    </div>
  );
}
