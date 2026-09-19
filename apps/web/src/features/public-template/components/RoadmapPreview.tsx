import React from 'react';
import { BookmarkCheck, Compass, FileCheck2, Search, Sparkles, Plane, ChevronLeft } from 'lucide-react';

type RoadmapTarget = 'smart-search' | 'scholarships' | 'exams' | 'tools' | 'student';

const STEPS: Array<{
  number: number;
  title: string;
  description: string;
  target: RoadmapTarget;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { number: 1, title: 'حدّد هدفك الأكاديمي', description: 'اختر الدرجة والتخصص والدولة المناسبة.', target: 'smart-search', icon: Compass },
  { number: 2, title: 'اكتشف وقارن الفرص', description: 'قارن الجامعات والمنح والدول والتكاليف.', target: 'scholarships', icon: Search },
  { number: 3, title: 'تحقق من الأهلية والمتطلبات', description: 'راجع شروط القبول واللغة والوثائق والمواعيد النهائية.', target: 'exams', icon: FileCheck2 },
  { number: 4, title: 'جهّز طلبك', description: 'استخدم أدوات السيرة الذاتية وخطاب الدافع والتوصيات وقائمة المستندات.', target: 'tools', icon: Sparkles },
  { number: 5, title: 'احفظ وتابع تقدمك', description: 'أضف الفرص إلى المفضلة وتابع الطلب والتنبيهات من مساحة الطالب.', target: 'student', icon: BookmarkCheck },
  { number: 6, title: 'سافر إلى جامعتك', description: 'خطط للسفر والتأشيرة والاستقرار في بلد الدراسة.', target: 'student', icon: Plane },
];

export const RoadmapPreview: React.FC<{
  onOpen?: () => void;
  onNavigate?: (target: RoadmapTarget) => void;
}> = ({ onOpen, onNavigate }) => {
  const activate = (target: RoadmapTarget) => onNavigate ? onNavigate(target) : onOpen?.();

  return (
    <section className="w-full py-3 font-['Cairo',sans-serif]" aria-labelledby="academic-roadmap-title">
      {/* Standard Framed Container with top accent border only */}
      <div className="relative rounded-3xl p-3.5 sm:p-4 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-sm overflow-hidden mn-panel">
        {/* Elegant top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

        {/* Content Inside the Framed Section */}
        <div className="relative z-10">
          {/* Centered Section Title matching other sections */}
          <div className="text-center mb-3 sm:mb-3.5">
            <div className="relative pb-1 mb-1 inline-block">
              <h3 id="academic-roadmap-title" className="text-[14.5px] sm:text-base font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-1.5 font-['Cairo',sans-serif]">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#142B5F] border border-[#D6A43B]/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D6A43B]" />
                </span>
                <span>كيف تبدأ رحلتك الأكاديمية؟</span>
              </h3>
              <div className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--mn-text-muted)] font-medium max-w-md mx-auto font-['Cairo',sans-serif]">
              خطوات منظمة ومتكاملة لإرشادك من تحديد الهدف حتى الالتحاق بالجامعة.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <button
                  type="button"
                  key={step.number}
                  onClick={() => activate(step.target)}
                  className="mn-card-subtle group p-2.5 sm:p-3 flex items-center gap-2 text-right transition hover:-translate-y-0.5 hover:border-[var(--mn-accent)]/65 hover:shadow-sm"
                >
                  <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-[var(--mn-primary)] text-white mn-inverse">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-[11px] sm:text-[12px] font-bold leading-tight text-[var(--mn-heading)] dark:text-white group-hover:text-[var(--mn-accent-text)] transition-colors">
                    {step.title}
                  </h3>
                </button>
              );
            })}
          </div>

          {/* Bottom browse button - styled identically to other sections */}
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => activate('student')}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-[var(--mn-surface-muted)] hover:bg-[#142B5F]/5 dark:hover:bg-[#D6A43B]/10 text-[#142B5F] dark:text-[#D6A43B] border border-[#142B5F]/50 dark:border-[#D6A43B]/50 rounded-full transition-all active:scale-95 font-['Cairo',sans-serif] shadow-xs cursor-pointer "
            >
              <span className="text-[12px] sm:text-sm font-bold">تصفح الخطوات</span>
              <ChevronLeft className="w-4 h-4 text-[#142B5F] dark:text-[#D6A43B] transition-transform group-hover:-translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
