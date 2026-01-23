'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@tds/ui';
import { Archive, RefreshCw, ExternalLink, Clock, Database } from 'lucide-react';

interface PageStoreEntry {
  _id: string;
  url: string;
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
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Stored URLs ({urls.length})
            </CardTitle>
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
                  <button
                    key={entry._id}
                    onClick={() => setSelectedUrl(entry.url)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      selectedUrl === entry.url
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
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
    </div>
  );
}
