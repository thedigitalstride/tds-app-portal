'use client';

import { Pencil } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  value: string;
}

interface MultipleChoiceOptionsProps {
  options: Option[];
  onSelect: (option: Option) => void;
  onCustomInput?: () => void;
  disabled?: boolean;
}

const CUSTOM_INPUT_PATTERNS = /^(something else|other|none of the above|custom|write my own)$/i;

export function MultipleChoiceOptions({ options, onSelect, onCustomInput, disabled }: MultipleChoiceOptionsProps) {
  const filteredOptions = options.filter(
    (option) => !CUSTOM_INPUT_PATTERNS.test(option.label)
  );

  return (
    <div className="space-y-2 px-11">
      <div className="flex flex-wrap gap-2">
        {filteredOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option)}
            disabled={disabled}
            className="group flex items-start gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-xs font-semibold text-neutral-500 uppercase group-hover:bg-blue-100 group-hover:text-blue-600">
              {option.id}
            </span>
            <div>
              <div className="text-sm font-medium text-neutral-800">{option.label}</div>
              {option.value !== option.label && (
                <div className="mt-0.5 text-xs text-neutral-500">{option.value}</div>
              )}
            </div>
          </button>
        ))}
      </div>
      {onCustomInput && (
        <button
          onClick={onCustomInput}
          disabled={disabled}
          className="group flex items-start gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-xs font-semibold text-neutral-500 uppercase group-hover:bg-blue-100 group-hover:text-blue-600">
            <Pencil className="h-3 w-3" />
          </span>
          <div className="text-sm font-medium text-neutral-800">Something else</div>
        </button>
      )}
    </div>
  );
}
