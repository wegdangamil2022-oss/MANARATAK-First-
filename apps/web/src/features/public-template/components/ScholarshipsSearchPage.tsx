import { PublishedCatalogDiscovery } from './PublishedCatalogDiscovery';
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
} from 'lucide-react';
import { Scholarship, DegreeLevel } from '../types';
import { type PublicScholarshipDataStatus } from '../publicScholarshipDataSource';
import { PublicCardsPagination, PublicFilterSelectModal, usePaginatedCatalog } from './DetailUi';

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

const PrototypeScholarshipsSearchPage: React.FC<ScholarshipsSearchPageProps> = ({
  scholarships = [],
  onBack,
  onSelectScholarship,
  favoriteIds = [],
  onToggleFavorite,
  initialCountryReferenceId,
  dataStatus = 'prototype',
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('الكل');
  const [selectedDegree, setSelectedDegree] = useState('الكل');
  const [selectedFunding, setSelectedFunding] = useState('الكل');
  const [countryScopedScholarships] = useState<Scholarship[] | null>(null);

  // Custom filter popup accordion states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [isDegreeModalOpen, setIsDegreeModalOpen] = useState(false);
  const [isCountriesExpanded, setIsCountriesExpanded] = useState(false);
  const [isMajorsExpanded, setIsMajorsExpanded] = useState(false);
  const [isLanguagesExpanded, setIsLanguagesExpanded] = useState(false);

  useEffect(() => {
    if (!initialCountryReferenceId) return;
    setSelectedFilter(`country:${initialCountryReferenceId}`);
    setSearchQuery('');
  }, [initialCountryReferenceId]);

  // A design preview must show the full bundled scholarship card collection.
  // The API mode continues to use only the published scholarship source.
  const scholarshipSource = dataStatus === 'prototype'
    ? scholarships
    : (countryScopedScholarships ?? scholarships);
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

  // Filter scholarships
  const filteredScholarships = useMemo(() => {
    return scholarshipSource
      .filter((s) => {
        const q = searchQuery.trim().toLowerCase();
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

        const scholarshipCountryKey = s.countryReferenceId || (dataStatus === 'prototype' ? `prototype:${s.country}` : '');

        // 1. Match country filter if selected
        const matchesCountry =
          !selectedFilter.startsWith('country:') ||
          scholarshipCountryKey === selectedFilter.replace('country:', '');

        // 2. Match major filter if selected
        const targetMajor = selectedFilter.replace('major:', '').trim();
        const matchesMajor =
          !selectedFilter.startsWith('major:') ||
          (s.field || '').includes(targetMajor) ||
          (s.field || '').includes('كافة التخصصات') ||
          (s.field || '').includes('جميع التخصصات');

        // 3. Match IELTS-free filter if selected
        const matchesNoIelts =
          selectedFilter !== 'no_ielts' ||
          s.withoutIelts === true ||
          !s.requirements.some((req) => {
            const lower = req.toLowerCase();
            return lower.includes('ielts') || lower.includes('toefl') || lower.includes('آيلتس') || lower.includes('توفل');
          });

        // 4. Match English study-only filter if selected
        const matchesEnglishOnly =
          selectedFilter !== 'english_only' ||
          (() => {
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
          })();

        const matchesDegree =
          selectedDegree === 'الكل' ||
          s.degreeLevel.includes(selectedDegree as DegreeLevel) ||
          (selectedDegree === 'زمالة أبحاث' &&
            (s.degreeLevel.some((d) => d.includes('زمالة')) || s.id === 'csc-china'));
        const matchesFunding = selectedFunding === 'الكل' || s.fundingType === selectedFunding;

        return matchesQuery && matchesCountry && matchesMajor && matchesNoIelts && matchesEnglishOnly && matchesDegree && matchesFunding;
      })
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
      });
  }, [
    scholarshipSource,
    searchQuery,
    selectedFilter,
    selectedDegree,
    selectedFunding,
  ]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems: paginatedScholarships,
  } = usePaginatedCatalog(
    filteredScholarships,
    `${searchQuery}|${selectedFilter}|${selectedDegree}|${selectedFunding}`,
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
    setSelectedFilter('الكل');
    setSelectedDegree('الكل');
    setSelectedFunding('الكل');
  };

  const activeFiltersCount =
    (selectedFilter !== 'الكل' ? 1 : 0) +
    (selectedDegree !== 'الكل' ? 1 : 0) +
    (selectedFunding !== 'الكل' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0);

  return (
    <div
      className="min-h-screen bg-[var(--mn-page)] text-[var(--mn-heading)] pb-24 font-['Cairo',sans-serif] select-none mn-panel "
      dir={publicDir}
    >
      {/* ========================================================================= */}
      {/* HERO EMERALD BANNER - COMPACT LUXURY ARABIC DESIGN WITH GOLD ACCENTS       */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-4 pb-3 overflow-hidden shadow-xs mn-inverse ">
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

        {/* Background Decorative Mosque Silhouettes, Dot Grid & Gold Arcs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Top-left dot grid */}
          <div className="absolute top-3 left-5 grid grid-cols-5 gap-1.5 opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[var(--mn-accent)] mn-gold " />
            ))}
          </div>

          {/* Thin gold curved orbital line on left */}
          <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full border border-[var(--mn-accent)]/25 pointer-events-none" />
          <div className="absolute -top-6 -left-6 w-72 h-72 rounded-full border border-[var(--mn-accent)]/15 pointer-events-none" />

          {/* Mosque / Architectural silhouette on right in dark shade */}
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

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-2 md:space-y-3 pt-1 md:pt-2">
          {/* Top 4-pointed Gold Sparkle Star */}
          <div className="flex justify-center">
            <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-[var(--mn-accent-text)] drop-shadow-[0_0_8px_rgba(214,164,59,0.8)]" aria-hidden="true" />
          </div>

          {/* Main Title */}
          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">{publicT('public_find')}{' '}<span className="text-[var(--mn-accent-text)]">{publicT('public_your_scholarship')}</span>
            </h1>

            {/* Small Gold Horizontal Divider */}
            <div className="flex justify-center pt-1 pb-0.5">
              <div className="w-10 md:w-14 h-0.5 bg-[var(--mn-accent)] rounded-full mn-gold " />
            </div>

            {/* Subtitle */}
            <p className="text-[11px] sm:text-xs md:text-sm text-white font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto truncate">{publicT('public_discover_scholarships_worldwide_and_build_your_future_with')}</p>
          </div>

          {/* Integrated Clean White Search Bar in Hero */}
          <div className="pt-1 max-w-sm sm:max-w-md md:max-w-xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_enter_a_scholarship_name_major_or_country')}
                className="w-full py-2.5 md:py-3 pl-4 pr-10 md:pr-11 bg-[var(--mn-surface)] text-[var(--mn-heading)] rounded-full text-[12px] md:text-sm font-bold placeholder:text-[var(--mn-text-muted)] placeholder:text-[12px] md:placeholder:text-sm placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none shadow-md border border-[var(--mn-border)] focus:border-[var(--mn-accent)] transition-all text-center font-['Cairo',sans-serif] mn-panel "
                data-mn-design="cd18739893"
              />
              <Search className="w-4 h-4 md:w-4.5 md:h-4.5 text-[var(--mn-accent-text)] absolute right-3.5 md:right-4 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
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
              onClick={handleResetFilters}
              className="text-[10px] md:text-xs font-bold text-[var(--mn-danger-text)] hover:text-[var(--mn-danger-text)] bg-[var(--mn-surface-elevated)]/95 px-2.5 md:px-3.5 py-0.5 md:py-1 rounded-full shadow-xs transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif] mn-panel "
            >
              <RotateCcw className="w-3 h-3" />
              <span>{publicT('public_reset_filters')}{activeFiltersCount})</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3 SEPARATE FLOATING FILTER TILES (NOW INSIDE THE NAVY HERO CONTAINER) */}
        {/* ========================================================================= */}
        <div className="max-w-lg md:max-w-3xl mx-auto mn-inline-gutter mt-2.5 md:mt-3.5 relative z-20 pb-0 md:pb-1">
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 md:gap-3.5">
            {/* Tile 1: الفلترة الذكية */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setIsFilterOpen(true);
                }
              }}
              onClick={() => setIsFilterOpen(true)}
              className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]"
            >
              <div className="flex items-center justify-center gap-1 md:gap-1.5 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-bold text-[11px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <Globe2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="truncate font-['Cairo',sans-serif]">
                  {selectedFilter === 'الكل'
                    ? publicT('public_filter_2')
                    : selectedFilter.startsWith('country:')
                      ? (countryOptions.find((item) => `country:${item.id}` === selectedFilter)?.label || publicT('public_country'))
                      : selectedFilter.startsWith('major:')
                        ? selectedFilter.replace('major:', '')
                        : selectedFilter === 'no_ielts'
                          ? publicT('public_without_ielts')
                          : selectedFilter === 'english_only'
                            ? publicT('public_english_language')
                            : publicT('public_filter_2')}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)] mt-0.5" />
            </div>

            {/* Tile 2: نوع التمويل */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsFundingModalOpen(true);
                }
              }}
              onClick={() => setIsFundingModalOpen(true)}
              className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]"
              title={publicT('public_choose_funding_type')}
            >
              <div className="flex items-center justify-center gap-1 md:gap-1.5 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-bold text-[11px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <Coins className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="truncate font-['Cairo',sans-serif]">
                  {selectedFunding === 'الكل' ? publicT('public_funding') : selectedFunding}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)] mt-0.5" />
            </div>

            {/* Tile 3: الدرجة العلمية */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsDegreeModalOpen(true);
                }
              }}
              onClick={() => setIsDegreeModalOpen(true)}
              className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]"
              title={publicT('public_choose_degree')}
            >
              <div className="flex items-center justify-center gap-1 md:gap-1.5 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-bold text-[11px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <GraduationCap className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="truncate font-['Cairo',sans-serif]">
                  {selectedDegree === 'الكل'
                    ? publicT('public_degree')
                    : selectedDegree === 'زمالة أبحاث'
                      ? 'الزمالة'
                      : selectedDegree}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)] mt-0.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Gold Divider Ribbon Line */}
      <div className="w-full h-0.5 bg-gradient-to-r from-[var(--mn-accent-text)] via-[var(--mn-accent-soft)] to-[var(--mn-accent-text)] shadow-xs mb-3 md:mb-5" />

      {/* ========================================================================= */}
      {/* 4. SCHOLARSHIP CARDS LIST                                                 */}
      {/* ========================================================================= */}
      <div ref={resultsRef} className="w-full max-w-2xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1 sm:px-2 md:px-4 pt-1 space-y-3 md:space-y-4">
        {/* Section Header: المنح المتاحة (N) • محدثة باستمرار */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[var(--mn-heading)] font-semibold text-xs sm:text-sm md:text-base font-['Cairo',sans-serif]">
            <GraduationCap className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-[var(--mn-accent-text)]" />
            <span>{publicT('public_available_scholarships')}{filteredScholarships.length})</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] md:text-xs font-bold text-[var(--mn-accent-text)] bg-[var(--mn-accent)]/10 px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-[var(--mn-accent)]/30 font-['Cairo',sans-serif]">
            <RotateCcw className="w-2.5 h-2.5 md:w-3 md:h-3 text-[var(--mn-accent-text)]" />
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
            <div className="md:col-span-2 lg:col-span-3 bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-2xs mn-panel ">
              <div className="w-12 h-12 rounded-full bg-[var(--mn-surface-muted)] flex items-center justify-center text-[var(--mn-text-muted)] mn-panel ">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm md:text-base font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                {dataStatus === 'unavailable'
                  ? publicT('public_could_not_load_published_scholarships')
                  : dataStatus === 'loading'
                    ? publicT('public_loading_published_scholarships')
                    : publicT('public_no_matching_scholarships_found')}
              </h3>
              <p className="text-xs md:text-sm text-[var(--mn-text-muted)] max-w-xs md:max-w-md font-['Cairo',sans-serif]">
                {dataStatus === 'unavailable'
                  ? publicT('public_no_sample_information_has_been_substituted_try_again')
                  : dataStatus === 'loading'
                    ? publicT('public_connecting_to_the_public_read_interface_without_writing')
                    : publicT('public_try_changing_the_filters_or_searching_for_another_3')}
              </p>
              {dataStatus !== 'loading' && dataStatus !== 'unavailable' ? <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-1.5 bg-[var(--mn-primary)] text-white rounded-xl text-xs md:text-sm font-bold cursor-pointer font-['Cairo',sans-serif] mn-inverse "
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
                  className="h-full bg-[var(--mn-surface)] rounded-r-[4px] rounded-l-2xl border border-[#142B5F]/30 dark:border-[var(--mn-border)] border-r-3 border-r-[#142B5F] dark:border-r-[var(--mn-accent)] hover:border-[#142B5F]/50 dark:hover:border-[var(--mn-accent)]/40 shadow-xs transition-all duration-150 active:scale-[0.985] p-2.25 sm:p-2.75 md:p-3.75 relative overflow-hidden group cursor-pointer flex flex-col justify-between gap-2 sm:gap-2.25 md:gap-2.75 select-none mn-panel "
                >
                  {/* Top Row: Right Info & Circular Flag Badge | Left Favorite Button */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Visual Right (RTL): Circular Flag + Scholarship Names */}
                    <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 text-start min-w-0 flex-1">
                      {/* Circular Flag Badge */}
                      <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11.5 md:h-11.5 rounded-full p-0.5 bg-[#0E7C86] shadow-xs shrink-0 flex items-center justify-center mn-inverse ">
                        <div className="w-full h-full rounded-full overflow-hidden bg-[var(--mn-surface)] border border-white flex items-center justify-center text-lg sm:text-xl shadow-inner mn-panel ">
                          <ScholarshipCountryFlag
                            country={scholarship.country}
                            countryFlag={scholarship.countryFlag}
                            scholarshipId={scholarship.id}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-start text-start min-w-0 flex-1">
                        <h3 className="text-[11.5px] sm:text-[12.5px] md:text-[14px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-['Cairo',sans-serif] leading-snug line-clamp-2 break-words w-full">
                          {scholarship.title}
                        </h3>
                        <span className="text-[9.5px] sm:text-[10.5px] md:text-[11.5px] font-medium text-[var(--mn-text-muted)] font-['Cairo',sans-serif] truncate w-full mt-0.5">
                          {scholarship.titleEn || scholarship.university}
                        </span>
                      </div>
                    </div>

                    {/* Visual Left (RTL): Favorite Button */}
                    <button
                      onClick={(e) => handleFavoriteClick(e, scholarship.id)}
                      className="w-7.5 h-7.5 sm:w-8 sm:h-8 md:w-8.5 md:h-8.5 rounded-full bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)] border border-[var(--mn-border)] flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs shrink-0 mn-panel hover:mn-panel "
                      title={publicT('public_add_to_favorites')}
                    >
                      <Heart
                        className={`w-3.75 h-3.75 md:w-4 md:h-4 ${isFav ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#38C6D4] dark:text-[#38C6D4]' : 'text-[var(--mn-text-muted)]'}`}
                      />
                    </button>
                  </div>

                  {/* Bottom Row: 4 Pill Badges (3 info badges + View Details CTA Button) in 2x2 Grid with right-aligned parallel icons */}
                  <div className="grid grid-cols-2 gap-1.25 sm:gap-1.5 md:gap-2 pt-1.5 md:pt-2.25 border-t border-[var(--mn-border)]/50 mt-auto">
                    {/* 1. التمويل */}
                    <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-2.5 pl-2 py-1.25 sm:py-1.5 md:py-1.75 flex items-center justify-start gap-1.25 sm:gap-1.5 text-[9.5px] sm:text-[10.5px] md:text-[11.5px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel ">
                      <Coins className="w-3.25 h-3.25 sm:w-3.5 sm:h-3.5 md:w-3.75 md:h-3.75 text-[#0E7C86] dark:text-[#239BA6] shrink-0" />
                      <span className="truncate">{scholarship.fundingType}</span>
                    </div>

                    {/* 2. الدرجة العلمية */}
                    <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-2.5 pl-2 py-1.25 sm:py-1.5 md:py-1.75 flex items-center justify-start gap-1.25 sm:gap-1.5 text-[9.5px] sm:text-[10.5px] md:text-[11.5px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel ">
                      <GraduationCap className="w-3.25 h-3.25 sm:w-3.5 sm:h-3.5 md:w-3.75 md:h-3.75 text-[#0E7C86] dark:text-[#239BA6] shrink-0" />
                      <span className="truncate" dir={scholarship.degreeLevel.length >= 3 ? 'ltr' : undefined}>
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

                    {/* 3. الموعد النهائي */}
                    <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-2.5 pl-2 py-1.25 sm:py-1.5 md:py-1.75 flex items-center justify-start gap-1.25 sm:gap-1.5 text-[9.5px] sm:text-[10.5px] md:text-[11.5px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel ">
                      <Calendar className="w-3.25 h-3.25 sm:w-3.5 sm:h-3.5 md:w-3.75 md:h-3.75 text-[#0E7C86] dark:text-[#239BA6] shrink-0" />
                      <span className="truncate">{publicT('public_closes')}{' '}{scholarship.deadline}</span>
                    </div>

                    {/* 4. زر عرض التفاصيل */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectScholarship) onSelectScholarship(scholarship);
                      }}
                      className="bg-[var(--mn-primary)] hover:bg-[var(--mn-primary)] text-white rounded-lg px-2.25 py-1.25 sm:py-1.5 md:py-1.75 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs mn-inverse hover:mn-inverse "
                    >
                      <span className="text-[9.5px] sm:text-[10.5px] md:text-[11.5px] font-bold text-center leading-tight text-[var(--mn-accent-soft)]">{publicT('public_view_details')}</span>
                      <ChevronLeft className="w-3.25 h-3.25 sm:w-3.5 sm:h-3.5 md:w-3.75 md:h-3.75 rotate-180 text-[var(--mn-accent-soft)]" />
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

      {/* Custom Filter Top Sheet (Half Screen on Mobile, Popover on Desktop) */}
      {isFilterOpen && (
        <>
          {/* Backdrop Blur */}
          <button
            type="button"
            aria-label={publicT('public_close_filter_options')}
            className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 transition-opacity animate-fade-in"
            onClick={() => setIsFilterOpen(false)}
          />

          {/* Top Sheet / Modal */}
          <div className="fixed top-14 inset-x-3 mx-auto max-w-xs md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full bg-[var(--mn-surface)] border-1.5 border-[#142B5F]/35 dark:border-[#D6A43B]/45 rounded-2xl shadow-2xl z-50 flex flex-col p-3.5 max-h-[380px] font-['Cairo',sans-serif] select-none mn-panel transition-all">

            {/* Header: Navy Icon before title + Horizontal Navy-Petrol Close Button */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--mn-border)] shrink-0 font-['Cairo',sans-serif]">
              <h4 className="text-[12px] font-bold text-[var(--mn-heading)] flex items-center gap-1.5 font-['Cairo',sans-serif]">
                <span className="w-6 h-6 rounded-lg bg-[#142B5F] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-white" />
                </span>
                <span>{publicT('public_smart_filter_options')}</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="text-[10.5px] font-bold text-white bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] px-3 py-1 rounded-lg hover:opacity-95 transition-all cursor-pointer active:scale-95 shadow-2xs font-['Cairo',sans-serif]"
              >
                {publicT('public_close')}
              </button>
            </div>

            {/* Scrollable Container (Inside scrolling / عملية سحب) */}
            <div
              className="overflow-y-auto overscroll-contain pr-0.5 flex-1 space-y-2 font-['Cairo',sans-serif]"
              data-mn-scrollbar
            >
              {/* 1. Accordion: فلترة حسب الدولة */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setIsCountriesExpanded(!isCountriesExpanded)}
                  className={`w-full flex items-center justify-between py-2 px-3 rounded-xl border transition-all cursor-pointer font-['Cairo',sans-serif] ${
                    isCountriesExpanded
                      ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white border-transparent shadow-xs'
                      : 'bg-[var(--mn-surface-muted)] hover:bg-[#142B5F]/[0.06] text-[var(--mn-heading)] border-[var(--mn-border)]'
                  }`}
                >
                  <span className={`text-[11px] font-bold font-['Cairo',sans-serif] ${isCountriesExpanded ? 'text-white' : 'text-[var(--mn-heading)]'}`}>
                    {publicT('public_filter_by_country')}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isCountriesExpanded ? 'rotate-180 text-[#F2CD78]' : 'text-[#142B5F] dark:text-[#F2CD78]'
                    }`}
                  />
                </button>

                {isCountriesExpanded && (
                  <div className="rounded-xl bg-[var(--mn-page)]/60 border border-[var(--mn-border)]/70 p-1.5 mt-1">
                    <div
                      className="max-h-[112px] overflow-y-auto overscroll-contain pr-1 space-y-1 border-r-2 border-[#0E7C86]/40 mr-1 font-['Cairo',sans-serif]"
                      data-mn-scrollbar
                    >
                      {countryOptions.map((country) => {
                        const isSelected = selectedFilter === `country:${country.id}`;
                        return (
                          <button
                            key={country.id}
                            type="button"
                            onClick={() => {
                              setSelectedFilter(isSelected ? 'الكل' : `country:${country.id}`);
                              setIsFilterOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-bold font-['Cairo',sans-serif] transition-colors cursor-pointer text-start ${
                              isSelected
                                ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white'
                                : 'bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] text-[var(--mn-text)]'
                            }`}
                            data-mn-design="55f5605788"
                          >
                            <span className="truncate font-['Cairo',sans-serif]">{country.label}</span>
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                                isSelected ? 'bg-[#F2CD78] scale-110' : 'bg-[#142B5F]/20 dark:bg-white/20'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    {countryOptions.length > 3 && (
                      <div className="mt-1 pt-1 border-t border-[var(--mn-border)]/50 flex items-center justify-center gap-1 text-[9px] font-bold text-[#0E7C86]">
                        <ChevronDown className="w-2.5 h-2.5 animate-bounce" />
                        <span>اسحب لعرض بقية الدول ({countryOptions.length})</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Accordion: حسب التخصصات */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setIsMajorsExpanded(!isMajorsExpanded)}
                  className={`w-full flex items-center justify-between py-2 px-3 rounded-xl border transition-all cursor-pointer font-['Cairo',sans-serif] ${
                    isMajorsExpanded
                      ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white border-transparent shadow-xs'
                      : 'bg-[var(--mn-surface-muted)] hover:bg-[#142B5F]/[0.06] text-[var(--mn-heading)] border-[var(--mn-border)]'
                  }`}
                >
                  <span className={`text-[11px] font-bold font-['Cairo',sans-serif] ${isMajorsExpanded ? 'text-white' : 'text-[var(--mn-heading)]'}`}>
                    {publicT('public_by_major')}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isMajorsExpanded ? 'rotate-180 text-[#F2CD78]' : 'text-[#142B5F] dark:text-[#F2CD78]'
                    }`}
                  />
                </button>

                {isMajorsExpanded && (
                  <div className="rounded-xl bg-[var(--mn-page)]/60 border border-[var(--mn-border)]/70 p-1.5 mt-1">
                    <div
                      className="max-h-[112px] overflow-y-auto overscroll-contain pr-1 space-y-1 border-r-2 border-[#0E7C86]/40 mr-1 font-['Cairo',sans-serif]"
                      data-mn-scrollbar
                    >
                      {majorOptions.length === 0 ? (
                        <span className="text-[10px] text-[var(--mn-text-muted)] block p-2 text-center font-['Cairo',sans-serif]" data-mn-design="a050cea8a2">{publicT('public_no_classified_majors_currently_available')}</span>
                      ) : (
                        majorOptions.map((major) => {
                          const isSelected = selectedFilter === `major:${major}`;
                          return (
                            <button
                              key={major}
                              type="button"
                              onClick={() => {
                                setSelectedFilter(isSelected ? 'الكل' : `major:${major}`);
                                setIsFilterOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-bold font-['Cairo',sans-serif] transition-colors cursor-pointer text-start ${
                                isSelected
                                  ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white'
                                  : 'bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] text-[var(--mn-text)]'
                              }`}
                              data-mn-design="55f5605788"
                            >
                              <span className="truncate font-['Cairo',sans-serif]">{major}</span>
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                                  isSelected ? 'bg-[#F2CD78] scale-110' : 'bg-[#142B5F]/20 dark:bg-white/20'
                                }`}
                              />
                            </button>
                          );
                        })
                      )}
                    </div>
                    {majorOptions.length > 3 && (
                      <div className="mt-1 pt-1 border-t border-[var(--mn-border)]/50 flex items-center justify-center gap-1 text-[9px] font-bold text-[#0E7C86]">
                        <ChevronDown className="w-2.5 h-2.5 animate-bounce" />
                        <span>اسحب لعرض بقية التخصصات ({majorOptions.length})</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Accordion: فلترة حسب شروط اللغة */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setIsLanguagesExpanded(!isLanguagesExpanded)}
                  className={`w-full flex items-center justify-between py-2 px-3 rounded-xl border transition-all cursor-pointer font-['Cairo',sans-serif] ${
                    isLanguagesExpanded
                      ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white border-transparent shadow-xs'
                      : 'bg-[var(--mn-surface-muted)] hover:bg-[#142B5F]/[0.06] text-[var(--mn-heading)] border-[var(--mn-border)]'
                  }`}
                >
                  <span className={`text-[11px] font-bold font-['Cairo',sans-serif] ${isLanguagesExpanded ? 'text-white' : 'text-[var(--mn-heading)]'}`}>
                    {publicT('public_filter_by_language_requirements')}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isLanguagesExpanded ? 'rotate-180 text-[#F2CD78]' : 'text-[#142B5F] dark:text-[#F2CD78]'
                    }`}
                  />
                </button>

                {isLanguagesExpanded && (
                  <div className="max-h-[150px] overflow-y-auto pr-1 space-y-0.5 border-r-2 border-[#0E7C86]/40 mr-1.5 mt-1 font-['Cairo',sans-serif]">
                    {/* Option: No IELTS */}
                    {(() => {
                      const isSelected = selectedFilter === 'no_ielts';
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFilter(isSelected ? 'الكل' : 'no_ielts');
                            setIsFilterOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-bold font-['Cairo',sans-serif] transition-colors cursor-pointer text-start ${
                            isSelected
                              ? 'bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#F2CD78]/15 dark:text-[#F2CD78]'
                              : 'hover:bg-[var(--mn-surface-muted)] text-[var(--mn-text)]'
                          }`}
                          data-mn-design="55f5605788"
                        >
                          <span className="truncate font-['Cairo',sans-serif]">{publicT('public_filter_for_no_ielts_or_toefl_requirement')}</span>
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                              isSelected ? 'bg-[#0E7C86] scale-110' : 'bg-[#142B5F]/20 dark:bg-white/20'
                            }`}
                          />
                        </button>
                      );
                    })()}

                    {/* Option: English Study */}
                    {(() => {
                      const isSelected = selectedFilter === 'english_only';
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFilter(isSelected ? 'الكل' : 'english_only');
                            setIsFilterOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-bold font-['Cairo',sans-serif] transition-colors cursor-pointer text-start ${
                            isSelected
                              ? 'bg-[#142B5F]/10 text-[#142B5F] dark:bg-[#F2CD78]/15 dark:text-[#F2CD78]'
                              : 'hover:bg-[var(--mn-surface-muted)] text-[var(--mn-text)]'
                          }`}
                          data-mn-design="55f5605788"
                        >
                          <span className="truncate font-['Cairo',sans-serif]">{publicT('public_filter_for_study_in_english_only')}</span>
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                              isSelected ? 'bg-[#0E7C86] scale-110' : 'bg-[#142B5F]/20 dark:bg-white/20'
                            }`}
                          />
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Custom Cairo-Font Modal for Funding Type */}
      <PublicFilterSelectModal
        isOpen={isFundingModalOpen}
        title={publicT('public_choose_funding_type')}
        icon={Coins}
        selectedValue={selectedFunding}
        onSelect={(val) => setSelectedFunding(val)}
        onClose={() => setIsFundingModalOpen(false)}
        dir={publicDir}
        options={fundingTypes.map((funding) => ({
          value: funding,
          label: funding === 'الكل' ? publicT('public_all_funding_types') : funding,
        }))}
      />

      {/* Custom Cairo-Font Modal for Degree Level (including Fellowship / الزمالة) */}
      <PublicFilterSelectModal
        isOpen={isDegreeModalOpen}
        title={publicT('public_choose_degree')}
        icon={GraduationCap}
        selectedValue={selectedDegree}
        onSelect={(val) => setSelectedDegree(val)}
        onClose={() => setIsDegreeModalOpen(false)}
        dir={publicDir}
        options={degreeLevels.map((degree) => ({
          value: degree,
          label:
            degree === 'الكل'
              ? publicT('public_all_degrees')
              : degree === 'زمالة أبحاث'
                ? 'الزمالة'
                : degree,
        }))}
      />
    </div>
  );
};

export function ScholarshipsSearchPage(props: ScholarshipsSearchPageProps) {
  return props.dataStatus === 'prototype' ? <PrototypeScholarshipsSearchPage {...props} /> : <PublishedCatalogDiscovery favoriteIds={props.favoriteIds} onToggleFavorite={props.onToggleFavorite} kind="scholarships" onBack={props.onBack} countryId={props.initialCountryReferenceId} onScholarship={props.onSelectScholarship} />;
}
