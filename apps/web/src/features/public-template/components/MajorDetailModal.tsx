import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { PublishedMajorSections } from './PublishedMajorSections';
import {
  ArrowLeft,
  X,
  BookOpen,
  Info,
  FileText,
  GraduationCap,
  Layers,
  Stethoscope,
  Activity,
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
  CheckCircle,
  HelpCircle,
  Clock,
  FlaskConical,
  Target,
  FileCheck,
  ShieldCheck,
  Building,
  Library,
  Scale,
  HeartPulse,
} from 'lucide-react';
import { Major } from '../types';
import { FellowshipDetailView } from './modal/FellowshipDetailView';
import { DoctorateAcademicBackgroundsSlider } from './modal/DoctorateAcademicBackgroundsSlider';
import { FavoriteButton } from './FavoriteButton';
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
  major, dataMode = 'api',
  relationshipGraph,
  relationshipGraphStatus = 'ready',
  onClose,
  onOpenUniversity,
  onOpenScholarship,
  onOpenCourse,
  onOpenCourseCollection,
  onOpenMajor,
  isFavorite = false,
  onToggleFavorite,
  searchAnchor,
  searchTerm,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  useDetailSearchTarget(searchAnchor, searchTerm);
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

  // Foundation subjects fallback
  const foundationList = major.foundationSubjects || [
    'الأحياء العامة والخلوية.',
    'الكيمياء العامة والعضوية.',
    'الكيمياء الحيوية.',
    'الفيزياء الطبية الأساسية.',
    'الإحصاء الحيوي.',
    'المصطلحات الطبية.',
    'مبادئ البحث الطبي والوبائيات.',
  ];

  // Core subjects fallback
  const coreList = major.coreSubjects || [
    'التشريح البشري.',
    'علم الأنسجة وعلم الأجنة.',
    'علم وظائف الأعضاء.',
    'الكيمياء الحيوية الطبية.',
    'علم الأمراض.',
    'الأحياء الدقيقة الطبية.',
    'علم المناعة.',
    'علم الأدوية.',
    'الطب الباطني.',
    'الجراحة.',
    'طب الأطفال.',
    'النساء والولادة.',
    'طب الأسرة والمجتمع.',
    'الطب النفسي.',
    'طب الطوارئ.',
    'الأخلاقيات والطب الشرعي بحسب المنهج.',
  ];

  // Practical training fallback
  const practicalList = major.practicalSide || [
    'مختبرات التشريح والأنسجة والعلوم الأساسية.',
    'التدريب على المهارات السريرية.',
    'المحاكاة الطبية.',
    'أخذ التاريخ المرضي.',
    'إجراء الفحص السريري.',
    'التدريب في المستشفيات والعيادات.',
    'مناقشة الحالات والتشخيص التفريقي.',
    'المناوبات أو التدريب السريري.',
    'مشروع بحث أو مشروع تخرج في بعض البرامج.',
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
  const relatedJobsList: Array<{ job: string; entry?: string; matchRate?: string; notes?: string }> = major.relatedJobs || [
    { job: 'طبيب امتياز / طبيب متدرب', matchRate: 'مباشرة', notes: 'بعد إكمال الدرجة وفق نظام الدولة' },
    { job: 'طبيب عام', matchRate: 'عالية جداً', notes: 'بعد استكمال الترخيص والمتطلبات المحلية' },
    { job: 'طبيب مقيم', matchRate: 'مباشرة', notes: 'بعد القبول في برنامج إقامة' },
    { job: 'باحث طبي / مساعد أبحاث سريرية', matchRate: 'مناسبة', notes: 'ممكن بعد الدرجة، مع تأهيل إضافي لبعض الوظائف' },
    { job: 'مسؤول طبي أو صحي', matchRate: 'متوسطة', notes: 'غالبًا يحتاج خبرة أو تأهيلًا إضافيًا' },
  ];

  // Postgraduate opportunities fallback
  const postgradList = major.postDoctoralOpportunities ||
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

  // Program degree tag label
  const getDegreeTag = () => {
    if (dataMode === 'api') return major.degreeLevelName || '';
    if (isFellowship) return 'برنامج تدريب سريري متقدم • زمالة';
    if (isDoctorate) return 'برنامج دراسات عليا • دكتوراه';
    if (isMaster) return 'برنامج دراسات عليا • ماجستير';
    return major.contentSections ? 'برنامج بكالوريوس' : 'برنامج بكالوريوس طبي';
  };

  return (
    <div className="w-full max-w-md mx-auto pt-0 pb-12 text-start font-['Cairo',sans-serif] animate-in fade-in duration-200 bg-[var(--ab-page)] min-h-screen relative ">
      {/* 1. TOP HERO CONTAINER */}
      <div className="relative w-full overflow-hidden">
        {/* Close & Favorite Buttons Side-by-Side on Top-Left */}
        <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-30 flex items-center gap-1.5">
          <DetailBackButton onBack={onClose} mode="close" />
          {onToggleFavorite && (
            <FavoriteButton
              active={isFavorite}
              onToggle={(event) => {
                event.stopPropagation();
                onToggleFavorite(major.id);
              }}
              className="bg-[var(--ab-surface)]/95 shadow-2xs"
            />
          )}
        </div>

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
            <path d="M 0,0 L 500,0 L 500,90 Q 250,112 0,90 Z" fill="url(#heroGreenGrad)" />
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

              <circle cx="35" cy="25" r="1.5" fill="var(--ab-accent)" />
              <circle cx="50" cy="18" r="1" fill="var(--ab-accent)" />
              <circle cx="42" cy="38" r="1.2" fill="var(--ab-accent)" />
              <circle cx="445" cy="22" r="1.5" fill="var(--ab-accent)" />
              <circle cx="460" cy="35" r="1" fill="var(--ab-accent)" />
              <circle cx="430" cy="42" r="1.2" fill="var(--ab-accent)" />
            </g>
            <path
              d="M 0,90 Q 250,112 500,90"
              fill="none"
              stroke="var(--ab-accent)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>

          <div
            className="absolute inset-0 flex items-center justify-between px-3.5 sm:px-5 pt-1 pb-4 z-10 -mt-2 sm:-mt-2.5"
            dir={publicDir}
          >
            {/* Right Side: Glowing Gold Graduation Badge + Arrow + Title & Tag */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-[var(--ab-accent)] flex items-center justify-center p-1.5 shadow-[0_0_12px_rgba(214,164,59,0.5)] bg-gradient-to-br from-[var(--ab-primary)] to-[var(--ab-primary)] shrink-0">
                {(dataMode === 'api' || major.contentSections) ? (
        <PublishedMajorSections sections={major.contentSections ?? []} level={major.degreeLevelName} />
      ) : isFellowship ? (
                  <HeartPulse className="w-6 h-6 text-[var(--ab-danger-text)] drop-shadow-[0_0_4px_rgba(214,164,59,0.7)]" />
                ) : isDoctorate || isMaster ? (
                  <Microscope className="w-6 h-6 text-[var(--ab-accent-soft)] drop-shadow-[0_0_4px_rgba(214,164,59,0.7)]" />
                ) : (
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
              <ArrowLeft className="w-3.5 h-3.5 text-[var(--ab-accent-text)] shrink-0 opacity-90 drop-shadow-[0_0_4px_rgba(214,164,59,0.4)]" />

              {/* Title (e.g. الطب والجراحة) and underneath: Degree Tag (e.g. برنامج بكالوريوس طبي) */}
              <div className="flex flex-col text-start min-w-0 flex-1 pr-1 pl-18 sm:pl-20">
                <h1 className="text-sm sm:text-base font-bold text-white leading-snug truncate drop-shadow-md">
                  {major.name}
                </h1>
                <p dir="ltr" className="text-[10px] text-white/85 text-start">{major.nameEn}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9.5px] sm:text-[10px] font-bold text-white px-1.5 py-0.5 rounded bg-white/15 backdrop-blur-xs border border-white/25">
                    {getDegreeTag()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* If Fellowship, render dedicated 17-section FellowshipDetailView */}
      {(dataMode === 'api' || major.contentSections) ? (
        <PublishedMajorSections sections={major.contentSections ?? []} level={major.degreeLevelName} />
      ) : isFellowship ? (
        <FellowshipDetailView major={major} onOpenMajor={onOpenMajor} />
      ) : (
        /* MAIN CONTENT WRAPPER (Bordered full-width cards touching side edges) */
        <div className="px-0 space-y-2.5 z-20 relative -mt-2.5 sm:-mt-3" dir={publicDir}>
          {/* 1. BASIC MAJOR INFORMATION CARD */}
          <div className="relative w-full bg-[var(--ab-surface)] rounded-none border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
            {/* Top Green Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent z-10" />

            <DetailSectionHeader
              id="major-requirements"
              icon={BookOpen}
              className="px-3.5 pt-3.5 pb-2.5"
              title={`1. ${isDoctorate ? publicT('public_basic_doctoral_specialization_information') : isMaster ? publicT('public_basic_masters_specialization_information') : publicT('public_basic_major_information')}`}
            />

            {/* Table Header Row */}
            <div className="grid grid-cols-12 bg-[var(--ab-surface-muted)] border-y border-[var(--ab-border)] py-2.5 px-3.5 sm:px-4 items-center">
              <div className="col-span-4 text-[12px] font-bold text-[var(--ab-heading)] text-start">{publicT('public_item')}</div>
              <div className="col-span-8 text-[12px] font-bold text-[var(--ab-heading)] text-start">{publicT('public_details_2')}</div>
            </div>

            {/* Table Body Rows */}
            <div className="divide-y divide-[var(--ab-border)] bg-[var(--ab-surface)] ">
              {/* Reference Code */}
              {major.code && (
                <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-center hover:bg-[var(--ab-surface-muted)]/50 transition-colors">
                  <div className="col-span-4 text-[12px] font-bold text-[var(--ab-heading)]">{publicT('public_reference_code')}</div>
                  <div className="col-span-8 text-[11px] font-bold text-[var(--ab-text)] font-mono tracking-wider">
                    {major.code}
                  </div>
                </div>
              )}

              {/* Arabic Name */}
              <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-center hover:bg-[var(--ab-surface-muted)]/50 transition-colors">
                <div className="col-span-4 text-[12px] font-bold text-[var(--ab-heading)]">{publicT('public_arabic_name')}</div>
                <div className="col-span-8 text-[11px] font-bold text-[var(--ab-heading)]">{major.name}</div>
              </div>

              {/* Name in English */}
              <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-center bg-[var(--ab-page)] hover:bg-[var(--ab-surface-muted)]/50 transition-colors">
                <div className="col-span-4 text-[12px] font-bold text-[var(--ab-heading)]">{publicT('public_english_name')}</div>
                <div className="col-span-8 text-[11px] font-bold text-[var(--ab-accent-text)] font-['Cairo',sans-serif] tracking-wide">
                  {major.nameEn}
                </div>
              </div>

              {/* Associated Major */}
              {major.associatedMajor && (
                <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-start hover:bg-[var(--ab-surface-muted)]/50 transition-colors">
                  <div className="col-span-4 text-[12px] font-bold text-[var(--ab-heading)] pt-0.5">
                    {isDoctorate ? publicT('public_related_primary_major') : publicT('public_related_major')}
                  </div>
                  <div className="col-span-8 text-[11px] font-bold text-[var(--ab-heading)] leading-relaxed">
                    {major.associatedMajor}
                  </div>
                </div>
              )}

              {/* Master Majoring Links for PhD */}
              {isDoctorate && (
                <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-start hover:bg-[var(--ab-surface-muted)]/50 transition-colors">
                  <div className="col-span-4 text-[12px] font-bold text-[var(--ab-heading)] pt-0.5">{publicT('public_related_masters_specializations')}</div>
                  <div className="col-span-8 text-[11px] font-bold text-[var(--ab-heading)] leading-relaxed">{publicT('public_mas_0001_medical_sciences_with_potential_links_to')}</div>
                </div>
              )}

              {/* College / Academic Field */}
              <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-center hover:bg-[var(--ab-surface-muted)]/50 transition-colors">
                <div className="col-span-4 text-[12px] font-bold text-[var(--ab-heading)]">{publicT('public_academic_domain')}</div>
                <div className="col-span-8 text-[11px] font-bold text-[var(--ab-heading)]">
                  {major.academicField || major.category}
                </div>
              </div>

              {/* Degree Level */}
              <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-center hover:bg-[var(--ab-surface-muted)]/50 transition-colors">
                <div className="col-span-4 text-[12px] font-bold text-[var(--ab-heading)]">{publicT('public_degree_level')}</div>
                <div className="col-span-8 text-[11px] font-bold text-[var(--ab-heading)]">
                  {major.degreeLevelName || major.degreeLevels?.join('، ')}
                </div>
              </div>

              {/* Program Type / Doctorate Type */}
              {major.programTypes && (
                <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-start hover:bg-[var(--ab-surface-muted)]/50 transition-colors">
                  <div className="col-span-4 text-[12px] font-bold text-[var(--ab-heading)] pt-0.5">
                    {isDoctorate ? publicT('public_doctorate_type') : publicT('public_program_type')}
                  </div>
                  <div className="col-span-8 text-[11px] font-bold text-[var(--ab-heading)] leading-relaxed">
                    {major.programTypes}
                  </div>
                </div>
              )}

              {/* Common Degrees */}
              {(major.commonDegrees || (major.degreeLevels && major.degreeLevels.length > 0)) && (
                <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-start hover:bg-[var(--ab-surface-muted)]/50 transition-colors">
                  <div className="col-span-4 text-[12px] font-bold text-[var(--ab-heading)] pt-0.5">{publicT('public_common_degree_names')}</div>
                  <div className="col-span-8 text-[11px] font-bold text-[var(--ab-heading)] leading-relaxed">
                    {major.commonDegrees || major.degreeLevels?.join('، ')}
                  </div>
                </div>
              )}

              {/* Common Duration */}
              {major.duration && (
                <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-start hover:bg-[var(--ab-surface-muted)]/50 transition-colors">
                  <div className="col-span-4 text-[12px] font-bold text-[var(--ab-heading)] pt-0.5">{publicT('public_typical_duration')}</div>
                  <div className="col-span-8 text-[11px] font-bold text-[var(--ab-heading)] leading-relaxed">
                    {major.duration}
                  </div>
                </div>
              )}

              {/* Study Modes / Common Entry Path */}
              {major.studyModes && (
                <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-start hover:bg-[var(--ab-surface-muted)]/50 transition-colors">
                  <div className="col-span-4 text-[12px] font-bold text-[var(--ab-heading)] pt-0.5">
                    {isDoctorate ? publicT('public_common_entry_path') : publicT('public_study_arrangements_2')}
                  </div>
                  <div className="col-span-8 text-[11px] font-bold text-[var(--ab-heading)] leading-relaxed">
                    {major.studyModes}
                  </div>
                </div>
              )}

              {/* Availability Nature */}
              {major.availabilityNature && (
                <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-start hover:bg-[var(--ab-surface-muted)]/50 transition-colors">
                  <div className="col-span-4 text-[12px] font-bold text-[var(--ab-heading)] pt-0.5">{publicT('public_availability_2')}</div>
                  <div className="col-span-8 text-[11px] font-bold text-[var(--ab-heading)] leading-relaxed">
                    {major.availabilityNature}
                  </div>
                </div>
              )}

              {/* Short Description */}
              {major.description && (
                <div className="grid grid-cols-12 py-2.5 px-3.5 sm:px-4 items-start bg-[var(--ab-page)] hover:bg-[var(--ab-surface-muted)]/50 transition-colors">
                  <div className="col-span-4 text-[12px] font-bold text-[var(--ab-heading)] pt-0.5">{publicT('public_brief_description')}</div>
                  <div className="col-span-8 text-[11px] font-bold text-[var(--ab-text)] leading-relaxed">
                    {major.description}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. NATURE AND OBJECTIVE OF DOCTORATE / OVERVIEW */}
          <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
            {/* Top Green Accent Line */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

            <DetailSectionHeader
              id="major-about"
              icon={FileText}
              className="mb-3"
              title={`2. ${isDoctorate ? publicT('public_doctorate_nature_and_purpose') : isMaster ? publicT('public_masters_specialization_overview') : publicT('public_major_overview')}`}
            />

            {/* Section Content */}
            <div className="space-y-2.5">
              {/* Main Overview Paragraph */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--ab-page)] border border-[var(--ab-border)] text-start space-y-2 ">
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-text)] leading-[2] text-justify">
                  {isDoctorate
                    ? publicT('public_a_medical_sciences_doctorate_trains_researchers_to_produce')
                    : major.aboutMajor ||
                      publicT('public_an_advanced_academic_program_providing_comprehensive_scientific_knowledge')}
                </p>
                {isDoctorate && (
                  <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-text)] leading-[2] text-justify pt-1 border-t border-[var(--ab-border)]">{publicT('public_at_doctoral_level_students_lead_independent_research_address')}</p>
                )}
              </div>

              {/* Note / Highlight Box */}
              {major.aboutMajorNote && !isDoctorate && (
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[var(--ab-surface-muted)] border border-[var(--ab-border)] relative overflow-hidden ab-panel">
                  <div className="w-6 h-6 rounded-full bg-[var(--ab-primary)]/8 border border-[var(--ab-border)] flex items-center justify-center shrink-0 mt-0.5">
                    <Info className="w-3.5 h-3.5 text-[var(--ab-accent-text)]" />
                  </div>
                  <div className="flex-1 min-w-0 pr-1 text-start">
                    <span className="block text-[11px] font-bold text-[var(--ab-heading)] mb-0.5">{publicT('public_important_clarification')}</span>
                    <p className="text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-text-muted)] leading-[1.85]">
                      {major.aboutMajorNote}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. COMMON TYPES OF DOCTORATE (For PhD) */}
          {isDoctorate && major.doctorateTypes && (
            <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

              <DetailSectionHeader id="major-doctorate-types" icon={Layers} className="mb-3" title={publicT('public_3_common_types_of_doctorate')} />

              <div className="ab-detail-small-grid pt-0.5 text-start">
                {major.doctorateTypes.map((typeItem, tIdx) => (
                  <div
                    key={tIdx}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--ab-page)] border border-[var(--ab-border)] hover:bg-[var(--ab-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start "
                  >
                    <div className="w-5 h-5 rounded-lg bg-[var(--ab-primary)]/10 text-[var(--ab-primary)] dark:bg-[var(--ab-accent)]/15 dark:text-[var(--ab-accent)] flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px] group-hover:bg-[var(--ab-primary)] group-hover:text-white dark:group-hover:bg-[var(--ab-accent)] dark:group-hover:text-[var(--ab-primary)] transition-colors">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] leading-snug group-hover:text-[var(--ab-heading)] transition-colors">
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
            <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

              <DetailSectionHeader id="major-target-backgrounds" icon={Users} className="mb-3" title={publicT('public_3_target_academic_backgrounds_for_admission')} />

              <div className="space-y-3 text-start">
                <div className="p-3 rounded-2xl bg-[var(--ab-page)] border border-[var(--ab-border)] text-start ">
                  <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-text)] leading-[1.9]">{publicT('public_this_masters_program_is_intended_for_qualified_graduates')}</p>
                </div>

                <div className="ab-detail-small-grid pt-0.5">
                  {major.targetBackgrounds.map((bg, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--ab-page)] border border-[var(--ab-border)] hover:bg-[var(--ab-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start "
                    >
                      <div className="w-5 h-5 rounded-lg bg-[var(--ab-primary)]/10 text-[var(--ab-primary)] dark:bg-[var(--ab-accent)]/15 dark:text-[var(--ab-accent)] flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px] group-hover:bg-[var(--ab-primary)] group-hover:text-white dark:group-hover:bg-[var(--ab-accent)] dark:group-hover:text-[var(--ab-primary)] transition-colors">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                      <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] leading-snug group-hover:text-[var(--ab-heading)] transition-colors">
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
            <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

              <DetailSectionHeader id="major-program-stages" icon={ListChecks} className="mb-3" title={publicT('public_5_doctoral_program_stages')} />

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5 text-start">
                {major.programStages.map((stage, sIdx) => {
                  const cleanText = stage.replace(/^\d+\.\s*/, '');
                  return (
                    <div
                      key={sIdx}
                      className="flex flex-row items-start gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-lg bg-[var(--ab-page)] border border-[var(--ab-border)] hover:bg-[var(--ab-surface-muted)] transition-all duration-200 group text-start h-full "
                    >
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--ab-primary)] dark:bg-[var(--ab-accent)] group-hover:bg-[var(--ab-accent)] dark:group-hover:bg-[var(--ab-primary)] shrink-0 mt-1.5 shadow-sm transition-colors" />
                      <span className="text-[10px] sm:text-[11px] font-bold text-[var(--ab-heading)] leading-snug group-hover:text-[var(--ab-heading)] transition-colors flex-1">
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
            <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

              <DetailSectionHeader id="major-study" icon={GraduationCap} className="mb-3" title={publicT('public_6_advanced_knowledge_and_coursework')} />

              <div className="space-y-4 text-start">
                {/* Block 1: المعرفة النظرية المتقدمة */}
                {major.advancedTheory && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-[var(--ab-heading)]" />
                      <h3 className="text-[11.5px] font-bold text-[var(--ab-heading)]">{publicT('public_advanced_theoretical_knowledge')}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {major.advancedTheory.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--ab-page)] border border-[var(--ab-border)] hover:bg-[var(--ab-surface-muted)] transition-colors "
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--ab-primary)] dark:bg-[var(--ab-accent)] shrink-0 mt-1.5 " />
                          <span className="text-[10.5px] font-bold text-[var(--ab-heading)] leading-relaxed">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Block 2: مناهج البحث والتحليل */}
                {major.researchMethodologies && (
                  <div className="space-y-2 pt-2 border-t border-[var(--ab-border)]">
                    <div className="flex items-center gap-1.5">
                      <FlaskConical className="w-4 h-4 text-[var(--ab-accent-text)]" />
                      <h3 className="text-[11.5px] font-bold text-[var(--ab-heading)]">{publicT('public_research_and_analytical_methods')}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {major.researchMethodologies.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--ab-page)] border border-[var(--ab-border)] hover:bg-[var(--ab-surface-muted)] transition-colors "
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--ab-accent)] shrink-0 mt-1.5 " />
                          <span className="text-[10.5px] font-bold text-[var(--ab-heading)] leading-relaxed">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Block 3: الأخلاقيات والنزاهة العلمية */}
                {major.ethicsAndIntegrity && (
                  <div className="space-y-2 pt-2 border-t border-[var(--ab-border)]">
                    <div className="flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-[var(--ab-heading)]" />
                      <h3 className="text-[11.5px] font-bold text-[var(--ab-heading)]">{publicT('public_ethics_and_academic_integrity')}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {major.ethicsAndIntegrity.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--ab-page)] border border-[var(--ab-border)] hover:bg-[var(--ab-surface-muted)] transition-colors"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[var(--ab-primary)] dark:text-[var(--ab-accent)] shrink-0 mt-0.5" />
                          <span className="text-[10.5px] font-bold text-[var(--ab-heading)] leading-relaxed">
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
          <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

            <DetailSectionHeader id="major-tracks" icon={Compass} className="mb-3" title={isDoctorate
                    ? publicT('public_7_research_areas_and_subspecialties')
                    : isMaster
                      ? publicT('public_4_common_paths_and_subspecialties')
                      : publicT('public_3_paths_and_subspecialties')} />

            <div className="space-y-3 text-start">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5">
                {tracksList.map((track, index) => (
                  <div
                    key={index}
                    className="flex items-center p-2.5 rounded-xl bg-[var(--ab-page)] border border-[var(--ab-border)] hover:bg-[var(--ab-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start overflow-hidden relative min-h-[44px] "
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-[var(--ab-primary)]/80 dark:bg-[var(--ab-accent)]/80 group-hover:bg-[var(--ab-primary)] dark:group-hover:bg-[var(--ab-accent)] transition-colors" />
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] leading-snug group-hover:text-[var(--ab-heading)] transition-colors pr-2">
                      {track}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 8. QUALIFYING OR COMPREHENSIVE EXAM (For PhD) */}
          {isDoctorate && major.qualifyingExamInfo && (
            <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

              <DetailSectionHeader id="major-qualifying-exam" icon={Award} className="mb-3" title={publicT('public_8_qualifying_or_comprehensive_exam_where_applicable')} />

              <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--ab-page)] border border-[var(--ab-border)] text-start ">
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-text)] leading-[2] text-justify">
                  {major.qualifyingExamInfo}
                </p>
              </div>
            </div>
          )}

          {/* 9. RESEARCH PROPOSAL & CANDIDACY (For PhD) */}
          {isDoctorate && major.researchProposalInfo && (
            <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

              <DetailSectionHeader id="major-research-proposal" icon={Target} className="mb-3" title={publicT('public_9_research_proposal_and_candidacy')} />

              <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--ab-page)] border border-[var(--ab-border)] text-start ">
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-text)] leading-[2] text-justify">
                  {major.researchProposalInfo}
                </p>
              </div>
            </div>
          )}

          {/* 10. THESIS & ORIGINAL CONTRIBUTION (For PhD) */}
          {isDoctorate && major.originalContributionInfo && (
            <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

              <DetailSectionHeader id="major-original-contribution" icon={Sparkles} className="mb-3" title={publicT('public_10_dissertation_and_original_contribution')} />

              <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--ab-page)] border border-[var(--ab-border)] text-start ">
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-text)] leading-[2] text-justify">
                  {major.originalContributionInfo}
                </p>
              </div>
            </div>
          )}

          {/* 11. SUPERVISION & RESEARCH ENVIRONMENT (For PhD) */}
          {isDoctorate && major.supervisionEnvironment && (
            <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

              <DetailSectionHeader id="major-supervision" icon={Building} className="mb-3" title={publicT('public_11_supervision_and_research_environment')} />

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5 text-start">
                {major.supervisionEnvironment.map((item, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex flex-col justify-center p-2.5 sm:p-3 rounded-lg bg-[var(--ab-page)] border border-[var(--ab-border)] hover:bg-[var(--ab-surface-muted)] transition-all duration-300 group text-start h-full relative overflow-hidden"
                  >
                    <div className="relative z-10 flex items-start gap-2">
                      <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--ab-primary)] dark:text-[var(--ab-accent)] opacity-70 group-hover:text-[var(--ab-accent-text)] shrink-0 mt-0.5 transition-colors" />
                      <span className="text-[10px] sm:text-[11px] font-bold text-[var(--ab-heading)] leading-snug group-hover:text-[var(--ab-heading)] transition-colors">
                        {item}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 12. RESEARCH, PUBLISHING & TEACHING REQUIREMENTS (For PhD) */}
          {isDoctorate && major.researchPublishingTeaching && (
            <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

              <DetailSectionHeader id="major-research-publishing" icon={Library} className="mb-3" title={publicT('public_12_research_publication_and_teaching_requirements')} />

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5 text-start">
                {major.researchPublishingTeaching.map((item, pIdx) => (
                  <div
                    key={pIdx}
                    className="flex items-start gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-lg bg-[var(--ab-page)] border border-[var(--ab-border)] hover:bg-[var(--ab-surface-muted)] transition-all duration-300 group text-start h-full "
                  >
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-sm bg-[var(--ab-accent)] group-hover:bg-[var(--ab-primary)] dark:bg-[var(--ab-accent)] shrink-0 mt-1.5 shadow-sm transition-colors rotate-45" />
                    <span className="text-[10px] sm:text-[11px] font-bold text-[var(--ab-heading)] leading-snug group-hover:text-[var(--ab-heading)] transition-colors flex-1">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 13. ADVANCED RESEARCH & PROFESSIONAL SKILLS */}
          <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

            <DetailSectionHeader
              id="major-skills"
              icon={Award}
              className="mb-3"
              title={isDoctorate ? publicT('public_13_advanced_research_and_professional_skills') : isMaster ? publicT('public_5_specialist_skills_gained') : publicT('public_4_specialist_skills_students_acquire')}
            />

            <div className="space-y-2.5 text-start">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5">
                {skillsList.map((skill, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--ab-page)] border border-[var(--ab-border)] hover:bg-[var(--ab-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start "
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--ab-primary)] dark:bg-[var(--ab-accent)] group-hover:bg-[var(--ab-accent)] dark:group-hover:bg-[var(--ab-primary)] transition-all shrink-0 mt-1.5 shadow-2xs" />
                    <span className="text-[10.5px] font-bold text-[var(--ab-heading)] leading-snug group-hover:text-[var(--ab-heading)] transition-colors">
                      {skill}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 14. FIELDS OF WORK AFTER GRADUATION */}
          <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

            <DetailSectionHeader
              id="major-careers"
              icon={Briefcase}
              className="mb-4"
              title={isDoctorate ? publicT('public_14_careers_after_a_doctorate') : isMaster ? publicT('public_6_careers_and_opportunities_after_graduation') : publicT('public_5_careers_after_graduation')}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-start pt-0.5">
              {workFieldsList.map((job, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--ab-page)] border border-[var(--ab-border)] hover:bg-[var(--ab-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start "
                >
                  <div className="w-2 h-[2.5px] bg-[var(--ab-primary)]/80 dark:bg-[var(--ab-accent)]/80 group-hover:bg-[var(--ab-primary)] dark:group-hover:bg-[var(--ab-accent)] group-hover:w-3.5 transition-all duration-300 shrink-0 mt-1.5 rounded-full" />
                  <span className="text-[10.5px] font-bold text-[var(--ab-heading)] leading-snug group-hover:text-[var(--ab-heading)] transition-colors">
                    {job}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 15. RELATED CAREERS / JOBS TABLE */}
          <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

            <DetailSectionHeader id="major-related-jobs" icon={UserCheck} className="mb-4" title={isDoctorate
                    ? publicT('public_15_key_related_jobs')
                    : isMaster
                      ? publicT('public_7_key_jobs_related_to_the_degree')
                      : publicT('public_6_key_related_jobs')} />

            <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-[var(--ab-border)] shadow-2xs bg-[var(--ab-surface)] ">
              <table className="w-full text-start border-collapse min-w-[480px]">
                <thead>
                  <tr className="bg-[var(--ab-surface-muted)] border-b border-[var(--ab-border)]">
                    <th className="py-3 px-3.5 text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-heading)] w-[30%] whitespace-nowrap">{publicT('public_job')}</th>
                    <th className="py-3 px-3.5 text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-heading)] w-[25%] whitespace-nowrap">{publicT('public_degree_suitability')}</th>
                    <th className="py-3 px-3.5 text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-heading)] w-[45%]">{publicT('public_note')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ab-border)]">
                  {relatedJobsList.map((row, index) => {
                    const matchText = row.matchRate || (row.entry && row.entry.length <= 15 ? row.entry : 'مناسبة');
                    const notesText = row.notes || (row.entry && row.entry !== matchText ? row.entry : 'ـ');

                    return (
                      <tr key={index} className="hover:bg-[var(--ab-surface-muted)]/50 transition-colors group">
                        <td className="py-2.5 px-3.5 text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] border-l border-[var(--ab-border)] align-middle">
                          {row.job}
                        </td>
                        <td className="py-2.5 px-3.5 text-[10.5px] sm:text-[11px] font-semibold text-[var(--ab-heading)] border-l border-[var(--ab-border)] align-middle">
                          {matchText}
                        </td>
                        <td className="py-2.5 px-3.5 text-[10.5px] sm:text-[11px] font-normal text-[var(--ab-text)] leading-relaxed align-middle">
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
          <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

            <DetailSectionHeader
              id="major-postgraduate"
              icon={GraduationCap}
              className="mb-4"
              title={isDoctorate ? publicT('public_16_postdoctoral_and_subsequent_paths') : isMaster ? publicT('public_8_opportunities_after_a_masters_and_future_paths') : publicT('public_7_postgraduate_opportunities')}
            />

            <div className="space-y-3 text-start">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {postgradList.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--ab-page)] border border-[var(--ab-border)] hover:bg-[var(--ab-surface-muted)] hover:shadow-2xs transition-all duration-200 group text-start "
                  >
                    <div className="w-1.5 h-1.5 bg-[var(--ab-primary)]/80 dark:bg-[var(--ab-accent)]/80 rounded-sm shrink-0 group-hover:scale-110 group-hover:bg-[var(--ab-primary)] dark:group-hover:bg-[var(--ab-accent)] transition-all rotate-45 mt-1.5" />
                    <span className="text-[10.5px] font-bold text-[var(--ab-heading)] leading-snug group-hover:text-[var(--ab-heading)] transition-colors">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 17. SIMILAR MAJORS & DIFFERENCES */}
          <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

            <DetailSectionHeader
              id="major-similar"
              icon={GitCompare}
              className="mb-4"
              title={
                isDoctorate
                  ? publicT('public_17_similar_doctorates_and_differences')
                  : isMaster
                    ? publicT('public_9_similar_majors_and_their_differences')
                    : publicT('public_8_similar_majors')
              }
            />

            <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-[var(--ab-border)] shadow-2xs bg-[var(--ab-surface)] ">
              <table className="w-full text-start border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-[var(--ab-surface-muted)] border-b border-[var(--ab-border)]">
                    <th className="py-3 px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-heading)] w-[35%] whitespace-nowrap">
                      {isDoctorate ? publicT('public_similar_major_or_degree') : publicT('public_major_2')}
                    </th>
                    <th className="py-3 px-4 text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-heading)] w-[65%]">
                      {isDoctorate ? publicT('public_brief_distinction') : publicT('public_key_difference')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ab-border)]">
                  {similarMajorsList.map((row, index) => (
                    <tr key={index} className="hover:bg-[var(--ab-surface-muted)]/50 transition-colors group">
                      <td className="py-2.5 px-4 text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] border-l border-[var(--ab-border)] align-middle group-hover:text-[var(--ab-heading)] transition-colors">
                        {relationshipDemo.similarMajorLinks[row.name] ? (
                          <button
                            type="button"
                            onClick={() => onOpenMajor?.(relationshipDemo.similarMajorLinks[row.name])}
                            className="inline-flex items-center gap-1.5 font-bold text-[var(--ab-heading)] hover:text-[var(--ab-primary)] transition-colors"
                          >
                            {row.name}
                            <ArrowLeft className="w-3 h-3 text-[var(--ab-accent)]" />
                          </button>
                        ) : (
                          row.name
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] leading-relaxed align-middle">
                        {row.difference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 18. ACADEMIC & PROFESSIONAL ALERT */}
          <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-section-line)] to-transparent" />

            <DetailSectionHeader
              id="major-alert"
              icon={ShieldAlert}
              className="mb-3.5"
              title={
                isDoctorate
                  ? publicT('public_18_academic_and_professional_notice')
                  : isMaster
                    ? publicT('public_10_essential_academic_and_professional_notice')
                    : publicT('public_9_academic_and_professional_notice')
              }
            />

            <div className="space-y-2 text-start">
              {isDoctorate ? (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--ab-page)] border border-[var(--ab-border)] text-start relative overflow-hidden">
                  <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-heading)] leading-[1.9]">{publicT('public_a_doctorate_is_a_research_degree_and_does')}</p>
                </div>
              ) : (
                alertPoints.map((point, pIdx) => (
                  <div
                    key={pIdx}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--ab-page)] border border-[var(--ab-border)] hover:bg-[var(--ab-surface-muted)] transition-colors"
                  >
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px] ${
                        pIdx === 0
                          ? 'bg-[var(--ab-primary)]/10 text-[var(--ab-primary)] dark:bg-[var(--ab-accent)]/15 dark:text-[var(--ab-accent)]'
                          : 'bg-[var(--ab-surface-muted)] text-[var(--ab-heading)] border border-[var(--ab-border)]'
                      }`}
                    >
                      {point.num || pIdx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-bold text-[var(--ab-heading)] mb-0.5">
                        {point.title}
                      </h4>
                      <p className="text-[10.5px] sm:text-[11px] font-medium text-[var(--ab-text)] leading-relaxed">
                        {point.desc}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 19. RELATIONSHIP HUB & OPPORTUNITIES (LAST SECTION) */}
          <div className="relative w-full bg-[var(--ab-surface)] rounded-none p-3.5 sm:p-4 border-y border-[var(--ab-border-brand)] shadow-md shadow-[var(--ab-shadow-ink)]/60 overflow-hidden ">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--ab-accent)] to-transparent" />

            <DetailSectionHeader
              id="major-related-opportunities"
              icon={Compass}
              className="mb-4"
              title={
                isDoctorate
                  ? publicT('public_19_explore_opportunities_for_this_major')
                  : isMaster
                    ? publicT('public_11_explore_opportunities_for_this_major')
                    : publicT('public_10_explore_opportunities_for_this_major')
              }
              subtitle={publicT('public_published_relationships_connecting_this_major_to_relevant_universities')}
            />

            {relationshipGraphStatus === 'loading' && (
              <div className="mb-3 rounded-xl border border-[var(--ab-border)] bg-[var(--ab-page)] px-3 py-2 text-center text-[10px] font-bold text-[var(--ab-text-muted)]">{publicT('public_loading_published_relationships')}</div>
            )}
            {relationshipGraphStatus === 'unavailable' && (
              <div className="mb-3 rounded-xl border border-[var(--ab-danger-border)] bg-[var(--ab-danger-soft)] px-3 py-2 text-center text-[10px] font-bold text-[var(--ab-danger-text)]">{publicT('public_could_not_load_the_live_relationship_graph_no')}</div>
            )}
            <div className="grid grid-cols-1 gap-3">
              {/* Universities Section */}
              <div className="rounded-2xl border border-[var(--ab-border-brand)] bg-gradient-to-l from-[var(--ab-primary)]/5 to-[var(--ab-surface)] p-3 shadow-2xs">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--ab-accent)] overflow-hidden shrink-0 shadow-xs bg-[var(--ab-primary)]">
                      <img
                        src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=150&auto=format&fit=crop&q=80"
                        alt={publicT('public_universities')}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-heading)]">{publicT('public_universities_and_programs_offering_this_major')}</h3>
                      <p className="text-[9px] font-bold text-[var(--ab-text-muted)] mt-0.5">{publicT('public_related_published_university_programs')}</p>
                    </div>
                  </div>
                </div>
                <div className="ab-detail-small-grid">
                  {relationshipDemo.universities.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenUniversity?.(item.id)}
                      className="group w-full text-start rounded-xl border border-[var(--ab-border)] bg-[var(--ab-surface)] px-3 py-2.5 shadow-2xs hover:border-[var(--ab-accent)]/60 hover:shadow-sm transition-all flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-full border border-[var(--ab-accent)]/50 overflow-hidden shrink-0 bg-[var(--ab-primary)]/10 shadow-2xs">
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
                          <div className="text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] truncate">{item.name}</div>
                          <div className="mt-0.5 text-[9px] font-bold text-[var(--ab-text-muted)]">{item.meta}</div>
                        </div>
                      </div>
                      {/* Glowing Yellow Navigation Arrow */}
                      <div className="w-7 h-7 rounded-full bg-[var(--ab-accent)]/15 border border-[var(--ab-accent)]/40 flex items-center justify-center shrink-0 group-hover:bg-[var(--ab-accent)] transition-all shadow-[0_0_8px_rgba(214,164,59,0.35)]">
                        <ArrowLeft className="w-3.5 h-3.5 text-[var(--ab-accent-soft)] group-hover:text-black drop-shadow-[0_0_5px_rgba(214,164,59,0.8)] group-hover:-translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scholarships Section */}
              <div className="rounded-2xl border border-[var(--ab-border-brand)] bg-gradient-to-l from-[var(--ab-accent)]/5 to-[var(--ab-surface)] p-3 shadow-2xs">
                <div className="mb-2.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full border-2 border-[var(--ab-accent)] overflow-hidden shrink-0 shadow-xs bg-[var(--ab-accent)]/10">
                    <img
                      src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=150&auto=format&fit=crop&q=80"
                      alt={publicT('public_scholarships_4')}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-heading)]">{publicT('public_scholarships_available_for_this_major')}</h3>
                    <p className="text-[9px] font-bold text-[var(--ab-text-muted)] mt-0.5">{publicT('public_opens_the_scholarship_page_directly')}</p>
                  </div>
                </div>
                <div className="ab-detail-small-grid">
                  {relationshipDemo.scholarships.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenScholarship?.(item.id)}
                      className="group w-full text-start rounded-xl border border-[var(--ab-border)] bg-[var(--ab-surface)] px-3 py-2.5 shadow-2xs hover:border-[var(--ab-accent)]/60 hover:shadow-sm transition-all flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-full border border-[var(--ab-accent)]/50 overflow-hidden shrink-0 bg-[var(--ab-accent)]/10 shadow-2xs">
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
                          <div className="text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] line-clamp-1">{item.name}</div>
                          <div className="mt-0.5 text-[9px] font-bold text-[var(--ab-text-muted)]">{item.meta}</div>
                        </div>
                      </div>
                      {/* Glowing Yellow Navigation Arrow */}
                      <div className="w-7 h-7 rounded-full bg-[var(--ab-accent)]/15 border border-[var(--ab-accent)]/40 flex items-center justify-center shrink-0 group-hover:bg-[var(--ab-accent)] transition-all shadow-[0_0_8px_rgba(214,164,59,0.35)]">
                        <ArrowLeft className="w-3.5 h-3.5 text-[var(--ab-accent-soft)] group-hover:text-black drop-shadow-[0_0_5px_rgba(214,164,59,0.8)] group-hover:-translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Courses Section */}
              <div className="rounded-2xl border border-[var(--ab-border-brand)] bg-gradient-to-l from-[var(--ab-primary)]/5 to-[var(--ab-surface)] p-3 shadow-2xs">
                <div className="mb-2.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full border-2 border-[var(--ab-accent)] overflow-hidden shrink-0 shadow-xs bg-[var(--ab-primary)]/10">
                    <img
                      src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=80"
                      alt={publicT('public_courses_2')}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-heading)]">{publicT('public_courses_related_to_this_major')}</h3>
                    <p className="text-[9px] font-bold text-[var(--ab-text-muted)] mt-0.5">{publicT('public_the_course_opens_its_details_more_opens_the')}</p>
                  </div>
                </div>
                <div className="ab-detail-small-grid">
                  {relationshipDemo.courses.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenCourse?.(item.id)}
                      className="group w-full text-start rounded-xl border border-[var(--ab-border)] bg-[var(--ab-surface)] px-3 py-2.5 shadow-2xs hover:border-[var(--ab-accent)]/60 hover:shadow-sm transition-all flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-full border border-[var(--ab-accent)]/50 overflow-hidden shrink-0 bg-[var(--ab-primary)]/10 shadow-2xs">
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
                          <div className="text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] truncate">{item.name}</div>
                          <div className="mt-0.5 text-[9px] font-bold text-[var(--ab-text-muted)]">{item.meta}</div>
                        </div>
                      </div>
                      {/* Glowing Yellow Navigation Arrow */}
                      <div className="w-7 h-7 rounded-full bg-[var(--ab-accent)]/15 border border-[var(--ab-accent)]/40 flex items-center justify-center shrink-0 group-hover:bg-[var(--ab-accent)] transition-all shadow-[0_0_8px_rgba(214,164,59,0.35)]">
                        <ArrowLeft className="w-3.5 h-3.5 text-[var(--ab-accent-soft)] group-hover:text-black drop-shadow-[0_0_5px_rgba(214,164,59,0.8)] group-hover:-translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Academic Extension Section */}
              {relationshipDemo.academicPath.length > 0 && (
                <div className="rounded-2xl border border-[var(--ab-border-brand)] bg-gradient-to-l from-[var(--ab-primary)]/5 to-[var(--ab-surface)] p-3 shadow-2xs">
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--ab-accent)] overflow-hidden shrink-0 shadow-xs bg-[var(--ab-primary)]/10">
                      <img
                        src="https://images.unsplash.com/photo-1532012197267-da84d127e765?w=150&auto=format&fit=crop&q=80"
                        alt={publicT('public_academic_progression')}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--ab-heading)]">{publicT('public_academic_progression_for_this_major')}</h3>
                      <p className="text-[9px] font-bold text-[var(--ab-text-muted)] mt-0.5">{publicT('public_related_advanced_or_specialist_paths')}</p>
                    </div>
                  </div>
                  <div className="ab-detail-small-grid">
                    {relationshipDemo.academicPath.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenMajor?.(item.id)}
                        className="group text-start rounded-xl border border-[var(--ab-border-brand)] bg-gradient-to-b from-[var(--ab-primary)]/5 to-[var(--ab-surface)] p-3 hover:border-[var(--ab-accent)]/60 hover:shadow-sm transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="inline-flex rounded-full bg-[var(--ab-accent)]/12 px-2 py-0.5 text-[8.5px] font-bold text-[var(--ab-heading)] border border-[var(--ab-accent)]/25">
                            {item.degree}
                          </div>
                          <div className="mt-2 text-[10.5px] sm:text-[11px] font-bold text-[var(--ab-heading)] leading-5">{item.name}</div>
                          <div className="mt-1 text-[9px] font-bold text-[var(--ab-text-muted)] leading-4">{item.meta}</div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <div className="w-7 h-7 rounded-full bg-[var(--ab-accent)]/15 border border-[var(--ab-accent)]/40 flex items-center justify-center shrink-0 group-hover:bg-[var(--ab-accent)] transition-all shadow-[0_0_8px_rgba(214,164,59,0.35)]">
                            <ArrowLeft className="w-3.5 h-3.5 text-[var(--ab-accent-soft)] group-hover:text-black drop-shadow-[0_0_5px_rgba(214,164,59,0.8)] group-hover:-translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
