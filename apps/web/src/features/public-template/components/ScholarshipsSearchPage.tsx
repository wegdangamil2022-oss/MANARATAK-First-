import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Heart,
  Calendar,
  ChevronLeft,
  ChevronDown,
  RotateCcw,
  GraduationCap,
  Coins,
  Globe2,
  Sparkles,
  SlidersHorizontal,
  BookOpen,
  Languages,
  Check,
} from 'lucide-react';
import { Scholarship, DegreeLevel } from '../types';
import { loadPublishedScholarships, type PublicScholarshipDataStatus } from '../publicScholarshipDataSource';
import { PublicCardsPagination, usePaginatedCatalog } from './DetailUi';

interface ScholarshipsSearchPageProps {
  scholarships?: Scholarship[];
  onBack?: () => void;
  onSelectScholarship?: (scholarship: Scholarship) => void;
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
  initialCountryReferenceId?: string;
  dataStatus?: PublicScholarshipDataStatus;
}

// Crisp Vector SVG Flag renderer matching Countries page style
const ScholarshipCountryFlag: React.FC<{
  country: string;
  countryFlag?: string;
  scholarshipId?: string;
}> = ({ country, countryFlag, scholarshipId }) => {
  const normCountry = (country || '').toLowerCase();

  if (
    normCountry.includes('صين') ||
    normCountry.includes('china') ||
    scholarshipId?.includes('china') ||
    scholarshipId?.includes('csc')
  ) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <circle cx="32" cy="32" r="32" fill="#DE2910" />
        <polygon points="16,14 18.5,21.5 12,16.8 20,16.8 13.5,21.5" fill="#FFDE00" />
        <polygon points="26,10 27,13 24.5,11.2 27.5,11.2 25,13" fill="#FFDE00" />
        <polygon points="29,16 30,19 27.5,17.2 30.5,17.2 28,19" fill="#FFDE00" />
        <polygon points="29,23 30,26 27.5,24.2 30.5,24.2 28,26" fill="#FFDE00" />
        <polygon points="25,28 26,31 23.5,29.2 26.5,29.2 24,31" fill="#FFDE00" />
      </svg>
    );
  }

  if (normCountry.includes('ترك') || normCountry.includes('turk')) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <circle cx="32" cy="32" r="32" fill="#E30A17" />
        <circle cx="28" cy="32" r="14" fill="#FFFFFF" />
        <circle cx="31" cy="32" r="11" fill="#E30A17" />
        <polygon
          points="40,32 42.5,33.5 41.5,30.5 44,28.5 41,28.5 40,25.5 39,28.5 36,28.5 38.5,30.5 37.5,33.5"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  if (
    normCountry.includes('بريطانيا') ||
    normCountry.includes('المملكة المتحدة') ||
    normCountry.includes('uk') ||
    normCountry.includes('britain')
  ) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipUkSch">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipUkSch)">
          <rect width="64" height="64" fill="#012169" />
          <path d="M0,0 L64,64 M64,0 L0,64" stroke="#FFFFFF" strokeWidth="8" />
          <path d="M0,0 L64,64 M64,0 L0,64" stroke="#C8102E" strokeWidth="4" />
          <path d="M32,0 V64 M0,32 H64" stroke="#FFFFFF" strokeWidth="12" />
          <path d="M32,0 V64 M0,32 H64" stroke="#C8102E" strokeWidth="7" />
        </g>
      </svg>
    );
  }

  if (
    normCountry.includes('ألمانيا') ||
    normCountry.includes('المانيا') ||
    normCountry.includes('germany') ||
    normCountry.includes('daad')
  ) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipDeSch">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipDeSch)">
          <rect x="0" y="0" width="64" height="21.3" fill="#000000" />
          <rect x="0" y="21.3" width="64" height="21.3" fill="#DD0000" />
          <rect x="0" y="42.6" width="64" height="21.4" fill="#FFCE00" />
        </g>
      </svg>
    );
  }

  if (normCountry.includes('ماليزيا') || normCountry.includes('malaysia')) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipMySch">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipMySch)">
          <rect x="0" y="0" width="64" height="64" fill="#FFFFFF" />
          <rect x="0" y="0" width="64" height="4.5" fill="#CC0000" />
          <rect x="0" y="9" width="64" height="4.5" fill="#CC0000" />
          <rect x="0" y="18" width="64" height="4.5" fill="#CC0000" />
          <rect x="0" y="27" width="64" height="4.5" fill="#CC0000" />
          <rect x="0" y="36" width="64" height="4.5" fill="#CC0000" />
          <rect x="0" y="45" width="64" height="4.5" fill="#CC0000" />
          <rect x="0" y="54" width="64" height="4.5" fill="#CC0000" />
          <rect x="0" y="0" width="34" height="34" fill="#000066" />
          <circle cx="15" cy="17" r="10" fill="#FFCC00" />
          <circle cx="18" cy="17" r="8" fill="#000066" />
          <polygon
            points="25,17 26.5,19 24.5,20.5 27,20.5 28,23 29,20.5 31.5,20.5 29.5,19 31,17 28.5,18 28,15.5 27.5,18"
            fill="#FFCC00"
          />
        </g>
      </svg>
    );
  }

  if (normCountry.includes('سعود') || normCountry.includes('saudi')) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <circle cx="32" cy="32" r="32" fill="#006C35" />
        <path d="M16,30 Q32,24 48,30" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
        <rect x="18" y="38" width="28" height="3" fill="#FFFFFF" />
        <polygon points="18,39.5 22,36 22,43" fill="#FFFFFF" />
      </svg>
    );
  }

  if (countryFlag) {
    return <span className="text-xl sm:text-2xl">{countryFlag}</span>;
  }

  return <Globe2 className="w-5 h-5 text-[var(--mn-heading)]" />;
};

