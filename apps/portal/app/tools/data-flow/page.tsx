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
import { Workflow, Table2, Search, SlidersHorizontal, Eye, Plus, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  Checkbox,
  Input,
  Button,
  Skeleton,
} from '@tds/ui';
import { useClient } from '@/components/client-context';
import { FlowCanvas } from './components/flow-canvas';
import { DataTable, deriveFieldDefs } from './components/data-table';
import { resolveRowsForTarget, resolveJoinDerivedFields } from './components/extract-rows';
import { NodeLibrary } from './components/node-library';
import { NodeDetailDrawer } from './components/node-detail-drawer';
import { FlowPicker, type FlowSummary } from './components/flow-picker';
import { useAutoSave } from './hooks/use-auto-save';
import { useVerticalResize } from './hooks/use-vertical-resize';
import type {
  AppNode,
  GenericRow,
  TableLayout,
  TableNodeData,
  TableNodeType,
  SchemaNodeType,
  JoinNodeType,
  JoinNodeData,
} from './components/types';

export default function DataFlowPage() {
  const { selectedClientId } = useClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const { topHeight, isDragging, dividerProps } = useVerticalResize({
    containerRef,
    defaultHeight: 400,
    minTopHeight: 200,
    minBottomHeight: 120,
    topOffset: 73,
  });

  // --- Flow management state ---

  const [flowList, setFlowList] = useState<FlowSummary[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(false);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [loadingFlowData, setLoadingFlowData] = useState(false);

  // --- Node data updaters (stable, used by drawer) ---

  const handleTableLayoutChange = useCallback(
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

  const handleTableLabelChange = useCallback(
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

  const handleSchemaFieldsChange = useCallback(
    (nodeId: string, selectedFields: string[]) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId && n.type === 'schemaNode'
            ? { ...n, data: { ...n.data, selectedFields } }
            : n
        )
      );
    },
    []
  );

  const handleSchemaLabelChange = useCallback(
    (nodeId: string, label: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId && n.type === 'schemaNode'
            ? { ...n, data: { ...n.data, label } }
            : n
        )
      );
    },
    []
  );

  const handleSchemaAliasesChange = useCallback(
    (nodeId: string, fieldAliases: Record<string, string>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId && n.type === 'schemaNode'
            ? { ...n, data: { ...n.data, fieldAliases: Object.keys(fieldAliases).length > 0 ? fieldAliases : undefined } }
            : n
        )
      );
    },
    []
  );

  const handleJoinLabelChange = useCallback(
    (nodeId: string, label: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId && n.type === 'joinNode'
            ? { ...n, data: { ...n.data, label } }
            : n
        )
      );
    },
    []
  );

  const handleJoinKeyChange = useCallback(
    (nodeId: string, joinKey: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId && n.type === 'joinNode'
            ? { ...n, data: { ...n.data, joinKey } }
            : n
        )
      );
    },
    []
  );

  const handleJoinTypeChange = useCallback(
    (nodeId: string, joinType: 'inner' | 'full') => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId && n.type === 'joinNode'
            ? { ...n, data: { ...n.data, joinType } }
            : n
        )
      );
    },
    []
  );

  // --- Flow state ---

  const [nodes, setNodes] = useState<AppNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [activeTableNodeId, setActiveTableNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Counters for generating unique node IDs
  const tableCounterRef = useRef(0);
  const schemaCounterRef = useRef(0);
  const joinCounterRef = useRef(0);

  // Keep a ref to selectedNodeId for use in onNodesChange (deletion safety)
  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;

  // --- Auto-save ---

  const autoSavePayload = useMemo(
    () => ({
      nodes,
      edges,
      activeTableNodeId,
      tableCounter: tableCounterRef.current,
      schemaCounter: schemaCounterRef.current,
      joinCounter: joinCounterRef.current,
    }),
    [nodes, edges, activeTableNodeId]
  );

  const { saveStatus } = useAutoSave(activeFlowId, autoSavePayload);

  // --- Fetch flow list when client changes ---

  const fetchFlowList = useCallback(async (clientId: string) => {
    setLoadingFlows(true);
    try {
      const res = await fetch(`/api/tools/data-flow?clientId=${clientId}`);
      if (!res.ok) throw new Error('Failed to fetch flows');
      const data: FlowSummary[] = await res.json();
      setFlowList(data);
      return data;
    } catch (err) {
      console.error('Error fetching flow list:', err);
      setFlowList([]);
      return [];
    } finally {
      setLoadingFlows(false);
    }
  }, []);

  // --- Load a single flow's data ---

  const loadFlow = useCallback(async (flowId: string) => {
    setLoadingFlowData(true);
    setSelectedNodeId(null);
    try {
      const res = await fetch(`/api/tools/data-flow/${flowId}`);
      if (!res.ok) throw new Error('Failed to load flow');
      const flow = await res.json();

      setNodes(flow.nodes as AppNode[]);
      setEdges(flow.edges as Edge[]);
      setActiveTableNodeId(flow.activeTableNodeId ?? null);
      tableCounterRef.current = flow.tableCounter ?? 0;
      schemaCounterRef.current = flow.schemaCounter ?? 0;
      joinCounterRef.current = flow.joinCounter ?? 0;
      setActiveFlowId(flowId);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Error loading flow:', err);
    } finally {
      setLoadingFlowData(false);
    }
  }, []);

  // --- Client change: fetch list → load first flow ---

  useEffect(() => {
    if (!selectedClientId) {
      setFlowList([]);
      setActiveFlowId(null);
      setNodes([]);
      setEdges([]);
      return;
    }

    fetchFlowList(selectedClientId).then((flows) => {
      if (flows.length > 0) {
        loadFlow(flows[0]._id);
      } else {
        setActiveFlowId(null);
        setNodes([]);
        setEdges([]);
      }
    });
  }, [selectedClientId, fetchFlowList, loadFlow]);

  // --- Flow picker callbacks ---

  const handleSelectFlow = useCallback(
    (id: string) => {
      if (id === activeFlowId) return;
      loadFlow(id);
    },
    [activeFlowId, loadFlow]
  );

  const handleCreateFlow = useCallback(
    async (name: string) => {
      if (!selectedClientId) return;
      try {
        const res = await fetch('/api/tools/data-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: selectedClientId, name }),
        });
        if (!res.ok) throw new Error('Failed to create flow');
        const flow = await res.json();

        // Refresh list and switch to new flow
        await fetchFlowList(selectedClientId);
        loadFlow(flow._id);
      } catch (err) {
        console.error('Error creating flow:', err);
      }
    },
    [selectedClientId, fetchFlowList, loadFlow]
  );

  const handleRenameFlow = useCallback(
    async (id: string, name: string) => {
      try {
        const res = await fetch(`/api/tools/data-flow/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error('Failed to rename flow');

        // Update list in-place
        setFlowList((prev) =>
          prev.map((f) => (f._id === id ? { ...f, name } : f))
        );
      } catch (err) {
        console.error('Error renaming flow:', err);
      }
    },
    []
  );

  const handleDeleteFlow = useCallback(
    async (id: string) => {
      if (!selectedClientId) return;
      try {
        const res = await fetch(`/api/tools/data-flow/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete flow');

        const updatedList = await fetchFlowList(selectedClientId);
        if (id === activeFlowId) {
          if (updatedList.length > 0) {
            loadFlow(updatedList[0]._id);
          } else {
            setActiveFlowId(null);
            setNodes([]);
            setEdges([]);
          }
        }
      } catch (err) {
        console.error('Error deleting flow:', err);
      }
    },
    [selectedClientId, activeFlowId, fetchFlowList, loadFlow]
  );

  // Active flow name (from list, for the picker label)
  const activeFlowName = useMemo(() => {
    const flow = flowList.find((f) => f._id === activeFlowId);
    return flow?.name ?? '';
  }, [flowList, activeFlowId]);

  // React Flow change handlers (controlled mode)
  const onNodesChange: OnNodesChange<AppNode> = useCallback(
    (changes) => {
      setNodes((nds) => {
        const next = applyNodeChanges(changes, nds);
        // If the selected node was removed, close the drawer
        const removals = changes.filter((c) => c.type === 'remove');
        if (removals.length > 0 && selectedNodeIdRef.current) {
          const removedIds = new Set(removals.map((c) => c.id));
          if (removedIds.has(selectedNodeIdRef.current)) {
            setSelectedNodeId(null);
          }
        }
        return next;
      });
    },
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

  // --- Drag-and-drop from node library ---

  const handleNodeDrop = useCallback(
    (type: string, position: { x: number; y: number }) => {
      if (type === 'tableNode') {
        tableCounterRef.current += 1;
        const counter = tableCounterRef.current;
        const id = `table-${counter}`;
        const label = `Table ${counter}`;

        const newNode: TableNodeType = {
          id,
          type: 'tableNode',
          position,
          data: {
            label,
            layout: 'rows',
            isActive: false,
          },
        };

        setNodes((nds) => [...nds, newNode]);
        setSelectedNodeId(id);
        setActiveTableNodeId(id);
        setSelectedIds(new Set());
      } else if (type === 'schemaNode') {
        schemaCounterRef.current += 1;
        const counter = schemaCounterRef.current;
        const id = `schema-${counter}`;
        const label = `Schema ${counter}`;

        const newNode: SchemaNodeType = {
          id,
          type: 'schemaNode',
          position,
          data: {
            label,
            availableFields: [],
            selectedFields: [],
          },
        };

        setNodes((nds) => [...nds, newNode]);
        setSelectedNodeId(id);
      } else if (type === 'joinNode') {
        joinCounterRef.current += 1;
        const counter = joinCounterRef.current;
        const id = `join-${counter}`;
        const label = `Join ${counter}`;

        const newNode: JoinNodeType = {
          id,
          type: 'joinNode',
          position,
          data: {
            label,
            joinKey: '',
            joinType: 'inner',
            availableFieldsA: [],
            availableFieldsB: [],
            commonFields: [],
            matchedCount: 0,
          },
        };

        setNodes((nds) => [...nds, newNode]);
        setSelectedNodeId(id);
      }
    },
    []
  );

  // --- Node click → open drawer (+ activate table if table node) ---

  const handleNodeClick: NodeMouseHandler<AppNode> = useCallback(
    (_event, node) => {
      setSelectedNodeId(node.id);
      if (node.type === 'tableNode') {
        setActiveTableNodeId(node.id);
        setSelectedIds(new Set());
      }
    },
    []
  );

  // --- Pane click → close drawer (keep bottom panel) ---

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // --- Escape key → close drawer ---

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Inject derived fields into schema and join nodes from upstream data
  const enrichedNodes = useMemo(() => {
    // First pass: enrich schema nodes
    const withSchema = nodesWithActive.map((node) => {
      if (node.type !== 'schemaNode') return node;

      const upstreamRows = resolveRowsForTarget(node.id, nodesWithActive, edges);
      const upstreamFields = deriveFieldDefs(upstreamRows).map((f) => f.key);

      const validSelected = node.data.selectedFields.filter((f: string) =>
        upstreamFields.includes(f)
      );

      // Prune aliases for fields that are no longer selected
      const existingAliases = node.data.fieldAliases ?? {};
      const validAliases: Record<string, string> = {};
      for (const field of validSelected) {
        if (existingAliases[field]) validAliases[field] = existingAliases[field];
      }

      return {
        ...node,
        data: {
          ...node.data,
          availableFields: upstreamFields,
          selectedFields: validSelected,
          fieldAliases: Object.keys(validAliases).length > 0 ? validAliases : undefined,
        },
      };
    });

    // Second pass: enrich join nodes (needs schema-enriched nodes for accurate upstream resolution)
    return withSchema.map((node) => {
      if (node.type !== 'joinNode') return node;

      const derived = resolveJoinDerivedFields(node.id, withSchema, edges);
      const joinData = node.data as JoinNodeData;

      // If the current joinKey is no longer in commonFields, clear it
      const validJoinKey = derived.commonFields.includes(joinData.joinKey) ? joinData.joinKey : '';

      return {
        ...node,
        data: {
          ...node.data,
          availableFieldsA: derived.availableFieldsA,
          availableFieldsB: derived.availableFieldsB,
          commonFields: derived.commonFields,
          matchedCount: derived.matchedCount,
          joinKey: validJoinKey,
        },
      };
    });
  }, [nodesWithActive, edges]);

  // Resolve the selected node from the enriched list
  const selectedNode = selectedNodeId
    ? (enrichedNodes.find((n) => n.id === selectedNodeId) ?? null)
    : null;

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

  // Derive connected rows via graph-aware resolution
  const connectedRows = useMemo<GenericRow[]>(() => {
    if (!activeTableNodeId) return [];
    return resolveRowsForTarget(activeTableNodeId, enrichedNodes, edges);
  }, [edges, activeTableNodeId, enrichedNodes]);

  const derivedFieldDefs = useMemo(
    () => deriveFieldDefs(connectedRows),
    [connectedRows]
  );

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

  // --- Column state & filter model derived from active table node ---

  const activeColumnState = useMemo(() => {
    if (!activeTableNode || activeTableNode.type !== 'tableNode') return undefined;
    return (activeTableNode.data as TableNodeData).columnState;
  }, [activeTableNode]);

  const activeFilterModel = useMemo(() => {
    if (!activeTableNode || activeTableNode.type !== 'tableNode') return undefined;
    return (activeTableNode.data as TableNodeData).filterModel;
  }, [activeTableNode]);

  const handleColumnStateChange = useCallback(
    (columnState: Record<string, unknown>[]) => {
      if (!activeTableNodeId) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === activeTableNodeId && n.type === 'tableNode'
            ? { ...n, data: { ...n.data, columnState } }
            : n
        )
      );
    },
    [activeTableNodeId]
  );

  const handleFilterModelChange = useCallback(
    (filterModel: Record<string, Record<string, unknown>>) => {
      if (!activeTableNodeId) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === activeTableNodeId && n.type === 'tableNode'
            ? { ...n, data: { ...n.data, filterModel } }
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
    return connectedRows.filter((r) => !hiddenSet.has(r._nodeId));
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

  // --- No client selected ---

  if (!selectedClientId) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100">
              <Workflow className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-neutral-900">Data Flow</h1>
              <p className="text-sm text-neutral-500">
                Visualise data pipelines and inspect node details
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-neutral-500 mb-2">Select a client to get started</p>
            <p className="text-sm text-neutral-400">
              Use the client selector in the sidebar to choose a client
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Loading flow data ---

  const showCanvas = activeFlowId && !loadingFlowData;

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100">
            <Workflow className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-neutral-900">Data Flow</h1>
              <FlowPicker
                flows={flowList}
                activeFlowId={activeFlowId}
                activeFlowName={activeFlowName}
                saveStatus={saveStatus}
                loadingFlows={loadingFlows}
                onSelectFlow={handleSelectFlow}
                onCreateFlow={handleCreateFlow}
                onRenameFlow={handleRenameFlow}
                onDeleteFlow={handleDeleteFlow}
              />
            </div>
            <p className="text-sm text-neutral-500">
              Visualise data pipelines and inspect node details
            </p>
          </div>
        </div>
      </div>

      {/* Empty state: no flows for this client */}
      {!activeFlowId && !loadingFlows && !loadingFlowData && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Workflow className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-600 font-medium mb-1">No flows yet</p>
            <p className="text-sm text-neutral-400 mb-4">
              Create your first flow to start building data pipelines
            </p>
            <Button onClick={() => handleCreateFlow('My First Flow')}>
              <Plus className="w-4 h-4 mr-1.5" />
              Create Flow
            </Button>
          </div>
        </div>
      )}

      {/* Loading flow data spinner */}
      {loadingFlowData && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-neutral-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading flow…</span>
          </div>
        </div>
      )}

      {/* Three-panel area (resizable top portion) */}
      {showCanvas && (
        <>
          <div className="shrink-0 bg-white" style={{ height: topHeight }}>
            <ReactFlowProvider>
              <div className="flex h-full">
                <NodeLibrary />
                <div className="flex-1 min-w-0">
                  <FlowCanvas
                    nodes={enrichedNodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onSelectionChange={handleFlowSelectionChange}
                    onNodeClick={handleNodeClick}
                    onNodeDrop={handleNodeDrop}
                    onPaneClick={handlePaneClick}
                  />
                </div>
                <NodeDetailDrawer
                  selectedNode={selectedNode}
                  onClose={() => setSelectedNodeId(null)}
                  onTableLabelChange={handleTableLabelChange}
                  onTableLayoutChange={handleTableLayoutChange}
                  onSchemaLabelChange={handleSchemaLabelChange}
                  onSchemaFieldsChange={handleSchemaFieldsChange}
                  onSchemaAliasesChange={handleSchemaAliasesChange}
                  onJoinLabelChange={handleJoinLabelChange}
                  onJoinKeyChange={handleJoinKeyChange}
                  onJoinTypeChange={handleJoinTypeChange}
                />
              </div>
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
                    {(() => {
                      const sourceCount = new Set(connectedRows.map((r) => r._nodeId)).size;
                      const visibleSourceCount = new Set(visibleRows.map((r) => r._nodeId)).size;
                      if (connectedRows.length === sourceCount) {
                        return visibleRows.length < connectedRows.length
                          ? `${visibleRows.length} of ${connectedRows.length} nodes shown`
                          : `${connectedRows.length} node${connectedRows.length !== 1 ? 's' : ''} connected`;
                      }
                      return visibleRows.length < connectedRows.length
                        ? `${visibleRows.length} of ${connectedRows.length} rows from ${visibleSourceCount} of ${sourceCount} sources`
                        : `${connectedRows.length} row${connectedRows.length !== 1 ? 's' : ''} from ${sourceCount} source${sourceCount !== 1 ? 's' : ''}`;
                    })()}
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
                          placeholder="Filter rows…"
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
                        {derivedFieldDefs.map((f) => {
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
                        <p className="text-xs font-medium text-neutral-500 mb-1.5 px-1">Sources</p>
                        {(() => {
                          const seen = new Set<string>();
                          const sources: { nodeId: string; label: string }[] = [];
                          for (const row of connectedRows) {
                            if (seen.has(row._nodeId)) continue;
                            seen.add(row._nodeId);
                            sources.push({ nodeId: row._nodeId, label: row._nodeLabel as string });
                          }
                          return sources.map((src) => {
                            const isHidden = activeHiddenRowIds.includes(src.nodeId);
                            return (
                              <label
                                key={src.nodeId}
                                className="flex items-center gap-2 px-1 py-1 rounded hover:bg-neutral-50 cursor-pointer text-sm text-neutral-700"
                              >
                                <Checkbox
                                  checked={!isHidden}
                                  onCheckedChange={() => {
                                    setActiveHiddenRowIds(
                                      isHidden
                                        ? activeHiddenRowIds.filter((id) => id !== src.nodeId)
                                        : [...activeHiddenRowIds, src.nodeId]
                                    );
                                  }}
                                />
                                {src.label}
                              </label>
                            );
                          });
                        })()}
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
                fieldDefs={derivedFieldDefs}
                selectedIds={selectedIds}
                onSelectionChange={handleTableSelectionChange}
                layout={activeLayout}
                hiddenColumns={activeHiddenColumns}
                quickFilterText={quickFilter}
                columnState={activeColumnState}
                filterModel={activeFilterModel}
                onColumnStateChange={handleColumnStateChange}
                onFilterModelChange={handleFilterModelChange}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
