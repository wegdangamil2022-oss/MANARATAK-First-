import React, { useState, useMemo } from 'react';
import { ChevronLeft, Award, Search, X, Clock, ShieldCheck, Languages } from 'lucide-react';
import { Exam } from '../types';
import { FavoriteButton } from './FavoriteButton';

interface ExamsSearchPageProps {
  exams?: Exam[];
  onBack?: () => void;
  onSelectExam?: (exam: Exam) => void;
  initialQuery?: string;
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
}

const CANONICAL_TEST_CATEGORIES = [
  'ENGLISH_LANGUAGE',
  'NON_ENGLISH_LANGUAGE',
  'GENERAL_UNDERGRADUATE_ADMISSION',
  'GRADUATE_ADMISSION',
  'NATIONAL_INTERNATIONAL_ADMISSION',
  'SPECIALIZED_ADMISSION',
  'PROFESSIONAL_LICENSING_CERTIFICATION',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  ENGLISH_LANGUAGE: 'اللغة الإنجليزية',
  NON_ENGLISH_LANGUAGE: 'لغات أخرى',
  GENERAL_UNDERGRADUATE_ADMISSION: 'قبول البكالوريوس',
  GRADUATE_ADMISSION: 'الدراسات العليا',
  NATIONAL_INTERNATIONAL_ADMISSION: 'قبول وطني ودولي',
  SPECIALIZED_ADMISSION: 'قبول تخصصي',
  PROFESSIONAL_LICENSING_CERTIFICATION: 'ترخيص وشهادات مهنية',
};

