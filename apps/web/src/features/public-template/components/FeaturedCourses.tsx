import React, { useState } from 'react';
import { Course } from '../types';
import { PlayCircle, ChevronLeft, BookOpen, Award, Globe2 } from 'lucide-react';

interface FeaturedCoursesProps {
  courses: Course[];
  onSelectCourse?: (course: Course) => void;
  onViewAllClick: () => void;
}

export const FeaturedCourses: React.FC<FeaturedCoursesProps> = ({
  courses,
  onSelectCourse,
  onViewAllClick,
}) => {
  const [activeTab, setActiveTab] = useState<'external' | 'internal'>('external');

  const allCourses = courses;

  // Filter courses based on provider mapping for demonstration
  const internalCourses = allCourses.filter((c) => c.provider.includes('منارتك'));
  const externalCourses = allCourses.filter((c) => !c.provider.includes('منارتك'));

  const displayCourses = (activeTab === 'external' ? externalCourses : internalCourses).slice(0, 3);

  return (
    <section
      id="featured-courses-section"
      className="px-0 py-3 w-full font-['Cairo',sans-serif]"
    >
      {/* Standard Framed Container with top accent border only */}
      <div className="relative rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-xs overflow-hidden mn-panel">
        {/* Elegant top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        
        {/* Content Inside the Framed Section */}
        <div className="relative z-10">
          {/* Centered Section Title */}
          <div className="text-center mb-2.5 sm:mb-3">
            <div className="relative pb-1 mb-1 inline-block">
              <h3 className="text-[14.5px] sm:text-base font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-1.5 font-['Cairo',sans-serif]">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#142B5F] border border-[#D6A43B]/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D6A43B]" />
                </span>
                <span>الدورات التدريبية والتأهيلية</span>
              </h3>
              <div className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--mn-text-muted)] font-medium max-w-md mx-auto font-['Cairo',sans-serif]">
              طور مهاراتك من خلال برامج تدريبية متخصصة ومقدمة من أفضل الأكاديميات والجامعات.
            </p>
          </div>

          {/* Glowing Animated Orbit Tabs Container matching FeaturedServices */}
          <div className="mb-4 flex justify-center items-center">
            <div className="group relative w-full max-w-[285px] shrink-0 overflow-hidden rounded-[14px] p-[2px]">
              <div className="animate-button-orbit absolute inset-[-100%] bg-[conic-gradient(from_0deg,var(--mn-primary),var(--mn-accent),var(--mn-primary),var(--mn-accent),var(--mn-primary))]" />
              <div className="relative flex w-full rounded-xl bg-[var(--mn-page)] p-1 mn-panel">
                <button
                  type="button"
                  onClick={() => setActiveTab('external')}
                  data-mn-design="023f1723a7"
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 transition-all duration-300 whitespace-nowrap cursor-pointer ${
                    activeTab === 'external'
                      ? 'bg-[#142B5F] text-white dark:bg-[#D6A43B] dark:text-[#142B5F] shadow-md ring-1 ring-[#142B5F]/20 dark:ring-[#D6A43B]/40'
                      : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-surface-muted)]/70 hover:text-[var(--mn-heading)]'
                  }`}
                >
                  <Globe2 className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'external' ? 'text-[#D6A43B] dark:text-[#142B5F]' : 'text-[var(--mn-text-muted)]'}`} />
                  <span>منصات عالمية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('internal')}
                  data-mn-design="023f1723a7"
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 transition-all duration-300 whitespace-nowrap cursor-pointer ${
                    activeTab === 'internal'
                      ? 'bg-[#142B5F] text-white dark:bg-[#D6A43B] dark:text-[#142B5F] shadow-md ring-1 ring-[#142B5F]/20 dark:ring-[#D6A43B]/40'
                      : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-surface-muted)]/70 hover:text-[var(--mn-heading)]'
                  }`}
                >
                  <Award className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'internal' ? 'text-[#D6A43B] dark:text-[#142B5F]' : 'text-[var(--mn-text-muted)]'}`} />
                  <span>دورات منارتك</span>
                </button>
              </div>
            </div>
          </div>

          {/* Courses List Wrapper */}
          <div className="space-y-2 w-full">
            {displayCourses.map((course) => (
              <div
                key={course.id}
                role="button"
                tabIndex={0}
                onKeyDown={function (event) {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectCourse?.(course);
                  }
                }}
                onClick={() => onSelectCourse && onSelectCourse(course)}
                className="group relative flex items-center justify-between gap-2.5 p-2 sm:p-2.5 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] hover:border-[var(--mn-accent)]/50 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Course Thumbnail */}
                  <div className="relative w-14 h-12 sm:w-16 sm:h-14 rounded-lg overflow-hidden shrink-0 bg-[var(--mn-primary)] border border-[var(--mn-border)]/40 mn-inverse">
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    {/* Play Icon Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle className="w-4 h-4 text-white drop-shadow-md" />
                    </div>
                  </div>

                  {/* Course Title Only */}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-[11px] sm:text-[12.5px] text-[var(--mn-heading)] group-hover:text-[var(--mn-accent-text)] transition-colors line-clamp-2 leading-tight font-['Cairo',sans-serif]">
                      {course.title}
                    </h4>
                  </div>
                </div>

                {/* Arrow Action Indicator */}
                <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[var(--mn-surface-muted)] text-[var(--mn-text-muted)] group-hover:text-[#142B5F] dark:group-hover:text-[#D6A43B] transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                </div>
              </div>
            ))}

            {displayCourses.length === 0 && (
              <div className="text-center py-6 text-sm text-[var(--mn-text-muted)]">
                لا توجد دورات حالياً في هذا القسم.
              </div>
            )}
          </div>

          {/* View All Button */}
          <div className="mt-4 flex justify-center">
            <button
              id="btn-view-all-courses"
              onClick={onViewAllClick}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-[var(--mn-surface-muted)] hover:bg-[#142B5F]/5 dark:hover:bg-[#D6A43B]/10 text-[#142B5F] dark:text-[#D6A43B] border border-[#142B5F]/50 dark:border-[#D6A43B]/50 rounded-full transition-all active:scale-95 font-['Cairo',sans-serif] shadow-xs "
            >
              <span className="text-[12px] sm:text-sm font-bold">تصفح جميع الدورات</span>
              <ChevronLeft className="w-4 h-4 text-[#142B5F] dark:text-[#D6A43B] transition-transform group-hover:-translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
