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
import { Table2 } from 'lucide-react';
import type { DataRow, TableLayout } from './types';

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
  layout: TableLayout;
  hiddenColumns?: string[];
  quickFilterText?: string;
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

// Field definitions for columns (transposed) mode
export const fieldDefs: { key: keyof DataRow; label: string }[] = [
  { key: 'label', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'description', label: 'Description' },
  { key: 'records', label: 'Records' },
  { key: 'lastRun', label: 'Last Run' },
];

function formatFieldValue(key: keyof DataRow, value: unknown): string {
  if (value == null) return '-';
  if (key === 'records' && typeof value === 'number') {
    return value.toLocaleString();
  }
  if (key === 'lastRun' && typeof value === 'string') {
    return new Date(value).toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }
  return String(value);
}

// --- Rows mode grid ---

function RowsGrid({
  rows,
  selectedIds,
  onSelectionChange,
  hiddenColumns,
  quickFilterText,
}: {
  rows: DataRow[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: string[]) => void;
  hiddenColumns?: string[];
  quickFilterText?: string;
}) {
  const gridRef = useRef<AgGridReact>(null);
  const apiRef = useRef<GridApi | null>(null);
  const isExternalUpdate = useRef(false);

  const allColumnDefs = useMemo<ColDef<DataRow>[]>(
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

  const columnDefs = useMemo(() => {
    if (!hiddenColumns?.length) return allColumnDefs;
    const hiddenSet = new Set(hiddenColumns);
    return allColumnDefs.filter((col) => !col.field || !hiddenSet.has(col.field));
  }, [allColumnDefs, hiddenColumns]);

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
    <AgGridReact<DataRow>
      ref={gridRef}
      key="rows-grid"
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
      quickFilterText={quickFilterText || undefined}
    />
  );
}

// --- Columns (transposed) mode grid ---

interface TransposedRow {
  field: string;
  fieldKey: string;
  [nodeId: string]: string;
}

function ColumnsGrid({ rows, hiddenColumns }: { rows: DataRow[]; hiddenColumns?: string[] }) {
  const columnDefs = useMemo<ColDef<TransposedRow>[]>(() => {
    const cols: ColDef<TransposedRow>[] = [
      {
        field: 'field',
        headerName: 'Field',
        pinned: 'left',
        width: 140,
        cellStyle: { fontWeight: 500 },
      },
      ...rows.map((row) => ({
        field: row.id,
        headerName: row.label,
        flex: 1,
        minWidth: 150,
      })),
    ];
    return cols;
  }, [rows]);

  const visibleFieldDefs = useMemo(() => {
    if (!hiddenColumns?.length) return fieldDefs;
    const hiddenSet = new Set(hiddenColumns);
    return fieldDefs.filter((f) => !hiddenSet.has(f.key));
  }, [hiddenColumns]);

  const rowData = useMemo<TransposedRow[]>(() => {
    return visibleFieldDefs.map(({ key, label }) => {
      const row: TransposedRow = {
        field: label,
        fieldKey: key,
      };
      for (const dataRow of rows) {
        row[dataRow.id] = formatFieldValue(key, dataRow[key]);
      }
      return row;
    });
  }, [rows, visibleFieldDefs]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: false,
      resizable: true,
    }),
    []
  );

  return (
    <AgGridReact<TransposedRow>
      key="columns-grid"
      rowData={rowData}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      theme={customTheme}
      getRowId={(params) => params.data.fieldKey}
      pagination={false}
    />
  );
}

// --- Main DataTable component ---

export function DataTable({
  rows,
  selectedIds,
  onSelectionChange,
  layout,
  hiddenColumns,
  quickFilterText,
}: DataTableProps) {
  if (rows.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <Table2 className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">
            Connect nodes to a table node to see data here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {layout === 'rows' ? (
        <RowsGrid
          rows={rows}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
          hiddenColumns={hiddenColumns}
          quickFilterText={quickFilterText}
        />
      ) : (
        <ColumnsGrid rows={rows} hiddenColumns={hiddenColumns} />
      )}
    </div>
  );
}
