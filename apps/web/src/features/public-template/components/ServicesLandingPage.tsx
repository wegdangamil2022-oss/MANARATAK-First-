import React from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  ChevronLeft,
  CheckCircle2,
  FileText,
  GraduationCap,
  Briefcase,
  Languages,
  Plane,
  Search,
  Sparkles,
} from 'lucide-react';
import { ServiceAudience } from '../types';

interface ServicesLandingPageProps {
  onBack?: () => void;
  onOpenTrack?: (track: ServiceAudience) => void;
}

interface ServicePathCardProps {
  title: string;
  eyebrow: string;
  badge: string;
  description: string;
  icon: React.ElementType;
  features: Array<{ label: string; icon: React.ElementType }>;
  footer: string;
  onClick?: () => void;
}

function ServicePathCard({
  title,
  eyebrow,
  badge,
  description,
  icon: Icon,
  features,
  footer,
  onClick,
}: ServicePathCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full overflow-hidden rounded-[22px] border border-[var(--mn-border)] bg-[var(--mn-surface)] text-right shadow-sm transition-all hover:border-[var(--mn-accent)]/45 hover:shadow-md active:scale-[0.99] mn-panel "
    >
      <div className="h-1 bg-gradient-to-l from-[var(--mn-accent)] via-[var(--mn-accent-soft)] to-[var(--mn-primary)] mn-gold " />
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl border border-[var(--mn-primary)]/15 bg-[var(--mn-primary)]/10 shadow-inner">
            <Icon className="h-6 w-6 text-[var(--mn-heading)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-['Cairo',sans-serif] text-[15px] font-bold leading-6 text-[var(--mn-heading)] sm:text-base">
                  {title}
                </h3>
                <p className="mt-0.5 text-[10px] font-semibold text-[var(--mn-heading)] sm:text-[11px]">
                  {eyebrow}
                </p>
              </div>
              <span className="whitespace-nowrap rounded-full border border-[var(--mn-accent)]/20 bg-[var(--mn-accent)]/10 px-2 py-1 text-[9px] font-bold text-[var(--mn-accent-text)]">
                {badge}
              </span>
            </div>
            <p className="mt-2 text-[11px] font-semibold leading-5 text-[var(--mn-text-muted)] sm:text-xs">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {features.map(({ label, icon: FeatureIcon }) => (
            <span
              key={label}
              className="flex min-h-8 items-center justify-center gap-1 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-1.5 text-[9px] font-semibold text-[var(--mn-text-muted)] mn-panel "
            >
              <FeatureIcon className="h-3.5 w-3.5 shrink-0 text-[var(--mn-heading)]" />
              <span className="truncate">{label}</span>
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--mn-border)] pt-2.5">
          <span className="truncate text-[10px] font-bold text-[var(--mn-text-muted)]">{footer}</span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-bold text-[var(--mn-heading)]">
            استكشف الخدمات
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

export const ServicesLandingPage: React.FC<ServicesLandingPageProps> = ({ onBack, onOpenTrack }) => {
  return (
    <div className="min-h-screen bg-[var(--mn-page)] pb-24 text-[var(--mn-heading)] font-['Cairo',sans-serif] select-none mn-panel " dir="rtl">
      <div className="relative mn-search-hero overflow-hidden border-b border-[var(--mn-accent)]/20 px-3 pb-12 pt-4 text-white shadow-xs sm:px-4 sm:pb-14 mn-inverse ">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-5 top-3 grid grid-cols-5 gap-1.5 opacity-20">
            {Array.from({ length: 20 }).map((_, index) => (
              <div key={index} className="h-1 w-1 rounded-full bg-[var(--mn-accent)] mn-gold " />
            ))}
          </div>
          <div className="absolute -left-12 -top-12 h-56 w-56 rounded-full border border-[var(--mn-accent)]/25" />
          <div className="absolute -left-6 -top-6 h-72 w-72 rounded-full border border-[var(--mn-accent)]/15" />
          <GraduationCap className="absolute -right-4 bottom-0 h-36 w-36 text-[var(--mn-heading)]" strokeWidth={1.2} />
          <Sparkles className="absolute left-[18%] top-[42%] h-10 w-10 text-[var(--mn-accent)]/15" />
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-30 cursor-pointer text-white shadow-xs active:scale-95"
            title="العودة"
            aria-label="العودة"
          >
            <ChevronLeft className="w-4 h-4 rotate-180 text-white" />
          </button>
        )}

        <div className="relative z-10 mx-auto max-w-md space-y-3 pt-6 text-center sm:max-w-xl">
          <div className="relative inline-block mb-2">
            <div className="absolute -inset-x-6 -inset-y-3 rounded-full bg-[var(--mn-accent)]/10 blur-xl" />
            <h1 className="relative font-['Cairo',sans-serif] text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              خدمات <span className="text-[var(--mn-accent-soft)]">منارتك</span>
            </h1>
          </div>
          <div className="flex items-center justify-center gap-2 pb-2 pt-1">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[var(--mn-accent-soft)]/50" />
            <Briefcase className="h-4 w-4 text-[var(--mn-accent-text)]" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[var(--mn-accent-soft)]/50" />
          </div>
          <p className="mx-auto max-w-[90%] font-['Cairo',sans-serif] text-[13px] font-medium leading-relaxed text-[var(--mn-on-dark-muted)] drop-shadow-md sm:text-sm">
            دعم متكامل في رحلتك الدراسية من الاختيار والتجهيز إلى التقديم والإجراءات المساندة.
          </p>
        </div>
      </div>

      <div className="relative z-20 mx-auto -mt-5 max-w-md mn-inline-gutter pb-24 sm:max-w-xl">
        <div className="mb-3.5 rounded-[22px] border border-[var(--mn-border)] bg-[var(--mn-surface)] px-3.5 py-3.5 shadow-lg mn-panel ">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-right">
              <h2 className="font-['Cairo',sans-serif] text-[15px] font-bold text-[var(--mn-heading)] sm:text-base">
                اختر نوع الخدمة
              </h2>
              <p className="mt-0.5 font-['Cairo',sans-serif] text-[10.5px] font-semibold leading-5 text-[var(--mn-text-muted)] sm:text-[11px]">
                اختر المسار أولاً، ثم تظهر الخدمات والبحث داخل القسم المختار.
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--mn-accent)]/20 bg-[var(--mn-accent)]/10">
              <Search className="h-5 w-5 text-[var(--mn-accent-text)]" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <ServicePathCard
            title="الخدمات الطلابية"
            eyebrow="استشارات وتجهيز أكاديمي للطالب"
            badge="طلاب"
            description="اختيار الجامعة والتخصص، مراجعة وثائق التقديم، SOP، خطاب الدافع، المنح والسيرة الذاتية الأكاديمية."
            icon={GraduationCap}
            features={[
              { label: 'اختيار أكاديمي', icon: Search },
              { label: 'ملف التقديم', icon: CheckCircle2 },
              { label: 'إرشاد', icon: BookOpenCheck },
            ]}
            footer="البحث وبطاقات الخدمات داخل القسم"
            onClick={() => onOpenTrack?.('student')}
          />

          <ServicePathCard
            title="الخدمات العامة والدعم"
            eyebrow="وثائق وإجراءات مساندة لرحلة الدراسة"
            badge="دعم عام"
            description="ترجمة وتصديق الوثائق، التأشيرات والنماذج والإجراءات المساندة والسكن والاستقبال عند توفر الخدمة."
            icon={FileText}
            features={[
              { label: 'ترجمة', icon: Languages },
              { label: 'وثائق', icon: CheckCircle2 },
              { label: 'إجراءات', icon: Plane },
            ]}
            footer="التوفر الفعلي يحدد حسب نوع الخدمة"
            onClick={() => onOpenTrack?.('general')}
          />
        </div>
      </div>
    </div>
  );
};

