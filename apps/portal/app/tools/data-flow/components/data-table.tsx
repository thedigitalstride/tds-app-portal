'use client';

import { useMemo, useRef, useCallback, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridReadyEvent,
  type SelectionChangedEvent,
  type GridApi,
  themeQuartz,
} from 'ag-grid-community';
import type { DataRow } from './types';

ModuleRegistry.registerModules([AllCommunityModule]);

const customTheme = themeQuartz.withParams({
  accentColor: '#3b82f6',
  borderRadius: 6,
  headerBackgroundColor: '#f5f5f5',
  headerTextColor: '#525252',
  rowHoverColor: '#eff6ff',
  selectedRowBackgroundColor: '#dbeafe',
  fontSize: 13,
});

interface DataTableProps {
  rows: DataRow[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: string[]) => void;
}

function StatusCellRenderer(params: { value: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-neutral-100 text-neutral-600',
    error: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[params.value] || ''}`}
    >
      {params.value}
    </span>
  );
}

function TypeCellRenderer(params: { value: string }) {
  const colors: Record<string, string> = {
    source: 'bg-blue-100 text-blue-700',
    transform: 'bg-amber-100 text-amber-700',
    math: 'bg-violet-100 text-violet-700',
    destination: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[params.value] || ''}`}
    >
      {params.value}
    </span>
  );
}

export function DataTable({
  rows,
  selectedIds,
  onSelectionChange,
}: DataTableProps) {
  const gridRef = useRef<AgGridReact>(null);
  const apiRef = useRef<GridApi | null>(null);
  const isExternalUpdate = useRef(false);

  const columnDefs = useMemo<ColDef<DataRow>[]>(
    () => [
      {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 50,
        pinned: 'left',
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
      },
      {
        field: 'label',
        headerName: 'Name',
        flex: 1,
        minWidth: 150,
        filter: true,
      },
      {
        field: 'type',
        headerName: 'Type',
        width: 130,
        cellRenderer: TypeCellRenderer,
        filter: true,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        cellRenderer: StatusCellRenderer,
        filter: true,
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 2,
        minWidth: 200,
      },
      {
        field: 'records',
        headerName: 'Records',
        width: 120,
        valueFormatter: (params) =>
          params.value != null ? params.value.toLocaleString() : '-',
        type: 'numericColumn',
      },
      {
        headerName: 'Math Op',
        width: 110,
        valueGetter: (params) => {
          const row = params.data as DataRow | undefined;
          if (!row || row.type !== 'math') return null;
          const symbols: Record<string, string> = {
            '+': '+', '-': '\u2212', '*': '\u00d7', '/': '\u00f7', '^': '^', '%': '%',
          };
          return row.formula
            ? `fx: ${row.formula}`
            : `${symbols[row.operation || '*'] || row.operation} ${row.operand ?? ''}`;
        },
        cellRenderer: (params: { value: string | null }) =>
          params.value ? (
            <span className="font-mono text-xs text-violet-600">
              {params.value}
            </span>
          ) : (
            <span className="text-neutral-300">\u2014</span>
          ),
      },
      {
        field: 'lastRun',
        headerName: 'Last Run',
        width: 180,
        valueFormatter: (params) =>
          params.value
            ? new Date(params.value).toLocaleString('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : '-',
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

  const onGridReady = useCallback(
    (params: GridReadyEvent) => {
      apiRef.current = params.api;
      // Apply initial selection
      if (selectedIds.size > 0) {
        isExternalUpdate.current = true;
        params.api.forEachNode((node) => {
          if (node.data && selectedIds.has(node.data.id)) {
            node.setSelected(true);
          }
        });
        isExternalUpdate.current = false;
      }
    },
    [selectedIds]
  );

  const onSelectionChanged = useCallback(
    (event: SelectionChangedEvent) => {
      if (isExternalUpdate.current) return;
      const selectedRows = event.api.getSelectedRows() as DataRow[];
      onSelectionChange(selectedRows.map((r) => r.id));
    },
    [onSelectionChange]
  );

  // Sync external selection changes into the grid
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    isExternalUpdate.current = true;
    api.forEachNode((node) => {
      if (!node.data) return;
      const shouldBeSelected = selectedIds.has(node.data.id);
      if (node.isSelected() !== shouldBeSelected) {
        node.setSelected(shouldBeSelected);
      }
    });
    isExternalUpdate.current = false;
  }, [selectedIds]);

  return (
    <div className="w-full h-full">
      <AgGridReact<DataRow>
        ref={gridRef}
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        theme={customTheme}
        rowSelection="multiple"
        suppressRowClickSelection={false}
        onGridReady={onGridReady}
        onSelectionChanged={onSelectionChanged}
        getRowId={(params) => params.data.id}
        animateRows
        pagination={false}
      />
    </div>
  );
}
