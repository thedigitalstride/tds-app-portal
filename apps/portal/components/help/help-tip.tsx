import { Lightbulb, AlertTriangle, Info } from 'lucide-react';
import type { ReactNode } from 'react';

const VARIANTS = {
  tip: {
    icon: Lightbulb,
    label: 'Tip',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-500',
    labelColor: 'text-blue-800',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-500',
    labelColor: 'text-amber-800',
  },
  note: {
    icon: Info,
    label: 'Note',
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    iconColor: 'text-neutral-500',
    labelColor: 'text-neutral-800',
  },
} as const;

interface HelpTipProps {
  variant: keyof typeof VARIANTS;
  children: ReactNode;
}

export function HelpTip({ variant, children }: HelpTipProps) {
  const config = VARIANTS[variant];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-4`}>
      <div className="flex gap-3">
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${config.iconColor}`} />
        <div className="text-sm leading-relaxed text-neutral-700">
          <span className={`font-semibold ${config.labelColor}`}>{config.label}:</span>{' '}
          {children}
        </div>
      </div>
    </div>
  );
}
