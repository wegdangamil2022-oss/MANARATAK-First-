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
  Clock,
  Users,
  Star,
  PlayCircle,
  Award,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import type { Course } from '../types';
import { FavoriteButton } from './FavoriteButton';

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

  // Extract available categories dynamically
  const categories = useMemo(() => {
    const set = new Set<string>();
    rawCourses.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return ['الكل', ...Array.from(set)];
  }, [rawCourses]);

  // Extract available levels
  const levels = useMemo(() => {
    const set = new Set<string>();
    rawCourses.forEach((c) => {
      if (c.level) set.add(c.level);
    });
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
      dir="rtl"
    >
      {/* ========================================================================= */}
      {/* HERO CURVED BANNER */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-4 pb-12 sm:pb-14 overflow-hidden shadow-sm mn-inverse">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-30 cursor-pointer text-white shadow-xs active:scale-95"
            title="العودة"
            aria-label="العودة"
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

        <div className="max-w-xl mx-auto text-center relative z-10 space-y-2.5">
          {/* Sparkle Icon */}
          <div className="flex justify-center -mb-1">
            <Sparkles className="h-4 w-4 text-[var(--mn-accent-text)]" aria-hidden="true" />
          </div>

          {/* Headline with Gold Curve */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-['Cairo',sans-serif] tracking-tight">
              <span>ابحث في </span>
              <span className="relative inline-block text-white">
                {pageTitle}
                {/* Gold brush accent line underneath */}
                <svg
                  className="absolute -bottom-1.5 inset-x-0 w-full h-2 text-[var(--mn-accent-text)]"
                  viewBox="0 0 100 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2,9 Q50,2 98,6"
                    stroke="var(--mn-accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-[11px] sm:text-xs text-[var(--mn-on-dark-muted)] font-medium font-['Cairo',sans-serif] mt-1.5 leading-relaxed max-w-xs sm:max-w-sm mx-auto">
              {pageSubtitle}
            </p>
          </div>

          {/* Integrated Search Bar in Hero */}
          <div className="pt-1 max-w-sm sm:max-w-md mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الدورة، المدرب، المهارة..."
                className="w-full py-2 pl-4 pr-10 bg-[var(--mn-surface)] text-[var(--mn-heading)] rounded-full text-[11px] font-bold placeholder:text-[var(--mn-text-muted)] placeholder:text-[11px] placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none shadow-md border border-[var(--mn-border)] focus:border-[var(--mn-accent)] transition-all text-center font-['Cairo',sans-serif] mn-panel"
                data-mn-design="8bba664dec"
              />
              <Search className="w-3.5 h-3.5 text-[var(--mn-accent-text)] absolute right-3.5 top-1/2 -translate-y-1/2" />
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
          <div className="flex justify-center mt-3">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[10px] sm:text-[11px] font-bold text-[var(--mn-danger-text)] bg-[var(--mn-danger-soft)] px-3 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة ضبط الفلاتر ({activeFiltersCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FLOATING FILTER CARD WITH 2 TILES (المجال • المستوى)  */}
      {/* ========================================================================= */}
      <div className="max-w-xl mx-auto mn-inline-gutter -mt-7 sm:-mt-8 relative z-20 space-y-2.5">
        <div className="bg-[var(--mn-surface)] border border-[var(--mn-accent)]/50 rounded-3xl p-2 sm:p-2.5 shadow-md mn-panel">
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {/* Tile 1: المجال / التصنيف */}
            <div className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-page)]/80 border border-[var(--mn-border)] rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-2xs transition-colors mn-panel">
              <div className="flex items-center gap-1 text-[var(--mn-heading)] font-bold text-[10px] sm:text-[11px] font-['Cairo',sans-serif] leading-tight">
                <Layers className="w-3 h-3 text-[var(--mn-accent-text)]" />
                <span className="truncate">
                  {selectedCategory === 'الكل' ? 'جميع المجالات' : selectedCategory}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] mt-1" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title="اختر المجال"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'الكل' ? 'جميع المجالات' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Tile 2: المستوى */}
            <div className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-page)]/80 border border-[var(--mn-border)] rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-2xs transition-colors mn-panel">
              <div className="flex items-center gap-1 text-[var(--mn-heading)] font-bold text-[10px] sm:text-[11px] font-['Cairo',sans-serif] leading-tight">
                <GraduationCap className="w-3 h-3 text-[var(--mn-accent-text)]" />
                <span className="truncate">
                  {selectedLevel === 'الكل' ? 'جميع المستويات' : selectedLevel}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] mt-1" />
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title="اختر المستوى"
              >
                {levels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl === 'الكل' ? 'جميع المستويات' : lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RESULTS COUNT */}
      {/* ========================================================================= */}
      <div className="max-w-xl mx-auto px-4 mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--mn-heading)]">
          <BookOpen className="w-4 h-4 text-[#142B5F] dark:text-[#E5B54F]" />
          <span>الدورات المتاحة ({filteredCourses.length})</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COURSES LIST / CARDS */}
      {/* ========================================================================= */}
      <div className="max-w-xl mx-auto px-3 sm:px-4 mt-2.5 space-y-2.5">
        {filteredCourses.map((course) => {
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
              className="bg-[var(--mn-surface)] rounded-xl sm:rounded-2xl border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] dark:hover:border-[#D6A43B] shadow-xs hover:shadow-md transition-all relative overflow-hidden group mn-panel text-right cursor-pointer select-none w-full block active:scale-[0.99]"
            >
              {/* Golden Top Line */}
              <div className="h-1 w-full bg-gradient-to-r from-[#D6A43B] via-[#F3CE74] to-[#D6A43B] shadow-2xs" />

              <div className="p-2.5 sm:p-3.5 space-y-2 sm:space-y-2.5">
                {/* Header: Image & Badges & Favorite */}
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-[var(--mn-border)] shrink-0 shadow-2xs">
                    <img
                      src={
                        course.imageUrl ||
                        'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {!course.isFree && (
                      <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-amber-600/90 text-white font-bold text-[7.5px] sm:text-[8px]">
                        مدفوعة
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="px-1.5 py-0.5 rounded-md bg-[var(--mn-page)] dark:bg-white/10 text-[var(--mn-text-muted)] font-bold text-[8.5px] sm:text-[9.5px]">
                        {course.category || 'تأهيل أكاديمي'}
                      </span>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {course.rating && (
                          <div className="flex items-center gap-0.5 sm:gap-1 text-[var(--mn-accent-text)] text-[9.5px] sm:text-[10.5px] font-bold">
                            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-[var(--mn-accent-text)]" />
                            <span>{course.rating}</span>
                          </div>
                        )}

                        {onToggleFavorite && (
                          <FavoriteButton
                            active={isFavorited}
                            onToggle={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(course.id);
                            }}
                          />
                        )}
                      </div>
                    </div>

                    <h3 className="text-[12px] sm:text-[13.5px] font-bold text-[var(--mn-heading)] mt-0.5 sm:mt-1 leading-snug group-hover:text-[var(--mn-primary)] dark:group-hover:text-[#E5B54F] transition-colors line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="text-[9.5px] sm:text-[10px] text-[var(--mn-text-muted)] font-semibold mt-0.5 truncate">
                      تقديم: {course.instructor || course.provider}
                    </p>
                  </div>
                </div>

                {/* Footer Badges & Action */}
                <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-[var(--mn-border)]/60 text-[9.5px] sm:text-[10.5px]">
                  <div className="flex items-center gap-2 sm:gap-2.5 text-[var(--mn-text-muted)] font-semibold flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#142B5F] dark:text-[#E5B54F]" />
                      <span>{course.duration || '25 ساعة'}</span>
                    </span>
                    {course.lessonsCount && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#142B5F] dark:text-[#E5B54F]" />
                        <span>{course.lessonsCount} محاضرات</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(course);
                    }}
                    className="flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-[var(--mn-primary)] hover:bg-[#1a3777] text-white rounded-lg sm:rounded-xl text-[9.5px] sm:text-[10.5px] font-bold active:scale-95 transition-all shadow-2xs mn-inverse cursor-pointer"
                    data-mn-design="26ecd1db9e"
                  >
                    <PlayCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#E5B54F]" />
                    <span>متابعة الدورة</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filteredCourses.length === 0 && (
          <div className="bg-[var(--mn-surface)] rounded-3xl border border-dashed border-[var(--mn-border)] p-8 text-center space-y-3 mn-panel">
            <BookOpen className="w-10 h-10 mx-auto text-[#142B5F] dark:text-[#E5B54F]" />
            <h3 className="text-sm font-bold text-[var(--mn-heading)]">لا توجد دورات مطابقة للبحث</h3>
            <p className="text-[11px] text-[var(--mn-text-muted)]">
              جرب تغيير كلمات البحث أو إعادة ضبط الفلاتر لعرض كافة الدورات التدريبية المتاحة.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--mn-primary)] text-white text-[11px] font-bold mn-inverse cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