export const ExamsSearchPage: React.FC<ExamsSearchPageProps> = ({
  exams = [],
  onBack,
  onSelectExam,
  initialQuery = '',
  favoriteIds = [],
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('الكل');

  // Derive categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    exams.forEach((exam) => cats.add(exam.category));
    const canonical = CANONICAL_TEST_CATEGORIES.filter((category) => cats.has(category));
    const additional = Array.from(cats).filter((category) => !CANONICAL_TEST_CATEGORIES.includes(category as (typeof CANONICAL_TEST_CATEGORIES)[number]));
    return ['الكل', ...canonical, ...additional];
  }, [exams]);

  const filteredExams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const priority: Record<string, number> = { ielts: 0, hsk: 1 };
    return exams
      .filter((exam) => {
        const searchable = [
          exam.name,
          exam.nameEn,
          exam.description,
          exam.providerName || '',
          exam.testCode || '',
          exam.scoreRange || '',
          exam.language || '',
          ...exam.tags,
        ]
          .join(' ')
          .toLowerCase();
        const matchesQuery = !q || searchable.includes(q);
        const matchesCategory = selectedCategory === 'الكل' || exam.category === selectedCategory;
        return matchesQuery && matchesCategory;
      })
      .sort((a, b) => (priority[a.id] ?? 99) - (priority[b.id] ?? 99));
  }, [exams, searchQuery, selectedCategory]);

  return (
    <div
      className="min-h-screen bg-[var(--mn-page)] text-[var(--mn-heading)] pb-24 font-['Cairo',sans-serif] select-none mn-panel "
      dir="rtl"
    >
      {/* ========================================================================= */}
      {/* HERO SECTION - ELEGANT INTERNATIONAL EXAMS THEME */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-4 pb-12 sm:pb-14 overflow-hidden shadow-xs border-b border-[var(--mn-accent)]/20 mn-inverse ">
        {/* Animated Background Elements - Creative Concept: Floating Navigation & Academic Symbols */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Background Decorative Gold Waves & Dot Patterns from Majors Page */}
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

          {/* Subtle Floating Elements: Falling Exam Names */}

          <div
            className="falling-text mn-anim-10-delay-2 text-3xl left-[10%]"
          >
            IELTS
          </div>
          <div
            className="falling-text mn-anim-15-delay-7 text-5xl left-[25%]"
          >
            TOEFL
          </div>
          <div
            className="falling-text mn-anim-12-delay-4 text-2xl left-[45%]"
          >
            SAT
          </div>
          <div
            className="falling-text mn-anim-14-delay-9 text-4xl left-[65%]"
          >
            GRE
          </div>
          <div
            className="falling-text mn-anim-11-delay-1 text-3xl left-[85%]"
          >
            GMAT
          </div>
          <div
            className="falling-text mn-anim-13-delay-11 text-2xl left-[15%]"
          >
            PTE
          </div>
          <div
            className="falling-text mn-anim-16-delay-5 text-4xl left-[75%]"
          >
            STEP
          </div>
        </div>

        {/* Top-Right Circular Back Button */}
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

        {/* Content */}
        <div className="max-w-md sm:max-w-xl mx-auto text-center relative z-10 space-y-3 pt-6">
          {/* Main Title Container */}
          <div className="relative inline-block mb-2">
            <div className="absolute -inset-x-6 -inset-y-3 bg-[var(--mn-accent)]/10 blur-xl rounded-full" />
            <h1 className="relative text-2xl sm:text-3xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              دليل الاختبارات{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--mn-accent-soft)] to-[var(--mn-accent-soft)] mn-gold ">
                الدولية
              </span>
            </h1>
          </div>

          {/* Divider */}
          <div className="flex justify-center items-center gap-2 pt-1 pb-2">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[var(--mn-accent-soft)]/50" />
            <Award className="w-4 h-4 text-[var(--mn-accent-text)]" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[var(--mn-accent-soft)]/50" />
          </div>

          {/* Subtitle / Beautiful Copywriting */}
          <p className="text-[13px] sm:text-sm text-[var(--mn-on-dark-muted)] font-medium font-['Cairo',sans-serif] leading-relaxed max-w-[90%] mx-auto drop-shadow-md">
            بوابتك الموثوقة للقبول العالمي. استعد لاختبارات اللغة والقدرات العالمية، واكتشف المعايير
            التي تفتح لك أبواب أرقى الجامعات في العالم.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEARCH & FILTERS SECTION (Overlapping the hero slightly)                  */}
      {/* ========================================================================= */}
      <div className="max-w-3xl mx-auto mn-inline-gutter -mt-6 relative z-20">
        {/* Search Bar Container */}
        <div className="bg-[var(--mn-surface)] rounded-2xl shadow-lg border border-[var(--mn-border)] p-2 sm:p-3 flex flex-col gap-3 mn-panel ">
          {/* Search Input */}
          <div className="relative flex items-center w-full bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-xl overflow-hidden focus-within:border-[var(--mn-accent)] focus-within:ring-1 focus-within:ring-[var(--mn-focus)] transition-all mn-panel ">
            <div className="pl-3 pr-3 text-[var(--mn-text-muted)]">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <input
              type="text"
              placeholder="ابحث عن اختبار (مثال: IELTS, TOEFL, SAT)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent py-2.5 sm:py-3 text-[13px] sm:text-sm text-[var(--mn-heading)] outline-none placeholder:text-[var(--mn-text-muted)] font-medium w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="pl-3 pr-2 text-[var(--mn-text-muted)] hover:text-[var(--mn-text-muted)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-[var(--mn-primary)] text-[var(--mn-accent-text)] shadow-md border border-[var(--mn-border-brand)] mn-inverse '
                    : 'bg-[var(--mn-surface)] border border-[var(--mn-border)] text-[var(--mn-text-muted)] hover:bg-[var(--mn-page)] mn-panel hover:mn-panel '
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto mn-inline-gutter pt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredExams.map((exam) => (
            <article
              key={exam.id}
              onClick={() => onSelectExam?.(exam)}
              className="min-h-[168px] bg-[var(--mn-surface)] border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-2xl p-4 text-right shadow-sm hover:shadow-md active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden mn-panel "
            >
              {onToggleFavorite && (
                <FavoriteButton
                  active={favoriteIds.includes(exam.id)}
                  onToggle={(event) => {
                    event.stopPropagation();
                    onToggleFavorite(exam.id);
                  }}
                  className="absolute left-3 top-3 z-10"
                />
              )}
              <div className="absolute -left-8 -top-8 w-24 h-24 rounded-full bg-[var(--mn-primary)]/5 pointer-events-none" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[var(--mn-primary)]/8 border border-[var(--mn-border-brand)]/20 flex items-center justify-center shrink-0">
                    <Award className="w-[18px] h-[18px] text-[var(--mn-heading)]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-bold leading-5 text-[var(--mn-heading)]">{exam.name}</h3>
                    <p className="text-[10px] font-bold text-[var(--mn-accent-text)] mt-0.5">{exam.nameEn}</p>
                    {exam.providerName && (
                      <p className="text-[8.5px] font-semibold text-[var(--mn-text-muted)] mt-1 line-clamp-1">{exam.providerName}</p>
                    )}
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full bg-[var(--mn-primary)]/8 text-[8.5px] font-bold text-[var(--mn-heading)] whitespace-nowrap">
                  {exam.category}
                </span>
              </div>

              {(exam.scoreRange || exam.duration || exam.validity || exam.language) && (
                <div className="relative grid grid-cols-2 gap-1.5 mt-3">
                  <div className="rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-2 py-1.5 flex items-center gap-1.5 mn-panel ">
                    <Award className="w-3 h-3 text-[var(--mn-accent-text)] shrink-0" />
                    <span className="text-[8.5px] font-bold text-[var(--mn-text)] truncate">{exam.scoreRange || 'الدرجة حسب الاختبار'}</span>
                  </div>
                  <div className="rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-2 py-1.5 flex items-center gap-1.5 mn-panel ">
                    <Clock className="w-3 h-3 text-[var(--mn-heading)] shrink-0" />
                    <span className="text-[8.5px] font-bold text-[var(--mn-text)] truncate">{exam.duration || 'مدة متغيرة'}</span>
                  </div>
                  <div className="rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-2 py-1.5 flex items-center gap-1.5 mn-panel ">
                    <ShieldCheck className="w-3 h-3 text-[var(--mn-accent-text)] shrink-0" />
                    <span className="text-[8.5px] font-bold text-[var(--mn-text)] truncate">{exam.validity || 'حسب الجهة'}</span>
                  </div>
                  <div className="rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-2 py-1.5 flex items-center gap-1.5 mn-panel ">
                    <Languages className="w-3 h-3 text-[var(--mn-heading)] shrink-0" />
                    <span className="text-[8.5px] font-bold text-[var(--mn-text)] truncate">{exam.language || exam.category}</span>
                  </div>
                </div>
              )}

              <p className="relative text-[10px] font-semibold text-[var(--mn-text-muted)] leading-5 mt-2.5 line-clamp-2">{exam.description}</p>
              {exam.feeSummary && (
                <div className="relative mt-2 rounded-lg border border-[var(--mn-accent)]/15 bg-[var(--mn-accent)]/5 px-2 py-1.5 text-[8.5px] font-bold text-[var(--mn-text-muted)]">
                  الرسوم: {exam.feeSummary}
                </div>
              )}
              <div className="relative flex items-center justify-between gap-2 mt-2.5">
                <div className="flex flex-wrap gap-1">
                  {exam.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded-full bg-[var(--mn-page)] border border-[var(--mn-border)] text-[8px] font-bold text-[var(--mn-text-muted)] mn-panel ">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-[9px] font-bold text-[var(--mn-heading)] whitespace-nowrap flex items-center gap-0.5">
                  عرض التفاصيل
                  <ChevronLeft className="w-3 h-3" />
                </span>
              </div>
            </article>
          ))}
        </div>
        {filteredExams.length === 0 && (
          <div className="bg-[var(--mn-surface)] border border-dashed border-[var(--mn-border)] rounded-2xl p-6 text-center text-xs font-bold text-[var(--mn-text-muted)] mn-panel ">
            لا توجد اختبارات مطابقة لهذا البحث.
          </div>
        )}
      </div>
    </div>
  );
};
