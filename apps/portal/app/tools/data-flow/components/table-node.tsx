'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Table2 } from 'lucide-react';
import type { TableNodeType } from './types';

function TableNodeComponent({ data, selected }: NodeProps<TableNodeType>) {
  const { label, layout, isActive } = data;

  return (
    <div
      className={`rounded-lg border-2 px-4 py-3 shadow-sm transition-all min-w-[180px] ${
        isActive
          ? 'border-violet-500 bg-violet-100 ring-2 ring-violet-300 shadow-violet-200/50 shadow-md'
          : selected
            ? 'border-violet-500 bg-violet-100 ring-2 ring-violet-300'
            : 'border-violet-300 bg-violet-50'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-white"
      />

      <div className="flex items-center gap-2">
        <Table2 className="w-4 h-4 text-violet-600" />
        <span className="font-semibold text-sm text-neutral-800">
          {label}
        </span>
      </div>

      <div className="mt-1.5">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-200/60 text-violet-700 font-medium">
          {layout === 'rows' ? 'Rows' : 'Cols'}
        </span>
      </div>
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
