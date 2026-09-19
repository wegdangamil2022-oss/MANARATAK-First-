import React from 'react';
import { ArrowUpLeft, Award, Calculator, ChevronLeft, Database, FileText, Sparkles, Target } from 'lucide-react';

interface AIToolsBannerProps {
  onOpenAiTools: (toolKey?: string) => void;
}

const TOOL_PAIRS = [
  // Column 1: 3 cards stacked vertically
  [
    {
      id: 'university-comparison',
      title: 'مقارنة الجامعات',
      subtitle: 'قارن بيانات الجامعات قبل اتخاذ القرار',
      imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=300&q=80',
      fallbackIcon: <Database className="w-4 h-4 text-[#D6A43B]" />,
    },
    {
      id: 'motivation-letter-generator',
      title: 'مولّد خطاب الدافع',
      subtitle: 'أنشئ مسودة منظمة قابلة للمراجعة',
      imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=300&q=80',
      fallbackIcon: <Sparkles className="w-4 h-4 text-[#D6A43B]" />,
    },
    {
      id: 'gpa-calculator',
      title: 'حاسبة المعدل التراكمي',
      subtitle: 'احسب وحوّل معدلك الأكاديمي بدقة',
      imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=300&q=80',
      fallbackIcon: <Calculator className="w-4 h-4 text-[#D6A43B]" />,
    },
  ],
  // Column 2: 3 cards stacked vertically
  [
    {
      id: 'scholarship-eligibility-checker',
      title: 'مُحلل الأهلية للمنح',
      subtitle: 'قيّم توافق مؤهلاتك مع الشروط المطلوبة',
      imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=300&q=80',
      fallbackIcon: <Target className="w-4 h-4 text-[#D6A43B]" />,
    },
    {
      id: 'cv-builder',
      title: 'صانع السيرة الأكاديمية',
      subtitle: 'صمّم سيرة ذاتية قياسية متوافقة',
      imageUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=300&q=80',
      fallbackIcon: <FileText className="w-4 h-4 text-[#D6A43B]" />,
    },
    {
      id: 'recommendation-assistant',
      title: 'مساعد خطابات التوصية',
      subtitle: 'جهّز نماذج ومحاور التوصية لمشرفيك',
      imageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=300&q=80',
      fallbackIcon: <Award className="w-4 h-4 text-[#D6A43B]" />,
    },
  ],
];

export const AIToolsBanner: React.FC<AIToolsBannerProps> = ({ onOpenAiTools }) => {
  return (
    <section id="ai-tools-section" className="px-0 py-3 w-full">
      <div className="relative rounded-3xl p-3.5 sm:p-4 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-sm overflow-hidden mn-panel ">
        {/* Elegant top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        
        <div className="relative z-10">
          <div className="text-center mb-3 sm:mb-3.5">
            <div className="relative pb-1 mb-1 inline-block">
              <h3 className="text-[14.5px] sm:text-base font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-1.5 font-['Cairo',sans-serif]">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#142B5F] border border-[#D6A43B]/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D6A43B]" />
                </span>
                <span>أدوات منارتك</span>
              </h3>
              <div className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--mn-text-muted)] font-medium max-w-md mx-auto font-['Cairo',sans-serif]">
              أدوات ذكية وحاسبات للمقارنة والتخطيط والتقديم واتخاذ القرار.
            </p>
          </div>

          {/* Horizontal Scrollable Container with 2-by-2 Stacked Tools */}
          <div className="relative w-full">
            <div className="flex overflow-x-auto gap-2 sm:gap-2.5 pb-2 pt-1 no-scrollbar snap-x snap-mandatory scroll-smooth" dir="rtl">
              {TOOL_PAIRS.map((pair, colIdx) => (
                <div key={colIdx} className="flex-none w-[230px] sm:w-[260px] space-y-2 snap-start">
                  {pair.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => onOpenAiTools(tool.id)}
                      className="w-full text-right rounded-2xl border border-[var(--mn-border)] hover:border-[var(--mn-accent)]/60 bg-[var(--mn-surface)] p-2.5 shadow-2xs hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer min-w-0 mn-panel group flex items-start gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden p-[1px] bg-[#142B5F] dark:bg-[var(--mn-accent)] border border-[#D6A43B]/60 shrink-0 shadow-2xs flex items-center justify-center">
                        <img
                          src={tool.imageUrl}
                          alt={tool.title}
                          className="w-full h-full rounded-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).onerror = null;
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=300&q=80';
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[11px] sm:text-xs font-bold text-[var(--mn-heading)] leading-snug font-['Cairo',sans-serif] group-hover:text-[var(--mn-accent-text)] transition-colors">
                          {tool.title}
                        </h4>
                        <p className="mt-0.5 text-[9px] sm:text-[10px] text-[var(--mn-text-muted)] leading-4 font-medium font-['Cairo',sans-serif] line-clamp-1">
                          {tool.subtitle}
                        </p>
                      </div>
                      {/* Navigation Arrow Badge */}
                      <div className="w-6 h-6 rounded-full bg-[var(--mn-page)] dark:bg-[#142B5F]/50 border border-[var(--mn-border)] dark:border-[#D6A43B]/40 flex items-center justify-center shrink-0 self-center transition-all group-hover:bg-[#142B5F] dark:group-hover:bg-[#D6A43B] group-hover:border-transparent group-hover:scale-105 shadow-2xs">
                        <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-text-muted)] dark:text-[#D6A43B] group-hover:text-white dark:group-hover:text-[#142B5F] transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex justify-center">
            <button
              id="btn-view-all-ai-tools"
              onClick={() => onOpenAiTools()}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-[var(--mn-surface-muted)] hover:bg-[#142B5F]/5 dark:hover:bg-[#D6A43B]/10 text-[#142B5F] dark:text-[#D6A43B] border border-[#142B5F]/50 dark:border-[#D6A43B]/50 rounded-full transition-all active:scale-95 font-['Cairo',sans-serif] shadow-xs "
            >
              <span className="text-[12px] sm:text-sm font-bold">تصفح أدوات منارتك</span>
              <ChevronLeft className="w-4 h-4 text-[#142B5F] dark:text-[#D6A43B] transition-transform group-hover:-translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
