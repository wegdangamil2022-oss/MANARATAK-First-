import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Building2,
  CheckCircle2,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  Clock3,
  Globe2,
  GraduationCap,
  Layers3,
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
import { PublicCardsPagination, PublicFilterSelectModal, usePaginatedCatalog } from './DetailUi';

const KNOWN_EN_TO_AR_TITLES: Record<string, string> = {
  'introduction to python': 'مقدمة في برمجة بايثون',
  'cs105: introduction to python': 'مقدمة في برمجة بايثون',
  'ai literacy for everybody': 'أساسيات الذكاء الاصطناعي للجميع',
  'google ads measurement certification': 'شهادة قياس إعلانات جوجل الاحترافية',
  'net zero 101: what, why and how': 'مدخل إلى الحياد الكربوني وصافي الانبعاثات الصفري',
  'cs50: introduction to computer science': 'مقدمة في علوم الحاسوب CS50',
  'elements of ai': 'مبادئ الذكاء الاصطناعي',
  'machine learning specialization': 'تخصص تعلم الآلة التطبيقي',
  'responsive web design': 'تصميم المواقع المتجاوبة وتطوير الواجهات',
  'data analysis with python': 'تحليل البيانات باستخدام بايثون',
  'foundations of cybersecurity': 'أساسيات الأمن السيبراني وحماية الأنظمة',
  'project management principles': 'مبادئ إدارة المشاريع الاحترافية',
};

const KNOWN_AR_TO_EN_TITLES: Record<string, string> = {
  'مقدمة في برمجة بايثون': 'CS105: Introduction to Python',
  'أساسيات الذكاء الاصطناعي للجميع': 'AI Literacy for Everybody',
  'شهادة قياس إعلانات جوجل الاحترافية': 'Google Ads Measurement Certification',
  'مدخل إلى الحياد الكربوني وصافي الانبعاثات الصفري': 'Net Zero 101: What, Why and How',
};

const HAS_ARABIC_REGEX = /[\u0600-\u06FF]/;

export function resolveCourseBilingualTitle(course: ImportedCourse): { titleAr: string; titleEn: string } {
  const rawTitle = (course.title || '').trim();
  const explicitAr = (course.titleAr || '').trim();
  const explicitEn = (course.titleEn || '').trim();

  if (explicitAr && explicitEn) {
    return { titleAr: explicitAr, titleEn: explicitEn };
  }

  if (HAS_ARABIC_REGEX.test(rawTitle)) {
    const enFallback =
      explicitEn ||
      KNOWN_AR_TO_EN_TITLES[rawTitle] ||
      `${course.provider} Official Course`;
    return { titleAr: rawTitle, titleEn: enFallback };
  }

  const normalizedEn = rawTitle.toLowerCase();
  const mappedAr =
    explicitAr ||
    KNOWN_EN_TO_AR_TITLES[normalizedEn] ||
    (course.field ? `دورة ${course.field}` : 'دورة تدريبية دولية');

  return {
    titleAr: mappedAr,
    titleEn: explicitEn || rawTitle || `${course.provider} Course`,
  };
}

