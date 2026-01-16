'use client';

import React, { useState } from 'react';
import { Clock, User, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils';
import { Button } from '../button';
import { Badge } from '../badge';

export interface HistorySnapshot {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
  };
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
  };
  issues?: Array<{
    type: string;
    field: string;
    message: string;
  }>;
  // Allow additional fields for other tools
  [key: string]: unknown;
}

export interface HistoryEntry {
  scannedAt: string | Date;
  scannedBy?: { name?: string; email?: string } | null;
  score: number;
  changesDetected: boolean;
  snapshot?: HistorySnapshot;
  // Legacy fields
  previousTitle?: string;
  previousDescription?: string;
}

export interface ScanHistoryTimelineProps {
  history: HistoryEntry[];
  parentId: string;
  initialDisplayCount?: number;
  scoreColorFn?: (score: number) => string;
  renderSnapshot?: (snapshot: HistorySnapshot) => React.ReactNode;
  className?: string;
}

const defaultScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600 bg-green-50';
  if (score >= 50) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
};

export function ScanHistoryTimeline({
  history,
  parentId,
  initialDisplayCount = 3,
  scoreColorFn = defaultScoreColor,
  renderSnapshot,
  className,
}: ScanHistoryTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  if (!history || history.length === 0) return null;

  const displayedHistory = showAll
    ? [...history].reverse()
    : history.slice(-initialDisplayCount).reverse();

  const toggleEntry = (entryKey: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      next.has(entryKey) ? next.delete(entryKey) : next.add(entryKey);
      return next;
    });
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500 font-medium">
          Scan History ({history.length} previous {history.length === 1 ? 'scan' : 'scans'})
        </p>
        {history.length > initialDisplayCount && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show less' : `Show all ${history.length}`}
          </Button>
        )}
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-2 top-3 bottom-3 w-0.5 bg-neutral-200" />

        <div className="space-y-3">
          {displayedHistory.map((scan, idx) => {
            const entryKey = `${parentId}-${idx}`;
            const isExpanded = expandedEntries.has(entryKey);
            const scanDate = new Date(scan.scannedAt);

            return (
              <div key={idx} className="relative pl-6">
                {/* Timeline dot */}
                <div
                  className={cn(
                    'absolute left-0.5 top-1.5 w-3 h-3 rounded-full border-2 border-white',
                    scan.changesDetected ? 'bg-amber-500' : 'bg-neutral-300'
                  )}
                />

                <div
                  className={cn(
                    'rounded border bg-white text-xs shadow-sm cursor-pointer transition-all hover:shadow-md',
                    isExpanded && 'ring-2 ring-blue-200'
                  )}
                  onClick={() => toggleEntry(entryKey)}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-neutral-400" />
                        <span className="font-medium">
                          {scanDate.toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          <span className="text-neutral-400">
                            {scanDate.toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('rounded px-1.5 py-0.5 font-medium', scoreColorFn(scan.score))}>
                          {scan.score}%
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-neutral-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-neutral-400" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-neutral-500">
                      <User className="h-3 w-3" />
                      <span>{scan.scannedBy?.name || 'Unknown'}</span>
                      {scan.changesDetected && (
                        <Badge variant="warning" className="text-xs ml-auto">
                          Changes detected
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Expanded view */}
                  {isExpanded && (
                    <div className="border-t border-neutral-100 bg-neutral-50 p-3 space-y-3">
                      <p className="text-xs font-medium text-neutral-700">
                        State before this rescan:
                      </p>

                      {scan.snapshot && renderSnapshot ? (
                        renderSnapshot(scan.snapshot)
                      ) : scan.snapshot ? (
                        <DefaultSnapshotViewer snapshot={scan.snapshot} />
                      ) : (
                        // Legacy fallback
                        <LegacySnapshotViewer
                          previousTitle={scan.previousTitle}
                          previousDescription={scan.previousDescription}
                        />
                      )}

                      {scan.changesDetected && (
                        <div className="rounded border border-amber-200 bg-amber-50 p-2">
                          <span className="text-amber-700 text-xs font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Changes were detected after this scan
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Default snapshot viewer for meta tag data
function DefaultSnapshotViewer({ snapshot }: { snapshot: HistorySnapshot }) {
  return (
    <>
      {/* Basic Meta Tags */}
      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded border bg-white p-2">
          <span className="text-neutral-500 text-xs font-medium">Title</span>
          <p className="font-mono text-xs mt-1">
            {snapshot.title || <span className="text-neutral-400 italic">Not set</span>}
          </p>
        </div>
        <div className="rounded border bg-white p-2">
          <span className="text-neutral-500 text-xs font-medium">Description</span>
          <p className="font-mono text-xs mt-1 line-clamp-2" title={snapshot.description}>
            {snapshot.description || <span className="text-neutral-400 italic">Not set</span>}
          </p>
        </div>
      </div>

      {/* Canonical & Robots */}
      {(snapshot.canonical || snapshot.robots) && (
        <div className="grid gap-2 md:grid-cols-2">
          {snapshot.canonical && (
            <div className="rounded border bg-white p-2">
              <span className="text-neutral-500 text-xs font-medium">Canonical</span>
              <p className="font-mono text-xs mt-1 truncate" title={snapshot.canonical}>
                {snapshot.canonical}
              </p>
            </div>
          )}
          {snapshot.robots && (
            <div className="rounded border bg-white p-2">
              <span className="text-neutral-500 text-xs font-medium">Robots</span>
              <p className="font-mono text-xs mt-1">{snapshot.robots}</p>
            </div>
          )}
        </div>
      )}

      {/* Open Graph */}
      {snapshot.openGraph && (
        <div className="rounded border bg-white p-2">
          <span className="text-neutral-500 text-xs font-medium">Open Graph</span>
          <div className="grid gap-1 mt-1 text-xs">
            {snapshot.openGraph.title && (
              <p>
                <span className="text-neutral-400">og:title:</span> {snapshot.openGraph.title}
              </p>
            )}
            {snapshot.openGraph.description && (
              <p className="truncate" title={snapshot.openGraph.description}>
                <span className="text-neutral-400">og:description:</span>{' '}
                {snapshot.openGraph.description}
              </p>
            )}
            {snapshot.openGraph.image && (
              <p className="truncate" title={snapshot.openGraph.image}>
                <span className="text-neutral-400">og:image:</span> {snapshot.openGraph.image}
              </p>
            )}
            {snapshot.openGraph.type && (
              <p>
                <span className="text-neutral-400">og:type:</span> {snapshot.openGraph.type}
              </p>
            )}
            {!snapshot.openGraph.title &&
              !snapshot.openGraph.description &&
              !snapshot.openGraph.image && (
                <p className="text-neutral-400 italic">No OG tags set</p>
              )}
          </div>
        </div>
      )}

      {/* Twitter */}
      {snapshot.twitter && (
        <div className="rounded border bg-white p-2">
          <span className="text-neutral-500 text-xs font-medium">Twitter Card</span>
          <div className="grid gap-1 mt-1 text-xs">
            {snapshot.twitter.card && (
              <p>
                <span className="text-neutral-400">twitter:card:</span> {snapshot.twitter.card}
              </p>
            )}
            {snapshot.twitter.title && (
              <p>
                <span className="text-neutral-400">twitter:title:</span> {snapshot.twitter.title}
              </p>
            )}
            {snapshot.twitter.site && (
              <p>
                <span className="text-neutral-400">twitter:site:</span> {snapshot.twitter.site}
              </p>
            )}
            {!snapshot.twitter.card && !snapshot.twitter.title && (
              <p className="text-neutral-400 italic">No Twitter tags set</p>
            )}
          </div>
        </div>
      )}

      {/* Issues */}
      {snapshot.issues && snapshot.issues.length > 0 && (
        <div className="rounded border bg-white p-2">
          <span className="text-neutral-500 text-xs font-medium">
            Issues at this time ({snapshot.issues.length})
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {snapshot.issues.map((issue, idx) => (
              <Badge
                key={idx}
                variant={
                  issue.type === 'error'
                    ? 'destructive'
                    : issue.type === 'warning'
                    ? 'warning'
                    : 'success'
                }
                className="text-xs"
                title={issue.message}
              >
                {issue.field}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// Legacy snapshot viewer for old records
function LegacySnapshotViewer({
  previousTitle,
  previousDescription,
}: {
  previousTitle?: string;
  previousDescription?: string;
}) {
  return (
    <>
      <div className="rounded border bg-white p-2">
        <span className="text-neutral-500 text-xs">Title:</span>
        <p className="font-mono text-xs mt-1">
          {previousTitle || <span className="text-neutral-400 italic">Not recorded</span>}
        </p>
      </div>
      <div className="rounded border bg-white p-2">
        <span className="text-neutral-500 text-xs">Description:</span>
        <p className="font-mono text-xs mt-1">
          {previousDescription || <span className="text-neutral-400 italic">Not recorded</span>}
        </p>
      </div>
    </>
  );
}
