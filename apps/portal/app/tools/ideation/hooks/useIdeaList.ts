import { useState, useEffect, useCallback } from 'react';
import type { IdeaSummary, IdeaStatus } from '../components/types';

export function useIdeaList() {
  const [ideas, setIdeas] = useState<IdeaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | 'all'>('all');

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const res = await fetch(`/api/tools/ideation?${params}`);
      if (!res.ok) throw new Error('Failed to fetch ideas');
      const data = await res.json();
      setIdeas(data.ideas);
    } catch (error) {
      console.error('Error fetching ideas:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const deleteIdea = useCallback(async (id: string) => {
    const res = await fetch(`/api/tools/ideation/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete idea');
    setIdeas((prev) => prev.filter((i) => i._id !== id));
  }, []);

  return {
    ideas,
    loading,
    statusFilter,
    setStatusFilter,
    refreshIdeas: fetchIdeas,
    deleteIdea,
  };
}
