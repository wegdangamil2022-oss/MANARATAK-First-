import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState } from 'react';
import { FeaturedCatalogImage } from './FeaturedCatalogImage';
import { FeaturedCatalogStateCards } from './FeaturedCatalogStateCards';
import { homeCatalogStatus, type HomeCoursePreviews } from '../homeCatalogState';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';
import { Course } from '../types';
import { PlayCircle, ChevronLeft, BookOpen, Award, Globe2 } from 'lucide-react';

interface FeaturedCoursesProps {
  courses: Course[];
  dataMode?: 'api' | 'prototype';
  status?: PublicLiveDomainStatus;
  previews?: HomeCoursePreviews;
  onRetry?: () => void;
  onSelectCourse?: (course: Course) => void;
  onViewAllClick: () => void;
  onRestrictedCourse?: () => void;
}

export const FeaturedCourses: React.FC<FeaturedCoursesProps> = ({
  courses,
  dataMode = 'api',
  status,
  previews,
  onRetry,
  onSelectCourse,
  onViewAllClick,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const [activeCourseTab, setActiveCourseTab] = useState<'global' | 'native'>('global');

  const globalCourses = courses.filter((course) => dataMode === 'prototype' ? !course.provider.includes('أبشر') : course.originType === 'EXTERNAL_LINKED_COURSE');
  const nativeCourses = courses.filter((course) => dataMode === 'prototype' ? course.provider.includes('أبشر') : ['NATIVE_ABSHEER_COURSE', 'PAID_COURSE'].includes(course.originType ?? ''));
  const preview = dataMode === 'api' ? previews?.[activeCourseTab] : undefined;
  const currentCourses = (preview?.courses ?? (activeCourseTab === 'global' ? globalCourses : nativeCourses)).slice(0, 3);
  const displayStatus = homeCatalogStatus(preview?.status ?? status, currentCourses.length);

  const handleCourseClick = (course: Course) => {
    onSelectCourse?.(course);
  };

  return (
    <section
      id="featured-courses-section"
      className="px-0 py-3 w-full font-['Cairo',sans-serif]"
    >
      {/* Standard Framed Container with top accent border only */}
      <div className="relative rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-[var(--ab-surface)] to-[var(--ab-page)]/80 border border-[var(--ab-border)] shadow-xs overflow-hidden ab-panel">
        {/* Elegant top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        
        {/* Content Inside the Framed Section */}
        <div className="relative z-10">
          {/* Centered Section Title */}
          <div className="text-center mb-3 sm:mb-4">
            <div className="relative pb-1 mb-1 inline-block">
              <h3 className="text-[14.5px] sm:text-base font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-1.5 font-['Cairo',sans-serif]">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#142B5F] border border-[#D6A43B]/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D6A43B]" />
                </span>
                <span>{publicT('public_training_and_preparation_courses')}</span>
              </h3>
              <div className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--ab-text-muted)] font-medium max-w-md mx-auto font-['Cairo',sans-serif]">{publicT('public_develop_your_skills_through_specialized_training_from_leading')}</p>
          </div>

          {/* Dual Tabs Switcher: منصات عالمية & دورات أبشر */}
          <div className="flex items-center justify-center p-1 mb-3.5 max-w-xs mx-auto rounded-2xl bg-[var(--ab-surface-muted)] border border-[var(--ab-border)] shadow-2xs">
            <button
              type="button"
              aria-pressed={activeCourseTab === 'global'}
              aria-controls="home-course-cards"
              onClick={() => setActiveCourseTab('global')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-['Cairo',sans-serif] ${
                activeCourseTab === 'global'
                  ? 'bg-[#142B5F] text-[#D6A43B] shadow-xs'
                  : 'text-[var(--ab-text-muted)] hover:text-[var(--ab-heading)]'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>{publicT('public_global_platforms')}</span>
            </button>
            <button
              type="button"
              aria-pressed={activeCourseTab === 'native'}
              aria-controls="home-course-cards"
              onClick={() => setActiveCourseTab('native')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-['Cairo',sans-serif] ${
                activeCourseTab === 'native'
                  ? 'bg-[#142B5F] text-[#D6A43B] shadow-xs'
                  : 'text-[var(--ab-text-muted)] hover:text-[var(--ab-heading)]'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{publicT('public_absheer_courses')}</span>
            </button>
          </div>

          {/* Courses List Wrapper */}
          <div id="home-course-cards" className="space-y-2 w-full">
            {displayStatus === 'unavailable' && currentCourses.length > 0 && (
              <div role="status" className="text-xs text-[var(--ab-text-muted)]">
                {publicT('public_home_catalog_partial')}
                {onRetry && <button type="button" onClick={onRetry} className="ms-2 underline">{publicT('public_home_catalog_retry')}</button>}
              </div>
            )}
            {displayStatus === 'loading' || currentCourses.length === 0 ? (
              <FeaturedCatalogStateCards key={activeCourseTab} kind="courses" status={displayStatus === 'ready' ? 'empty' : displayStatus} onRetry={onRetry} />
            ) : currentCourses.map((course) => (
              <div
                key={course.id}
                role="button"
                tabIndex={0}
                onKeyDown={function (event) {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleCourseClick(course);
                  }
                }}
                onClick={() => handleCourseClick(course)}
                className="group relative flex items-center justify-between gap-2.5 p-2 sm:p-2.5 rounded-xl bg-[var(--ab-surface)] border border-[var(--ab-border)] hover:border-[var(--ab-accent)]/50 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Course Thumbnail */}
                  <div className="relative w-14 h-12 sm:w-16 sm:h-14 rounded-lg overflow-hidden shrink-0 bg-[#142B5F] border border-[var(--ab-border)]/40 ab-inverse">
                    <FeaturedCatalogImage src={course.imageUrl} alt={course.title} kind="courses" />
                    {/* Play Icon Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle className="w-4 h-4 text-white drop-shadow-md" />
                    </div>
                  </div>

                  {/* Course Info */}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-[11px] sm:text-[12.5px] text-[var(--ab-heading)] group-hover:text-[var(--ab-accent-text)] transition-colors line-clamp-2 leading-tight font-['Cairo',sans-serif]">
                      {course.title}
                    </h4>
                    <p className="text-[9.5px] sm:text-[10px] text-[var(--ab-text-muted)] mt-0.5 font-medium truncate font-['Cairo',sans-serif]">
                      {course.provider}
                    </p>
                  </div>
                </div>

                {/* Arrow Action Indicator */}
                <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[var(--ab-surface-muted)] text-[var(--ab-text-muted)] group-hover:text-[#142B5F] dark:group-hover:text-[#D6A43B] transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                </div>
              </div>
            ))}

          </div>

          {/* View All Button */}
          <div className="mt-4 flex justify-center">
            <button
              id="btn-view-all-courses"
              type="button"
              onClick={onViewAllClick}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-[var(--ab-surface-muted)] hover:bg-[#142B5F]/5 dark:hover:bg-[#D6A43B]/10 text-[#142B5F] dark:text-[#D6A43B] border border-[#142B5F]/50 dark:border-[#D6A43B]/50 rounded-full transition-all active:scale-95 font-['Cairo',sans-serif] shadow-xs "
            >
              <span className="text-[12px] sm:text-sm font-bold">{publicT('public_browse_all_courses')}</span>
              <ChevronLeft className="w-4 h-4 text-[#142B5F] dark:text-[#D6A43B] transition-transform group-hover:-translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
