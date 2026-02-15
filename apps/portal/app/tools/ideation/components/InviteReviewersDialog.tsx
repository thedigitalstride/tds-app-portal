'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, UserPlus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@tds/ui';

interface User {
  _id: string;
  name: string;
  image?: string;
  email: string;
}

interface Reviewer {
  userId: { _id: string; name: string; image?: string };
  invitedBy: { _id: string; name: string };
  invitedAt: string;
  seen: boolean;
}

interface InviteReviewersDialogProps {
  open: boolean;
  onClose: () => void;
  ideaId: string;
  reviewers: Reviewer[];
  collaboratorIds: string[];
  ownerId: string;
  onReviewersChanged: (reviewers: Reviewer[]) => void;
}

export function InviteReviewersDialog({
  open,
  onClose,
  ideaId,
  reviewers,
  collaboratorIds,
  ownerId,
  onReviewersChanged,
}: InviteReviewersDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const excludedIds = new Set([
    ownerId,
    ...collaboratorIds,
    ...reviewers.map((r) => r.userId._id),
  ]);

  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.users || []);
      }
    } catch {
      // Silently fail search
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchUsers(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchUsers]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  const handleInvite = async (userId: string) => {
    setInviting(userId);
    try {
      const res = await fetch(`/api/tools/ideation/${ideaId}/reviewers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userId] }),
      });
      if (res.ok) {
        const data = await res.json();
        onReviewersChanged(data.reviewers);
        // Remove from search results
        setResults((prev) => prev.filter((u) => u._id !== userId));
      }
    } catch {
      // Silently fail
    } finally {
      setInviting(null);
    }
  };

  const handleRemove = async (userId: string) => {
    setRemoving(userId);
    try {
      const res = await fetch(`/api/tools/ideation/${ideaId}/reviewers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        onReviewersChanged(data.reviewers);
      }
    } catch {
      // Silently fail
    } finally {
      setRemoving(null);
    }
  };

  const filteredResults = results.filter((u) => !excludedIds.has(u._id));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Reviewers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-neutral-200 py-2 pl-9 pr-3 text-sm focus:border-neutral-400 focus:outline-none"
              autoFocus
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />
            )}
          </div>

          {/* Search results */}
          {filteredResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-neutral-200">
              {filteredResults.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {user.image && <AvatarImage src={user.image} alt={user.name} />}
                      <AvatarFallback className="text-xs">
                        {user.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{user.name}</p>
                      <p className="text-xs text-neutral-500">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInvite(user._id)}
                    disabled={inviting === user._id}
                    className="h-7 text-xs"
                  >
                    {inviting === user._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="mr-1 h-3.5 w-3.5" />
                        Invite
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {query.length >= 2 && !searching && filteredResults.length === 0 && (
            <p className="text-center text-sm text-neutral-500 py-2">No users found</p>
          )}

          {/* Current reviewers */}
          {reviewers.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-neutral-400">
                Current Reviewers
              </h4>
              <div className="space-y-1">
                {reviewers.map((reviewer) => (
                  <div
                    key={reviewer.userId._id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 bg-neutral-50"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        {reviewer.userId.image && (
                          <AvatarImage src={reviewer.userId.image} alt={reviewer.userId.name} />
                        )}
                        <AvatarFallback className="text-xs">
                          {reviewer.userId.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {reviewer.userId.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          Invited by {reviewer.invitedBy.name}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(reviewer.userId._id)}
                      disabled={removing === reviewer.userId._id}
                      className="h-7 text-neutral-400 hover:text-red-500"
                    >
                      {removing === reviewer.userId._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
