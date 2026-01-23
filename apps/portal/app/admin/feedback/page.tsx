'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bug,
  Lightbulb,
  HelpCircle,
  MessageCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';
import {
  cn,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Select,
  Skeleton,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Textarea,
} from '@tds/ui';

interface FeedbackNote {
  _id: string;
  text: string;
  author: { _id: string; name: string; email: string; image?: string };
  createdAt: string;
}

interface FeedbackItem {
  _id: string;
  type: 'bug' | 'feature' | 'question' | 'other';
  urgency: 'low' | 'medium' | 'high';
  description: string;
  pageUrl: string;
  toolId: string | null;
  toolName: string | null;
  clientId: { _id: string; name: string } | null;
  browser: string;
  viewport: { width: number; height: number };
  userAgent: string;
  consoleErrors: string[];
  screenshotUrl: string | null;
  submittedBy: { _id: string; name: string; email: string; image?: string };
  status: 'new' | 'reviewed' | 'resolved';
  notes?: FeedbackNote[];
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const typeConfig = {
  bug: { icon: Bug, label: 'Bug', color: 'text-red-600 bg-red-50' },
  feature: { icon: Lightbulb, label: 'Feature', color: 'text-amber-600 bg-amber-50' },
  question: { icon: HelpCircle, label: 'Question', color: 'text-blue-600 bg-blue-50' },
  other: { icon: MessageCircle, label: 'Other', color: 'text-neutral-600 bg-neutral-100' },
};

const urgencyConfig = {
  low: { label: 'Nice to have', color: 'bg-neutral-100 text-neutral-700' },
  medium: { label: 'Important', color: 'bg-amber-100 text-amber-700' },
  high: { label: 'Blocking', color: 'bg-red-100 text-red-700' },
};

const statusConfig = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
  reviewed: { label: 'Reviewed', color: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
};

export default function FeedbackDashboardPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Detail modal
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);

      const res = await fetch(`/api/feedback?${params}`);
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.feedback);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, typeFilter]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const updateStatus = async (feedbackId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Update local state
        setFeedback((prev) =>
          prev.map((item) =>
            item._id === feedbackId
              ? { ...item, status: newStatus as FeedbackItem['status'] }
              : item
          )
        );
        // Update selected feedback if open
        if (selectedFeedback?._id === feedbackId) {
          setSelectedFeedback((prev) =>
            prev ? { ...prev, status: newStatus as FeedbackItem['status'] } : null
          );
        }
      }
    } catch (error) {
      console.error('Failed to update feedback status:', error);
    }
  };

  const addNote = async (feedbackId: string) => {
    if (!newNote.trim()) return;

    setAddingNote(true);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      });

      if (res.ok) {
        const updatedFeedback = await res.json();
        // Update selected feedback with new notes
        setSelectedFeedback(updatedFeedback);
        // Update in the list as well
        setFeedback((prev) =>
          prev.map((item) =>
            item._id === feedbackId ? { ...item, notes: updatedFeedback.notes } : item
          )
        );
        setNewNote('');
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setAddingNote(false);
    }
  };

  const goToPage = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Feedback</h1>
        <p className="mt-1 text-neutral-500">
          Review and manage feedback from team members
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Feedback</CardTitle>
              <CardDescription>
                {pagination.total} total submissions
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-36"
                options={[
                  { value: '', label: 'All statuses' },
                  { value: 'new', label: 'New' },
                  { value: 'reviewed', label: 'Reviewed' },
                  { value: 'resolved', label: 'Resolved' },
                ]}
              />
              <Select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-36"
                options={[
                  { value: '', label: 'All types' },
                  { value: 'bug', label: 'Bug' },
                  { value: 'feature', label: 'Feature' },
                  { value: 'question', label: 'Question' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-4 rounded-lg border border-neutral-200 p-4">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full max-w-md" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : feedback.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">
              <MessageCircle className="mx-auto h-12 w-12 text-neutral-300" />
              <p className="mt-4 text-lg font-medium">No feedback yet</p>
              <p className="mt-1">Feedback submissions will appear here</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {feedback.map((item) => {
                  const TypeIcon = typeConfig[item.type].icon;
                  return (
                    <button
                      key={item._id}
                      onClick={() => setSelectedFeedback(item)}
                      className="flex w-full items-start gap-4 rounded-lg border border-neutral-200 p-4 text-left transition-colors hover:bg-neutral-50"
                    >
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        {item.submittedBy?.image && (
                          <AvatarImage src={item.submittedBy.image} alt={item.submittedBy.name} />
                        )}
                        <AvatarFallback>
                          {item.submittedBy?.name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                              typeConfig[item.type].color
                            )}
                          >
                            <TypeIcon className="h-3 w-3" />
                            {typeConfig[item.type].label}
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              urgencyConfig[item.urgency].color
                            )}
                          >
                            {urgencyConfig[item.urgency].label}
                          </span>
                          {item.screenshotUrl && (
                            <span className="text-neutral-400">
                              <ImageIcon className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <p className="line-clamp-2 text-sm text-neutral-900">
                          {item.description}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                          <span>{item.submittedBy?.name}</span>
                          <span>·</span>
                          <span>{formatDate(item.createdAt)}</span>
                          {item.toolName && (
                            <>
                              <span>·</span>
                              <span>{item.toolName}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge
                        className={cn('flex-shrink-0', statusConfig[item.status].color)}
                        variant="secondary"
                      >
                        {statusConfig[item.status].label}
                      </Badge>
                    </button>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-4">
                  <p className="text-sm text-neutral-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} results
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-neutral-600">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => { setSelectedFeedback(null); setNewNote(''); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-8">
                  <DialogTitle className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                        typeConfig[selectedFeedback.type].color
                      )}
                    >
                      {(() => {
                        const TypeIcon = typeConfig[selectedFeedback.type].icon;
                        return <TypeIcon className="h-3 w-3" />;
                      })()}
                      {typeConfig[selectedFeedback.type].label}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        urgencyConfig[selectedFeedback.urgency].color
                      )}
                    >
                      {urgencyConfig[selectedFeedback.urgency].label}
                    </span>
                  </DialogTitle>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Description */}
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Description</h3>
                  <p className="text-neutral-900 whitespace-pre-wrap">{selectedFeedback.description}</p>
                </div>

                {/* Screenshot */}
                {selectedFeedback.screenshotUrl && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-2">Screenshot</h3>
                    <a
                      href={selectedFeedback.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- External blob URL, can't use Next.js Image */}
                      <img
                        src={selectedFeedback.screenshotUrl}
                        alt="Feedback screenshot"
                        className="rounded-lg border border-neutral-200 max-h-64 object-contain"
                      />
                    </a>
                  </div>
                )}

                {/* Context */}
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Context</h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-neutral-500">Page</dt>
                      <dd className="font-medium">
                        <a
                          href={selectedFeedback.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          {new URL(selectedFeedback.pageUrl).pathname}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </dd>
                    </div>
                    {selectedFeedback.toolName && (
                      <div>
                        <dt className="text-neutral-500">Tool</dt>
                        <dd className="font-medium">{selectedFeedback.toolName}</dd>
                      </div>
                    )}
                    {selectedFeedback.clientId && (
                      <div>
                        <dt className="text-neutral-500">Client</dt>
                        <dd className="font-medium">{selectedFeedback.clientId.name}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-neutral-500">Browser</dt>
                      <dd className="font-medium">{selectedFeedback.browser}</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500">Viewport</dt>
                      <dd className="font-medium">
                        {selectedFeedback.viewport.width} x {selectedFeedback.viewport.height}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Submitted by */}
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Submitted by</h3>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {selectedFeedback.submittedBy?.image && (
                        <AvatarImage
                          src={selectedFeedback.submittedBy.image}
                          alt={selectedFeedback.submittedBy.name}
                        />
                      )}
                      <AvatarFallback>
                        {selectedFeedback.submittedBy?.name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-neutral-900">{selectedFeedback.submittedBy?.name}</p>
                      <p className="text-sm text-neutral-500">{formatDate(selectedFeedback.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Status update */}
                <div className="border-t border-neutral-200 pt-4">
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Status</h3>
                  <Select
                    value={selectedFeedback.status}
                    onChange={(e) => updateStatus(selectedFeedback._id, e.target.value)}
                    className="w-40"
                    options={[
                      { value: 'new', label: 'New' },
                      { value: 'reviewed', label: 'Reviewed' },
                      { value: 'resolved', label: 'Resolved' },
                    ]}
                  />
                </div>

                {/* Admin Notes */}
                <div className="border-t border-neutral-200 pt-4">
                  <h3 className="text-sm font-medium text-neutral-500 mb-3">Admin Notes</h3>

                  {/* Existing notes */}
                  {selectedFeedback.notes && selectedFeedback.notes.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {selectedFeedback.notes.map((note) => (
                        <div key={note._id} className="flex gap-3">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            {note.author?.image && (
                              <AvatarImage src={note.author.image} alt={note.author.name} />
                            )}
                            <AvatarFallback className="text-xs">
                              {note.author?.name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                              <span className="font-medium text-neutral-700">{note.author?.name}</span>
                              <span>·</span>
                              <span>{formatDate(note.createdAt)}</span>
                            </div>
                            <p className="text-sm text-neutral-900 whitespace-pre-wrap">{note.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new note */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => addNote(selectedFeedback._id)}
                        disabled={!newNote.trim() || addingNote}
                      >
                        {addingNote ? 'Adding...' : 'Add Note'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
