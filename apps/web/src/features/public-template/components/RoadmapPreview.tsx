import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { BookmarkCheck, Compass, FileCheck2, Search, Sparkles, Plane } from 'lucide-react';
import {
  HOME_INNER_CARD_CLASS,
  HOME_INNER_ICON_CLASS,
  HomeSectionCta,
  HomeSectionHeader,
  HomeSectionShell,
} from './HomeSectionPrimitives';

type RoadmapTarget = 'smart-search' | 'scholarships' | 'exams' | 'tools' | 'student';

const STEPS: Array<{
  number: number;
  title: string;
  target: RoadmapTarget;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { number: 1, title: 'public_set_your_academic_goal', target: 'smart-search', icon: Compass },
  { number: 2, title: 'public_discover_and_compare_opportunities', target: 'scholarships', icon: Search },
  { number: 3, title: 'public_check_eligibility_and_requirements', target: 'exams', icon: FileCheck2 },
  { number: 4, title: 'public_prepare_your_application', target: 'tools', icon: Sparkles },
  { number: 5, title: 'public_save_and_track_your_progress', target: 'student', icon: BookmarkCheck },
  { number: 6, title: 'public_travel_to_your_university', target: 'student', icon: Plane },
];

export const RoadmapPreview: React.FC<{
  onOpen?: () => void;
  onNavigate?: (target: RoadmapTarget) => void;
}> = ({ onOpen, onNavigate }) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const activate = (target: RoadmapTarget) => (onNavigate ? onNavigate(target) : onOpen?.());

  return (
    <HomeSectionShell ariaLabelledBy="academic-roadmap-title">
      <HomeSectionHeader
        id="academic-roadmap-title"
        title={publicT('public_how_do_you_begin_your_academic_journey')}
        subtitle={publicT('public_organized_steps_to_guide_you_from_choosing_a')}
        icon={<Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.1]" />}
      />

      {/* Compact 6-Step Journey Cards: Icon + Step Title Only */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-2.5 md:gap-3.5 w-full items-stretch">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const stepNum = String(step.number).padStart(2, '0');
          return (
            <button
              type="button"
              key={step.number}
              onClick={() => activate(step.target)}
              className={`group relative h-full min-h-[46px] sm:min-h-[54px] md:min-h-[58px] w-full text-start rounded-xl md:rounded-2xl px-2 py-2 sm:px-3 sm:py-2.5 md:px-3.5 md:py-3 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer min-w-0 flex items-center gap-2 sm:gap-2.5 md:gap-3 overflow-hidden ${HOME_INNER_CARD_CLASS}`}
            >
              {/* Right Side (Start in RTL): Unified Navy-Petrol Icon with White Glyph */}
              <span
                className={`w-7.5 h-7.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl inline-flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${HOME_INNER_ICON_CLASS}`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white stroke-[2]" />
              </span>

              {/* Main Title Beside Icon */}
              <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                <h4 className="min-w-0 flex-1 text-[10.5px] sm:text-[11.5px] md:text-[12.5px] font-extrabold leading-snug line-clamp-2 text-[#142B5F] dark:text-[#F1F5F9] group-hover:text-[#0E7C86] dark:group-hover:text-[#38C6D4] transition-colors font-['Cairo',sans-serif]">
                  {publicT(step.title)}
                </h4>
                <span className="hidden sm:inline-block text-[10px] md:text-[10.5px] font-extrabold tabular-nums text-[#0E7C86]/65 dark:text-[#38C6D4]/70 shrink-0">
                  {stepNum}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Full-Width Browse Button */}
      <div className="mt-2.5 md:mt-4 w-full">
        <HomeSectionCta
          label={publicT('public_browse_the_steps')}
          onClick={() => activate('student')}
        />
      </div>
    </HomeSectionShell>
  );
};
