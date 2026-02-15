import { useState, useEffect, useCallback } from 'react';
import type { IdeaFull, IdeaStatus } from '../components/types';

export function useIdea(id: string) {
  const [idea, setIdea] = useState<IdeaFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIdea = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tools/ideation/${id}`);
      if (!res.ok) throw new Error('Failed to fetch idea');
      const data = await res.json();
      setIdea(data.idea);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIdea();
  }, [fetchIdea]);

  const updateTitle = useCallback(
    async (title: string) => {
      const res = await fetch(`/api/tools/ideation/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to update title');
      setIdea((prev) => (prev ? { ...prev, title } : null));
    },
    [id]
  );

  const updateStatus = useCallback(
    async (status: IdeaStatus) => {
      const res = await fetch(`/api/tools/ideation/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setIdea((prev) => (prev ? { ...prev, status } : null));
    },
    [id]
  );

  const deleteIdea = useCallback(async () => {
    const res = await fetch(`/api/tools/ideation/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete idea');
  }, [id]);

  const exportPrd = useCallback(async () => {
    const res = await fetch(`/api/tools/ideation/${id}/export`);
    if (!res.ok) throw new Error('Failed to export PRD');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${idea?.title || 'prd'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [id, idea?.title]);

  const score = useCallback(async () => {
    const res = await fetch(`/api/tools/ideation/${id}/score`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to score idea');
    const data = await res.json();
    setIdea((prev) => (prev ? { ...prev, scoring: data.scoring } : null));
  }, [id]);

  const vote = useCallback(
    async (value: 1 | -1) => {
      const res = await fetch(`/api/tools/ideation/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error('Failed to vote');
      const data = await res.json();
      setIdea((prev) =>
        prev ? { ...prev, voteScore: data.voteScore, votes: data.votes } : null
      );
    },
    [id]
  );

  const inviteReviewers = useCallback(
    async (userIds: string[]) => {
      const res = await fetch(`/api/tools/ideation/${id}/reviewers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds }),
      });
      if (!res.ok) throw new Error('Failed to invite reviewers');
      const data = await res.json();
      setIdea((prev) => (prev ? { ...prev, reviewers: data.reviewers } : null));
    },
    [id]
  );

  const removeReviewer = useCallback(
    async (userId: string) => {
      const res = await fetch(`/api/tools/ideation/${id}/reviewers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error('Failed to remove reviewer');
      const data = await res.json();
      setIdea((prev) => (prev ? { ...prev, reviewers: data.reviewers } : null));
    },
    [id]
  );

  const addComment = useCallback(
    async (content: string) => {
      const res = await fetch(`/api/tools/ideation/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Failed to add comment');
      const data = await res.json();
      setIdea((prev) => (prev ? { ...prev, comments: data.comments } : null));
    },
    [id]
  );

  return {
    idea,
    loading,
    error,
    refreshIdea: fetchIdea,
    updateTitle,
    updateStatus,
    deleteIdea,
    exportPrd,
    score,
    vote,
    addComment,
    inviteReviewers,
    removeReviewer,
  };
}
