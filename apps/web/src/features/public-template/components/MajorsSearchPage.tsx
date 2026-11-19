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
import { PublicCardsPagination, PublicFilterSelectModal, usePaginatedCatalog } from './DetailUi';

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
      className="min-h-screen bg-[var(--mn-page)] text-[var(--mn-heading)] pb-24 font-['Cairo',sans-serif] select-none mn-panel "
      dir={publicDir}
    >
      {/* ========================================================================= */}
      {/* HERO EMERALD CURVED BANNER */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-4 pb-3 overflow-hidden shadow-xs mn-inverse ">
        {/* Back Button */}
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

        {/* Background Decorative Gold Waves & Dot Patterns */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg
            className="w-full h-full"
            viewBox="0 0 400 200"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-50,50 Q100,-20 250,60 T550,40"
              stroke="var(--mn-accent)"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M-20,120 Q150,40 300,140 T600,100"
              stroke="var(--mn-accent)"
              strokeWidth="1"
              fill="none"
            />
            <circle cx="30" cy="30" r="1" fill="var(--mn-accent)" />
            <circle cx="45" cy="30" r="1" fill="var(--mn-accent)" />
            <circle cx="60" cy="30" r="1" fill="var(--mn-accent)" />
            <circle cx="30" cy="45" r="1" fill="var(--mn-accent)" />
            <circle cx="45" cy="45" r="1" fill="var(--mn-accent)" />
            <circle cx="60" cy="45" r="1" fill="var(--mn-accent)" />
          </svg>
        </div>

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-2 md:space-y-3 pt-1 md:pt-3">
          {/* Little 4-pointed Gold Sparkle Star */}
          <div className="flex justify-center">
            <Sparkles className="h-5 w-5 text-[var(--mn-accent-text)] drop-shadow-[0_0_8px_rgba(214,164,59,0.8)]" aria-hidden="true" />
          </div>

          {/* Main Title */}
          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              {publicT('public_find')}{' '}
              <span className="text-[var(--mn-accent-text)]">{publicT('public_your_academic_major')}</span>
            </h1>

            {/* Small Gold Horizontal Divider */}
            <div className="flex justify-center pt-1 pb-0.5">
              <div className="w-10 md:w-16 h-0.5 bg-[var(--mn-accent)] rounded-full mn-gold " />
            </div>

            {/* Subtitle (single-line height matching Scholarships Hero) */}
            <p className="text-[11px] sm:text-xs md:text-sm lg:text-base text-white font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto truncate">{publicT('public_browse_available_majors_and_discover_faculties_and_degrees')}</p>
          </div>

          {/* Integrated Search Bar in Hero */}
          <div className="pt-1 max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_search_by_major_faculty_or_job')}
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
              <span>{publicT('public_reset_filters')}{activeFiltersCount})</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2 SEPARATE FLOATING FILTER TILES (الكلية • الدرجة) INSIDE HERO            */}
        {/* ========================================================================= */}
        <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto mn-inline-gutter mt-2.5 md:mt-4 relative z-20 pb-0 md:pb-2">
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:gap-3.5">
            {/* Tile 1: الكلية */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFilterModal('faculty');
                }
              }}
              onClick={() => setActiveFilterModal('faculty')}
              className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer mn-panel font-['Cairo',sans-serif]"
              title={publicT('public_choose_faculty')}
            >
              <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-bold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <Layers className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="truncate font-['Cairo',sans-serif]">
                  {selectedFaculty === 'الكل' ? publicT('public_choose_faculty') : selectedFaculty}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)] mt-0.5" />
            </div>

            {/* Tile 2: الدرجة العلمية */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFilterModal('degree');
                }
              }}
              onClick={() => setActiveFilterModal('degree')}
              className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer mn-panel font-['Cairo',sans-serif]"
              title={publicT('public_choose_degree')}
            >
              <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-bold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <GraduationCap className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="truncate font-['Cairo',sans-serif]">
                  {selectedDegree === 'الكل'
                    ? publicT('public_degree_2')
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
      <div className="w-full h-0.5 bg-gradient-to-r from-[var(--mn-accent-text)] via-[var(--mn-accent-soft)] to-[var(--mn-accent-text)] shadow-xs mb-1" />

      {/* ========================================================================= */}
      {/* RESULTS LIST SECTION */}
      {/* ========================================================================= */}
      <div ref={resultsRef} className="w-full max-w-4xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto mn-inline-gutter md:px-4 pt-3 md:pt-5 space-y-2.5 md:space-y-4">
        {/* Section Header: التخصصات المتاحة */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs sm:text-sm md:text-base font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">{publicT('public_available_majors')}{error?publicT('public_unknown'):loading?'…':total})
          </span>
          <span className="text-[10px] sm:text-[11px] md:text-xs text-[var(--mn-accent-text)] font-bold font-['Cairo',sans-serif]">{publicT('public_updated_regularly')}</span>
        </div>

        {/* Cards Stack */}
        <div className="flex flex-col gap-2.5 sm:gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch w-full">
          {loading&&<p role="status">{publicT('public_loading_majors')}</p>}
          {error&&<div><p role="alert">{error}</p><button type="button" onClick={()=>catalog.retry()}>{locale==='ar'?publicT('public_try_again'):'Retry'}</button></div>}
          {nextCursor&&<button type="button" disabled={loading} onClick={()=>catalog.more()}>{publicT('public_show_more')}</button>}
          {filteredMajors.length === 0 && (loading || error) ? null : filteredMajors.length === 0 ? (
            <div className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-2xs mn-panel ">
              <div className="w-12 h-12 rounded-full bg-[var(--mn-surface-muted)] flex items-center justify-center text-[var(--mn-text-muted)] mn-panel ">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">{publicT('public_no_matching_majors_found')}</h3>
              <p className="text-xs text-[var(--mn-text-muted)] max-w-xs font-['Cairo',sans-serif]">{publicT('public_try_changing_the_filters_or_searching_for_another_2')}</p>
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-1.5 bg-[var(--mn-primary)] text-white rounded-xl text-xs font-bold cursor-pointer font-['Cairo',sans-serif] mn-inverse "
              >{publicT('public_clear_filters_and_view_all')}</button>
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

      <PublicFilterSelectModal
        isOpen={activeFilterModal === 'faculty'}
        title={publicT('public_choose_faculty')}
        icon={Layers}
        selectedValue={selectedFaculty}
        onSelect={(val) => setSelectedFaculty(val)}
        onClose={() => setActiveFilterModal(null)}
        dir={publicDir}
        options={faculties.map((faculty) => ({
          value: faculty,
          label: faculty === 'الكل' ? publicT('public_choose_faculty') : faculty,
        }))}
      />

      <PublicFilterSelectModal
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
    </div>
  );
};
