import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { PublishedMajorSections } from './PublishedMajorSections';
import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  Info,
  FileText,
  GraduationCap,
  Layers,
  Stethoscope,
  Microscope,
  Award,
  Sparkles,
  ShieldAlert,
  Compass,
  Briefcase,
  UserCheck,
  GitCompare,
  Users,
  CheckCircle2,
  ListChecks,
  FlaskConical,
  Target,
  ShieldCheck,
  Building,
  Library,
  Scale,
  HeartPulse,
  Heart,
  Bookmark,
  Share2,
  Check,
} from 'lucide-react';
import { Major } from '../types';
import { FellowshipDetailView } from './modal/FellowshipDetailView';
import { DoctorateAcademicBackgroundsSlider } from './modal/DoctorateAcademicBackgroundsSlider';
import type { MajorPublicRelationshipGraph } from '../usePublicRelationshipGraph';
import { DetailBackButton, DetailSectionHeader, useDetailSearchTarget } from './DetailUi';

interface MajorDetailModalProps {
  dataMode?: 'api' | 'prototype';
  major: Major;
  relationshipGraph?: MajorPublicRelationshipGraph;
  relationshipGraphStatus?: 'loading' | 'ready' | 'unavailable';
  onClose: () => void;
  onOpenUniversity?: (universityId: string) => void;
  onOpenScholarship?: (scholarshipId: string) => void;
  onOpenCourse?: (courseQuery: string) => void;
  onOpenCourseCollection?: (field: string) => void;
  onOpenMajor?: (majorId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  searchAnchor?: string;
  searchTerm?: string;
}

export const MajorDetailModal: React.FC<MajorDetailModalProps> = ({
  major,
  dataMode = 'api',
  relationshipGraph,
  relationshipGraphStatus = 'ready',
  onClose,
  onOpenUniversity,
  onOpenScholarship,
  onOpenCourse,
  onOpenMajor,
  isFavorite = false,
  onToggleFavorite,
  searchAnchor,
  searchTerm,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();
  const [localFavorite, setLocalFavorite] = React.useState(isFavorite);
  const [saveToast, setSaveToast] = React.useState(false);

  React.useEffect(() => {
    setLocalFavorite(isFavorite);
  }, [isFavorite]);

  const effectiveFavorite = onToggleFavorite ? isFavorite : localFavorite;

  const handleSaveClick = () => {
    if (onToggleFavorite) {
      onToggleFavorite(major.id);
    } else {
      setLocalFavorite((prev) => !prev);
    }
    setSaveToast(true);
    window.setTimeout(() => setSaveToast(false), 2000);
  };

  useDetailSearchTarget(searchAnchor, searchTerm);

  const renderMajorSectionHeader = ({
    id,
    icon: Icon,
    title,
    subtitle,
    className = 'mb-3',
  }: {
    id?: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    subtitle?: string;
    className?: string;
  }) => (
    <DetailSectionHeader
      id={id}
      title={title}
      subtitle={subtitle}
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

  // Determine degree level
  const isFellowship =
    major.degreeLevels?.includes('زمالة أبحاث') ||
    major.code?.startsWith('FEL') ||
    major.degreeLevelName?.includes('زمالة');
  const isDoctorate =
    (major.degreeLevels?.includes('دكتوراه') || major.code?.startsWith('DOC')) && !isFellowship;
  const isMaster =
    (major.degreeLevels?.includes('ماجستير') || major.code?.startsWith('MAS')) &&
    !isDoctorate &&
    !isFellowship;

  // Dynamic list of skills or fallback
  const skillsList = major.acquiredSkills || [
    'أخذ التاريخ المرضي.',
    'إجراء الفحص السريري الأساسي.',
    'صياغة قائمة المشكلات الطبية.',
    'بناء التشخيص التفريقي.',
    'تفسير الفحوص المخبرية الأساسية.',
    'تفسير الصور الطبية الأساسية ضمن مستوى التدريب.',
    'تطبيق مبادئ العلاج الدوائي الآمن.',
    'التعرف على الحالات الطارئة.',
    'بدء الإجراءات الطبية الأولية.',
    'أداء المهارات والإجراءات السريرية الأساسية تحت الإشراف.',
    'الوقاية ومكافحة العدوى.',
    'سلامة المرضى.',
    'توثيق المعلومات الطبية.',
    'كتابة الملخصات السريرية.',
  ];

  // Tracks fallback
  const tracksList = major.subSpecialties || [
    'الطب الباطني.',
    'الجراحة والتخصصات الجراحية.',
    'طب الأطفال.',
    'النساء والولادة.',
    'طب الأسرة.',
    'طب الطوارئ.',
    'الطب النفسي.',
    'الأشعة والتصوير الطبي.',
    'علم الأمراض والمختبرات.',
    'التخدير والعناية الحرجة.',
    'الصحة العامة والطب الوقائي.',
  ];

  // Work fields fallback
  const workFieldsList = major.workFields || [
    'المستشفيات.',
    'العيادات.',
    'مراكز الرعاية الصحية الأولية.',
    'خدمات الطوارئ.',
    'الصحة العامة.',
    'الوقاية.',
    'البحث الطبي والسريري.',
    'التعليم الطبي بعد استكمال المتطلبات.',
    'الإدارة والسياسات الصحية بعد التأهيل المناسب.',
    'الصناعات الدوائية.',
    'شركات التقنيات الطبية في الأدوار الطبية والعلمية.',
  ];

  // Related jobs fallback
  const relatedJobsList: Array<{ job: string; entry?: string; matchRate?: string; notes?: string }> =
    major.relatedJobs || [
      { job: 'طبيب امتياز / طبيب متدرب', matchRate: 'مباشرة', notes: 'بعد إكمال الدرجة وفق نظام الدولة' },
      { job: 'طبيب عام', matchRate: 'عالية جداً', notes: 'بعد استكمال الترخيص والمتطلبات المحلية' },
      { job: 'طبيب مقيم', matchRate: 'مباشرة', notes: 'بعد القبول في برنامج إقامة' },
      {
        job: 'باحث طبي / مساعد أبحاث سريرية',
        matchRate: 'مناسبة',
        notes: 'ممكن بعد الدرجة، مع تأهيل إضافي لبعض الوظائف',
      },
      { job: 'مسؤول طبي أو صحي', matchRate: 'متوسطة', notes: 'غالبًا يحتاج خبرة أو تأهيلًا إضافيًا' },
    ];

  // Postgraduate opportunities fallback
  const postgradList =
    major.postDoctoralOpportunities ||
    major.postgraduateOpportunities || [
      'الصحة العامة.',
      'الوبائيات.',
      'البحث السريري.',
      'التعليم الطبي.',
      'الإدارة الصحية.',
      'العلوم الطبية الحيوية.',
      'الطب الجزيئي.',
      'المعلوماتية الصحية.',
      'الصحة العالمية.',
      'الأخلاقيات الطبية.',
    ];

  const relationshipDemo = {
    universities: relationshipGraph?.universities ?? [],
    scholarships: relationshipGraph?.scholarships ?? [],
    courses: relationshipGraph?.courses ?? [],
    countries: [] as Array<{ id: string; name: string; meta: string }>,
    academicPath: [] as Array<{ id: string; degree: string; name: string; meta: string }>,
    similarMajorLinks: {} as Record<string, string>,
  };

  const similarMajorsList = major.similarMajors || [
    { name: 'الطب العام', difference: 'غالبًا تسمية بديلة أو محلية للدرجة الطبية الأساسية' },
    { name: 'الطب البشري', difference: 'غالبًا اسم بديل يميز طب الإنسان عن الطب البيطري' },
    {
      name: 'العلوم الطبية',
      difference: 'يدرس العلوم الطبية لكنه لا يؤهل عادةً لممارسة مهنة الطبيب',
    },
    {
      name: 'العلوم الطبية الحيوية',
      difference: 'يركز أكثر على البحث والآليات البيولوجية والجزيئية للمرض',
    },
  ];

  // Warning points fallback
  const alertPoints = major.academicAlertPoints || [
    {
      num: '١',
      title: publicT('public_professional_practice_and_licensing'),
      desc: 'الحصول على الدرجة الطبية الأولى لا يمنح الحق في الممارسة المستقلة مباشرة؛ بل يتطلب إتمام سنة الامتياز واجتياز اختبارات مزاولة المهنة والتسجيل في الهيئة الصحية المعنية.',
    },
    {
      num: '٢',
      title: publicT('public_specialist_and_surgical_titles'),
      desc: 'حمل لقب طبيب اختصاصي أو جرّاح يتطلب الالتحاق ببرنامج إقامة طبية (Residency) وتدريب سريري تخصصي بعد التخرج من كلية الطب.',
    },
  ];

  return (
    <div className="w-full max-w-md md:max-w-[1120px] lg:max-w-[1160px] mx-auto pt-0 pb-12 text-start font-['Cairo',sans-serif] animate-in fade-in duration-200 bg-[var(--mn-surface-muted)] min-h-screen relative mn-panel mn-major-detail">
      {/* 1. TOP HERO CONTAINER (Compact horizontal layout with glowing gold graduation emblem on the right + arrow + title) */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute top-2 left-2 md:top-3.5 md:left-4 z-30 flex flex-col md:flex-row items-center gap-1.5 md:gap-2 scale-80 md:scale-100 origin-top-left">
          <DetailBackButton onBack={onClose} mode="back" />
          <button
            type="button"
            onClick={handleSaveClick}
            className="mn-detail-close transition-all active:scale-95 cursor-pointer"
            aria-label={effectiveFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            title={effectiveFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          >
            <Heart
              className={`h-3.5 w-3.5 ${
                effectiveFavorite
                  ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#38C6D4] dark:text-[#38C6D4]'
                  : 'text-[var(--mn-heading)]'
              }`}
            />
          </button>
        </div>
        {/* SVG background with matching vibrant 3-stop navy-to-petrol gradient, subtle gold waves */}
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
              {/* Circular Frame with Glowing Gold Graduation Cap inside */}
              <div className="w-11 h-11 md:w-14 md:h-14 rounded-full border-2 border-[#F2CD78] flex items-center justify-center p-1.5 shadow-[0_0_12px_rgba(214,164,59,0.45)] bg-gradient-to-br from-[#142B5F] to-[#0E7C86] shrink-0">
                {isFellowship ? (
                  <HeartPulse className="w-6 h-6 text-[#F2CD78] drop-shadow-[0_0_4px_rgba(214,164,59,0.7)]" />
                ) : isDoctorate || isMaster ? (
                  <Microscope className="w-6 h-6 text-[#F2CD78] drop-shadow-[0_0_4px_rgba(214,164,59,0.7)]" />
                ) : (
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
                    <polygon
                      points="20,6 37,14 20,22 3,14"
                      fill="url(#goldCapGrad)"
                      stroke="#FFF2B2"
                      strokeWidth="0.8"
                      filter="url(#goldShine)"
                    />
                    <path
                      d="M9,17.5 v6 c0,3.5 4.8,6.5 11,6.5 s11,-3 11,-6.5 v-6"
                      fill="url(#goldCapGrad)"
                      stroke="#FFF2B2"
                      strokeWidth="0.6"
                    />
                    <path
                      d="M20,14 L34,16.5 v8.5"
                      stroke="#FFEAA7"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <circle cx="34" cy="26" r="1.8" fill="#FFEAA7" filter="url(#goldShine)" />
                  </svg>
                )}
              </div>

              {/* Simple subtle arrow pointing from the graduation cap to the title */}
              <ArrowLeft className="w-4 h-4 text-[#F2CD78] shrink-0 opacity-95 drop-shadow-[0_0_4px_rgba(214,164,59,0.4)]" />
            </div>

            {/* Left Side (in RTL): Major Title & English Subtitle */}
            <div className="flex flex-col text-start min-w-0 flex-1 pr-1.5">
              <h1 className="text-[15px] sm:text-[15px] md:text-xl lg:text-2xl font-bold text-white leading-tight truncate drop-shadow-sm" data-mn-design="827f35e03a">
                {major.name}
              </h1>
              <p className="text-[11px] sm:text-[11px] md:text-sm font-bold text-[#F2CD78] font-['Cairo',sans-serif] mt-0.5 tracking-wider truncate">
                {major.nameEn}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* If Fellowship, render dedicated 17-section FellowshipDetailView */}
      {(dataMode === 'api' || major.contentSections) ? (
        <PublishedMajorSections sections={major.contentSections ?? []} level={major.degreeLevelName} />
      ) : isFellowship ? (
        <FellowshipDetailView
          major={major}
          onOpenMajor={onOpenMajor}
          effectiveFavorite={effectiveFavorite}
          onSaveClick={handleSaveClick}
        />
      ) : (
        /* MAIN CONTENT WRAPPER (Bordered full-width cards touching side edges) */
        <div className="px-0 md:px-4 space-y-2.5 md:space-y-4 z-20 relative -mt-2.5 sm:-mt-3 md:mt-2" dir={publicDir}>
          {/* 1. BASIC MAJOR INFORMATION CARD */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
            {/* Top Royal Navy / Gold Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

            {renderMajorSectionHeader({
              id: 'major-requirements',
              icon: BookOpen,
              className: 'mb-3',
              title: isDoctorate
                ? publicT('public_basic_doctoral_specialization_information')
                : isMaster
                  ? publicT('public_basic_masters_specialization_information')
                  : publicT('public_basic_major_information'),
            })}

            <div className="space-y-3 md:space-y-4 font-['Cairo',sans-serif]">
              <div className="-mx-3.5 sm:-mx-4 md:mx-0 md:rounded-xl border-y md:border border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden">
                {/* Table Header Row */}
                <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)] items-center font-['Cairo',sans-serif]">
                  <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-white text-start border-l border-white/15 font-['Cairo',sans-serif]">
                    {publicT('public_item')}
                  </div>
                  <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-white text-start font-['Cairo',sans-serif]">
                    {publicT('public_details_2')}
                  </div>
                </div>

                {/* Table Body Rows */}
                <div className="divide-y divide-[var(--mn-border)] font-['Cairo',sans-serif]">
                  {/* Reference Code */}
                  {major.code && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                      <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                        {publicT('public_reference_code')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] font-mono tracking-wider flex items-center">
                        {major.code}
                      </div>
                    </div>
                  )}

                  {/* Arabic Name */}
                  <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                    <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                      {publicT('public_arabic_name')}
                    </div>
                    <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] flex items-center font-['Cairo',sans-serif]">
                      {major.name}
                    </div>
                  </div>

                  {/* Name in English - Horizon Petrol (#0E7C86) */}
                  <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                    <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                      {publicT('public_english_name')}
                    </div>
                    <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#0E7C86] dark:text-[#38C6D4] font-['Cairo',sans-serif] tracking-wide flex items-center">
                      {major.nameEn}
                    </div>
                  </div>

                  {/* Associated Major */}
                  {major.associatedMajor && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                      <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                        {isDoctorate ? publicT('public_related_primary_major') : publicT('public_related_major')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-relaxed flex items-center font-['Cairo',sans-serif]">
                        {major.associatedMajor}
                      </div>
                    </div>
                  )}

                  {/* Master Majoring Links for PhD */}
                  {isDoctorate && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                      <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                        {publicT('public_related_masters_specializations')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-relaxed flex items-center font-['Cairo',sans-serif]">
                        {publicT('public_mas_0001_medical_sciences_with_potential_links_to')}
                      </div>
                    </div>
                  )}

                  {/* College / Academic Field */}
                  <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                    <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                      {publicT('public_academic_domain')}
                    </div>
                    <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] flex items-center font-['Cairo',sans-serif]">
                      {major.academicField || major.category}
                    </div>
                  </div>

                  {/* Degree Level */}
                  <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                    <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                      {publicT('public_degree_level')}
                    </div>
                    <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] flex items-center font-['Cairo',sans-serif]">
                      {major.degreeLevelName || major.degreeLevels?.join('، ')}
                    </div>
                  </div>

                  {/* Program Type / Doctorate Type */}
                  {major.programTypes && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                      <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                        {isDoctorate ? publicT('public_doctorate_type') : publicT('public_program_type')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-relaxed flex items-center font-['Cairo',sans-serif]">
                        {major.programTypes}
                      </div>
                    </div>
                  )}

                  {/* Common Degrees */}
                  {(major.commonDegrees || (major.degreeLevels && major.degreeLevels.length > 0)) && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                      <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                        {publicT('public_common_degree_names')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-relaxed flex items-center font-['Cairo',sans-serif]">
                        {major.commonDegrees || major.degreeLevels?.join('، ')}
                      </div>
                    </div>
                  )}

                  {/* Common Duration */}
                  {major.duration && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                      <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                        {publicT('public_typical_duration')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-relaxed flex items-center font-['Cairo',sans-serif]">
                        {major.duration}
                      </div>
                    </div>
                  )}

                  {/* Study Modes / Common Entry Path */}
                  {major.studyModes && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                      <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                        {isDoctorate ? publicT('public_common_entry_path') : publicT('public_study_arrangements_2')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-relaxed flex items-center font-['Cairo',sans-serif]">
                        {major.studyModes}
                      </div>
                    </div>
                  )}

                  {/* Availability Nature */}
                  {major.availabilityNature && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors">
                      <div className="col-span-4 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center font-['Cairo',sans-serif]">
                        {publicT('public_availability_2')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3.5 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-relaxed flex items-center font-['Cairo',sans-serif]">
                        {major.availabilityNature}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Short Description - Separate Standalone Box */}
              {major.description && (
                <div className="relative pl-3.5 pr-4 py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-start overflow-hidden space-y-1.5 font-['Cairo',sans-serif]">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] dark:bg-[linear-gradient(180deg,#38C6D4_0%,#0E7C86_75%,#142B5F_100%)]" />
                  <div className="flex items-center gap-2">
                    {/* خط / أيقونة خفيفة قبل كلمة الوصف المختصر */}
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <span className="w-3.5 h-[2.5px] rounded-full bg-[linear-gradient(270deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C86]" />
                    </span>
                    <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                      {publicT('public_brief_description')}
                    </span>
                  </div>
                  <p className="w-full text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify font-['Cairo',sans-serif]">
                    {major.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. NATURE AND OBJECTIVE OF DOCTORATE / OVERVIEW */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
            {/* Top Royal Navy / Gold Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderMajorSectionHeader({
              id: 'major-about',
              icon: FileText,
              className: 'mb-3',
              title: isDoctorate
                ? publicT('public_doctorate_nature_and_purpose')
                : isMaster
                  ? publicT('public_masters_specialization_overview')
                  : publicT('public_major_overview'),
            })}

            {/* Section Content */}
            <div className="space-y-2.5 font-['Cairo',sans-serif]">
              {/* Main Overview Paragraph */}
              <div className="relative pl-3.5 pr-4 py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-start space-y-2 overflow-hidden font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] dark:bg-[linear-gradient(180deg,#38C6D4_0%,#0E7C86_75%,#142B5F_100%)]" />
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify font-['Cairo',sans-serif]">
                  {/* B-27: مربع نيلي مصغر بظل هندسي بترولي أفق */}
                  <span className="inline-block w-3 h-3 rounded-[3px] bg-[#142B5F] shadow-[2px_2px_0px_#0E7C86] ml-2 align-middle shrink-0" />
                  {isDoctorate
                    ? publicT('public_a_medical_sciences_doctorate_trains_researchers_to_produce')
                    : major.aboutMajor ||
                      publicT('public_an_advanced_academic_program_providing_comprehensive_scientific_knowledge')}
                </p>
                {isDoctorate && (
                  <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify pt-1 border-t border-[var(--mn-border)]">{publicT('public_at_doctoral_level_students_lead_independent_research_address')}</p>
                )}
              </div>

              {/* Note / Highlight Box */}
              {major.aboutMajorNote && !isDoctorate && (
                <div className="relative px-3.5 sm:px-4 py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] overflow-hidden mn-panel text-start font-['Cairo',sans-serif] space-y-1.5">
                  <span className="pointer-events-none absolute top-0 right-0 w-7 h-[52px] border-t-[2.5px] border-r-[3px] border-[#0E7C86] dark:border-[#38C6D4] rounded-tr-xl" />
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B5F] border-[1.5px] border-[#D6A43B]/75 dark:border-[#F2CD78]/80 text-[#F2CD78] shadow-[0_2px_8px_rgba(20,43,95,0.16)] flex items-center justify-center shrink-0">
                      <Info className="w-3.5 h-3.5 text-[#F2CD78]" />
                    </div>
                    <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] leading-snug font-['Cairo',sans-serif]">
                      {publicT('public_important_clarification')}
                    </span>
                  </div>
                  <p className="w-full text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify font-['Cairo',sans-serif]">
                    {major.aboutMajorNote}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3. COMMON TYPES OF DOCTORATE (For PhD) */}
          {isDoctorate && major.doctorateTypes && (
            <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

              {renderMajorSectionHeader({ id: 'major-doctorate-types', icon: Layers, className: 'mb-3', title: publicT('public_3_common_types_of_doctorate') })}

              <div className="mn-detail-small-grid text-start font-['Cairo',sans-serif]">
                {major.doctorateTypes.map((typeItem, tIdx) => (
                  <div
                    key={tIdx}
                    className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full font-['Cairo',sans-serif]"
                  >
                    {/* عمودان رأسيان متدرجان نيلي بترولي */}
                    <span className="inline-flex items-end gap-[2.5px] shrink-0 mt-1">
                      <span className="w-[3px] h-3.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                      <span className="w-[3px] h-2.5 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
                    </span>
                    <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors font-['Cairo',sans-serif]">
                      {typeItem}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ACADEMIC BACKGROUNDS AND ENTRY PATHWAYS (For PhD - Interactive Carousel Slider) */}
          {isDoctorate && <DoctorateAcademicBackgroundsSlider major={major} />}

          {/* 3. TARGET ACADEMIC BACKGROUNDS (For Master's) */}
          {isMaster && major.targetBackgrounds && major.targetBackgrounds.length > 0 && (
            <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

              {renderMajorSectionHeader({ id: 'major-target-backgrounds', icon: Users, className: 'mb-3', title: publicT('public_3_target_academic_backgrounds_for_admission') })}

              <div className="space-y-2.5 text-start font-['Cairo',sans-serif]">
                <div className="relative pl-3.5 pr-4 py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-start overflow-hidden">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] dark:bg-[linear-gradient(180deg,#38C6D4_0%,#0E7C86_75%,#142B5F_100%)]" />
                  <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify font-['Cairo',sans-serif]">{publicT('public_this_masters_program_is_intended_for_qualified_graduates')}</p>
                </div>

                <div className="mn-detail-small-grid font-['Cairo',sans-serif]">
                  {major.targetBackgrounds.map((bg, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full font-['Cairo',sans-serif]"
                    >
                      {/* B-06: نقطة مزدوجة نيلية-بترولية */}
                      <span className="w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 border border-[#0E7C86] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F]" />
                      </span>
                      <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors font-['Cairo',sans-serif]">
                        {bg}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. PH.D. PROGRAM STAGES (مراحل برنامج الدكتوراه) */}
          {isDoctorate && major.programStages && (
            <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

              {renderMajorSectionHeader({ id: 'major-program-stages', icon: ListChecks, className: 'mb-3', title: publicT('public_5_doctoral_program_stages') })}

              <div className="grid grid-cols-2 gap-2 text-start font-['Cairo',sans-serif]">
                {major.programStages.map((stage, sIdx) => {
                  const cleanText = stage.replace(/^\d+\.\s*/, '');
                  return (
                    <div
                      key={sIdx}
                      className="flex flex-row items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full font-['Cairo',sans-serif]"
                    >
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] group-hover:bg-[var(--mn-accent)] dark:group-hover:bg-[var(--mn-primary)] shrink-0 mt-1.5 shadow-sm transition-colors" />
                      <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors flex-1 font-['Cairo',sans-serif]">
                        {cleanText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. ADVANCED KNOWLEDGE & COURSES (For PhD) */}
          {isDoctorate && (
            <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

              {renderMajorSectionHeader({ id: 'major-study', icon: GraduationCap, className: 'mb-3', title: publicT('public_6_advanced_knowledge_and_coursework') })}

              <div className="space-y-3 text-start font-['Cairo',sans-serif]">
                {/* Block 1: المعرفة النظرية المتقدمة */}
                {major.advancedTheory && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {/* مربع بترولي صغير بإطار نيلي مزدوج */}
                      <span className="w-6 h-6 rounded-md bg-[#0E7C86] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <BookOpen className="w-3.5 h-3.5 text-white" />
                      </span>
                      <h3 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">{publicT('public_advanced_theoretical_knowledge')}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {major.advancedTheory.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 h-full font-['Cairo',sans-serif]"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78] shrink-0 mt-1.5" />
                          <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug font-['Cairo',sans-serif]">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Block 2: مناهج البحث والتحليل */}
                {major.researchMethodologies && (
                  <div className="space-y-2 pt-3 border-t border-[var(--mn-border)]">
                    <div className="flex items-center gap-2">
                      {/* مربع بترولي صغير بإطار نيلي مزدوج */}
                      <span className="w-6 h-6 rounded-md bg-[#0E7C86] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <FlaskConical className="w-3.5 h-3.5 text-white" />
                      </span>
                      <h3 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">{publicT('public_research_and_analytical_methods')}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {major.researchMethodologies.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 h-full font-['Cairo',sans-serif]"
                        >
                          {/* جوهرة نيلي صغيرة */}
                          <div className="w-1.5 h-1.5 rotate-45 rounded-[1.5px] bg-[#142B5F] dark:bg-[#F2CD78] shrink-0 mt-1.5" />
                          <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug font-['Cairo',sans-serif]">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Block 3: الأخلاقيات والنزاهة العلمية */}
                {major.ethicsAndIntegrity && (
                  <div className="space-y-2 pt-3 border-t border-[var(--mn-border)]">
                    <div className="flex items-center gap-2">
                      {/* مربع بترولي صغير بإطار نيلي مزدوج */}
                      <span className="w-6 h-6 rounded-md bg-[#0E7C86] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Scale className="w-3.5 h-3.5 text-white" />
                      </span>
                      <h3 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">{publicT('public_ethics_and_academic_integrity')}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {major.ethicsAndIntegrity.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 h-full font-['Cairo',sans-serif]"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#F2CD78] shrink-0 mt-0.5" />
                          <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug font-['Cairo',sans-serif]">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. RESEARCH FIELDS & CONCENTRATIONS */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderMajorSectionHeader({
              id: 'major-tracks',
              icon: Compass,
              className: 'mb-3',
              title: isDoctorate
                ? publicT('public_7_research_areas_and_subspecialties')
                : isMaster
                  ? publicT('public_4_common_paths_and_subspecialties')
                  : publicT('public_3_paths_and_subspecialties'),
            })}

            <div className="space-y-2.5 text-start font-['Cairo',sans-serif]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tracksList.map((track, index) => (
                  <div
                    key={index}
                    className="flex items-center p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start overflow-hidden relative min-h-[42px] h-full font-['Cairo',sans-serif]"
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#142B5F] dark:bg-[var(--mn-accent)] transition-colors" />
                    <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors pr-2 font-['Cairo',sans-serif]">
                      {track}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 8. QUALIFYING OR COMPREHENSIVE EXAM (For PhD) */}
          {isDoctorate && major.qualifyingExamInfo && (
            <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

              {renderMajorSectionHeader({ id: 'major-qualifying-exam', icon: Award, className: 'mb-3', title: publicT('public_8_qualifying_or_comprehensive_exam_where_applicable') })}

              <div className="relative pl-3.5 pr-4 py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-start overflow-hidden font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] dark:bg-[linear-gradient(180deg,#38C6D4_0%,#0E7C86_75%,#142B5F_100%)]" />
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify font-['Cairo',sans-serif]">
                  {/* مربع نيلي مصغر بظل فيروزي / بترولي أفق */}
                  <span className="inline-block w-3 h-3 rounded-[3px] bg-[#142B5F] shadow-[2px_2px_0px_#0E7C86] ml-2 align-middle shrink-0" />
                  {major.qualifyingExamInfo}
                </p>
              </div>
            </div>
          )}

          {/* 9. RESEARCH PROPOSAL & CANDIDACY (For PhD) */}
          {isDoctorate && major.researchProposalInfo && (
            <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

              {renderMajorSectionHeader({ id: 'major-research-proposal', icon: Target, className: 'mb-3', title: publicT('public_9_research_proposal_and_candidacy') })}

              <div className="relative pl-3.5 pr-4 py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-start overflow-hidden font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] dark:bg-[linear-gradient(180deg,#38C6D4_0%,#0E7C86_75%,#142B5F_100%)]" />
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify font-['Cairo',sans-serif]">
                  {/* مربع نيلي مصغر بظل فيروزي / بترولي أفق */}
                  <span className="inline-block w-3 h-3 rounded-[3px] bg-[#142B5F] shadow-[2px_2px_0px_#0E7C86] ml-2 align-middle shrink-0" />
                  {major.researchProposalInfo}
                </p>
              </div>
            </div>
          )}

          {/* 10. THESIS & ORIGINAL CONTRIBUTION (For PhD) */}
          {isDoctorate && major.originalContributionInfo && (
            <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

              {renderMajorSectionHeader({ id: 'major-original-contribution', icon: Sparkles, className: 'mb-3', title: publicT('public_10_dissertation_and_original_contribution') })}

              <div className="relative pl-3.5 pr-4 py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-start overflow-hidden font-['Cairo',sans-serif]">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] dark:bg-[linear-gradient(180deg,#38C6D4_0%,#0E7C86_75%,#142B5F_100%)]" />
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify font-['Cairo',sans-serif]">
                  {/* مربع نيلي مصغر بظل فيروزي / بترولي أفق */}
                  <span className="inline-block w-3 h-3 rounded-[3px] bg-[#142B5F] shadow-[2px_2px_0px_#0E7C86] ml-2 align-middle shrink-0" />
                  {major.originalContributionInfo}
                </p>
              </div>
            </div>
          )}

          {/* 11. SUPERVISION & RESEARCH ENVIRONMENT (For PhD) */}
          {isDoctorate && major.supervisionEnvironment && (
            <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

              {renderMajorSectionHeader({ id: 'major-supervision', icon: Building, className: 'mb-3', title: publicT('public_11_supervision_and_research_environment') })}

              <div className="grid grid-cols-2 gap-2 text-start font-['Cairo',sans-serif]">
                {major.supervisionEnvironment.map((item, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full relative overflow-hidden font-['Cairo',sans-serif]"
                  >
                    <Building className="w-3.5 h-3.5 text-[var(--mn-primary)] dark:text-[var(--mn-accent)] opacity-75 group-hover:text-[var(--mn-accent-text)] shrink-0 mt-0.5 transition-colors" />
                    <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors flex-1 font-['Cairo',sans-serif]">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 12. RESEARCH, PUBLISHING & TEACHING REQUIREMENTS (For PhD) */}
          {isDoctorate && major.researchPublishingTeaching && (
            <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

              {renderMajorSectionHeader({ id: 'major-research-publishing', icon: Library, className: 'mb-3', title: publicT('public_12_research_publication_and_teaching_requirements') })}

              <div className="grid grid-cols-2 gap-2 text-start font-['Cairo',sans-serif]">
                {major.researchPublishingTeaching.map((item, pIdx) => (
                  <div
                    key={pIdx}
                    className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full font-['Cairo',sans-serif]"
                  >
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-sm bg-[var(--mn-accent)] group-hover:bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] shrink-0 mt-1.5 shadow-sm transition-colors rotate-45" />
                    <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors flex-1 font-['Cairo',sans-serif]">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 13. ADVANCED RESEARCH & PROFESSIONAL SKILLS */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderMajorSectionHeader({
              id: 'major-skills',
              icon: Award,
              className: 'mb-3',
              title: isDoctorate ? publicT('public_13_advanced_research_and_professional_skills') : isMaster ? publicT('public_5_specialist_skills_gained') : publicT('public_4_specialist_skills_students_acquire'),
            })}

            <div className="space-y-2.5 text-start font-['Cairo',sans-serif]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {skillsList.map((skill, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full font-['Cairo',sans-serif]"
                  >
                    {/* جوهرة نيلية فقط */}
                    <span className="w-2 h-2 rotate-45 rounded-[1.5px] bg-[#142B5F] shrink-0 mt-1.5" />
                    <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors font-['Cairo',sans-serif]">
                      {skill}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 14. FIELDS OF WORK AFTER GRADUATION */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderMajorSectionHeader({
              id: 'major-careers',
              icon: Briefcase,
              className: 'mb-3',
              title: isDoctorate ? publicT('public_14_careers_after_a_doctorate') : isMaster ? publicT('public_6_careers_and_opportunities_after_graduation') : publicT('public_5_careers_after_graduation'),
            })}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-start font-['Cairo',sans-serif]">
              {workFieldsList.map((job, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start h-full font-['Cairo',sans-serif]"
                >
                  {/* B-06: نقطة مزدوجة نيلية-بترولية */}
                  <span className="w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 border border-[#0E7C86] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F]" />
                  </span>
                  <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug group-hover:text-[var(--mn-heading)] transition-colors font-['Cairo',sans-serif]">
                    {job}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 15. RELATED CAREERS / JOBS TABLE */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderMajorSectionHeader({
              id: 'major-related-jobs',
              icon: UserCheck,
              className: 'mb-3',
              title: isDoctorate
                ? publicT('public_15_key_related_jobs')
                : isMaster
                  ? publicT('public_7_key_jobs_related_to_the_degree')
                  : publicT('public_6_key_related_jobs'),
            })}

            <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-[var(--mn-border)] shadow-2xs bg-[var(--mn-surface)] font-['Cairo',sans-serif]">
              <table className="w-full text-start border-collapse table-fixed font-['Cairo',sans-serif]">
                <thead>
                  <tr className="bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)] font-['Cairo',sans-serif]">
                    <th className="py-2.5 px-3 text-[11px] sm:text-[11.5px] font-bold text-white w-[30%] border-l border-white/15 font-['Cairo',sans-serif]">
                      {publicT('public_job')}
                    </th>
                    <th className="py-2.5 px-3 text-[11px] sm:text-[11.5px] font-bold text-white w-[24%] border-l border-white/15 font-['Cairo',sans-serif]">
                      {publicT('public_degree_suitability')}
                    </th>
                    <th className="py-2.5 px-3 text-[11px] sm:text-[11.5px] font-bold text-white w-[46%] font-['Cairo',sans-serif]">
                      {publicT('public_note')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--mn-border)] font-['Cairo',sans-serif]">
                  {relatedJobsList.map((row, index) => {
                    const matchText = row.matchRate || (row.entry && row.entry.length <= 15 ? row.entry : 'مناسبة');
                    const notesText = row.notes || (row.entry && row.entry !== matchText ? row.entry : 'ـ');

                    return (
                      <tr key={index} className="odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors group font-['Cairo',sans-serif]">
                        <td className="relative py-2.5 pr-3.5 pl-3 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] align-middle font-['Cairo',sans-serif]">
                          <span className="pointer-events-none absolute top-2 right-0 bottom-2 w-[2.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] opacity-75" />
                          {row.job}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] sm:text-[11.5px] font-bold text-[#0E7C86] dark:text-[#38C6D4] border-l border-[var(--mn-border)] align-middle font-['Cairo',sans-serif]">
                          {matchText}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-relaxed align-middle font-['Cairo',sans-serif]">
                          {notesText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 16. POST-DOCTORATE & FUTURE PATHWAYS */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderMajorSectionHeader({
              id: 'major-postgraduate',
              icon: GraduationCap,
              className: 'mb-3',
              title: isDoctorate ? publicT('public_16_postdoctoral_and_subsequent_paths') : isMaster ? publicT('public_8_opportunities_after_a_masters_and_future_paths') : publicT('public_7_postgraduate_opportunities'),
            })}

            <div className="space-y-2.5 text-start font-['Cairo',sans-serif]">
              <div className="grid grid-cols-2 gap-2">
                {postgradList.map((item, index) => (
                  <div
                    key={index}
                    className="mn-major-chip w-full h-full flex items-center justify-between gap-2 p-2.5 bg-[var(--mn-page)] border border-[var(--mn-border)] text-[var(--mn-heading)] text-[11px] sm:text-[11.5px] font-bold rounded-xl hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] hover:text-[var(--mn-heading)] hover:shadow-2xs transition-all group font-['Cairo',sans-serif]"
                  >
                    <span className="leading-snug">{item.replace(/\.$/, '')}</span>
                    <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-interactive-arrow)] group-hover:scale-110 transition-all duration-200 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 17. SIMILAR MAJORS & DIFFERENCES */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderMajorSectionHeader({
              id: 'major-similar',
              icon: GitCompare,
              className: 'mb-3',
              title: isDoctorate
                ? publicT('public_17_similar_doctorates_and_differences')
                : isMaster
                  ? publicT('public_9_similar_majors_and_their_differences')
                  : publicT('public_8_similar_majors'),
            })}

            <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-[var(--mn-border)] shadow-2xs bg-[var(--mn-surface)] font-['Cairo',sans-serif]">
              <table className="w-full text-start border-collapse table-fixed font-['Cairo',sans-serif]">
                <thead>
                  <tr className="bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)] font-['Cairo',sans-serif]">
                    <th className="py-2.5 px-3 text-[11px] sm:text-[11.5px] font-bold text-white w-[28%] sm:w-[27%] border-l border-white/15 font-['Cairo',sans-serif]">
                      {isDoctorate ? publicT('public_similar_major_or_degree') : publicT('public_major_2')}
                    </th>
                    <th className="py-2.5 pr-3 pl-3.5 text-[11px] sm:text-[11.5px] font-bold text-white w-[72%] sm:w-[73%] font-['Cairo',sans-serif]">
                      {isDoctorate ? publicT('public_brief_distinction') : publicT('public_key_difference')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--mn-border)] font-['Cairo',sans-serif]">
                  {similarMajorsList.map((row, index) => {
                    const targetMajorId = relationshipDemo.similarMajorLinks[row.name];
                    return (
                      <tr key={index} className="odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors group font-['Cairo',sans-serif]">
                        <td className="relative py-2.5 pr-3.5 pl-2.5 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] align-middle group-hover:text-[var(--mn-heading)] transition-colors break-words font-['Cairo',sans-serif]">
                          <span className="pointer-events-none absolute top-2 right-0 bottom-2 w-[2.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] opacity-75" />
                          <button
                            type="button"
                            onClick={() => targetMajorId && onOpenMajor?.(targetMajorId)}
                            className="inline-flex items-center gap-1 font-bold text-[var(--mn-heading)] hover:text-[#0E7C86] dark:hover:text-[#F2CD78] transition-colors text-start font-['Cairo',sans-serif]"
                          >
                            <span>{row.name}</span>
                            <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-interactive-arrow)] group-hover:scale-110 transition-transform shrink-0 -mt-0.5" />
                          </button>
                        </td>
                        <td className="py-2.5 pr-3 pl-3.5 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-relaxed align-middle font-['Cairo',sans-serif]">
                          {row.difference}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 18. ACADEMIC & PROFESSIONAL ALERT */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderMajorSectionHeader({
              id: 'major-alert',
              icon: ShieldAlert,
              className: 'mb-3',
              title: isDoctorate
                ? publicT('public_18_academic_and_professional_notice')
                : isMaster
                  ? publicT('public_10_essential_academic_and_professional_notice')
                  : publicT('public_9_academic_and_professional_notice'),
            })}

            <div className="space-y-2.5 text-start font-['Cairo',sans-serif]">
              {isDoctorate ? (
                <div className="relative pl-3.5 pr-4 py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] text-start overflow-hidden font-['Cairo',sans-serif] space-y-1.5">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] dark:bg-[linear-gradient(180deg,#38C6D4_0%,#0E7C86_75%,#142B5F_100%)]" />
                  <div className="flex items-center gap-2">
                    {/* زاوية هندسية قائمة بنقطة بترولية */}
                    <span className="relative w-4 h-4 border-t-[2.5px] border-r-[2.5px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 bg-[#0E7C86]" />
                    </span>
                    <h4 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] leading-snug font-['Cairo',sans-serif]">
                      {publicT('public_18_academic_and_professional_notice')}
                    </h4>
                  </div>
                  <p className="w-full text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify font-['Cairo',sans-serif]">
                    {publicT('public_a_doctorate_is_a_research_degree_and_does')}
                  </p>
                </div>
              ) : (
                alertPoints.map((point, pIdx) => (
                  <div
                    key={pIdx}
                    className="relative pl-3.5 pr-4 py-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] transition-colors overflow-hidden font-['Cairo',sans-serif] space-y-1.5"
                  >
                    <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] dark:bg-[linear-gradient(180deg,#38C6D4_0%,#0E7C86_75%,#142B5F_100%)]" />
                    <div className="flex items-center gap-2">
                      {/* زاوية هندسية قائمة بنقطة بترولية */}
                      <span className="relative w-4 h-4 border-t-[2.5px] border-r-[2.5px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] flex items-center justify-center shrink-0">
                        <span className="w-1.5 h-1.5 bg-[#0E7C86]" />
                      </span>
                      <h4 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] leading-snug font-['Cairo',sans-serif]">
                        {point.title}
                      </h4>
                    </div>
                    <p className="w-full text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[2] text-justify font-['Cairo',sans-serif]">
                      {point.desc}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 19. RELATIONSHIP HUB & OPPORTUNITIES (LAST SECTION) */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

            {renderMajorSectionHeader({
              id: 'major-related-opportunities',
              icon: Compass,
              className: 'mb-3',
              title: isDoctorate
                ? publicT('public_19_explore_opportunities_for_this_major')
                : isMaster
                  ? publicT('public_11_explore_opportunities_for_this_major')
                  : publicT('public_10_explore_opportunities_for_this_major'),
              subtitle: publicT('public_published_relationships_connecting_this_major_to_relevant_universities'),
            })}

            {relationshipGraphStatus === 'loading' && (
              <div className="mb-3 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-2 text-center text-[10px] font-bold text-[var(--mn-text-muted)] font-['Cairo',sans-serif]">{publicT('public_loading_published_relationships')}</div>
            )}
            {relationshipGraphStatus === 'unavailable' && (
              <div className="mb-3 rounded-xl border border-[var(--mn-danger-border)] bg-[var(--mn-danger-soft)] px-3 py-2 text-center text-[10px] font-bold text-[var(--mn-danger-text)] font-['Cairo',sans-serif]">{publicT('public_could_not_load_the_live_relationship_graph_no')}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4 items-stretch font-['Cairo',sans-serif]">
              {/* Universities Section */}
              <div className="group relative rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] pl-3 pr-4 py-3 md:p-4 shadow-2xs overflow-hidden transition-all hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] h-full flex flex-col">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#E5B54F]" />
                <div className={`${relationshipDemo.universities.length > 0 ? 'mb-3' : ''} flex items-center justify-between gap-2.5`}>
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full border-2 border-[#D6A43B] overflow-hidden shrink-0 shadow-xs bg-[#142B5F]">
                      <img
                        src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=150&auto=format&fit=crop&q=80"
                        alt={publicT('public_universities')}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                        {publicT('public_universities_and_programs_offering_this_major')}
                      </h3>
                      <p className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5 font-['Cairo',sans-serif]">
                        {publicT('public_related_published_university_programs')}
                      </p>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-all">
                    <ArrowUpLeft className="h-3 w-3 shrink-0 stroke-[2.25]" />
                  </div>
                </div>
                {relationshipDemo.universities.length > 0 && (
                  <div className="mn-detail-small-grid">
                    {relationshipDemo.universities.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenUniversity?.(item.id)}
                        className="group/item relative w-full text-start rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] pl-3 pr-3.5 py-2.5 shadow-2xs hover:border-[#0E7C86]/55 hover:shadow-sm transition-all flex items-center justify-between gap-2.5 overflow-hidden font-['Cairo',sans-serif]"
                      >
                        <div className="absolute top-2 right-0 bottom-2 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl border border-[#D6A43B]/60 overflow-hidden shrink-0 bg-[#142B5F]/10 shadow-2xs">
                            <img
                              src={[
                                "https://images.unsplash.com/photo-1562774053-701939374585?w=100&auto=format&fit=crop&q=80",
                                "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&auto=format&fit=crop&q=80",
                                "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=100&auto=format&fit=crop&q=80",
                              ][idx % 3]}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] truncate font-['Cairo',sans-serif]">
                              {item.name}
                            </div>
                            <div className="mt-0.5 text-[9.5px] sm:text-[10px] font-semibold text-[#0E7C86] dark:text-[#38C6D4] font-['Cairo',sans-serif]">
                              {item.meta}
                            </div>
                          </div>
                        </div>
                        <div className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs group-hover/item:scale-105 transition-all">
                          <ArrowUpLeft className="h-3 w-3 shrink-0 stroke-[2.25]" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Scholarships Section */}
              <div className="group relative rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] pl-3 pr-4 py-3 md:p-4 shadow-2xs overflow-hidden transition-all hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] h-full flex flex-col">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#E5B54F]" />
                <div className={`${relationshipDemo.scholarships.length > 0 ? 'mb-3' : ''} flex items-center justify-between gap-2.5`}>
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full border-2 border-[#D6A43B] overflow-hidden shrink-0 shadow-xs bg-[#142B5F]/10">
                      <img
                        src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=150&auto=format&fit=crop&q=80"
                        alt={publicT('public_scholarships_4')}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                        {publicT('public_scholarships_available_for_this_major')}
                      </h3>
                      <p className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5 font-['Cairo',sans-serif]">
                        {publicT('public_opens_the_scholarship_page_directly')}
                      </p>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-all">
                    <ArrowUpLeft className="h-3 w-3 shrink-0 stroke-[2.25]" />
                  </div>
                </div>
                {relationshipDemo.scholarships.length > 0 && (
                  <div className="mn-detail-small-grid">
                    {relationshipDemo.scholarships.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenScholarship?.(item.id)}
                        className="group/item relative w-full text-start rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] pl-3 pr-3.5 py-2.5 shadow-2xs hover:border-[#0E7C86]/55 hover:shadow-sm transition-all flex items-center justify-between gap-2.5 overflow-hidden font-['Cairo',sans-serif]"
                      >
                        <div className="absolute top-2 right-0 bottom-2 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl border border-[#D6A43B]/60 overflow-hidden shrink-0 bg-[#142B5F]/10 shadow-2xs">
                            <img
                              src={[
                                "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=100&auto=format&fit=crop&q=80",
                                "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100&auto=format&fit=crop&q=80",
                                "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=100&auto=format&fit=crop&q=80",
                              ][idx % 3]}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] line-clamp-1 font-['Cairo',sans-serif]">
                              {item.name}
                            </div>
                            <div className="mt-0.5 text-[9.5px] sm:text-[10px] font-semibold text-[#0E7C86] dark:text-[#38C6D4] font-['Cairo',sans-serif]">
                              {item.meta}
                            </div>
                          </div>
                        </div>
                        <div className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs group-hover/item:scale-105 transition-all">
                          <ArrowUpLeft className="h-3 w-3 shrink-0 stroke-[2.25]" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Courses Section */}
              <div className="group relative rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] pl-3 pr-4 py-3 md:p-4 shadow-2xs overflow-hidden transition-all hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] h-full flex flex-col">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#E5B54F]" />
                <div className={`${relationshipDemo.courses.length > 0 ? 'mb-3' : ''} flex items-center justify-between gap-2.5`}>
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full border-2 border-[#D6A43B] overflow-hidden shrink-0 shadow-xs bg-[#142B5F]/10">
                      <img
                        src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=80"
                        alt={publicT('public_courses_2')}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                        {publicT('public_courses_related_to_this_major')}
                      </h3>
                      <p className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5 font-['Cairo',sans-serif]">
                        {publicT('public_the_course_opens_its_details_more_opens_the')}
                      </p>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-all">
                    <ArrowUpLeft className="h-3 w-3 shrink-0 stroke-[2.25]" />
                  </div>
                </div>
                {relationshipDemo.courses.length > 0 && (
                  <div className="mn-detail-small-grid">
                    {relationshipDemo.courses.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenCourse?.(item.id)}
                        className="group/item relative w-full text-start rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] pl-3 pr-3.5 py-2.5 shadow-2xs hover:border-[#0E7C86]/55 hover:shadow-sm transition-all flex items-center justify-between gap-2.5 overflow-hidden font-['Cairo',sans-serif]"
                      >
                        <div className="absolute top-2 right-0 bottom-2 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl border border-[#D6A43B]/60 overflow-hidden shrink-0 bg-[#142B5F]/10 shadow-2xs">
                            <img
                              src={[
                                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=100&auto=format&fit=crop&q=80",
                                "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=100&auto=format&fit=crop&q=80",
                                "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=100&auto=format&fit=crop&q=80",
                              ][idx % 3]}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] truncate font-['Cairo',sans-serif]">
                              {item.name}
                            </div>
                            <div className="mt-0.5 text-[9.5px] sm:text-[10px] font-semibold text-[#0E7C86] dark:text-[#38C6D4] font-['Cairo',sans-serif]">
                              {item.meta}
                            </div>
                          </div>
                        </div>
                        <div className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs group-hover/item:scale-105 transition-all">
                          <ArrowUpLeft className="h-3 w-3 shrink-0 stroke-[2.25]" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Academic Extension Section */}
              {relationshipDemo.academicPath.length > 0 && (
                <div className="group relative rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] pl-3 pr-4 py-3 shadow-2xs overflow-hidden transition-all hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78]">
                  <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#E5B54F]" />
                  <div className="mb-3 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full border-2 border-[#D6A43B] overflow-hidden shrink-0 shadow-xs bg-[#142B5F]/10">
                        <img
                          src="https://images.unsplash.com/photo-1532012197267-da84d127e765?w=150&auto=format&fit=crop&q=80"
                          alt={publicT('public_academic_progression')}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                          {publicT('public_academic_progression_for_this_major')}
                        </h3>
                        <p className="text-[9.5px] sm:text-[10px] font-semibold text-[var(--mn-text-muted)] mt-0.5 font-['Cairo',sans-serif]">
                          {publicT('public_related_advanced_or_specialist_paths')}
                        </p>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-all">
                      <ArrowUpLeft className="h-3 w-3 shrink-0 stroke-[2.25]" />
                    </div>
                  </div>
                  <div className="mn-detail-small-grid">
                    {relationshipDemo.academicPath.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenMajor?.(item.id)}
                        className="group/item relative w-full h-full text-start rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] pl-3 pr-3.5 py-2.5 shadow-2xs hover:border-[#0E7C86]/55 hover:shadow-sm transition-all flex items-center justify-between gap-2.5 overflow-hidden font-['Cairo',sans-serif]"
                      >
                        <div className="absolute top-2 right-0 bottom-2 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl border border-[#D6A43B]/60 overflow-hidden shrink-0 bg-[#142B5F]/10 shadow-2xs">
                            <img
                              src={[
                                "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=100&auto=format&fit=crop&q=80",
                                "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=100&auto=format&fit=crop&q=80",
                              ][idx % 2]}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="inline-flex rounded-md bg-[#142B5F]/10 dark:bg-[#F2CD78]/15 px-2 py-0.5 text-[9px] font-bold text-[#142B5F] dark:text-[#F2CD78] border border-[#142B5F]/15 font-['Cairo',sans-serif]">
                              {item.degree}
                            </span>
                            <div className="mt-1 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug font-['Cairo',sans-serif]">
                              {item.name}
                            </div>
                            <div className="mt-0.5 text-[9.5px] sm:text-[10px] font-semibold text-[#0E7C86] dark:text-[#38C6D4] leading-relaxed font-['Cairo',sans-serif]">
                              {item.meta}
                            </div>
                          </div>
                        </div>
                        <div className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs group-hover/item:scale-105 transition-all">
                          <ArrowUpLeft className="h-3 w-3 shrink-0 stroke-[2.25]" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 20. ACTIONS BUTTONS (SAVE & SHARE) */}
          <div className="px-2.5 sm:px-3 pt-2.5 pb-1.5 flex justify-center gap-2.5 w-full font-['Cairo',sans-serif]">
            <button
              type="button"
              onClick={() => {
                // Share action
              }}
              className="py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer bg-[var(--mn-surface)] text-[var(--mn-heading)] border border-[var(--mn-border)] hover:border-[#142B5F]/45 dark:hover:border-[#F2CD78] flex-1 max-w-[140px] mn-panel text-[10.5px] font-bold font-['Cairo',sans-serif]"
            >
              <span>مشاركة التخصص</span>
              <Share2 className="w-3.5 h-3.5 text-[var(--mn-heading)]" />
            </button>

            <button
              type="button"
              onClick={handleSaveClick}
              className="py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer flex-1 max-w-[140px] bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white border border-[#D6A43B]/75 mn-inverse text-[10.5px] font-bold font-['Cairo',sans-serif]"
            >
              <span>{effectiveFavorite ? publicT('public_saved_3') : 'حفظ التخصص'}</span>
              <Bookmark
                className={`w-3.5 h-3.5 ${effectiveFavorite ? 'fill-[#F2CD78] text-[#F2CD78]' : 'text-[#F2CD78]'}`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Save Notification Toast */}
      {saveToast && (
        <div className="fixed bottom-6 inset-x-4 max-w-xs mx-auto bg-[#142B5F] border border-[#D6A43B]/75 text-white px-4 py-2 rounded-full shadow-2xl z-50 flex items-center justify-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 mn-inverse font-['Cairo',sans-serif]">
          <Check className="w-3.5 h-3.5 text-[#F2CD78]" />
          <span>{effectiveFavorite ? 'تمت إضافة التخصص إلى مفضلتي' : 'تمت إزالة التخصص من مفضلتي'}</span>
        </div>
      )}
    </div>
  );
};
