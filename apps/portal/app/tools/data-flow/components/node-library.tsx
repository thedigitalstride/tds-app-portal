'use client';

import { Table2, Filter, Merge, GripVertical } from 'lucide-react';

const nodeTypes = [
  {
    type: 'tableNode',
    label: 'Table',
    description: 'Tabular view of connected data',
    icon: Table2,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
  {
    type: 'schemaNode',
    label: 'Schema Filter',
    description: 'Select fields to pass through',
    icon: Filter,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
  },
  {
    type: 'joinNode',
    label: 'Join',
    description: 'Merge rows on a shared key',
    icon: Merge,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
] as const;

export function NodeLibrary() {
  const onDragStart = (event: React.DragEvent, type: string) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-56 shrink-0 border-r border-neutral-200 bg-neutral-50 flex flex-col">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          Nodes
        </h3>
      </div>
      <div className="px-3 space-y-2">
        {nodeTypes.map((nt) => {
          const Icon = nt.icon;
          return (
            <div
              key={nt.type}
              draggable
              onDragStart={(e) => onDragStart(e, nt.type)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-neutral-200 bg-white cursor-grab active:cursor-grabbing hover:border-neutral-300 hover:shadow-sm transition-all"
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-md ${nt.iconBg}`}>
                <Icon className={`w-4 h-4 ${nt.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800">{nt.label}</p>
                <p className="text-[10px] text-neutral-400 leading-tight">{nt.description}</p>
              </div>
              <GripVertical className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
