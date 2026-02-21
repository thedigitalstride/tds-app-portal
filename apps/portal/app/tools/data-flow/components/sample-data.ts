import type { Node, Edge } from '@xyflow/react';
import type { DataRow } from './types';

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
    id: '9',
    label: 'Tracket',
    type: 'source',
    status: 'active',
    description: 'Time entries from Tracket (monday.com)',
    sourceType: 'tracket',
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
