import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface HelpFeatureCardProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}

export function HelpFeatureCard({ icon: Icon, title, children }: HelpFeatureCardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-2 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
          <Icon className="h-4 w-4 text-neutral-600" />
        </div>
        <h3 className="font-semibold text-neutral-900">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-neutral-600">{children}</p>
    </div>
  );
}
