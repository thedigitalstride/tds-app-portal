'use client';

import { FileText } from 'lucide-react';
import { ideaTemplates } from '../lib/templates';

interface TemplateSelectorProps {
  selected: string | null;
  onSelect: (templateId: string | null) => void;
}

export function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-700">Start from a template (optional)</label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          onClick={() => onSelect(null)}
          className={`rounded-lg border p-3 text-left transition-all ${
            selected === null
              ? 'border-blue-300 bg-blue-50'
              : 'border-neutral-200 hover:border-neutral-300'
          }`}
        >
          <div className="text-sm font-medium text-neutral-800">Blank Start</div>
          <div className="mt-0.5 text-xs text-neutral-500">Start from scratch with a fresh idea</div>
        </button>
        {ideaTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={`rounded-lg border p-3 text-left transition-all ${
              selected === template.id
                ? 'border-blue-300 bg-blue-50'
                : 'border-neutral-200 hover:border-neutral-300'
            }`}
          >
            <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-800">
              <FileText className="h-3.5 w-3.5 text-neutral-400" />
              {template.name}
            </div>
            <div className="mt-0.5 text-xs text-neutral-500">{template.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
