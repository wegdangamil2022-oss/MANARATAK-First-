import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  DollarSign,
  ExternalLink,
  GraduationCap,
  Heart,
  Layers3,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import type { Course } from '../types';
import { courseLearnerPath } from '../courseLearningNavigation';
import { DetailBackButton, DetailSectionHeader } from './DetailUi';

export function OwnerCourseDetail({
  course,
  onBack,
  onStartStudy,
  isFavorite = false,
  onToggleFavorite,
  dataMode = 'api',
}: {
  course: Course;
  dataMode?: 'api' | 'prototype';
  track: 'native' | 'paid';
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onBack: () => void;
  onStartStudy?: () => void;
}) {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  const { locale = 'ar' } = useParams<{ locale?: string }>();

  const learnerPath = courseLearnerPath(course, locale);
  const handleStartStudy = () => {
    if (onStartStudy) {
      onStartStudy();
    }
  };

  const renderSectionHeader = ({
    id,
    icon: Icon,
    title,
  }: {
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
  }) => (
    <DetailSectionHeader
      id={id}
      title={title}
      level={3}
      className="mb-2.5"
      iconClassName="mn-icon-mix02"
      iconNode={
        <>
          <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-md" />
          <Icon className="h-4 w-4 relative z-10 text-[#F2CD78]" />
        </>
      }
    />
  );

  return (
    <div
      className="w-full max-w-md mx-auto pt-0 pb-16 text-start font-['Cairo',sans-serif] animate-in fade-in duration-200 bg-[var(--mn-surface-muted)] min-h-screen mn-panel"
      dir={publicDir}
    >
      {/* ========================================================================= */}
      {/* 1. TOP HERO CONTAINER (Matches Scholarship & University Detail Header)    */}
      {/* ========================================================================= */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute top-2 left-2 z-30 flex flex-col items-center gap-1.5 scale-80 origin-top-left mn-panel">
          <DetailBackButton onBack={onBack} mode="back" />
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite?.();
            }}
            className="mn-detail-close transition-all active:scale-95 cursor-pointer"
            aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          >
            <Heart
              className={`h-3.5 w-3.5 ${
                isFavorite
                  ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#38C6D4] dark:text-[#38C6D4]'
                  : 'text-[var(--mn-heading)]'
              }`}
            />
          </button>
        </div>

        {/* SVG background with vibrant 3-stop navy-to-petrol gradient and subtle gold waves */}
        <div className="relative w-full h-[132px] sm:h-[140px]">
          <svg
            viewBox="0 0 500 130"
            preserveAspectRatio="none"
            className="w-full h-full absolute inset-0 block"
          >
            <defs>
              <linearGradient id="ownerCourseHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#142B5F" />
                <stop offset="52%" stopColor="#153B75" />
                <stop offset="100%" stopColor="#0E7C86" />
              </linearGradient>
            </defs>

            {/* Main base background */}
            <path d="M 0,0 L 500,0 L 500,104 Q 250,126 0,104 Z" fill="url(#ownerCourseHeroGrad)" />

            {/* Decorative Gold Waves */}
            <g opacity="0.25">
              <path
                d="M -50,34 Q 120,-8 260,40 T 550,24"
                stroke="var(--mn-accent)"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M -30,68 Q 150,24 320,62 T 560,42"
                stroke="var(--mn-accent)"
                strokeWidth="1"
                fill="none"
              />
              <circle cx="35" cy="25" r="1.5" fill="var(--mn-accent)" />
              <circle cx="50" cy="18" r="1" fill="var(--mn-accent)" />
              <circle cx="42" cy="38" r="1.2" fill="var(--mn-accent)" />
              <circle cx="445" cy="22" r="1.5" fill="var(--mn-accent)" />
              <circle cx="460" cy="35" r="1" fill="var(--mn-accent)" />
              <circle cx="430" cy="42" r="1.2" fill="var(--mn-accent)" />
            </g>

            {/* Gold accent border following the bottom curve */}
            <path
              d="M 0,104 Q 250,126 500,104"
              fill="none"
              stroke="var(--mn-accent)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>

          {/* Hero Content: Horizontal Row (Glowing Gold Graduation Emblem Right -> Arrow -> Title Left) */}
          <div
            className="absolute inset-0 flex items-center justify-between pl-11 pr-4 sm:px-6 pt-2 pb-5 z-10"
            dir={publicDir}
          >
            {/* Right Side: Official Logo/Emblem Pairing (Navy + Gold) + Interactive Arrow */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-12 h-12 rounded-full border-2 border-[#F2CD78] flex items-center justify-center p-1.5 shadow-[0_0_12px_rgba(214,164,59,0.45)] bg-gradient-to-br from-[#142B5F] to-[#0E7C86] shrink-0">
                <GraduationCap className="w-5.5 h-5.5 text-[#F2CD78]" />
              </div>
              <ArrowLeft className="w-4 h-4 text-[#F2CD78] shrink-0 opacity-95 drop-shadow-[0_0_4px_rgba(214,164,59,0.4)]" />
            </div>

            {/* Left Side (in RTL): Course Title & English Subtitle */}
            <div className="flex flex-col text-start min-w-0 flex-1 pr-1.5">
              <h1
                className="text-[15px] sm:text-[16px] font-bold text-white leading-snug truncate drop-shadow-sm font-['Cairo',sans-serif]"
                data-mn-design="827f35e03a"
              >
                {course.title}
              </h1>
              <p className="text-[11px] sm:text-[11.5px] font-bold text-[#F2CD78] font-['Cairo',sans-serif] mt-1 tracking-wider truncate">
                {course.titleEn ||
                  (course.ownerId ? '' : 'Scholarships and University Admissions Masterclass')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CONTENT WRAPPER                                                      */}
      {/* ========================================================================= */}
      <div className="px-0 space-y-2.5 z-20 relative -mt-2.5 sm:-mt-3">
        {/* 2. PROVIDER / AUTHORITY CARD */}
        <div
          className="relative w-full bg-[var(--mn-surface)] rounded-none py-3 px-3.5 sm:px-4 border-y border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 flex items-center gap-2.5 overflow-hidden mn-panel"
          dir={publicDir}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

          {/* Navy Circle with Gold Sparkles Icon */}
          <div className="w-9 h-9 rounded-full bg-[#142B5F] flex items-center justify-center shrink-0 shadow-xs border border-[#D6A43B]/75">
            <Sparkles className="w-4 h-4 text-[#F2CD78]" />
          </div>

          <div className="w-[1.5px] h-6 bg-[var(--mn-border)] shrink-0 rounded-full" />

          <div className="flex items-center gap-2 min-w-0 flex-1 text-start">
            <span className="text-[12px] sm:text-[13px] font-bold text-[#142B5F] dark:text-[#F2CD78] shrink-0 font-['Cairo',sans-serif]">
              {publicT('public_provider')} :
            </span>
            <h2 className="text-[12px] sm:text-[13px] font-bold text-[var(--mn-heading)] leading-tight truncate font-['Cairo',sans-serif]">
              {publicT('public_presented_by_manaratak')}
            </h2>
          </div>
        </div>

        {/* 3. 2-COLUMN X 2-ROW SUMMARY GRID (Navy Icons Matching Scholarships & Universities) */}
        <div className="px-2 sm:px-2.5 space-y-2 pt-0.5" dir={publicDir}>
          {/* ROW 1: المدة الإجمالية | المحاضرات */}
          <div className="flex items-center gap-2">
            {/* Right Card: المدة الإجمالية */}
            <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 border border-[var(--mn-border)] shadow-sm flex items-center gap-2 min-w-0 mn-panel">
              <div className="w-8 h-8 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] dark:bg-[#F2CD78]/15 dark:border-[#F2CD78] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-current" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-tight truncate font-['Cairo',sans-serif]">
                  {publicT('public_total_duration')}
                </span>
                <span className="text-[9.5px] font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] leading-tight truncate mt-0.5">
                  {course.duration ||
                    (course.ownerId ? publicT('public_not_specified_3') : publicT('public_25_hours'))}
                </span>
              </div>
            </div>

            {/* Gold Diamond Connector */}
            <div className="w-1.5 h-1.5 rotate-45 bg-[#D6A43B] shadow-[0_0_5px_rgba(214,164,59,0.5)] shrink-0" />

            {/* Left Card: المحاضرات */}
            <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 border border-[var(--mn-border)] shadow-sm flex items-center gap-2 min-w-0 mn-panel">
              <div className="w-8 h-8 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] dark:bg-[#F2CD78]/15 dark:border-[#F2CD78] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-current" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-tight truncate font-['Cairo',sans-serif]">
                  {publicT('public_lectures_2')}
                </span>
                <span className="text-[9.5px] font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] leading-tight truncate mt-0.5">
                  {course.lessonsCount
                    ? publicT('public_lecture_count', { v0: course.lessonsCount })
                    : course.ownerId
                      ? publicT('public_review_the_course_syllabus')
                      : publicT('public_8_lectures')}
                </span>
              </div>
            </div>
          </div>

          {/* ROW 2: المستوى | الرسوم */}
          <div className="flex items-center gap-2">
            {/* Right Card: المستوى */}
            <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 border border-[var(--mn-border)] shadow-sm flex items-center gap-2 min-w-0 mn-panel">
              <div className="w-8 h-8 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] dark:bg-[#F2CD78]/15 dark:border-[#F2CD78] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-current" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-tight truncate font-['Cairo',sans-serif]">
                  {publicT('public_level')}
                </span>
                <span className="text-[9.5px] font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] leading-tight truncate mt-0.5">
                  {course.level || publicT('public_all_levels_2')}
                </span>
              </div>
            </div>

            {/* Gold Diamond Connector */}
            <div className="w-1.5 h-1.5 rotate-45 bg-[#D6A43B] shadow-[0_0_5px_rgba(214,164,59,0.5)] shrink-0" />

            {/* Left Card: الرسوم */}
            <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 border border-[var(--mn-border)] shadow-sm flex items-center gap-2 min-w-0 mn-panel">
              <div className="w-8 h-8 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] dark:bg-[#F2CD78]/15 dark:border-[#F2CD78] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 text-current" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-tight truncate font-['Cairo',sans-serif]">
                  {publicT('public_fees_2')}
                </span>
                <span className="text-[9.5px] font-bold text-[#0E7C86] dark:text-[#38C6D4] leading-tight truncate mt-0.5 font-['Cairo',sans-serif]">
                  {course.isFree ? publicT('public_available_to_everyone') : publicT('public_paid')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {course.description && (
          <section
            className="relative w-full bg-[var(--mn-surface)] rounded-none px-2.5 sm:px-3 py-3 border-y border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
            {renderSectionHeader({
              id: 'course-description-header',
              icon: BookOpen,
              title: publicT('public_course_overview'),
            })}
            <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] pl-3 pr-3.5 py-2.5">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
              <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify pr-1.5 whitespace-pre-wrap font-['Cairo',sans-serif]">
                {course.description}
              </p>
            </div>
          </section>
        )}

        {[
          { title: 'متطلبات الالتحاق', items: course.prerequisites },
          { title: 'الفئات المستهدفة', items: course.targetAudience },
        ].map((section) =>
          section.items?.length ? (
            <section
              key={section.title}
              className="relative w-full bg-[var(--mn-surface)] rounded-none px-2.5 sm:px-3 py-3 border-y border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
              dir={publicDir}
            >
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
              {renderSectionHeader({
                id: `course-${section.title}`,
                icon: BookOpen,
                title: section.title,
              })}
              <ul className="space-y-2 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                {section.items.map((item, index) => (
                  <li
                    key={index}
                    className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-2"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null,
        )}

        {course.ownerId && (
          <p className="px-3 text-xs font-bold text-[var(--mn-secondary)]">
            {course.certificateAvailable
              ? publicT('public_the_course_offers_a_manaratak_certificate_after_completion')
              : publicT('public_no_certificate_is_enabled_for_this_course')}
          </p>
        )}

        {/* 4. BRIEF COURSE DESCRIPTION (محتوى الدورة) */}
        {course.courseContent && (
          <section
            className="relative w-full bg-[var(--mn-surface)] rounded-none px-2.5 sm:px-3 py-3 border-y border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
            {renderSectionHeader({
              id: 'course-content-header',
              icon: BookOpen,
              title: publicT('public_course_content'),
            })}

            <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] pl-3 pr-3.5 py-2.5">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#E5B54F]" />
              <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify pr-1.5 whitespace-pre-wrap font-['Cairo',sans-serif]">
                <span className="inline-block w-2.5 h-2.5 rounded-[3px] bg-[#142B5F] shadow-[2px_2px_0px_#0E7C86] ml-2 align-middle shrink-0" />
                {course.courseContent}
              </p>
            </div>
          </section>
        )}

        {/* 5. COURSE MODULES (محاور الدورة) */}
        {course.courseModules && course.courseModules.length > 0 && (
          <section
            className="relative w-full bg-[var(--mn-surface)] rounded-none px-2.5 sm:px-3 py-3 border-y border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
            {renderSectionHeader({
              id: 'course-modules-header',
              icon: Layers3,
              title: publicT('public_course_topics'),
            })}

            <div className="space-y-2 font-['Cairo',sans-serif]">
              {course.courseModules.map((module, idx) => (
                <div
                  key={idx}
                  className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] pl-3 pr-3.5 py-2.5 transition-colors text-start"
                >
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />

                  <div className="flex items-center gap-2 mb-1.5 pr-1">
                    <span className="w-6 h-6 rounded-md bg-[#0E7C86] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon text-[10.5px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                      {idx + 1}
                    </span>
                    <h4 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug font-['Cairo',sans-serif]">
                      {module.title}
                    </h4>
                  </div>

                  <p className="text-[10.5px] sm:text-[11px] font-semibold text-[var(--mn-text)] leading-[1.85] text-justify pr-1 font-['Cairo',sans-serif]">
                    {module.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. LEARNING OUTCOMES (ماذا سيتعلم الطالب في نهاية الدورة؟) */}
        {course.learningOutcomes && (
          <section
            className="relative w-full bg-[var(--mn-surface)] rounded-none px-2.5 sm:px-3 py-3 border-y border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
            {renderSectionHeader({
              id: 'course-outcomes-header',
              icon: GraduationCap,
              title: publicT('public_what_will_students_learn_by_the_end_of'),
            })}

            <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] pl-3 pr-3.5 py-2.5">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#E5B54F]" />
              <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify pr-1.5 whitespace-pre-wrap font-['Cairo',sans-serif]">
                <span className="inline-block w-2.5 h-2.5 rounded-[3px] bg-[#142B5F] shadow-[2px_2px_0px_#0E7C86] ml-2 align-middle shrink-0" />
                {course.learningOutcomes}
              </p>
            </div>
          </section>
        )}

        {course.acquiredSkills && course.acquiredSkills.length > 0 && (
          <section
            className="relative w-full bg-[var(--mn-surface)] rounded-none px-2.5 sm:px-3 py-3 border-y border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
            {renderSectionHeader({
              id: 'course-skills-header',
              icon: BookOpen,
              title: publicT('public_skills_gained'),
            })}
            <ul className="space-y-2 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
              {course.acquiredSkills.map((skill, index) => (
                <li
                  key={index}
                  className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-2"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 7. ACTION CTA BUTTON (كما هو بدون تغيير في تصميمه) */}
        <div className="px-2.5 sm:px-3 pt-1">
          {dataMode === 'prototype' && onStartStudy ? (
            <button
              type="button"
              onClick={handleStartStudy}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--mn-primary)] hover:bg-[#1a3777] text-white text-xs font-bold mn-inverse shadow-sm transition-transform active:scale-[0.98] cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 text-[#E5B54F]" />
              <span>{publicT('public_study_the_course_now')}</span>
            </button>
          ) : learnerPath ? (
            <Link
              to={learnerPath}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--mn-primary)] hover:bg-[#1a3777] text-white text-xs font-bold mn-inverse shadow-sm transition-transform active:scale-[0.98]"
            >
              <PlayCircle className="w-4 h-4 text-[#E5B54F]" />
              <span>{publicT('public_study_the_course_now')}</span>
            </Link>
          ) : course.originType === 'EXTERNAL_LINKED_COURSE' && course.directCourseUrl ? (
            <a
              href={course.directCourseUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--mn-primary)] hover:bg-[#1a3777] text-white text-xs font-bold mn-inverse shadow-sm transition-transform active:scale-[0.98]"
            >
              <ExternalLink className="w-4 h-4 text-[#E5B54F]" />
              <span>{publicT('public_study_the_course_now')}</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={handleStartStudy}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--mn-primary)] hover:bg-[#1a3777] text-white text-xs font-bold mn-inverse shadow-sm transition-transform active:scale-[0.98] cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 text-[#E5B54F]" />
              <span>{publicT('public_study_the_course_now')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
