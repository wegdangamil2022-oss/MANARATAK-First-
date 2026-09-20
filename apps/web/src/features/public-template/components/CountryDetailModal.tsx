import React from 'react';
import {
  ArrowLeft,
  ArrowUpLeft,
  Award,
  Banknote,
  BookOpen,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Flag,
  Globe2,
  GraduationCap,
  Languages,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { CountryDestination, CountryEntityRef } from '../types';
import { RelatedArticlesStrip } from './RelatedArticlesStrip';
import { FavoriteButton } from './FavoriteButton';
import { DetailBackButton, DetailSectionHeader, useDetailSearchTarget } from './DetailUi';

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

const SectionTitle: React.FC<{
  id?: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ id, icon, title, subtitle }) => (
  <DetailSectionHeader id={id} iconNode={icon} title={title} subtitle={subtitle} />
);

const EntityCard: React.FC<{
  item: CountryEntityRef;
  onClick?: () => void;
  icon: React.ReactNode;
}> = ({ item, onClick, icon }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className="min-w-[154px] max-w-[176px] flex-1 rounded-2xl border border-[var(--mn-border)] dark:border-[var(--mn-border)] bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] p-3 text-right shadow-2xs transition-all enabled:hover:border-[var(--mn-border-brand)] enabled:active:scale-[0.99] disabled:cursor-default mn-panel dark:mn-panel "
  >
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-lg bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border border-[var(--mn-border-brand)]/20 flex items-center justify-center text-[var(--mn-accent-text)] shrink-0 mn-panel ">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-5 line-clamp-2">{item.name}</p>
        {item.nameEn && <p className="text-[9.5px] text-[var(--mn-text-muted)] font-bold truncate mt-0.5" dir="ltr">{item.nameEn}</p>}
      </div>
    </div>
    {item.meta && <p className="mt-2 text-[10px] leading-4 font-semibold text-[var(--mn-text-muted)] line-clamp-2">{item.meta}</p>}
  </button>
);

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
  useDetailSearchTarget(searchAnchor, searchTerm);
  const facts = [
    { label: 'العاصمة', value: country.capitalCity || country.popularCities[0] || 'غير متوفر', icon: <MapPin className="w-3.5 h-3.5" /> },
    { label: 'العملة', value: country.currencyCode || 'غير متوفر', icon: <Banknote className="w-3.5 h-3.5" /> },
    { label: 'رمز الدولة', value: [country.iso2Code, country.iso3Code].filter(Boolean).join(' / ') || 'غير متوفر', icon: <Flag className="w-3.5 h-3.5" /> },
    { label: 'الاتصال', value: country.callingCode || 'غير متوفر', icon: <Phone className="w-3.5 h-3.5" /> },
    { label: 'اللغة الرسمية', value: country.officialLanguages?.join('، ') || country.languageOfStudy[0] || 'غير متوفر', icon: <Languages className="w-3.5 h-3.5" /> },
    { label: 'المنطقة', value: country.subregion || country.continent, icon: <Globe2 className="w-3.5 h-3.5" /> },
    { label: 'التوقيت', value: country.timezones?.join('، ') || 'غير متوفر', icon: <Globe2 className="w-3.5 h-3.5" /> },
    { label: 'لغات الدراسة', value: country.languageOfStudy.join('، ') || 'غير متوفر', icon: <Languages className="w-3.5 h-3.5" /> },
  ];

  const costItems = country.costHighlights?.length
    ? country.costHighlights
    : [
        { label: 'متوسط المعيشة', value: country.averageLivingCostUsd },
        { label: 'تصنيف التكلفة', value: country.livingCost },
      ];

  const extendedUniversities = country.featuredUniversities && country.featuredUniversities.length > 0
    ? country.featuredUniversities
    : [
        { id: 'dummy-u-1', name: `جامعة ${country.name} الوطنية`, nameEn: `National University of ${country.nameEn}`, meta: `${country.capitalCity || 'العاصمة'} • رائدة في البحث العلمي` },
        { id: 'dummy-u-2', name: `جامعة التكنولوجيا في ${country.name}`, nameEn: `${country.nameEn} University of Technology`, meta: `${country.capitalCity || 'العاصمة'} • هندسة وعلوم حاسب` },
        { id: 'dummy-u-3', name: `جامعة العلوم والطب`, nameEn: 'University of Science & Medicine', meta: `${country.capitalCity || 'العاصمة'} • علوم صحية وتطبيقية` },
        { id: 'dummy-u-4', name: `جامعة الاقتصاد والإدارة`, nameEn: 'University of Economics & Business', meta: `${country.capitalCity || 'العاصمة'} • أعمال واقتصاد دولي` },
      ];

  const extendedScholarships = [
    ...(country.featuredScholarships || []),
    { id: 'dummy-s-1', name: 'منحة طريق الحرير (نموذج)', nameEn: 'Silk Road Scholarship', meta: 'ممولة بالكامل' },
    { id: 'dummy-s-2', name: 'منحة المقاطعات (نموذج)', nameEn: 'Provincial Scholarship', meta: 'تمويل جزئي' },
    { id: 'dummy-s-3', name: 'منحة التبادل الثقافي (نموذج)', nameEn: 'Cultural Exchange', meta: 'سنة تحضيرية' }
  ];

  return (
    <div className="w-full bg-[var(--mn-page)] overflow-y-auto animate-fade-in font-['Cairo',sans-serif] pb-12 mn-panel " dir="rtl">
      {/* 1. TOP HERO CONTAINER (Compact horizontal layout with flag + title + tags) */}
      <div className="relative w-full overflow-hidden shrink-0">
        <div className="absolute top-2 left-2 z-30 scale-80 origin-top-left flex items-center gap-2">
          {onToggleFavorite && (
            <FavoriteButton
              active={isFavorite}
              onToggle={(event) => {
                event.stopPropagation();
                onToggleFavorite(country.id);
              }}
              className="bg-black/10 hover:bg-black/20 text-white border border-white/20 shadow-sm"
            />
          )}
          <DetailBackButton onBack={onClose} mode="close" className="text-white hover:bg-white/10" />
        </div>
        
        {/* SVG background with matching vibrant 3-stop emerald gradient, subtle gold waves */}
        <div className="relative w-full h-[140px] sm:h-[145px]">
          <svg
            viewBox="0 0 500 140"
            preserveAspectRatio="none"
            className="w-full h-full absolute inset-0 block"
          >
            <defs>
              <linearGradient id="heroGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--mn-primary)" />
                <stop offset="50%" stopColor="var(--mn-primary)" />
                <stop offset="100%" stopColor="var(--mn-primary)" />
              </linearGradient>
            </defs>

            {/* Main base background */}
            <path d="M 0,0 L 500,0 L 500,115 Q 250,138 0,115 Z" fill="url(#heroGreenGrad)" />

            {/* Decorative Gold Waves (stays high in the background, nothing dipping low) */}
            <g opacity="0.25">
              <path
                d="M -50,30 Q 120,-10 260,35 T 550,20"
                stroke="var(--mn-accent)"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M -30,60 Q 150,20 320,55 T 560,35"
                stroke="var(--mn-accent)"
                strokeWidth="1"
                fill="none"
              />

              {/* Gold Sparkle Dots */}
              <circle cx="35" cy="25" r="1.5" fill="var(--mn-accent)" />
              <circle cx="50" cy="18" r="1" fill="var(--mn-accent)" />
              <circle cx="42" cy="38" r="1.2" fill="var(--mn-accent)" />
              <circle cx="445" cy="22" r="1.5" fill="var(--mn-accent)" />
              <circle cx="460" cy="35" r="1" fill="var(--mn-accent)" />
              <circle cx="430" cy="42" r="1.2" fill="var(--mn-accent)" />
            </g>

            {/* The gold accent border following the bottom curve */}
            <path
              d="M 0,115 Q 250,138 500,115"
              fill="none"
              stroke="var(--mn-accent)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>

          {/* Hero Content: Horizontal Row (Flag Badge Right -> Arrow -> Title Left) */}
          <div
            className="absolute inset-0 flex items-start justify-between px-4 sm:px-6 pt-5 pb-6 z-10"
            dir="rtl"
          >
            {/* Right Side: Flag Badge + Arrow */}
            <div className="flex items-center gap-2.5 shrink-0 mt-1">
              {/* Circular Frame with Flag inside */}
              <div className="w-12 h-12 rounded-full border-2 border-[var(--mn-accent)] flex items-center justify-center text-3xl shadow-[0_0_12px_rgba(214,164,59,0.5)] bg-[var(--mn-surface)] shrink-0 mn-panel ">
                {country.flagEmoji}
              </div>

              {/* Simple subtle arrow pointing from the badge to the title */}
              <ArrowLeft className="w-4 h-4 text-[var(--mn-accent-text)] shrink-0 opacity-90 drop-shadow-[0_0_4px_rgba(214,164,59,0.4)]" />
            </div>

            {/* Left Side (in RTL): Title, English Subtitle & Tags */}
            <div className="flex flex-col text-right min-w-0 flex-1 pr-1.5">
              <div className="flex items-center gap-2">
                <h1 className="text-[17px] sm:text-[18px] font-bold text-white leading-tight truncate drop-shadow-sm">
                  {country.name}
                </h1>
                <div className="flex items-center gap-1 text-[8px] sm:text-[8.5px] font-bold text-[var(--mn-accent-text)] bg-black/20 border border-white/10 rounded-full px-1.5 py-0.5 shadow-sm">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">وجهة دراسية</span>
                  <span className="sm:hidden">وجهة</span>
                </div>
              </div>
              <p className="text-[11.5px] sm:text-[12px] font-bold text-white/90 font-['Cairo',sans-serif] mt-0.5 tracking-wider truncate">
                {country.nameEn}
              </p>
              
              {/* Country Data Tags */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="px-1.5 py-0.5 rounded border border-white/20 bg-white/10 text-[9px] sm:text-[9.5px] font-bold text-white shadow-sm backdrop-blur-sm">{country.continent}</span>
                <span className="px-1.5 py-0.5 rounded border border-white/20 bg-white/10 text-[9px] sm:text-[9.5px] font-bold text-white shadow-sm backdrop-blur-sm">{country.universitiesCount == null ? 'غير متوفر' : `${country.universitiesCount} جامعة`}</span>
                <span className="px-1.5 py-0.5 rounded border border-white/20 bg-white/10 text-[9px] sm:text-[9.5px] font-bold text-white shadow-sm backdrop-blur-sm">{country.scholarshipsCount == null ? 'غير متوفر' : `${country.scholarshipsCount} منحة`}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto mn-inline-gutter py-3 pb-24 space-y-3">
        {/* 1. Canonical reference facts — dense 2-column tiles */}
        <section className="grid grid-cols-2 gap-2">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-xl border border-[var(--mn-border)] dark:border-[var(--mn-border)] bg-[var(--mn-surface)] dark:bg-[var(--mn-surface-elevated)] px-2.5 py-2.5 shadow-2xs min-h-[58px] mn-panel dark:mn-panel ">
              <div className="flex items-center gap-1.5 text-[var(--mn-accent-text)] mb-1">
                {fact.icon}
                <span className="text-[9.5px] font-bold text-[var(--mn-text-muted)]">{fact.label}</span>
              </div>
              <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-4 line-clamp-2">{fact.value}</p>
            </div>
          ))}
        </section>

        {/* 2. Overview */}
        <section className="relative overflow-hidden rounded-2xl border border-[var(--mn-border-brand)]/25 bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] px-3 py-3 shadow-2xs mn-panel dark:mn-panel ">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
          <SectionTitle icon={<Globe2 className="w-4 h-4" />} id="country-about" title={`الدراسة في ${country.name}`} subtitle="نظرة سريعة تساعد الطالب على تقييم الوجهة" />
          <div className="rounded-xl border border-[var(--mn-border)] dark:border-[var(--mn-border)] bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] p-3 mn-panel dark:mn-panel ">
            <p className="text-[11.5px] sm:text-xs leading-[1.9] font-semibold text-[var(--mn-text)] dark:text-[var(--mn-text)]">{country.description}</p>
            {country.studySystemSummary && (
              <p className="mt-2 pt-2 border-t border-[var(--mn-border)] dark:border-[var(--mn-border)] text-[11px] leading-[1.8] font-semibold text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)]">
                {country.studySystemSummary}
              </p>
            )}
          </div>
        </section>

        {/* 3. Universities — 2-row horizontal scroll cards matching Scholarship Details */}
        {extendedUniversities.length > 0 && (
          <section className="relative overflow-hidden rounded-2xl border border-[var(--mn-border)] dark:border-[var(--mn-border)] bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] px-3 py-3 shadow-2xs mn-panel dark:mn-panel ">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
            <div className="relative mb-2">
              <SectionTitle icon={<Building2 className="w-4 h-4" />} id="country-universities" title="جامعات بارزة" subtitle="أهم الجامعات للطلاب الدوليين" />
              <button
                type="button"
                onClick={() => {
                  if (extendedUniversities.length > 0 && onOpenUniversity) {
                    onOpenUniversity(extendedUniversities[0].id);
                  }
                }}
                data-mn-design="45c440a9fe"
                className="absolute left-0 top-0 h-6.5 px-2.5 sm:px-3 text-[10.5px] font-bold text-[var(--mn-link)] border border-[var(--mn-border)] bg-[var(--mn-surface-muted)] hover:bg-[var(--mn-surface-elevated)] transition-colors rounded-full flex items-center gap-1.5 justify-center whitespace-nowrap cursor-pointer hover:shadow-2xs active:scale-95"
              >
                <span>عرض الكل</span>
                <ArrowLeft className="w-3.5 h-3.5 text-[var(--mn-link)] shrink-0" />
              </button>
            </div>
            <div className="grid grid-rows-2 grid-flow-col auto-cols-[80%] sm:auto-cols-[215px] gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none snap-x snap-mandatory" data-mn-design="9856d4f1a6">
              {extendedUniversities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenUniversity?.(item.id)}
                  className="w-full snap-start flex items-center gap-2 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[var(--mn-accent)]/45 p-2 text-right transition-all group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--mn-primary)] flex items-center justify-center shrink-0 border border-[var(--mn-accent)]/55 shadow-2xs mn-inverse">
                    <Building2 className="w-3.5 h-3.5 text-[var(--mn-accent-text)]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-tight truncate">
                      {item.name}
                    </div>
                    {item.nameEn && (
                      <div className="text-[8.5px] font-semibold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] truncate mt-0.5" dir="ltr">
                        {item.nameEn}
                      </div>
                    )}
                    {item.meta && (
                      <div className="flex items-center gap-1 mt-0.5 text-[8.5px] font-bold text-[var(--mn-text-muted)]">
                        <MapPin className="w-2.5 h-2.5 text-[var(--mn-accent-text)] shrink-0" />
                        <span className="truncate">{item.meta}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-7 h-7 rounded-full bg-[var(--mn-surface)] border border-[var(--mn-border)] flex items-center justify-center shrink-0 group-hover:border-[var(--mn-accent)]/60 group-hover:bg-[var(--mn-primary)]/5 transition-colors mn-panel">
                    <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-heading)] group-hover:text-[var(--mn-accent-text)] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 4. Scholarships */}
        {extendedScholarships.length > 0 && (
          <section className="relative overflow-hidden rounded-2xl border border-[var(--mn-border)] dark:border-[var(--mn-border)] bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] px-3 py-3 shadow-2xs mn-panel dark:mn-panel ">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
            <div className="relative mb-2">
              <SectionTitle icon={<GraduationCap className="w-4 h-4" />} id="country-scholarships" title="منح دراسية" subtitle="منح مرتبطة بهذه الدولة" />
              {onBrowseScholarships && (
                <button
                  type="button"
                  onClick={() => onBrowseScholarships(country.id)}
                  data-mn-design="45c440a9fe"
                  className="absolute left-0 top-0 h-6.5 px-2.5 sm:px-3 text-[10.5px] font-bold text-[var(--mn-link)] border border-[var(--mn-border)] bg-[var(--mn-surface-muted)] hover:bg-[var(--mn-surface-elevated)] transition-colors rounded-full flex items-center gap-1.5 justify-center whitespace-nowrap cursor-pointer hover:shadow-2xs active:scale-95"
                >
                  <span>عرض الكل</span>
                  <ArrowLeft className="w-3.5 h-3.5 text-[var(--mn-link)] shrink-0" />
                </button>
              )}
            </div>
            <div className="grid grid-rows-2 grid-flow-col auto-cols-[85%] sm:auto-cols-[260px] gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none snap-x snap-mandatory" data-mn-design="9856d4f1a6">
              {extendedScholarships.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenScholarship?.(item.id)}
                  className="w-full snap-start flex items-center gap-2 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[var(--mn-accent)]/45 p-2 text-right transition-all group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--mn-primary)] flex items-center justify-center shrink-0 border border-[var(--mn-accent)]/55 shadow-2xs mn-inverse">
                    <GraduationCap className="w-3.5 h-3.5 text-[var(--mn-accent-text)]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[10.5px] font-bold leading-tight truncate text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)]">
                      {item.name}
                    </div>
                    {item.nameEn && (
                      <div className="text-[8.5px] font-semibold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] truncate mt-0.5" dir="ltr">
                        {item.nameEn}
                      </div>
                    )}
                    {item.meta && (
                      <div className="flex items-center gap-1 mt-0.5 text-[8.5px] font-bold text-[var(--mn-text-muted)]">
                        <Award className="w-2.5 h-2.5 text-[var(--mn-accent-text)] shrink-0" />
                        <span className="truncate">{item.meta}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-7 h-7 rounded-full bg-[var(--mn-surface)] border border-[var(--mn-border)] flex items-center justify-center shrink-0 group-hover:border-[var(--mn-accent)]/60 group-hover:bg-[var(--mn-primary)]/5 transition-colors mn-panel">
                    <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-heading)] group-hover:text-[var(--mn-accent-text)] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 5. Majors */}
        {country.featuredMajors && country.featuredMajors.length > 0 && (
          <section className="relative overflow-hidden rounded-2xl border border-[var(--mn-border)] dark:border-[var(--mn-border)] bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] px-3 py-3 shadow-2xs mn-panel dark:mn-panel ">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
            <div className="relative mb-2">
              <SectionTitle icon={<BookOpen className="w-4 h-4" />} id="country-study" title="تخصصات بارزة للدراسة" subtitle="علاقة مشتقة من برامج الجامعات في الدولة" />
            </div>
            <div className="grid grid-rows-2 grid-flow-col auto-cols-[85%] sm:auto-cols-[260px] gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none snap-x snap-mandatory" data-mn-design="9856d4f1a6">
              {country.featuredMajors.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenMajor?.(item.id)}
                  className="w-full snap-start flex items-center gap-2 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[var(--mn-accent)]/45 p-2 text-right transition-all group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--mn-primary)] flex items-center justify-center shrink-0 border border-[var(--mn-accent)]/55 shadow-2xs mn-inverse">
                    <BookOpen className="w-3.5 h-3.5 text-[var(--mn-accent-text)]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-tight truncate">
                      {item.name}
                    </div>
                    {item.nameEn && (
                      <div className="text-[8.5px] font-semibold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] truncate mt-0.5" dir="ltr">
                        {item.nameEn}
                      </div>
                    )}
                    {item.meta && (
                      <div className="flex items-center gap-1 mt-0.5 text-[8.5px] font-bold text-[var(--mn-text-muted)]">
                        <BookOpen className="w-2.5 h-2.5 text-[var(--mn-accent-text)] shrink-0" />
                        <span className="truncate">{item.meta}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-7 h-7 rounded-full bg-[var(--mn-surface)] border border-[var(--mn-border)] flex items-center justify-center shrink-0 group-hover:border-[var(--mn-accent)]/60 group-hover:bg-[var(--mn-primary)]/5 transition-colors mn-panel">
                    <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-heading)] group-hover:text-[var(--mn-accent-text)] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 6. Admission + tests in compact horizontal blocks */}
        <section className="relative overflow-hidden rounded-2xl border border-[var(--mn-border)] dark:border-[var(--mn-border)] bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] px-3 py-3 shadow-2xs mn-panel dark:mn-panel ">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
          <SectionTitle icon={<FileCheck2 className="w-4 h-4" />} id="country-exams" title="القبول والاختبارات" subtitle="المتطلبات النهائية تختلف حسب الجامعة والبرنامج" />
          {country.admissionHighlights && country.admissionHighlights.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              {country.admissionHighlights.map((item, index) => (
                <div key={index} className="rounded-xl border border-[var(--mn-border)] dark:border-[var(--mn-border)] bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] px-2.5 py-2 flex items-start gap-1.5 min-h-[66px] mn-panel dark:mn-panel ">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--mn-accent-text)] mt-0.5 shrink-0" />
                  <p className="text-[10.5px] sm:text-[11px] font-semibold leading-[1.7] text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)]">{item}</p>
                </div>
              ))}
            </div>
          )}
          {country.requiredExams && country.requiredExams.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {country.requiredExams.map((item) => (
                <EntityCard key={item.id} item={item} icon={<Languages className="w-3.5 h-3.5" />} onClick={onOpenExam ? () => onOpenExam(item.id) : undefined} />
              ))}
            </div>
          )}
        </section>

        {/* 7. Visa */}
        <section className="relative overflow-hidden rounded-2xl border border-[var(--mn-border)] dark:border-[var(--mn-border)] bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] px-3 py-3 shadow-2xs mn-panel dark:mn-panel ">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
          <SectionTitle icon={<ShieldCheck className="w-4 h-4" />} id="country-visa" title="التأشيرة وشروط الدراسة" subtitle={country.visaEase} />
          <div className="grid grid-cols-2 gap-2">
            {(country.visaHighlights?.length ? country.visaHighlights : [country.visaEase]).map((item, index) => (
              <div key={index} className="rounded-xl bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] dark:border-[var(--mn-border)] px-2.5 py-2 min-h-[58px] flex items-start gap-1.5 mn-panel dark:mn-panel ">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--mn-accent-text)] mt-0.5 shrink-0" />
                <p className="text-[10.5px] sm:text-[11px] font-semibold leading-[1.7] text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 8. Cost */}
        <section className="relative overflow-hidden rounded-2xl border border-[var(--mn-border)] dark:border-[var(--mn-border)] bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] px-3 py-3 shadow-2xs mn-panel dark:mn-panel ">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
          <SectionTitle icon={<WalletCards className="w-4 h-4" />} id="country-costs" title="تكاليف المعيشة والدراسة" />
          <div className="grid grid-cols-2 gap-2">
            {costItems.map((item) => (
              <div key={item.label} className="rounded-xl bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] dark:border-[var(--mn-border)] px-2.5 py-2.5 min-h-[58px] mn-panel dark:mn-panel ">
                <p className="text-[9.5px] font-bold text-[var(--mn-text-muted)]">{item.label}</p>
                <p className="text-[11px] font-bold text-[var(--mn-heading)] mt-1 leading-4">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 9. Student cities and life */}
        <section className="relative overflow-hidden rounded-2xl border border-[var(--mn-border)] dark:border-[var(--mn-border)] bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] px-3 py-3 shadow-2xs mn-panel dark:mn-panel ">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
          <SectionTitle icon={<Users className="w-4 h-4" />} id="country-cities" title="المدن والحياة الطلابية" />
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none mb-2.5">
            {country.popularCities.map((city) => (
              <div key={city} className="min-w-[104px] rounded-xl bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] dark:border-[var(--mn-border)] px-2.5 py-2 text-center mn-panel dark:mn-panel ">
                <MapPin className="w-3.5 h-3.5 text-[var(--mn-accent-text)] mx-auto mb-1" />
                <p className="text-[10.5px] font-bold text-[var(--mn-heading)]">{city}</p>
              </div>
            ))}
          </div>
          {country.studentLifeHighlights && (
            <div className="grid grid-cols-2 gap-2">
              {country.studentLifeHighlights.map((item, index) => (
                <div key={index} className="rounded-xl bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] dark:border-[var(--mn-border)] p-2.5 flex gap-1.5 items-start mn-panel dark:mn-panel ">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--mn-accent-text)] shrink-0 mt-0.5" />
                  <p className="text-[10.5px] leading-[1.7] font-semibold text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)]">{item}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <RelatedArticlesStrip articles={country.relatedArticles} onOpenArticle={onOpenArticle} />

        {/* 10. Official links; source/audit and SEO stay admin-only */}
        {country.officialLinks && country.officialLinks.length > 0 && (
          <section className="relative overflow-hidden rounded-2xl border border-[var(--mn-border)] dark:border-[var(--mn-border)] bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] px-3 py-3 shadow-2xs mn-panel dark:mn-panel ">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
            <SectionTitle icon={<ExternalLink className="w-4 h-4" />} id="country-official-links" title="روابط رسمية" subtitle="مصادر حكومية أو رسمية مرتبطة بالدراسة" />
            <div className="grid grid-cols-2 gap-2">
              {country.officialLinks.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[var(--mn-border-brand)]/30 bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] px-2.5 py-2.5 min-h-[62px] flex items-start gap-2 hover:border-[var(--mn-accent)] transition-colors mn-panel dark:mn-panel ">
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--mn-accent-text)] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-4">{link.label}</p>
                    {link.note && <p className="text-[9.5px] font-semibold text-[var(--mn-text-muted)] mt-0.5 leading-4">{link.note}</p>}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {onBrowseScholarships && (
          <button
            type="button"
            onClick={() => onBrowseScholarships(country.id)}
            className="w-full min-h-11 rounded-xl bg-gradient-to-r from-[var(--mn-primary)] via-[var(--mn-hero-secondary)] to-[var(--mn-primary)] text-white font-bold text-[11px] flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] mn-inverse "
          >
            <GraduationCap className="w-4 h-4 text-[var(--mn-accent-text)]" />
            <span>استعرض جميع منح {country.name}</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </main>
    </div>
  );
};