export const CourseProviderLogo: React.FC<{ provider: string; className?: string }> = ({
  provider,
  className = 'w-full h-full',
}) => {
  const norm = (provider || '').toLowerCase();

  if (norm.includes('saylor')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#142B5F" />
        <circle cx="50" cy="50" r="43" stroke="#142B5F" strokeWidth="2" />
        {/* Shield & Book Crest */}
        <path d="M32 26H68V48C68 62 50 70 50 70C50 70 32 62 32 48V26Z" fill="#0D1E42" stroke="#D6A43B" strokeWidth="2.5" />
        <text x="50" y="54" textAnchor="middle" fill="#F3CE74" fontSize="24" fontWeight="900" fontFamily="serif">
          S
        </text>
        <text x="50" y="85" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800" fontFamily="sans-serif" letterSpacing="1">
          SAYLOR
        </text>
      </svg>
    );
  }

  if (norm.includes('freecodecamp') || norm.includes('free code camp')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#0A0A23" />
        <circle cx="50" cy="50" r="44" stroke="#142B5F" strokeWidth="2" />
        {/* Code parentheses */}
        <path d="M27 32C20 40 20 56 27 64" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
        <path d="M73 32C80 40 80 56 73 64" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
        {/* Campfire Flame */}
        <path
          d="M50 25C50 25 63 37 61 50C59 59 53 63 50 63C47 63 41 59 39 50C37 37 50 25 50 25Z"
          fill="#F59E0B"
        />
        <path
          d="M50 37C50 37 56 44 55 52C54 57 51 60 50 60C49 60 46 57 45 52C44 44 50 37 50 37Z"
          fill="#FEF3C7"
        />
        <text x="50" y="84" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900" fontFamily="monospace">
          fcc
        </text>
      </svg>
    );
  }

  if (norm.includes('google')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#FFFFFF" />
        {/* Authentic 4-Color Google G */}
        <path
          d="M73.5 50.5C73.5 48.7 73.3 47 73 45.3H50V55.1H63.2C62.6 58.3 60.8 61 58.1 62.8V69.2H66C70.7 64.9 73.5 58.3 73.5 50.5Z"
          fill="#4285F4"
        />
        <path
          d="M50 74.5C56.6 74.5 62.2 72.3 66.2 68.6L58.3 62.5C56.1 64 53.3 64.9 50 64.9C43.6 64.9 38.2 60.6 36.2 54.8H28.1V61.1C32.1 69.1 40.4 74.5 50 74.5Z"
          fill="#34A853"
        />
        <path
          d="M36.2 54.8C35.7 53.3 35.4 51.7 35.4 50C35.4 48.3 35.7 46.7 36.2 45.2V38.9H28.1C26.4 42.2 25.5 46 25.5 50C25.5 54 26.4 57.8 28.1 61.1L36.2 54.8Z"
          fill="#FBBC05"
        />
        <path
          d="M50 35.1C53.6 35.1 56.8 36.3 59.4 38.8L66.4 31.8C62.1 27.8 56.6 25.5 50 25.5C40.4 25.5 32.1 30.9 28.1 38.9L36.2 45.2C38.2 39.4 43.6 35.1 50 35.1Z"
          fill="#EA4335"
        />
      </svg>
    );
  }

  if (norm.includes('un ') || norm.includes('un-') || norm.includes('united nations') || norm.includes('cc:e-learn') || norm.includes('unccelearn')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#009EDB" />
        <circle cx="50" cy="50" r="44" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" />
        {/* UN Globe Grid */}
        <circle cx="50" cy="45" r="18" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="50" cy="45" r="10" stroke="#FFFFFF" strokeWidth="1.5" />
        <line x1="32" y1="45" x2="68" y2="45" stroke="#FFFFFF" strokeWidth="1.5" />
        <line x1="50" y1="27" x2="50" y2="63" stroke="#FFFFFF" strokeWidth="1.5" />
        {/* Olive Branches */}
        <path d="M26 46C26 60 36 69 50 71C64 69 74 60 74 46" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        <text x="50" y="87" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
          UN
        </text>
      </svg>
    );
  }

  if (norm.includes('coursera')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#0056D2" />
        <text x="50" y="57" textAnchor="middle" fill="#FFFFFF" fontSize="17" fontWeight="900" fontFamily="sans-serif">
          coursera
        </text>
      </svg>
    );
  }

  if (norm.includes('edx')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#02262B" />
        <text x="50" y="59" textAnchor="middle" fill="#FFFFFF" fontSize="26" fontWeight="900" fontFamily="sans-serif">
          edX
        </text>
      </svg>
    );
  }

  if (norm.includes('harvard')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#A51C30" />
        <path d="M32 26H68V50C68 64 50 74 50 74C50 74 32 64 32 50V26Z" fill="#7C1222" stroke="#F3CE74" strokeWidth="2.5" />
        <text x="50" y="56" textAnchor="middle" fill="#FFFFFF" fontSize="24" fontWeight="900" fontFamily="serif">
          H
        </text>
      </svg>
    );
  }

  if (norm.includes('microsoft')) {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#142B5F" />
        <rect x="28" y="28" width="20" height="20" rx="2" fill="#F25022" />
        <rect x="52" y="28" width="20" height="20" rx="2" fill="#7FBA00" />
        <rect x="28" y="52" width="20" height="20" rx="2" fill="#00A4EF" />
        <rect x="52" y="52" width="20" height="20" rx="2" fill="#FFB900" />
      </svg>
    );
  }

  const initials =
    (provider || 'CO')
      .split(/[\s:.-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'CO';

  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#142B5F" />
      <circle cx="50" cy="50" r="43" stroke="#142B5F" strokeWidth="2" />
      <text x="50" y="58" textAnchor="middle" fill="#F3CE74" fontSize="24" fontWeight="900" fontFamily="sans-serif">
        {initials}
      </text>
    </svg>
  );
};

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
  { value: 'all', label: "public_all_free_courses" },
  { value: 'free-with-certificate', label: "public_free_course_free_certificate" },
  { value: 'free-only', label: "public_free_course_only" },
];

