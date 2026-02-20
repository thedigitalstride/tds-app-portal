'use client';

import * as React from 'react';
import { cn } from '../utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, id, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    const toggle = React.useCallback(
      (e: React.MouseEvent) => {
        // Prevent the click from bubbling to a parent <label>,
        // which would trigger the hidden input a second time.
        e.preventDefault();
        e.stopPropagation();
        if (!props.disabled) {
          onCheckedChange?.(!checked);
        }
      },
      [checked, onCheckedChange, props.disabled]
    );

    return (
      <div
        className={cn(
          'group/cb relative inline-flex items-center justify-center',
          'h-4 w-4 shrink-0 cursor-pointer',
          props.disabled && 'cursor-not-allowed opacity-50',
        )}
        onClick={toggle}
        role="presentation"
      >
        <input
          type="checkbox"
          id={id}
          ref={setRefs}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only peer"
          {...props}
        />

        {/* Track */}
        <div
          className={cn(
            'absolute inset-0 rounded-[4px] border transition-all duration-150 ease-out',
            checked
              ? 'border-neutral-800 bg-neutral-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
              : 'border-neutral-300 bg-white group-hover/cb:border-neutral-400 group-hover/cb:bg-neutral-50',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-900 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-white',
            className
          )}
        />

        {/* Check mark — SVG with animated stroke-dashoffset */}
        <svg
          viewBox="0 0 12 12"
          fill="none"
          className={cn(
            'relative z-10 h-2.5 w-2.5 transition-all duration-150 ease-out',
            checked
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-75',
          )}
        >
          <path
            d="M2.5 6.5L5 9L9.5 3.5"
            stroke="white"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              'transition-[stroke-dashoffset] duration-200 ease-out',
              '[stroke-dasharray:12]',
              checked ? '[stroke-dashoffset:0]' : '[stroke-dashoffset:12]',
            )}
          />
        </svg>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
