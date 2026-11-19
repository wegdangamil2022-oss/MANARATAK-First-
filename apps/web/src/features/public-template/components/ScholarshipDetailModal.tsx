import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState, useRef } from 'react';
import { PublishedScholarshipDetails } from './PublishedScholarshipDetails';
import { Scholarship, Service } from '../types';
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
  ShieldCheck,
  BookOpen,
  BookOpenText,
  Briefcase,
  FileText,
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
  ChevronLeft,
  Heart,
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
  const similarScrollRef = useRef<HTMLDivElement>(null);
  const universitiesScrollRef = useRef<HTMLDivElement>(null);
  const [uniScrollProgress, setUniScrollProgress] = useState({ ratio: 0.35, offset: 0 });

  const handleUniScroll = () => {
    const el = universitiesScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setUniScrollProgress({ ratio: 1, offset: 0 });
      return;
    }
    const currentScroll = Math.abs(el.scrollLeft);
    const visibleRatio = Math.max(0.2, Math.min(1, el.clientWidth / el.scrollWidth));
    const offsetRatio = Math.max(0, Math.min(1 - visibleRatio, (currentScroll / maxScroll) * (1 - visibleRatio)));
    setUniScrollProgress({ ratio: visibleRatio, offset: offsetRatio });
  };

  useDetailSearchTarget(searchAnchor, searchTerm);

  if (!scholarship) return null;

  const isCsc =
    scholarship.id === 'csc-china' ||
    Boolean(scholarship.benefitGroups?.length) ||
    Boolean(scholarship.majorsByLanguage);

  const renderSectionHeader = ({
    id,
    icon: Icon,
    title,
    level = 3,
    className = '',
  }: {
    id?: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    level?: 2 | 3 | 4;
    className?: string;
  }) => {
    if (isCsc) {
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
    return <DetailSectionHeader id={id} icon={Icon as any} title={title} level={level} className={className} />;
  };

  const handleSaveClick = () => {
    onToggleFavorite(scholarship.id);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const defaultDocuments = [
    { name: 'جواز السفر', icon: Globe },
    { name: 'آخر شهادة دراسية', icon: GraduationCap },
    { name: 'كشف الدرجات', icon: FileText },
    { name: 'خطة الدراسة أو البحث', icon: PenTool },
    { name: 'خطابات توصية للدراسات العليا', icon: Users },
    { name: 'خطاب قبول مبدئي إذا كان مطلوبًا في مسار التقديم', icon: Building2 },
    { name: 'الفحص الطبي', icon: Activity },
    { name: 'شهادة خلو سوابق', icon: Shield },
    { name: 'نموذج طلب منحة CSC', icon: FileCheck },
  ];

  const documentIcons = [Globe, GraduationCap, FileText, PenTool, Users, Building2, Activity, Shield, FileCheck];
  const resolvedDocuments = scholarship.requiredDocumentsList?.length
    ? scholarship.requiredDocumentsList.map((name, idx) => ({
        name,
        icon: documentIcons[idx % documentIcons.length],
      }))
    : defaultDocuments;

  const resolvedRequirements =
    scholarship.id !== 'csc-china' && scholarship.requirements?.length
      ? scholarship.requirements.map((text) => ({ text }))
      : [
          { text: 'ألا يكون المتقدم حاملاً للجنسية الصينية ويتمتع بصحة جيدة.' },
          { text: 'العمر: أقل من 25 للبكالوريوس، 35 للماجستير، 40 للدكتوراه.' },
          { text: 'امتلاك سجل أكاديمي متميز ومعدل تراكمي عالي.' },
          { text: 'ألا يكون حاصلاً على منحة دراسية أخرى في الصين بنفس الوقت.' },
        ];

  const resolvedNotes = scholarship.importantNotes?.length
    ? scholarship.importantNotes
    : [
        {
          label: publicT('public_category_a'),
          text: publicT('public_apply_through_the_ministries_and_embassies_of_your'),
        },
        {
          label: publicT('public_category_b'),
          text: publicT('public_apply_through_universities_and_the_chinese_government_limited'),
        },
      ];

  const currentLanguageMajorGroups = scholarship.majorsByLanguage?.[activeMajorTab];

  return (
    <div className="w-full max-w-md md:max-w-[1120px] lg:max-w-[1160px] mx-auto pt-0 pb-12 text-start font-['Cairo',sans-serif] animate-in fade-in duration-200 bg-[var(--mn-surface-muted)] min-h-screen mn-panel mn-scholarship-detail">
      {/* 1. TOP HERO CONTAINER (Compact horizontal layout matching UniversityDetailModal & MajorDetailModal) */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute top-2 left-2 md:top-3.5 md:left-4 z-30 flex flex-col md:flex-row items-center gap-1.5 md:gap-2 scale-80 md:scale-100 origin-top-left">
          <DetailBackButton onBack={onClose} mode="back" />
          <button
            type="button"
            onClick={handleSaveClick}
            className="mn-detail-close transition-all active:scale-95 cursor-pointer"
            aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          >
            <Heart
              className={`h-3.5 w-3.5 md:h-4 md:w-4 ${
                isFavorite
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
              <linearGradient id="heroGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#142B5F" />
                <stop offset="52%" stopColor="#153B75" />
                <stop offset="100%" stopColor="#0E7C86" />
              </linearGradient>
            </defs>

            {/* Main base background */}
            <path d="M 0,0 L 500,0 L 500,90 Q 250,112 0,90 Z" fill="url(#heroGreenGrad)" />

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

          {/* Hero Content: Horizontal Row (Glowing Gold Graduation Emblem Right -> Arrow -> Title Left) */}
          <div
            className="absolute inset-0 flex items-center justify-between px-4 sm:px-6 md:px-8 pt-1 pb-4 z-10"
            dir={publicDir}
          >
            {/* Right Side: Official Logo/Emblem Pairing (Navy + Gold) + Interactive Arrow */}
            <div className="flex items-center gap-2.5 md:gap-3.5 shrink-0">
              {/* Circular Frame with Gold Graduation Cap inside */}
              <div className="w-11 h-11 md:w-14 md:h-14 rounded-full border-2 border-[#F2CD78] flex items-center justify-center p-1.5 shadow-[0_0_12px_rgba(214,164,59,0.45)] bg-gradient-to-br from-[#142B5F] to-[#0E7C86] shrink-0">
                <svg viewBox="0 0 40 40" className="w-full h-full">
                  <defs>
                    <linearGradient id="goldCapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--mn-accent-soft)" />
                      <stop offset="45%" stopColor="var(--mn-accent-soft)" />
                      <stop offset="100%" stopColor="var(--mn-accent)" />
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

              {/* Subtle arrow pointing from the graduation cap to the title */}
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-[#F2CD78] shrink-0 opacity-95 drop-shadow-[0_0_4px_rgba(214,164,59,0.4)]" />
            </div>

            {/* Left Side (in RTL): Scholarship Title & English Subtitle */}
            <div className="flex flex-col text-start min-w-0 flex-1 pr-1.5 md:pr-2 pl-7 sm:pl-8 md:pl-14">
              <h1 className="text-[13px] sm:text-[13.5px] md:text-lg lg:text-xl font-bold text-white leading-snug line-clamp-2 break-words drop-shadow-sm">
                {scholarship.title}
              </h1>
              <p className="text-[9.5px] sm:text-[10.5px] md:text-xs font-bold text-[#F2CD78] font-['Cairo',sans-serif] mt-0.5 tracking-wider truncate">
                {scholarship.titleEn}
              </p>
            </div>
          </div>
        </div>
      </div>

      {scholarship.publishedData ? (
        <PublishedScholarshipDetails scholarship={scholarship} onOpenUniversity={onOpenUniversity} onOpenExam={onOpenExam} />
      ) : (
        <div className="px-0 md:px-4 space-y-2.5 md:space-y-4 z-20 relative -mt-2.5 sm:-mt-3">
          {/* 2. DONOR AUTHORITY CARD */}
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl py-3.5 md:py-4 px-3.5 sm:px-4 md:px-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 flex items-center gap-3 md:gap-4 overflow-hidden mn-panel"
            dir={publicDir}
          >
            {/* Top Navy / Gold Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {/* Navy Circle with Gold Building Icon */}
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-[#142B5F] flex items-center justify-center shrink-0 shadow-xs border border-[#D6A43B]/75">
              <Building2 className="w-4 h-4 md:w-5 md:h-5 text-[#F2CD78]" />
            </div>

            {/* Vertical Divider Line */}
            <div className="w-[1.5px] h-7 md:h-9 bg-[var(--mn-border)] shrink-0 rounded-full" />

            {/* Donor Text */}
            <div className="space-y-0.5 min-w-0 flex-1 text-start">
              <h2 className="text-[11px] sm:text-xs md:text-base font-bold text-[var(--mn-heading)] leading-tight">
                {scholarship.donorName
                  ? scholarship.donorName
                  : scholarship.id === 'csc-china'
                    ? publicT('public_china_scholarship_council_csc_chinese_ministry_of_education')
                    : scholarship.university || publicT('public_government_funding_organization')}
              </h2>
              <p className="text-[9px] md:text-xs font-medium text-[var(--mn-text-muted)] font-['Cairo',sans-serif] truncate">
                {scholarship.donorNameEn
                  ? scholarship.donorNameEn
                  : scholarship.id === 'csc-china'
                    ? 'China Scholarship Council (CSC) - Ministry of Education of PRC'
                    : scholarship.universityEn || 'Official Government Donor'}
              </p>
            </div>
          </div>

          {/* 3. 2-COLUMN X 3-ROW QUICK INFO GRID */}
          <div className="px-2 sm:px-2.5 md:px-0 space-y-2 md:space-y-3 pt-0.5" dir={publicDir}>
            {/* ROW 1: دولة الدراسة | الدرجات العلمية */}
            <div className="flex items-stretch gap-2 md:gap-3">
              {/* Right Card: دولة الدراسة */}
              <button
                type="button"
                onClick={() => scholarship.countryReferenceId && onOpenCountry?.(scholarship.countryReferenceId)}
                className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 md:p-4 border border-[var(--mn-border)] shadow-sm flex items-center gap-2 md:gap-3 min-w-0 hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] hover:shadow-md active:scale-[0.99] transition-all text-start group cursor-pointer mn-panel"
                title={publicT('public_explore_country_name', { v0: scholarship.country })}
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] dark:bg-[#F2CD78]/15 dark:border-[#F2CD78] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 md:w-5 md:h-5 text-current" />
                </div>
                <div className="flex flex-col min-w-0 text-start flex-1">
                  <span className="text-[10.5px] sm:text-[11px] md:text-sm font-bold text-[var(--mn-heading)] leading-tight truncate">
                    {publicT('public_study_country')}
                  </span>
                  <span className="text-[9.5px] md:text-xs font-bold text-[var(--mn-text-muted)] leading-tight truncate mt-0.5">
                    {scholarship.country}
                  </span>
                </div>
                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <ArrowUpLeft className="w-3 h-3 md:w-3.5 md:h-3.5 stroke-[2.5] shrink-0" />
                </div>
              </button>

              {/* Diamond Connector */}
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 self-center rotate-45 bg-[#D6A43B] shadow-[0_0_5px_rgba(214,164,59,0.5)] shrink-0" />

              {/* Left Card: الدرجات العلمية */}
              <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 md:p-4 border border-[var(--mn-border)] shadow-sm flex items-center gap-2 md:gap-3 min-w-0 mn-panel">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] dark:bg-[#F2CD78]/15 dark:border-[#F2CD78] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-current" />
                </div>
                <div className="flex flex-col min-w-0 text-start">
                  <span className="text-[10.5px] sm:text-[11px] md:text-sm font-bold text-[var(--mn-heading)] leading-tight truncate">
                    {publicT('public_degrees')}
                  </span>
                  <span className="text-[9px] md:text-xs font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] tracking-tight leading-tight truncate mt-0.5">
                    {scholarship.degreesShortLabel || 'BSc • MSc • PhD'}
                  </span>
                </div>
              </div>
            </div>

            {/* ROW 2: انتهاء التقديم | نوع التمويل */}
            <div className="flex items-stretch gap-2 md:gap-3">
              {/* Right Card: انتهاء التقديم */}
              <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 md:p-4 border border-[var(--mn-border)] shadow-sm flex items-center gap-2 md:gap-3 min-w-0 mn-panel">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] dark:bg-[#F2CD78]/15 dark:border-[#F2CD78] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-current" />
                </div>
                <div className="flex flex-col min-w-0 text-start">
                  <span className="text-[10.5px] sm:text-[11px] md:text-sm font-bold text-[var(--mn-heading)] leading-tight truncate">
                    {publicT('public_application_deadline')}
                  </span>
                  <span className="text-[9.5px] md:text-xs font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] leading-tight truncate mt-0.5">
                    {scholarship.id === 'csc-china' ? '31-03-2027' : scholarship.deadline}
                  </span>
                </div>
              </div>

              {/* Diamond Connector */}
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 self-center rotate-45 bg-[#D6A43B] shadow-[0_0_5px_rgba(214,164,59,0.5)] shrink-0" />

              {/* Left Card: نوع التمويل */}
              <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 md:p-4 border border-[var(--mn-border)] shadow-sm flex items-center gap-2 md:gap-3 min-w-0 mn-panel">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] dark:bg-[#F2CD78]/15 dark:border-[#F2CD78] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-current" />
                </div>
                <div className="flex flex-col min-w-0 text-start">
                  <span className="text-[10.5px] sm:text-[11px] md:text-sm font-bold text-[var(--mn-heading)] leading-tight truncate">
                    {publicT('public_funding_type')}
                  </span>
                  <span className="text-[9.5px] md:text-xs font-bold text-[var(--mn-accent-text)] leading-tight truncate mt-0.5">
                    {scholarship.fundingType || publicT('public_fully_funded')}
                  </span>
                </div>
              </div>
            </div>

            {/* ROW 3: لغة الدراسة | الجهة المانحة */}
            <div className="flex items-stretch gap-2 md:gap-3">
              {/* Right Card: لغة الدراسة */}
              <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 md:p-4 border border-[var(--mn-border)] shadow-sm flex items-center gap-2 md:gap-3 min-w-0 mn-panel">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] dark:bg-[#F2CD78]/15 dark:border-[#F2CD78] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                  <Languages className="w-4 h-4 md:w-5 md:h-5 text-current" />
                </div>
                <div className="flex flex-col min-w-0 text-start">
                  <span className="text-[10.5px] sm:text-[11px] md:text-sm font-bold text-[var(--mn-heading)] leading-tight truncate">
                    {publicT('public_study_language')}
                  </span>
                  <span className="text-[9.5px] md:text-xs font-bold text-[var(--mn-text-muted)] leading-tight truncate mt-0.5">
                    {scholarship.studyLanguageLabel || publicT('public_english_chinese')}
                  </span>
                </div>
              </div>

              {/* Diamond Connector */}
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 self-center rotate-45 bg-[#D6A43B] shadow-[0_0_5px_rgba(214,164,59,0.5)] shrink-0" />

              {/* Left Card: الجهة المانحة */}
              <div className="flex-1 bg-[var(--mn-surface)] rounded-2xl p-2.5 md:p-4 border border-[var(--mn-border)] shadow-sm flex items-center gap-2 md:gap-3 min-w-0 mn-panel">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#142B5F]/10 border-2 border-[#142B5F] text-[#142B5F] dark:bg-[#F2CD78]/15 dark:border-[#F2CD78] dark:text-[#F2CD78] flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 md:w-5 md:h-5 text-current" />
                </div>
                <div className="flex flex-col min-w-0 text-start">
                  <span className="text-[10.5px] sm:text-[11px] md:text-sm font-bold text-[var(--mn-heading)] leading-tight truncate">
                    {publicT('public_funding_organization')}
                  </span>
                  <span className="text-[9.5px] md:text-xs font-bold text-[var(--mn-text-muted)] leading-tight truncate mt-0.5">
                    {scholarship.donorTypeLabel || publicT('public_government')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. ABOUT SCHOLARSHIP SECTION (نبذة عن المنحة) */}
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
            {renderSectionHeader({ id: 'scholarship-about', icon: BookOpen, title: publicT('public_scholarship_overview'), level: 3 })}

            <div className="relative overflow-hidden rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] pl-3.5 pr-4 py-3 md:p-4">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#E5B54F]" />
              <p className="text-[11.5px] sm:text-xs font-bold text-[var(--mn-text)] leading-[1.95] text-justify font-['Cairo',sans-serif] pr-1.5">
                <span className="inline-block w-3 h-3 rounded-[3px] bg-[#142B5F] shadow-[2px_2px_0px_#0E7C86] ml-2 align-middle shrink-0" />
                {scholarship.description}
              </p>
            </div>
          </div>

          {/* 5. FUNDING & BENEFITS SECTION (المميزات والتمويل) */}
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderSectionHeader({
              id: 'scholarship-funding',
              icon: Coins,
              title: publicT('public_benefits_and_funding'),
              level: 3,
            })}

            {scholarship.benefitGroups && scholarship.benefitGroups.length > 0 ? (
              <div className="space-y-3.5 md:space-y-4">
                {scholarship.benefitGroups.map((group, groupIdx) => (
                  <div
                    key={group.id}
                    className={groupIdx > 0 ? 'pt-3 md:pt-3.5 border-t border-[var(--mn-border)]/80' : ''}
                  >
                    {/* Compact Subsection Header with Small Icon (distinct from the main section header) */}
                    <div className="flex items-center justify-between gap-2 mb-2 md:mb-2.5 px-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs">
                          <Coins className="w-3.5 h-3.5 text-[#F2CD78]" />
                        </span>
                        <h4 className="text-[11.5px] sm:text-xs md:text-[13px] font-bold text-[var(--mn-heading)] leading-snug">
                          {group.title}
                        </h4>
                      </div>
                      {group.badge && (
                        <span className="shrink-0 px-2 py-0.5 rounded-lg bg-[#142B5F]/10 dark:bg-[#D6A43B]/15 border border-[#142B5F]/25 dark:border-[#D6A43B]/45 text-[9px] sm:text-[9.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
                          {group.badge}
                        </span>
                      )}
                    </div>

                    {/* Standard Benefit Boxes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 items-stretch">
                      {group.items.map((label, idx) => (
                        <div
                          key={idx}
                          className="h-full flex items-center gap-2.5 px-3 py-2 md:px-4 md:py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] transition-colors"
                        >
                          <div className="w-4.5 h-4.5 md:w-5 md:h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs">
                            <Check className="w-2.5 h-2.5 md:w-3 md:h-3 stroke-[2.75]" />
                          </div>
                          <span className="text-[10.5px] font-bold leading-tight truncate text-[var(--mn-heading)]">
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 items-stretch">
                {(scholarship.id !== 'csc-china' && scholarship.financialCoverage?.length
                  ? scholarship.financialCoverage.map((label) => ({ label, isNumericHighlight: false }))
                  : [
                      { label: 'إعفاء 100% من الرسوم الدراسية', isNumericHighlight: true },
                      { label: 'راتب شهري (2500¥ - 3500¥)', isNumericHighlight: true },
                      { label: 'سكن جامعي مجاني', isNumericHighlight: false },
                      { label: 'تأمين طبي وصحي شامل', isNumericHighlight: false },
                      { label: 'سنة تحضيرية للغة مجاناً', isNumericHighlight: false },
                      { label: 'إعفاء من رسوم التأشيرة والإقامة', isNumericHighlight: false },
                    ]
                ).map((benefit, idx) => (
                  <div
                    key={idx}
                    className="h-full flex items-center gap-2.5 px-3 py-2 md:px-4 md:py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] transition-colors"
                  >
                    <div className="w-4.5 h-4.5 md:w-5 md:h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs">
                      <Check className="w-2.5 h-2.5 md:w-3 md:h-3 stroke-[2.75]" />
                    </div>
                    <span className="text-[10.5px] font-bold leading-tight truncate text-[var(--mn-heading)]">
                      {benefit.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. MAJORS SECTION (التخصصات المتاحة) */}
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderSectionHeader({ id: 'scholarship-majors', icon: BookOpen, title: publicT('public_available_majors_2'), level: 3 })}

            {/* Degree Switcher */}
            <div className="flex gap-1.5 md:gap-2.5 mb-3 md:mb-4 overflow-x-auto hide-scrollbar">
              <button
                type="button"
                onClick={() => setActiveMajorTab('bachelor')}
                className={`px-3.5 md:px-5 py-1.5 md:py-2 text-[10.5px] font-bold rounded-xl transition-all whitespace-nowrap border cursor-pointer ${
                  activeMajorTab === 'bachelor'
                    ? 'mn-degree-tab-active'
                    : 'bg-[var(--mn-page)] text-[var(--mn-text-muted)] border-[var(--mn-border)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] hover:text-[var(--mn-heading)]'
                }`}
                data-mn-design="98e8ac3671"
              >
                {publicT('public_bachelors')}
              </button>
              <button
                type="button"
                onClick={() => setActiveMajorTab('master')}
                className={`px-3.5 md:px-5 py-1.5 md:py-2 text-[10.5px] font-bold rounded-xl transition-all whitespace-nowrap border cursor-pointer ${
                  activeMajorTab === 'master'
                    ? 'mn-degree-tab-active'
                    : 'bg-[var(--mn-page)] text-[var(--mn-text-muted)] border-[var(--mn-border)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] hover:text-[var(--mn-heading)]'
                }`}
                data-mn-design="98e8ac3671"
              >
                {publicT('public_masters')}
              </button>
              <button
                type="button"
                onClick={() => setActiveMajorTab('phd')}
                className={`px-3.5 md:px-5 py-1.5 md:py-2 text-[10.5px] font-bold rounded-xl transition-all whitespace-nowrap border cursor-pointer ${
                  activeMajorTab === 'phd'
                    ? 'mn-degree-tab-active'
                    : 'bg-[var(--mn-page)] text-[var(--mn-text-muted)] border-[var(--mn-border)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] hover:text-[var(--mn-heading)]'
                }`}
                data-mn-design="98e8ac3671"
              >
                {publicT('public_doctorate')}
              </button>
              <button
                type="button"
                onClick={() => setActiveMajorTab('fellowship')}
                className={`px-3.5 md:px-5 py-1.5 md:py-2 text-[10.5px] font-bold rounded-xl transition-all whitespace-nowrap border cursor-pointer ${
                  activeMajorTab === 'fellowship'
                    ? 'mn-degree-tab-active'
                    : 'bg-[var(--mn-page)] text-[var(--mn-text-muted)] border-[var(--mn-border)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] hover:text-[var(--mn-heading)]'
                }`}
                data-mn-design="98e8ac3671"
              >
                {publicT('public_fellowships')}
              </button>
            </div>

            {/* Majors List: Grouped by Language if majorsByLanguage is defined, otherwise standard list */}
            {currentLanguageMajorGroups && currentLanguageMajorGroups.length > 0 ? (
              <div className="space-y-3.5 md:space-y-4 animate-in fade-in duration-300">
                {currentLanguageMajorGroups.map((langGroup, groupIdx) => (
                  <div
                    key={langGroup.id}
                    className={groupIdx > 0 ? 'pt-3 md:pt-3.5 border-t border-[var(--mn-border)]/80' : ''}
                  >
                    {/* Compact Subsection Header with Small Icon for Language Track */}
                    <div className="flex items-center justify-between gap-2 mb-2 md:mb-2.5 px-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs">
                          <Languages className="w-3.5 h-3.5 text-[#F2CD78]" />
                        </span>
                        <h4 className="text-[11.5px] sm:text-xs md:text-[13px] font-bold text-[var(--mn-heading)] leading-snug">
                          {langGroup.languageLabel}
                        </h4>
                      </div>
                      {langGroup.badge && (
                        <span className="shrink-0 px-2 py-0.5 rounded-lg bg-[#142B5F]/10 dark:bg-[#D6A43B]/15 border border-[#142B5F]/25 dark:border-[#D6A43B]/45 text-[9px] sm:text-[9.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]">
                          {langGroup.badge}
                        </span>
                      )}
                    </div>

                    {/* Standard Major Chips */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-2.5">
                      {langGroup.majors.map((major) => (
                        <button
                          key={major.label}
                          type="button"
                          onClick={() => major.majorId && onOpenMajor?.(major.majorId)}
                          aria-label={major.majorId ? publicT('public_open_major_page', { v0: major.label }) : undefined}
                          data-mn-design="98e8ac3671"
                          className={`mn-major-chip inline-flex items-center gap-1 px-2.5 md:px-3.5 py-1 md:py-2 bg-[var(--mn-page)] border border-[var(--mn-border)] text-[var(--mn-text)] text-[10.5px] font-bold rounded-xl transition-all group ${
                            major.majorId
                              ? 'hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] hover:text-[var(--mn-heading)] hover:shadow-2xs active:scale-95 cursor-pointer'
                              : 'cursor-default'
                          }`}
                        >
                          <span>{major.label}</span>
                          {major.majorId && (
                            <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-interactive-arrow)] group-hover:scale-110 transition-all duration-200 -mr-0.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-2.5 animate-in fade-in duration-300">
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
                      data-mn-design="98e8ac3671"
                      className={`mn-major-chip inline-flex items-center gap-1 px-2.5 md:px-3.5 py-1 md:py-2 bg-[var(--mn-page)] border border-[var(--mn-border)] text-[var(--mn-text)] text-[10.5px] font-bold rounded-xl transition-all group ${
                        major.majorId
                          ? 'hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] hover:text-[var(--mn-heading)] hover:shadow-2xs active:scale-95 cursor-pointer'
                          : 'cursor-default'
                      }`}
                    >
                      <span>{major.label}</span>
                      {major.majorId && (
                        <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-interactive-arrow)] group-hover:scale-110 transition-all duration-200 -mr-0.5" />
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
                      data-mn-design="98e8ac3671"
                      className="mn-major-chip inline-flex items-center gap-1 px-2.5 md:px-3.5 py-1 md:py-2 bg-[var(--mn-page)] border border-[var(--mn-border)] text-[var(--mn-text)] text-[10.5px] font-bold rounded-xl hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] hover:text-[var(--mn-heading)] hover:shadow-2xs active:scale-95 transition-all cursor-pointer group"
                    >
                      <span>{major}</span>
                      <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-interactive-arrow)] group-hover:scale-110 transition-all duration-200 -mr-0.5" />
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
                      data-mn-design="98e8ac3671"
                      className="mn-major-chip inline-flex items-center gap-1 px-2.5 md:px-3.5 py-1 md:py-2 bg-[var(--mn-page)] border border-[var(--mn-border)] text-[var(--mn-text)] text-[10.5px] font-bold rounded-xl hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] hover:text-[var(--mn-heading)] hover:shadow-2xs active:scale-95 transition-all cursor-pointer group"
                    >
                      <span>{major}</span>
                      <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-interactive-arrow)] group-hover:scale-110 transition-all duration-200 -mr-0.5" />
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
                      data-mn-design="98e8ac3671"
                      className="mn-major-chip inline-flex items-center gap-1 px-2.5 md:px-3.5 py-1 md:py-2 bg-[var(--mn-page)] border border-[var(--mn-border)] text-[var(--mn-text)] text-[10.5px] font-bold rounded-xl hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] hover:text-[var(--mn-heading)] hover:shadow-2xs active:scale-95 transition-all cursor-pointer group"
                    >
                      <span>{major}</span>
                      <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-interactive-arrow)] group-hover:scale-110 transition-all duration-200 -mr-0.5" />
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* 7. PARTICIPATING UNIVERSITIES SECTION (الجامعات المشاركة) */}
          {scholarship.participatingUniversities && scholarship.participatingUniversities.length > 0 && (
            <div
              className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
              dir={publicDir}
            >
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
              {renderSectionHeader({ id: 'scholarship-universities', icon: Building2, title: publicT('public_participating_universities'), level: 3 })}

              <div
                ref={universitiesScrollRef}
                onScroll={handleUniScroll}
                className="grid grid-rows-2 grid-flow-col auto-cols-[64%] sm:auto-cols-[190px] md:grid-rows-none md:grid-flow-row md:auto-cols-auto md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 overflow-x-auto md:overflow-visible pb-1.5 pt-0.5 scrollbar-none snap-x snap-mandatory items-stretch"
                data-mn-design="9856d4f1a6"
              >
                {scholarship.participatingUniversities.map((university) => {
                  return (
                    <button
                      key={university.id}
                      type="button"
                      onClick={() => onOpenUniversity?.(university.id)}
                      className="w-full h-full snap-start flex flex-col justify-between gap-1.5 md:gap-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] p-2 md:p-3.5 text-start transition-all group cursor-pointer shadow-2xs"
                    >
                      {/* Top row: Navy Circle + Gold Icon inside */}
                      <div className="flex items-center gap-1.5 md:gap-2.5 min-w-0">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#142B5F] flex items-center justify-center shrink-0 shadow-xs border border-[#D6A43B]/75">
                          <Building2 className="w-3 h-3 md:w-4 md:h-4 text-[#F2CD78]" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-[var(--mn-heading)] leading-tight truncate">
                            {university.name}
                          </div>
                          <div className="text-[8px] font-semibold text-[var(--mn-text-muted)] font-['Cairo',sans-serif] truncate">
                            {university.nameEn}
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: Location (بكين • الصين) + ARR-13 (فتح ↖) */}
                      <div className="flex items-center justify-between gap-1 pt-1 md:pt-2 border-t border-[var(--mn-border)]/70">
                        {university.city ? (
                          <div className="inline-flex items-center gap-0.5 min-w-0 text-[8px] font-bold text-[var(--mn-text-muted)] truncate">
                            <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#0E7C86] shrink-0" />
                            <span className="truncate">
                              {university.city}{publicT('public_separator')}{' '}{scholarship.country}
                            </span>
                          </div>
                        ) : (
                          <span />
                        )}

                        <span className="px-2 md:px-2.5 py-0.5 rounded-full bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] text-white text-[8px] font-bold inline-flex items-center gap-0.5 shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                          <span>فتح</span>
                          <ArrowUpLeft className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#F2CD78]" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Full-width Extended Scroll Progress Track (من اليمين لليسار يوضح المساحة المحتوى) */}
              <div className="pt-2 px-1 md:hidden">
                <div className="w-full h-[5px] rounded-full bg-[var(--mn-border)] overflow-hidden relative shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] shadow-xs transition-all duration-150"
                    data-mn-width={Math.round(Math.max(0, Math.min(100, Number(Math.round(uniScrollProgress.ratio * 100)) || 0)))} data-mn-margin-right={Math.round(Math.max(0, Math.min(100, Number(Math.round(uniScrollProgress.offset * 100)) || 0)))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 8. ELIGIBILITY SECTION (الشروط ومعايير التقديم) */}
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderSectionHeader({ id: 'scholarship-requirements', icon: ShieldCheck, title: publicT('public_application_requirements_and_criteria'), level: 3 })}

            <div className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3 items-stretch">
              {resolvedRequirements.map((condition, idx) => (
                <div
                  key={idx}
                  className="h-full flex items-start gap-2.5 px-3 py-2 md:px-4 md:py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] transition-colors"
                >
                  {/* عمودان رأسيان متدرجان: الأول نيلي المنارة (#142B5F) والثاني بترولي الأفق (#0E7C86) */}
                  <span className="inline-flex items-center gap-1 shrink-0 mt-0.5">
                    <span className="w-1 h-4 rounded-full bg-[#142B5F]" />
                    <span className="w-1 h-2.5 rounded-full bg-[#0E7C86]" />
                  </span>
                  <span className="text-[10.5px] font-bold text-[var(--mn-text)] leading-snug">
                    {condition.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 9. REQUIRED DOCUMENTS SECTION (المستندات المطلوبة) */}
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderSectionHeader({ id: 'scholarship-documents', icon: FileCheck, title: publicT('public_required_documents'), level: 3 })}

            <div className="flex flex-wrap gap-2 md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-2.5 items-stretch">
              {resolvedDocuments.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 md:px-3.5 md:py-2.5 bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-xl hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] transition-all group cursor-default text-start w-fit md:w-full h-full"
                >
                  <div className="text-[#142B5F] dark:text-[#F2CD78] shrink-0">
                    <doc.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <span className="text-[10.5px] font-bold text-[var(--mn-text)] group-hover:text-[var(--mn-heading)] transition-colors leading-tight">
                    {doc.name}
                  </span>
                </div>
              ))}

              <span id="scholarship-exams" className="scroll-mt-28 hidden" aria-hidden="true" />
              {(scholarship.requiredExams || []).map((exam) => (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => onOpenExam?.(exam.id)}
                  className="flex items-center justify-between gap-1.5 md:gap-2 px-2.5 py-1.5 md:px-3.5 md:py-2.5 bg-[var(--mn-page)] border border-[#142B5F]/30 dark:border-[#D6A43B]/50 rounded-xl hover:border-[#142B5F] dark:hover:border-[#F2CD78] active:scale-95 transition-all group cursor-pointer text-start w-fit md:w-full h-full"
                  title={publicT('public_open_title', { v0: exam.name })}
                >
                  <span className="flex items-center gap-1.5 md:gap-2 min-w-0">
                    <span className="text-[#142B5F] dark:text-[#F2CD78] shrink-0">
                      <Languages className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </span>
                    <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-tight truncate">
                      {publicT('public_language_evidence')}{' '}{exam.nameEn}
                    </span>
                  </span>
                  <span className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-all -mr-0.5">
                    <ArrowUpLeft className="w-2.5 h-2.5 md:w-3 md:h-3 stroke-[2.5]" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 10. IMPORTANT NOTES SECTION (ملاحظات مهمة) */}
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderSectionHeader({ icon: Info, title: publicT('public_important_note'), level: 3 })}

            <div className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3.5 items-stretch">
              {resolvedNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="h-full relative overflow-hidden flex items-start gap-1.5 md:gap-2.5 bg-[var(--mn-page)] rounded-xl py-2.5 pl-3 pr-3.5 md:p-4 border border-[var(--mn-border)] transition-all"
                >
                  <div
                    className={`absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full ${
                      isCsc
                        ? 'bg-[#142B5F]'
                        : 'bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#E5B54F]'
                    }`}
                  />
                  <span className="w-2 h-2 rotate-45 rounded-[1.5px] bg-[#0E7C86] shrink-0 mt-[6px]" />
                  <p className="text-[10.5px] font-bold text-[var(--mn-text)] leading-relaxed">
                    <span className="text-[var(--mn-heading)] font-bold">{note.label}</span>{' '}
                    {note.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 11. CONTEXTUAL SERVICES SECTION (خدمات تساعدك بالتقديم) */}
          {contextualServices && contextualServices.length > 0 && (
            <section
              className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
              dir={publicDir}
            >
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

              {renderSectionHeader({ icon: Briefcase, title: publicT('public_services_that_may_help_during_your_application'), level: 3, className: 'mb-3' })}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 md:gap-3 items-stretch">
                {contextualServices.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => onOpenService?.(service)}
                    className="h-full relative overflow-hidden group flex items-center justify-between gap-2.5 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] pl-3 pr-3.5 py-2.5 md:p-3.5 text-start transition-all hover:bg-[var(--mn-surface)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] active:scale-[0.99] mn-panel shadow-2xs cursor-pointer"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0 right-0 w-3.5 h-[75%] rounded-tr-xl border-t-[3px] border-r-[3.5px] border-[#D6A43B] dark:border-[#F2CD78]"
                    />

                    <span className="flex items-start gap-2 min-w-0 flex-1 pr-0.5">
                      <span className="mt-1 w-3.5 h-3.5 rounded-full bg-[#142B5F]/10 dark:bg-[#D6A43B]/20 border border-[#142B5F]/40 dark:border-[#F2CD78]/55 flex items-center justify-center shrink-0 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] transition-colors leading-snug">
                          {service.title}
                        </span>
                        <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#142B5F]/10 dark:bg-[#D6A43B]/15 px-2 py-0.5 text-[8.5px] font-bold text-[var(--mn-heading)]">
                          <span className="w-1 h-1 rounded-full bg-[#D6A43B]" />
                          <span>{service.category}</span>
                        </span>
                      </span>
                    </span>

                    <ArrowUpLeft className="h-4 w-4 shrink-0 text-[var(--mn-interactive-arrow)] transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 12. RELATED ARTICLES SECTION (مقالات وأدلة مرتبطة) */}
          <section
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderSectionHeader({ icon: BookOpenText, title: publicT('public_related_articles_and_guides'), level: 3, className: 'mb-3' })}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 items-stretch">
              {(scholarship.relatedArticles && scholarship.relatedArticles.length > 0
                ? scholarship.relatedArticles
                : [
                    {
                      id: 'art_104',
                      title: 'تحديثات معايير الكفاءة اللغوية المطلوبة باختبار IELTS لعام 2026',
                    },
                  ]
              ).map((article) => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => onOpenArticle?.(article.id)}
                  className="h-full relative overflow-hidden group flex items-center justify-between gap-2 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-2.5 md:p-3.5 text-start transition-all hover:bg-[var(--mn-surface)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] active:scale-[0.99] mn-panel shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-md bg-[#0E7C86] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                      <BookOpenText className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-[10.5px] font-bold leading-snug text-[var(--mn-heading)] transition-colors line-clamp-2">
                        {article.title}
                      </p>
                    </div>
                  </div>
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-all">
                    <ArrowUpLeft className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0 stroke-[2.25]" />
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* 13. APPLICATION LINKS SECTION (طريقة التقديم) */}
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderSectionHeader({ id: 'scholarship-application', icon: MousePointerClick, title: publicT('public_how_to_apply'), level: 3 })}

            <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 items-stretch">
              {/* Primary Apply Button (Official Website) */}
              <a
                href={scholarship?.applicationUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="h-full relative overflow-hidden inline-flex items-center justify-between gap-2.5 rounded-2xl pl-3 pr-0 py-3 md:py-4 bg-white bg-gradient-to-bl from-[#142B5F]/[0.06] via-white to-[#0E7C86]/[0.08] border border-[#0E7C86]/25 hover:border-[#0E7C86] shadow-2xs active:scale-[0.99] transition-all group cursor-pointer mn-panel"
              >
                {/* خط هندسي يمتد من أعلى المربع إلى النهاية وينعطف لليسار شوي */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 bottom-0 right-0 w-4 rounded-r-2xl border-t-[3px] border-b-[3px] border-r-[3.5px] border-[#142B5F] dark:border-[#38C6D4]"
                />

                <div className="flex items-center gap-2 min-w-0 pr-0">
                  {/* خط يخرج من منتصف الخط الهندسي مع رأس سهم نيلي مقابل الكلام */}
                  <svg
                    className="w-7 h-3.5 shrink-0 text-[#142B5F] dark:text-[#38C6D4]"
                    viewBox="0 0 28 14"
                    fill="none"
                    aria-hidden="true"
                  >
                    <line x1="28" y1="7" x2="6" y2="7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                    <path d="M9.5 2.5 L2 7 L9.5 11.5 Z" fill="currentColor" />
                  </svg>
                  <span className="text-[10.5px] font-bold text-[#142B5F] dark:text-[var(--mn-heading)] leading-tight truncate">
                    {publicT('public_apply_through_the_official_scholarship_website')}
                  </span>
                </div>
                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <ExternalLink className="w-2.5 h-2.5 md:w-3 md:h-3 stroke-[2.25]" />
                </div>
              </a>

              {/* Secondary Apply Button (Manaratak Platform) */}
              <div
                aria-label={publicT('public_applications_through_manaratak_are_currently_unavailable')}
                className="h-full relative overflow-hidden inline-flex items-center justify-between gap-2.5 rounded-2xl pl-3 pr-0 py-3 md:py-4 bg-white bg-gradient-to-bl from-[#142B5F]/[0.06] via-white to-[#0E7C86]/[0.08] border border-[#0E7C86]/25 hover:border-[#142B5F]/45 shadow-2xs transition-all group cursor-default mn-panel"
              >
                {/* خط هندسي يمتد من أعلى المربع إلى النهاية وينعطف لليسار شوي */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 bottom-0 right-0 w-4 rounded-r-2xl border-t-[3px] border-b-[3px] border-r-[3.5px] border-[#142B5F] dark:border-[#38C6D4]"
                />

                <div className="flex items-center gap-2 min-w-0 pr-0">
                  {/* خط يخرج من منتصف الخط الهندسي مع رأس سهم نيلي مقابل الكلام */}
                  <svg
                    className="w-7 h-3.5 shrink-0 text-[#142B5F] dark:text-[#38C6D4]"
                    viewBox="0 0 28 14"
                    fill="none"
                    aria-hidden="true"
                  >
                    <line x1="28" y1="7" x2="6" y2="7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                    <path d="M9.5 2.5 L2 7 L9.5 11.5 Z" fill="currentColor" />
                  </svg>
                  <span className="text-[10.5px] font-bold text-[#142B5F] dark:text-[var(--mn-heading)] leading-tight truncate">
                    {publicT('public_apply_through_manaratak')}
                  </span>
                </div>
                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs">
                  <Link className="w-2.5 h-2.5 md:w-3 md:h-3 stroke-[2.25]" />
                </div>
              </div>
            </div>
          </div>

          {/* 14. SIMILAR SCHOLARSHIPS SECTION */}
          <div
            className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mb-2 mn-panel"
            dir={publicDir}
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderSectionHeader({ icon: Copy, title: publicT('public_similar_scholarships_you_may_like'), level: 3 })}

            {(() => {
              const similarItems = [
                {
                  id: 'turkiye-burslari',
                  country: 'تركيا',
                  flagUrl: 'https://flagcdn.com/w80/tr.png',
                  title: 'منحة الحكومة التركية',
                  degreesLabel: 'BSc • MSc • PhD',
                  fundingLabel: publicT('public_fully_funded'),
                  deadline: 'ينتهي 20 فبراير',
                },
                {
                  id: 'chevening-uk',
                  country: 'المملكة المتحدة',
                  flagUrl: 'https://flagcdn.com/w80/gb.png',
                  title: 'منحة تشيفنينغ للدراسات العليا',
                  degreesLabel: 'ماجستير',
                  fundingLabel: publicT('public_fully_funded'),
                  deadline: 'ينتهي 5 نوفمبر',
                },
                {
                  id: 'daad-germany',
                  country: 'ألمانيا',
                  flagUrl: 'https://flagcdn.com/w80/de.png',
                  title: 'منح DAAD للدراسات العليا',
                  degreesLabel: 'MSc • PhD',
                  fundingLabel: publicT('public_fully_funded'),
                  deadline: 'ينتهي 31 أكتوبر',
                },
                {
                  id: 'csc-china',
                  country: 'الصين',
                  flagUrl: 'https://flagcdn.com/w80/cn.png',
                  title: 'منحة الحكومة الصينية',
                  degreesLabel: 'BSc • MSc • PhD',
                  fundingLabel: publicT('public_fully_funded'),
                  deadline: 'ينتهي 31 مارس',
                },
              ].filter((item) => item.id !== scholarship.id);

              return (
                <div>
                  <div
                    ref={similarScrollRef}
                    className="flex gap-2.5 overflow-x-auto mn-similar-scroll pb-2.5 pt-0.5 snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0 items-stretch"
                  >
                    {similarItems.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => onOpenScholarship?.(item.id)}
                        className="relative overflow-hidden w-[246px] sm:w-[260px] md:w-full h-full shrink-0 bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-2xl p-3 md:p-4 flex flex-col justify-between gap-2.5 md:gap-3 snap-center transition-all hover:bg-[var(--mn-surface)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] cursor-pointer text-start active:scale-[0.99] mn-panel group shadow-2xs"
                      >
                        {/* خط علوي خفيف من الأعلى بلون بترولي */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute top-0 inset-x-3 h-[2px] bg-gradient-to-r from-transparent via-[#0E7C86]/70 to-transparent"
                        />

                        {/* 1. Card Header: Navy-Petrol box with Circular Country Flag framed in Navy */}
                        <div className="rounded-xl px-2.5 py-2 md:px-3 md:py-2.5 bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white shadow-2xs flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full p-0.5 bg-[#142B5F] border-2 border-[#142B5F] ring-1 ring-white/45 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                            <img
                              src={item.flagUrl}
                              alt={item.country}
                              className="w-full h-full rounded-full object-cover"
                            />
                          </div>
                          <h4 className="text-[10.5px] font-bold text-white leading-snug line-clamp-2 break-words flex-1 font-['Cairo',sans-serif]">
                            {item.title}
                          </h4>
                        </div>

                        {/* 2. Structured 2x2 Key Details Grid with Navy Icons (No circles) */}
                        <div className="grid grid-cols-2 gap-1.25 md:gap-1.75">
                          {/* Country */}
                          <div className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-xl px-2 py-1.25 md:px-2.5 md:py-1.75 flex items-center gap-1.25 min-w-0 mn-panel">
                            <MapPin className="w-3.25 h-3.25 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                            <span className="text-[9.25px] font-bold text-[var(--mn-heading)] truncate">
                              {item.country}
                            </span>
                          </div>

                          {/* Funding Type */}
                          <div className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-xl px-2 py-1.25 md:px-2.5 md:py-1.75 flex items-center gap-1.25 min-w-0 mn-panel">
                            <Coins className="w-3.25 h-3.25 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                            <span className="text-[9.25px] font-bold text-[var(--mn-heading)] truncate">
                              {item.fundingLabel}
                            </span>
                          </div>

                          {/* Degrees */}
                          <div className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-xl px-2 py-1.25 md:px-2.5 md:py-1.75 flex items-center gap-1.25 min-w-0 mn-panel">
                            <GraduationCap className="w-3.25 h-3.25 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                            <span className="text-[8.75px] font-bold text-[var(--mn-heading)] truncate">
                              {item.degreesLabel}
                            </span>
                          </div>

                          {/* Deadline */}
                          <div className="bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-xl px-2 py-1.25 md:px-2.5 md:py-1.75 flex items-center gap-1.25 min-w-0 mn-panel">
                            <Calendar className="w-3.25 h-3.25 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                            <span className="text-[8.75px] font-bold text-[var(--mn-heading)] truncate">
                              {item.deadline}
                            </span>
                          </div>
                        </div>

                        {/* 3. Card Footer: عرض التفاصيل formatted as a clean square/rectangle without navigation arrow */}
                        <div className="pt-1 mt-auto">
                          <div className="w-full rounded-xl py-1.25 md:py-1.75 px-3 bg-[var(--mn-surface)] border border-[#142B5F]/30 dark:border-[#D6A43B]/45 text-[9.75px] font-bold text-[#142B5F] dark:text-[#F2CD78] flex items-center justify-center shadow-2xs group-hover:bg-[#142B5F] group-hover:text-white transition-colors font-['Cairo',sans-serif]">
                            عرض التفاصيل
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 15. ACTIONS BUTTONS (SAVE & SHARE) */}
          <div className="px-2.5 sm:px-3 pt-3 pb-2 flex justify-center gap-3 md:gap-4 w-full">
            <button
              onClick={() => {
                // Share functionality placeholder
              }}
              data-mn-design="efc9da21fc"
              className="py-2.5 md:py-3 px-6 md:px-8 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer bg-[var(--mn-surface)] text-[var(--mn-heading)] border border-[var(--mn-border)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] flex-1 max-w-[170px] md:max-w-[240px] mn-panel"
            >
              <span>{publicT('public_share_scholarship')}</span>
              <Share2 className="w-4 h-4 text-[var(--mn-heading)]" />
            </button>

            <button
              onClick={handleSaveClick}
              data-mn-design="efc9da21fc"
              className="py-2.5 md:py-3 px-6 md:px-8 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer flex-1 max-w-[170px] md:max-w-[240px] bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white border border-[#D6A43B]/75 mn-inverse"
            >
              <span>{isFavorite ? publicT('public_saved_3') : publicT('public_save_scholarship')}</span>
              <Bookmark
                className={`w-4 h-4 ${isFavorite ? 'fill-[#F2CD78] text-[#F2CD78]' : 'text-[#F2CD78]'}`}
              />
            </button>
          </div>
        </div>
      )}
      {scholarship.publishedData && (
        <div className="px-3 py-4 flex justify-center">
          <button
            type="button"
            onClick={handleSaveClick}
            className="flex items-center gap-2 rounded-2xl bg-[#142B5F] border border-[#D6A43B]/75 px-5 py-3 text-xs font-bold text-white transition-colors"
          >
            <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            {isFavorite ? publicT('public_saved_3') : publicT('public_save_scholarship')}
          </button>
        </div>
      )}
      {/* Save Notification Toast */}
      {saveToast && (
        <div className="fixed bottom-6 inset-x-4 max-w-xs mx-auto bg-[#142B5F] border border-[#D6A43B]/75 text-white px-4 py-2 rounded-full shadow-2xl z-50 flex items-center justify-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 mn-inverse">
          <Check className="w-3.5 h-3.5 text-[#F2CD78]" />
          <span>{isFavorite ? publicT('public_scholarship_added_to_my_favorites') : publicT('public_scholarship_removed_from_my_favorites')}</span>
        </div>
      )}
    </div>
  );
};
