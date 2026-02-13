'use client';

import { useState } from 'react';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@tds/ui';
import type { InspirationIdea } from './types';

interface InspirationPanelProps {
  onSelectIdea: (context: string) => void;
}

export function InspirationPanel({ onSelectIdea }: InspirationPanelProps) {
  const [ideas, setIdeas] = useState<InspirationIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);

  const generate = async () => {
    setLoading(true);
    setShown(true);
    try {
      const res = await fetch('/api/tools/ideation/inspire', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setIdeas(data.ideas);
    } catch {
      console.error('Failed to generate inspiration');
    } finally {
      setLoading(false);
    }
  };

  if (!shown) {
    return (
      <button
        onClick={generate}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
      >
        <Sparkles className="h-5 w-5 text-amber-500" />
        <div>
          <div className="text-sm font-medium text-neutral-700">Need inspiration?</div>
          <div className="text-xs text-neutral-500">Let AI suggest ideas for you</div>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Inspiration
        </h3>
        <Button variant="ghost" size="sm" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {loading && ideas.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea, index) => (
            <button
              key={index}
              onClick={() =>
                onSelectIdea(`Idea seed: ${idea.title}\n\n${idea.description}`)
              }
              className="group flex w-full items-start gap-3 rounded-lg border border-neutral-100 p-3 text-left transition-all hover:border-blue-200 hover:bg-blue-50"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-neutral-800">{idea.title}</div>
                <div className="mt-0.5 text-xs text-neutral-500">{idea.description}</div>
                <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                  {idea.category}
                </span>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-blue-500" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
