import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import { ApiClient } from '../../../api/client';
import { mapExam } from '../publicLiveDataSource';
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Award, Search, X, Clock, ShieldCheck, Languages } from 'lucide-react';
import { Exam } from '../types';
import { FavoriteButton } from './FavoriteButton';

interface ExamsSearchPageProps {
  exams?: Exam[];
  dataMode?:'api'|'prototype';
  locale?:'ar'|'en';
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
  exams: initialExams = [], dataMode='prototype',locale='ar',
  onBack,
  onSelectExam,
  initialQuery = '',
  favoriteIds = [],
  onToggleFavorite,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('الكل');

  const [remote,setRemote]=useState<Exam[]>([]);const [page,setPage]=useState(1);const [total,setTotal]=useState(0);const [error,setError]=useState('');const [loading,setLoading]=useState(false);
  const exams=dataMode==='api'?remote:initialExams;
  useEffect(()=>{if(dataMode!=='api')return;let active=true;setLoading(true);setError('');const timer=setTimeout(()=>ApiClient.getInternationalTests({locale,page,pageSize:50,searchQuery:searchQuery.trim()||undefined,testCategory:selectedCategory==='الكل'?undefined:selectedCategory}).then(result=>{if(active){setRemote(result.data.map(mapExam));setTotal(result.total);setLoading(false);}}).catch(err=>{if(active){setError(err.message);setLoading(false);}}),200);return()=>{active=false;clearTimeout(timer);};},[dataMode,locale,page,searchQuery,selectedCategory]);
  useEffect(()=>setPage(1),[searchQuery,selectedCategory]);
  // Derive categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    exams.forEach((exam) => cats.add(exam.category));
    const canonical = CANONICAL_TEST_CATEGORIES.filter((category) => cats.has(category));
    const additional = Array.from(cats).filter((category) => !CANONICAL_TEST_CATEGORIES.includes(category as (typeof CANONICAL_TEST_CATEGORIES)[number]));
    return ['الكل', ...(dataMode==='api'?CANONICAL_TEST_CATEGORIES:canonical), ...additional];
  }, [exams,dataMode]);

  const filteredExams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const priority: Record<string, number> = { ielts: 0, hsk: 1 };
    if(dataMode==='api')return exams;
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
  }, [exams, searchQuery, selectedCategory,dataMode]);

  return (
    <div
      className="min-h-screen bg-[var(--ab-page)] text-[var(--ab-heading)] pb-24 font-['Cairo',sans-serif] select-none ab-panel "
      dir={locale==='en'?'ltr':'rtl'}
    >
      {/* ========================================================================= */}
      {/* HERO SECTION - ELEGANT INTERNATIONAL EXAMS THEME */}
      {/* ========================================================================= */}
      <div className="relative ab-search-hero text-white px-3 sm:px-4 pt-4 pb-12 sm:pb-14 overflow-hidden shadow-xs border-b border-[var(--ab-accent)]/20 ab-inverse ">
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
                stroke="var(--ab-accent)"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M-20,120 Q150,40 300,140 T600,100"
                stroke="var(--ab-accent)"
                strokeWidth="1"
                fill="none"
              />
              <circle cx="30" cy="30" r="1" fill="var(--ab-accent)" />
              <circle cx="45" cy="30" r="1" fill="var(--ab-accent)" />
              <circle cx="60" cy="30" r="1" fill="var(--ab-accent)" />
              <circle cx="30" cy="45" r="1" fill="var(--ab-accent)" />
              <circle cx="45" cy="45" r="1" fill="var(--ab-accent)" />
              <circle cx="60" cy="45" r="1" fill="var(--ab-accent)" />
            </svg>
          </div>

          {/* Subtle Floating Elements: Falling Exam Names */}

          <div
            className="falling-text ab-anim-10-delay-2 text-3xl left-[10%]"
          >
            IELTS
          </div>
          <div
            className="falling-text ab-anim-15-delay-7 text-5xl left-[25%]"
          >
            TOEFL
          </div>
          <div
            className="falling-text ab-anim-12-delay-4 text-2xl left-[45%]"
          >
            SAT
          </div>
          <div
            className="falling-text ab-anim-14-delay-9 text-4xl left-[65%]"
          >
            GRE
          </div>
          <div
            className="falling-text ab-anim-11-delay-1 text-3xl left-[85%]"
          >
            GMAT
          </div>
          <div
            className="falling-text ab-anim-13-delay-11 text-2xl left-[15%]"
          >
            PTE
          </div>
          <div
            className="falling-text ab-anim-16-delay-5 text-4xl left-[75%]"
          >
            STEP
          </div>
        </div>

        {/* Top-Right Circular Back Button */}
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

        {/* Content */}
        <div className="max-w-md sm:max-w-xl mx-auto text-center relative z-10 space-y-3 pt-6">
          {/* Main Title Container */}
          <div className="relative inline-block mb-2">
            <div className="absolute -inset-x-6 -inset-y-3 bg-[var(--ab-accent)]/10 blur-xl rounded-full" />
            <h1 className="relative text-2xl sm:text-3xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">{publicT('public_exam_directory')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--ab-accent-soft)] to-[var(--ab-accent-soft)] ab-gold ">{publicT('public_international')}</span>
            </h1>
          </div>

          {/* Divider */}
          <div className="flex justify-center items-center gap-2 pt-1 pb-2">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[var(--ab-accent-soft)]/50" />
            <Award className="w-4 h-4 text-[var(--ab-accent-text)]" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[var(--ab-accent-soft)]/50" />
          </div>

          {/* Subtitle / Beautiful Copywriting */}
          <p className="text-[13px] sm:text-sm text-[var(--ab-on-dark-muted)] font-medium font-['Cairo',sans-serif] leading-relaxed max-w-[90%] mx-auto drop-shadow-md">{publicT('public_your_trusted_gateway_to_international_admission_prepare_for')}</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEARCH & FILTERS SECTION (Overlapping the hero slightly)                  */}
      {/* ========================================================================= */}
      <div className="max-w-3xl mx-auto ab-inline-gutter -mt-6 relative z-20">
        {/* Search Bar Container */}
        <div className="bg-[var(--ab-surface)] rounded-2xl shadow-lg border border-[var(--ab-border)] p-2 sm:p-3 flex flex-col gap-3 ab-panel ">
          {/* Search Input */}
          <div className="relative flex items-center w-full bg-[var(--ab-page)] border border-[var(--ab-border)] rounded-xl overflow-hidden focus-within:border-[var(--ab-accent)] focus-within:ring-1 focus-within:ring-[var(--ab-focus)] transition-all ab-panel ">
            <div className="pl-3 pr-3 text-[var(--ab-text-muted)]">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <input
              type="text"
              placeholder={publicT('public_search_for_an_exam_e_g_ielts_toefl')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent py-2.5 sm:py-3 text-[13px] sm:text-sm text-[var(--ab-heading)] outline-none placeholder:text-[var(--ab-text-muted)] font-medium w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="pl-3 pr-2 text-[var(--ab-text-muted)] hover:text-[var(--ab-text-muted)] transition-colors"
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
                    ? 'bg-[var(--ab-primary)] text-[var(--ab-accent-text)] shadow-md border border-[var(--ab-border-brand)] ab-inverse '
                    : 'bg-[var(--ab-surface)] border border-[var(--ab-border)] text-[var(--ab-text-muted)] hover:bg-[var(--ab-page)] ab-panel hover:ab-panel '
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto ab-inline-gutter pt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredExams.map((exam) => (
            <article
              key={exam.id}
              onClick={() => onSelectExam?.(exam)}
              className="min-h-[168px] bg-[var(--ab-surface)] border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-2xl p-4 text-start shadow-sm hover:shadow-md active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden ab-panel "
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
              <div className="absolute -left-8 -top-8 w-24 h-24 rounded-full bg-[var(--ab-primary)]/5 pointer-events-none" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[var(--ab-primary)]/8 border border-[var(--ab-border-brand)]/20 flex items-center justify-center shrink-0">
                    <Award className="w-[18px] h-[18px] text-[var(--ab-heading)]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-bold leading-5 text-[var(--ab-heading)]">{exam.name}</h3>
                    <p className="text-[10px] font-bold text-[var(--ab-accent-text)] mt-0.5">{exam.nameEn}</p>
                    {exam.providerName && (
                      <p className="text-[8.5px] font-semibold text-[var(--ab-text-muted)] mt-1 line-clamp-1">{exam.providerName}</p>
                    )}
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full bg-[var(--ab-primary)]/8 text-[8.5px] font-bold text-[var(--ab-heading)] whitespace-nowrap">
                  {exam.category}
                </span>
              </div>

              {(exam.scoreRange || exam.duration || exam.validity || exam.language) && (
                <div className="relative grid grid-cols-2 gap-1.5 mt-3">
                  <div className="rounded-lg border border-[var(--ab-border)] bg-[var(--ab-page)] px-2 py-1.5 flex items-center gap-1.5 ab-panel ">
                    <Award className="w-3 h-3 text-[var(--ab-accent-text)] shrink-0" />
                    <span className="text-[8.5px] font-bold text-[var(--ab-text)] truncate">{exam.scoreRange || publicT('public_score_depends_on_the_exam')}</span>
                  </div>
                  <div className="rounded-lg border border-[var(--ab-border)] bg-[var(--ab-page)] px-2 py-1.5 flex items-center gap-1.5 ab-panel ">
                    <Clock className="w-3 h-3 text-[var(--ab-heading)] shrink-0" />
                    <span className="text-[8.5px] font-bold text-[var(--ab-text)] truncate">{exam.duration || publicT('public_variable_duration')}</span>
                  </div>
                  <div className="rounded-lg border border-[var(--ab-border)] bg-[var(--ab-page)] px-2 py-1.5 flex items-center gap-1.5 ab-panel ">
                    <ShieldCheck className="w-3 h-3 text-[var(--ab-accent-text)] shrink-0" />
                    <span className="text-[8.5px] font-bold text-[var(--ab-text)] truncate">{exam.validity || publicT('public_depends_on_the_organization')}</span>
                  </div>
                  <div className="rounded-lg border border-[var(--ab-border)] bg-[var(--ab-page)] px-2 py-1.5 flex items-center gap-1.5 ab-panel ">
                    <Languages className="w-3 h-3 text-[var(--ab-heading)] shrink-0" />
                    <span className="text-[8.5px] font-bold text-[var(--ab-text)] truncate">{exam.language || exam.category}</span>
                  </div>
                </div>
              )}

              <p className="relative text-[10px] font-semibold text-[var(--ab-text-muted)] leading-5 mt-2.5 line-clamp-2">{exam.description}</p>
              {exam.feeSummary && (
                <div className="relative mt-2 rounded-lg border border-[var(--ab-accent)]/15 bg-[var(--ab-accent)]/5 px-2 py-1.5 text-[8.5px] font-bold text-[var(--ab-text-muted)]">{publicT('public_fees')}{' '}{exam.feeSummary}
                </div>
              )}
              <div className="relative flex items-center justify-between gap-2 mt-2.5">
                <div className="flex flex-wrap gap-1">
                  {exam.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded-full bg-[var(--ab-page)] border border-[var(--ab-border)] text-[8px] font-bold text-[var(--ab-text-muted)] ab-panel ">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-[9px] font-bold text-[var(--ab-heading)] whitespace-nowrap flex items-center gap-0.5">{publicT('public_view_details')}<ChevronLeft className="w-3 h-3" />
                </span>
              </div>
            </article>
          ))}
        </div>
        {dataMode==='api'&&<div><p role="status">{loading?(locale==='en'?'Loading…':publicT('public_loading_2')):total}</p>{error&&<p role="alert">{error}</p>}<button type="button" disabled={loading||page<=1} onClick={()=>setPage(p=>p-1)}>{locale==='en'?'Previous':publicT('public_previous')}</button><span>{page}</span><button type="button" disabled={loading||page*50>=total} onClick={()=>setPage(p=>p+1)}>{locale==='en'?'Next':publicT('public_next')}</button></div>}
        {filteredExams.length === 0 && (
          <div className="bg-[var(--ab-surface)] border border-dashed border-[var(--ab-border)] rounded-2xl p-6 text-center text-xs font-bold text-[var(--ab-text-muted)] ab-panel ">{publicT('public_no_exams_match_this_search')}</div>
        )}
      </div>
    </div>
  );
};
