'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@tds/ui';
import type { V2CategoryScores } from './types';
import { InfoTooltip } from './InfoTooltip';
import {
  getScoreColor,
  getScoreBgColor,
  getScoreRingColor,
} from '../lib/score-utils';

interface ScoreDashboardProps {
  overallScore: number;
  previousScore?: number;
  categoryScores: V2CategoryScores;
}

interface CircularScoreProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

function CircularScore({ score, size = 160, strokeWidth = 12 }: CircularScoreProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-neutral-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={getScoreRingColor(score)}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</span>
        <span className="text-sm text-neutral-500">out of 100</span>
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<keyof V2CategoryScores, { label: string; weight: string; tooltipKey: string }> = {
  messageMatch: { label: 'Message Match', weight: '25%', tooltipKey: 'messageMatch' },
  adScent: { label: 'Ad Scent', weight: '20%', tooltipKey: 'adScent' },
  conversionElements: { label: 'Conversion Elements', weight: '20%', tooltipKey: 'conversionElements' },
  technicalQuality: { label: 'Technical Quality', weight: '15%', tooltipKey: 'technicalQuality' },
  contentRelevance: { label: 'Content Relevance', weight: '10%', tooltipKey: 'contentRelevance' },
  trustCredibility: { label: 'Trust & Credibility', weight: '10%', tooltipKey: 'trustCredibility' },
};

export function ScoreDashboard({
  overallScore,
  previousScore,
  categoryScores,
}: ScoreDashboardProps) {
  const scoreDiff = previousScore !== undefined ? overallScore - previousScore : 0;

  return (
    <Card className="p-6">
      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* Overall Score */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 mb-2">
            <InfoTooltip tooltipKey="overallScore" label="Overall Score" size="md" />
          </div>
          <CircularScore score={overallScore} />
          {previousScore !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {scoreDiff > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">+{scoreDiff} from last scan</span>
                </>
              ) : scoreDiff < 0 ? (
                <>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">{scoreDiff} from last scan</span>
                </>
              ) : (
                <>
                  <Minus className="h-4 w-4 text-neutral-400" />
                  <span className="text-sm text-neutral-500">No change from last scan</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Category Scores */}
        <div className="flex-1 w-full">
          <h3 className="text-sm font-medium text-neutral-700 mb-4">Category Scores</h3>
          <div className="space-y-3">
            {(Object.keys(CATEGORY_LABELS) as (keyof V2CategoryScores)[]).map((key) => {
              const score = categoryScores[key];
              const { label, weight, tooltipKey } = CATEGORY_LABELS[key];

              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-36">
                    <InfoTooltip tooltipKey={tooltipKey} label={label} size="sm" variant="muted" />
                  </div>
                  <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getScoreBgColor(score)}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <div className="w-12 text-right">
                    <span className={`text-sm font-medium ${getScoreColor(score)}`}>
                      {score}
                    </span>
                  </div>
                  <div className="w-10 text-xs text-neutral-400">{weight}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
