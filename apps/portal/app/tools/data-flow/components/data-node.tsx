'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Database, ArrowRightLeft, HardDrive, AlertCircle, Clock } from 'lucide-react';
import type { DataRow } from './types';

const typeConfig = {
  source: {
    icon: Database,
    color: 'border-blue-300 bg-blue-50',
    selectedColor: 'border-blue-500 bg-blue-100 ring-2 ring-blue-300',
    iconColor: 'text-blue-600',
    label: 'Source',
  },
  transform: {
    icon: ArrowRightLeft,
    color: 'border-amber-300 bg-amber-50',
    selectedColor: 'border-amber-500 bg-amber-100 ring-2 ring-amber-300',
    iconColor: 'text-amber-600',
    label: 'Transform',
  },
  destination: {
    icon: HardDrive,
    color: 'border-emerald-300 bg-emerald-50',
    selectedColor: 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-300',
    iconColor: 'text-emerald-600',
    label: 'Destination',
  },
};

/** Override config for specific source integrations */
const sourceTypeConfig: Record<string, typeof typeConfig.source> = {
  tracket: {
    icon: Clock,
    color: 'border-violet-300 bg-violet-50',
    selectedColor: 'border-violet-500 bg-violet-100 ring-2 ring-violet-300',
    iconColor: 'text-violet-600',
    label: 'Tracket',
  },
};

const statusDot: Record<DataRow['status'], string> = {
  active: 'bg-emerald-500',
  inactive: 'bg-neutral-400',
  error: 'bg-red-500',
};

function DataNodeComponent({ data, selected }: NodeProps) {
  const row = data.row as DataRow;
  const config =
    row.sourceType && sourceTypeConfig[row.sourceType]
      ? sourceTypeConfig[row.sourceType]
      : typeConfig[row.type];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-lg border-2 px-4 py-3 shadow-sm transition-all min-w-[180px] ${
        selected ? config.selectedColor : config.color
      }`}
    >
      {row.type !== 'source' && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-neutral-400 !border-2 !border-white"
        />
      )}

      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
        <span className="font-semibold text-sm text-neutral-800">
          {row.label}
        </span>
        <span className={`w-2 h-2 rounded-full ml-auto ${statusDot[row.status]}`} />
      </div>

      <p className="text-xs text-neutral-500 mt-1 leading-tight">
        {row.description}
      </p>

      {row.status === 'error' && (
        <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
          <span>Error detected</span>
        </div>
      )}

      {row.records !== undefined && (
        <div className="text-xs text-neutral-400 mt-1">
          {row.records.toLocaleString()} records
        </div>
      )}

      {row.type !== 'destination' && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-neutral-400 !border-2 !border-white"
        />
      )}
    </div>
  );
}

export const DataNode = memo(DataNodeComponent);
