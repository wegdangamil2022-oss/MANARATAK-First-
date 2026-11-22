import { PublishedCatalogDiscovery } from './PublishedCatalogDiscovery';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  X,
  ChevronLeft,
  ChevronDown,
  Globe2,
  MapPin,
  Building2,
  RotateCcw,
  Landmark,
  Heart,
  History,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import { University } from '../types';
import { PublicCardsPagination, PublicInlineFilterPanel, usePaginatedCatalog } from './DetailUi';

interface UniversitiesSearchPageProps {
  dataMode?: 'api' | 'prototype';
  universities?: University[];
  onBack?: () => void;
  onSelectUniversity?: (university: University) => void;
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
}

const PrototypeUniversitiesSearchPage: React.FC<UniversitiesSearchPageProps> = ({
  universities: initialUniversities = [],
  onBack,
  onSelectUniversity,
  favoriteIds,
  onToggleFavorite,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  // The design preview uses the same in-repository university cards as Studio.
  // Keep the parent-provided fixtures reactive when they finish loading.
  const universities = initialUniversities;
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState('الكل');
  const [selectedCountry, setSelectedCountry] = useState('الكل');
  const [selectedCity, setSelectedCity] = useState('الكل');
  const [activeFilterModal, setActiveFilterModal] = useState<'continent' | 'country' | 'city' | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);
  const [localSavedUniversities, setLocalSavedUniversities] = useState<string[]>([]);
  const savedUniversities = favoriteIds ?? localSavedUniversities;

  const toggleSave = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(id);
      return;
    }
    setLocalSavedUniversities((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id],
    );
  };

  const continents = useMemo(() => {
    const values = new Set(
      universities.map((university) => university.continent).filter((value): value is string => Boolean(value)),
    );
    ['آسيا', 'أوروبا', 'أمريكا الشمالية', 'أوقيانوسيا', 'أفريقيا'].forEach((c) => values.add(c));
    return ['الكل', ...Array.from(values)];
  }, [universities]);

  const countries = useMemo(() => {
    const values = new Set(
      universities
        .filter(
          (university) => selectedContinent === 'الكل' || university.continent === selectedContinent,
        )
        .map((university) => university.country)
        .filter(Boolean),
    );
    return ['الكل', ...Array.from(values)];
  }, [universities, selectedContinent]);

  const cities = useMemo(() => {
    const values = new Set(
      universities
        .filter(
          (university) =>
            (selectedContinent === 'الكل' || university.continent === selectedContinent) &&
            (selectedCountry === 'الكل' || university.country === selectedCountry),
        )
        .map((university) => university.city)
        .filter((value): value is string => Boolean(value)),
    );
    return ['الكل', ...Array.from(values)];
  }, [universities, selectedContinent, selectedCountry]);

  const handleContinentChange = (continent: string) => {
    setSelectedContinent(continent);
    setSelectedCountry('الكل');
    setSelectedCity('الكل');
  };

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    setSelectedCity('الكل');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedContinent('الكل');
    setSelectedCountry('الكل');
    setSelectedCity('الكل');
  };

  const filteredUniversities = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return universities.filter((university) => {
      if (query && ![
        university.name, university.nameEn, university.country, university.city,
        university.continent, university.description,
      ].some((value) => String(value ?? '').toLocaleLowerCase().includes(query))) return false;
      if (selectedContinent !== 'الكل' && university.continent !== selectedContinent) {
        return false;
      }
      if (selectedCountry !== 'الكل' && university.country !== selectedCountry) {
        return false;
      }
      if (selectedCity !== 'الكل' && university.city !== selectedCity) {
        return false;
      }
      return true;
    });
  }, [universities, searchQuery, selectedContinent, selectedCountry, selectedCity]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems: paginatedUniversities,
  } = usePaginatedCatalog(
    filteredUniversities,
    `${searchQuery}|${selectedContinent}|${selectedCountry}|${selectedCity}`,
    30,
  );

  const activeFiltersCount =
    (selectedContinent !== 'الكل' ? 1 : 0) +
    (selectedCountry !== 'الكل' ? 1 : 0) +
    (selectedCity !== 'الكل' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0);

  return (
    <div
      className="min-h-screen bg-[#F6F8FA] dark:bg-[#0A1326] text-[#203442] dark:text-[#EDF5F5] pb-24 font-['Cairo',sans-serif] select-none mn-panel dark:[--mn-border:rgba(255,255,255,0.12)]"
      dir={publicDir}
    >
      {/* ========================================================================= */}
      {/* HERO BANNER - COMPACT BALANCED ARABIC DESIGN MATCHING SCHOLARSHIPS/MAJORS */}
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

        {/* Background Decorative Silhouettes, Dot Grid & Gold Arcs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-3 left-5 grid grid-cols-5 gap-1.5 opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[#F2CD78]" />
            ))}
          </div>

          <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full border border-[#F2CD78]/20 pointer-events-none" />
          <div className="absolute -top-6 -left-6 w-72 h-72 rounded-full border border-[#F2CD78]/12 pointer-events-none" />

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
            className="absolute bottom-0 inset-x-0 w-full h-12 opacity-25"
            viewBox="0 0 500 80"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-20,70 Q250,-20 520,70"
              stroke="#F2CD78"
              strokeWidth="2"
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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight whitespace-nowrap truncate">
              {publicT('public_your_first_step_toward')}{' '}
              <span className="text-[#F2CD78]">{publicT('public_the_right_university')}</span>
            </h1>

            {/* Small Official Gold Horizontal Divider */}
            <div className="flex justify-center pt-0.5 pb-0.5">
              <div className="w-10 md:w-14 h-0.5 bg-gradient-to-r from-[#D6A43B] via-[#F2CD78] to-[#D6A43B] rounded-full" />
            </div>

            {/* Subtitle */}
            <p className="text-[10px] sm:text-xs md:text-sm text-[#DDEFF2] font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto px-2 line-clamp-2">
              {publicT('public_discover_leading_universities_worldwide_with_clear_admission_requirements')}
            </p>
          </div>

          {/* Integrated Clean Search Bar in Hero */}
          <div className="pt-0.5 sm:pt-1 max-w-sm sm:max-w-md md:max-w-xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_search_by_university_country_or_major')}
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
        {/* 3 BALANCED FLOATING FILTER TILES (القارة • الدولة • المدينة)             */}
        {/* ========================================================================= */}
        <div className="max-w-md md:max-w-2xl mx-auto mn-inline-gutter mt-2 sm:mt-2.5 md:mt-3.5 relative z-20 pb-0 md:pb-1">
          <div className="grid grid-cols-3 gap-2 md:gap-3.5">
            {/* Tile 1: القارة */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFilterModal((prev) => (prev === 'continent' ? null : 'continent'));
                }
              }}
              onClick={() => setActiveFilterModal((prev) => (prev === 'continent' ? null : 'continent'))}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                activeFilterModal === 'continent'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedContinent !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]`}
              title={publicT('public_choose_continent')}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <Globe2
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${
                    selectedContinent !== 'الكل'
                      ? 'text-[#D6A43B] dark:text-[#F2CD78]'
                      : 'text-[#0E7C86] dark:text-[#34BFC9]'
                  }`}
                />
                <span className="min-w-0 truncate font-['Cairo',sans-serif]">
                  {selectedContinent === 'الكل' ? publicT('public_continent') : selectedContinent}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${activeFilterModal === 'continent' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </div>

            {/* Tile 2: الدولة */}
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
              title={publicT('public_choose_country')}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <MapPin
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${
                    selectedCountry !== 'الكل'
                      ? 'text-[#D6A43B] dark:text-[#F2CD78]'
                      : 'text-[#0E7C86] dark:text-[#34BFC9]'
                  }`}
                />
                <span className="min-w-0 truncate font-['Cairo',sans-serif]">
                  {selectedCountry === 'الكل' ? publicT('public_country') : selectedCountry}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${activeFilterModal === 'country' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </div>

            {/* Tile 3: المدينة */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFilterModal((prev) => (prev === 'city' ? null : 'city'));
                }
              }}
              onClick={() => setActiveFilterModal((prev) => (prev === 'city' ? null : 'city'))}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                activeFilterModal === 'city'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedCity !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]`}
              title={publicT('public_choose_city')}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <Building2
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${
                    selectedCity !== 'الكل'
                      ? 'text-[#D6A43B] dark:text-[#F2CD78]'
                      : 'text-[#0E7C86] dark:text-[#34BFC9]'
                  }`}
                />
                <span className="min-w-0 truncate font-['Cairo',sans-serif]">{selectedCity === 'الكل' ? publicT('public_city') : selectedCity}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${activeFilterModal === 'city' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Official Gold Divider Ribbon */}
      <div className="w-full h-[1.5px] bg-gradient-to-r from-[#D6A43B]/45 via-[#F2CD78] to-[#D6A43B]/45 dark:from-[#D6A43B]/30 dark:via-[#F2CD78]/65 dark:to-[#D6A43B]/30 mb-3 md:mb-5" />

      {/* Inline Attached Filter Panels */}
      <PublicInlineFilterPanel
        isOpen={activeFilterModal === 'continent'}
        title={publicT('public_choose_continent')}
        icon={Globe2}
        selectedValue={selectedContinent}
        onSelect={(val) => handleContinentChange(val)}
        onClose={() => setActiveFilterModal(null)}
        dir={publicDir}
        options={continents.map((c) => ({
          value: c,
          label: c === 'الكل' ? publicT('public_all_continents') : c,
        }))}
      />

      <PublicInlineFilterPanel
        isOpen={activeFilterModal === 'country'}
        title={publicT('public_choose_country')}
        icon={MapPin}
        selectedValue={selectedCountry}
        onSelect={(val) => handleCountryChange(val)}
        onClose={() => setActiveFilterModal(null)}
        dir={publicDir}
        options={countries.map((cnt) => ({
          value: cnt,
          label: cnt === 'الكل' ? publicT('public_all_countries_2') : cnt,
        }))}
      />

      <PublicInlineFilterPanel
        isOpen={activeFilterModal === 'city'}
        title={publicT('public_choose_city')}
        icon={Building2}
        selectedValue={selectedCity}
        onSelect={(val) => setSelectedCity(val)}
        onClose={() => setActiveFilterModal(null)}
        dir={publicDir}
        options={cities.map((cty) => ({
          value: cty,
          label: cty === 'الكل' ? publicT('public_all_cities') : cty,
        }))}
      />

      {/* ========================================================================= */}
      {/* RESULTS LIST SECTION                                                      */}
      {/* ========================================================================= */}
      <div ref={resultsRef} className="w-full max-w-4xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1 sm:px-2 md:px-4 pt-1 space-y-3 md:space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-semibold text-xs sm:text-sm md:text-base font-['Cairo',sans-serif]">
            <Landmark className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-[#0E7C86] dark:text-[#34BFC9]" />
            <span>{publicT('public_international_university_directory')} ({filteredUniversities.length})</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] md:text-xs font-bold text-[#0E7C86] dark:text-[#7FD4DE] bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 px-2.5 md:px-3 py-0.5 md:py-1 rounded-full border border-[#0E7C86]/20 dark:border-[#34BFC9]/25 font-['Cairo',sans-serif]">
            <RotateCcw className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#0E7C86] dark:text-[#34BFC9]" />
            <span>{publicT('public_updated_regularly')}</span>
          </div>
        </div>

        {/* Cards Container */}
        <div className="flex flex-col gap-2.5 sm:gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch w-full pb-10">
          {filteredUniversities.length === 0 ? (
            <div className="bg-white dark:bg-[#111E38] border border-[#142B5F]/12 dark:border-white/10 rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-2xs mn-panel md:col-span-2 lg:col-span-3">
              <div className="w-12 h-12 rounded-full bg-[#F6F8FA] dark:bg-[#0B1529] border border-[#142B5F]/10 flex items-center justify-center text-[#0E7C86] dark:text-[#34BFC9] mn-panel ">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#142B5F] dark:text-[#EDF5F5] font-['Cairo',sans-serif]">{publicT('public_no_matching_universities_found')}</h3>
              <p className="text-xs text-[#5C707C] dark:text-[#9BB4C7] max-w-xs font-['Cairo',sans-serif]">{publicT('public_try_changing_the_filters_or_searching_for_another')}</p>
              <button
                onClick={handleResetFilters}
                className="mt-2 text-xs font-bold text-white bg-[#142B5F] hover:bg-[#0E7C86] px-4 py-2 rounded-xl transition-colors font-['Cairo',sans-serif] cursor-pointer"
              >{publicT('public_clear_all_filters')}</button>
            </div>
          ) : (
            paginatedUniversities.map((univ) => {
              const isSaved = savedUniversities.includes(univ.id);
              return (
                <div
                  key={univ.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectUniversity?.(univ);
                    }
                  }}
                  onClick={() => onSelectUniversity?.(univ)}
                  className="bg-white dark:bg-[#111E38] rounded-r-[4px] rounded-l-2xl border border-[#142B5F]/12 dark:border-white/10 border-r-3 border-r-[#142B5F] dark:border-r-[#F2CD78]/85 hover:border-[#142B5F]/28 dark:hover:border-[#F2CD78]/45 shadow-[0_4px_16px_rgba(20,43,95,0.04)] hover:shadow-[0_8px_24px_rgba(20,43,95,0.08)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.28)] transition-all duration-150 active:scale-[0.985] p-2.5 sm:p-3 md:p-4 h-full relative overflow-hidden group cursor-pointer flex flex-col justify-between gap-2 sm:gap-2.5 select-none mn-panel "
                >
                  {/* Top Row: Logo & Names + Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-2.5 text-start min-w-0 flex-1">
                      {/* Circular Flag Badge matching Scholarship Card */}
                      <div className="w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-full p-0.5 bg-gradient-to-br from-[#142B5F] to-[#0E7C86] dark:from-[#0E7C86] dark:to-[#21A7B4] shadow-xs shrink-0 flex items-center justify-center mn-inverse ">
                        <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-[#111E38] border border-white/80 dark:border-white/15 flex items-center justify-center text-lg sm:text-xl shadow-inner mn-panel ">
                          <span data-mn-design="8f05af8d3a">{univ.countryFlag || '🌐'}</span>
                        </div>
                      </div>

                      {/* Names with compact balanced typography */}
                      <div className="flex flex-col items-start text-start min-w-0 flex-1">
                        <h3 className="text-[11.5px] sm:text-[12.5px] md:text-[14px] font-bold text-[#142B5F] dark:text-[#F1F5F9] font-['Cairo',sans-serif] leading-snug line-clamp-2 break-words w-full">
                          {univ.name}
                        </h3>
                        <span className="text-[10px] sm:text-[11px] font-medium text-[#5C707C] dark:text-[#9BB4C7] font-['Cairo',sans-serif] truncate w-full">
                          {univ.nameEn}
                        </span>
                      </div>
                    </div>

                    {/* Save to Favorites Button */}
                    <button
                      onClick={(e) => toggleSave(e, univ.id)}
                      className="w-8 h-8 rounded-full bg-[#F6F8FA] dark:bg-[#0B1529] hover:bg-[#DDEFF2]/75 dark:hover:bg-[#172A4D] border border-[#142B5F]/10 dark:border-white/10 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs shrink-0 mn-panel "
                      title={publicT('public_save_to_favorites')}
                    >
                      <Heart
                        className={`w-4 h-4 ${isSaved ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#34BFC9] dark:text-[#34BFC9]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`}
                      />
                    </button>
                  </div>

                  {/* Bottom Row: 4 Boxes in 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#142B5F]/8 dark:border-white/8">
                    {/* 1. Ownership / Type */}
                    <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel ">
                      <Briefcase className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                      <span className="min-w-0 leading-tight line-clamp-2 break-words">{univ.ownership || univ.type || publicT('public_government')}</span>
                    </div>

                    {/* 2. Location */}
                    <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel ">
                      <MapPin className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                      <span className="min-w-0 leading-tight line-clamp-2 break-words">
                        {univ.country}
                        {univ.city ? publicT('public_city_suffix', { v0: univ.city }) : ''}
                      </span>
                    </div>

                    {/* 3. Foundation Year */}
                    <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel ">
                      <History className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                      <span className="min-w-0 leading-tight line-clamp-2 break-words">
                        {univ.foundationYear ? publicT('public_founded_year', { v0: univ.foundationYear }) : publicT('public_accredited_university')}
                      </span>
                    </div>

                    {/* 4. View Details Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectUniversity?.(univ);
                      }}
                      className="min-w-0 overflow-hidden bg-[#142B5F] hover:bg-[#0E7C86] dark:bg-[#162A52] dark:hover:bg-[#1C3566] text-white dark:text-[#F2CD78] border border-transparent dark:border-[#F2CD78]/35 rounded-lg px-2 py-1.5 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs mn-inverse "
                      data-mn-design="26ecd1db9e"
                    >
                      <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight text-white dark:text-[#F2CD78] truncate">{publicT('public_view_details')}</span>
                      <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-[#F2CD78] shrink-0" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {filteredUniversities.length > 0 && (
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

export function UniversitiesSearchPage(props: UniversitiesSearchPageProps) {
  return props.dataMode === 'prototype' ? <PrototypeUniversitiesSearchPage {...props} /> : <PublishedCatalogDiscovery favoriteIds={props.favoriteIds} onToggleFavorite={props.onToggleFavorite} kind="universities" onBack={props.onBack} onUniversity={props.onSelectUniversity} />;
}
