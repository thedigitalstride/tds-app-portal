'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Merge } from 'lucide-react';
import { JOIN_HANDLE_A, JOIN_HANDLE_B } from './types';
import type { JoinNodeType } from './types';

function JoinNodeComponent({ data, selected }: NodeProps<JoinNodeType>) {
  const { label, joinKey, joinType, commonFields, matchedCount } = data;

  const hasConfig = joinKey !== '' && commonFields.length > 0;

  return (
    <div
      className={`rounded-lg border-2 pl-4 pr-20 py-3 shadow-sm transition-all min-w-[180px] ${
        selected
          ? 'border-amber-500 bg-amber-100 ring-2 ring-amber-300'
          : 'border-amber-400 bg-amber-50'
      }`}
    >
      {/* Input handle A (top) */}
      <Handle
        type="target"
        position={Position.Left}
        id={JOIN_HANDLE_A}
        style={{ top: '33%' }}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
      />

      {/* Input handle B (bottom) */}
      <Handle
        type="target"
        position={Position.Left}
        id={JOIN_HANDLE_B}
        style={{ top: '66%' }}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white"
      />

      {/* Handle labels */}
      <div className="absolute left-2 text-[9px] font-medium text-amber-600" style={{ top: 'calc(33% - 6px)' }}>
        A
      </div>
      <div className="absolute left-2 text-[9px] font-medium text-amber-600" style={{ top: 'calc(66% - 6px)' }}>
        B
      </div>

      {/* Header */}
      <div className="flex items-center gap-2">
        <Merge className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="font-semibold text-sm text-neutral-800 truncate">
          {label}
        </span>
      </div>

      {/* Status */}
      {!hasConfig ? (
        <p className="text-xs text-neutral-400 mt-1.5 italic">Connect two data sources</p>
      ) : (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-700 font-medium">
            {joinType === 'inner' ? 'Inner' : 'Full'}
          </span>
          <span className="text-[10px] text-amber-600">
            on <span className="font-medium">{joinKey}</span>
          </span>
          <span className="text-[10px] text-neutral-400">
            ({matchedCount} row{matchedCount !== 1 ? 's' : ''})
          </span>
        </div>
      )}
    </div>
  );
}

export const JoinNode = memo(JoinNodeComponent);
