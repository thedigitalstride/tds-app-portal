'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, MinusCircle, XCircle } from 'lucide-react';
import { Card } from '@tds/ui';
import type { MessageMatchItem } from './types';
import { InfoTooltip } from './InfoTooltip';

interface MessageMatchVisualizerProps {
  messageMatchMap: MessageMatchItem[];
}

const MATCH_CONFIG = {
  strong: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    lineColor: 'bg-green-400',
    label: 'Strong Match',
    tooltipKey: 'matchStrong',
  },
  partial: {
    icon: MinusCircle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    lineColor: 'bg-yellow-400',
    label: 'Partial Match',
    tooltipKey: 'matchPartial',
  },
  weak: {
    icon: AlertCircle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    lineColor: 'bg-orange-400',
    label: 'Weak Match',
    tooltipKey: 'matchWeak',
  },
  missing: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    lineColor: 'bg-red-400',
    label: 'Missing',
    tooltipKey: 'matchMissing',
  },
};

interface MatchItemProps {
  item: MessageMatchItem;
}

function MatchItem({ item }: MatchItemProps) {
  const config = MATCH_CONFIG[item.matchStrength];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4`}>
      <div className="flex items-start gap-4">
        {/* Ad Element */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
            Ad Element
          </div>
          <p className="text-sm text-neutral-900 font-medium">{item.adElement}</p>
        </div>

        {/* Connection Indicator */}
        <div className="flex flex-col items-center justify-center px-2">
          <div className={`w-8 h-0.5 ${config.lineColor}`} />
          <Icon className={`h-5 w-5 my-1 ${config.color}`} />
          <div className={`w-8 h-0.5 ${config.lineColor}`} />
        </div>

        {/* Page Element */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
            Page Element
          </div>
          {item.pageElement ? (
            <p className="text-sm text-neutral-900">{item.pageElement}</p>
          ) : (
            <p className="text-sm text-neutral-400 italic">Not found on page</p>
          )}
        </div>
      </div>

      {/* Match Info */}
      <div className="mt-3 flex items-center justify-between">
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        {item.notes && (
          <span className="text-xs text-neutral-500 truncate ml-2">{item.notes}</span>
        )}
      </div>
    </div>
  );
}

export function MessageMatchVisualizer({ messageMatchMap }: MessageMatchVisualizerProps) {
  const strongCount = messageMatchMap.filter((m) => m.matchStrength === 'strong').length;
  const partialCount = messageMatchMap.filter((m) => m.matchStrength === 'partial').length;
  const weakCount = messageMatchMap.filter((m) => m.matchStrength === 'weak').length;
  const missingCount = messageMatchMap.filter((m) => m.matchStrength === 'missing').length;

  if (messageMatchMap.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-neutral-900">No Message Match Data</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Message match analysis is not available for this page.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-neutral-900">Message Match Analysis</h3>
          <InfoTooltip tooltipKey="messageMatch" iconOnly size="sm" />
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          How well your ad elements appear on the landing page
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
          <div className="text-2xl font-bold text-green-600">{strongCount}</div>
          <div className="text-xs text-green-700 flex items-center justify-center gap-1">
            Strong
            <InfoTooltip tooltipKey="matchStrong" iconOnly size="xs" />
          </div>
        </div>
        <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">{partialCount}</div>
          <div className="text-xs text-yellow-700 flex items-center justify-center gap-1">
            Partial
            <InfoTooltip tooltipKey="matchPartial" iconOnly size="xs" />
          </div>
        </div>
        <div className="text-center p-3 rounded-lg bg-orange-50 border border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{weakCount}</div>
          <div className="text-xs text-orange-700 flex items-center justify-center gap-1">
            Weak
            <InfoTooltip tooltipKey="matchWeak" iconOnly size="xs" />
          </div>
        </div>
        <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
          <div className="text-2xl font-bold text-red-600">{missingCount}</div>
          <div className="text-xs text-red-700 flex items-center justify-center gap-1">
            Missing
            <InfoTooltip tooltipKey="matchMissing" iconOnly size="xs" />
          </div>
        </div>
      </div>

      {/* Match Items */}
      <div className="space-y-3">
        {messageMatchMap.map((item, index) => (
          <MatchItem key={index} item={item} />
        ))}
      </div>
    </Card>
  );
}
