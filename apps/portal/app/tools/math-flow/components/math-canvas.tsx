'use client';

import { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type NodeTypes,
  type OnConnect,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { NumberNode } from './number-node';
import { OperationNode, type MathOperation } from './operation-node';
import { FormulaNode } from './formula-node';
import { ResultNode } from './result-node';
import { evaluateFormula } from '../lib/evaluate';

interface MathCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodesUpdate?: (nodes: Node[]) => void;
  onEdgesUpdate?: (edges: Edge[]) => void;
}

/** Topological sort of node IDs based on edges */
function topoSort(nodeIds: string[], edges: Edge[]): string[] {
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};
  for (const id of nodeIds) {
    inDegree[id] = 0;
    adj[id] = [];
  }
  for (const edge of edges) {
    if (adj[edge.source]) {
      adj[edge.source].push(edge.target);
    }
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  }
  const queue = nodeIds.filter((id) => inDegree[id] === 0);
  const sorted: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    sorted.push(curr);
    for (const next of adj[curr]) {
      inDegree[next]--;
      if (inDegree[next] === 0) queue.push(next);
    }
  }
  return sorted;
}

/** Evaluate the entire graph and return updated computed values per node */
function evaluateGraph(
  nodes: Node[],
  edges: Edge[]
): Record<string, { value: number; error?: string | null }> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const sorted = topoSort(
    nodes.map((n) => n.id),
    edges
  );

  const values: Record<string, { value: number; error?: string | null }> = {};

  for (const nodeId of sorted) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    if (node.type === 'numberNode') {
      values[nodeId] = { value: node.data.value as number };
    } else if (node.type === 'operationNode') {
      // Find inputs connected to handles 'a' and 'b'
      const inputA = edges.find(
        (e) => e.target === nodeId && e.targetHandle === 'a'
      );
      const inputB = edges.find(
        (e) => e.target === nodeId && e.targetHandle === 'b'
      );
      const a = inputA ? values[inputA.source]?.value : undefined;
      const b = inputB ? values[inputB.source]?.value : undefined;

      if (a === undefined || b === undefined) {
        values[nodeId] = { value: NaN };
      } else {
        const op = node.data.operation as MathOperation;
        let result: number;
        switch (op) {
          case '+':
            result = a + b;
            break;
          case '-':
            result = a - b;
            break;
          case '*':
            result = a * b;
            break;
          case '/':
            result = b === 0 ? NaN : a / b;
            break;
          case '^':
            result = Math.pow(a, b);
            break;
          case '%':
            result = b === 0 ? NaN : a % b;
            break;
          default:
            result = NaN;
        }
        values[nodeId] = { value: result };
      }
    } else if (node.type === 'formulaNode') {
      // Build variable map from connected inputs
      const vars: Record<string, number> = {};
      const inputLabels = ['a', 'b', 'c', 'd', 'e', 'f'];
      for (const lbl of inputLabels) {
        const inputEdge = edges.find(
          (e) => e.target === nodeId && e.targetHandle === lbl
        );
        if (inputEdge && values[inputEdge.source] !== undefined) {
          vars[lbl.toUpperCase()] = values[inputEdge.source].value;
        }
      }
      const formula = node.data.formula as string;
      const { value, error } = evaluateFormula(formula, vars);
      values[nodeId] = { value, error };
    } else if (node.type === 'resultNode') {
      // Take value from first connected input
      const inputEdge = edges.find((e) => e.target === nodeId);
      values[nodeId] = {
        value: inputEdge ? values[inputEdge.source]?.value ?? NaN : NaN,
      };
    }
  }

  return values;
}

export function MathCanvas({
  initialNodes,
  initialEdges,
  onNodesUpdate,
  onEdgesUpdate,
}: MathCanvasProps) {
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      numberNode: NumberNode,
      operationNode: OperationNode,
      formulaNode: FormulaNode,
      resultNode: ResultNode,
    }),
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Ref to track latest nodes/edges for callbacks
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Re-evaluate graph whenever nodes or edges change
  const reEvaluate = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const computed = evaluateGraph(currentNodes, currentEdges);

    setNodes((nds: Node[]) =>
      nds.map((n: Node) => {
        const cv = computed[n.id];
        if (!cv) return n;
        const newData = { ...n.data, computedValue: cv.value };
        if (n.type === 'formulaNode') {
          (newData as Record<string, unknown>).error = cv.error;
        }
        return { ...n, data: newData };
      })
    );
  }, [setNodes]);

  // Re-evaluate whenever edges change
  useEffect(() => {
    reEvaluate();
  }, [edges, reEvaluate]);

  // Callbacks passed into nodes
  const handleNumberChange = useCallback(
    (nodeId: string, value: number) => {
      setNodes((nds: Node[]) =>
        nds.map((n: Node) =>
          n.id === nodeId ? { ...n, data: { ...n.data, value } } : n
        )
      );
      // Schedule re-evaluation after state update
      setTimeout(() => reEvaluate(), 0);
    },
    [setNodes, reEvaluate]
  );

  const handleOperationChange = useCallback(
    (nodeId: string, operation: MathOperation) => {
      setNodes((nds: Node[]) =>
        nds.map((n: Node) =>
          n.id === nodeId ? { ...n, data: { ...n.data, operation } } : n
        )
      );
      setTimeout(() => reEvaluate(), 0);
    },
    [setNodes, reEvaluate]
  );

  const handleFormulaChange = useCallback(
    (nodeId: string, formula: string) => {
      setNodes((nds: Node[]) =>
        nds.map((n: Node) =>
          n.id === nodeId ? { ...n, data: { ...n.data, formula } } : n
        )
      );
      setTimeout(() => reEvaluate(), 0);
    },
    [setNodes, reEvaluate]
  );

  // Inject callbacks into nodes
  useEffect(() => {
    setNodes((nds: Node[]) =>
      nds.map((n: Node) => {
        if (n.type === 'numberNode') {
          return { ...n, data: { ...n.data, onChange: handleNumberChange } };
        }
        if (n.type === 'operationNode') {
          return {
            ...n,
            data: { ...n.data, onOperationChange: handleOperationChange },
          };
        }
        if (n.type === 'formulaNode') {
          return {
            ...n,
            data: { ...n.data, onFormulaChange: handleFormulaChange },
          };
        }
        return n;
      })
    );
  }, [setNodes, handleNumberChange, handleOperationChange, handleFormulaChange]);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      setEdges((eds: Edge[]) =>
        addEdge(
          { ...params, animated: true, style: { stroke: '#a3a3a3', strokeWidth: 2 } },
          eds
        )
      );
    },
    [setEdges]
  );

  // Notify parent of changes
  useEffect(() => {
    onNodesUpdate?.(nodes);
  }, [nodes, onNodesUpdate]);

  useEffect(() => {
    onEdgesUpdate?.(edges);
  }, [edges, onEdgesUpdate]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        className="bg-white"
        deleteKeyCode={['Backspace', 'Delete']}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#a3a3a3', strokeWidth: 2 },
        }}
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
