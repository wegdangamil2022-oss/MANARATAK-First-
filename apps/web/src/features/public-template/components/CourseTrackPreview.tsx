import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  ChevronLeft,
  ChevronDown,
  Layers,
  GraduationCap,
  RotateCcw,
  Sparkles,
  BookOpen,
  PlayCircle,
} from 'lucide-react';
import type { Course } from '../types';
import { FavoriteButton } from './FavoriteButton';
import { PublicCardsPagination, PublicInlineFilterPanel, usePaginatedCatalog } from './DetailUi';

interface CourseTrackPreviewProps {
  track: 'native' | 'paid';
  courses: Course[];
  onBack: () => void;
  onSelectCourse: (course: Course) => void;
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
  onRestrictedCourse?: () => void;
}

export const CourseTrackPreview: React.FC<CourseTrackPreviewProps> = ({
  track,
  courses = [],
  onBack,
  onSelectCourse,
  favoriteIds = [],
  onToggleFavorite,
  onRestrictedCourse,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  const isNative = track === 'native';
  const rawCourses = courses;
  const pageTitle = isNative ? 'دورات منارتك' : 'الدورات المدفوعة';
  const pageSubtitle = isNative
    ? 'برامج تدريبية وتأهيلية معتمدة لإتقان ملفات القبول، خطابات الدافع، وبناء السيرة الذاتية الأكاديمية'
    : 'برامج تدريبية احترافية متقدمة لتطوير مهاراتك الأكاديمية والمهنية مع شهادات تخصصية';

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedLevel, setSelectedLevel] = useState('الكل');
  const [openFilterModal, setOpenFilterModal] = useState<'category' | 'level' | null>(null);

  // Extract available categories dynamically + standard domains for smooth scrolling
  const categories = useMemo(() => {
    const set = new Set<string>();
    rawCourses.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    [
      'المنح والقبولات الجامعية',
      'الإعداد اللغوي والأكاديمي',
      'الكتابة الأكاديمية والبحثية',
      'تطوير المهارات المهنية',
      'التحضير للاختبارات الدولية',
      'السيرة الذاتية وخطاب الدافع',
    ].forEach((cat) => set.add(cat));
    return ['الكل', ...Array.from(set)];
  }, [rawCourses]);

  // Extract available levels
  const levels = useMemo(() => {
    const set = new Set<string>();
    rawCourses.forEach((c) => {
      if (c.level) set.add(c.level);
    });
    ['مبتدئ', 'متوسط', 'متقدم', 'جميع المستويات'].forEach((lvl) => set.add(lvl));
    return ['الكل', ...Array.from(set)];
  }, [rawCourses]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rawCourses.filter((c) => {
      const searchableText = [
        c.title,
        c.titleEn,
        c.provider,
        c.instructor,
        c.category,
        c.level,
        c.courseContent,
        ...(c.acquiredSkills || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesQuery = !q || searchableText.includes(q);
      const matchesCategory = selectedCategory === 'الكل' || c.category === selectedCategory;
      const matchesLevel = selectedLevel === 'الكل' || c.level === selectedLevel;

      return matchesQuery && matchesCategory && matchesLevel;
    });
  }, [rawCourses, searchQuery, selectedCategory, selectedLevel]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems: paginatedCourses,
  } = usePaginatedCatalog(
    filteredCourses,
    `${searchQuery}|${selectedCategory}|${selectedLevel}|${track}`,
    30,
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('الكل');
    setSelectedLevel('الكل');
  };

  const activeFiltersCount =
    (selectedCategory !== 'الكل' ? 1 : 0) +
    (selectedLevel !== 'الكل' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0);

  const handleCardClick = (course: Course) => {
    onSelectCourse(course);
  };

  return (
    <div
      className="min-h-screen bg-[var(--mn-page)] text-[var(--mn-heading)] pb-24 font-['Cairo',sans-serif] select-none mn-panel"
      dir={publicDir}
    >
      {/* ========================================================================= */}
      {/* HERO CURVED BANNER */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-4 pb-3 overflow-hidden shadow-xs mn-inverse">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-30 cursor-pointer text-white shadow-xs active:scale-95"
            title={publicT('public_back')}
            aria-label={publicT('public_back')}
          >
            <ChevronLeft className="w-4 h-4 rotate-180 text-white" />
          </button>
        )}

        {/* Background Decorative Gold Waves & Dot Patterns */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg
            className="w-full h-full"
            viewBox="0 0 400 200"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-50,50 Q100,-20 250,60 T550,40"
              stroke="var(--mn-accent)"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M-20,120 Q150,40 300,140 T600,100"
              stroke="var(--mn-accent)"
              strokeWidth="1"
              fill="none"
            />
            <circle cx="30" cy="30" r="1" fill="var(--mn-accent)" />
            <circle cx="45" cy="30" r="1" fill="var(--mn-accent)" />
            <circle cx="60" cy="30" r="1" fill="var(--mn-accent)" />
            <circle cx="30" cy="45" r="1" fill="var(--mn-accent)" />
            <circle cx="45" cy="45" r="1" fill="var(--mn-accent)" />
            <circle cx="60" cy="45" r="1" fill="var(--mn-accent)" />
          </svg>
        </div>

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-2 md:space-y-3 pt-1 md:pt-2">
          {/* Sparkle Icon */}
          <div className="flex justify-center">
            <Sparkles className="h-5 w-5 text-[var(--mn-accent-text)] drop-shadow-[0_0_8px_rgba(214,164,59,0.8)]" aria-hidden="true" />
          </div>

          {/* Main Title */}
          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[32px] font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              {publicT('public_search_in')}{' '}
              <span className="text-[var(--mn-accent-text)]">{pageTitle}</span>
            </h1>

            {/* Small Gold Horizontal Divider */}
            <div className="flex justify-center pt-1 pb-0.5">
              <div className="w-10 md:w-14 h-0.5 bg-[var(--mn-accent)] rounded-full mn-gold" />
            </div>

            {/* Subtitle */}
            <p className="text-[10px] sm:text-xs md:text-sm text-white font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto px-2 line-clamp-2">
              {pageSubtitle}
            </p>
          </div>

          {/* Integrated Search Bar in Hero */}
          <div className="pt-1 max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_search_by_course_instructor_or_skill')}
                className="w-full py-2.5 md:py-3 pl-4 pr-10 bg-[var(--mn-surface)] text-[var(--mn-heading)] rounded-full text-[12px] md:text-sm font-bold placeholder:text-[var(--mn-text-muted)] placeholder:text-[12px] md:placeholder:text-sm placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none shadow-md border border-[var(--mn-border)] focus:border-[var(--mn-accent)] transition-all text-center font-['Cairo',sans-serif] mn-panel"
                data-mn-design="8bba664dec"
              />
              <Search className="w-4 h-4 text-[var(--mn-accent-text)] absolute right-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--mn-text-muted)] hover:text-[var(--mn-text)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex justify-center mt-2 relative z-10">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[10px] font-bold text-[var(--mn-danger-text)] hover:text-[var(--mn-danger-text)] bg-[var(--mn-surface-elevated)]/95 px-2.5 py-0.5 rounded-full shadow-xs transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif] mn-panel"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{publicT('public_reset_filters')}{activeFiltersCount})</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2 SEPARATE FLOATING FILTER TILES (المجال • المستوى) INSIDE HERO           */}
        {/* ========================================================================= */}
        <div className="max-w-[256px] sm:max-w-[350px] md:max-w-[454px] lg:max-w-[522px] mx-auto mn-inline-gutter mt-2.5 md:mt-3.5 relative z-20 pb-0">
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:gap-3.5">
            {/* Tile 1: المجال / التصنيف */}
            <button
              type="button"
              onClick={() => setOpenFilterModal((prev) => (prev === 'category' ? null : 'category'))}
              className={`relative min-w-0 overflow-hidden border-1.5 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer ${
                openFilterModal === 'category' || selectedCategory !== 'الكل'
                  ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] border-[#142B5F] text-white mn-inverse'
                  : 'bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] mn-panel'
              }`}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 font-bold text-[10px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <Layers className={`w-3.5 h-3.5 shrink-0 ${openFilterModal === 'category' || selectedCategory !== 'الكل' ? 'text-[#F2CD78]' : 'text-[#142B5F] dark:text-[#D6A43B]'}`} />
                <span className="min-w-0 truncate">
                  {selectedCategory === 'الكل' ? publicT('public_all_domains_2') : selectedCategory}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${openFilterModal === 'category' ? 'rotate-180 text-white' : selectedCategory !== 'الكل' ? 'text-white/85' : 'text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)]'}`} />
            </button>

            {/* Tile 2: المستوى */}
            <button
              type="button"
              onClick={() => setOpenFilterModal((prev) => (prev === 'level' ? null : 'level'))}
              className={`relative min-w-0 overflow-hidden border-1.5 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer ${
                openFilterModal === 'level' || selectedLevel !== 'الكل'
                  ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] border-[#142B5F] text-white mn-inverse'
                  : 'bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] mn-panel'
              }`}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 font-bold text-[10px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <GraduationCap className={`w-3.5 h-3.5 shrink-0 ${openFilterModal === 'level' || selectedLevel !== 'الكل' ? 'text-[#F2CD78]' : 'text-[#142B5F] dark:text-[#D6A43B]'}`} />
                <span className="min-w-0 truncate">
                  {selectedLevel === 'الكل' ? publicT('public_all_levels_2') : selectedLevel}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${openFilterModal === 'level' ? 'rotate-180 text-white' : selectedLevel !== 'الكل' ? 'text-white/85' : 'text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)]'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Gold Divider Ribbon Line */}
      <div className="w-full h-0.5 bg-gradient-to-r from-[var(--mn-accent-text)] via-[var(--mn-accent-soft)] to-[var(--mn-accent-text)] shadow-xs mb-3" />

      {/* Inline Attached Filter Panels */}
      <PublicInlineFilterPanel
        isOpen={openFilterModal === 'category'}
        onClose={() => setOpenFilterModal(null)}
        title={publicT('public_choose_domain')}
        icon={Layers}
        selectedValue={selectedCategory}
        onSelect={setSelectedCategory}
        options={categories.map((cat) => ({
          value: cat,
          label: cat === 'الكل' ? publicT('public_all_domains_2') : cat,
        }))}
      />

      <PublicInlineFilterPanel
        isOpen={openFilterModal === 'level'}
        onClose={() => setOpenFilterModal(null)}
        title={publicT('public_choose_level')}
        icon={GraduationCap}
        selectedValue={selectedLevel}
        onSelect={setSelectedLevel}
        options={levels.map((lvl) => ({
          value: lvl,
          label: lvl === 'الكل' ? publicT('public_all_levels_2') : lvl,
        }))}
      />

      {/* ========================================================================= */}
      {/* RESULTS COUNT */}
      {/* ========================================================================= */}
      <div className="max-w-xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-4 mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--mn-heading)]">
          <BookOpen className="w-4 h-4 text-[#142B5F] dark:text-[#E5B54F]" />
          <span>{publicT('public_available_courses')}{filteredCourses.length})</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COURSES LIST / CARDS */}
      {/* ========================================================================= */}
      <div className="max-w-xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-3 sm:px-4 mt-2.5 md:mt-4 space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch">
        {paginatedCourses.map((course) => {
          const isFavorited = favoriteIds.includes(course.id);
          return (
            <div
              key={course.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(course);
                }
              }}
              onClick={() => handleCardClick(course)}
              className="bg-[var(--mn-surface)] rounded-xl sm:rounded-2xl border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] dark:hover:border-[#D6A43B] shadow-xs hover:shadow-md transition-all relative overflow-hidden group mn-panel text-start cursor-pointer select-none w-full h-full flex flex-col active:scale-[0.99]"
            >
              {/* Navy Top Line */}
              <div className="h-[3px] w-full bg-[#142B5F] shrink-0" />

              <div className="p-2.5 sm:p-3 md:p-4 space-y-2 flex-1 flex flex-col justify-between">
                {/* Header: Smaller Image + Title & Distributed Meta Row + Favorite */}
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-[var(--mn-border)] shrink-0 shadow-2xs">
                      <img
                        src={
                          course.imageUrl ||
                          'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80'
                        }
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {!course.isFree && (
                        <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-amber-600/90 text-white font-bold text-[7px] sm:text-[7.5px]">
                          {publicT('public_paid')}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-[12px] sm:text-[13px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-primary)] dark:group-hover:text-[#E5B54F] transition-colors line-clamp-2 break-words font-['Cairo',sans-serif]">
                        {course.title}
                      </h3>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[9.5px] sm:text-[10px] text-[var(--mn-text-muted)] font-bold truncate">
                          {publicT('public_presented_by')} {course.instructor || course.provider}
                        </span>
                      </div>
                    </div>
                  </div>

                  {onToggleFavorite && (
                    <div className="shrink-0 self-start">
                      <FavoriteButton
                        active={isFavorited}
                        onToggle={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(course.id);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Footer: Category Box + Lecture Count Box on Right & Continue Button on Left */}
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--mn-border)]/60 text-[9.5px] sm:text-[10.5px]">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--mn-page)] border border-[var(--mn-border)] text-[var(--mn-heading)] font-bold text-[9px] sm:text-[9.5px] truncate">
                      <GraduationCap className="w-3 h-3 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                      <span className="truncate">{course.category || publicT('public_academic_preparation')}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--mn-page)] border border-[var(--mn-border)] text-[var(--mn-heading)] font-bold text-[9px] sm:text-[9.5px] shrink-0">
                      <BookOpen className="w-3 h-3 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                      <span>
                        {course.lessonsCount || 8} {publicT('public_lectures')}
                      </span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(course);
                    }}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-[var(--mn-primary)] hover:bg-[#1a3777] text-white rounded-lg sm:rounded-xl text-[9.5px] sm:text-[10.5px] font-bold active:scale-95 transition-all shadow-2xs mn-inverse cursor-pointer"
                    data-mn-design="26ecd1db9e"
                  >
                    <PlayCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#E5B54F]" />
                    <span>{publicT('public_continue_course')}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredCourses.length > 0 && (
          <div className="col-span-full">
            <PublicCardsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              dir={publicDir}
            />
          </div>
        )}

        {/* Empty State */}
        {filteredCourses.length === 0 && (
          <div className="col-span-full bg-[var(--mn-surface)] rounded-3xl border border-dashed border-[var(--mn-border)] p-8 text-center space-y-3 mn-panel">
            <BookOpen className="w-10 h-10 mx-auto text-[#142B5F] dark:text-[#E5B54F]" />
            <h3 className="text-sm font-bold text-[var(--mn-heading)]">{publicT('public_no_matching_courses_found')}</h3>
            <p className="text-[11px] text-[var(--mn-text-muted)]">{publicT('public_try_changing_your_search_terms_or_resetting_the')}</p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--mn-primary)] text-white text-[11px] font-bold mn-inverse cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{publicT('public_reset_filters_2')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
