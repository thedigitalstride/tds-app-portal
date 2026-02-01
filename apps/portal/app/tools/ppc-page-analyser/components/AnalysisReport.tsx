'use client';

import React from 'react';
import { ExternalLink, Sparkles, Clock, Bot } from 'lucide-react';
import { Badge } from '@tds/ui';
import { ScoreDashboard } from './ScoreDashboard';
import { AnalysisSummary } from './AnalysisSummary';
import { IssuesList } from './IssuesList';
import { RecommendationsList } from './RecommendationsList';
import { MessageMatchVisualizer } from './MessageMatchVisualizer';
import type { AnalysisV2, AdData } from './types';

interface AnalysisReportProps {
  url: string;
  analysisV2: AnalysisV2;
  adData?: AdData;
  aiProvider?: 'claude' | 'openai';
  aiModel?: string;
  analysisFocus?: 'ecommerce' | 'leadgen' | 'b2b' | 'general';
  analysisTimeMs?: number;
  analyzedAt?: string;
  previousScore?: number;
}

const FOCUS_LABELS = {
  general: 'General',
  ecommerce: 'E-commerce',
  leadgen: 'Lead Gen',
  b2b: 'B2B',
};

const PROVIDER_LABELS = {
  claude: 'Claude',
  openai: 'OpenAI',
};

export function AnalysisReport({
  url,
  analysisV2,
  adData,
  aiProvider,
  aiModel,
  analysisFocus,
  analysisTimeMs,
  analyzedAt,
  previousScore,
}: AnalysisReportProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-lg font-medium text-blue-600 hover:text-blue-800 truncate max-w-full"
          >
            <span className="truncate">{url}</span>
            <ExternalLink className="h-4 w-4 flex-shrink-0" />
          </a>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            {aiProvider && (
              <Badge variant="outline" className="flex items-center gap-1">
                {aiProvider === 'claude' ? (
                  <Sparkles className="h-3 w-3" />
                ) : (
                  <Bot className="h-3 w-3" />
                )}
                {PROVIDER_LABELS[aiProvider]}
                {aiModel && ` (${aiModel.split('-').slice(-1)[0]})`}
              </Badge>
            )}
            {analysisFocus && analysisFocus !== 'general' && (
              <Badge variant="secondary">{FOCUS_LABELS[analysisFocus]}</Badge>
            )}
            {analysisTimeMs && (
              <span className="text-sm text-neutral-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Analyzed in {(analysisTimeMs / 1000).toFixed(1)}s
              </span>
            )}
            {analyzedAt && (
              <span className="text-sm text-neutral-500">
                {new Date(analyzedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Score Dashboard */}
      <ScoreDashboard
        overallScore={analysisV2.overallScore}
        previousScore={previousScore}
        categoryScores={analysisV2.categoryScores}
      />

      {/* Summary */}
      <AnalysisSummary summary={analysisV2.summary} />

      {/* Message Match */}
      {analysisV2.messageMatchMap.length > 0 && (
        <MessageMatchVisualizer messageMatchMap={analysisV2.messageMatchMap} />
      )}

      {/* Two Column Layout for Issues and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IssuesList issues={analysisV2.issues} />
        <RecommendationsList recommendations={analysisV2.recommendations} />
      </div>

      {/* Ad Data Preview (if available) */}
      {adData && (
        <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <h4 className="text-sm font-medium text-neutral-700 mb-3">Ad Creative Used</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs font-medium text-neutral-500 mb-1">Headlines</div>
              <ul className="space-y-1">
                {adData.headlines.slice(0, 3).map((h, i) => (
                  <li key={i} className="text-neutral-600 truncate">
                    {h.text}
                  </li>
                ))}
                {adData.headlines.length > 3 && (
                  <li className="text-neutral-400">+{adData.headlines.length - 3} more</li>
                )}
              </ul>
            </div>
            <div>
              <div className="text-xs font-medium text-neutral-500 mb-1">Descriptions</div>
              <ul className="space-y-1">
                {adData.descriptions.slice(0, 2).map((d, i) => (
                  <li key={i} className="text-neutral-600 truncate">
                    {d.text}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-medium text-neutral-500 mb-1">Keywords</div>
              <ul className="space-y-1">
                {adData.keywords.slice(0, 3).map((k, i) => (
                  <li key={i} className="text-neutral-600 truncate">
                    [{k.matchType}] {k.text}
                  </li>
                ))}
                {adData.keywords.length > 3 && (
                  <li className="text-neutral-400">+{adData.keywords.length - 3} more</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
