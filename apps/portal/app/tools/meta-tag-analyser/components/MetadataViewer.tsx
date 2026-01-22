'use client';

import React from 'react';
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@tds/ui';
import type {
  MetadataSnapshot,
  AnalysisIssue,
  OpenGraphData,
  TwitterData,
  StructuredData,
  TechnicalSeo,
  SiteVerification,
  Mobile,
  Security,
  ImageValidations,
} from './types';

// Field criticality levels for SEO guidance
type FieldCriticality = 'critical' | 'important' | 'optional';

const FIELD_CRITICALITY: Record<string, FieldCriticality> = {
  // Critical - must have for proper SEO/social
  'title': 'critical',
  'description': 'critical',
  'viewport': 'critical',
  'canonical': 'critical',
  'og:title': 'critical',
  'og:description': 'critical',
  'og:image': 'critical',
  'og:url': 'critical',
  'twitter:card': 'critical',
  'twitter:title': 'critical',
  'twitter:description': 'critical',
  'twitter:image': 'critical',

  // Important - best practice for complete optimization
  'charset': 'important',
  'language': 'important',
  'og:type': 'important',
  'og:site_name': 'important',
  'twitter:site': 'important',

  // All others default to 'optional'
};

function getFieldStatus(
  fieldName: string,
  value: string | undefined | null,
  issue?: AnalysisIssue
): 'error' | 'warning' | 'success' {
  // If there's an explicit issue, use its type
  if (issue) return issue.type === 'success' ? 'success' : issue.type;

  // If field has a value, it's success
  if (value && value.trim() !== '') return 'success';

  // Field is empty - determine status based on criticality
  const criticality = FIELD_CRITICALITY[fieldName.toLowerCase()] || 'optional';
  switch (criticality) {
    case 'critical': return 'error';
    case 'important': return 'warning';
    default: return 'warning'; // Optional fields still show warning to indicate missing
  }
}

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
            fieldName="title"
            maxLength={60}
            issue={issues.find(i => i.field.toLowerCase() === 'title')}
            compact={compact}
          />

          {/* Description */}
          <MetaField
            label="Meta Description"
            value={data.description}
            fieldName="description"
            maxLength={160}
            issue={issues.find(i => i.field.toLowerCase() === 'description')}
            multiline
            compact={compact}
          />

          {/* Canonical */}
          <MetaField
            label="Canonical URL"
            value={data.canonical}
            fieldName="canonical"
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
            issues={issues}
            compact={compact}
          />

          {/* Twitter */}
          <TwitterCardSection
            twitter={data.twitter}
            issues={issues}
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
          <TechnicalField label="Viewport" value={data.viewport} fieldName="viewport" issue={issues.find(i => i.field.toLowerCase() === 'viewport')} />
          <TechnicalField label="Charset" value={data.charset} fieldName="charset" issue={issues.find(i => i.field.toLowerCase() === 'charset')} />
          <TechnicalField label="Language" value={data.language} fieldName="language" issue={issues.find(i => i.field.toLowerCase() === 'language')} />
          <TechnicalField label="Robots" value={data.robots} fieldName="robots" issue={issues.find(i => i.field.toLowerCase() === 'robots')} />
        </div>

        {/* Secondary Technical Fields - always show */}
        <div className={`grid gap-3 mt-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
          <TechnicalField label="Author" value={data.author} fieldName="author" issue={issues.find(i => i.field.toLowerCase() === 'author')} />
          <ThemeColorField value={data.themeColor} />
          <FaviconField value={data.favicon} url={url} />
        </div>

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

      {/* Structured Data Section */}
      {data.structuredData && (
        <StructuredDataSection structuredData={data.structuredData} compact={compact} />
      )}

      {/* Technical SEO Section */}
      {data.technicalSeo && (
        <TechnicalSeoSection technicalSeo={data.technicalSeo} compact={compact} />
      )}

      {/* Site Verification Section */}
      {data.siteVerification && (
        <SiteVerificationSection siteVerification={data.siteVerification} compact={compact} />
      )}

      {/* Mobile/PWA Section */}
      {data.mobile && (
        <MobileSection mobile={data.mobile} compact={compact} />
      )}

      {/* Security Section */}
      {data.security && (
        <SecuritySection security={data.security} compact={compact} />
      )}

      {/* Image Validation Section */}
      {data.imageValidation && (
        <ImageValidationSection imageValidation={data.imageValidation} compact={compact} />
      )}

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

// Helper component for technical field display with status indicator
function TechnicalField({
  label,
  value,
  fieldName,
  issue
}: {
  label: string;
  value?: string;
  fieldName: string;
  issue?: AnalysisIssue;
}) {
  const status = getFieldStatus(fieldName, value, issue);
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
  const badge = badgeStyles[status];
  const BadgeIcon = badge.icon;

  return (
    <div className={`relative rounded-lg border p-2 ${statusStyles[status]}`}>
      <div className="absolute -top-2 right-1">
        <div className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2 w-2" />
        </div>
      </div>
      <span className="text-neutral-600 text-[10px]">{label}</span>
      <p className="font-mono text-xs bg-white/80 p-1 rounded border mt-0.5 truncate" title={value}>
        {value || <span className="text-neutral-400 italic">Not set</span>}
      </p>
    </div>
  );
}

// Helper component for Theme Color field with status
function ThemeColorField({ value }: { value?: string }) {
  const status = getFieldStatus('themeColor', value);
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
  const badge = badgeStyles[status];
  const BadgeIcon = badge.icon;

  return (
    <div className={`relative rounded-lg border p-2 ${statusStyles[status]}`}>
      <div className="absolute -top-2 right-1">
        <div className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2 w-2" />
        </div>
      </div>
      <span className="text-neutral-600 text-[10px]">Theme Color</span>
      {value ? (
        <div className="flex items-center gap-2 bg-white/80 p-1 rounded border mt-0.5">
          <div
            className="h-4 w-4 rounded border flex-shrink-0"
            style={{ backgroundColor: value }}
          />
          <span className="font-mono text-xs truncate">{value}</span>
        </div>
      ) : (
        <p className="font-mono text-xs bg-white/80 p-1 rounded border mt-0.5 truncate">
          <span className="text-neutral-400 italic">Not set</span>
        </p>
      )}
    </div>
  );
}

// Helper component for Favicon field with status
function FaviconField({ value, url }: { value?: string; url: string }) {
  const status = getFieldStatus('favicon', value);
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
  const badge = badgeStyles[status];
  const BadgeIcon = badge.icon;

  const faviconSrc = value?.startsWith('http') ? value : (() => {
    try {
      return value ? new URL(value, url).toString() : undefined;
    } catch {
      return value;
    }
  })();

  return (
    <div className={`relative rounded-lg border p-2 ${statusStyles[status]}`}>
      <div className="absolute -top-2 right-1">
        <div className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2 w-2" />
        </div>
      </div>
      <span className="text-neutral-600 text-[10px]">Favicon</span>
      {value ? (
        <div className="flex items-center gap-2 bg-white/80 p-1 rounded border mt-0.5">
          <img
            src={faviconSrc}
            alt="Favicon"
            className="h-4 w-4 flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="font-mono text-[10px] truncate" title={value}>
            {value}
          </span>
        </div>
      ) : (
        <p className="font-mono text-xs bg-white/80 p-1 rounded border mt-0.5 truncate">
          <span className="text-neutral-400 italic">Not set</span>
        </p>
      )}
    </div>
  );
}

// Helper component for meta field display with validation status
function MetaField({
  label,
  value,
  fieldName,
  maxLength,
  issue,
  multiline = false,
  compact = false,
}: {
  label: string;
  value?: string;
  fieldName: string;
  maxLength?: number;
  issue?: AnalysisIssue;
  multiline?: boolean;
  compact?: boolean;
}) {
  const status = getFieldStatus(fieldName, value, issue);
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

// Helper component for individual OG field display
function OgField({
  label,
  value,
  fieldName,
  issue,
  multiline = false,
}: {
  label: string;
  value?: string;
  fieldName: string;
  issue?: AnalysisIssue;
  multiline?: boolean;
}) {
  const status = getFieldStatus(fieldName, value, issue);
  const statusColors = {
    error: 'text-red-600',
    warning: 'text-amber-600',
    success: 'text-green-600',
  };
  const StatusIcon = status === 'error' ? AlertCircle : status === 'warning' ? AlertTriangle : CheckCircle;

  return (
    <div className="text-[10px]">
      <div className="flex items-center gap-1">
        <StatusIcon className={`h-2.5 w-2.5 ${statusColors[status]}`} />
        <span className="text-neutral-500">{label}</span>
      </div>
      <p className={`font-mono bg-white/80 p-1 rounded border ${multiline ? 'line-clamp-2' : 'truncate'}`} title={value}>
        {value || <span className="text-neutral-400 italic">Not set</span>}
      </p>
      {issue && <p className="text-neutral-500 mt-0.5">{issue.message}</p>}
    </div>
  );
}

// Helper component for Open Graph section display
function OpenGraphSection({
  openGraph,
  issues,
  compact = false,
}: {
  openGraph?: OpenGraphData;
  issues: AnalysisIssue[];
  compact?: boolean;
}) {
  // Find issues for OG fields
  const findIssue = (field: string) => issues.find(i => i.field.toLowerCase() === field.toLowerCase());

  // Calculate overall section status based on critical fields
  const criticalFields = ['og:title', 'og:description', 'og:image', 'og:url'];
  const hasAllCritical = criticalFields.every(f => {
    const fieldKey = f.replace('og:', '') as keyof OpenGraphData;
    return openGraph?.[fieldKey];
  });
  const hasAnyCriticalIssue = criticalFields.some(f => {
    const issue = findIssue(f);
    return issue?.type === 'error';
  });

  const sectionStatus = hasAnyCriticalIssue ? 'error' : hasAllCritical ? 'success' : 'warning';
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
  const badge = badgeStyles[sectionStatus];
  const BadgeIcon = badge.icon;

  return (
    <div className={`relative rounded-lg border-2 p-2 ${statusStyles[sectionStatus]}`}>
      <div className="absolute -top-2 right-2">
        <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2.5 w-2.5" />
          <span>{sectionStatus === 'success' ? 'Good' : sectionStatus === 'error' ? 'Error' : 'Warning'}</span>
        </div>
      </div>
      <span className={`text-neutral-700 font-medium ${compact ? 'text-[10px]' : 'text-xs'}`}>Open Graph</span>

      <div className="mt-2 space-y-2">
        {/* Image preview if present */}
        {openGraph?.image && (
          <div className="flex items-center gap-2 mb-2">
            <img
              src={openGraph.image}
              alt="OG preview"
              className="h-10 w-16 object-cover rounded border flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        {/* Critical fields - always show */}
        <OgField label="og:title" value={openGraph?.title} fieldName="og:title" issue={findIssue('og:title')} />
        <OgField label="og:description" value={openGraph?.description} fieldName="og:description" issue={findIssue('og:description')} multiline />
        <OgField label="og:image" value={openGraph?.image} fieldName="og:image" issue={findIssue('og:image') || findIssue('og image')} />
        <OgField label="og:url" value={openGraph?.url} fieldName="og:url" issue={findIssue('og:url')} />

        {/* Important fields */}
        <div className="grid grid-cols-2 gap-1.5">
          <OgField label="og:type" value={openGraph?.type} fieldName="og:type" issue={findIssue('og:type')} />
          <OgField label="og:site_name" value={openGraph?.siteName} fieldName="og:site_name" issue={findIssue('og:site_name')} />
        </div>

        {/* Optional fields */}
        <div className="grid grid-cols-2 gap-1.5">
          <OgField label="og:locale" value={openGraph?.locale} fieldName="og:locale" issue={findIssue('og:locale')} />
          <OgField label="og:image:alt" value={openGraph?.imageDetails?.alt} fieldName="og:image:alt" issue={findIssue('og:image:alt')} />
        </div>

        {/* Image details if present */}
        {openGraph?.imageDetails && (openGraph.imageDetails.width || openGraph.imageDetails.height) && (
          <div className="text-[10px]">
            <span className="text-neutral-500">Image Dimensions</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {openGraph.imageDetails.width && openGraph.imageDetails.height && (
                <Badge variant="outline" className="text-[10px]">
                  {openGraph.imageDetails.width}x{openGraph.imageDetails.height}
                </Badge>
              )}
              {openGraph.imageDetails.type && (
                <Badge variant="outline" className="text-[10px]">{openGraph.imageDetails.type}</Badge>
              )}
            </div>
          </div>
        )}

        {/* Article metadata if present */}
        {openGraph?.article && (
          <div className="text-[10px] space-y-1">
            <span className="text-neutral-500">Article Metadata</span>
            <div className="grid grid-cols-2 gap-1">
              {openGraph.article.publishedTime && (
                <p className="font-mono bg-white/80 p-1 rounded border text-[10px] truncate" title={openGraph.article.publishedTime}>
                  Published: {new Date(openGraph.article.publishedTime).toLocaleDateString()}
                </p>
              )}
              {openGraph.article.author && (
                <p className="font-mono bg-white/80 p-1 rounded border text-[10px] truncate" title={openGraph.article.author}>
                  Author: {openGraph.article.author}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for individual Twitter field display
function TwitterField({
  label,
  value,
  fieldName,
  issue,
  multiline = false,
}: {
  label: string;
  value?: string;
  fieldName: string;
  issue?: AnalysisIssue;
  multiline?: boolean;
}) {
  const status = getFieldStatus(fieldName, value, issue);
  const statusColors = {
    error: 'text-red-600',
    warning: 'text-amber-600',
    success: 'text-green-600',
  };
  const StatusIcon = status === 'error' ? AlertCircle : status === 'warning' ? AlertTriangle : CheckCircle;

  return (
    <div className="text-[10px]">
      <div className="flex items-center gap-1">
        <StatusIcon className={`h-2.5 w-2.5 ${statusColors[status]}`} />
        <span className="text-neutral-500">{label}</span>
      </div>
      <p className={`font-mono bg-white/80 p-1 rounded border ${multiline ? 'line-clamp-2' : 'truncate'}`} title={value}>
        {value || <span className="text-neutral-400 italic">Not set</span>}
      </p>
      {issue && <p className="text-neutral-500 mt-0.5">{issue.message}</p>}
    </div>
  );
}

// Helper component for Twitter Card section display
function TwitterCardSection({
  twitter,
  issues,
  compact = false,
}: {
  twitter?: TwitterData;
  issues: AnalysisIssue[];
  compact?: boolean;
}) {
  // Find issues for Twitter fields
  const findIssue = (field: string) => issues.find(i => i.field.toLowerCase() === field.toLowerCase());

  // Calculate overall section status based on critical fields
  const criticalFields = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
  const hasAllCritical = criticalFields.every(f => {
    const fieldKey = f.replace('twitter:', '') as keyof TwitterData;
    return twitter?.[fieldKey];
  });
  const hasAnyCriticalIssue = criticalFields.some(f => {
    const issue = findIssue(f);
    return issue?.type === 'error';
  });

  const sectionStatus = hasAnyCriticalIssue ? 'error' : hasAllCritical ? 'success' : 'warning';
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
  const badge = badgeStyles[sectionStatus];
  const BadgeIcon = badge.icon;

  return (
    <div className={`relative rounded-lg border-2 p-2 ${statusStyles[sectionStatus]}`}>
      <div className="absolute -top-2 right-2">
        <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2.5 w-2.5" />
          <span>{sectionStatus === 'success' ? 'Good' : sectionStatus === 'error' ? 'Error' : 'Warning'}</span>
        </div>
      </div>
      <span className={`text-neutral-700 font-medium ${compact ? 'text-[10px]' : 'text-xs'}`}>Twitter Card</span>

      <div className="mt-2 space-y-2">
        {/* Image preview if present */}
        {twitter?.image && (
          <div className="flex items-center gap-2 mb-2">
            <img
              src={twitter.image}
              alt="Twitter preview"
              className="h-10 w-16 object-cover rounded border flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        {/* Critical fields - always show */}
        <div className="grid grid-cols-2 gap-1.5">
          <TwitterField label="twitter:card" value={twitter?.card} fieldName="twitter:card" issue={findIssue('twitter:card') || findIssue('twitter card')} />
          <TwitterField label="twitter:site" value={twitter?.site} fieldName="twitter:site" issue={findIssue('twitter:site')} />
        </div>
        <TwitterField label="twitter:title" value={twitter?.title} fieldName="twitter:title" issue={findIssue('twitter:title')} />
        <TwitterField label="twitter:description" value={twitter?.description} fieldName="twitter:description" issue={findIssue('twitter:description')} multiline />
        <TwitterField label="twitter:image" value={twitter?.image} fieldName="twitter:image" issue={findIssue('twitter:image')} />

        {/* Optional fields */}
        <div className="grid grid-cols-2 gap-1.5">
          <TwitterField label="twitter:creator" value={twitter?.creator} fieldName="twitter:creator" issue={findIssue('twitter:creator')} />
          <TwitterField label="twitter:image:alt" value={twitter?.imageAlt} fieldName="twitter:image:alt" issue={findIssue('twitter:image:alt')} />
        </div>

        {/* Player card if present */}
        {twitter?.player && (
          <div className="text-[10px]">
            <span className="text-neutral-500">Twitter Player</span>
            <p className="font-mono bg-white/80 p-1 rounded border truncate" title={twitter.player.url}>
              {twitter.player.url} {twitter.player.width && twitter.player.height && `(${twitter.player.width}x${twitter.player.height})`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Structured Data Section
function StructuredDataSection({
  structuredData,
  compact = false,
}: {
  structuredData: StructuredData;
  compact?: boolean;
}) {
  const status = !structuredData.found ? 'warning' : !structuredData.isValidJson ? 'error' : 'success';
  const statusStyles = {
    error: 'border-red-300 bg-red-50/50',
    warning: 'border-amber-300 bg-amber-50/50',
    success: 'border-green-300 bg-green-50/50',
  };

  return (
    <div className="border-t pt-4">
      <h4 className={`font-medium text-neutral-700 mb-3 ${compact ? 'text-xs' : 'text-sm'}`}>
        Structured Data (JSON-LD)
      </h4>
      <div className={`rounded-lg border-2 p-3 ${statusStyles[status]}`}>
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4 text-xs">
          <div>
            <span className="text-neutral-500">Found</span>
            <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5">
              {structuredData.found ? 'Yes' : 'No'}
            </p>
          </div>
          <div>
            <span className="text-neutral-500">Valid JSON</span>
            <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5">
              {structuredData.isValidJson ? 'Yes' : 'No'}
            </p>
          </div>
          {structuredData.types.length > 0 && (
            <div className="col-span-2">
              <span className="text-neutral-500">Schema Types</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {structuredData.types.map((type, idx) => (
                  <Badge key={idx} variant="secondary" className="font-mono text-[10px]">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        {structuredData.errors.length > 0 && (
          <div className="mt-2 text-xs">
            <span className="text-red-600">Errors:</span>
            <ul className="list-disc list-inside text-red-600 mt-1">
              {structuredData.errors.map((error, idx) => (
                <li key={idx} className="truncate" title={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Technical SEO Section
function TechnicalSeoSection({
  technicalSeo,
  compact = false,
}: {
  technicalSeo: TechnicalSeo;
  compact?: boolean;
}) {
  const directives = technicalSeo.robotsDirectives;

  return (
    <div className="border-t pt-4">
      <h4 className={`font-medium text-neutral-700 mb-3 ${compact ? 'text-xs' : 'text-sm'}`}>
        Technical SEO
      </h4>
      <div className="space-y-3">
        {/* Robots Directives */}
        {directives && (
          <div className="text-xs">
            <span className="text-neutral-500">Robots Directives</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {directives.index !== undefined && (
                <Badge variant={directives.index ? 'default' : 'destructive'} className="text-[10px]">
                  {directives.index ? 'index' : 'noindex'}
                </Badge>
              )}
              {directives.follow !== undefined && (
                <Badge variant={directives.follow ? 'default' : 'destructive'} className="text-[10px]">
                  {directives.follow ? 'follow' : 'nofollow'}
                </Badge>
              )}
              {directives.noarchive && (
                <Badge variant="secondary" className="text-[10px]">noarchive</Badge>
              )}
              {directives.nosnippet && (
                <Badge variant="secondary" className="text-[10px]">nosnippet</Badge>
              )}
              {directives.maxSnippet !== undefined && (
                <Badge variant="outline" className="text-[10px]">max-snippet:{directives.maxSnippet}</Badge>
              )}
              {directives.maxImagePreview && (
                <Badge variant="outline" className="text-[10px]">max-image-preview:{directives.maxImagePreview}</Badge>
              )}
            </div>
          </div>
        )}

        {/* Pagination */}
        {(technicalSeo.prevUrl || technicalSeo.nextUrl) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {technicalSeo.prevUrl && (
              <div>
                <span className="text-neutral-500">Previous Page</span>
                <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 truncate" title={technicalSeo.prevUrl}>
                  {technicalSeo.prevUrl}
                </p>
              </div>
            )}
            {technicalSeo.nextUrl && (
              <div>
                <span className="text-neutral-500">Next Page</span>
                <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 truncate" title={technicalSeo.nextUrl}>
                  {technicalSeo.nextUrl}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Keywords & Generator */}
        <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {technicalSeo.keywords && (
            <div className="text-xs">
              <span className="text-neutral-500">Keywords</span>
              <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 line-clamp-2" title={technicalSeo.keywords}>
                {technicalSeo.keywords}
              </p>
            </div>
          )}
          {technicalSeo.generator && (
            <div className="text-xs">
              <span className="text-neutral-500">Generator</span>
              <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 truncate" title={technicalSeo.generator}>
                {technicalSeo.generator}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Site Verification Section
function SiteVerificationSection({
  siteVerification,
  compact = false,
}: {
  siteVerification: SiteVerification;
  compact?: boolean;
}) {
  const verifications = [
    { name: 'Google', value: siteVerification.google },
    { name: 'Bing', value: siteVerification.bing },
    { name: 'Pinterest', value: siteVerification.pinterest },
    { name: 'Facebook', value: siteVerification.facebook },
    { name: 'Yandex', value: siteVerification.yandex },
  ].filter(v => v.value);

  if (verifications.length === 0) return null;

  return (
    <div className="border-t pt-4">
      <h4 className={`font-medium text-neutral-700 mb-3 ${compact ? 'text-xs' : 'text-sm'}`}>
        Site Verification
      </h4>
      <div className="flex flex-wrap gap-2">
        {verifications.map(({ name }) => (
          <div key={name} className="text-xs">
            <Badge variant="outline" className="font-normal">
              <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
              {name}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mobile/PWA Section
function MobileSection({
  mobile,
  compact = false,
}: {
  mobile: Mobile;
  compact?: boolean;
}) {
  return (
    <div className="border-t pt-4">
      <h4 className={`font-medium text-neutral-700 mb-3 ${compact ? 'text-xs' : 'text-sm'}`}>
        Mobile / PWA
      </h4>
      <div className="space-y-3">
        {/* Apple Web App Settings */}
        {(mobile.appleWebAppCapable || mobile.appleWebAppTitle || mobile.appleWebAppStatusBarStyle) && (
          <div className={`grid gap-2 text-xs ${compact ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {mobile.appleWebAppCapable && (
              <div>
                <span className="text-neutral-500">Apple Web App Capable</span>
                <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5">{mobile.appleWebAppCapable}</p>
              </div>
            )}
            {mobile.appleWebAppTitle && (
              <div>
                <span className="text-neutral-500">Apple Web App Title</span>
                <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 truncate">{mobile.appleWebAppTitle}</p>
              </div>
            )}
            {mobile.appleWebAppStatusBarStyle && (
              <div>
                <span className="text-neutral-500">Status Bar Style</span>
                <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5">{mobile.appleWebAppStatusBarStyle}</p>
              </div>
            )}
          </div>
        )}

        {/* Manifest */}
        {mobile.manifest && (
          <div className="text-xs">
            <span className="text-neutral-500">Web App Manifest</span>
            <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 truncate" title={mobile.manifest}>
              {mobile.manifest}
            </p>
          </div>
        )}

        {/* Apple Touch Icons */}
        {mobile.appleTouchIcons && mobile.appleTouchIcons.length > 0 && (
          <div className="text-xs">
            <span className="text-neutral-500">Apple Touch Icons ({mobile.appleTouchIcons.length})</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {mobile.appleTouchIcons.map((icon, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-white/80 p-1 rounded border">
                  <img
                    src={icon.href}
                    alt={`Touch icon ${icon.sizes || 'default'}`}
                    className="h-6 w-6 rounded"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  {icon.sizes && <span className="text-[10px] text-neutral-500">{icon.sizes}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Security Section
function SecuritySection({
  security,
  compact = false,
}: {
  security: Security;
  compact?: boolean;
}) {
  return (
    <div className="border-t pt-4">
      <h4 className={`font-medium text-neutral-700 mb-3 ${compact ? 'text-xs' : 'text-sm'}`}>
        Security
      </h4>
      <div className={`grid gap-2 text-xs ${compact ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
        {security.referrerPolicy && (
          <div>
            <span className="text-neutral-500">Referrer Policy</span>
            <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 truncate">{security.referrerPolicy}</p>
          </div>
        )}
        {security.xUaCompatible && (
          <div>
            <span className="text-neutral-500">X-UA-Compatible</span>
            <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 truncate">{security.xUaCompatible}</p>
          </div>
        )}
        {security.contentSecurityPolicy && (
          <div className="col-span-full">
            <span className="text-neutral-500">Content Security Policy</span>
            <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 line-clamp-2" title={security.contentSecurityPolicy}>
              {security.contentSecurityPolicy}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Image Validation Section
function ImageValidationSection({
  imageValidation,
  compact = false,
}: {
  imageValidation: ImageValidations;
  compact?: boolean;
}) {
  return (
    <div className="border-t pt-4">
      <h4 className={`font-medium text-neutral-700 mb-3 ${compact ? 'text-xs' : 'text-sm'}`}>
        Image Validation
      </h4>
      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {imageValidation.ogImage && (
          <div className={`rounded-lg border-2 p-2 ${imageValidation.ogImage.exists ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50'}`}>
            <div className="flex items-center gap-2 text-xs">
              {imageValidation.ogImage.exists ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium">OG Image</span>
              {imageValidation.ogImage.statusCode && (
                <Badge variant={imageValidation.ogImage.exists ? 'default' : 'destructive'} className="text-[10px]">
                  {imageValidation.ogImage.statusCode}
                </Badge>
              )}
            </div>
            {imageValidation.ogImage.contentType && (
              <p className="text-[10px] text-neutral-500 mt-1">
                Type: {imageValidation.ogImage.contentType}
              </p>
            )}
            {imageValidation.ogImage.error && (
              <p className="text-[10px] text-red-600 mt-1">{imageValidation.ogImage.error}</p>
            )}
          </div>
        )}
        {imageValidation.twitterImage && (
          <div className={`rounded-lg border-2 p-2 ${imageValidation.twitterImage.exists ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50'}`}>
            <div className="flex items-center gap-2 text-xs">
              {imageValidation.twitterImage.exists ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium">Twitter Image</span>
              {imageValidation.twitterImage.statusCode && (
                <Badge variant={imageValidation.twitterImage.exists ? 'default' : 'destructive'} className="text-[10px]">
                  {imageValidation.twitterImage.statusCode}
                </Badge>
              )}
            </div>
            {imageValidation.twitterImage.contentType && (
              <p className="text-[10px] text-neutral-500 mt-1">
                Type: {imageValidation.twitterImage.contentType}
              </p>
            )}
            {imageValidation.twitterImage.error && (
              <p className="text-[10px] text-red-600 mt-1">{imageValidation.twitterImage.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
