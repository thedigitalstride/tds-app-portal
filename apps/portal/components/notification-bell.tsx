'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle2 } from 'lucide-react';
import {
  cn,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@tds/ui';
import type { ReviewInvitation } from '@/app/tools/ideation/components/types';

interface FeedbackNotification {
  feedbackId: string;
  description: string;
  type: string;
  toolName: string | null;
  resolvedAt: string;
  hasNotes: boolean;
}

interface NotificationBellProps {
  collapsed: boolean;
}

const feedbackTypeLabels: Record<string, string> = {
  bug: 'bug report',
  feature: 'feature request',
  question: 'question',
  other: 'feedback',
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function NotificationBell({ collapsed }: NotificationBellProps) {
  const router = useRouter();
  const [invitations, setInvitations] = useState<ReviewInvitation[]>([]);
  const [feedbackNotifications, setFeedbackNotifications] = useState<FeedbackNotification[]>([]);
  const [count, setCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const [invitationsRes, feedbackRes] = await Promise.all([
        fetch('/api/tools/ideation/review-invitations'),
        fetch('/api/feedback/my-notifications'),
      ]);

      let newInvitations: ReviewInvitation[] = [];
      let newFeedback: FeedbackNotification[] = [];

      if (invitationsRes.ok) {
        const data = await invitationsRes.json();
        newInvitations = data.invitations || [];
      }
      if (feedbackRes.ok) {
        const data = await feedbackRes.json();
        newFeedback = data.notifications || [];
      }

      setInvitations(newInvitations);
      setFeedbackNotifications(newFeedback);
      setCount(newInvitations.length + newFeedback.length);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications]);

  const handleInvitationClick = async (invitation: ReviewInvitation) => {
    try {
      await fetch('/api/tools/ideation/review-invitations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: invitation.ideaId }),
      });
    } catch {
      // Silently fail
    }

    setInvitations((prev) => prev.filter((i) => i.ideaId !== invitation.ideaId));
    setCount((prev) => Math.max(0, prev - 1));
    router.push(`/tools/ideation/${invitation.ideaId}`);
  };

  const handleFeedbackClick = async (notification: FeedbackNotification) => {
    try {
      await fetch('/api/feedback/my-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId: notification.feedbackId }),
      });
    } catch {
      // Silently fail
    }

    setFeedbackNotifications((prev) =>
      prev.filter((n) => n.feedbackId !== notification.feedbackId)
    );
    setCount((prev) => Math.max(0, prev - 1));
    router.push('/my-feedback');
  };

  const hasBothTypes = feedbackNotifications.length > 0 && invitations.length > 0;
  const isEmpty = feedbackNotifications.length === 0 && invitations.length === 0;

  const bellButton = (
    <DropdownMenuTrigger asChild>
      <button
        className={cn(
          'relative flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors',
          collapsed ? 'h-8 w-8' : 'h-8 w-8'
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{bellButton}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {count > 0
              ? `${count} notification${count === 1 ? '' : 's'}`
              : 'No new notifications'}
          </TooltipContent>
        </Tooltip>
      ) : (
        bellButton
      )}

      <DropdownMenuContent align={collapsed ? 'start' : 'end'} className="w-80">
        {isEmpty ? (
          <div className="px-3 py-4 text-center text-sm text-neutral-500">
            No new notifications
          </div>
        ) : (
          <>
            {/* Feedback Resolved section */}
            {feedbackNotifications.length > 0 && (
              <>
                {hasBothTypes && (
                  <div className="px-3 py-1.5 text-xs font-semibold text-neutral-400 uppercase">
                    Feedback Resolved
                  </div>
                )}
                {feedbackNotifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.feedbackId}
                    onClick={() => handleFeedbackClick(notification)}
                    className="flex items-start gap-2 px-3 py-2.5"
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        Your {feedbackTypeLabels[notification.type] || 'feedback'} has been resolved
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        {notification.description}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {formatRelativeTime(notification.resolvedAt)}
                        {notification.hasNotes && (
                          <span className="ml-1.5 text-green-600">· Has admin notes</span>
                        )}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {/* Separator between sections */}
            {hasBothTypes && <DropdownMenuSeparator />}

            {/* Review Invitations section */}
            {invitations.length > 0 && (
              <>
                {hasBothTypes && (
                  <div className="px-3 py-1.5 text-xs font-semibold text-neutral-400 uppercase">
                    Review Invitations
                  </div>
                )}
                {invitations.map((invitation) => (
                  <DropdownMenuItem
                    key={invitation.ideaId}
                    onClick={() => handleInvitationClick(invitation)}
                    className="flex items-start gap-2 px-3 py-2.5"
                  >
                    <Avatar className="mt-0.5 h-6 w-6 shrink-0">
                      {invitation.invitedBy.image && (
                        <AvatarImage src={invitation.invitedBy.image} alt={invitation.invitedBy.name} />
                      )}
                      <AvatarFallback className="text-[10px]">
                        {invitation.invitedBy.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {invitation.ideaTitle}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Invited by {invitation.invitedBy.name} · {formatRelativeTime(invitation.invitedAt)}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
