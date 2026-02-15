import type { ReactNode } from 'react';

interface HelpStepProps {
  number: number;
  title: string;
  children: ReactNode;
}

export function HelpStep({ number, title, children }: HelpStepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
        {number}
      </div>
      <div className="pt-0.5">
        <h3 className="font-semibold text-neutral-900">{title}</h3>
        <div className="mt-1 text-sm leading-relaxed text-neutral-600">{children}</div>
      </div>
    </div>
  );
}
