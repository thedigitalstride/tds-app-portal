'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@tds/ui';
import { useIdeaList } from '../hooks/useIdeaList';
import { IdeaCard } from './IdeaCard';
import { NewIdeaDialog } from './NewIdeaDialog';
import { InspirationPanel } from './InspirationPanel';
import { STATUS_LABELS, type IdeaStatus } from './types';

interface IdeaPipelineProps {
  currentUserId: string;
}

const STATUS_FILTERS: Array<IdeaStatus | 'all'> = [
  'all',
  'draft',
  'approved',
  'in-progress',
  'completed',
  'archived',
];

export function IdeaPipeline({ currentUserId }: IdeaPipelineProps) {
  const router = useRouter();
  const { ideas, loading, statusFilter, setStatusFilter, refreshIdeas, deleteIdea } = useIdeaList();
  const [showNewDialog, setShowNewDialog] = useState(false);

  const handleCreated = (id: string) => {
    setShowNewDialog(false);
    router.push(`/tools/ideation/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this idea? This cannot be undone.')) return;
    try {
      await deleteIdea(id);
    } catch {
      console.error('Failed to delete');
    }
  };

  const handleVote = async (id: string, value: 1 | -1) => {
    try {
      await fetch(`/api/tools/ideation/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      refreshIdeas();
    } catch {
      console.error('Failed to vote');
    }
  };

  const handleInspirationSelect = async (context: string) => {
    try {
      const res = await fetch('/api/tools/ideation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspirationContext: context }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      router.push(`/tools/ideation/${data.idea._id}`);
    } catch {
      console.error('Failed to create from inspiration');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Ideation</h1>
          <p className="mt-1 text-neutral-500">
            Transform ideas into structured PRDs through AI-guided discovery
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Idea
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {status === 'all' ? 'All' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {/* Inspiration */}
      <InspirationPanel onSelectIdea={handleInspirationSelect} />

      {/* Ideas Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : ideas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 py-16 text-center">
          <p className="text-neutral-500">No ideas yet. Start one above!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea._id}
              idea={idea}
              currentUserId={currentUserId}
              onDelete={handleDelete}
              onVote={handleVote}
            />
          ))}
        </div>
      )}

      <NewIdeaDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
