import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import {
  ExternalLink,
  Heart,
  MapPin,
  Landmark,
  Calendar,
  Building2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  ArrowUpLeft,
  Layers,
  Trophy,
  GraduationCap,
  Languages,
  Clock,
  Sparkles,
  BookOpen,  BookOpenText,  Briefcase,
  Star,
  Globe,
  FileText,
  HeartPulse,
  Settings,
  Scale,
  Users,
  Monitor,
  Award,
  PenLine,
  Check,
  CheckCircle2,
  ArrowUpRight,
  Send,
  UserCheck,
  Coins,
  Stethoscope,
  Wrench,
  Banknote,
  Info,
  Phone,
  Share2,
  ShieldCheck,
  BookOpenCheck,
  Scroll,
  Compass,
  Globe2,
  Zap,
  Bookmark,
} from 'lucide-react';
import { PublishedUniversityDetails } from './PublishedUniversityDetails';
import { Service, University } from '../types';
import { RelatedArticlesStrip } from './RelatedArticlesStrip';
import { ContextualServicesStrip } from './ContextualServicesStrip';
import { DetailBackButton, DetailSectionHeader, useDetailSearchTarget } from './DetailUi';

interface UniversityDetailModalProps {
  university: University;
  onClose: () => void;
  isSaved?: boolean;
  onToggleSave?: (e: React.MouseEvent) => void;
  onOpenCountry?: (countryId: string) => void;
  onOpenMajor?: (majorId: string) => void;
  onOpenScholarship?: (scholarshipId: string) => void;
  onOpenExam?: (examId: string) => void;
  onOpenArticle?: (articleId: string) => void;
  contextualServices?: Service[];
  onOpenService?: (service: Service) => void;
  searchAnchor?: string;
  searchTerm?: string;
}

