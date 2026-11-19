import { useTranslation as usePublicTemplateTranslation } from '../../../../i18n/I18nProvider';
import React, { useState } from 'react';
import { Check, ArrowUpLeft, GraduationCap, Dna, Zap, Scale, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Major } from '../../types';
import { DetailSectionHeader } from '../DetailUi';

interface DoctorateAcademicBackgroundsSliderProps {
  major: Major;
}

export const DoctorateAcademicBackgroundsSlider: React.FC<
  DoctorateAcademicBackgroundsSliderProps
> = ({ major }) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0);

  // Clean 4 tabs without confusing micro-badges or clipped texts
  const tabs = [
    {
      id: 0,
      title: publicT('public_related_masters_specializations'),
      tabLabel: publicT('public_related_masters'),
      icon: GraduationCap,
      items: major.targetBackgrounds || [],
      description: publicT('public_academic_backgrounds_directly_eligible_for_doctoral_admission'),
    },
    {
      id: 1,
      title: publicT('public_related_majors_that_may_be_accepted'),
      tabLabel: publicT('public_related_majors_3'),
      icon: Dna,
      items: major.closeBackgrounds || [],
      description: publicT('public_closely_related_interdisciplinary_or_applied_majors_that_may'),
    },
    {
      id: 2,
      title: publicT('public_direct_entry_after_a_bachelors'),
      tabLabel: publicT('public_direct_entry'),
      icon: Zap,
      items: major.directEntryInfo || [],
      description: publicT('public_direct_entry_for_outstanding_applicants_or_integrated_bs'),
    },
    {
      id: 3,
      title: publicT('public_required_experience_or_license'),
      tabLabel: publicT('public_experience_and_licensing'),
      icon: Scale,
      items: major.experienceOrLicensing || [],
      description: publicT('public_clinical_professional_and_licensing_entry_requirements'),
    },
  ];

  const currentTab = tabs[activeTab];

  const handleSelectTab = (index: number) => {
    setDirection(index > activeTab ? 1 : -1);
    setActiveTab(index);
  };

  // Drag End handler for touch / swipe gestures
  const handleDragEnd = (_: any, info: any) => {
    const swipeThreshold = 40;
    if (info.offset.x > swipeThreshold) {
      // Swiped right in RTL -> Go to Next
      if (activeTab < tabs.length - 1) {
        setDirection(1);
        setActiveTab((prev) => prev + 1);
      }
    } else if (info.offset.x < -swipeThreshold) {
      // Swiped left in RTL -> Go to Prev
      if (activeTab > 0) {
        setDirection(-1);
        setActiveTab((prev) => prev - 1);
      }
    }
  };

  return (
    <div
      className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]"
      dir={publicDir}
    >
      {/* Top Royal Navy / Gold Accent Line */}
      <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

      {/* Section Header */}
      <DetailSectionHeader
        id="major-academic-backgrounds"
        className="mb-3"
        title={publicT('public_4_suitable_academic_backgrounds_and_entry_paths')}
        iconClassName="mn-icon-mix02"
        iconNode={
          <>
            <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-md" />
            <Layers className="h-4 w-4 relative z-10 text-[#F2CD78]" />
          </>
        }
      />

      {/* 4 Clean Segmented Tab Buttons */}
      <div className="relative mb-2.5 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-1.5 font-['Cairo',sans-serif]">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === idx;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(idx)}
                className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer select-none text-center font-['Cairo',sans-serif] ${
                  isActive
                    ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white border border-[#D6A43B]/75 shadow-sm font-bold mn-inverse'
                    : 'bg-[var(--mn-surface)] text-[var(--mn-heading)] border border-[var(--mn-border)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] font-bold mn-panel'
                }`}
              >
                <span className="w-5 h-5 rounded-md bg-[#142B5F] border border-[#D6A43B]/75 flex items-center justify-center shrink-0 shadow-2xs">
                  <Icon className="w-3 h-3 text-[#F2CD78]" />
                </span>
                <span className="text-[11px] sm:text-[11.5px] leading-tight truncate font-['Cairo',sans-serif]">
                  {tab.tabLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Swipeable Slide Content Container */}
      <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 font-['Cairo',sans-serif]">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="w-full space-y-2.5 text-start cursor-grab active:cursor-grabbing font-['Cairo',sans-serif]"
          >
            {/* Slide Header */}
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-[var(--mn-border)]">
              <div className="w-8 h-8 rounded-xl bg-[#142B5F] border border-[#D6A43B]/75 flex items-center justify-center shadow-2xs shrink-0">
                {React.createElement(currentTab.icon, { className: 'w-4 h-4 text-[#F2CD78]' })}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] leading-tight font-['Cairo',sans-serif]">
                  {currentTab.title}
                </h3>
                <p className="text-[10px] sm:text-[10.5px] text-[var(--mn-text-muted)] font-bold mt-0.5 leading-snug font-['Cairo',sans-serif]">
                  {currentTab.description}
                </p>
              </div>
            </div>

            {/* Slide Items Content */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-['Cairo',sans-serif]">
              {currentTab.items.map((item, idx) => (
                <div
                  key={idx}
                  className="group flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] hover:border-[#0E7C86]/55 hover:shadow-2xs transition-all duration-200 text-start h-full mn-panel font-['Cairo',sans-serif]"
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    {/* B-02: صح بترولي الأفق صافي بحجم متناسق مع الخط */}
                    <span className="w-3.5 h-3.5 rounded-full bg-[#0E7C86]/12 border border-[#0E7C86] text-[#0E7C86] dark:text-[#38C6D4] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2 h-2 stroke-[2.75]" />
                    </span>
                    <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug flex-1 font-['Cairo',sans-serif]">
                      {item}
                    </span>
                  </div>
                  {(activeTab === 0 || activeTab === 1) && (
                    <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-interactive-arrow)] group-hover:scale-110 transition-transform shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
