'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Input, Button } from '@tds/ui';

const MAX_HEADLINE_LENGTH = 30;

interface HeadlineInputProps {
  index: number;
  value: string;
  pinnedPosition?: 1 | 2 | 3;
  onChange: (value: string) => void;
  onPinnedChange: (position: 1 | 2 | 3 | undefined) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function HeadlineInput({
  index,
  value,
  pinnedPosition,
  onChange,
  onPinnedChange,
  onRemove,
  canRemove,
}: HeadlineInputProps) {
  const charCount = value.length;
  const isOverLimit = charCount > MAX_HEADLINE_LENGTH;

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Headline ${index + 1}`}
            className={isOverLimit ? 'border-red-300 focus:ring-red-500' : ''}
          />
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
              isOverLimit ? 'text-red-500' : 'text-neutral-400'
            }`}
          >
            {charCount}/{MAX_HEADLINE_LENGTH}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <select
          value={pinnedPosition || ''}
          onChange={(e) =>
            onPinnedChange(
              e.target.value ? (parseInt(e.target.value) as 1 | 2 | 3) : undefined
            )
          }
          className="h-10 rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          title="Pin to position"
        >
          <option value="">No pin</option>
          <option value="1">Pin 1</option>
          <option value="2">Pin 2</option>
          <option value="3">Pin 3</option>
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
