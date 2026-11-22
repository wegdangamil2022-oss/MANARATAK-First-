import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Building2,
  Check,
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
import { PublicCardsPagination, PublicInlineFilterPanel, usePaginatedCatalog } from './DetailUi';

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
      className="min-h-screen bg-[#F6F8FA] dark:bg-[#0A1326] text-[#203442] dark:text-[#EDF5F5] pb-24 font-['Cairo',sans-serif] select-none mn-panel dark:[--mn-border:rgba(255,255,255,0.12)]"
      dir={publicDir}
    >
      {/* HERO — compact balanced visual language matching Scholarships & Majors */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-2.5 pb-2.5 sm:pt-4 sm:pb-3 overflow-hidden shadow-xs mn-inverse ">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-3 left-5 grid grid-cols-5 gap-1.5 opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[#F2CD78]" />
            ))}
          </div>

          <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full border border-[#F2CD78]/20 pointer-events-none" />
          <div className="absolute -top-6 -left-6 w-72 h-72 rounded-full border border-[#F2CD78]/12 pointer-events-none" />

          <svg
            className="absolute bottom-0 inset-x-0 w-full h-12 opacity-25"
            viewBox="0 0 500 80"
            fill="none"
            preserveAspectRatio="none"
          >
            <path d="M-20,70 Q250,-20 520,70" stroke="#F2CD78" strokeWidth="2" fill="none" />
          </svg>
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

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-1.5 sm:space-y-2 md:space-y-3 pt-0.5 md:pt-2">
          <div className="flex justify-center">
            <Sparkles className="h-4.5 w-4.5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#F2CD78] drop-shadow-[0_0_8px_rgba(214,164,59,0.75)]" aria-hidden="true" />
          </div>

          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              {publicT('public_courses')}{' '}<span className="text-[#F2CD78]">{publicT('public_worldwide')}</span>
            </h1>

            <div className="flex justify-center pt-0.5 pb-0.5">
              <div className="w-10 md:w-14 h-0.5 bg-gradient-to-r from-[#D6A43B] via-[#F2CD78] to-[#D6A43B] rounded-full" />
            </div>

            <p className="text-[10px] sm:text-xs md:text-sm text-[#DDEFF2] font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto px-2 line-clamp-2">
              {publicT('public_search_free_courses_from_leading_global_platforms_and')}
            </p>
          </div>

          <div className="pt-0.5 sm:pt-1 max-w-sm sm:max-w-md md:max-w-xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={publicT('public_enter_a_course_name_domain_or_platform')}
                className="w-full py-2 sm:py-2.5 md:py-3 pl-4 pr-10 md:pr-11 bg-white dark:bg-[#111E38] text-[#203442] dark:text-[#EDF5F5] rounded-full text-[12px] md:text-sm font-bold placeholder:text-[#5C707C] dark:placeholder:text-[#9BB4C7] placeholder:text-[12px] md:placeholder:text-sm placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none shadow-md border border-[#142B5F]/12 dark:border-white/14 focus:border-[#0E7C86] dark:focus:border-[#34BFC9] transition-all text-center font-['Cairo',sans-serif] mn-panel "
              />
              <Search className="w-4 h-4 md:w-4.5 md:h-4.5 text-[#0E7C86] dark:text-[#34BFC9] absolute right-3.5 md:right-4 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-[#5C707C] dark:text-[#9BB4C7] hover:text-[#142B5F] dark:hover:text-white cursor-pointer"
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
              className="text-[10px] md:text-xs font-bold text-[#142B5F] dark:text-[#F2CD78] bg-white/95 dark:bg-[#111E38]/95 hover:bg-white dark:hover:bg-[#162747] border border-[#142B5F]/15 dark:border-[#F2CD78]/30 px-2.5 md:px-3.5 py-0.5 md:py-1 rounded-full shadow-xs transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif]"
            >
              <RotateCcw className="w-3 h-3 text-[#0E7C86] dark:text-[#34BFC9]" />
              <span>{publicT('public_reset_filters')}{activeFiltersCount})</span>
            </button>
          </div>
        )}

        {/* 3 balanced filter tiles matching Scholarships & Majors */}
        <div className="max-w-md md:max-w-2xl mx-auto mn-inline-gutter mt-2 sm:mt-2.5 md:mt-3.5 relative z-20 pb-0 md:pb-1">
          <div className="grid grid-cols-3 gap-2 md:gap-3.5">
            {/* 1. تصفية */}
            <button
              type="button"
              onClick={() => {
                setShowAdvancedFilters((current) => {
                  const next = !current;
                  setOpenFilterModal(null);
                  return next;
                });
              }}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                showAdvancedFilters
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : advancedFiltersCount > 0
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]`}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <SlidersHorizontal className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${advancedFiltersCount > 0 ? 'text-[#D6A43B] dark:text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#34BFC9]'}`} />
                <span className="min-w-0 truncate">{advancedFiltersCount > 0 ? publicT('public_filter_count', { v0: advancedFiltersCount }) : publicT('public_filter')}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </button>

            {/* 2. المنصة */}
            <button
              type="button"
              onClick={() => {
                setShowAdvancedFilters(false);
                setOpenFilterModal((prev) => (prev === 'platform' ? null : 'platform'));
              }}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                openFilterModal === 'platform'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedPlatform !== 'all'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]`}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <Globe2 className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${selectedPlatform !== 'all' ? 'text-[#D6A43B] dark:text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#34BFC9]'}`} />
                <span className="min-w-0 truncate">{selectedPlatform === 'all' ? publicT('public_platform') : selectedPlatform}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${openFilterModal === 'platform' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </button>

            {/* 3. نوع الدورة */}
            <button
              type="button"
              onClick={() => {
                setShowAdvancedFilters(false);
                setOpenFilterModal((prev) => (prev === 'courseType' ? null : 'courseType'));
              }}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                openFilterModal === 'courseType'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : freeCourseMode !== 'all'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]`}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <Award className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${freeCourseMode !== 'all' ? 'text-[#D6A43B] dark:text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#34BFC9]'}`} />
                <span className="min-w-0 truncate">{freeCourseMode === 'all' ? publicT('public_course_type') : publicT(selectedFreeCourseLabel)}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${openFilterModal === 'courseType' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Official Gold Divider Ribbon */}
      <div className="w-full h-[1.5px] bg-gradient-to-r from-[#D6A43B]/45 via-[#F2CD78] to-[#D6A43B]/45 dark:from-[#D6A43B]/30 dark:via-[#F2CD78]/65 dark:to-[#D6A43B]/30 mb-3 md:mb-5" />

      {/* Inline Attached Quick Filter Panels */}
      <PublicInlineFilterPanel
        isOpen={!showAdvancedFilters && openFilterModal === 'platform'}
        onClose={() => setOpenFilterModal(null)}
        title={publicT('public_choose_platform')}
        icon={Globe2}
        selectedValue={selectedPlatform}
        onSelect={setSelectedPlatform}
        dir={publicDir}
        options={[
          { value: 'all', label: publicT('public_all_platforms') },
          ...IMPORTED_PLATFORM_OPTIONS.map((platform) => ({
            value: platform,
            label: platform,
          })),
        ]}
      />

      <PublicInlineFilterPanel
        isOpen={!showAdvancedFilters && openFilterModal === 'courseType'}
        onClose={() => setOpenFilterModal(null)}
        title={publicT('public_choose_course_type')}
        icon={Award}
        selectedValue={freeCourseMode}
        onSelect={(val) => setFreeCourseMode(val as FreeCourseMode)}
        dir={publicDir}
        options={FREE_COURSE_OPTIONS.map((option) => ({
          value: option.value,
          label: publicT(option.label),
        }))}
      />

      {/* Inline Attached Smart Advanced Filter Panel (Collapsed Accordions by Default) */}
      {showAdvancedFilters && (
        <div className="w-full max-w-4xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1.5 sm:px-2 md:px-4 -mt-1.5 sm:-mt-2.5 mb-2.5 sm:mb-3">
          <div className="relative overflow-hidden bg-white dark:bg-[#111E38] border border-[#142B5F]/10 dark:border-white/10 rounded-xl shadow-[0_1px_6px_rgba(20,43,95,0.035)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] px-2.5 py-2 sm:px-3.5 sm:py-2.5 font-['Cairo',sans-serif] mn-panel">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#0E7C86]/45 to-transparent"
            />
            <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[#142B5F]/8 dark:border-white/8">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="relative w-6 h-6 rounded-md bg-[#142B5F] text-[#F2CD78] flex items-center justify-center shrink-0 overflow-hidden">
                  <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-1.5 h-1.5 bg-[#D6A43B] rounded-bl-[3px]" />
                  <SlidersHorizontal className="w-3 h-3 relative z-10" />
                </span>
                <h4 className="text-[11px] sm:text-[12px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] truncate">
                  {publicT('public_filter')}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdvancedFilters(false);
                  setOpenFilterModal(null);
                }}
                aria-label={publicT('public_close')}
                className="w-6 h-6 !min-h-[24px] rounded-md bg-[#F6F8FA] dark:bg-[#0B1529] border border-[#142B5F]/10 dark:border-white/10 text-[#142B5F] dark:text-[#EDF5F5] hover:border-[#0E7C86] hover:text-[#0E7C86] flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1.5">
              {/* Field Accordion */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setOpenFilterModal((prev) => (prev === 'field' ? null : 'field'))}
                  className={`w-full !min-h-[34px] flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    openFilterModal === 'field'
                      ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white border-transparent'
                      : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#EDF5F5] border-[#142B5F]/8 dark:border-white/8'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <BookOpen className={`w-3.5 h-3.5 shrink-0 ${openFilterModal === 'field' ? 'text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#38C6D4]'}`} />
                    <span className="text-[10.5px] sm:text-[11px] font-bold truncate">{publicT('public_domain_or_specialization')}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {selectedField !== 'all' && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[90px] ${openFilterModal === 'field' ? 'bg-white/15 text-[#F2CD78]' : 'bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#38C6D4]/15 dark:text-[#38C6D4]'}`}>
                        {COURSE_FIELD_OPTIONS.find((option) => option.value === selectedField)?.label || selectedField}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openFilterModal === 'field' ? 'rotate-180 text-[#F2CD78]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
                  </span>
                </button>
                {openFilterModal === 'field' && (
                  <div className="rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/65 border border-[#142B5F]/8 dark:border-white/8 p-1.5">
                    <div className="max-h-[188px] overflow-y-auto overscroll-contain grid grid-cols-1 sm:grid-cols-2 gap-1.5 py-0.5 pe-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#0E7C86 transparent' }}>
                      {[{ value: 'all', label: publicT('public_all_domains_and_specializations') }, ...COURSE_FIELD_OPTIONS].map((opt) => {
                        const isSelected = selectedField === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSelectedField(opt.value);
                              setOpenFilterModal(null);
                            }}
                            className={`min-w-0 w-full overflow-hidden !min-h-[34px] flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-colors cursor-pointer text-start ${
                              isSelected
                                ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white'
                                : 'bg-white dark:bg-[#111E38] hover:border-[#0E7C86]/40 text-[#142B5F] dark:text-[#E2ECF4] border border-[#142B5F]/8 dark:border-white/8'
                            }`}
                          >
                            <span className="min-w-0 flex-1 leading-snug break-words">{opt.label}</span>
                            {isSelected ? <Check className="w-3 h-3 text-[#38C6D4] shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#142B5F]/18 dark:bg-white/20" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Language Accordion */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setOpenFilterModal((prev) => (prev === 'language' ? null : 'language'))}
                  className={`w-full !min-h-[34px] flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    openFilterModal === 'language'
                      ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white border-transparent'
                      : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#EDF5F5] border-[#142B5F]/8 dark:border-white/8'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Languages className={`w-3.5 h-3.5 shrink-0 ${openFilterModal === 'language' ? 'text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#38C6D4]'}`} />
                    <span className="text-[10.5px] sm:text-[11px] font-bold truncate">{publicT('public_language')}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {selectedLanguage !== 'all' && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[90px] ${openFilterModal === 'language' ? 'bg-white/15 text-[#F2CD78]' : 'bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#38C6D4]/15 dark:text-[#38C6D4]'}`}>
                        {selectedLanguage}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openFilterModal === 'language' ? 'rotate-180 text-[#F2CD78]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
                  </span>
                </button>
                {openFilterModal === 'language' && (
                  <div className="rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/65 border border-[#142B5F]/8 dark:border-white/8 p-1.5">
                    <div className="max-h-[188px] overflow-y-auto overscroll-contain grid grid-cols-2 sm:grid-cols-3 gap-1.5 py-0.5 pe-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#0E7C86 transparent' }}>
                      {[{ value: 'all', label: publicT('public_all_languages') }, ...LANGUAGE_OPTIONS.map((language) => ({ value: language, label: language }))].map((opt) => {
                        const isSelected = selectedLanguage === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSelectedLanguage(opt.value);
                              setOpenFilterModal(null);
                            }}
                            className={`min-w-0 w-full overflow-hidden !min-h-[32px] flex items-center justify-between gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-colors cursor-pointer text-start ${
                              isSelected
                                ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white'
                                : 'bg-white dark:bg-[#111E38] hover:border-[#0E7C86]/40 text-[#142B5F] dark:text-[#E2ECF4] border border-[#142B5F]/8 dark:border-white/8'
                            }`}
                          >
                            <span className="min-w-0 flex-1 leading-snug break-words">{opt.label}</span>
                            {isSelected ? <Check className="w-3 h-3 text-[#38C6D4] shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#142B5F]/18 dark:bg-white/20" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Level Accordion */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setOpenFilterModal((prev) => (prev === 'level' ? null : 'level'))}
                  className={`w-full !min-h-[34px] flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    openFilterModal === 'level'
                      ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white border-transparent'
                      : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#EDF5F5] border-[#142B5F]/8 dark:border-white/8'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <GraduationCap className={`w-3.5 h-3.5 shrink-0 ${openFilterModal === 'level' ? 'text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#38C6D4]'}`} />
                    <span className="text-[10.5px] sm:text-[11px] font-bold truncate">{publicT('public_level')}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {selectedLevel !== 'all' && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[90px] ${openFilterModal === 'level' ? 'bg-white/15 text-[#F2CD78]' : 'bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#38C6D4]/15 dark:text-[#38C6D4]'}`}>
                        {selectedLevel}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openFilterModal === 'level' ? 'rotate-180 text-[#F2CD78]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
                  </span>
                </button>
                {openFilterModal === 'level' && (
                  <div className="rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/65 border border-[#142B5F]/8 dark:border-white/8 p-1.5">
                    <div className="max-h-[188px] overflow-y-auto overscroll-contain grid grid-cols-2 sm:grid-cols-3 gap-1.5 py-0.5 pe-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#0E7C86 transparent' }}>
                      {[{ value: 'all', label: publicT('public_all_levels') }, ...LEVEL_OPTIONS.map((level) => ({ value: level, label: level }))].map((opt) => {
                        const isSelected = selectedLevel === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSelectedLevel(opt.value);
                              setOpenFilterModal(null);
                            }}
                            className={`min-w-0 w-full overflow-hidden !min-h-[32px] flex items-center justify-between gap-1 px-2 py-1 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-colors cursor-pointer text-start ${
                              isSelected
                                ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white'
                                : 'bg-white dark:bg-[#111E38] hover:border-[#0E7C86]/40 text-[#142B5F] dark:text-[#E2ECF4] border border-[#142B5F]/8 dark:border-white/8'
                            }`}
                          >
                            <span className="min-w-0 flex-1 leading-snug break-words">{opt.label}</span>
                            {isSelected ? <Check className="w-3 h-3 text-[#38C6D4] shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#142B5F]/18 dark:bg-white/20" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Certificate Accordion */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setOpenFilterModal((prev) => (prev === 'certificate' ? null : 'certificate'))}
                  className={`w-full !min-h-[34px] flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    openFilterModal === 'certificate'
                      ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white border-transparent'
                      : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#EDF5F5] border-[#142B5F]/8 dark:border-white/8'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Award className={`w-3.5 h-3.5 shrink-0 ${openFilterModal === 'certificate' ? 'text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#38C6D4]'}`} />
                    <span className="text-[10.5px] sm:text-[11px] font-bold truncate">{publicT('public_certificate_type')}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {selectedCertificate !== 'all' && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[90px] ${openFilterModal === 'certificate' ? 'bg-white/15 text-[#F2CD78]' : 'bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#38C6D4]/15 dark:text-[#38C6D4]'}`}>
                        {selectedCertificate}
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openFilterModal === 'certificate' ? 'rotate-180 text-[#F2CD78]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
                  </span>
                </button>
                {openFilterModal === 'certificate' && (
                  <div className="rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/65 border border-[#142B5F]/8 dark:border-white/8 p-1.5">
                    <div className="max-h-[188px] overflow-y-auto overscroll-contain grid grid-cols-1 sm:grid-cols-2 gap-1.5 py-0.5 pe-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#0E7C86 transparent' }}>
                      {[{ value: 'all', label: publicT('public_all_certificate_types') }, ...CERTIFICATE_OPTIONS.map((certificate) => ({ value: certificate, label: certificate }))].map((opt) => {
                        const isSelected = selectedCertificate === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSelectedCertificate(opt.value);
                              setOpenFilterModal(null);
                            }}
                            className={`min-w-0 w-full overflow-hidden !min-h-[34px] flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-colors cursor-pointer text-start ${
                              isSelected
                                ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white'
                                : 'bg-white dark:bg-[#111E38] hover:border-[#0E7C86]/40 text-[#142B5F] dark:text-[#E2ECF4] border border-[#142B5F]/8 dark:border-white/8'
                            }`}
                          >
                            <span className="min-w-0 flex-1 leading-snug break-words">{opt.label}</span>
                            {isSelected ? <Check className="w-3 h-3 text-[#38C6D4] shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#142B5F]/18 dark:bg-white/20" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* External Course Cards */}
      {visibleImportedCourses.length > 0 ? (
        <section className="max-w-4xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1 sm:px-2 md:px-4 pt-1 pb-5 space-y-3 md:space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-semibold text-xs sm:text-sm md:text-base font-['Cairo',sans-serif]">
              <BookOpen className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-[#0E7C86] dark:text-[#34BFC9]" />
              <span>{publicT('public_courses')} ({visibleImportedCourses.length})</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] md:text-xs font-bold text-[#0E7C86] dark:text-[#7FD4DE] bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 px-2.5 md:px-3 py-0.5 md:py-1 rounded-full border border-[#0E7C86]/20 dark:border-[#34BFC9]/25 font-['Cairo',sans-serif]">
              <Globe2 className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#0E7C86] dark:text-[#34BFC9]" />
              <span>{publicT('public_global_platforms')}</span>
            </span>
          </div>

          <div className="flex flex-col gap-2.5 sm:gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch">
            {paginatedImportedCourses.map((course) => {
              const { titleAr, titleEn } = resolveCourseBilingualTitle(course);
              const certificateLabel = course.freeCertificate
                ? 'شهادة مجانية'
                : 'بدون شهادة مجانية';

              return (
                <article
                  key={course.id}
                  onClick={() => onSelectCourse?.(course)}
                  className="group relative overflow-hidden rounded-r-[4px] rounded-l-2xl border border-[#142B5F]/12 dark:border-white/10 border-r-3 border-r-[#142B5F] dark:border-r-[#F2CD78]/85 hover:border-[#142B5F]/28 dark:hover:border-[#F2CD78]/45 bg-white dark:bg-[#111E38] shadow-[0_4px_16px_rgba(20,43,95,0.04)] hover:shadow-[0_8px_24px_rgba(20,43,95,0.08)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.28)] transition-all duration-150 active:scale-[0.985] cursor-pointer h-full flex flex-col justify-between p-2.5 sm:p-3 md:p-4 gap-2 sm:gap-2.5 mn-panel"
                >
                  {/* Header Row: Circular Natural Provider Logo + Title + Favorite */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-white border border-[#142B5F]/18 dark:border-white/15 shadow-2xs shrink-0 flex items-center justify-center">
                        <CourseProviderLogo provider={course.provider} className="w-full h-full" />
                      </div>

                      <div className="min-w-0 flex-1 text-start">
                        <h2 className="line-clamp-2 text-[11.5px] sm:text-[12.5px] md:text-[14px] font-bold leading-snug text-[#142B5F] dark:text-[#F1F5F9] font-['Cairo',sans-serif]">
                          {titleAr}
                        </h2>
                        <p
                          dir="ltr"
                          className="mt-0.5 truncate text-[10px] sm:text-[11px] font-medium text-[#5C707C] dark:text-[#9BB4C7] font-['Cairo',sans-serif] text-end"
                        >
                          {titleEn}
                        </p>
                      </div>
                    </div>

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

                  {/* Provider & Domain Ribbon */}
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-[#142B5F]/8 dark:border-white/8 bg-[#F6F8FA] dark:bg-[#0B1529]/85 px-2.5 py-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <Layers3 className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
                      <span className="truncate text-[10px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif]">
                        {course.field}
                      </span>
                    </div>

                    <div
                      dir={HAS_ARABIC_REGEX.test(course.provider || '') ? 'rtl' : 'ltr'}
                      className="shrink-0 inline-flex items-center gap-1 rounded-md border border-[#0E7C86]/20 dark:border-[#34BFC9]/25 bg-white dark:bg-[#111E38] px-2 py-0.5"
                    >
                      <Building2 className="h-3 w-3 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
                      <span className="text-[9.5px] sm:text-[10px] font-bold text-[#142B5F] dark:text-[#EDF5F5] font-['Cairo',sans-serif]">
                        {course.provider}
                      </span>
                    </div>
                  </div>

                  {/* 2×2 Compact Info Grid */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
                      <Languages className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
                      <span className="min-w-0 leading-tight line-clamp-2 break-words">{course.language}</span>
                    </div>

                    <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
                      <GraduationCap className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
                      <span className="min-w-0 leading-tight line-clamp-2 break-words">{course.level}</span>
                    </div>

                    <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
                      <span className="min-w-0 leading-tight line-clamp-2 break-words">{course.studyFree ? 'دورة مجانية' : 'دورة مدفوعة'}</span>
                    </div>

                    <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
                      <span className="min-w-0 leading-tight line-clamp-2 break-words">{certificateLabel}</span>
                    </div>
                  </div>

                  {/* Bottom Action Row */}
                  <div className="pt-1.5 border-t border-[#142B5F]/8 dark:border-white/8 flex items-center justify-between gap-2">
                    {course.duration ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 px-2.5 py-1 text-[10px] font-bold text-[#5C707C] dark:text-[#9BB4C7] font-['Cairo',sans-serif]">
                        <Clock3 className="h-3 w-3 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
                        <span>{course.duration}</span>
                      </span>
                    ) : (
                      <span />
                    )}

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectCourse?.(course);
                      }}
                      className="bg-[#142B5F] hover:bg-[#0E7C86] dark:bg-[#162A52] dark:hover:bg-[#1C3566] text-white dark:text-[#F2CD78] border border-transparent dark:border-[#F2CD78]/35 rounded-lg px-3 py-1.5 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs mn-inverse"
                    >
                      <span className="text-[10px] sm:text-[11px] font-bold font-['Cairo',sans-serif] text-white dark:text-[#F2CD78]">
                        {publicT('public_view_details')}
                      </span>
                      <ChevronLeft className="h-3.5 w-3.5 rotate-180 text-[#F2CD78]" />
                    </button>
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
          </div>
        </section>
      ) : (
        <div className="max-w-4xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1 sm:px-2 md:px-4 pt-2 pb-5">
          <div className="rounded-2xl border border-[#142B5F]/12 dark:border-white/10 bg-white dark:bg-[#111E38] p-5 text-center text-[11px] font-bold text-[#5C707C] dark:text-[#9BB4C7] shadow-sm mn-panel ">
            {publicT('public_no_courses_match_the_current_filters')}
          </div>
        </div>
      )}
    </div>
  );
};
