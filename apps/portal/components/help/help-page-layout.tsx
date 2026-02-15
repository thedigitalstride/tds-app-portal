'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@tds/ui';

export interface TocSection {
  id: string;
  title: string;
}

interface HelpPageLayoutProps {
  toolName: string;
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
  sections: TocSection[];
  children: ReactNode;
}

export function HelpPageLayout({
  toolName,
  backHref,
  backLabel,
  title,
  subtitle,
  sections,
  children,
}: HelpPageLayoutProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  // Scroll-spy via IntersectionObserver
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      {
        root: container,
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    );

    sections.forEach(({ id }) => {
      const el = container.querySelector(`#${id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const handleTocClick = (id: string) => {
    const el = scrollContainerRef.current?.querySelector(`#${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => router.push(backHref)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-medium text-neutral-400">{toolName}</p>
            <h1 className="truncate text-sm font-semibold text-neutral-900">{title}</h1>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Scrollable content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-8 lg:px-8">
            {/* Page title */}
            <div className="mb-12">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
                {backLabel}
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{title}</h1>
              <p className="mt-2 text-lg text-neutral-500">{subtitle}</p>
            </div>

            {/* Content sections */}
            <div className="space-y-12">{children}</div>
          </div>
        </div>

        {/* Sticky TOC sidebar — lg+ only */}
        <div className="hidden w-56 shrink-0 overflow-y-auto border-l border-neutral-200 bg-neutral-50 p-4 lg:block">
          <nav className="sticky top-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Contents
            </h3>
            <ul className="space-y-0.5">
              {sections.map(({ id, title: sectionTitle }) => {
                const isActive = id === activeId;
                return (
                  <li key={id}>
                    <button
                      onClick={() => handleTocClick(id)}
                      className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                        isActive
                          ? 'border-l-2 border-blue-500 bg-blue-50 font-medium text-neutral-900'
                          : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
                      }`}
                    >
                      <span className="truncate">{sectionTitle}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
