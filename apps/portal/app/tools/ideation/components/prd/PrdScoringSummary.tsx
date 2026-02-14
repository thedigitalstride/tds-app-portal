'use client';

import { TrendingUp, Lightbulb, Zap } from 'lucide-react';
import {
  type IIdeaScoring,
  RECOMMENDATION_LABELS,
  RECOMMENDATION_COLOURS,
} from '../types';

interface PrdScoringSummaryProps {
  scoring: IIdeaScoring;
}

const dimensions = [
  { key: 'viability' as const, label: 'Viability', icon: TrendingUp },
  { key: 'uniqueness' as const, label: 'Uniqueness', icon: Lightbulb },
  { key: 'effort' as const, label: 'Effort', icon: Zap },
];

function scoreColor(score: number): string {
  if (score >= 7) return 'text-green-600';
  if (score >= 5) return 'text-amber-600';
  return 'text-red-600';
}

function scoreBg(score: number): string {
  if (score >= 7) return 'bg-green-50 border-green-200';
  if (score >= 5) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

export function PrdScoringSummary({ scoring }: PrdScoringSummaryProps) {
  const recommendation = scoring.overall.recommendation;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        {/* Overall score circle */}
        <div className="flex flex-col items-center gap-1.5">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full border-2 ${scoreBg(scoring.overall.score)}`}
          >
            <div className="text-center">
              <span className={`text-2xl font-bold ${scoreColor(scoring.overall.score)}`}>
                {scoring.overall.score}
              </span>
              <span className="text-xs text-neutral-400">/10</span>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RECOMMENDATION_COLOURS[recommendation]}`}
          >
            {RECOMMENDATION_LABELS[recommendation]}
          </span>
        </div>

        {/* Dimension cards */}
        <div className="flex flex-1 gap-3">
          {dimensions.map(({ key, label, icon: Icon }) => {
            const dim = scoring[key];
            return (
              <div
                key={key}
                className="group relative flex-1 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-center"
              >
                <Icon className="mx-auto mb-1 h-4 w-4 text-neutral-400" />
                <p className="text-xs font-medium text-neutral-500">{label}</p>
                <p className={`text-lg font-bold ${scoreColor(dim.score)}`}>
                  {dim.score}<span className="text-xs font-normal text-neutral-400">/10</span>
                </p>
                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg border border-neutral-200 bg-white p-3 opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                  <p className="text-xs text-neutral-600">{dim.reasoning}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
