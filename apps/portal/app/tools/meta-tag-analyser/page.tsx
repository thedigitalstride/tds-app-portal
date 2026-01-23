'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, RefreshCw, Pause, Play, Square } from 'lucide-react';
import { Button } from '@tds/ui';
import { useClient } from '@/components/client-context';
import { useToast } from '@/components/toast-context';
import { ScanPanel } from './components/ScanPanel';
import { StatsCards } from './components/StatsCards';
import { LibraryTable } from './components/LibraryTable';
import { useQueuePolling } from './hooks/useQueuePolling';
import type { SavedAnalysis } from './components/types';

export default function MetaTagAnalyserPage() {
  // Global client state from context
  const { clients, selectedClientId } = useClient();
  const { addToast, updateToast, removeToast } = useToast();

  // Keep a ref to selectedClientId for use in callbacks (avoids stale closures)
  const selectedClientIdRef = useRef(selectedClientId);
  selectedClientIdRef.current = selectedClientId;

  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Library state
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Queue progress state (lifted from ScanPanel)
  const [queueProgress, setQueueProgress] = useState<{ completed: number; total: number } | null>(null);

  // Track toast ID for progress updates
  const progressToastIdRef = useRef<string | null>(null);

  // Ref for fetch function (needed because useQueuePolling is called before fetchSavedAnalyses is defined)
  const fetchSavedAnalysesRef = useRef<(clientId: string | null) => Promise<void>>(() => Promise.resolve());

  // Stats computed from saved analyses
  const stats = React.useMemo(() => {
    const totalUrls = savedAnalyses.length;
    const totalScans = savedAnalyses.reduce((sum, a) => sum + (a.scanCount || 1), 0);
    const averageScore = totalUrls > 0
      ? Math.round(savedAnalyses.reduce((sum, a) => sum + a.score, 0) / totalUrls)
      : 0;
    const errorCount = savedAnalyses.reduce(
      (sum, a) => sum + (a.issues?.filter(i => i.type === 'error').length || 0),
      0
    );
    const warningCount = savedAnalyses.reduce(
      (sum, a) => sum + (a.issues?.filter(i => i.type === 'warning').length || 0),
      0
    );

    return { totalUrls, totalScans, averageScore, errorCount, warningCount };
  }, [savedAnalyses]);

  // Get selected client name
  const selectedClient = clients.find(c => c._id === selectedClientId);
  const clientName = selectedClient?.name || '';

  // Queue polling hook (lifted to page level)
  const {
    status: queueStatus,
    isPolling,
    isPaused,
    isLoading: queueLoading,
    startPolling,
    stopPolling,
    pausePolling,
    resumePolling,
    cancelQueue,
    refreshStatus,
    queueUrls,
    retryFailed,
    totalProcessed,
  } = useQueuePolling({
    clientId: selectedClientId,
    onProgress: (completed, total) => {
      setQueueProgress({ completed, total });

      // Update toast when drawer is closed
      if (!isPanelOpen && progressToastIdRef.current) {
        updateToast(progressToastIdRef.current, {
          progress: { current: completed, total },
          message: `Processing URLs: ${completed}/${total}`,
        });
      }
    },
    onComplete: () => {
      setQueueProgress(null);

      // Update progress toast to success
      if (progressToastIdRef.current) {
        updateToast(progressToastIdRef.current, {
          type: 'success',
          message: `Background processing complete. ${totalProcessed} URLs processed.`,
          progress: undefined,
        });
        progressToastIdRef.current = null;
      }

      // Refresh the library using refs to get current values
      fetchSavedAnalysesRef.current(selectedClientIdRef.current);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        message: err,
      });
    },
  });

  // Ref to track current fetch and abort previous ones
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch saved analyses - now takes clientId as param to avoid stale closure
  const fetchSavedAnalyses = useCallback(async (clientId: string | null, markNewIds?: string[]) => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!clientId) {
      setSavedAnalyses([]);
      return;
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoadingSaved(true);
    try {
      const res = await fetch(`/api/tools/meta-tag-analyser/saved?clientId=${clientId}`, {
        signal: abortController.signal,
      });
      if (res.ok) {
        const data = await res.json();

        // Mark newly added items for animation
        if (markNewIds && markNewIds.length > 0) {
          const newIdsSet = new Set(markNewIds);
          const markedData = data.map((item: SavedAnalysis) => ({
            ...item,
            isNew: newIdsSet.has(item._id),
          }));
          setSavedAnalyses(markedData);

          // Clear the isNew flag after animation
          setTimeout(() => {
            setSavedAnalyses(prev => prev.map(item => ({ ...item, isNew: false })));
          }, 2000);
        } else {
          setSavedAnalyses(data);
        }
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Failed to fetch saved analyses:', error);
    } finally {
      // Only clear loading if this is still the current request
      if (abortControllerRef.current === abortController) {
        setLoadingSaved(false);
      }
    }
  }, []);

  // Keep ref updated with latest fetch function
  fetchSavedAnalysesRef.current = fetchSavedAnalyses;

  // Fetch when client changes - pass clientId directly to avoid stale closure
  useEffect(() => {
    fetchSavedAnalyses(selectedClientId);
  }, [selectedClientId, fetchSavedAnalyses]);

  // Show toast when polling starts and drawer closes
  useEffect(() => {
    if (isPolling && !isPanelOpen && queueProgress && !progressToastIdRef.current) {
      // Show progress toast
      const toastId = addToast({
        type: 'progress',
        message: `Processing URLs: ${queueProgress.completed}/${queueProgress.total}`,
        progress: { current: queueProgress.completed, total: queueProgress.total },
        persistent: true,
      });
      progressToastIdRef.current = toastId;
    }

    // Clean up toast when panel opens (user can see progress in panel)
    if (isPanelOpen && progressToastIdRef.current) {
      removeToast(progressToastIdRef.current);
      progressToastIdRef.current = null;
    }
  }, [isPolling, isPanelOpen, queueProgress, addToast, removeToast]);

  // Handle rescan
  const handleRescan = async (id: string) => {
    try {
      const res = await fetch(`/api/tools/meta-tag-analyser/saved/${id}/rescan`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        // Update the analysis in the list
        setSavedAnalyses(prev =>
          prev.map(a => a._id === id ? { ...a, ...data.analysis } : a)
        );
        // Show feedback if changes detected
        if (data.changesDetected) {
          addToast({
            type: 'info',
            message: 'Changes detected in meta tags',
          });
        }
      }
    } catch (error) {
      console.error('Failed to rescan:', error);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this analysis?')) return;
    try {
      const res = await fetch(`/api/tools/meta-tag-analyser/saved/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSavedAnalyses(prev => prev.filter(a => a._id !== id));
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async (ids: string[]) => {
    if (!selectedClientId) return;
    try {
      const res = await fetch('/api/tools/meta-tag-analyser/saved', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, ids }),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedAnalyses(prev => prev.filter(a => !ids.includes(a._id)));
        addToast({
          type: 'success',
          message: data.message,
        });
      }
    } catch (error) {
      console.error('Failed to bulk delete:', error);
      addToast({
        type: 'error',
        message: 'Failed to delete URLs',
      });
    }
  };

  // Handle export
  const handleExport = (format: 'csv' | 'json') => {
    if (!selectedClientId) return;
    window.open(`/api/tools/meta-tag-analyser/export?clientId=${selectedClientId}&format=${format}`, '_blank');
  };

  // Handle scan complete - refresh the library
  const handleScanComplete = () => {
    fetchSavedAnalyses(selectedClientId);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Meta Tag Analyser
          </h1>
          <p className="mt-1 text-neutral-500">
            {selectedClientId && clientName ? (
              <>Tracking meta tags for <span className="font-medium text-neutral-700">{clientName}</span></>
            ) : (
              'Select a client to view and manage meta tags'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Background Processing Indicator */}
          {isPolling && !isPanelOpen && queueProgress && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-700">
                {queueProgress.completed}/{queueProgress.total}
              </span>
              <div className="flex items-center gap-1 ml-1">
                {isPaused ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={resumePolling}
                    title="Resume"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={pausePolling}
                    title="Pause"
                  >
                    <Pause className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => cancelQueue()}
                  title="Cancel"
                >
                  <Square className="h-3 w-3" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setIsPanelOpen(true)}
              >
                View
              </Button>
            </div>
          )}

          <Button onClick={() => setIsPanelOpen(true)} disabled={!selectedClientId}>
            <Plus className="mr-2 h-4 w-4" />
            Add URLs
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {selectedClientId && (
        <StatsCards
          totalUrls={stats.totalUrls}
          totalScans={stats.totalScans}
          averageScore={stats.averageScore}
          errorCount={stats.errorCount}
          warningCount={stats.warningCount}
          isLoading={loadingSaved}
        />
      )}

      {/* Library Table */}
      <LibraryTable
        analyses={savedAnalyses}
        isLoading={loadingSaved}
        clientId={selectedClientId}
        clientName={clientName}
        onRescan={handleRescan}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        onExport={handleExport}
        onAddUrls={() => setIsPanelOpen(true)}
      />

      {/* Scan Panel - pass polling props */}
      <ScanPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        clientId={selectedClientId}
        clientName={clientName}
        onScanComplete={handleScanComplete}
        // Polling props (lifted from hook)
        queueStatus={queueStatus}
        isPolling={isPolling}
        isPaused={isPaused}
        queueLoading={queueLoading}
        queueProgress={queueProgress}
        startPolling={startPolling}
        stopPolling={stopPolling}
        pausePolling={pausePolling}
        resumePolling={resumePolling}
        cancelQueue={cancelQueue}
        refreshStatus={refreshStatus}
        queueUrls={queueUrls}
        retryFailed={retryFailed}
        totalProcessed={totalProcessed}
      />
    </div>
  );
}