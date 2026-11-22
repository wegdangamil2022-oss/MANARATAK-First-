import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import {
  ArrowUpLeft,
  Award,
  Banknote,
  BookOpen,
  BookOpenCheck,
  BookOpenText,
  Bookmark,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Compass,
  ExternalLink,
  FileCheck,
  FileText,
  Globe,
  Globe2,
  GraduationCap,
  Heart,
  History,
  Home,
  Info,
  Landmark,
  Languages,
  Layers,
  MapPin,
  Medal,
  Phone,
  School,
  ScrollText,
  Send,
  Share2,
  ShieldCheck,
  Stethoscope,
  Trophy,
  UserCheck,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { PublishedUniversityDetails } from './PublishedUniversityDetails';
import { Service, University } from '../types';
import { DetailBackButton, useDetailSearchTarget } from './DetailUi';

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

const SECTION_CARD_CLASS =
  'relative w-full bg-white dark:bg-[#111E38] rounded-2xl p-3.5 sm:p-4 md:p-5 border border-[#142B5F]/10 dark:border-white/10 shadow-[0_2px_14px_rgba(20,43,95,0.045)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.25)] overflow-hidden mn-panel';

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
      className="w-full max-w-md md:max-w-[1120px] lg:max-w-[1160px] mx-auto pt-0 pb-12 text-start font-['Cairo',sans-serif] animate-in fade-in duration-200 bg-[#F6F8FA] dark:bg-[#0A1326] min-h-screen relative mn-panel mn-university-detail"
      dir={publicDir}
    >
      {/* 1. TOP HERO BANNER (Navy Right -> Petrol Left with Glassmorphic University Crest & Champagne Hairline) */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute top-2.5 left-2.5 md:top-3.5 md:left-4 z-30 flex flex-col md:flex-row items-center gap-1.5 md:gap-2 scale-85 md:scale-100 origin-top-left">
          <DetailBackButton onBack={onClose} mode="back" />
          <button
            type="button"
            onClick={(e) => {
              onToggleSave?.(e);
              showToast(isSaved ? 'تمت إزالة الجامعة من المفضلة' : 'تم حفظ الجامعة في المفضلة');
            }}
            className="mn-detail-close transition-all active:scale-95 cursor-pointer"
            aria-label={isSaved ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            title={isSaved ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          >
            <Heart
              className={`h-3.5 w-3.5 md:h-4 md:w-4 ${
                isSaved
                  ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#34BFC9] dark:text-[#34BFC9]'
                  : 'text-[#142B5F] dark:text-[#EDF5F5]'
              }`}
            />
          </button>
        </div>

        {/* SVG Hero Background: Manaratak Navy (#142B5F) Right -> Petrol (#0E7C86) Left */}
        <div className="relative w-full h-[116px] sm:h-[124px] md:h-[146px]">
          <svg
            viewBox="0 0 500 116"
            preserveAspectRatio="none"
            className="w-full h-full absolute inset-0 block"
          >
            <defs>
              <linearGradient id="uniHeroNavyRight" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#142B5F" />
                <stop offset="52%" stopColor="#153B75" />
                <stop offset="100%" stopColor="#0E7C86" />
              </linearGradient>
            </defs>

            {/* Curved architectural hero surface */}
            <path d="M 0,0 L 500,0 L 500,92 Q 250,112 0,92 Z" fill="url(#uniHeroNavyRight)" />

            {/* Subtle champagne architectural curves */}
            <g opacity="0.18">
              <path
                d="M -50,30 Q 120,-10 260,35 T 550,20"
                stroke="#DEC58E"
                strokeWidth="1.25"
                fill="none"
              />
              <path
                d="M -30,62 Q 150,22 320,56 T 560,36"
                stroke="#DEC58E"
                strokeWidth="0.9"
                fill="none"
              />
              <circle cx="40" cy="24" r="1.4" fill="#DEC58E" />
              <circle cx="56" cy="18" r="1" fill="#DEC58E" />
              <circle cx="448" cy="22" r="1.4" fill="#DEC58E" />
              <circle cx="462" cy="36" r="1" fill="#DEC58E" />
            </g>

            {/* Refined hairline champagne bottom curve */}
            <path
              d="M 0,92 Q 250,112 500,92"
              fill="none"
              stroke="#DEC58E"
              strokeOpacity="0.65"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>

          {/* Hero Content: Glassmorphic Institutional Crest + University Name */}
          <div
            className="absolute inset-0 flex items-center gap-3 md:gap-4 px-4 sm:px-6 md:px-8 pt-1 pb-4 z-10"
            dir={publicDir}
          >
            {/* Glassmorphic University Crest (Navy + Muted Champagne) */}
            <div className="w-11 h-11 md:w-14 md:h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-[#DEC58E]/45 flex items-center justify-center shadow-[0_6px_18px_rgba(0,0,0,0.18)] shrink-0">
              <Landmark className="w-5.5 h-5.5 md:w-7 md:h-7 text-[#DEC58E]" strokeWidth={1.85} />
            </div>

            {/* University Title & Knowledge Mist English Subtitle */}
            <div className="flex flex-col text-start min-w-0 flex-1 pl-8 sm:pl-9 md:pl-16">
              <h1
                className="text-[14.5px] sm:text-[15.5px] md:text-xl lg:text-2xl font-bold text-white leading-snug truncate drop-shadow-2xs"
                data-mn-design="827f35e03a"
              >
                {university.name}
              </h1>
              <p className="text-[10px] sm:text-[11px] md:text-xs font-semibold text-[#DDEFF2] font-['Cairo',sans-serif] mt-0.5 tracking-wide truncate">
                {university.nameEn}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT WRAPPER */}
      <div
        className="px-2.5 sm:px-3 md:px-4 space-y-3.5 md:space-y-4.5 z-20 relative -mt-3"
        dir={publicDir}
      >
        {/* 2. TOP SUMMARY STRIP: OFFICIAL PORTAL BAR + 2x2 QUICK FACTS GRID */}
        <div className="space-y-2.5 md:space-y-3" dir={publicDir}>
          {/* Dedicated Official University Portal Card (Hero Anchor Card) */}
          {university.websiteUrl ? (
            <a
              href={university.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-full bg-white dark:bg-[#111E38] rounded-2xl py-3 md:py-3.5 px-3.5 sm:px-4 md:px-5 border border-[#142B5F]/10 dark:border-white/10 shadow-[0_4px_16px_rgba(20,43,95,0.06)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.28)] hover:border-[#0E7C86]/45 dark:hover:border-[#34BFC9]/45 active:scale-[0.99] transition-all flex items-center justify-between gap-3 group overflow-hidden mn-panel"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-3 right-0 bottom-3 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#34BFC9] dark:to-[#DEC58E]"
              />
              <div className="flex items-center gap-3 md:gap-3.5 min-w-0 flex-1">
                <div className="relative w-9.5 h-9.5 md:w-10.5 md:h-10.5 rounded-xl bg-gradient-to-br from-[#142B5F] to-[#114870] flex items-center justify-center shrink-0 shadow-[0_3px_10px_rgba(20,43,95,0.18)] group-hover:from-[#0E7C86] group-hover:to-[#21A7B4] transition-all">
                  <Globe className="w-4.5 h-4.5 md:w-5 md:h-5 text-white transition-colors" />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-[#21A7B4] ring-2 ring-white dark:ring-[#111E38]"
                  />
                </div>

                <div className="w-px h-7 md:h-8 bg-[#142B5F]/12 dark:bg-white/12 shrink-0" />

                <div className="min-w-0 flex-1 text-start">
                  <span className="block text-[11.5px] sm:text-xs md:text-[13.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-tight truncate">
                    {publicT('public_official_university_website')}
                  </span>
                  <span
                    dir="ltr"
                    className="inline-block text-[9.5px] sm:text-[10.5px] font-semibold text-[#0E7C86] dark:text-[#7FD4DE] mt-0.5 truncate max-w-full"
                  >
                    {getUrlDisplayHost(university.websiteUrl)}
                  </span>
                </div>
              </div>

              <span className="w-7.5 h-7.5 md:w-8 md:h-8 rounded-full bg-[#DDEFF2]/90 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/25 text-[#0E7C86] dark:text-[#34BFC9] group-hover:bg-[#142B5F] group-hover:border-[#142B5F] group-hover:text-white group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
            </a>
          ) : (
            <div className="relative w-full bg-white dark:bg-[#111E38] rounded-2xl py-3 px-3.5 sm:px-4 border border-[#142B5F]/10 dark:border-white/10 shadow-[0_2px_10px_rgba(20,43,95,0.035)] flex items-center gap-3 opacity-85 mn-panel">
              <div className="w-9 h-9 rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529] text-[#5C707C] dark:text-[#9BB4C7] flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-[#5C707C] dark:text-[#9BB4C7] leading-tight">
                {publicT('public_official_website_unavailable')}
              </span>
            </div>
          )}

          {/* 2x2 Quick Info Grid (Dual-Tone Navy + Petrol Architectural Icons) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3" dir={publicDir}>
            {/* 1. دولة ومدينة الدراسة (Clickable Country Navigation) */}
            <button
              type="button"
              onClick={() =>
                (university.countryReferenceId || university.country) &&
                onOpenCountry?.(university.countryReferenceId || university.country)
              }
              className="bg-white dark:bg-[#111E38] rounded-2xl p-2.5 md:p-3.5 border border-[#142B5F]/12 dark:border-white/10 shadow-[0_2px_10px_rgba(20,43,95,0.035)] flex items-center gap-2 md:gap-2.5 min-w-0 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45 hover:shadow-[0_4px_14px_rgba(20,43,95,0.07)] active:scale-[0.99] transition-all text-start group cursor-pointer mn-panel"
              title={publicT('public_explore_study_country', { v0: university.country })}
            >
              <div className="relative w-8.5 h-8.5 md:w-10 md:h-10 rounded-xl bg-[#DDEFF2]/80 dark:bg-[#0E7C86]/20 border border-[#142B5F]/18 dark:border-[#34BFC9]/30 text-[#0E7C86] dark:text-[#34BFC9] group-hover:bg-[#142B5F] group-hover:border-[#142B5F] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                <MapPin className="w-4 h-4 md:w-4.5 md:h-4.5" />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#142B5F] group-hover:bg-[#21A7B4] transition-colors"
                />
              </div>
              <div className="flex flex-col min-w-0 text-start flex-1">
                <span className="text-[10px] sm:text-[10.5px] font-semibold text-[#5C707C] dark:text-[#9BB4C7] leading-tight truncate">
                  {publicT('public_study_country')}
                </span>
                <span className="text-[10.5px] sm:text-[11px] md:text-xs font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-snug mt-0.5 line-clamp-2">
                  {university.country}
                  {university.city ? publicT('public_city_suffix', { v0: university.city }) : ''}
                </span>
              </div>
              <span className="w-6 h-6 md:w-6.5 md:h-6.5 rounded-full bg-[#DDEFF2]/90 dark:bg-[#0E7C86]/25 border border-[#0E7C86]/25 text-[#0E7C86] dark:text-[#34BFC9] group-hover:bg-[#0E7C86] group-hover:text-white group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                <ArrowUpLeft className="w-3.25 h-3.25 md:w-3.5 md:h-3.5 stroke-[2.4]" />
              </span>
            </button>

            {/* 2. ملكية الجامعة */}
            <div className="bg-white dark:bg-[#111E38] rounded-2xl p-2.5 md:p-3.5 border border-[#142B5F]/10 dark:border-white/10 shadow-[0_2px_10px_rgba(20,43,95,0.035)] flex items-center gap-2 md:gap-2.5 min-w-0 mn-panel">
              <div className="relative w-8.5 h-8.5 md:w-10 md:h-10 rounded-xl bg-[#142B5F]/[0.06] dark:bg-white/[0.07] border border-[#142B5F]/14 dark:border-white/12 text-[#142B5F] dark:text-[#7FD4DE] flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 md:w-4.5 md:h-4.5" />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#34BFC9]"
                />
              </div>
              <div className="flex flex-col min-w-0 text-start flex-1">
                <span className="text-[10px] sm:text-[10.5px] font-semibold text-[#5C707C] dark:text-[#9BB4C7] leading-tight truncate">
                  ملكية الجامعة
                </span>
                <span className="text-[10.5px] sm:text-[11px] md:text-xs font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-snug mt-0.5 truncate">
                  {university.ownership || publicT('public_not_specified_2')}
                </span>
              </div>
            </div>

            {/* 3. نوع المؤسسة */}
            <div className="bg-white dark:bg-[#111E38] rounded-2xl p-2.5 md:p-3.5 border border-[#142B5F]/10 dark:border-white/10 shadow-[0_2px_10px_rgba(20,43,95,0.035)] flex items-center gap-2 md:gap-2.5 min-w-0 mn-panel">
              <div className="relative w-8.5 h-8.5 md:w-10 md:h-10 rounded-xl bg-[#142B5F]/[0.06] dark:bg-white/[0.07] border border-[#142B5F]/14 dark:border-white/12 text-[#142B5F] dark:text-[#7FD4DE] flex items-center justify-center shrink-0">
                <School className="w-4 h-4 md:w-4.5 md:h-4.5" />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#34BFC9]"
                />
              </div>
              <div className="flex flex-col min-w-0 text-start flex-1">
                <span className="text-[10px] sm:text-[10.5px] font-semibold text-[#5C707C] dark:text-[#9BB4C7] leading-tight truncate">
                  نوع المؤسسة
                </span>
                <span className="text-[10.5px] sm:text-[11px] md:text-xs font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-snug mt-0.5 truncate">
                  {university.type || publicT('public_not_specified_2')}
                </span>
              </div>
            </div>

            {/* 4. سنة التأسيس */}
            <div className="bg-white dark:bg-[#111E38] rounded-2xl p-2.5 md:p-3.5 border border-[#142B5F]/10 dark:border-white/10 shadow-[0_2px_10px_rgba(20,43,95,0.035)] flex items-center gap-2 md:gap-2.5 min-w-0 mn-panel">
              <div className="relative w-8.5 h-8.5 md:w-10 md:h-10 rounded-xl bg-[#142B5F]/[0.06] dark:bg-white/[0.07] border border-[#142B5F]/14 dark:border-white/12 text-[#142B5F] dark:text-[#7FD4DE] flex items-center justify-center shrink-0">
                <History className="w-4 h-4 md:w-4.5 md:h-4.5" />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#34BFC9]"
                />
              </div>
              <div className="flex flex-col min-w-0 text-start flex-1">
                <span className="text-[10px] sm:text-[10.5px] font-semibold text-[#5C707C] dark:text-[#9BB4C7] leading-tight truncate">
                  سنة التأسيس
                </span>
                <span className="text-[10.5px] sm:text-[11px] md:text-xs font-bold text-[#142B5F] dark:text-[#F1F5F9] tabular-nums leading-snug mt-0.5 truncate">
                  {university.foundationYear || publicT('public_not_specified_2')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. DETAIL SECTIONS */}
        {university.publishedData ? (
          <PublishedUniversityDetails
            university={university}
            onOpenMajor={onOpenMajor}
            onOpenExam={onOpenExam}
          />
        ) : (
          <>
            {/* القسم الأول: نبذة عن الجامعة */}
            <section className={SECTION_CARD_CLASS} dir={publicDir} aria-labelledby="university-about">
              <UniversitySectionHeader
                id="university-about"
                icon={BookOpen}
                title={publicT('public_1_university_overview')}
              />

              <div className="relative overflow-hidden rounded-xl bg-[#F6F9FB] dark:bg-[#0B1529]/70 border border-[#142B5F]/8 dark:border-white/8 pl-3.5 pr-4 py-3 md:p-4 text-start">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#34BFC9] dark:to-[#DEC58E]" />
                <p className="text-[11.5px] sm:text-xs font-semibold text-[#203442] dark:text-[#DCE7F0] leading-[1.95] text-justify font-['Cairo',sans-serif] whitespace-pre-line pr-1">
                  {university.description}
                </p>
              </div>
            </section>

            {/* القسم الثاني: التصنيفات العالمية والاعتمادات الأكاديمية */}
            {university.rankings && university.rankings.length > 0 && (
              <section
                className={SECTION_CARD_CLASS}
                dir={publicDir}
                aria-labelledby="university-rankings"
              >
                <UniversitySectionHeader
                  id="university-rankings"
                  icon={Trophy}
                  title={publicT('public_2_international_rankings_and_academic_accreditations')}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-3 items-stretch font-['Cairo',sans-serif]">
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
                        className={`relative overflow-hidden rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/10 dark:border-white/10 px-3 py-2.5 md:p-3.5 transition-all flex items-center justify-between gap-2.5 group mn-panel ${
                          ranking.link
                            ? 'hover:bg-white dark:hover:bg-[#162747] hover:border-[#0E7C86]/45 hover:shadow-[0_4px_12px_rgba(20,43,95,0.06)] active:scale-[0.99] cursor-pointer'
                            : ''
                        }`}
                      >
                        {/* Leading Dual-Tone Medal Seal + Name & Edition */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="relative w-8 h-8 md:w-9 md:h-9 rounded-xl bg-white dark:bg-[#111E38] border border-[#142B5F]/18 dark:border-white/12 text-[#142B5F] dark:text-[#7FD4DE] group-hover:bg-[#142B5F] group-hover:text-white group-hover:border-[#142B5F] shadow-[0_2px_6px_rgba(20,43,95,0.05)] flex items-center justify-center shrink-0 transition-colors">
                            <Medal className="w-4 h-4 stroke-[2]" />
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#0E7C86] group-hover:bg-[#21A7B4] transition-colors"
                            />
                          </div>

                          <div className="flex flex-col items-start text-start min-w-0 flex-1">
                            <div className="flex items-start gap-1 max-w-full">
                              <h3
                                dir="ltr"
                                className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-snug line-clamp-2 text-right"
                              >
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
                                <ArrowUpLeft className="w-3.25 h-3.25 mt-0.5 text-[#0E7C86] dark:text-[#34BFC9] stroke-[2.4] shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                              )}
                            </div>
                            <span className="text-[9.5px] sm:text-[10px] font-semibold text-[#5C707C] dark:text-[#9BB4C7] mt-0.5 leading-snug tabular-nums">
                              {publicT('public_edition')} {ranking.year}
                            </span>
                          </div>
                        </div>

                        {/* Trailing Global Rank Crest (Navy + Petrol Vitality Dot — Zero Stray Gold) */}
                        <div className="shrink-0">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#142B5F] dark:bg-[#1B3A78] text-white shadow-[0_2px_8px_rgba(20,43,95,0.16)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#21A7B4] shrink-0" />
                            <span className="text-[10px] sm:text-[10.5px] font-extrabold font-['Cairo',sans-serif] leading-none tabular-nums whitespace-nowrap">
                              #{rankNum} {publicT('public_worldwide_2')}
                            </span>
                          </div>
                        </div>
                      </Wrapper>
                    );
                  })}
                </div>
              </section>
            )}

            {/* القسم الثالث: الدراسة والتخصصات والبرامج الأكاديمية */}
            {university.studyPrograms && (
              <section
                className={SECTION_CARD_CLASS}
                dir={publicDir}
                aria-labelledby="university-programs"
              >
                <UniversitySectionHeader
                  id="university-programs"
                  icon={GraduationCap}
                  title={publicT('public_3_study_majors_and_academic_programs')}
                />

                <div className="space-y-4 font-['Cairo',sans-serif]">
                  {/* 1. لغات التدريس وأنماط الدراسة */}
                  <div className="space-y-2.5">
                    <SubSectionTitle
                      icon={Languages}
                      title={publicT('public_teaching_languages_and_study_arrangements')}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-2.5">
                      {/* لغات التدريس (شرطة نيلية + نقطة بترولية) */}
                      {university.studyPrograms.teachingLanguages &&
                        university.studyPrograms.teachingLanguages.length > 0 && (
                          <div className="rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/8 dark:border-white/8 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-2 text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F1F5F9] shrink-0">
                              <span className="inline-flex items-center gap-1 shrink-0" aria-hidden="true">
                                <span className="w-1 h-3.5 rounded-full bg-[#142B5F] dark:bg-[#DEC58E]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#34BFC9]" />
                              </span>
                              <span>{publicT('public_teaching_languages')}</span>
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {university.studyPrograms.teachingLanguages.map((lang) => (
                                <span
                                  key={lang}
                                  className="bg-white dark:bg-[#111E38] border border-[#142B5F]/14 dark:border-white/10 text-[#142B5F] dark:text-[#E2ECF4] px-2.5 py-0.5 rounded-lg text-[10px] font-bold inline-flex items-center"
                                >
                                  {lang}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* أنماط الدراسة والحضور (شرطة نيلية + نقطة بترولية) */}
                      {university.studyPrograms.studyModes &&
                        university.studyPrograms.studyModes.length > 0 && (
                          <div className="rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/8 dark:border-white/8 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-2 text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F1F5F9] shrink-0">
                              <span className="inline-flex items-center gap-1 shrink-0" aria-hidden="true">
                                <span className="w-1 h-3.5 rounded-full bg-[#142B5F] dark:bg-[#DEC58E]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#34BFC9]" />
                              </span>
                              <span>{publicT('public_attendance_arrangements')}</span>
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {university.studyPrograms.studyModes.map((mode) => (
                                <span
                                  key={mode}
                                  className="bg-white dark:bg-[#111E38] border border-[#142B5F]/14 dark:border-white/10 text-[#142B5F] dark:text-[#E2ECF4] px-2.5 py-0.5 rounded-lg text-[10px] font-bold inline-flex items-center"
                                >
                                  {mode}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* 2. الدرجات التعليمية المتاحة (شرطة نيلية + نقطة بترولية) */}
                  <div className="space-y-2.5">
                    <SubSectionTitle
                      icon={ScrollText}
                      title={publicT('public_degrees_available_for_admission_and_study')}
                    />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-2.5">
                      {(university.studyPrograms.degrees ?? []).map((degree) => (
                        <div
                          key={degree}
                          className="bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/10 dark:border-white/8 text-[#142B5F] dark:text-[#F1F5F9] px-3 py-2.5 rounded-xl text-[10.5px] sm:text-[11px] font-bold flex items-center gap-2 min-w-0"
                        >
                          <span className="inline-flex items-center gap-1 shrink-0" aria-hidden="true">
                            <span className="w-1 h-3.5 rounded-full bg-[#142B5F] dark:bg-[#DEC58E]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#34BFC9]" />
                          </span>
                          <span className="truncate">{degree}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. الكليات والأقسام الأكاديمية الرئيسية (دائرة مزدوجة نيلي + بترولي — مختلفة كلياً عن أيقونة القسم الفرعي) */}
                  <div className="space-y-2.5">
                    <SubSectionTitle
                      icon={Layers}
                      title={publicT('public_main_faculties_and_academic_departments')}
                    />

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-2.5">
                      {(university.studyPrograms.faculties ?? []).map((faculty, index) => (
                        <div
                          key={index}
                          className="bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/10 dark:border-white/8 text-[#203442] dark:text-[#E2ECF4] px-3 py-2.5 rounded-xl text-[10.5px] font-bold flex items-center gap-2 min-w-0"
                        >
                          <span className="w-6 h-6 rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/22 border-[1.5px] border-[#142B5F]/55 dark:border-[#34BFC9]/55 text-[#0E7C86] dark:text-[#34BFC9] flex items-center justify-center shrink-0">
                            <Building2 className="w-3 h-3 stroke-[2.15]" />
                          </span>
                          <span className="truncate">{faculty}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. أهم التخصصات الرائدة بالجامعة (تفاعلي بسهم تنقل بترولي واضح) */}
                  <div className="space-y-2.5">
                    <SubSectionTitle
                      icon={Compass}
                      title={publicT('public_leading_academic_majors_at_the_university')}
                    />

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-2.5">
                      {(
                        university.studyPrograms.topKeyMajors?.length
                          ? university.studyPrograms.topKeyMajors.map((label) => {
                              const linked = university.studyPrograms?.majorLinks?.find(
                                (m) => m.label === label
                              );
                              return { label, majorId: linked?.majorId };
                            })
                          : (university.studyPrograms.majorLinks ?? []).map((m) => ({
                              label: m.label,
                              majorId: m.majorId,
                            }))
                      ).map((major, idx) => {
                        const { label: majorName, majorId } = major;

                        return (
                          <button
                            key={majorId || `${majorName}-${idx}`}
                            type="button"
                            onClick={() => majorId && onOpenMajor?.(majorId)}
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
                            className={`mn-major-chip w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/10 dark:border-white/10 text-[#142B5F] dark:text-[#F1F5F9] text-[10.5px] font-bold rounded-xl transition-all group min-w-0 text-start ${
                              majorId
                                ? 'hover:bg-white dark:hover:bg-[#162747] hover:border-[#0E7C86]/50 hover:shadow-[0_3px_10px_rgba(20,43,95,0.06)] active:scale-[0.98] cursor-pointer'
                                : 'cursor-default'
                            }`}
                          >
                            <span className="truncate">{majorName}</span>
                            <span className="w-5.5 h-5.5 rounded-full bg-[#DDEFF2]/80 dark:bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#34BFC9] group-hover:bg-[#0E7C86] group-hover:text-white flex items-center justify-center shrink-0 transition-all">
                              <ArrowUpLeft className="w-3 h-3 stroke-[2.3] group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </span>
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
                      label={publicT(
                        'public_explore_the_universitys_official_program_and_major_directory'
                      )}
                      icon={<FileText className="w-3.5 h-3.5" />}
                    />
                  )}
                </div>
              </section>
            )}

            {/* القسم الرابع: القبول الجامعي والتسجيل للطلاب الدوليين */}
            {university.internationalAdmissions && (
              <section
                className={SECTION_CARD_CLASS}
                dir={publicDir}
                aria-labelledby="university-admissions"
              >
                <UniversitySectionHeader
                  id="university-admissions"
                  icon={UserCheck}
                  title={publicT('public_4_international_student_admission_and_registration')}
                />

                <div className="space-y-4 font-['Cairo',sans-serif]">
                  {/* 1. هل تقبل الجامعة طلابًا دوليين؟ */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <SubSectionTitle
                        icon={Globe2}
                        title={publicT('public_does_the_university_accept_international_students')}
                      />

                      {university.internationalAdmissions.acceptsInternationalStudents === true && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#0E7C86] dark:text-[#34BFC9]">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{publicT('public_yes')}</span>
                        </span>
                      )}
                    </div>

                    <div className="relative overflow-hidden rounded-xl bg-[#F6F9FB] dark:bg-[#0B1529]/70 border border-[#142B5F]/8 dark:border-white/8 pl-3.5 pr-4 py-3">
                      <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#34BFC9] dark:to-[#DEC58E]" />
                      <p className="text-[11px] sm:text-[11.5px] font-semibold text-[#203442] dark:text-[#DCE7F0] leading-[1.9] text-justify pr-1">
                        {university.internationalAdmissions.acceptsDescription ||
                          (university.internationalAdmissions.acceptsInternationalStudents === true
                            ? publicT('public_international_admission_yes', { v0: university.name })
                            : university.internationalAdmissions.acceptsInternationalStudents ===
                                false
                              ? publicT('public_international_admission_no', {
                                  v0: university.name,
                                })
                              : publicT(
                                  'public_international_student_admission_status_is_not_specified_in'
                                ))}
                      </p>
                    </div>
                  </div>

                  {/* 2. روابط وبوابات التقديم الرسمية المعتمدة */}
                  <div className="space-y-2.5">
                    <SubSectionTitle
                      icon={Send}
                      title={publicT('public_official_admission_links_and_portals')}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-2.5">
                      {university.internationalAdmissions.undergradAdmissionUrl && (
                        <AdmissionPortalCard
                          href={university.internationalAdmissions.undergradAdmissionUrl}
                          title={publicT('public_undergraduate_admission')}
                          subtitle={publicT('public_degree_requirements')}
                          icon={<BookOpenCheck className="w-4 h-4" />}
                        />
                      )}

                      {university.internationalAdmissions.postgradAdmissionUrl && (
                        <AdmissionPortalCard
                          href={university.internationalAdmissions.postgradAdmissionUrl}
                          title={publicT('public_postgraduate_admission')}
                          subtitle={publicT('public_masters_and_doctorate')}
                          icon={<ScrollText className="w-4 h-4" />}
                        />
                      )}

                      {university.internationalAdmissions.internationalStudentsUrl && (
                        <AdmissionPortalCard
                          href={university.internationalAdmissions.internationalStudentsUrl}
                          title={publicT('public_international_student_and_visa_guide')}
                          subtitle={publicT('public_international_student_office')}
                          icon={<Compass className="w-4 h-4" />}
                        />
                      )}

                      {university.internationalAdmissions.applicationPortalUrl && (
                        <AdmissionPortalCard
                          href={university.internationalAdmissions.applicationPortalUrl}
                          title={publicT('public_main_online_application_portal')}
                          subtitle={publicT(
                            'public_university_registration_and_student_account_platform'
                          )}
                          icon={<Send className="w-4 h-4" />}
                          featured
                        />
                      )}
                    </div>

                    {/* ملاحظة الأمان والتوثيق */}
                    <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] font-semibold text-[#5C707C] dark:text-[#9BB4C7]">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                      <span>
                        {publicT('public_all_portals_take_you_directly_to_the_universitys')}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* القسم الخامس: الرسوم الدراسية وتكاليف الدراسة */}
            {university.tuitionFees && (
              <section
                className={SECTION_CARD_CLASS}
                dir={publicDir}
                aria-labelledby="university-tuition"
              >
                <UniversitySectionHeader
                  id="university-tuition"
                  icon={Coins}
                  title={publicT('public_5_tuition_and_study_costs')}
                />

                <div className="space-y-4 font-['Cairo',sans-serif]">
                  {/* 1. متوسط الرسوم السنوية العامة والعملة */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <SubSectionTitle
                        icon={Banknote}
                        title={publicT('public_average_annual_tuition')}
                      />

                      {university.tuitionFees.currency && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#142B5F] dark:text-[#DEC58E]">
                          <Coins className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                          <span>
                            {publicT('public_currency')} {university.tuitionFees.currency}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* لوحة القيمة البارزة للرسوم (دمج نيلي + بترولي — بلا ذهبي زائد) */}
                    {university.tuitionFees.annualAverageTuition && (
                      <div className="rounded-xl px-3.5 py-3 bg-[#F6F9FB] dark:bg-[#0B1529]/75 border border-[#142B5F]/12 dark:border-white/10 flex items-center gap-3">
                        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#142B5F] to-[#114870] text-white flex items-center justify-center shrink-0 shadow-[0_3px_10px_rgba(20,43,95,0.16)]">
                          <Coins className="w-4.5 h-4.5" />
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-[#21A7B4] ring-2 ring-[#F6F9FB] dark:ring-[#0B1529]"
                          />
                        </div>
                        <div className="text-[12px] sm:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] tabular-nums leading-snug">
                          {university.tuitionFees.annualAverageTuition}
                        </div>
                      </div>
                    )}

                    {/* الملاحظة التوضيحية المهمة (نطاق الذهبي المعتمد: عاجي دافئ + شريط ذهبي) */}
                    {university.tuitionFees.generalDescription && (
                      <div className="relative overflow-hidden flex items-start gap-2.5 px-3.5 py-3 pr-4 rounded-xl bg-[#FAF7F0] dark:bg-[#16233B] border border-[#D6A43B]/35 dark:border-[#DEC58E]/25">
                        <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-[#D6A43B] dark:bg-[#F2CD78]" />
                        <span className="w-5.5 h-5.5 rounded-full bg-[#D6A43B]/18 dark:bg-[#F2CD78]/15 text-[#9A6F18] dark:text-[#F2CD78] flex items-center justify-center shrink-0 mt-0.5">
                          <Info className="w-3.25 h-3.25" />
                        </span>
                        <p className="text-[10.5px] sm:text-[11px] font-semibold text-[#334B57] dark:text-[#DCE7F0] leading-relaxed text-justify">
                          {university.tuitionFees.generalDescription}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 2. تفصيل الرسوم حسب الكلية والمرحلة الدراسية */}
                  {(university.tuitionFees.undergradTuition ||
                    university.tuitionFees.medicineTuition ||
                    university.tuitionFees.engineeringTuition ||
                    university.tuitionFees.postgradTuition) && (
                    <div className="space-y-2.5">
                      <SubSectionTitle
                        icon={Building2}
                        title={publicT('public_fee_breakdown_by_faculty_and_level')}
                      />

                      <div className="rounded-xl border border-[#142B5F]/10 dark:border-white/10 overflow-hidden divide-y divide-[#142B5F]/8 dark:divide-white/8">
                        {university.tuitionFees.undergradTuition && (
                          <TuitionFeeRow
                            icon={<GraduationCap className="w-3.5 h-3.5" />}
                            label={publicT('public_undergraduate_fees')}
                            value={university.tuitionFees.undergradTuition}
                          />
                        )}

                        {university.tuitionFees.medicineTuition && (
                          <TuitionFeeRow
                            icon={<Stethoscope className="w-3.5 h-3.5" />}
                            label={publicT('public_medical_school_fees')}
                            value={university.tuitionFees.medicineTuition}
                          />
                        )}

                        {university.tuitionFees.engineeringTuition && (
                          <TuitionFeeRow
                            icon={<Wrench className="w-3.5 h-3.5" />}
                            label={publicT('public_engineering_faculty_fees')}
                            value={university.tuitionFees.engineeringTuition}
                          />
                        )}

                        {university.tuitionFees.postgradTuition && (
                          <TuitionFeeRow
                            icon={<Award className="w-3.5 h-3.5" />}
                            label={publicT('public_postgraduate_fees')}
                            value={university.tuitionFees.postgradTuition}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. زر جدول الرسوم والتكاليف الرسمي بالجامعة */}
                  {university.tuitionFees.officialTuitionUrl && (
                    <OfficialInfoLink
                      href={university.tuitionFees.officialTuitionUrl}
                      label={publicT('public_universitys_official_tuition_and_fees_schedule')}
                      icon={<Coins className="w-3.5 h-3.5" />}
                    />
                  )}
                </div>
              </section>
            )}

            {/* القسم السادس: المنح الدراسية المتاحة */}
            {university.scholarships && university.scholarships.length > 0 && (
              <section
                className={SECTION_CARD_CLASS}
                dir={publicDir}
                aria-labelledby="university-scholarships"
              >
                <UniversitySectionHeader
                  id="university-scholarships"
                  icon={Award}
                  title={publicT('public_6_available_scholarships')}
                />

                <div className="flex items-stretch gap-2.5 overflow-x-auto mn-similar-scroll pb-2 pt-0.5 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3.5 md:overflow-visible md:pb-0">
                  {university.scholarships.map((scholarship) => (
                    <article
                      key={scholarship.id}
                      onClick={() =>
                        scholarship.platformScholarshipId &&
                        onOpenScholarship?.(scholarship.platformScholarshipId)
                      }
                      className={`relative overflow-hidden w-[275px] sm:w-[300px] md:w-full h-full shrink-0 bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/10 dark:border-white/10 rounded-2xl p-3 md:p-3.5 flex flex-col justify-between gap-2.5 snap-center transition-all hover:bg-white dark:hover:bg-[#162747] hover:border-[#0E7C86]/40 hover:shadow-[0_6px_16px_rgba(20,43,95,0.07)] mn-panel group ${
                        scholarship.platformScholarshipId ? 'cursor-pointer active:scale-[0.99]' : ''
                      }`}
                    >
                      {/* 1. Card Header: Navy Right -> Petrol Left */}
                      <div className="rounded-xl px-3 py-2.5 bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white shadow-2xs flex items-center gap-2.5 min-w-0">
                        <div className="w-7.5 h-7.5 rounded-lg bg-white/14 border border-[#DDEFF2]/35 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex flex-col items-start text-start min-w-0 flex-1">
                          <div className="inline-flex items-center gap-1 max-w-full">
                            <h3 className="text-[11px] font-bold text-white leading-snug truncate">
                              {scholarship.name}
                            </h3>
                            {scholarship.platformScholarshipId && (
                              <ArrowUpLeft className="w-3.25 h-3.25 text-[#DDEFF2] stroke-[2.4] shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                            )}
                          </div>
                          {scholarship.nameEn && (
                            <span className="text-[9px] font-semibold text-[#DDEFF2] leading-tight mt-0.5 block text-start truncate max-w-full">
                              {scholarship.nameEn}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 2. Calm White Key Facts (Small Inner Card Icons in Pure Petrol #0E7C86) */}
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="bg-white dark:bg-[#111E38] border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 min-w-0">
                            <MapPin className="w-3.25 h-3.25 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                            <span className="text-[9.5px] font-bold text-[#203442] dark:text-[#DCE7F0] truncate">
                              {university.country}
                            </span>
                          </div>

                          {scholarship.type && (
                            <div className="bg-white dark:bg-[#111E38] border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 min-w-0">
                              <Coins className="w-3.25 h-3.25 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                              <span className="text-[9.5px] font-bold text-[#203442] dark:text-[#DCE7F0] truncate">
                                {scholarship.type}
                              </span>
                            </div>
                          )}
                        </div>

                        {scholarship.audience && (
                          <div className="bg-white dark:bg-[#111E38] border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 min-w-0">
                            <Users className="w-3.25 h-3.25 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                            <p className="text-[9.5px] leading-snug text-[#203442] dark:text-[#DCE7F0] font-bold truncate min-w-0 flex-1">
                              <span className="text-[#142B5F] dark:text-[#F1F5F9] ml-1">
                                {publicT('public_target_applicants')}
                              </span>
                              <span className="font-semibold text-[#5C707C] dark:text-[#9BB4C7]">
                                {scholarship.audience}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 3. Card Footer: Calm Light Official Source CTA with Petrol Navigation Icon */}
                      <div className="mt-auto pt-1">
                        <a
                          href={scholarship.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="group/link w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 md:py-2 rounded-xl bg-white dark:bg-[#111E38] border border-[#142B5F]/18 dark:border-[#34BFC9]/30 hover:bg-[#142B5F] hover:border-[#142B5F] text-[#142B5F] dark:text-[#F1F5F9] hover:text-white text-[10px] font-bold shadow-2xs transition-colors"
                        >
                          <span>{publicT('public_official_source')}</span>
                          <ExternalLink className="w-3 h-3 text-[#0E7C86] dark:text-[#34BFC9] group-hover/link:text-[#DDEFF2] shrink-0 transition-colors" />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* الأقسام 7 إلى 11: اللغة، المستندات، السكن، المعيشة، التواصل */}
            <UniversityDecisionSections university={university} onOpenExam={onOpenExam} />

            {/* القسم 12: خدمات تساعدك بالتقديم */}
            {contextualServices.length > 0 && (
              <section className={SECTION_CARD_CLASS} dir={publicDir}>
                <UniversitySectionHeader
                  icon={Briefcase}
                  title={publicT('public_services_that_may_help_during_your_application')}
                  level={3}
                />

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 md:gap-3 items-stretch">
                  {contextualServices.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => onOpenService?.(service)}
                      className="h-full relative overflow-hidden group flex items-center justify-between gap-2.5 rounded-xl border border-[#142B5F]/10 dark:border-white/10 bg-[#F6F8FA] dark:bg-[#0B1529]/75 px-3 py-2.5 md:p-3.5 text-start transition-all hover:bg-white dark:hover:bg-[#162747] hover:border-[#0E7C86]/40 hover:shadow-[0_4px_12px_rgba(20,43,95,0.06)] active:scale-[0.99] cursor-pointer"
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#34BFC9] dark:to-[#DEC58E]"
                      />
                      <span className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="relative w-8 h-8 rounded-xl bg-[#142B5F]/[0.06] dark:bg-white/[0.07] border border-[#142B5F]/14 dark:border-white/12 text-[#142B5F] dark:text-[#7FD4DE] group-hover:bg-[#142B5F] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                          <Briefcase className="w-3.5 h-3.5" />
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#0E7C86] group-hover:bg-[#21A7B4]"
                          />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-snug">
                            {service.title}
                          </span>
                          <span className="mt-0.5 block text-[9px] font-bold text-[#0E7C86] dark:text-[#7FD4DE]">
                            {service.category}
                          </span>
                        </span>
                      </span>

                      <span className="w-6.5 h-6.5 rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#34BFC9] group-hover:bg-[#0E7C86] group-hover:text-white flex items-center justify-center shrink-0 transition-all">
                        <ArrowUpLeft className="h-3.25 w-3.25 stroke-[2.25]" />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* القسم 13: مقالات وأدلة مرتبطة */}
            {university.relatedArticles && university.relatedArticles.length > 0 && (
              <section className={SECTION_CARD_CLASS} dir={publicDir}>
                <UniversitySectionHeader
                  icon={BookOpenText}
                  title={publicT('public_related_articles_and_guides')}
                  level={3}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 items-stretch">
                  {university.relatedArticles.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() => onOpenArticle?.(article.id)}
                      disabled={!onOpenArticle}
                      className="h-full relative overflow-hidden group flex items-center justify-between gap-2.5 rounded-xl border border-[#142B5F]/10 dark:border-white/10 bg-[#F6F8FA] dark:bg-[#0B1529]/75 p-2.5 md:p-3.5 text-start transition-all enabled:hover:bg-white dark:enabled:hover:bg-[#162747] enabled:hover:border-[#0E7C86]/40 enabled:hover:shadow-[0_4px_12px_rgba(20,43,95,0.06)] enabled:active:scale-[0.99] cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="relative w-8 h-8 rounded-xl bg-[#142B5F]/[0.06] dark:bg-white/[0.07] border border-[#142B5F]/14 dark:border-white/12 text-[#142B5F] dark:text-[#7FD4DE] group-hover:bg-[#142B5F] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                          <BookOpenText className="h-4 w-4" />
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#0E7C86] group-hover:bg-[#21A7B4]"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-[#0E7C86] dark:text-[#7FD4DE] mb-0.5">
                            <span>{article.typeLabel || publicT('public_article')}</span>
                            {article.category && (
                              <span className="text-[#5C707C] dark:text-[#9BB4C7]">
                                · {article.category}
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] font-bold leading-snug text-[#142B5F] dark:text-[#F1F5F9] line-clamp-2">
                            {article.title}
                          </p>
                          {article.meta && (
                            <p className="mt-0.5 line-clamp-1 text-[8.5px] font-semibold text-[#5C707C] dark:text-[#9BB4C7]">
                              {article.meta}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="w-6.5 h-6.5 rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#34BFC9] group-hover:bg-[#0E7C86] group-hover:text-white flex items-center justify-center shrink-0 transition-all">
                        <ArrowUpLeft className="h-3.25 w-3.25 stroke-[2.25]" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* القسم 14: أزرار الإجراءات السفلية (مشاركة وحفظ الجامعة) */}
            <div className="px-1 pt-2 pb-2 flex justify-center gap-3 md:gap-4 w-full">
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href).catch(() => {});
                  }
                  showToast('تم نسخ رابط الجامعة للمشاركة');
                }}
                className="py-2.5 md:py-3 px-5 md:px-8 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_2px_10px_rgba(20,43,95,0.04)] active:scale-95 cursor-pointer bg-white dark:bg-[#111E38] hover:bg-[#F4F7FA] dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#F1F5F9] text-xs font-bold border border-[#142B5F]/15 dark:border-white/12 hover:border-[#0E7C86]/45 flex-1 max-w-[175px] md:max-w-[240px]"
              >
                <span>مشاركة الجامعة</span>
                <Share2 className="w-4 h-4 text-[#0E7C86] dark:text-[#34BFC9]" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  onToggleSave?.(e);
                  showToast(isSaved ? 'تمت إزالة الجامعة من المفضلة' : 'تم حفظ الجامعة في المفضلة');
                }}
                className="py-2.5 md:py-3 px-5 md:px-8 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_6px_16px_rgba(20,43,95,0.18)] active:scale-95 cursor-pointer flex-1 max-w-[175px] md:max-w-[240px] bg-[#142B5F] hover:bg-[#0E7C86] text-white text-xs font-bold"
              >
                <span>{isSaved ? 'محفوظة بالمفضلة' : 'حفظ الجامعة'}</span>
                <Bookmark
                  className={`w-4 h-4 ${
                    isSaved ? 'fill-[#21A7B4] text-[#21A7B4]' : 'text-[#DDEFF2]'
                  }`}
                />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Action Notification Toast */}
      {actionToast && (
        <div className="fixed bottom-6 inset-x-4 max-w-xs mx-auto bg-[#142B5F] border border-[#21A7B4]/45 text-white px-4 py-2.5 rounded-full shadow-2xl z-50 flex items-center justify-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-3.5 h-3.5 text-[#21A7B4]" />
          <span>{actionToast}</span>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   UNIFIED NEXT-GEN EDITORIAL HEADERS & HELPER COMPONENTS
   ============================================================================ */

/* Tier 1: Main Section Header (Manaratak Signature: Solid Navy #142B5F + Gold Corner #D6A43B + Gold Icon #F2CD78 + Dual-Tone Navy->Petrol Divider) */
function UniversitySectionHeader({
  id,
  icon: Icon,
  title,
  level = 2,
  className = '',
}: {
  id?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  level?: 2 | 3 | 4;
  className?: string;
}) {
  const Heading = level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4';
  return (
    <>
      {/* Subtle dual-tone top chapter hairline separating sections cleanly */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#142B5F]/32 dark:via-[#D6A43B]/35 to-transparent"
      />
      <div
        id={id}
        className={`scroll-mt-28 flex items-center gap-2.5 mb-3 md:mb-4 ${className}`}
      >
        <span
          aria-hidden="true"
          className="relative overflow-hidden w-8.5 h-8.5 md:w-9.5 md:h-9.5 rounded-xl bg-[#142B5F] text-[#F2CD78] flex items-center justify-center shrink-0 shadow-[0_3px_10px_rgba(20,43,95,0.2)]"
        >
          <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-md" />
          <Icon className="w-4 h-4 md:w-4.5 md:h-4.5 relative z-10 text-[#F2CD78]" />
        </span>
        <Heading className="text-[14px] sm:text-[14.5px] md:text-[15.5px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] leading-snug tracking-tight">
          {title}
        </Heading>
        <span
          aria-hidden="true"
          className="flex-1 min-w-[20px] h-[1.5px] rounded-full bg-gradient-to-l from-[#142B5F]/42 via-[#0E7C86]/32 dark:from-[#D6A43B]/35 dark:via-[#34BFC9]/25 to-transparent mr-1"
        />
      </div>
    </>
  );
}

/* Tier 2: Sub-Section Header (Option A — Geometric Leaf in Navy->Petrol Gradient + White Icon, Open Editorial Row) */
function SubSectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="w-6.5 h-6.5 rounded-tr-xl rounded-bl-xl rounded-tl-[4px] rounded-br-[4px] bg-gradient-to-br from-[#142B5F] via-[#124D74] to-[#0E7C86] text-white flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(20,43,95,0.16)]">
        <Icon className="w-3.5 h-3.5 stroke-[2.1] text-white" />
      </span>
      <h3 className="text-[11.5px] sm:text-[12px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] leading-snug">
        {title}
      </h3>
    </div>
  );
}

/* Tier 4: Interactive Admission Portal Card (Dual-Tone Navy+Petrol Icon Anchor + Pure Petrol Action Circle) */
function AdmissionPortalCard({
  href,
  title,
  subtitle,
  icon,
  featured = false,
}: {
  href: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative overflow-hidden rounded-xl px-3 py-2.5 md:p-3.5 border transition-all flex items-center justify-between gap-2.5 text-start min-w-0 active:scale-[0.99] ${
        featured
          ? 'bg-white dark:bg-[#0B1529]/90 border-[#142B5F]/20 dark:border-[#34BFC9]/30 hover:border-[#0E7C86] hover:shadow-[0_4px_12px_rgba(20,43,95,0.07)]'
          : 'bg-[#F6F8FA] dark:bg-[#0B1529]/75 border-[#142B5F]/10 dark:border-white/10 hover:bg-white dark:hover:bg-[#162747] hover:border-[#0E7C86]/45 hover:shadow-[0_4px_12px_rgba(20,43,95,0.06)]'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className={`relative w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            featured
              ? 'bg-gradient-to-br from-[#142B5F] to-[#114870] text-white group-hover:from-[#0E7C86] group-hover:to-[#21A7B4]'
              : 'bg-[#142B5F]/[0.06] dark:bg-white/[0.07] border border-[#142B5F]/14 dark:border-white/12 text-[#142B5F] dark:text-[#7FD4DE] group-hover:bg-[#142B5F] group-hover:text-white'
          }`}
        >
          {icon}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
              featured ? 'bg-[#21A7B4]' : 'bg-[#0E7C86] group-hover:bg-[#21A7B4]'
            }`}
          />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-snug truncate">
            {title}
          </span>
          {subtitle && (
            <span className="text-[9.5px] font-semibold text-[#5C707C] dark:text-[#9BB4C7] leading-snug truncate mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      <span className="w-6.5 h-6.5 rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#34BFC9] group-hover:bg-[#0E7C86] group-hover:text-white flex items-center justify-center shrink-0 transition-all">
        <ExternalLink className="w-3 h-3 stroke-[2.2]" />
      </span>
    </a>
  );
}

/* Tier 3: Static Tuition Table Row (Dual-Tone Navy Icon + Petrol Micro-Dot) */
function TuitionFeeRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-12 items-stretch odd:bg-[#F6F8FA] even:bg-white dark:odd:bg-[#0B1529]/75 dark:even:bg-[#111E38]">
      <div className="col-span-6 py-2.5 px-3 md:px-4 border-l border-[#142B5F]/8 dark:border-white/8 flex items-center gap-2.5 min-w-0">
        <div className="relative w-7 h-7 rounded-lg bg-[#142B5F]/[0.06] dark:bg-white/[0.07] border border-[#142B5F]/14 dark:border-white/12 text-[#142B5F] dark:text-[#7FD4DE] flex items-center justify-center shrink-0">
          {icon}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#34BFC9]"
          />
        </div>
        <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-snug">
          {label}
        </span>
      </div>
      <div className="col-span-6 py-2.5 px-3 md:px-4 flex items-center justify-center text-center">
        <span className="text-[10.5px] sm:text-[11px] font-extrabold text-[#142B5F] dark:text-[#7FD4DE] tabular-nums leading-snug">
          {value}
        </span>
      </div>
    </div>
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
    <div className="space-y-3.5 md:space-y-4.5" dir={publicDir}>
      {/* 7. متطلبات اللغة */}
      {language && (
        <section className={SECTION_CARD_CLASS} aria-labelledby="language-requirements">
          <UniversitySectionHeader
            id="language-requirements"
            icon={Languages}
            title={publicT('public_7_language_requirements')}
          />

          <div className="space-y-3.5">
            {/* 1. حالة متطلبات اللغة واللغة المطلوبة */}
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <CompactFact
                label={publicT('public_are_there_language_requirements')}
                value={language.required ? publicT('public_yes') : publicT('public_no')}
                icon={<CheckCircle2 className="w-4 h-4" />}
                accentValue={language.required}
              />
              <CompactFact
                label={publicT('public_required_language')}
                value={language.languages.join('، ')}
                icon={<Languages className="w-4 h-4" />}
              />
            </div>

            {/* 2. الاختبارات المعتمدة */}
            <div className="space-y-2.5">
              <SubSectionTitle
                icon={BookOpenCheck}
                title={publicT('public_accepted_exams')}
              />

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-2.5">
                {language.acceptedTests.map((label) => {
                  const matchedLink = language.acceptedTestLinks?.find(
                    (link) => link.label === label
                  );
                  const examId = matchedLink?.examId || '';

                  return examId ? (
                    <button
                      type="button"
                      key={label}
                      onClick={() => onOpenExam?.(examId)}
                      className="bg-[#F6F8FA] dark:bg-[#0B1529]/75 hover:bg-white dark:hover:bg-[#162747] rounded-xl border border-[#142B5F]/12 dark:border-white/10 hover:border-[#0E7C86]/55 px-3 py-2.5 hover:shadow-[0_3px_10px_rgba(20,43,95,0.06)] active:scale-[0.98] transition-all flex items-center justify-between gap-2 text-start cursor-pointer group min-w-0"
                      title={publicT('public_open_page_title', { v0: label })}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 border-[1.5px] border-[#142B5F]/50 dark:border-[#34BFC9]/55 text-[#0E7C86] dark:text-[#34BFC9] group-hover:bg-[#142B5F] group-hover:border-[#142B5F] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                          <FileCheck className="w-3 h-3" />
                        </span>
                        <span
                          className="text-[10.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-snug break-words"
                          dir="ltr"
                        >
                          {label}
                        </span>
                      </span>
                      <span className="w-6 h-6 rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/25 text-[#0E7C86] dark:text-[#34BFC9] group-hover:bg-[#0E7C86] group-hover:text-white flex items-center justify-center shrink-0 transition-all">
                        <ArrowUpLeft className="w-3.25 h-3.25 stroke-[2.3]" />
                      </span>
                    </button>
                  ) : (
                    <div
                      key={label}
                      className="bg-[#F6F8FA] dark:bg-[#0B1529]/75 rounded-xl border border-[#142B5F]/10 dark:border-white/8 px-3 py-2.5 flex items-center gap-2 min-w-0"
                    >
                      <span className="w-6 h-6 rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 border-[1.5px] border-[#142B5F]/50 dark:border-[#34BFC9]/55 text-[#0E7C86] dark:text-[#34BFC9] flex items-center justify-center shrink-0">
                        <FileCheck className="w-3 h-3" />
                      </span>
                      <span
                        className="text-[10.5px] font-bold text-[#203442] dark:text-[#E2ECF4] leading-snug break-words"
                        dir="ltr"
                      >
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

      {/* 8. المستندات المطلوبة للتقديم */}
      {documents && (
        <section className={SECTION_CARD_CLASS} aria-labelledby="required-documents-title">
          <UniversitySectionHeader
            id="required-documents-title"
            icon={FileCheck}
            title={publicT('public_8_required_documents')}
          />

          <div className="space-y-4">
            <DocumentList
              title={publicT('public_general_required_documents')}
              items={documents.generalDocuments}
              icon={FileText}
            />

            <DocumentList
              title={publicT('public_additional_postgraduate_requirements')}
              items={documents.graduateAdditionalDocuments}
              icon={GraduationCap}
            />

            <OfficialInfoLink
              href={documents.officialUrl}
              label={publicT('public_official_required_documents_guide')}
              icon={<FileCheck className="w-3.5 h-3.5" />}
            />
          </div>
        </section>
      )}

      {/* 9. السكن الجامعي */}
      {housing && (
        <section className={SECTION_CARD_CLASS} aria-labelledby="university-housing">
          <UniversitySectionHeader
            id="university-housing"
            icon={Home}
            title={publicT('public_9_university_accommodation')}
          />

          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
              <CompactFact
                label={publicT('public_is_accommodation_available')}
                value={housing.available ? publicT('public_yes') : publicT('public_no')}
                icon={<Home className="w-4 h-4" />}
                accentValue={housing.available}
              />
              <CompactFact
                label={publicT('public_international_students')}
                value={
                  housing.internationalStudentsEligible
                    ? publicT('public_eligible')
                    : publicT('public_ineligible')
                }
                icon={<Users className="w-4 h-4" />}
                accentValue={housing.internationalStudentsEligible}
              />
              <CompactFact
                label={publicT('public_typical_cost')}
                value={housing.typicalCost}
                icon={<Coins className="w-4 h-4" />}
              />
              <CompactFact
                label={publicT('public_currency_2')}
                value={housing.currency}
                icon={<Banknote className="w-4 h-4" />}
              />
            </div>

            {housing.officialUrl && (
              <OfficialInfoLink
                href={housing.officialUrl}
                label={publicT('public_official_university_accommodation_guide')}
                icon={<Home className="w-3.5 h-3.5" />}
              />
            )}
          </div>
        </section>
      )}

      {/* 10. تكاليف المعيشة */}
      {livingCosts && (
        <section className={SECTION_CARD_CLASS} aria-labelledby="university-living-costs-title">
          <UniversitySectionHeader
            id="university-living-costs-title"
            icon={Wallet}
            title={publicT('public_10_living_costs')}
          />

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <CompactFact
                label={publicT('public_estimated_monthly_cost')}
                value={livingCosts.monthlyEstimate}
                icon={<Coins className="w-4 h-4" />}
              />
              <CompactFact
                label={publicT('public_currency_2')}
                value={livingCosts.currency}
                icon={<Banknote className="w-4 h-4" />}
              />
            </div>

            {livingCosts.variationNote && (
              <div className="relative overflow-hidden flex items-start gap-2.5 bg-[#FAF7F0] dark:bg-[#16233B] rounded-xl py-3 pl-3.5 pr-4 border border-[#D6A43B]/35 dark:border-[#DEC58E]/25">
                <span className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-[#D6A43B] dark:bg-[#F2CD78]" />
                <span className="w-5.5 h-5.5 rounded-full bg-[#D6A43B]/18 dark:bg-[#F2CD78]/15 text-[#9A6F18] dark:text-[#F2CD78] flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="w-3.25 h-3.25" />
                </span>
                <p className="text-[10.5px] sm:text-[11px] font-semibold leading-relaxed text-[#334B57] dark:text-[#DCE7F0]">
                  {livingCosts.variationNote}
                </p>
              </div>
            )}

            {livingCosts.officialUrl && (
              <OfficialInfoLink
                href={livingCosts.officialUrl}
                label={publicT('public_official_living_cost_information_and_guide')}
                icon={<Wallet className="w-3.5 h-3.5" />}
              />
            )}
          </div>
        </section>
      )}

      {/* 11. بيانات التواصل والروابط الرسمية */}
      {contacts && (
        <section className={SECTION_CARD_CLASS} aria-labelledby="university-contacts">
          <UniversitySectionHeader
            id="university-contacts"
            icon={Phone}
            title={publicT('public_11_contact_details_and_official_links')}
          />

          <div className="flex flex-col gap-3.5">
            {/* Primary Contact Channels */}
            <div className="space-y-2.5">
              <SubSectionTitle icon={Building2} title="قنوات التواصل والجهات الرسمية" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-2.5">
                {contacts.phone && (
                  <ReferenceLink
                    href={`tel:${contacts.phone.replace(/\s/g, '')}`}
                    label={publicT('public_official_phone_number')}
                    value={contacts.phone}
                    icon={<Phone className="w-3.5 h-3.5" />}
                    ltrValue
                  />
                )}
                <ReferenceLink
                  href={contacts.officialWebsite}
                  label={publicT('public_official_website')}
                  value={getUrlDisplayHost(contacts.officialWebsite)}
                  icon={<Globe className="w-3.5 h-3.5" />}
                  ltrValue
                />
                {contacts.mainSocial && (
                  <ReferenceLink
                    href={contacts.mainSocial.url}
                    label={publicT('public_social_media')}
                    value={contacts.mainSocial.label}
                    icon={<Share2 className="w-3.5 h-3.5" />}
                  />
                )}
                {contacts.governmentRegister && (
                  <ReferenceLink
                    href={contacts.governmentRegister.url}
                    label={publicT('public_official_organization')}
                    value={contacts.governmentRegister.label}
                    icon={<ShieldCheck className="w-3.5 h-3.5" />}
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

            {/* Data Trust Verification Bar */}
            {dataTrust && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/10 dark:border-white/10 px-3.5 py-2.5 text-[10px] font-bold">
                <span className="flex items-center gap-2 text-[#142B5F] dark:text-[#F1F5F9]">
                  <span className="w-6 h-6 rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 border-[1.5px] border-[#142B5F]/50 dark:border-[#34BFC9]/55 text-[#0E7C86] dark:text-[#34BFC9] flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-3.25 w-3.25" />
                  </span>
                  <span>
                    {publicT('public_last_information_verification')}{' '}
                    <span className="text-[#5C707C] dark:text-[#9BB4C7] font-semibold">
                      {dataTrust.lastVerified}
                    </span>
                  </span>
                </span>
                <a
                  href={dataTrust.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#0E7C86] dark:text-[#7FD4DE] hover:text-[#142B5F] dark:hover:text-[#DEC58E] transition-colors"
                >
                  <span>
                    {publicT('public_source')} {dataTrust.sourceLabel}
                  </span>
                  <ArrowUpLeft className="h-3.25 w-3.25 shrink-0" />
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
  icon,
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
      className="group relative overflow-hidden flex items-center justify-between gap-2.5 rounded-xl border border-[#142B5F]/10 dark:border-white/10 bg-[#F6F8FA] dark:bg-[#0B1529]/75 hover:bg-white dark:hover:bg-[#162747] hover:border-[#0E7C86]/45 hover:shadow-[0_4px_12px_rgba(20,43,95,0.06)] active:scale-[0.99] px-3 py-2.5 md:p-3 transition-all min-w-0"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="relative w-8 h-8 rounded-xl bg-[#142B5F]/[0.06] dark:bg-white/[0.07] border border-[#142B5F]/14 dark:border-white/12 text-[#142B5F] dark:text-[#7FD4DE] group-hover:bg-[#142B5F] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
          {icon ?? <Globe className="w-3.5 h-3.5" />}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#0E7C86] group-hover:bg-[#21A7B4]"
          />
        </span>
        <div className="flex flex-col items-start min-w-0 flex-1 text-start">
          <span className="text-[9.5px] sm:text-[10px] font-semibold text-[#5C707C] dark:text-[#9BB4C7] leading-tight truncate max-w-full">
            {label}
          </span>
          <span
            dir={ltrValue ? 'ltr' : undefined}
            className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-snug truncate mt-0.5 max-w-full"
          >
            {value}
          </span>
        </div>
      </div>

      <span className="w-6.5 h-6.5 rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#34BFC9] group-hover:bg-[#0E7C86] group-hover:text-white flex items-center justify-center shrink-0 transition-all">
        <ArrowUpLeft className="h-3.25 w-3.25 stroke-[2.25]" />
      </span>
    </a>
  );
}

/* Tier 3: Static Fact Card (Dual-Tone Navy Icon + Petrol Micro-Dot; Petrol Reserved for Positive Status Text) */
function CompactFact({
  label,
  value,
  icon,
  accentValue = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accentValue?: boolean;
}) {
  return (
    <div className="rounded-xl p-2.5 md:p-3 bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/10 dark:border-white/10 flex items-center gap-2.5 min-w-0">
      {icon && (
        <div className="relative w-8 h-8 rounded-xl bg-[#142B5F]/[0.06] dark:bg-white/[0.07] border border-[#142B5F]/14 dark:border-white/12 text-[#142B5F] dark:text-[#7FD4DE] flex items-center justify-center shrink-0">
          {icon}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#34BFC9]"
          />
        </div>
      )}
      <div className="flex flex-col min-w-0 flex-1 text-start">
        <span className="text-[9.5px] sm:text-[10px] font-semibold text-[#5C707C] dark:text-[#9BB4C7] leading-tight truncate">
          {label}
        </span>
        <span
          className={`text-[10.5px] sm:text-[11.5px] font-extrabold leading-snug mt-0.5 tabular-nums truncate ${
            accentValue
              ? 'text-[#0E7C86] dark:text-[#34BFC9]'
              : 'text-[#142B5F] dark:text-[#F1F5F9]'
          }`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

/* Tier 3: Static Document Checklist (Dual-Tone Check Seal: Navy Ring + Pure Petrol Checkmark) */
function DocumentList({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-2.5">
      <SubSectionTitle icon={icon} title={title} />

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="bg-[#F6F8FA] dark:bg-[#0B1529]/75 rounded-xl border border-[#142B5F]/10 dark:border-white/8 px-3 py-2.5 flex items-start gap-2.5 min-w-0"
          >
            <span className="w-5.5 h-5.5 rounded-full bg-white dark:bg-[#111E38] border-[1.5px] border-[#142B5F]/50 dark:border-[#34BFC9]/55 text-[#0E7C86] dark:text-[#34BFC9] shadow-[0_1px_3px_rgba(20,43,95,0.06)] flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3 stroke-[2.6]" />
            </span>
            <span className="text-[10.5px] sm:text-[11px] font-bold text-[#203442] dark:text-[#E2ECF4] leading-snug">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Tier 4: Official External Guide Bar (Dual-Tone Navy->Petrol Side Accent + Small Petrol Icon + Clean Navy/White Action Circle) */
function OfficialInfoLink({
  href,
  label,
  icon,
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
      className="group relative overflow-hidden w-full rounded-xl pl-3 pr-3.5 py-2.5 md:py-3 bg-white dark:bg-[#0B1529]/90 hover:bg-[#F6F9FB] dark:hover:bg-[#162747] border border-[#0E7C86]/25 dark:border-[#34BFC9]/25 hover:border-[#0E7C86] shadow-[0_2px_10px_rgba(20,43,95,0.04)] hover:shadow-[0_4px_14px_rgba(20,43,95,0.08)] active:scale-[0.99] transition-all flex items-center justify-between gap-2.5 cursor-pointer"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#34BFC9] dark:to-[#DEC58E]"
      />

      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="w-7.5 h-7.5 rounded-lg bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#34BFC9] group-hover:bg-[#0E7C86] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
          {icon ?? <Clock className="w-3.5 h-3.5" />}
        </span>
        <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-snug text-start truncate">
          {label}
        </span>
      </div>

      <span className="w-6.5 h-6.5 rounded-full bg-[#142B5F] dark:bg-[#1B3A78] text-white group-hover:bg-[#0E7C86] group-hover:scale-105 shadow-[0_2px_6px_rgba(20,43,95,0.18)] inline-flex items-center justify-center shrink-0 transition-all">
        <ExternalLink className="w-3 h-3 stroke-[2.25]" />
      </span>
    </a>
  );
}
