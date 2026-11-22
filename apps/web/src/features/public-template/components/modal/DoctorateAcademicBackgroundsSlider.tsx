import { useTranslation as usePublicTemplateTranslation } from '../../../../i18n/I18nProvider';
import React, { useState } from 'react';
import { ArrowUpLeft, GraduationCap, Dna, Zap, Scale, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Major } from '../../types';
import {
  MAJOR_INNER_BOX_CLASS,
  MAJOR_SECTION_CARD_CLASS,
  MajorPetrolCheckMarker,
  MajorSectionHeader,
} from './MajorDetailPrimitives';

interface DoctorateAcademicBackgroundsSliderProps {
  major: Major;
}

export const DoctorateAcademicBackgroundsSlider: React.FC<
  DoctorateAcademicBackgroundsSliderProps
> = ({ major }) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0);

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

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    const swipeThreshold = 40;
    if (info.offset.x > swipeThreshold) {
      if (activeTab < tabs.length - 1) {
        setDirection(1);
        setActiveTab((prev) => prev + 1);
      }
    } else if (info.offset.x < -swipeThreshold) {
      if (activeTab > 0) {
        setDirection(-1);
        setActiveTab((prev) => prev - 1);
      }
    }
  };

  return (
    <div className={MAJOR_SECTION_CARD_CLASS} dir={publicDir}>
      <MajorSectionHeader
        id="major-academic-backgrounds"
        icon={Layers}
        title={publicT('public_4_suitable_academic_backgrounds_and_entry_paths')}
      />

      {/* 4 Clean Segmented Tab Buttons — Official White / #F6F8FA / Navy-Petrol */}
      <div className={`relative mb-3 rounded-xl ${MAJOR_INNER_BOX_CLASS} p-1.5 font-['Cairo',sans-serif]`}>
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
                    ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white border border-[#142B5F]/20 shadow-[0_3px_10px_rgba(20,43,95,0.18)] font-bold mn-inverse'
                    : 'bg-white dark:bg-[#111E38] text-[#142B5F] dark:text-[#EDF5F5] border border-[#142B5F]/10 dark:border-white/10 hover:border-[#0E7C86]/40 hover:bg-[#DDEFF2]/25 dark:hover:bg-[#132542] font-bold mn-panel'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-white/15 text-[#F2CD78]'
                      : 'bg-[#DDEFF2]/70 dark:bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#34BFC9]'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                </span>
                <span className="text-[10.5px] sm:text-[11px] leading-tight truncate font-['Cairo',sans-serif]">
                  {tab.tabLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Swipeable Slide Content Container */}
      <div className={`relative overflow-hidden rounded-xl ${MAJOR_INNER_BOX_CLASS} p-3 sm:p-3.5 font-['Cairo',sans-serif]`}>
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
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#142B5F]/10 dark:border-white/10">
              <div className="w-8 h-8 rounded-xl bg-[#142B5F] text-[#F2CD78] flex items-center justify-center shadow-[0_2px_8px_rgba(20,43,95,0.18)] shrink-0">
                {React.createElement(currentTab.icon, { className: 'w-4 h-4 text-[#F2CD78]' })}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] leading-snug font-['Cairo',sans-serif]">
                  {currentTab.title}
                </h3>
                <p className="text-[10.5px] sm:text-[11px] text-[#5C707C] dark:text-[#9BB4C7] font-bold mt-0.5 leading-relaxed font-['Cairo',sans-serif]">
                  {currentTab.description}
                </p>
              </div>
            </div>

            {/* Slide Items Content */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-['Cairo',sans-serif]">
              {currentTab.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`group flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-[#111E38] border border-[#142B5F]/10 dark:border-white/10 hover:border-[#0E7C86]/40 hover:bg-[#DDEFF2]/20 dark:hover:bg-[#132542] transition-all duration-200 text-start h-full mn-panel font-['Cairo',sans-serif] ${
                    idx === currentTab.items.length - 1 && currentTab.items.length % 2 === 1
                      ? 'sm:col-span-2'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MajorPetrolCheckMarker />
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1 font-['Cairo',sans-serif]">
                      {item}
                    </span>
                  </div>
                  {(activeTab === 0 || activeTab === 1) && (
                    <ArrowUpLeft className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] group-hover:scale-110 transition-transform shrink-0" />
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
