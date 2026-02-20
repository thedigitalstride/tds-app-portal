import type { Node, Edge } from '@xyflow/react';
import type { DataRow, MathOperation } from './types';

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
    id: 'm1',
    label: 'Sample Rate',
    type: 'math',
    status: 'active',
    description: 'Sample 10% of enriched records',
    lastRun: '2026-02-19T10:41:00Z',
    records: 130720,
    operation: '*' as MathOperation,
    operand: 0.1,
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
    id: 'm2',
    label: 'Revenue Calc',
    type: 'math',
    status: 'active',
    description: 'Multiply records by unit price',
    lastRun: '2026-02-19T10:43:00Z',
    records: 130720,
    operation: '*' as MathOperation,
    operand: 24.99,
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
  const mathNodes = rows.filter((r) => r.type === 'math');
  const destinations = rows.filter((r) => r.type === 'destination');

  // Pipeline order: source → transform → math (interleaved) → destination
  // Build the processing chain in the order they appear in the array
  const pipeline = rows.filter(
    (r) => r.type === 'transform' || r.type === 'math'
  );

  const colX = { source: 0, pipeline: 300, destination: 650 };
  const yGap = 140;

  const makeSourceNodes = (items: DataRow[], x: number): Node[] =>
    items.map((item, i) => ({
      id: item.id,
      type: 'dataNode',
      position: {
        x,
        y: i * yGap + (items.length === 1 ? yGap : 0),
      },
      data: { row: item },
    }));

  const makePipelineNodes = (items: DataRow[], x: number): Node[] =>
    items.map((item, i) => ({
      id: item.id,
      type: item.type === 'math' ? 'mathNode' : 'dataNode',
      position: {
        x,
        y: i * yGap + (items.length === 1 ? yGap : 0),
      },
      data: { row: item },
    }));

  const makeDestNodes = (items: DataRow[], x: number): Node[] =>
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
    ...makeSourceNodes(sources, colX.source),
    ...makePipelineNodes(pipeline, colX.pipeline),
    ...makeDestNodes(destinations, colX.destination),
  ];

  const edges: Edge[] = [];

  // Sources -> first pipeline node
  if (pipeline.length > 0) {
    for (const src of sources) {
      edges.push({
        id: `e-${src.id}-${pipeline[0].id}`,
        source: src.id,
        target: pipeline[0].id,
        animated: src.status === 'active',
      });
    }
  }

  // Chain pipeline nodes (transforms + math interleaved)
  for (let i = 0; i < pipeline.length - 1; i++) {
    edges.push({
      id: `e-${pipeline[i].id}-${pipeline[i + 1].id}`,
      source: pipeline[i].id,
      target: pipeline[i + 1].id,
      animated: pipeline[i].status === 'active',
    });
  }

  // Last pipeline node -> destinations
  if (pipeline.length > 0) {
    const lastPipeline = pipeline[pipeline.length - 1];
    for (const dest of destinations) {
      edges.push({
        id: `e-${lastPipeline.id}-${dest.id}`,
        source: lastPipeline.id,
        target: dest.id,
        animated: lastPipeline.status === 'active',
      });
    }
  }

  return { nodes, edges };
}
