'use client';

import { STATUS_LABELS, STATUS_COLOURS, type IdeaStatus } from './types';

interface StatusBadgeProps {
  status: IdeaStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${STATUS_COLOURS[status]} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
