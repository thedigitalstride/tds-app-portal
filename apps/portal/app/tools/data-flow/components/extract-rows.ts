import type { Edge } from '@xyflow/react';
import type { AppNode, GenericRow, DataRow, FacebookAdRow, SchemaNodeData, JoinNodeData } from './types';
import { SCHEMA_HANDLE_FILTERED, JOIN_HANDLE_A, JOIN_HANDLE_B } from './types';

/**
 * Extracts GenericRow[] from an array of AppNodes.
 * - dataNode → 1 row per node (spread DataRow fields)
 * - facebookAdNode → 1 row per daily entry
 * - tableNode / schemaNode / joinNode → skipped (produces no rows directly)
 */
export function extractGenericRows(nodes: AppNode[]): GenericRow[] {
  const rows: GenericRow[] = [];

  for (const node of nodes) {
    if (node.type === 'dataNode') {
      const dr = node.data.row as DataRow;
      rows.push({
        id: node.id,
        _nodeId: node.id,
        _nodeLabel: dr.label,
        label: dr.label,
        type: dr.type,
        status: dr.status,
        description: dr.description,
        records: dr.records,
        lastRun: dr.lastRun,
      });
    } else if (node.type === 'facebookAdNode') {
      const adRows = node.data.rows as FacebookAdRow[];
      const label = node.data.label as string;
      for (let i = 0; i < adRows.length; i++) {
        const ar = adRows[i];
        rows.push({
          id: `${node.id}-${i}`,
          _nodeId: node.id,
          _nodeLabel: label,
          clicks: ar.clicks,
          reach: ar.reach,
          spend: ar.spend,
          date_start: ar.date_start,
          date_stop: ar.date_stop,
        });
      }
    }
    // tableNode, schemaNode, joinNode → no rows
  }

  return rows;
}

/** Strip a row to only the allowed field keys, preserving meta-fields. Optionally rename via aliases. */
function filterRowFields(
  row: GenericRow,
  allowSet: Set<string>,
  aliases?: Record<string, string>
): GenericRow {
  const result: GenericRow = { id: row.id, _nodeId: row._nodeId, _nodeLabel: row._nodeLabel };
  for (const key of Object.keys(row)) {
    if (key === 'id' || key.startsWith('_')) continue;
    if (allowSet.has(key)) {
      const outputKey = aliases?.[key] || key;
      result[outputKey] = row[key];
    }
  }
  return result;
}

/** Get non-meta field keys from a row. */
function getRowFields(row: GenericRow): string[] {
  return Object.keys(row).filter((k) => k !== 'id' && !k.startsWith('_'));
}

/**
 * Resolve rows coming from a single source edge.
 * Handles schema filtering, data extraction, and join resolution.
 */
function resolveEdgeSource(
  edge: Edge,
  nodeMap: Map<string, AppNode>,
  allNodes: AppNode[],
  allEdges: Edge[],
  visited: Set<string>
): GenericRow[] {
  const sourceNode = nodeMap.get(edge.source);
  if (!sourceNode) return [];

  if (sourceNode.type === 'schemaNode') {
    const upstreamRows = resolveRowsForTarget(sourceNode.id, allNodes, allEdges, visited);
    const schemaData = sourceNode.data as SchemaNodeData;

    if (edge.sourceHandle === SCHEMA_HANDLE_FILTERED) {
      const allowSet = new Set(schemaData.selectedFields);
      const aliases = schemaData.fieldAliases;
      return upstreamRows.map((r) => filterRowFields(r, allowSet, aliases));
    }
    // "all" handle or unspecified — pass everything through
    return upstreamRows;
  }

  if (sourceNode.type === 'joinNode') {
    return resolveJoinNodeRows(sourceNode.id, allNodes, allEdges, visited);
  }

  if (sourceNode.type === 'dataNode' || sourceNode.type === 'facebookAdNode') {
    return extractGenericRows([sourceNode]);
  }

  // tableNode or unknown → skip
  return [];
}

/**
 * Perform a join between two sets of rows on a shared key.
 */
function performJoin(
  sideA: GenericRow[],
  sideB: GenericRow[],
  joinKey: string,
  joinType: 'inner' | 'full',
  joinNodeId: string,
  joinLabel: string
): GenericRow[] {
  const result: GenericRow[] = [];

  // Index side B rows by join key value (supports multiple matches per key)
  const bByKey = new Map<string, GenericRow[]>();
  for (const row of sideB) {
    const keyVal = String(row[joinKey] ?? '');
    const existing = bByKey.get(keyVal);
    if (existing) {
      existing.push(row);
    } else {
      bByKey.set(keyVal, [row]);
    }
  }

  const matchedBKeys = new Set<string>();
  let idx = 0;

  // For each A row, find matching B rows and merge
  for (const aRow of sideA) {
    const keyVal = String(aRow[joinKey] ?? '');
    const bMatches = bByKey.get(keyVal);

    if (bMatches && bMatches.length > 0) {
      matchedBKeys.add(keyVal);
      for (const bRow of bMatches) {
        // Merge: A fields take priority, B fills gaps
        const merged: GenericRow = {
          id: `${joinNodeId}-${idx++}`,
          _nodeId: joinNodeId,
          _nodeLabel: joinLabel,
        };
        // Copy B fields first (lower priority)
        for (const key of getRowFields(bRow)) {
          merged[key] = bRow[key];
        }
        // Copy A fields on top (higher priority)
        for (const key of getRowFields(aRow)) {
          merged[key] = aRow[key];
        }
        result.push(merged);
      }
    } else if (joinType === 'full') {
      // Unmatched A row
      const merged: GenericRow = {
        id: `${joinNodeId}-${idx++}`,
        _nodeId: joinNodeId,
        _nodeLabel: joinLabel,
      };
      for (const key of getRowFields(aRow)) {
        merged[key] = aRow[key];
      }
      result.push(merged);
    }
  }

  // Full join: add unmatched B rows
  if (joinType === 'full') {
    for (const bRow of sideB) {
      const keyVal = String(bRow[joinKey] ?? '');
      if (!matchedBKeys.has(keyVal)) {
        const merged: GenericRow = {
          id: `${joinNodeId}-${idx++}`,
          _nodeId: joinNodeId,
          _nodeLabel: joinLabel,
        };
        for (const key of getRowFields(bRow)) {
          merged[key] = bRow[key];
        }
        result.push(merged);
      }
    }
  }

  return result;
}

