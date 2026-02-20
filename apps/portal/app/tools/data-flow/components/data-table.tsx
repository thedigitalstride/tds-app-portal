'use client';

import { useMemo, useRef, useCallback, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type ColumnState,
  type GridReadyEvent,
  type SelectionChangedEvent,
  type GridApi,
  themeQuartz,
} from 'ag-grid-community';
import { Table2 } from 'lucide-react';
import type { GenericRow, TableLayout } from './types';

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

export interface FieldDef {
  key: string;
  label: string;
}

interface DataTableProps {
  rows: GenericRow[];
  fieldDefs: FieldDef[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: string[]) => void;
  layout: TableLayout;
  hiddenColumns?: string[];
  quickFilterText?: string;
  columnState?: Record<string, unknown>[];
  filterModel?: Record<string, Record<string, unknown>>;
  onColumnStateChange?: (state: Record<string, unknown>[]) => void;
  onFilterModelChange?: (model: Record<string, Record<string, unknown>>) => void;
}

// --- Dynamic field derivation utilities ---

/** Convert snake_case / camelCase keys to Title Case labels */
export function humaniseKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Derive field definitions from a set of GenericRows, excluding _-prefixed meta-fields and id */
export function deriveFieldDefs(rows: GenericRow[]): FieldDef[] {
  const seen = new Set<string>();
  const defs: FieldDef[] = [];

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (key === 'id' || key.startsWith('_') || seen.has(key)) continue;
      seen.add(key);
      defs.push({ key, label: humaniseKey(key) });
    }
  }

  return defs;
}

// --- Smart cell formatting ---

const DATE_KEYS = new Set(['date_start', 'date_stop', 'date', 'start_date', 'end_date']);
const CURRENCY_KEYS = new Set(['spend', 'cost', 'budget', 'revenue', 'amount']);

function isISODateTime(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value);
}

