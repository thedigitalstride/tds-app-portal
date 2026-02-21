import type { Node, Edge } from '@xyflow/react';
import type {
  DataRow,
  TableNodeData,
  TableNodeType,
  FacebookAdNodeType,
  FacebookAdNodeData,
  SchemaNodeData,
  SchemaNodeType,
} from './types';
import { SCHEMA_HANDLE_FILTERED } from './types';

export const sampleRows: DataRow[] = [
  {
    id: '1',
    label: 'PostgreSQL',
    type: 'source',
    status: 'active',
    description: 'Primary database source',
    lastRun: '2026-02-19T10:30:00Z',
    records: 124500,
  },
  {
    id: '2',
    label: 'REST API',
    type: 'source',
    status: 'active',
    description: 'External API ingestion',
    lastRun: '2026-02-19T09:15:00Z',
    records: 8320,
  },
  {
    id: '3',
    label: 'CSV Import',
    type: 'source',
    status: 'inactive',
    description: 'Scheduled file import',
    lastRun: '2026-02-18T22:00:00Z',
    records: 2100,
  },
  {
    id: '4',
    label: 'Deduplicate',
    type: 'transform',
    status: 'active',
    description: 'Remove duplicate records',
    lastRun: '2026-02-19T10:35:00Z',
    records: 130720,
  },
  {
    id: '5',
    label: 'Enrich',
    type: 'transform',
    status: 'active',
    description: 'Add computed fields and lookups',
    lastRun: '2026-02-19T10:40:00Z',
    records: 130720,
  },
  {
    id: '6',
    label: 'Validate',
    type: 'transform',
    status: 'error',
    description: 'Schema validation and type checks',
    lastRun: '2026-02-19T10:42:00Z',
    records: 130720,
  },
  {
    id: '7',
    label: 'Data Warehouse',
    type: 'destination',
    status: 'active',
    description: 'BigQuery destination table',
    lastRun: '2026-02-19T10:45:00Z',
    records: 128900,
  },
  {
    id: '8',
    label: 'Analytics Dashboard',
    type: 'destination',
    status: 'active',
    description: 'Real-time dashboard feed',
    lastRun: '2026-02-19T10:45:00Z',
    records: 128900,
  },
];

export function buildNodesAndEdges(rows: DataRow[]): {
  nodes: Node[];
  edges: Edge[];
} {
  const sources = rows.filter((r) => r.type === 'source');
  const transforms = rows.filter((r) => r.type === 'transform');
  const destinations = rows.filter((r) => r.type === 'destination');

  const colX = { source: 0, transform: 300, destination: 600 };
  const yGap = 120;

  const makeNodes = (items: DataRow[], x: number): Node[] =>
    items.map((item, i) => ({
      id: item.id,
      type: 'dataNode',
      position: {
        x,
        y: i * yGap + (items.length === 1 ? yGap : 0),
      },
      data: { row: item },
    }));

  const nodes: Node[] = [
    ...makeNodes(sources, colX.source),
    ...makeNodes(transforms, colX.transform),
    ...makeNodes(destinations, colX.destination),
  ];

  const edges: Edge[] = [];

  // Sources -> first transform
  if (transforms.length > 0) {
    for (const src of sources) {
      edges.push({
        id: `e-${src.id}-${transforms[0].id}`,
        source: src.id,
        target: transforms[0].id,
        animated: src.status === 'active',
      });
    }
  }

  // Chain transforms
  for (let i = 0; i < transforms.length - 1; i++) {
    edges.push({
      id: `e-${transforms[i].id}-${transforms[i + 1].id}`,
      source: transforms[i].id,
      target: transforms[i + 1].id,
      animated: transforms[i].status === 'active',
    });
  }

  // Last transform -> destinations
  if (transforms.length > 0) {
    const lastTransform = transforms[transforms.length - 1];
    for (const dest of destinations) {
      edges.push({
        id: `e-${lastTransform.id}-${dest.id}`,
        source: lastTransform.id,
        target: dest.id,
        animated: lastTransform.status === 'active',
      });
    }
  }

  return { nodes, edges };
}

// Table node sample data
export const sampleTableNode: TableNodeType = {
  id: 'table-1',
  type: 'tableNode',
  position: { x: 900, y: 180 },
  data: {
    label: 'Pipeline Overview',
    layout: 'rows',
    isActive: false,
  } satisfies TableNodeData,
};

export const sampleTableEdges: Edge[] = [
  {
    id: 'e-7-table-1',
    source: '7',
    target: 'table-1',
    animated: true,
  },
  {
    id: 'e-8-table-1',
    source: '8',
    target: 'table-1',
    animated: true,
  },
];

// --- Facebook Ads sample data ---

