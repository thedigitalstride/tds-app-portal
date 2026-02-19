'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeMouseHandler,
  type Edge,
} from '@xyflow/react';
import { Workflow, Table2, Search, SlidersHorizontal, Eye, Plus } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  Checkbox,
  Input,
} from '@tds/ui';
import { FlowCanvas } from './components/flow-canvas';
import { DataTable, fieldDefs } from './components/data-table';
import {
  sampleRows,
  buildNodesAndEdges,
  sampleTableNode,
  sampleTableEdges,
} from './components/sample-data';
import { useVerticalResize } from './hooks/use-vertical-resize';
import type {
  AppNode,
  TableLayout,
  TableNodeData,
  TableNodeType,
} from './components/types';

function buildInitialState(
  handleLayoutChange: (nodeId: string, layout: TableLayout) => void,
  handleLabelChange: (nodeId: string, label: string) => void
) {
  const { nodes: dataNodes, edges: dataEdges } = buildNodesAndEdges(sampleRows);

  // Inject the real callbacks into the table node
  const tableNode: TableNodeType = {
    ...sampleTableNode,
    data: {
      ...sampleTableNode.data,
      onLayoutChange: handleLayoutChange,
      onLabelChange: handleLabelChange,
      isActive: true,
    },
  };

  const nodes: AppNode[] = [...(dataNodes as AppNode[]), tableNode];
  const edges: Edge[] = [...dataEdges, ...sampleTableEdges];

  return { nodes, edges, activeTableNodeId: tableNode.id };
}

