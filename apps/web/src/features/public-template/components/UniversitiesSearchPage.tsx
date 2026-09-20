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

interface UniversitiesSearchPageProps {
  universities?: University[];
  onBack?: () => void;
  onSelectUniversity?: (university: University) => void;
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
}

export const UniversitiesSearchPage: React.FC<UniversitiesSearchPageProps> = ({
  universities = [],
  onBack,
  onSelectUniversity,
  favoriteIds,
  onToggleFavorite,
}) => {
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState('الكل');
  const [selectedCountry, setSelectedCountry] = useState('الكل');
  const [selectedCity, setSelectedCity] = useState('الكل');

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
    const query = searchQuery.trim().toLocaleLowerCase('ar');

    return universities.filter((university) => {
      if (query) {
        const searchableValues = [
          university.name,
          university.nameEn,
          university.country,
          university.city,
          university.continent,
          university.type,
          university.ownership,
          university.description,
          ...university.topMajors,
          ...(university.studyPrograms?.topKeyMajors ?? []),
          ...(university.studyPrograms?.faculties ?? []),
          ...(university.studyPrograms?.degrees ?? []),
          ...(university.studyPrograms?.majorLinks?.flatMap((link) => [
            link.label,
            link.programLabel,
            link.degreeLabel,
          ]) ?? []),
        ]
          .filter((value): value is string => Boolean(value))
          .map((value) => value.toLocaleLowerCase('ar'));

        if (!searchableValues.some((value) => value.includes(query))) return false;
      }

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

  const activeFiltersCount =
    (selectedContinent !== 'الكل' ? 1 : 0) +
    (selectedCountry !== 'الكل' ? 1 : 0) +
    (selectedCity !== 'الكل' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0);

  return (
    <div
      className="min-h-screen bg-[var(--mn-page)] text-[var(--mn-heading)] pb-24 font-['Cairo',sans-serif] select-none mn-panel "
      dir="rtl"
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
            title="العودة"
            aria-label="العودة"
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

        <div className="max-w-md sm:max-w-xl mx-auto text-center relative z-10 space-y-2 pt-1">
          {/* Top 4-pointed Gold Sparkle Star */}
          <div className="flex justify-center">
            <Sparkles className="h-5 w-5 text-[var(--mn-accent-text)] drop-shadow-[0_0_8px_rgba(214,164,59,0.8)]" aria-hidden="true" />
          </div>

          {/* Main Title */}
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              خطوتك الأولى نحو{' '}
              <span className="text-[var(--mn-accent-text)]">الجامعة المناسبة</span>
            </h1>

            {/* Small Gold Horizontal Divider */}
            <div className="flex justify-center pt-1 pb-0.5">
              <div className="w-10 h-0.5 bg-[var(--mn-accent)] rounded-full mn-gold " />
            </div>

            {/* Subtitle */}
            <p className="text-[11px] sm:text-xs text-white font-medium font-['Cairo',sans-serif] leading-relaxed max-w-xs sm:max-w-sm mx-auto">
              اكتشف أفضل الجامعات حول العالم بشروط قبول واضحة وفرص متنوعة.
            </p>
          </div>

          {/* Integrated Clean White Search Bar in Hero */}
          <div className="pt-1 max-w-sm sm:max-w-md mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الجامعة، الدولة، أو التخصص..."
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
              <span>إعادة ضبط الفلاتر ({activeFiltersCount})</span>
            </button>
          </div>
        )}
        {/* ========================================================================= */}
        {/* 3 SEPARATE FLOATING FILTER TILES (القارة • الدولة • المدينة) */}
        {/* ========================================================================= */}
        <div className="max-w-lg mx-auto mn-inline-gutter mt-2.5 relative z-20 pb-0">
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {/* Tile 1: القارة */}
          <div className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-gold-surface)]/40 border-1.5 border-[var(--mn-accent)]/70 hover:border-[var(--mn-accent)] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer mn-panel ">
            <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-semibold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
              <Globe2 className="w-3.5 h-3.5 text-[var(--mn-accent-text)] shrink-0" />
              <span className="truncate">
                {selectedContinent === 'الكل' ? 'القارة' : selectedContinent}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)] mt-0.5" />
            <select
              value={selectedContinent}
              onChange={(e) => handleContinentChange(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              title="اختر القارة"
            >
              {continents.map((c) => (
                <option key={c} value={c}>
                  {c === 'الكل' ? 'جميع القارات' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Tile 2: الدولة */}
          <div className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-gold-surface)]/40 border-1.5 border-[var(--mn-accent)]/70 hover:border-[var(--mn-accent)] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer mn-panel ">
            <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-semibold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
              <MapPin className="w-3.5 h-3.5 text-[var(--mn-accent-text)] shrink-0" />
              <span className="truncate">
                {selectedCountry === 'الكل' ? 'الدولة' : selectedCountry}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)] mt-0.5" />
            <select
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              title="اختر الدولة"
            >
              {countries.map((cnt) => (
                <option key={cnt} value={cnt}>
                  {cnt === 'الكل' ? 'جميع الدول' : cnt}
                </option>
              ))}
            </select>
          </div>

          {/* Tile 3: المدينة */}
          <div className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-gold-surface)]/40 border-1.5 border-[var(--mn-accent)]/70 hover:border-[var(--mn-accent)] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer mn-panel ">
            <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-semibold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
              <Building2 className="w-3.5 h-3.5 text-[var(--mn-accent-text)] shrink-0" />
              <span className="truncate">{selectedCity === 'الكل' ? 'المدينة' : selectedCity}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)] mt-0.5" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              title="اختر المدينة"
            >
              {cities.map((cty) => (
                <option key={cty} value={cty}>
                  {cty === 'الكل' ? 'جميع المدن' : cty}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      </div>

      {/* ========================================================================= */}
      {/* RESULTS LIST SECTION (ترك البطاقات فارغة وفق طلب المستخدم) */}
      {/* ========================================================================= */}
      <div ref={resultsRef} className="w-full max-w-4xl mx-auto px-1 sm:px-2 pt-4 space-y-2.5">
        {/* Section Header */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs sm:text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif] flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-[var(--mn-heading)]" />
            <span>دليل الجامعات العالمية</span>
          </span>
          <span className="text-[10px] sm:text-[11px] text-[var(--mn-accent-text)] font-bold font-['Cairo',sans-serif]">
            محدثة باستمرار
          </span>
        </div>

        {/* Cards Container */}
        <div className="flex flex-col gap-2.5 sm:gap-3 w-full pb-10">
          {filteredUniversities.length === 0 ? (
            <div className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-2xs mn-panel ">
              <div className="w-12 h-12 rounded-full bg-[var(--mn-surface-muted)] flex items-center justify-center text-[var(--mn-text-muted)] mn-panel ">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                لا توجد جامعات مطابقة للبحث
              </h3>
              <p className="text-xs text-[var(--mn-text-muted)] max-w-xs font-['Cairo',sans-serif]">
                جرب تغيير خيارات التصفية أو البحث باسم جامعة أخرى.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-2 text-xs font-bold text-[var(--mn-heading)] bg-[var(--mn-primary)]/10 px-4 py-2 rounded-xl hover:bg-[var(--mn-primary)]/20 transition-colors font-['Cairo',sans-serif]"
              >
                مسح جميع الفلاتر
              </button>
            </div>
          ) : (
            filteredUniversities.map((univ) => {
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
                  className="bg-[var(--mn-surface)] rounded-xl sm:rounded-2xl border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] active:border-[#142B5F] shadow-sm transition-all duration-150 active:scale-[0.985] p-2.5 sm:p-3 relative overflow-hidden group cursor-pointer flex flex-col gap-2 sm:gap-2.5 select-none mn-panel "
                >
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#142B5F] dark:from-[#D6A43B] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  {/* Top Row: Logo & Names + Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-2.5 text-right min-w-0 flex-1">
                      {/* Circular Flag Badge like the Scholarship Card */}
                      <div className="w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-full p-0.5 bg-gradient-to-tr from-[var(--mn-primary)] via-[var(--mn-hero-secondary)] to-[var(--mn-accent-soft)] shadow-xs shrink-0 flex items-center justify-center mn-inverse ">
                        <div className="w-full h-full rounded-full overflow-hidden bg-[var(--mn-surface)] border border-white flex items-center justify-center text-lg sm:text-xl shadow-inner mn-panel ">
                          <span data-mn-design="8f05af8d3a">{univ.countryFlag || '🌐'}</span>
                        </div>
                      </div>

                      {/* Names with beautiful responsive typography */}
                      <div className="flex flex-col items-start text-right min-w-0 flex-1">
                        <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-['Cairo',sans-serif] leading-tight truncate w-full">
                          {univ.name}
                        </h3>
                        <span className="text-[10px] sm:text-[11px] font-medium text-[var(--mn-text-muted)] font-['Cairo',sans-serif] truncate w-full">
                          {univ.nameEn}
                        </span>
                      </div>
                    </div>

                    {/* Save to Favorites Button with precise heart coloring */}
                    <button
                      onClick={(e) => toggleSave(e, univ.id)}
                      className="w-8 h-8 rounded-full bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)] border border-[var(--mn-border)] flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs shrink-0 mn-panel hover:mn-panel "
                      title="حفظ في المفضلة"
                    >
                      <Heart
                        className={`w-4 h-4 ${isSaved ? 'fill-[var(--mn-accent)] text-[var(--mn-accent-text)]' : 'text-[var(--mn-text-muted)]'}`}
                      />
                    </button>
                  </div>

                  {/* Bottom Row: 4 Pill Badges (3 Info Badges + View Details CTA Button) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                    {/* 1. Ownership / Type */}
                    <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg px-2 py-1 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel ">
                      <Briefcase className="w-3 h-3 text-[var(--mn-accent-text)] shrink-0" />
                      <span className="truncate">{univ.ownership || univ.type || 'حكومية'}</span>
                    </div>

                    {/* 2. Location */}
                    <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg px-2 py-1 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel ">
                      <MapPin className="w-3 h-3 text-[var(--mn-heading)] shrink-0" />
                      <span className="truncate">
                        {univ.country}
                        {univ.city ? `، ${univ.city}` : ''}
                      </span>
                    </div>

                    {/* 3. Foundation Year */}
                    <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg px-2 py-1 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel ">
                      <History className="w-3 h-3 text-[var(--mn-link)] shrink-0" />
                      <span className="truncate">
                        {univ.foundationYear ? `تأسست ${univ.foundationYear}` : 'جامعة معتمدة'}
                      </span>
                    </div>

                    {/* 4. View Details Button matching Scholarship details CTA */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectUniversity?.(univ);
                      }}
                      className="bg-[var(--mn-primary)] hover:bg-[var(--mn-primary)] text-white rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs mn-inverse hover:mn-inverse "
                      data-mn-design="26ecd1db9e"
                    >
                      <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight text-[var(--mn-accent-soft)]">عرض التفاصيل</span>
                      <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-[var(--mn-accent-soft)]" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
