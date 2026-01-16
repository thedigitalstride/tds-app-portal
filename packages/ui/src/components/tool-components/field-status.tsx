'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '../../utils';

export type FieldStatus = 'error' | 'warning' | 'success';

export interface FieldStatusBadgeProps {
  status: FieldStatus;
  message?: string | null;
  className?: string;
}

const statusConfig = {
  error: {
    icon: AlertCircle,
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    label: 'Warning',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    label: 'Good',
  },
};

export function FieldStatusBadge({ status, message, className }: FieldStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
        config.bg,
        config.text,
        config.border,
        className
      )}
      title={message || undefined}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </div>
  );
}

export interface FieldContainerProps {
  status: FieldStatus;
  children: React.ReactNode;
  className?: string;
}

const containerStyles = {
  error: 'border-red-300 bg-red-50/50',
  warning: 'border-amber-300 bg-amber-50/50',
  success: 'border-green-300 bg-green-50/50',
};

export function FieldContainer({ status, children, className }: FieldContainerProps) {
  return (
    <div className={cn('relative rounded-lg border-2 p-3', containerStyles[status], className)}>
      {children}
    </div>
  );
}

export interface StatusFieldProps {
  label: string;
  status: FieldStatus;
  message?: string | null;
  characterCount?: { current: number; max: number };
  children: React.ReactNode;
  className?: string;
}

export function StatusField({
  label,
  status,
  message,
  characterCount,
  children,
  className,
}: StatusFieldProps) {
  return (
    <FieldContainer status={status} className={className}>
      <div className="absolute -top-2.5 right-2">
        <FieldStatusBadge status={status} message={message} />
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-neutral-700">{label}</span>
        {characterCount && (
          <span
            className={cn(
              'text-xs',
              characterCount.current > characterCount.max ? 'text-red-500' : 'text-neutral-400'
            )}
          >
            {characterCount.current}/{characterCount.max}
          </span>
        )}
      </div>
      {children}
      {message && <p className="mt-2 text-xs text-neutral-600">{message}</p>}
    </FieldContainer>
  );
}

// Helper to get status from issues array
export interface Issue {
  type: string;
  field: string;
  message: string;
}

export function getFieldStatus(
  issues: Issue[] | undefined,
  fieldName: string,
  fieldMappings?: Record<string, string[]>
): FieldStatus {
  if (!issues) return 'success';

  const defaultMappings: Record<string, string[]> = {
    title: ['title'],
    description: ['description'],
    canonical: ['canonical'],
    'og:image': ['og image'],
    'og:title': ['open graph'],
    'og:description': ['open graph'],
    'twitter:card': ['twitter card'],
    'twitter:site': ['twitter card'],
    'twitter:title': ['twitter card'],
    ...fieldMappings,
  };

  const possibleNames = defaultMappings[fieldName.toLowerCase()] || [fieldName.toLowerCase()];
  const fieldIssue = issues.find((i) =>
    possibleNames.some((name) => i.field.toLowerCase() === name)
  );

  if (!fieldIssue) return 'success';
  return fieldIssue.type as FieldStatus;
}

export function getFieldMessage(
  issues: Issue[] | undefined,
  fieldName: string,
  fieldMappings?: Record<string, string[]>
): string | null {
  if (!issues) return null;

  const defaultMappings: Record<string, string[]> = {
    title: ['title'],
    description: ['description'],
    canonical: ['canonical'],
    'og:image': ['og image'],
    'og:title': ['open graph'],
    'og:description': ['open graph'],
    'twitter:card': ['twitter card'],
    'twitter:site': ['twitter card'],
    'twitter:title': ['twitter card'],
    ...fieldMappings,
  };

  const possibleNames = defaultMappings[fieldName.toLowerCase()] || [fieldName.toLowerCase()];
  const fieldIssue = issues.find((i) =>
    possibleNames.some((name) => i.field.toLowerCase() === name)
  );

  return fieldIssue?.message || null;
}
