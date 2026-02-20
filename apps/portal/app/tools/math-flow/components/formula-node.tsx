'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FunctionSquare } from 'lucide-react';

export interface FormulaNodeData {
  label: string;
  formula: string;
  onFormulaChange: (nodeId: string, formula: string) => void;
  computedValue?: number;
  error?: string | null;
  inputCount: number;
  [key: string]: unknown;
}

const INPUT_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function FormulaNodeComponent({ id, data, selected }: NodeProps) {
  const { label, formula, onFormulaChange, computedValue, error, inputCount } =
    data as unknown as FormulaNodeData;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFormulaChange(id, e.target.value);
    },
    [id, onFormulaChange]
  );

  const displayValue =
    error
      ? 'ERR'
      : computedValue !== undefined && !isNaN(computedValue)
        ? Number.isInteger(computedValue)
          ? computedValue.toString()
          : computedValue.toFixed(4)
        : '...';

  const handles = INPUT_LABELS.slice(0, inputCount);
  const spacing = 100 / (inputCount + 1);

  return (
    <div
      className={`rounded-lg border-2 px-4 py-3 shadow-sm transition-all min-w-[220px] ${
        selected
          ? 'border-purple-500 bg-purple-100 ring-2 ring-purple-300'
          : 'border-purple-300 bg-purple-50'
      }`}
    >
      {/* Dynamic input handles */}
      {handles.map((lbl, i) => (
        <Handle
          key={lbl}
          type="target"
          position={Position.Left}
          id={lbl.toLowerCase()}
          style={{ top: `${spacing * (i + 1)}%` }}
          className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white"
        />
      ))}

      <div className="flex items-center gap-2 mb-2">
        <FunctionSquare className="w-4 h-4 text-purple-600" />
        <span className="font-semibold text-sm text-neutral-800">{label}</span>
      </div>

      {/* Input labels */}
      <div className="flex gap-1 mb-1">
        {handles.map((lbl) => (
          <span
            key={lbl}
            className="text-[10px] font-mono bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded"
          >
            {lbl}
          </span>
        ))}
      </div>

      {/* Formula input */}
      <input
        type="text"
        value={formula}
        onChange={handleChange}
        placeholder="=A*2+B"
        className={`w-full px-2 py-1.5 text-sm rounded-md border bg-white focus:outline-none focus:ring-2 font-mono nodrag ${
          error
            ? 'border-red-300 focus:ring-red-400'
            : 'border-purple-200 focus:ring-purple-400'
        }`}
      />

      {error && (
        <p className="text-[10px] text-red-500 mt-1 truncate" title={error}>
          {error}
        </p>
      )}

      {/* Result */}
      <div
        className={`text-center font-mono text-lg font-bold rounded px-2 py-1 mt-2 ${
          error
            ? 'text-red-600 bg-red-50'
            : 'text-purple-700 bg-white/60'
        }`}
      >
        {displayValue}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white"
      />
    </div>
  );
}

export const FormulaNode = memo(FormulaNodeComponent);
