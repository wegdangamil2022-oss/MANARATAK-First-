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
import { PublicCardsPagination, PublicInlineFilterPanel, usePaginatedCatalog } from './DetailUi';

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
export const CountryFlagImage: React.FC<{
  countryId: string;
  countryName: string;
  flagEmoji?: string;
  flagUrl?: string;
  iso2Code?: string;
}> = ({ countryId, countryName, flagEmoji, flagUrl, iso2Code }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const key = `${countryId} ${countryName} ${iso2Code || ''}`.toLowerCase();

  if (key.includes('china') || key.includes('الصين') || iso2Code?.toUpperCase() === 'CN') {
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

  if (key.includes('turkey') || key.includes('تركيا') || iso2Code?.toUpperCase() === 'TR') {
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

  if (key.includes('malaysia') || key.includes('ماليزيا') || iso2Code?.toUpperCase() === 'MY') {
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

  if (key.includes('germany') || key.includes('ألمانيا') || iso2Code?.toUpperCase() === 'DE') {
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

  if (
    key.includes('uk') ||
    key.includes('united kingdom') ||
    key.includes('المملكة المتحدة') ||
    key.includes('بريطانيا') ||
    iso2Code?.toUpperCase() === 'GB'
  ) {
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

  if (key.includes('saudi') || key.includes('السعودية') || iso2Code?.toUpperCase() === 'SA') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <circle cx="32" cy="32" r="32" fill="#006C35" />
        <path d="M16,30 Q32,24 48,30" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
        <rect x="18" y="38" width="28" height="3" fill="#FFFFFF" />
        <polygon points="18,39.5 22,36 22,43" fill="#FFFFFF" />
      </svg>
    );
  }

  if (key.includes('france') || key.includes('فرنسا') || iso2Code?.toUpperCase() === 'FR') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipFr">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipFr)">
          <rect x="0" y="0" width="21.34" height="64" fill="#002395" />
          <rect x="21.33" y="0" width="21.34" height="64" fill="#FFFFFF" />
          <rect x="42.66" y="0" width="21.34" height="64" fill="#ED2939" />
        </g>
      </svg>
    );
  }

  if (key.includes('japan') || key.includes('اليابان') || iso2Code?.toUpperCase() === 'JP') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <circle cx="32" cy="32" r="32" fill="#FFFFFF" />
        <circle cx="32" cy="32" r="14" fill="#BC002D" />
      </svg>
    );
  }

  if (
    key.includes('usa') ||
    key.includes('united states') ||
    key.includes('الولايات المتحدة') ||
    key.includes('أمريكا') ||
    iso2Code?.toUpperCase() === 'US'
  ) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipUs">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipUs)">
          <rect width="64" height="64" fill="#FFFFFF" />
          <rect y="0" width="64" height="5" fill="#B22234" />
          <rect y="10" width="64" height="5" fill="#B22234" />
          <rect y="20" width="64" height="5" fill="#B22234" />
          <rect y="30" width="64" height="5" fill="#B22234" />
          <rect y="40" width="64" height="5" fill="#B22234" />
          <rect y="50" width="64" height="5" fill="#B22234" />
          <rect y="59" width="64" height="5" fill="#B22234" />
          <rect width="30" height="35" fill="#3C3B6E" />
          <circle cx="10" cy="10" r="2" fill="#FFFFFF" />
          <circle cx="20" cy="10" r="2" fill="#FFFFFF" />
          <circle cx="15" cy="17" r="2" fill="#FFFFFF" />
          <circle cx="10" cy="24" r="2" fill="#FFFFFF" />
          <circle cx="20" cy="24" r="2" fill="#FFFFFF" />
        </g>
      </svg>
    );
  }

  if (key.includes('canada') || key.includes('كندا') || iso2Code?.toUpperCase() === 'CA') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipCa">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipCa)">
          <rect x="0" y="0" width="16" height="64" fill="#FF0000" />
          <rect x="16" y="0" width="32" height="64" fill="#FFFFFF" />
          <rect x="48" y="0" width="16" height="64" fill="#FF0000" />
          <polygon points="32,16 35,24 42,23 37,29 41,35 33,35 33,44 31,44 31,35 23,35 27,29 22,23 29,24" fill="#FF0000" />
        </g>
      </svg>
    );
  }

  if (key.includes('russia') || key.includes('روسيا') || iso2Code?.toUpperCase() === 'RU') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full rounded-full object-cover">
        <clipPath id="circleClipRu">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#circleClipRu)">
          <rect x="0" y="0" width="64" height="21.3" fill="#FFFFFF" />
          <rect x="0" y="21.3" width="64" height="21.3" fill="#0039A6" />
          <rect x="0" y="42.6" width="64" height="21.4" fill="#D52B1E" />
        </g>
      </svg>
    );
  }

  if (flagUrl && /^(https?:\/\/|\/)/i.test(flagUrl) && !imgFailed) {
    return (
      <img
        src={flagUrl}
        alt={countryName}
        className="w-full h-full object-cover rounded-full"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return <span className="text-xl sm:text-2xl leading-none">{flagEmoji || '🌍'}</span>;
};

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
      className="min-h-screen bg-[#F6F8FA] dark:bg-[#0A1326] text-[#203442] dark:text-[#EDF5F5] pb-24 font-['Cairo',sans-serif] select-none mn-panel dark:[--mn-border:rgba(255,255,255,0.12)]"
      dir={publicDir}
    >
      {/* ========================================================================= */}
      {/* HERO BANNER - COMPACT BALANCED ARABIC DESIGN MATCHING SCHOLARSHIPS/MAJORS */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-2.5 pb-2.5 sm:pt-4 sm:pb-3 overflow-hidden shadow-xs mn-inverse ">
        {/* Top-Right Circular Back Button */}
        <button
          onClick={onBack}
          className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-30 cursor-pointer text-white shadow-xs active:scale-95"
          title={publicT('public_back')}
          aria-label={publicT('public_back')}
        >
          <ChevronLeft className="w-4 h-4 rotate-180 text-white" />
        </button>

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
            <Sparkles
              className="h-4.5 w-4.5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#F2CD78] drop-shadow-[0_0_8px_rgba(214,164,59,0.75)]"
              aria-hidden="true"
            />
          </div>

          {/* Main Title */}
          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              {publicT('public_find')}{' '}
              <span className="text-[#F2CD78]">
                {publicT('public_your_study_destination')}
              </span>
            </h1>

            {/* Small Official Gold Horizontal Divider */}
            <div className="flex justify-center pt-0.5 pb-0.5">
              <div className="w-10 md:w-14 h-0.5 bg-gradient-to-r from-[#D6A43B] via-[#F2CD78] to-[#D6A43B] rounded-full" />
            </div>

            {/* Subtitle */}
            <p className="text-[10px] sm:text-xs md:text-sm text-[#DDEFF2] font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto px-2 line-clamp-2">
              {publicT('public_discover_study_destinations_worldwide_and_find_the_best')}
            </p>
          </div>

          {/* Integrated Clean Search Bar in Hero */}
          <div className="pt-0.5 sm:pt-1 max-w-sm sm:max-w-md md:max-w-xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_search_by_country_or_continent')}
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
              <span>
                {publicT('public_reset_filters')}
                {activeFiltersCount})
              </span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2 BALANCED FLOATING FILTER TILES (القارة • الدولة)                       */}
        {/* ========================================================================= */}
        <div className="max-w-[320px] sm:max-w-[380px] md:max-w-[460px] mx-auto mn-inline-gutter mt-2 sm:mt-2.5 md:mt-3.5 relative z-20 pb-0 md:pb-1">
          <div className="grid grid-cols-2 gap-2 md:gap-3.5">
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
                  {selectedContinent === 'الكل' ? publicT('public_continent') : regionLabel(selectedContinent)}
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
                  : selectedCountryId !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]`}
              title={publicLanguage === 'ar' ? 'اختيار من الدول المعروضة؛ ابحث بالاسم للوصول إلى بقية الدول' : 'Choose a displayed country; search by name to find other countries'}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <MapPin
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${
                    selectedCountryId !== 'الكل'
                      ? 'text-[#D6A43B] dark:text-[#F2CD78]'
                      : 'text-[#0E7C86] dark:text-[#34BFC9]'
                  }`}
                />
                <span className="min-w-0 truncate font-['Cairo',sans-serif]">
                  {selectedCountryId === 'الكل' ? publicT('public_country') : countryNames.find(country => country.id === selectedCountryId)?.label || selectedCountryId}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${activeFilterModal === 'country' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
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
        onSelect={(val) => setSelectedContinent(val)}
        onClose={() => setActiveFilterModal(null)}
        dir={publicDir}
        options={continents.map((c) => ({
          value: c,
          label: c === 'الكل' ? publicT('public_all_continents') : regionLabel(c),
        }))}
      />

      <PublicInlineFilterPanel
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

      {/* ========================================================================= */}
      {/* 4. CONTENT & COUNTRY CARDS LIST                                           */}
      {/* ========================================================================= */}
      <div className="max-w-4xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1 sm:px-2 md:px-4 pt-1 space-y-3 md:space-y-4">
        {/* Results header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-semibold text-xs sm:text-sm md:text-base font-['Cairo',sans-serif]">
            <Globe2 className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-[#0E7C86] dark:text-[#34BFC9]" />
            <span>
              {publicT('public_available_countries')}
              {filteredCountries.length})
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] md:text-xs font-bold text-[#0E7C86] dark:text-[#7FD4DE] bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 px-2.5 md:px-3 py-0.5 md:py-1 rounded-full border border-[#0E7C86]/20 dark:border-[#34BFC9]/25 font-['Cairo',sans-serif]">
            <RotateCcw className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#0E7C86] dark:text-[#34BFC9]" />
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
          <div className="bg-white dark:bg-[#111E38] rounded-2xl p-6 text-center border border-[#142B5F]/12 dark:border-white/10 shadow-xs space-y-2.5 mn-panel ">
            <div className="w-10 h-10 rounded-full bg-[#F6F8FA] dark:bg-[#0B1529] border border-[#142B5F]/10 flex items-center justify-center mx-auto text-[#0E7C86] dark:text-[#34BFC9] mn-panel ">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#142B5F] dark:text-[#EDF5F5] text-xs sm:text-sm">
              {publicT('public_no_matching_destinations_found')}
            </h3>
            <p className="text-[11px] text-[#5C707C] dark:text-[#9BB4C7] max-w-xs mx-auto">
              {publicT('public_try_changing_the_search_criteria_or_choosing_another')}
            </p>
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-[#0E7C86] dark:text-[#34BFC9] hover:underline cursor-pointer"
            >
              {publicT('public_clear_all_filters_2')}
            </button>
          </div>
        )}

        {/* Country Cards List */}
        <div className="flex flex-col gap-2.5 sm:gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch">
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
              onClick={() => setActiveCountryModal(country)}
              className="bg-white dark:bg-[#111E38] rounded-r-[4px] rounded-l-2xl border border-[#142B5F]/12 dark:border-white/10 border-r-3 border-r-[#142B5F] dark:border-r-[#F2CD78]/85 hover:border-[#142B5F]/28 dark:hover:border-[#F2CD78]/45 shadow-[0_4px_16px_rgba(20,43,95,0.04)] hover:shadow-[0_8px_24px_rgba(20,43,95,0.08)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.28)] transition-all duration-150 active:scale-[0.985] p-2.5 sm:p-3 md:p-4 h-full flex flex-col justify-between gap-2 sm:gap-2.5 relative overflow-hidden group cursor-pointer mn-panel "
            >
              {/* Top Row: Circular Flag Badge & Names | Explore Button */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-2.5 text-start min-w-0 flex-1">
                  {/* Circular Flag Badge with Navy-Petrol Ring (Flag stays natural) */}
                  <div className="w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-full p-0.5 bg-gradient-to-br from-[#142B5F] to-[#0E7C86] dark:from-[#0E7C86] dark:to-[#21A7B4] shadow-xs shrink-0 flex items-center justify-center mn-inverse ">
                    <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-[#111E38] border border-white/80 dark:border-white/15 flex items-center justify-center text-lg sm:text-xl shadow-inner mn-panel ">
                      <CountryFlagImage
                        countryId={country.id}
                        countryName={country.name}
                        flagEmoji={country.flagEmoji}
                        flagUrl={country.flag}
                        iso2Code={country.iso2Code}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-start text-start min-w-0 flex-1">
                    <h3 className="text-[11.5px] sm:text-[12.5px] md:text-[14px] font-bold text-[#142B5F] dark:text-[#F1F5F9] font-['Cairo',sans-serif] leading-snug truncate w-full">
                      {country.name}
                    </h3>
                    <span className="text-[10px] sm:text-[11px] font-medium text-[#5C707C] dark:text-[#9BB4C7] font-['Cairo',sans-serif] truncate w-full">
                      {country.nameEn}
                    </span>
                  </div>
                </div>

                {/* Actions: Favorite + Explore Button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {onToggleFavorite && (
                    <FavoriteButton
                      active={favoriteIds.includes(country.id)}
                      onToggle={(event) => {
                        event.stopPropagation();
                        onToggleFavorite(country.id);
                      }}
                    />
                  )}

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveCountryModal(country);
                    }}
                    className="bg-[#142B5F] hover:bg-[#0E7C86] dark:bg-[#162A52] dark:hover:bg-[#1C3566] text-white dark:text-[#F2CD78] border border-transparent dark:border-[#F2CD78]/35 rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs mn-inverse "
                    data-mn-design="26ecd1db9e"
                  >
                    <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight text-white dark:text-[#F2CD78]">
                      {publicT('public_explore_country')}
                    </span>
                    <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-[#F2CD78]" />
                  </button>
                </div>
              </div>

              {/* Bottom Row: 4 Pill Boxes in 2x2 Grid */}
              <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#142B5F]/8 dark:border-white/8">
                {/* 1. Continent */}
                <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel ">
                  <Globe2 className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                  <span className="min-w-0 leading-tight line-clamp-2 break-words">{country.continent}</span>
                </div>

                {/* 2. Living Cost */}
                <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel ">
                  <Coins className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                  <span className="min-w-0 leading-tight line-clamp-2 break-words">
                    {publicT('public_living_costs')} {country.livingCost}
                  </span>
                </div>

                {/* 3. Universities Count */}
                <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel ">
                  <Building2 className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                  <span className="min-w-0 leading-tight line-clamp-2 break-words">
                    {publicLanguage === 'en' ? `${universitiesCountDisplay} Universities` : `${universitiesCountDisplay} جامعة`}
                  </span>
                </div>

                {/* 4. Scholarships Count */}
                <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel ">
                  <GraduationCap className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                  <span className="min-w-0 leading-tight line-clamp-2 break-words">
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

    </div>
  );
};