export function formatCellValue(key: string, value: unknown): string {
  if (value == null) return '-';

  // Date-only fields (YYYY-MM-DD) → en-GB medium date
  if (DATE_KEYS.has(key) && typeof value === 'string') {
    const d = new Date(value + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { dateStyle: 'medium' });
    }
  }

  // ISO datetime strings → en-GB date+time
  if (isISODateTime(value)) {
    const d = new Date(value as string);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
    }
  }

  // Currency/spend fields → £X.XX
  if (CURRENCY_KEYS.has(key)) {
    const num = Number(value);
    if (!isNaN(num)) {
      return `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  // Numeric strings → locale-formatted
  if (typeof value === 'number') {
    return value.toLocaleString('en-GB');
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value).toLocaleString('en-GB');
  }

  return String(value);
}

// --- Badge cell renderers (used for known pipeline fields) ---

function StatusCellRenderer(params: { value: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-neutral-100 text-neutral-600',
    error: 'bg-red-100 text-red-700',
  };
  if (!colors[params.value]) return <span>{params.value}</span>;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[params.value]}`}
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
  if (!colors[params.value]) return <span>{params.value}</span>;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[params.value]}`}
    >
      {params.value}
    </span>
  );
}

// Known cell renderer overrides for specific field keys
const CELL_RENDERERS: Record<string, (params: { value: string }) => React.ReactNode> = {
  status: StatusCellRenderer,
  type: TypeCellRenderer,
};

// --- Rows mode grid ---

function RowsGrid({
  rows,
  fieldDefs,
  selectedIds,
  onSelectionChange,
  hiddenColumns,
  quickFilterText,
  columnState,
  filterModel,
  onColumnStateChange,
  onFilterModelChange,
}: {
  rows: GenericRow[];
  fieldDefs: FieldDef[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: string[]) => void;
  hiddenColumns?: string[];
  quickFilterText?: string;
  columnState?: Record<string, unknown>[];
  filterModel?: Record<string, Record<string, unknown>>;
  onColumnStateChange?: (state: Record<string, unknown>[]) => void;
  onFilterModelChange?: (model: Record<string, Record<string, unknown>>) => void;
}) {
  const gridRef = useRef<AgGridReact>(null);
  const apiRef = useRef<GridApi | null>(null);
  const isExternalUpdate = useRef(false);

  const allColumnDefs = useMemo<ColDef<GenericRow>[]>(() => {
    const cols: ColDef<GenericRow>[] = [
      {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 50,
        pinned: 'left',
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
      },
    ];

    for (const fd of fieldDefs) {
      const col: ColDef<GenericRow> = {
        field: fd.key,
        headerName: fd.label,
        flex: 1,
        minWidth: 120,
        filter: true,
        valueFormatter: (params) => formatCellValue(fd.key, params.value),
      };

      // Apply known cell renderers
      const renderer = CELL_RENDERERS[fd.key];
      if (renderer) {
        col.cellRenderer = renderer;
        // Remove value formatter when using cell renderer — the renderer handles display
        delete col.valueFormatter;
      }

      // Numeric columns
      if (CURRENCY_KEYS.has(fd.key) || fd.key === 'records') {
        col.type = 'numericColumn';
      }

      cols.push(col);
    }

    return cols;
  }, [fieldDefs]);

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
          if (node.data && selectedIds.has((node.data as GenericRow).id)) {
            node.setSelected(true);
          }
        });
        isExternalUpdate.current = false;
      }
      // Restore saved column state (order, width, sort, pinning)
      if (columnState?.length) {
        params.api.applyColumnState({ state: columnState as unknown as ColumnState[] });
      }
      // Restore saved filter model
      if (filterModel && Object.keys(filterModel).length) {
        params.api.setFilterModel(filterModel);
      }
    },
    [selectedIds, columnState, filterModel]
  );

  const onSelectionChanged = useCallback(
    (event: SelectionChangedEvent) => {
      if (isExternalUpdate.current) return;
      const selectedRows = event.api.getSelectedRows() as GenericRow[];
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
      const shouldBeSelected = selectedIds.has((node.data as GenericRow).id);
      if (node.isSelected() !== shouldBeSelected) {
        node.setSelected(shouldBeSelected);
      }
    });
    isExternalUpdate.current = false;
  }, [selectedIds]);

  const handleColumnStateChanged = useCallback(() => {
    if (!apiRef.current || !onColumnStateChange) return;
    const state = apiRef.current.getColumnState();
    onColumnStateChange(state as unknown as Record<string, unknown>[]);
  }, [onColumnStateChange]);

  const handleFilterChanged = useCallback(() => {
    if (!apiRef.current || !onFilterModelChange) return;
    const model = apiRef.current.getFilterModel();
    onFilterModelChange(model as Record<string, Record<string, unknown>>);
  }, [onFilterModelChange]);

  return (
    <AgGridReact<GenericRow>
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
      maintainColumnOrder
      onDragStopped={handleColumnStateChanged}
      onColumnResized={(e) => { if (e.finished) handleColumnStateChanged(); }}
      onSortChanged={handleColumnStateChanged}
      onFilterChanged={handleFilterChanged}
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

function ColumnsGrid({
  rows,
  fieldDefs,
  hiddenColumns,
}: {
  rows: GenericRow[];
  fieldDefs: FieldDef[];
  hiddenColumns?: string[];
}) {
  // Group rows by _nodeId for multi-row sources
  const groupedSources = useMemo(() => {
    const map = new Map<string, { label: string; rows: GenericRow[] }>();
    for (const row of rows) {
      const nodeId = row._nodeId;
      if (!map.has(nodeId)) {
        map.set(nodeId, { label: row._nodeLabel as string, rows: [] });
      }
      map.get(nodeId)!.rows.push(row);
    }
    return map;
  }, [rows]);

  const columnDefs = useMemo<ColDef<TransposedRow>[]>(() => {
    const cols: ColDef<TransposedRow>[] = [
      {
        field: 'field',
        headerName: 'Field',
        pinned: 'left',
        width: 140,
        cellStyle: { fontWeight: 500 },
      },
    ];

    for (const [nodeId, group] of groupedSources) {
      cols.push({
        field: nodeId,
        headerName: group.label,
        flex: 1,
        minWidth: 150,
      });
    }

    return cols;
  }, [groupedSources]);

  const visibleFieldDefs = useMemo(() => {
    if (!hiddenColumns?.length) return fieldDefs;
    const hiddenSet = new Set(hiddenColumns);
    return fieldDefs.filter((f) => !hiddenSet.has(f.key));
  }, [fieldDefs, hiddenColumns]);

  const rowData = useMemo<TransposedRow[]>(() => {
    return visibleFieldDefs.map(({ key, label }) => {
      const row: TransposedRow = {
        field: label,
        fieldKey: key,
      };

      for (const [nodeId, group] of groupedSources) {
        if (group.rows.length === 1) {
          // Single-row source — show the value directly
          row[nodeId] = formatCellValue(key, group.rows[0][key]);
        } else {
          // Multi-row source — summarise
          const values = group.rows.map((r) => r[key]).filter((v) => v != null);
          if (values.length === 0) {
            row[nodeId] = '-';
          } else if (values.every((v) => !isNaN(Number(v)))) {
            // Numeric: show sum
            const sum = values.reduce<number>((acc, v) => acc + Number(v), 0);
            row[nodeId] = `Σ ${formatCellValue(key, sum)}`;
          } else {
            // Non-numeric: show count of unique values
            const unique = new Set(values.map(String));
            row[nodeId] = `${unique.size} unique`;
          }
        }
      }

      return row;
    });
  }, [groupedSources, visibleFieldDefs]);

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
  fieldDefs,
  selectedIds,
  onSelectionChange,
  layout,
  hiddenColumns,
  quickFilterText,
  columnState,
  filterModel,
  onColumnStateChange,
  onFilterModelChange,
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
          fieldDefs={fieldDefs}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
          hiddenColumns={hiddenColumns}
          quickFilterText={quickFilterText}
          columnState={columnState}
          filterModel={filterModel}
          onColumnStateChange={onColumnStateChange}
          onFilterModelChange={onFilterModelChange}
        />
      ) : (
        <ColumnsGrid rows={rows} fieldDefs={fieldDefs} hiddenColumns={hiddenColumns} />
      )}
    </div>
  );
}
