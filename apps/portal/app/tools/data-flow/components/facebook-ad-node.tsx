'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Loader2, AlertCircle, Settings } from 'lucide-react';
import type { FacebookAdNodeType, FacebookAdNodeData } from './types';

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

/** Pick the top 3 numeric summary fields, prioritising well-known metrics. */
const PRIORITY_FIELDS = ['spend', 'clicks', 'impressions', 'reach', 'ctr', 'cpc', 'cpm'];

function pickSummaryMetrics(data: FacebookAdNodeData): { label: string; value: string }[] {
  const rows = data.rows ?? [];
  if (rows.length === 0) return [];

  // Gather all numeric field keys
  const numericKeys: string[] = [];
  for (const key of data.fields) {
    const sample = rows[0][key];
    if (sample !== undefined && !isNaN(Number(sample))) {
      numericKeys.push(key);
    }
  }

  // Sort: priority fields first, then alphabetical
  numericKeys.sort((a, b) => {
    const aIdx = PRIORITY_FIELDS.indexOf(a);
    const bIdx = PRIORITY_FIELDS.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });

  const top = numericKeys.slice(0, 3);

  return top.map((key) => {
    const total = rows.reduce((sum, r) => sum + Number(r[key] ?? 0), 0);
    const isCurrency = key === 'spend';
    const isRate = key === 'ctr' || key === 'cpc' || key === 'cpm';

    let formatted: string;
    if (isCurrency) {
      formatted = `£${total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (isRate) {
      // Rates should be averaged, not summed
      const avg = rows.length > 0 ? total / rows.length : 0;
      formatted = avg.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      formatted = total.toLocaleString('en-GB');
    }

    return { label: key.replace(/_/g, ' '), value: formatted };
  });
}

function FacebookAdNodeComponent({
  data,
  selected,
}: NodeProps<FacebookAdNodeType>) {
  const { label, status } = data as FacebookAdNodeData;

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

      {/* Status-based content */}
      {status === 'unconfigured' && (
        <div className="flex items-center gap-2 mt-2 text-neutral-400">
          <Settings className="w-3.5 h-3.5" />
          <span className="text-xs">Configure in drawer</span>
        </div>
      )}

      {status === 'loading' && (
        <div className="flex items-center gap-2 mt-2 text-blue-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-xs">Fetching data…</span>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-2">
          <div className="flex items-center gap-1.5 text-red-500">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs font-medium">Error</span>
          </div>
          {(data as FacebookAdNodeData).error && (
            <p className="text-[10px] text-red-400 mt-0.5 line-clamp-2">
              {(data as FacebookAdNodeData).error}
            </p>
          )}
        </div>
      )}

      {status === 'ready' && (
        <>
          {(data as FacebookAdNodeData).accountName && (
            <p className="text-xs text-neutral-500 mt-1">
              {(data as FacebookAdNodeData).accountName}
            </p>
          )}

          {/* Dynamic summary metrics */}
          {(() => {
            const metrics = pickSummaryMetrics(data as FacebookAdNodeData);
            if (metrics.length === 0) return null;
            return (
              <div className={`grid grid-cols-${metrics.length} gap-2 mt-2`}>
                {metrics.map((m) => (
                  <div key={m.label} className="text-center">
                    <div className="text-xs font-semibold text-neutral-800">{m.value}</div>
                    <div className="text-[10px] text-neutral-400 capitalize">{m.label}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="text-[10px] text-neutral-400 mt-2">
            {(data as FacebookAdNodeData).rowCount ?? (data as FacebookAdNodeData).rows.length} rows
            {(data as FacebookAdNodeData).lastFetchedAt && (
              <span className="ml-1">
                · {new Date((data as FacebookAdNodeData).lastFetchedAt!).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            )}
          </div>
        </>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
      />
    </div>
  );
}

export const FacebookAdNode = memo(FacebookAdNodeComponent);
