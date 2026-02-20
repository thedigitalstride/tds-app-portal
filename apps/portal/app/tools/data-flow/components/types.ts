export interface DataRow {
  id: string;
  label: string;
  type: 'source' | 'transform' | 'destination';
  status: 'active' | 'inactive' | 'error';
  description: string;
  lastRun?: string;
  records?: number;
}

/** Schema-agnostic row — _-prefixed fields are meta (excluded from column generation) */
export interface GenericRow {
  id: string;
  _nodeId: string;
  _nodeLabel: string;
  [key: string]: unknown;
}

export interface FacebookAdRow {
  clicks: string;
  reach: string;
  spend: string;
  date_start: string;
  date_stop: string;
}

export type FacebookAdNodeData = {
  label: string;
  rows: FacebookAdRow[];
  accountName: string;
  campaignCount: number;
};

export interface FlowEdgeData {
  label?: string;
}

// Table node types
export type TableLayout = 'rows' | 'columns';

export type TableNodeData = {
  label: string;
  layout: TableLayout;
  isActive?: boolean;
  hiddenColumns?: string[];   // field keys to hide (e.g. ['records', 'lastRun'])
  hiddenRowIds?: string[];    // node IDs to exclude from the table
  columnState?: Record<string, unknown>[];           // AG Grid column state (order, width, sort, pinning)
  filterModel?: Record<string, Record<string, unknown>>; // AG Grid per-column filter state
};

// Schema node types
export const SCHEMA_HANDLE_FILTERED = 'filtered';
export const SCHEMA_HANDLE_ALL = 'all';

// Join node types
export const JOIN_HANDLE_A = 'a';
export const JOIN_HANDLE_B = 'b';

export type JoinNodeData = {
  label: string;
  joinKey: string;              // e.g. 'date_start'
  joinType: 'inner' | 'full';
  // Derived (injected by page.tsx):
  availableFieldsA: string[];
  availableFieldsB: string[];
  commonFields: string[];       // Intersection of A and B
  matchedCount: number;
};

export type SchemaNodeData = {
  label: string;
  availableFields: string[];
  selectedFields: string[];
  fieldAliases?: Record<string, string>;  // original field name → alias
};

// Typed node variants
import type { Node } from '@xyflow/react';

export type DataNodeType = Node<{ row: DataRow }, 'dataNode'>;
export type TableNodeType = Node<TableNodeData, 'tableNode'>;
export type FacebookAdNodeType = Node<FacebookAdNodeData, 'facebookAdNode'>;
export type SchemaNodeType = Node<SchemaNodeData, 'schemaNode'>;
export type JoinNodeType = Node<JoinNodeData, 'joinNode'>;
export type AppNode = DataNodeType | TableNodeType | FacebookAdNodeType | SchemaNodeType | JoinNodeType;
