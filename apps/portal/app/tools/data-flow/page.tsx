'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Workflow, Clock } from 'lucide-react';
import { FlowCanvas } from './components/flow-canvas';
import { DataTable } from './components/data-table';
import { TracketTable } from './components/tracket-table';
import { sampleRows, buildNodesAndEdges } from './components/sample-data';
import { useVerticalResize } from './hooks/use-vertical-resize';
import type { TracketTimeEntry, TracketSummary } from './components/types';

/** Check if only the Tracket node is selected */
function isTracketSelected(ids: Set<string>): boolean {
  if (ids.size !== 1) return false;
  const selectedId = Array.from(ids)[0];
  return sampleRows.some((r) => r.id === selectedId && r.sourceType === 'tracket');
}

/** Get default date range: last 7 days */
function getDefaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function DataFlowPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Tracket state
  const defaults = useMemo(() => getDefaultDateRange(), []);
  const [tracketFrom, setTracketFrom] = useState(defaults.from);
  const [tracketTo, setTracketTo] = useState(defaults.to);
  const [tracketEntries, setTracketEntries] = useState<TracketTimeEntry[]>([]);
  const [tracketSummary, setTracketSummary] = useState<TracketSummary | null>(null);
  const [tracketLoading, setTracketLoading] = useState(false);
  const [tracketError, setTracketError] = useState<string | null>(null);
  const [tracketConfigured, setTracketConfigured] = useState(true);

  const showTracket = isTracketSelected(selectedIds);

  const { topHeight, isDragging, dividerProps } = useVerticalResize({
    containerRef,
    defaultHeight: 400,
    minTopHeight: 200,
    minBottomHeight: 120,
    topOffset: 73, // header height
  });

  const { nodes, edges } = useMemo(
    () => buildNodesAndEdges(sampleRows),
    []
  );

  // Fetch Tracket data when the node is selected
  const fetchTracketData = useCallback(
    async (from: string, to: string) => {
      setTracketLoading(true);
      setTracketError(null);

      try {
        const res = await fetch(
          `/api/tools/data-flow/tracket?from=${from}&to=${to}`
        );

        if (res.status === 503) {
          setTracketConfigured(false);
          setTracketEntries([]);
          setTracketSummary(null);
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || data.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        setTracketConfigured(true);
        setTracketEntries(data.entries || []);
        setTracketSummary(data.summary || null);

        // Update the Tracket node record count in sample data
        const tracketNode = sampleRows.find((r) => r.sourceType === 'tracket');
        if (tracketNode && data.summary) {
          tracketNode.records = data.summary.totalEntries;
          tracketNode.lastRun = new Date().toISOString();
        }
      } catch (err) {
        setTracketError(
          err instanceof Error ? err.message : 'Failed to fetch time entries'
        );
      } finally {
        setTracketLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (showTracket) {
      fetchTracketData(tracketFrom, tracketTo);
    }
  }, [showTracket, tracketFrom, tracketTo, fetchTracketData]);

  const handleFlowSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const handleTableSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const handleTracketDateChange = useCallback((from: string, to: string) => {
    setTracketFrom(from);
    setTracketTo(to);
  }, []);

  const handleTracketRefresh = useCallback(() => {
    fetchTracketData(tracketFrom, tracketTo);
  }, [fetchTracketData, tracketFrom, tracketTo]);

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100">
            <Workflow className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">
              Data Flow
            </h1>
            <p className="text-sm text-neutral-500">
              Visualise data pipelines and inspect node details
            </p>
          </div>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="shrink-0 bg-white" style={{ height: topHeight }}>
        <ReactFlowProvider>
          <FlowCanvas
            initialNodes={nodes}
            initialEdges={edges}
            selectedIds={selectedIds}
            onSelectionChange={handleFlowSelectionChange}
          />
        </ReactFlowProvider>
      </div>

      {/* Draggable Divider */}
      <div
        {...dividerProps}
        role="separator"
        aria-orientation="horizontal"
        className={`h-1.5 shrink-0 cursor-row-resize border-y border-neutral-200 flex items-center justify-center ${
          isDragging ? 'bg-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200'
        }`}
      >
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-neutral-400" />
          <div className="w-1 h-1 rounded-full bg-neutral-400" />
          <div className="w-1 h-1 rounded-full bg-neutral-400" />
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <div className="px-6 pt-4 pb-3">
          {showTracket ? (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-600" />
              <h2 className="text-sm font-medium text-neutral-700">
                Tracket Time Entries
              </h2>
            </div>
          ) : (
            <h2 className="text-sm font-medium text-neutral-700">
              Pipeline Nodes
              {selectedIds.size > 0 && (
                <span className="ml-2 text-xs text-neutral-400">
                  ({selectedIds.size} selected)
                </span>
              )}
            </h2>
          )}
        </div>
        <div className="flex-1 overflow-auto min-h-0 px-6 pb-4">
          {showTracket ? (
            <TracketTable
              entries={tracketEntries}
              summary={tracketSummary}
              isLoading={tracketLoading}
              error={tracketError}
              isConfigured={tracketConfigured}
              from={tracketFrom}
              to={tracketTo}
              onDateChange={handleTracketDateChange}
              onRefresh={handleTracketRefresh}
            />
          ) : (
            <DataTable
              rows={sampleRows}
              selectedIds={selectedIds}
              onSelectionChange={handleTableSelectionChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
