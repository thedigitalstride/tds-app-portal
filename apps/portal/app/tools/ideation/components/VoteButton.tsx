'use client';

import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface VoteButtonProps {
  voteScore: number;
  userVote?: 1 | -1 | null;
  onVote: (value: 1 | -1) => void;
}

export function VoteButton({ voteScore, userVote, onVote }: VoteButtonProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-neutral-200 bg-white">
      <button
        onClick={() => onVote(1)}
        className={`flex items-center gap-1 rounded-l-lg px-2.5 py-1.5 text-sm transition-colors ${
          userVote === 1
            ? 'bg-green-50 text-green-600'
            : 'text-neutral-500 hover:bg-neutral-50 hover:text-green-600'
        }`}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <span className="border-x border-neutral-200 px-2.5 py-1.5 text-sm font-medium text-neutral-700">
        {voteScore}
      </span>
      <button
        onClick={() => onVote(-1)}
        className={`flex items-center gap-1 rounded-r-lg px-2.5 py-1.5 text-sm transition-colors ${
          userVote === -1
            ? 'bg-red-50 text-red-600'
            : 'text-neutral-500 hover:bg-neutral-50 hover:text-red-600'
        }`}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
