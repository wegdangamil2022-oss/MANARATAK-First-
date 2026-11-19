import { FeaturedCatalogImage } from './FeaturedCatalogImage';
import { FeaturedCatalogStateCards } from './FeaturedCatalogStateCards';
import { homeCatalogStatus } from '../homeCatalogState';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState } from 'react';
import { type HomeCoursePreviews } from '../homeCatalogState';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';
import { Course } from '../types';
import { PlayCircle, ChevronLeft, ArrowUpLeft, BookOpen, Award, Globe2 } from 'lucide-react';

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

  const globalCourses = courses.filter((course) => dataMode === 'prototype' ? !course.provider.includes('منارتك') : course.originType === 'EXTERNAL_LINKED_COURSE');
  const nativeCourses = courses.filter((course) => dataMode === 'prototype' ? course.provider.includes('منارتك') : ['NATIVE_MANARATAK_COURSE', 'PAID_COURSE'].includes(course.originType ?? ''));
  const preview = dataMode === 'api' ? previews?.[activeCourseTab] : undefined;
  const currentCourses = (preview?.courses ?? (activeCourseTab === 'global' ? globalCourses : nativeCourses)).slice(0, 3);
  const displayStatus = homeCatalogStatus(preview?.status ?? status, currentCourses.length);

  const handleCourseClick = (course: Course) => {
    onSelectCourse?.(course);
  };

  return (
    <section
      id="featured-courses-section"
      className="px-0 py-2.5 w-full font-['Cairo',sans-serif]"
    >
      {/* Standard Framed Container with top accent border only */}
      <div className="relative rounded-3xl px-2.5 py-3.5 sm:px-3.5 sm:py-4 md:px-6 md:py-5 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-xs overflow-hidden mn-panel">
        {/* Elegant top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

        {/* Content Inside the Framed Section */}
        <div className="relative z-10">
          {/* Centered Section Title */}
          <div className="text-center mb-3 md:mb-4">
            <div className="inline-flex items-center justify-center mb-1">
              <h3 className="text-[15px] sm:text-base md:text-lg lg:text-xl font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-2 leading-tight font-['Cairo',sans-serif]">
                <span className="mn-detail-section-icon mn-icon-mix02 shrink-0">
                  <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-md" />
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 relative z-10 text-[#F2CD78]" />
                </span>
                <span className="inline-flex flex-col items-center">
                  <span>{publicT('public_training_and_preparation_courses')}</span>
                  <span className="w-full min-w-[125px] md:min-w-[140px] h-[2.5px] mt-1 rounded-full bg-[linear-gradient(90deg,transparent_0%,#D6A43B_18%,#D6A43B_82%,transparent_100%)]" />
                </span>
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs md:text-sm text-[var(--mn-text)] font-semibold leading-relaxed max-w-lg md:max-w-2xl mx-auto font-['Cairo',sans-serif]">{publicT('public_develop_your_skills_through_specialized_training_from_leading')}</p>
          </div>

          {/* Dual Tabs Switcher with Animated Gold Orbit Line & Proportional Navy-Petrol Sizing */}
          <div className="flex justify-center mb-3 md:mb-4">
            <div className="group relative w-full max-w-[255px] sm:max-w-[270px] md:max-w-[340px] shrink-0 overflow-hidden rounded-[12px] p-[1.5px]">
              <div className="animate-button-orbit absolute inset-[-100%] bg-[conic-gradient(from_0deg,var(--mn-primary),var(--mn-accent),var(--mn-primary),var(--mn-accent),var(--mn-primary))]" />
              <div className="relative flex w-full rounded-[10.5px] bg-[var(--mn-page)] p-0.5 mn-panel">
                <button
                  type="button"
                  aria-pressed={activeCourseTab === 'global'}
                  aria-controls="home-course-cards"
                  onClick={() => setActiveCourseTab('global')}
                  className={`flex-1 py-1.5 md:py-2 px-2.5 md:px-4 rounded-[8.5px] text-[11px] sm:text-[11.5px] md:text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap font-['Cairo',sans-serif] ${
                    activeCourseTab === 'global'
                      ? 'bg-gradient-to-l from-[#142B5F] to-[#0E7C86] text-white shadow-xs'
                      : 'text-[var(--mn-heading)] hover:bg-[var(--mn-surface-muted)]/70'
                  }`}
                >
                  <Globe2 className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${activeCourseTab === 'global' ? 'text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#D6A43B]'}`} />
                  <span>{publicT('public_global_platforms')}</span>
                </button>
                <button
                  type="button"
                  aria-pressed={activeCourseTab === 'native'}
                  aria-controls="home-course-cards"
                  onClick={() => setActiveCourseTab('native')}
                  className={`flex-1 py-1.5 md:py-2 px-2.5 md:px-4 rounded-[8.5px] text-[11px] sm:text-[11.5px] md:text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap font-['Cairo',sans-serif] ${
                    activeCourseTab === 'native'
                      ? 'bg-gradient-to-l from-[#142B5F] to-[#0E7C86] text-white shadow-xs'
                      : 'text-[var(--mn-heading)] hover:bg-[var(--mn-surface-muted)]/70'
                  }`}
                >
                  <Award className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${activeCourseTab === 'native' ? 'text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#D6A43B]'}`} />
                  <span>{publicT('public_manaratak_courses')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Courses List Wrapper: Stack on Mobile -> 3 Equal-Height Columns on Desktop */}
          <div id="home-course-cards" className="space-y-2 md:space-y-0 md:grid md:grid-cols-3 md:gap-3.5 items-stretch w-full">
            {displayStatus === 'unavailable' && currentCourses.length > 0 && <div role="status" className="col-span-full text-xs">{publicT('public_home_catalog_partial')}{onRetry && <button type="button" onClick={onRetry}>{publicT('public_home_catalog_retry')}</button>}</div>}
            {displayStatus === 'loading' || currentCourses.length === 0 ? <div className="col-span-full"><FeaturedCatalogStateCards key={activeCourseTab} kind="courses" status={displayStatus === 'ready' ? 'empty' : displayStatus} onRetry={onRetry} /></div> : currentCourses.map((course) => (
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
                className="group relative h-full flex items-center justify-between gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3.5 rounded-xl md:rounded-2xl bg-[var(--mn-surface)] border border-[var(--mn-border)] hover:border-[var(--mn-accent)]/50 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 md:gap-3 min-w-0 flex-1">
                  {/* Course Thumbnail */}
                  <div className="relative w-14 h-12 sm:w-16 sm:h-14 md:w-18 md:h-16 rounded-lg md:rounded-xl overflow-hidden shrink-0 bg-[#142B5F] border border-[var(--mn-border)]/40 flex items-center justify-center mn-inverse">
                    {course.imageUrl ? (
                      <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-white" />
                    )}
                    {/* Play Icon Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle className="w-4 h-4 text-white drop-shadow-md" />
                    </div>
                  </div>

                  {/* Course Info */}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-[11px] sm:text-[12.5px] md:text-sm text-[var(--mn-heading)] group-hover:text-[var(--mn-accent-text)] transition-colors line-clamp-2 leading-tight font-['Cairo',sans-serif]">
                      {course.title}
                    </h4>
                    <p className="text-[9.5px] sm:text-[10px] md:text-xs text-[var(--mn-text-muted)] mt-0.5 font-medium truncate font-['Cairo',sans-serif]">
                      {course.provider}
                    </p>
                  </div>
                </div>

                {/* Arrow Action Indicator */}
                <div className="shrink-0 flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full bg-[var(--mn-surface-muted)] text-[var(--mn-text-muted)] group-hover:text-[#142B5F] dark:group-hover:text-[#D6A43B] transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover:-translate-x-0.5" />
                </div>
              </div>
            ))}

          </div>

          {/* Geometric Full-Width View All Button */}
          <div className="mt-3 md:mt-4 w-full">
            <button
              id="btn-view-all-courses"
              type="button"
              onClick={onViewAllClick}
              className="group relative w-full overflow-hidden rounded-xl px-3.5 py-2.5 md:py-3 bg-[var(--mn-page)] hover:bg-[#142B5F]/[0.04] dark:hover:bg-[#D6A43B]/10 border border-[#142B5F]/30 dark:border-[#D6A43B]/45 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] font-['Cairo',sans-serif] shadow-2xs cursor-pointer mn-panel"
            >
              <span className="pointer-events-none absolute top-0 right-0 w-5 h-3.5 border-t-[2.5px] border-r-[2.5px] border-[#0E7C86] dark:border-[#D6A43B] rounded-tr-xl" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-5 h-3.5 border-b-[2.5px] border-l-[2.5px] border-[#142B5F] dark:border-[#D6A43B]/80 rounded-bl-xl" />
              <span className="inline-flex items-center justify-center gap-1.5">
                <span className="text-[12px] sm:text-[13px] md:text-[14.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] text-center">{publicT('public_browse_all_courses')}</span>
                <ArrowUpLeft className="w-4 h-4 md:w-4.5 md:h-4.5 -mt-1 text-[#0E7C86] dark:text-[#F2CD78] stroke-[2.5] shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
