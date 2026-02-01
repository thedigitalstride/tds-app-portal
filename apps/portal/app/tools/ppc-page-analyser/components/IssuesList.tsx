'use client';

import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Badge } from '@tds/ui';
import type { V2Issue, V2CategoryScores } from './types';
import { InfoTooltip } from './InfoTooltip';

interface IssuesListProps {
  issues: V2Issue[];
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    badgeVariant: 'destructive' as const,
    label: 'Critical',
    tooltipKey: 'severityCritical',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-500',
    badgeVariant: 'warning' as const,
    label: 'Warning',
    tooltipKey: 'severityWarning',
  },
  suggestion: {
    icon: Lightbulb,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    badgeVariant: 'secondary' as const,
    label: 'Suggestion',
    tooltipKey: 'severitySuggestion',
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

interface IssueItemProps {
  issue: V2Issue;
}

function IssueItem({ issue }: IssueItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = SEVERITY_CONFIG[issue.severity];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-neutral-900">{issue.element}</span>
            <Badge variant={config.badgeVariant} className="text-xs">
              {config.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {CATEGORY_LABELS[issue.category]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-neutral-600">{issue.problem}</p>
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
        <div className="px-4 pb-4 pt-0 ml-8 space-y-2">
          {issue.location && (
            <div>
              <span className="text-xs font-medium text-neutral-500">Location:</span>
              <span className="ml-2 text-sm text-neutral-700">{issue.location}</span>
            </div>
          )}
          <div>
            <span className="text-xs font-medium text-neutral-500">Impact:</span>
            <span className="ml-2 text-sm text-neutral-700">{issue.impact}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function IssuesList({ issues }: IssuesListProps) {
  const criticalIssues = issues.filter((i) => i.severity === 'critical');
  const warningIssues = issues.filter((i) => i.severity === 'warning');
  const suggestionIssues = issues.filter((i) => i.severity === 'suggestion');

  if (issues.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
            <AlertCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900">No Issues Found</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Your landing page looks great! No critical issues detected.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-neutral-900">Issues</h3>
        <div className="flex items-center gap-2">
          {criticalIssues.length > 0 && (
            <Badge variant="destructive" className="inline-flex items-center gap-1">
              {criticalIssues.length} Critical
              <InfoTooltip tooltipKey="severityCritical" iconOnly size="xs" />
            </Badge>
          )}
          {warningIssues.length > 0 && (
            <Badge variant="warning" className="inline-flex items-center gap-1">
              {warningIssues.length} Warnings
              <InfoTooltip tooltipKey="severityWarning" iconOnly size="xs" />
            </Badge>
          )}
          {suggestionIssues.length > 0 && (
            <Badge variant="secondary" className="inline-flex items-center gap-1">
              {suggestionIssues.length} Suggestions
              <InfoTooltip tooltipKey="severitySuggestion" iconOnly size="xs" />
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Critical issues first */}
        {criticalIssues.map((issue, index) => (
          <IssueItem key={`critical-${index}`} issue={issue} />
        ))}
        {/* Then warnings */}
        {warningIssues.map((issue, index) => (
          <IssueItem key={`warning-${index}`} issue={issue} />
        ))}
        {/* Then suggestions */}
        {suggestionIssues.map((issue, index) => (
          <IssueItem key={`suggestion-${index}`} issue={issue} />
        ))}
      </div>
    </Card>
  );
}
