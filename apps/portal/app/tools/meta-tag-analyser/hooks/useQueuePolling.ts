'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface QueueStatus {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  permanentlyFailed: number;
  remainingToProcess: number;
  failedUrls: Array<{ url: string; error: string; retryCount: number; batchId: string }>;
  activeBatches: string[];
  hasQueuedUrls: boolean;
}

interface ProcessResult {
  processed: number;
  remaining: number;
  completed: Array<{ url: string; score: number }>;
  failed: Array<{ url: string; error: string }>;
}

interface UseQueuePollingOptions {
  clientId: string | null;
  onProgress?: (completed: number, total: number) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  pollingInterval?: number;
}

interface UseQueuePollingReturn {
  status: QueueStatus | null;
  isPolling: boolean;
  isPaused: boolean;
  isLoading: boolean;
  startPolling: () => void;
  stopPolling: () => void;
  pausePolling: () => void;
  resumePolling: () => void;
  cancelQueue: (batchId?: string) => Promise<void>;
  refreshStatus: () => Promise<void>;
  queueUrls: (urls: string[]) => Promise<{ queued: number; batchId: string }>;
  totalProcessed: number;
  totalQueued: number;
}

export function useQueuePolling({
  clientId,
  onProgress,
  onComplete,
  onError,
  pollingInterval = 10000,
}: UseQueuePollingOptions): UseQueuePollingReturn {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [totalQueued, setTotalQueued] = useState(0);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Fetch current queue status
  const fetchStatus = useCallback(async (): Promise<QueueStatus | null> => {
    if (!clientId) return null;

    try {
      const res = await fetch(`/api/tools/meta-tag-analyser/queue/status?clientId=${clientId}`);
      if (!res.ok) throw new Error('Failed to fetch status');
      return await res.json();
    } catch (error) {
      console.error('Error fetching queue status:', error);
      return null;
    }
  }, [clientId]);

  // Process next batch of URLs
  const processNextBatch = useCallback(async (): Promise<ProcessResult | null> => {
    if (!clientId) return null;

    try {
      const res = await fetch('/api/tools/meta-tag-analyser/queue/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      if (!res.ok) throw new Error('Failed to process queue');
      return await res.json();
    } catch (error) {
      console.error('Error processing queue:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to process queue');
      return null;
    }
  }, [clientId, onError]);

  // Main polling loop
  const poll = useCallback(async () => {
    if (!mountedRef.current || isPaused || !clientId) return;

    setIsLoading(true);

    // Process next batch
    const result = await processNextBatch();

    if (!mountedRef.current) return;

    if (result) {
      setTotalProcessed(prev => prev + result.completed.length);

      // Fetch updated status
      const newStatus = await fetchStatus();
      if (!mountedRef.current) return;

      if (newStatus) {
        setStatus(newStatus);

        // Calculate progress
        const total = totalQueued || (newStatus.completed + newStatus.remainingToProcess + newStatus.permanentlyFailed);
        const completed = newStatus.completed;
        onProgress?.(completed, total);

        // Check if done
        if (newStatus.remainingToProcess === 0 && newStatus.processing === 0) {
          setIsPolling(false);
          onComplete?.();
        }
      }
    }

    setIsLoading(false);
  }, [clientId, isPaused, processNextBatch, fetchStatus, onProgress, onComplete, totalQueued]);

  // Start polling
  const startPolling = useCallback(() => {
    if (!clientId || isPolling) return;

    setIsPolling(true);
    setIsPaused(false);
    setTotalProcessed(0);

    // Initial poll
    poll();

    // Set up interval
    pollingRef.current = setInterval(poll, pollingInterval);
  }, [clientId, isPolling, poll, pollingInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
    setIsPaused(false);
  }, []);

  // Pause polling
  const pausePolling = useCallback(() => {
    setIsPaused(true);
  }, []);

  // Resume polling
  const resumePolling = useCallback(() => {
    setIsPaused(false);
    if (isPolling) {
      poll();
    }
  }, [isPolling, poll]);

  // Cancel queue
  const cancelQueue = useCallback(async (batchId?: string) => {
    if (!clientId) return;

    try {
      const params = new URLSearchParams();
      if (batchId) {
        params.set('batchId', batchId);
      } else {
        params.set('clientId', clientId);
      }

      const res = await fetch(`/api/tools/meta-tag-analyser/queue?${params.toString()}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to cancel queue');

      stopPolling();
      await refreshStatus();
    } catch (error) {
      console.error('Error cancelling queue:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to cancel queue');
    }
  }, [clientId, stopPolling, onError]);

  // Refresh status without processing
  const refreshStatus = useCallback(async () => {
    const newStatus = await fetchStatus();
    if (newStatus && mountedRef.current) {
      setStatus(newStatus);
    }
  }, [fetchStatus]);

  // Queue URLs
  const queueUrls = useCallback(async (urls: string[]): Promise<{ queued: number; batchId: string }> => {
    if (!clientId) throw new Error('No client selected');

    const res = await fetch('/api/tools/meta-tag-analyser/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, urls }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to queue URLs');
    }

    const result = await res.json();
    setTotalQueued(prev => prev + result.queued);
    return result;
  }, [clientId]);

  // Check for pending URLs on mount
  useEffect(() => {
    if (clientId) {
      refreshStatus();
    }
  }, [clientId, refreshStatus]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Resume polling when unpaused
  useEffect(() => {
    if (isPolling && !isPaused) {
      pollingRef.current = setInterval(poll, pollingInterval);
    } else if (pollingRef.current && isPaused) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isPolling, isPaused, poll, pollingInterval]);

  return {
    status,
    isPolling,
    isPaused,
    isLoading,
    startPolling,
    stopPolling,
    pausePolling,
    resumePolling,
    cancelQueue,
    refreshStatus,
    queueUrls,
    totalProcessed,
    totalQueued,
  };
}
