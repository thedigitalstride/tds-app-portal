'use client';

import React from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@tds/ui';
import { getFieldTooltip, type FieldTooltip } from '../lib/field-tooltips';

interface MetaFieldLabelProps {
  /** Key to look up in FIELD_TOOLTIPS */
  fieldKey: string;
  /** Override default title from tooltip */
  label?: string;
  /** Text size: xs, sm, or md */
  size?: 'xs' | 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
  /** Color variant for the label text */
  variant?: 'default' | 'muted';
}

const sizeClasses = {
  xs: {
    text: 'text-[10px]',
    icon: 'h-2.5 w-2.5',
    iconWrapper: 'p-0.5',
  },
  sm: {
    text: 'text-xs',
    icon: 'h-3 w-3',
    iconWrapper: 'p-0.5',
  },
  md: {
    text: 'text-sm',
    icon: 'h-3.5 w-3.5',
    iconWrapper: 'p-0.5',
  },
};

const variantClasses = {
  default: 'text-neutral-700 font-medium',
  muted: 'text-neutral-500',
};

const criticalityColors = {
  critical: 'text-red-600',
  important: 'text-amber-600',
  optional: 'text-neutral-400',
};

/**
 * MetaFieldLabel - Displays a field label with an info icon tooltip
 *
 * Usage:
 * <MetaFieldLabel fieldKey="title" />
 * <MetaFieldLabel fieldKey="og:title" label="Open Graph Title" size="sm" />
 */
export function MetaFieldLabel({
  fieldKey,
  label,
  size = 'sm',
  className = '',
  variant = 'default',
}: MetaFieldLabelProps) {
  const tooltip = getFieldTooltip(fieldKey);
  const displayLabel = label ?? tooltip.title;
  const classes = sizeClasses[size];
  const variantClass = variantClasses[variant];

  return (
    <span className={`inline-flex items-center gap-1 ${classes.text} ${variantClass} ${className}`}>
      {displayLabel}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center rounded-full hover:bg-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-300 ${classes.iconWrapper}`}
            aria-label={`Info about ${displayLabel}`}
          >
            <Info className={`${classes.icon} text-neutral-400 hover:text-neutral-600`} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <MetaFieldTooltipContent tooltip={tooltip} />
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

/**
 * Internal component for tooltip content formatting
 */
function MetaFieldTooltipContent({ tooltip }: { tooltip: FieldTooltip }) {
  return (
    <div className="space-y-2 py-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{tooltip.title}</span>
        <span
          className={`text-[10px] uppercase font-medium ${criticalityColors[tooltip.criticality]}`}
        >
          {tooltip.criticality}
        </span>
      </div>
      <p className="text-neutral-200 leading-relaxed">{tooltip.description}</p>
      <div className="pt-1 border-t border-neutral-700">
        <span className="text-neutral-400 text-[10px] uppercase tracking-wide">
          Best Practice
        </span>
        <p className="text-neutral-200 leading-relaxed mt-0.5">{tooltip.bestPractice}</p>
      </div>
    </div>
  );
}

/**
 * Standalone tooltip for section headers
 */
interface SectionHeaderWithTooltipProps {
  title: string;
  tooltipKey?: string;
  description?: string;
  bestPractice?: string;
  compact?: boolean;
  className?: string;
}

export function SectionHeaderWithTooltip({
  title,
  tooltipKey,
  description,
  bestPractice,
  compact = false,
  className = '',
}: SectionHeaderWithTooltipProps) {
  // If tooltipKey provided, get from registry; otherwise use inline props
  const tooltip = tooltipKey
    ? getFieldTooltip(tooltipKey)
    : {
        title,
        description: description ?? '',
        bestPractice: bestPractice ?? '',
        criticality: 'optional' as const,
      };

  const hasTooltipContent = tooltip.description || tooltip.bestPractice;

  return (
    <h4
      className={`font-medium text-neutral-700 ${compact ? 'text-xs' : 'text-sm'} ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        {title}
        {hasTooltipContent && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center p-0.5 rounded-full hover:bg-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-300"
                aria-label={`Info about ${title}`}
              >
                <Info className="h-3.5 w-3.5 text-neutral-400 hover:text-neutral-600" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <MetaFieldTooltipContent tooltip={tooltip} />
            </TooltipContent>
          </Tooltip>
        )}
      </span>
    </h4>
  );
}
