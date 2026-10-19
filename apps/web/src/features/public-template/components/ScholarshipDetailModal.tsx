import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState } from 'react';
import { PublishedScholarshipDetails } from './PublishedScholarshipDetails';
import { Scholarship, Service } from '../types';
import { RelatedArticlesStrip } from './RelatedArticlesStrip';
import { DetailBackButton, DetailSectionHeader, useDetailSearchTarget } from './DetailUi';
import {
  Building2,
  Calendar,
  Languages,
  DollarSign,
  Check,
  Globe,
  Bookmark,
  ArrowLeft,
  ArrowUpLeft,
  Coins,
  GraduationCap,
  Home,
  ShieldCheck,
  Plane,
  Wallet,
  Sparkles,
  BookOpen,
  BookOpenText,
  Briefcase,
  ChevronLeft,
  FileText,
  User,
  PenTool,
  Users,
  Activity,
  Shield,
  FileCheck,
  Info,
  Link,
  ExternalLink,
  MousePointerClick,
  Share2,
  MapPin,
  Copy,
} from 'lucide-react';

interface ScholarshipDetailModalProps {
  scholarship: Scholarship | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  isFavorite: boolean;
  onAddToTracker?: (scholarship: Scholarship) => void;
  onOpenAiLetter?: (scholarshipTitle: string) => void;
  onOpenUniversity?: (universityId: string) => void;
  onOpenMajor?: (majorId: string) => void;
  onOpenCountry?: (countryId: string) => void;
  onOpenExam?: (examId: string) => void;
  onOpenScholarship?: (scholarshipId: string) => void;
  onOpenArticle?: (articleId: string) => void;
  onOpenService?: (service: Service) => void;
  contextualServices?: Service[];
  searchAnchor?: string;
  searchTerm?: string;
}

