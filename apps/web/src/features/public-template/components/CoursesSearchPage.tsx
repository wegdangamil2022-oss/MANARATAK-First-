import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Code2,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  Globe2,
  GraduationCap,
  Languages,
  PlayCircle,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { Course, ImportedCourse } from '../types';
import { FavoriteButton } from './FavoriteButton';

interface CoursesSearchPageProps {
  courses?: Course[];
  onBack?: () => void;
  onSelectCourse?: (course: ImportedCourse) => void;
  importedCourses?: ImportedCourse[];
  initialQuery?: string;
  initialField?: string;
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
}

type FreeCourseMode = 'all' | 'free-with-certificate' | 'free-only';

const FREE_COURSE_OPTIONS: Array<{ value: FreeCourseMode; label: string }> = [
  { value: 'all', label: 'كل الدورات المجانية' },
  { value: 'free-with-certificate', label: 'مجانية + شهادة مجانية' },
  { value: 'free-only', label: 'دورة مجانية فقط' },
];

// Latest imported-course Master (2026-08-30): 31 active source platforms / universities.
const IMPORTED_PLATFORM_OPTIONS = [
  'Microsoft Learn',
  'Salesforce Trailhead',
  'The Open University — OpenLearn',
  'freeCodeCamp',
  'Simplilearn SkillUp',
  'FAO eLearning Academy',
  'Thai MOOC',
  'Elsevier Researcher Academy',
  'IBM SkillsBuild',
  'HubSpot Academy',
  'Saylor University',
  'NextGenU',
  'K-MOOC',
  'openHPI — Hasso Plattner Institute',
  'MaharaTech — ITI',
  'FUN MOOC — France Université Numérique',
  'Global Health Learning Center',
  'Semrush Academy',
  'Cisco Networking Academy',
  'Moodle Academy',
  'JMOOC',
  'WIPO Academy',
  'UNDP Learning for Nature',
  'HP LIFE',
  'MongoDB University',
  'Google Skillshop',
  'MathWorks — MATLAB Academy Onramps',
  'University of Helsinki — MOOC.fi',
  'AWS Skill Builder',
  'Harvard University — CS50',
  'UN CC:e-Learn',
] as const;

// Public-facing discipline taxonomy already used by imported-course administration.
const COURSE_FIELD_OPTIONS = [
  'الذكاء الاصطناعي وتعلّم الآلة',
  'البرمجة وتطوير البرمجيات',
  'تطوير الويب',
  'الحوسبة السحابية وDevOps',
  'الأمن السيبراني والشبكات',
  'البيانات وقواعد البيانات',
  'الأعمال والإدارة',
  'التسويق والمبيعات',
  'المالية والمحاسبة',
  'الصحة والطب',
  'الزراعة والغذاء',
  'البيئة والاستدامة',
  'التعليم والتدريب',
  'اللغات',
  'الهندسة والعلوم',
  'القانون والسياسة والمجتمع',
  'الفنون والعلوم الإنسانية',
  'التنمية والعمل الإنساني',
  'المهارات المهنية والتطوير الوظيفي',
  'أخرى',
] as const;

const LANGUAGE_OPTIONS = [
  'الإنجليزية',
  'العربية',
  'الفرنسية',
  'الإسبانية',
  'الألمانية',
  'الصينية',
  'اليابانية',
  'الكورية',
  'التايلاندية',
  'الروسية',
  'البرتغالية',
  'التركية',
  'متعددة اللغات',
  'غير محددة رسميًا',
] as const;

const LEVEL_OPTIONS = ['مبتدئ', 'متوسط', 'متقدم', 'جميع المستويات', 'غير محدد رسميًا'] as const;

const CERTIFICATE_OPTIONS = [
  'شهادة إتمام',
  'شهادة رقمية',
  'شارة رقمية',
  'إفادة مشاركة',
  'اعتماد / شهادة مهنية',
  'بدون شهادة مجانية',
] as const;

