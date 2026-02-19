export interface DataRow {
  id: string;
  label: string;
  type: 'source' | 'transform' | 'destination';
  status: 'active' | 'inactive' | 'error';
  description: string;
  lastRun?: string;
  records?: number;
}

export interface FlowEdgeData {
  label?: string;
}

// Table node types
export type TableLayout = 'rows' | 'columns';

export type TableNodeData = {
  label: string;
  layout: TableLayout;
  isActive?: boolean;
  onLayoutChange: (nodeId: string, layout: TableLayout) => void;
  onLabelChange: (nodeId: string, label: string) => void;
  hiddenColumns?: string[];   // field keys to hide (e.g. ['records', 'lastRun'])
  hiddenRowIds?: string[];    // node IDs to exclude from the table
};

// Typed node variants
import type { Node } from '@xyflow/react';

export type DataNodeType = Node<{ row: DataRow }, 'dataNode'>;
export type TableNodeType = Node<TableNodeData, 'tableNode'>;
export type AppNode = DataNodeType | TableNodeType;
