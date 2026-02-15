'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import {
  cn,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@tds/ui';
import type { ReviewInvitation } from '@/app/tools/ideation/components/types';

interface NotificationBellProps {
  collapsed: boolean;
}

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
  const [count, setCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch('/api/tools/ideation/review-invitations');
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
        setCount(data.count || 0);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
    intervalRef.current = setInterval(fetchInvitations, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchInvitations]);

  const handleClick = async (invitation: ReviewInvitation) => {
    // Mark as seen
    try {
      await fetch('/api/tools/ideation/review-invitations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: invitation.ideaId }),
      });
    } catch {
      // Silently fail
    }

    // Remove from local state
    setInvitations((prev) => prev.filter((i) => i.ideaId !== invitation.ideaId));
    setCount((prev) => Math.max(0, prev - 1));

    // Navigate
    router.push(`/tools/ideation/${invitation.ideaId}`);
  };

  const bellButton = (
    <DropdownMenuTrigger asChild>
      <button
        className={cn(
          'relative flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors',
          collapsed ? 'h-8 w-8' : 'h-8 w-8'
        )}
        aria-label="Review invitations"
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
            {count > 0 ? `${count} review invitation${count === 1 ? '' : 's'}` : 'No new invitations'}
          </TooltipContent>
        </Tooltip>
      ) : (
        bellButton
      )}

      <DropdownMenuContent align={collapsed ? 'start' : 'end'} className="w-72">
        {invitations.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-neutral-500">
            No new review invitations
          </div>
        ) : (
          invitations.map((invitation) => (
            <DropdownMenuItem
              key={invitation.ideaId}
              onClick={() => handleClick(invitation)}
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
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
