'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@tds/ui';

const MAX_DESCRIPTION_LENGTH = 90;

interface DescriptionInputProps {
  index: number;
  value: string;
  pinnedPosition?: 1 | 2;
  onChange: (value: string) => void;
  onPinnedChange: (position: 1 | 2 | undefined) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function DescriptionInput({
  index,
  value,
  pinnedPosition,
  onChange,
  onPinnedChange,
  onRemove,
  canRemove,
}: DescriptionInputProps) {
  const charCount = value.length;
  const isOverLimit = charCount > MAX_DESCRIPTION_LENGTH;

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Description ${index + 1}`}
            rows={2}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              isOverLimit
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-neutral-200 focus:border-blue-500 focus:ring-blue-500'
            }`}
          />
          <span
            className={`absolute right-3 bottom-2 text-xs ${
              isOverLimit ? 'text-red-500' : 'text-neutral-400'
            }`}
          >
            {charCount}/{MAX_DESCRIPTION_LENGTH}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 pt-2">
        <select
          value={pinnedPosition || ''}
          onChange={(e) =>
            onPinnedChange(
              e.target.value ? (parseInt(e.target.value) as 1 | 2) : undefined
            )
          }
          className="h-10 rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          title="Pin to position"
        >
          <option value="">No pin</option>
          <option value="1">Pin 1</option>
          <option value="2">Pin 2</option>
        </select>

        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-neutral-400 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
