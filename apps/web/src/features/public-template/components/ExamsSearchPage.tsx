import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import { ApiClient } from '../../../api/client';
import { mapExam } from '../publicLiveDataSource';
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronDown, Award, Search, X, ShieldCheck, Globe2, Sparkles, RotateCcw, BookOpenCheck, Heart } from 'lucide-react';
import { Exam } from '../types';
import { ExamVectorLogo } from './FeaturedExams';
import { PublicCardsPagination, PublicInlineFilterPanel, usePaginatedCatalog } from './DetailUi';

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

const EXAM_TYPE_LABELS: Record<string, string> = {
  ENGLISH_LANGUAGE: 'اختبار اللغة الإنجليزية',
  NON_ENGLISH_LANGUAGE: 'اختبار لغات أخرى',
  GENERAL_UNDERGRADUATE_ADMISSION: 'اختبار قبول بكالوريوس',
  GRADUATE_ADMISSION: 'اختبار دراسات عليا',
  NATIONAL_INTERNATIONAL_ADMISSION: 'اختبار قبول دولي',
  SPECIALIZED_ADMISSION: 'اختبار قبول تخصصي',
  PROFESSIONAL_LICENSING_CERTIFICATION: 'اختبار ترخيص مهني',
  'لغة إنجليزية': 'اختبار اللغة الإنجليزية',
  'اللغة الإنجليزية': 'اختبار اللغة الإنجليزية',
  'لغة صينية': 'اختبار اللغة الصينية',
  'اللغة الصينية': 'اختبار اللغة الصينية',
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
      className="min-h-screen bg-[#F6F8FA] dark:bg-[#0A1326] text-[#203442] dark:text-[#EDF5F5] pb-24 font-['Cairo',sans-serif] select-none mn-panel dark:[--mn-border:rgba(255,255,255,0.12)]"
      dir={locale==='en'?'ltr':'rtl'}
    >
      {/* ========================================================================= */}
      {/* HERO SECTION - COMPACT MANARATAK DESIGN (MATCHING SCHOLARSHIPS & MAJORS)  */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-2.5 pb-2.5 sm:pt-4 sm:pb-3 overflow-hidden shadow-xs mn-inverse">
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
          <div className="absolute top-3 left-5 grid grid-cols-5 gap-1.5 opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[#F2CD78]" />
            ))}
          </div>

          <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full border border-[#D6A43B]/20 pointer-events-none" />
          <div className="absolute -top-6 -left-6 w-72 h-72 rounded-full border border-[#34BFC9]/15 pointer-events-none" />

          <svg
            className="absolute -right-4 bottom-0 h-36 w-36 text-white/10 pointer-events-none"
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

          <svg
            className="absolute bottom-0 inset-x-0 w-full h-10 opacity-25"
            viewBox="0 0 500 80"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-20,70 Q250,-20 520,70"
              stroke="#D6A43B"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-1.5 sm:space-y-2 md:space-y-3 pt-0.5 md:pt-2">
          <div className="flex justify-center">
            <Sparkles className="h-4.5 w-4.5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#F2CD78] drop-shadow-[0_0_8px_rgba(214,164,59,0.75)]" aria-hidden="true" />
          </div>

          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              {publicT('public_exam_directory')}{' '}
              <span className="text-[#F2CD78]">{publicT('public_international')}</span>
            </h1>

            <div className="flex justify-center pt-0.5 pb-0.5 md:pt-1.5">
              <div className="w-10 md:w-14 h-0.5 bg-gradient-to-r from-[#D6A43B] via-[#F2CD78] to-[#D6A43B] rounded-full" />
            </div>

            <p className="text-[10px] sm:text-xs md:text-sm text-[#DDEFF2] font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto px-2 line-clamp-2">
              {publicT('public_your_trusted_gateway_to_international_admission_prepare_for')}
            </p>
          </div>

          {/* Integrated Clean Search Bar in Hero */}
          <div className="pt-0.5 md:pt-2 max-w-sm sm:max-w-md md:max-w-xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_search_for_an_exam_e_g_ielts_toefl')}
                className="w-full py-2 sm:py-2.5 md:py-3 pl-4 pr-10 md:pr-11 bg-white dark:bg-[#111E38] text-[#203442] dark:text-[#EDF5F5] rounded-full text-[12px] md:text-sm font-bold placeholder:text-[#5C707C] dark:placeholder:text-[#9BB4C7] placeholder:text-[12px] md:placeholder:text-sm placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none focus-visible:!outline-none shadow-md border border-[#142B5F]/12 dark:border-white/14 focus:border-[#0E7C86] dark:focus:border-[#34BFC9] transition-all text-center font-['Cairo',sans-serif] mn-panel "
                data-mn-design="cd18739893"
              />
              <Search className="w-4 h-4 md:w-4.5 md:h-4.5 text-[#0E7C86] dark:text-[#34BFC9] absolute right-3.5 md:right-4 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-[#5C707C] dark:text-[#9BB4C7] hover:text-[#142B5F] dark:hover:text-white cursor-pointer"
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
          <div className="flex justify-center mt-1.5 md:mt-2.5 relative z-10">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[10px] md:text-xs font-bold text-[#142B5F] dark:text-[#F2CD78] bg-white/95 dark:bg-[#111E38]/95 border border-[#142B5F]/15 dark:border-[#F2CD78]/30 px-2.5 md:px-3.5 py-0.5 md:py-1 rounded-full shadow-xs transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif] mn-panel"
            >
              <RotateCcw className="w-3 h-3 text-[#0E7C86] dark:text-[#34BFC9]" />
              <span>إعادة تعيين الفلاتر ({activeFiltersCount})</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2 BALANCED FILTER TILES INSIDE HERO                                       */}
        {/* ========================================================================= */}
        <div className="max-w-[320px] sm:max-w-[380px] md:max-w-[460px] mx-auto mt-2 sm:mt-2.5 md:mt-3.5 relative z-20 pb-0 md:pb-1">
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2.5 md:gap-3">
            {/* Tile 1: تصنيف الاختبار */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFilterModal((prev) => (prev === 'category' ? null : 'category'));
                }
              }}
              onClick={() => setActiveFilterModal((prev) => (prev === 'category' ? null : 'category'))}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                activeFilterModal === 'category'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedCategory !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]`}
              title="اختر تصنيف الاختبار"
            >
              <div className="min-w-0 flex items-center justify-center gap-1 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-[13px] leading-tight font-['Cairo',sans-serif] w-full">
                <Award className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                <span className="min-w-0 truncate font-['Cairo',sans-serif]">
                  {selectedCategory === 'الكل' ? 'تصنيف الاختبار' : (CATEGORY_LABELS[selectedCategory] ?? selectedCategory)}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${activeFilterModal === 'category' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </div>

            {/* Tile 2: الفلتر حسب الدولة */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFilterModal((prev) => (prev === 'country' ? null : 'country'));
                }
              }}
              onClick={() => setActiveFilterModal((prev) => (prev === 'country' ? null : 'country'))}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                activeFilterModal === 'country'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedCountry !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]`}
              title="اختر الدولة"
            >
              <div className="min-w-0 flex items-center justify-center gap-1 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-[13px] leading-tight font-['Cairo',sans-serif] w-full">
                <Globe2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                <span className="min-w-0 truncate font-['Cairo',sans-serif]">
                  {selectedCountry === 'الكل' ? 'حسب الدولة' : selectedCountry}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${activeFilterModal === 'country' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Gold Divider Ribbon Line */}
      <div className="w-full h-[1.5px] bg-gradient-to-r from-[#D6A43B]/45 via-[#F2CD78] to-[#D6A43B]/45 dark:from-[#D6A43B]/30 dark:via-[#F2CD78]/65 dark:to-[#D6A43B]/30 mb-3 md:mb-5" />

      {/* Inline Attached Filter Panels */}
      <PublicInlineFilterPanel
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

      <PublicInlineFilterPanel
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

      {/* ========================================================================= */}
      {/* EXAMS DIRECTORY RESULTS GRID                                              */}
      {/* ========================================================================= */}
      <div className="max-w-4xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1 sm:px-2 md:px-4 pt-1 space-y-3 md:space-y-4 font-['Cairo',sans-serif]">
        {/* Results Counter Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[11.5px] sm:text-[13px] md:text-sm">
            <Award className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#34BFC9]" />
            <span>عرض {filteredExams.length} اختبار دولي معتمد</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedCategory !== 'الكل' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0E7C86] dark:text-[#34BFC9] bg-[#DDEFF2]/80 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/20 dark:border-[#34BFC9]/30 px-2.5 py-0.5 rounded-full">
                التصنيف: {CATEGORY_LABELS[selectedCategory] ?? selectedCategory}
              </span>
            )}
            {selectedCountry !== 'الكل' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0E7C86] dark:text-[#34BFC9] bg-[#DDEFF2]/80 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/20 dark:border-[#34BFC9]/30 px-2.5 py-0.5 rounded-full">
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
                className="bg-white dark:bg-[#111E38] rounded-r-[4px] rounded-l-2xl border border-[#142B5F]/12 dark:border-white/10 border-r-3 border-r-[#142B5F] dark:border-r-[#F2CD78]/85 hover:border-[#142B5F]/28 dark:hover:border-[#F2CD78]/45 shadow-[0_4px_16px_rgba(20,43,95,0.04)] hover:shadow-[0_8px_24px_rgba(20,43,95,0.08)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.28)] transition-all duration-150 active:scale-[0.985] p-2.5 sm:p-3 md:p-4 relative overflow-hidden group cursor-pointer flex flex-col justify-between gap-2 sm:gap-2.5 h-full select-none mn-panel"
              >
                {/* Top Row: Natural Circular Exam Logo + Exam Names & Category Pill | Favorite Button */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-2.5 text-start min-w-0 flex-1">
                    {/* Natural Circular Exam Logo (Untinted) */}
                    <div className="w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-full overflow-hidden border border-[#142B5F]/18 dark:border-white/15 shadow-2xs shrink-0 flex items-center justify-center bg-white">
                      <ExamVectorLogo name={exam.nameEn || exam.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex flex-col items-start text-start min-w-0 flex-1">
                      <h3 className="text-[11.5px] sm:text-[13px] md:text-[13.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] group-hover:text-[#0E7C86] dark:group-hover:text-[#F2CD78] transition-colors font-['Cairo',sans-serif] leading-snug line-clamp-2 break-words w-full">
                        {exam.name}
                      </h3>
                      <span className="text-[9.5px] sm:text-[10.5px] font-medium text-[#5C707C] dark:text-[#9BB4C7] font-['Cairo',sans-serif] truncate w-full">
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
                      className="w-8 h-8 rounded-full bg-[#F6F8FA] dark:bg-[#0B1529] hover:bg-[#DDEFF2]/70 dark:hover:bg-[#162747] border border-[#142B5F]/12 dark:border-white/12 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs shrink-0 mn-panel"
                      title={publicT('public_add_to_favorites')}
                    >
                      <Heart
                        className={`w-4 h-4 ${isFav ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#38C6D4] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`}
                      />
                    </button>
                  )}
                </div>

                {/* Bottom Row: 4 Boxes in 2x2 Grid (Exam Type • Score Scale • Validity • CTA View Details) */}
                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#142B5F]/8 dark:border-white/8">
                  {/* Box 1 (Highest Priority): نوع الاختبار */}
                  <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
                    <BookOpenCheck className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                    <span className="min-w-0 leading-tight line-clamp-2 break-words">{EXAM_TYPE_LABELS[exam.category] ?? CATEGORY_LABELS[exam.category] ?? exam.category}</span>
                  </div>

                  {/* Box 2: درجة الاختبار / المقياس */}
                  <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
                    <Award className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                    <span className="min-w-0 leading-tight line-clamp-2 break-words">{exam.scoreRange || 'مقياس معتمد'}</span>
                  </div>

                  {/* Box 3: صلاحية الشهادة */}
                  <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                    <span className="min-w-0 leading-tight line-clamp-2 break-words">{exam.validity || 'سنتان'}</span>
                  </div>

                  {/* Box 4: عرض التفاصيل */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectExam?.(exam);
                    }}
                    className="min-w-0 overflow-hidden bg-[#142B5F] hover:bg-[#0E7C86] dark:bg-[#162A52] dark:hover:bg-[#1C3566] text-white dark:text-[#F2CD78] border border-transparent dark:border-[#F2CD78]/35 rounded-lg px-2 py-1.5 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs mn-inverse"
                  >
                    <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight text-white dark:text-[#F2CD78] truncate">
                      {publicT('public_view_details')}
                    </span>
                    <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-[#F2CD78] shrink-0" />
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
          <div className="bg-white dark:bg-[#111E38] border border-dashed border-[#142B5F]/18 dark:border-white/14 rounded-2xl p-6 text-center text-xs font-bold text-[#5C707C] dark:text-[#9BB4C7] mn-panel">{publicT('public_no_exams_match_this_search')}</div>
        )}
      </div>

    </div>
  );
};
