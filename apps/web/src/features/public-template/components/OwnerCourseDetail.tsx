import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  DollarSign,
  ExternalLink,
  GraduationCap,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import type { Course } from '../types';
import { DetailBackButton, DetailSectionHeader } from './DetailUi';

export function OwnerCourseDetail({
  course,
  track,
  onBack,
  onStartStudy,
}: {
  course: Course;
  track: 'native' | 'paid';
  onBack: () => void;
  onStartStudy?: () => void;
}) {
  const isNative = track === 'native';
  const { locale = 'ar' } = useParams<{ locale?: string }>();

  const handleStartStudy = () => {
    if (onStartStudy) {
      onStartStudy();
    }
  };

  return (
    <div
      className="w-full max-w-md mx-auto pt-0 pb-12 text-right font-['Cairo',sans-serif] animate-in fade-in duration-200 bg-[var(--mn-surface-muted)] min-h-screen mn-panel"
      dir="rtl"
    >
      {/* ========================================================================= */}
      {/* 1. TOP HERO CONTAINER (Matches Scholarship & University Detail Header) */}
      {/* ========================================================================= */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute top-2 left-2 z-30 scale-80 origin-top-left">
          <DetailBackButton onBack={onBack} mode="close" />
        </div>

        {/* SVG background with matching emerald/navy gradient and gold wave curves */}
        <div className="relative w-full h-[105px] sm:h-[110px]">
          <svg
            viewBox="0 0 500 105"
            preserveAspectRatio="none"
            className="w-full h-full absolute inset-0 block"
          >
            <defs>
              <linearGradient id="courseHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--mn-primary)" />
                <stop offset="50%" stopColor="var(--mn-primary)" />
                <stop offset="100%" stopColor="var(--mn-primary)" />
              </linearGradient>
            </defs>

            {/* Main base background */}
            <path d="M 0,0 L 500,0 L 500,82 Q 250,102 0,82 Z" fill="url(#courseHeroGrad)" />

            {/* Decorative Gold Waves */}
            <g opacity="0.25">
              <path
                d="M -50,25 Q 120,-10 260,30 T 550,15"
                stroke="var(--mn-accent)"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M -30,50 Q 150,15 320,48 T 560,30"
                stroke="var(--mn-accent)"
                strokeWidth="1"
                fill="none"
              />
              <circle cx="35" cy="20" r="1.5" fill="var(--mn-accent)" />
              <circle cx="445" cy="18" r="1.5" fill="var(--mn-accent)" />
            </g>

            {/* Gold accent border following the bottom curve */}
            <path
              d="M 0,82 Q 250,102 500,82"
              fill="none"
              stroke="var(--mn-accent)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>

          {/* Hero Content: Title positioned higher up, clean and elegant */}
          <div
            className="absolute inset-0 flex items-center justify-between px-4 sm:px-6 pt-1 pb-4 z-10"
            dir="rtl"
          >
            {/* Right Side: Graduation Cap Icon Badge */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-10 h-10 rounded-full border-2 border-[var(--mn-accent)] flex items-center justify-center p-1.5 shadow-[0_0_12px_rgba(214,164,59,0.5)] bg-gradient-to-br from-[var(--mn-primary)] to-[var(--mn-primary)] shrink-0 mn-inverse">
                <GraduationCap className="w-5 h-5 text-[var(--mn-accent-soft)]" />
              </div>
            </div>

            {/* Title & Provider details (Elevated higher, no extra badge) */}
            <div className="flex flex-col text-right min-w-0 flex-1 pr-2">
              <h1
                className="text-[15px] sm:text-[15px] font-bold text-white leading-tight truncate drop-shadow-sm"
                data-mn-design="827f35e03a"
              >
                {course.title}
              </h1>
              <p className="text-[11px] font-bold text-white/90 font-['Cairo',sans-serif] mt-0.5 tracking-wider truncate">
                {course.titleEn || 'Scholarships and University Admissions Masterclass'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CONTENT WRAPPER */}
      {/* ========================================================================= */}
      <div className="px-1.5 sm:px-2 space-y-2.5 z-20 relative -mt-2 sm:-mt-2.5">
        {/* 2. PROVIDER / AUTHORITY CARD */}
        <div
          className="relative w-full bg-[var(--mn-surface)] rounded-2xl py-3 px-3.5 border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 flex items-center gap-3 overflow-hidden mn-panel"
          dir="rtl"
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

          {/* Provider Icon */}
          <div className="w-9 h-9 rounded-full bg-[var(--mn-primary)] flex items-center justify-center shrink-0 shadow-sm border-1.5 border-[var(--mn-accent)] ring-2 ring-[var(--mn-focus)]/20 mn-inverse">
            <Sparkles className="w-4 h-4 text-[var(--mn-accent)]" />
          </div>

          <div className="w-[1px] h-7 bg-[var(--mn-accent)]/40 shrink-0" />

          <div className="space-y-0.5 min-w-0 flex-1 text-right">
            <span className="text-[9.5px] font-bold text-[var(--mn-text-muted)] block">
              الجهة المقدمة
            </span>
            <h2 className="text-[11.5px] sm:text-xs font-bold text-[var(--mn-heading)] leading-tight">
              تقديم: منصة منارتك
            </h2>
          </div>
        </div>

        {/* 3. 2-COLUMN X 2-ROW SUMMARY GRID (Matching Scholarships / Universities Style) */}
        <div className="space-y-2 pt-0.5" dir="rtl">
          {/* ROW 1: المدة الإجمالية | المحاضرات */}
          <div className="flex items-center gap-2">
            {/* Right Card: المدة الإجمالية */}
            <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 border border-[var(--mn-border)] shadow-sm flex items-center gap-2 min-w-0 mn-panel">
              <div className="w-8 h-8 rounded-full bg-[var(--mn-primary)]/8 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-[var(--mn-accent-text)]" />
              </div>
              <div className="flex flex-col min-w-0 text-right">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-tight truncate">
                  المدة الإجمالية
                </span>
                <span className="text-[9.5px] font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] leading-tight truncate mt-0.5">
                  {course.duration || '25 ساعة'}
                </span>
              </div>
            </div>

            {/* Gold Diamond Connector */}
            <div className="w-1.5 h-1.5 rotate-45 bg-[var(--mn-surface-muted)] shrink-0 mn-panel" />

            {/* Left Card: المحاضرات */}
            <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 border border-[var(--mn-border)] shadow-sm flex items-center gap-2 min-w-0 mn-panel">
              <div className="w-8 h-8 rounded-full bg-[var(--mn-primary)]/8 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-[var(--mn-accent-text)]" />
              </div>
              <div className="flex flex-col min-w-0 text-right">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-tight truncate">
                  المحاضرات
                </span>
                <span className="text-[9.5px] font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] leading-tight truncate mt-0.5">
                  {course.lessonsCount ? `${course.lessonsCount} محاضرات` : '8 محاضرات'}
                </span>
              </div>
            </div>
          </div>

          {/* ROW 2: الطلاب الملتحقين | الرسوم */}
          <div className="flex items-center gap-2">
            {/* Right Card: الطلاب الملتحقين */}
            <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 border border-[var(--mn-border)] shadow-sm flex items-center gap-2 min-w-0 mn-panel">
              <div className="w-8 h-8 rounded-full bg-[var(--mn-primary)]/8 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-[var(--mn-accent-text)]" />
              </div>
              <div className="flex flex-col min-w-0 text-right">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-tight truncate">
                  الطلاب الملتحقين
                </span>
                <span className="text-[9.5px] font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] leading-tight truncate mt-0.5">
                  {course.studentsCount ? `${course.studentsCount} طالب` : '265 طالب'}
                </span>
              </div>
            </div>

            {/* Gold Diamond Connector */}
            <div className="w-1.5 h-1.5 rotate-45 bg-[var(--mn-surface-muted)] shrink-0 mn-panel" />

            {/* Left Card: الرسوم */}
            <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 border border-[var(--mn-border)] shadow-sm flex items-center gap-2 min-w-0 mn-panel">
              <div className="w-8 h-8 rounded-full bg-[var(--mn-primary)]/8 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 text-[var(--mn-accent-text)]" />
              </div>
              <div className="flex flex-col min-w-0 text-right">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-tight truncate">
                  الرسوم
                </span>
                <span className="text-[9.5px] font-bold text-[var(--mn-learning-success-600)] dark:text-[var(--mn-learning-success-400)] leading-tight truncate mt-0.5">
                  {course.isFree ? 'مجانية بالكامل' : 'مدفوعة'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. BRIEF COURSE DESCRIPTION (وصف مختصر للدورة) */}
        {course.courseContent && (
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-3xl p-3.5 sm:p-4 border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir="rtl"
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
            <DetailSectionHeader
              id="course-content-header"
              icon={BookOpen}
              title="وصف مختصر للدورة"
              level={3}
              titleClassName="mn-imported-detail-title"
            />

            <div className="relative rounded-2xl bg-[var(--mn-page)]/70 border border-[var(--mn-border)] px-3.5 py-3 mt-1">
              <span className="absolute top-3 right-3 w-1.5 h-1.5 rotate-45 bg-[var(--mn-accent)]/75" />
              <p className="text-[11px] sm:text-[11.5px] font-semibold text-[var(--mn-text)] leading-[1.9] pr-4 whitespace-pre-wrap">
                {course.courseContent}
              </p>
            </div>
          </div>
        )}

        {/* 5. COURSE MODULES (محاور الدورة) */}
        {course.courseModules && course.courseModules.length > 0 && (
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-3xl p-3.5 sm:p-4 border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir="rtl"
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
            <DetailSectionHeader
              id="course-modules-header"
              icon={BookOpen}
              title="محاور الدورة"
              level={3}
              titleClassName="mn-imported-detail-title"
            />

            <div className="space-y-2.5 mt-2.5">
              {course.courseModules.map((module, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-[var(--mn-page)]/80 border border-[var(--mn-border)] p-3 transition-colors text-right"
                >
                  <div className="flex items-start gap-2.5 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-[var(--mn-primary)] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mn-inverse">
                      {idx + 1}
                    </span>
                    <h4 className="text-[11.5px] sm:text-xs font-bold text-[var(--mn-heading)] leading-snug">
                      {module.title}
                    </h4>
                  </div>
                  <p className="text-[10.5px] sm:text-[11px] font-medium text-[var(--mn-text-muted)] leading-[1.8] pr-7.5">
                    {module.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. LEARNING OUTCOMES (ماذا سيتعلم الطالب في نهاية الدورة؟) */}
        {course.learningOutcomes && (
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-3xl p-3.5 sm:p-4 border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir="rtl"
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
            <DetailSectionHeader
              id="course-outcomes-header"
              icon={GraduationCap}
              title="ماذا سيتعلم الطالب في نهاية الدورة؟"
              level={3}
              titleClassName="mn-imported-detail-title"
            />

            <div className="relative rounded-2xl bg-[var(--mn-page)]/70 border border-[var(--mn-border)] px-3.5 py-3 mt-1">
              <span className="absolute top-3 right-3 w-1.5 h-1.5 rotate-45 bg-[var(--mn-accent)]/75" />
              <p className="text-[11px] sm:text-[11.5px] font-semibold text-[var(--mn-text)] leading-[1.9] pr-4 whitespace-pre-wrap">
                {course.learningOutcomes}
              </p>
            </div>
          </div>
        )}

        {/* 7. ACTION CTA BUTTON */}
        <div className="pt-2">
          {onStartStudy ? (
            <button
              type="button"
              onClick={handleStartStudy}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--mn-primary)] hover:bg-[#1a3777] text-white text-xs font-bold mn-inverse shadow-sm transition-transform active:scale-[0.98] cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 text-[#E5B54F]" />
              <span>ادرس الدورة الان</span>
            </button>
          ) : isNative && course.ownerId ? (
            <Link
              to={`/${locale}/student/courses/${encodeURIComponent(course.ownerId)}`}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--mn-primary)] hover:bg-[#1a3777] text-white text-xs font-bold mn-inverse shadow-sm transition-transform active:scale-[0.98]"
            >
              <PlayCircle className="w-4 h-4 text-[#E5B54F]" />
              <span>ادرس الدورة الان</span>
            </Link>
          ) : !isNative && course.directCourseUrl ? (
            <a
              href={course.directCourseUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--mn-primary)] hover:bg-[#1a3777] text-white text-xs font-bold mn-inverse shadow-sm transition-transform active:scale-[0.98]"
            >
              <ExternalLink className="w-4 h-4 text-[#E5B54F]" />
              <span>ادرس الدورة الان</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={handleStartStudy}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--mn-primary)] hover:bg-[#1a3777] text-white text-xs font-bold mn-inverse shadow-sm transition-transform active:scale-[0.98] cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 text-[#E5B54F]" />
              <span>ادرس الدورة الان</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
