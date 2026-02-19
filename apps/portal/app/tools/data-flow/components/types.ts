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