/**
 * Resolve rows produced by a join node by resolving its two input handles
 * separately, then joining them.
 */
function resolveJoinNodeRows(
  joinNodeId: string,
  nodes: AppNode[],
  edges: Edge[],
  visited: Set<string>
): GenericRow[] {
  if (visited.has(joinNodeId)) return [];
  visited.add(joinNodeId);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const joinNode = nodeMap.get(joinNodeId);
  if (!joinNode || joinNode.type !== 'joinNode') return [];

  const joinData = joinNode.data as JoinNodeData;
  const incomingEdges = edges.filter((e) => e.target === joinNodeId);

  // Resolve side A and side B separately
  const sideA: GenericRow[] = [];
  const sideB: GenericRow[] = [];

  for (const edge of incomingEdges) {
    const rows = resolveEdgeSource(edge, nodeMap, nodes, edges, visited);
    if (edge.targetHandle === JOIN_HANDLE_A) {
      sideA.push(...rows);
    } else if (edge.targetHandle === JOIN_HANDLE_B) {
      sideB.push(...rows);
    }
  }

  // If no join key is configured, fall back to concatenation
  if (!joinData.joinKey) {
    return [...sideA, ...sideB];
  }

  return performJoin(sideA, sideB, joinData.joinKey, joinData.joinType, joinNodeId, joinData.label);
}

/**
 * Walk edges backwards from `targetNodeId` to resolve all upstream rows.
 * Schema nodes apply field filtering when reached via the "filtered" handle.
 * Join nodes merge their two inputs on a shared key.
 */
export function resolveRowsForTarget(
  targetNodeId: string,
  nodes: AppNode[],
  edges: Edge[],
  visited: Set<string> = new Set()
): GenericRow[] {
  if (visited.has(targetNodeId)) return [];
  visited.add(targetNodeId);

  const incomingEdges = edges.filter((e) => e.target === targetNodeId);
  const rows: GenericRow[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const edge of incomingEdges) {
    rows.push(...resolveEdgeSource(edge, nodeMap, nodes, edges, visited));
  }

  return rows;
}

/**
 * Derive fields available on each handle side and their intersection
 * for a given join node. Used by page.tsx to inject derived fields.
 */
export function resolveJoinDerivedFields(
  joinNodeId: string,
  nodes: AppNode[],
  edges: Edge[]
): {
  availableFieldsA: string[];
  availableFieldsB: string[];
  commonFields: string[];
  matchedCount: number;
} {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const joinNode = nodeMap.get(joinNodeId);
  if (!joinNode || joinNode.type !== 'joinNode') {
    return { availableFieldsA: [], availableFieldsB: [], commonFields: [], matchedCount: 0 };
  }

  const joinData = joinNode.data as JoinNodeData;
  const incomingEdges = edges.filter((e) => e.target === joinNodeId);

  // Resolve rows for each handle side (use fresh visited sets, excluding the join itself)
  const sideARows: GenericRow[] = [];
  const sideBRows: GenericRow[] = [];

  for (const edge of incomingEdges) {
    const visited = new Set<string>([joinNodeId]);
    const rows = resolveEdgeSource(edge, nodeMap, nodes, edges, visited);
    if (edge.targetHandle === JOIN_HANDLE_A) {
      sideARows.push(...rows);
    } else if (edge.targetHandle === JOIN_HANDLE_B) {
      sideBRows.push(...rows);
    }
  }

  // Derive field sets
  const fieldsA = new Set<string>();
  for (const row of sideARows) {
    for (const key of getRowFields(row)) fieldsA.add(key);
  }

  const fieldsB = new Set<string>();
  for (const row of sideBRows) {
    for (const key of getRowFields(row)) fieldsB.add(key);
  }

  const availableFieldsA = [...fieldsA].sort();
  const availableFieldsB = [...fieldsB].sort();
  const commonFields = availableFieldsA.filter((f) => fieldsB.has(f));

  // Compute matched count if a join key is set
  let matchedCount = 0;
  if (joinData.joinKey && commonFields.includes(joinData.joinKey)) {
    const joined = performJoin(sideARows, sideBRows, joinData.joinKey, joinData.joinType, joinNodeId, joinData.label);
    matchedCount = joined.length;
  }

  return { availableFieldsA, availableFieldsB, commonFields, matchedCount };
}