export const CoursesSearchPage: React.FC<CoursesSearchPageProps> = ({ onBack, onSelectCourse, importedCourses = [], initialQuery = '', initialField = '', favoriteIds = [], onToggleFavorite }) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const normalizedInitialField = initialField.trim() ? `field:${initialField.trim()}` : 'all';
  const distinct = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  const IMPORTED_PLATFORM_OPTIONS = distinct([
    ...importedCourses.map(c=>c.platform ?? c.provider),
    'Saylor Academy',
    'freeCodeCamp',
    'Google Skillshop',
    'UN CC:e-Learn',
    'Coursera',
    'edX',
    'Harvard Online',
    'MIT OpenCourseWare',
  ]);
  const COURSE_FIELD_OPTIONS = [...new Map([
    ...importedCourses.flatMap(course => [
      { value: `field:${course.field}`, label: course.field },
      ...(course.relatedMajors ?? []).filter(major => major.id).map(major => ({ value: `major:${major.id}`, label: major.name })),
    ]),
    { value: 'field:البرمجة وتطوير البرمجيات', label: 'البرمجة وتطوير البرمجيات' },
    { value: 'field:الذكاء الاصطناعي وعلوم البيانات', label: 'الذكاء الاصطناعي وعلوم البيانات' },
    { value: 'field:التسويق الرقمي والأعمال', label: 'التسويق الرقمي والأعمال' },
    { value: 'field:الاستدامة والبيئة والمناخ', label: 'الاستدامة والبيئة والمناخ' },
    { value: 'field:الأمن السيبراني والشبكات', label: 'الأمن السيبراني والشبكات' },
    { value: 'field:إدارة المشاريع والقيادة', label: 'إدارة المشاريع والقيادة' },
  ].filter(option => option.label).map(option => [option.value, option])).values()].sort((a, b) => a.label.localeCompare(b.label, 'ar'));
  const LANGUAGE_OPTIONS = distinct([...importedCourses.map(c=>c.language), 'الإنجليزية', 'العربية', 'الفرنسية', 'الألمانية', 'الصينية']);
  const LEVEL_OPTIONS = distinct([...importedCourses.map(c=>c.level), 'مبتدئ', 'متوسط', 'متقدم', 'جميع المستويات']);
  const CERTIFICATE_OPTIONS = distinct(importedCourses.map(c=>c.certificateType).concat(['شهادة مجانية معتمدة', 'بدون شهادة مجانية']));

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
  const [openFilterModal, setOpenFilterModal] = useState<'courseType' | 'platform' | 'field' | 'language' | 'level' | 'certificate' | null>(null);

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
    FREE_COURSE_OPTIONS.find((option) => option.value === freeCourseMode)?.label ?? 'public_course_type';

  const visibleImportedCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return importedCourses.filter((course) => {
      if (query) {
        const { titleAr, titleEn } = resolveCourseBilingualTitle(course);
        const searchable = [course.title, titleAr, titleEn, course.provider, course.platform, course.field, course.language, course.level, ...(course.relatedMajors ?? []).map(m=>m.name)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      if (freeCourseMode === 'free-with-certificate' && (!course.studyFree || !course.freeCertificate)) return false;
      if (freeCourseMode === 'free-only' && (!course.studyFree || course.freeCertificate)) return false;
      if (selectedPlatform !== 'all' && (course.platform ?? course.provider) !== selectedPlatform) return false;
      if (selectedField !== 'all' && `field:${course.field}` !== selectedField && !(course.relatedMajors ?? []).some(major => major.id && `major:${major.id}` === selectedField)) return false;
      if (selectedLanguage !== 'all' && course.language !== selectedLanguage) return false;
      if (selectedLevel !== 'all' && course.level !== selectedLevel) return false;

      if (selectedCertificate !== 'all') {
        const certificate = course.certificateType;
        const matchesCertificate = selectedCertificate === 'بدون شهادة مجانية' ? !course.freeCertificate : certificate === selectedCertificate;
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

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems: paginatedImportedCourses,
  } = usePaginatedCatalog(
    visibleImportedCourses,
    `${searchQuery}|${freeCourseMode}|${selectedPlatform}|${selectedField}|${selectedLanguage}|${selectedLevel}|${selectedCertificate}`,
    30,
  );

  return (
    <div
      className="min-h-screen bg-[var(--mn-page)] text-[var(--mn-heading)] pb-24 font-['Cairo',sans-serif] select-none mn-panel "
      dir={publicDir}
    >
      {/* HERO — same visual language as Scholarships / Universities / Majors */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-4 pb-3 overflow-hidden shadow-xs mn-inverse ">
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
            title={publicT('public_back')}
            aria-label={publicT('public_back')}
          >
            <ChevronLeft className="w-4 h-4 rotate-180 text-white" />
          </button>
        )}

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-2 md:space-y-3 pt-1 md:pt-2">
          {/* Top 4-pointed Gold Sparkle Star */}
          <div className="flex justify-center">
            <Sparkles className="h-5 w-5 text-[var(--mn-accent-text)] drop-shadow-[0_0_8px_rgba(214,164,59,0.8)]" aria-hidden="true" />
          </div>

          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[32px] font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              {publicT('public_courses')}{' '}<span className="text-[var(--mn-accent-text)]">{publicT('public_worldwide')}</span>
            </h1>

            {/* Small Gold Horizontal Divider */}
            <div className="flex justify-center pt-1 pb-0.5">
              <div className="w-10 md:w-14 h-0.5 bg-[var(--mn-accent)] rounded-full mn-gold " />
            </div>

            <p className="text-[11px] sm:text-xs md:text-sm text-white font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto truncate">
              {publicT('public_search_free_courses_from_leading_global_platforms_and')}
            </p>
          </div>

          {/* Search stays inside the upper section, matching Scholarships. */}
          <div className="pt-1 max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={publicT('public_enter_a_course_name_domain_or_platform')}
                className="w-full py-2.5 md:py-3 pl-4 pr-10 bg-[var(--mn-surface)] text-[var(--mn-heading)] rounded-full text-[12px] md:text-sm font-bold placeholder:text-[var(--mn-text-muted)] placeholder:text-[12px] md:placeholder:text-sm placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none shadow-md border border-[var(--mn-border)] focus:border-[var(--mn-accent)] transition-all text-center font-['Cairo',sans-serif] mn-panel "
              />
              <Search className="w-4 h-4 text-[var(--mn-accent-text)] absolute right-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--mn-text-muted)] hover:text-[var(--mn-text)] cursor-pointer"
                  title={publicT('public_clear_search')}
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
              <span>{publicT('public_reset_filters')}{activeFiltersCount})</span>
            </button>
          </div>
        )}

        {/* Three visible filters inside the Navy-Petrol-Turquoise hero container */}
        <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto mn-inline-gutter mt-2.5 md:mt-3.5 relative z-20 pb-0">
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 md:gap-3.5">
            {/* 1. تصفية (في الجانب الأيمن) */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((current) => !current)}
              className={`relative border-1.5 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer ${
                showAdvancedFilters || advancedFiltersCount > 0
                  ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] border-[#142B5F] text-white mn-inverse '
                  : 'bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] mn-panel '
              }`}
            >
              <div className="flex items-center justify-center gap-1 font-bold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <SlidersHorizontal className={`w-3.5 h-3.5 shrink-0 ${showAdvancedFilters || advancedFiltersCount > 0 ? 'text-[#F2CD78]' : 'text-[#142B5F] dark:text-[#D6A43B]'}`} />
                <span className="truncate">{advancedFiltersCount > 0 ? publicT('public_filter_count', { v0: advancedFiltersCount }) : publicT('public_filter')}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''} ${showAdvancedFilters || advancedFiltersCount > 0 ? 'text-white/85' : 'text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)]'}`} />
            </button>

            {/* 2. المنصة */}
            <button
              type="button"
              onClick={() => setOpenFilterModal('platform')}
              className={`relative border-1.5 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer ${
                openFilterModal === 'platform' || selectedPlatform !== 'all'
                  ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] border-[#142B5F] text-white mn-inverse '
                  : 'bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] mn-panel '
              }`}
            >
              <div className="flex items-center justify-center gap-1 font-bold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <Globe2 className={`w-3.5 h-3.5 shrink-0 ${openFilterModal === 'platform' || selectedPlatform !== 'all' ? 'text-[#F2CD78]' : 'text-[#142B5F] dark:text-[#D6A43B]'}`} />
                <span className="truncate">{selectedPlatform === 'all' ? publicT('public_platform') : selectedPlatform}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 ${openFilterModal === 'platform' || selectedPlatform !== 'all' ? 'text-white/85' : 'text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)]'}`} />
            </button>

            {/* 3. نوع الدورة (في الأخير) */}
            <button
              type="button"
              onClick={() => setOpenFilterModal('courseType')}
              className={`relative border-1.5 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer ${
                openFilterModal === 'courseType' || freeCourseMode !== 'all'
                  ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] border-[#142B5F] text-white mn-inverse '
                  : 'bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] mn-panel '
              }`}
            >
              <div className="flex items-center justify-center gap-1 font-bold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <Award className={`w-3.5 h-3.5 shrink-0 ${openFilterModal === 'courseType' || freeCourseMode !== 'all' ? 'text-[#F2CD78]' : 'text-[#142B5F] dark:text-[#D6A43B]'}`} />
                <span className="truncate">{freeCourseMode === 'all' ? publicT('public_course_type') : publicT(selectedFreeCourseLabel)}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 ${openFilterModal === 'courseType' || freeCourseMode !== 'all' ? 'text-white/85' : 'text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)]'}`} />
            </button>
          </div>

          <PublicFilterSelectModal
            isOpen={openFilterModal === 'courseType'}
            onClose={() => setOpenFilterModal(null)}
            title={publicT('public_choose_course_type')}
            icon={Award}
            selectedValue={freeCourseMode}
            onSelect={(val) => setFreeCourseMode(val as FreeCourseMode)}
            options={FREE_COURSE_OPTIONS.map((option) => ({
              value: option.value,
              label: publicT(option.label),
            }))}
          />

          <PublicFilterSelectModal
            isOpen={openFilterModal === 'platform'}
            onClose={() => setOpenFilterModal(null)}
            title={publicT('public_choose_platform')}
            icon={Globe2}
            selectedValue={selectedPlatform}
            onSelect={setSelectedPlatform}
            options={[
              { value: 'all', label: publicT('public_all_platforms') },
              ...IMPORTED_PLATFORM_OPTIONS.map((platform) => ({
                value: platform,
                label: platform,
              })),
            ]}
          />

          <PublicFilterSelectModal
            isOpen={openFilterModal === 'field'}
            onClose={() => setOpenFilterModal(null)}
            title={publicT('public_domain_or_specialization')}
            icon={BookOpen}
            selectedValue={selectedField}
            onSelect={setSelectedField}
            options={[
              { value: 'all', label: publicT('public_all_domains_and_specializations') },
              ...COURSE_FIELD_OPTIONS.map((field) => ({
                value: field.value,
                label: field.label,
              })),
            ]}
          />

          <PublicFilterSelectModal
            isOpen={openFilterModal === 'language'}
            onClose={() => setOpenFilterModal(null)}
            title={publicT('public_language')}
            icon={Languages}
            selectedValue={selectedLanguage}
            onSelect={setSelectedLanguage}
            options={[
              { value: 'all', label: publicT('public_all_languages') },
              ...LANGUAGE_OPTIONS.map((language) => ({
                value: language,
                label: language,
              })),
            ]}
          />

          <PublicFilterSelectModal
            isOpen={openFilterModal === 'level'}
            onClose={() => setOpenFilterModal(null)}
            title={publicT('public_level')}
            icon={GraduationCap}
            selectedValue={selectedLevel}
            onSelect={setSelectedLevel}
            options={[
              { value: 'all', label: publicT('public_all_levels') },
              ...LEVEL_OPTIONS.map((level) => ({
                value: level,
                label: level,
              })),
            ]}
          />

          <PublicFilterSelectModal
            isOpen={openFilterModal === 'certificate'}
            onClose={() => setOpenFilterModal(null)}
            title={publicT('public_certificate_type')}
            icon={Award}
            selectedValue={selectedCertificate}
            onSelect={setSelectedCertificate}
            options={[
              { value: 'all', label: publicT('public_all_certificate_types') },
              ...CERTIFICATE_OPTIONS.map((certificate) => ({
                value: certificate,
                label: certificate,
              })),
            ]}
          />

          {/* Hidden-by-default advanced filters: opened from the first tile (تصفية) */}
          {showAdvancedFilters && (
            <div className="mt-2.5 rounded-2xl border border-[#142B5F]/35 dark:border-[var(--mn-accent)]/45 bg-[var(--mn-surface)] p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.07)] font-['Cairo',sans-serif] mn-panel ">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOpenFilterModal('field')}
                  className={`relative flex min-h-[50px] items-center justify-between rounded-xl border px-2.5 pr-8 cursor-pointer font-['Cairo',sans-serif] transition-all ${
                    openFilterModal === 'field' || selectedField !== 'all'
                      ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] border-[#142B5F] text-white shadow-2xs'
                      : 'border-[var(--mn-border)] bg-[var(--mn-page)] text-[var(--mn-heading)] hover:border-[#142B5F]/50 mn-panel'
                  }`}
                >
                  <BookOpen className={`absolute right-2.5 w-3.5 h-3.5 ${openFilterModal === 'field' || selectedField !== 'all' ? 'text-[#F2CD78]' : 'text-[#142B5F] dark:text-[#F2CD78]'}`} />
                  <span className="truncate text-[11px] sm:text-xs font-bold font-['Cairo',sans-serif]">{selectedField === 'all' ? publicT('public_domain_or_specialization') : COURSE_FIELD_OPTIONS.find(option => option.value === selectedField)?.label || initialField}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOpenFilterModal('language')}
                  className={`relative flex min-h-[50px] items-center justify-between rounded-xl border px-2.5 pr-8 cursor-pointer font-['Cairo',sans-serif] transition-all ${
                    openFilterModal === 'language' || selectedLanguage !== 'all'
                      ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] border-[#142B5F] text-white shadow-2xs'
                      : 'border-[var(--mn-border)] bg-[var(--mn-page)] text-[var(--mn-heading)] hover:border-[#142B5F]/50 mn-panel'
                  }`}
                >
                  <Languages className={`absolute right-2.5 w-3.5 h-3.5 ${openFilterModal === 'language' || selectedLanguage !== 'all' ? 'text-[#F2CD78]' : 'text-[#142B5F] dark:text-[#F2CD78]'}`} />
                  <span className="truncate text-[11px] sm:text-xs font-bold font-['Cairo',sans-serif]">{selectedLanguage === 'all' ? publicT('public_language') : selectedLanguage}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOpenFilterModal('level')}
                  className={`relative flex min-h-[50px] items-center justify-between rounded-xl border px-2.5 pr-8 cursor-pointer font-['Cairo',sans-serif] transition-all ${
                    openFilterModal === 'level' || selectedLevel !== 'all'
                      ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] border-[#142B5F] text-white shadow-2xs'
                      : 'border-[var(--mn-border)] bg-[var(--mn-page)] text-[var(--mn-heading)] hover:border-[#142B5F]/50 mn-panel'
                  }`}
                >
                  <GraduationCap className={`absolute right-2.5 w-3.5 h-3.5 ${openFilterModal === 'level' || selectedLevel !== 'all' ? 'text-[#F2CD78]' : 'text-[#142B5F] dark:text-[#F2CD78]'}`} />
                  <span className="truncate text-[11px] sm:text-xs font-bold font-['Cairo',sans-serif]">{selectedLevel === 'all' ? publicT('public_level') : selectedLevel}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOpenFilterModal('certificate')}
                  className={`relative flex min-h-[50px] items-center justify-between rounded-xl border px-2.5 pr-8 cursor-pointer font-['Cairo',sans-serif] transition-all ${
                    openFilterModal === 'certificate' || selectedCertificate !== 'all'
                      ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] border-[#142B5F] text-white shadow-2xs'
                      : 'border-[var(--mn-border)] bg-[var(--mn-page)] text-[var(--mn-heading)] hover:border-[#142B5F]/50 mn-panel'
                  }`}
                >
                  <Award className={`absolute right-2.5 w-3.5 h-3.5 ${openFilterModal === 'certificate' || selectedCertificate !== 'all' ? 'text-[#F2CD78]' : 'text-[#142B5F] dark:text-[#F2CD78]'}`} />
                  <span className="truncate text-[11px] sm:text-xs font-bold font-['Cairo',sans-serif]">{selectedCertificate === 'all' ? publicT('public_certificate_type') : selectedCertificate}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gold Divider Ribbon Line */}
      <div className="w-full h-0.5 bg-gradient-to-r from-[var(--mn-accent-text)] via-[var(--mn-accent-soft)] to-[var(--mn-accent-text)] shadow-xs mb-1" />

      {/* External Course Cards */}
      {visibleImportedCourses.length > 0 ? (
        <section className="max-w-lg md:max-w-[1120px] lg:max-w-[1160px] mx-auto mn-inline-gutter pt-2 md:pt-5 pb-5 space-y-3 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch">
          {paginatedImportedCourses.map((course) => {
            const { titleAr, titleEn } = resolveCourseBilingualTitle(course);
            const certificateLabel = course.freeCertificate
              ? 'شهادة مجانية'
              : 'بدون شهادة مجانية';

            return (
              <article
                key={course.id}
                onClick={() => onSelectCourse?.(course)}
                className="group relative overflow-hidden rounded-[22px] border border-[#142B5F]/65 dark:border-[#D6A43B]/60 hover:border-[#142B5F] bg-[var(--mn-surface)] shadow-[0_8px_24px_rgba(20,43,95,0.08)] transition-all duration-150 cursor-pointer h-full flex flex-col justify-between mn-panel"
              >
                {/* Top Thin Navy-only Accent Line */}
                <div className="absolute inset-x-0 top-0 h-[2px] bg-[#142B5F]" />

                {/* Subtle Right Accent Bar on Hover */}
                <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#142B5F] dark:from-[#D6A43B] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="p-3 pt-3.5 md:p-4 flex-1 flex flex-col justify-between">
                  {/* Header Row: Circular Provider Logo + Arabic Title & English Subtitle + Favorite Button */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Circular Provider Emblem with Thin Navy Circle Frame */}
                      <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full overflow-hidden bg-[var(--mn-surface)] border border-[#142B5F]/80 shadow-2xs shrink-0 flex items-center justify-center">
                        <CourseProviderLogo provider={course.provider} className="w-full h-full" />
                      </div>

                      {/* Course Name in Arabic on top, English underneath */}
                      <div className="min-w-0 flex-1 text-start">
                        <h2 className="line-clamp-2 text-[13.5px] sm:text-[14.5px] font-bold leading-snug text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-['Cairo',sans-serif]">
                          {titleAr}
                        </h2>
                        <p
                          dir="ltr"
                          className="mt-0.5 truncate text-[11px] sm:text-[11.5px] font-semibold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] text-end"
                        >
                          {titleEn}
                        </p>
                      </div>
                    </div>

                    {/* Favorite Button */}
                    {onToggleFavorite && (
                      <div className="shrink-0">
                        <FavoriteButton
                          active={favoriteIds.includes(course.id)}
                          onToggle={(event) => {
                            event.stopPropagation();
                            onToggleFavorite(course.id);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Sleek Provider & Domain Ribbon (المكان المخصص للمزود والمجال) */}
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-muted)]/70 px-2.5 py-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <Layers3 className="h-3.5 w-3.5 shrink-0 text-[#142B5F] dark:text-[#F2CD78]" />
                      <span className="truncate text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                        {course.field}
                      </span>
                    </div>

                    <div
                      dir={HAS_ARABIC_REGEX.test(course.provider || '') ? 'rtl' : 'ltr'}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-[#142B5F]/20 dark:border-[#D6A43B]/35 bg-[var(--mn-surface)] px-2.5 py-0.5 shadow-2xs"
                    >
                      <Building2 className="h-3 w-3 shrink-0 text-[#142B5F] dark:text-[#F2CD78]" />
                      <span className="text-[9.5px] sm:text-[10px] font-bold text-[#142B5F] dark:text-[#D6A43B] font-['Cairo',sans-serif]">
                        {course.provider}
                      </span>
                    </div>
                  </div>

                  {/* 2×2 Compact Single-Line Info Grid with Right-Aligned Parallel Icons */}
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {/* Box 1: اللغة */}
                    <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-3 pl-2 py-1.5 flex items-center justify-start gap-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel">
                      <Languages className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#239BA6]" />
                      <span className="truncate">
                        {course.language}
                      </span>
                    </div>

                    {/* Box 2: المستوى */}
                    <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-3 pl-2 py-1.5 flex items-center justify-start gap-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel">
                      <GraduationCap className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#239BA6]" />
                      <span className="truncate">
                        {course.level}
                      </span>
                    </div>

                    {/* Box 3: دورة مجانية */}
                    <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-3 pl-2 py-1.5 flex items-center justify-start gap-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#239BA6]" />
                      <span className="truncate">
                        {course.studyFree ? 'دورة مجانية' : 'دورة مدفوعة'}
                      </span>
                    </div>

                    {/* Box 4: شهادة مجانية */}
                    <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-3 pl-2 py-1.5 flex items-center justify-start gap-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel">
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#239BA6]" />
                      <span className="truncate">
                        {certificateLabel}
                      </span>
                    </div>
                  </div>

                  {/* Bottom CTA Button (Navy-to-Petrol Gradient) */}
                  <div className="mt-3 border-t border-[var(--mn-border)] pt-2.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectCourse?.(course);
                      }}
                      className="flex w-full items-center justify-between rounded-xl bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] px-3.5 py-2.5 text-white shadow-sm transition-transform active:scale-[0.99] mn-inverse cursor-pointer"
                    >
                      <div className="flex items-center">
                        {course.duration && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-[10px] font-bold text-[var(--mn-accent-soft)] font-['Cairo',sans-serif]">
                            <Clock3 className="h-3 w-3 shrink-0" />
                            <span>{course.duration}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11.5px] font-bold font-['Cairo',sans-serif]">
                          {publicT('public_view_details')}
                        </span>
                        <ArrowLeft className="h-4 w-4 text-[var(--mn-accent-soft)]" />
                      </div>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

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
        </section>
      ) : (
        <div className="max-w-lg md:max-w-[1120px] lg:max-w-[1160px] mx-auto mn-inline-gutter pt-2 pb-5">
          <div className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-5 text-center text-[11px] font-bold text-[var(--mn-text-muted)] shadow-sm mn-panel ">{publicT('public_no_courses_match_the_current_filters')}</div>
        </div>
      )}

      <div className="w-full h-0.5 bg-gradient-to-r from-[var(--mn-accent-text)] via-[var(--mn-accent-soft)] to-[var(--mn-accent-text)] shadow-xs" />
    </div>
  );
};
