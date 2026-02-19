'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
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
import type { AppNode } from './types';

interface FlowCanvasProps {
  nodes: AppNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onSelectionChange: (ids: string[]) => void;
  onNodeClick: NodeMouseHandler<AppNode>;
}

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectionChange,
  onNodeClick,
}: FlowCanvasProps) {
  const nodeTypes: NodeTypes = useMemo(
    () => ({ dataNode: DataNode, tableNode: TableNode }),
    []
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
        onNodeClick={onNodeClick}
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
