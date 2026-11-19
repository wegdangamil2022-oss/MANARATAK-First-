import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { BookmarkCheck, Compass, FileCheck2, Search, Sparkles, Plane, ArrowUpLeft } from 'lucide-react';

type RoadmapTarget = 'smart-search' | 'scholarships' | 'exams' | 'tools' | 'student';

const STEPS: Array<{
  number: number;
  title: string;
  description: string;
  target: RoadmapTarget;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { number: 1, title: "public_set_your_academic_goal", description: "public_choose_the_right_degree_major_and_country", target: 'smart-search', icon: Compass },
  { number: 2, title: "public_discover_and_compare_opportunities", description: "public_compare_universities_scholarships_countries_and_costs", target: 'scholarships', icon: Search },
  { number: 3, title: "public_check_eligibility_and_requirements", description: "public_review_admission_language_and_document_requirements_and_deadlines", target: 'exams', icon: FileCheck2 },
  { number: 4, title: "public_prepare_your_application", description: "public_use_cv_motivation_letter_and_recommendation_tools_and", target: 'tools', icon: Sparkles },
  { number: 5, title: "public_save_and_track_your_progress", description: "public_save_opportunities_to_favorites_and_track_applications_and", target: 'student', icon: BookmarkCheck },
  { number: 6, title: "public_travel_to_your_university", description: "public_plan_travel_visas_and_settling_in_your_study", target: 'student', icon: Plane },
];

export const RoadmapPreview: React.FC<{
  onOpen?: () => void;
  onNavigate?: (target: RoadmapTarget) => void;
}> = ({ onOpen, onNavigate }) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const activate = (target: RoadmapTarget) => onNavigate ? onNavigate(target) : onOpen?.();

  return (
    <section className="w-full py-2.5 font-['Cairo',sans-serif]" aria-labelledby="academic-roadmap-title">
      {/* Standard Framed Container with top accent border only */}
      <div className="relative rounded-3xl px-2.5 py-3.5 sm:px-3.5 sm:py-4 md:px-6 md:py-5 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-sm overflow-hidden mn-panel">
        {/* Elegant top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

        {/* Content Inside the Framed Section */}
        <div className="relative z-10">
          {/* Centered Section Title matching other sections */}
          <div className="text-center mb-3 md:mb-4">
            <div className="inline-flex items-center justify-center mb-1">
              <h3 id="academic-roadmap-title" className="text-[15px] sm:text-base md:text-lg lg:text-xl font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-2 leading-tight font-['Cairo',sans-serif]">
                <span className="mn-detail-section-icon mn-icon-mix02 shrink-0">
                  <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-md" />
                  <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 relative z-10 text-[#F2CD78]" />
                </span>
                <span className="inline-flex flex-col items-center">
                  <span>{publicT('public_how_do_you_begin_your_academic_journey')}</span>
                  <span className="w-full min-w-[115px] md:min-w-[140px] h-[2.5px] mt-1 rounded-full bg-[linear-gradient(90deg,transparent_0%,#D6A43B_18%,#D6A43B_82%,transparent_100%)]" />
                </span>
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs md:text-sm text-[var(--mn-text)] font-semibold leading-relaxed max-w-lg md:max-w-2xl mx-auto font-['Cairo',sans-serif]">{publicT('public_organized_steps_to_guide_you_from_choosing_a')}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3.5 items-stretch">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <button
                  type="button"
                  key={step.number}
                  onClick={() => activate(step.target)}
                  className="mn-card-subtle h-full group p-2.5 sm:p-3 md:p-4 flex items-center gap-2 md:gap-3 text-start transition hover:-translate-y-0.5 hover:border-[var(--mn-accent)]/65 hover:shadow-sm"
                >
                  <span className="flex h-7.5 w-7.5 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg md:rounded-xl bg-[var(--mn-primary)] text-white mn-inverse">
                    <Icon className="h-4 w-4 md:h-5 md:w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[11px] sm:text-[12px] md:text-sm font-bold leading-tight text-[var(--mn-heading)] dark:text-white group-hover:text-[var(--mn-accent-text)] transition-colors">
                      {publicT(step.title)}
                    </h3>
                    <p className="hidden md:block text-xs text-[var(--mn-text-muted)] font-medium mt-0.5 line-clamp-1">
                      {publicT(step.description)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Geometric Full-Width Browse Button */}
          <div className="mt-3 md:mt-4 w-full">
            <button
              type="button"
              onClick={() => activate('student')}
              className="group relative w-full overflow-hidden rounded-xl px-3.5 py-2.5 md:py-3 bg-[var(--mn-page)] hover:bg-[#142B5F]/[0.04] dark:hover:bg-[#D6A43B]/10 border border-[#142B5F]/30 dark:border-[#D6A43B]/45 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] font-['Cairo',sans-serif] shadow-2xs cursor-pointer mn-panel"
            >
              <span className="pointer-events-none absolute top-0 right-0 w-5 h-3.5 border-t-[2.5px] border-r-[2.5px] border-[#0E7C86] dark:border-[#D6A43B] rounded-tr-xl" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-5 h-3.5 border-b-[2.5px] border-l-[2.5px] border-[#142B5F] dark:border-[#D6A43B]/80 rounded-bl-xl" />
              <span className="inline-flex items-center justify-center gap-1.5">
                <span className="text-[12px] sm:text-[13px] md:text-[14.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] text-center">{publicT('public_browse_the_steps')}</span>
                <ArrowUpLeft className="w-4 h-4 md:w-4.5 md:h-4.5 -mt-1 text-[#0E7C86] dark:text-[#F2CD78] stroke-[2.5] shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
