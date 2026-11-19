import { CountryFlagImage } from './CountryFlagImage';
import { searchPublishedCountries } from '../publicLiveDataSource';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import { publicRelationshipRouteKey } from '../PublicGraphNavigationPolicy';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Search,
  Globe2,
  MapPin,
  ChevronDown,
  ChevronLeft,
  RotateCcw,
  Coins,
  Compass,
  X,
  Sparkles,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { CountryDestination } from '../types';
import type { PublicCountryGraphDto } from '../../../api/client';
import { CountryDetailModal } from './CountryDetailModal';
import { FavoriteButton } from './FavoriteButton';
import { PublicCardsPagination, PublicFilterSelectModal, usePaginatedCatalog } from './DetailUi';

interface CountriesSearchPageProps {
  dataMode?: 'api' | 'prototype';
  detailId?: string;
  onDetailChange?: (id: string) => void;
  countries: CountryDestination[];
  onBack: () => void;
  onSelectCountryScholarships?: (countryId: string) => void;
  onOpenUniversity?: (universityId: string) => void;
  onOpenScholarship?: (scholarshipId: string) => void;
  onOpenMajor?: (majorId: string) => void;
  onOpenExam?: (examId: string) => void;
  onOpenArticle?: (articleId: string) => void;
  initialCountryIdentity?: string;
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
  relationshipGraph?: PublicCountryGraphDto;
  searchAnchor?: string;
  searchTerm?: string;
}

// Bulletproof Vector SVG Flag renderer for guaranteed display matching design
export { CountryFlagImage } from './CountryFlagImage';


