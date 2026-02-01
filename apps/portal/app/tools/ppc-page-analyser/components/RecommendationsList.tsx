'use client';

import React, { useState } from 'react';
import { ArrowUp, ArrowRight, ArrowDown, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { Card, Badge } from '@tds/ui';
import type { V2Recommendation, V2CategoryScores } from './types';
import { InfoTooltip } from './InfoTooltip';

interface RecommendationsListProps {
  recommendations: V2Recommendation[];
}

const PRIORITY_CONFIG = {
  high: {
    icon: ArrowUp,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    badgeVariant: 'destructive' as const,
    label: 'High Priority',
    tooltipKey: 'priorityHigh',
  },
  medium: {
    icon: ArrowRight,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    badgeVariant: 'warning' as const,
    label: 'Medium Priority',
    tooltipKey: 'priorityMedium',
  },
  low: {
    icon: ArrowDown,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
    badgeVariant: 'secondary' as const,
    label: 'Low Priority',
    tooltipKey: 'priorityLow',
  },
};

const CATEGORY_LABELS: Record<keyof V2CategoryScores, string> = {
  messageMatch: 'Message Match',
  adScent: 'Ad Scent',
  conversionElements: 'Conversion',
  technicalQuality: 'Technical',
  contentRelevance: 'Content',
  trustCredibility: 'Trust',
};

interface RecommendationItemProps {
  recommendation: V2Recommendation;
  index: number;
}

function RecommendationItem({ recommendation, index }: RecommendationItemProps) {
  const [isExpanded, setIsExpanded] = useState(index < 3); // Auto-expand first 3
  const config = PRIORITY_CONFIG[recommendation.priority];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center">
          <span className="text-sm font-semibold text-neutral-600">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Icon className={`h-4 w-4 ${config.iconColor}`} />
            <Badge variant={config.badgeVariant} className="text-xs">
              {config.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {CATEGORY_LABELS[recommendation.category]}
            </Badge>
          </div>
          <p className="mt-1 font-medium text-neutral-900">{recommendation.action}</p>
        </div>
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-neutral-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-neutral-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 ml-11 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-3 border border-neutral-200">
              <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                Current State
              </h4>
              <p className="text-sm text-neutral-700">{recommendation.currentState}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-neutral-200">
              <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                Suggested Change
              </h4>
              <p className="text-sm text-neutral-700">{recommendation.suggestedChange}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-white rounded-lg p-3 border border-neutral-200">
            <Zap className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                Expected Impact
              </h4>
              <p className="text-sm text-neutral-700">{recommendation.estimatedImpact}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  // Sort by priority: high first, then medium, then low
  const sortedRecs = [...recommendations].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  if (recommendations.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
            <Zap className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900">All Good!</h3>
          <p className="mt-1 text-sm text-neutral-500">
            No specific recommendations at this time.
          </p>
        </div>
      </Card>
    );
  }

  const highCount = recommendations.filter((r) => r.priority === 'high').length;
  const mediumCount = recommendations.filter((r) => r.priority === 'medium').length;
  const lowCount = recommendations.filter((r) => r.priority === 'low').length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-neutral-900">Recommendations</h3>
        <div className="flex items-center gap-2">
          {highCount > 0 && (
            <Badge variant="destructive" className="inline-flex items-center gap-1">
              {highCount} High
              <InfoTooltip tooltipKey="priorityHigh" iconOnly size="xs" />
            </Badge>
          )}
          {mediumCount > 0 && (
            <Badge variant="warning" className="inline-flex items-center gap-1">
              {mediumCount} Medium
              <InfoTooltip tooltipKey="priorityMedium" iconOnly size="xs" />
            </Badge>
          )}
          {lowCount > 0 && (
            <Badge variant="secondary" className="inline-flex items-center gap-1">
              {lowCount} Low
              <InfoTooltip tooltipKey="priorityLow" iconOnly size="xs" />
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {sortedRecs.map((rec, index) => (
          <RecommendationItem key={index} recommendation={rec} index={index} />
        ))}
      </div>
    </Card>
  );
}
