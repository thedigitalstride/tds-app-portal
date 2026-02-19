'use client';

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Table2 } from 'lucide-react';
import type { TableNodeType } from './types';

function TableNodeComponent({ id, data, selected }: NodeProps<TableNodeType>) {
  const { label, layout, isActive, onLayoutChange, onLabelChange } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);

  const commitEdit = () => {
    const trimmed = editValue.trim();
    onLabelChange(id, trimmed || label);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditValue(label);
    setIsEditing(false);
  };

  return (
    <div
      className={`rounded-lg border-2 px-4 py-3 shadow-sm transition-all min-w-[200px] ${
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
        {isEditing ? (
          <input
            className="nodrag nopan font-semibold text-sm text-neutral-800 bg-white border border-violet-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-violet-400 w-full"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            onBlur={commitEdit}
            onFocus={(e) => e.target.select()}
            autoFocus
          />
        ) : (
          <span
            className="font-semibold text-sm text-neutral-800 cursor-text"
            onDoubleClick={() => {
              setEditValue(label);
              setIsEditing(true);
            }}
          >
            {label}
          </span>
        )}
      </div>

      <div className="flex gap-1 mt-2 nodrag nopan">
        <ToggleButton
          active={layout === 'rows'}
          onClick={() => onLayoutChange(id, 'rows')}
        >
          Rows
        </ToggleButton>
        <ToggleButton
          active={layout === 'columns'}
          onClick={() => onLayoutChange(id, 'columns')}
        >
          Cols
        </ToggleButton>
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
        active
          ? 'bg-violet-600 text-white'
          : 'bg-violet-200/60 text-violet-700 hover:bg-violet-200'
      }`}
    >
      {children}
    </button>
  );
}

export const TableNode = memo(TableNodeComponent);
