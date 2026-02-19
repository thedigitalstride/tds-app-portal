'use client';

import { useState, useCallback, useMemo } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Workflow } from 'lucide-react';
import { FlowCanvas } from './components/flow-canvas';
import { DataTable } from './components/data-table';
import { sampleRows, buildNodesAndEdges } from './components/sample-data';

export default function DataFlowPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    <div className="flex flex-col h-full">
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
      <div className="h-[45vh] min-h-[300px] border-b bg-white">
        <ReactFlowProvider>
          <FlowCanvas
            initialNodes={nodes}
            initialEdges={edges}
            selectedIds={selectedIds}
            onSelectionChange={handleFlowSelectionChange}
          />
        </ReactFlowProvider>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <h2 className="text-sm font-medium text-neutral-700 mb-3">
          Pipeline Nodes
          {selectedIds.size > 0 && (
            <span className="ml-2 text-xs text-neutral-400">
              ({selectedIds.size} selected)
            </span>
          )}
        </h2>
        <DataTable
          rows={sampleRows}
          selectedIds={selectedIds}
          onSelectionChange={handleTableSelectionChange}
        />
      </div>
    </div>
  );
}
