import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { ArrowUpLeft, MessageCircleQuestion } from 'lucide-react';

export const FaqPreview: React.FC<{onOpen: () => void}> = ({onOpen}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  return (
    <section id="faq-preview-section" className="px-0 py-2.5 w-full font-['Cairo',sans-serif]">
      {/* Standard Framed Container matching FeaturedJobs section */}
      <div className="relative rounded-3xl px-2.5 py-3.5 sm:px-3.5 sm:py-4 md:px-6 md:py-5 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-xs overflow-hidden mn-panel text-center">
        {/* Top gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

        <div className="relative z-10 flex flex-col items-center justify-center">
          {/* Section Header with Icon and Underline */}
          <div className="inline-flex items-center justify-center mb-1 md:mb-1.5">
            <h3 className="text-[15px] sm:text-base md:text-lg lg:text-xl font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-2 leading-tight font-['Cairo',sans-serif]">
              <span className="mn-detail-section-icon mn-icon-mix02 shrink-0">
                <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-md" />
                <MessageCircleQuestion className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 relative z-10 text-[#F2CD78]" />
              </span>
              <span className="inline-flex flex-col items-center">
                <span>{publicT('public_have_questions')}</span>
                <span className="w-full min-w-[115px] md:min-w-[140px] h-[2.5px] mt-1 rounded-full bg-[linear-gradient(90deg,transparent_0%,#D6A43B_18%,#D6A43B_82%,transparent_100%)]" />
              </span>
            </h3>
          </div>

          {/* Description Text */}
          <p className="text-[11px] sm:text-xs md:text-sm text-[var(--mn-text)] font-semibold max-w-xl md:max-w-2xl mx-auto leading-relaxed mb-3 md:mb-4">{publicT('public_we_are_here_to_help_find_answers_to')}</p>

          {/* Geometric Full-Width Action Button */}
          <button
            id="btn-browse-faqs"
            onClick={onOpen}
            className="group relative w-full overflow-hidden rounded-xl px-3.5 py-2.5 md:py-3 bg-[var(--mn-page)] hover:bg-[#142B5F]/[0.04] dark:hover:bg-[#D6A43B]/10 border border-[#142B5F]/30 dark:border-[#D6A43B]/45 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] font-['Cairo',sans-serif] shadow-2xs cursor-pointer mn-panel"
          >
            <span className="pointer-events-none absolute top-0 right-0 w-5 h-3.5 border-t-[2.5px] border-r-[2.5px] border-[#0E7C86] dark:border-[#D6A43B] rounded-tr-xl" />
            <span className="pointer-events-none absolute bottom-0 left-0 w-5 h-3.5 border-b-[2.5px] border-l-[2.5px] border-[#142B5F] dark:border-[#D6A43B]/80 rounded-bl-xl" />
            <span className="inline-flex items-center justify-center gap-1.5">
              <span className="text-[12px] sm:text-[13px] md:text-sm font-extrabold text-[#142B5F] dark:text-[#F2CD78] text-center">{publicT('public_browse_frequently_asked_questions')}</span>
              <ArrowUpLeft className="w-4 h-4 md:w-4.5 md:h-4.5 -mt-1 text-[#0E7C86] dark:text-[#F2CD78] stroke-[2.5] shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
