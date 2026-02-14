'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { Download, RefreshCw, FileText, FileDown, AlertTriangle } from 'lucide-react';
import { Button } from '@tds/ui';
import { PrdSection } from './prd/PrdSection';
import { PrdTableOfContents } from './prd/PrdTableOfContents';
import { PrdScoringSummary } from './prd/PrdScoringSummary';
import { StatusBadge } from './StatusBadge';
import type { IPrdData, IIdeaScoring, IdeaStatus, PrdValidationInfo } from './types';

marked.setOptions({ breaks: true, gfm: true });

interface PrdPreviewProps {
  prdData: IPrdData;
  ideaTitle: string;
  ideaStatus: IdeaStatus;
  updatedAt: string;
  scoring?: IIdeaScoring;
  onExport: () => void;
  onExportPdf: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
  validationInfo?: PrdValidationInfo | null;
}

export function PrdPreview({
  prdData,
  ideaTitle,
  ideaStatus,
  updatedAt,
  scoring,
  onExport,
  onExportPdf,
  onRegenerate,
  regenerating,
  validationInfo,
}: PrdPreviewProps) {
  const sections = prdData.sections || [];
  const hasStructuredSections = sections.length > 0;

  // Scroll spy
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!hasStructuredSections) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = sectionRefs.current.indexOf(entry.target as HTMLElement);
            if (idx !== -1) setActiveIndex(idx);
          }
        }
      },
      {
        root: container,
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [hasStructuredSections, sections.length]);

  const handleSectionClick = useCallback((index: number) => {
    const el = sectionRefs.current[index];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Fallback: render raw markdown
  const fallbackHtml = useMemo(() => {
    if (hasStructuredSections) return '';
    const md = prdData.fullMarkdown || '';
    return marked.parse(md) as string;
  }, [hasStructuredSections, prdData.fullMarkdown]);

  const formattedDate = useMemo(() => {
    const d = prdData.generatedAt ? new Date(prdData.generatedAt) : updatedAt ? new Date(updatedAt) : null;
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [prdData.generatedAt, updatedAt]);

  return (
    <div className="flex h-full flex-col">
      {/* Action bar */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3 print:hidden">
        <h3 className="text-sm font-semibold text-neutral-700">Product Requirements Document</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={regenerating}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export .md
          </Button>
          <Button size="sm" onClick={onExportPdf}>
            <FileDown className="mr-1.5 h-3.5 w-3.5" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Validation warning banner */}
      {validationInfo && !validationInfo.valid && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 print:hidden">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">PRD quality issues detected</p>
              <ul className="mt-1 space-y-0.5 text-amber-700">
                {validationInfo.issues
                  .filter((i) => i.severity === 'error')
                  .map((issue) => (
                    <li key={issue.code}>{issue.message}</li>
                  ))}
              </ul>
              {validationInfo.retried && (
                <p className="mt-1.5 text-xs text-amber-600">
                  Auto-retry was attempted but issues persist. Click &quot;Regenerate&quot; to try again.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* TOC sidebar — hidden below lg */}
        {hasStructuredSections && (
          <div className="hidden w-64 shrink-0 overflow-y-auto border-r border-neutral-200 bg-neutral-50 p-4 lg:block print:hidden">
            <PrdTableOfContents
              sections={sections}
              activeIndex={activeIndex}
              onSectionClick={handleSectionClick}
            />
          </div>
        )}

        {/* Document body */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-neutral-50">
          <div className="mx-auto max-w-4xl px-6 py-8 sm:px-10">
            {/* Cover header */}
            <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-8">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                  <FileText className="h-4 w-4 text-green-700" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-green-700">
                  Product Requirements Document
                </span>
              </div>

              <h1 className="mb-3 text-3xl font-bold leading-tight text-neutral-900 sm:text-4xl">
                {prdData.title || ideaTitle}
              </h1>

              {prdData.summary && (
                <p className="mb-4 text-base leading-relaxed text-neutral-600">
                  {prdData.summary}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-400">
                <StatusBadge status={ideaStatus} />
                {formattedDate && <span>{formattedDate}</span>}
              </div>
            </div>

            {/* Scoring summary */}
            {scoring && (
              <div className="mb-8">
                <PrdScoringSummary scoring={scoring} />
              </div>
            )}

            {/* Sections or fallback */}
            {hasStructuredSections ? (
              <div className="space-y-14">
                {sections.map((section, i) => (
                  <PrdSection
                    key={i}
                    ref={(el) => { sectionRefs.current[i] = el; }}
                    index={i}
                    title={section.title}
                    content={section.content}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-neutral-200 bg-white p-6">
                <div
                  className="prose prose-base max-w-none prose-headings:text-neutral-900 prose-p:text-neutral-700 prose-strong:text-neutral-800 prose-li:text-neutral-700 prose-a:text-blue-600"
                  dangerouslySetInnerHTML={{ __html: fallbackHtml }}
                />
              </div>
            )}

            {/* Footer */}
            <div className="mt-10 border-t border-neutral-200 pt-6 text-center text-xs text-neutral-400">
              Generated by TDS Ideation Tool {formattedDate && `\u00B7 ${formattedDate}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