const ScholarshipCatalog: React.FC<ScholarshipsSearchPageProps> = ({
  scholarships = [],
  onBack,
  onSelectScholarship,
  favoriteIds = [],
  onToggleFavorite,
  initialCountryReferenceId,
  dataStatus = 'prototype',
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  // Applied Search & Filter State (Independent multi-criteria filters)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('الكل');
  const [selectedMajor, setSelectedMajor] = useState('الكل');
  const [selectedFunding, setSelectedFunding] = useState('الكل');
  const [noIeltsOnly, setNoIeltsOnly] = useState(false);
  const [englishOnly, setEnglishOnly] = useState(false);
  const [selectedDegree, setSelectedDegree] = useState('الكل');

  // Draft Filter State inside Smart Filter Modal (only applied when clicking "تطبيق الفلترة")
  const [draftCountry, setDraftCountry] = useState('الكل');
  const [draftMajor, setDraftMajor] = useState('الكل');
  const [draftNoIelts, setDraftNoIelts] = useState(false);
  const [draftEnglishOnly, setDraftEnglishOnly] = useState(false);

  // Inline attached filter drawer & exclusive accordion state (starts collapsed on mobile)
  const [openFilterTab, setOpenFilterTab] = useState<'smart' | 'degree' | 'funding' | null>(null);
  const isFilterOpen = openFilterTab === 'smart';
  const [activeAccordion, setActiveAccordion] = useState<'country' | 'major' | 'language' | null>(null);

  const toggleSmartFilterPanel = () => {
    if (openFilterTab === 'smart') {
      setOpenFilterTab(null);
      return;
    }
    setDraftCountry(selectedCountry);
    setDraftMajor(selectedMajor);
    setDraftNoIelts(noIeltsOnly);
    setDraftEnglishOnly(englishOnly);
    setActiveAccordion(null);
    setOpenFilterTab('smart');
  };

  const toggleFilterTab = (tab: 'degree' | 'funding') => {
    setOpenFilterTab((prev) => (prev === tab ? null : tab));
  };

  const applySmartFilters = () => {
    setSelectedCountry(draftCountry);
    setSelectedMajor(draftMajor);
    setNoIeltsOnly(draftNoIelts);
    setEnglishOnly(draftEnglishOnly);
    setOpenFilterTab(null);
  };

  const resetDraftFilters = () => {
    setDraftCountry('الكل');
    setDraftMajor('الكل');
    setDraftNoIelts(false);
    setDraftEnglishOnly(false);
  };

  useEffect(() => {
    if (!initialCountryReferenceId) return;
    setSelectedCountry(initialCountryReferenceId);
    setSearchQuery('');
  }, [initialCountryReferenceId]);

  const scholarshipSource = scholarships;
  const resultsRef = useRef<HTMLDivElement>(null);

  // Extract unique countries
  const countryOptions = useMemo(() => {
    const options = new Map<string, string>();
    scholarshipSource.forEach((scholarship) => {
      const key = scholarship.countryReferenceId || (dataStatus === 'prototype' ? `prototype:${scholarship.country}` : '');
      if (key) options.set(key, scholarship.country);
    });
    return Array.from(options, ([id, label]) => ({ id, label }));
  }, [scholarshipSource, dataStatus]);

  // Extract unique majors/fields dynamically from source data (split comma lists into clean options)
  const majorOptions = useMemo(() => {
    const set = new Set<string>();
    scholarshipSource.forEach((s) => {
      if (!s.field) return;
      s.field
        .split(/[،,()•/]+/)
        .map((part) => part.trim())
        .filter((part) => part && part !== 'كافة التخصصات' && part !== 'جميع التخصصات')
        .forEach((part) => set.add(part));
    });
    return Array.from(set);
  }, [scholarshipSource]);

  // Keep filter options aligned with the actual scholarship dataset.
  // This prevents dead options from appearing when the API/data model changes.
  const fundingTypes = useMemo(() => {
    const set = new Set<string>();
    scholarshipSource.forEach((s) => {
      if (s.fundingType) set.add(s.fundingType);
    });
    return ['الكل', ...Array.from(set)];
  }, [scholarshipSource]);

  const degreeLevels = useMemo(() => {
    const preferredOrder: DegreeLevel[] = [
      'بكالوريوس',
      'ماجستير',
      'دكتوراه',
      'زمالة أبحاث',
      'دورات تدريبية',
    ];
    const available = new Set<DegreeLevel>(['بكالوريوس', 'ماجستير', 'دكتوراه', 'زمالة أبحاث']);
    scholarshipSource.forEach((s) => s.degreeLevel.forEach((level) => available.add(level)));
    return ['الكل', ...preferredOrder.filter((level) => available.has(level))];
  }, [scholarshipSource]);

  // Shared scholarship predicate used by both live list and draft count preview
  const matchesCriteria = (
    s: Scholarship,
    criteria: {
      query: string;
      country: string;
      major: string;
      funding: string;
      noIelts: boolean;
      english: boolean;
      degree: string;
    },
  ) => {
    const q = criteria.query.trim().toLowerCase();
    const searchableText = [
      s.title,
      s.titleEn,
      s.country,
      s.countryEn,
      s.university,
      s.universityEn,
      s.field,
      s.description,
      s.fundingType,
      s.tag,
      ...s.requirements,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesQuery = !q || searchableText.includes(q);

    const scholarshipCountryKey =
      s.countryReferenceId || (dataStatus === 'prototype' ? `prototype:${s.country}` : '');

    // 1. Country
    const matchesCountry =
      criteria.country === 'الكل' || scholarshipCountryKey === criteria.country;

    // 2. Major
    const targetMajor = criteria.major.trim();
    const matchesMajor =
      criteria.major === 'الكل' ||
      (s.field || '').includes(targetMajor) ||
      (s.field || '').includes('كافة التخصصات') ||
      (s.field || '').includes('جميع التخصصات');

    // 3. No IELTS / TOEFL
    const matchesNoIelts =
      !criteria.noIelts ||
      s.withoutIelts === true ||
      (dataStatus === 'prototype' && !s.requirements.some((req) => {
        const lower = req.toLowerCase();
        return (
          lower.includes('ielts') ||
          lower.includes('toefl') ||
          lower.includes('آيلتس') ||
          lower.includes('توفل')
        );
      }));

    // 4. English Study
    const matchesEnglishOnly =
      !criteria.english ||
      (dataStatus === 'prototype' ? (() => {
        const titleLower = (s.title || '').toLowerCase();
        const descLower = (s.description || '').toLowerCase();
        const fieldLower = (s.field || '').toLowerCase();
        const hasEnglishKeywords =
          titleLower.includes('english') ||
          titleLower.includes('إنجليزية') ||
          titleLower.includes('انجليزية') ||
          descLower.includes('english') ||
          descLower.includes('إنجليزية') ||
          descLower.includes('انجليزية') ||
          fieldLower.includes('english') ||
          fieldLower.includes('إنجليزية') ||
          fieldLower.includes('انجليزية');
        return hasEnglishKeywords || !!s.titleEn;
      })() : [s.publishedData?.studyLanguage, s.publishedData?.studyLanguageSourceLabel,
        ...(s.publishedData?.studyOptions ?? []).map(option => option.language === 'en' ? 'English' : 'Chinese'),
        ...(s.publishedData?.fundedProgramPairs ?? []).flatMap(pair => pair.studyLanguages?.map(value => value.name) ?? []),
      ].some(label => typeof label === 'string' && /english|[اإ]نجليزي/i.test(label)));

    // 5. Degree
    const matchesDegree =
      criteria.degree === 'الكل' ||
      s.degreeLevel.includes(criteria.degree as DegreeLevel) ||
      (criteria.degree === 'زمالة أبحاث' &&
        (s.degreeLevel.some((d) => d.includes('زمالة')) || (dataStatus === 'prototype' && s.id === 'csc-china')));

    // 6. Funding
    const matchesFunding = criteria.funding === 'الكل' || s.fundingType === criteria.funding;

    return (
      matchesQuery &&
      matchesCountry &&
      matchesMajor &&
      matchesNoIelts &&
      matchesEnglishOnly &&
      matchesDegree &&
      matchesFunding
    );
  };

  // Filter scholarships using committed filters
  const filteredScholarships = useMemo(() => {
    return scholarshipSource
      .filter((s) =>
        matchesCriteria(s, {
          query: searchQuery,
          country: selectedCountry,
          major: selectedMajor,
          funding: selectedFunding,
          noIelts: noIeltsOnly,
          english: englishOnly,
          degree: selectedDegree,
        }),
      )
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
      });
  }, [
    scholarshipSource,
    searchQuery,
    selectedCountry,
    selectedMajor,
    selectedFunding,
    noIeltsOnly,
    englishOnly,
    selectedDegree,
    dataStatus,
  ]);

  // Live preview count for draft filters inside the Smart Filter modal
  const draftMatchesCount = useMemo(() => {
    if (!isFilterOpen) return filteredScholarships.length;
    return scholarshipSource.filter((s) =>
      matchesCriteria(s, {
        query: searchQuery,
        country: draftCountry,
        major: draftMajor,
        funding: selectedFunding,
        noIelts: draftNoIelts,
        english: draftEnglishOnly,
        degree: selectedDegree,
      }),
    ).length;
  }, [
    isFilterOpen,
    filteredScholarships.length,
    scholarshipSource,
    searchQuery,
    draftCountry,
    draftMajor,
    selectedFunding,
    draftNoIelts,
    draftEnglishOnly,
    selectedDegree,
    dataStatus,
  ]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems: paginatedScholarships,
  } = usePaginatedCatalog(
    filteredScholarships,
    `${searchQuery}|${selectedCountry}|${selectedMajor}|${selectedFunding}|${noIeltsOnly}|${englishOnly}|${selectedDegree}`,
    30,
  );

  const handleFavoriteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(id);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCountry('الكل');
    setSelectedMajor('الكل');
    setSelectedFunding('الكل');
    setNoIeltsOnly(false);
    setEnglishOnly(false);
    setSelectedDegree('الكل');
  };

  const smartFiltersCount =
    (selectedCountry !== 'الكل' ? 1 : 0) +
    (selectedMajor !== 'الكل' ? 1 : 0) +
    (noIeltsOnly ? 1 : 0) +
    (englishOnly ? 1 : 0);

  const draftFiltersCount =
    (draftCountry !== 'الكل' ? 1 : 0) +
    (draftMajor !== 'الكل' ? 1 : 0) +
    (draftNoIelts ? 1 : 0) +
    (draftEnglishOnly ? 1 : 0);

  const activeFiltersCount =
    smartFiltersCount +
    (selectedDegree !== 'الكل' ? 1 : 0) +
    (selectedFunding !== 'الكل' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0);

  const selectedCountryLabel =
    selectedCountry !== 'الكل'
      ? countryOptions.find((item) => item.id === selectedCountry)?.label || publicT('public_country')
      : '';

  const draftCountryLabel =
    draftCountry !== 'الكل'
      ? countryOptions.find((item) => item.id === draftCountry)?.label || publicT('public_country')
      : '';

  const smartTileLabel = useMemo(() => {
    if (smartFiltersCount === 0) return publicT('public_filter_2');
    if (smartFiltersCount === 1) {
      if (selectedCountry !== 'الكل') return selectedCountryLabel;
      if (selectedMajor !== 'الكل') return selectedMajor;
      if (noIeltsOnly) return publicT('public_without_ielts');
      if (englishOnly) return publicT('public_english_language');
    }
    return `${publicT('public_filter_2')} (${smartFiltersCount})`;
  }, [
    smartFiltersCount,
    selectedCountry,
    selectedCountryLabel,
    selectedMajor,
    noIeltsOnly,
    englishOnly,
    publicT,
  ]);

  return (
    <div
      className="min-h-screen bg-[#F6F8FA] dark:bg-[#0A1326] text-[#203442] dark:text-[#EDF5F5] pb-24 font-['Cairo',sans-serif] select-none mn-panel dark:[--mn-border:rgba(255,255,255,0.12)]"
      dir={publicDir}
    >
      {/* ========================================================================= */}
      {/* HERO BANNER - NAVY TO PETROL WITH OFFICIAL MANARATAK GOLD ACCENTS         */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-2.5 pb-2.5 sm:pt-4 sm:pb-3 overflow-hidden shadow-xs mn-inverse ">
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

        {/* Background Decorative Silhouettes, Dot Grid & Subtle Official Gold Arcs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Top-left dot grid */}
          <div className="absolute top-3 left-5 grid grid-cols-5 gap-1.5 opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[#F2CD78]" />
            ))}
          </div>

          {/* Thin gold curved orbital line on left */}
          <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full border border-[#F2CD78]/20 pointer-events-none" />
          <div className="absolute -top-6 -left-6 w-72 h-72 rounded-full border border-[#F2CD78]/12 pointer-events-none" />

          {/* Architectural silhouette on right in dark shade */}
          <svg
            className="absolute -right-4 bottom-0 h-40 w-40 text-white/10 pointer-events-none"
            viewBox="0 0 200 200"
            fill="currentColor"
          >
            {/* Minaret 1 */}
            <rect x="140" y="50" width="16" height="150" />
            <polygon points="148,25 138,50 158,50" />
            <circle cx="148" cy="20" r="3" />
            {/* Dome */}
            <path d="M 80,130 Q 115,70 150,130 Z" />
            <circle cx="115" cy="65" r="4" />
            {/* Minaret 2 */}
            <rect x="70" y="80" width="12" height="120" />
            <polygon points="76,60 68,80 84,80" />
          </svg>

          {/* Lower Curved Gold Swirl */}
          <svg
            className="absolute bottom-0 inset-x-0 w-full h-12 opacity-22"
            viewBox="0 0 500 80"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-20,70 Q250,-20 520,70"
              stroke="#D6A43B"
              strokeWidth="1.8"
              fill="none"
            />
          </svg>
        </div>

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-1.5 sm:space-y-2 md:space-y-3 pt-0.5 md:pt-2">
          {/* Top 4-pointed Official Gold Sparkle Star */}
          <div className="flex justify-center">
            <Sparkles className="h-4.5 w-4.5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#F2CD78] drop-shadow-[0_0_8px_rgba(214,164,59,0.75)]" aria-hidden="true" />
          </div>

          {/* Main Title */}
          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              {publicT('public_find')}{' '}
              <span className="text-[#F2CD78]">{publicT('public_your_scholarship')}</span>
            </h1>

            {/* Small Official Gold Horizontal Divider */}
            <div className="flex justify-center pt-0.5 pb-0.5">
              <div className="w-10 md:w-14 h-0.5 bg-gradient-to-r from-[#D6A43B] via-[#F2CD78] to-[#D6A43B] rounded-full" />
            </div>

            {/* Subtitle */}
            <p className="text-[10px] sm:text-xs md:text-sm text-[#DDEFF2] font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto px-2 line-clamp-2">
              {publicT('public_discover_scholarships_worldwide_and_build_your_future_with')}
            </p>
          </div>

          {/* Integrated Clean Search Bar in Hero */}
          <div className="pt-0.5 sm:pt-1 max-w-sm sm:max-w-md md:max-w-xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_enter_a_scholarship_name_major_or_country')}
                className="w-full py-2 sm:py-2.5 md:py-3 pl-4 pr-10 md:pr-11 bg-white dark:bg-[#111E38] text-[#203442] dark:text-[#EDF5F5] rounded-full text-[12px] md:text-sm font-bold placeholder:text-[#5C707C] dark:placeholder:text-[#9BB4C7] placeholder:text-[12px] md:placeholder:text-sm placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none shadow-md border border-[#142B5F]/12 dark:border-white/14 focus:border-[#0E7C86] dark:focus:border-[#34BFC9] transition-all text-center font-['Cairo',sans-serif] mn-panel "
                data-mn-design="cd18739893"
              />
              <Search className="w-4 h-4 md:w-4.5 md:h-4.5 text-[#0E7C86] dark:text-[#34BFC9] absolute right-3.5 md:right-4 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-[#5C707C] dark:text-[#9BB4C7] hover:text-[#142B5F] dark:hover:text-white cursor-pointer"
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
              onClick={handleResetFilters}
              className="text-[10px] md:text-xs font-bold text-[#142B5F] dark:text-[#F2CD78] bg-white/95 dark:bg-[#111E38]/95 hover:bg-white dark:hover:bg-[#162747] border border-[#142B5F]/15 dark:border-[#F2CD78]/30 px-2.5 md:px-3.5 py-0.5 md:py-1 rounded-full shadow-xs transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif]"
            >
              <RotateCcw className="w-3 h-3 text-[#0E7C86] dark:text-[#34BFC9]" />
              <span>{publicT('public_reset_filters')}{activeFiltersCount})</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3 BALANCED FILTER TILES (Smart Filter + Degree + Funding Type)            */}
        {/* ========================================================================= */}
        <div className="max-w-md md:max-w-2xl mx-auto mn-inline-gutter mt-2 sm:mt-2.5 md:mt-3.5 relative z-20 pb-0 md:pb-1">
          <div className="grid grid-cols-3 gap-2 md:gap-3.5">
            {/* Tile 1: نظام الفلترة الذكية (الدولة + التخصص + شروط اللغة) */}
            <div
              role="button"
              tabIndex={0}
              aria-expanded={openFilterTab === 'smart'}
              onKeyDown={function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  toggleSmartFilterPanel();
                }
              }}
              onClick={toggleSmartFilterPanel}
              className={`relative bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                openFilterTab === 'smart'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-2 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : smartFiltersCount > 0
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#38C6D4]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif] min-w-0 overflow-hidden`}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10.5px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full min-w-0 overflow-hidden px-0.5">
                <SlidersHorizontal
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${
                    smartFiltersCount > 0
                      ? 'text-[#D6A43B] dark:text-[#F2CD78]'
                      : 'text-[#0E7C86] dark:text-[#38C6D4]'
                  }`}
                />
                <span className="min-w-0 truncate font-['Cairo',sans-serif]">{smartTileLabel}</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${
                  openFilterTab === 'smart'
                    ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]'
                    : 'text-[#5C707C] dark:text-[#9BB4C7]'
                }`}
              />
            </div>

            {/* Tile 2: الدرجة العلمية */}
            <div
              role="button"
              tabIndex={0}
              aria-expanded={openFilterTab === 'degree'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleFilterTab('degree');
                }
              }}
              onClick={() => toggleFilterTab('degree')}
              className={`relative bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                openFilterTab === 'degree'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-2 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedDegree !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#38C6D4]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif] min-w-0 overflow-hidden`}
              title={publicT('public_choose_degree')}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10.5px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full min-w-0 overflow-hidden px-0.5">
                <GraduationCap
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${
                    selectedDegree !== 'الكل'
                      ? 'text-[#D6A43B] dark:text-[#F2CD78]'
                      : 'text-[#0E7C86] dark:text-[#38C6D4]'
                  }`}
                />
                <span className="min-w-0 truncate font-['Cairo',sans-serif]">
                  {selectedDegree === 'الكل'
                    ? publicT('public_degree')
                    : selectedDegree === 'زمالة أبحاث'
                      ? 'الزمالة'
                      : selectedDegree}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${
                  openFilterTab === 'degree'
                    ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]'
                    : 'text-[#5C707C] dark:text-[#9BB4C7]'
                }`}
              />
            </div>

            {/* Tile 3: نوع التمويل */}
            <div
              role="button"
              tabIndex={0}
              aria-expanded={openFilterTab === 'funding'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleFilterTab('funding');
                }
              }}
              onClick={() => toggleFilterTab('funding')}
              className={`relative bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                openFilterTab === 'funding'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-2 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedFunding !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#38C6D4]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif] min-w-0 overflow-hidden`}
              title={publicT('public_choose_funding_type')}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10.5px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full min-w-0 overflow-hidden px-0.5">
                <Coins
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${
                    selectedFunding !== 'الكل'
                      ? 'text-[#D6A43B] dark:text-[#F2CD78]'
                      : 'text-[#0E7C86] dark:text-[#38C6D4]'
                  }`}
                />
                <span className="min-w-0 truncate font-['Cairo',sans-serif]">
                  {selectedFunding === 'الكل' ? publicT('public_funding') : selectedFunding}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${
                  openFilterTab === 'funding'
                    ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]'
                    : 'text-[#5C707C] dark:text-[#9BB4C7]'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Official Gold Divider Ribbon */}
      <div className="w-full h-[1.5px] bg-gradient-to-r from-[#D6A43B]/45 via-[#F2CD78] to-[#D6A43B]/45 dark:from-[#D6A43B]/30 dark:via-[#F2CD78]/65 dark:to-[#D6A43B]/30 mb-3 md:mb-4" />

      {/* ========================================================================= */}
      {/* INLINE ATTACHED EXPANDABLE FILTER PANEL (No Full-Screen Dimmed Overlay)   */}
      {/* ========================================================================= */}
      {openFilterTab && (
        <div className="w-full max-w-4xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1.5 sm:px-2 md:px-4 -mt-1.5 sm:-mt-2.5 mb-2.5 sm:mb-3">
          <div className="relative overflow-hidden bg-white dark:bg-[#111E38] border border-[#142B5F]/10 dark:border-white/10 rounded-xl shadow-[0_1px_6px_rgba(20,43,95,0.035)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] px-2.5 py-2 sm:px-3.5 sm:py-2.5 font-['Cairo',sans-serif] mn-panel">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#0E7C86]/45 to-transparent"
            />

            {/* Compact Drawer Header */}
            <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[#142B5F]/8 dark:border-white/8">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="relative w-6 h-6 rounded-md bg-[#142B5F] text-[#F2CD78] flex items-center justify-center shrink-0 overflow-hidden">
                  <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-1.5 h-1.5 bg-[#D6A43B] rounded-bl-[3px]" />
                  {openFilterTab === 'smart' ? (
                    <SlidersHorizontal className="w-3 h-3 relative z-10" />
                  ) : openFilterTab === 'degree' ? (
                    <GraduationCap className="w-3 h-3 relative z-10" />
                  ) : (
                    <Coins className="w-3 h-3 relative z-10" />
                  )}
                </span>
                <h4 className="text-[11px] sm:text-[12px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] truncate">
                  {openFilterTab === 'smart'
                    ? publicT('public_smart_filter_options')
                    : openFilterTab === 'degree'
                      ? publicT('public_choose_degree')
                      : publicT('public_choose_funding_type')}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setOpenFilterTab(null)}
                aria-label={publicT('public_close')}
                className="w-6 h-6 !min-h-[24px] rounded-md bg-[#F6F8FA] dark:bg-[#0B1529] border border-[#142B5F]/10 dark:border-white/10 text-[#142B5F] dark:text-[#EDF5F5] hover:border-[#0E7C86] hover:text-[#0E7C86] flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Panel Body: Smart Multi-Criteria Filter */}
            {openFilterTab === 'smart' && (
              <div className="space-y-1.5">
                {draftFiltersCount > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pb-1.5 border-b border-[#142B5F]/8 dark:border-white/8">
                    {draftCountry !== 'الكل' && (
                      <button
                        type="button"
                        onClick={() => setDraftCountry('الكل')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#142B5F]/8 dark:bg-[#F2CD78]/12 text-[#142B5F] dark:text-[#F2CD78] border border-[#142B5F]/15 dark:border-[#F2CD78]/25 text-[9.5px] font-bold cursor-pointer hover:opacity-80"
                      >
                        <span className="truncate max-w-[100px]">{draftCountryLabel}</span>
                        <X className="w-2.5 h-2.5 shrink-0" />
                      </button>
                    )}
                    {draftMajor !== 'الكل' && (
                      <button
                        type="button"
                        onClick={() => setDraftMajor('الكل')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0E7C86]/10 dark:bg-[#38C6D4]/15 text-[#0E7C86] dark:text-[#38C6D4] border border-[#0E7C86]/20 text-[9.5px] font-bold cursor-pointer hover:opacity-80"
                      >
                        <span className="truncate max-w-[100px]">{draftMajor}</span>
                        <X className="w-2.5 h-2.5 shrink-0" />
                      </button>
                    )}
                    {draftNoIelts && (
                      <button
                        type="button"
                        onClick={() => setDraftNoIelts(false)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#142B5F]/8 dark:bg-[#F2CD78]/12 text-[#142B5F] dark:text-[#F2CD78] border border-[#142B5F]/15 text-[9.5px] font-bold cursor-pointer hover:opacity-80"
                      >
                        <span>{publicT('public_without_ielts')}</span>
                        <X className="w-2.5 h-2.5 shrink-0" />
                      </button>
                    )}
                    {draftEnglishOnly && (
                      <button
                        type="button"
                        onClick={() => setDraftEnglishOnly(false)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0E7C86]/10 dark:bg-[#38C6D4]/15 text-[#0E7C86] dark:text-[#38C6D4] border border-[#0E7C86]/20 text-[9.5px] font-bold cursor-pointer hover:opacity-80"
                      >
                        <span>{publicT('public_english_language')}</span>
                        <X className="w-2.5 h-2.5 shrink-0" />
                      </button>
                    )}
                  </div>
                )}

                {/* 1. Country Accordion */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setActiveAccordion(activeAccordion === 'country' ? null : 'country')}
                    className={`w-full !min-h-[34px] flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                      activeAccordion === 'country'
                        ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white border-transparent'
                        : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#EDF5F5] border-[#142B5F]/8 dark:border-white/8'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Globe2 className={`w-3.5 h-3.5 shrink-0 ${activeAccordion === 'country' ? 'text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#38C6D4]'}`} />
                      <span className={`text-[10.5px] sm:text-[11px] font-bold truncate ${activeAccordion === 'country' ? 'text-white' : 'text-[#142B5F] dark:text-[#EDF5F5]'}`}>
                        {publicT('public_filter_by_country')}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {draftCountry !== 'الكل' && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[90px] ${
                          activeAccordion === 'country'
                            ? 'bg-white/15 text-[#F2CD78]'
                            : 'bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#38C6D4]/15 dark:text-[#38C6D4]'
                        }`}>
                          {draftCountryLabel}
                        </span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeAccordion === 'country' ? 'rotate-180 text-[#F2CD78]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
                    </span>
                  </button>

                  {activeAccordion === 'country' && (
                    <div className="rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/65 border border-[#142B5F]/8 dark:border-white/8 p-1.5">
                      <div
                        className={`max-h-[188px] overflow-y-auto overscroll-contain py-0.5 pe-0.5 grid ${
                          countryOptions.some((c) => c.label.trim().length > 16)
                            ? 'grid-cols-1 sm:grid-cols-2'
                            : 'grid-cols-2 sm:grid-cols-3'
                        } gap-1.5`}
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#0E7C86 transparent' }}
                      >
                        {countryOptions.map((country) => {
                          const isSelected = draftCountry === country.id;
                          return (
                            <button
                              key={country.id}
                              type="button"
                              onClick={() => setDraftCountry(isSelected ? 'الكل' : country.id)}
                              className={`min-w-0 w-full overflow-hidden !min-h-[32px] flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-colors cursor-pointer text-start ${
                                isSelected
                                  ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white'
                                  : 'bg-white dark:bg-[#111E38] hover:border-[#0E7C86]/40 text-[#142B5F] dark:text-[#E2ECF4] border border-[#142B5F]/8 dark:border-white/8'
                              }`}
                            >
                              <span className="min-w-0 flex-1 leading-snug break-words">{country.label}</span>
                              {isSelected ? <Check className="w-3 h-3 text-[#38C6D4] shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#142B5F]/18 dark:bg-white/20" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Major Accordion */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setActiveAccordion(activeAccordion === 'major' ? null : 'major')}
                    className={`w-full !min-h-[34px] flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                      activeAccordion === 'major'
                        ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white border-transparent'
                        : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#EDF5F5] border-[#142B5F]/8 dark:border-white/8'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <BookOpen className={`w-3.5 h-3.5 shrink-0 ${activeAccordion === 'major' ? 'text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#38C6D4]'}`} />
                      <span className={`text-[10.5px] sm:text-[11px] font-bold truncate ${activeAccordion === 'major' ? 'text-white' : 'text-[#142B5F] dark:text-[#EDF5F5]'}`}>
                        {publicT('public_by_major')}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {draftMajor !== 'الكل' && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[90px] ${
                          activeAccordion === 'major'
                            ? 'bg-white/15 text-[#F2CD78]'
                            : 'bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#38C6D4]/15 dark:text-[#38C6D4]'
                        }`}>
                          {draftMajor}
                        </span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeAccordion === 'major' ? 'rotate-180 text-[#F2CD78]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
                    </span>
                  </button>

                  {activeAccordion === 'major' && (
                    <div className="rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/65 border border-[#142B5F]/8 dark:border-white/8 p-1.5">
                      {majorOptions.length === 0 ? (
                        <span className="text-[10px] text-[#5C707C] dark:text-[#9BB4C7] block p-2 text-center">
                          {publicT('public_no_classified_majors_currently_available')}
                        </span>
                      ) : (
                        <div
                          className={`max-h-[188px] overflow-y-auto overscroll-contain py-0.5 pe-0.5 grid ${
                            majorOptions.some((m) => m.trim().length > 15)
                              ? 'grid-cols-1 sm:grid-cols-2'
                              : 'grid-cols-2 sm:grid-cols-3'
                          } gap-1.5`}
                          style={{ scrollbarWidth: 'thin', scrollbarColor: '#0E7C86 transparent' }}
                        >
                          {majorOptions.map((major) => {
                            const isSelected = draftMajor === major;
                            return (
                              <button
                                key={major}
                                type="button"
                                onClick={() => setDraftMajor(isSelected ? 'الكل' : major)}
                                className={`min-w-0 w-full overflow-hidden !min-h-[32px] flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-colors cursor-pointer text-start ${
                                  isSelected
                                    ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white'
                                    : 'bg-white dark:bg-[#111E38] hover:border-[#0E7C86]/40 text-[#142B5F] dark:text-[#E2ECF4] border border-[#142B5F]/8 dark:border-white/8'
                                }`}
                              >
                                <span className="min-w-0 flex-1 leading-snug break-words">{major}</span>
                                {isSelected ? <Check className="w-3 h-3 text-[#38C6D4] shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#142B5F]/18 dark:bg-white/20" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Language Accordion */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setActiveAccordion(activeAccordion === 'language' ? null : 'language')}
                    className={`w-full !min-h-[34px] flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                      activeAccordion === 'language'
                        ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white border-transparent'
                        : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#EDF5F5] border-[#142B5F]/8 dark:border-white/8'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Languages className={`w-3.5 h-3.5 shrink-0 ${activeAccordion === 'language' ? 'text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#38C6D4]'}`} />
                      <span className={`text-[10.5px] sm:text-[11px] font-bold truncate ${activeAccordion === 'language' ? 'text-white' : 'text-[#142B5F] dark:text-[#EDF5F5]'}`}>
                        {publicT('public_filter_by_language_requirements')}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {(draftNoIelts || draftEnglishOnly) && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          activeAccordion === 'language'
                            ? 'bg-white/15 text-[#F2CD78]'
                            : 'bg-[#0E7C86]/10 text-[#0E7C86] dark:bg-[#38C6D4]/15 dark:text-[#38C6D4]'
                        }`}>
                          {(draftNoIelts ? 1 : 0) + (draftEnglishOnly ? 1 : 0)}
                        </span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeAccordion === 'language' ? 'rotate-180 text-[#F2CD78]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
                    </span>
                  </button>

                  {activeAccordion === 'language' && (
                    <div className="rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529]/65 border border-[#142B5F]/8 dark:border-white/8 p-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDraftNoIelts(!draftNoIelts)}
                        className={`min-w-0 w-full overflow-hidden !min-h-[34px] flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-colors cursor-pointer text-start ${
                          draftNoIelts
                            ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white'
                            : 'bg-white dark:bg-[#111E38] hover:border-[#0E7C86]/40 text-[#142B5F] dark:text-[#E2ECF4] border border-[#142B5F]/8 dark:border-white/8'
                        }`}
                      >
                        <span className="min-w-0 flex-1 leading-snug break-words">{publicT('public_filter_for_no_ielts_or_toefl_requirement')}</span>
                        {draftNoIelts ? <Check className="w-3 h-3 text-[#38C6D4] shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#142B5F]/18 dark:bg-white/20" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDraftEnglishOnly(!draftEnglishOnly)}
                        className={`min-w-0 w-full overflow-hidden !min-h-[34px] flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[10px] sm:text-[10.5px] font-bold transition-colors cursor-pointer text-start ${
                          draftEnglishOnly
                            ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white'
                            : 'bg-white dark:bg-[#111E38] hover:border-[#0E7C86]/40 text-[#142B5F] dark:text-[#E2ECF4] border border-[#142B5F]/8 dark:border-white/8'
                        }`}
                      >
                        <span className="min-w-0 flex-1 leading-snug break-words">{publicT('public_filter_for_study_in_english_only')}</span>
                        {draftEnglishOnly ? <Check className="w-3 h-3 text-[#38C6D4] shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#142B5F]/18 dark:bg-white/20" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Compact Action Footer */}
                <div className="pt-1.5 border-t border-[#142B5F]/8 dark:border-white/8 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={applySmartFilters}
                    className="flex-1 !min-h-[34px] py-1.5 px-3 rounded-lg bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] hover:opacity-95 text-white text-[11px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>تطبيق الفلترة</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/15 text-[#F2CD78] text-[9.5px] font-extrabold leading-none">
                      {draftMatchesCount}
                    </span>
                  </button>

                  {draftFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={resetDraftFilters}
                      className="!min-h-[34px] px-2.5 py-1.5 rounded-lg bg-[#F6F8FA] dark:bg-[#0B1529] hover:border-[#0E7C86]/45 border border-[#142B5F]/10 dark:border-white/10 text-[#142B5F] dark:text-[#EDF5F5] text-[10.5px] font-bold transition-colors active:scale-95 flex items-center justify-center gap-1 cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3 h-3 text-[#0E7C86] dark:text-[#38C6D4]" />
                      <span>مسح</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Panel Body: Degree Selector (Instant 1-Tap) */}
            {openFilterTab === 'degree' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {degreeLevels.map((degree) => {
                  const isSelected = selectedDegree === degree;
                  const label =
                    degree === 'الكل'
                      ? publicT('public_all_degrees')
                      : degree === 'زمالة أبحاث'
                        ? 'الزمالة'
                        : degree;
                  return (
                    <button
                      key={degree}
                      type="button"
                      onClick={() => {
                        setSelectedDegree(degree);
                        setOpenFilterTab(null);
                      }}
                      className={`min-w-0 w-full overflow-hidden !min-h-[34px] flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-[10.5px] sm:text-[11.5px] font-bold transition-colors cursor-pointer text-start ${
                        isSelected
                          ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white'
                          : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#DCE7F0] border border-[#142B5F]/8 dark:border-white/8 hover:border-[#0E7C86]/40'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      {isSelected ? (
                        <Check className="w-3 h-3 text-[#38C6D4] shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#142B5F]/18 dark:bg-white/20" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Panel Body: Funding Type Selector (Instant 1-Tap) */}
            {openFilterTab === 'funding' && (
              <div
                className={`grid ${
                  fundingTypes.some((f) => (f === 'الكل' ? publicT('public_all_funding_types') : f).trim().length > 15)
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-2 sm:grid-cols-3'
                } gap-1.5`}
              >
                {fundingTypes.map((funding) => {
                  const isSelected = selectedFunding === funding;
                  const label = funding === 'الكل' ? publicT('public_all_funding_types') : funding;
                  return (
                    <button
                      key={funding}
                      type="button"
                      onClick={() => {
                        setSelectedFunding(funding);
                        setOpenFilterTab(null);
                      }}
                      className={`min-w-0 w-full overflow-hidden !min-h-[34px] flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-[10.5px] sm:text-[11.5px] font-bold transition-colors cursor-pointer text-start ${
                        isSelected
                          ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white'
                          : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#DCE7F0] border border-[#142B5F]/8 dark:border-white/8 hover:border-[#0E7C86]/40'
                      }`}
                    >
                      <span className="min-w-0 flex-1 leading-snug break-words">{label}</span>
                      {isSelected ? (
                        <Check className="w-3 h-3 text-[#38C6D4] shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#142B5F]/18 dark:bg-white/20" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SCHOLARSHIP CARDS LIST                                                 */}
      {/* ========================================================================= */}
      <div ref={resultsRef} className="w-full max-w-4xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1 sm:px-2 md:px-4 pt-1 space-y-3 md:space-y-4">
        {/* Section Header: المنح المتاحة (N) • شارة ضباب المعرفة */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-semibold text-xs sm:text-sm md:text-base font-['Cairo',sans-serif]">
            <GraduationCap className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-[#0E7C86] dark:text-[#34BFC9]" />
            <span>{publicT('public_available_scholarships')}{filteredScholarships.length})</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] md:text-xs font-bold text-[#0E7C86] dark:text-[#7FD4DE] bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 px-2.5 md:px-3 py-0.5 md:py-1 rounded-full border border-[#0E7C86]/20 dark:border-[#34BFC9]/25 font-['Cairo',sans-serif]">
            <RotateCcw className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#0E7C86] dark:text-[#34BFC9]" />
            <span>
              {dataStatus === 'prototype'
                ? publicT('public_sample_template_information')
                : dataStatus === 'ready'
                  ? publicT('public_from_the_published_record')
                  : dataStatus === 'loading'
                    ? publicT('public_loading_published_information')
                    : publicT('public_service_unavailable')}
            </span>
          </div>
        </div>

        {/* Cards Stack on Mobile, 2/3-Column Equal-Height Grid on Desktop */}
        <div className="flex flex-col gap-2.5 sm:gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch w-full">
          {filteredScholarships.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-[#111E38] border border-[#142B5F]/12 dark:border-white/10 rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-2xs mn-panel ">
              <div className="w-12 h-12 rounded-full bg-[#DDEFF2]/70 dark:bg-[#0B1529] flex items-center justify-center text-[#0E7C86] dark:text-[#34BFC9]">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm md:text-base font-bold text-[#142B5F] dark:text-[#F1F5F9] font-['Cairo',sans-serif]">
                {dataStatus === 'unavailable'
                  ? publicT('public_could_not_load_published_scholarships')
                  : dataStatus === 'loading'
                    ? publicT('public_loading_published_scholarships')
                    : publicT('public_no_matching_scholarships_found')}
              </h3>
              <p className="text-xs md:text-sm text-[#5C707C] dark:text-[#9BB4C7] max-w-xs md:max-w-md font-['Cairo',sans-serif]">
                {dataStatus === 'unavailable'
                  ? publicT('public_no_sample_information_has_been_substituted_try_again')
                  : dataStatus === 'loading'
                    ? publicT('public_connecting_to_the_public_read_interface_without_writing')
                    : publicT('public_try_changing_the_filters_or_searching_for_another_3')}
              </p>
              {dataStatus !== 'loading' && dataStatus !== 'unavailable' ? <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-1.5 bg-[#142B5F] hover:bg-[#0E7C86] text-white rounded-xl text-xs md:text-sm font-bold cursor-pointer transition-colors font-['Cairo',sans-serif]"
              >{publicT('public_clear_filters_and_view_all')}</button> : null}
            </div>
          ) : (
            paginatedScholarships.map((scholarship) => {
              const isFav = favoriteIds.includes(scholarship.id);
              return (
                <div
                  key={scholarship.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectScholarship?.(scholarship);
                    }
                  }}
                  onClick={() => onSelectScholarship && onSelectScholarship(scholarship)}
                  className="h-full bg-white dark:bg-[#111E38] rounded-r-[4px] rounded-l-2xl border border-[#142B5F]/12 dark:border-white/10 border-r-3 border-r-[#142B5F] dark:border-r-[#F2CD78]/85 hover:border-[#142B5F]/28 dark:hover:border-[#F2CD78]/45 shadow-[0_4px_16px_rgba(20,43,95,0.04)] hover:shadow-[0_8px_24px_rgba(20,43,95,0.08)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.28)] transition-all duration-150 active:scale-[0.985] p-2.5 sm:p-3 md:p-4 relative overflow-hidden group cursor-pointer flex flex-col justify-between gap-2 sm:gap-2.5 select-none mn-panel "
                >
                  {/* Top Row: Right Info & Circular Flag Badge | Left Favorite Button */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Visual Right (RTL): Circular Flag + Scholarship Names */}
                    <div className="flex items-center gap-2 sm:gap-2.5 text-start min-w-0 flex-1">
                      {/* Circular Flag Badge */}
                      <div className="w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-full p-0.5 bg-gradient-to-br from-[#142B5F] to-[#0E7C86] dark:from-[#0E7C86] dark:to-[#21A7B4] shadow-xs shrink-0 flex items-center justify-center mn-inverse ">
                        <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-[#111E38] border border-white dark:border-[#111E38] flex items-center justify-center text-lg sm:text-xl shadow-inner mn-panel ">
                          <ScholarshipCountryFlag
                            country={scholarship.country}
                            countryFlag={scholarship.countryFlag}
                            scholarshipId={scholarship.id}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-start text-start min-w-0 flex-1">
                        <h3 className="text-[11.5px] sm:text-[12.5px] md:text-[14px] font-bold text-[#142B5F] dark:text-[#F1F5F9] font-['Cairo',sans-serif] leading-snug line-clamp-2 break-words w-full">
                          {scholarship.title}
                        </h3>
                        <span className="text-[10px] sm:text-[11px] font-medium text-[#5C707C] dark:text-[#9BB4C7] font-['Cairo',sans-serif] truncate w-full mt-0.5">
                          {scholarship.titleEn || scholarship.university}
                        </span>
                      </div>
                    </div>

                    {/* Visual Left (RTL): Favorite Button */}
                    <button
                      onClick={(e) => handleFavoriteClick(e, scholarship.id)}
                      className="w-8 h-8 rounded-full bg-[#F6F8FA] dark:bg-[#0B1529] hover:bg-[#DDEFF2]/75 dark:hover:bg-[#172A4D] border border-[#142B5F]/10 dark:border-white/10 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs shrink-0"
                      title={publicT('public_add_to_favorites')}
                    >
                      <Heart
                        className={`w-4 h-4 ${isFav ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#34BFC9] dark:text-[#34BFC9]' : 'text-[#5C707C] dark:text-[#7E96AA]'}`}
                      />
                    </button>
                  </div>

                  {/* Bottom Row: 4 Structured Tiles (3 info tiles + View Details CTA Button) in 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#142B5F]/8 dark:border-white/8 mt-auto">
                    {/* 1. التمويل */}
                    <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif]">
                      <Coins className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                      <span className="min-w-0 leading-tight line-clamp-2 break-words">{scholarship.fundingType}</span>
                    </div>

                    {/* 2. الدرجة العلمية */}
                    <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif]">
                      <GraduationCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                      <span className="min-w-0 leading-tight line-clamp-2 break-words" dir={scholarship.degreeLevel.length >= 3 ? 'ltr' : undefined}>
                        {scholarship.degreeLevel.length >= 3
                          ? scholarship.degreeLevel
                              .map((deg) => {
                                const d = deg.trim();
                                if (d === 'بكالوريوس' || d.toLowerCase().includes('bachelor')) return 'BSc';
                                if (d === 'ماجستير' || d.toLowerCase().includes('master')) return 'MSc';
                                if (d === 'دكتوراه' || d === 'دكتوراة' || d.toLowerCase().includes('phd') || d.toLowerCase().includes('doctor')) return 'PhD';
                                if (d.includes('زمالة')) return 'Fellowship';
                                return d;
                              })
                              .join(' • ')
                          : scholarship.degreeLevel.join(' • ')}
                      </span>
                    </div>

                    {scholarship.deadline && <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif]">
                      <Calendar className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                      <span className="min-w-0 leading-tight line-clamp-2 break-words">{publicT('public_closes')}{' '}{scholarship.deadline}</span>
                    </div>}

                    {/* 4. زر عرض التفاصيل */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectScholarship) onSelectScholarship(scholarship);
                      }}
                      className="min-w-0 overflow-hidden bg-[#142B5F] hover:bg-[#0E7C86] dark:bg-[#162A52] dark:hover:bg-[#1C3566] text-white dark:text-[#F2CD78] border border-transparent dark:border-[#F2CD78]/35 rounded-lg px-2 py-1.5 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                      data-mn-design="26ecd1db9e"
                    >
                      <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight text-white dark:text-[#F2CD78] truncate">
                        {publicT('public_view_details')}
                      </span>
                      <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-[#F2CD78] shrink-0" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {filteredScholarships.length > 0 && (
          <PublicCardsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            dir={publicDir}
          />
        )}
      </div>
    </div>
  );
};

function LiveScholarshipCatalog(props: ScholarshipsSearchPageProps) {
  const { language } = usePublicTemplateTranslation();
  const [state, setState] = useState<{ rows: Scholarship[]; status: PublicScholarshipDataStatus }>({
    rows: [], status: 'loading',
  });
  useEffect(() => {
    const controller = new AbortController();
    setState({ rows: [], status: 'loading' });
    loadPublishedScholarships(language, controller.signal).then(rows => {
      if (!controller.signal.aborted) setState({ rows, status: rows.length ? 'ready' : 'empty' });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ rows: [], status: 'unavailable' });
    });
    return () => controller.abort();
  }, [language]);
  return <ScholarshipCatalog {...props} scholarships={state.rows} dataStatus={state.status} />;
}

export function ScholarshipsSearchPage(props: ScholarshipsSearchPageProps) {
  return props.dataStatus === 'prototype'
    ? <ScholarshipCatalog {...props} />
    : <LiveScholarshipCatalog {...props} />;
}
