'use client';

import { getSectionConfig } from './prd-section-config';

interface PrdTableOfContentsProps {
  sections: Array<{ title: string }>;
  activeIndex: number;
  onSectionClick: (index: number) => void;
}

export function PrdTableOfContents({ sections, activeIndex, onSectionClick }: PrdTableOfContentsProps) {
  return (
    <nav className="sticky top-6">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
        Contents
      </h3>
      <ul className="space-y-0.5">
        {sections.map((section, i) => {
          const config = getSectionConfig(section.title);
          const Icon = config.icon;
          const isActive = i === activeIndex;

          return (
            <li key={i}>
              <button
                onClick={() => onSectionClick(i)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-neutral-200 font-medium text-neutral-900'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
                }`}
              >
                <Icon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: isActive ? config.color : undefined }}
                />
                <span className="shrink-0 text-xs text-neutral-400">{i + 1}.</span>
                <span className="truncate">{section.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
