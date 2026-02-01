'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Input, Button } from '@tds/ui';

type MatchType = 'exact' | 'phrase' | 'broad';

interface KeywordInputProps {
  index: number;
  text: string;
  matchType: MatchType;
  onTextChange: (text: string) => void;
  onMatchTypeChange: (matchType: MatchType) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function KeywordInput({
  index,
  text,
  matchType,
  onTextChange,
  onMatchTypeChange,
  onRemove,
  canRemove,
}: KeywordInputProps) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={matchType}
        onChange={(e) => onMatchTypeChange(e.target.value as MatchType)}
        className="h-10 w-24 rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="broad">Broad</option>
        <option value="phrase">Phrase</option>
        <option value="exact">Exact</option>
      </select>

      <div className="flex-1">
        <Input
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={`Keyword ${index + 1}`}
        />
      </div>

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
  );
}
