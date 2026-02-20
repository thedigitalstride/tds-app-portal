'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import { X, Table2, Filter, Database, ArrowRightLeft, HardDrive, Merge } from 'lucide-react';
import { Checkbox, Input } from '@tds/ui';
import type { AppNode, TableNodeData, SchemaNodeData, JoinNodeData, DataRow, FacebookAdNodeData, TableLayout } from './types';

interface NodeDetailDrawerProps {
  selectedNode: AppNode | null;
  onClose: () => void;
  onTableLabelChange: (nodeId: string, label: string) => void;
  onTableLayoutChange: (nodeId: string, layout: TableLayout) => void;
  onSchemaLabelChange: (nodeId: string, label: string) => void;
  onSchemaFieldsChange: (nodeId: string, fields: string[]) => void;
  onSchemaAliasesChange: (nodeId: string, fieldAliases: Record<string, string>) => void;
  onJoinLabelChange: (nodeId: string, label: string) => void;
  onJoinKeyChange: (nodeId: string, joinKey: string) => void;
  onJoinTypeChange: (nodeId: string, joinType: 'inner' | 'full') => void;
}

export function NodeDetailDrawer({
  selectedNode,
  onClose,
  onTableLabelChange,
  onTableLayoutChange,
  onSchemaLabelChange,
  onSchemaFieldsChange,
  onSchemaAliasesChange,
  onJoinLabelChange,
  onJoinKeyChange,
  onJoinTypeChange,
}: NodeDetailDrawerProps) {
  const isOpen = selectedNode !== null;

  return (
    <div
      className={`shrink-0 border-l bg-white flex flex-col transition-all duration-200 overflow-hidden ${
        isOpen ? 'w-96 border-l-neutral-200' : 'w-0 border-l-0'
      }`}
    >
      {selectedNode && (
        <>
          <DrawerHeader node={selectedNode} onClose={onClose} />
          <div className="flex-1 overflow-y-auto p-4">
            <DrawerContent
              node={selectedNode}
              onTableLabelChange={onTableLabelChange}
              onTableLayoutChange={onTableLayoutChange}
              onSchemaLabelChange={onSchemaLabelChange}
              onSchemaFieldsChange={onSchemaFieldsChange}
              onSchemaAliasesChange={onSchemaAliasesChange}
              onJoinLabelChange={onJoinLabelChange}
              onJoinKeyChange={onJoinKeyChange}
              onJoinTypeChange={onJoinTypeChange}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Header ---------- */

const nodeTypeMeta: Record<string, { icon: React.ElementType; bg: string; iconColor: string; typeLabel: string }> = {
  tableNode: { icon: Table2, bg: 'bg-violet-100', iconColor: 'text-violet-600', typeLabel: 'Table' },
  schemaNode: { icon: Filter, bg: 'bg-teal-100', iconColor: 'text-teal-600', typeLabel: 'Schema Filter' },
  joinNode: { icon: Merge, bg: 'bg-amber-100', iconColor: 'text-amber-600', typeLabel: 'Join' },
  dataNode: { icon: Database, bg: 'bg-blue-100', iconColor: 'text-blue-600', typeLabel: 'Data Node' },
  facebookAdNode: { icon: Database, bg: 'bg-blue-100', iconColor: 'text-blue-600', typeLabel: 'Facebook Ads' },
};

const dataTypeIcons: Record<string, React.ElementType> = {
  source: Database,
  transform: ArrowRightLeft,
  destination: HardDrive,
};

function DrawerHeader({ node, onClose }: { node: AppNode; onClose: () => void }) {
  const meta = nodeTypeMeta[node.type ?? ''] ?? nodeTypeMeta.dataNode;
  let Icon = meta.icon;
  let label = '';
  let typeLabel = meta.typeLabel;

  if (node.type === 'dataNode') {
    const row = (node.data as { row: DataRow }).row;
    label = row.label;
    Icon = dataTypeIcons[row.type] ?? Database;
    typeLabel = row.type.charAt(0).toUpperCase() + row.type.slice(1);
  } else if (node.type === 'tableNode') {
    label = (node.data as TableNodeData).label;
  } else if (node.type === 'schemaNode') {
    label = (node.data as SchemaNodeData).label;
  } else if (node.type === 'facebookAdNode') {
    label = (node.data as FacebookAdNodeData).label;
  } else if (node.type === 'joinNode') {
    label = (node.data as JoinNodeData).label;
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
      <div className={`flex items-center justify-center w-8 h-8 rounded-md ${meta.bg}`}>
        <Icon className={`w-4 h-4 ${meta.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-800 truncate">{label}</p>
        <p className="text-[10px] text-neutral-400">{typeLabel}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ---------- Content by node type ---------- */

function DrawerContent({
  node,
  onTableLabelChange,
  onTableLayoutChange,
  onSchemaLabelChange,
  onSchemaFieldsChange,
  onSchemaAliasesChange,
  onJoinLabelChange,
  onJoinKeyChange,
  onJoinTypeChange,
}: {
  node: AppNode;
  onTableLabelChange: (nodeId: string, label: string) => void;
  onTableLayoutChange: (nodeId: string, layout: TableLayout) => void;
  onSchemaLabelChange: (nodeId: string, label: string) => void;
  onSchemaFieldsChange: (nodeId: string, fields: string[]) => void;
  onSchemaAliasesChange: (nodeId: string, fieldAliases: Record<string, string>) => void;
  onJoinLabelChange: (nodeId: string, label: string) => void;
  onJoinKeyChange: (nodeId: string, joinKey: string) => void;
  onJoinTypeChange: (nodeId: string, joinType: 'inner' | 'full') => void;
}) {
  switch (node.type) {
    case 'tableNode':
      return <TableDrawerContent node={node} onLabelChange={onTableLabelChange} onLayoutChange={onTableLayoutChange} />;
    case 'schemaNode':
      return <SchemaDrawerContent node={node} onLabelChange={onSchemaLabelChange} onFieldsChange={onSchemaFieldsChange} onAliasesChange={onSchemaAliasesChange} />;
    case 'joinNode':
      return <JoinDrawerContent node={node} onLabelChange={onJoinLabelChange} onKeyChange={onJoinKeyChange} onTypeChange={onJoinTypeChange} />;
    case 'dataNode':
      return <DataDrawerContent row={(node.data as { row: DataRow }).row} />;
    case 'facebookAdNode':
      return <FacebookAdDrawerContent data={node.data as FacebookAdNodeData} />;
    default:
      return null;
  }
}

/* ---------- Table drawer ---------- */

function TableDrawerContent({
  node,
  onLabelChange,
  onLayoutChange,
}: {
  node: AppNode;
  onLabelChange: (nodeId: string, label: string) => void;
  onLayoutChange: (nodeId: string, layout: TableLayout) => void;
}) {
  const data = node.data as TableNodeData;
  const [labelValue, setLabelValue] = useState(data.label);

  useEffect(() => {
    setLabelValue(data.label);
  }, [data.label]);

  const commitLabel = useCallback(() => {
    const trimmed = labelValue.trim();
    if (trimmed && trimmed !== data.label) {
      onLabelChange(node.id, trimmed);
    } else {
      setLabelValue(data.label);
    }
  }, [labelValue, data.label, node.id, onLabelChange]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-neutral-500 mb-1 block">Label</label>
        <Input
          value={labelValue}
          onChange={(e) => setLabelValue(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitLabel();
          }}
          className="h-8 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Layout</label>
        <div className="flex gap-1">
          <SegmentButton active={data.layout === 'rows'} onClick={() => onLayoutChange(node.id, 'rows')}>
            Rows
          </SegmentButton>
          <SegmentButton active={data.layout === 'columns'} onClick={() => onLayoutChange(node.id, 'columns')}>
            Columns
          </SegmentButton>
        </div>
      </div>
    </div>
  );
}

function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? 'bg-violet-600 text-white'
          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Schema drawer ---------- */

function SchemaDrawerContent({
  node,
  onLabelChange,
  onFieldsChange,
  onAliasesChange,
}: {
  node: AppNode;
  onLabelChange: (nodeId: string, label: string) => void;
  onFieldsChange: (nodeId: string, fields: string[]) => void;
  onAliasesChange: (nodeId: string, fieldAliases: Record<string, string>) => void;
}) {
  const data = node.data as SchemaNodeData;
  const [labelValue, setLabelValue] = useState(data.label);
  const [localAliases, setLocalAliases] = useState<Record<string, string>>(data.fieldAliases ?? {});

  useEffect(() => {
    setLabelValue(data.label);
  }, [data.label]);

  useEffect(() => {
    setLocalAliases(data.fieldAliases ?? {});
  }, [data.fieldAliases]);

  const commitLabel = useCallback(() => {
    const trimmed = labelValue.trim();
    if (trimmed && trimmed !== data.label) {
      onLabelChange(node.id, trimmed);
    } else {
      setLabelValue(data.label);
    }
  }, [labelValue, data.label, node.id, onLabelChange]);

  const selectedSet = new Set(data.selectedFields);
  const allSelected = data.availableFields.length > 0 && data.selectedFields.length === data.availableFields.length;

  // Build conflict map: output name → source fields that produce it
  const conflicts = useMemo(() => {
    const outputMap = new Map<string, string[]>();
    for (const field of data.selectedFields) {
      const output = localAliases[field] || field;
      const existing = outputMap.get(output);
      if (existing) {
        existing.push(field);
      } else {
        outputMap.set(output, [field]);
      }
    }
    // Only keep entries with 2+ sources (actual conflicts)
    const conflictSet = new Set<string>();
    for (const [, sources] of outputMap) {
      if (sources.length > 1) {
        for (const s of sources) conflictSet.add(s);
      }
    }
    return conflictSet;
  }, [data.selectedFields, localAliases]);

  const commitAlias = useCallback(
    (field: string, value: string) => {
      const trimmed = value.trim();
      const next = { ...localAliases };

      // Clear if empty or same as original field name
      if (!trimmed || trimmed === field) {
        delete next[field];
      } else {
        next[field] = trimmed;
      }

      // Check for conflicts before committing
      const outputMap = new Map<string, string[]>();
      for (const f of data.selectedFields) {
        const output = next[f] || f;
        const existing = outputMap.get(output);
        if (existing) {
          existing.push(f);
        } else {
          outputMap.set(output, [f]);
        }
      }

      const hasConflict = [...outputMap.values()].some((sources) => sources.length > 1);
      if (hasConflict) {
        // Update local state to show the conflict visually, but don't commit upstream
        setLocalAliases(next);
        return;
      }

      setLocalAliases(next);
      onAliasesChange(node.id, next);
    },
    [localAliases, data.selectedFields, node.id, onAliasesChange]
  );

  const toggleField = (field: string) => {
    if (selectedSet.has(field)) {
      // Deselecting — clean up alias
      const next = data.selectedFields.filter((f) => f !== field);
      const nextAliases = { ...(data.fieldAliases ?? {}) };
      delete nextAliases[field];
      onFieldsChange(node.id, next);
      onAliasesChange(node.id, nextAliases);
    } else {
      onFieldsChange(node.id, [...data.selectedFields, field]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      // Deselect all — clear all aliases
      onFieldsChange(node.id, []);
      onAliasesChange(node.id, {});
    } else {
      onFieldsChange(node.id, [...data.availableFields]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-neutral-500 mb-1 block">Label</label>
        <Input
          value={labelValue}
          onChange={(e) => setLabelValue(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitLabel();
          }}
          className="h-8 text-sm"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-neutral-500">Fields</label>
          {data.availableFields.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-[10px] text-teal-600 hover:text-teal-800 font-medium"
            >
              {allSelected ? 'Select none' : 'Select all'}
            </button>
          )}
        </div>
        {data.availableFields.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">Connect a data source to see available fields</p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-0.5">
            {data.availableFields.map((field) => {
              const isSelected = selectedSet.has(field);
              const alias = localAliases[field];
              const hasConflict = conflicts.has(field);

              return (
                <div key={field} className="px-1 py-1 rounded hover:bg-teal-50">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleField(field)}
                    />
                    <span className="text-xs text-neutral-700">
                      {field}
                      {isSelected && alias && !hasConflict && (
                        <span className="text-teal-600 ml-1">&rarr; {alias}</span>
                      )}
                    </span>
                  </label>
                  {isSelected && (
                    <div className="ml-7 mt-1">
                      <input
                        type="text"
                        value={localAliases[field] ?? ''}
                        onChange={(e) => setLocalAliases((prev) => ({ ...prev, [field]: e.target.value }))}
                        onBlur={(e) => commitAlias(field, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitAlias(field, (e.target as HTMLInputElement).value);
                        }}
                        placeholder={field}
                        className={`w-full h-6 px-1.5 text-[11px] rounded border bg-white outline-none transition-colors ${
                          hasConflict
                            ? 'border-red-300 text-red-700 focus:ring-1 focus:ring-red-300'
                            : 'border-neutral-200 text-neutral-600 focus:ring-1 focus:ring-teal-300 focus:border-teal-300'
                        }`}
                      />
                      {hasConflict && (
                        <p className="text-[10px] text-red-500 mt-0.5">Conflicts with another field&apos;s output name</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Join drawer ---------- */

function JoinDrawerContent({
  node,
  onLabelChange,
  onKeyChange,
  onTypeChange,
}: {
  node: AppNode;
  onLabelChange: (nodeId: string, label: string) => void;
  onKeyChange: (nodeId: string, joinKey: string) => void;
  onTypeChange: (nodeId: string, joinType: 'inner' | 'full') => void;
}) {
  const data = node.data as JoinNodeData;
  const [labelValue, setLabelValue] = useState(data.label);

  useEffect(() => {
    setLabelValue(data.label);
  }, [data.label]);

  const commitLabel = useCallback(() => {
    const trimmed = labelValue.trim();
    if (trimmed && trimmed !== data.label) {
      onLabelChange(node.id, trimmed);
    } else {
      setLabelValue(data.label);
    }
  }, [labelValue, data.label, node.id, onLabelChange]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-neutral-500 mb-1 block">Label</label>
        <Input
          value={labelValue}
          onChange={(e) => setLabelValue(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitLabel();
          }}
          className="h-8 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Join key</label>
        {data.commonFields.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">Connect two sources with a shared field</p>
        ) : (
          <select
            value={data.joinKey}
            onChange={(e) => onKeyChange(node.id, e.target.value)}
            className="nodrag w-full h-8 text-sm rounded-md border border-neutral-200 bg-white px-2 text-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            <option value="">Select a field…</option>
            {data.commonFields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Join type</label>
        <div className="flex gap-1">
          <JoinSegmentButton active={data.joinType === 'inner'} onClick={() => onTypeChange(node.id, 'inner')}>
            Inner
          </JoinSegmentButton>
          <JoinSegmentButton active={data.joinType === 'full'} onClick={() => onTypeChange(node.id, 'full')}>
            Full
          </JoinSegmentButton>
        </div>
        <p className="text-[10px] text-neutral-400 mt-1.5">
          {data.joinType === 'inner'
            ? 'Only rows with matching keys on both sides are included.'
            : 'All rows from both sides are included; unmatched fields are left empty.'}
        </p>
      </div>
    </div>
  );
}

function JoinSegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? 'bg-amber-600 text-white'
          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Data node drawer (read-only) ---------- */

const statusLabels: Record<DataRow['status'], { label: string; dotColor: string }> = {
  active: { label: 'Active', dotColor: 'bg-emerald-500' },
  inactive: { label: 'Inactive', dotColor: 'bg-neutral-400' },
  error: { label: 'Error', dotColor: 'bg-red-500' },
};

const typeBadgeColors: Record<DataRow['type'], string> = {
  source: 'bg-blue-100 text-blue-700',
  transform: 'bg-amber-100 text-amber-700',
  destination: 'bg-emerald-100 text-emerald-700',
};

function DataDrawerContent({ row }: { row: DataRow }) {
  const status = statusLabels[row.status];
  return (
    <div className="space-y-3">
      <PropertyRow label="Type">
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeBadgeColors[row.type]}`}>
          {row.type.charAt(0).toUpperCase() + row.type.slice(1)}
        </span>
      </PropertyRow>
      <PropertyRow label="Status">
        <span className="flex items-center gap-1.5 text-xs text-neutral-700">
          <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
          {status.label}
        </span>
      </PropertyRow>
      <PropertyRow label="Description">
        <span className="text-xs text-neutral-700">{row.description}</span>
      </PropertyRow>
      {row.records !== undefined && (
        <PropertyRow label="Records">
          <span className="text-xs text-neutral-700">{row.records.toLocaleString('en-GB')}</span>
        </PropertyRow>
      )}
      {row.lastRun && (
        <PropertyRow label="Last run">
          <span className="text-xs text-neutral-700">
            {new Date(row.lastRun).toLocaleString('en-GB', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
        </PropertyRow>
      )}
    </div>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/* ---------- Facebook Ad drawer (read-only) ---------- */

function FacebookAdDrawerContent({ data }: { data: FacebookAdNodeData }) {
  const { accountName, campaignCount, rows } = data;

  const totalClicks = rows.reduce((sum, r) => sum + Number(r.clicks), 0);
  const totalSpend = rows.reduce((sum, r) => sum + Number(r.spend), 0);
  const totalReach = rows.reduce((sum, r) => sum + Number(r.reach), 0);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <PropertyRow label="Account">
          <span className="text-xs text-neutral-700">{accountName}</span>
        </PropertyRow>
        <PropertyRow label="Campaigns">
          <span className="text-xs text-neutral-700">{campaignCount}</span>
        </PropertyRow>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Clicks" value={totalClicks.toLocaleString('en-GB')} />
        <MetricCard
          label="Spend"
          value={`£${totalSpend.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
        <MetricCard label="Reach" value={totalReach.toLocaleString('en-GB')} />
      </div>

      {/* Daily rows */}
      <div>
        <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">
          Daily breakdown ({rows.length} days)
        </p>
        <div className="max-h-[300px] overflow-y-auto border border-neutral-200 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-neutral-50 sticky top-0">
              <tr>
                <th className="text-left px-2 py-1.5 font-medium text-neutral-500">Date</th>
                <th className="text-right px-2 py-1.5 font-medium text-neutral-500">Clicks</th>
                <th className="text-right px-2 py-1.5 font-medium text-neutral-500">Spend</th>
                <th className="text-right px-2 py-1.5 font-medium text-neutral-500">Reach</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date_start} className="border-t border-neutral-100">
                  <td className="px-2 py-1 text-neutral-700">{r.date_start}</td>
                  <td className="px-2 py-1 text-right text-neutral-700">{Number(r.clicks).toLocaleString('en-GB')}</td>
                  <td className="px-2 py-1 text-right text-neutral-700">
                    £{Number(r.spend).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-1 text-right text-neutral-700">{Number(r.reach).toLocaleString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-neutral-50 rounded-lg p-2 text-center">
      <div className="text-sm font-semibold text-neutral-800">{value}</div>
      <div className="text-[10px] text-neutral-400">{label}</div>
    </div>
  );
}
