export interface DataRow {
  id: string;
  label: string;
  type: 'source' | 'transform' | 'destination';
  status: 'active' | 'inactive' | 'error';
  description: string;
  lastRun?: string;
  records?: number;
  /** Identifies the data source for live nodes (e.g. 'tracket') */
  sourceType?: string;
}

export interface FlowEdgeData {
  label?: string;
}

export interface TracketTimeEntry {
  id: string;
  date: string;
  hours: number;
  minutes: number;
  note: string;
  userName?: string;
  itemName?: string;
  boardName?: string;
  billable?: boolean;
  categoryName?: string;
}

export interface TracketSummary {
  totalEntries: number;
  totalHours: number;
  totalMinutes: number;
  from: string;
  to: string;
}
