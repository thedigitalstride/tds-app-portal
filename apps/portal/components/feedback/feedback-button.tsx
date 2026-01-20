'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { cn, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@tds/ui';
import { FeedbackModal } from './feedback-modal';

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsOpen(true)}
              className={cn(
                'fixed bottom-6 right-6 z-40',
                'flex h-12 w-12 items-center justify-center',
                'rounded-full bg-neutral-900 text-white shadow-lg',
                'transition-all hover:scale-105 hover:bg-neutral-800',
                'focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2'
              )}
              aria-label="Send feedback"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={8}>
            Send feedback
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <FeedbackModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
