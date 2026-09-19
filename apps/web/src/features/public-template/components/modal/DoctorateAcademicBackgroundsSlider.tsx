import React, { useState } from 'react';
import { CheckCircle2, GraduationCap, Dna, Zap, Scale, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Major } from '../../types';

interface DoctorateAcademicBackgroundsSliderProps {
  major: Major;
}

export const DoctorateAcademicBackgroundsSlider: React.FC<
  DoctorateAcademicBackgroundsSliderProps
> = ({ major }) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0);

  // Clean 4 tabs without confusing micro-badges or clipped texts
  const tabs = [
    {
      id: 0,
      title: 'تخصصات الماجستير المرتبطة',
      tabLabel: 'ماجستير مرتبط',
      icon: GraduationCap,
      items: major.targetBackgrounds || [],
      description: 'التخصصات الأكاديمية المؤهلة والمباشرة للالتحاق ببرنامج الدكتوراه.',
    },
    {
      id: 1,
      title: 'تخصصات قريبة قد تقبل',
      tabLabel: 'تخصصات قريبة',
      icon: Dna,
      items: major.closeBackgrounds || [],
      description: 'تخصصات بينية أو تطبيقية وثيقة الصلة قد تتطلب مقررات استدراكية.',
    },
    {
      id: 2,
      title: 'الدخول المباشر بعد البكالوريوس',
      tabLabel: 'دخول مباشر',
      icon: Zap,
      items: major.directEntryInfo || [],
      description: 'إمكانية الالتحاق المباشر للمتميزين أو المسارات المدمجة (BS-to-PhD).',
    },
    {
      id: 3,
      title: 'الخبرة أو الترخيص المطلوب',
      tabLabel: 'الخبرة والترخيص',
      icon: Scale,
      items: major.experienceOrLicensing || [],
      description: 'المتطلبات السريرية والمهنية والتراخيص النظامية للالتحاق.',
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
      className="relative w-full bg-[var(--mn-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel "
      dir="rtl"
    >
      {/* Top Emerald Accent Line */}
      <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />

      {/* Section Header */}
      <div className="flex flex-col items-center justify-center mb-3.5 pt-0.5">
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <div className="w-6.5 h-6.5 rounded-full bg-[var(--mn-primary)]/5 border border-[var(--mn-accent)]/60 ring-2 ring-[var(--mn-focus)]/20 flex items-center justify-center shrink-0 shadow-2xs">
            <Layers className="w-3.5 h-3.5 text-[var(--mn-heading)]" />
          </div>
          <h2 className="text-xs sm:text-[13px] font-bold text-[var(--mn-heading)] leading-tight">
            4. الخلفيات الأكاديمية المناسبة ومسارات الدخول
          </h2>
        </div>
        {/* Glowing Gold Underline */}
        <div className="w-[140px] h-[1.5px] bg-gradient-to-r from-transparent via-[var(--mn-accent-soft)] to-transparent shadow-[0_0_8px_rgba(214,164,59,0.7)]" />
      </div>

      {/* 4 Clean Segmented Tab Buttons (التنقل السريع) with Animated Glowing Line */}
      <div className="relative mb-3 rounded-2xl overflow-hidden p-[2px] shadow-[0_0_12px_rgba(214,164,59,0.2)] bg-[var(--mn-surface-muted)]/50">
        {/* Animated Moving Glowing Border Line (Slanted Shine) */}
        <motion.div
          className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-[var(--mn-accent-soft)] to-transparent opacity-100 -rotate-12 scale-150 origin-center"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
        />

        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-[var(--mn-page)]/95 backdrop-blur-sm rounded-[14px] mn-panel ">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === idx;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(idx)}
                className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer select-none text-center ${
                  isActive
                    ? 'bg-[var(--mn-surface)] text-[var(--mn-heading)] shadow-xs border border-[var(--mn-accent)]/60 ring-1 ring-[var(--mn-focus)]/20 font-bold mn-panel '
                    : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)] hover:bg-[var(--mn-surface-muted)] border border-transparent font-bold'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[var(--mn-heading)]' : 'text-[var(--mn-text-muted)]'}`}
                />
                <span className="text-[11px] sm:text-[11.5px] leading-tight truncate">
                  {tab.tabLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Swipeable Slide Content Container */}
      <div className="relative min-h-[160px] overflow-hidden rounded-2xl bg-[var(--mn-page)]/60 border border-[var(--mn-border-gold)] p-3 sm:p-4">
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
            className="w-full space-y-3 text-right cursor-grab active:cursor-grabbing"
          >
            {/* Slide Header */}
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-[var(--mn-border-gold)]">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--mn-primary)] to-[var(--mn-primary)] text-[var(--mn-accent-text)] flex items-center justify-center shadow-2xs shrink-0 mn-inverse ">
                {React.createElement(currentTab.icon, { className: 'w-4.5 h-4.5 text-[var(--mn-accent-soft)]' })}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[12px] sm:text-[13px] font-bold text-[var(--mn-heading)] leading-tight">
                  {currentTab.title}
                </h3>
                <p className="text-[10.5px] text-[var(--mn-text-muted)] font-bold mt-0.5 leading-snug">
                  {currentTab.description}
                </p>
              </div>
            </div>

            {/* Slide Items Content */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              {currentTab.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border-gold)] hover:border-[var(--mn-accent)] hover:shadow-2xs transition-all duration-200 text-right mn-panel "
                >
                  <div className="w-5 h-5 rounded-lg bg-[var(--mn-primary)]/10 text-[var(--mn-heading)] flex items-center justify-center shrink-0 mt-0.5 font-bold text-[11px]">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-relaxed flex-1">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
