'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Link,
  Map,
} from 'lucide-react';
import { Badge } from '@tds/ui';

interface SucceededUrl {
  url: string;
  result?: unknown;
  processedAt: string;
}

interface FailedUrl {
  url: string;
  error: string;
  processedAt: string;
}

interface Batch {
  _id: string;
  createdAt: string;
  completedAt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalUrls: number;
  processedCount: number;
  succeeded: SucceededUrl[];
  failed: FailedUrl[];
  source: 'sitemap' | 'url_list';
  sourceUrl?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
}

interface BatchHistoryTabProps {
  clientId: string | null;
}

export function BatchHistoryTab({ clientId }: BatchHistoryTabProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBatches = useCallback(async () => {
    if (!clientId) {
      setBatches([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/tools/ppc-page-analyser/batch?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch (error) {
      console.error('Failed to fetch batch history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const getSourceIcon = (source: Batch['source']) => {
    switch (source) {
      case 'sitemap':
        return <Map className="h-4 w-4" />;
      case 'url_list':
        return <FileText className="h-4 w-4" />;
      default:
        return <Link className="h-4 w-4" />;
    }
  };

  const getSourceLabel = (source: Batch['source']) => {
    switch (source) {
      case 'sitemap':
        return 'Sitemap scan';
      case 'url_list':
        return 'URL list';
      default:
        return source;
    }
  };

  const getStatusBadge = (status: Batch['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-neutral-50 text-neutral-700 border-neutral-200">
            {status}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!clientId) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-12">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
            <Clock className="h-6 w-6 text-neutral-400" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900">No client selected</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Select a client to view batch scan history
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-12">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
            <Clock className="h-6 w-6 text-neutral-400 animate-spin" />
          </div>
          <p className="text-sm text-neutral-500">Loading batch history...</p>
        </div>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-12">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
            <FileText className="h-6 w-6 text-neutral-400" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900">No batch scans yet</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Run a bulk scan from a sitemap or URL list to see history here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-neutral-900">
            Batch Scan History
          </h3>
          <span className="text-sm text-neutral-500">
            {batches.length} scan{batches.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="divide-y divide-neutral-100">
        {batches.map((batch) => {
          const succeededCount = batch.succeeded.length;
          const failedCount = batch.failed.length;
          const totalProcessed = succeededCount + failedCount;
          const successRate = totalProcessed > 0
            ? Math.round((succeededCount / totalProcessed) * 100)
            : 0;

          return (
            <div
              key={batch._id}
              className="px-4 py-4 hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-neutral-900">
                      {formatDate(batch.createdAt)}
                    </span>
                    {getStatusBadge(batch.status)}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-neutral-600">
                    <span className="flex items-center gap-1.5">
                      {getSourceIcon(batch.source)}
                      {getSourceLabel(batch.source)}
                    </span>
                    <span className="text-neutral-300">|</span>
                    <span>{totalProcessed} URLs</span>
                    <span className="text-neutral-300">|</span>
                    <span>{successRate}% success</span>
                  </div>

                  {batch.source === 'sitemap' && batch.sourceUrl && (
                    <p className="mt-1 text-xs text-neutral-400 font-mono truncate">
                      {batch.sourceUrl}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
