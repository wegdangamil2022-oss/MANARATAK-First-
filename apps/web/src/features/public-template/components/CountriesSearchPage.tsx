import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Globe2,
  MapPin,
  ChevronDown,
  ChevronLeft,
  RotateCcw,
  Coins,
  GraduationCap,
  Users,
  Building2,
  BookOpen,
  Compass,
  CheckCircle2,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { CountryDestination } from '../types';
import type { PublicCountryGraphDto } from '../../../api/client';
import { CountryDetailModal } from './CountryDetailModal';
import { FavoriteButton } from './FavoriteButton';

interface CountriesSearchPageProps {
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
const CountryFlagImage: React.FC<{
  countryId: string;
  countryName: string;
  flagEmoji: string;
  flagUrl?: string;
}> = ({ countryId, countryName, flagEmoji, flagUrl }) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (countryId === 'china') {
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

  if (countryId === 'turkey') {
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

  if (countryId === 'malaysia') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipMy">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipMy)">
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

  if (countryId === 'germany') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipDe">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipDe)">
          <rect x="0" y="0" width="64" height="21.3" fill="#000000" />
          <rect x="0" y="21.3" width="64" height="21.3" fill="#DD0000" />
          <rect x="0" y="42.6" width="64" height="21.4" fill="#FFCE00" />
        </g>
      </svg>
    );
  }

