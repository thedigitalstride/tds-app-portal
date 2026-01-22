'use client';

import React from 'react';
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Badge, TooltipProvider } from '@tds/ui';
import { MetaFieldLabel, SectionHeaderWithTooltip } from './MetaFieldLabel';
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
import {
  compareSnapshots,
  getChangedFieldBorder,
  type FieldDiff,
} from './comparison-utils';

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
  /**
   * When true, uses single-column layout. When false/omitted, uses two-column layout.
   * IMPORTANT: History snapshots should use the SAME layout as current analysis
   * (i.e., do NOT set compact=true for history snapshots).
   */
  compact?: boolean;
  /** When provided, fields that differ from current will be highlighted with amber border */
  compareWith?: MetadataSnapshot;
}

/**
 * Reusable component for displaying full meta tag analysis data.
 * Used in both the main expanded row view and history snapshot details.
 *
 * LAYOUT CONSISTENCY RULE:
 * - Current analysis and history snapshots MUST use the same layout (two columns)
 * - Do NOT pass compact={true} to history snapshots
 * - The compareWith prop adds diff highlighting without changing layout
 */
export function MetadataViewer({
  data,
  url,
  showIssues = true,
  compact = false,
  compareWith,
}: MetadataViewerProps) {
  const issues = data.issues || [];

  // Compute field diffs if comparing with current data
  const diffs = compareWith ? compareSnapshots(data, compareWith) : undefined;

  return (
    <TooltipProvider delayDuration={150}>
    <div className={`space-y-4 ${compact ? 'text-xs' : ''}`}>
      {/* Meta Tags Grid */}
      <div className={`grid gap-4 ${compact ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
        {/* Left Column - Basic Meta Tags */}
        <div className="space-y-3">
          <SectionHeaderWithTooltip
            title="Basic Meta Tags"
            description="Core meta tags that define how search engines and browsers understand your page."
            bestPractice="Ensure title, description, and canonical are set for every page."
            compact={compact}
          />

          {/* Title */}
          <MetaField
            label="Title"
            value={data.title}
            fieldName="title"
            maxLength={60}
            issue={issues.find(i => i.field.toLowerCase() === 'title')}
            compact={compact}
            diff={diffs?.title}
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
            diff={diffs?.description}
          />

          {/* Canonical */}
          <MetaField
            label="Canonical URL"
            value={data.canonical}
            fieldName="canonical"
            issue={issues.find(i => i.field.toLowerCase() === 'canonical')}
            compact={compact}
            diff={diffs?.canonical}
          />
        </div>

        {/* Right Column - Social Tags */}
        <div className="space-y-3">
          <SectionHeaderWithTooltip
            title="Social Tags"
            description="Open Graph and Twitter Card meta tags that control how your content appears when shared on social media."
            bestPractice="Set og:title, og:description, og:image, and twitter:card for optimal social sharing."
            compact={compact}
          />

          {/* Open Graph */}
          <OpenGraphSection
            openGraph={data.openGraph}
            issues={issues}
            compact={compact}
            diffs={diffs}
          />

          {/* Twitter */}
          <TwitterCardSection
            twitter={data.twitter}
            issues={issues}
            compact={compact}
            diffs={diffs}
          />
        </div>
      </div>

      {/* Technical Meta Tags Section */}
      <div className="border-t pt-4">
        <SectionHeaderWithTooltip
          title="Technical Meta Tags"
          description="Tags that control page rendering, character encoding, and browser behavior."
          bestPractice="Always include viewport and charset. Set language for accessibility and SEO."
          compact={compact}
          className="mb-3"
        />

        {/* Primary Technical Fields - 4 columns */}
        <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
          <TechnicalField label="Viewport" value={data.viewport} fieldName="viewport" issue={issues.find(i => i.field.toLowerCase() === 'viewport')} diff={diffs?.viewport} />
          <TechnicalField label="Charset" value={data.charset} fieldName="charset" issue={issues.find(i => i.field.toLowerCase() === 'charset')} diff={diffs?.charset} />
          <TechnicalField label="Language" value={data.language} fieldName="language" issue={issues.find(i => i.field.toLowerCase() === 'language')} diff={diffs?.language} />
          <TechnicalField label="Robots" value={data.robots} fieldName="robots" issue={issues.find(i => i.field.toLowerCase() === 'robots')} diff={diffs?.robots} />
        </div>

        {/* Secondary Technical Fields - always show */}
        <div className={`grid gap-3 mt-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
          <TechnicalField label="Author" value={data.author} fieldName="author" issue={issues.find(i => i.field.toLowerCase() === 'author')} diff={diffs?.author} />
          <ThemeColorField value={data.themeColor} diff={diffs?.themeColor} />
          <FaviconField value={data.favicon} url={url} diff={diffs?.favicon} />
        </div>

        {/* Hreflang Tags - full width if present */}
        {data.hreflang && data.hreflang.length > 0 && (
          <div className="mt-3 text-xs">
            <MetaFieldLabel fieldKey="hreflang" label={`Hreflang Tags (${data.hreflang.length})`} size="xs" variant="muted" />
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
    </TooltipProvider>
  );
}

// Helper component for technical field display with status indicator
function TechnicalField({
  label,
  value,
  fieldName,
  issue,
  diff,
}: {
  label: string;
  value?: string;
  fieldName: string;
  issue?: AnalysisIssue;
  diff?: FieldDiff;
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
  const fieldBorder = getChangedFieldBorder(diff?.changed || false);

  return (
    <div className={`relative rounded-lg border p-2 ${statusStyles[status]}`}>
      <div className="absolute -top-2 right-1">
        <div className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2 w-2" />
        </div>
      </div>
      <MetaFieldLabel fieldKey={fieldName} label={label} size="xs" variant="muted" />
      <p className={`font-mono text-xs bg-white/80 p-1 rounded border mt-0.5 truncate ${fieldBorder}`} title={value}>
        {value || <span className="text-neutral-400 italic">Not set</span>}
      </p>
      {diff?.changed && diff.currentValue !== undefined && (
        <p className="font-mono text-xs font-medium text-neutral-700 mt-1 break-words" title={diff.currentValue}>
          Now: {diff.currentValue || <span className="italic">Not set</span>}
        </p>
      )}
    </div>
  );
}

// Helper component for Theme Color field with status
function ThemeColorField({ value, diff }: { value?: string; diff?: FieldDiff }) {
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
  const fieldBorder = getChangedFieldBorder(diff?.changed || false);

  return (
    <div className={`relative rounded-lg border p-2 ${statusStyles[status]}`}>
      <div className="absolute -top-2 right-1">
        <div className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2 w-2" />
        </div>
      </div>
      <MetaFieldLabel fieldKey="themeColor" label="Theme Color" size="xs" variant="muted" />
      {value ? (
        <div className={`flex items-center gap-2 bg-white/80 p-1 rounded border mt-0.5 ${fieldBorder}`}>
          <div
            className="h-4 w-4 rounded border flex-shrink-0"
            style={{ backgroundColor: value }}
          />
          <span className="font-mono text-xs truncate">{value}</span>
        </div>
      ) : (
        <p className={`font-mono text-xs bg-white/80 p-1 rounded border mt-0.5 truncate ${fieldBorder}`}>
          <span className="text-neutral-400 italic">Not set</span>
        </p>
      )}
      {diff?.changed && diff.currentValue !== undefined && (
        <p className="font-mono text-xs font-medium text-neutral-700 mt-1 break-words" title={diff.currentValue}>
          Now: {diff.currentValue || <span className="italic">Not set</span>}
        </p>
      )}
    </div>
  );
}

// Helper component for Favicon field with status
function FaviconField({ value, url, diff }: { value?: string; url: string; diff?: FieldDiff }) {
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
  const fieldBorder = getChangedFieldBorder(diff?.changed || false);

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
      <MetaFieldLabel fieldKey="favicon" label="Favicon" size="xs" variant="muted" />
      {value ? (
        <div className={`flex items-center gap-2 bg-white/80 p-1 rounded border mt-0.5 ${fieldBorder}`}>
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
        <p className={`font-mono text-xs bg-white/80 p-1 rounded border mt-0.5 truncate ${fieldBorder}`}>
          <span className="text-neutral-400 italic">Not set</span>
        </p>
      )}
      {diff?.changed && diff.currentValue !== undefined && (
        <p className="font-mono text-xs font-medium text-neutral-700 mt-1 break-words" title={diff.currentValue}>
          Now: {diff.currentValue || <span className="italic">Not set</span>}
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
  diff,
}: {
  label: string;
  value?: string;
  fieldName: string;
  maxLength?: number;
  issue?: AnalysisIssue;
  multiline?: boolean;
  compact?: boolean;
  diff?: FieldDiff;
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
  const fieldBorder = getChangedFieldBorder(diff?.changed || false);

  return (
    <div className={`relative rounded-lg border-2 p-2 ${statusStyles[status as keyof typeof statusStyles]}`}>
      <div className="absolute -top-2 right-2">
        <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2.5 w-2.5" />
          <span>{status === 'success' ? 'Good' : status === 'error' ? 'Error' : 'Warning'}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mb-1">
        <MetaFieldLabel fieldKey={fieldName} label={label} size={compact ? 'xs' : 'sm'} />
        {maxLength && (
          <span className={`text-[10px] ${(value?.length || 0) > maxLength ? 'text-red-500' : 'text-neutral-400'}`}>
            {value?.length || 0}/{maxLength}
          </span>
        )}
      </div>
      <p className={`font-mono text-xs bg-white/80 p-1.5 rounded border ${multiline ? 'line-clamp-2' : 'truncate'} ${fieldBorder}`} title={value}>
        {value || <span className="text-neutral-400 italic">Not set</span>}
      </p>
      {issue && (
        <p className="mt-1 text-[10px] text-neutral-600">{issue.message}</p>
      )}
      {diff?.changed && diff.currentValue !== undefined && (
        <p className="font-mono text-xs font-medium text-neutral-700 mt-1 break-words" title={diff.currentValue}>
          Now: {diff.currentValue || <span className="italic">Not set</span>}
        </p>
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
  diff,
}: {
  label: string;
  value?: string;
  fieldName: string;
  issue?: AnalysisIssue;
  multiline?: boolean;
  diff?: FieldDiff;
}) {
  const status = getFieldStatus(fieldName, value, issue);
  const statusColors = {
    error: 'text-red-600',
    warning: 'text-amber-600',
    success: 'text-green-600',
  };
  const StatusIcon = status === 'error' ? AlertCircle : status === 'warning' ? AlertTriangle : CheckCircle;
  const fieldBorder = getChangedFieldBorder(diff?.changed || false);

  return (
    <div className="text-[10px]">
      <div className="flex items-center gap-1">
        <StatusIcon className={`h-2.5 w-2.5 ${statusColors[status]}`} />
        <MetaFieldLabel fieldKey={fieldName} label={label} size="xs" variant="muted" />
      </div>
      <p className={`font-mono bg-white/80 p-1 rounded border ${multiline ? 'line-clamp-2' : 'truncate'} ${fieldBorder}`} title={value}>
        {value || <span className="text-neutral-400 italic">Not set</span>}
      </p>
      {issue && <p className="text-neutral-500 mt-0.5">{issue.message}</p>}
      {diff?.changed && diff.currentValue !== undefined && (
        <p className="font-mono text-xs font-medium text-neutral-700 mt-1 break-words" title={diff.currentValue}>
          Now: {diff.currentValue || <span className="italic">Not set</span>}
        </p>
      )}
    </div>
  );
}

// Helper component for Open Graph section display
function OpenGraphSection({
  openGraph,
  issues,
  compact = false,
  diffs,
}: {
  openGraph?: OpenGraphData;
  issues: AnalysisIssue[];
  compact?: boolean;
  diffs?: Record<string, FieldDiff>;
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
      <MetaFieldLabel fieldKey="og:title" label="Open Graph" size={compact ? 'xs' : 'sm'} />

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
        <OgField label="og:title" value={openGraph?.title} fieldName="og:title" issue={findIssue('og:title')} diff={diffs?.['og:title']} />
        <OgField label="og:description" value={openGraph?.description} fieldName="og:description" issue={findIssue('og:description')} multiline diff={diffs?.['og:description']} />
        <OgField label="og:image" value={openGraph?.image} fieldName="og:image" issue={findIssue('og:image') || findIssue('og image')} diff={diffs?.['og:image']} />
        <OgField label="og:url" value={openGraph?.url} fieldName="og:url" issue={findIssue('og:url')} diff={diffs?.['og:url']} />

        {/* Important fields */}
        <div className="grid grid-cols-2 gap-1.5">
          <OgField label="og:type" value={openGraph?.type} fieldName="og:type" issue={findIssue('og:type')} diff={diffs?.['og:type']} />
          <OgField label="og:site_name" value={openGraph?.siteName} fieldName="og:site_name" issue={findIssue('og:site_name')} diff={diffs?.['og:siteName']} />
        </div>

        {/* Optional fields */}
        <div className="grid grid-cols-2 gap-1.5">
          <OgField label="og:locale" value={openGraph?.locale} fieldName="og:locale" issue={findIssue('og:locale')} diff={diffs?.['og:locale']} />
          <OgField label="og:image:alt" value={openGraph?.imageDetails?.alt} fieldName="og:image:alt" issue={findIssue('og:image:alt')} diff={diffs?.['og:image:alt']} />
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
  diff,
}: {
  label: string;
  value?: string;
  fieldName: string;
  issue?: AnalysisIssue;
  multiline?: boolean;
  diff?: FieldDiff;
}) {
  const status = getFieldStatus(fieldName, value, issue);
  const statusColors = {
    error: 'text-red-600',
    warning: 'text-amber-600',
    success: 'text-green-600',
  };
  const StatusIcon = status === 'error' ? AlertCircle : status === 'warning' ? AlertTriangle : CheckCircle;
  const fieldBorder = getChangedFieldBorder(diff?.changed || false);

  return (
    <div className="text-[10px]">
      <div className="flex items-center gap-1">
        <StatusIcon className={`h-2.5 w-2.5 ${statusColors[status]}`} />
        <MetaFieldLabel fieldKey={fieldName} label={label} size="xs" variant="muted" />
      </div>
      <p className={`font-mono bg-white/80 p-1 rounded border ${multiline ? 'line-clamp-2' : 'truncate'} ${fieldBorder}`} title={value}>
        {value || <span className="text-neutral-400 italic">Not set</span>}
      </p>
      {issue && <p className="text-neutral-500 mt-0.5">{issue.message}</p>}
      {diff?.changed && diff.currentValue !== undefined && (
        <p className="font-mono text-xs font-medium text-neutral-700 mt-1 break-words" title={diff.currentValue}>
          Now: {diff.currentValue || <span className="italic">Not set</span>}
        </p>
      )}
    </div>
  );
}

// Helper component for Twitter Card section display
function TwitterCardSection({
  twitter,
  issues,
  compact = false,
  diffs,
}: {
  twitter?: TwitterData;
  issues: AnalysisIssue[];
  compact?: boolean;
  diffs?: Record<string, FieldDiff>;
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
      <MetaFieldLabel fieldKey="twitter:card" label="Twitter Card" size={compact ? 'xs' : 'sm'} />

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
          <TwitterField label="twitter:card" value={twitter?.card} fieldName="twitter:card" issue={findIssue('twitter:card') || findIssue('twitter card')} diff={diffs?.['twitter:card']} />
          <TwitterField label="twitter:site" value={twitter?.site} fieldName="twitter:site" issue={findIssue('twitter:site')} diff={diffs?.['twitter:site']} />
        </div>
        <TwitterField label="twitter:title" value={twitter?.title} fieldName="twitter:title" issue={findIssue('twitter:title')} diff={diffs?.['twitter:title']} />
        <TwitterField label="twitter:description" value={twitter?.description} fieldName="twitter:description" issue={findIssue('twitter:description')} multiline diff={diffs?.['twitter:description']} />
        <TwitterField label="twitter:image" value={twitter?.image} fieldName="twitter:image" issue={findIssue('twitter:image')} diff={diffs?.['twitter:image']} />

        {/* Optional fields */}
        <div className="grid grid-cols-2 gap-1.5">
          <TwitterField label="twitter:creator" value={twitter?.creator} fieldName="twitter:creator" issue={findIssue('twitter:creator')} diff={diffs?.['twitter:creator']} />
          <TwitterField label="twitter:image:alt" value={twitter?.imageAlt} fieldName="twitter:image:alt" issue={findIssue('twitter:image:alt')} diff={diffs?.['twitter:imageAlt']} />
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
      <SectionHeaderWithTooltip
        title="Structured Data (JSON-LD)"
        description="Machine-readable data that helps search engines understand your content and display rich results."
        bestPractice="Use Schema.org types. Validate with Google's Rich Results Test."
        compact={compact}
        className="mb-3"
      />
      <div className={`rounded-lg border-2 p-3 ${statusStyles[status]}`}>
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4 text-xs">
          <div>
            <MetaFieldLabel fieldKey="structuredData:found" label="Found" size="xs" variant="muted" />
            <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5">
              {structuredData.found ? 'Yes' : 'No'}
            </p>
          </div>
          <div>
            <MetaFieldLabel fieldKey="structuredData:isValidJson" label="Valid JSON" size="xs" variant="muted" />
            <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5">
              {structuredData.isValidJson ? 'Yes' : 'No'}
            </p>
          </div>
          {structuredData.types.length > 0 && (
            <div className="col-span-2">
              <MetaFieldLabel fieldKey="structuredData:types" label="Schema Types" size="xs" variant="muted" />
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
        {structuredData.validationErrors.length > 0 && (
          <div className="mt-2 text-xs">
            <span className="text-red-600">Errors:</span>
            <ul className="list-disc list-inside text-red-600 mt-1">
              {structuredData.validationErrors.map((error, idx) => (
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
      <SectionHeaderWithTooltip
        title="Technical SEO"
        description="Robots directives, pagination, and other technical signals that affect search engine crawling."
        bestPractice="Ensure robots directives match your indexing intentions."
        compact={compact}
        className="mb-3"
      />
      <div className="space-y-3">
        {/* Robots Directives */}
        {directives && (
          <div className="text-xs">
            <MetaFieldLabel fieldKey="robots" label="Robots Directives" size="xs" variant="muted" />
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
                <MetaFieldLabel fieldKey="prevUrl" label="Previous Page" size="xs" variant="muted" />
                <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 truncate" title={technicalSeo.prevUrl}>
                  {technicalSeo.prevUrl}
                </p>
              </div>
            )}
            {technicalSeo.nextUrl && (
              <div>
                <MetaFieldLabel fieldKey="nextUrl" label="Next Page" size="xs" variant="muted" />
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
              <MetaFieldLabel fieldKey="keywords" label="Keywords" size="xs" variant="muted" />
              <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 line-clamp-2" title={technicalSeo.keywords}>
                {technicalSeo.keywords}
              </p>
            </div>
          )}
          {technicalSeo.generator && (
            <div className="text-xs">
              <MetaFieldLabel fieldKey="generator" label="Generator" size="xs" variant="muted" />
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
      <SectionHeaderWithTooltip
        title="Site Verification"
        description="Verification codes for search engine and social platform webmaster tools."
        bestPractice="Add verification codes for Google Search Console and Bing Webmaster Tools."
        compact={compact}
        className="mb-3"
      />
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
      <SectionHeaderWithTooltip
        title="Mobile / PWA"
        description="Progressive Web App settings and mobile device configurations."
        bestPractice="Include manifest.json and Apple touch icons for installable app experience."
        compact={compact}
        className="mb-3"
      />
      <div className="space-y-3">
        {/* Apple Web App Settings */}
        {(mobile.appleWebAppCapable || mobile.appleWebAppTitle || mobile.appleWebAppStatusBarStyle) && (
          <div className={`grid gap-2 text-xs ${compact ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {mobile.appleWebAppCapable && (
              <div>
                <MetaFieldLabel fieldKey="apple:webAppCapable" label="Apple Web App Capable" size="xs" variant="muted" />
                <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5">{mobile.appleWebAppCapable}</p>
              </div>
            )}
            {mobile.appleWebAppTitle && (
              <div>
                <MetaFieldLabel fieldKey="apple:webAppTitle" label="Apple Web App Title" size="xs" variant="muted" />
                <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 truncate">{mobile.appleWebAppTitle}</p>
              </div>
            )}
            {mobile.appleWebAppStatusBarStyle && (
              <div>
                <MetaFieldLabel fieldKey="apple:webAppStatusBarStyle" label="Status Bar Style" size="xs" variant="muted" />
                <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5">{mobile.appleWebAppStatusBarStyle}</p>
              </div>
            )}
          </div>
        )}

        {/* Manifest */}
        {mobile.manifest && (
          <div className="text-xs">
            <MetaFieldLabel fieldKey="manifest" label="Web App Manifest" size="xs" variant="muted" />
            <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 truncate" title={mobile.manifest}>
              {mobile.manifest}
            </p>
          </div>
        )}

        {/* Apple Touch Icons */}
        {mobile.appleTouchIcons && mobile.appleTouchIcons.length > 0 && (
          <div className="text-xs">
            <MetaFieldLabel fieldKey="apple:touchIcon" label={`Apple Touch Icons (${mobile.appleTouchIcons.length})`} size="xs" variant="muted" />
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
      <SectionHeaderWithTooltip
        title="Security"
        description="Security-related meta tags that control browser behavior and content policies."
        bestPractice="Set appropriate referrer policy and CSP for your security requirements."
        compact={compact}
        className="mb-3"
      />
      <div className={`grid gap-2 text-xs ${compact ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
        {security.referrerPolicy && (
          <div>
            <MetaFieldLabel fieldKey="referrerPolicy" label="Referrer Policy" size="xs" variant="muted" />
            <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 truncate">{security.referrerPolicy}</p>
          </div>
        )}
        {security.xUaCompatible && (
          <div>
            <MetaFieldLabel fieldKey="xUaCompatible" label="X-UA-Compatible" size="xs" variant="muted" />
            <p className="font-mono bg-white/80 p-1.5 rounded border mt-0.5 truncate">{security.xUaCompatible}</p>
          </div>
        )}
        {security.contentSecurityPolicy && (
          <div className="col-span-full">
            <MetaFieldLabel fieldKey="contentSecurityPolicy" label="Content Security Policy" size="xs" variant="muted" />
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
      <SectionHeaderWithTooltip
        title="Image Validation"
        description="Verification that social sharing images are accessible and properly served."
        bestPractice="Ensure images return 200 status and correct MIME types."
        compact={compact}
        className="mb-3"
      />
      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {imageValidation.ogImage && (
          <div className={`rounded-lg border-2 p-2 ${imageValidation.ogImage.exists ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50'}`}>
            <div className="flex items-center gap-2 text-xs">
              {imageValidation.ogImage.exists ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <MetaFieldLabel fieldKey="imageValidation:ogImage" label="OG Image" size="xs" />
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
              <MetaFieldLabel fieldKey="imageValidation:twitterImage" label="Twitter Image" size="xs" />
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
