'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '../utils';

const toastVariants = cva(
  'pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'bg-white border-neutral-200 text-neutral-900',
        success: 'bg-green-50 border-green-200 text-green-900',
        error: 'bg-red-50 border-red-200 text-red-900',
        info: 'bg-blue-50 border-blue-200 text-blue-900',
        progress: 'bg-blue-50 border-blue-200 text-blue-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'progress';
  message: string;
  progress?: { current: number; total: number };
  persistent?: boolean;
}

interface ToastItemProps extends VariantProps<typeof toastVariants> {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  progress: Loader2,
};

const variantMap = {
  success: 'success',
  error: 'error',
  info: 'info',
  progress: 'progress',
} as const;

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const Icon = icons[toast.type];
  const variant = variantMap[toast.type];

  return (
    <div
      className={cn(
        toastVariants({ variant }),
        'animate-in slide-in-from-right-full duration-300'
      )}
      role="alert"
    >
      <Icon
        className={cn(
          'h-5 w-5 flex-shrink-0',
          toast.type === 'progress' && 'animate-spin',
          toast.type === 'success' && 'text-green-600',
          toast.type === 'error' && 'text-red-600',
          toast.type === 'info' && 'text-blue-600'
        )}
      />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{toast.message}</p>
        {toast.progress && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Processing...</span>
              <span>
                {toast.progress.current}/{toast.progress.total}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-blue-200">
              <div
                className="h-1.5 rounded-full bg-blue-600 transition-all duration-300"
                style={{
                  width: `${Math.round(
                    (toast.progress.current / toast.progress.total) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 rounded p-1 hover:bg-black/5 transition-colors"
      >
        <X className="h-4 w-4 text-neutral-500" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export { toastVariants };
