'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  BarChart2,
  X,
  Map,
  FileText,
  Link,
} from 'lucide-react';
import { Button, Badge } from '@tds/ui';

interface SucceededUrl {
  url: string;
  score: number;
  analysisId: string;
  processedAt: string;
}

interface FailedUrl {
  url: string;
  error: string;
  attempts: number;
  lastAttemptAt: string;
}

interface SkippedUrl {
  url: string;
  reason: 'duplicate' | 'nested_sitemap' | 'invalid' | 'already_exists';
}

interface BatchReportProps {
  batchId: string;
  status: 'completed' | 'failed' | 'cancelled';
  results: {
    succeeded: SucceededUrl[];
    failed: FailedUrl[];
    skipped: SkippedUrl[];
  };
  averageScore?: number;
  totalUrls: number;
  completedAt?: string;
  source?: 'sitemap' | 'url_list' | 'page_library';
  sourceUrl?: string;
  onClose: () => void;
  onViewAnalysis?: (analysisId: string) => void;
}

export function BatchReport({
  status,
  results,
  averageScore,
  totalUrls: _totalUrls,
  completedAt,
  source,
  sourceUrl,
  onClose,
  onViewAnalysis,
}: BatchReportProps) {
  const [expandedSection, setExpandedSection] = useState<'succeeded' | 'failed' | 'skipped' | null>(null);

  const getSourceIcon = () => {
    switch (source) {
      case 'sitemap':
        return <Map className="h-3.5 w-3.5" />;
      case 'url_list':
        return <FileText className="h-3.5 w-3.5" />;
      case 'page_library':
        return <Link className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  const getSourceLabel = () => {
    switch (source) {
      case 'sitemap':
        return 'Sitemap scan';
      case 'url_list':
        return 'URL list';
      case 'page_library':
        return 'Page Library';
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getSkipReasonLabel = (reason: SkippedUrl['reason']) => {
    switch (reason) {
      case 'duplicate':
        return 'Duplicate URL';
      case 'nested_sitemap':
        return 'Nested sitemap';
      case 'invalid':
        return 'Invalid URL';
      case 'already_exists':
        return 'Already in library';
      default:
        return reason;
    }
  };

  // Deduplicate results by URL (defense in depth for race condition prevention)
  const uniqueSucceeded: Record<string, SucceededUrl> = {};
  results.succeeded.forEach(s => { uniqueSucceeded[s.url] = s; });

  const uniqueFailed: Record<string, FailedUrl> = {};
  results.failed.forEach(f => { uniqueFailed[f.url] = f; });

  const uniqueSkipped: Record<string, SkippedUrl> = {};
  results.skipped.forEach(s => { uniqueSkipped[s.url] = s; });

  // Get deduplicated arrays for display
  const deduplicatedSucceeded = Object.values(uniqueSucceeded);
  const deduplicatedFailed = Object.values(uniqueFailed);
  const deduplicatedSkipped = Object.values(uniqueSkipped);

  // Calculate stats from deduplicated results
  const succeededCount = deduplicatedSucceeded.length;
  const failedCount = deduplicatedFailed.length;
  const skippedCount = deduplicatedSkipped.length;
  const totalProcessed = succeededCount + failedCount + skippedCount;
  const successRate = totalProcessed > 0 ? Math.round((succeededCount / totalProcessed) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              status === 'completed' ? 'bg-green-100' :
              status === 'cancelled' ? 'bg-amber-100' : 'bg-red-100'
            }`}>
              {status === 'completed' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : status === 'cancelled' ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Batch Scan {status === 'completed' ? 'Complete' : status === 'cancelled' ? 'Cancelled' : 'Failed'}
              </h2>
              <div className="flex items-center gap-3 mt-0.5">
                {completedAt && (
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(completedAt).toLocaleString()}
                  </p>
                )}
                {source && (
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    {getSourceIcon()}
                    {getSourceLabel()}
                  </p>
                )}
              </div>
              {sourceUrl && (
                <p className="text-xs text-neutral-400 font-mono mt-1 truncate max-w-md" title={sourceUrl}>
                  {sourceUrl}
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="p-4 border-b">
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg bg-neutral-50 p-3 text-center">
              <p className="text-xs text-neutral-500 mb-1">Processed</p>
              <p className="text-2xl font-bold text-neutral-900">{totalProcessed}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <p className="text-xs text-neutral-500 mb-1">Succeeded</p>
              <p className="text-2xl font-bold text-green-600">{succeededCount}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-center">
              <p className="text-xs text-neutral-500 mb-1">Failed</p>
              <p className="text-2xl font-bold text-red-600">{failedCount}</p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3 text-center">
              <p className="text-xs text-neutral-500 mb-1">Avg Score</p>
              <p className={`text-2xl font-bold ${averageScore ? getScoreColor(averageScore).split(' ')[0] : 'text-neutral-400'}`}>
                {averageScore ? `${averageScore}%` : '-'}
              </p>
            </div>
          </div>

          {/* Success Rate Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-neutral-600">Success Rate</span>
              <span className="font-medium">{successRate}%</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  successRate >= 80 ? 'bg-green-500' :
                  successRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Results Sections */}
        <div className="flex-1 overflow-y-auto">
          {/* Succeeded URLs */}
          {deduplicatedSucceeded.length > 0 && (
            <div className="border-b">
              <button
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                onClick={() => setExpandedSection(expandedSection === 'succeeded' ? null : 'succeeded')}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-neutral-900">
                    Succeeded ({succeededCount})
                  </span>
                </div>
                {expandedSection === 'succeeded' ? (
                  <ChevronUp className="h-4 w-4 text-neutral-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                )}
              </button>
              {expandedSection === 'succeeded' && (
                <div className="px-4 pb-4 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {deduplicatedSucceeded.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-lg bg-green-50/50 hover:bg-green-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${getScoreColor(item.score)}`}>
                            {item.score}%
                          </span>
                          <span className="font-mono text-xs text-neutral-700 truncate" title={item.url}>
                            {item.url.replace(/^https?:\/\//, '').slice(0, 50)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {onViewAnalysis && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => onViewAnalysis(item.analysisId)}
                            >
                              <BarChart2 className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          )}
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-white rounded"
                          >
                            <ExternalLink className="h-3 w-3 text-neutral-400" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Failed URLs */}
          {deduplicatedFailed.length > 0 && (
            <div className="border-b">
              <button
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                onClick={() => setExpandedSection(expandedSection === 'failed' ? null : 'failed')}
              >
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-neutral-900">
                    Failed ({failedCount})
                  </span>
                </div>
                {expandedSection === 'failed' ? (
                  <ChevronUp className="h-4 w-4 text-neutral-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                )}
              </button>
              {expandedSection === 'failed' && (
                <div className="px-4 pb-4 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {deduplicatedFailed.map((item, index) => (
                      <div
                        key={index}
                        className="p-2 rounded-lg bg-red-50/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-neutral-700 truncate" title={item.url}>
                            {item.url.replace(/^https?:\/\//, '').slice(0, 50)}
                          </span>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-white rounded flex-shrink-0"
                          >
                            <ExternalLink className="h-3 w-3 text-neutral-400" />
                          </a>
                        </div>
                        <p className="text-xs text-red-600 mt-1">{item.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Skipped URLs */}
          {deduplicatedSkipped.length > 0 && (
            <div className="border-b">
              <button
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                onClick={() => setExpandedSection(expandedSection === 'skipped' ? null : 'skipped')}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-neutral-900">
                    Skipped ({skippedCount})
                  </span>
                </div>
                {expandedSection === 'skipped' ? (
                  <ChevronUp className="h-4 w-4 text-neutral-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                )}
              </button>
              {expandedSection === 'skipped' && (
                <div className="px-4 pb-4 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {deduplicatedSkipped.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50"
                      >
                        <span className="font-mono text-xs text-neutral-700 truncate" title={item.url}>
                          {item.url.replace(/^https?:\/\//, '').slice(0, 50)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getSkipReasonLabel(item.reason)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-neutral-50">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