export const UniversityDetailModal: React.FC<UniversityDetailModalProps> = ({
  university,
  onClose,
  isSaved = false,
  onToggleSave,
  onOpenCountry,
  onOpenMajor,
  onOpenScholarship,
  onOpenExam,
  onOpenArticle,
  contextualServices = [],
  onOpenService,
  searchAnchor,
  searchTerm,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();
  const [actionToast, setActionToast] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionToast(msg);
    window.setTimeout(() => setActionToast(null), 2400);
  };

  useDetailSearchTarget(searchAnchor, searchTerm);
  return (
    <div
      className="w-full max-w-md md:max-w-[1120px] lg:max-w-[1160px] mx-auto pt-0 pb-12 text-start font-['Cairo',sans-serif] animate-in fade-in duration-200 bg-[var(--mn-surface-muted)] min-h-screen relative mn-panel mn-university-detail"
      dir={publicDir}
    >
      {/* 1. TOP HERO CONTAINER (Compact horizontal layout matching ScholarshipDetailModal) */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute top-2 left-2 md:top-3.5 md:left-4 z-30 flex flex-col md:flex-row items-center gap-1.5 md:gap-2 scale-80 md:scale-100 origin-top-left">
          <DetailBackButton onBack={onClose} mode="back" />
          <button
            type="button"
            onClick={onToggleSave}
            className="mn-detail-close transition-all active:scale-95 cursor-pointer"
            aria-label={isSaved ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            title={isSaved ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          >
            <Heart
              className={`h-3.5 w-3.5 ${
                isSaved
                  ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#38C6D4] dark:text-[#38C6D4]'
                  : 'text-[var(--mn-heading)]'
              }`}
            />
          </button>
        </div>

        {/* SVG background with vibrant 3-stop navy-to-petrol gradient and subtle gold waves */}
        <div className="relative w-full h-[115px] sm:h-[120px] md:h-[145px]">
          <svg
            viewBox="0 0 500 115"
            preserveAspectRatio="none"
            className="w-full h-full absolute inset-0 block"
          >
            <defs>
              <linearGradient id="uniHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#142B5F" />
                <stop offset="52%" stopColor="#153B75" />
                <stop offset="100%" stopColor="#0E7C86" />
              </linearGradient>
            </defs>

            {/* Main base background */}
            <path d="M 0,0 L 500,0 L 500,90 Q 250,112 0,90 Z" fill="url(#uniHeroGrad)" />

            {/* Decorative Gold Waves */}
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

            {/* Gold accent border following the bottom curve */}
            <path
              d="M 0,90 Q 250,112 500,90"
              fill="none"
              stroke="var(--mn-accent)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>

          {/* Hero Content: Horizontal Row (Glowing Gold Graduation Badge Right -> Arrow -> Title Left) */}
          <div
            className="absolute inset-0 flex items-center justify-between px-4 sm:px-6 md:px-10 pt-1 pb-4 z-10"
            dir={publicDir}
          >
            {/* Right Side: Glowing Gold Graduation Badge + Arrow */}
            <div className="flex items-center gap-2.5 md:gap-3.5 shrink-0">
              <div className="w-11 h-11 md:w-14 md:h-14 rounded-full border-2 border-[#F2CD78] flex items-center justify-center p-1.5 shadow-[0_0_12px_rgba(214,164,59,0.45)] bg-gradient-to-br from-[#142B5F] to-[#0E7C86] shrink-0">
                <svg viewBox="0 0 40 40" className="w-full h-full">
                  <defs>
                    <linearGradient id="uniGoldCapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--mn-accent-soft)" />
                      <stop offset="45%" stopColor="var(--mn-accent-soft)" />
                      <stop offset="100%" stopColor="var(--mn-accent)" />
                    </linearGradient>
                    <filter id="uniGoldShine" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="1" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  <polygon
                    points="20,6 37,14 20,22 3,14"
                    fill="url(#uniGoldCapGrad)"
                    stroke="#FFF2B2"
                    strokeWidth="0.8"
                    filter="url(#uniGoldShine)"
                  />
                  <path
                    d="M9,17.5 v6 c0,3.5 4.8,6.5 11,6.5 s11,-3 11,-6.5 v-6"
                    fill="url(#uniGoldCapGrad)"
                    stroke="#FFF2B2"
                    strokeWidth="0.6"
                  />
                  <path
                    d="M20,14 L34,16.5 v8.5"
                    stroke="#FFEAA7"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <circle cx="34" cy="26" r="1.8" fill="#FFEAA7" filter="url(#uniGoldShine)" />
                </svg>
              </div>

              <ArrowLeft className="w-4 h-4 text-[#F2CD78] shrink-0 opacity-95 drop-shadow-[0_0_4px_rgba(214,164,59,0.4)]" />
            </div>

            {/* Left Side (in RTL): University Title & English Subtitle */}
            <div className="flex flex-col text-start min-w-0 flex-1 pr-1.5">
              <h1 className="text-[15px] sm:text-[15px] md:text-xl lg:text-2xl font-bold text-white leading-tight truncate drop-shadow-sm" data-mn-design="827f35e03a">
                {university.name}
              </h1>
              <p className="text-[11px] sm:text-[11px] md:text-sm font-bold text-[#F2CD78] font-['Cairo',sans-serif] mt-0.5 tracking-wider truncate">
                {university.nameEn}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT WRAPPER */}
      <div className="px-0 md:px-4 space-y-2.5 md:space-y-4 z-20 relative mt-1 md:mt-2" dir={publicDir}>
        {/* 2. 2-COLUMN X 2-ROW QUICK INFO GRID + DEDICATED OFFICIAL WEBSITE ROW */}
        <div className="px-2 sm:px-2.5 space-y-2 pt-1" dir={publicDir}>
          {/* ROW 1: دولة ومدينة الدراسة | ملكية الجامعة */}
          <div className="flex items-stretch gap-2">
            {/* Right Card: دولة ومدينة الدراسة */}
            <button
              type="button"
              onClick={() =>
                (university.countryReferenceId || university.country) &&
                onOpenCountry?.(university.countryReferenceId || university.country)
              }
              className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 border border-[var(--mn-border)] shadow-sm flex items-start gap-2 min-w-0 hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] hover:shadow-md active:scale-[0.99] transition-all text-start group cursor-pointer mn-panel"
              title={publicT('public_explore_study_country', { v0: university.country })}
            >
              <div className="w-7 h-7 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] dark:bg-[#F2CD78]/15 dark:border-[#F2CD78] dark:text-[#F2CD78] flex items-center justify-center shrink-0 -mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-current" />
              </div>
              <div className="flex flex-col min-w-0 text-start flex-1">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug">
                  {publicT('public_study_country')}
                </span>
                <span className="text-[9.5px] sm:text-[10px] font-bold text-[var(--mn-text-muted)] leading-snug mt-1 break-words">
                  {university.country}
                  {university.city ? publicT('public_city_suffix', { v0: university.city }) : ''}
                </span>
              </div>
              <div className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform mt-0.5">
                <ArrowUpLeft className="w-3 h-3 stroke-[2.5] shrink-0" />
              </div>
            </button>

            {/* Diamond Connector */}
            <div className="w-1.5 h-1.5 rotate-45 bg-[#D6A43B] shadow-[0_0_5px_rgba(214,164,59,0.5)] shrink-0 self-center" />

            {/* Left Card: ملكية الجامعة */}
            <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 border border-[var(--mn-border)] shadow-sm flex items-start gap-2 min-w-0 mn-panel">
              <div className="w-7 h-7 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] dark:bg-[#F2CD78]/15 dark:border-[#F2CD78] dark:text-[#F2CD78] flex items-center justify-center shrink-0 -mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-current" />
              </div>
              <div className="flex flex-col min-w-0 text-start flex-1">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug">
                  ملكية الجامعة
                </span>
                <span className="text-[9.5px] sm:text-[10px] font-bold text-[var(--mn-text-muted)] leading-snug mt-1 break-words">
                  {university.ownership || publicT('public_not_specified_2')}
                </span>
              </div>
            </div>
          </div>

          {/* ROW 2: نوع المؤسسة | سنة التأسيس */}
          <div className="flex items-stretch gap-2">
            {/* Right Card: نوع المؤسسة */}
            <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 border border-[var(--mn-border)] shadow-sm flex items-start gap-2 min-w-0 mn-panel">
              <div className="w-7 h-7 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] dark:bg-[#F2CD78]/15 dark:border-[#F2CD78] dark:text-[#F2CD78] flex items-center justify-center shrink-0 -mt-0.5">
                <Landmark className="w-3.5 h-3.5 text-current" />
              </div>
              <div className="flex flex-col min-w-0 text-start flex-1">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug">
                  نوع المؤسسة
                </span>
                <span className="text-[9.5px] sm:text-[10px] font-bold text-[var(--mn-text-muted)] leading-snug mt-1 break-words">
                  {university.type || publicT('public_not_specified_2')}
                </span>
              </div>
            </div>

            {/* Diamond Connector */}
            <div className="w-1.5 h-1.5 rotate-45 bg-[#D6A43B] shadow-[0_0_5px_rgba(214,164,59,0.5)] shrink-0 self-center" />

            {/* Left Card: سنة التأسيس */}
            <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 border border-[var(--mn-border)] shadow-sm flex items-start gap-2 min-w-0 mn-panel">
              <div className="w-7 h-7 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] dark:bg-[#F2CD78]/15 dark:border-[#F2CD78] dark:text-[#F2CD78] flex items-center justify-center shrink-0 -mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-current" />
              </div>
              <div className="flex flex-col min-w-0 text-start flex-1">
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug">
                  سنة التأسيس
                </span>
                <span className="text-[9.5px] sm:text-[10px] font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] leading-snug mt-1 break-words">
                  {university.foundationYear || publicT('public_not_specified_2')}
                </span>
              </div>
            </div>
          </div>

          {/* ROW 3: DEDICATED OFFICIAL UNIVERSITY WEBSITE ROW */}
          {university.websiteUrl ? (
            <a
              href={university.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative overflow-hidden w-full rounded-2xl py-2.5 pl-3 pr-0 bg-gradient-to-l from-[#142B5F]/[0.05] via-[var(--mn-surface)] to-[#0E7C86]/[0.08] dark:from-[#142B5F]/55 dark:via-[var(--mn-surface)] dark:to-[#0E7C86]/25 border border-[#142B5F]/35 dark:border-[#38C6D4]/50 hover:border-[#142B5F] dark:hover:border-[#F2CD78] shadow-sm hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-between gap-2 group mn-panel"
            >
              {/* الخط الهندسي باللون النيلي على الزاوية اليمنى */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 right-0 w-4 h-[78%] rounded-tr-2xl border-t-[3px] border-r-[3.5px] border-[#142B5F] dark:border-[#38C6D4]"
              />

              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {/* خط نيلي خفيف يخرج من قلب الخط الهندسي وينتهي برأس سهم ذهبي يشير إلى الكلمة */}
                <svg
                  viewBox="0 0 36 20"
                  className="w-8 h-5 shrink-0 -mr-[1px]"
                  fill="none"
                  aria-hidden="true"
                >
                  {/* اتصال مباشر بالخط الهندسي النيلي الجانبي */}
                  <path
                    d="M 35 2 L 35 10 L 8 10"
                    stroke="#142B5F"
                    className="dark:stroke-[#38C6D4]"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* عقدة هندسية صغيرة عند مخرج السهم */}
                  <circle cx="26" cy="10" r="1.6" fill="#142B5F" className="dark:fill-[#38C6D4]" />
                  {/* رأس السهم باللون الذهبي */}
                  <polygon
                    points="1.5,10 10.5,5.2 8.6,10 10.5,14.8"
                    fill="#D6A43B"
                    stroke="#B8841E"
                    strokeWidth="0.6"
                  />
                </svg>

                <span className="text-[11.5px] sm:text-xs font-bold text-[var(--mn-heading)] leading-tight">
                  {publicT('public_official_university_website')}
                </span>
              </div>

              <div className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <ExternalLink className="w-2.5 h-2.5 stroke-[2.2] shrink-0" />
              </div>
            </a>
          ) : (
            <div className="relative overflow-hidden w-full bg-[var(--mn-surface)] rounded-2xl py-2.5 pl-3 pr-0 border border-[var(--mn-border)] shadow-sm flex items-center justify-between gap-2 opacity-80 mn-panel">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 right-0 w-4 h-[78%] rounded-tr-2xl border-t-[3px] border-r-[3.5px] border-[#142B5F] dark:border-[#38C6D4]"
              />
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <svg
                  viewBox="0 0 36 20"
                  className="w-8 h-5 shrink-0 -mr-[1px]"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M 35 2 L 35 10 L 8 10"
                    stroke="#142B5F"
                    className="dark:stroke-[#38C6D4]"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="26" cy="10" r="1.6" fill="#142B5F" className="dark:fill-[#38C6D4]" />
                  <polygon
                    points="1.5,10 10.5,5.2 8.6,10 10.5,14.8"
                    fill="#D6A43B"
                    stroke="#B8841E"
                    strokeWidth="0.6"
                  />
                </svg>
                <span className="text-[10.5px] font-bold text-[var(--mn-text-muted)] leading-tight">
                  {publicT('public_official_website_unavailable')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 4. استكمال باقي الصفحة (الأقسام الـ 11) */}
        {university.publishedData ? (
          <PublishedUniversityDetails university={university} onOpenMajor={onOpenMajor} onOpenExam={onOpenExam} />
        ) : (
          <>
            {/* القسم الأول: نبذة عن الجامعة */}
            <div
              className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:p-6 py-3.5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
              dir={publicDir}
            >
              {/* خط التزيين العلوي النيلي / الذهبي الموحد */}
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

              <UniversitySectionHeader
                id="university-about"
                icon={BookOpen}
                title={publicT('public_1_university_overview')}
                className="mb-3"
              />

              <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs pl-3 pr-3.5 py-2.5 text-start">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] dark:bg-[linear-gradient(180deg,#38C6D4_0%,#0E7C86_75%,#142B5F_100%)]" />
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify font-['Cairo',sans-serif] whitespace-pre-line">
                  <span className="inline-block w-3 h-3 rounded-[3px] bg-[#142B5F] shadow-[2px_2px_0px_#0E7C86] ml-2 align-middle shrink-0" />
                  {university.description}
                </p>
              </div>
            </div>

        {/* القسم الثاني: التصنيفات العالمية — تصميم موحد متناسق مع هوية منارتك */}
        {university.rankings && university.rankings.length > 0 && (
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:p-6 py-3.5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            {/* خط التزيين العلوي النيلي / الذهبي الموحد */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

            <UniversitySectionHeader
              id="university-rankings"
              icon={Trophy}
              title={publicT('public_2_international_rankings_and_academic_accreditations')}
              className="mb-3"
            />

            {/* المحتوى الداخلي لقائمة التصنيفات */}
            <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 items-stretch font-['Cairo',sans-serif]">
              {university.rankings.map((ranking, idx) => {
                const rankNum = ranking.rank.replace('#', '').replace('عالميًا', '').trim();
                const Wrapper = ranking.link ? 'a' : 'div';
                const wrapperProps = ranking.link
                  ? {
                      href: ranking.link,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                      title: publicT('public_visit_ranking_page'),
                    }
                  : {};

                return (
                  <Wrapper
                    key={idx}
                    {...wrapperProps}
                    className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] pl-3 pr-3.5 py-2.5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-2.5 group mn-panel"
                  >
                    {/* الخط الهندسي المنحني في بداية المربع */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0 right-0 w-4 h-[78%] rounded-tr-xl border-t-[3px] border-r-[3.5px] border-[#142B5F] dark:border-[#D6A43B]"
                    />

                    {/* اليمين: أيقونة التصنيف مقابل اسم التصنيف + سهم التنقل بجانب الاسم + سنة الإصدار بالأسفل */}
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <div className="w-6 h-6 rounded-lg mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs -mt-0.5">
                        <Trophy className="w-3.5 h-3.5 text-white" />
                      </div>

                      <div className="flex flex-col items-start text-start min-w-0 flex-1">
                        <div className="inline-flex items-center gap-1 whitespace-nowrap max-w-full">
                          <h3 className="text-[10.5px] sm:text-xs font-bold text-[var(--mn-heading)] leading-snug truncate">
                            {ranking.name === 'Academic Ranking of World Universities (ARWU)' ? (
                              <>
                                <span className="sm:hidden">Academic Ranking (ARWU)</span>
                                <span className="hidden sm:inline">{ranking.name}</span>
                              </>
                            ) : (
                              ranking.name
                            )}
                          </h3>
                          {ranking.link && (
                            <ArrowUpLeft className="w-3.5 h-3.5 -mt-1 text-[#0E7C86] dark:text-[#F2CD78] stroke-[2.5] shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                          )}
                        </div>
                        <span className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] mt-1 leading-snug">
                          {publicT('public_edition')} {ranking.year}
                        </span>
                      </div>
                    </div>

                    {/* اليسار (نهاية الجدول): شارة الترتيب العالمي */}
                    <div className="flex items-center shrink-0">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] shadow-2xs">
                        <span className="text-[10px] sm:text-[10.5px] font-bold font-['Cairo',sans-serif] leading-none">
                          #{rankNum} {publicT('public_worldwide_2')}
                        </span>
                      </div>
                    </div>
                  </Wrapper>
                );
              })}
            </div>
          </div>
        )}

        {/* القسم الثالث: الدراسة والتخصصات والبرامج الأكاديمية — بنسبة 95% بدون مربع داخل مربع */}
        {university.studyPrograms && (
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:p-6 py-3.5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            {/* خط التزيين العلوي النيلي / الذهبي الموحد */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

            <UniversitySectionHeader
              id="university-programs"
              icon={GraduationCap}
              title={publicT('public_3_study_majors_and_academic_programs')}
              className="mb-3"
            />

            {/* المحتوى الداخلي المنظم بعرض 95% مباشر بدون مربعات خارجية مكررة */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              {/* 1. لغات التدريس وأنماط الدراسة */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-[18px] h-[18px] rounded-[5px] bg-[#142B5F] border border-[#142B5F] text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                    <Languages className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-[var(--mn-heading)] leading-snug">
                    {publicT('public_teaching_languages_and_study_arrangements')}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {/* لغات التدريس */}
                  {university.studyPrograms.teachingLanguages &&
                    university.studyPrograms.teachingLanguages.length > 0 && (
                      <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] px-3 py-2 flex flex-wrap items-center justify-start gap-2.5 sm:gap-3 shadow-2xs">
                        <span className="inline-flex items-center gap-1.5 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] shrink-0">
                          <span className="w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#F2CD78] shrink-0" />
                          <span>{publicT('public_teaching_languages')}</span>
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {university.studyPrograms.teachingLanguages.map((lang) => (
                            <span
                              key={lang}
                              className="bg-[var(--mn-surface)] border border-[var(--mn-border)] text-[var(--mn-heading)] px-2.5 py-0.5 rounded-lg text-[10px] font-bold inline-flex items-center shadow-2xs"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* أنماط الدراسة والحضور */}
                  {university.studyPrograms.studyModes &&
                    university.studyPrograms.studyModes.length > 0 && (
                      <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] px-3 py-2 flex flex-wrap items-center justify-start gap-2.5 sm:gap-3 shadow-2xs">
                        <span className="inline-flex items-center gap-1.5 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] shrink-0">
                          <span className="w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#F2CD78] shrink-0" />
                          <span>{publicT('public_attendance_arrangements')}</span>
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {university.studyPrograms.studyModes.map((mode) => (
                            <span
                              key={mode}
                              className="bg-[var(--mn-surface)] border border-[var(--mn-border)] text-[var(--mn-heading)] px-2 py-0.5 rounded-lg text-[9.5px] sm:text-[10px] font-bold inline-flex items-center shadow-2xs"
                            >
                              {mode}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* 2. الدرجات التعليمية المتاحة (شبكة مربعين متناسقة تملأ العرض) */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-[18px] h-[18px] rounded-[5px] bg-[#142B5F] border border-[#142B5F] text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                    <GraduationCap className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-[var(--mn-heading)] leading-snug">
                    {publicT('public_degrees_available_for_admission_and_study')}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                  {(university.studyPrograms.degrees ?? []).map((degree) => (
                    <div
                      key={degree}
                      className="bg-[var(--mn-page)] border border-[var(--mn-border)] text-[var(--mn-heading)] px-3 py-2 rounded-xl text-[10px] sm:text-[10.5px] font-bold flex items-center gap-1.5 shadow-2xs min-w-0"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#D6A43B] shrink-0" />
                      <span className="truncate">{degree}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. الكليات والأقسام الأكاديمية الرئيسية (شبكة مربعين متناسقة تملأ العرض) */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-[18px] h-[18px] rounded-[5px] bg-[#142B5F] border border-[#142B5F] text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                    <Building2 className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-[var(--mn-heading)] leading-snug">
                    {publicT('public_main_faculties_and_academic_departments')}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                  {(university.studyPrograms.faculties ?? []).map((faculty, index) => (
                    <div
                      key={index}
                      className="bg-[var(--mn-page)] border border-[var(--mn-border)] text-[var(--mn-heading)] px-3 py-2 rounded-xl text-[10px] sm:text-[10.5px] font-bold flex items-center gap-1.5 shadow-2xs min-w-0"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#D6A43B] shrink-0" />
                      <span className="truncate">{faculty}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. أهم التخصصات الرائدة بالجامعة (شبكة مربعين متناسقة تملأ العرض) */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-[18px] h-[18px] rounded-[5px] bg-[#142B5F] border border-[#142B5F] text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                    <BookOpen className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-[var(--mn-heading)] leading-snug">
                    {publicT('public_leading_academic_majors_at_the_university')}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                  {(
                    university.studyPrograms.majorLinks?.length
                      ? university.studyPrograms.majorLinks.map(m => ({ label: m.label, majorId: m.majorId }))
                      : (university.studyPrograms.topKeyMajors ?? []).map(label => ({ label, majorId: undefined }))
                  ).map((major, idx) => {
                    const { label: majorName, majorId } = major;

                    return (
                      <button
                        key={majorId || `${majorName}-${idx}`}
                        type="button"
                        onClick={() => major.majorId && onOpenMajor?.(major.majorId)}
                        aria-label={
                          majorId
                            ? publicT('public_open_major_manaratak', { v0: majorName })
                            : undefined
                        }
                        title={
                          majorId
                            ? publicT('public_open_major_manaratak', { v0: majorName })
                            : undefined
                        }
                        className={`mn-major-chip w-full flex items-center justify-between gap-1.5 px-3 py-2 bg-[var(--mn-page)] border border-[#142B5F]/20 dark:border-[var(--mn-border)] text-[var(--mn-heading)] text-[10px] sm:text-[10.5px] font-bold rounded-xl transition-all group min-w-0 text-start ${
                          majorId
                            ? 'hover:border-[#0E7C86]/65 dark:hover:border-[#F2CD78]/65 hover:shadow-2xs active:scale-95 cursor-pointer'
                            : 'hover:border-[#0E7C86]/45 dark:hover:border-[#F2CD78]/45 cursor-default'
                        }`}
                      >
                        <span className="truncate">{majorName}</span>
                        <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-interactive-arrow)] opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. زر الدليل الرسمي المباشر للبرامج والتخصصات */}
              {(university.studyPrograms.undergradDirectoryUrl ||
                university.studyPrograms.postgradDirectoryUrl) && (
                <OfficialInfoLink
                  href={
                    university.studyPrograms.undergradDirectoryUrl ||
                    university.studyPrograms.postgradDirectoryUrl
                  }
                  label={publicT('public_explore_the_universitys_official_program_and_major_directory')}
                  icon={<FileText className="w-3.5 h-3.5" />}
                />
              )}
            </div>
          </div>
        )}

        {/* القسم الرابع: القبول الجامعي والتسجيل للطلاب الدوليين — بدون مربع داخل مربع */}
        {university.internationalAdmissions && (
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:p-6 py-3.5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            {/* خط التزيين العلوي النيلي / الذهبي الموحد */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

            <UniversitySectionHeader
              id="university-admissions"
              icon={Globe}
              title={publicT('public_4_international_student_admission_and_registration')}
              className="mb-3"
            />

            {/* المحتوى الداخلي لقسم القبول والتسجيل بعرض 95% مباشر */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              {/* 1. هل تقبل الجامعة طلابًا دوليين؟ */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-[18px] h-[18px] rounded-[5px] bg-[#142B5F] border border-[#142B5F] text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                    <UserCheck className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-[var(--mn-heading)] leading-snug">
                    {publicT('public_does_the_university_accept_international_students')}
                  </span>
                </div>

                <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] pl-3 pr-3.5 py-2.5 shadow-2xs">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#E5B54F]" />
                  <p className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify font-['Cairo',sans-serif]">
                    {university.internationalAdmissions.acceptsDescription ||
                      (university.internationalAdmissions.acceptsInternationalStudents === true
                        ? publicT('public_international_admission_yes', { v0: university.name })
                        : university.internationalAdmissions.acceptsInternationalStudents === false
                          ? publicT('public_international_admission_no', { v0: university.name })
                          : publicT('public_international_student_admission_status_is_not_specified_in'))}
                  </p>
                </div>
              </div>

              {/* 2. روابط وبوابات التقديم الرسمية المعتمدة (مباشرة بعرض 95% بدون مربع خارجي إضافي) */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-[18px] h-[18px] rounded-[5px] bg-[#142B5F] border border-[#142B5F] text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                    <Globe2 className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-[var(--mn-heading)] leading-snug">
                    {publicT('public_official_admission_links_and_portals')}
                  </span>
                </div>

                {/* قائمة بوابات التقديم الفرعية بشكل طولي متناسق */}
                <div className="flex flex-col md:grid md:grid-cols-2 gap-2 md:gap-3">
                  {/* 1. قبول البكالوريوس */}
                  {university.internationalAdmissions.undergradAdmissionUrl && (
                    <a
                      href={university.internationalAdmissions.undergradAdmissionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative overflow-hidden group bg-[var(--mn-page)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] rounded-xl px-3 py-2.5 border border-[var(--mn-border)] shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all flex items-center justify-between gap-2 text-start min-w-0"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-5 h-5 rounded-full mn-quick-info-icon-box flex items-center justify-center shrink-0">
                          <BookOpenCheck className="w-3 h-3 text-current" />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug">
                            {publicT('public_undergraduate_admission')}
                          </span>
                          <span className="text-[9px] sm:text-[9.5px] font-medium text-[var(--mn-text-muted)] leading-snug">
                            ({publicT('public_degree_requirements')})
                          </span>
                          <span className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] inline-flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform mr-1">
                            <ExternalLink className="w-2.5 h-2.5 stroke-[2.2] shrink-0" />
                          </span>
                        </div>
                      </div>
                    </a>
                  )}

                  {/* 2. قبول الدراسات العليا */}
                  {university.internationalAdmissions.postgradAdmissionUrl && (
                    <a
                      href={university.internationalAdmissions.postgradAdmissionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative overflow-hidden group bg-[var(--mn-page)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] rounded-xl px-3 py-2.5 border border-[var(--mn-border)] shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all flex items-center justify-between gap-2 text-start min-w-0"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-5 h-5 rounded-full mn-quick-info-icon-box flex items-center justify-center shrink-0">
                          <Scroll className="w-3 h-3 text-current" />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug">
                            {publicT('public_postgraduate_admission')}
                          </span>
                          <span className="text-[9px] sm:text-[9.5px] font-medium text-[var(--mn-text-muted)] leading-snug">
                            ({publicT('public_masters_and_doctorate')})
                          </span>
                          <span className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] inline-flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform mr-1">
                            <ExternalLink className="w-2.5 h-2.5 stroke-[2.2] shrink-0" />
                          </span>
                        </div>
                      </div>
                    </a>
                  )}

                  {/* 3. صفحة الطلاب الدوليين */}
                  {university.internationalAdmissions.internationalStudentsUrl && (
                    <a
                      href={university.internationalAdmissions.internationalStudentsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative overflow-hidden group bg-[var(--mn-page)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] rounded-xl px-3 py-2.5 border border-[var(--mn-border)] shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all flex items-center justify-between gap-2 text-start min-w-0"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-5 h-5 rounded-full mn-quick-info-icon-box flex items-center justify-center shrink-0">
                          <Compass className="w-3 h-3 text-current" />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug">
                            {publicT('public_international_student_and_visa_guide')}
                          </span>
                          <span className="text-[9px] sm:text-[9.5px] font-medium text-[var(--mn-text-muted)] leading-snug">
                            ({publicT('public_international_student_office')})
                          </span>
                          <span className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] inline-flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform mr-1">
                            <ExternalLink className="w-2.5 h-2.5 stroke-[2.2] shrink-0" />
                          </span>
                        </div>
                      </div>
                    </a>
                  )}

                  {/* 4. بوابة التقديم الإلكتروني الرئيسية */}
                  {university.internationalAdmissions.applicationPortalUrl && (
                    <a
                      href={university.internationalAdmissions.applicationPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative overflow-hidden group bg-[var(--mn-page)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] rounded-xl px-3 py-2.5 border border-[var(--mn-border)] shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all flex items-center justify-between gap-2 text-start min-w-0"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-5 h-5 rounded-full mn-quick-info-icon-box flex items-center justify-center shrink-0">
                          <Zap className="w-3 h-3 text-current" />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug">
                            {publicT('public_main_online_application_portal')}
                          </span>
                          <span className="text-[9px] sm:text-[9.5px] font-medium text-[var(--mn-text-muted)] leading-snug">
                            ({publicT('public_university_registration_and_student_account_platform')})
                          </span>
                          <span className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] inline-flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform mr-1">
                            <ExternalLink className="w-2.5 h-2.5 stroke-[2.2] shrink-0" />
                          </span>
                        </div>
                      </div>
                    </a>
                  )}
                </div>

                {/* ملاحظة الأمان والتوثيق */}
                <div className="flex items-center justify-center gap-1.5 pt-0.5 text-[9.5px] sm:text-[10px] font-bold text-[var(--mn-text-muted)]">
                  <div className="w-4 h-4 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-2.5 h-2.5" />
                  </div>
                  <span>{publicT('public_all_portals_take_you_directly_to_the_universitys')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* القسم الخامس: الرسوم الدراسية وتكاليف الدراسة — بدون مربع داخل مربع وبدون خطوط فاصلة وهمية */}
        {university.tuitionFees && (
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:p-6 py-3.5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            {/* خط التزيين العلوي النيلي / الذهبي الموحد */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

            <UniversitySectionHeader
              id="university-tuition"
              icon={Landmark}
              title={publicT('public_5_tuition_and_study_costs')}
              className="mb-3"
            />

            {/* المحتوى الداخلي لقسم الرسوم بعرض 95% مباشر */}
            <div className="space-y-3 font-['Cairo',sans-serif]">
              {/* 1. متوسط الرسوم السنوية العامة والعملة */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-[18px] h-[18px] rounded-[5px] bg-[#142B5F] border border-[#142B5F] text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                      <Landmark className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold text-[var(--mn-heading)] leading-snug">
                      {publicT('public_average_annual_tuition')}
                    </span>
                  </div>

                  {/* شارة العملة المعتمدة كمربع عادي أبيض مثل بقية الأقسام */}
                  {university.tuitionFees.currency && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-[var(--mn-heading)] shadow-2xs shrink-0">
                      <Coins className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                      <span className="text-[9.5px] sm:text-[10px] font-bold text-[var(--mn-heading)] whitespace-nowrap">
                        {publicT('public_currency')} {university.tuitionFees.currency}
                      </span>
                    </div>
                  )}
                </div>

                {/* لوحة القيمة البارزة للرسوم مع أيقونة نيلية بنفس الحجم */}
                {university.tuitionFees.annualAverageTuition && (
                  <div className="rounded-xl px-3 py-2.5 bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                    <div className="text-[11.5px] sm:text-xs font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif] leading-snug">
                      {university.tuitionFees.annualAverageTuition}
                    </div>
                  </div>
                )}

                {/* الملاحظة التوضيحية التفصيلية للرسوم */}
                {university.tuitionFees.generalDescription && (
                  <div className="relative overflow-hidden flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#D6A43B]/20 border border-[#0E7C86]/55 dark:border-[#F2CD78]/55 flex items-center justify-center shrink-0 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#142B5F] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#F2CD78]" />
                    </div>
                    <p className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-relaxed text-justify font-['Cairo',sans-serif]">
                      {university.tuitionFees.generalDescription}
                    </p>
                  </div>
                )}
              </div>

              {/* 2. تفصيل الرسوم حسب الكلية والمرحلة الدراسية (مباشرة بدون إطار خارجي إضافي أو خط فاصل علوي) */}
              {(university.tuitionFees.undergradTuition ||
                university.tuitionFees.medicineTuition ||
                university.tuitionFees.engineeringTuition ||
                university.tuitionFees.postgradTuition) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-[18px] h-[18px] rounded-[5px] bg-[#142B5F] border border-[#142B5F] text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                      <Building2 className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold text-[var(--mn-heading)] leading-snug">
                      {publicT('public_fee_breakdown_by_faculty_and_level')}
                    </span>
                  </div>

                  <div className="rounded-xl border border-[var(--mn-border)] overflow-hidden divide-y divide-[var(--mn-border)] shadow-2xs">
                    {/* 1. رسوم البكالوريوس */}
                    {university.tuitionFees.undergradTuition && (
                      <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-page)] even:bg-[var(--mn-surface)]">
                        <div className="col-span-6 py-2.5 px-3 border-l border-[var(--mn-border)] flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 rounded-full mn-quick-info-icon-box flex items-center justify-center shrink-0">
                            <GraduationCap className="w-3 h-3 text-current" />
                          </div>
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug">
                            {publicT('public_undergraduate_fees')}
                          </span>
                        </div>
                        <div className="col-span-6 py-2.5 px-3 flex items-center justify-center text-center">
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F2CD78] leading-snug">
                            {university.tuitionFees.undergradTuition}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 2. رسوم كلية الطب */}
                    {university.tuitionFees.medicineTuition && (
                      <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-page)] even:bg-[var(--mn-surface)]">
                        <div className="col-span-6 py-2.5 px-3 border-l border-[var(--mn-border)] flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 rounded-full mn-quick-info-icon-box flex items-center justify-center shrink-0">
                            <Stethoscope className="w-3 h-3 text-current" />
                          </div>
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug">
                            {publicT('public_medical_school_fees')}
                          </span>
                        </div>
                        <div className="col-span-6 py-2.5 px-3 flex items-center justify-center text-center">
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F2CD78] leading-snug">
                            {university.tuitionFees.medicineTuition}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 3. رسوم الكليات الهندسية */}
                    {university.tuitionFees.engineeringTuition && (
                      <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-page)] even:bg-[var(--mn-surface)]">
                        <div className="col-span-6 py-2.5 px-3 border-l border-[var(--mn-border)] flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 rounded-full mn-quick-info-icon-box flex items-center justify-center shrink-0">
                            <Wrench className="w-3 h-3 text-current" />
                          </div>
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug">
                            {publicT('public_engineering_faculty_fees')}
                          </span>
                        </div>
                        <div className="col-span-6 py-2.5 px-3 flex items-center justify-center text-center">
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F2CD78] leading-snug">
                            {university.tuitionFees.engineeringTuition}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 4. رسوم الدراسات العليا */}
                    {university.tuitionFees.postgradTuition && (
                      <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-page)] even:bg-[var(--mn-surface)]">
                        <div className="col-span-6 py-2.5 px-3 border-l border-[var(--mn-border)] flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 rounded-full mn-quick-info-icon-box flex items-center justify-center shrink-0">
                            <Award className="w-3 h-3 text-current" />
                          </div>
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug">
                            {publicT('public_postgraduate_fees')}
                          </span>
                        </div>
                        <div className="col-span-6 py-2.5 px-3 flex items-center justify-center text-center">
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F2CD78] leading-snug">
                            {university.tuitionFees.postgradTuition}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. زر جدول الرسوم والتكاليف الرسمي بالجامعة */}
              {university.tuitionFees.officialTuitionUrl && (
                <OfficialInfoLink
                  href={university.tuitionFees.officialTuitionUrl}
                  label={publicT('public_universitys_official_tuition_and_fees_schedule')}
                  icon={<Landmark className="w-3.5 h-3.5" />}
                />
              )}
            </div>
          </div>
        )}

        {/* 6. المنح الدراسية المتاحة (شريط بطاقات أفقي قابل للتمرير) */}
        {university.scholarships && university.scholarships.length > 0 && (
          <section
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:p-6 py-3.5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
            aria-labelledby="university-scholarships"
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

            <UniversitySectionHeader
              id="university-scholarships"
              icon={Award}
              title={publicT('public_6_available_scholarships')}
              className="mb-3"
            />

            {/* شريط البطاقات الأفقي القابل للتمرير (تصميم عرضي متناسق) */}
            <div className="flex items-stretch gap-2.5 overflow-x-auto mn-similar-scroll pb-2 pt-0.5 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3.5 md:overflow-visible md:pb-0">
              {university.scholarships.map((scholarship) => (
                <article
                  key={scholarship.id}
                  onClick={() =>
                    scholarship.platformScholarshipId &&
                    onOpenScholarship?.(scholarship.platformScholarshipId)
                  }
                  className={`relative overflow-hidden w-[290px] sm:w-[315px] md:w-full h-full shrink-0 bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-2xl p-2.5 pr-3 md:p-3.5 flex flex-col justify-between gap-1.5 snap-center transition-all hover:border-[#0E7C86]/55 dark:hover:border-[#F2CD78]/65 mn-panel group ${
                    scholarship.platformScholarshipId ? 'cursor-pointer active:scale-[0.99]' : ''
                  }`}
                >
                  {/* الزاوية الهندسية في بداية المربع (إلى المنتصف فقط) */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 right-0 w-4 h-1/2 rounded-tr-2xl border-t-[3px] border-r-[3.5px] border-[#142B5F] dark:border-[#D6A43B]"
                  />

                  {/* 1. مربع اسم المنحة باللون النيلي البترولي */}
                  <div className="rounded-xl px-2.5 py-2 bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white shadow-2xs flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex flex-col items-start text-start min-w-0 flex-1">
                      <div className="inline-flex items-center gap-1 max-w-full">
                        <h3 className="text-[11px] font-bold text-white leading-snug truncate">
                          {scholarship.name}
                        </h3>
                        {scholarship.platformScholarshipId && (
                          <ArrowUpLeft className="w-3.5 h-3.5 -mt-1 text-[#F2CD78] stroke-[2.5] shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                        )}
                      </div>
                      {scholarship.nameEn && (
                        <span className="text-[9px] font-bold text-white/80 leading-tight mt-0.5 block text-start truncate max-w-full">
                          {scholarship.nameEn}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2. الدولة + نوع التمويل (أيقونة فقط بلون بترولي أفق بدون دائرة) */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 min-w-0 mn-panel">
                      <MapPin className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                      <span className="text-[9.5px] font-bold text-[var(--mn-heading)] truncate">
                        {university.country}
                      </span>
                    </div>

                    {scholarship.type && (
                      <div className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 min-w-0 mn-panel">
                        <Coins className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                        <span className="text-[9.5px] font-bold text-[var(--mn-heading)] truncate">
                          {scholarship.type}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 3. الفئة المستهدفة (أيقونة فقط بلون بترولي أفق بدون دائرة) */}
                  {scholarship.audience && (
                    <div className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 mn-panel min-w-0">
                      <Users className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                      <p className="text-[9.5px] leading-snug text-[var(--mn-text)] font-bold truncate min-w-0 flex-1">
                        <span className="text-[var(--mn-heading)] ml-1">
                          {publicT('public_target_applicants')}
                        </span>
                        <span className="font-semibold text-[var(--mn-text-muted)]">
                          {scholarship.audience}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* 4. ذيل البطاقة: المصدر الرسمي كمربع بلون نيلي بترولي */}
                  <div className="mt-auto pt-1 border-t border-[var(--mn-border)] flex items-center justify-end">
                    <a
                      href={scholarship.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] border border-[#0E7C86]/50 text-white text-[9.5px] sm:text-[10px] font-bold shadow-2xs hover:opacity-95 transition-opacity"
                    >
                      <span>{publicT('public_official_source')}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-white stroke-[2.25] shrink-0" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <UniversityDecisionSections university={university} onOpenExam={onOpenExam} />

        {/* 12. خدمات تساعدك بالتقديم */}
        {contextualServices.length > 0 && (
          <section
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:p-6 py-3.5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

            <UniversitySectionHeader
              icon={Briefcase}
              title={publicT('public_services_that_may_help_during_your_application')}
              level={3}
              className="mb-3"
            />

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 md:gap-3 items-stretch">
              {contextualServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => onOpenService?.(service)}
                  className="relative overflow-hidden group flex items-center justify-between gap-2.5 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] pl-3 pr-3.5 py-2.5 text-start transition-all hover:border-[#0E7C86]/60 dark:hover:border-[#F2CD78]/60 active:scale-[0.99] mn-panel shadow-2xs cursor-pointer"
                >
                  {/* خط بداية المربع بترولي مع نيلي */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] dark:bg-[linear-gradient(180deg,#38C6D4_0%,#0E7C86_75%,#142B5F_100%)]"
                  />

                  <span className="flex items-start gap-2 min-w-0 flex-1 pr-0.5">
                    {/* جوهرة نيلي فقط قبل اسم الخدمة مباشرة */}
                    <span
                      className="mt-1.5 w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] shrink-0"
                      aria-hidden="true"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] group-hover:text-[#0E7C86] dark:group-hover:text-[#F2CD78] transition-colors leading-snug">
                        {service.title}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#142B5F]/[0.06] dark:bg-[#D6A43B]/15 px-2 py-0.5 text-[8.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
                        <span className="w-1 h-1 rounded-full bg-[#D6A43B] dark:bg-[#F2CD78]" />
                        <span>{service.category}</span>
                      </span>
                    </span>
                  </span>

                  <ArrowUpLeft className="h-4 w-4 shrink-0 text-[var(--mn-interactive-arrow)] group-hover:text-[#0E7C86] dark:group-hover:text-[#F2CD78] transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 13. مقالات وأدلة مرتبطة */}
        {university.relatedArticles && university.relatedArticles.length > 0 && (
          <section
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:p-6 py-3.5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

            <UniversitySectionHeader
              icon={BookOpenText}
              title={publicT('public_related_articles_and_guides')}
              level={3}
              className="mb-3"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 items-stretch">
              {university.relatedArticles.map((article) => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => onOpenArticle?.(article.id)}
                  disabled={!onOpenArticle}
                  className="relative overflow-hidden group flex items-center justify-between gap-2.5 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] pl-3 pr-3.5 py-2.5 text-start transition-all enabled:hover:border-[#0E7C86]/60 dark:enabled:hover:border-[#F2CD78]/60 enabled:active:scale-[0.99] mn-panel shadow-2xs cursor-pointer"
                >
                  <span className="absolute top-2 right-0 bottom-2 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#E5B54F]" />
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full mn-sub-item-icon flex items-center justify-center shrink-0">
                      <BookOpenText className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[8px] font-bold text-[#0E7C86] dark:text-[#F2CD78] mb-0.5">
                        <span>{article.typeLabel || publicT('public_article')}</span>
                        {article.category && <span className="text-[var(--mn-text-muted)]">• {article.category}</span>}
                      </div>
                      <p className="text-[10px] sm:text-[10.5px] font-bold leading-snug text-[var(--mn-heading)] group-hover:text-[#0E7C86] dark:group-hover:text-[#F2CD78] transition-colors line-clamp-2">
                        {article.title}
                      </p>
                      {article.meta && (
                        <p className="mt-0.5 line-clamp-1 text-[8.5px] font-semibold text-[var(--mn-text-muted)]">
                          {article.meta}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <ArrowUpLeft className="h-3 w-3 shrink-0 stroke-[2.25]" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 14. أزرار الإجراءات السفلية (مشاركة وحفظ الجامعة — متطابقة مع قسم المنح) */}
        <div className="px-2.5 sm:px-3 pt-2 pb-2 flex justify-center gap-3 w-full">
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href).catch(() => {});
              }
              showToast('تم نسخ رابط الجامعة للمشاركة');
            }}
            className="py-2.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer bg-[var(--mn-surface)] text-[var(--mn-heading)] border border-[#D6A43B]/60 dark:border-[#F2CD78]/50 hover:border-[#D6A43B] dark:hover:border-[#F2CD78] flex-1 max-w-[170px] text-xs font-bold mn-panel"
          >
            <span>مشاركة الجامعة</span>
            <Share2 className="w-4 h-4 text-[#D6A43B] dark:text-[#F2CD78]" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              onToggleSave?.(e);
              showToast(isSaved ? 'تمت إزالة الجامعة من المفضلة' : 'تم حفظ الجامعة في المفضلة');
            }}
            className="py-2.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer flex-1 max-w-[170px] bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white border border-[#D6A43B]/65 text-xs font-bold"
          >
            <span>{isSaved ? 'محفوظة بالمفضلة' : 'حفظ الجامعة'}</span>
            <Bookmark
              className={`w-4 h-4 ${isSaved ? 'fill-[#F2CD78] text-[#F2CD78]' : 'text-[#F2CD78]'}`}
            />
          </button>
        </div>
        </>
        )}
      </div>

      {actionToast && (
        <div className="fixed bottom-6 inset-x-4 max-w-xs mx-auto bg-[var(--mn-primary)] text-white px-4 py-2 rounded-full shadow-2xl z-50 flex items-center justify-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 mn-inverse">
          <Check className="w-3.5 h-3.5 text-[var(--mn-accent-text)]" />
          <span>{actionToast}</span>
        </div>
      )}
    </div>
  );
};

function UniversitySectionHeader({
  id,
  icon: Icon,
  title,
  level = 2,
  className = 'mb-3',
}: {
  id?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  level?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <DetailSectionHeader
      id={id}
      title={title}
      level={level}
      className={className}
      iconClassName="mn-icon-mix02"
      iconNode={
        <>
          <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-md" />
          <Icon className="h-4 w-4 relative z-10 text-[#F2CD78]" />
        </>
      }
    />
  );
}

function UniversityDecisionSections({
  university,
  onOpenExam,
}: {
  university: University;
  onOpenExam?: (examId: string) => void;
}) {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  const language = university.languageRequirements;
  const documents = university.documentRequirements;
  const housing = university.housing;
  const livingCosts = university.livingCosts;
  const contacts = university.officialContacts;
  const dataTrust = university.dataTrust;

  return (
    <div className="space-y-2.5 md:space-y-4" dir={publicDir}>
      {/* 7. متطلبات اللغة — بدون مربع داخل مربع وبعرض 95% */}
      {language && (
        <section
          className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:p-6 py-3.5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
          aria-labelledby="language-requirements"
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

          <UniversitySectionHeader
            id="language-requirements"
            icon={Languages}
            title={publicT('public_7_language_requirements')}
            className="mb-3"
          />

          <div className="space-y-3">
            {/* 1. حالة متطلبات اللغة واللغة المطلوبة */}
            <div className="grid grid-cols-2 gap-2">
              <CompactFact
                label={publicT('public_are_there_language_requirements')}
                value={language.required ? publicT('public_yes') : publicT('public_no')}
                badge="navy-petrol-bars"
              />
              <CompactFact
                label={publicT('public_required_language')}
                value={language.languages.join('، ')}
                badge="navy-petrol-bars"
              />
            </div>

            {/* 2. الاختبارات المعتمدة (مباشرة بعرض 95% بدون إطار خارجي مكرر) */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="w-[18px] h-[18px] rounded-[5px] bg-[#142B5F] border border-[#142B5F] text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                  <BookOpenCheck className="w-2.5 h-2.5 text-white" />
                </div>
                <p className="text-[11px] sm:text-xs font-bold text-[var(--mn-heading)] leading-snug">
                  {publicT('public_accepted_exams')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(language.acceptedTestLinks?.length ? language.acceptedTestLinks : language.acceptedTests.map(label => ({ label, examId: undefined }))).map((test) => {
                  const { label, examId } = test;

                  return examId ? (
                    <button
                      type="button"
                      key={label}
                      onClick={() => test.examId && onOpenExam?.(test.examId)}
                      className="bg-[var(--mn-page)] rounded-xl border border-[#142B5F]/20 dark:border-[var(--mn-border)] hover:border-[#0E7C86]/65 dark:hover:border-[#F2CD78]/65 px-2.5 py-2 shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all flex items-center gap-1.5 text-start cursor-pointer group min-w-0"
                      title={publicT('public_open_page_title', { v0: label })}
                    >
                      {/* نقطة نيلي فقط */}
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78] shrink-0"
                        aria-hidden="true"
                      />
                      <span className="inline-flex items-center gap-1 min-w-0 flex-wrap">
                        <span className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug break-words" dir="ltr">
                          {label}
                        </span>
                        <ArrowUpLeft className="w-3.5 h-3.5 -mt-1 text-[#0E7C86] dark:text-[#F2CD78] stroke-[2.5] opacity-95 group-hover:opacity-100 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                      </span>
                    </button>
                  ) : (
                    <div
                      key={label}
                      className="bg-[var(--mn-page)] rounded-xl border border-[var(--mn-border)] px-2.5 py-2 shadow-2xs flex items-center gap-1.5 min-w-0"
                    >
                      {/* نقطة نيلي فقط */}
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78] shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug break-words" dir="ltr">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. الرابط الرسمي لمتطلبات اللغة */}
            <OfficialInfoLink
              href={language.officialUrl}
              label={publicT('public_official_language_requirements')}
              icon={<Languages className="w-3.5 h-3.5" />}
            />
          </div>
        </section>
      )}

      {/* 8. المستندات المطلوبة للتقديم — بدون مربع داخل مربع وبعرض 95% */}
      {documents && (
        <section
          className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:p-6 py-3.5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
          aria-labelledby="required-documents-title"
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

          <UniversitySectionHeader
            id="required-documents-title"
            icon={FileText}
            title={publicT('public_8_required_documents')}
            className="mb-3"
          />

          <div className="space-y-3">
            <DocumentList
              title={publicT('public_general_required_documents')}
              items={documents.generalDocuments}
              headerIcon={<FileText className="w-2.5 h-2.5 text-white" />}
              variant="petrol-dot"
            />

            <DocumentList
              title={publicT('public_additional_postgraduate_requirements')}
              items={documents.graduateAdditionalDocuments}
              headerIcon={<GraduationCap className="w-2.5 h-2.5 text-white" />}
              variant="petrol-dot"
            />

            <OfficialInfoLink
              href={documents.officialUrl}
              label={publicT('public_official_required_documents_guide')}
              icon={<FileText className="w-3.5 h-3.5" />}
            />
          </div>
        </section>
      )}

      {/* 9. السكن الجامعي — بدون مربع داخل مربع وبعرض 95% */}
      {housing && (
        <section
          className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:p-6 py-3.5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
          aria-labelledby="university-housing"
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

          <UniversitySectionHeader
            id="university-housing"
            icon={Building2}
            title={publicT('public_9_university_accommodation')}
            className="mb-3"
          />

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <CompactFact
                label={publicT('public_is_accommodation_available')}
                value={housing.available ? publicT('public_yes') : publicT('public_no')}
                badge="navy-petrol-bars"
              />
              <CompactFact
                label={publicT('public_international_students')}
                value={housing.internationalStudentsEligible ? publicT('public_eligible') : publicT('public_ineligible')}
                badge="navy-petrol-bars"
              />
              <CompactFact
                label={publicT('public_typical_cost')}
                value={housing.typicalCost}
                badge="navy-petrol-bars"
              />
              <CompactFact
                label={publicT('public_currency_2')}
                value={housing.currency}
                badge="navy-petrol-bars"
              />
            </div>

            {housing.officialUrl && (
              <OfficialInfoLink
                href={housing.officialUrl}
                label={publicT('public_official_university_accommodation_guide')}
                icon={<Building2 className="w-3.5 h-3.5" />}
              />
            )}
          </div>
        </section>
      )}

      {/* 10. تكاليف المعيشة — بدون مربع داخل مربع وبعرض 95% */}
      {livingCosts && (
        <section
          className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:p-6 py-3.5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
          aria-labelledby="university-living-costs-title"
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

          <UniversitySectionHeader
            id="university-living-costs-title"
            icon={Banknote}
            title={publicT('public_10_living_costs')}
            className="mb-3"
          />

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <CompactFact
                label={publicT('public_estimated_monthly_cost')}
                value={livingCosts.monthlyEstimate}
                icon={<Coins className="w-4 h-4 sm:w-[17px] sm:h-[17px] text-[#142B5F] dark:text-[#F2CD78]" />}
              />
              <CompactFact
                label={publicT('public_currency_2')}
                value={livingCosts.currency}
                icon={<Banknote className="w-4 h-4 sm:w-[17px] sm:h-[17px] text-[#142B5F] dark:text-[#F2CD78]" />}
              />
            </div>

            {livingCosts.variationNote && (
              <div className="relative overflow-hidden flex items-start gap-2 bg-[var(--mn-page)] rounded-xl py-2.5 pl-3 pr-3.5 border border-[var(--mn-border)] shadow-2xs">
                {/* خط عمودي مميز في بداية المربع */}
                <span className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#38C6D4]" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#D6A43B]/20 border border-[#0E7C86]/55 dark:border-[#F2CD78]/55 flex items-center justify-center shrink-0 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#142B5F] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#F2CD78]" />
                </div>
                <p className="text-[10px] sm:text-[10.5px] font-bold leading-relaxed text-[var(--mn-text)]">
                  {livingCosts.variationNote}
                </p>
              </div>
            )}

            {livingCosts.officialUrl && (
              <OfficialInfoLink
                href={livingCosts.officialUrl}
                label={publicT('public_official_living_cost_information_and_guide')}
                icon={<Banknote className="w-3.5 h-3.5" />}
              />
            )}
          </div>
        </section>
      )}

      {/* 11. بيانات التواصل والروابط الرسمية — بدون مربع داخل مربع وبعرض 95% */}
      {contacts && (
        <section
          className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:p-6 py-3.5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
          aria-labelledby="university-contacts"
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

          <UniversitySectionHeader
            id="university-contacts"
            icon={Phone}
            title={publicT('public_11_contact_details_and_official_links')}
            className="mb-3"
          />

          <div className="flex flex-col gap-3">
            {/* Primary Contact Channels: 4 full-width rows formatted as two compartments with a divider */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="w-[18px] h-[18px] rounded-[5px] bg-[#142B5F] border border-[#142B5F] text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                  <Building2 className="w-2.5 h-2.5 text-white" />
                </div>
                <p className="text-[11px] sm:text-xs font-bold text-[var(--mn-heading)] leading-snug">
                  قنوات التواصل والجهات الرسمية
                </p>
              </div>

              <div className="flex flex-col md:grid md:grid-cols-2 gap-2 md:gap-3">
                {contacts.phone && (
                  <ReferenceLink
                    href={`tel:${contacts.phone.replace(/\s/g, '')}`}
                    label={publicT('public_official_phone_number')}
                    value={contacts.phone}
                    ltrValue
                  />
                )}
                <ReferenceLink
                  href={contacts.officialWebsite}
                  label={publicT('public_official_website')}
                  value={getUrlDisplayHost(contacts.officialWebsite)}
                  ltrValue
                />
                {contacts.mainSocial && (
                  <ReferenceLink
                    href={contacts.mainSocial.url}
                    label={publicT('public_social_media')}
                    value={contacts.mainSocial.label}
                  />
                )}
                {contacts.governmentRegister && (
                  <ReferenceLink
                    href={contacts.governmentRegister.url}
                    label={publicT('public_official_organization')}
                    value={contacts.governmentRegister.label}
                    ltrValue
                  />
                )}
              </div>
            </div>

            {/* Official Useful Links */}
            {contacts.usefulLinks && contacts.usefulLinks.length > 0 && (
              <div className="flex flex-col gap-2">
                {contacts.usefulLinks.map((link) => (
                  <OfficialInfoLink
                    key={link.url}
                    href={link.url}
                    label={link.label}
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                  />
                ))}
              </div>
            )}

            {/* Data Trust Verification Box */}
            {dataTrust && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] px-3 py-2.5 text-[9.5px] font-bold shadow-2xs mn-panel">
                <span className="flex items-center gap-1.5 text-[var(--mn-heading)]">
                  <span className="w-4 h-4 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-2.5 w-2.5" />
                  </span>
                  <span>
                    {publicT('public_last_information_verification')}{' '}
                    <span className="text-[var(--mn-text-muted)]">{dataTrust.lastVerified}</span>
                  </span>
                </span>
                <a
                  href={dataTrust.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#142B5F] dark:text-[#F2CD78] hover:underline"
                >
                  <span>
                    {publicT('public_source')} {dataTrust.sourceLabel}
                  </span>
                  <ArrowUpLeft className="h-3 w-3 shrink-0 text-[var(--mn-interactive-arrow)]" />
                </a>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function getUrlDisplayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function ReferenceLink({
  href,
  label,
  value,
  ltrValue = false,
}: {
  href: string;
  label: string;
  value: string;
  icon?: React.ReactNode;
  ltrValue?: boolean;
}) {
  return (
    <a
      href={href}
      target={href.startsWith('tel:') ? undefined : '_blank'}
      rel={href.startsWith('tel:') ? undefined : 'noopener noreferrer'}
      className="relative overflow-hidden group grid grid-cols-12 items-stretch rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] transition-all hover:border-[#0E7C86]/60 dark:hover:border-[#F2CD78]/60 active:scale-[0.99] shadow-2xs min-w-0"
    >
      {/* خط بداية المربع بشكل أوضح باللون البترولي والنيلي */}
      <span className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#153B75] to-[#0E7C86] dark:from-[#F2CD78] dark:to-[#38C6D4]" />

      {/* المربع الأول: العنوان باللون النيلي */}
      <div className="col-span-5 py-2.5 pr-3.5 pl-2.5 border-l border-[var(--mn-border)] flex items-center min-w-0">
        <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F2CD78] leading-snug">
          {label}
        </span>
      </div>

      {/* المربع الثاني (بعد الفاصل): القيمة بوضوح مع سهم التنقل */}
      <div className="col-span-7 py-2.5 px-3 bg-[var(--mn-surface)]/55 flex items-center justify-between gap-1.5 min-w-0">
        <span
          dir={ltrValue ? 'ltr' : undefined}
          className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F2CD78] leading-snug truncate"
        >
          {value}
        </span>
        <ArrowUpLeft className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#F2CD78] stroke-[2.25] transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </a>
  );
}

function CompactFact({
  label,
  value,
  icon,
  badge,
  highlight = false,
  variant = 'default',
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  badge?: 'navy-check' | 'navy-petrol-bars';
  highlight?: boolean;
  variant?: 'default' | 'navy-petrol';
}) {
  const isNavyPetrol = variant === 'navy-petrol';
  return (
    <div
      className={`rounded-xl p-2.5 shadow-2xs flex flex-col items-start justify-center min-w-0 ${
        isNavyPetrol
          ? 'bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] border border-[#0E7C86]/50 text-white'
          : highlight
          ? 'bg-[#D6A43B]/[0.08] dark:bg-[#D6A43B]/15 border border-[#D6A43B]/45'
          : 'bg-[var(--mn-page)] border border-[var(--mn-border)]'
      }`}
    >
      {/* الصف العلوي: الأيقونة مقابل العنوان بخط أكبر وواضح */}
      <div className="flex items-center gap-1.5 min-w-0 w-full">
        {isNavyPetrol ? (
          icon ? (
            <div className="shrink-0 text-white">{icon}</div>
          ) : (
            <span className="inline-flex items-center gap-0.5 shrink-0" aria-hidden="true">
              <span className="w-1 h-3.5 rounded-full bg-white" />
              <span className="w-1 h-2.5 rounded-full bg-[#38C6D4]" />
            </span>
          )
        ) : badge === 'navy-petrol-bars' ? (
          <span className="inline-flex items-center gap-0.5 shrink-0" aria-hidden="true">
            <span className="w-1 h-3.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
            <span className="w-1 h-2.5 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
          </span>
        ) : badge === 'navy-check' ? (
          <div className="w-4 h-4 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 flex items-center justify-center shrink-0 shadow-2xs">
            <Check className="w-2.5 h-2.5 text-[#F2CD78] stroke-[2.5]" />
          </div>
        ) : (
          icon && <div className="shrink-0">{icon}</div>
        )}
        <span
          className={`text-[10.5px] sm:text-[11px] font-bold leading-snug truncate ${
            isNavyPetrol ? 'text-white' : 'text-[var(--mn-heading)]'
          }`}
        >
          {label}
        </span>
      </div>

      {/* القيمة بالأسفل بحجم متوازن وفي الوسط */}
      <span
        className={`w-full text-center text-[9.5px] sm:text-[10px] font-bold leading-snug mt-1 ${
          isNavyPetrol
            ? 'text-white font-extrabold'
            : highlight
            ? 'text-[#B8841E] dark:text-[#F2CD78]'
            : 'text-[var(--mn-text-muted)]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function DocumentList({
  title,
  items,
  headerIcon,
  variant = 'gold-dot',
}: {
  title: string;
  items: string[];
  headerIcon?: React.ReactNode;
  variant?: 'gold-dot' | 'petrol-dot';
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <div className="w-[18px] h-[18px] rounded-[5px] bg-[#142B5F] border border-[#142B5F] text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
          {headerIcon ?? <FileText className="w-2.5 h-2.5 text-white" />}
        </div>
        <h3 className="text-[11px] sm:text-xs font-bold text-[var(--mn-heading)] leading-snug">
          {title}
        </h3>
      </div>

      <ul className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="bg-[var(--mn-page)] rounded-xl border border-[var(--mn-border)] px-2.5 py-2 shadow-2xs flex items-start gap-2 min-w-0"
          >
            {variant === 'gold-dot' ? (
              <div className="w-3.5 h-3.5 rounded-full bg-[#D6A43B]/15 dark:bg-[#D6A43B]/20 border border-[#D6A43B]/55 dark:border-[#F2CD78]/50 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D6A43B] dark:bg-[#F2CD78]" />
              </div>
            ) : (
              <div className="w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#D6A43B]/20 border border-[#0E7C86]/55 dark:border-[#F2CD78]/55 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#142B5F] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#F2CD78]" />
              </div>
            )}
            <span className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-snug">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OfficialInfoLink({
  href,
  label,
}: {
  href?: string;
  label: string;
  icon?: React.ReactNode;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="relative overflow-hidden w-full rounded-xl py-2.5 pl-2.5 pr-0 bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/60 dark:hover:border-[#F2CD78]/60 shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all flex items-center justify-between gap-2 group cursor-pointer mn-panel"
    >
      {/* الخط الهندسي باللون النيلي على الزاوية اليمنى متناسق مع حجم المربعات */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 w-3.5 h-[75%] rounded-tr-xl border-t-[3px] border-r-[3.5px] border-[#142B5F] dark:border-[#38C6D4]"
      />

      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* خط نيلي خفيف يخرج من قلب الخط الهندسي وينتهي برأس سهم ذهبي يشير إلى الكلمة */}
        <svg
          viewBox="0 0 36 20"
          className="w-7 h-4 shrink-0 -mr-[1px]"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M 35 2 L 35 10 L 8 10"
            stroke="#142B5F"
            className="dark:stroke-[#38C6D4]"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="26" cy="10" r="1.6" fill="#142B5F" className="dark:fill-[#38C6D4]" />
          <polygon
            points="1.5,10 10.5,5.2 8.6,10 10.5,14.8"
            fill="#D6A43B"
            stroke="#B8841E"
            strokeWidth="0.6"
          />
        </svg>

        <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug text-start">
          {label}
        </span>

        {/* أيقونة التنقل قريبة ومباشرة بجانب الكلام */}
        <span className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] inline-flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform mr-1">
          <ExternalLink className="w-2.5 h-2.5 stroke-[2.25] shrink-0" />
        </span>
      </div>
    </a>
  );
}
