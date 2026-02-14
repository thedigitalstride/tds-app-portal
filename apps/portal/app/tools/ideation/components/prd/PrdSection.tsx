'use client';

import { forwardRef, useMemo } from 'react';
import { marked } from 'marked';
import { getSectionConfig } from './prd-section-config';

interface PrdSectionProps {
  index: number;
  title: string;
  content: string;
}

export const PrdSection = forwardRef<HTMLElement, PrdSectionProps>(
  function PrdSection({ index, title, content }, ref) {
    const config = getSectionConfig(title);
    const Icon = config.icon;

    const html = useMemo(() => marked.parse(content) as string, [content]);

    return (
      <section
        ref={ref}
        id={`prd-section-${index}`}
        className="scroll-mt-24 print:break-inside-avoid"
      >
        <div className="mb-4 flex items-center gap-3 border-b border-neutral-200 pb-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: config.bgColor }}
          >
            <Icon className="h-5 w-5" style={{ color: config.color }} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Section {index + 1}
            </p>
            <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          </div>
        </div>

        <div
          className="prose prose-sm max-w-none prose-headings:text-neutral-900 prose-p:text-neutral-700 prose-strong:text-neutral-800 prose-li:text-neutral-700 prose-a:text-blue-600"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </section>
    );
  }
);
