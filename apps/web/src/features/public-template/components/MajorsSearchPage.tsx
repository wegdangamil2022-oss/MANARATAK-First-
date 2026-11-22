import { useBoundedCatalog } from '../useBoundedCatalog';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import { searchPublishedMajors } from '../publicLiveDataSource';
import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  X,
  ChevronLeft,
  ChevronDown,
  Layers,
  GraduationCap,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Major } from '../types';
import { MajorCard } from './MajorCard';
import { PublicCardsPagination, PublicInlineFilterPanel, usePaginatedCatalog } from './DetailUi';

interface MajorsSearchPageProps {
  locale?: 'ar'|'en';
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
  majors?: Major[];
  onBack?: () => void;
  onSelectMajor?: (major: Major) => void;
}

const getMajorFaculty = (major: Major) =>
  major.category || major.academicField || major.professionalOrResearchField || 'غير مصنف';

const DEGREE_CODES:Record<string,string>={'بكالوريوس':'BACHELOR','ماجستير':'MASTER','دكتوراه':'DOCTORATE','زمالة أبحاث':'FELLOWSHIP'};
export const MajorsSearchPage: React.FC<MajorsSearchPageProps> = ({
  majors = [],
  locale = 'ar',
  onBack,
  onSelectMajor,
  favoriteIds = [],
  onToggleFavorite,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('الكل');
  const [selectedDegree, setSelectedDegree] = useState('الكل');
  const [activeFilterModal, setActiveFilterModal] = useState<'faculty' | 'degree' | null>(null);
  const [designStyle] = useState<'classic' | 'bento' | 'minimalist'>('minimalist');

  const resultsRef = useRef<HTMLDivElement>(null);

  // Extract available faculties/fields from the current dataset.
  const faculties = useMemo(() => {
    const set = new Set<string>();
    majors.forEach((major) => set.add(getMajorFaculty(major)));
    [
      'الهندسة والتكنولوجيا',
      'العلوم الطبية والصحية',
      'علوم الحاسوب والذكاء الاصطناعي',
      'إدارة الأعمال والاقتصاد',
      'العلوم الإنسانية والاجتماعية',
      'العلوم الأساسية والطبيعية',
    ].forEach((f) => set.add(f));
    return ['الكل', ...Array.from(set)];
  }, [majors]);

  const degreeLevels=['الكل',...Object.keys(DEGREE_CODES)];

  // The published catalog remains API-owned. Only the explicitly selected
  // non-production design preview searches its bundled example records.
  const prototypePreview = import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype';
  const catalog = useBoundedCatalog<Major>(
    JSON.stringify([searchQuery, selectedFaculty, selectedDegree, locale, prototypePreview ? majors.map((item) => item.id) : null]),
    async (cursor, signal) => {
      if (prototypePreview) {
        const query = searchQuery.trim().toLowerCase();
        const faculty = selectedFaculty.trim().toLowerCase();
        const filtered = majors.filter((major) => {
          const academicField = getMajorFaculty(major);
          const searchable = [major.name, major.nameEn, academicField, major.description];
          return (!query || searchable.some((value) => value.toLowerCase().includes(query))) &&
            (selectedFaculty === 'الكل' || academicField.toLowerCase().includes(faculty)) &&
            (selectedDegree === 'الكل' || major.degreeLevels?.some((degree) => degree === selectedDegree));
        });
        const offset = cursor === undefined ? 0 : Number(cursor);
        if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('INVALID_PREVIEW_CURSOR');
        const page = filtered.slice(offset, offset + 30);
        const nextOffset = offset + page.length;
        return { data: page, total: filtered.length, nextCursor: nextOffset < filtered.length ? String(nextOffset) : null };
      }
      return searchPublishedMajors({ search: searchQuery.trim() || undefined, degreeLevel: DEGREE_CODES[selectedDegree], academicFieldOrDiscipline: selectedFaculty === 'الكل' ? undefined : selectedFaculty, cursor }, locale, signal);
    },
  );
  const { rows: filteredMajors, total, cursor: nextCursor, busy: loading, error } = catalog;

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems: paginatedMajors,
  } = usePaginatedCatalog(
    filteredMajors,
    `${searchQuery}|${selectedFaculty}|${selectedDegree}`,
    30,
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedFaculty('الكل');
    setSelectedDegree('الكل');
  };

  const activeFiltersCount =
    (selectedFaculty !== 'الكل' ? 1 : 0) +
    (selectedDegree !== 'الكل' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0);

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

          {/* Thin gold curved orbital lines on left */}
          <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full border border-[#F2CD78]/20 pointer-events-none" />
          <div className="absolute -top-6 -left-6 w-72 h-72 rounded-full border border-[#F2CD78]/12 pointer-events-none" />

          {/* Architectural silhouette on right in subtle translucent white */}
          <svg
            className="absolute -right-4 bottom-0 h-40 w-40 text-white/10 pointer-events-none"
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
              <span className="text-[#F2CD78]">{publicT('public_your_academic_major')}</span>
            </h1>

            {/* Small Official Gold Horizontal Divider */}
            <div className="flex justify-center pt-0.5 pb-0.5">
              <div className="w-10 md:w-14 h-0.5 bg-gradient-to-r from-[#D6A43B] via-[#F2CD78] to-[#D6A43B] rounded-full" />
            </div>

            {/* Subtitle */}
            <p className="text-[10px] sm:text-xs md:text-sm text-[#DDEFF2] font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto px-2 line-clamp-2">
              {publicT('public_browse_available_majors_and_discover_faculties_and_degrees')}
            </p>
          </div>

          {/* Integrated Clean Search Bar in Hero */}
          <div className="pt-0.5 sm:pt-1 max-w-sm sm:max-w-md md:max-w-xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_search_by_major_faculty_or_job')}
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
        {/* 2 BALANCED FLOATING FILTER TILES (الكلية • الدرجة) MATCHING SCHOLARSHIPS  */}
        {/* ========================================================================= */}
        <div className="max-w-md md:max-w-2xl mx-auto mn-inline-gutter mt-2 sm:mt-2.5 md:mt-3.5 relative z-20 pb-0 md:pb-1">
          <div className="grid grid-cols-2 gap-2 md:gap-3.5 max-w-[320px] sm:max-w-[380px] md:max-w-[460px] mx-auto">
            {/* Tile 1: الكلية */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFilterModal((prev) => (prev === 'faculty' ? null : 'faculty'));
                }
              }}
              onClick={() => setActiveFilterModal((prev) => (prev === 'faculty' ? null : 'faculty'))}
              className={`relative bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                activeFilterModal === 'faculty'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedFaculty !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif] min-w-0 overflow-hidden`}
              title={publicT('public_choose_faculty')}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10.5px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full min-w-0 overflow-hidden px-0.5">
                <Layers
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${
                    selectedFaculty !== 'الكل'
                      ? 'text-[#D6A43B] dark:text-[#F2CD78]'
                      : 'text-[#0E7C86] dark:text-[#34BFC9]'
                  }`}
                />
                <span className="min-w-0 truncate font-['Cairo',sans-serif]">
                  {selectedFaculty === 'الكل' ? publicT('public_choose_faculty') : selectedFaculty}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${activeFilterModal === 'faculty' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </div>

            {/* Tile 2: الدرجة العلمية */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFilterModal((prev) => (prev === 'degree' ? null : 'degree'));
                }
              }}
              onClick={() => setActiveFilterModal((prev) => (prev === 'degree' ? null : 'degree'))}
              className={`relative bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                activeFilterModal === 'degree'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedDegree !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif] min-w-0 overflow-hidden`}
              title={publicT('public_choose_degree')}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10.5px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full min-w-0 overflow-hidden px-0.5">
                <GraduationCap
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 ${
                    selectedDegree !== 'الكل'
                      ? 'text-[#D6A43B] dark:text-[#F2CD78]'
                      : 'text-[#0E7C86] dark:text-[#34BFC9]'
                  }`}
                />
                <span className="min-w-0 truncate font-['Cairo',sans-serif]">
                  {selectedDegree === 'الكل'
                    ? publicT('public_degree_2')
                    : selectedDegree === 'زمالة أبحاث'
                      ? 'الزمالة'
                      : selectedDegree}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${activeFilterModal === 'degree' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Official Gold Divider Ribbon Line */}
      <div className="w-full h-[1.5px] bg-gradient-to-r from-[#D6A43B]/45 via-[#F2CD78] to-[#D6A43B]/45 dark:from-[#D6A43B]/30 dark:via-[#F2CD78]/65 dark:to-[#D6A43B]/30 mb-3 md:mb-5" />

      {/* Inline Attached Filter Panels */}
      <PublicInlineFilterPanel
        isOpen={activeFilterModal === 'faculty'}
        title={publicT('public_choose_faculty')}
        icon={Layers}
        selectedValue={selectedFaculty}
        onSelect={(val) => setSelectedFaculty(val)}
        onClose={() => setActiveFilterModal(null)}
        dir={publicDir}
        options={faculties.map((faculty) => ({
          value: faculty,
          label: faculty === 'الكل' ? (locale === 'en' ? 'All Faculties' : 'جميع الكليات') : faculty,
        }))}
      />

      <PublicInlineFilterPanel
        isOpen={activeFilterModal === 'degree'}
        title={publicT('public_choose_degree')}
        icon={GraduationCap}
        selectedValue={selectedDegree}
        onSelect={(val) => setSelectedDegree(val)}
        onClose={() => setActiveFilterModal(null)}
        dir={publicDir}
        options={degreeLevels.map((lvl) => ({
          value: lvl,
          label: lvl === 'الكل' ? publicT('public_all_degrees') : lvl === 'زمالة أبحاث' ? 'الزمالة' : lvl,
        }))}
      />

      {/* ========================================================================= */}
      {/* RESULTS LIST SECTION                                                      */}
      {/* ========================================================================= */}
      <div ref={resultsRef} className="w-full max-w-4xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1 sm:px-2 md:px-4 pt-1 space-y-3 md:space-y-4">
        {/* Section Header: التخصصات المتاحة (N) • شارة ضباب المعرفة */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-semibold text-xs sm:text-sm md:text-base font-['Cairo',sans-serif]">
            <GraduationCap className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-[#0E7C86] dark:text-[#34BFC9]" />
            <span>
              {publicT('public_available_majors')}
              {error ? publicT('public_unknown') : loading ? '…' : total})
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] md:text-xs font-bold text-[#0E7C86] dark:text-[#7FD4DE] bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 px-2.5 md:px-3 py-0.5 md:py-1 rounded-full border border-[#0E7C86]/20 dark:border-[#34BFC9]/25 font-['Cairo',sans-serif]">
            <RotateCcw className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#0E7C86] dark:text-[#34BFC9]" />
            <span>{publicT('public_updated_regularly')}</span>
          </div>
        </div>

        {/* Cards Stack on Mobile, 2/3-Column Equal-Height Grid on Desktop */}
        <div className="flex flex-col gap-2.5 sm:gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch w-full">
          {loading && (
            <div className="md:col-span-2 lg:col-span-3 py-6 text-center">
              <p role="status" className="text-xs sm:text-sm font-bold text-[#5C707C] dark:text-[#9BB4C7]">
                {publicT('public_loading_majors')}
              </p>
            </div>
          )}
          {error && (
            <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-[#111E38] border border-[#142B5F]/12 dark:border-white/10 rounded-3xl p-6 text-center flex flex-col items-center gap-2">
              <p role="alert" className="text-xs sm:text-sm font-bold text-[#142B5F] dark:text-[#F1F5F9]">
                {error}
              </p>
              <button
                type="button"
                onClick={() => catalog.retry()}
                className="px-4 py-1.5 bg-[#142B5F] hover:bg-[#0E7C86] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                {locale === 'ar' ? publicT('public_try_again') : 'Retry'}
              </button>
            </div>
          )}
          {filteredMajors.length === 0 && (loading || error) ? null : filteredMajors.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-[#111E38] border border-[#142B5F]/12 dark:border-white/10 rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-2xs mn-panel ">
              <div className="w-12 h-12 rounded-full bg-[#DDEFF2]/70 dark:bg-[#0B1529] flex items-center justify-center text-[#0E7C86] dark:text-[#34BFC9]">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm md:text-base font-bold text-[#142B5F] dark:text-[#F1F5F9] font-['Cairo',sans-serif]">
                {publicT('public_no_matching_majors_found')}
              </h3>
              <p className="text-xs md:text-sm text-[#5C707C] dark:text-[#9BB4C7] max-w-xs md:max-w-md font-['Cairo',sans-serif]">
                {publicT('public_try_changing_the_filters_or_searching_for_another_2')}
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-1.5 bg-[#142B5F] hover:bg-[#0E7C86] text-white rounded-xl text-xs md:text-sm font-bold cursor-pointer transition-colors font-['Cairo',sans-serif]"
              >
                {publicT('public_clear_filters_and_view_all')}
              </button>
            </div>
          ) : (
            paginatedMajors.map((major) => (
              <MajorCard
                key={major.id}
                major={major}
                isFavorited={favoriteIds.includes(major.id)}
                onToggleFavorite={onToggleFavorite}
                onSelectMajor={onSelectMajor}
                designStyle={designStyle}
              />
            ))
          )}
        </div>

        {nextCursor && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={() => catalog.more()}
              className="px-4 py-2 bg-white dark:bg-[#111E38] border border-[#142B5F]/15 dark:border-white/14 hover:border-[#0E7C86]/45 text-[#142B5F] dark:text-[#F1F5F9] rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-all"
            >
              {publicT('public_show_more')}
            </button>
          </div>
        )}

        {filteredMajors.length > 0 && (
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
