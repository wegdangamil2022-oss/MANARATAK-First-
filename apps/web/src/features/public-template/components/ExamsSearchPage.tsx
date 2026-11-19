import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import { ApiClient } from '../../../api/client';
import { mapExam } from '../publicLiveDataSource';
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronDown, Award, Search, X, Clock, ShieldCheck, Globe2, Sparkles, RotateCcw, Filter, Check, Coins, Heart } from 'lucide-react';
import { Exam } from '../types';
import { FavoriteButton } from './FavoriteButton';
import { ExamVectorLogo } from './FeaturedExams';
import { PublicCardsPagination, PublicFilterSelectModal, usePaginatedCatalog } from './DetailUi';

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

const DEFAULT_EXAM_COUNTRIES = [
  'المملكة المتحدة',
  'الولايات المتحدة',
  'كندا',
  'أستراليا',
  'الصين',
  'ألمانيا',
  'ماليزيا',
  'تركيا',
];

function extractExamCountries(exam: Exam): string[] {
  const result = new Set<string>();

  exam.relatedCountries?.forEach((country) => {
    if (country.name?.trim()) result.add(country.name.trim());
  });

  const id = (exam.id || exam.testCode || '').toLowerCase();
  const text = [exam.name, exam.nameEn, exam.description, ...(exam.tags || [])].join(' ');

  if (id.includes('ielts')) {
    ['المملكة المتحدة', 'الولايات المتحدة', 'كندا', 'أستراليا', 'الصين', 'ألمانيا', 'ماليزيا', 'تركيا'].forEach((c) =>
      result.add(c),
    );
  }
  if (id.includes('toefl')) {
    ['الولايات المتحدة', 'كندا', 'المملكة المتحدة', 'أستراليا', 'ألمانيا'].forEach((c) => result.add(c));
  }
  if (id.includes('sat') || id.includes('gre') || id.includes('gmat') || id.includes('usmle') || id.includes('mcat')) {
    ['الولايات المتحدة', 'كندا', 'المملكة المتحدة'].forEach((c) => result.add(c));
  }
  if (id.includes('hsk') || id.includes('csca')) {
    result.add('الصين');
  }

  if (text.includes('أمريكا') || text.includes('الولايات المتحدة')) result.add('الولايات المتحدة');
  if (text.includes('بريطانيا') || text.includes('المملكة المتحدة')) result.add('المملكة المتحدة');
  if (text.includes('كندا')) result.add('كندا');
  if (text.includes('أستراليا')) result.add('أستراليا');
  if (text.includes('الصين')) result.add('الصين');
  if (text.includes('ألمانيا')) result.add('ألمانيا');
  if (text.includes('ماليزيا')) result.add('ماليزيا');
  if (text.includes('تركيا')) result.add('تركيا');

  return Array.from(result);
}

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
  const [selectedCountry, setSelectedCountry] = useState('الكل');
  const [activeFilterModal, setActiveFilterModal] = useState<'category' | 'country' | null>(null);

  const [remote,setRemote]=useState<Exam[]>([]);const [page,setPage]=useState(1);const [total,setTotal]=useState(0);const [error,setError]=useState('');const [loading,setLoading]=useState(false);
  const exams=dataMode==='api'?remote:initialExams;
  useEffect(()=>{if(dataMode!=='api')return;let active=true;setLoading(true);setError('');const timer=setTimeout(()=>ApiClient.getInternationalTests({locale,page,pageSize:50,searchQuery:searchQuery.trim()||undefined,testCategory:selectedCategory==='الكل'?undefined:selectedCategory}).then(result=>{if(active){setRemote(result.data.map(mapExam));setTotal(result.total);setLoading(false);}}).catch(err=>{if(active){setError(err.message);setLoading(false);}}),200);return()=>{active=false;clearTimeout(timer);};},[dataMode,locale,page,searchQuery,selectedCategory]);
  useEffect(()=>setPage(1),[searchQuery,selectedCategory,selectedCountry]);
  // Derive categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    exams.forEach((exam) => cats.add(exam.category));
    const canonical = CANONICAL_TEST_CATEGORIES.filter((category) => cats.has(category));
    const additional = Array.from(cats).filter((category) => !CANONICAL_TEST_CATEGORIES.includes(category as (typeof CANONICAL_TEST_CATEGORIES)[number]));
    return ['الكل', ...(dataMode==='api'?CANONICAL_TEST_CATEGORIES:canonical), ...additional];
  }, [exams,dataMode]);

  // Derive countries
  const countries = useMemo(() => {
    const set = new Set<string>(DEFAULT_EXAM_COUNTRIES);
    exams.forEach((exam) => {
      extractExamCountries(exam).forEach((country) => set.add(country));
    });
    return ['الكل', ...Array.from(set)];
  }, [exams]);

  const filteredExams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const priority: Record<string, number> = { ielts: 0, hsk: 1 };
    const baseList = exams.filter((exam) => {
      const examCountries = extractExamCountries(exam);
      const matchesCountry = selectedCountry === 'الكل' || examCountries.includes(selectedCountry);
      if (dataMode === 'api') return matchesCountry;

      const searchable = [
        exam.name,
        exam.nameEn,
        exam.description,
        exam.providerName || '',
        exam.testCode || '',
        exam.scoreRange || '',
        exam.language || '',
        ...examCountries,
        ...exam.tags,
      ]
        .join(' ')
        .toLowerCase();
      const matchesQuery = !q || searchable.includes(q);
      const matchesCategory = selectedCategory === 'الكل' || exam.category === selectedCategory;
      return matchesQuery && matchesCategory && matchesCountry;
    });

    if (dataMode === 'api') return baseList;
    return baseList.sort((a, b) => (priority[a.id] ?? 99) - (priority[b.id] ?? 99));
  }, [exams, searchQuery, selectedCategory, selectedCountry, dataMode]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems: paginatedExams,
  } = usePaginatedCatalog(
    filteredExams,
    `${searchQuery}|${selectedCategory}|${selectedCountry}`,
    30,
  );

  const activeFiltersCount =
    (selectedCategory !== 'الكل' ? 1 : 0) +
    (selectedCountry !== 'الكل' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('الكل');
    setSelectedCountry('الكل');
  };

  return (
    <div
      className="min-h-screen bg-[var(--mn-page)] text-[var(--mn-heading)] pb-24 font-['Cairo',sans-serif] select-none mn-panel"
      dir={locale==='en'?'ltr':'rtl'}
    >
      {/* ========================================================================= */}
      {/* HERO SECTION - COMPACT LUXURY ARABIC DESIGN WITH GOLD ACCENTS (MATCHING SCHOLARSHIPS & MAJORS) */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-4 pb-3 overflow-hidden shadow-xs mn-inverse">
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

        {/* Background Decorative Gold Waves, Dot Grid & Architectural Silhouettes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Top-left dot grid */}
          <div className="absolute top-3 left-5 grid grid-cols-5 gap-1.5 opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[var(--mn-accent)] mn-gold" />
            ))}
          </div>

          {/* Thin gold curved orbital lines on left */}
          <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full border border-[var(--mn-accent)]/25 pointer-events-none" />
          <div className="absolute -top-6 -left-6 w-72 h-72 rounded-full border border-[var(--mn-accent)]/15 pointer-events-none" />

          {/* Architectural / Academic silhouette on right */}
          <svg
            className="absolute -right-4 bottom-0 h-40 w-40 text-white/10 pointer-events-none"
            viewBox="0 0 200 200"
            fill="currentColor"
          >
            <rect x="140" y="50" width="16" height="150" />
            <polygon points="148,25 138,50 158,50" />
            <circle cx="148" cy="20" r="3" />
            <path d="M 80,130 Q 115,70 150,130 Z" />
            <circle cx="115" cy="65" r="4" />
            <rect x="70" y="80" width="12" height="120" />
            <polygon points="76,60 68,80 84,80" />
          </svg>

          {/* Lower Curved Gold Swirl */}
          <svg
            className="absolute bottom-0 inset-x-0 w-full h-12 opacity-30"
            viewBox="0 0 500 80"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-20,70 Q250,-20 520,70"
              stroke="var(--mn-accent)"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-2 md:space-y-3 pt-1 md:pt-2">
          {/* Top 4-pointed Gold Sparkle Star */}
          <div className="flex justify-center">
            <Sparkles className="h-5 w-5 text-[var(--mn-accent-text)] drop-shadow-[0_0_8px_rgba(214,164,59,0.8)]" aria-hidden="true" />
          </div>

          {/* Main Title */}
          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[32px] font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              {publicT('public_exam_directory')}{' '}
              <span className="text-[var(--mn-accent-text)]">{publicT('public_international')}</span>
            </h1>

            {/* Small Gold Horizontal Divider */}
            <div className="flex justify-center pt-1 pb-0.5">
              <div className="w-10 md:w-14 h-0.5 bg-[var(--mn-accent)] rounded-full mn-gold" />
            </div>

            {/* Subtitle */}
            <p className="text-[11px] sm:text-xs md:text-sm text-white font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto truncate">
              {publicT('public_your_trusted_gateway_to_international_admission_prepare_for')}
            </p>
          </div>

          {/* Integrated Clean Search Bar in Hero */}
          <div className="pt-1 max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_search_for_an_exam_e_g_ielts_toefl')}
                className="w-full py-2.5 md:py-3 pl-4 pr-10 bg-[var(--mn-surface)] text-[var(--mn-heading)] rounded-full text-[12px] md:text-sm font-bold placeholder:text-[var(--mn-text-muted)] placeholder:text-[12px] md:placeholder:text-sm placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none shadow-md border border-[var(--mn-border)] focus:border-[var(--mn-accent)] transition-all text-center font-['Cairo',sans-serif] mn-panel"
              />
              <Search className="w-4 h-4 text-[var(--mn-accent-text)] absolute right-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--mn-text-muted)] hover:text-[var(--mn-text)] cursor-pointer"
                  title="مسح البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reset Filter Button if active */}
        {activeFiltersCount > 0 && (
          <div className="flex justify-center mt-2 relative z-10">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[10px] font-bold text-[var(--mn-danger-text)] hover:text-[var(--mn-danger-text)] bg-[var(--mn-surface-elevated)]/95 px-2.5 py-0.5 rounded-full shadow-xs transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif] mn-panel"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة تعيين الفلاتر ({activeFiltersCount})</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2 SEPARATE FLOATING FILTER TILES INSIDE HERO                              */}
        {/* ========================================================================= */}
        <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto mn-inline-gutter mt-2.5 md:mt-3.5 relative z-20 pb-0">
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:gap-3.5">
            {/* Tile 1: تصنيف الاختبار */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFilterModal('category');
                }
              }}
              onClick={() => setActiveFilterModal('category')}
              className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer mn-panel font-['Cairo',sans-serif]"
              title="اختر تصنيف الاختبار"
            >
              <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-bold text-[11px] sm:text-xs leading-tight font-['Cairo',sans-serif] w-full">
                <Award className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="truncate font-['Cairo',sans-serif]">
                  {selectedCategory === 'الكل' ? 'تصنيف الاختبار' : (CATEGORY_LABELS[selectedCategory] ?? selectedCategory)}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)] mt-0.5 shrink-0" />
            </div>

            {/* Tile 2: الفلتر حسب الدولة */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFilterModal('country');
                }
              }}
              onClick={() => setActiveFilterModal('country')}
              className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer mn-panel font-['Cairo',sans-serif]"
              title="اختر الدولة"
            >
              <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-bold text-[11px] sm:text-xs leading-tight font-['Cairo',sans-serif] w-full">
                <Globe2 className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="truncate font-['Cairo',sans-serif]">
                  {selectedCountry === 'الكل' ? 'حسب الدولة' : selectedCountry}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)] mt-0.5 shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* Gold Divider Ribbon Line */}
      <div className="w-full h-0.5 bg-gradient-to-r from-[var(--mn-accent-text)] via-[var(--mn-accent-soft)] to-[var(--mn-accent-text)] shadow-xs mb-1" />

      {/* ========================================================================= */}
      {/* EXAMS DIRECTORY RESULTS GRID                                              */}
      {/* ========================================================================= */}
      <div className="max-w-3xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto mn-inline-gutter pt-3 md:pt-5 font-['Cairo',sans-serif]">
        {/* Results Counter Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 md:mb-4 px-1 text-xs md:text-sm text-[var(--mn-text-muted)]">
          <span className="font-bold text-[12px] md:text-sm text-[var(--mn-heading)]">
            عرض {filteredExams.length} اختبار دولي معتمد
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedCategory !== 'الكل' && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#142B5F] dark:text-[#E0B244] bg-[#142B5F]/10 dark:bg-white/10 px-2 py-0.5 rounded-md">
                التصنيف: {CATEGORY_LABELS[selectedCategory] ?? selectedCategory}
              </span>
            )}
            {selectedCountry !== 'الكل' && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#142B5F] dark:text-[#E0B244] bg-[#142B5F]/10 dark:bg-white/10 px-2 py-0.5 rounded-md">
                الدولة: {selectedCountry}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch w-full pb-2">
          {paginatedExams.map((exam) => {
            const isFav = favoriteIds.includes(exam.id);
            return (
              <div
                key={exam.id}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectExam?.(exam);
                  }
                }}
                onClick={() => onSelectExam?.(exam)}
                className="bg-[var(--mn-surface)] rounded-xl sm:rounded-2xl border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] active:border-[#142B5F] shadow-sm transition-all duration-150 active:scale-[0.985] p-2.5 sm:p-3 md:p-4 relative overflow-hidden group cursor-pointer flex flex-col justify-between gap-2 sm:gap-2.5 h-full select-none mn-panel"
              >
                {/* Gold gradient accent line on hover */}
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#142B5F] dark:from-[#D6A43B] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Top Row: Circular Exam Logo + Exam Names & Category Badge | Favorite Button */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-2.5 text-start min-w-0 flex-1">
                    {/* Circular Logo Badge - Full bleed inside circle with light Royal Navy border */}
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-[#142B5F]/30 dark:border-[#D6A43B]/45 shadow-2xs shrink-0 flex items-center justify-center bg-[var(--mn-surface)]">
                      <ExamVectorLogo name={exam.nameEn || exam.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex flex-col items-start text-start min-w-0 flex-1">
                      <div className="flex items-center gap-2 w-full">
                        <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-['Cairo',sans-serif] leading-tight truncate">
                          {exam.name}
                        </h3>
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-[#142B5F]/10 dark:bg-white/10 text-[#142B5F] dark:text-[#E5B54F] text-[9.5px] sm:text-[10px] font-bold">
                          {CATEGORY_LABELS[exam.category] ?? exam.category}
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-medium text-[var(--mn-text-muted)] font-['Cairo',sans-serif] truncate w-full">
                        {exam.nameEn}{exam.providerName ? ` · ${exam.providerName}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Favorite Button */}
                  {onToggleFavorite && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(exam.id);
                      }}
                      className="w-8 h-8 rounded-full bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)] border border-[var(--mn-border)] flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs shrink-0 mn-panel hover:mn-panel"
                      title={publicT('public_add_to_favorites')}
                    >
                      <Heart
                        className={`w-4 h-4 ${isFav ? 'fill-[var(--mn-accent)] text-[var(--mn-accent-text)]' : 'text-[var(--mn-text-muted)]'}`}
                      />
                    </button>
                  )}
                </div>

                {/* Bottom Row: 4 Pill Badges (Score • Validity • Fees/Duration • CTA View Details) in 2x2 Grid with right-aligned parallel icons */}
                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[var(--mn-border)]/50">
                  {/* 1. الدرجة والمقياس */}
                  <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-3 pl-2 py-1.5 flex items-center justify-start gap-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel">
                    <Award className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#239BA6] shrink-0" />
                    <span className="truncate">{exam.scoreRange || 'مقياس معتمد'}</span>
                  </div>

                  {/* 2. الصلاحية */}
                  <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-3 pl-2 py-1.5 flex items-center justify-start gap-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#239BA6] shrink-0" />
                    <span className="truncate">{exam.validity || 'سنتان'}</span>
                  </div>

                  {/* 3. الرسوم أو المدة */}
                  <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-3 pl-2 py-1.5 flex items-center justify-start gap-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel">
                    <Coins className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#239BA6] shrink-0" />
                    <span className="truncate">{exam.feeSummary || exam.duration || 'رسوم متغيرة'}</span>
                  </div>

                  {/* 4. زر عرض التفاصيل */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectExam?.(exam);
                    }}
                    className="bg-[var(--mn-primary)] hover:bg-[var(--mn-primary)] text-white rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs mn-inverse hover:mn-inverse"
                  >
                    <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight text-[var(--mn-accent-soft)]">
                      {publicT('public_view_details')}
                    </span>
                    <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-[var(--mn-accent-soft)]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredExams.length > 0 && (
          <PublicCardsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(nextPage) => {
              setCurrentPage(nextPage);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            dir={locale === 'en' ? 'ltr' : 'rtl'}
          />
        )}
        {dataMode==='api'&&<div><p role="status">{loading?(locale==='en'?'Loading…':publicT('public_loading_2')):total}</p>{error&&<p role="alert">{error}</p>}<button type="button" disabled={loading||page<=1} onClick={()=>setPage(p=>p-1)}>{locale==='en'?'Previous':publicT('public_previous')}</button><span>{page}</span><button type="button" disabled={loading||page*50>=total} onClick={()=>setPage(p=>p+1)}>{locale==='en'?'Next':publicT('public_next')}</button></div>}
        {filteredExams.length === 0 && (
          <div className="bg-[var(--mn-surface)] border border-dashed border-[var(--mn-border)] rounded-2xl p-6 text-center text-xs font-bold text-[var(--mn-text-muted)] mn-panel">{publicT('public_no_exams_match_this_search')}</div>
        )}
      </div>

      <PublicFilterSelectModal
        isOpen={activeFilterModal === 'category'}
        title="اختر تصنيف الاختبار"
        icon={Award}
        selectedValue={selectedCategory}
        onSelect={(val) => setSelectedCategory(val)}
        onClose={() => setActiveFilterModal(null)}
        options={categories.map((cat) => ({
          value: cat,
          label: cat === 'الكل' ? 'جميع التصنيفات' : (CATEGORY_LABELS[cat] ?? cat),
        }))}
      />

      <PublicFilterSelectModal
        isOpen={activeFilterModal === 'country'}
        title="اختر الدولة"
        icon={Globe2}
        selectedValue={selectedCountry}
        onSelect={(val) => setSelectedCountry(val)}
        onClose={() => setActiveFilterModal(null)}
        options={countries.map((country) => ({
          value: country,
          label: country === 'الكل' ? 'جميع الدول' : country,
        }))}
      />
    </div>
  );
};
