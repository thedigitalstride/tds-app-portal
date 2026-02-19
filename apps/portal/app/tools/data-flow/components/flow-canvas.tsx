'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type NodeTypes,
  type OnSelectionChangeFunc,
  type OnConnect,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DataNode } from './data-node';

interface FlowCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: string[]) => void;
}

export function FlowCanvas({
  initialNodes,
  initialEdges,
  selectedIds,
  onSelectionChange,
}: FlowCanvasProps) {
  const nodeTypes: NodeTypes = useMemo(() => ({ dataNode: DataNode }), []);

  const nodesWithSelection = useMemo(
    () =>
      initialNodes.map((n) => ({
        ...n,
        selected: selectedIds.has(n.id),
      })),
    [initialNodes, selectedIds]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithSelection);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync external selection into nodes
  useMemo(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: selectedIds.has(n.id),
      }))
    );
  }, [selectedIds, setNodes]);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      const ids = selectedNodes.map((n) => n.id);
      onSelectionChange(ids);
    },
    [onSelectionChange]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        className="bg-white"
      >
        <Background gap={16} size={1} color="#e5e5e5" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={3}
          pannable
          zoomable
          className="!bg-neutral-100 !border-neutral-200"
        />
      </ReactFlow>
    </div>
  );
}
