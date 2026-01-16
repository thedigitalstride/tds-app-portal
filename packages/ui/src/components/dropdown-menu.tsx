'use client';

import * as React from 'react';
import { cn } from '../utils';

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

function DropdownMenuTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error('DropdownMenuTrigger must be used within DropdownMenu');

  const handleClick = () => context.setOpen((prev) => !prev);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: handleClick,
    });
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  );
}

function DropdownMenuContent({
  children,
  align = 'end',
  side = 'bottom',
  className,
}: {
  children: React.ReactNode;
  align?: 'start' | 'end';
  side?: 'top' | 'bottom';
  className?: string;
}) {
  const context = React.useContext(DropdownMenuContext);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        context?.setOpen(false);
      }
    }

    if (context?.open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [context?.open, context]);

  if (!context?.open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 min-w-[8rem] overflow-hidden rounded-lg border border-neutral-200 bg-white p-1 shadow-lg',
        align === 'end' ? 'right-0' : 'left-0',
        side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        className
      )}
    >
      {children}
    </div>
  );
}

function DropdownMenuItem({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const context = React.useContext(DropdownMenuContext);

  return (
    <button
      type="button"
      className={cn(
        'flex w-full cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none hover:bg-neutral-100',
        className
      )}
      onClick={() => {
        onClick?.();
        context?.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

function DropdownMenuSeparator() {
  return <div className="-mx-1 my-1 h-px bg-neutral-200" />;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
};
