'use client';

import * as React from 'react';
import { cn } from '../utils';

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

interface TooltipContextValue {
  delayDuration: number;
}

const TooltipContext = React.createContext<TooltipContextValue>({
  delayDuration: 200,
});

function TooltipProvider({ children, delayDuration = 200 }: TooltipProviderProps) {
  return (
    <TooltipContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipContext.Provider>
  );
}

interface TooltipProps {
  children: React.ReactNode;
}

interface SingleTooltipContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const SingleTooltipContext = React.createContext<SingleTooltipContextValue | null>(null);

function Tooltip({ children }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement>(null);

  return (
    <SingleTooltipContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </SingleTooltipContext.Provider>
  );
}

interface TooltipTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

function TooltipTrigger({ children, asChild }: TooltipTriggerProps) {
  const context = React.useContext(SingleTooltipContext);
  const parentContext = React.useContext(TooltipContext);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!context) throw new Error('TooltipTrigger must be used within Tooltip');

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      context.setOpen(true);
    }, parentContext.delayDuration);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    context.setOpen(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{
      onMouseEnter?: () => void;
      onMouseLeave?: () => void;
      ref?: React.Ref<HTMLElement>;
    }>, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      ref: context.triggerRef,
    });
  }

  return (
    <span
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={context.triggerRef as React.RefObject<HTMLSpanElement>}
    >
      {children}
    </span>
  );
}

interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
}

function TooltipContent({
  children,
  className,
  side = 'top',
  sideOffset = 4,
}: TooltipContentProps) {
  const context = React.useContext(SingleTooltipContext);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  if (!context) throw new Error('TooltipContent must be used within Tooltip');

  React.useEffect(() => {
    if (context.open && context.triggerRef.current) {
      const rect = context.triggerRef.current.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

      let top = 0;
      let left = 0;

      switch (side) {
        case 'top':
          top = rect.top + scrollTop - sideOffset;
          left = rect.left + scrollLeft + rect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + scrollTop + sideOffset;
          left = rect.left + scrollLeft + rect.width / 2;
          break;
        case 'left':
          top = rect.top + scrollTop + rect.height / 2;
          left = rect.left + scrollLeft - sideOffset;
          break;
        case 'right':
          top = rect.top + scrollTop + rect.height / 2;
          left = rect.right + scrollLeft + sideOffset;
          break;
      }

      setPosition({ top, left });
    }
  }, [context.open, context.triggerRef, side, sideOffset]);

  if (!context.open) return null;

  const transformOrigin = {
    top: 'translateX(-50%) translateY(-100%)',
    bottom: 'translateX(-50%)',
    left: 'translateX(-100%) translateY(-50%)',
    right: 'translateY(-50%)',
  };

  return (
    <div
      className={cn(
        'fixed z-50 overflow-hidden rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95',
        className
      )}
      style={{
        top: position.top,
        left: position.left,
        transform: transformOrigin[side],
      }}
    >
      {children}
    </div>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
