import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { PublishedMajorSections } from './PublishedMajorSections';
import {
  ArrowUpLeft,
  BookOpen,
  FileText,
  GraduationCap,
  Layers,
  Microscope,
  Award,
  Sparkles,
  ShieldAlert,
  Compass,
  Briefcase,
  UserCheck,
  GitCompare,
  Users,
  ListChecks,
  FlaskConical,
  Target,
  ShieldCheck,
  Building,
  Library,
  Scale,
  HeartPulse,
  Heart,
  Check,
} from 'lucide-react';
import { Major } from '../types';
import { FellowshipDetailView } from './modal/FellowshipDetailView';
import { DoctorateAcademicBackgroundsSlider } from './modal/DoctorateAcademicBackgroundsSlider';
import {
  MAJOR_CONTENT_WRAPPER_CLASS,
  MAJOR_INNER_BOX_CLASS,
  MAJOR_INNER_BOX_HOVER_CLASS,
  MAJOR_NAVY_PETROL_BAR_CLASS,
  MAJOR_SECTION_CARD_CLASS,
  MAJOR_SUBGROUP_ICON_CLASS,
  MAJOR_TABLE_BODY_ROW_CLASS,
  MAJOR_TABLE_HEADER_ROW_CLASS,
  MAJOR_TABLE_ROW_BAR_CLASS,
  MAJOR_TABLE_WRAPPER_CLASS,
  MajorDetailFooterActions,
  MajorDoubleCircleMarker,
  MajorDualBarMarker,
  MajorGeometricAlertMarker,
  MajorImportantNoteBox,
  MajorParagraphLeadSquare,
  MajorPetrolDiamond,
  MajorSectionHeader,
} from './modal/MajorDetailPrimitives';
import type { MajorPublicRelationshipGraph } from '../usePublicRelationshipGraph';
import { DetailBackButton, useDetailSearchTarget } from './DetailUi';

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
  const [saveToast, setSaveToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLocalFavorite(isFavorite);
  }, [isFavorite]);

  const effectiveFavorite = onToggleFavorite ? isFavorite : localFavorite;

  const showToast = (msg: string) => {
    setSaveToast(msg);
    window.setTimeout(() => setSaveToast(null), 2000);
  };

  const handleSaveClick = () => {
    const nextState = !effectiveFavorite;
    if (onToggleFavorite) {
      onToggleFavorite(major.id);
    } else {
      setLocalFavorite((prev) => !prev);
    }
    showToast(nextState ? 'تمت إضافة التخصص إلى مفضلتي' : 'تمت إزالة التخصص من مفضلتي');
  };

  const handleShareClick = () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && shareUrl) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    showToast('تم نسخ رابط التخصص للمشاركة');
  };

  useDetailSearchTarget(searchAnchor, searchTerm);

  const sectionCardClass = MAJOR_SECTION_CARD_CLASS;
  const innerBoxClass = MAJOR_INNER_BOX_CLASS;
  const navyPetrolBarClass = MAJOR_NAVY_PETROL_BAR_CLASS;
  const tableRowBarClass = MAJOR_TABLE_ROW_BAR_CLASS;

  const renderMajorSectionHeader = (props: {
    id?: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    subtitle?: string;
    className?: string;
  }) => <MajorSectionHeader {...props} />;

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
    <div className="w-full max-w-md md:max-w-[1120px] lg:max-w-[1160px] mx-auto pt-0 pb-12 text-start font-['Cairo',sans-serif] animate-in fade-in duration-200 bg-[#F6F8FA] dark:bg-[#0A1326] min-h-screen relative mn-panel mn-major-detail">
      {/* 1. TOP HERO CONTAINER */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute top-2.5 left-2.5 md:top-3.5 md:left-4 z-30 flex flex-col md:flex-row items-center gap-1.5 md:gap-2 scale-85 md:scale-100 origin-top-left">
          <DetailBackButton onBack={onClose} mode="back" />
          <button
            type="button"
            onClick={handleSaveClick}
            className="mn-detail-close transition-all active:scale-95 cursor-pointer"
            aria-label={effectiveFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            title={effectiveFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          >
            <Heart
              className={`h-3.5 w-3.5 md:h-4 md:w-4 ${
                effectiveFavorite
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
              <linearGradient id="majorHeroNavyRight" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#142B5F" />
                <stop offset="52%" stopColor="#153B75" />
                <stop offset="100%" stopColor="#0E7C86" />
              </linearGradient>
            </defs>

            <path d="M 0,0 L 500,0 L 500,90 Q 250,112 0,90 Z" fill="url(#majorHeroNavyRight)" />

            <g opacity="0.16">
              <path
                d="M -50,30 Q 120,-10 260,35 T 550,20"
                stroke="#DDEFF2"
                strokeWidth="1.2"
                fill="none"
              />
              <path
                d="M -30,60 Q 150,20 320,55 T 560,35"
                stroke="#F2CD78"
                strokeWidth="0.9"
                fill="none"
              />
              <circle cx="42" cy="26" r="1.2" fill="#F2CD78" />
              <circle cx="452" cy="24" r="1.2" fill="#DDEFF2" />
            </g>

            <path
              d="M 0,90 Q 250,112 500,90"
              fill="none"
              stroke="#F2CD78"
              strokeOpacity="0.85"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>

          {/* Hero Content */}
          <div
            className="absolute inset-0 flex items-center justify-between gap-3 md:gap-4 px-4 sm:px-6 md:px-10 pt-1 pb-4 z-10"
            dir={publicDir}
          >
            <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1 pl-10 md:pl-20">
              <div className="w-11 h-11 md:w-14 md:h-14 rounded-full border border-[#F2CD78]/75 flex items-center justify-center p-2 shadow-[0_6px_18px_rgba(9,19,43,0.28)] bg-white/10 backdrop-blur-[2px] shrink-0">
                {isFellowship ? (
                  <HeartPulse className="w-5.5 h-5.5 md:w-6.5 md:h-6.5 text-[#F2CD78]" />
                ) : isDoctorate || isMaster ? (
                  <Microscope className="w-5.5 h-5.5 md:w-6.5 md:h-6.5 text-[#F2CD78]" />
                ) : (
                  <svg viewBox="0 0 40 40" className="w-full h-full">
                    <defs>
                      <linearGradient id="goldCapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F8E2A8" />
                        <stop offset="55%" stopColor="#F2CD78" />
                        <stop offset="100%" stopColor="#D6A43B" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points="20,6 37,14 20,22 3,14"
                      fill="url(#goldCapGrad)"
                      stroke="#FFF4CC"
                      strokeWidth="0.7"
                    />
                    <path
                      d="M9,17.5 v6 c0,3.5 4.8,6.5 11,6.5 s11,-3 11,-6.5 v-6"
                      fill="url(#goldCapGrad)"
                      stroke="#FFF4CC"
                      strokeWidth="0.55"
                    />
                    <path
                      d="M20,14 L34,16.5 v8.5"
                      stroke="#F8E2A8"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <circle cx="34" cy="26" r="1.7" fill="#F8E2A8" />
                  </svg>
                )}
              </div>

              <div className="flex flex-col text-start min-w-0 flex-1">
                <h1
                  className="text-[15.5px] sm:text-[16.5px] md:text-xl lg:text-2xl font-extrabold text-white leading-tight truncate drop-shadow-xs"
                  data-mn-design="827f35e03a"
                >
                  {major.name}
                </h1>
                <p className="text-[11px] sm:text-[11.5px] md:text-sm font-semibold text-[#DDEFF2] font-['Cairo',sans-serif] mt-0.5 tracking-wide truncate">
                  {major.nameEn}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* If Fellowship, render dedicated 17-section FellowshipDetailView */}
      {dataMode === 'api' || major.contentSections ? (
        <PublishedMajorSections
          sections={major.contentSections ?? []}
          level={major.degreeLevelName}
        />
      ) : isFellowship ? (
        <FellowshipDetailView
          major={major}
          onOpenMajor={onOpenMajor}
          effectiveFavorite={effectiveFavorite}
          onSaveClick={handleSaveClick}
          onShareClick={handleShareClick}
        />
      ) : (
        /* MAIN CONTENT WRAPPER */
        <div className={MAJOR_CONTENT_WRAPPER_CLASS} dir={publicDir}>
          {/* 1. BASIC MAJOR INFORMATION CARD */}
          <div className={sectionCardClass}>
            {renderMajorSectionHeader({
              id: 'major-requirements',
              icon: BookOpen,
              title: isDoctorate
                ? publicT('public_basic_doctoral_specialization_information')
                : isMaster
                  ? publicT('public_basic_masters_specialization_information')
                  : publicT('public_basic_major_information'),
            })}

            <div className="space-y-3 md:space-y-3.5 font-['Cairo',sans-serif]">
              <div className="rounded-xl border border-[#142B5F]/10 dark:border-white/10 bg-white dark:bg-[#0D1A30] overflow-hidden shadow-[0_1px_4px_rgba(20,43,95,0.035)]">
                {/* Table Header Row */}
                <div className="grid grid-cols-12 bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] border-b border-[#142B5F]/15 items-center font-['Cairo',sans-serif]">
                  <div className="col-span-4 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-white text-start border-l border-white/15">
                    {publicT('public_item')}
                  </div>
                  <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-white text-start">
                    {publicT('public_details_2')}
                  </div>
                </div>

                {/* Table Body Rows — Strictly Official White & #F6F8FA */}
                <div className="divide-y divide-[#142B5F]/8 dark:divide-white/10 font-['Cairo',sans-serif]">
                  {/* Reference Code */}
                  {major.code && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-white even:bg-[#F6F8FA] dark:odd:bg-[#111E38] dark:even:bg-[#0B1529]/75 transition-colors">
                      <div className="relative col-span-4 py-2.5 pr-3.5 pl-2.5 sm:pr-4 sm:pl-3 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 flex items-center">
                        <span aria-hidden="true" className={tableRowBarClass} />
                        {publicT('public_reference_code')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#DDEFF2] tabular-nums tracking-wider flex items-center">
                        {major.code}
                      </div>
                    </div>
                  )}

                  {/* Arabic Name */}
                  <div className="grid grid-cols-12 items-stretch odd:bg-white even:bg-[#F6F8FA] dark:odd:bg-[#111E38] dark:even:bg-[#0B1529]/75 transition-colors">
                    <div className="relative col-span-4 py-2.5 pr-3.5 pl-2.5 sm:pr-4 sm:pl-3 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 flex items-center">
                      <span aria-hidden="true" className={tableRowBarClass} />
                      {publicT('public_arabic_name')}
                    </div>
                    <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] flex items-center">
                      {major.name}
                    </div>
                  </div>

                  {/* Name in English */}
                  <div className="grid grid-cols-12 items-stretch odd:bg-white even:bg-[#F6F8FA] dark:odd:bg-[#111E38] dark:even:bg-[#0B1529]/75 transition-colors">
                    <div className="relative col-span-4 py-2.5 pr-3.5 pl-2.5 sm:pr-4 sm:pl-3 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 flex items-center">
                      <span aria-hidden="true" className={tableRowBarClass} />
                      {publicT('public_english_name')}
                    </div>
                    <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#0E7C86] dark:text-[#34BFC9] tracking-wide flex items-center">
                      {major.nameEn}
                    </div>
                  </div>

                  {/* Associated Major */}
                  {major.associatedMajor && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-white even:bg-[#F6F8FA] dark:odd:bg-[#111E38] dark:even:bg-[#0B1529]/75 transition-colors">
                      <div className="relative col-span-4 py-2.5 pr-3.5 pl-2.5 sm:pr-4 sm:pl-3 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 flex items-center">
                        <span aria-hidden="true" className={tableRowBarClass} />
                        {isDoctorate
                          ? publicT('public_related_primary_major')
                          : publicT('public_related_major')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-relaxed flex items-center">
                        {major.associatedMajor}
                      </div>
                    </div>
                  )}

                  {/* Master Majoring Links for PhD */}
                  {isDoctorate && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-white even:bg-[#F6F8FA] dark:odd:bg-[#111E38] dark:even:bg-[#0B1529]/75 transition-colors">
                      <div className="relative col-span-4 py-2.5 pr-3.5 pl-2.5 sm:pr-4 sm:pl-3 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 flex items-center">
                        <span aria-hidden="true" className={tableRowBarClass} />
                        {publicT('public_related_masters_specializations')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-relaxed flex items-center">
                        {publicT('public_mas_0001_medical_sciences_with_potential_links_to')}
                      </div>
                    </div>
                  )}

                  {/* Academic Field */}
                  <div className="grid grid-cols-12 items-stretch odd:bg-white even:bg-[#F6F8FA] dark:odd:bg-[#111E38] dark:even:bg-[#0B1529]/75 transition-colors">
                    <div className="relative col-span-4 py-2.5 pr-3.5 pl-2.5 sm:pr-4 sm:pl-3 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 flex items-center">
                      <span aria-hidden="true" className={tableRowBarClass} />
                      {publicT('public_academic_domain')}
                    </div>
                    <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] flex items-center">
                      {major.academicField || major.category}
                    </div>
                  </div>

                  {/* Degree Level */}
                  <div className="grid grid-cols-12 items-stretch odd:bg-white even:bg-[#F6F8FA] dark:odd:bg-[#111E38] dark:even:bg-[#0B1529]/75 transition-colors">
                    <div className="relative col-span-4 py-2.5 pr-3.5 pl-2.5 sm:pr-4 sm:pl-3 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 flex items-center">
                      <span aria-hidden="true" className={tableRowBarClass} />
                      {publicT('public_degree_level')}
                    </div>
                    <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] flex items-center">
                      {major.degreeLevelName || major.degreeLevels?.join('، ')}
                    </div>
                  </div>

                  {/* Program Type / Doctorate Type */}
                  {major.programTypes && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-white even:bg-[#F6F8FA] dark:odd:bg-[#111E38] dark:even:bg-[#0B1529]/75 transition-colors">
                      <div className="relative col-span-4 py-2.5 pr-3.5 pl-2.5 sm:pr-4 sm:pl-3 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 flex items-center">
                        <span aria-hidden="true" className={tableRowBarClass} />
                        {isDoctorate
                          ? publicT('public_doctorate_type')
                          : publicT('public_program_type')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-relaxed flex items-center">
                        {major.programTypes}
                      </div>
                    </div>
                  )}

                  {/* Common Degrees */}
                  {(major.commonDegrees ||
                    (major.degreeLevels && major.degreeLevels.length > 0)) && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-white even:bg-[#F6F8FA] dark:odd:bg-[#111E38] dark:even:bg-[#0B1529]/75 transition-colors">
                      <div className="relative col-span-4 py-2.5 pr-3.5 pl-2.5 sm:pr-4 sm:pl-3 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 flex items-center">
                        <span aria-hidden="true" className={tableRowBarClass} />
                        {publicT('public_common_degree_names')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-relaxed flex items-center">
                        {major.commonDegrees || major.degreeLevels?.join('، ')}
                      </div>
                    </div>
                  )}

                  {/* Common Duration */}
                  {major.duration && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-white even:bg-[#F6F8FA] dark:odd:bg-[#111E38] dark:even:bg-[#0B1529]/75 transition-colors">
                      <div className="relative col-span-4 py-2.5 pr-3.5 pl-2.5 sm:pr-4 sm:pl-3 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 flex items-center">
                        <span aria-hidden="true" className={tableRowBarClass} />
                        {publicT('public_typical_duration')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-relaxed flex items-center">
                        {major.duration}
                      </div>
                    </div>
                  )}

                  {/* Study Modes / Common Entry Path */}
                  {major.studyModes && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-white even:bg-[#F6F8FA] dark:odd:bg-[#111E38] dark:even:bg-[#0B1529]/75 transition-colors">
                      <div className="relative col-span-4 py-2.5 pr-3.5 pl-2.5 sm:pr-4 sm:pl-3 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 flex items-center">
                        <span aria-hidden="true" className={tableRowBarClass} />
                        {isDoctorate
                          ? publicT('public_common_entry_path')
                          : publicT('public_study_arrangements_2')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-relaxed flex items-center">
                        {major.studyModes}
                      </div>
                    </div>
                  )}

                  {/* Availability Nature */}
                  {major.availabilityNature && (
                    <div className="grid grid-cols-12 items-stretch odd:bg-white even:bg-[#F6F8FA] dark:odd:bg-[#111E38] dark:even:bg-[#0B1529]/75 transition-colors">
                      <div className="relative col-span-4 py-2.5 pr-3.5 pl-2.5 sm:pr-4 sm:pl-3 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 flex items-center">
                        <span aria-hidden="true" className={tableRowBarClass} />
                        {publicT('public_availability_2')}
                      </div>
                      <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-relaxed flex items-center">
                        {major.availabilityNature}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Short Description - Standalone Box */}
              {major.description && (
                <div
                  className={`relative pl-3.5 pr-4 py-3 rounded-xl ${innerBoxClass} text-start overflow-hidden space-y-1.5`}
                >
                  <span aria-hidden="true" className={navyPetrolBarClass} />
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <span className="w-3.5 h-[2.5px] rounded-full bg-[linear-gradient(270deg,#142B5F_0%,#0E7C86_100%)]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C86]" />
                    </span>
                    <span className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9]">
                      {publicT('public_brief_description')}
                    </span>
                  </div>
                  <p className="w-full text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F]/90 dark:text-[#DCE8F2] leading-[1.9] text-start">
                    {major.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. NATURE AND OBJECTIVE OF DOCTORATE / OVERVIEW */}
          <div className={sectionCardClass}>
            {renderMajorSectionHeader({
              id: 'major-about',
              icon: FileText,
              title: isDoctorate
                ? publicT('public_doctorate_nature_and_purpose')
                : isMaster
                  ? publicT('public_masters_specialization_overview')
                  : publicT('public_major_overview'),
            })}

            <div className="space-y-2.5">
              {/* Main Overview Paragraph */}
              <div
                className={`relative pl-3.5 pr-4 py-3 rounded-xl ${innerBoxClass} text-start space-y-2 overflow-hidden`}
              >
                <span aria-hidden="true" className={navyPetrolBarClass} />
                <p className="text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F]/90 dark:text-[#DCE8F2] leading-[1.9] text-start">
                  <MajorParagraphLeadSquare />
                  {isDoctorate
                    ? publicT('public_a_medical_sciences_doctorate_trains_researchers_to_produce')
                    : major.aboutMajor ||
                      publicT(
                        'public_an_advanced_academic_program_providing_comprehensive_scientific_knowledge',
                      )}
                </p>
                {isDoctorate && (
                  <p className="text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F]/90 dark:text-[#DCE8F2] leading-[1.9] text-start pt-2 border-t border-[#142B5F]/10 dark:border-white/10">
                    {publicT('public_at_doctoral_level_students_lead_independent_research_address')}
                  </p>
                )}
              </div>

              {/* Note / Highlight Box */}
              {major.aboutMajorNote && !isDoctorate && (
                <MajorImportantNoteBox
                  label={publicT('public_important_clarification')}
                  text={major.aboutMajorNote}
                />
              )}
            </div>
          </div>

          {/* 3. COMMON TYPES OF DOCTORATE (For PhD) */}
          {isDoctorate && major.doctorateTypes && (
            <div className={sectionCardClass}>
              {renderMajorSectionHeader({
                id: 'major-doctorate-types',
                icon: Layers,
                title: publicT('public_3_common_types_of_doctorate'),
              })}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-2.5 text-start">
                {major.doctorateTypes.map((typeItem, tIdx) => (
                  <div
                    key={tIdx}
                    className={`flex items-start gap-2 p-2.5 rounded-xl ${innerBoxClass} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start h-full ${
                      tIdx === major.doctorateTypes!.length - 1 &&
                      major.doctorateTypes!.length % 2 === 1
                        ? 'col-span-2 lg:col-span-1'
                        : ''
                    }`}
                  >
                    <MajorDualBarMarker />
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug">
                      {typeItem}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ACADEMIC BACKGROUNDS AND ENTRY PATHWAYS (For PhD) */}
          {isDoctorate && <DoctorateAcademicBackgroundsSlider major={major} />}

          {/* 3. TARGET ACADEMIC BACKGROUNDS (For Master's) */}
          {isMaster && major.targetBackgrounds && major.targetBackgrounds.length > 0 && (
            <div className={sectionCardClass}>
              {renderMajorSectionHeader({
                id: 'major-target-backgrounds',
                icon: Users,
                title: publicT('public_3_target_academic_backgrounds_for_admission'),
              })}

              <div className="space-y-2.5 text-start">
                <div
                  className={`relative pl-3.5 pr-4 py-3 rounded-xl ${innerBoxClass} text-start overflow-hidden`}
                >
                  <span aria-hidden="true" className={navyPetrolBarClass} />
                  <p className="text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F]/90 dark:text-[#DCE8F2] leading-[1.9] text-start">
                    {publicT('public_this_masters_program_is_intended_for_qualified_graduates')}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-2.5 text-start">
                  {major.targetBackgrounds.map((bg, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${innerBoxClass} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start h-full ${
                        idx === major.targetBackgrounds!.length - 1 &&
                        major.targetBackgrounds!.length % 2 === 1
                          ? 'col-span-2 sm:col-span-1'
                          : ''
                      }`}
                    >
                      <MajorDoubleCircleMarker />
                      <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                        {bg}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. PH.D. PROGRAM STAGES */}
          {isDoctorate && major.programStages && (
            <div className={sectionCardClass}>
              {renderMajorSectionHeader({
                id: 'major-program-stages',
                icon: ListChecks,
                title: publicT('public_5_doctoral_program_stages'),
              })}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-2.5 text-start">
                {major.programStages.map((stage, sIdx) => {
                  const cleanText = stage.replace(/^\d+\.\s*/, '');
                  return (
                    <div
                      key={sIdx}
                      className={`flex flex-row items-start gap-2 p-2.5 rounded-xl ${innerBoxClass} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start h-full ${
                        sIdx === major.programStages!.length - 1 &&
                        major.programStages!.length % 2 === 1
                          ? 'col-span-2 sm:col-span-1'
                          : ''
                      }`}
                    >
                      <span className="w-4.5 h-4.5 rounded-md bg-[#DDEFF2]/75 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/35 text-[#142B5F] dark:text-[#34BFC9] text-[10px] font-extrabold tabular-nums flex items-center justify-center shrink-0 mt-0.5 font-['Cairo',sans-serif]">
                        {sIdx + 1}
                      </span>
                      <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
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
            <div className={sectionCardClass}>
              {renderMajorSectionHeader({
                id: 'major-study',
                icon: GraduationCap,
                title: publicT('public_6_advanced_knowledge_and_coursework'),
              })}

              <div className="space-y-3.5 text-start">
                {major.advancedTheory && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={MAJOR_SUBGROUP_ICON_CLASS}>
                        <BookOpen className="w-3.5 h-3.5" />
                      </span>
                      <h3 className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9]">
                        {publicT('public_advanced_theoretical_knowledge')}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {major.advancedTheory.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${innerBoxClass} ${MAJOR_INNER_BOX_HOVER_CLASS} h-full ${
                            idx === major.advancedTheory!.length - 1 &&
                            major.advancedTheory!.length % 2 === 1
                              ? 'sm:col-span-2'
                              : ''
                          }`}
                        >
                          <MajorDoubleCircleMarker />
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {major.researchMethodologies && (
                  <div className="space-y-2 pt-3 border-t border-[#142B5F]/10 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <span className={MAJOR_SUBGROUP_ICON_CLASS}>
                        <FlaskConical className="w-3.5 h-3.5" />
                      </span>
                      <h3 className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9]">
                        {publicT('public_research_and_analytical_methods')}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {major.researchMethodologies.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-2 px-3 py-2.5 rounded-xl ${innerBoxClass} ${MAJOR_INNER_BOX_HOVER_CLASS} h-full ${
                            idx === major.researchMethodologies!.length - 1 &&
                            major.researchMethodologies!.length % 2 === 1
                              ? 'sm:col-span-2'
                              : ''
                          }`}
                        >
                          <MajorPetrolDiamond />
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {major.ethicsAndIntegrity && (
                  <div className="space-y-2 pt-3 border-t border-[#142B5F]/10 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <span className={MAJOR_SUBGROUP_ICON_CLASS}>
                        <Scale className="w-3.5 h-3.5" />
                      </span>
                      <h3 className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9]">
                        {publicT('public_ethics_and_academic_integrity')}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {major.ethicsAndIntegrity.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${innerBoxClass} ${MAJOR_INNER_BOX_HOVER_CLASS} h-full ${
                            idx === major.ethicsAndIntegrity!.length - 1 &&
                            major.ethicsAndIntegrity!.length % 2 === 1
                              ? 'sm:col-span-2'
                              : ''
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
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

          {/* 7. RESEARCH FIELDS & CONCENTRATIONS / PATHS & SUBSPECIALTIES */}
          <div className={sectionCardClass}>
            {renderMajorSectionHeader({
              id: 'major-tracks',
              icon: Compass,
              title: isDoctorate
                ? publicT('public_7_research_areas_and_subspecialties')
                : isMaster
                  ? publicT('public_4_common_paths_and_subspecialties')
                  : publicT('public_3_paths_and_subspecialties'),
            })}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-2.5 text-start">
              {tracksList.map((track, index) => (
                <div
                  key={index}
                  className={`relative flex items-center py-2.5 pr-3.5 pl-2.5 rounded-xl ${innerBoxClass} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start overflow-hidden min-h-[42px] h-full ${
                    index === tracksList.length - 1 && tracksList.length % 2 === 1
                      ? 'col-span-2 sm:col-span-1'
                      : ''
                  }`}
                >
                  <span aria-hidden="true" className={navyPetrolBarClass} />
                  <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug">
                    {track}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 8. QUALIFYING OR COMPREHENSIVE EXAM (For PhD) */}
          {isDoctorate && major.qualifyingExamInfo && (
            <div className={sectionCardClass}>
              {renderMajorSectionHeader({
                id: 'major-qualifying-exam',
                icon: Award,
                title: publicT('public_8_qualifying_or_comprehensive_exam_where_applicable'),
              })}

              <div
                className={`relative pl-3.5 pr-4 py-3 rounded-xl ${innerBoxClass} text-start overflow-hidden`}
              >
                <span aria-hidden="true" className={navyPetrolBarClass} />
                <p className="text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F]/90 dark:text-[#DCE8F2] leading-[1.9] text-start">
                  <MajorParagraphLeadSquare />
                  {major.qualifyingExamInfo}
                </p>
              </div>
            </div>
          )}

          {/* 9. RESEARCH PROPOSAL & CANDIDACY (For PhD) */}
          {isDoctorate && major.researchProposalInfo && (
            <div className={sectionCardClass}>
              {renderMajorSectionHeader({
                id: 'major-research-proposal',
                icon: Target,
                title: publicT('public_9_research_proposal_and_candidacy'),
              })}

              <div
                className={`relative pl-3.5 pr-4 py-3 rounded-xl ${innerBoxClass} text-start overflow-hidden`}
              >
                <span aria-hidden="true" className={navyPetrolBarClass} />
                <p className="text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F]/90 dark:text-[#DCE8F2] leading-[1.9] text-start">
                  <MajorParagraphLeadSquare />
                  {major.researchProposalInfo}
                </p>
              </div>
            </div>
          )}

          {/* 10. THESIS & ORIGINAL CONTRIBUTION (For PhD) */}
          {isDoctorate && major.originalContributionInfo && (
            <div className={sectionCardClass}>
              {renderMajorSectionHeader({
                id: 'major-original-contribution',
                icon: Sparkles,
                title: publicT('public_10_dissertation_and_original_contribution'),
              })}

              <div
                className={`relative pl-3.5 pr-4 py-3 rounded-xl ${innerBoxClass} text-start overflow-hidden`}
              >
                <span aria-hidden="true" className={navyPetrolBarClass} />
                <p className="text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F]/90 dark:text-[#DCE8F2] leading-[1.9] text-start">
                  <MajorParagraphLeadSquare />
                  {major.originalContributionInfo}
                </p>
              </div>
            </div>
          )}

          {/* 11. SUPERVISION & RESEARCH ENVIRONMENT (For PhD) */}
          {isDoctorate && major.supervisionEnvironment && (
            <div className={sectionCardClass}>
              {renderMajorSectionHeader({
                id: 'major-supervision',
                icon: Building,
                title: publicT('public_11_supervision_and_research_environment'),
              })}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-2.5 text-start">
                {major.supervisionEnvironment.map((item, sIdx) => (
                  <div
                    key={sIdx}
                    className={`flex items-start gap-2 p-2.5 rounded-xl ${innerBoxClass} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start h-full ${
                      sIdx === major.supervisionEnvironment!.length - 1 &&
                      major.supervisionEnvironment!.length % 2 === 1
                        ? 'col-span-2 sm:col-span-1'
                        : ''
                    }`}
                  >
                    <Building className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0 mt-0.5" />
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 12. RESEARCH, PUBLISHING & TEACHING REQUIREMENTS (For PhD) */}
          {isDoctorate && major.researchPublishingTeaching && (
            <div className={sectionCardClass}>
              {renderMajorSectionHeader({
                id: 'major-research-publishing',
                icon: Library,
                title: publicT('public_12_research_publication_and_teaching_requirements'),
              })}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-2.5 text-start">
                {major.researchPublishingTeaching.map((item, pIdx) => (
                  <div
                    key={pIdx}
                    className={`flex items-start gap-2 p-2.5 rounded-xl ${innerBoxClass} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start h-full ${
                      pIdx === major.researchPublishingTeaching!.length - 1 &&
                      major.researchPublishingTeaching!.length % 2 === 1
                        ? 'col-span-2 sm:col-span-1'
                        : ''
                    }`}
                  >
                    <MajorPetrolDiamond />
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 13. ADVANCED RESEARCH & PROFESSIONAL SKILLS */}
          <div className={sectionCardClass}>
            {renderMajorSectionHeader({
              id: 'major-skills',
              icon: Award,
              title: isDoctorate
                ? publicT('public_13_advanced_research_and_professional_skills')
                : isMaster
                  ? publicT('public_5_specialist_skills_gained')
                  : publicT('public_4_specialist_skills_students_acquire'),
            })}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-2.5 text-start">
              {skillsList.map((skill, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 p-2.5 rounded-xl ${innerBoxClass} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start h-full ${
                    index === skillsList.length - 1 && skillsList.length % 2 === 1
                      ? 'col-span-2 sm:col-span-1'
                      : ''
                  }`}
                >
                  <MajorPetrolDiamond />
                  <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                    {skill}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 14. FIELDS OF WORK AFTER GRADUATION */}
          <div className={sectionCardClass}>
            {renderMajorSectionHeader({
              id: 'major-careers',
              icon: Briefcase,
              title: isDoctorate
                ? publicT('public_14_careers_after_a_doctorate')
                : isMaster
                  ? publicT('public_6_careers_and_opportunities_after_graduation')
                  : publicT('public_5_careers_after_graduation'),
            })}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-2.5 text-start">
              {workFieldsList.map((job, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${innerBoxClass} ${MAJOR_INNER_BOX_HOVER_CLASS} group text-start min-h-[40px] h-full ${
                      index === workFieldsList.length - 1 && workFieldsList.length % 2 === 1
                        ? 'col-span-2 sm:col-span-1'
                        : ''
                    }`}
                  >
                    <MajorDoubleCircleMarker />
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#EDF5F5] leading-snug flex-1">
                      {job}
                    </span>
                  </div>
              ))}
            </div>
          </div>

          {/* 15. RELATED CAREERS / JOBS TABLE */}
          <div className={sectionCardClass}>
            {renderMajorSectionHeader({
              id: 'major-related-jobs',
              icon: UserCheck,
              title: isDoctorate
                ? publicT('public_15_key_related_jobs')
                : isMaster
                  ? publicT('public_7_key_jobs_related_to_the_degree')
                  : publicT('public_6_key_related_jobs'),
            })}

            <div className={MAJOR_TABLE_WRAPPER_CLASS}>
              <table className="w-full text-start border-collapse table-fixed font-['Cairo',sans-serif]">
                <thead>
                  <tr className={MAJOR_TABLE_HEADER_ROW_CLASS}>
                    <th className="py-2.5 px-3 text-[11px] sm:text-[11.5px] font-bold text-white w-[34%] border-l border-white/15">
                      {publicT('public_job')}
                    </th>
                    <th className="py-2.5 px-2 sm:px-3 text-[11px] sm:text-[11.5px] font-bold text-white w-[22%] border-l border-white/15">
                      {publicT('public_degree_suitability')}
                    </th>
                    <th className="py-2.5 px-3 text-[11px] sm:text-[11.5px] font-bold text-white w-[44%]">
                      {publicT('public_note')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#142B5F]/8 dark:divide-white/10">
                  {relatedJobsList.map((row, index) => {
                    const matchText =
                      row.matchRate ||
                      (row.entry && row.entry.length <= 15 ? row.entry : 'مناسبة');
                    const notesText =
                      row.notes || (row.entry && row.entry !== matchText ? row.entry : 'ـ');

                    return (
                      <tr key={index} className={MAJOR_TABLE_BODY_ROW_CLASS}>
                        <td className="relative py-2.5 pr-3.5 pl-2.5 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 align-middle break-words">
                          <span aria-hidden="true" className={tableRowBarClass} />
                          {row.job}
                        </td>
                        <td className="py-2.5 px-2 sm:px-3 text-[11px] sm:text-[11.5px] font-bold text-[#0E7C86] dark:text-[#34BFC9] border-l border-[#142B5F]/8 dark:border-white/10 align-middle">
                          {matchText}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#DCE8F2] leading-relaxed align-middle">
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
          <div className={sectionCardClass}>
            {renderMajorSectionHeader({
              id: 'major-postgraduate',
              icon: GraduationCap,
              title: isDoctorate
                ? publicT('public_16_postdoctoral_and_subsequent_paths')
                : isMaster
                  ? publicT('public_8_opportunities_after_a_masters_and_future_paths')
                  : publicT('public_7_postgraduate_opportunities'),
            })}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-2.5 text-start">
              {postgradList.map((item, index) => (
                <div
                  key={index}
                  className={`relative overflow-hidden w-full h-full flex items-center justify-between gap-2 py-2.5 pr-3.5 pl-2.5 ${innerBoxClass} text-[#142B5F] dark:text-[#EDF5F5] text-[10.5px] sm:text-[11px] font-bold rounded-xl hover:bg-[#DDEFF2]/35 dark:hover:bg-[#132542] hover:border-[#0E7C86]/35 transition-all group ${
                    index === postgradList.length - 1 && postgradList.length % 2 === 1
                      ? 'col-span-2 sm:col-span-1'
                      : ''
                  }`}
                >
                  <span aria-hidden="true" className={navyPetrolBarClass} />
                  <span className="leading-snug">{item.replace(/\.$/, '')}</span>
                  <ArrowUpLeft className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] group-hover:scale-110 transition-transform duration-200 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* 17. SIMILAR MAJORS & DIFFERENCES */}
          <div className={sectionCardClass}>
            {renderMajorSectionHeader({
              id: 'major-similar',
              icon: GitCompare,
              title: isDoctorate
                ? publicT('public_17_similar_doctorates_and_differences')
                : isMaster
                  ? publicT('public_9_similar_majors_and_their_differences')
                  : publicT('public_8_similar_majors'),
            })}

            <div className={MAJOR_TABLE_WRAPPER_CLASS}>
              <table className="w-full text-start border-collapse table-fixed font-['Cairo',sans-serif]">
                <thead>
                  <tr className={MAJOR_TABLE_HEADER_ROW_CLASS}>
                    <th className="py-2.5 px-3 text-[11px] sm:text-[11.5px] font-bold text-white w-[36%] sm:w-[30%] border-l border-white/15">
                      {isDoctorate
                        ? publicT('public_similar_major_or_degree')
                        : publicT('public_major_2')}
                    </th>
                    <th className="py-2.5 pr-3 pl-3.5 text-[11px] sm:text-[11.5px] font-bold text-white w-[64%] sm:w-[70%]">
                      {isDoctorate
                        ? publicT('public_brief_distinction')
                        : publicT('public_key_difference')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#142B5F]/8 dark:divide-white/10">
                  {similarMajorsList.map((row, index) => {
                    const targetMajorId = relationshipDemo.similarMajorLinks[row.name];
                    return (
                      <tr key={index} className={MAJOR_TABLE_BODY_ROW_CLASS}>
                        <td className="relative py-2.5 pr-3.5 pl-2.5 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] border-l border-[#142B5F]/8 dark:border-white/10 align-middle break-words">
                          <span aria-hidden="true" className={tableRowBarClass} />
                          <button
                            type="button"
                            onClick={() => targetMajorId && onOpenMajor?.(targetMajorId)}
                            className="w-full flex items-center justify-between gap-1.5 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] hover:text-[#0E7C86] dark:hover:text-[#34BFC9] transition-colors text-start font-['Cairo',sans-serif]"
                          >
                            <span className="leading-snug">{row.name}</span>
                            <ArrowUpLeft className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] group-hover:scale-110 transition-transform shrink-0" />
                          </button>
                        </td>
                        <td className="py-2.5 pr-3 pl-3.5 text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#DCE8F2] leading-relaxed align-middle">
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
          <div className={sectionCardClass}>
            {renderMajorSectionHeader({
              id: 'major-alert',
              icon: ShieldAlert,
              title: isDoctorate
                ? publicT('public_18_academic_and_professional_notice')
                : isMaster
                  ? publicT('public_10_essential_academic_and_professional_notice')
                  : publicT('public_9_academic_and_professional_notice'),
            })}

            <div className="space-y-2.5 text-start">
              {isDoctorate ? (
                <div
                  className={`relative pl-3.5 pr-4 py-3 rounded-xl ${innerBoxClass} text-start overflow-hidden space-y-1.5`}
                >
                  <span aria-hidden="true" className={navyPetrolBarClass} />
                  <div className="flex items-center gap-2">
                    <MajorGeometricAlertMarker />
                    <h4 className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] leading-snug">
                      {publicT('public_18_academic_and_professional_notice')}
                    </h4>
                  </div>
                  <p className="w-full text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F]/90 dark:text-[#DCE8F2] leading-[1.9] text-start">
                    {publicT('public_a_doctorate_is_a_research_degree_and_does')}
                  </p>
                </div>
              ) : (
                alertPoints.map((point, pIdx) => (
                  <div
                    key={pIdx}
                    className={`relative pl-3.5 pr-4 py-3 rounded-xl ${innerBoxClass} hover:bg-[#DDEFF2]/35 dark:hover:bg-[#132542] transition-colors overflow-hidden space-y-1.5`}
                  >
                    <span aria-hidden="true" className={navyPetrolBarClass} />
                    <div className="flex items-center gap-2">
                      <MajorGeometricAlertMarker />
                      <h4 className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] leading-snug">
                        {point.title}
                      </h4>
                    </div>
                    <p className="w-full text-[11px] sm:text-[11.5px] md:text-xs font-bold text-[#142B5F]/90 dark:text-[#DCE8F2] leading-[1.9] text-start">
                      {point.desc}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 19. RELATIONSHIP HUB & OPPORTUNITIES (LAST SECTION) */}
          <div className={sectionCardClass}>
            {renderMajorSectionHeader({
              id: 'major-related-opportunities',
              icon: Compass,
              title: isDoctorate
                ? publicT('public_19_explore_opportunities_for_this_major')
                : isMaster
                  ? publicT('public_11_explore_opportunities_for_this_major')
                  : publicT('public_10_explore_opportunities_for_this_major'),
              subtitle: publicT(
                'public_published_relationships_connecting_this_major_to_relevant_universities',
              ),
            })}

            {relationshipGraphStatus === 'loading' && (
              <div
                className={`mb-3 rounded-xl ${innerBoxClass} px-3 py-2 text-center text-[10.5px] font-bold text-[#5C707C] dark:text-[#9BB4C7]`}
              >
                {publicT('public_loading_published_relationships')}
              </div>
            )}
            {relationshipGraphStatus === 'unavailable' && (
              <div className="mb-3 rounded-xl border border-[var(--mn-danger-border)] bg-[var(--mn-danger-soft)] px-3 py-2 text-center text-[10.5px] font-bold text-[var(--mn-danger-text)]">
                {publicT('public_could_not_load_the_live_relationship_graph_no')}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-3.5 items-stretch">
              {/* Universities Section */}
              <div
                className={`group relative rounded-xl ${innerBoxClass} pl-3 pr-4 py-3 md:p-3.5 overflow-hidden transition-all hover:bg-[#DDEFF2]/35 dark:hover:bg-[#132542] hover:border-[#0E7C86]/30 h-full flex flex-col`}
              >
                <span aria-hidden="true" className={navyPetrolBarClass} />
                <div
                  className={`${relationshipDemo.universities.length > 0 ? 'mb-3' : ''} flex items-center justify-between gap-2.5`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8.5 h-8.5 rounded-xl border border-[#142B5F]/15 overflow-hidden shrink-0 shadow-2xs bg-[#142B5F]/10">
                      <img
                        src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=150&auto=format&fit=crop&q=80"
                        alt={publicT('public_universities')}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9]">
                        {publicT('public_universities_and_programs_offering_this_major')}
                      </h3>
                      <p className="text-[10.5px] sm:text-[11px] font-bold text-[#5C707C] dark:text-[#9BB4C7] mt-0.5">
                        {publicT('public_related_published_university_programs')}
                      </p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#DDEFF2]/85 dark:bg-[#142B5F] border border-[#142B5F]/18 dark:border-[#34BFC9]/35 text-[#142B5F] dark:text-[#DDEFF2] flex items-center justify-center shrink-0 group-hover:bg-[#142B5F] group-hover:text-white transition-all">
                    <ArrowUpLeft className="h-3.25 w-3.25 shrink-0 stroke-[2.25]" />
                  </div>
                </div>
                {relationshipDemo.universities.length > 0 && (
                  <div className="space-y-2">
                    {relationshipDemo.universities.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenUniversity?.(item.id)}
                        className="group/item relative w-full text-start rounded-xl border border-[#142B5F]/10 dark:border-white/10 bg-white dark:bg-[#111E38] pl-3 pr-3.5 py-2.5 hover:border-[#0E7C86]/40 hover:shadow-xs transition-all flex items-center justify-between gap-2.5 overflow-hidden cursor-pointer"
                      >
                        <span aria-hidden="true" className={navyPetrolBarClass} />
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg border border-[#142B5F]/12 overflow-hidden shrink-0 bg-[#142B5F]/10">
                            <img
                              src={[
                                'https://images.unsplash.com/photo-1562774053-701939374585?w=100&auto=format&fit=crop&q=80',
                                'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&auto=format&fit=crop&q=80',
                                'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=100&auto=format&fit=crop&q=80',
                              ][idx % 3]}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F1F5F9] truncate">
                              {item.name}
                            </div>
                            <div className="mt-0.5 text-[10px] sm:text-[10.5px] font-bold text-[#0E7C86] dark:text-[#34BFC9]">
                              {item.meta}
                            </div>
                          </div>
                        </div>
                        <div className="w-5.5 h-5.5 rounded-full bg-[#DDEFF2]/85 dark:bg-[#142B5F] border border-[#142B5F]/18 text-[#142B5F] dark:text-[#DDEFF2] flex items-center justify-center shrink-0 group-hover/item:bg-[#142B5F] group-hover/item:text-white transition-all">
                          <ArrowUpLeft className="h-3 w-3 shrink-0 stroke-[2.25]" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Scholarships Section */}
              <div
                className={`group relative rounded-xl ${innerBoxClass} pl-3 pr-4 py-3 md:p-3.5 overflow-hidden transition-all hover:bg-[#DDEFF2]/35 dark:hover:bg-[#132542] hover:border-[#0E7C86]/30 h-full flex flex-col`}
              >
                <span aria-hidden="true" className={navyPetrolBarClass} />
                <div
                  className={`${relationshipDemo.scholarships.length > 0 ? 'mb-3' : ''} flex items-center justify-between gap-2.5`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8.5 h-8.5 rounded-xl border border-[#142B5F]/15 overflow-hidden shrink-0 shadow-2xs bg-[#142B5F]/10">
                      <img
                        src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=150&auto=format&fit=crop&q=80"
                        alt={publicT('public_scholarships_4')}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9]">
                        {publicT('public_scholarships_available_for_this_major')}
                      </h3>
                      <p className="text-[10.5px] sm:text-[11px] font-bold text-[#5C707C] dark:text-[#9BB4C7] mt-0.5">
                        {publicT('public_opens_the_scholarship_page_directly')}
                      </p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#DDEFF2]/85 dark:bg-[#142B5F] border border-[#142B5F]/18 dark:border-[#34BFC9]/35 text-[#142B5F] dark:text-[#DDEFF2] flex items-center justify-center shrink-0 group-hover:bg-[#142B5F] group-hover:text-white transition-all">
                    <ArrowUpLeft className="h-3.25 w-3.25 shrink-0 stroke-[2.25]" />
                  </div>
                </div>
                {relationshipDemo.scholarships.length > 0 && (
                  <div className="space-y-2">
                    {relationshipDemo.scholarships.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenScholarship?.(item.id)}
                        className="group/item relative w-full text-start rounded-xl border border-[#142B5F]/10 dark:border-white/10 bg-white dark:bg-[#111E38] pl-3 pr-3.5 py-2.5 hover:border-[#0E7C86]/40 hover:shadow-xs transition-all flex items-center justify-between gap-2.5 overflow-hidden cursor-pointer"
                      >
                        <span aria-hidden="true" className={navyPetrolBarClass} />
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg border border-[#142B5F]/12 overflow-hidden shrink-0 bg-[#142B5F]/10">
                            <img
                              src={[
                                'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=100&auto=format&fit=crop&q=80',
                                'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100&auto=format&fit=crop&q=80',
                                'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=100&auto=format&fit=crop&q=80',
                              ][idx % 3]}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F1F5F9] line-clamp-1">
                              {item.name}
                            </div>
                            <div className="mt-0.5 text-[10px] sm:text-[10.5px] font-bold text-[#0E7C86] dark:text-[#34BFC9]">
                              {item.meta}
                            </div>
                          </div>
                        </div>
                        <div className="w-5.5 h-5.5 rounded-full bg-[#DDEFF2]/85 dark:bg-[#142B5F] border border-[#142B5F]/18 text-[#142B5F] dark:text-[#DDEFF2] flex items-center justify-center shrink-0 group-hover/item:bg-[#142B5F] group-hover/item:text-white transition-all">
                          <ArrowUpLeft className="h-3 w-3 shrink-0 stroke-[2.25]" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Courses Section */}
              <div
                className={`group relative rounded-xl ${innerBoxClass} pl-3 pr-4 py-3 md:p-3.5 overflow-hidden transition-all hover:bg-[#DDEFF2]/35 dark:hover:bg-[#132542] hover:border-[#0E7C86]/30 h-full flex flex-col`}
              >
                <span aria-hidden="true" className={navyPetrolBarClass} />
                <div
                  className={`${relationshipDemo.courses.length > 0 ? 'mb-3' : ''} flex items-center justify-between gap-2.5`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8.5 h-8.5 rounded-xl border border-[#142B5F]/15 overflow-hidden shrink-0 shadow-2xs bg-[#142B5F]/10">
                      <img
                        src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=80"
                        alt={publicT('public_courses_2')}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9]">
                        {publicT('public_courses_related_to_this_major')}
                      </h3>
                      <p className="text-[10.5px] sm:text-[11px] font-bold text-[#5C707C] dark:text-[#9BB4C7] mt-0.5">
                        {publicT('public_the_course_opens_its_details_more_opens_the')}
                      </p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#DDEFF2]/85 dark:bg-[#142B5F] border border-[#142B5F]/18 dark:border-[#34BFC9]/35 text-[#142B5F] dark:text-[#DDEFF2] flex items-center justify-center shrink-0 group-hover:bg-[#142B5F] group-hover:text-white transition-all">
                    <ArrowUpLeft className="h-3.25 w-3.25 shrink-0 stroke-[2.25]" />
                  </div>
                </div>
                {relationshipDemo.courses.length > 0 && (
                  <div className="space-y-2">
                    {relationshipDemo.courses.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenCourse?.(item.id)}
                        className="group/item relative w-full text-start rounded-xl border border-[#142B5F]/10 dark:border-white/10 bg-white dark:bg-[#111E38] pl-3 pr-3.5 py-2.5 hover:border-[#0E7C86]/40 hover:shadow-xs transition-all flex items-center justify-between gap-2.5 overflow-hidden cursor-pointer"
                      >
                        <span aria-hidden="true" className={navyPetrolBarClass} />
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg border border-[#142B5F]/12 overflow-hidden shrink-0 bg-[#142B5F]/10">
                            <img
                              src={[
                                'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=100&auto=format&fit=crop&q=80',
                                'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=100&auto=format&fit=crop&q=80',
                                'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=100&auto=format&fit=crop&q=80',
                              ][idx % 3]}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F1F5F9] truncate">
                              {item.name}
                            </div>
                            <div className="mt-0.5 text-[10px] sm:text-[10.5px] font-bold text-[#0E7C86] dark:text-[#34BFC9]">
                              {item.meta}
                            </div>
                          </div>
                        </div>
                        <div className="w-5.5 h-5.5 rounded-full bg-[#DDEFF2]/85 dark:bg-[#142B5F] border border-[#142B5F]/18 text-[#142B5F] dark:text-[#DDEFF2] flex items-center justify-center shrink-0 group-hover/item:bg-[#142B5F] group-hover/item:text-white transition-all">
                          <ArrowUpLeft className="h-3 w-3 shrink-0 stroke-[2.25]" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Academic Extension Section */}
              {relationshipDemo.academicPath.length > 0 && (
                <div
                  className={`group relative rounded-xl ${innerBoxClass} pl-3 pr-4 py-3 md:p-3.5 overflow-hidden transition-all hover:bg-[#DDEFF2]/35 dark:hover:bg-[#132542] hover:border-[#0E7C86]/30`}
                >
                  <span aria-hidden="true" className={navyPetrolBarClass} />
                  <div className="mb-3 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8.5 h-8.5 rounded-xl border border-[#142B5F]/15 overflow-hidden shrink-0 shadow-2xs bg-[#142B5F]/10">
                        <img
                          src="https://images.unsplash.com/photo-1532012197267-da84d127e765?w=150&auto=format&fit=crop&q=80"
                          alt={publicT('public_academic_progression')}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9]">
                          {publicT('public_academic_progression_for_this_major')}
                        </h3>
                        <p className="text-[10.5px] sm:text-[11px] font-bold text-[#5C707C] dark:text-[#9BB4C7] mt-0.5">
                          {publicT('public_related_advanced_or_specialist_paths')}
                        </p>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-[#DDEFF2]/85 dark:bg-[#142B5F] border border-[#142B5F]/18 text-[#142B5F] dark:text-[#DDEFF2] flex items-center justify-center shrink-0 group-hover:bg-[#142B5F] group-hover:text-white transition-all">
                      <ArrowUpLeft className="h-3.25 w-3.25 shrink-0 stroke-[2.25]" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {relationshipDemo.academicPath.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenMajor?.(item.id)}
                        className="group/item relative w-full text-start rounded-xl border border-[#142B5F]/10 dark:border-white/10 bg-white dark:bg-[#111E38] pl-3 pr-3.5 py-2.5 hover:border-[#0E7C86]/40 hover:shadow-xs transition-all flex items-center justify-between gap-2.5 overflow-hidden cursor-pointer"
                      >
                        <span aria-hidden="true" className={navyPetrolBarClass} />
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg border border-[#142B5F]/12 overflow-hidden shrink-0 bg-[#142B5F]/10">
                            <img
                              src={[
                                'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=100&auto=format&fit=crop&q=80',
                                'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=100&auto=format&fit=crop&q=80',
                              ][idx % 2]}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="inline-flex rounded-md bg-[#DDEFF2]/70 dark:bg-[#142B5F] px-2 py-0.5 text-[9.5px] font-bold text-[#142B5F] dark:text-[#DDEFF2] border border-[#142B5F]/12">
                              {item.degree}
                            </span>
                            <div className="mt-1 text-[10.5px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#F1F5F9] leading-snug">
                              {item.name}
                            </div>
                            <div className="mt-0.5 text-[10px] sm:text-[10.5px] font-bold text-[#0E7C86] dark:text-[#34BFC9] leading-relaxed">
                              {item.meta}
                            </div>
                          </div>
                        </div>
                        <div className="w-5.5 h-5.5 rounded-full bg-[#DDEFF2]/85 dark:bg-[#142B5F] border border-[#142B5F]/18 text-[#142B5F] dark:text-[#DDEFF2] flex items-center justify-center shrink-0 group-hover/item:bg-[#142B5F] group-hover/item:text-white transition-all">
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
          <MajorDetailFooterActions
            effectiveFavorite={effectiveFavorite}
            savedLabel={publicT('public_saved_3')}
            onSaveClick={handleSaveClick}
            onShareClick={handleShareClick}
          />
        </div>
      )}

      {/* Save / Share Notification Toast */}
      {saveToast && (
        <div className="fixed bottom-6 inset-x-4 max-w-xs mx-auto bg-[#142B5F] border border-[#F2CD78]/55 text-white px-4 py-2 rounded-full shadow-2xl z-50 flex items-center justify-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 mn-inverse font-['Cairo',sans-serif]">
          <Check className="w-3.5 h-3.5 text-[#F2CD78]" />
          <span>{saveToast}</span>
        </div>
      )}
    </div>
  );
};
