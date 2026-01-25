'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Library, Clock } from 'lucide-react';
import { Button } from '@tds/ui';
import { useClient } from '@/components/client-context';
import { useToast } from '@/components/toast-context';
import { UrlBatchPanel } from '@/components/url-batch-panel';
import { StatsCards } from './components/StatsCards';
import { LibraryTable } from './components/LibraryTable';
import { BatchHistoryTab } from './components/BatchHistoryTab';
import type { SavedAnalysis } from './components/types';

type TabType = 'library' | 'history';

export default function PpcPageAnalyserPage() {
  const { clients, selectedClientId } = useClient();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

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

  const selectedClient = clients.find(c => c._id === selectedClientId);
  const clientName = selectedClient?.name || '';

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSavedAnalyses = useCallback(async (clientId: string | null, markNewIds?: string[]) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!clientId) {
      setSavedAnalyses([]);
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoadingSaved(true);
    try {
      const res = await fetch(`/api/tools/ppc-page-analyser/saved?clientId=${clientId}`, {
        signal: abortController.signal,
      });
      if (res.ok) {
        const data = await res.json();

        if (markNewIds && markNewIds.length > 0) {
          const newIdsSet = new Set(markNewIds);
          const markedData = data.map((item: SavedAnalysis) => ({
            ...item,
            isNew: newIdsSet.has(item._id),
          }));
          setSavedAnalyses(markedData);

          setTimeout(() => {
            setSavedAnalyses(prev => prev.map(item => ({ ...item, isNew: false })));
          }, 2000);
        } else {
          setSavedAnalyses(data);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Failed to fetch saved analyses:', error);
    } finally {
      if (abortControllerRef.current === abortController) {
        setLoadingSaved(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchSavedAnalyses(selectedClientId);
  }, [selectedClientId, fetchSavedAnalyses]);

  const handleRescan = async (id: string) => {
    try {
      const res = await fetch(`/api/tools/ppc-page-analyser/saved/${id}/rescan`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setSavedAnalyses(prev =>
          prev.map(a => a._id === id ? { ...a, ...data.analysis } : a)
        );
        if (data.changesDetected) {
          addToast({
            type: 'info',
            message: 'Changes detected in landing page',
          });
        }
      }
    } catch (error) {
      console.error('Failed to rescan:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this analysis?')) return;
    try {
      const res = await fetch(`/api/tools/ppc-page-analyser/saved/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSavedAnalyses(prev => prev.filter(a => a._id !== id));
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (!selectedClientId) return;
    try {
      const res = await fetch('/api/tools/ppc-page-analyser/saved', {
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

  const handleExport = (format: 'csv' | 'json') => {
    if (!selectedClientId) return;
    window.open(`/api/tools/ppc-page-analyser/export?clientId=${selectedClientId}&format=${format}`, '_blank');
  };

  const handleScanComplete = () => {
    fetchSavedAnalyses(selectedClientId);
  };

  // Check which URLs already exist in the library for this client
  const checkExistingUrls = useCallback(async (urls: string[]) => {
    if (!selectedClientId) return { existing: [], new: urls };

    try {
      const res = await fetch('/api/tools/ppc-page-analyser/check-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, urls }),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall through to default
    }
    return { existing: [], new: urls };
  }, [selectedClientId]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            PPC Page Analyser
          </h1>
          <p className="mt-1 text-neutral-500">
            {selectedClientId && clientName ? (
              <>Analysing landing pages for <span className="font-medium text-neutral-700">{clientName}</span></>
            ) : (
              'Select a client to view and manage landing page analyses'
            )}
          </p>
        </div>

        <Button onClick={() => setIsPanelOpen(true)} disabled={!selectedClientId}>
          <Plus className="mr-2 h-4 w-4" />
          Add URLs
        </Button>
      </div>

      {selectedClientId && activeTab === 'library' && (
        <StatsCards
          totalUrls={stats.totalUrls}
          totalScans={stats.totalScans}
          averageScore={stats.averageScore}
          errorCount={stats.errorCount}
          warningCount={stats.warningCount}
          isLoading={loadingSaved}
        />
      )}

      {selectedClientId && (
        <div className="border-b border-neutral-200">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'library'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              <Library className="h-4 w-4" />
              Library
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'library'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-neutral-100 text-neutral-500'
              }`}>
                {savedAnalyses.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              <Clock className="h-4 w-4" />
              Batch History
            </button>
          </nav>
        </div>
      )}

      {activeTab === 'library' ? (
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
      ) : (
        <BatchHistoryTab
          clientId={selectedClientId}
        />
      )}

      <UrlBatchPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        clientId={selectedClientId || ''}
        clientName={clientName}
        toolId="ppc-page-analyser"
        onUrlsProcessed={handleScanComplete}
        title="Add Landing Pages"
        singleUrlLabel="Landing page URL"
        processingLabel="Analysing page..."
        enablePageArchive={true}
        checkExistingUrls={checkExistingUrls}
        toolName="PPC Page Analyser"
      />
    </div>
  );
}
