'use client';

import React from 'react';
import { ThumbsUp, ThumbsDown, Zap } from 'lucide-react';
import { Card } from '@tds/ui';
import type { V2Summary } from './types';
import { InfoTooltip } from './InfoTooltip';

interface AnalysisSummaryProps {
  summary: V2Summary;
}

export function AnalysisSummary({ summary }: AnalysisSummaryProps) {
  const hasContent =
    summary.strengths.length > 0 ||
    summary.weaknesses.length > 0 ||
    summary.quickWins.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium text-neutral-900 mb-4">Analysis Summary</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Strengths */}
        {summary.strengths.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ThumbsUp className="h-5 w-5 text-green-500" />
              <h4 className="font-medium text-neutral-900">Strengths</h4>
              <InfoTooltip tooltipKey="summaryStrengths" iconOnly size="sm" />
            </div>
            <ul className="space-y-2">
              {summary.strengths.map((strength, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-neutral-600"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {summary.weaknesses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ThumbsDown className="h-5 w-5 text-red-500" />
              <h4 className="font-medium text-neutral-900">Weaknesses</h4>
              <InfoTooltip tooltipKey="summaryWeaknesses" iconOnly size="sm" />
            </div>
            <ul className="space-y-2">
              {summary.weaknesses.map((weakness, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-neutral-600"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  {weakness}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick Wins */}
        {summary.quickWins.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-amber-500" />
              <h4 className="font-medium text-neutral-900">Quick Wins</h4>
              <InfoTooltip tooltipKey="summaryQuickWins" iconOnly size="sm" />
            </div>
            <ul className="space-y-2">
              {summary.quickWins.map((quickWin, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-neutral-600"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  {quickWin}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
