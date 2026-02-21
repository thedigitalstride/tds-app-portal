'use client';

import { useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridReadyEvent,
  themeQuartz,
} from 'ag-grid-community';
import type { TracketTimeEntry, TracketSummary } from './types';
import { Clock, Loader2, AlertCircle } from 'lucide-react';

ModuleRegistry.registerModules([AllCommunityModule]);

const customTheme = themeQuartz.withParams({
  accentColor: '#7c3aed',
  borderRadius: 6,
  headerBackgroundColor: '#f5f3ff',
  headerTextColor: '#525252',
  rowHoverColor: '#f5f3ff',
  selectedRowBackgroundColor: '#ede9fe',
  fontSize: 13,
});

interface TracketTableProps {
  entries: TracketTimeEntry[];
  summary: TracketSummary | null;
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
  from: string;
  to: string;
  onDateChange: (from: string, to: string) => void;
  onRefresh: () => void;
}

function formatDuration(hours: number, minutes: number): string {
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.length > 0 ? parts.join(' ') : '0m';
}

function DurationCellRenderer(params: {
  data: TracketTimeEntry;
}) {
  if (!params.data) return null;
  return (
    <span className="font-mono text-sm">
      {formatDuration(params.data.hours, params.data.minutes)}
    </span>
  );
}

function NoteCellRenderer(params: { value: string }) {
  if (!params.value) {
    return <span className="text-neutral-400 italic">No note</span>;
  }
  return (
    <span className="text-sm" title={params.value}>
      {params.value}
    </span>
  );
}

export function TracketTable({
  entries,
  summary,
  isLoading,
  error,
  isConfigured,
  from,
  to,
  onDateChange,
  onRefresh,
}: TracketTableProps) {
  const gridRef = useRef<AgGridReact>(null);

  const columnDefs = useMemo<ColDef<TracketTimeEntry>[]>(
    () => [
      {
        field: 'date',
        headerName: 'Date',
        width: 130,
        sort: 'desc',
        valueFormatter: (params) =>
          params.value
            ? new Date(params.value).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '-',
      },
      {
        headerName: 'Duration',
        width: 110,
        cellRenderer: DurationCellRenderer,
        valueGetter: (params) =>
          params.data ? params.data.hours * 60 + params.data.minutes : 0,
        type: 'numericColumn',
      },
      {
        field: 'note',
        headerName: 'Notes',
        flex: 2,
        minWidth: 250,
        cellRenderer: NoteCellRenderer,
        filter: true,
      },
      {
        field: 'userName',
        headerName: 'User',
        width: 150,
        filter: true,
      },
      {
        field: 'itemName',
        headerName: 'Task',
        flex: 1,
        minWidth: 180,
        filter: true,
      },
      {
        field: 'boardName',
        headerName: 'Board',
        width: 160,
        filter: true,
      },
      {
        field: 'billable',
        headerName: 'Billable',
        width: 100,
        valueFormatter: (params) =>
          params.value === true ? 'Yes' : params.value === false ? 'No' : '-',
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
    }),
    []
  );

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  // Not configured state
  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-3 py-12">
        <AlertCircle className="w-8 h-8 text-neutral-400" />
        <p className="text-sm font-medium">Tracket not configured</p>
        <p className="text-xs text-neutral-400 max-w-sm text-center">
          Add <code className="bg-neutral-100 px-1 rounded">TRACKET_CLIENT_ID</code> and{' '}
          <code className="bg-neutral-100 px-1 rounded">TRACKET_CLIENT_SECRET</code> to
          your environment variables.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls bar */}
      <div className="flex items-center gap-4 px-1 pb-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => onDateChange(e.target.value, to)}
            className="text-sm border border-neutral-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => onDateChange(from, e.target.value)}
            className="text-sm border border-neutral-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50 px-2 py-1 rounded hover:bg-violet-50 transition-colors"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>

        {/* Summary stats */}
        {summary && !isLoading && (
          <div className="ml-auto flex items-center gap-4 text-xs text-neutral-500">
            <span>
              <strong className="text-neutral-700">{summary.totalEntries}</strong>{' '}
              entries
            </span>
            <span>
              <strong className="text-neutral-700">
                {formatDuration(summary.totalHours, summary.totalMinutes)}
              </strong>{' '}
              total
            </span>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && entries.length === 0 && (
        <div className="flex items-center justify-center h-full gap-2 text-neutral-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Fetching time entries from Tracket...</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-2 py-8">
          <Clock className="w-6 h-6 text-neutral-400" />
          <p className="text-sm">No time entries found for this date range</p>
        </div>
      )}

      {/* Data grid */}
      {entries.length > 0 && (
        <div className="flex-1 min-h-0">
          <AgGridReact<TracketTimeEntry>
            ref={gridRef}
            rowData={entries}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            theme={customTheme}
            onGridReady={onGridReady}
            getRowId={(params) => params.data.id}
            animateRows
            pagination
            paginationPageSize={50}
          />
        </div>
      )}
    </div>
  );
}
