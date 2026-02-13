'use client';

import { useRouter } from 'next/navigation';
import { Clock, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@tds/ui';
import { StatusBadge } from './StatusBadge';
import { VoteButton } from './VoteButton';
import {
  STAGE_SHORT_LABELS,
  RECOMMENDATION_LABELS,
  RECOMMENDATION_COLOURS,
  type IdeaSummary,
} from './types';

interface IdeaCardProps {
  idea: IdeaSummary;
  currentUserId: string;
  onDelete: (id: string) => void;
  onVote: (id: string, value: 1 | -1) => void;
}

export function IdeaCard({ idea, currentUserId, onDelete, onVote }: IdeaCardProps) {
  const router = useRouter();

  return (
    <div
      className="group cursor-pointer rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:border-neutral-300 hover:shadow-sm"
      onClick={() => router.push(`/tools/ideation/${idea._id}`)}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-neutral-900">{idea.title}</h3>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={idea.status} />
            <span className="text-xs text-neutral-400">
              Stage: {STAGE_SHORT_LABELS[idea.currentStage]}
            </span>
          </div>
        </div>

        {idea.scoring?.overall && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              RECOMMENDATION_COLOURS[idea.scoring.overall.recommendation]
            }`}
          >
            {RECOMMENDATION_LABELS[idea.scoring.overall.recommendation]}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(idea.updatedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
          {idea.commentCount > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {idea.commentCount}
            </span>
          )}
          <span>{idea.createdBy.name}</span>
        </div>

        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <VoteButton
            voteScore={idea.voteScore}
            userVote={null}
            onVote={(value) => onVote(idea._id, value)}
          />
          {idea.createdBy._id === currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-neutral-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(idea._id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
