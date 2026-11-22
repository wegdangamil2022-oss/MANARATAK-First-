import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import {
  ArrowUpLeft,
  Bot,
  BrainCircuit,
  Cpu,
  ScanSearch,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  HOME_INNER_CARD_CLASS,
  HOME_INNER_ICON_CLASS,
  HomeSectionCta,
  HomeSectionHeader,
  HomeSectionShell,
} from './HomeSectionPrimitives';

interface AIToolsBannerProps {
  dataMode?: 'api' | 'prototype';
  onOpenAiTools: (toolKey?: string) => void;
}

const TOOL_ITEMS = [
  {
    id: 'university-comparison',
    title: 'public_compare_universities',
    icon: BrainCircuit,
  },
  {
    id: 'motivation-letter-generator',
    title: 'public_motivation_letter_generator',
    icon: Wand2,
  },
  {
    id: 'gpa-calculator',
    title: 'public_gpa_calculator',
    icon: Cpu,
  },
  {
    id: 'scholarship-eligibility-checker',
    title: 'public_scholarship_eligibility_analyzer',
    icon: ScanSearch,
  },
  {
    id: 'cv-builder',
    title: 'public_academic_cv_builder',
    icon: Bot,
  },
  {
    id: 'recommendation-assistant',
    title: 'public_recommendation_letter_assistant',
    icon: Sparkles,
  },
];

export const AIToolsBanner: React.FC<AIToolsBannerProps> = ({ onOpenAiTools, dataMode = 'api' }) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  return (
    <HomeSectionShell id="ai-tools-section">
      <HomeSectionHeader
        title={publicT('public_manaratak_tools')}
        subtitle={publicT('public_smart_tools_and_calculators_for_comparison_planning_applications')}
        icon={<BrainCircuit className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.1]" />}
      />

      {dataMode !== 'prototype' && (
        <p
          id="home-tools-preview-note"
          role="note"
          className="mb-2 text-center text-[10px] md:text-xs font-semibold text-[#5C707C] dark:text-[#9BB4C7]"
        >
          {publicT('public_home_tools_preview_notice')}
        </p>
      )}

      {/* Responsive Tool Matrix: Approved Frost Cards + Unified Navy-Petrol Gradient AI Icons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-2.5 md:gap-3.5 w-full items-stretch" dir={publicDir}>
        {TOOL_ITEMS.map((tool) => {
          const ToolIcon = tool.icon;

          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onOpenAiTools(tool.id)}
              disabled={dataMode !== 'prototype'}
              aria-describedby={dataMode !== 'prototype' ? 'home-tools-preview-note' : undefined}
              className={`group relative h-full min-h-[46px] sm:min-h-[54px] md:min-h-[58px] w-full text-start rounded-xl md:rounded-2xl px-2 py-2 sm:px-3 sm:py-2.5 md:px-3.5 md:py-3 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer disabled:cursor-default disabled:opacity-80 min-w-0 flex items-center gap-2 sm:gap-2.5 md:gap-3 ${HOME_INNER_CARD_CLASS}`}
            >
              <div
                className={`w-7.5 h-7.5 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl shrink-0 flex items-center justify-center relative overflow-hidden transition-transform group-hover:scale-105 ${HOME_INNER_ICON_CLASS}`}
              >
                <ToolIcon className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white stroke-[2]" />
              </div>

              <div className="min-w-0 flex-1 flex items-center">
                <h4 className="w-full text-[10.5px] sm:text-[11.5px] md:text-[12.5px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] leading-snug line-clamp-2 font-['Cairo',sans-serif] group-hover:text-[#0E7C86] dark:group-hover:text-[#38C6D4] transition-colors">
                  {publicT(tool.title)}
                </h4>
              </div>

              <div className="hidden md:flex w-6.5 h-6.5 rounded-full bg-white dark:bg-[#162749] border border-[#142B5F]/10 group-hover:bg-[#0E7C86] group-hover:border-[#0E7C86] text-[#142B5F] group-hover:text-white dark:text-[#38C6D4] items-center justify-center shrink-0 self-center transition-colors">
                <ArrowUpLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Full-Width View All Button */}
      <div className="mt-2.5 md:mt-4 w-full">
        <HomeSectionCta
          id="btn-view-all-ai-tools"
          label={publicT('public_browse_manaratak_tools')}
          onClick={() => onOpenAiTools()}
        />
      </div>
    </HomeSectionShell>
  );
};
