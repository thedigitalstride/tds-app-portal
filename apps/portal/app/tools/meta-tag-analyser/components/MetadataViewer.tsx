'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Badge, TooltipProvider } from '@tds/ui';
import { MetaFieldLabel, SectionHeaderWithTooltip } from './MetaFieldLabel';
import { ImagePreviewThumbnail } from './ImagePreviewThumbnail';
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
import { getFieldStatus } from '../lib/field-status';

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
        {/* Left Column - Basic Meta Tags + Technical Meta Tags */}
        <div className="space-y-4">
          {/* Basic Meta Tags */}
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

          {/* Technical Meta Tags - stacked under Basic */}
          <div className="border-t pt-4">
            <SectionHeaderWithTooltip
              title="Technical Meta Tags"
              description="Tags that control page rendering, character encoding, and browser behavior."
              bestPractice="Always include viewport and charset. Set language for accessibility and SEO."
              compact={compact}
              className="mb-3"
            />

            {/* Primary Technical Fields - 2 columns within left column */}
            <div className="grid gap-3 grid-cols-2">
              <TechnicalField label="Viewport" value={data.viewport} fieldName="viewport" issue={issues.find(i => i.field.toLowerCase() === 'viewport')} diff={diffs?.viewport} />
              <TechnicalField label="Charset" value={data.charset} fieldName="charset" issue={issues.find(i => i.field.toLowerCase() === 'charset')} diff={diffs?.charset} />
              <TechnicalField label="Language" value={data.language} fieldName="language" issue={issues.find(i => i.field.toLowerCase() === 'language')} diff={diffs?.language} />
              <TechnicalField label="Robots" value={data.robots} fieldName="robots" issue={issues.find(i => i.field.toLowerCase() === 'robots')} diff={diffs?.robots} />
            </div>

            {/* Secondary Technical Fields */}
            <div className="grid gap-3 mt-3 grid-cols-2">
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

          {/* Structured Data - stacked under Technical */}
          {data.structuredData && (
            <StructuredDataSection structuredData={data.structuredData} compact={compact} />
          )}

          {/* Image Validation - stacked under Structured Data */}
          {data.imageValidation && (
            <ImageValidationSection imageValidation={data.imageValidation} compact={compact} />
          )}
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
            imageValidation={data.imageValidation}
            compact={compact}
            diffs={diffs}
          />

          {/* Twitter */}
          <TwitterCardSection
            twitter={data.twitter}
            issues={issues}
            imageValidation={data.imageValidation}
            compact={compact}
            diffs={diffs}
          />
        </div>
      </div>

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

      {/* Issues Summary - errors first, then warnings, no 'good' items */}
      {showIssues && (() => {
        // Generate issues for ALL fields using getFieldStatus (same logic as UI badges)
        // This ensures Issues Found matches the visual badges exactly
        const allIssues: AnalysisIssue[] = [];

        // Define all fields to check with their display names and values
        const fieldsToCheck: { name: string; label: string; value?: string }[] = [
          // Basic Meta Tags
          { name: 'title', label: 'Title', value: data.title },
          { name: 'description', label: 'Description', value: data.description },
          { name: 'canonical', label: 'Canonical', value: data.canonical },
          { name: 'viewport', label: 'Viewport', value: data.viewport },
          { name: 'charset', label: 'Charset', value: data.charset },
          { name: 'language', label: 'Language', value: data.language },
          { name: 'robots', label: 'Robots', value: data.robots },
          { name: 'author', label: 'Author', value: data.author },
          { name: 'themeColor', label: 'Theme Color', value: data.themeColor },
          { name: 'favicon', label: 'Favicon', value: data.favicon },
          // Open Graph
          { name: 'og:title', label: 'OG Title', value: data.openGraph?.title },
          { name: 'og:description', label: 'OG Description', value: data.openGraph?.description },
          { name: 'og:image', label: 'OG Image', value: data.openGraph?.image },
          { name: 'og:url', label: 'OG URL', value: data.openGraph?.url },
          { name: 'og:type', label: 'OG Type', value: data.openGraph?.type },
          { name: 'og:site_name', label: 'OG Site Name', value: data.openGraph?.siteName },
          { name: 'og:locale', label: 'OG Locale', value: data.openGraph?.locale },
          { name: 'og:image:alt', label: 'OG Image Alt', value: data.openGraph?.imageDetails?.alt },
          { name: 'og:image:width', label: 'OG Image Dimensions', value: data.openGraph?.imageDetails?.width?.toString() },
          // Twitter
          { name: 'twitter:card', label: 'Twitter Card', value: data.twitter?.card },
          { name: 'twitter:title', label: 'Twitter Title', value: data.twitter?.title },
          { name: 'twitter:description', label: 'Twitter Description', value: data.twitter?.description },
          { name: 'twitter:image', label: 'Twitter Image', value: data.twitter?.image },
          { name: 'twitter:site', label: 'Twitter Site', value: data.twitter?.site },
          { name: 'twitter:creator', label: 'Twitter Creator', value: data.twitter?.creator },
          { name: 'twitter:image:alt', label: 'Twitter Image Alt', value: data.twitter?.imageAlt },
          // Technical
          { name: 'structured-data', label: 'Structured Data', value: (data.structuredData?.found && data.structuredData?.isValidJson) ? 'true' : undefined },
          { name: 'web-manifest', label: 'Web Manifest', value: data.mobile?.manifest },
        ];

        for (const field of fieldsToCheck) {
          const { status, issue } = getFieldStatus(field.name, field.value, issues, data.imageValidation);

          if (status === 'error' || status === 'warning') {
            // Use existing issue message if available, otherwise generate default
            const message = issue?.message || (field.value ? 'Has quality issues' : 'Not set');
            allIssues.push({
              type: status,
              field: field.label,
              message,
            });
          }
        }

        // Deduplicate by field name (keep first occurrence)
        const seen = new Set<string>();
        const dedupedIssues = allIssues.filter(issue => {
          const key = issue.field.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Sort: errors first, then warnings
        const sortedIssues = dedupedIssues.sort((a, b) => {
          if (a.type === 'error' && b.type !== 'error') return -1;
          if (a.type !== 'error' && b.type === 'error') return 1;
          return 0;
        });

        if (sortedIssues.length === 0) return null;

        return (
          <div>
            <h4 className={`font-medium text-neutral-700 mb-2 ${compact ? 'text-xs' : 'text-sm'}`}>
              Issues Found
            </h4>
            <div className="flex flex-wrap gap-2">
              {sortedIssues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                    issue.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {issue.type === 'error' ? <AlertCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  <span className="font-medium">{issue.field}:</span>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
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
  const { status } = getFieldStatus(fieldName, value, issue ? [issue] : []);
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
    <div className={`relative rounded-lg border-2 p-2 ${statusStyles[status]}`}>
      <div className="absolute -top-2 right-2">
        <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2.5 w-2.5" />
          <span>{status === 'success' ? 'Good' : status === 'error' ? 'Error' : 'Warning'}</span>
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
  const { status } = getFieldStatus('themeColor', value, []);
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
    <div className={`relative rounded-lg border-2 p-2 ${statusStyles[status]}`}>
      <div className="absolute -top-2 right-2">
        <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2.5 w-2.5" />
          <span>{status === 'success' ? 'Good' : status === 'error' ? 'Error' : 'Warning'}</span>
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

// Helper component for Favicon field with status (detects broken images)
function FaviconField({ value, url, diff }: { value?: string; url: string; diff?: FieldDiff }) {
  const [imageError, setImageError] = useState(false);

  // Get base status, then override if image failed to load
  const { status: baseStatus } = getFieldStatus('favicon', value, []);
  const status = imageError ? 'error' : baseStatus;

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
    <div className={`relative rounded-lg border-2 p-2 ${statusStyles[status]}`}>
      <div className="absolute -top-2 right-2">
        <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2.5 w-2.5" />
          <span>{status === 'success' ? 'Good' : status === 'error' ? 'Error' : 'Warning'}</span>
        </div>
      </div>
      <MetaFieldLabel fieldKey="favicon" label="Favicon" size="xs" variant="muted" />
      {value ? (
        <div className={`flex items-center gap-2 bg-white/80 p-1 rounded border mt-0.5 ${fieldBorder}`}>
          {faviconSrc && (
            <ImagePreviewThumbnail
              src={faviconSrc}
              alt="Favicon"
              thumbnailClassName="h-4 w-4"
              label="Favicon"
              onError={() => setImageError(true)}
            />
          )}
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
  const { status } = getFieldStatus(fieldName, value, issue ? [issue] : []);
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

// Helper component for individual OG field display with container + badge style
function OgField({
  label,
  value,
  fieldName,
  issues,
  imageValidation,
  multiline = false,
  diff,
}: {
  label: string;
  value?: string;
  fieldName: string;
  issues: AnalysisIssue[];
  imageValidation?: ImageValidations;
  multiline?: boolean;
  diff?: FieldDiff;
}) {
  const { status, issue } = getFieldStatus(fieldName, value, issues, imageValidation);
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

  // Determine if this is an image field that should show a thumbnail
  const isImageField = fieldName === 'og:image';
  const imageValidationData = isImageField ? imageValidation?.ogImage : undefined;

  return (
    <div className={`relative rounded-lg border-2 p-2 ${statusStyles[status]}`}>
      <div className="absolute -top-2 right-2">
        <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2.5 w-2.5" />
          <span>{status === 'success' ? 'Good' : status === 'error' ? 'Error' : 'Warning'}</span>
        </div>
      </div>
      <MetaFieldLabel fieldKey={fieldName} label={label} size="xs" variant="muted" />
      <div className={`flex items-center gap-2 font-mono text-[10px] bg-white/80 p-1 rounded border mt-0.5 ${fieldBorder}`}>
        {/* Inline thumbnail for image fields */}
        {isImageField && value && (
          <ImagePreviewThumbnail
            src={value}
            alt={label}
            thumbnailClassName="h-8 w-12 flex-shrink-0"
            label={label}
            validation={imageValidationData}
          />
        )}
        <span className={multiline ? 'line-clamp-2' : 'truncate'} title={value}>
          {value || <span className="text-neutral-400 italic">Not set</span>}
        </span>
      </div>
      {issue && <p className="text-[10px] text-neutral-500 mt-0.5">{issue.message}</p>}
      {diff?.changed && diff.currentValue !== undefined && (
        <p className="font-mono text-xs font-medium text-neutral-700 mt-1 break-words" title={diff.currentValue}>
          Now: {diff.currentValue || <span className="italic">Not set</span>}
        </p>
      )}
    </div>
  );
}

// Helper component for Open Graph section display (neutral container, status on individual fields)
function OpenGraphSection({
  openGraph,
  issues,
  imageValidation,
  compact = false,
  diffs,
}: {
  openGraph?: OpenGraphData;
  issues: AnalysisIssue[];
  imageValidation?: ImageValidations;
  compact?: boolean;
  diffs?: Record<string, FieldDiff>;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-2">
      <MetaFieldLabel fieldKey="og:title" label="Open Graph" size={compact ? 'xs' : 'sm'} />

      <div className="mt-2 space-y-2">
        {/* Critical fields - always show */}
        <OgField label="og:title" value={openGraph?.title} fieldName="og:title" issues={issues} diff={diffs?.['og:title']} />
        <OgField label="og:description" value={openGraph?.description} fieldName="og:description" issues={issues} multiline diff={diffs?.['og:description']} />
        <OgField label="og:image" value={openGraph?.image} fieldName="og:image" issues={issues} imageValidation={imageValidation} diff={diffs?.['og:image']} />
        <OgField label="og:url" value={openGraph?.url} fieldName="og:url" issues={issues} diff={diffs?.['og:url']} />

        {/* Important fields */}
        <div className="grid grid-cols-2 gap-1.5">
          <OgField label="og:type" value={openGraph?.type} fieldName="og:type" issues={issues} diff={diffs?.['og:type']} />
          <OgField label="og:site_name" value={openGraph?.siteName} fieldName="og:site_name" issues={issues} diff={diffs?.['og:siteName']} />
        </div>

        {/* Optional fields */}
        <div className="grid grid-cols-2 gap-1.5">
          <OgField label="og:locale" value={openGraph?.locale} fieldName="og:locale" issues={issues} diff={diffs?.['og:locale']} />
          <OgField label="og:image:alt" value={openGraph?.imageDetails?.alt} fieldName="og:image:alt" issues={issues} diff={diffs?.['og:image:alt']} />
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

// Helper component for individual Twitter field display with container + badge style
function TwitterField({
  label,
  value,
  fieldName,
  issues,
  imageValidation,
  multiline = false,
  diff,
}: {
  label: string;
  value?: string;
  fieldName: string;
  issues: AnalysisIssue[];
  imageValidation?: ImageValidations;
  multiline?: boolean;
  diff?: FieldDiff;
}) {
  const { status, issue } = getFieldStatus(fieldName, value, issues, imageValidation);
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

  // Determine if this is an image field that should show a thumbnail
  const isImageField = fieldName === 'twitter:image';
  const imageValidationData = isImageField ? imageValidation?.twitterImage : undefined;

  return (
    <div className={`relative rounded-lg border-2 p-2 ${statusStyles[status]}`}>
      <div className="absolute -top-2 right-2">
        <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2.5 w-2.5" />
          <span>{status === 'success' ? 'Good' : status === 'error' ? 'Error' : 'Warning'}</span>
        </div>
      </div>
      <MetaFieldLabel fieldKey={fieldName} label={label} size="xs" variant="muted" />
      <div className={`flex items-center gap-2 font-mono text-[10px] bg-white/80 p-1 rounded border mt-0.5 ${fieldBorder}`}>
        {/* Inline thumbnail for image fields */}
        {isImageField && value && (
          <ImagePreviewThumbnail
            src={value}
            alt={label}
            thumbnailClassName="h-8 w-12 flex-shrink-0"
            label={label}
            validation={imageValidationData}
          />
        )}
        <span className={multiline ? 'line-clamp-2' : 'truncate'} title={value}>
          {value || <span className="text-neutral-400 italic">Not set</span>}
        </span>
      </div>
      {issue && <p className="text-[10px] text-neutral-500 mt-0.5">{issue.message}</p>}
      {diff?.changed && diff.currentValue !== undefined && (
        <p className="font-mono text-xs font-medium text-neutral-700 mt-1 break-words" title={diff.currentValue}>
          Now: {diff.currentValue || <span className="italic">Not set</span>}
        </p>
      )}
    </div>
  );
}

// Helper component for Twitter Card section display (neutral container, status on individual fields)
function TwitterCardSection({
  twitter,
  issues,
  imageValidation,
  compact = false,
  diffs,
}: {
  twitter?: TwitterData;
  issues: AnalysisIssue[];
  imageValidation?: ImageValidations;
  compact?: boolean;
  diffs?: Record<string, FieldDiff>;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-2">
      <MetaFieldLabel fieldKey="twitter:card" label="Twitter Card" size={compact ? 'xs' : 'sm'} />

      <div className="mt-2 space-y-2">
        {/* Critical fields - always show */}
        <div className="grid grid-cols-2 gap-1.5">
          <TwitterField label="twitter:card" value={twitter?.card} fieldName="twitter:card" issues={issues} diff={diffs?.['twitter:card']} />
          <TwitterField label="twitter:site" value={twitter?.site} fieldName="twitter:site" issues={issues} diff={diffs?.['twitter:site']} />
        </div>
        <TwitterField label="twitter:title" value={twitter?.title} fieldName="twitter:title" issues={issues} diff={diffs?.['twitter:title']} />
        <TwitterField label="twitter:description" value={twitter?.description} fieldName="twitter:description" issues={issues} multiline diff={diffs?.['twitter:description']} />
        <TwitterField label="twitter:image" value={twitter?.image} fieldName="twitter:image" issues={issues} imageValidation={imageValidation} diff={diffs?.['twitter:image']} />

        {/* Optional fields */}
        <div className="grid grid-cols-2 gap-1.5">
          <TwitterField label="twitter:creator" value={twitter?.creator} fieldName="twitter:creator" issues={issues} diff={diffs?.['twitter:creator']} />
          <TwitterField label="twitter:image:alt" value={twitter?.imageAlt} fieldName="twitter:image:alt" issues={issues} diff={diffs?.['twitter:imageAlt']} />
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

// Helper component for Structured Data fields with status badge
function StructuredDataField({
  label,
  fieldKey,
  value,
  displayValue,
}: {
  label: string;
  fieldKey: string;
  value: boolean;
  displayValue: string;
}) {
  const status = value ? 'success' : 'warning';
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
    <div className={`relative rounded-lg border-2 p-2 ${statusStyles[status]}`}>
      <div className="absolute -top-2 right-2">
        <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2.5 w-2.5" />
          <span>{status === 'success' ? 'Good' : 'Warning'}</span>
        </div>
      </div>
      <MetaFieldLabel fieldKey={fieldKey} label={label} size="xs" variant="muted" />
      <p className="font-mono text-xs bg-white/80 p-1 rounded border mt-0.5">
        {displayValue}
      </p>
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
                  <ImagePreviewThumbnail
                    src={icon.href}
                    alt={`Touch icon ${icon.sizes || 'default'}`}
                    thumbnailClassName="h-6 w-6 rounded"
                    label={`Apple Touch Icon${icon.sizes ? ` (${icon.sizes})` : ''}`}
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

// Helper component for Image Validation fields with status badge
function ImageValidationField({
  label,
  fieldKey,
  validation,
}: {
  label: string;
  fieldKey: string;
  validation: { exists: boolean; statusCode?: number; contentType?: string; error?: string };
}) {
  const status = validation.exists ? 'success' : 'error';
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
    <div className={`relative rounded-lg border-2 p-2 ${statusStyles[status]}`}>
      <div className="absolute -top-2 right-2">
        <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text} border border-current/20`}>
          <BadgeIcon className="h-2.5 w-2.5" />
          <span>{status === 'success' ? 'Good' : 'Error'}</span>
        </div>
      </div>
      <MetaFieldLabel fieldKey={fieldKey} label={label} size="xs" variant="muted" />
      <div className="mt-1 space-y-1">
        {validation.statusCode && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500">Status:</span>
            <Badge variant={validation.exists ? 'default' : 'destructive'} className="text-[10px]">
              {validation.statusCode}
            </Badge>
          </div>
        )}
        {validation.contentType && (
          <p className="text-[10px] text-neutral-500">
            Type: <span className="font-mono">{validation.contentType}</span>
          </p>
        )}
        {validation.error && (
          <p className="text-[10px] text-red-600 bg-white/80 p-1 rounded border">{validation.error}</p>
        )}
      </div>
    </div>
  );
}

// Structured Data Section (inline for left column layout) (for left column layout)
function StructuredDataSection({
  structuredData,
  compact = false,
}: {
  structuredData: StructuredData;
  compact?: boolean;
}) {
  // Backwards compatibility: use validationErrors if available, fall back to errors for old data
  const errorsList = structuredData.validationErrors ?? structuredData.errors ?? [];
  const hasErrors = errorsList.length > 0;

  return (
    <div className="border-t pt-4">
      <SectionHeaderWithTooltip
        title="Structured Data (JSON-LD)"
        description="Machine-readable data that helps search engines understand your content and display rich results."
        bestPractice="Use Schema.org types. Validate with Google's Rich Results Test."
        compact={compact}
        className="mb-3"
      />
      <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3">
        <div className="grid gap-3 grid-cols-2">
          <StructuredDataField
            label="Found"
            fieldKey="structuredData:found"
            value={structuredData.found}
            displayValue={structuredData.found ? 'Yes' : 'No'}
          />
          <StructuredDataField
            label="Valid JSON"
            fieldKey="structuredData:isValidJson"
            value={structuredData.isValidJson}
            displayValue={structuredData.isValidJson ? 'Yes' : 'No'}
          />
        </div>
        {structuredData.types.length > 0 && (
          <div className="mt-3 relative rounded-lg border-2 border-green-300 bg-green-50/50 p-2">
            <div className="absolute -top-2 right-2">
              <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 border border-current/20">
                <CheckCircle className="h-2.5 w-2.5" />
                <span>Good</span>
              </div>
            </div>
            <MetaFieldLabel fieldKey="structuredData:types" label="Schema Types" size="xs" variant="muted" />
            <div className="flex flex-wrap gap-1 mt-1">
              {structuredData.types.map((type, idx) => (
                <Badge key={idx} variant="secondary" className="font-mono text-[10px]">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {hasErrors && (
          <div className="mt-3 relative rounded-lg border-2 border-red-300 bg-red-50/50 p-2">
            <div className="absolute -top-2 right-2">
              <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 border border-current/20">
                <AlertCircle className="h-2.5 w-2.5" />
                <span>Error</span>
              </div>
            </div>
            <MetaFieldLabel fieldKey="structuredData:errors" label="Validation Errors" size="xs" variant="muted" />
            <ul className="list-disc list-inside text-xs text-red-600 mt-1 bg-white/80 p-1.5 rounded border">
              {errorsList.map((error, idx) => (
                <li key={idx} className="truncate" title={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Image Validation Section (for left column layout)
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
      <div className="grid gap-3 grid-cols-2">
        {imageValidation.ogImage && (
          <ImageValidationField
            label="OG Image"
            fieldKey="imageValidation:ogImage"
            validation={imageValidation.ogImage}
          />
        )}
        {imageValidation.twitterImage && (
          <ImageValidationField
            label="Twitter Image"
            fieldKey="imageValidation:twitterImage"
            validation={imageValidation.twitterImage}
          />
        )}
      </div>
    </div>
  );
}
