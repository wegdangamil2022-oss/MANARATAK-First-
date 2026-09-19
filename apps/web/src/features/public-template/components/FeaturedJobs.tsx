import React from 'react';
import { Briefcase, ChevronLeft, Sparkles, GraduationCap } from 'lucide-react';

interface FeaturedJobsProps {
  onViewAllClick: () => void;
}

export const FeaturedJobs: React.FC<FeaturedJobsProps> = ({ onViewAllClick }) => {
  return (
    <section
      id="featured-jobs-section"
      className="px-0 py-3 w-full font-['Cairo',sans-serif]"
    >
      {/* Standard Framed Container matching all other sections */}
      <div className="relative rounded-3xl p-5 sm:p-6 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-xs overflow-hidden mn-panel text-center">
        {/* Top gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

        <div className="relative z-10 flex flex-col items-center justify-center">
          {/* Section Header with Icon and Underline */}
          <div className="relative pb-1 mb-1.5 inline-block">
            <h3 className="text-[14.5px] sm:text-base font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-1.5 font-['Cairo',sans-serif]">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#142B5F] border border-[#D6A43B]/60 flex items-center justify-center shrink-0 shadow-2xs">
                <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D6A43B]" />
              </span>
              <span>الوظائف والتدريب</span>
            </h3>
            <div className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
          </div>

          {/* Description Text */}
          <p className="text-[11px] sm:text-xs text-[var(--mn-text-muted)] font-medium max-w-xl mx-auto leading-relaxed mt-1 mb-4 sm:mb-5">
            استكشف الوظائف والتدريب وبرامج الخريجين في مساحة مهنية واحدة، مع فلاتر تساعد الطالب وحديث التخرج على الوصول للفرصة المناسبة.
          </p>

          {/* Action Button */}
          <button
            id="btn-explore-jobs"
            onClick={onViewAllClick}
            className="group inline-flex items-center justify-center gap-2 px-7 sm:px-9 py-3 bg-[var(--mn-surface-muted)] hover:bg-[#142B5F]/5 dark:hover:bg-[#D6A43B]/10 text-[#142B5F] dark:text-[#D6A43B] border border-[#142B5F]/50 dark:border-[#D6A43B]/50 rounded-full transition-all active:scale-95 font-['Cairo',sans-serif] shadow-xs cursor-pointer"
          >
            <span className="text-xs sm:text-sm font-bold">استكشف الفرص المهنية</span>
            <ChevronLeft className="w-4 h-4 text-[#142B5F] dark:text-[#D6A43B] transition-transform group-hover:-translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
};
