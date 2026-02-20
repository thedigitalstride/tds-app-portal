'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FacebookAdNodeType } from './types';

function FacebookLogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="#1877F2"
      className={className}
      aria-hidden="true"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function FacebookAdNodeComponent({
  data,
  selected,
}: NodeProps<FacebookAdNodeType>) {
  const { label, rows, accountName, campaignCount } = data;

  const totalClicks = rows.reduce((sum, r) => sum + Number(r.clicks), 0);
  const totalSpend = rows.reduce((sum, r) => sum + Number(r.spend), 0);

  return (
    <div
      className={`rounded-lg border-2 px-4 py-3 shadow-sm transition-all min-w-[220px] ${
        selected
          ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-300'
          : 'border-blue-400 bg-blue-50'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
      />

      <div className="flex items-center gap-2">
        <FacebookLogoMark className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-sm text-neutral-800">{label}</span>
      </div>

      <p className="text-xs text-neutral-500 mt-1">{accountName}</p>

      {/* Metrics summary */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div className="text-center">
          <div className="text-xs font-semibold text-neutral-800">
            {totalClicks.toLocaleString('en-GB')}
          </div>
          <div className="text-[10px] text-neutral-400">Clicks</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-semibold text-neutral-800">
            £{totalSpend.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-neutral-400">Spend</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-semibold text-neutral-800">
            {campaignCount}
          </div>
          <div className="text-[10px] text-neutral-400">Campaigns</div>
        </div>
      </div>

      <div className="text-[10px] text-neutral-400 mt-2">
        {rows.length} daily rows
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
      />
    </div>
  );
}

export const FacebookAdNode = memo(FacebookAdNodeComponent);