export default function DataFlowPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const { topHeight, isDragging, dividerProps } = useVerticalResize({
    containerRef,
    defaultHeight: 400,
    minTopHeight: 200,
    minBottomHeight: 120,
    topOffset: 73,
  });

  // Stable layout change handler (uses updater function, no deps)
  const handleLayoutChange = useCallback(
    (nodeId: string, layout: TableLayout) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId && n.type === 'tableNode'
            ? { ...n, data: { ...n.data, layout } }
            : n
        )
      );
    },
    []
  );

  // Stable label change handler (uses updater function, no deps)
  const handleLabelChange = useCallback(
    (nodeId: string, label: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId && n.type === 'tableNode'
            ? { ...n, data: { ...n.data, label } }
            : n
        )
      );
    },
    []
  );

  // Initialise state lazily
  const [initialState] = useState(() =>
    buildInitialState(handleLayoutChange, handleLabelChange)
  );
  const [nodes, setNodes] = useState<AppNode[]>(initialState.nodes);
  const [edges, setEdges] = useState<Edge[]>(initialState.edges);
  const [activeTableNodeId, setActiveTableNodeId] = useState<string | null>(
    initialState.activeTableNodeId
  );

  // Counter for generating unique table node IDs
  const tableCounterRef = useRef(
    initialState.nodes.filter((n) => n.type === 'tableNode').length
  );

  // React Flow change handlers (controlled mode)
  const onNodesChange: OnNodesChange<AppNode> = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  // Add a new table node to the canvas
  const addTableNode = useCallback(() => {
    tableCounterRef.current += 1;
    const counter = tableCounterRef.current;
    const id = `table-${counter}`;
    const label = `Table ${counter}`;

    // Position below the lowest existing table node
    setNodes((nds) => {
      const tableNodes = nds.filter((n) => n.type === 'tableNode');
      const position =
        tableNodes.length > 0
          ? {
              x: tableNodes[0].position.x,
              y: Math.max(...tableNodes.map((n) => n.position.y)) + 140,
            }
          : { x: 900, y: 180 };

      const newNode: TableNodeType = {
        id,
        type: 'tableNode',
        position,
        data: {
          label,
          layout: 'rows',
          isActive: false,
          onLayoutChange: handleLayoutChange,
          onLabelChange: handleLabelChange,
        },
      };

      return [...nds, newNode];
    });

    setActiveTableNodeId(id);
    setSelectedIds(new Set());
  }, [handleLayoutChange, handleLabelChange]);

  // Stamp isActive flag on table nodes
  const nodesWithActive = useMemo(
    () =>
      nodes.map((n) =>
        n.type === 'tableNode'
          ? { ...n, data: { ...n.data, isActive: n.id === activeTableNodeId } }
          : n
      ),
    [nodes, activeTableNodeId]
  );

  // Handle node clicks — activate table nodes
  const handleNodeClick: NodeMouseHandler<AppNode> = useCallback(
    (_event, node) => {
      if (node.type === 'tableNode') {
        setActiveTableNodeId(node.id);
        setSelectedIds(new Set());
      }
    },
    []
  );

  // Canvas → table selection sync
  const handleFlowSelectionChange = useCallback(
    (ids: string[]) => {
      const dataNodeIds = ids.filter(
        (id) => !nodes.some((n) => n.id === id && n.type === 'tableNode')
      );
      setSelectedIds((prev) => {
        const next = new Set(dataNodeIds);
        if (
          next.size === prev.size &&
          dataNodeIds.every((id) => prev.has(id))
        )
          return prev;
        return next;
      });
    },
    [nodes]
  );

  // Table → canvas selection sync
  const handleTableSelectionChange = useCallback((ids: string[]) => {
    const newSet = new Set(ids);
    setSelectedIds(newSet);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.type === 'dataNode' ? newSet.has(n.id) : n.selected,
      }))
    );
  }, []);

  // Derive connected rows and active layout from the active table node
  const connectedRows = useMemo(() => {
    if (!activeTableNodeId) return [];
    const sourceIds = new Set(
      edges
        .filter((e) => e.target === activeTableNodeId)
        .map((e) => e.source)
    );
    return sampleRows.filter((r) => sourceIds.has(r.id));
  }, [edges, activeTableNodeId]);

  const activeLayout = useMemo(() => {
    if (!activeTableNodeId) return 'rows' as const;
    const tableNode = nodes.find(
      (n) => n.id === activeTableNodeId && n.type === 'tableNode'
    );
    if (!tableNode || tableNode.type !== 'tableNode') return 'rows' as const;
    return (tableNode.data as { layout: TableLayout }).layout;
  }, [nodes, activeTableNodeId]);

  const activeTableNode = activeTableNodeId
    ? nodes.find((n) => n.id === activeTableNodeId && n.type === 'tableNode')
    : null;

  // --- Trim config derived from active table node ---

  const activeHiddenColumns = useMemo(() => {
    if (!activeTableNode || activeTableNode.type !== 'tableNode') return [];
    return (activeTableNode.data as TableNodeData).hiddenColumns ?? [];
  }, [activeTableNode]);

  const activeHiddenRowIds = useMemo(() => {
    if (!activeTableNode || activeTableNode.type !== 'tableNode') return [];
    return (activeTableNode.data as TableNodeData).hiddenRowIds ?? [];
  }, [activeTableNode]);

  const setActiveHiddenColumns = useCallback(
    (hiddenColumns: string[]) => {
      if (!activeTableNodeId) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === activeTableNodeId && n.type === 'tableNode'
            ? { ...n, data: { ...n.data, hiddenColumns } }
            : n
        )
      );
    },
    [activeTableNodeId]
  );

  const setActiveHiddenRowIds = useCallback(
    (hiddenRowIds: string[]) => {
      if (!activeTableNodeId) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === activeTableNodeId && n.type === 'tableNode'
            ? { ...n, data: { ...n.data, hiddenRowIds } }
            : n
        )
      );
    },
    [activeTableNodeId]
  );

  // Filter rows by hiddenRowIds
  const visibleRows = useMemo(() => {
    if (!activeHiddenRowIds.length) return connectedRows;
    const hiddenSet = new Set(activeHiddenRowIds);
    return connectedRows.filter((r) => !hiddenSet.has(r.id));
  }, [connectedRows, activeHiddenRowIds]);

  // Quick filter (transient, resets on table node switch)
  const [quickFilter, setQuickFilter] = useState('');

  useEffect(() => {
    setQuickFilter('');
  }, [activeTableNodeId]);

  // Prune stale selections when rows are hidden
  useEffect(() => {
    const hiddenSet = new Set(activeHiddenRowIds);
    setSelectedIds((prev) => {
      const pruned = new Set([...prev].filter((id) => !hiddenSet.has(id)));
      if (pruned.size === prev.size) return prev;
      return pruned;
    });
  }, [activeHiddenRowIds]);

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
          <Button
            variant="outline"
            size="sm"
            onClick={addTableNode}
            className="ml-auto"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Table
          </Button>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="shrink-0 bg-white" style={{ height: topHeight }}>
        <ReactFlowProvider>
          <FlowCanvas
            nodes={nodesWithActive}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={handleFlowSelectionChange}
            onNodeClick={handleNodeClick}
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
          {activeTableNode ? (
            <div className="flex items-center gap-2">
              <Table2 className="w-4 h-4 text-violet-600" />
              <h2 className="text-sm font-medium text-neutral-700">
                {(activeTableNode.data as { label: string }).label}
              </h2>
              <span className="text-xs text-neutral-400">
                {visibleRows.length < connectedRows.length
                  ? `${visibleRows.length} of ${connectedRows.length} nodes shown`
                  : `${connectedRows.length} node${connectedRows.length !== 1 ? 's' : ''} connected`}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 font-medium">
                {activeLayout === 'rows' ? 'Rows' : 'Columns'}
              </span>
              {selectedIds.size > 0 && (
                <span className="text-xs text-neutral-400">
                  ({selectedIds.size} selected)
                </span>
              )}

              {/* Trim controls */}
              <div className="ml-auto flex items-center gap-2">
                {/* Quick filter — rows mode only */}
                {activeLayout === 'rows' && (
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                    <Input
                      value={quickFilter}
                      onChange={(e) => setQuickFilter(e.target.value)}
                      placeholder="Filter nodes…"
                      className="h-7 w-44 pl-7 text-xs"
                    />
                  </div>
                )}

                {/* Column visibility dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center w-7 h-7 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-500"
                      title="Toggle columns"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 p-2">
                    <p className="text-xs font-medium text-neutral-500 mb-1.5 px-1">Columns</p>
                    {fieldDefs.map((f) => {
                      const isHidden = activeHiddenColumns.includes(f.key);
                      return (
                        <label
                          key={f.key}
                          className="flex items-center gap-2 px-1 py-1 rounded hover:bg-neutral-50 cursor-pointer text-sm text-neutral-700"
                        >
                          <Checkbox
                            checked={!isHidden}
                            onCheckedChange={() => {
                              setActiveHiddenColumns(
                                isHidden
                                  ? activeHiddenColumns.filter((k) => k !== f.key)
                                  : [...activeHiddenColumns, f.key]
                              );
                            }}
                          />
                          {f.label}
                        </label>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Node visibility dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center w-7 h-7 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-500"
                      title="Toggle nodes"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 p-2">
                    <p className="text-xs font-medium text-neutral-500 mb-1.5 px-1">Nodes</p>
                    {connectedRows.map((row) => {
                      const isHidden = activeHiddenRowIds.includes(row.id);
                      return (
                        <label
                          key={row.id}
                          className="flex items-center gap-2 px-1 py-1 rounded hover:bg-neutral-50 cursor-pointer text-sm text-neutral-700"
                        >
                          <Checkbox
                            checked={!isHidden}
                            onCheckedChange={() => {
                              setActiveHiddenRowIds(
                                isHidden
                                  ? activeHiddenRowIds.filter((id) => id !== row.id)
                                  : [...activeHiddenRowIds, row.id]
                              );
                            }}
                          />
                          {row.label}
                        </label>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            <h2 className="text-sm font-medium text-neutral-700">
              Pipeline Nodes
            </h2>
          )}
        </div>
        <div className="flex-1 overflow-auto min-h-0 px-6 pb-4">
          <DataTable
            rows={visibleRows}
            selectedIds={selectedIds}
            onSelectionChange={handleTableSelectionChange}
            layout={activeLayout}
            hiddenColumns={activeHiddenColumns}
            quickFilterText={quickFilter}
          />
        </div>
      </div>
    </div>
  );
}
