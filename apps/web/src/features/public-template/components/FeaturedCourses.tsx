import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState } from 'react';
import { type HomeCoursePreviews } from '../homeCatalogState';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';
import { Course } from '../types';
import { PlayCircle, ChevronLeft, BookOpen, Award, Globe2 } from 'lucide-react';
import {
  HOME_INNER_CARD_CLASS,
  HomeSectionCta,
  HomeSectionHeader,
  HomeSectionShell,
} from './HomeSectionPrimitives';

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
  dataMode = 'prototype',
  previews,
  onSelectCourse,
  onViewAllClick,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const [activeCourseTab, setActiveCourseTab] = useState<'global' | 'native'>('global');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const globalCourses = courses.filter((course) =>
    dataMode === 'prototype'
      ? !course.provider.includes('منارتك')
      : course.originType === 'EXTERNAL_LINKED_COURSE'
  );
  const nativeCourses = courses.filter((course) =>
    dataMode === 'prototype'
      ? course.provider.includes('منارتك')
      : ['NATIVE_MANARATAK_COURSE', 'PAID_COURSE'].includes(course.originType ?? '')
  );
  const preview = dataMode === 'api' ? previews?.[activeCourseTab] : undefined;
  const currentCourses = (
    preview?.courses ?? (activeCourseTab === 'global' ? globalCourses : nativeCourses)
  ).slice(0, 3);

  const handleCourseClick = (course: Course) => {
    onSelectCourse?.(course);
  };

  return (
    <HomeSectionShell id="featured-courses-section">
      <HomeSectionHeader
        title={publicT('public_training_and_preparation_courses')}
        subtitle={publicT('public_develop_your_skills_through_specialized_training_from_leading')}
        icon={<BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.1]" />}
      />

      {/* Restored Navy-Petrol Filled Tab Boxes + Animated Navy Line */}
      <div className="flex flex-col items-center gap-1.5 mb-3 md:mb-4">
        <div className="inline-grid grid-cols-2 w-full max-w-[260px] sm:max-w-[300px] md:max-w-[340px] p-1 rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/90 border border-[#142B5F]/12 dark:border-white/12 gap-1">
          <button
            type="button"
            aria-pressed={activeCourseTab === 'global'}
            aria-controls="home-course-cards"
            onClick={() => setActiveCourseTab('global')}
            className={`py-1.5 md:py-2 px-2.5 md:px-4 rounded-lg text-[10.5px] sm:text-[11.5px] md:text-[12.5px] font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap font-['Cairo',sans-serif] ${
              activeCourseTab === 'global'
                ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white shadow-[0_2px_8px_rgba(20,43,95,0.22)]'
                : 'text-[#142B5F]/75 dark:text-[#9BB4C7] hover:text-[#142B5F] dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/5'
            }`}
          >
            <Globe2
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 shrink-0 transition-colors ${
                activeCourseTab === 'global'
                  ? 'text-white'
                  : 'text-[#0E7C86] dark:text-[#38C6D4]'
              }`}
            />
            <span>{publicT('public_global_platforms')}</span>
          </button>
          <button
            type="button"
            aria-pressed={activeCourseTab === 'native'}
            aria-controls="home-course-cards"
            onClick={() => setActiveCourseTab('native')}
            className={`py-1.5 md:py-2 px-2.5 md:px-4 rounded-lg text-[10.5px] sm:text-[11.5px] md:text-[12.5px] font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap font-['Cairo',sans-serif] ${
              activeCourseTab === 'native'
                ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white shadow-[0_2px_8px_rgba(20,43,95,0.22)]'
                : 'text-[#142B5F]/75 dark:text-[#9BB4C7] hover:text-[#142B5F] dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/5'
            }`}
          >
            <Award
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 shrink-0 transition-colors ${
                activeCourseTab === 'native'
                  ? 'text-white'
                  : 'text-[#0E7C86] dark:text-[#38C6D4]'
              }`}
            />
            <span>{publicT('public_manaratak_courses')}</span>
          </button>
        </div>

        {/* Restored Moving Line (Changed from Gold to Navy) */}
        <div
          aria-hidden="true"
          className="w-full max-w-[210px] sm:max-w-[250px] relative h-[2px] rounded-full overflow-hidden bg-[#142B5F]/12 dark:bg-white/10"
        >
          <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-l from-transparent via-[#142B5F] to-[#142B5F] dark:from-transparent dark:via-[#60A5FA] dark:to-[#142B5F] animate-swipe-line shadow-[0_0_6px_rgba(20,43,95,0.45)]" />
        </div>
      </div>

      {/* Courses List Wrapper on Approved Frost Cards */}
      <div
        id="home-course-cards"
        className="space-y-1.5 sm:space-y-2 md:space-y-0 md:grid md:grid-cols-3 md:gap-3.5 items-stretch w-full"
      >
        {currentCourses.map((course) => {
          const showImg = Boolean(course.imageUrl) && !failedImages[course.id];
          return (
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
              className={`group relative h-full min-h-[58px] sm:min-h-[68px] flex items-center justify-between gap-2 md:gap-3 py-2 sm:py-2.5 px-2.5 sm:px-3.5 rounded-xl sm:rounded-2xl hover:-translate-y-0.5 cursor-pointer active:scale-[0.99] ${HOME_INNER_CARD_CLASS}`}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="relative w-11.5 h-10.5 sm:w-14 sm:h-12 md:w-16 md:h-14 rounded-lg sm:rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#142B5F] to-[#0E7C86] border border-[#142B5F]/12 flex items-center justify-center">
                  {showImg ? (
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-300"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [course.id]: true }))
                      }
                    />
                  ) : (
                    <BookOpen className="w-4.5 h-4.5 text-[#F2CD78]" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-[#142B5F]/35 opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="w-5 h-5 text-white drop-shadow-md" />
                  </div>
                </div>

                <div className="min-w-0 flex-1 text-start">
                  <h4 className="font-extrabold text-[10.5px] sm:text-[12px] md:text-[13px] text-[#142B5F] dark:text-[#F1F5F9] group-hover:text-[#0E7C86] dark:group-hover:text-[#38C6D4] transition-colors line-clamp-2 leading-snug font-['Cairo',sans-serif]">
                    {course.title}
                  </h4>
                  <p className="text-[9px] sm:text-[10px] md:text-[11px] text-[#0E7C86] dark:text-[#38C6D4] mt-0.5 font-bold truncate font-['Cairo',sans-serif]">
                    {course.provider}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full bg-white dark:bg-[#162749] border border-[#142B5F]/10 group-hover:bg-[#0E7C86] group-hover:border-[#0E7C86] text-[#142B5F] group-hover:text-white dark:text-[#38C6D4] transition-colors">
                <ChevronLeft className="w-3 h-3 md:w-4 md:h-4 transition-transform group-hover:-translate-x-0.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-Width View All Button */}
      <div className="mt-2.5 md:mt-4 w-full">
        <HomeSectionCta
          id="btn-view-all-courses"
          label={publicT('public_browse_all_courses')}
          onClick={onViewAllClick}
        />
      </div>
    </HomeSectionShell>
  );
};
