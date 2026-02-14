'use client';

import { ExternalLink, Globe } from 'lucide-react';

interface ResearchResultsProps {
  existingSolutions?: string[];
  marketGaps?: string[];
  userResearchLinks?: string[];
}

export function ResearchResults({
  existingSolutions,
  marketGaps,
  userResearchLinks,
}: ResearchResultsProps) {
  const hasData = existingSolutions?.length || marketGaps?.length || userResearchLinks?.length;

  if (!hasData) return null;

  return (
    <div className="space-y-4 px-11">
      {existingSolutions && existingSolutions.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Existing Solutions
          </h4>
          <div className="space-y-2">
            {existingSolutions.map((solution, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-neutral-700">
                <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                {solution}
              </div>
            ))}
          </div>
        </div>
      )}

      {marketGaps && marketGaps.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Market Gaps
          </h4>
          <div className="space-y-1">
            {marketGaps.map((gap, index) => (
              <div key={index} className="text-sm text-emerald-700">
                {gap}
              </div>
            ))}
          </div>
        </div>
      )}

      {userResearchLinks && userResearchLinks.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Your Research Links
          </h4>
          <div className="space-y-1">
            {userResearchLinks.map((link, index) => (
              <a
                key={index}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-3 w-3" />
                {link}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
