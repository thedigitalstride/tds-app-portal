'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@tds/ui';
import { useClient } from '@/components/client-context';
import { ScanPanel } from './components/ScanPanel';
import { StatsCards } from './components/StatsCards';
import { LibraryTable } from './components/LibraryTable';
import type { SavedAnalysis } from './components/types';

export default function MetaTagAnalyserPage() {
  // Global client state from context
  const { clients, selectedClientId } = useClient();

  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Library state
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());

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

  // Fetch saved analyses
  const fetchSavedAnalyses = useCallback(async (markNewIds?: string[]) => {
    if (!selectedClientId) {
      setSavedAnalyses([]);
      return;
    }

    setLoadingSaved(true);
    try {
      const res = await fetch(`/api/tools/meta-tag-analyser/saved?clientId=${selectedClientId}`);
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
      console.error('Failed to fetch saved analyses:', error);
    } finally {
      setLoadingSaved(false);
    }
  }, [selectedClientId]);

  // Fetch when client changes
  useEffect(() => {
    fetchSavedAnalyses();
  }, [fetchSavedAnalyses]);

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
          // Could add a toast notification here
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

  // Handle export
  const handleExport = (format: 'csv' | 'json') => {
    if (!selectedClientId) return;
    window.open(`/api/tools/meta-tag-analyser/export?clientId=${selectedClientId}&format=${format}`, '_blank');
  };

  // Handle scan complete - refresh the library
  const handleScanComplete = () => {
    fetchSavedAnalyses();
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

        <Button onClick={() => setIsPanelOpen(true)} disabled={!selectedClientId}>
          <Plus className="mr-2 h-4 w-4" />
          Add URLs
        </Button>
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
        onExport={handleExport}
        onAddUrls={() => setIsPanelOpen(true)}
      />

      {/* Scan Panel */}
      <ScanPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        clientId={selectedClientId}
        clientName={clientName}
        onScanComplete={handleScanComplete}
      />
    </div>
  );
}
