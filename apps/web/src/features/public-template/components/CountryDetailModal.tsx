import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpLeft,
  Award,
  Banknote,
  BookOpen,
  Building2,
  CheckCircle2,
  Compass,
  ExternalLink,
  FileCheck2,
  Flag,
  Globe2,
  GraduationCap,
  Languages,
  Layers,
  LayoutGrid,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react';
import { CountryDestination } from '../types';
import { RelatedArticlesStrip } from './RelatedArticlesStrip';
import { FavoriteButton } from './FavoriteButton';
import { DetailBackButton, DetailSectionHeader, useDetailSearchTarget } from './DetailUi';
import { CountryFlagImage } from './CountriesSearchPage';

interface CountryDetailModalProps {
  country: CountryDestination;
  onClose: () => void;
  onOpenUniversity?: (universityId: string) => void;
  onOpenScholarship?: (scholarshipId: string) => void;
  onOpenMajor?: (majorId: string) => void;
  onOpenExam?: (examId: string) => void;
  onBrowseScholarships?: (countryId: string) => void;
  onOpenArticle?: (articleId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  searchAnchor?: string;
  searchTerm?: string;
}

export const CountryDetailModal: React.FC<CountryDetailModalProps> = ({
  country,
  onClose,
  onOpenUniversity,
  onOpenScholarship,
  onOpenMajor,
  onOpenExam,
  onBrowseScholarships,
  onOpenArticle,
  isFavorite = false,
  onToggleFavorite,
  searchAnchor,
  searchTerm,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();
  const [uniViewMode, setUniViewMode] = useState<'swipe' | 'list'>('swipe');
  const [schViewMode, setSchViewMode] = useState<'swipe' | 'list'>('swipe');
  const [majorViewMode, setMajorViewMode] = useState<'swipe' | 'list'>('swipe');

  useDetailSearchTarget(searchAnchor, searchTerm);

  const facts = [
    {
      label: publicT('public_capital'),
      value: country.capitalCity || publicT('public_unavailable_2'),
      icon: MapPin,
    },
    {
      label: publicT('public_currency_2'),
      value: country.currencyCode || publicT('public_unavailable_2'),
      icon: Banknote,
    },
    {
      label: publicT('public_country_code'),
      value:
        [country.iso2Code, country.iso3Code].filter(Boolean).join(' / ') ||
        publicT('public_unavailable_2'),
      icon: Flag,
    },
    {
      label: publicT('public_contact'),
      value: country.callingCode || publicT('public_unavailable_2'),
      icon: Phone,
    },
    {
      label: publicT('public_reference_language'),
      value: country.officialLanguages?.join('، ') || publicT('public_unavailable_2'),
      icon: Languages,
    },
    {
      label: publicT('public_region'),
      value: country.subregion || country.continent,
      icon: Globe2,
    },
    {
      label: publicT('public_time_zone'),
      value: country.timezones?.join('، ') || publicT('public_unavailable_2'),
      icon: Compass,
    },
    {
      label: publicT('public_study_languages_2'),
      value: country.languageOfStudy.join('، ') || publicT('public_unavailable_2'),
      icon: BookOpen,
    },
  ];

  const factRows: Array<[typeof facts[0], typeof facts[0]]> = [
    [facts[0], facts[1]],
    [facts[2], facts[3]],
    [facts[4], facts[5]],
    [facts[6], facts[7]],
  ];

  const costItems = country.costHighlights?.length
    ? country.costHighlights
    : [
        { label: publicT('public_average_living_costs'), value: country.monthlyLivingCostLabel },
        { label: publicT('public_cost_category'), value: country.livingCost },
      ];

  const extendedUniversities = country.featuredUniversities ?? [];
  const extendedScholarships = country.featuredScholarships ?? [];
  const extendedMajors = country.featuredMajors ?? [];

  return (
    <div
      className="w-full max-w-md md:max-w-[1120px] lg:max-w-[1160px] mx-auto bg-[var(--mn-page)] overflow-y-auto animate-fade-in font-['Cairo',sans-serif] pb-14 mn-panel"
      dir={publicDir}
    >
      {/* ========================================================================= */}
      {/* 1. DISTINCTIVE COUNTRY HERO WITH INTEGRATED 3-METRIC RIBBON               */}
      {/* ========================================================================= */}
      <div className="relative w-full overflow-hidden shrink-0">
        {/* Top Action Controls */}
        <div className="absolute top-2.5 left-2.5 md:top-3.5 md:left-4 z-30 flex items-center gap-1.5 scale-90 md:scale-100 origin-top-left">
          {onToggleFavorite && (
            <FavoriteButton
              active={isFavorite}
              onToggle={(event) => {
                event.stopPropagation();
                onToggleFavorite(country.id);
              }}
              className="bg-black/20 hover:bg-black/30 text-white border border-white/20 shadow-sm backdrop-blur-xs"
            />
          )}
          <DetailBackButton
            onBack={onClose}
            mode="close"
            className="text-white bg-black/20 hover:bg-black/30 border border-white/20 backdrop-blur-xs"
          />
        </div>

        {/* Hero Background Card */}
        <div className="relative w-full bg-gradient-to-bl from-[#142B5F] via-[#153B75] to-[#0E7C86] pt-4 pb-3.5 px-3.5 md:px-8 md:py-6 border-b-[2.5px] border-[#D6A43B] shadow-md overflow-hidden">
          {/* Subtle Architectural Gold Arches & Compass Geometry */}
          <svg
            viewBox="0 0 500 210"
            preserveAspectRatio="none"
            className="w-full h-full absolute inset-0 pointer-events-none opacity-25"
          >
            <circle cx="430" cy="35" r="85" stroke="#F2CD78" strokeWidth="1" fill="none" strokeDasharray="4 4" />
            <circle cx="430" cy="35" r="60" stroke="#D6A43B" strokeWidth="1.2" fill="none" />
            <path d="M -40,145 Q 180,85 520,155" stroke="#F2CD78" strokeWidth="1.2" fill="none" />
            <path d="M -20,40 Q 220,-10 530,50" stroke="#D6A43B" strokeWidth="1" fill="none" />
          </svg>

          {/* Main Country Identity Row */}
          <div className="relative z-10 flex items-center gap-3 pt-1 pb-3">
            {/* Dual-Ring Royal Flag Medallion */}
            <div className="relative shrink-0">
              <div className="w-15 h-15 rounded-2xl rotate-3 bg-gradient-to-br from-[#F2CD78] via-[#D6A43B] to-[#9E711B] p-[2px] shadow-[0_0_16px_rgba(214,164,59,0.45)]">
                <div className="w-full h-full -rotate-3 rounded-[14px] bg-[#0F234C] border border-[#F2CD78]/40 p-1.5 flex items-center justify-center text-3xl shadow-inner overflow-hidden">
                  <CountryFlagImage
                    countryId={country.id}
                    countryName={country.name}
                    flagEmoji={country.flagEmoji}
                    flagUrl={country.flag}
                    iso2Code={country.iso2Code}
                  />
                </div>
              </div>
              <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-[#142B5F] border border-[#F2CD78] flex items-center justify-center shadow-xs">
                <Globe2 className="w-3 h-3 text-[#F2CD78]" />
              </div>
            </div>

            {/* Country Name + English Subtitle */}
            <div className="flex flex-col text-start min-w-0 flex-1">
              <div className="inline-flex items-center gap-1 text-[9.5px] font-bold text-[#F2CD78] mb-0.5">
                <Sparkles className="w-3 h-3 text-[#F2CD78] shrink-0" />
                <span>{publicT('public_study_destination')}</span>
              </div>
              <h1 className="text-[18px] sm:text-[19px] font-extrabold text-white leading-tight truncate drop-shadow-xs">
                {country.name}
              </h1>
              <p
                dir="ltr"
                className="text-[11.5px] font-bold text-[#F2CD78]/95 tracking-wide truncate text-right mt-0.5"
              >
                {country.nameEn}
              </p>
            </div>
          </div>

          {/* Prominent 3-Column Metric Dock: القارة | الجامعات | المنح */}
          <div className="relative z-10 grid grid-cols-3 rounded-2xl bg-[#0B1938]/75 border border-[#F2CD78]/40 backdrop-blur-md divide-x divide-x-reverse divide-[#F2CD78]/25 shadow-inner overflow-hidden">
            {/* 1. القارة */}
            <div className="px-2.5 py-2 flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-1 text-[#F2CD78] mb-0.5">
                <Globe2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[9.5px] font-bold text-white/80">القارة</span>
              </div>
              <span className="text-[11px] sm:text-[11.5px] font-extrabold text-white truncate max-w-full">
                {country.continent}
              </span>
            </div>

            {/* 2. الجامعات */}
            <div className="px-2.5 py-2 flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-1 text-[#F2CD78] mb-0.5">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[9.5px] font-bold text-white/80">الجامعات</span>
              </div>
              <span className="text-[11px] sm:text-[11.5px] font-extrabold text-[#F2CD78] truncate max-w-full">
                {country.universitiesCount == null
                  ? publicT('public_unavailable_2')
                  : publicT('public_university_count', { v0: country.universitiesCount })}
              </span>
            </div>

            {/* 3. المنح الدراسية */}
            <div className="px-2.5 py-2 flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-1 text-[#F2CD78] mb-0.5">
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[9.5px] font-bold text-white/80">المنح</span>
              </div>
              <span className="text-[11px] sm:text-[11.5px] font-extrabold text-white truncate max-w-full">
                {country.scholarshipsCount == null
                  ? publicT('public_unavailable_2')
                  : publicT('public_scholarship_count', { v0: country.scholarshipsCount })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. QUICK REFERENCE FACTS (4 ROWS × 2 BOXES WITH GOLD DIAMOND CONNECTORS)  */}
      {/* ========================================================================= */}
      <div className="px-2.5 md:px-4 pt-3 md:pt-4 space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-2.5">
        {factRows.map((pair, rowIdx) => (
          <div key={rowIdx} className="flex items-stretch gap-1.5">
            {pair.map((fact, colIdx) => {
              const FactIcon = fact.icon;
              return (
                <React.Fragment key={fact.label}>
                  <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 border border-[var(--mn-border)] shadow-2xs flex items-center gap-2 min-w-0 mn-panel">
                    <div className="w-7.5 h-7.5 rounded-full mn-quick-info-icon-box flex items-center justify-center shrink-0">
                      <FactIcon className="w-3.5 h-3.5 text-current" />
                    </div>
                    <div className="flex flex-col min-w-0 text-start flex-1">
                      <span className="text-[9.5px] font-bold text-[var(--mn-text-muted)] leading-tight">
                        {fact.label}
                      </span>
                      <span className="text-[10.5px] sm:text-[11px] font-extrabold text-[var(--mn-heading)] leading-snug mt-0.5 break-words">
                        {fact.value}
                      </span>
                    </div>
                  </div>
                  {colIdx === 0 && (
                    <div className="w-1.5 h-1.5 rotate-45 bg-[#D6A43B] shadow-[0_0_5px_rgba(214,164,59,0.5)] shrink-0 self-center" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* MAIN SECTIONS CONTAINER                                                   */}
      {/* ========================================================================= */}
      <main className="space-y-3.5 md:space-y-4 pt-3.5 md:pt-4 md:px-4">
        {/* ----------------------------------------------------------------------- */}
        {/* SECTION 1: الدراسة في [اسم الدولة]                                      */}
        {/* ----------------------------------------------------------------------- */}
        <section className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-3 sm:px-3.5 md:p-6 py-3.5 border-y md:border border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

          <DetailSectionHeader
            icon={Globe2}
            id="country-about"
            title={publicT('public_study_in_country', { v0: country.name })}
            className="mb-3"
          />

          <div className="space-y-2.5">
            {/* Main Description Box with subtle vertical accent line */}
            <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] pl-3 pr-4 py-3 text-start shadow-2xs">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#D6A43B]" />
              <p className="whitespace-pre-wrap text-[11px] sm:text-[11.5px] leading-[1.9] font-bold text-[var(--mn-text)] text-justify">
                {country.description}
              </p>
            </div>

            {/* Study System Summary if available */}
            {country.studySystemSummary && (
              <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 text-start shadow-2xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-[#D6A43B] shrink-0" />
                  <h4 className="text-[10.5px] sm:text-[11px] font-extrabold text-[var(--mn-heading)]">
                    نظام الدراسة الأكاديمي
                  </h4>
                </div>
                <p className="text-[10.5px] sm:text-[11px] leading-[1.85] font-semibold text-[var(--mn-text-muted)]">
                  {country.studySystemSummary}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------------------------- */}
        {/* SECTION 2: جامعات بارزة                                                 */}
        {/* ----------------------------------------------------------------------- */}
        {extendedUniversities.length > 0 && (
          <section className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-3 sm:px-3.5 md:p-6 py-3.5 border-y md:border border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

            <DetailSectionHeader
              icon={Building2}
              id="country-universities"
              title={publicT('public_notable_universities')}
              className="mb-2.5"
            />

            {/* Clean Control Bar (Count + View Mode Toggle) */}
            <div className="flex items-center justify-between gap-2 mb-2.5 px-0.5">
              <span className="text-[10px] font-bold text-[var(--mn-text-muted)]">
                إجمالي الجامعات المعروضة: {extendedUniversities.length}
              </span>
              <div className="inline-flex items-center rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)] p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setUniViewMode('swipe')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    uniViewMode === 'swipe'
                      ? 'bg-[var(--mn-primary)] text-white mn-inverse'
                      : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>سحب عرضي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUniViewMode('list')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    uniViewMode === 'list'
                      ? 'bg-[var(--mn-primary)] text-white mn-inverse'
                      : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]'
                  }`}
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span>قائمة كاملة</span>
                </button>
              </div>
            </div>

            <div
              className={
                uniViewMode === 'swipe'
                  ? 'grid grid-rows-2 grid-flow-col auto-cols-[84%] sm:auto-cols-[240px] md:grid-rows-none md:grid-flow-row md:grid-cols-2 lg:grid-cols-3 md:auto-cols-auto gap-2 md:gap-3 overflow-x-auto md:overflow-visible pb-1 pt-0.5 scrollbar-none snap-x snap-mandatory items-stretch'
                  : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 items-stretch'
              }
            >
              {extendedUniversities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenUniversity?.(item.id)}
                  className="w-full snap-start flex items-center gap-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#D6A43B]/60 p-2.5 text-start transition-all group cursor-pointer shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#142B5F] flex items-center justify-center shrink-0 border border-[#D6A43B]/65 shadow-2xs mn-inverse">
                    <Building2 className="w-4 h-4 text-[#F2CD78]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-[var(--mn-heading)] leading-snug line-clamp-2">
                      {item.name}
                    </div>
                    {item.nameEn && (
                      <div
                        className="text-[9px] font-semibold text-[var(--mn-text-muted)] truncate mt-0.5"
                        dir="ltr"
                      >
                        {item.nameEn}
                      </div>
                    )}
                    {item.meta && (
                      <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-[var(--mn-accent-text)]">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{item.meta}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-6.5 h-6.5 rounded-full bg-[var(--mn-surface)] border border-[var(--mn-border)] flex items-center justify-center shrink-0 group-hover:border-[#D6A43B] group-hover:bg-[#142B5F] transition-colors">
                    <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-heading)] group-hover:text-[#F2CD78] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* SECTION 3: منح دراسية                                                   */}
        {/* ----------------------------------------------------------------------- */}
        {extendedScholarships.length > 0 && (
          <section className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-3 sm:px-3.5 md:p-6 py-3.5 border-y md:border border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

            <DetailSectionHeader
              icon={GraduationCap}
              id="country-scholarships"
              title={publicT('public_scholarships_2')}
              className="mb-2.5"
            />

            {/* Clean Control Bar */}
            <div className="flex items-center justify-between gap-2 mb-2.5 px-0.5">
              <span className="text-[10px] font-bold text-[var(--mn-text-muted)]">
                أبرز المنح المتاحة في {country.name}
              </span>
              <div className="inline-flex items-center rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)] p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSchViewMode('swipe')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    schViewMode === 'swipe'
                      ? 'bg-[var(--mn-primary)] text-white mn-inverse'
                      : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>سحب عرضي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSchViewMode('list')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    schViewMode === 'list'
                      ? 'bg-[var(--mn-primary)] text-white mn-inverse'
                      : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]'
                  }`}
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span>قائمة كاملة</span>
                </button>
              </div>
            </div>

            <div
              className={
                schViewMode === 'swipe'
                  ? 'grid grid-rows-2 grid-flow-col auto-cols-[86%] sm:auto-cols-[260px] md:grid-rows-none md:grid-flow-row md:grid-cols-2 lg:grid-cols-3 md:auto-cols-auto gap-2 md:gap-3 overflow-x-auto md:overflow-visible pb-1 pt-0.5 scrollbar-none snap-x snap-mandatory items-stretch'
                  : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 items-stretch'
              }
            >
              {extendedScholarships.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenScholarship?.(item.id)}
                  className="w-full snap-start flex items-center gap-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#D6A43B]/60 p-2.5 text-start transition-all group cursor-pointer shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#142B5F] flex items-center justify-center shrink-0 border border-[#D6A43B]/65 shadow-2xs mn-inverse">
                    <GraduationCap className="w-4 h-4 text-[#F2CD78]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold leading-snug line-clamp-2 text-[var(--mn-heading)]">
                      {item.name}
                    </div>
                    {item.nameEn && (
                      <div
                        className="text-[9px] font-semibold text-[var(--mn-text-muted)] truncate mt-0.5"
                        dir="ltr"
                      >
                        {item.nameEn}
                      </div>
                    )}
                    {item.meta && (
                      <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-[var(--mn-accent-text)]">
                        <Award className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{item.meta}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-6.5 h-6.5 rounded-full bg-[var(--mn-surface)] border border-[var(--mn-border)] flex items-center justify-center shrink-0 group-hover:border-[#D6A43B] group-hover:bg-[#142B5F] transition-colors">
                    <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-heading)] group-hover:text-[#F2CD78] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* SECTION 4: تخصصات بارزة                                                 */}
        {/* ----------------------------------------------------------------------- */}
        {extendedMajors.length > 0 && (
          <section className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-3 sm:px-3.5 md:p-6 py-3.5 border-y md:border border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

            <DetailSectionHeader
              icon={BookOpen}
              id="country-study"
              title={publicT('public_notable_fields_of_study')}
              className="mb-2.5"
            />

            <div className="flex items-center justify-between gap-2 mb-2.5 px-0.5">
              <span className="text-[10px] font-bold text-[var(--mn-text-muted)]">
                أبرز التخصصات الأكاديمية في {country.name}
              </span>
              <div className="inline-flex items-center rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)] p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setMajorViewMode('swipe')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    majorViewMode === 'swipe'
                      ? 'bg-[var(--mn-primary)] text-white mn-inverse'
                      : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>سحب عرضي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMajorViewMode('list')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    majorViewMode === 'list'
                      ? 'bg-[var(--mn-primary)] text-white mn-inverse'
                      : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]'
                  }`}
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span>قائمة كاملة</span>
                </button>
              </div>
            </div>

            <div
              className={
                majorViewMode === 'swipe'
                  ? 'grid grid-rows-2 grid-flow-col auto-cols-[84%] sm:auto-cols-[245px] md:grid-rows-none md:grid-flow-row md:grid-cols-2 lg:grid-cols-3 md:auto-cols-auto gap-2 md:gap-3 overflow-x-auto md:overflow-visible pb-1 pt-0.5 scrollbar-none snap-x snap-mandatory items-stretch'
                  : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 items-stretch'
              }
            >
              {extendedMajors.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenMajor?.(item.id)}
                  className="w-full snap-start flex items-center gap-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#D6A43B]/60 p-2.5 text-start transition-all group cursor-pointer shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#142B5F] flex items-center justify-center shrink-0 border border-[#D6A43B]/65 shadow-2xs mn-inverse">
                    <BookOpen className="w-4 h-4 text-[#F2CD78]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-[var(--mn-heading)] leading-snug line-clamp-2">
                      {item.name}
                    </div>
                    {item.nameEn && (
                      <div
                        className="text-[9px] font-semibold text-[var(--mn-text-muted)] truncate mt-0.5"
                        dir="ltr"
                      >
                        {item.nameEn}
                      </div>
                    )}
                    {item.meta && (
                      <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-[var(--mn-accent-text)]">
                        <BookOpen className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{item.meta}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-6.5 h-6.5 rounded-full bg-[var(--mn-surface)] border border-[var(--mn-border)] flex items-center justify-center shrink-0 group-hover:border-[#D6A43B] group-hover:bg-[#142B5F] transition-colors">
                    <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-heading)] group-hover:text-[#F2CD78] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* SECTION 5: القبول والاختبارات (مقسم بوضوح إلى ضوابط القبول + الاختبارات) */}
        {/* ----------------------------------------------------------------------- */}
        <section className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-3 sm:px-3.5 md:p-6 py-3.5 border-y md:border border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

          <DetailSectionHeader
            icon={FileCheck2}
            id="country-exams"
            title={publicT('public_admission_and_exams')}
            className="mb-3"
          />

          <div className="space-y-3 text-start">
            {/* أولًا: ضوابط ومتطلبات القبول العام */}
            {country.admissionHighlights && country.admissionHighlights.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-0.5">
                  <span className="w-1.5 h-4 rounded-full bg-[#142B5F] dark:bg-[#D6A43B] shrink-0" />
                  <h3 className="text-[11.5px] font-extrabold text-[var(--mn-heading)]">
                    أولًا: ضوابط ومتطلبات القبول العام
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 items-stretch">
                  {country.admissionHighlights.map((item, index) => {
                    const isNavy = index % 2 === 0;
                    return (
                      <div
                        key={index}
                        className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-2.5 flex items-start gap-2 shadow-2xs"
                      >
                        <span
                          dir="ltr"
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-extrabold border mt-0.5 ${
                            isNavy
                              ? 'bg-[#142B5F]/10 border-[#142B5F]/25 text-[#142B5F] dark:bg-[#D6A43B]/15 dark:border-[#D6A43B]/40 dark:text-[#D6A43B]'
                              : 'bg-[#D6A43B]/12 border-[#D6A43B]/35 text-[#D6A43B] dark:text-[#F2CD78]'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <p className="text-[10.5px] sm:text-[11px] font-bold leading-[1.8] text-[var(--mn-text)] flex-1">
                          {item}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ثانيًا: الاختبارات الدولية واللغوية المعتمدة */}
            {country.requiredExams && country.requiredExams.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[var(--mn-border)]">
                <div className="flex items-center gap-1.5 px-0.5">
                  <span className="w-1.5 h-4 rounded-full bg-[#D6A43B] shrink-0" />
                  <h3 className="text-[11.5px] font-extrabold text-[var(--mn-heading)]">
                    ثانيًا: الاختبارات الدولية واللغوية المعتمدة
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {country.requiredExams.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={onOpenExam ? () => onOpenExam(item.id) : undefined}
                      disabled={!onOpenExam}
                      className="w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] hover:border-[#D6A43B]/60 p-2.5 text-start flex items-center justify-between gap-2.5 transition-all group cursor-pointer shadow-2xs disabled:cursor-default"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-[#142B5F] border border-[#D6A43B]/65 flex items-center justify-center text-[#F2CD78] shrink-0 mt-0.5">
                          <Languages className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-extrabold text-[var(--mn-heading)] leading-snug">
                            {item.name}
                          </p>
                          {item.nameEn && (
                            <p
                              className="text-[9.5px] text-[var(--mn-accent-text)] font-bold truncate mt-0.5"
                              dir="ltr"
                            >
                              {item.nameEn}
                            </p>
                          )}
                          {item.meta && (
                            <p className="mt-1 text-[10px] leading-relaxed font-semibold text-[var(--mn-text-muted)]">
                              {item.meta}
                            </p>
                          )}
                        </div>
                      </div>

                      {onOpenExam && (
                        <div className="w-6.5 h-6.5 rounded-full bg-[var(--mn-surface)] border border-[var(--mn-border)] flex items-center justify-center shrink-0 group-hover:border-[#D6A43B] group-hover:bg-[#142B5F] transition-colors">
                          <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-heading)] group-hover:text-[#F2CD78]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------------------------- */}
        {/* SECTION 6: التأشيرة وشروط الدراسة (مربعات عرضية تحت بعض للشرح المفصل)   */}
        {/* ----------------------------------------------------------------------- */}
        <section className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-3 sm:px-3.5 md:p-6 py-3.5 border-y md:border border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

          <DetailSectionHeader
            icon={ShieldCheck}
            id="country-visa"
            title={publicT('public_visa_and_study_requirements')}
            className="mb-3"
          />

          <div className="space-y-2.5 text-start">
            {/* شريط مستوى إجراءات التأشيرة */}
            {country.visaEase && (
              <div className="rounded-xl bg-[var(--mn-page)] border border-[#D6A43B]/45 px-3 py-2 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#D6A43B] shrink-0" />
                  <span className="text-[10.5px] font-bold text-[var(--mn-heading)]">
                    تقييم إجراءات التأشيرة الطلابية:
                  </span>
                </div>
                <span className="text-[10.5px] font-extrabold text-[var(--mn-accent-text)]">
                  {country.visaEase}
                </span>
              </div>
            )}

            {/* ملخص التأشيرة مع خط تمييز عمودي بسيط */}
            {country.visaSummary && (
              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] pl-3 pr-4 py-3 shadow-2xs">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#D6A43B]" />
                <p className="whitespace-pre-wrap text-[11px] sm:text-[11.5px] font-bold leading-[1.9] text-[var(--mn-text)]">
                  {country.visaSummary}
                </p>
              </div>
            )}

            {/* مربعات عرضية كاملة العرض (1-column) للشرح التفصيلي */}
            {country.visaHighlights && country.visaHighlights.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 items-stretch">
                {country.visaHighlights.map((item, index) => {
                  const isNavy = index % 2 === 0;
                  return (
                    <div
                      key={index}
                      className="w-full rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 flex items-start gap-2.5 shadow-2xs"
                    >
                      <div
                        className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                          isNavy
                            ? 'bg-[#142B5F]/10 border-[#142B5F]/25 text-[#142B5F] dark:bg-[#D6A43B]/15 dark:border-[#D6A43B]/40 dark:text-[#D6A43B]'
                            : 'bg-[#D6A43B]/12 border-[#D6A43B]/35 text-[#D6A43B] dark:text-[#F2CD78]'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[10.5px] sm:text-[11px] font-bold leading-[1.85] text-[var(--mn-text)] flex-1">
                        {item}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------------------------- */}
        {/* SECTION 7: تكاليف المعيشة والدراسة                                      */}
        {/* ----------------------------------------------------------------------- */}
        <section className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-3 sm:px-3.5 md:p-6 py-3.5 border-y md:border border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

          <DetailSectionHeader
            icon={WalletCards}
            id="country-costs"
            title={publicT('public_living_and_study_costs')}
            className="mb-3"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 items-stretch text-start">
            {costItems.map((item, idx) => {
              const isNavy = idx % 2 === 0;
              return (
                <div
                  key={item.label}
                  className="w-full rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 flex items-start gap-2.5 shadow-2xs"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                      isNavy
                        ? 'bg-[#142B5F]/10 border-[#142B5F]/25 text-[#142B5F] dark:bg-[#D6A43B]/15 dark:border-[#D6A43B]/40 dark:text-[#D6A43B]'
                        : 'bg-[#D6A43B]/12 border-[#D6A43B]/35 text-[#D6A43B] dark:text-[#F2CD78]'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-[var(--mn-text-muted)]">
                      {item.label}
                    </p>
                    <p className="text-[11px] sm:text-[11.5px] font-extrabold text-[var(--mn-heading)] mt-0.5 leading-[1.75]">
                      {item.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ----------------------------------------------------------------------- */}
        {/* SECTION 8: المدن والحياة الطلابية                                       */}
        {/* ----------------------------------------------------------------------- */}
        <section className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-3 sm:px-3.5 md:p-6 py-3.5 border-y md:border border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

          <DetailSectionHeader
            icon={Users}
            id="country-cities"
            title={publicT('public_cities_and_student_life')}
            className="mb-3"
          />

          <div className="space-y-3 text-start">
            {/* أبرز المدن الطلابية */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-0.5">
                <MapPin className="w-3.5 h-3.5 text-[#D6A43B] shrink-0" />
                <h3 className="text-[11px] font-extrabold text-[var(--mn-heading)]">
                  أبرز المدن الطلابية
                </h3>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {!country.popularCities.length && (
                  <p className="text-[10.5px] font-semibold text-[var(--mn-text-muted)]">
                    {publicDir === 'rtl'
                      ? 'لم تُحدد مدن لهذه الوجهة بعد.'
                      : 'No cities have been selected for this destination yet.'}
                  </p>
                )}
                {country.popularCities.map((city, idx) => {
                  const isNavy = idx % 2 === 0;
                  return (
                    <div
                      key={city}
                      className="min-w-[108px] rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] px-3 py-2 flex items-center justify-center gap-1.5 shadow-2xs shrink-0"
                    >
                      <MapPin
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isNavy
                            ? 'text-[#142B5F] dark:text-[#D6A43B]'
                            : 'text-[#D6A43B] dark:text-[#F2CD78]'
                        }`}
                      />
                      <span className="text-[10.5px] font-extrabold text-[var(--mn-heading)]">
                        {city}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* مميزات الحياة الطلابية — مربعات عرضية مريحة للقراءة */}
            {country.studentLifeHighlights && country.studentLifeHighlights.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 items-stretch pt-1">
                {country.studentLifeHighlights.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-2.5 flex gap-2 items-start shadow-2xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#D6A43B] shrink-0 mt-0.5" />
                    <p className="text-[10.5px] sm:text-[11px] leading-[1.8] font-bold text-[var(--mn-text)] flex-1">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------------------------- */}
        {/* SECTION 9: مقالات وأدلة مرتبطة (بنفس تصميم مربعات المقالات الرئيسية)     */}
        {/* ----------------------------------------------------------------------- */}
        <RelatedArticlesStrip articles={country.relatedArticles} onOpenArticle={onOpenArticle} />

        {/* ----------------------------------------------------------------------- */}
        {/* SECTION 10: روابط رسمية                                                 */}
        {/* ----------------------------------------------------------------------- */}
        {country.officialLinks && country.officialLinks.length > 0 && (
          <section className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-3 sm:px-3.5 md:p-6 py-3.5 border-y md:border border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

            <DetailSectionHeader
              icon={ExternalLink}
              id="country-official-links"
              title={publicT('public_official_links')}
              className="mb-3"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 items-stretch text-start">
              {country.officialLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] hover:border-[#D6A43B] p-3 flex items-center justify-between gap-2.5 transition-colors shadow-2xs group"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="w-7.5 h-7.5 rounded-xl bg-[#142B5F] border border-[#D6A43B]/65 flex items-center justify-center text-[#F2CD78] shrink-0 mt-0.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-extrabold text-[var(--mn-heading)] leading-snug">
                        {link.label}
                      </p>
                      {link.note && (
                        <p className="text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5 leading-relaxed">
                          {link.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <ArrowUpLeft className="w-4 h-4 text-[var(--mn-accent-text)] shrink-0 group-hover:scale-110 transition-transform" />
                </a>
              ))}
            </div>

            {country.lastReviewedAt && (
              <div className="mt-2.5 pt-2 border-t border-[var(--mn-border)] text-center">
                <p className="text-[10px] font-bold text-[var(--mn-text-muted)]">
                  {publicT('public_last_source_review')} {country.lastReviewedAt.slice(0, 10)}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Bottom CTA Button */}
        {onBrowseScholarships && (
          <div className="px-3 pt-1">
            <button
              type="button"
              onClick={() => onBrowseScholarships(country.id)}
              className="w-full min-h-11 rounded-2xl bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] border border-[#D6A43B]/75 text-white font-extrabold text-[11.5px] flex items-center justify-center gap-2 shadow-md active:scale-[0.99] cursor-pointer mn-inverse"
            >
              <GraduationCap className="w-4 h-4 text-[#F2CD78]" />
              <span>
                {publicT('public_browse_all_scholarships_in')} {country.name}
              </span>
              <ArrowLeft className="w-3.5 h-3.5 text-[#F2CD78]" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
