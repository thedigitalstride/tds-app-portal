import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface HelpSectionProps {
  id: string;
  title: string;
  icon?: LucideIcon;
  accentColor?: string;
  children: ReactNode;
}

export function HelpSection({ id, title, icon: Icon, accentColor = '#3b82f6', children }: HelpSectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-6 w-1 rounded-full" style={{ backgroundColor: accentColor }} />
        {Icon && (
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        )}
        <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
      </div>
      <div className="space-y-4 text-base leading-relaxed text-neutral-700">{children}</div>
    </section>
  );
}
