'use client';

import React from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@tds/ui';
import { getTooltip, type PPCTooltip } from '../lib/tooltips';

interface InfoTooltipProps {
  /** Key to look up in PPC_TOOLTIPS */
  tooltipKey: string;
  /** Override default title from tooltip */
  label?: string;
  /** Text size: xs, sm, or md */
  size?: 'xs' | 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
  /** Color variant for the label text */
  variant?: 'default' | 'muted';
  /** Show only the info icon without label text */
  iconOnly?: boolean;
  /** Children to display instead of label text */
  children?: React.ReactNode;
  /** Use span instead of button (for use inside interactive elements) */
  asSpan?: boolean;
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
 * InfoTooltip - Displays a label with an info icon tooltip
 *
 * Usage:
 * <InfoTooltip tooltipKey="messageMatch" />
 * <InfoTooltip tooltipKey="overallScore" label="Score" size="md" />
 * <InfoTooltip tooltipKey="severityCritical" iconOnly />
 */
export function InfoTooltip({
  tooltipKey,
  label,
  size = 'sm',
  className = '',
  variant = 'default',
  iconOnly = false,
  children,
  asSpan = false,
}: InfoTooltipProps) {
  const tooltip = getTooltip(tooltipKey);
  const displayLabel = label ?? tooltip.title;
  const classes = sizeClasses[size];
  const variantClass = variantClasses[variant];

  // Use span when inside interactive elements (buttons, links) to avoid nesting issues
  const TriggerElement = asSpan ? 'span' : 'button';
  const triggerProps = asSpan
    ? {
        className: `inline-flex items-center justify-center rounded-full cursor-help ${classes.iconWrapper} ${iconOnly ? className : ''}`,
        'aria-label': `Info about ${displayLabel}`,
      }
    : {
        type: 'button' as const,
        className: `inline-flex items-center justify-center rounded-full hover:bg-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-300 ${classes.iconWrapper} ${iconOnly ? className : ''}`,
        'aria-label': `Info about ${displayLabel}`,
      };

  if (iconOnly) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <TriggerElement {...triggerProps}>
            <Info className={`${classes.icon} text-neutral-400 hover:text-neutral-600`} />
          </TriggerElement>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <TooltipBody tooltip={tooltip} />
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 ${classes.text} ${variantClass} ${className}`}>
      {children ?? displayLabel}
      <Tooltip>
        <TooltipTrigger asChild>
          <TriggerElement {...triggerProps}>
            <Info className={`${classes.icon} text-neutral-400 hover:text-neutral-600`} />
          </TriggerElement>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <TooltipBody tooltip={tooltip} />
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

/**
 * Internal component for tooltip content formatting
 */
function TooltipBody({ tooltip }: { tooltip: PPCTooltip }) {
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
 * Section header with integrated tooltip
 */
interface SectionHeaderProps {
  title: string;
  tooltipKey?: string;
  compact?: boolean;
  className?: string;
}

export function SectionHeader({
  title,
  tooltipKey,
  compact = false,
  className = '',
}: SectionHeaderProps) {
  const tooltip = tooltipKey ? getTooltip(tooltipKey) : null;
  const hasTooltipContent = tooltip && (tooltip.description || tooltip.bestPractice);

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
              <TooltipBody tooltip={tooltip} />
            </TooltipContent>
          </Tooltip>
        )}
      </span>
    </h4>
  );
}