export const CoursesSearchPage: React.FC<CoursesSearchPageProps> = ({ onBack, onSelectCourse, importedCourses = [], initialQuery = '', initialField = '', favoriteIds = [], onToggleFavorite }) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const normalizedInitialField = COURSE_FIELD_OPTIONS.includes(initialField as (typeof COURSE_FIELD_OPTIONS)[number])
    ? initialField
    : 'all';

  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);
  const [freeCourseMode, setFreeCourseMode] = useState<FreeCourseMode>('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(normalizedInitialField !== 'all');
  const [selectedField, setSelectedField] = useState(normalizedInitialField);
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedCertificate, setSelectedCertificate] = useState('all');

  useEffect(() => {
    setSelectedField(normalizedInitialField);
    if (normalizedInitialField !== 'all') setShowAdvancedFilters(true);
  }, [normalizedInitialField]);

  const advancedFiltersCount = useMemo(
    () =>
      [selectedField, selectedLanguage, selectedLevel, selectedCertificate].filter(
        (value) => value !== 'all',
      ).length,
    [selectedField, selectedLanguage, selectedLevel, selectedCertificate],
  );

  const activeFiltersCount =
    (freeCourseMode !== 'all' ? 1 : 0) +
    (selectedPlatform !== 'all' ? 1 : 0) +
    advancedFiltersCount;

  const resetFilters = () => {
    setFreeCourseMode('all');
    setSelectedPlatform('all');
    setSelectedField('all');
    setSelectedLanguage('all');
    setSelectedLevel('all');
    setSelectedCertificate('all');
  };

  const selectedFreeCourseLabel =
    FREE_COURSE_OPTIONS.find((option) => option.value === freeCourseMode)?.label ?? 'نوع الدورة';

  const visibleImportedCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return importedCourses.filter((course) => {
      if (query) {
        const searchable = [course.title, course.provider, course.field, course.language, course.level]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      if (freeCourseMode === 'free-with-certificate' && !course.freeCertificate) return false;
      if (freeCourseMode === 'free-only' && course.freeCertificate) return false;
      if (selectedPlatform !== 'all' && course.provider !== selectedPlatform) return false;
      if (selectedField !== 'all' && course.field !== selectedField) return false;
      if (selectedLanguage !== 'all' && course.language !== selectedLanguage) return false;
      if (selectedLevel !== 'all' && course.level !== selectedLevel) return false;

      if (selectedCertificate !== 'all') {
        const certificate = course.certificateType;
        const matchesCertificate =
          (selectedCertificate === 'شهادة إتمام' && certificate.includes('إتمام')) ||
          (selectedCertificate === 'شهادة رقمية' && certificate.includes('شهادة رقمية')) ||
          (selectedCertificate === 'شارة رقمية' && certificate.includes('شارة رقمية')) ||
          (selectedCertificate === 'إفادة مشاركة' && certificate.includes('إفادة')) ||
          (selectedCertificate === 'اعتماد / شهادة مهنية' && (certificate.includes('اعتماد') || certificate.includes('مهنية'))) ||
          (selectedCertificate === 'بدون شهادة مجانية' && !course.freeCertificate);
        if (!matchesCertificate) return false;
      }

      return true;
    });
  }, [
    importedCourses,
    searchQuery,
    freeCourseMode,
    selectedPlatform,
    selectedField,
    selectedLanguage,
    selectedLevel,
    selectedCertificate,
  ]);

  return (
    <div
      className="min-h-screen bg-[var(--mn-page)] text-[var(--mn-heading)] pb-24 font-['Cairo',sans-serif] select-none mn-panel "
      dir="rtl"
    >
      {/* HERO — same visual language as Scholarships / Universities / Majors */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-4 pb-12 sm:pb-14 overflow-hidden shadow-xs border-b border-[var(--mn-accent)]/20 mn-inverse ">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <svg className="w-full h-full" viewBox="0 0 400 220" fill="none" preserveAspectRatio="none">
              <path d="M-50,50 Q100,-20 250,60 T550,40" stroke="var(--mn-accent)" strokeWidth="1.5" fill="none" />
              <path d="M-20,125 Q150,45 300,145 T600,105" stroke="var(--mn-accent)" strokeWidth="1" fill="none" />
              <circle cx="30" cy="30" r="1" fill="var(--mn-accent)" />
              <circle cx="45" cy="30" r="1" fill="var(--mn-accent)" />
              <circle cx="60" cy="30" r="1" fill="var(--mn-accent)" />
              <circle cx="30" cy="45" r="1" fill="var(--mn-accent)" />
              <circle cx="45" cy="45" r="1" fill="var(--mn-accent)" />
              <circle cx="60" cy="45" r="1" fill="var(--mn-accent)" />
            </svg>
          </div>

          <div className="absolute top-0 right-10 w-64 h-64 bg-[var(--mn-accent)] rounded-full mix-blend-screen filter blur-[120px] opacity-10 mn-gold " />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[var(--mn-primary)] rounded-full mix-blend-screen filter blur-[100px] opacity-20 mn-inverse " />


          <PlayCircle className="imported-course-float mn-anim-10 w-16 h-16 left-[15%] top-[60%]" />
          <TrendingUp className="imported-course-float mn-anim-12-delay-4 w-12 h-12 left-[80%] top-[40%]" />
          <Briefcase className="imported-course-float mn-anim-14-delay-2 w-10 h-10 left-[40%] top-[70%]" />
          <Sparkles className="imported-course-float mn-anim-9-delay-7 w-8 h-8 left-[60%] top-[30%]" />
        </div>

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

        <div className="max-w-md sm:max-w-xl mx-auto text-center relative z-10 space-y-2.5 pt-5">
          <div className="relative inline-block mb-1">
            <div className="absolute -inset-x-6 -inset-y-3 bg-[var(--mn-accent)]/10 blur-xl rounded-full" />
            <h1 className="relative text-2xl sm:text-3xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              الدورات <span className="text-[var(--mn-accent-soft)]">العالمية</span>
            </h1>
          </div>

          <div className="flex justify-center items-center gap-2 py-1">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[var(--mn-accent-soft)]/50" />
            <PlayCircle className="w-4 h-4 text-[var(--mn-accent-text)]" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[var(--mn-accent-soft)]/50" />
          </div>

          <p className="text-[12px] sm:text-sm text-[var(--mn-on-dark-muted)] font-medium font-['Cairo',sans-serif] leading-relaxed max-w-[92%] mx-auto drop-shadow-md">
            ابحث في الدورات المجانية المتاحة من كبرى المنصات والجامعات العالمية، واختر ما يناسب مجالك ومستواك.
          </p>

          {/* Search stays inside the upper section, matching Scholarships. */}
          <div className="pt-1 max-w-sm sm:max-w-md mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="اكتب اسم الدورة، المجال، أو المنصة..."
                className="w-full py-2.5 pl-4 pr-10 bg-[var(--mn-surface)] text-[var(--mn-heading)] rounded-full text-xs font-semibold placeholder:text-[var(--mn-text-muted)] focus:outline-none shadow-md border border-[var(--mn-border)] focus:border-[var(--mn-accent)] transition-all text-center font-['Cairo',sans-serif] mn-panel "
              />
              <Search className="w-4 h-4 text-[var(--mn-accent-text)] absolute right-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
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

        {activeFiltersCount > 0 && (
          <div className="flex justify-center mt-2 relative z-10">
            <button
              onClick={resetFilters}
              className="text-[10px] font-bold text-[var(--mn-danger-text)] hover:text-[var(--mn-danger-text)] bg-[var(--mn-surface-elevated)]/95 px-2.5 py-0.5 rounded-full shadow-xs transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif] mn-panel "
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة ضبط الفلاتر ({activeFiltersCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* Three visible filters only */}
      <div className="max-w-lg mx-auto mn-inline-gutter -mt-7 sm:-mt-8 relative z-20 pb-3">
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {/* نوع الدورة */}
          <div className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[62px] sm:h-[66px] cursor-pointer mn-panel ">
            <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] font-semibold text-[10.5px] sm:text-xs font-['Cairo',sans-serif] w-full">
              <span className="truncate">{freeCourseMode === 'all' ? 'نوع الدورة' : selectedFreeCourseLabel}</span>
              <Award className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] mt-0.5" />
            <select
              value={freeCourseMode}
              onChange={(event) => setFreeCourseMode(event.target.value as FreeCourseMode)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              title="اختر نوع الدورة"
            >
              {FREE_COURSE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* المنصة */}
          <div className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[62px] sm:h-[66px] cursor-pointer mn-panel ">
            <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] font-semibold text-[10.5px] sm:text-xs font-['Cairo',sans-serif] w-full">
              <span className="truncate">{selectedPlatform === 'all' ? 'المنصة' : selectedPlatform}</span>
              <Globe2 className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] mt-0.5" />
            <select
              value={selectedPlatform}
              onChange={(event) => setSelectedPlatform(event.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              title="اختر المنصة"
            >
              <option value="all">كل المنصات</option>
              {IMPORTED_PLATFORM_OPTIONS.map((platform) => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </div>

          {/* بقية التصفية */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((current) => !current)}
            className={`relative border-1.5 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[62px] sm:h-[66px] cursor-pointer ${
              showAdvancedFilters || advancedFiltersCount > 0
                ? 'bg-[var(--mn-primary)] border-[var(--mn-border-brand)] text-white mn-inverse '
                : 'bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] text-[var(--mn-heading)] mn-panel '
            }`}
          >
            <div className="flex items-center justify-center gap-1 font-semibold text-[10.5px] sm:text-xs font-['Cairo',sans-serif] w-full">
              <span>{advancedFiltersCount > 0 ? `تصفية (${advancedFiltersCount})` : 'تصفية'}</span>
              <SlidersHorizontal className={`w-3.5 h-3.5 shrink-0 ${showAdvancedFilters || advancedFiltersCount > 0 ? 'text-[var(--mn-accent-soft)]' : 'text-[#142B5F] dark:text-[#D6A43B]'}`} />
            </div>
            <span className={`mt-0.5 max-w-full truncate text-[8px] sm:text-[9px] font-bold ${showAdvancedFilters || advancedFiltersCount > 0 ? 'text-[var(--mn-on-dark-muted)]' : 'text-[var(--mn-text-muted)]'}`}>
              المجال • اللغة • المستوى • الشهادة
            </span>
          </button>
        </div>

        {/* Hidden-by-default advanced filters: opened only from the third tile. */}
        {showAdvancedFilters && (
          <div className="mt-2.5 rounded-2xl border border-[var(--mn-accent)]/45 bg-[var(--mn-surface)] p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.07)] mn-panel ">
            <div className="grid grid-cols-2 gap-2">
              <label className="relative flex min-h-[50px] items-center rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-2.5 pr-8 mn-panel ">
                <BookOpen className="absolute right-2.5 w-3.5 h-3.5 text-[var(--mn-accent-text)]" />
                <span className="truncate text-[10px] font-semibold text-[var(--mn-text)]">{selectedField === 'all' ? 'المجال' : selectedField}</span>
                <select value={selectedField} onChange={(event) => setSelectedField(event.target.value)} className="absolute inset-0 opacity-0 cursor-pointer">
                  <option value="all">كل المجالات</option>
                  {COURSE_FIELD_OPTIONS.map((field) => <option key={field} value={field}>{field}</option>)}
                </select>
              </label>

              <label className="relative flex min-h-[50px] items-center rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-2.5 pr-8 mn-panel ">
                <Languages className="absolute right-2.5 w-3.5 h-3.5 text-[var(--mn-accent-text)]" />
                <span className="truncate text-[10px] font-semibold text-[var(--mn-text)]">{selectedLanguage === 'all' ? 'اللغة' : selectedLanguage}</span>
                <select value={selectedLanguage} onChange={(event) => setSelectedLanguage(event.target.value)} className="absolute inset-0 opacity-0 cursor-pointer">
                  <option value="all">كل اللغات</option>
                  {LANGUAGE_OPTIONS.map((language) => <option key={language} value={language}>{language}</option>)}
                </select>
              </label>

              <label className="relative flex min-h-[50px] items-center rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-2.5 pr-8 mn-panel ">
                <GraduationCap className="absolute right-2.5 w-3.5 h-3.5 text-[var(--mn-accent-text)]" />
                <span className="truncate text-[10px] font-semibold text-[var(--mn-text)]">{selectedLevel === 'all' ? 'المستوى' : selectedLevel}</span>
                <select value={selectedLevel} onChange={(event) => setSelectedLevel(event.target.value)} className="absolute inset-0 opacity-0 cursor-pointer">
                  <option value="all">كل المستويات</option>
                  {LEVEL_OPTIONS.map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </label>

              <label className="relative flex min-h-[50px] items-center rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-2.5 pr-8 mn-panel ">
                <Award className="absolute right-2.5 w-3.5 h-3.5 text-[var(--mn-accent-text)]" />
                <span className="truncate text-[10px] font-semibold text-[var(--mn-text)]">{selectedCertificate === 'all' ? 'نوع الشهادة' : selectedCertificate}</span>
                <select value={selectedCertificate} onChange={(event) => setSelectedCertificate(event.target.value)} className="absolute inset-0 opacity-0 cursor-pointer">
                  <option value="all">كل أنواع الشهادات</option>
                  {CERTIFICATE_OPTIONS.map((certificate) => <option key={certificate} value={certificate}>{certificate}</option>)}
                </select>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Golden imported-course cards — all records use the same reusable detail template. */}
      {visibleImportedCourses.length > 0 ? (
        <section className="max-w-lg mx-auto mn-inline-gutter pt-2 pb-5 space-y-3">
          {visibleImportedCourses.map((course) => (
            <article key={course.id} className="relative overflow-hidden rounded-[22px] border border-[var(--mn-border)] bg-[var(--mn-surface)] shadow-[0_8px_24px_rgba(20,43,95,0.08)] mn-panel ">
              {onToggleFavorite && (
                <FavoriteButton
                  active={favoriteIds.includes(course.id)}
                  onToggle={(event) => {
                    event.stopPropagation();
                    onToggleFavorite(course.id);
                  }}
                  className="absolute left-3 top-3 z-20"
                />
              )}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-[var(--mn-primary)] via-[var(--mn-accent)] to-[var(--mn-primary)] mn-inverse " />

              <div className="p-3.5 pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--mn-accent)]/30 bg-gradient-to-br from-[var(--mn-primary)] to-[var(--mn-primary)] shadow-sm mn-inverse ">
                    <Code2 className="h-5 w-5 text-[var(--mn-accent-soft)]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="truncate text-[10px] font-semibold text-[var(--mn-heading)] font-['Cairo',sans-serif]">{course.provider}</span>
                      <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--mn-accent)] mn-gold " />
                      <span className="shrink-0 rounded-full bg-[var(--mn-gold-surface)] px-2 py-0.5 text-[9px] font-bold text-[var(--mn-accent-text)] border border-[var(--mn-border-gold)] font-['Cairo',sans-serif] mn-panel ">مستوردة</span>
                    </div>

                    <h2 className="line-clamp-2 text-[14px] font-bold leading-6 text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                      {course.title}
                    </h2>
                    <p className="mt-0.5 truncate text-[10px] font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif]">
                      {course.field}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="flex min-h-[42px] items-center gap-2 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 px-2.5 mn-panel ">
                    <Globe2 className="h-3.5 w-3.5 shrink-0 text-[var(--mn-heading)]" />
                    <div className="min-w-0">
                      <div className="text-[8px] font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif]">اللغة</div>
                      <div className="truncate text-[10px] font-semibold text-[var(--mn-text)] font-['Cairo',sans-serif]">{course.language}</div>
                    </div>
                  </div>

                  <div className="flex min-h-[42px] items-center gap-2 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 px-2.5 mn-panel ">
                    <GraduationCap className="h-3.5 w-3.5 shrink-0 text-[var(--mn-heading)]" />
                    <div className="min-w-0">
                      <div className="text-[8px] font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif]">المستوى</div>
                      <div className="truncate text-[10px] font-semibold text-[var(--mn-text)] font-['Cairo',sans-serif]">{course.level}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--mn-success-border)] bg-[var(--mn-success-soft)] px-2.5 py-1 text-[9px] font-bold text-[var(--mn-success-text)] font-['Cairo',sans-serif]">
                    <CheckCircle2 className="h-3 w-3" />
                    {course.freeCertificate ? 'مجانية + شهادة مجانية' : 'دورة مجانية'}
                  </span>
                  {course.freeCertificate && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--mn-border-gold)] bg-[var(--mn-gold-surface)] px-2.5 py-1 text-[9px] font-bold text-[var(--mn-accent-text)] font-['Cairo',sans-serif] mn-panel ">
                      <BadgeCheck className="h-3 w-3" />
                      {course.certificateType}
                    </span>
                  )}
                </div>

                <div className="mt-3 border-t border-[var(--mn-border)] pt-2.5">
                  <button
                    type="button"
                    onClick={() => onSelectCourse?.(course)}
                    className="flex w-full items-center justify-between rounded-xl bg-[var(--mn-primary)] px-3.5 py-2.5 text-white shadow-sm transition-transform active:scale-[0.99] mn-inverse "
                  >
                    <span className="text-[11px] font-bold font-['Cairo',sans-serif]">عرض التفاصيل</span>
                    <ArrowLeft className="h-4 w-4 text-[var(--mn-accent-soft)]" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="max-w-lg mx-auto mn-inline-gutter pt-2 pb-5">
          <div className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-5 text-center text-[11px] font-bold text-[var(--mn-text-muted)] shadow-sm mn-panel ">
            لا توجد دورات مطابقة للفلاتر الحالية.
          </div>
        </div>
      )}

      <div className="w-full h-0.5 bg-gradient-to-r from-[var(--mn-accent-text)] via-[var(--mn-accent-soft)] to-[var(--mn-accent-text)] shadow-xs" />
    </div>
  );
};
