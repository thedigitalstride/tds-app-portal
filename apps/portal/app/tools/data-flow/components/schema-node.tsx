'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Filter } from 'lucide-react';
import { SCHEMA_HANDLE_FILTERED, SCHEMA_HANDLE_ALL } from './types';
import type { SchemaNodeType } from './types';

function SchemaNodeComponent({ data, selected }: NodeProps<SchemaNodeType>) {
  const { label, availableFields, selectedFields, fieldAliases } = data;

  const filteredCount = selectedFields.length;
  const totalCount = availableFields.length;
  const aliasCount = fieldAliases ? Object.keys(fieldAliases).length : 0;

  return (
    <div
      className={`rounded-lg border-2 pl-4 pr-20 py-3 shadow-sm transition-all min-w-[180px] ${
        selected
          ? 'border-teal-500 bg-teal-100 ring-2 ring-teal-300'
          : 'border-teal-400 bg-teal-50'
      }`}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-teal-400 !border-2 !border-white"
      />

      {/* Filtered output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id={SCHEMA_HANDLE_FILTERED}
        style={{ top: '33%' }}
        className="!w-3 !h-3 !bg-teal-500 !border-2 !border-white"
      />

      {/* All output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id={SCHEMA_HANDLE_ALL}
        style={{ top: '66%' }}
        className="!w-3 !h-3 !bg-teal-300 !border-2 !border-white"
      />

      {/* Handle labels */}
      <div className="absolute right-5 text-[9px] font-medium text-teal-600" style={{ top: 'calc(33% - 6px)' }}>
        Filtered ({filteredCount})
      </div>
      <div className="absolute right-5 text-[9px] font-medium text-teal-400" style={{ top: 'calc(66% - 6px)' }}>
        All ({totalCount})
      </div>

      {/* Header */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-teal-600 shrink-0" />
        <span className="font-semibold text-sm text-neutral-800 truncate">
          {label}
        </span>
      </div>

      {/* Field count badge or empty state */}
      {availableFields.length === 0 ? (
        <p className="text-xs text-neutral-400 mt-1.5 italic">Connect a data source</p>
      ) : (
        <div className="mt-1.5 flex items-center gap-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-200/60 text-teal-700 font-medium">
            {filteredCount}/{totalCount} fields
          </span>
          {aliasCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-600 font-medium">
              {aliasCount} renamed
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export const SchemaNode = memo(SchemaNodeComponent);
