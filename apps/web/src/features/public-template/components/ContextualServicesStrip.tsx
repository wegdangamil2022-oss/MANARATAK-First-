import React from 'react';
import { ArrowLeft, Briefcase, GraduationCap } from 'lucide-react';
import { Service } from '../types';

interface ContextualServicesStripProps {
  services: Service[];
  onOpenService?: (service: Service) => void;
  title?: string;
  note?: string;
}

export const ContextualServicesStrip: React.FC<ContextualServicesStripProps> = ({
  services,
  onOpenService,
  title = 'خدمات قد تساعدك',
  note = 'اقتراح سياقي فقط، ولا يعني أن الخدمة تابعة أو معتمدة من الجهة المعروضة.',
}) => {
  if (!services.length) return null;

  return (
    <section className="border-b border-[var(--ab-border-gold)] bg-[var(--ab-surface-muted)] px-4 py-4 font-['Cairo',sans-serif] dark:border-[var(--ab-border)] dark:bg-[var(--ab-surface)] ab-panel dark:ab-panel " dir="rtl">
      <div className="mx-auto max-w-4xl">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--ab-accent)]/50 bg-[var(--ab-primary)] text-[var(--ab-accent-text)] shadow-sm ab-inverse ">
            <Briefcase className="h-3.5 w-3.5" />
          </span>
          <div>
            <h2 className="text-[11px] font-bold text-[var(--ab-heading)] sm:text-xs dark:text-[var(--ab-accent-text)]">{title}</h2>
            <p className="mt-0.5 text-[8px] font-bold leading-4 text-[var(--ab-text-muted)]">{note}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => onOpenService?.(service)}
              className="group flex min-h-12 items-center gap-2 rounded-xl border border-[var(--ab-border-gold)] bg-[var(--ab-surface)] px-2.5 py-2 text-right shadow-2xs transition hover:border-[var(--ab-accent)] active:scale-[0.99] dark:border-[var(--ab-border)] ab-panel "
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ab-primary)]/10 text-[var(--ab-heading)]">
                <GraduationCap className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[9.5px] font-bold text-[var(--ab-text)] dark:text-[var(--ab-text)]">{service.title}</span>
                <span className="mt-0.5 block truncate text-[8px] font-bold text-[var(--ab-text-muted)]">{service.category}</span>
              </span>
              <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-[var(--ab-accent-text)] transition-transform group-hover:-translate-x-0.5" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

