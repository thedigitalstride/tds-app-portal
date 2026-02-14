'use client';

import { Trophy, RefreshCw } from 'lucide-react';
import { Button } from '@tds/ui';
import {
  type IIdeaScoring,
  RECOMMENDATION_LABELS,
  RECOMMENDATION_COLOURS,
} from './types';

interface IdeaScoreCardProps {
  scoring?: IIdeaScoring;
  onScore: () => void;
  loading?: boolean;
}

export function IdeaScoreCard({ scoring, onScore, loading }: IdeaScoreCardProps) {
  if (!scoring) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
        <p className="mb-3 text-sm text-neutral-500">
          Score this idea to get a viability assessment
        </p>
        <Button size="sm" onClick={onScore} disabled={loading}>
          {loading ? (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trophy className="mr-1.5 h-3.5 w-3.5" />
          )}
          Generate Score
        </Button>
      </div>
    );
  }

  const recommendation = scoring.overall.recommendation;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Idea Score</h3>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RECOMMENDATION_COLOURS[recommendation]}`}
          >
            {RECOMMENDATION_LABELS[recommendation]}
          </span>
          <Button variant="ghost" size="sm" onClick={onScore} disabled={loading} className="h-7 w-7 p-0">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
          <span className="text-2xl font-bold text-neutral-900">{scoring.overall.score}</span>
        </div>
      </div>

      <div className="space-y-3">
        <ScoreDimension label="Viability" score={scoring.viability.score} reasoning={scoring.viability.reasoning} />
        <ScoreDimension label="Uniqueness" score={scoring.uniqueness.score} reasoning={scoring.uniqueness.reasoning} />
        <ScoreDimension label="Effort" score={scoring.effort.score} reasoning={scoring.effort.reasoning} />
      </div>

      {scoring.scoredAt && (
        <p className="mt-3 text-xs text-neutral-400">
          Scored {new Date(scoring.scoredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </p>
      )}
    </div>
  );
}

function ScoreDimension({
  label,
  score,
  reasoning,
}: {
  label: string;
  score: number;
  reasoning: string;
}) {
  const colour =
    score >= 7 ? 'bg-green-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-600">{label}</span>
        <span className="text-xs font-semibold text-neutral-800">{score}/10</span>
      </div>
      <div className="mb-1 h-1.5 rounded-full bg-neutral-100">
        <div
          className={`h-1.5 rounded-full ${colour}`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <p className="text-xs text-neutral-500">{reasoning}</p>
    </div>
  );
}