export const facebookAdSampleRows: Record<string, unknown>[] = [
  { clicks: '145', reach: '12450', spend: '21.74', date_start: '2026-01-20', date_stop: '2026-01-20' },
  { clicks: '132', reach: '11230', spend: '19.85', date_start: '2026-01-21', date_stop: '2026-01-21' },
  { clicks: '158', reach: '13780', spend: '24.12', date_start: '2026-01-22', date_stop: '2026-01-22' },
  { clicks: '127', reach: '10890', spend: '18.50', date_start: '2026-01-23', date_stop: '2026-01-23' },
  { clicks: '163', reach: '14200', spend: '25.30', date_start: '2026-01-24', date_stop: '2026-01-24' },
  { clicks: '89', reach: '7650', spend: '12.40', date_start: '2026-01-25', date_stop: '2026-01-25' },
  { clicks: '76', reach: '6890', spend: '10.75', date_start: '2026-01-26', date_stop: '2026-01-26' },
  { clicks: '152', reach: '13100', spend: '22.60', date_start: '2026-01-27', date_stop: '2026-01-27' },
  { clicks: '141', reach: '12300', spend: '20.95', date_start: '2026-01-28', date_stop: '2026-01-28' },
  { clicks: '169', reach: '14800', spend: '26.40', date_start: '2026-01-29', date_stop: '2026-01-29' },
  { clicks: '138', reach: '11950', spend: '20.10', date_start: '2026-01-30', date_stop: '2026-01-30' },
  { clicks: '155', reach: '13500', spend: '23.80', date_start: '2026-01-31', date_stop: '2026-01-31' },
  { clicks: '147', reach: '12700', spend: '21.90', date_start: '2026-02-01', date_stop: '2026-02-01' },
  { clicks: '134', reach: '11600', spend: '19.45', date_start: '2026-02-02', date_stop: '2026-02-02' },
  { clicks: '161', reach: '14050', spend: '25.00', date_start: '2026-02-03', date_stop: '2026-02-03' },
  { clicks: '143', reach: '12400', spend: '21.30', date_start: '2026-02-04', date_stop: '2026-02-04' },
  { clicks: '156', reach: '13600', spend: '23.95', date_start: '2026-02-05', date_stop: '2026-02-05' },
  { clicks: '129', reach: '11100', spend: '18.80', date_start: '2026-02-06', date_stop: '2026-02-06' },
  { clicks: '172', reach: '15100', spend: '27.50', date_start: '2026-02-07', date_stop: '2026-02-07' },
  { clicks: '91', reach: '7900', spend: '13.10', date_start: '2026-02-08', date_stop: '2026-02-08' },
  { clicks: '83', reach: '7200', spend: '11.60', date_start: '2026-02-09', date_stop: '2026-02-09' },
  { clicks: '148', reach: '12850', spend: '22.15', date_start: '2026-02-10', date_stop: '2026-02-10' },
  { clicks: '139', reach: '12050', spend: '20.45', date_start: '2026-02-11', date_stop: '2026-02-11' },
  { clicks: '165', reach: '14400', spend: '25.70', date_start: '2026-02-12', date_stop: '2026-02-12' },
  { clicks: '151', reach: '13200', spend: '22.85', date_start: '2026-02-13', date_stop: '2026-02-13' },
];

export const sampleFacebookAdNode: FacebookAdNodeType = {
  id: 'fb-ads-1',
  type: 'facebookAdNode',
  position: { x: 0, y: 500 },
  data: {
    label: 'Facebook Ads',
    rows: facebookAdSampleRows,
    fields: ['clicks', 'reach', 'spend', 'date_start', 'date_stop'],
    accountName: 'TDS Marketing',
    status: 'ready',
    rowCount: 25,
  } satisfies FacebookAdNodeData,
};

export const sampleFacebookTableNode: TableNodeType = {
  id: 'table-2',
  type: 'tableNode',
  position: { x: 900, y: 520 },
  data: {
    label: 'Facebook Ads',
    layout: 'rows',
    isActive: false,
  } satisfies TableNodeData,
};

// Schema node between Facebook Ads and its table
export const sampleSchemaNode: SchemaNodeType = {
  id: 'schema-1',
  type: 'schemaNode',
  position: { x: 350, y: 520 },
  data: {
    label: 'Ad Metrics Filter',
    availableFields: [],
    selectedFields: ['clicks', 'reach', 'date_start'],
  } satisfies SchemaNodeData,
};

export const sampleSchemaEdges: Edge[] = [
  {
    id: 'e-fb-ads-1-schema-1',
    source: 'fb-ads-1',
    target: 'schema-1',
    animated: true,
  },
  {
    id: 'e-schema-1-table-2',
    source: 'schema-1',
    sourceHandle: SCHEMA_HANDLE_FILTERED,
    target: 'table-2',
    animated: true,
  },
];
