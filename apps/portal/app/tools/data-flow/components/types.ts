export type MathOperation = '+' | '-' | '*' | '/' | '^' | '%';

export interface DataRow {
  id: string;
  label: string;
  type: 'source' | 'transform' | 'destination' | 'math';
  status: 'active' | 'inactive' | 'error';
  description: string;
  lastRun?: string;
  records?: number;
  /** Math node fields */
  operation?: MathOperation;
  operand?: number;
  /** Formula string for advanced mode (e.g. "=records * 0.95 + 100") */
  formula?: string;
  /** Computed output from math node */
  outputRecords?: number;
}

export interface FlowEdgeData {
  label?: string;
}