  if (countryId === 'uk') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipUk">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipUk)">
          <rect width="64" height="64" fill="#012169" />
          <path d="M0,0 L64,64 M64,0 L0,64" stroke="#FFFFFF" strokeWidth="8" />
          <path d="M0,0 L64,64 M64,0 L0,64" stroke="#C8102E" strokeWidth="4" />
          <path d="M32,0 V64 M0,32 H64" stroke="#FFFFFF" strokeWidth="12" />
          <path d="M32,0 V64 M0,32 H64" stroke="#C8102E" strokeWidth="7" />
        </g>
      </svg>
    );
  }

  if (countryId === 'saudi') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <circle cx="32" cy="32" r="32" fill="#006C35" />
        <path d="M16,30 Q32,24 48,30" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
        <rect x="18" y="38" width="28" height="3" fill="#FFFFFF" />
        <polygon points="18,39.5 22,36 22,43" fill="#FFFFFF" />
      </svg>
    );
  }

  if (flagUrl && !imgFailed) {
    return (
      <img
        src={flagUrl}
        alt={countryName}
        className="w-full h-full object-cover rounded-full"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return <span className="text-xl sm:text-2xl">{flagEmoji}</span>;
};

export const CountriesSearchPage: React.FC<CountriesSearchPageProps> = ({
  detailId, onDetailChange,
  countries,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState('الكل');
  const [selectedCountryName, setSelectedCountryName] = useState('الكل');
  const [localDetail, setLocalDetail] = useState<CountryDestination | null>(null);
  const activeCountryModal = detailId !== undefined ? (countries.find(item => item.id === detailId || item.publicId === detailId || item.slug === detailId || item.iso2Code === detailId.toUpperCase()) || null) : localDetail;
  const setActiveCountryModal = (value: CountryDestination | null) => onDetailChange ? onDetailChange(value?.id || '') : setLocalDetail(value);


  useEffect(() => {
    if (detailId || !initialCountryIdentity) return;
    const target = countries.find((country) =>
      country.id === initialCountryIdentity ||
      country.publicId === initialCountryIdentity ||
      country.slug === initialCountryIdentity ||
      country.iso2Code === initialCountryIdentity.toUpperCase(),
    );
    if (!target) return;
    setSelectedCountryName(target.name);
    setSearchQuery(target.name);
    setActiveCountryModal(target);
  }, [countries, detailId, initialCountryIdentity]);

  // Extract unique continents and countries
  const continents = useMemo(() => {
    const list = Array.from(new Set(countries.map((c) => c.continent)));
    return ['الكل', ...list];
  }, [countries]);

  const countryNames = useMemo(() => {
    const list = Array.from(new Set(countries.map((c) => c.name)));
    return ['الكل', ...list];
  }, [countries]);

  // Filtering
  const filteredCountries = useMemo(() => {
    return countries.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.continent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.popularCities.some((city) => city.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesContinent = selectedContinent === 'الكل' || c.continent === selectedContinent;
      const matchesCountry = selectedCountryName === 'الكل' || c.name === selectedCountryName;

      return matchesSearch && matchesContinent && matchesCountry;
    });
  }, [countries, searchQuery, selectedContinent, selectedCountryName]);

  const activeFiltersCount =
    (selectedContinent !== 'الكل' ? 1 : 0) +
    (selectedCountryName !== 'الكل' ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedContinent('الكل');
    setSelectedCountryName('الكل');
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
          ? relationshipGraph!.relationships.scholarships.total
          : activeCountryModal.scholarshipsCount,
        universitiesCount: graphMatchesActiveCountry
          ? relationshipGraph!.relationships.universities.total
          : activeCountryModal.universitiesCount,
        featuredScholarships: graphMatchesActiveCountry
          ? relationshipGraph!.relationships.scholarships.data.map((item) => ({
              id: item.slug || item.publicId || item.ownerId,
              name: item.displayName,
              nameEn: item.displayName,
              meta: 'منحة منشورة مرتبطة بهذه الدولة',
            }))
          : activeCountryModal.featuredScholarships,
        featuredUniversities: graphMatchesActiveCountry
          ? relationshipGraph!.relationships.universities.data.map((item) => ({
              id: item.slug || item.publicId || item.ownerId,
              name: item.displayName,
              nameEn: item.displayName,
              meta: 'جامعة منشورة في هذه الدولة',
            }))
          : activeCountryModal.featuredUniversities,
        featuredMajors: graphMatchesActiveCountry
          ? relationshipGraph!.relationships.majors.map((item) => ({
              id: item.slug || item.publicId || item.ownerId,
              name: item.displayName,
              nameEn: item.displayName,
              meta: 'تخصص Canonical مرتبط عبر برامج جامعات الدولة',
            }))
          : activeCountryModal.featuredMajors,
        requiredExams: graphMatchesActiveCountry
          ? relationshipGraph!.relationships.internationalTests.data.map((item) => ({
              id: item.slug || item.publicId || item.ownerId,
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
        onClose={() => onDetailChange ? onBack() : setActiveCountryModal(null)}
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
      dir="rtl"
    >
      {/* ========================================================================= */}
      {/* HERO EMERALD BANNER - COMPACT ROYAL DESIGN                                */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-4 pb-3 overflow-hidden shadow-xs mn-inverse ">
        {/* Top-Right Circular Back Button */}
        <button
          onClick={onBack}
          className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-30 cursor-pointer text-white shadow-xs active:scale-95"
          title="العودة"
          aria-label="العودة"
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

        <div className="max-w-md sm:max-w-xl mx-auto text-center relative z-10 space-y-2 pt-1">
          {/* Top 4-pointed Gold Sparkle Star */}
          <div className="flex justify-center">
            <Sparkles className="h-5 w-5 text-[var(--mn-accent-text)] drop-shadow-[0_0_8px_rgba(214,164,59,0.8)]" aria-hidden="true" />
          </div>

          {/* Main Title */}
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              ابحث عن <span className="text-[var(--mn-accent-text)]">وجهتك الدراسية</span>
            </h1>

            {/* Small Gold Horizontal Divider */}
            <div className="flex justify-center pt-1 pb-0.5">
              <div className="w-10 h-0.5 bg-[var(--mn-accent)] rounded-full mn-gold " />
            </div>

            {/* Subtitle */}
            <p className="text-[11px] sm:text-xs text-white font-medium font-['Cairo',sans-serif] leading-relaxed max-w-xs sm:max-w-sm mx-auto">
              اكتشف وجهات الدراسة حول العالم وابحث عن أفضل الفرص لمستقبلك.
            </p>
          </div>

          {/* Integrated Clean White Search Bar in Hero */}
          <div className="pt-1 max-w-sm sm:max-w-md mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الدولة أو القارة..."
                className="w-full py-2.5 pl-4 pr-10 bg-[var(--mn-surface)] text-[var(--mn-heading)] rounded-full text-[12px] font-bold placeholder:text-[var(--mn-text-muted)] placeholder:text-[12px] placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none shadow-md border border-[var(--mn-border)] focus:border-[var(--mn-accent)] transition-all text-center font-['Cairo',sans-serif] mn-panel "
                style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}
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
        {/* FLOATING FILTER TILES (القارة • الدولة) WITH GOLDEN BORDER & COMPACT SIZE  */}
        {/* ========================================================================= */}
        <div className="max-w-lg mx-auto mn-inline-gutter mt-2.5 relative z-20 pb-0">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Tile 1: القارة */}
          <div className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-gold-surface)]/40 border-1.5 border-[var(--mn-accent)]/70 hover:border-[var(--mn-accent)] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer mn-panel ">
            <div className="flex items-center justify-center gap-1.5 text-[var(--mn-heading)] font-semibold text-xs sm:text-[13px] font-['Cairo',sans-serif] w-full">
              <Globe2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--mn-accent-text)] shrink-0" />
              <span className="truncate">
                {selectedContinent === 'الكل' ? 'القارة' : selectedContinent}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] mt-0.5" />
            <select
              value={selectedContinent}
              onChange={(e) => setSelectedContinent(e.target.value)}
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
            <div className="flex items-center justify-center gap-1.5 text-[var(--mn-heading)] font-semibold text-xs sm:text-[13px] font-['Cairo',sans-serif] w-full">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--mn-accent-text)] shrink-0" />
              <span className="truncate">
                {selectedCountryName === 'الكل' ? 'الدولة' : selectedCountryName}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] mt-0.5" />
            <select
              value={selectedCountryName}
              onChange={(e) => setSelectedCountryName(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              title="اختر الدولة"
            >
              {countryNames.map((cnt) => (
                <option key={cnt} value={cnt}>
                  {cnt === 'الكل' ? 'جميع الدول' : cnt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      </div>

      {/* Gold Divider Ribbon Line Connecting Hero Directly to Content */}
      <div className="w-full h-0.5 bg-gradient-to-r from-[var(--mn-accent-text)] via-[var(--mn-accent-soft)] to-[var(--mn-accent-text)] shadow-xs mt-3" />

      {/* ========================================================================= */}
      {/* 4. CONTENT & HORIZONTAL COUNTRY CARDS SEAMLESSLY ATTACHED                  */}
      {/* ========================================================================= */}
      <div className="max-w-2xl mx-auto px-1 sm:px-2 pt-3.5 space-y-3">
        {/* Results header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[var(--mn-heading)] font-semibold text-xs sm:text-sm font-['Cairo',sans-serif]">
            <Globe2 className="w-3.5 h-3.5 text-[var(--mn-accent-text)]" />
            <span>الدول المتاحة ({filteredCountries.length})</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--mn-accent-text)] bg-[var(--mn-accent)]/10 px-2 py-0.5 rounded-full border border-[var(--mn-accent)]/30">
            <RotateCcw className="w-2.5 h-2.5 text-[var(--mn-accent-text)]" />
            <span>محدثة باستمرار</span>
          </div>
        </div>

        {/* Empty state */}
        {filteredCountries.length === 0 && (
          <div className="bg-[var(--mn-surface)] rounded-2xl p-6 text-center border border-[var(--mn-border)] shadow-xs space-y-2.5 mn-panel ">
            <div className="w-10 h-10 rounded-full bg-[var(--mn-gold-surface)] border border-[var(--mn-border-gold)] flex items-center justify-center mx-auto text-[var(--mn-accent-text)] mn-panel ">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[var(--mn-heading)] text-xs sm:text-sm">
              لم يتم العثور على وجهات مطابقة
            </h3>
            <p className="text-[11px] text-[var(--mn-text-muted)] max-w-xs mx-auto">
              جرب تغيير معايير البحث أو اختيار قارة أخرى.
            </p>
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-[var(--mn-heading)] hover:underline"
            >
              إلغاء جميع الفلاتر
            </button>
          </div>
        )}

        {/* Country Cards List */}
        <div className="space-y-2.5">
          {filteredCountries.map((country) => (
            <div
              key={country.id}
              className="bg-[var(--mn-surface)] rounded-2xl border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all p-3 sm:p-3.5 space-y-2.5 relative overflow-hidden group mn-panel "
            >
              {/* Top Row: Right Country Info & Circular Flag Badge | Left Explore Button */}
              <div className="flex items-center justify-between gap-2">
                {/* Visual Right (RTL): Circular Flag + Country Names */}
                <div className="flex items-center gap-2 sm:gap-2.5 text-right">
                  {/* Circular Flag Badge with Double Golden/Red Ring */}
                  <div className="w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-full p-0.5 bg-gradient-to-tr from-[var(--mn-accent)] via-[var(--mn-accent)] to-[var(--mn-hero-secondary)] shadow-xs shrink-0 flex items-center justify-center mn-gold ">
                    <div className="w-full h-full rounded-full overflow-hidden bg-[var(--mn-surface)] border border-white flex items-center justify-center text-lg sm:text-xl shadow-inner mn-panel ">
                      <CountryFlagImage
                        countryId={country.id}
                        countryName={country.name}
                        flagEmoji={country.flagEmoji}
                        flagUrl={country.flag}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-start text-right">
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
                    style={{ fontSize: '10.5px', fontWeight: 'bold', fontFamily: 'Cairo, sans-serif' }}
                  >
                    <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight text-[var(--mn-accent-soft)]">استكشف الدولة</span>
                    <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-[var(--mn-accent-soft)]" />
                  </button>
                </div>
              </div>

              {/* Bottom Row: 4 Pill Badges (Continent, Cost, Scholarships, Suitability) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                {/* 1. Continent */}
                <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg px-2 py-1 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel ">
                  <Globe2 className="w-3 h-3 text-[var(--mn-heading)] shrink-0" />
                  <span className="truncate">{country.continent}</span>
                </div>

                {/* 2. Living Cost */}
                <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg px-2 py-1 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel ">
                  <Coins className="w-3 h-3 text-[var(--mn-accent-text)] shrink-0" />
                  <span className="truncate">تكلفة المعيشة {country.livingCost}</span>
                </div>

                {/* 3. Scholarship Availability */}
                <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg px-2 py-1 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel ">
                  <GraduationCap className="w-3 h-3 text-[var(--mn-heading)] shrink-0" />
                  <span className="truncate">المنح {country.scholarshipAvailability}</span>
                </div>

                {/* 4. Student Suitability */}
                <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg px-2 py-1 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel ">
                  <Users className="w-3 h-3 text-[var(--mn-link)] shrink-0" />
                  <span className="truncate">ملاءمة للطلاب {country.studentSuitability}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
