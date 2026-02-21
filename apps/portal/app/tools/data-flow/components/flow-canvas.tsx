'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type NodeTypes,
  type OnSelectionChangeFunc,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeMouseHandler,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DataNode } from './data-node';
import { TableNode } from './table-node';
import { FacebookAdNode } from './facebook-ad-node';
import { SchemaNode } from './schema-node';
import { JoinNode } from './join-node';
import type { AppNode } from './types';

interface FlowCanvasProps {
  nodes: AppNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onSelectionChange: (ids: string[]) => void;
  onNodeClick: NodeMouseHandler<AppNode>;
  onNodeDrop?: (type: string, position: { x: number; y: number }) => void;
  onPaneClick?: () => void;
}

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectionChange,
  onNodeClick,
  onNodeDrop,
  onPaneClick,
}: FlowCanvasProps) {
  const nodeTypes: NodeTypes = useMemo(
    () => ({ dataNode: DataNode, tableNode: TableNode, facebookAdNode: FacebookAdNode, schemaNode: SchemaNode, joinNode: JoinNode }),
    []
  );

  const { screenToFlowPosition } = useReactFlow();

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      const ids = selectedNodes.map((n) => n.id);
      onSelectionChange(ids);
    },
    [onSelectionChange]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !onNodeDrop) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      onNodeDrop(type, position);
    },
    [onNodeDrop, screenToFlowPosition]
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
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        nodeTypes={nodeTypes}
        snapToGrid
        snapGrid={[16, 16]}
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
