'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Workflow } from 'lucide-react';
import { FlowCanvas } from './components/flow-canvas';
import { DataTable } from './components/data-table';
import { sampleRows, buildNodesAndEdges } from './components/sample-data';
import { useVerticalResize } from './hooks/use-vertical-resize';

export default function DataFlowPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleFlowSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const handleTableSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

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

      {/* Data Table */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <div className="px-6 pt-4 pb-3">
          <h2 className="text-sm font-medium text-neutral-700">
            Pipeline Nodes
            {selectedIds.size > 0 && (
              <span className="ml-2 text-xs text-neutral-400">
                ({selectedIds.size} selected)
              </span>
            )}
          </h2>
        </div>
        <div className="flex-1 overflow-auto min-h-0 px-6 pb-4">
          <DataTable
            rows={sampleRows}
            selectedIds={selectedIds}
            onSelectionChange={handleTableSelectionChange}
          />
        </div>
      </div>
    </div>
  );
}
