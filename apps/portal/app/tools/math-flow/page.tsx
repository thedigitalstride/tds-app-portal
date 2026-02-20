'use client';

import { useState, useCallback, useRef } from 'react';
import { ReactFlowProvider, type Node, type Edge } from '@xyflow/react';
import {
  Calculator,
  Hash,
  ArrowRightLeft,
  FunctionSquare,
  CircleDot,
  RotateCcw,
  Download,
  Upload,
} from 'lucide-react';
import { MathCanvas } from './components/math-canvas';
import type { MathOperation } from './components/operation-node';

let nodeIdCounter = 100;
function nextId() {
  return `node-${++nodeIdCounter}`;
}

function buildDefaultFlow(): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    {
      id: 'n1',
      type: 'numberNode',
      position: { x: 50, y: 80 },
      data: { label: 'Value A', value: 10, onChange: () => {} },
    },
    {
      id: 'n2',
      type: 'numberNode',
      position: { x: 50, y: 250 },
      data: { label: 'Value B', value: 5, onChange: () => {} },
    },
    {
      id: 'op1',
      type: 'operationNode',
      position: { x: 320, y: 120 },
      data: {
        label: 'Multiply',
        operation: '*' as MathOperation,
        onOperationChange: () => {},
      },
    },
    {
      id: 'f1',
      type: 'formulaNode',
      position: { x: 320, y: 320 },
      data: {
        label: 'Custom Formula',
        formula: '=A^2 + B',
        onFormulaChange: () => {},
        inputCount: 2,
      },
    },
    {
      id: 'r1',
      type: 'resultNode',
      position: { x: 620, y: 80 },
      data: { label: 'Product' },
    },
    {
      id: 'r2',
      type: 'resultNode',
      position: { x: 620, y: 320 },
      data: { label: 'Formula Result' },
    },
  ];

  const edgeStyle = { stroke: '#a3a3a3', strokeWidth: 2 };
  const edges: Edge[] = [
    {
      id: 'e1',
      source: 'n1',
      target: 'op1',
      targetHandle: 'a',
      animated: true,
      style: edgeStyle,
    },
    {
      id: 'e2',
      source: 'n2',
      target: 'op1',
      targetHandle: 'b',
      animated: true,
      style: edgeStyle,
    },
    {
      id: 'e3',
      source: 'op1',
      target: 'r1',
      animated: true,
      style: edgeStyle,
    },
    {
      id: 'e4',
      source: 'n1',
      target: 'f1',
      targetHandle: 'a',
      animated: true,
      style: edgeStyle,
    },
    {
      id: 'e5',
      source: 'n2',
      target: 'f1',
      targetHandle: 'b',
      animated: true,
      style: edgeStyle,
    },
    {
      id: 'e6',
      source: 'f1',
      target: 'r2',
      animated: true,
      style: edgeStyle,
    },
  ];

  return { nodes, edges };
}

const TOOLBAR_ITEMS = [
  {
    type: 'numberNode',
    label: 'Number',
    icon: Hash,
    color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  {
    type: 'operationNode',
    label: 'Operation',
    icon: ArrowRightLeft,
    color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100',
  },
  {
    type: 'formulaNode',
    label: 'Formula',
    icon: FunctionSquare,
    color: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100',
  },
  {
    type: 'resultNode',
    label: 'Result',
    icon: CircleDot,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
  },
] as const;

export default function MathFlowPage() {
  const [flowKey, setFlowKey] = useState(0);
  const [defaultFlow] = useState(buildDefaultFlow);
  const nodesRef = useRef<Node[]>(defaultFlow.nodes);
  const edgesRef = useRef<Edge[]>(defaultFlow.edges);

  const handleAddNode = useCallback((type: string) => {
    const id = nextId();
    // Place new nodes near center with slight randomness
    const x = 200 + Math.random() * 200;
    const y = 100 + Math.random() * 200;

    let data: Record<string, unknown>;
    switch (type) {
      case 'numberNode':
        data = { label: 'Number', value: 0, onChange: () => {} };
        break;
      case 'operationNode':
        data = {
          label: 'Operation',
          operation: '+',
          onOperationChange: () => {},
        };
        break;
      case 'formulaNode':
        data = {
          label: 'Formula',
          formula: '=A+B',
          onFormulaChange: () => {},
          inputCount: 3,
        };
        break;
      case 'resultNode':
        data = { label: 'Result' };
        break;
      default:
        return;
    }

    const newNode: Node = { id, type, position: { x, y }, data };
    nodesRef.current = [...nodesRef.current, newNode];
    // Force re-render by bumping key
    setFlowKey((k: number) => k + 1);
  }, []);

  const handleReset = useCallback(() => {
    const fresh = buildDefaultFlow();
    nodesRef.current = fresh.nodes;
    edgesRef.current = fresh.edges;
    nodeIdCounter = 100;
    setFlowKey((k: number) => k + 1);
  }, []);

  const handleExport = useCallback(() => {
    const flow = {
      nodes: nodesRef.current.map((n: Node) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: Object.fromEntries(
          Object.entries(n.data).filter(
            ([, v]) => typeof v !== 'function'
          )
        ),
      })),
      edges: edgesRef.current,
    };
    const blob = new Blob([JSON.stringify(flow, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'math-flow.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const flow = JSON.parse(text);
        if (flow.nodes && flow.edges) {
          // Re-inject callback stubs
          nodesRef.current = flow.nodes.map((n: Node) => {
            if (n.type === 'numberNode')
              return { ...n, data: { ...n.data, onChange: () => {} } };
            if (n.type === 'operationNode')
              return {
                ...n,
                data: { ...n.data, onOperationChange: () => {} },
              };
            if (n.type === 'formulaNode')
              return {
                ...n,
                data: { ...n.data, onFormulaChange: () => {} },
              };
            return n;
          });
          edgesRef.current = flow.edges;
          setFlowKey((k: number) => k + 1);
        }
      } catch {
        // Invalid JSON - ignore
      }
    };
    input.click();
  }, []);

  const handleNodesUpdate = useCallback((nodes: Node[]) => {
    nodesRef.current = nodes;
  }, []);

  const handleEdgesUpdate = useCallback((edges: Edge[]) => {
    edgesRef.current = edges;
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-100">
              <Calculator className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-neutral-900">
                Math Flow
              </h1>
              <p className="text-sm text-neutral-500">
                Build formulas visually - connect numbers, operations, and
                functions like a spreadsheet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Import
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Add Node:
          </span>
          {TOOLBAR_ITEMS.map((item) => (
            <button
              key={item.type}
              onClick={() => handleAddNode(item.type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-md transition-colors ${item.color}`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-2 text-xs text-neutral-400">
          Drag to connect handles. Formula nodes use variables A, B, C... for
          inputs. Functions: ABS, ROUND, SQRT, MIN, MAX, POW, SIN, COS, LOG
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <ReactFlowProvider key={flowKey}>
          <MathCanvas
            initialNodes={nodesRef.current}
            initialEdges={edgesRef.current}
            onNodesUpdate={handleNodesUpdate}
            onEdgesUpdate={handleEdgesUpdate}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
