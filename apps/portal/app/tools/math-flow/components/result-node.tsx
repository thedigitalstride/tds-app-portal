'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CircleDot } from 'lucide-react';

export interface ResultNodeData {
  label: string;
  computedValue?: number;
  [key: string]: unknown;
}

function ResultNodeComponent({ data, selected }: NodeProps) {
  const { label, computedValue } = data as unknown as ResultNodeData;

  const hasValue = computedValue !== undefined && !isNaN(computedValue);
  const displayValue = hasValue
    ? Number.isInteger(computedValue)
      ? computedValue.toString()
      : computedValue.toFixed(4)
    : '...';

  return (
    <div
      className={`rounded-lg border-2 px-4 py-3 shadow-sm transition-all min-w-[160px] ${
        selected
          ? 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-300'
          : 'border-emerald-300 bg-emerald-50'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
      />

      <div className="flex items-center gap-2 mb-2">
        <CircleDot className="w-4 h-4 text-emerald-600" />
        <span className="font-semibold text-sm text-neutral-800">{label}</span>
      </div>

      <div
        className={`text-center font-mono text-2xl font-bold rounded px-3 py-2 ${
          hasValue
            ? 'text-emerald-700 bg-white/60'
            : 'text-neutral-400 bg-white/40'
        }`}
      >
        {displayValue}
      </div>
    </div>
  );
}

export const ResultNode = memo(ResultNodeComponent);
