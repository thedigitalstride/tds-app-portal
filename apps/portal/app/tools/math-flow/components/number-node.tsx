'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Hash } from 'lucide-react';

export interface NumberNodeData {
  label: string;
  value: number;
  onChange: (nodeId: string, value: number) => void;
  computedValue?: number;
  [key: string]: unknown;
}

function NumberNodeComponent({ id, data, selected }: NodeProps) {
  const { label, value, onChange } = data as unknown as NumberNodeData;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      onChange(id, isNaN(val) ? 0 : val);
    },
    [id, onChange]
  );

  return (
    <div
      className={`rounded-lg border-2 px-4 py-3 shadow-sm transition-all min-w-[160px] ${
        selected
          ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-300'
          : 'border-blue-300 bg-blue-50'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Hash className="w-4 h-4 text-blue-600" />
        <span className="font-semibold text-sm text-neutral-800">{label}</span>
      </div>

      <input
        type="number"
        value={value}
        onChange={handleChange}
        className="w-full px-2 py-1.5 text-sm rounded-md border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-right font-mono nodrag"
        step="any"
      />

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
      />
    </div>
  );
}

export const NumberNode = memo(NumberNodeComponent);
