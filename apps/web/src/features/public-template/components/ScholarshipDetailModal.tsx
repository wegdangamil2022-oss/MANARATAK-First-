import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState, useRef } from 'react';
import { PublishedScholarshipDetails } from './PublishedScholarshipDetails';
import { Scholarship, Service } from '../types';
import { DetailBackButton, useDetailSearchTarget } from './DetailUi';
import {
  Award,
  Building2,
  Calendar,
  CalendarClock,
  Clock,
  Landmark,
  School,
  Languages,
  Check,
  Globe2,
  Bookmark,
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
  ExternalLink,
  Send,
  Share2,
  MapPin,
  LayoutGrid,
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
    const offsetRatio = Math.max(
      0,
      Math.min(1 - visibleRatio, (currentScroll / maxScroll) * (1 - visibleRatio)),
    );
    setUniScrollProgress({ ratio: visibleRatio, offset: offsetRatio });
  };

  useDetailSearchTarget(searchAnchor, searchTerm);

  if (!scholarship) return null;

  // Unified Aligned Section Header: Consistent Right Inset + Proportional Navy/Gold Emblem + Navy-to-Petrol Hairline Underline
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
    const Heading = level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4';
    const underlineGradient =
      publicDir === 'ltr'
        ? 'bg-[linear-gradient(90deg,rgba(20,43,95,0.52)_0%,rgba(14,124,134,0.38)_58%,transparent_100%)] dark:bg-[linear-gradient(90deg,rgba(52,191,201,0.55)_0%,rgba(242,205,120,0.3)_58%,transparent_100%)]'
        : 'bg-[linear-gradient(270deg,rgba(20,43,95,0.52)_0%,rgba(14,124,134,0.38)_58%,transparent_100%)] dark:bg-[linear-gradient(270deg,rgba(52,191,201,0.55)_0%,rgba(242,205,120,0.3)_58%,transparent_100%)]';
    return (
      <>
        {/* Subtle chapter-marker top hairline separating long sections cleanly */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#142B5F]/32 dark:via-[#D6A43B]/35 to-transparent"
        />
        <div
          id={id}
          className={`scroll-mt-28 flex items-center justify-start ps-[27%] sm:ps-[28%] md:ps-[38%] mb-3.5 md:mb-4 ${className}`}
        >
          <div className="inline-flex items-center gap-2 md:gap-2.5 min-w-0 max-w-full">
            <span
              aria-hidden="true"
              className="relative overflow-hidden w-6.5 h-6.5 md:w-7.5 md:h-7.5 rounded-lg bg-[#142B5F] text-[#F2CD78] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(20,43,95,0.2)]"
            >
              <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 md:w-2.25 md:h-2.25 bg-[#D6A43B] rounded-bl-[4px]" />
              <Icon className="w-3.25 h-3.25 md:w-3.75 md:h-3.75 relative z-10 text-[#F2CD78]" />
            </span>
            <span className="inline-flex flex-col items-start min-w-0">
              <Heading className="text-[13.5px] sm:text-[14px] md:text-[15px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] leading-snug tracking-tight text-start">
                {title}
              </Heading>
              <span
                aria-hidden="true"
                className={`w-full min-w-[68px] h-[1.5px] mt-1 rounded-full ${underlineGradient}`}
              />
            </span>
          </div>
        </div>
      </>
    );
  };

  const handleSaveClick = () => {
    onToggleFavorite(scholarship.id);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const defaultDocuments = [
    { name: 'جواز السفر', icon: Globe2 },
    { name: 'آخر شهادة دراسية', icon: GraduationCap },
    { name: 'كشف الدرجات', icon: FileText },
    { name: 'خطة الدراسة أو البحث', icon: PenTool },
    { name: 'خطابات توصية للدراسات العليا', icon: Users },
    { name: 'خطاب قبول مبدئي إذا كان مطلوبًا في مسار التقديم', icon: Building2 },
    { name: 'الفحص الطبي', icon: Activity },
    { name: 'شهادة خلو سوابق', icon: Shield },
    { name: 'نموذج طلب منحة CSC', icon: FileCheck },
  ];

  const documentIcons = [
    Globe2,
    GraduationCap,
    FileText,
    PenTool,
    Users,
    Building2,
    Activity,
    Shield,
    FileCheck,
  ];
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

  const sectionCardClass =
    'relative w-full bg-white dark:bg-[#111E38] rounded-2xl p-3.5 sm:p-4 md:p-5 border border-[#142B5F]/10 dark:border-white/10 shadow-[0_2px_14px_rgba(20,43,95,0.045)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.25)] overflow-hidden mn-panel';

  return (
    <div className="w-full max-w-md md:max-w-[1120px] lg:max-w-[1160px] mx-auto pt-0 pb-12 text-start font-['Cairo',sans-serif] animate-in fade-in duration-200 bg-[#F6F8FA] dark:bg-[#0A1326] min-h-screen mn-panel mn-scholarship-detail">
      {/* 1. TOP HERO CONTAINER (Navy Right -> Petrol Left with Refined Glass Emblem & Muted Champagne Accent) */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute top-2.5 left-2.5 md:top-3.5 md:left-4 z-30 flex flex-col md:flex-row items-center gap-1.5 md:gap-2 scale-85 md:scale-100 origin-top-left">
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
                  ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#34BFC9] dark:text-[#34BFC9]'
                  : 'text-[#142B5F] dark:text-[#EDF5F5]'
              }`}
            />
          </button>
        </div>

        {/* SVG Hero Background: Navy (#142B5F) on Right -> Petrol (#0E7C86) on Left */}
        <div className="relative w-full h-[116px] sm:h-[124px] md:h-[146px]">
          <svg
            viewBox="0 0 500 116"
            preserveAspectRatio="none"
            className="w-full h-full absolute inset-0 block"
          >
            <defs>
              <linearGradient id="scholarshipHeroNavyRight" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#142B5F" />
                <stop offset="52%" stopColor="#153B75" />
                <stop offset="100%" stopColor="#0E7C86" />
              </linearGradient>
            </defs>

            {/* Base curved hero surface */}
            <path d="M 0,0 L 500,0 L 500,92 Q 250,112 0,92 Z" fill="url(#scholarshipHeroNavyRight)" />

            {/* Subtle architectural champagne waves */}
            <g opacity="0.18">
              <path
                d="M -50,30 Q 120,-10 260,35 T 550,20"
                stroke="#F2CD78"
                strokeWidth="1.25"
                fill="none"
              />
              <path
                d="M -30,62 Q 150,22 320,56 T 560,36"
                stroke="#F2CD78"
                strokeWidth="0.9"
                fill="none"
              />
              <circle cx="40" cy="24" r="1.4" fill="#F2CD78" />
              <circle cx="56" cy="18" r="1" fill="#F2CD78" />
              <circle cx="448" cy="22" r="1.4" fill="#F2CD78" />
              <circle cx="462" cy="36" r="1" fill="#F2CD78" />
            </g>

            {/* Refined hairline champagne bottom curve */}
            <path
              d="M 0,92 Q 250,112 500,92"
              fill="none"
              stroke="#F2CD78"
              strokeOpacity="0.65"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>

          {/* Hero Content: Clean Glass Emblem + Scholarship Title */}
          <div
            className="absolute inset-0 flex items-center gap-3 md:gap-4 px-4 sm:px-6 md:px-8 pt-1 pb-4 z-10"
            dir={publicDir}
          >
            {/* Glassmorphic Academic Emblem (Navy + Muted Champagne) */}
            <div className="w-11 h-11 md:w-14 md:h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-[#F2CD78]/45 flex items-center justify-center shadow-[0_6px_18px_rgba(0,0,0,0.18)] shrink-0">
              <GraduationCap className="w-6 h-6 md:w-7 md:h-7 text-[#F2CD78]" strokeWidth={1.85} />
            </div>

            {/* Scholarship Title & Knowledge Mist English Subtitle */}
            <div className="flex flex-col text-start min-w-0 flex-1 pl-8 sm:pl-9 md:pl-16">
              <h1 className="text-[13.5px] sm:text-[14.5px] md:text-lg lg:text-xl font-bold text-white leading-snug line-clamp-2 break-words drop-shadow-2xs">
                {scholarship.title}
              </h1>
              <p className="text-[9.5px] sm:text-[10.5px] md:text-xs font-semibold text-[#DDEFF2] font-['Cairo',sans-serif] mt-0.5 tracking-wide truncate">
                {scholarship.titleEn}
              </p>
            </div>
          </div>
        </div>
      </div>

      {scholarship.publishedData ? (
        <PublishedScholarshipDetails
          scholarship={scholarship}
          onOpenUniversity={onOpenUniversity}
          onOpenExam={onOpenExam}
        />
      ) : (
        <div className="px-2.5 sm:px-3 md:px-4 space-y-3.5 md:space-y-4.5 z-20 relative -mt-3">
          {/* 2. DONOR AUTHORITY CARD */}
          <div
            className="relative w-full bg-white dark:bg-[#111E38] rounded-2xl py-2.5 md:py-3.5 pl-3 pr-2.5 sm:px-4 md:px-5 border border-[#142B5F]/10 dark:border-white/10 shadow-[0_4px_16px_rgba(20,43,95,0.06)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.28)] flex items-center gap-2 md:gap-3.5 overflow-hidden mn-panel"
            dir={publicDir}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#34BFC9] dark:to-[#F2CD78]"
            />
            {/* Compact Navy Official Landmark Icon */}
            <div className="w-7.5 h-7.5 md:w-9.5 md:h-9.5 rounded-lg md:rounded-xl bg-[#142B5F] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(20,43,95,0.18)]">
              <Landmark className="w-3.75 h-3.75 md:w-4.5 md:h-4.5 text-[#F2CD78]" />
            </div>

            {/* Subtle Vertical Divider */}
            <div className="w-px h-6 md:h-8 bg-[#142B5F]/12 dark:bg-white/12 shrink-0" />

            {/* Donor Text */}
            <div className="space-y-0.5 min-w-0 flex-1 text-start">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="text-[10.5px] sm:text-xs md:text-[14.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-snug line-clamp-2 font-['Cairo',sans-serif]">
                  {scholarship.donorName
                    ? scholarship.donorName
                    : scholarship.id === 'csc-china'
                      ? publicT('public_china_scholarship_council_csc_chinese_ministry_of_education')
                      : scholarship.university || publicT('public_government_funding_organization')}
                </h2>
              </div>
              <p className="text-[9px] sm:text-[9.5px] md:text-[11.5px] font-medium text-[#5C707C] dark:text-[#9BB4C7] font-['Cairo',sans-serif] truncate">
                {scholarship.donorNameEn
                  ? scholarship.donorNameEn
                  : scholarship.id === 'csc-china'
                    ? 'China Scholarship Council (CSC) - Ministry of Education of PRC'
                    : scholarship.universityEn || 'Official Government Donor'}
              </p>
            </div>

            {/* Clean Official Donor Pill */}
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/15 dark:border-[#34BFC9]/25 text-[9.5px] font-bold text-[#0E7C86] dark:text-[#7FD4DE] shrink-0">
              {publicDir === 'ltr' ? 'Official' : 'جهة رسمية'}
            </span>
          </div>

          {/* 3. CLEAN 2x3 QUICK INFO GRID (No yellow diamonds — crisp soft-square icons) */}
          <div className="grid grid-cols-2 gap-2 md:gap-3" dir={publicDir}>
            {/* 1. دولة الدراسة */}
            <button
              type="button"
              onClick={() =>
                scholarship.countryReferenceId && onOpenCountry?.(scholarship.countryReferenceId)
              }
              className="bg-white dark:bg-[#111E38] rounded-2xl p-2.5 md:p-3.5 border border-[#142B5F]/10 dark:border-white/10 shadow-[0_2px_10px_rgba(20,43,95,0.035)] flex items-center gap-2.5 md:gap-3 min-w-0 hover:border-[#0E7C86]/45 dark:hover:border-[#34BFC9]/45 hover:shadow-[0_4px_14px_rgba(20,43,95,0.07)] active:scale-[0.99] transition-all text-start group cursor-pointer mn-panel"
              title={publicT('public_explore_country_name', { v0: scholarship.country })}
            >
              <div className="w-8.5 h-8.5 md:w-10 md:h-10 rounded-xl bg-[#DDEFF2]/75 dark:bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#34BFC9] flex items-center justify-center shrink-0 group-hover:bg-[#142B5F] group-hover:text-white transition-colors">
                <Globe2 className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="flex flex-col min-w-0 text-start flex-1">
                <span className="text-[10px] sm:text-[10.5px] md:text-xs font-semibold text-[#5C707C] dark:text-[#9BB4C7] leading-tight truncate">
                  {publicT('public_study_country')}
                </span>
                <span className="text-[11px] sm:text-[11.5px] md:text-sm font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-tight truncate mt-0.5">
                  {scholarship.country}
                </span>
              </div>
              <span className="w-6 h-6 md:w-6.5 md:h-6.5 rounded-full bg-[#142B5F] dark:bg-[#1B3A78] text-[#F2CD78] shadow-[0_2px_8px_rgba(20,43,95,0.22)] group-hover:bg-[#0E7C86] group-hover:text-white group-hover:scale-105 flex items-center justify-center shrink-0 transition-all">
                <ArrowUpLeft className="w-3.25 h-3.25 md:w-3.5 md:h-3.5 stroke-[2.4]" />
              </span>
            </button>

            {/* 2. الدرجات العلمية */}
            <div className="bg-white dark:bg-[#111E38] rounded-2xl p-2.5 md:p-3.5 border border-[#142B5F]/10 dark:border-white/10 shadow-[0_2px_10px_rgba(20,43,95,0.035)] flex items-center gap-2.5 md:gap-3 min-w-0 mn-panel">
              <div className="w-8.5 h-8.5 md:w-10 md:h-10 rounded-xl bg-[#DDEFF2]/75 dark:bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#34BFC9] flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="text-[10px] sm:text-[10.5px] md:text-xs font-semibold text-[#5C707C] dark:text-[#9BB4C7] leading-tight truncate">
                  {publicT('public_degrees')}
                </span>
                <span className="text-[10.5px] sm:text-[11px] md:text-sm font-bold text-[#142B5F] dark:text-[#F1F5F9] font-['Cairo',sans-serif] tracking-tight leading-tight truncate mt-0.5">
                  {scholarship.degreesShortLabel || 'BSc • MSc • PhD'}
                </span>
              </div>
            </div>

            {/* 3. انتهاء التقديم */}
            <div className="bg-white dark:bg-[#111E38] rounded-2xl p-2.5 md:p-3.5 border border-[#142B5F]/10 dark:border-white/10 shadow-[0_2px_10px_rgba(20,43,95,0.035)] flex items-center gap-2.5 md:gap-3 min-w-0 mn-panel">
              <div className="w-8.5 h-8.5 md:w-10 md:h-10 rounded-xl bg-[#DDEFF2]/75 dark:bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#34BFC9] flex items-center justify-center shrink-0">
                <CalendarClock className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="text-[10px] sm:text-[10.5px] md:text-xs font-semibold text-[#5C707C] dark:text-[#9BB4C7] leading-tight truncate">
                  {publicT('public_application_deadline')}
                </span>
                <span className="text-[10.5px] sm:text-[11px] md:text-sm font-bold text-[#142B5F] dark:text-[#F1F5F9] font-['Cairo',sans-serif] leading-tight truncate mt-0.5">
                  {scholarship.id === 'csc-china' ? '31-03-2027' : scholarship.deadline}
                </span>
              </div>
            </div>

            {/* 4. نوع التمويل */}
            <div className="bg-white dark:bg-[#111E38] rounded-2xl p-2.5 md:p-3.5 border border-[#142B5F]/10 dark:border-white/10 shadow-[0_2px_10px_rgba(20,43,95,0.035)] flex items-center gap-2.5 md:gap-3 min-w-0 mn-panel">
              <div className="w-8.5 h-8.5 md:w-10 md:h-10 rounded-xl bg-[#DDEFF2]/75 dark:bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#34BFC9] flex items-center justify-center shrink-0">
                <Award className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="text-[10px] sm:text-[10.5px] md:text-xs font-semibold text-[#5C707C] dark:text-[#9BB4C7] leading-tight truncate">
                  {publicT('public_funding_type')}
                </span>
                <span className="text-[10.5px] sm:text-[11px] md:text-sm font-extrabold text-[#0E7C86] dark:text-[#34BFC9] leading-tight truncate mt-0.5">
                  {scholarship.fundingType || publicT('public_fully_funded')}
                </span>
              </div>
            </div>

            {/* 5. لغة الدراسة */}
            <div className="bg-white dark:bg-[#111E38] rounded-2xl p-2.5 md:p-3.5 border border-[#142B5F]/10 dark:border-white/10 shadow-[0_2px_10px_rgba(20,43,95,0.035)] flex items-center gap-2.5 md:gap-3 min-w-0 mn-panel">
              <div className="w-8.5 h-8.5 md:w-10 md:h-10 rounded-xl bg-[#DDEFF2]/75 dark:bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#34BFC9] flex items-center justify-center shrink-0">
                <Languages className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="text-[10px] sm:text-[10.5px] md:text-xs font-semibold text-[#5C707C] dark:text-[#9BB4C7] leading-tight truncate">
                  {publicT('public_study_language')}
                </span>
                <span className="text-[10.5px] sm:text-[11px] md:text-sm font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-tight truncate mt-0.5">
                  {scholarship.studyLanguageLabel || publicT('public_english_chinese')}
                </span>
              </div>
            </div>

            {/* 6. الجهة المانحة */}
            <div className="bg-white dark:bg-[#111E38] rounded-2xl p-2.5 md:p-3.5 border border-[#142B5F]/10 dark:border-white/10 shadow-[0_2px_10px_rgba(20,43,95,0.035)] flex items-center gap-2.5 md:gap-3 min-w-0 mn-panel">
              <div className="w-8.5 h-8.5 md:w-10 md:h-10 rounded-xl bg-[#DDEFF2]/75 dark:bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#34BFC9] flex items-center justify-center shrink-0">
                <Landmark className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="text-[10px] sm:text-[10.5px] md:text-xs font-semibold text-[#5C707C] dark:text-[#9BB4C7] leading-tight truncate">
                  {publicT('public_funding_organization')}
                </span>
                <span className="text-[10.5px] sm:text-[11px] md:text-sm font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-tight truncate mt-0.5">
                  {scholarship.donorTypeLabel || publicT('public_government')}
                </span>
              </div>
            </div>
          </div>

          {/* 4. ABOUT SCHOLARSHIP SECTION (نبذة عن المنحة) */}
          <div className={sectionCardClass} dir={publicDir}>
            {renderSectionHeader({
              id: 'scholarship-about',
              icon: FileText,
              title: publicT('public_scholarship_overview'),
              level: 3,
            })}

            <div className="relative overflow-hidden rounded-xl bg-[#F6F9FB] dark:bg-[#0B1529]/70 border border-[#142B5F]/8 dark:border-white/8 pl-3.5 pr-4 py-3 md:p-4">
              <div className="absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#34BFC9] dark:to-[#F2CD78]" />
              <p className="text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#203442] dark:text-[#DCE7F0] leading-[1.9] text-start font-['Cairo',sans-serif] pr-1">
                {scholarship.description}
              </p>
            </div>
          </div>

          {/* 5. FUNDING & BENEFITS SECTION (المميزات والتمويل) */}
          <div className={sectionCardClass} dir={publicDir}>
            {renderSectionHeader({
              id: 'scholarship-funding',
              icon: Award,
              title: publicT('public_benefits_and_funding'),
              level: 3,
            })}

            {scholarship.benefitGroups && scholarship.benefitGroups.length > 0 ? (
              <div className="space-y-3.5 md:space-y-4">
                {scholarship.benefitGroups.map((group, groupIdx) => (
                  <div
                    key={group.id}
                    className={
                      groupIdx > 0 ? 'pt-3 md:pt-3.5 border-t border-[#142B5F]/8 dark:border-white/8' : ''
                    }
                  >
                    {/* Distinct Navy + White Sub-header */}
                    <div className="flex items-center justify-between gap-2 mb-2.5 px-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5.5 h-5.5 rounded-md bg-[#142B5F] text-white flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(20,43,95,0.16)]">
                          <Coins className="w-3 h-3 text-white" />
                        </span>
                        <h4 className="text-[11px] sm:text-xs md:text-[13px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-snug font-['Cairo',sans-serif]">
                          {group.title}
                        </h4>
                      </div>
                      {group.badge && (
                        <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/15 dark:border-[#34BFC9]/25 text-[9px] sm:text-[9.5px] font-bold text-[#0E7C86] dark:text-[#7FD4DE]">
                          {group.badge}
                        </span>
                      )}
                    </div>

                    {/* Clean Benefit Items Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-2.5 items-stretch">
                      {group.items.map((label, idx) => (
                        <div
                          key={idx}
                          className="h-full flex items-center gap-2 px-3 py-2.5 md:px-3.5 md:py-3 rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/8 dark:border-white/8 transition-colors"
                        >
                          <span className="w-4 h-4 rounded-full bg-[#0E7C86] text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                          <span className="text-[10.5px] sm:text-[11px] font-bold leading-snug text-[#203442] dark:text-[#E2ECF4]">
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-2.5 items-stretch">
                {(scholarship.id !== 'csc-china' && scholarship.financialCoverage?.length
                  ? scholarship.financialCoverage.map((label) => ({ label }))
                  : [
                      { label: 'إعفاء 100% من الرسوم الدراسية' },
                      { label: 'راتب شهري (2500¥ - 3500¥)' },
                      { label: 'سكن جامعي مجاني' },
                      { label: 'تأمين طبي وصحي شامل' },
                      { label: 'سنة تحضيرية للغة مجاناً' },
                      { label: 'إعفاء من رسوم التأشيرة والإقامة' },
                    ]
                ).map((benefit, idx) => (
                  <div
                    key={idx}
                    className="h-full flex items-center gap-2 px-3 py-2.5 md:px-3.5 md:py-3 rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/8 dark:border-white/8 transition-colors"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#0E7C86] text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    <span className="text-[10.5px] sm:text-[11px] font-bold leading-snug text-[#203442] dark:text-[#E2ECF4]">
                      {benefit.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. MAJORS SECTION (التخصصات المتاحة) */}
          <div className={sectionCardClass} dir={publicDir}>
            {renderSectionHeader({
              id: 'scholarship-majors',
              icon: BookOpen,
              title: publicT('public_available_majors_2'),
              level: 3,
            })}

            {/* Clean Next-Gen Degree Switcher (Solid Navy + Crisp White Active State) */}
            <div className="flex gap-1.5 md:gap-2 mb-3.5 md:mb-4 overflow-x-auto hide-scrollbar pb-0.5">
              {(
                [
                  { id: 'bachelor', label: publicT('public_bachelors') },
                  { id: 'master', label: publicT('public_masters') },
                  { id: 'phd', label: publicT('public_doctorate') },
                  { id: 'fellowship', label: publicT('public_fellowships') },
                ] as const
              ).map((tab) => {
                const isActive = activeMajorTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveMajorTab(tab.id)}
                    className={`px-3.5 md:px-5 py-1.5 md:py-2 text-[10.5px] sm:text-[11px] font-bold rounded-xl transition-all whitespace-nowrap border cursor-pointer ${
                      isActive
                        ? 'bg-[#142B5F] dark:bg-[#1B3A78] text-white border-[#142B5F] dark:border-[#F2CD78]/40 shadow-[0_3px_10px_rgba(20,43,95,0.18)]'
                        : 'bg-[#F4F7FA] dark:bg-[#0B1529] text-[#5C707C] dark:text-[#9BB4C7] border-[#142B5F]/10 dark:border-white/10 hover:border-[#0E7C86]/40 hover:text-[#142B5F] dark:hover:text-white'
                    }`}
                    data-mn-design="98e8ac3671"
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Majors List: Grouped by Language if defined */}
            {currentLanguageMajorGroups && currentLanguageMajorGroups.length > 0 ? (
              <div className="space-y-3.5 md:space-y-4 animate-in fade-in duration-300">
                {currentLanguageMajorGroups.map((langGroup, groupIdx) => (
                  <div
                    key={langGroup.id}
                    className={
                      groupIdx > 0 ? 'pt-3 md:pt-3.5 border-t border-[#142B5F]/8 dark:border-white/8' : ''
                    }
                  >
                    {/* Language Track Sub-header (Navy + White) */}
                    <div className="flex items-center justify-between gap-2 mb-2.5 px-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5.5 h-5.5 rounded-md bg-[#142B5F] text-white flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(20,43,95,0.16)]">
                          <Languages className="w-3 h-3 text-white" />
                        </span>
                        <h4 className="text-[11px] sm:text-xs md:text-[13px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-snug font-['Cairo',sans-serif]">
                          {langGroup.languageLabel}
                        </h4>
                      </div>
                      {langGroup.badge && (
                        <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/15 dark:border-[#34BFC9]/25 text-[9px] sm:text-[9.5px] font-bold text-[#0E7C86] dark:text-[#7FD4DE]">
                          {langGroup.badge}
                        </span>
                      )}
                    </div>

                    {/* Clean Major Chips */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-2.5">
                      {langGroup.majors.map((major) => (
                        <button
                          key={major.label}
                          type="button"
                          onClick={() => major.majorId && onOpenMajor?.(major.majorId)}
                          aria-label={
                            major.majorId
                              ? publicT('public_open_major_page', { v0: major.label })
                              : undefined
                          }
                          data-mn-design="98e8ac3671"
                          className={`inline-flex items-center gap-1.5 px-3 md:px-3.5 py-1.5 md:py-2 bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/10 dark:border-white/10 text-[#203442] dark:text-[#E2ECF4] text-[10.5px] font-bold rounded-xl transition-all group ${
                            major.majorId
                              ? 'hover:bg-[#DDEFF2]/45 dark:hover:bg-[#162747] hover:border-[#0E7C86]/45 hover:text-[#142B5F] dark:hover:text-white active:scale-95 cursor-pointer'
                              : 'cursor-default'
                          }`}
                        >
                          <span>{major.label}</span>
                          {major.majorId && (
                            <ArrowUpLeft className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200 -mr-0.5" />
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
                      aria-label={
                        major.majorId
                          ? publicT('public_open_major_page', { v0: major.label })
                          : undefined
                      }
                      data-mn-design="98e8ac3671"
                      className={`inline-flex items-center gap-1.5 px-3 md:px-3.5 py-1.5 md:py-2 bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/10 dark:border-white/10 text-[#203442] dark:text-[#E2ECF4] text-[10.5px] font-bold rounded-xl transition-all group ${
                        major.majorId
                          ? 'hover:bg-[#DDEFF2]/45 dark:hover:bg-[#162747] hover:border-[#0E7C86]/45 hover:text-[#142B5F] dark:hover:text-white active:scale-95 cursor-pointer'
                          : 'cursor-default'
                      }`}
                    >
                      <span>{major.label}</span>
                      {major.majorId && (
                        <ArrowUpLeft className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200 -mr-0.5" />
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
                      className="inline-flex items-center gap-1.5 px-3 md:px-3.5 py-1.5 md:py-2 bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/10 dark:border-white/10 text-[#203442] dark:text-[#E2ECF4] text-[10.5px] font-bold rounded-xl hover:bg-[#DDEFF2]/45 hover:border-[#0E7C86]/45 hover:text-[#142B5F] active:scale-95 transition-all cursor-pointer group"
                    >
                      <span>{major}</span>
                      <ArrowUpLeft className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200 -mr-0.5" />
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
                      className="inline-flex items-center gap-1.5 px-3 md:px-3.5 py-1.5 md:py-2 bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/10 dark:border-white/10 text-[#203442] dark:text-[#E2ECF4] text-[10.5px] font-bold rounded-xl hover:bg-[#DDEFF2]/45 hover:border-[#0E7C86]/45 hover:text-[#142B5F] active:scale-95 transition-all cursor-pointer group"
                    >
                      <span>{major}</span>
                      <ArrowUpLeft className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200 -mr-0.5" />
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
                      className="inline-flex items-center gap-1.5 px-3 md:px-3.5 py-1.5 md:py-2 bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/10 dark:border-white/10 text-[#203442] dark:text-[#E2ECF4] text-[10.5px] font-bold rounded-xl hover:bg-[#DDEFF2]/45 hover:border-[#0E7C86]/45 hover:text-[#142B5F] active:scale-95 transition-all cursor-pointer group"
                    >
                      <span>{major}</span>
                      <ArrowUpLeft className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200 -mr-0.5" />
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* 7. PARTICIPATING UNIVERSITIES SECTION (الجامعات المشاركة) */}
          {scholarship.participatingUniversities && scholarship.participatingUniversities.length > 0 && (
            <div className={sectionCardClass} dir={publicDir}>
              {renderSectionHeader({
                id: 'scholarship-universities',
                icon: Landmark,
                title: publicT('public_participating_universities'),
                level: 3,
              })}

              <div
                ref={universitiesScrollRef}
                onScroll={handleUniScroll}
                className="grid grid-rows-2 grid-flow-col auto-cols-[66%] sm:auto-cols-[198px] md:grid-rows-none md:grid-flow-row md:auto-cols-auto md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 overflow-x-auto md:overflow-visible pb-1.5 pt-0.5 scrollbar-none snap-x snap-mandatory items-stretch"
                data-mn-design="9856d4f1a6"
              >
                {scholarship.participatingUniversities.map((university) => (
                  <button
                    key={university.id}
                    type="button"
                    onClick={() => onOpenUniversity?.(university.id)}
                    className="w-full h-full snap-start flex flex-col justify-between gap-2 md:gap-2.5 rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/10 dark:border-white/10 hover:bg-white dark:hover:bg-[#162747] hover:border-[#0E7C86]/40 hover:shadow-[0_4px_12px_rgba(20,43,95,0.06)] p-2.5 md:p-3.5 text-start transition-all group cursor-pointer"
                  >
                    {/* Top row: Compact Navy-to-Petrol Gradient Circular Crest + Crisp White School Icon */}
                    <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
                      <div className="w-6.5 h-6.5 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-[#142B5F] via-[#134E76] to-[#0E7C86] text-white shadow-[0_2px_7px_rgba(20,43,95,0.18)] group-hover:from-[#0E7C86] group-hover:to-[#21A7B4] flex items-center justify-center shrink-0 transition-all">
                        <School className="w-3.25 h-3.25 md:w-3.5 md:h-3.5 stroke-[2] text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-[10.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-tight truncate">
                          {university.name}
                        </div>
                        <div className="text-[8.5px] font-semibold text-[#5C707C] dark:text-[#9BB4C7] font-['Cairo',sans-serif] truncate mt-0.5">
                          {university.nameEn}
                        </div>
                      </div>
                    </div>

                    {/* Bottom row: City + Clean Knowledge Mist Open Pill */}
                    <div className="flex items-center justify-between gap-1.5 pt-1.5 md:pt-2 border-t border-[#142B5F]/8 dark:border-white/8">
                      {university.city ? (
                        <div className="inline-flex items-center gap-1 min-w-0 text-[8.5px] font-bold text-[#5C707C] dark:text-[#9BB4C7] truncate">
                          <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                          <span className="truncate">
                            {university.city}
                            {publicT('public_separator')} {scholarship.country}
                          </span>
                        </div>
                      ) : (
                        <span />
                      )}

                      <span className="px-2.5 py-0.5 rounded-full bg-[#DDEFF2]/90 dark:bg-[#0E7C86]/25 text-[#0E7C86] dark:text-[#7FD4DE] group-hover:bg-[#142B5F] group-hover:text-white text-[8.5px] font-bold inline-flex items-center gap-0.5 shrink-0 transition-colors">
                        <span>فتح</span>
                        <ArrowUpLeft className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Clean Scroll Progress Track on Mobile */}
              <div className="pt-2 px-1 md:hidden">
                <div className="w-full h-[4px] rounded-full bg-[#142B5F]/10 dark:bg-white/10 overflow-hidden relative">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] transition-all duration-150"
                    style={{
                      width: `${Math.round(uniScrollProgress.ratio * 100)}%`,
                      marginRight: `${Math.round(uniScrollProgress.offset * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 8. ELIGIBILITY SECTION (الشروط ومعايير التقديم) */}
          <div className={sectionCardClass} dir={publicDir}>
            {renderSectionHeader({
              id: 'scholarship-requirements',
              icon: ShieldCheck,
              title: publicT('public_application_requirements_and_criteria'),
              level: 3,
            })}

            <div className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-3 items-stretch">
              {resolvedRequirements.map((condition, idx) => (
                <div
                  key={idx}
                  className="h-full flex items-start gap-2.5 px-3.5 py-2.5 md:px-4 md:py-3 rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/8 dark:border-white/8 transition-colors"
                >
                  {/* Signature Dual Vertical Bars: Navy (#142B5F) + Petrol (#0E7C86) */}
                  <span className="inline-flex items-center gap-1 shrink-0 mt-0.5">
                    <span className="w-1 h-4 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                    <span className="w-1 h-2.5 rounded-full bg-[#0E7C86] dark:bg-[#34BFC9]" />
                  </span>
                  <span className="text-[10.5px] sm:text-[11px] font-bold text-[#203442] dark:text-[#E2ECF4] leading-relaxed">
                    {condition.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 9. REQUIRED DOCUMENTS SECTION (المستندات المطلوبة) */}
          <div className={sectionCardClass} dir={publicDir}>
            {renderSectionHeader({
              id: 'scholarship-documents',
              icon: FileCheck,
              title: publicT('public_required_documents'),
              level: 3,
            })}

            <div className="flex flex-wrap gap-2 md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-2.5 items-stretch">
              {resolvedDocuments.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2 md:px-3.5 md:py-2.5 bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/8 dark:border-white/8 rounded-xl hover:border-[#0E7C86]/35 transition-all group cursor-default text-start w-fit md:w-full h-full"
                >
                  <doc.icon className="w-3.75 h-3.75 text-[#0E7C86] dark:text-[#34BFC9] shrink-0 stroke-[2]" />
                  <span className="text-[10.5px] font-bold text-[#203442] dark:text-[#E2ECF4] leading-tight">
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
                  className="flex items-center justify-between gap-2.5 px-3 py-2 md:px-3.5 md:py-2.5 bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/12 dark:border-white/10 rounded-xl hover:bg-white dark:hover:bg-[#162747] hover:border-[#0E7C86]/50 hover:shadow-[0_3px_10px_rgba(20,43,95,0.06)] active:scale-95 transition-all group cursor-pointer text-start w-fit md:w-full h-full"
                  title={publicT('public_open_title', { v0: exam.name })}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Languages className="w-3.75 h-3.75 text-[#0E7C86] dark:text-[#34BFC9] shrink-0 stroke-[2]" />
                    <span className="text-[10.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-tight truncate">
                      {publicT('public_language_evidence')} {exam.nameEn}
                    </span>
                  </span>
                  <span className="w-5.5 h-5.5 rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/25 border border-[#142B5F]/18 dark:border-[#34BFC9]/30 text-[#142B5F] dark:text-[#F1F5F9] group-hover:bg-[#142B5F] group-hover:text-white group-hover:border-[#142B5F] flex items-center justify-center shrink-0 transition-all">
                    <ArrowUpLeft className="w-3 h-3 stroke-[2.35]" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 10. IMPORTANT NOTES SECTION (ملاحظات مهمة — Warm Ivory #FAF7F0 + Gold #D6A43B) */}
          <div className={sectionCardClass} dir={publicDir}>
            {renderSectionHeader({
              icon: Info,
              title: publicT('public_important_note'),
              level: 3,
            })}

            <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-3.5 items-stretch">
              {resolvedNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="h-full relative overflow-hidden flex items-start gap-2.5 bg-[#FBF9F4] dark:bg-[#16233B] rounded-xl py-3 pl-3.5 pr-4 md:p-4 border border-[#D6A43B]/22 dark:border-[#F2CD78]/20 transition-all"
                >
                  <div className="absolute top-3 right-0 bottom-3 w-[2.5px] rounded-l-full bg-[#D6A43B]/85 dark:bg-[#F2CD78]" />
                  <Info className="w-3.75 h-3.75 text-[#B48524] dark:text-[#F2CD78] shrink-0 mt-0.5 stroke-[2.15]" />
                  <p className="text-[10.5px] sm:text-[11px] font-semibold text-[#334B57] dark:text-[#DCE7F0] leading-relaxed">
                    <span className="text-[#142B5F] dark:text-[#F2CD78] font-bold">{note.label}</span>{' '}
                    {note.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 11. CONTEXTUAL SERVICES SECTION (خدمات تساعدك بالتقديم) */}
          {contextualServices && contextualServices.length > 0 && (
            <section className={sectionCardClass} dir={publicDir}>
              {renderSectionHeader({
                icon: Briefcase,
                title: publicT('public_services_that_may_help_during_your_application'),
                level: 3,
              })}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 md:gap-3 items-stretch">
                {contextualServices.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => onOpenService?.(service)}
                    className="h-full relative overflow-hidden group flex items-center justify-between gap-2.5 rounded-xl border border-[#142B5F]/10 dark:border-white/10 bg-[#F6F8FA] dark:bg-[#0B1529]/75 pl-3 pr-3.5 py-2.5 md:p-3.5 text-start transition-all hover:bg-white dark:hover:bg-[#162747] hover:border-[#0E7C86]/40 hover:shadow-[0_4px_12px_rgba(20,43,95,0.06)] active:scale-[0.99] cursor-pointer"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-2.5 right-0 bottom-2.5 w-[3px] rounded-l-full bg-[#0E7C86] dark:bg-[#34BFC9]"
                    />
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-8 h-8 rounded-lg bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 text-[#0E7C86] dark:text-[#34BFC9] group-hover:bg-[#142B5F] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                        <Briefcase className="w-3.5 h-3.5" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-snug">
                          {service.title}
                        </span>
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 px-2 py-0.5 text-[8.5px] font-bold text-[#0E7C86] dark:text-[#7FD4DE]">
                          <span>{service.category}</span>
                        </span>
                      </span>
                    </span>

                    <span className="w-6 h-6 rounded-full bg-white dark:bg-[#111E38] border border-[#142B5F]/10 dark:border-white/10 text-[#0E7C86] dark:text-[#34BFC9] group-hover:bg-[#142B5F] group-hover:text-white group-hover:border-[#142B5F] flex items-center justify-center shrink-0 transition-all">
                      <ArrowUpLeft className="h-3.5 w-3.5 stroke-[2.25]" />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 12. RELATED ARTICLES SECTION (مقالات وأدلة مرتبطة — Stacked Cards with Navy+White Icon) */}
          <section className={sectionCardClass} dir={publicDir}>
            {renderSectionHeader({
              icon: BookOpenText,
              title: publicT('public_related_articles_and_guides'),
              level: 3,
            })}

            <div className="flex flex-col gap-2 md:gap-2.5">
              {(scholarship.relatedArticles && scholarship.relatedArticles.length > 0
                ? scholarship.relatedArticles
                : [
                    {
                      id: 'art_104',
                      title: 'تحديثات معايير الكفاءة اللغوية المطلوبة باختبار IELTS لعام 2026',
                    },
                    {
                      id: 'art_cultural_exchange',
                      title: 'الدليل الشامل لمنح التبادل الثقافي ومسارات القبول الدولية 2026',
                    },
                  ]
              ).map((article) => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => onOpenArticle?.(article.id)}
                  className="w-full relative overflow-hidden group flex items-center justify-between gap-2.5 rounded-xl border border-[#142B5F]/10 dark:border-white/10 bg-[#F6F8FA] dark:bg-[#0B1529]/75 p-2.5 md:px-3.5 md:py-3 text-start transition-all hover:bg-white dark:hover:bg-[#162747] hover:border-[#0E7C86]/40 hover:shadow-[0_4px_12px_rgba(20,43,95,0.06)] active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 md:w-7.5 md:h-7.5 rounded-lg bg-[#142B5F] text-white group-hover:bg-[#0E7C86] flex items-center justify-center shrink-0 shadow-[0_2px_7px_rgba(20,43,95,0.18)] transition-colors">
                      <BookOpenText className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10.5px] sm:text-[11px] md:text-xs font-bold leading-snug text-[#142B5F] dark:text-[#F1F5F9] line-clamp-2 font-['Cairo',sans-serif]">
                        {article.title}
                      </p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-[#111E38] border border-[#142B5F]/12 dark:border-white/10 text-[#0E7C86] dark:text-[#34BFC9] group-hover:bg-[#142B5F] group-hover:text-white group-hover:border-[#142B5F] flex items-center justify-center shrink-0 transition-all">
                    <ArrowUpLeft className="h-3.5 w-3.5 stroke-[2.25]" />
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* 13. APPLICATION LINKS SECTION (طريقة التقديم — Calm Platform Card First, Prominent Official CTA Pulled Down Below) */}
          <div className={sectionCardClass} dir={publicDir}>
            {renderSectionHeader({
              id: 'scholarship-application',
              icon: Send,
              title: publicT('public_how_to_apply'),
              level: 3,
            })}

            <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-3.5 items-stretch">
              {/* Calm Secondary Card: Apply via Manaratak (Coming Soon) */}
              <div
                aria-label={publicT('public_applications_through_manaratak_are_currently_unavailable')}
                className="h-full relative overflow-hidden inline-flex items-center justify-between gap-3 rounded-2xl px-4 py-3 md:py-3.5 bg-[#F6F8FA] dark:bg-[#0B1529]/80 border border-[#142B5F]/12 dark:border-white/10 transition-all cursor-default"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7.5 h-7.5 md:w-8 md:h-8 rounded-xl bg-white dark:bg-[#111E38] border border-[#142B5F]/10 dark:border-white/10 text-[#5C707C] dark:text-[#9BB4C7] flex items-center justify-center shrink-0">
                    <Clock className="w-3.75 h-3.75 md:w-4 md:h-4" />
                  </span>
                  <div className="flex flex-col text-start min-w-0">
                    <span className="text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F] dark:text-[#E2ECF4] leading-tight truncate font-['Cairo',sans-serif]">
                      {publicT('public_apply_through_manaratak')}
                    </span>
                    <span className="text-[9.5px] font-medium text-[#5C707C] dark:text-[#9BB4C7] mt-0.5 truncate font-['Cairo',sans-serif]">
                      {publicDir === 'ltr' ? 'Guided application service' : 'خدمة التقديم المباشر عبر المنصة'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#FBF9F4] dark:bg-[#F2CD78]/15 border border-[#D6A43B]/35 dark:border-[#F2CD78]/30 text-[9.5px] font-bold text-[#B48524] dark:text-[#F2CD78] shrink-0">
                  {publicDir === 'ltr' ? 'Soon' : 'قريباً'}
                </span>
              </div>

              {/* Primary CTA Pulled Slightly Lower for Visual Weight Balance */}
              <a
                href={scholarship?.applicationUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 md:mt-0 h-full relative overflow-hidden inline-flex items-center justify-between gap-3 rounded-2xl px-4 py-3 md:py-3.5 bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] hover:brightness-105 text-white shadow-[0_6px_18px_rgba(20,43,95,0.18)] active:scale-[0.99] transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7.5 h-7.5 md:w-8 md:h-8 rounded-xl bg-white/14 border border-white/15 text-[#F2CD78] flex items-center justify-center shrink-0">
                    <ExternalLink className="w-3.75 h-3.75 md:w-4 md:h-4 stroke-[2.15]" />
                  </span>
                  <div className="flex flex-col text-start min-w-0">
                    <span className="text-[11px] sm:text-[11.5px] md:text-xs font-bold text-white leading-tight truncate font-['Cairo',sans-serif]">
                      {publicT('public_apply_through_the_official_scholarship_website')}
                    </span>
                    <span className="text-[9.5px] font-medium text-[#DDEFF2] mt-0.5 truncate font-['Cairo',sans-serif]">
                      {publicDir === 'ltr' ? 'Direct official portal' : 'البوابة الرسمية المباشرة للتقديم'}
                    </span>
                  </div>
                </div>
                <span className="w-7 h-7 rounded-full bg-white/14 group-hover:bg-white/22 text-[#F2CD78] flex items-center justify-center shrink-0 transition-transform group-hover:-translate-x-0.5">
                  <ArrowUpLeft className="w-3.5 h-3.5 stroke-[2.25]" />
                </span>
              </a>
            </div>
          </div>

          {/* 14. SIMILAR SCHOLARSHIPS SECTION */}
          <div className={`${sectionCardClass} mb-1`} dir={publicDir}>
            {renderSectionHeader({
              icon: LayoutGrid,
              title: publicT('public_similar_scholarships_you_may_like'),
              level: 3,
            })}

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
              ].filter((item) => item.id !== scholarship.id).slice(0, 3);

              return (
                <div>
                  <div
                    ref={similarScrollRef}
                    className="flex gap-2.5 overflow-x-auto mn-similar-scroll pb-2 pt-0.5 snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0 items-stretch"
                  >
                    {similarItems.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => onOpenScholarship?.(item.id)}
                        className="relative overflow-hidden w-[246px] sm:w-[260px] md:w-full h-full shrink-0 bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/10 dark:border-white/10 rounded-2xl p-3 md:p-3.5 flex flex-col justify-between gap-2.5 snap-center transition-all hover:bg-white dark:hover:bg-[#162747] hover:border-[#0E7C86]/35 hover:shadow-[0_6px_16px_rgba(20,43,95,0.07)] cursor-pointer text-start active:scale-[0.99] group"
                      >
                        {/* 1. Card Header: Navy Right -> Petrol Left */}
                        <div className="rounded-xl px-2.5 py-2 md:px-3 md:py-2.5 bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white shadow-2xs flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full p-0.5 bg-white/15 ring-1 ring-white/35 flex items-center justify-center shrink-0 overflow-hidden">
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

                        {/* 2. Unified Petrol Icons 2x2 Key Details Grid */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="bg-white dark:bg-[#111E38] border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center gap-1.5 min-w-0">
                            <MapPin className="w-3.25 h-3.25 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                            <span className="text-[9.5px] font-bold text-[#203442] dark:text-[#DCE7F0] truncate">
                              {item.country}
                            </span>
                          </div>

                          <div className="bg-white dark:bg-[#111E38] border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center gap-1.5 min-w-0">
                            <Coins className="w-3.25 h-3.25 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                            <span className="text-[9.5px] font-bold text-[#203442] dark:text-[#DCE7F0] truncate">
                              {item.fundingLabel}
                            </span>
                          </div>

                          <div className="bg-white dark:bg-[#111E38] border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center gap-1.5 min-w-0">
                            <GraduationCap className="w-3.25 h-3.25 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                            <span className="text-[9px] font-bold text-[#203442] dark:text-[#DCE7F0] truncate">
                              {item.degreesLabel}
                            </span>
                          </div>

                          <div className="bg-white dark:bg-[#111E38] border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center gap-1.5 min-w-0">
                            <Calendar className="w-3.25 h-3.25 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                            <span className="text-[9px] font-bold text-[#203442] dark:text-[#DCE7F0] truncate">
                              {item.deadline}
                            </span>
                          </div>
                        </div>

                        {/* 3. Card Footer: Calm Light View Details CTA (balances the bold gradient header) */}
                        <div className="pt-0.5 mt-auto">
                          <div className="w-full rounded-xl py-1.5 md:py-2 px-3 bg-white dark:bg-[#111E38] border border-[#142B5F]/18 dark:border-[#F2CD78]/30 group-hover:bg-[#142B5F] group-hover:border-[#142B5F] text-[10px] font-bold text-[#142B5F] dark:text-[#F2CD78] group-hover:text-white flex items-center justify-center gap-1 shadow-2xs transition-colors font-['Cairo',sans-serif]">
                            <span>{publicT('public_view_details')}</span>
                            <ArrowUpLeft className="w-3 h-3 text-[#0E7C86] dark:text-[#F2CD78] group-hover:text-[#F2CD78] transition-colors" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 15. ACTIONS BUTTONS (SHARE & SAVE) */}
          <div className="px-1 pt-2 pb-2 flex justify-center gap-3 md:gap-4 w-full">
            <button
              type="button"
              onClick={() => {
                // Share functionality placeholder
              }}
              data-mn-design="efc9da21fc"
              className="py-2.5 md:py-3 px-5 md:px-8 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_2px_10px_rgba(20,43,95,0.04)] active:scale-95 cursor-pointer bg-white dark:bg-[#111E38] hover:bg-[#F4F7FA] dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#F1F5F9] text-xs font-bold border border-[#142B5F]/15 dark:border-white/12 hover:border-[#0E7C86]/45 flex-1 max-w-[175px] md:max-w-[240px]"
            >
              <span>{publicT('public_share_scholarship')}</span>
              <Share2 className="w-4 h-4 text-[#0E7C86] dark:text-[#34BFC9]" />
            </button>

            <button
              type="button"
              onClick={handleSaveClick}
              data-mn-design="efc9da21fc"
              className="py-2.5 md:py-3 px-5 md:px-8 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_6px_16px_rgba(20,43,95,0.18)] active:scale-95 cursor-pointer flex-1 max-w-[175px] md:max-w-[240px] bg-[#142B5F] hover:bg-[#0E7C86] text-white text-xs font-bold"
            >
              <span>
                {isFavorite ? publicT('public_saved_3') : publicT('public_save_scholarship')}
              </span>
              <Bookmark
                className={`w-4 h-4 ${
                  isFavorite ? 'fill-[#38C6D4] text-[#38C6D4]' : 'text-[#38C6D4]'
                }`}
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
            className="flex items-center gap-2 rounded-2xl bg-[#142B5F] hover:bg-[#0E7C86] px-5 py-3 text-xs font-bold text-white shadow-[0_6px_16px_rgba(20,43,95,0.18)] transition-colors cursor-pointer"
          >
            <Bookmark
              className={`w-4 h-4 ${isFavorite ? 'fill-[#38C6D4] text-[#38C6D4]' : 'text-[#38C6D4]'}`}
            />
            {isFavorite ? publicT('public_saved_3') : publicT('public_save_scholarship')}
          </button>
        </div>
      )}

      {/* Save Notification Toast */}
      {saveToast && (
        <div className="fixed bottom-6 inset-x-4 max-w-xs mx-auto bg-[#142B5F] border border-[#F2CD78]/35 text-white px-4 py-2.5 rounded-full shadow-2xl z-50 flex items-center justify-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-3.5 h-3.5 text-[#F2CD78]" />
          <span>
            {isFavorite
              ? publicT('public_scholarship_added_to_my_favorites')
              : publicT('public_scholarship_removed_from_my_favorites')}
          </span>
        </div>
      )}
    </div>
  );
};
