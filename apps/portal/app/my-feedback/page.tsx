'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bug,
  Lightbulb,
  HelpCircle,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import {
  cn,
  Card,
  CardContent,
  Badge,
  Checkbox,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@tds/ui';

interface FeedbackNote {
  _id: string;
  text: string;
  author: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  createdAt: string;
}

interface FeedbackItem {
  _id: string;
  description: string;
  type: 'bug' | 'feature' | 'question' | 'other';
  urgency: 'low' | 'medium' | 'high';
  status: 'new' | 'reviewed' | 'resolved';
  pageUrl: string;
  toolId: string | null;
  toolName: string | null;
  clientId: { _id: string; name: string } | null;
  screenshotUrl: string | null;
  notes: FeedbackNote[];
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const typeConfig = {
  bug: { icon: Bug, label: 'Bug', colour: 'text-red-600 bg-red-50' },
  feature: { icon: Lightbulb, label: 'Feature', colour: 'text-amber-600 bg-amber-50' },
  question: { icon: HelpCircle, label: 'Question', colour: 'text-blue-600 bg-blue-50' },
  other: { icon: MessageCircle, label: 'Other', colour: 'text-neutral-600 bg-neutral-100' },
};

const urgencyConfig = {
  low: { label: 'Nice to have', colour: 'bg-neutral-100 text-neutral-700' },
  medium: { label: 'Important', colour: 'bg-amber-100 text-amber-700' },
  high: { label: 'Blocking', colour: 'bg-red-100 text-red-700' },
};

const statusConfig = {
  new: { label: 'New', colour: 'bg-blue-100 text-blue-700' },
  reviewed: { label: 'Reviewed', colour: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'Resolved', colour: 'bg-green-100 text-green-700' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MyFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      for (const s of statusFilter) params.append('status', s);

      const res = await fetch(`/api/feedback/mine?${params}`);
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.feedback || []);
        setPagination(data.pagination || null);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const toggleStatus = (status: string) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">My Feedback</h1>
        <p className="mt-1 text-sm text-neutral-500">
          View all feedback you&apos;ve submitted and track their status.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        {(['new', 'reviewed', 'resolved'] as const).map((status) => (
          <div
            key={status}
            className="flex cursor-pointer items-center gap-1.5"
            onClick={() => toggleStatus(status)}
          >
            <Checkbox checked={statusFilter.has(status)} />
            <Badge className={cn('text-xs', statusConfig[status].colour)}>
              {statusConfig[status].label}
            </Badge>
          </div>
        ))}
        {pagination && (
          <p className="ml-auto text-sm text-neutral-500">
            {pagination.total} item{pagination.total === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && feedback.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-10 w-10 text-neutral-300" />
            <p className="mt-3 text-sm font-medium text-neutral-600">No feedback found</p>
            <p className="mt-1 text-xs text-neutral-400">
              {statusFilter.size > 0
                ? 'Try changing the status filter.'
                : 'Feedback you submit via the floating button will appear here.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Feedback list */}
      {!loading && feedback.length > 0 && (
        <div className="space-y-3">
          {feedback.map((item) => {
            const typeInfo = typeConfig[item.type];
            const TypeIcon = typeInfo.icon;

            return (
              <Card
                key={item._id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setSelectedFeedback(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded',
                        typeInfo.colour
                      )}
                    >
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-xs', typeInfo.colour)}>
                          {typeInfo.label}
                        </Badge>
                        <Badge className={cn('text-xs', urgencyConfig[item.urgency].colour)}>
                          {urgencyConfig[item.urgency].label}
                        </Badge>
                        <Badge className={cn('text-xs', statusConfig[item.status].colour)}>
                          {statusConfig[item.status].label}
                        </Badge>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm text-neutral-700">
                        {item.description}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-neutral-400">
                        <span>{formatDate(item.createdAt)}</span>
                        {item.toolName && <span>· {item.toolName}</span>}
                        {item.notes?.length > 0 && (
                          <span className="text-green-600">
                            · {item.notes.length} admin note{item.notes.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.screenshotUrl && (
                      <ImageIcon className="h-4 w-4 shrink-0 text-neutral-300" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog
        open={!!selectedFeedback}
        onOpenChange={(open) => {
          if (!open) setSelectedFeedback(null);
        }}
      >
        {selectedFeedback && (
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(() => {
                  const typeInfo = typeConfig[selectedFeedback.type];
                  const TypeIcon = typeInfo.icon;
                  return (
                    <>
                      <div
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded',
                          typeInfo.colour
                        )}
                      >
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <span>{typeConfig[selectedFeedback.type].label} Feedback</span>
                    </>
                  );
                })()}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              {/* Status badges */}
              <div className="flex items-center gap-2">
                <Badge className={cn('text-xs', typeConfig[selectedFeedback.type].colour)}>
                  {typeConfig[selectedFeedback.type].label}
                </Badge>
                <Badge className={cn('text-xs', urgencyConfig[selectedFeedback.urgency].colour)}>
                  {urgencyConfig[selectedFeedback.urgency].label}
                </Badge>
                <Badge className={cn('text-xs', statusConfig[selectedFeedback.status].colour)}>
                  {statusConfig[selectedFeedback.status].label}
                </Badge>
              </div>

              {/* Description */}
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-neutral-400">
                  Description
                </h3>
                <p className="whitespace-pre-wrap text-sm text-neutral-700">
                  {selectedFeedback.description}
                </p>
              </div>

              {/* Screenshot */}
              {selectedFeedback.screenshotUrl && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase text-neutral-400">
                    Screenshot
                  </h3>
                  <a
                    href={selectedFeedback.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block"
                  >
                    <img
                      src={selectedFeedback.screenshotUrl}
                      alt="Feedback screenshot"
                      className="max-h-64 rounded-lg border border-neutral-200 object-contain"
                    />
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <ExternalLink className="h-3 w-3" />
                      Open full size
                    </span>
                  </a>
                </div>
              )}

              {/* Context */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase text-neutral-400">
                  Context
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-neutral-400">Submitted</span>
                    <p className="font-medium text-neutral-700">
                      {formatDateTime(selectedFeedback.createdAt)}
                    </p>
                  </div>
                  {selectedFeedback.toolName && (
                    <div>
                      <span className="text-neutral-400">Tool</span>
                      <p className="font-medium text-neutral-700">
                        {selectedFeedback.toolName}
                      </p>
                    </div>
                  )}
                  {selectedFeedback.clientId && (
                    <div>
                      <span className="text-neutral-400">Client</span>
                      <p className="font-medium text-neutral-700">
                        {selectedFeedback.clientId.name}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-neutral-400">Page</span>
                    <p className="truncate font-medium text-neutral-700" title={selectedFeedback.pageUrl}>
                      {selectedFeedback.pageUrl}
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              {selectedFeedback.notes && selectedFeedback.notes.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-neutral-400">
                    Admin Notes
                  </h3>
                  <div className="space-y-3">
                    {selectedFeedback.notes.map((note) => (
                      <div
                        key={note._id}
                        className="rounded-lg bg-neutral-50 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            {note.author?.image && (
                              <AvatarImage
                                src={note.author.image}
                                alt={note.author.name}
                              />
                            )}
                            <AvatarFallback className="text-[8px]">
                              {note.author?.name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-neutral-700">
                            {note.author?.name || 'Admin'}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {formatDateTime(note.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-neutral-600">
                          {note.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
