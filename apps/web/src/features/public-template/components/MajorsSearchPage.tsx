import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import { searchPublishedMajors } from '../publicLiveDataSource';
import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  const [designStyle] = useState<'classic' | 'bento' | 'minimalist'>('minimalist');

  const resultsRef = useRef<HTMLDivElement>(null);

  // Extract available faculties/fields from the current dataset.
  const faculties = useMemo(() => {
    const set = new Set<string>();
    majors.forEach((major) => set.add(getMajorFaculty(major)));
    return ['الكل', ...Array.from(set)];
  }, [majors]);

  const degreeLevels=['الكل',...Object.keys(DEGREE_CODES)];

  const [filteredMajors,setResults]=useState<Major[]>(majors);
  const [total,setTotal]=useState(majors.length);
  const [cursor,setCursor]=useState<string|undefined>();
  const [nextCursor,setNextCursor]=useState<string|undefined>();
  const [retry,setRetry]=useState(0);
  const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;setCursor(undefined);setNextCursor(undefined);setLoading(true);setError('');
    const timer=window.setTimeout(()=>{void searchPublishedMajors({search:searchQuery.trim()||undefined,degreeLevel:DEGREE_CODES[selectedDegree],academicFieldOrDiscipline:selectedFaculty==='الكل'?undefined:selectedFaculty},locale)
      .then(result=>{if(active){setResults(result.data);setTotal(result.total);setNextCursor(result.nextCursor??undefined);}})
      .catch(()=>{if(active){setResults([]);setError('تعذر تحميل التخصصات. حاول مجددًا.');}}).finally(()=>{if(active)setLoading(false);});},250);
    return ()=>{active=false;window.clearTimeout(timer);};
  },[searchQuery,selectedFaculty,selectedDegree,locale,retry]);
  useEffect(()=>{
    if(!cursor)return;
    let active=true;setLoading(true);setError('');
    void searchPublishedMajors({search:searchQuery.trim()||undefined,degreeLevel:DEGREE_CODES[selectedDegree],academicFieldOrDiscipline:selectedFaculty==='الكل'?undefined:selectedFaculty,cursor},locale)
      .then(result=>{if(active){setResults(old=>[...old,...result.data.filter(row=>!old.some(previous=>previous.id===row.id))]);setTotal(result.total);setNextCursor(result.nextCursor??undefined);}})
      .catch(()=>{if(active)setError('تعذر تحميل الصفحة التالية.');}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[cursor,searchQuery,selectedFaculty,selectedDegree,locale]);


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
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-4 pb-12 sm:pb-14 overflow-hidden shadow-sm mn-inverse ">
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

        <div className="max-w-xl mx-auto text-center relative z-10 space-y-2.5">
          {/* Little 4-pointed Gold Sparkle Star */}
          <div className="flex justify-center -mb-1">
            <Sparkles className="h-4 w-4 text-[var(--mn-accent-text)]" aria-hidden="true" />
          </div>

          {/* Headline with Gold Curve */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-['Cairo',sans-serif] tracking-tight">
              <span>{publicT('public_find')}{' '}</span>
              <span className="relative inline-block text-white">{publicT('public_your_academic_major')}{/* Gold brush accent line underneath */}
                <svg
                  className="absolute -bottom-1.5 inset-x-0 w-full h-2 text-[var(--mn-accent-text)]"
                  viewBox="0 0 100 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2,9 Q50,2 98,6"
                    stroke="var(--mn-accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-[11px] sm:text-xs text-[var(--mn-on-dark-muted)] font-medium font-['Cairo',sans-serif] mt-1.5 leading-relaxed max-w-xs sm:max-w-sm mx-auto">{publicT('public_browse_available_majors_and_discover_faculties_and_degrees')}</p>
          </div>

          {/* Integrated Search Bar in Hero */}
          <div className="pt-1 max-w-sm sm:max-w-md mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_search_by_major_faculty_or_job')}
                className="w-full py-2 pl-4 pr-10 bg-[var(--mn-surface)] text-[var(--mn-heading)] rounded-full text-[11px] font-bold placeholder:text-[var(--mn-text-muted)] placeholder:text-[11px] placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none shadow-md border border-[var(--mn-border)] focus:border-[var(--mn-accent)] transition-all text-center font-['Cairo',sans-serif] mn-panel "
                data-mn-design="8bba664dec"
              />
              <Search className="w-3.5 h-3.5 text-[var(--mn-accent-text)] absolute right-3.5 top-1/2 -translate-y-1/2" />
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
          <div className="flex justify-center mt-3">
            <button
              onClick={handleResetFilters}
              className="text-[10px] sm:text-[11px] font-bold text-[var(--mn-danger-text)] hover:text-[var(--mn-danger-text)] bg-[var(--mn-danger-soft)] hover:bg-[var(--mn-danger-soft)] px-3 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{publicT('public_reset_filters')}{activeFiltersCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FLOATING FILTER CARD WITH 2 TILES (الكلية • الدرجة)  */}
      {/* ========================================================================= */}
      <div className="max-w-xl mx-auto mn-inline-gutter -mt-7 sm:-mt-8 relative z-20 space-y-2.5">
        {/* Outer Framed Box with Gold Border */}
        <div className="bg-[var(--mn-surface)] border border-[var(--mn-accent)]/50 rounded-3xl p-2 sm:p-2.5 shadow-md mn-panel ">
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {/* Tile 1: الكلية */}
            <div className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-page)]/80 border border-[var(--mn-border)] rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-2xs transition-colors mn-panel hover:mn-panel ">
              <div className="flex items-center gap-1 text-[var(--mn-heading)] font-bold text-[10px] sm:text-[11px] font-['Cairo',sans-serif] leading-tight">
                <Layers className="w-3 h-3 text-[var(--mn-accent-text)]" />
                <span className="truncate">
                  {selectedFaculty === 'الكل' ? publicT('public_choose_faculty') : selectedFaculty}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] mt-1" />
              <input aria-label={publicT('public_faculty_or_academic_domain')} list="major-field-suggestions" value={selectedFaculty==='الكل'?'':selectedFaculty} onChange={event=>setSelectedFaculty(event.target.value||'الكل')} className="mt-2 w-full rounded border p-1 text-xs" placeholder={publicT('public_enter_a_faculty_or_domain')} />
              <datalist id="major-field-suggestions">{faculties.filter(value=>value!=='الكل').map(value=><option key={value} value={value}/>)}</datalist>
            </div>

            {/* Tile 2: الدرجة العلمية */}
            <div className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-page)]/80 border border-[var(--mn-border)] rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-2xs transition-colors mn-panel hover:mn-panel ">
              <div className="flex items-center gap-1 text-[var(--mn-heading)] font-bold text-[10px] sm:text-[11px] font-['Cairo',sans-serif] leading-tight">
                <GraduationCap className="w-3 h-3 text-[var(--mn-accent-text)]" />
                <span className="truncate">
                  {selectedDegree === 'الكل' ? publicT('public_degree_2') : selectedDegree}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] mt-1" />
              <select
                value={selectedDegree}
                onChange={(e) => setSelectedDegree(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title={publicT('public_choose_degree')}
              >
                {degreeLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl === 'الكل' ? publicT('public_all_degrees') : lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RESULTS LIST SECTION */}
      {/* ========================================================================= */}
      <div ref={resultsRef} className="w-full max-w-4xl mx-auto mn-inline-gutter pt-3 space-y-2.5">
        {/* Section Header: التخصصات المتاحة */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs sm:text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">{publicT('public_available_majors')}{error?publicT('public_unknown'):loading?'…':total})
          </span>
          <span className="text-[10px] sm:text-[11px] text-[var(--mn-accent-text)] font-bold font-['Cairo',sans-serif]">{publicT('public_updated_regularly')}</span>
        </div>

        {/* Cards Stack */}
        <div className="flex flex-col gap-2.5 sm:gap-3 w-full">
          {loading&&<p role="status">{publicT('public_loading_majors')}</p>}
          {error&&<div><p role="alert">{error}</p><button type="button" onClick={()=>setRetry(value=>value+1)}>{locale==='ar'?publicT('public_try_again'):'Retry'}</button></div>}
          {nextCursor&&<button type="button" disabled={loading} onClick={()=>setCursor(nextCursor)}>{publicT('public_show_more')}</button>}
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
            filteredMajors.map((major) => (
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
      </div>
    </div>
  );
};
