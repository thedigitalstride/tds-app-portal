'use client';

import React from 'react';
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@tds/ui';
import type { MetadataSnapshot, AnalysisIssue, OpenGraphData, TwitterData } from './types';

interface MetadataViewerProps {
  data: MetadataSnapshot;
  url: string;
  showIssues?: boolean;
  compact?: boolean;
}

/**
 * Reusable component for displaying full meta tag analysis data.
 * Used in both the main expanded row view and history snapshot details.
 */
export function MetadataViewer({
  data,
  url,
  showIssues = true,
  compact = false,
}: MetadataViewerProps) {
  const issues = data.issues || [];

  return (
    <div className={`space-y-4 ${compact ? 'text-xs' : ''}`}>
      {/* Meta Tags Grid */}
      <div className={`grid gap-4 ${compact ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
        {/* Left Column - Basic Meta Tags */}
        <div className="space-y-3">
          <h4 className={`font-medium text-neutral-700 ${compact ? 'text-xs' : 'text-sm'}`}>
            Basic Meta Tags
          </h4>

          {/* Title */}
          <MetaField
            label="Title"
            value={data.title}
            maxLength={60}
            issue={issues.find(i => i.field.toLowerCase() === 'title')}
            compact={compact}
          />

          {/* Description */}
          <MetaField
            label="Description"
            value={data.description}
            maxLength={160}
            issue={issues.find(i => i.field.toLowerCase() === 'description')}
            multiline
            compact={compact}
          />

          {/* Canonical */}
          <MetaField
            label="Canonical URL"
            value={data.canonical}
            issue={issues.find(i => i.field.toLowerCase() === 'canonical')}
            compact={compact}
          />
        </div>

        {/* Right Column - Social Tags */}
        <div className="space-y-3">
          <h4 className={`font-medium text-neutral-700 ${compact ? 'text-xs' : 'text-sm'}`}>
            Social Tags
          </h4>

          {/* Open Graph */}
          <OpenGraphSection
            openGraph={data.openGraph}
            issue={issues.find(i => i.field.toLowerCase() === 'og image' || i.field.toLowerCase() === 'open graph')}
            compact={compact}
          />

          {/* Twitter */}
          <TwitterCardSection
            twitter={data.twitter}
            issue={issues.find(i => i.field.toLowerCase() === 'twitter card')}
            compact={compact}
          />
        </div>
      </div>

      {/* Technical Meta Tags Section */}
      <div className="border-t pt-4">
        <h4 className={`font-medium text-neutral-700 mb-3 ${compact ? 'text-xs' : 'text-sm'}`}>
          Technical Meta Tags
        </h4>

        {/* Primary Technical Fields - 4 columns */}
        <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
          <TechnicalField label="Viewport" value={data.viewport} />
          <TechnicalField label="Charset" value={data.charset} />
          <TechnicalField label="Language" value={data.language} />
          <TechnicalField label="Robots" value={data.robots} />
        </div>

        {/* Secondary Technical Fields - conditional */}
        {(data.author || data.themeColor || data.favicon) && (
          <div className={`grid gap-3 mt-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
            {data.author && (
              <TechnicalField label="Author" value={data.author} />
            )}
            {data.themeColor && (
              <div className="text-xs">
                <span className="text-neutral-500">Theme Color</span>
                <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded border mt-0.5">
                  <div
                    className="h-5 w-5 rounded border flex-shrink-0"
                    style={{ backgroundColor: data.themeColor }}
                  />
                  <span className="font-mono truncate">{data.themeColor}</span>
                </div>
              </div>
            )}
            {data.favicon && (
              <div className="text-xs">
                <span className="text-neutral-500">Favicon</span>
                <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded border mt-0.5">
                  <img
                    src={data.favicon.startsWith('http') ? data.favicon : (() => {
                      try {
                        return new URL(data.favicon, url).toString();
                      } catch {
                        return data.favicon;
                      }
                    })()}
                    alt="Favicon"
                    className="h-5 w-5 flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="font-mono text-[10px] truncate" title={data.favicon}>
                    {data.favicon}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hreflang Tags - full width if present */}
        {data.hreflang && data.hreflang.length > 0 && (
          <div className="mt-3 text-xs">
            <span className="text-neutral-500">Hreflang Tags ({data.hreflang.length})</span>
            <div className="mt-1 space-y-1 max-h-24 overflow-y-auto bg-white/80 p-2 rounded border">
              {data.hreflang.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-[10px] flex-shrink-0">
                    {entry.lang}
                  </Badge>
                  <span className="font-mono text-[10px] truncate" title={entry.url}>
                    {entry.url}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Issues Summary */}
      {showIssues && issues.length > 0 && (
        <div>
          <h4 className={`font-medium text-neutral-700 mb-2 ${compact ? 'text-xs' : 'text-sm'}`}>
            Issues Found
          </h4>
          <div className="flex flex-wrap gap-2">
            {issues.map((issue, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                  issue.type === 'error' ? 'bg-red-50 text-red-700' :
                  issue.type === 'warning' ? 'bg-amber-50 text-amber-700' :
                  'bg-green-50 text-green-700'
                }`}
              >
                {issue.type === 'error' ? <AlertCircle className="h-3 w-3" /> :
                 issue.type === 'warning' ? <AlertTriangle className="h-3 w-3" /> :
                 <CheckCircle className="h-3 w-3" />}
                <span className="font-medium">{issue.field}:</span>
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for technical field display
function TechnicalField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="text-xs">
      <span className="text-neutral-500">{label}</span>
      <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 truncate" title={value}>
        {value || <span className="text-neutral-400 italic">Not set</span>}
      </p>
    </div>
  );
}

// Helper component for meta field display with validation status
function MetaField({
  label,
  value,
  maxLength,
  issue,
  multiline = false,
  compact = false,
}: {
  label: string;
  value?: string;
  maxLength?: number;
  issue?: AnalysisIssue;
  multiline?: boolean;
  compact?: boolean;
}) {
  const status = issue?.type || 'success';
  const statusStyles = {
    error: 'border-red-300 bg-red-50/50',
    warning: 'border-amber-300 bg-amber-50/50',
    success: 'border-green-300 bg-green-50/50',
  };
  const badgeStyles = {
    error: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
    warning: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
    success: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  };
  const badge = badgeStyles[status as keyof typeof badgeStyles];
  const BadgeIcon = badge.icon;

  return (
    <div className={`relative rounded-lg border-2 p-2 ${statusStyles[status as keyof typeof statusStyles]}`}>
      <div className="absolute -top-2 right-2">
        <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2.5 w-2.5" />
          <span>{status === 'success' ? 'Good' : status === 'error' ? 'Error' : 'Warning'}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-neutral-700 font-medium ${compact ? 'text-[10px]' : 'text-xs'}`}>{label}</span>
        {maxLength && (
          <span className={`text-[10px] ${(value?.length || 0) > maxLength ? 'text-red-500' : 'text-neutral-400'}`}>
            {value?.length || 0}/{maxLength}
          </span>
        )}
      </div>
      <p className={`font-mono text-xs bg-white/80 p-1.5 rounded border ${multiline ? 'line-clamp-2' : 'truncate'}`} title={value}>
        {value || <span className="text-neutral-400 italic">Not set</span>}
      </p>
      {issue && (
        <p className="mt-1 text-[10px] text-neutral-600">{issue.message}</p>
      )}
    </div>
  );
}

// Helper component for Open Graph section display
function OpenGraphSection({
  openGraph,
  issue,
  compact = false,
}: {
  openGraph?: OpenGraphData;
  issue?: AnalysisIssue;
  compact?: boolean;
}) {
  const hasAnyField = openGraph && (openGraph.title || openGraph.description || openGraph.image || openGraph.url || openGraph.type || openGraph.siteName);
  const status = issue?.type || (hasAnyField ? 'success' : 'warning');
  const statusStyles = {
    error: 'border-red-300 bg-red-50/50',
    warning: 'border-amber-300 bg-amber-50/50',
    success: 'border-green-300 bg-green-50/50',
  };
  const badgeStyles = {
    error: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
    warning: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
    success: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  };
  const badge = badgeStyles[status as keyof typeof badgeStyles];
  const BadgeIcon = badge.icon;

  return (
    <div className={`relative rounded-lg border-2 p-2 ${statusStyles[status as keyof typeof statusStyles]}`}>
      <div className="absolute -top-2 right-2">
        <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2.5 w-2.5" />
          <span>{status === 'success' ? 'Good' : status === 'error' ? 'Error' : 'Warning'}</span>
        </div>
      </div>
      <span className={`text-neutral-700 font-medium ${compact ? 'text-[10px]' : 'text-xs'}`}>Open Graph</span>
      <div className="mt-1 space-y-1.5">
        {openGraph?.image && (
          <div className="flex items-center gap-2">
            <img
              src={openGraph.image}
              alt="OG preview"
              className="h-10 w-16 object-cover rounded border flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <p className="font-mono text-[10px] truncate flex-1" title={openGraph.image}>
              {openGraph.image}
            </p>
          </div>
        )}
        {openGraph?.title && (
          <div className="text-[10px]">
            <span className="text-neutral-500">og:title</span>
            <p className="font-mono bg-white/80 p-1 rounded border truncate" title={openGraph.title}>
              {openGraph.title}
            </p>
          </div>
        )}
        {openGraph?.description && (
          <div className="text-[10px]">
            <span className="text-neutral-500">og:description</span>
            <p className="font-mono bg-white/80 p-1 rounded border line-clamp-2" title={openGraph.description}>
              {openGraph.description}
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {openGraph?.type && (
            <div className="text-[10px]">
              <span className="text-neutral-500">og:type</span>
              <p className="font-mono bg-white/80 p-1 rounded border truncate">{openGraph.type}</p>
            </div>
          )}
          {openGraph?.siteName && (
            <div className="text-[10px]">
              <span className="text-neutral-500">og:site_name</span>
              <p className="font-mono bg-white/80 p-1 rounded border truncate">{openGraph.siteName}</p>
            </div>
          )}
        </div>
        {openGraph?.url && (
          <div className="text-[10px]">
            <span className="text-neutral-500">og:url</span>
            <p className="font-mono bg-white/80 p-1 rounded border truncate" title={openGraph.url}>
              {openGraph.url}
            </p>
          </div>
        )}
        {!hasAnyField && (
          <p className="font-mono text-[10px] bg-white/80 p-1 rounded border text-neutral-400 italic">
            Not set
          </p>
        )}
      </div>
      {issue && (
        <p className="mt-1 text-[10px] text-neutral-600">{issue.message}</p>
      )}
    </div>
  );
}

// Helper component for Twitter Card section display
function TwitterCardSection({
  twitter,
  issue,
  compact = false,
}: {
  twitter?: TwitterData;
  issue?: AnalysisIssue;
  compact?: boolean;
}) {
  const hasAnyField = twitter && (twitter.card || twitter.title || twitter.description || twitter.image || twitter.site);
  const status = issue?.type || (hasAnyField ? 'success' : 'warning');
  const statusStyles = {
    error: 'border-red-300 bg-red-50/50',
    warning: 'border-amber-300 bg-amber-50/50',
    success: 'border-green-300 bg-green-50/50',
  };
  const badgeStyles = {
    error: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
    warning: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
    success: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  };
  const badge = badgeStyles[status as keyof typeof badgeStyles];
  const BadgeIcon = badge.icon;

  return (
    <div className={`relative rounded-lg border-2 p-2 ${statusStyles[status as keyof typeof statusStyles]}`}>
      <div className="absolute -top-2 right-2">
        <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2.5 w-2.5" />
          <span>{status === 'success' ? 'Good' : status === 'error' ? 'Error' : 'Warning'}</span>
        </div>
      </div>
      <span className={`text-neutral-700 font-medium ${compact ? 'text-[10px]' : 'text-xs'}`}>Twitter Card</span>
      <div className="mt-1 space-y-1.5">
        {twitter?.image && (
          <div className="flex items-center gap-2">
            <img
              src={twitter.image}
              alt="Twitter preview"
              className="h-10 w-16 object-cover rounded border flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <p className="font-mono text-[10px] truncate flex-1" title={twitter.image}>
              {twitter.image}
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {twitter?.card && (
            <div className="text-[10px]">
              <span className="text-neutral-500">twitter:card</span>
              <p className="font-mono bg-white/80 p-1 rounded border truncate">{twitter.card}</p>
            </div>
          )}
          {twitter?.site && (
            <div className="text-[10px]">
              <span className="text-neutral-500">twitter:site</span>
              <p className="font-mono bg-white/80 p-1 rounded border truncate">{twitter.site}</p>
            </div>
          )}
        </div>
        {twitter?.title && (
          <div className="text-[10px]">
            <span className="text-neutral-500">twitter:title</span>
            <p className="font-mono bg-white/80 p-1 rounded border truncate" title={twitter.title}>
              {twitter.title}
            </p>
          </div>
        )}
        {twitter?.description && (
          <div className="text-[10px]">
            <span className="text-neutral-500">twitter:description</span>
            <p className="font-mono bg-white/80 p-1 rounded border line-clamp-2" title={twitter.description}>
              {twitter.description}
            </p>
          </div>
        )}
        {!hasAnyField && (
          <p className="font-mono text-[10px] bg-white/80 p-1 rounded border text-neutral-400 italic">
            Not set
          </p>
        )}
      </div>
      {issue && (
        <p className="mt-1 text-[10px] text-neutral-600">{issue.message}</p>
      )}
    </div>
  );
}