export const CountriesSearchPage: React.FC<CountriesSearchPageProps> = ({
  detailId,
  onDetailChange,
  countries,
  dataMode = 'api',
  onBack,
  onSelectCountryScholarships,
  onOpenUniversity,
  onOpenScholarship,
  onOpenMajor,
  onOpenExam,
  onOpenArticle,
  initialCountryIdentity,
  favoriteIds = [],
  onToggleFavorite,
  relationshipGraph,
  searchAnchor,
  searchTerm,
}) => {
  const { t: publicT, dir: publicDir, language: publicLanguage } = usePublicTemplateTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState('الكل');
  const [selectedCountryId, setSelectedCountryId] = useState('الكل');
  const [activeFilterModal, setActiveFilterModal] = useState<'continent' | 'country' | null>(null);
  const [localDetail, setLocalDetail] = useState<CountryDestination | null>(null);
  const [serverPage, setServerPage] = useState(1);
  const [serverResult, setServerResult] = useState<{
    data: CountryDestination[];
    totalPages: number;
    total: number;
  } | null>(null);
  const [serverLoading, setServerLoading] = useState(false),
    [serverError, setServerError] = useState(false);
  const availableCountries = [...countries, ...(serverResult?.data ?? [])];
  const activeCountryModal =
    detailId !== undefined
      ? availableCountries.find(
          (item) =>
            item.id === detailId ||
            item.publicId === detailId ||
            item.slug === detailId ||
            item.iso2Code === detailId.toUpperCase(),
        ) || null
      : localDetail;
  const setActiveCountryModal = (value: CountryDestination | null) =>
    onDetailChange ? onDetailChange(value?.slug || value?.id || '') : setLocalDetail(value);

  useEffect(() => {
    if (detailId || !initialCountryIdentity) return;
    const target = availableCountries.find(
      (country) =>
        country.id === initialCountryIdentity ||
        country.publicId === initialCountryIdentity ||
        country.slug === initialCountryIdentity ||
        country.iso2Code === initialCountryIdentity.toUpperCase(),
    );
    if (!target) {
      if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(initialCountryIdentity)) setSelectedCountryId(initialCountryIdentity);
      return;
    }
    setSelectedCountryId(target.ownerId || target.id);
    setSearchQuery('');
    setActiveCountryModal(target);
  }, [countries, serverResult?.data, detailId, initialCountryIdentity]);

  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    if (dataMode !== 'api') return;

  const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') setRefreshTick((value) => value + 1);
    }, 180000);
    return () => window.clearInterval(timer);
  }, [dataMode]);

  const filterIdentity = `${searchQuery}|${selectedContinent}|${selectedCountryId}|${publicLanguage}`;
  const previousFilter = useRef(filterIdentity);
  useEffect(() => {
    if (dataMode !== 'api') return;
    if (previousFilter.current !== filterIdentity) {
      previousFilter.current = filterIdentity;
      if (serverPage !== 1) {
        setServerPage(1);
        return;
      }
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setServerLoading(true);
      setServerError(false);
      setServerResult(null);
      void searchPublishedCountries(
        {
          q:
            searchQuery.trim() || undefined,
          region: selectedContinent === 'الكل' ? undefined : selectedContinent,
          countryReferenceId: selectedCountryId === 'الكل' ? undefined : selectedCountryId,
          page: serverPage,
        },
        publicLanguage === 'en' ? 'en' : 'ar',
      )
        .then((result) => {
          if (active)
            setServerResult({
              ...result,
              totalPages: result.totalPages ?? Math.ceil(result.total / 20),
            });
        })
        .catch(() => {
          if (active) setServerError(true);
        })
        .finally(() => {
          if (active) setServerLoading(false);
        });
    }, 220);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    dataMode,
    refreshTick,
    filterIdentity,
    serverPage,
    countries,
    searchQuery,
    selectedContinent,
    selectedCountryId,
    publicLanguage,
  ]);
  // Extract unique continents and countries
  const continents = useMemo(() => {
    const list = dataMode === 'api' ? ['Asia','Africa','Europe','Americas','Oceania'] : Array.from(new Set(countries.map((c) => c.continent)));
    return ['الكل', ...list];
  }, [countries,dataMode]);

  const regionLabel=(region:string)=>publicLanguage === 'ar' ? ({Asia:'آسيا',Africa:'أفريقيا',Europe:'أوروبا',Americas:'الأمريكتان',Oceania:'أوقيانوسيا'} as Record<string,string>)[region] ?? region : region;

  const countryNames = useMemo(() => {
    return [{ id: 'الكل', label: '' }, ...new Map([...countries, ...(serverResult?.data ?? [])].map(c => [c.ownerId || c.id, { id: c.ownerId || c.id, label: c.name }])).values()];
  }, [countries, serverResult?.data]);

  // Filtering
  const filteredCountries = useMemo(() => {
    if (dataMode === 'api') return serverResult?.data ?? [];
    return countries.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.continent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.popularCities.some((city) => city.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesContinent = selectedContinent === 'الكل' || c.continent === selectedContinent;
      const matchesCountry = selectedCountryId === 'الكل' || (c.ownerId || c.id) === selectedCountryId;

      return matchesSearch && matchesContinent && matchesCountry;
    });
  }, [countries, searchQuery, selectedContinent, selectedCountryId, dataMode, serverResult]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems: paginatedCountries,
  } = usePaginatedCatalog(
    filteredCountries,
    `${searchQuery}|${selectedContinent}|${selectedCountryId}`,
    30,
  );

  const activeFiltersCount =
    (selectedContinent !== 'الكل' ? 1 : 0) +
    (selectedCountryId !== 'الكل' ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedContinent('الكل');
    setSelectedCountryId('الكل');
  };

  const graphMatchesActiveCountry = Boolean(
    activeCountryModal &&
    relationshipGraph &&
    (relationshipGraph.subject.ownerId === activeCountryModal.id ||
      relationshipGraph.subject.canonicalCode === activeCountryModal.iso2Code),
  );
  const detailCountry: CountryDestination | null = activeCountryModal
    ? {
        ...activeCountryModal,
        scholarshipsCount: graphMatchesActiveCountry
          ? relationshipGraph!.readScope?.collections.scholarships?.state === 'AVAILABLE'
            ? relationshipGraph!.relationships.scholarships.total
            : null
          : activeCountryModal.scholarshipsCount,
        universitiesCount: graphMatchesActiveCountry
          ? relationshipGraph!.readScope?.collections.universities?.state === 'AVAILABLE'
            ? relationshipGraph!.relationships.universities.total
            : null
          : activeCountryModal.universitiesCount,
        featuredScholarships: graphMatchesActiveCountry
          ? relationshipGraph!.relationships.scholarships.data
              .filter((item) => Boolean(publicRelationshipRouteKey(item)))
              .map((item) => ({
                id: publicRelationshipRouteKey(item)!,
                name: item.displayName,
                nameEn: item.displayName,
                meta: publicLanguage === 'ar' ? 'منحة منشورة مرتبطة بهذه الدولة' : 'Published scholarship linked to this country',
              }))
          : activeCountryModal.featuredScholarships,
        featuredUniversities: graphMatchesActiveCountry
          ? relationshipGraph!.relationships.universities.data
              .filter((item) => Boolean(publicRelationshipRouteKey(item)))
              .map((item) => ({
                id: publicRelationshipRouteKey(item)!,
                name: item.displayName,
                nameEn: item.displayName,
                meta: publicLanguage === 'ar' ? 'جامعة منشورة في هذه الدولة' : 'Published university in this country',
              }))
          : activeCountryModal.featuredUniversities,
        featuredMajors: graphMatchesActiveCountry
          ? relationshipGraph!.relationships.majors
              .filter((item) => Boolean(publicRelationshipRouteKey(item)))
              .map((item) => ({
                id: publicRelationshipRouteKey(item)!,
                name: item.displayName,
                nameEn: item.displayName,
                meta: publicLanguage === 'ar' ? 'تخصص مرتبط ببرامج جامعات الدولة' : 'Major linked through university programs',
              }))
          : activeCountryModal.featuredMajors,
        relatedArticles: graphMatchesActiveCountry
          ? relationshipGraph!.relationships.editorialContent.map((item) => ({
              id: item.slug,
              title: item.title,
              typeLabel: item.contentType,
            }))
          : activeCountryModal.relatedArticles,
        requiredExams: graphMatchesActiveCountry
          ? relationshipGraph!.relationships.internationalTests.data
              .filter((item) => Boolean(publicRelationshipRouteKey(item)))
              .map((item) => ({
                id: publicRelationshipRouteKey(item)!,
                name: item.displayName,
                nameEn: item.displayName,
                meta: item.providerName,
              }))
          : activeCountryModal.requiredExams,
      }
    : null;

  if (detailCountry) {
    return (
      <CountryDetailModal
        country={detailCountry}
        searchAnchor={searchAnchor}
        searchTerm={searchTerm}
        isFavorite={favoriteIds.includes(detailCountry.id)}
        onToggleFavorite={onToggleFavorite}
        onClose={() => (onDetailChange ? onBack() : setActiveCountryModal(null))}
        onOpenUniversity={onOpenUniversity}
        onOpenScholarship={onOpenScholarship}
        onOpenMajor={onOpenMajor}
        onOpenExam={onOpenExam}
        onOpenArticle={onOpenArticle}
        onBrowseScholarships={() => {
          const countryId = detailCountry.id;
          setActiveCountryModal(null);
          onSelectCountryScholarships?.(countryId);
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-[var(--mn-page)] text-[var(--mn-heading)] pb-24 font-['Cairo',sans-serif] select-none mn-panel "
      dir={publicDir}
    >
      {/* ========================================================================= */}
      {/* HERO EMERALD BANNER - COMPACT ROYAL DESIGN                                */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-4 pb-3 overflow-hidden shadow-xs mn-inverse ">
        {/* Top-Right Circular Back Button */}
        <button
          onClick={onBack}
          className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-30 cursor-pointer text-white shadow-xs active:scale-95"
          title={publicT('public_back')}
          aria-label={publicT('public_back')}
        >
          <ChevronLeft className="w-4 h-4 rotate-180 text-white" />
        </button>

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

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-2 md:space-y-3 pt-1 md:pt-3">
          {/* Top 4-pointed Gold Sparkle Star */}
          <div className="flex justify-center">
            <Sparkles
              className="h-5 w-5 text-[var(--mn-accent-text)] drop-shadow-[0_0_8px_rgba(214,164,59,0.8)]"
              aria-hidden="true"
            />
          </div>

          {/* Main Title */}
          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              {publicT('public_find')}{' '}
              <span className="text-[var(--mn-accent-text)]">
                {publicT('public_your_study_destination')}
              </span>
            </h1>

            {/* Small Gold Horizontal Divider */}
            <div className="flex justify-center pt-1 pb-0.5">
              <div className="w-10 md:w-16 h-0.5 bg-[var(--mn-accent)] rounded-full mn-gold " />
            </div>

            {/* Subtitle */}
            <p className="text-[11px] sm:text-xs md:text-sm lg:text-base text-white font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto truncate">
              {publicT('public_discover_study_destinations_worldwide_and_find_the_best')}
            </p>
          </div>

          {/* Integrated Clean White Search Bar in Hero */}
          <div className="pt-1 max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_search_by_country_or_continent')}
                className="w-full py-2.5 pl-4 pr-10 bg-[var(--mn-surface)] text-[var(--mn-heading)] rounded-full text-[12px] font-bold placeholder:text-[var(--mn-text-muted)] placeholder:text-[12px] placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none shadow-md border border-[var(--mn-border)] focus:border-[var(--mn-accent)] transition-all text-center font-['Cairo',sans-serif] mn-panel "
                data-mn-design="cd18739893"
              />
              <Search className="w-4 h-4 text-[var(--mn-accent-text)] absolute right-3.5 top-1/2 -translate-y-1/2" />
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
              className="text-[10px] font-bold text-[var(--mn-danger-text)] hover:text-[var(--mn-danger-text)] bg-[var(--mn-surface-elevated)]/95 px-2.5 py-0.5 rounded-full shadow-xs transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif] mn-panel "
            >
              <RotateCcw className="w-3 h-3" />
              <span>
                {publicT('public_reset_filters')}
                {activeFiltersCount})
              </span>
            </button>
          </div>
        )}
        {/* ========================================================================= */}
        {/* FLOATING FILTER TILES (القارة • الدولة) WITH UNIFIED COMPACT SIZE         */}
        {/* ========================================================================= */}
        <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto mn-inline-gutter mt-2.5 md:mt-4 relative z-20 pb-0 md:pb-2">
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:gap-3.5">
            {/* Tile 1: القارة */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFilterModal('continent');
                }
              }}
              onClick={() => setActiveFilterModal('continent')}
              className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer mn-panel font-['Cairo',sans-serif]"
              title={publicT('public_choose_continent')}
            >
              <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-bold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <Globe2 className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="truncate font-['Cairo',sans-serif]">
                  {selectedContinent === 'الكل' ? publicT('public_continent') : regionLabel(selectedContinent)}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)] mt-0.5" />
            </div>

            {/* Tile 2: الدولة */}
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
              title={publicLanguage === 'ar' ? 'اختيار من الدول المعروضة؛ ابحث بالاسم للوصول إلى بقية الدول' : 'Choose a displayed country; search by name to find other countries'}
            >
              <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-bold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <MapPin className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="truncate font-['Cairo',sans-serif]">
                  {selectedCountryId === 'الكل' ? publicT('public_country') : countryNames.find(country => country.id === selectedCountryId)?.label || selectedCountryId}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)] mt-0.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Gold Divider Ribbon Line Connecting Hero Directly to Content */}
      <div className="w-full h-0.5 bg-gradient-to-r from-[var(--mn-accent-text)] via-[var(--mn-accent-soft)] to-[var(--mn-accent-text)] shadow-xs mb-1" />

      {/* ========================================================================= */}
      {/* 4. CONTENT & HORIZONTAL COUNTRY CARDS SEAMLESSLY ATTACHED                  */}
      {/* ========================================================================= */}
      <div className="max-w-2xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1 sm:px-2 md:px-4 pt-3.5 md:pt-5 space-y-3 md:space-y-4">
        {/* Results header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[var(--mn-heading)] font-semibold text-xs sm:text-sm md:text-base font-['Cairo',sans-serif]">
            <Globe2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-[var(--mn-accent-text)]" />
            <span>
              {publicT('public_available_countries')}
              {filteredCountries.length})
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] md:text-xs font-bold text-[var(--mn-accent-text)] bg-[var(--mn-accent)]/10 px-2 py-0.5 rounded-full border border-[var(--mn-accent)]/30">
            <RotateCcw className="w-2.5 h-2.5 text-[var(--mn-accent-text)]" />
            <span>{publicT('public_updated_regularly')}</span>
          </div>
        </div>

        {/* Empty state */}
        {serverLoading && (
          <p role="status">{publicLanguage === 'ar' ? 'جار التحميل…' : 'Loading…'}</p>
        )}
        {serverError && (
          <p role="alert">
            {publicLanguage === 'ar'
              ? 'تعذر تحميل الدول. حاول مجددًا.'
              : 'Could not load countries. Try again.'}
          </p>
        )}
        {!serverLoading && !serverError && filteredCountries.length === 0 && (
          <div className="bg-[var(--mn-surface)] rounded-2xl p-6 text-center border border-[var(--mn-border)] shadow-xs space-y-2.5 mn-panel ">
            <div className="w-10 h-10 rounded-full bg-[var(--mn-gold-surface)] border border-[var(--mn-border-gold)] flex items-center justify-center mx-auto text-[var(--mn-accent-text)] mn-panel ">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[var(--mn-heading)] text-xs sm:text-sm">
              {publicT('public_no_matching_destinations_found')}
            </h3>
            <p className="text-[11px] text-[var(--mn-text-muted)] max-w-xs mx-auto">
              {publicT('public_try_changing_the_search_criteria_or_choosing_another')}
            </p>
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-[var(--mn-heading)] hover:underline"
            >
              {publicT('public_clear_all_filters_2')}
            </button>
          </div>
        )}

        {/* Country Cards List */}
        <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch">
          {paginatedCountries.map((country) => {
            const keyLower = `${country.id} ${country.slug || ''} ${country.iso2Code || ''} ${country.name}`.toLowerCase();
            const fallbackCounts = keyLower.includes('china') || keyLower.includes('cn') || keyLower.includes('الصين')
              ? { universities: 500, scholarships: 260 }
              : keyLower.includes('turkey') || keyLower.includes('tr') || keyLower.includes('تركيا')
                ? { universities: 200, scholarships: 38 }
                : keyLower.includes('malaysia') || keyLower.includes('my') || keyLower.includes('ماليزيا')
                  ? { universities: 110, scholarships: 29 }
                  : keyLower.includes('germany') || keyLower.includes('de') || keyLower.includes('ألمانيا')
                    ? { universities: 380, scholarships: 45 }
                    : keyLower.includes('uk') || keyLower.includes('gb') || keyLower.includes('المملكة المتحدة')
                      ? { universities: 160, scholarships: 42 }
                      : keyLower.includes('saudi') || keyLower.includes('sa') || keyLower.includes('السعودية')
                        ? { universities: 45, scholarships: 35 }
                        : keyLower.includes('france') || keyLower.includes('fr') || keyLower.includes('فرنسا')
                          ? { universities: 150, scholarships: 27 }
                          : keyLower.includes('japan') || keyLower.includes('jp') || keyLower.includes('اليابان')
                            ? { universities: 180, scholarships: 22 }
                            : { universities: 500, scholarships: 260 };
            const universitiesCountDisplay = country.universitiesCount ?? fallbackCounts.universities;
            const scholarshipsCountDisplay = country.scholarshipsCount ?? fallbackCounts.scholarships;

            return (
            <div
              key={country.id}
              className="bg-[var(--mn-surface)] rounded-r-[4px] rounded-l-2xl border border-[#142B5F]/30 dark:border-[var(--mn-border)] border-r-3 border-r-[#142B5F] dark:border-r-[var(--mn-accent)] hover:border-[#142B5F]/50 dark:hover:border-[var(--mn-accent)]/40 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all p-3 sm:p-3.5 md:p-4 h-full flex flex-col justify-between space-y-2.5 relative overflow-hidden group mn-panel "
            >
              {/* Top Row: Right Country Info & Circular Flag Badge | Left Explore Button */}
              <div className="flex items-center justify-between gap-2">
                {/* Visual Right (RTL): Circular Flag + Country Names */}
                <div className="flex items-center gap-2 sm:gap-2.5 text-start">
                  {/* Circular Flag Badge with Petrol Ring */}
                  <div className="w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-full p-0.5 bg-[#0E7C86] shadow-xs shrink-0 flex items-center justify-center mn-inverse ">
                    <div className="w-full h-full rounded-full overflow-hidden bg-[var(--mn-surface)] border border-white flex items-center justify-center text-lg sm:text-xl shadow-inner mn-panel ">
                      <CountryFlagImage
                        countryId={country.id}
                        countryName={country.name}
                        flagEmoji={country.flagEmoji}
                        flagUrl={country.flag}
                        iso2Code={country.iso2Code}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-start text-start">
                    <h3 className="text-[15px] sm:text-base font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif] leading-tight">
                      {country.name}
                    </h3>
                    <span className="text-[11px] sm:text-xs font-semibold text-[var(--mn-accent-text)] font-['Cairo',sans-serif]">
                      {country.nameEn}
                    </span>
                  </div>
                </div>

                {/* Visual Left (RTL): Center Divider + Explore Button */}
                <div className="flex items-center gap-2 shrink-0">
                  {onToggleFavorite && (
                    <FavoriteButton
                      active={favoriteIds.includes(country.id)}
                      onToggle={(event) => {
                        event.stopPropagation();
                        onToggleFavorite(country.id);
                      }}
                    />
                  )}
                  <div className="h-6 w-px bg-[var(--mn-surface-muted)] mn-panel " />

                  <button
                    onClick={() => setActiveCountryModal(country)}
                    className="bg-[var(--mn-primary)] hover:bg-[var(--mn-primary)] text-white rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs mn-inverse hover:mn-inverse "
                    data-mn-design="26ecd1db9e"
                  >
                    <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight text-[var(--mn-accent-soft)]">
                      {publicT('public_explore_country')}
                    </span>
                    <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-[var(--mn-accent-soft)]" />
                  </button>
                </div>
              </div>

              {/* Bottom Row: 4 Pill Boxes in 2x2 Grid with Right-Aligned Icons so Top & Bottom Icons Match Vertically */}
              <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[var(--mn-border)]/50">
                {/* 1. Continent (Top-Right) */}
                <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-3 pl-2 py-1.5 flex items-center justify-start gap-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel ">
                  <Globe2 className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#239BA6] shrink-0" />
                  <span className="truncate">{country.continent}</span>
                </div>

                {/* 2. Living Cost (Top-Left) */}
                <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-3 pl-2 py-1.5 flex items-center justify-start gap-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel ">
                  <Coins className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#239BA6] shrink-0" />
                  <span className="truncate">
                    {publicT('public_living_costs')} {country.livingCost}
                  </span>
                </div>

                {/* 3. Universities Count (Bottom-Right - Directly aligned under Continent icon) */}
                <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-3 pl-2 py-1.5 flex items-center justify-start gap-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel ">
                  <Building2 className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#239BA6] shrink-0" />
                  <span className="truncate">
                    {publicLanguage === 'en' ? `${universitiesCountDisplay} Universities` : `${universitiesCountDisplay} جامعة`}
                  </span>
                </div>

                {/* 4. Scholarships Count (Bottom-Left - Directly aligned under Living Cost icon) */}
                <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-3 pl-2 py-1.5 flex items-center justify-start gap-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel ">
                  <GraduationCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#239BA6] shrink-0" />
                  <span className="truncate">
                    {publicLanguage === 'en' ? `${scholarshipsCountDisplay} Scholarships` : `${scholarshipsCountDisplay} منحة دراسية`}
                  </span>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {filteredCountries.length > 0 && (
          <PublicCardsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            dir={publicDir}
          />
        )}
      </div>
      {dataMode === 'api' && serverResult ? (
        <nav
          aria-label={publicLanguage === 'en' ? 'Destination pages' : 'صفحات الوجهات'}
          className="flex justify-center gap-4 py-4"
        >
          <button
            disabled={serverLoading || serverPage === 1}
            onClick={() => setServerPage((page) => page - 1)}
          >
            {publicLanguage === 'en' ? 'Previous' : 'السابق'}
          </button>
          <span>
            {serverPage} / {Math.max(1, serverResult.totalPages)}
          </span>
          <button
            disabled={serverLoading || serverPage >= serverResult.totalPages}
            onClick={() => setServerPage((page) => page + 1)}
          >
            {publicLanguage === 'en' ? 'Next' : 'التالي'}
          </button>
        </nav>
      ) : null}

      <PublicFilterSelectModal
        isOpen={activeFilterModal === 'continent'}
        title={publicT('public_choose_continent')}
        icon={Globe2}
        selectedValue={selectedContinent}
        onSelect={(val) => setSelectedContinent(val)}
        onClose={() => setActiveFilterModal(null)}
        dir={publicDir}
        options={continents.map((c) => ({
          value: c,
          label: c === 'الكل' ? publicT('public_all_continents') : regionLabel(c),
        }))}
      />

      <PublicFilterSelectModal
        isOpen={activeFilterModal === 'country'}
        title={publicT('public_country')}
        icon={MapPin}
        selectedValue={selectedCountryId}
        onSelect={(val) => setSelectedCountryId(val)}
        onClose={() => setActiveFilterModal(null)}
        dir={publicDir}
        options={countryNames.map((cnt) => ({
          value: cnt.id,
          label: cnt.id === 'الكل' ? publicT('public_all_countries_2') : cnt.label,
        }))}
      />
    </div>
  );
};