export const ScholarshipDetailModal: React.FC<ScholarshipDetailModalProps> = ({
  scholarship,
  onClose,
  onToggleFavorite,
  isFavorite,
  onOpenUniversity,
  onOpenMajor,
  onOpenCountry,
  onOpenExam,
  onOpenScholarship,
  onOpenArticle,
  onOpenService,
  contextualServices = [],
  searchAnchor,
  searchTerm,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  const [saveToast, setSaveToast] = useState(false);
  const [activeMajorTab, setActiveMajorTab] = useState<
    'bachelor' | 'master' | 'phd' | 'fellowship'
  >('bachelor');

  useDetailSearchTarget(searchAnchor, searchTerm);

  if (!scholarship) return null;

  const handleSaveClick = () => {
    onToggleFavorite(scholarship.id);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  return (
    <div className="w-full max-w-md mx-auto pt-0 pb-12 text-start font-['Cairo',sans-serif] animate-in fade-in duration-200 bg-[var(--ab-surface-muted)] min-h-screen ab-panel ">
      {/* 1. TOP HERO CONTAINER (Compact horizontal layout with glowing gold graduation emblem on the right + arrow + title) */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute top-2 left-2 z-30 scale-80 origin-top-left">
          <DetailBackButton onBack={onClose} mode="close" />
        </div>
        {/* SVG background with matching vibrant 3-stop emerald gradient, subtle gold waves */}
        <div className="relative w-full h-[115px] sm:h-[120px]">
          <svg
            viewBox="0 0 500 115"
            preserveAspectRatio="none"
            className="w-full h-full absolute inset-0 block"
          >
            <defs>
              <linearGradient id="heroGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--ab-primary)" />
                <stop offset="50%" stopColor="var(--ab-primary)" />
                <stop offset="100%" stopColor="var(--ab-primary)" />
              </linearGradient>
            </defs>

            {/* Main base background */}
            <path d="M 0,0 L 500,0 L 500,90 Q 250,112 0,90 Z" fill="url(#heroGreenGrad)" />

            {/* Decorative Gold Waves (stays high in the background, nothing dipping low) */}
            <g opacity="0.25">
              <path
                d="M -50,30 Q 120,-10 260,35 T 550,20"
                stroke="var(--ab-accent)"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M -30,60 Q 150,20 320,55 T 560,35"
                stroke="var(--ab-accent)"
                strokeWidth="1"
                fill="none"
              />

              {/* Gold Sparkle Dots */}
              <circle cx="35" cy="25" r="1.5" fill="var(--ab-accent)" />
              <circle cx="50" cy="18" r="1" fill="var(--ab-accent)" />
              <circle cx="42" cy="38" r="1.2" fill="var(--ab-accent)" />
              <circle cx="445" cy="22" r="1.5" fill="var(--ab-accent)" />
              <circle cx="460" cy="35" r="1" fill="var(--ab-accent)" />
              <circle cx="430" cy="42" r="1.2" fill="var(--ab-accent)" />
            </g>

            {/* The gold accent border following the bottom curve */}
            <path
              d="M 0,90 Q 250,112 500,90"
              fill="none"
              stroke="var(--ab-accent)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>

          {/* Hero Content: Horizontal Row (Glowing Gold Graduation Badge Right -> Arrow -> Title Left) */}
          <div
            className="absolute inset-0 flex items-center justify-between px-4 sm:px-6 pt-1 pb-4 z-10"
            dir={publicDir}
          >
            {/* Right Side: Glowing Gold Graduation Badge + Arrow */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Circular Frame with Glowing Gold Graduation Cap inside */}
              <div className="w-11 h-11 rounded-full border-2 border-[var(--ab-accent)] flex items-center justify-center p-1.5 shadow-[0_0_12px_rgba(214,164,59,0.5)] bg-gradient-to-br from-[var(--ab-primary)] to-[var(--ab-primary)] shrink-0 ab-inverse ">
                <svg viewBox="0 0 40 40" className="w-full h-full">
                  <defs>
                    <linearGradient id="goldCapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--ab-accent-soft)" />
                      <stop offset="45%" stopColor="var(--ab-accent-soft)" />
                      <stop offset="100%" stopColor="var(--ab-accent)" />
                    </linearGradient>
                    <filter id="goldShine" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="1" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Glowing Gold Diamond Top */}
                  <polygon
                    points="20,6 37,14 20,22 3,14"
                    fill="url(#goldCapGrad)"
                    stroke="#FFF2B2"
                    strokeWidth="0.8"
                    filter="url(#goldShine)"
                  />
                  {/* Cap Underneath Base */}
                  <path
                    d="M9,17.5 v6 c0,3.5 4.8,6.5 11,6.5 s11,-3 11,-6.5 v-6"
                    fill="url(#goldCapGrad)"
                    stroke="#FFF2B2"
                    strokeWidth="0.6"
                  />
                  {/* Tassel line & drop */}
                  <path
                    d="M20,14 L34,16.5 v8.5"
                    stroke="#FFEAA7"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <circle cx="34" cy="26" r="1.8" fill="#FFEAA7" filter="url(#goldShine)" />
                </svg>
              </div>

              {/* Simple subtle arrow pointing from the graduation cap to the title */}
              <ArrowLeft className="w-4 h-4 text-[var(--ab-accent-text)] shrink-0 opacity-90 drop-shadow-[0_0_4px_rgba(214,164,59,0.4)]" />
            </div>

            {/* Left Side (in RTL): Scholarship Title & English Subtitle */}
            <div className="flex flex-col text-start min-w-0 flex-1 pr-1.5">
              <h1 className="text-[15px] sm:text-[15px] font-bold text-white leading-tight truncate drop-shadow-sm" data-ab-design="827f35e03a">
                {scholarship.title}
              </h1>
              <p className="text-[11px] sm:text-[11px] font-bold text-white font-['Cairo',sans-serif] mt-0.5 tracking-wider truncate">
                {scholarship.titleEn}
              </p>
            </div>
          </div>
        </div>
      </div>

      {scholarship.publishedData ? <PublishedScholarshipDetails scholarship={scholarship} onOpenUniversity={onOpenUniversity} onOpenExam={onOpenExam} /> : (
      <div className="px-1.5 sm:px-2 space-y-2.5 z-20 relative -mt-2.5 sm:-mt-3">
        {/* 2. DONOR AUTHORITY CARD (Clean Distinctive Accent Line on Top Border) */}
        <div
          className="relative w-full bg-[var(--ab-surface)] rounded-2xl py-3.5 px-3.5 border border-[var(--ab-border)] shadow-md shadow-[var(--ab-shadow-ink)]/60 flex items-center gap-3 overflow-hidden ab-panel "
          dir={publicDir}
        >
          {/* Distinctive Top Accent Line (clean inside the top border) */}
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

          {/* Emerald Green Circle with Gold Border & Building Icon */}
          <div className="w-9 h-9 rounded-full bg-[var(--ab-primary)] flex items-center justify-center shrink-0 shadow-sm border-1.5 border-[var(--ab-accent)] ring-2 ring-[var(--ab-focus)]/20 ab-inverse ">
            <Building2 className="w-4 h-4 text-[var(--ab-on-dark-muted)]" />
          </div>

          {/* Vertical Gold Divider Line */}
          <div className="w-[1px] h-7 bg-[var(--ab-accent)]/40 shrink-0" />

          {/* Donor Text */}
          <div className="space-y-0.5 min-w-0 flex-1 text-start">
            <h2 className="text-[11px] sm:text-xs font-bold text-[var(--ab-heading)] leading-tight">
              {scholarship.id === 'csc-china'
                ? publicT('public_china_scholarship_council_csc_chinese_ministry_of_education')
                : scholarship.university || publicT('public_government_funding_organization')}
            </h2>
            <p className="text-[9px] font-medium text-[var(--ab-text-muted)] font-['Cairo',sans-serif] truncate">
              {scholarship.id === 'csc-china'
                ? 'China Scholarship Council (CSC) - Ministry of Education of PRC'
                : scholarship.universityEn || 'Official Government Donor'}
            </p>
          </div>
        </div>

        {/* 3. 2-COLUMN X 3-ROW GRID (Titles in prominent Green + Values in Gold) */}
        <div className="space-y-2 pt-0.5" dir={publicDir}>
          {/* ROW 1: دولة الدراسة | الدرجات العلمية */}
          <div className="flex items-center gap-2">
            {/* Right Card: دولة الدراسة */}
            <button
              type="button"
              onClick={() => scholarship.countryReferenceId && onOpenCountry?.(scholarship.countryReferenceId)}
              className="flex-1 bg-[var(--ab-surface)] rounded-2xl p-2.5 border border-[var(--ab-border)] shadow-sm flex items-center gap-2 min-w-0 hover:border-[#142B5F] hover:shadow-md active:scale-[0.99] transition-all text-start group cursor-pointer ab-panel "
              title={publicT('public_explore_country_name', { v0: scholarship.country })}
            >
              <div className="w-8 h-8 rounded-full bg-[var(--ab-primary)]/8 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-[var(--ab-accent-text)]" />
              </div>
              <div className="flex flex-col min-w-0 text-start flex-1">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] leading-tight truncate">{publicT('public_study_country')}</span>
                <span className="text-[9.5px] font-bold text-[var(--ab-text-muted)] leading-tight truncate mt-0.5">
                  {scholarship.country}
                </span>
              </div>
              <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--ab-heading)] opacity-60 group-hover:opacity-100 shrink-0 transition-all" />
            </button>

            {/* Gold Diamond Connector */}
            <div className="w-1.5 h-1.5 rotate-45 bg-[var(--ab-surface-muted)] shrink-0 ab-panel " />

            {/* Left Card: الدرجات العلمية */}
            <div className="flex-1 bg-[var(--ab-surface)] rounded-2xl p-2.5 border border-[var(--ab-border)] shadow-sm flex items-center gap-2 min-w-0 ab-panel ">
              <div className="w-8 h-8 rounded-full bg-[var(--ab-primary)]/8 flex items-center justify-center shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-[var(--ab-accent-text)] fill-none stroke-current"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] leading-tight truncate">{publicT('public_degrees')}</span>
                <span className="text-[9px] font-bold text-[var(--ab-text-muted)] font-['Cairo',sans-serif] tracking-tight leading-tight truncate mt-0.5">
                  BSc • MSc • PhD
                </span>
              </div>
            </div>
          </div>

          {/* ROW 2: انتهاء التقديم | نوع التمويل */}
          <div className="flex items-center gap-2">
            {/* Right Card: انتهاء التقديم */}
            <div className="flex-1 bg-[var(--ab-surface)] rounded-2xl p-2.5 border border-[var(--ab-border)] shadow-sm flex items-center gap-2 min-w-0 ab-panel ">
              <div className="w-8 h-8 rounded-full bg-[var(--ab-primary)]/8 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-[var(--ab-accent-text)]" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] leading-tight truncate">{publicT('public_application_deadline')}</span>
                <span className="text-[9.5px] font-bold text-[var(--ab-text-muted)] font-['Cairo',sans-serif] leading-tight truncate mt-0.5">
                  31-03-2027
                </span>
              </div>
            </div>

            {/* Gold Diamond Connector */}
            <div className="w-1.5 h-1.5 rotate-45 bg-[var(--ab-surface-muted)] shrink-0 ab-panel " />

            {/* Left Card: نوع التمويل */}
            <div className="flex-1 bg-[var(--ab-surface)] rounded-2xl p-2.5 border border-[var(--ab-border)] shadow-sm flex items-center gap-2 min-w-0 ab-panel ">
              <div className="w-8 h-8 rounded-full bg-[var(--ab-primary)]/8 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 text-[var(--ab-accent-text)]" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] leading-tight truncate">{publicT('public_funding_type')}</span>
                <span className="text-[9.5px] font-bold text-[var(--ab-text-muted)] leading-tight truncate mt-0.5">{publicT('public_fully_funded')}</span>
              </div>
            </div>
          </div>

          {/* ROW 3: لغة الدراسة | الجهة المانحة */}
          <div className="flex items-center gap-2">
            {/* Right Card: لغة الدراسة */}
            <div className="flex-1 bg-[var(--ab-surface)] rounded-2xl p-2.5 border border-[var(--ab-border)] shadow-sm flex items-center gap-2 min-w-0 ab-panel ">
              <div className="w-8 h-8 rounded-full bg-[var(--ab-primary)]/8 flex items-center justify-center shrink-0">
                <Languages className="w-4 h-4 text-[var(--ab-accent-text)]" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] leading-tight truncate">{publicT('public_study_language')}</span>
                <span className="text-[9.5px] font-bold text-[var(--ab-text-muted)] leading-tight truncate mt-0.5">{publicT('public_english_chinese')}</span>
              </div>
            </div>

            {/* Gold Diamond Connector */}
            <div className="w-1.5 h-1.5 rotate-45 bg-[var(--ab-surface-muted)] shrink-0 ab-panel " />

            {/* Left Card: الجهة المانحة */}
            <div className="flex-1 bg-[var(--ab-surface)] rounded-2xl p-2.5 border border-[var(--ab-border)] shadow-sm flex items-center gap-2 min-w-0 ab-panel ">
              <div className="w-8 h-8 rounded-full bg-[var(--ab-primary)]/8 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-[var(--ab-accent-text)]" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] leading-tight truncate">{publicT('public_funding_organization')}</span>
                <span className="text-[9.5px] font-bold text-[var(--ab-text-muted)] leading-tight truncate mt-0.5">{publicT('public_government')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. ABOUT SCHOLARSHIP SECTION (نبذة عن المنحة) */}
        <div
          className="relative w-full bg-[var(--ab-surface)] rounded-3xl p-3.5 sm:p-4 border border-[var(--ab-border)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ab-panel "
          dir={publicDir}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
          <DetailSectionHeader id="scholarship-about" icon={BookOpen} title={publicT('public_scholarship_overview')} level={3} titleClassName="ab-imported-detail-title" />

          <div className="relative rounded-2xl bg-[var(--ab-page)]/70 border border-[var(--ab-border)] px-3.5 py-3">
            <span className="absolute top-3 right-3 w-1.5 h-1.5 rotate-45 bg-[var(--ab-accent)]/75" />
            <p className="text-[11px] sm:text-[11.5px] font-semibold text-[var(--ab-text)] leading-[1.9] pr-4">
              {scholarship.description}
            </p>
          </div>
        </div>

        {/* 5. FUNDING & BENEFITS SECTION (المميزات والتمويل) */}
        <div
          className="relative w-full bg-[var(--ab-surface)] rounded-3xl p-3.5 sm:p-4 border border-[var(--ab-border)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ab-panel "
          dir={publicDir}
        >
          {/* Distinctive Top Accent Line */}
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

          {/* Section Header: Centered horizontally with icon beside title in one compact row */}
          <DetailSectionHeader id="scholarship-funding" icon={Coins} title={publicT('public_benefits_and_funding')} level={3} />

          <div className="grid grid-cols-1 gap-2">
            {[
              'إعفاء 100% من الرسوم الدراسية',
              'راتب شهري (2500¥ - 3500¥)',
              'سكن جامعي مجاني',
              'تأمين طبي وصحي شامل',
              'سنة تحضيرية للغة مجاناً',
              'إعفاء من رسوم التأشيرة والإقامة',
            ].map((benefit, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--ab-page)] border border-[var(--ab-border)] transition-colors"
              >
                <div className="w-4 h-4 rounded-full bg-[var(--ab-primary)] border border-[var(--ab-accent)] flex items-center justify-center shrink-0 shadow-2xs ab-inverse ">
                  <Check className="w-2.5 h-2.5 text-[var(--ab-accent-text)] stroke-[2.5]" />
                </div>
                <span className="text-[10.5px] font-bold text-[var(--ab-text)] leading-tight truncate">
                  {benefit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. MAJORS SECTION (التخصصات المتاحة) */}
        <div
          className="relative w-full bg-[var(--ab-surface)] rounded-3xl p-3.5 sm:p-4 border border-[var(--ab-border)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ab-panel "
          dir={publicDir}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

          {/* Section Header: Centered horizontally with icon beside title */}
          <DetailSectionHeader id="scholarship-majors" icon={BookOpen} title={publicT('public_available_majors_2')} level={3} />

          {/* Degree Switcher */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveMajorTab('bachelor')}
              className={`px-3 py-1.5 text-[10.5px] font-bold rounded-xl transition-all whitespace-nowrap border ${activeMajorTab === 'bachelor' ? 'bg-[var(--ab-primary)] text-white border-[var(--ab-border-brand)] shadow-sm ab-inverse ' : 'bg-[var(--ab-surface)] text-[var(--ab-text-muted)] border-[var(--ab-border)] hover:bg-[var(--ab-page)] '}`}
              data-ab-design="98e8ac3671"
            >{publicT('public_bachelors')}</button>
            <button
              onClick={() => setActiveMajorTab('master')}
              className={`px-3 py-1.5 text-[10.5px] font-bold rounded-xl transition-all whitespace-nowrap border ${activeMajorTab === 'master' ? 'bg-[var(--ab-primary)] text-white border-[var(--ab-border-brand)] shadow-sm ab-inverse ' : 'bg-[var(--ab-surface)] text-[var(--ab-text-muted)] border-[var(--ab-border)] hover:bg-[var(--ab-page)] '}`}
              data-ab-design="98e8ac3671"
            >{publicT('public_masters')}</button>
            <button
              onClick={() => setActiveMajorTab('phd')}
              className={`px-3 py-1.5 text-[10.5px] font-bold rounded-xl transition-all whitespace-nowrap border ${activeMajorTab === 'phd' ? 'bg-[var(--ab-primary)] text-white border-[var(--ab-border-brand)] shadow-sm ab-inverse ' : 'bg-[var(--ab-surface)] text-[var(--ab-text-muted)] border-[var(--ab-border)] hover:bg-[var(--ab-page)] '}`}
              data-ab-design="98e8ac3671"
            >{publicT('public_doctorate')}</button>
            <button
              onClick={() => setActiveMajorTab('fellowship')}
              className={`px-3 py-1.5 text-[10.5px] font-bold rounded-xl transition-all whitespace-nowrap border ${activeMajorTab === 'fellowship' ? 'bg-[var(--ab-primary)] text-white border-[var(--ab-border-brand)] shadow-sm ab-inverse ' : 'bg-[var(--ab-surface)] text-[var(--ab-text-muted)] border-[var(--ab-border)] hover:bg-[var(--ab-page)] '}`}
              data-ab-design="98e8ac3671"
            >{publicT('public_fellowships')}</button>
          </div>

          {/* Majors List (Horizontal flex-wrap) */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 animate-in fade-in duration-300">
            {activeMajorTab === 'bachelor' &&
              [
                { label: 'الطب والجراحة', majorId: 'mjr-0001' },
                { label: 'هندسة البرمجيات', majorId: 'mjr-demo-software-engineering' },
                { label: 'الذكاء الاصطناعي', majorId: 'mjr-demo-artificial-intelligence' },
                { label: 'إدارة الأعمال' },
                { label: 'العمارة والتصميم' },
                { label: 'العلاقات الدولية' },
              ].map((major) => (
                <button
                  key={major.label}
                  type="button"
                  onClick={() => major.majorId && onOpenMajor?.(major.majorId)}
                  aria-label={major.majorId ? publicT('public_open_major_page', { v0: major.label }) : undefined}
                  data-ab-design="98e8ac3671"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--ab-page)] border border-[#142B5F]/30 dark:border-[var(--ab-border)] border-r-2 border-r-[#142B5F] dark:border-r-[var(--ab-accent)] text-[var(--ab-text)] text-[10.5px] font-bold rounded-lg transition-all group ${
                    major.majorId
                      ? 'hover:bg-[var(--ab-surface)] hover:border-[#142B5F]/50 dark:hover:border-[var(--ab-accent)]/40 hover:shadow-2xs active:scale-95 cursor-pointer'
                      : 'cursor-default'
                  }`}
                >
                  <span>{major.label}</span>
                  {major.majorId && (
                    <ArrowUpLeft className="w-3.5 h-3.5 text-[#142B5F] dark:text-[var(--ab-heading)] opacity-80 group-hover:opacity-100 group-hover:text-[var(--ab-accent-text)] group-hover:scale-110 transition-all duration-200 -mr-0.5" />
                  )}
                </button>
              ))}

            {activeMajorTab === 'master' &&
              [
                'علوم البيانات والذكاء الاصطناعي',
                'الهندسة الطبية الحيوية',
                'إدارة المشاريع الهندسية',
                'الاقتصاد الرقمي',
                'الصحة العامة',
              ].map((major) => (
                <button
                  key={major}
                  type="button"
                  data-ab-design="98e8ac3671"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--ab-page)] border border-[#142B5F]/30 dark:border-[var(--ab-border)] border-r-2 border-r-[#142B5F] dark:border-r-[var(--ab-accent)] text-[var(--ab-text)] text-[10.5px] font-bold rounded-lg hover:bg-[var(--ab-surface)] hover:border-[#142B5F]/50 dark:hover:border-[var(--ab-accent)]/40 hover:shadow-2xs active:scale-95 transition-all cursor-pointer group"
                >
                  <span>{major}</span>
                  <ArrowUpLeft className="w-3.5 h-3.5 text-[#142B5F] dark:text-[var(--ab-heading)] opacity-80 group-hover:opacity-100 group-hover:text-[var(--ab-accent-text)] group-hover:scale-110 transition-all duration-200 -mr-0.5" />
                </button>
              ))}

            {activeMajorTab === 'phd' &&
              [
                'أبحاث النانو تكنولوجي',
                'علوم الحاسوب المتقدمة',
                'الهندسة الوراثية',
                'السياسات العامة',
              ].map((major) => (
                <button
                  key={major}
                  type="button"
                  data-ab-design="98e8ac3671"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--ab-page)] border border-[#142B5F]/30 dark:border-[var(--ab-border)] border-r-2 border-r-[#142B5F] dark:border-r-[var(--ab-accent)] text-[var(--ab-text)] text-[10.5px] font-bold rounded-lg hover:bg-[var(--ab-surface)] hover:border-[#142B5F]/50 dark:hover:border-[var(--ab-accent)]/40 hover:shadow-2xs active:scale-95 transition-all cursor-pointer group"
                >
                  <span>{major}</span>
                  <ArrowUpLeft className="w-3.5 h-3.5 text-[#142B5F] dark:text-[var(--ab-heading)] opacity-80 group-hover:opacity-100 group-hover:text-[var(--ab-accent-text)] group-hover:scale-110 transition-all duration-200 -mr-0.5" />
                </button>
              ))}

            {activeMajorTab === 'fellowship' &&
              [
                'زمالة البحث العلمي',
                'زمالة الطب السريري',
                'زمالة الدراسات المتقدمة',
                'الزمالة البحثية لما بعد الدكتوراه',
              ].map((major) => (
                <button
                  key={major}
                  type="button"
                  data-ab-design="98e8ac3671"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--ab-page)] border border-[#142B5F]/30 dark:border-[var(--ab-border)] border-r-2 border-r-[#142B5F] dark:border-r-[var(--ab-accent)] text-[var(--ab-text)] text-[10.5px] font-bold rounded-lg hover:bg-[var(--ab-surface)] hover:border-[#142B5F]/50 dark:hover:border-[var(--ab-accent)]/40 hover:shadow-2xs active:scale-95 transition-all cursor-pointer group"
                >
                  <span>{major}</span>
                  <ArrowUpLeft className="w-3.5 h-3.5 text-[#142B5F] dark:text-[var(--ab-heading)] opacity-80 group-hover:opacity-100 group-hover:text-[var(--ab-accent-text)] group-hover:scale-110 transition-all duration-200 -mr-0.5" />
                </button>
              ))}
          </div>
        </div>

        {/* 7. PARTICIPATING UNIVERSITIES SECTION (الجامعات المشاركة) */}
        {scholarship.participatingUniversities && scholarship.participatingUniversities.length > 0 && (
          <div
            className="relative w-full bg-[var(--ab-surface)] rounded-3xl p-3.5 sm:p-4 border border-[var(--ab-border)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ab-panel "
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
          <DetailSectionHeader id="scholarship-universities" icon={Building2} title={publicT('public_participating_universities')} level={3} />

            <div className="grid grid-rows-2 grid-flow-col auto-cols-[80%] sm:auto-cols-[215px] gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none snap-x snap-mandatory" data-ab-design="9856d4f1a6">
              {scholarship.participatingUniversities.map((university) => (
                <button
                  key={university.id}
                  type="button"
                  onClick={() => onOpenUniversity?.(university.id)}
                  className="w-full snap-start flex items-center gap-2 rounded-xl bg-[var(--ab-page)] border border-[var(--ab-border)] hover:border-[var(--ab-accent)]/45 p-2 text-start transition-all group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--ab-primary)] flex items-center justify-center shrink-0 border border-[var(--ab-accent)]/55 shadow-2xs ab-inverse">
                    <Building2 className="w-3.5 h-3.5 text-[var(--ab-accent-text)]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[10.5px] font-bold text-[var(--ab-heading)] leading-tight truncate">
                      {university.name}
                    </div>
                    <div className="text-[8.5px] font-semibold text-[var(--ab-text-muted)] font-['Cairo',sans-serif] truncate mt-0.5">
                      {university.nameEn}
                    </div>
                    {university.city && (
                      <div className="flex items-center gap-1 mt-0.5 text-[8.5px] font-bold text-[var(--ab-text-muted)]">
                        <MapPin className="w-2.5 h-2.5 text-[var(--ab-accent-text)]" />
                        <span>{university.city}{publicT('public_separator')}{' '}{scholarship.country}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-7 h-7 rounded-full bg-[var(--ab-surface)] border border-[var(--ab-border)] flex items-center justify-center shrink-0 group-hover:border-[var(--ab-accent)]/60 group-hover:bg-[var(--ab-primary)]/5 transition-colors ab-panel">
                    <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--ab-heading)] group-hover:text-[var(--ab-accent-text)] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 8. ELIGIBILITY SECTION (الشروط ومعايير التقديم) */}
        <div
          className="relative w-full bg-[var(--ab-surface)] rounded-3xl p-3.5 sm:p-4 border border-[var(--ab-border)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ab-panel "
          dir={publicDir}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

          {/* Section Header: Centered horizontally with icon beside title */}
          <DetailSectionHeader id="scholarship-requirements" icon={ShieldCheck} title={publicT('public_application_requirements_and_criteria')} level={3} />

          <div className="flex flex-col gap-2">
            {[
              'ألا يكون المتقدم حاملاً للجنسية الصينية ويتمتع بصحة جيدة.',
              'العمر: أقل من 25 للبكالوريوس، 35 للماجستير، 40 للدكتوراه.',
              'امتلاك سجل أكاديمي متميز ومعدل تراكمي عالي.',
              'ألا يكون حاصلاً على منحة دراسية أخرى في الصين بنفس الوقت.',
            ].map((condition, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 px-3 py-2 rounded-xl bg-[var(--ab-page)] border border-[var(--ab-border)] transition-colors"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[var(--ab-surface)] border border-[var(--ab-border)] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--ab-accent)] ab-gold " />
                </div>
                <span className="text-[10.5px] font-bold text-[var(--ab-text)] leading-snug">
                  {condition}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 8. REQUIRED DOCUMENTS SECTION (المستندات المطلوبة) */}
        <div
          className="relative w-full bg-[var(--ab-surface)] rounded-3xl p-3.5 sm:p-4 border border-[var(--ab-border)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ab-panel "
          dir={publicDir}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

          {/* Section Header: Centered horizontally with icon beside title */}
          <DetailSectionHeader id="scholarship-documents" icon={FileCheck} title={publicT('public_required_documents')} level={3} />

          <div className="flex flex-wrap gap-2">
            {[
              { name: 'جواز السفر', icon: Globe },
              { name: 'آخر شهادة دراسية', icon: GraduationCap },
              { name: 'كشف الدرجات', icon: FileText },
              { name: 'خطة الدراسة أو البحث', icon: PenTool },
              { name: 'خطابات توصية للدراسات العليا', icon: Users },
              { name: 'خطاب قبول مبدئي إذا كان مطلوبًا في مسار التقديم', icon: Building2 },
              { name: 'الفحص الطبي', icon: Activity },
              { name: 'شهادة خلو سوابق', icon: Shield },
              { name: 'نموذج طلب منحة CSC', icon: FileCheck },
            ].map((doc, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--ab-page)] border border-[var(--ab-border)] rounded-xl hover:bg-[var(--ab-surface)] hover:border-[var(--ab-accent)]/50 transition-all group cursor-default text-start w-fit"
              >
                <div className="text-[#142B5F] dark:text-[var(--ab-accent-text)] shrink-0">
                  <doc.icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10.5px] font-bold text-[var(--ab-text)] group-hover:text-[var(--ab-heading)] transition-colors leading-tight">
                  {doc.name}
                </span>
              </div>
            ))}

            <span id="scholarship-exams" className="scroll-mt-28" aria-hidden="true" />
            {(scholarship.requiredExams || []).map((exam) => (
              <button
                key={exam.id}
                type="button"
                onClick={() => onOpenExam?.(exam.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--ab-page)] border border-[var(--ab-border)] rounded-xl hover:bg-[var(--ab-surface)] hover:border-[var(--ab-accent)]/40 hover:shadow-2xs active:scale-95 transition-all group cursor-pointer text-start w-fit"
                title={publicT('public_open_title', { v0: exam.name })}
              >
                <Languages className="w-3.5 h-3.5 text-[#142B5F] dark:text-[var(--ab-accent-text)] shrink-0" />
                <span className="text-[10.5px] font-bold text-[var(--ab-text)] group-hover:text-[var(--ab-heading)] transition-colors leading-tight">{publicT('public_language_evidence')}{' '}{exam.nameEn}
                </span>
                <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--ab-heading)] opacity-80 group-hover:opacity-100 group-hover:text-[var(--ab-accent-text)] group-hover:scale-110 transition-all duration-200 -mr-0.5" />
              </button>
            ))}
          </div>
        </div>

        {/* 7. IMPORTANT NOTES SECTION (ملاحظات مهمة) */}
        <div
          className="relative w-full bg-[var(--ab-surface)] rounded-3xl p-3.5 sm:p-4 border border-[var(--ab-border)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ab-panel "
          dir={publicDir}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

          {/* Section Header: Centered horizontally with icon beside title */}
          <DetailSectionHeader icon={Info} title={publicT('public_important_note')} level={3} />

          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2.5 bg-[var(--ab-page)] rounded-xl p-3 border border-[var(--ab-border)] transition-all">
              <div className="w-5 h-5 rounded-full bg-[var(--ab-primary)] flex items-center justify-center shrink-0 border border-[var(--ab-accent)]/50 shadow-xs ab-inverse mt-0.5">
                <span className="text-[10px] font-bold text-[var(--ab-accent-text)] leading-none">
                  A
                </span>
              </div>
              <p className="text-[10.5px] font-bold text-[var(--ab-text)] leading-relaxed">
                <span className="text-[var(--ab-heading)] font-bold">{publicT('public_category_a')}</span>{' '}{publicT('public_apply_through_the_ministries_and_embassies_of_your')}</p>
            </div>

            <div className="flex items-start gap-2.5 bg-[var(--ab-page)] rounded-xl p-3 border border-[var(--ab-border)] transition-all">
              <div className="w-5 h-5 rounded-full bg-[var(--ab-primary)] flex items-center justify-center shrink-0 border border-[var(--ab-accent)]/50 shadow-xs ab-inverse mt-0.5">
                <span className="text-[10px] font-bold text-[var(--ab-accent-text)] leading-none">
                  B
                </span>
              </div>
              <p className="text-[10.5px] font-bold text-[var(--ab-text)] leading-relaxed">
                <span className="text-[var(--ab-heading)] font-bold">{publicT('public_category_b')}</span>{' '}{publicT('public_apply_through_universities_and_the_chinese_government_limited')}</p>
            </div>
          </div>
        </div>

        {/* CONTEXTUAL SERVICES & RELATED ARTICLES SECTION (خدمات ومقالات مرتبطة) */}
        {((contextualServices && contextualServices.length > 0) || (scholarship.relatedArticles && scholarship.relatedArticles.length > 0)) && (
          <section
            className="relative w-full bg-[var(--ab-surface)] rounded-3xl p-3.5 sm:p-4 border border-[var(--ab-border)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ab-panel "
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            <div className="flex flex-col gap-3">
              {/* Contextual Services */}
              {contextualServices && contextualServices.length > 0 && (
                <div>
                  <DetailSectionHeader icon={Briefcase} title={publicT('public_services_that_may_help_during_your_application')} level={3} className="mb-2.5" />
                  
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {contextualServices.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => onOpenService?.(service)}
                        className="group flex min-h-12 items-center gap-2.5 rounded-xl border border-[var(--ab-border)] bg-[var(--ab-page)] px-3 py-2.5 text-start transition-colors hover:border-[var(--ab-accent)] active:scale-[0.99] ab-panel shadow-2xs"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ab-primary)]/10 text-[var(--ab-heading)] dark:bg-[var(--ab-accent)]/10 dark:text-[var(--ab-accent-text)]">
                          <GraduationCap className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[9.5px] font-bold text-[var(--ab-text)] group-hover:text-[var(--ab-heading)] transition-colors">{service.title}</span>
                          <span className="mt-0.5 block truncate text-[8.5px] font-medium text-[var(--ab-text-muted)]">{service.category}</span>
                        </span>
                        <ChevronLeft className="h-4 w-4 shrink-0 text-[var(--ab-accent-text)] transition-transform group-hover:-translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Articles */}
              {scholarship.relatedArticles && scholarship.relatedArticles.length > 0 && (
                <div className="mt-1">
                  <DetailSectionHeader icon={BookOpenText} title={publicT('public_related_articles_and_guides')} level={3} className="mb-2.5" />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {scholarship.relatedArticles.map((article) => (
                      <button
                        key={article.id}
                        type="button"
                        onClick={() => onOpenArticle?.(article.id)}
                        disabled={!onOpenArticle}
                        className="group flex flex-col justify-between rounded-xl border border-[var(--ab-border)] bg-[var(--ab-page)] p-3 text-start transition-colors enabled:hover:border-[var(--ab-accent)] enabled:active:scale-[0.99] ab-panel shadow-2xs h-full"
                      >
                        <div>
                          <p className="text-[10px] sm:text-[10.5px] font-bold leading-5 text-[var(--ab-text)] group-hover:text-[var(--ab-heading)] transition-colors line-clamp-2">{article.title}</p>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--ab-border)]/50 pt-2">
                          {article.meta ? <p className="line-clamp-1 text-[8.5px] font-semibold text-[var(--ab-text-muted)]">{article.meta}</p> : <span />}
                          <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-[var(--ab-accent-text)] transition-transform group-hover:-translate-x-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 9. APPLICATION LINKS SECTION (طريقة التقديم) */}
        <div
          className="relative w-full bg-[var(--ab-surface)] rounded-3xl p-3.5 sm:p-4 border border-[var(--ab-border)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ab-panel "
          dir={publicDir}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

          {/* Section Header: Centered horizontally with icon beside title */}
          <DetailSectionHeader id="scholarship-application" icon={MousePointerClick} title={publicT('public_how_to_apply')} level={3} />

          <div className="flex flex-col gap-2.5">
            {/* Primary Apply Button (Official Website) */}
            <a
              href={scholarship?.applicationUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="ab-external-link inline-flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 bg-[var(--ab-page)] border border-[var(--ab-border)] hover:border-[var(--ab-accent)]/50 transition-all group ab-panel "
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#142B5F]/10 dark:bg-[var(--ab-accent)]/10 flex items-center justify-center shrink-0 border border-[#142B5F]/20 dark:border-[var(--ab-accent)]/30">
                  <Globe className="w-4 h-4 text-[#142B5F] dark:text-[var(--ab-accent-text)]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[var(--ab-heading)] leading-tight mb-0.5">{publicT('public_apply_through_the_official_scholarship_website')}</span>
                  <span className="text-[9.5px] font-bold text-[var(--ab-text-muted)] leading-tight">{publicT('public_submit_directly_through_the_funding_organizations_official_website')}</span>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-[var(--ab-surface)] flex items-center justify-center shrink-0 border border-[var(--ab-border)] group-hover:border-[var(--ab-accent)]/40 group-hover:bg-[var(--ab-accent)]/10 transition-colors ab-panel ">
                <ExternalLink className="w-3 h-3 text-[var(--ab-heading)]" />
              </div>
            </a>

            {/* Secondary Apply Button (Manartak Platform - Natural Theme Style) */}
            <div
              aria-label={publicT('public_applications_through_absheer_are_currently_unavailable')}
              className="inline-flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 bg-[var(--ab-page)] border border-[var(--ab-border)] transition-all group cursor-default ab-panel "
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#142B5F]/10 dark:bg-[var(--ab-accent)]/10 flex items-center justify-center shrink-0 border border-[#142B5F]/20 dark:border-[var(--ab-accent)]/30">
                  <MousePointerClick className="w-4 h-4 text-[#142B5F] dark:text-[var(--ab-accent-text)]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[var(--ab-heading)] leading-tight mb-0.5">{publicT('public_apply_through_absheer')}</span>
                  <span className="text-[9.5px] font-bold text-[var(--ab-text-muted)] leading-tight">{publicT('public_easy_reliable_applications_with_a_professional_profile_coming')}</span>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-[var(--ab-surface)] flex items-center justify-center shrink-0 border border-[var(--ab-border)] ab-panel ">
                <Link className="w-3 h-3 text-[var(--ab-heading)]" />
              </div>
            </div>
          </div>
        </div>

        {/* 10. SIMILAR SCHOLARSHIPS SECTION */}
        <div
          className="relative w-full bg-[var(--ab-surface)] rounded-3xl p-3.5 sm:p-4 border border-[var(--ab-border)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden mb-2 ab-panel "
          dir={publicDir}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

          {/* Section Header: Centered horizontally with icon beside title */}
          <DetailSectionHeader icon={Copy} title={publicT('public_similar_scholarships_you_may_like')} level={3} />

          <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
            {[
              {
                id: 'turkiye-burslari',
                country: 'تركيا',
                title: 'منحة الحكومة التركية',
                degrees: ['بكالوريوس', 'ماجستير', 'دكتوراه'],
                deadline: 'منحة حكومية',
              },
              {
                id: 'chevening-uk',
                country: 'المملكة المتحدة',
                title: 'منحة تشيفنينغ للدراسات العليا',
                degrees: ['ماجستير'],
                deadline: 'متاح للتقديم',
              },
              {
                id: 'daad-germany',
                country: 'ألمانيا',
                title: 'منح DAAD للدراسات العليا',
                degrees: ['ماجستير', 'دكتوراه'],
                deadline: 'منحة بحثية',
              },
            ].filter((item) => item.id !== scholarship.id).map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onOpenScholarship?.(item.id)}
                className="min-w-[200px] bg-[var(--ab-page)] border border-[var(--ab-border)] rounded-2xl p-2.5 flex flex-col gap-2 snap-center transition-all hover:border-[var(--ab-accent)]/40 hover:bg-[var(--ab-accent)]/5 cursor-pointer text-start active:scale-[0.99] ab-panel "
              >
                {/* Header: Country and Funding Type */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[var(--ab-text-muted)]" />
                    <span className="text-[11px] font-bold text-[var(--ab-text-muted)]">{item.country}</span>
                  </div>
                  <span className="px-1.5 py-0.5 bg-[var(--ab-primary)]/10 text-[var(--ab-heading)] rounded-md text-[8px] font-bold">{publicT('public_fully_funded')}</span>
                </div>

                {/* Title */}
                <h4 className="text-[11px] font-bold text-[var(--ab-heading)] line-clamp-2 leading-tight">
                  {item.title}
                </h4>

                {/* Degrees */}
                <div className="flex flex-wrap gap-1 mt-auto pt-0.5">
                  {item.degrees.map((deg) => (
                    <span
                      key={deg}
                      className="px-1.5 py-0.5 bg-[var(--ab-surface)] border border-[var(--ab-border)] text-[var(--ab-text-muted)] rounded-lg text-[8.5px] font-bold ab-panel "
                    >
                      {deg}
                    </span>
                  ))}
                </div>

                {/* Footer: Deadline */}
                <div className="flex items-center gap-1.5 pt-1.5 mt-0.5 border-t border-[var(--ab-border)]">
                  <Calendar className="w-3 h-3 text-[var(--ab-accent-text)]" />
                  <span className="text-[9px] font-bold text-[var(--ab-text-muted)]">{item.deadline}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 9. ACTIONS BUTTONS (SAVE & SHARE) — moved to the very bottom */}
        <div className="pt-3 pb-2 flex justify-center gap-3 w-full">
          <button
            onClick={() => {
              // Share functionality placeholder
            }}
            data-ab-design="efc9da21fc"
            className="py-2.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer bg-[var(--ab-surface)] text-[var(--ab-heading)] border border-[var(--ab-accent)]/40 hover:bg-[var(--ab-accent)]/5 hover:border-[var(--ab-accent)] flex-1 max-w-[170px] ab-panel "
          >
            <span>{publicT('public_share_scholarship')}</span>
            <Share2 className="w-4 h-4 text-[var(--ab-accent-text)]" />
          </button>

          <button
            onClick={handleSaveClick}
            data-ab-design="efc9da21fc"
            className={`py-2.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer flex-1 max-w-[170px] ${
              isFavorite
                ? 'bg-[var(--ab-primary)] text-[var(--ab-accent-text)] border border-[var(--ab-accent)] ab-inverse '
                : 'bg-[var(--ab-primary)] text-white hover:bg-[var(--ab-primary)] ab-inverse hover:ab-inverse '
            }`}
          >
            <span>{isFavorite ? publicT('public_saved_3') : publicT('public_save_scholarship')}</span>
            <Bookmark
              className={`w-4 h-4 ${isFavorite ? 'fill-[var(--ab-accent)] text-[var(--ab-accent-text)]' : 'text-[var(--ab-accent-text)]'}`}
            />
          </button>
        </div>
      </div>

      )}
      {scholarship.publishedData && <div className="px-3 py-4 flex justify-center">
        <button type="button" onClick={handleSaveClick} className="flex items-center gap-2 rounded-2xl bg-[var(--ab-primary)] px-5 py-3 text-xs font-bold text-white">
          <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />{isFavorite ? publicT('public_saved_3') : publicT('public_save_scholarship')}
        </button>
      </div>}
      {/* Save Notification Toast */}
      {saveToast && (
        <div className="fixed bottom-6 inset-x-4 max-w-xs mx-auto bg-[var(--ab-primary)] text-white px-4 py-2 rounded-full shadow-2xl z-50 flex items-center justify-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 ab-inverse ">
          <Check className="w-3.5 h-3.5 text-[var(--ab-accent-text)]" />
          <span>{isFavorite ? publicT('public_scholarship_added_to_my_favorites') : publicT('public_scholarship_removed_from_my_favorites')}</span>
        </div>
      )}
    </div>
  );
};

function ChevronBack() { return <ArrowLeft className="w-4 h-4 rotate-180" />; }
