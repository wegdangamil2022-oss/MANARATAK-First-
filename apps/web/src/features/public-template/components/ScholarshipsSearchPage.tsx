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
} from 'lucide-react';
import { Scholarship, DegreeLevel } from '../types';
import { type PublicScholarshipDataStatus } from '../publicScholarshipDataSource';

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

  return <Globe2 className="w-5 h-5 text-[var(--ab-heading)]" />;
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
  const [isCountriesExpanded, setIsCountriesExpanded] = useState(false);
  const [isMajorsExpanded, setIsMajorsExpanded] = useState(false);
  const [isLanguagesExpanded, setIsLanguagesExpanded] = useState(false);

  useEffect(() => {
    if (!initialCountryReferenceId) return;
    setSelectedFilter(`country:${initialCountryReferenceId}`);
    setSearchQuery('');
  }, [initialCountryReferenceId]);

  const scholarshipSource = dataStatus === 'prototype'
    ? scholarships.filter((s) => s.id === 'csc-china')
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

  // Extract unique majors/fields dynamically from source data
  const majorOptions = useMemo(() => {
    const set = new Set<string>();
    scholarshipSource.forEach((s) => {
      if (s.field) set.add(s.field.trim());
    });
    return Array.from(set).filter(Boolean);
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
    const available = new Set<DegreeLevel>();
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
        const matchesMajor =
          !selectedFilter.startsWith('major:') ||
          (s.field || '').trim() === selectedFilter.replace('major:', '');

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
          selectedDegree === 'الكل' || s.degreeLevel.includes(selectedDegree as DegreeLevel);
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
      className="min-h-screen bg-[var(--ab-page)] text-[var(--ab-heading)] pb-24 font-['Cairo',sans-serif] select-none ab-panel "
      dir={publicDir}
    >
      {/* ========================================================================= */}
      {/* HERO EMERALD BANNER - COMPACT LUXURY ARABIC DESIGN WITH GOLD ACCENTS       */}
      {/* ========================================================================= */}
      <div className="relative ab-search-hero text-white px-3 sm:px-4 pt-4 pb-3 overflow-hidden shadow-xs ab-inverse ">
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
              <div key={i} className="w-1 h-1 rounded-full bg-[var(--ab-accent)] ab-gold " />
            ))}
          </div>

          {/* Thin gold curved orbital line on left */}
          <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full border border-[var(--ab-accent)]/25 pointer-events-none" />
          <div className="absolute -top-6 -left-6 w-72 h-72 rounded-full border border-[var(--ab-accent)]/15 pointer-events-none" />

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
              stroke="var(--ab-accent)"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        <div className="max-w-md sm:max-w-xl mx-auto text-center relative z-10 space-y-2 pt-1">
          {/* Top 4-pointed Gold Sparkle Star */}
          <div className="flex justify-center">
            <Sparkles className="h-5 w-5 text-[var(--ab-accent-text)] drop-shadow-[0_0_8px_rgba(214,164,59,0.8)]" aria-hidden="true" />
          </div>

          {/* Main Title */}
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">{publicT('public_find')}{' '}<span className="text-[var(--ab-accent-text)]">{publicT('public_your_scholarship')}</span>
            </h1>

            {/* Small Gold Horizontal Divider */}
            <div className="flex justify-center pt-1 pb-0.5">
              <div className="w-10 h-0.5 bg-[var(--ab-accent)] rounded-full ab-gold " />
            </div>

            {/* Subtitle */}
            <p className="text-[11px] sm:text-xs text-white font-medium font-['Cairo',sans-serif] leading-relaxed max-w-xs sm:max-w-sm mx-auto">{publicT('public_discover_scholarships_worldwide_and_build_your_future_with')}</p>
          </div>

          {/* Integrated Clean White Search Bar in Hero */}
          <div className="pt-1 max-w-sm sm:max-w-md mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_enter_a_scholarship_name_major_or_country')}
                className="w-full py-2.5 pl-4 pr-10 bg-[var(--ab-surface)] text-[var(--ab-heading)] rounded-full text-[12px] font-bold placeholder:text-[var(--ab-text-muted)] placeholder:text-[12px] placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none shadow-md border border-[var(--ab-border)] focus:border-[var(--ab-accent)] transition-all text-center font-['Cairo',sans-serif] ab-panel "
                data-ab-design="cd18739893"
              />
              <Search className="w-4 h-4 text-[var(--ab-accent-text)] absolute right-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--ab-text-muted)] hover:text-[var(--ab-text)] cursor-pointer"
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
              className="text-[10px] font-bold text-[var(--ab-danger-text)] hover:text-[var(--ab-danger-text)] bg-[var(--ab-surface-elevated)]/95 px-2.5 py-0.5 rounded-full shadow-xs transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif] ab-panel "
            >
              <RotateCcw className="w-3 h-3" />
              <span>{publicT('public_reset_filters')}{activeFiltersCount})</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3 SEPARATE FLOATING FILTER TILES (NOW INSIDE THE NAVY HERO CONTAINER) */}
        {/* ========================================================================= */}
        <div className="max-w-lg mx-auto ab-inline-gutter mt-2.5 relative z-20 pb-0">
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
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
              className="relative bg-[var(--ab-surface)] hover:bg-[var(--ab-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer ab-panel "
            >
              <div className="flex items-center justify-center gap-1 text-[var(--ab-heading)] dark:text-[var(--ab-accent-soft)] font-semibold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <Globe2 className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="truncate">
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
              <ChevronDown className="w-3.5 h-3.5 text-[var(--ab-text-muted)] dark:text-[var(--ab-accent-soft)] mt-0.5" />
            </div>

            {/* Tile 2: نوع التمويل */}
            <div className="relative bg-[var(--ab-surface)] hover:bg-[var(--ab-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer ab-panel ">
              <div className="flex items-center justify-center gap-1 text-[var(--ab-heading)] dark:text-[var(--ab-accent-soft)] font-semibold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <Coins className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="truncate">
                  {selectedFunding === 'الكل' ? publicT('public_funding') : selectedFunding}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--ab-text-muted)] dark:text-[var(--ab-accent-soft)] mt-0.5" />
              <select
                value={selectedFunding}
                onChange={(e) => setSelectedFunding(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title={publicT('public_choose_funding_type')}
              >
                {fundingTypes.map((funding) => (
                  <option key={funding} value={funding}>
                    {funding === 'الكل' ? publicT('public_all_funding_types') : funding}
                  </option>
                ))}
              </select>
            </div>

            {/* Tile 3: الدرجة العلمية */}
            <div className="relative bg-[var(--ab-surface)] hover:bg-[var(--ab-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer ab-panel ">
              <div className="flex items-center justify-center gap-1 text-[var(--ab-heading)] dark:text-[var(--ab-accent-soft)] font-semibold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <GraduationCap className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="truncate">
                  {selectedDegree === 'الكل' ? publicT('public_degree') : selectedDegree}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--ab-text-muted)] dark:text-[var(--ab-accent-soft)] mt-0.5" />
              <select
                value={selectedDegree}
                onChange={(e) => setSelectedDegree(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title={publicT('public_choose_degree')}
              >
                {degreeLevels.map((degree) => (
                  <option key={degree} value={degree}>
                    {degree === 'الكل' ? publicT('public_all_degrees') : degree}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Gold Divider Ribbon Line */}
      <div className="w-full h-0.5 bg-gradient-to-r from-[var(--ab-accent-text)] via-[var(--ab-accent-soft)] to-[var(--ab-accent-text)] shadow-xs mb-3" />

      {/* ========================================================================= */}
      {/* 4. SCHOLARSHIP CARDS LIST                                                 */}
      {/* ========================================================================= */}
      <div ref={resultsRef} className="w-full max-w-2xl mx-auto px-1 sm:px-2 pt-1 space-y-3">
        {/* Section Header: المنح المتاحة (N) • محدثة باستمرار */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[var(--ab-heading)] font-semibold text-xs sm:text-sm font-['Cairo',sans-serif]">
            <GraduationCap className="w-3.5 h-3.5 text-[var(--ab-accent-text)]" />
            <span>{publicT('public_available_scholarships')}{filteredScholarships.length})</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--ab-accent-text)] bg-[var(--ab-accent)]/10 px-2 py-0.5 rounded-full border border-[var(--ab-accent)]/30 font-['Cairo',sans-serif]">
            <RotateCcw className="w-2.5 h-2.5 text-[var(--ab-accent-text)]" />
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

        {/* Cards Stack */}
        <div className="flex flex-col gap-2.5 sm:gap-3 w-full">
          {filteredScholarships.length === 0 ? (
            <div className="bg-[var(--ab-surface)] border border-[var(--ab-border)] rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-2xs ab-panel ">
              <div className="w-12 h-12 rounded-full bg-[var(--ab-surface-muted)] flex items-center justify-center text-[var(--ab-text-muted)] ab-panel ">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[var(--ab-heading)] font-['Cairo',sans-serif]">
                {dataStatus === 'unavailable'
                  ? publicT('public_could_not_load_published_scholarships')
                  : dataStatus === 'loading'
                    ? publicT('public_loading_published_scholarships')
                    : publicT('public_no_matching_scholarships_found')}
              </h3>
              <p className="text-xs text-[var(--ab-text-muted)] max-w-xs font-['Cairo',sans-serif]">
                {dataStatus === 'unavailable'
                  ? publicT('public_no_sample_information_has_been_substituted_try_again')
                  : dataStatus === 'loading'
                    ? publicT('public_connecting_to_the_public_read_interface_without_writing')
                    : publicT('public_try_changing_the_filters_or_searching_for_another_3')}
              </p>
              {dataStatus !== 'loading' && dataStatus !== 'unavailable' ? <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-1.5 bg-[var(--ab-primary)] text-white rounded-xl text-xs font-bold cursor-pointer font-['Cairo',sans-serif] ab-inverse "
              >{publicT('public_clear_filters_and_view_all')}</button> : null}
            </div>
          ) : (
            filteredScholarships.map((scholarship) => {
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
                  className="bg-[var(--ab-surface)] rounded-xl sm:rounded-2xl border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] active:border-[#142B5F] shadow-sm transition-all duration-150 active:scale-[0.985] p-2.5 sm:p-3 relative overflow-hidden group cursor-pointer flex flex-col gap-2 sm:gap-2.5 select-none ab-panel "
                >
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#142B5F] dark:from-[#D6A43B] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  {/* Top Row: Right Info & Circular Flag Badge | Left Favorite Button */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Visual Right (RTL): Circular Flag + Scholarship Names */}
                    <div className="flex items-center gap-2 sm:gap-2.5 text-start min-w-0 flex-1">
                      {/* Circular Flag Badge */}
                      <div className="w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-full p-0.5 bg-gradient-to-tr from-[var(--ab-primary)] via-[var(--ab-hero-secondary)] to-[var(--ab-accent-soft)] shadow-xs shrink-0 flex items-center justify-center ab-inverse ">
                        <div className="w-full h-full rounded-full overflow-hidden bg-[var(--ab-surface)] border border-white flex items-center justify-center text-lg sm:text-xl shadow-inner ab-panel ">
                          <ScholarshipCountryFlag
                            country={scholarship.country}
                            countryFlag={scholarship.countryFlag}
                            scholarshipId={scholarship.id}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-start text-start min-w-0 flex-1">
                        <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--ab-heading)] dark:text-[var(--ab-accent-soft)] font-['Cairo',sans-serif] leading-tight truncate w-full">
                          {scholarship.title}
                        </h3>
                        <span className="text-[10px] sm:text-[11px] font-medium text-[var(--ab-text-muted)] font-['Cairo',sans-serif] truncate w-full">
                          {scholarship.titleEn || scholarship.university}
                        </span>
                      </div>
                    </div>

                    {/* Visual Left (RTL): Favorite Button */}
                    <button
                      onClick={(e) => handleFavoriteClick(e, scholarship.id)}
                      className="w-8 h-8 rounded-full bg-[var(--ab-page)] hover:bg-[var(--ab-surface-muted)] border border-[var(--ab-border)] flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs shrink-0 ab-panel hover:ab-panel "
                      title={publicT('public_add_to_favorites')}
                    >
                      <Heart
                        className={`w-4 h-4 ${isFav ? 'fill-[var(--ab-accent)] text-[var(--ab-accent-text)]' : 'text-[var(--ab-text-muted)]'}`}
                      />
                    </button>
                  </div>

                  {/* Bottom Row: 4 Pill Badges (3 info badges + View Details CTA Button) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                    {/* 1. التمويل */}
                    <div className="bg-[var(--ab-page)] border border-[var(--ab-border)] rounded-lg px-2 py-1 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--ab-text)] font-['Cairo',sans-serif] ab-panel ">
                      <Coins className="w-3 h-3 text-[var(--ab-accent-text)] shrink-0" />
                      <span className="truncate">{scholarship.fundingType}</span>
                    </div>

                    {/* 2. الدرجة العلمية */}
                    <div className="bg-[var(--ab-page)] border border-[var(--ab-border)] rounded-lg px-2 py-1 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--ab-text)] font-['Cairo',sans-serif] ab-panel ">
                      <GraduationCap className="w-3 h-3 text-[var(--ab-heading)] shrink-0" />
                      <span className="truncate">{scholarship.degreeLevel.join(' • ')}</span>
                    </div>

                    {/* 3. الموعد النهائي */}
                    <div className="bg-[var(--ab-page)] border border-[var(--ab-border)] rounded-lg px-2 py-1 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--ab-text)] font-['Cairo',sans-serif] ab-panel ">
                      <Calendar className="w-3 h-3 text-[var(--ab-link)] shrink-0" />
                      <span className="truncate">{publicT('public_closes')}{' '}{scholarship.deadline}</span>
                    </div>

                    {/* 4. زر عرض التفاصيل مكان الآيلتس */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectScholarship) onSelectScholarship(scholarship);
                      }}
                      className="bg-[var(--ab-primary)] hover:bg-[var(--ab-primary)] text-white rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs ab-inverse hover:ab-inverse "
                      data-ab-design="26ecd1db9e"
                    >
                      <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight text-[var(--ab-accent-soft)]">{publicT('public_view_details')}</span>
                      <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-[var(--ab-accent-soft)]" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
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
          <div className="fixed top-0 inset-x-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-xs md:w-full bg-[var(--ab-surface)] border-b md:border-1.5 border-[var(--ab-accent)]/40 rounded-b-2xl md:rounded-2xl shadow-2xl z-50 flex flex-col p-4 max-h-[55vh] md:max-h-[75vh] font-['Cairo',sans-serif] select-none ab-panel transition-all">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[var(--ab-border)] shrink-0">
              <h4 className="text-[12px] font-bold text-[var(--ab-heading)] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[var(--ab-accent-text)] animate-pulse" />
                <span>{publicT('public_smart_filter_options')}</span>
              </h4>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="text-[10px] font-bold text-[var(--ab-accent-text)] bg-[var(--ab-accent)]/10 px-2.5 py-0.5 rounded-full hover:bg-[var(--ab-accent)]/20 transition-all cursor-pointer active:scale-95"
              >{publicT('public_close')}</button>
            </div>

            {/* Scrollable Container (Inside scrolling / عملية سحب) */}
            <div className="overflow-y-auto pr-0.5 flex-1 space-y-3">
              {/* 1. Accordion: فلترة حسب الدولة */}
              <div className="space-y-1">
                <button
                  onClick={() => setIsCountriesExpanded(!isCountriesExpanded)}
                  className="w-full flex items-center justify-between py-2 px-2.5 bg-[var(--ab-surface-muted)] hover:bg-[var(--ab-gold-surface)]/20 rounded-lg border border-[var(--ab-border)] transition-all cursor-pointer"
                >
                  <span className="text-[11px] font-bold text-[var(--ab-heading)]">{publicT('public_filter_by_country')}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[var(--ab-accent-text)] transition-transform duration-200 ${isCountriesExpanded ? 'rotate-180' : ''}`} />
                </button>
                
                {isCountriesExpanded && (
                  <div className="max-h-[140px] overflow-y-auto pr-1 space-y-0.5 border-r border-[var(--ab-border)] mr-1 mt-1">
                    {countryOptions.map((country) => {
                      const isSelected = selectedFilter === `country:${country.id}`;
                      return (
                        <button
                          key={country.id}
                          onClick={() => {
                            setSelectedFilter(isSelected ? 'الكل' : `country:${country.id}`);
                            setIsFilterOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer block ${isSelected ? 'bg-[var(--ab-accent)]/10 text-[var(--ab-accent-text)]' : 'hover:bg-[var(--ab-surface-muted)] text-[var(--ab-text)]'}`}
                          data-ab-design="55f5605788"
                        >
                          <span className="truncate">{country.label}</span>
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'border-[var(--ab-accent)] bg-[var(--ab-accent)] text-white' : 'border-[var(--ab-border)] bg-[var(--ab-surface)]'}`}>
                            {isSelected && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-2.5 h-2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Accordion: حسب التخصصات */}
              <div className="space-y-1">
                <button
                  onClick={() => setIsMajorsExpanded(!isMajorsExpanded)}
                  className="w-full flex items-center justify-between py-2 px-2.5 bg-[var(--ab-surface-muted)] hover:bg-[var(--ab-gold-surface)]/20 rounded-lg border border-[var(--ab-border)] transition-all cursor-pointer"
                >
                  <span className="text-[11px] font-bold text-[var(--ab-heading)]">{publicT('public_by_major')}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[var(--ab-accent-text)] transition-transform duration-200 ${isMajorsExpanded ? 'rotate-180' : ''}`} />
                </button>
                
                {isMajorsExpanded && (
                  <div className="max-h-[140px] overflow-y-auto pr-1 space-y-0.5 border-r border-[var(--ab-border)] mr-1 mt-1">
                    {majorOptions.length === 0 ? (
                      <span className="text-[9px] text-[var(--ab-text-muted)] block p-2 text-center" data-ab-design="a050cea8a2">{publicT('public_no_classified_majors_currently_available')}</span>
                    ) : (
                      majorOptions.map((major) => {
                        const isSelected = selectedFilter === `major:${major}`;
                        return (
                          <button
                            key={major}
                            onClick={() => {
                              setSelectedFilter(isSelected ? 'الكل' : `major:${major}`);
                              setIsFilterOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer block ${isSelected ? 'bg-[var(--ab-accent)]/10 text-[var(--ab-accent-text)]' : 'hover:bg-[var(--ab-surface-muted)] text-[var(--ab-text)]'}`}
                            data-ab-design="55f5605788"
                          >
                            <span className="truncate">{major}</span>
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'border-[var(--ab-accent)] bg-[var(--ab-accent)] text-white' : 'border-[var(--ab-border)] bg-[var(--ab-surface)]'}`}>
                              {isSelected && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-2.5 h-2.5">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* 3. Accordion: فلترة حسب شروط اللغة */}
              <div className="space-y-1">
                <button
                  onClick={() => setIsLanguagesExpanded(!isLanguagesExpanded)}
                  className="w-full flex items-center justify-between py-2 px-2.5 bg-[var(--ab-surface-muted)] hover:bg-[var(--ab-gold-surface)]/20 rounded-lg border border-[var(--ab-border)] transition-all cursor-pointer"
                >
                  <span className="text-[11px] font-bold text-[var(--ab-heading)]">{publicT('public_filter_by_language_requirements')}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[var(--ab-accent-text)] transition-transform duration-200 ${isLanguagesExpanded ? 'rotate-180' : ''}`} />
                </button>
                
                {isLanguagesExpanded && (
                  <div className="max-h-[140px] overflow-y-auto pr-1 space-y-0.5 border-r border-[var(--ab-border)] mr-1 mt-1">
                    {/* Option: No IELTS */}
                    {(() => {
                      const isSelected = selectedFilter === 'no_ielts';
                      return (
                        <button
                          onClick={() => {
                            setSelectedFilter(isSelected ? 'الكل' : 'no_ielts');
                            setIsFilterOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer block ${isSelected ? 'bg-[var(--ab-accent)]/10 text-[var(--ab-accent-text)]' : 'hover:bg-[var(--ab-surface-muted)] text-[var(--ab-text)]'}`}
                          data-ab-design="55f5605788"
                        >
                          <span className="truncate">{publicT('public_filter_for_no_ielts_or_toefl_requirement')}</span>
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'border-[var(--ab-accent)] bg-[var(--ab-accent)] text-white' : 'border-[var(--ab-border)] bg-[var(--ab-surface)]'}`}>
                            {isSelected && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-2.5 h-2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })()}
                    
                    {/* Option: English Study */}
                    {(() => {
                      const isSelected = selectedFilter === 'english_only';
                      return (
                        <button
                          onClick={() => {
                            setSelectedFilter(isSelected ? 'الكل' : 'english_only');
                            setIsFilterOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer block ${isSelected ? 'bg-[var(--ab-accent)]/10 text-[var(--ab-accent-text)]' : 'hover:bg-[var(--ab-surface-muted)] text-[var(--ab-text)]'}`}
                          data-ab-design="55f5605788"
                        >
                          <span className="truncate">{publicT('public_filter_for_study_in_english_only')}</span>
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'border-[var(--ab-accent)] bg-[var(--ab-accent)] text-white' : 'border-[var(--ab-border)] bg-[var(--ab-surface)]'}`}>
                            {isSelected && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-2.5 h-2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
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
    </div>
  );
};

export function ScholarshipsSearchPage(props: ScholarshipsSearchPageProps) {
  return props.dataStatus === 'prototype' ? <PrototypeScholarshipsSearchPage {...props} /> : <PublishedCatalogDiscovery favoriteIds={props.favoriteIds} onToggleFavorite={props.onToggleFavorite} kind="scholarships" onBack={props.onBack} countryId={props.initialCountryReferenceId} onScholarship={props.onSelectScholarship} />;
}
