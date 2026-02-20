'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ArrowRightLeft } from 'lucide-react';

export type MathOperation = '+' | '-' | '*' | '/' | '^' | '%';

export const OPERATIONS: { value: MathOperation; label: string; description: string }[] = [
  { value: '+', label: '+', description: 'Add' },
  { value: '-', label: '-', description: 'Subtract' },
  { value: '*', label: '\u00d7', description: 'Multiply' },
  { value: '/', label: '\u00f7', description: 'Divide' },
  { value: '^', label: '^', description: 'Power' },
  { value: '%', label: '%', description: 'Modulo' },
];

export interface OperationNodeData {
  label: string;
  operation: MathOperation;
  onOperationChange: (nodeId: string, op: MathOperation) => void;
  computedValue?: number;
  [key: string]: unknown;
}

function OperationNodeComponent({ id, data, selected }: NodeProps) {
  const { label, operation, onOperationChange, computedValue } =
    data as unknown as OperationNodeData;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onOperationChange(id, e.target.value as MathOperation);
    },
    [id, onOperationChange]
  );

  const displayValue =
    computedValue !== undefined && !isNaN(computedValue)
      ? Number.isInteger(computedValue)
        ? computedValue.toString()
        : computedValue.toFixed(4)
      : '...';

  return (
    <div
      className={`rounded-lg border-2 px-4 py-3 shadow-sm transition-all min-w-[180px] ${
        selected
          ? 'border-amber-500 bg-amber-100 ring-2 ring-amber-300'
          : 'border-amber-300 bg-amber-50'
      }`}
    >
      {/* Input A (top-left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="a"
        style={{ top: '30%' }}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white"
      />
      {/* Input B (bottom-left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="b"
        style={{ top: '70%' }}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white"
      />

      <div className="flex items-center gap-2 mb-2">
        <ArrowRightLeft className="w-4 h-4 text-amber-600" />
        <span className="font-semibold text-sm text-neutral-800">{label}</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-neutral-500 w-6">A</span>
        <select
          value={operation}
          onChange={handleChange}
          className="flex-1 px-2 py-1 text-sm rounded-md border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono nodrag cursor-pointer"
        >
          {OPERATIONS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label} {op.description}
            </option>
          ))}
        </select>
        <span className="text-xs text-neutral-500 w-6 text-right">B</span>
      </div>

      <div className="text-center font-mono text-lg font-bold text-amber-700 bg-white/60 rounded px-2 py-1">
        {displayValue}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white"
      />
    </div>
  );
}

export const OperationNode = memo(OperationNodeComponent);
