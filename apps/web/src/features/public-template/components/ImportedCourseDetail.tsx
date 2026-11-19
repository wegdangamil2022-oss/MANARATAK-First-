import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpLeft,
  BookOpen,
  Building2,
  Check,
  Compass,
  Copy,
  ExternalLink,
  Heart,
  Layers3,
  Link2,
} from 'lucide-react';
import { ImportedCourse } from '../types';
import { DetailBackButton, DetailSectionHeader, useDetailSearchTarget } from './DetailUi';
import { CourseProviderLogo, resolveCourseBilingualTitle } from './CoursesSearchPage';

interface ImportedCourseDetailProps {
  course: ImportedCourse;
  onBack?: () => void;
  onOpenMajor?: (majorId: string) => void;
  onOpenUniversity?: (universityId: string) => void;
  onOpenScholarship?: (scholarshipId: string) => void;
  onOpenCountry?: (countryId: string) => void;
  onOpenExam?: (examId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  searchAnchor?: string;
  searchTerm?: string;
}

const PROVIDER_BILINGUAL_MAP: Array<{ match: RegExp; ar: string; en: string }> = [
  { match: /saylor/i, ar: 'جامعة سايلور', en: 'Saylor University' },
  { match: /freecodecamp|free code camp/i, ar: 'أكاديمية فري كود كامب', en: 'freeCodeCamp' },
  { match: /google\s*skillshop/i, ar: 'منصة مهارات جوجل', en: 'Google Skillshop' },
  { match: /google/i, ar: 'أكاديمية جوجل', en: 'Google' },
  { match: /un\s*cc:e-learn|unccelearn|united nations/i, ar: 'منصة الأمم المتحدة للتعلم الإلكتروني', en: 'UN CC:e-Learn' },
  { match: /coursera/i, ar: 'منصة كورسيرا', en: 'Coursera' },
  { match: /edx/i, ar: 'منصة إيدكس', en: 'edX' },
  { match: /harvard/i, ar: 'جامعة هارفارد', en: 'Harvard University' },
  { match: /microsoft/i, ar: 'منصة مايكروسوفت التعليمية', en: 'Microsoft Learn' },
  { match: /mit/i, ar: 'معهد ماساتشوستس للتكنولوجيا', en: 'MIT OpenCourseWare' },
  { match: /stanford/i, ar: 'جامعة ستانفورد', en: 'Stanford Online' },
];

const HAS_ARABIC_REGEX = /[\u0600-\u06FF]/;

function resolveProviderBilingual(rawProvider: string): { ar: string; en: string } {
  const cleaned = (rawProvider || '').trim();
  for (const entry of PROVIDER_BILINGUAL_MAP) {
    if (entry.match.test(cleaned)) {
      return { ar: entry.ar, en: entry.en };
    }
  }
  if (HAS_ARABIC_REGEX.test(cleaned)) {
    return { ar: cleaned, en: 'Official Platform' };
  }
  return {
    ar: cleaned ? `منصة ${cleaned}` : 'جامعة سايلور',
    en: cleaned || 'Saylor University',
  };
}

const LANGUAGE_AR_MAP: Record<string, string> = {
  english: 'الإنجليزية',
  arabic: 'العربية',
  multilingual: 'متعددة اللغات',
  french: 'الفرنسية',
  german: 'الألمانية',
  spanish: 'الإسبانية',
};

const LEVEL_AR_MAP: Record<string, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم',
  'all levels': 'جميع المستويات',
};

const TOPIC_AR_FALLBACK_MAP: Record<string, string> = {
  'programming fundamentals': 'أساسيات البرمجة',
  'variables & data types': 'المتغيرات وأنواع البيانات',
  'conditions & loops': 'الشروط والحلقات التكرارية',
  'functions & practical applications': 'الدوال والتطبيقات العملية',
  'python programming': 'برمجة بايثون الأساسية',
  'core language features': 'ميزات اللغة الأساسية',
  'problem solving': 'حل المشكلات البرمجية',
  'practical projects': 'مشاريع تطبيقية',
  'course core concepts': 'المفاهيم الأساسية للدورة',
  'fundamental principles': 'المبادئ الأساسية',
  'practical applications': 'تطبيقات عملية',
  'projects & exercises': 'مشاريع وتمارين تطبيقية',
  'climate change': 'أساسيات تغير المناخ',
  'climate change fundamentals': 'أساسيات تغير المناخ',
  'net zero emissions': 'مفهوم صافي الانبعاثات الصفري',
  'net zero emissions concept': 'مفهوم صافي الانبعاثات الصفري',
  'renewable energy': 'الطاقة المتجددة والتحول الأخضر',
  'renewable energy & green transition': 'الطاقة المتجددة والتحول الأخضر',
  'carbon footprint': 'قياس وخفض البصمة الكربونية',
  'carbon footprint reduction': 'قياس وخفض البصمة الكربونية',
  'ai core concepts': 'مفاهيم الذكاء الاصطناعي',
  'fundamental principles & llms': 'المبادئ الأساسية والنماذج اللغوية',
  'practical applications & ethics': 'تطبيقات عملية وأخلاقيات الاستخدام',
  'interactive projects & exercises': 'مشاريع وتمارين تفاعلية',
  'google ads measurement': 'قياس أداء إعلانات جوجل',
  'conversion tracking': 'تتبّع التحويلات والنتائج',
  'attribution models': 'نماذج الإسناد التحليلية',
  'google analytics & audience solutions': 'تحليلات جوجل وحلول الجمهور',
};

const DEFAULT_RELATED_MAJORS_POOL: Array<{ id: string; name: string }> = [
  { id: 'mjr-demo-software-engineering', name: 'هندسة البرمجيات' },
  { id: 'mjr-demo-computer-science', name: 'علوم الحاسب' },
  { id: 'mjr-demo-artificial-intelligence', name: 'الذكاء الاصطناعي' },
  { id: 'mjr-demo-computer-science', name: 'علم البيانات والتحليلات' },
  { id: 'mjr-demo-software-engineering', name: 'الأمن السيبراني والشبكات' },
  { id: 'mjr-demo-computer-science', name: 'نظم المعلومات الحاسوبية' },
];

interface ResolvedCourseData {
  providerNameEn: string;
  providerNameAr: string;
  titleAr: string;
  titleEn: string;
  fieldAr: string;
  studyFreeLabel: string;
  freeCertificateLabel: string;
  certificateTypeAr: string;
  languageAr: string;
  levelAr: string;
  durationLabel: string;
  arabicTopics: string[];
  relatedMajors: Array<{ id?: string; name: string }>;
  directCourseUrl: string;
}

function resolveImportedCourseFullData(course: ImportedCourse): ResolvedCourseData {
  const { titleAr, titleEn } = resolveCourseBilingualTitle(course);

  const rawProvider = (course.provider || course.platform || 'Saylor University').trim();
  const { ar: providerNameAr, en: providerNameEn } = resolveProviderBilingual(rawProvider);

  const fieldAr = (course.field || 'البرمجة وتطوير البرمجيات').trim();

  const studyFreeLabel = course.studyFree ? 'مجانية' : 'مدفوعة';
  const freeCertificateLabel =
    course.freeCertificate === true
      ? 'مجانية'
      : course.freeCertificate === false
        ? 'غير مجانية'
        : 'غير محدد';

  const rawCert = (course.certificateTypeAr || course.certificateType || '').trim();
  let certificateTypeAr = rawCert;
  if (!certificateTypeAr) {
    certificateTypeAr = course.freeCertificate ? 'شهادة إتمام معتمدة' : 'بدون شهادة مجانية';
  }

  const rawLang = (course.language || 'الإنجليزية').replace(/\s*\([^)]*\)/g, '').trim();
  const languageAr = LANGUAGE_AR_MAP[rawLang.toLowerCase()] || rawLang || 'الإنجليزية';

  const rawLevel = (course.level || 'مبتدئ').replace(/\s*\([^)]*\)/g, '').trim();
  const levelAr = LEVEL_AR_MAP[rawLevel.toLowerCase()] || rawLevel || 'مبتدئ';

  const durationLabel = (course.duration || '41 ساعة').trim();

  const rawTopics =
    course.topics && course.topics.length > 0
      ? course.topics
      : [
          'أساسيات البرمجة',
          'المتغيرات وأنواع البيانات',
          'الشروط والحلقات التكرارية',
          'الدوال والتطبيقات العملية',
        ];

  const arabicTopics = rawTopics.map((topicItem) => {
    const cleaned = topicItem.trim();
    const separatorMatch = cleaned.split(/\s*(?:—|–|\||(?:\s-\s))\s*/);
    if (separatorMatch.length >= 2) {
      const firstPart = separatorMatch[0].trim();
      if (HAS_ARABIC_REGEX.test(firstPart)) {
        return firstPart;
      }
      const arPart = separatorMatch.find((part) => HAS_ARABIC_REGEX.test(part));
      if (arPart) {
        return arPart.trim();
      }
    }
    const lowerKey = cleaned.toLowerCase();
    if (TOPIC_AR_FALLBACK_MAP[lowerKey]) {
      return TOPIC_AR_FALLBACK_MAP[lowerKey];
    }
    return cleaned;
  });

  const existingMajors = (course.relatedMajors ?? [])
    .filter((item) => item && item.name)
    .map((item) => ({
      id: item.id,
      name: item.name.trim(),
    }));

  const relatedMajors: Array<{ id?: string; name: string }> = [...existingMajors];
  for (const fallbackMajor of (import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype' ? DEFAULT_RELATED_MAJORS_POOL : [])) {
    if (relatedMajors.length >= 6) break;
    if (!relatedMajors.some((m) => m.id === fallbackMajor.id)) {
      relatedMajors.push(fallbackMajor);
    }
  }

  return {
    providerNameEn,
    providerNameAr,
    titleAr,
    titleEn,
    fieldAr,
    studyFreeLabel,
    freeCertificateLabel,
    certificateTypeAr,
    languageAr,
    levelAr,
    durationLabel,
    arabicTopics,
    relatedMajors: relatedMajors.slice(0, 6),
    directCourseUrl: course.directCourseUrl || 'https://learn.saylor.org/course/view.php?id=1282',
  };
}

export const ImportedCourseDetail: React.FC<ImportedCourseDetailProps> = ({
  course,
  onBack,
  onOpenMajor,
  onOpenUniversity,
  onOpenScholarship,
  onOpenCountry,
  onOpenExam,
  isFavorite = false,
  onToggleFavorite,
  searchAnchor,
  searchTerm,
}) => {
  const { dir: publicDir } = usePublicTemplateTranslation();
  const [copiedUrl, setCopiedUrl] = useState(false);

  useDetailSearchTarget(searchAnchor, searchTerm);

  const resolved = resolveImportedCourseFullData(course);

  const handleCopyUrl = () => {
    if (!resolved.directCourseUrl) return;
    navigator.clipboard?.writeText(resolved.directCourseUrl).catch(() => {});
    setCopiedUrl(true);
    window.setTimeout(() => setCopiedUrl(false), 2000);
  };

  const renderSectionHeader = ({
    id,
    icon: Icon,
    title,
  }: {
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
  }) => (
    <DetailSectionHeader
      id={id}
      title={title}
      level={3}
      className="mb-2.5"
      iconClassName="mn-icon-mix02"
      iconNode={
        <>
          <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-md" />
          <Icon className="h-4 w-4 relative z-10 text-[#F2CD78]" />
        </>
      }
    />
  );

  const basicInfoRows: Array<{ label: string; value: string; highlight?: boolean }> = [
    { label: 'اسم الدورة', value: resolved.titleAr },
    { label: 'اسم المنصة', value: resolved.providerNameAr },
    { label: 'الدراسة', value: resolved.studyFreeLabel, highlight: course.studyFree },
    { label: 'الشهادة', value: resolved.freeCertificateLabel, highlight: Boolean(course.freeCertificate) },
    { label: 'اللغة', value: resolved.languageAr },
    { label: 'نوع الشهادة', value: resolved.certificateTypeAr },
    { label: 'مدة الدورة', value: resolved.durationLabel },
    { label: 'المستوى الدراسي', value: resolved.levelAr },
    { label: 'المجال', value: resolved.fieldAr },
  ];

  return (
    <div
      className="w-full max-w-md md:max-w-[1120px] lg:max-w-[1160px] mx-auto pt-0 pb-20 text-start font-['Cairo',sans-serif] animate-in fade-in duration-200 bg-[var(--mn-page)] min-h-screen mn-panel"
      dir={publicDir}
    >
      {/* ========================================================================= */}
      {/* 1. TOP HERO CONTAINER — متوازن تماماً مع أزرار الرجوع والمفضلة واسم المنصة */}
      {/* ========================================================================= */}
      <div className="relative w-full overflow-hidden bg-[linear-gradient(135deg,#142B5F_0%,#153B75_52%,#0E7C86_100%)] border-b-[2px] border-[#D6A43B]/60 pt-3.5 pb-3.5 md:py-5 px-3.5 sm:px-4 md:px-8 text-white shadow-md">
        {/* أزرار الرجوع والمفضلة في الأعلى واضحة وظاهرة تماماً دون أن تغطي اسم المنصة */}
        <div className="absolute top-2 left-2 z-30 flex flex-col items-center gap-1 scale-75 origin-top-left mn-panel">
          {onBack && <DetailBackButton onBack={onBack} mode="back" />}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite(course.id);
              }}
              className="mn-detail-close transition-all active:scale-95 cursor-pointer"
              aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
              title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            >
              <Heart
                className={`h-3.5 w-3.5 ${
                  isFavorite
                    ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#38C6D4] dark:text-[#38C6D4]'
                    : 'text-[var(--mn-heading)]'
                }`}
              />
            </button>
          )}
        </div>

        {/* Decorative Background Waves matching ScholarshipDetailModal */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg
            className="w-full h-full opacity-25"
            viewBox="0 0 500 180"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M -40,38 Q 130,-15 280,42 T 540,22"
              stroke="var(--mn-accent)"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M -25,105 Q 160,48 330,100 T 550,72"
              stroke="var(--mn-accent)"
              strokeWidth="1"
              fill="none"
            />
            <circle cx="38" cy="24" r="1.5" fill="var(--mn-accent)" />
            <circle cx="54" cy="18" r="1" fill="var(--mn-accent)" />
            <circle cx="455" cy="28" r="1.5" fill="var(--mn-accent)" />
            <circle cx="438" cy="42" r="1.2" fill="var(--mn-accent)" />
          </svg>
        </div>

        {/* Hero Main Content: الشعار الدائري للمزود + اسم الدورة بالعربية وتحته بالإنجليزية */}
        <div className="relative z-10 flex items-center gap-3 pl-10 pt-2">
          <div className="h-12 w-12 shrink-0 rounded-full overflow-hidden bg-[var(--mn-surface)] border border-[#F2CD78]/80 shadow-sm flex items-center justify-center">
            <CourseProviderLogo provider={resolved.providerNameEn} className="w-full h-full" />
          </div>

          <div className="min-w-0 flex-1 text-start">
            <h1 className="text-[14.5px] sm:text-[15.5px] font-bold leading-snug text-white drop-shadow-xs font-['Cairo',sans-serif]">
              {resolved.titleAr}
            </h1>
            <p
              dir="ltr"
              className="mt-0.5 text-[10.5px] sm:text-[11px] font-bold text-[#F2CD78] text-right truncate font-['Cairo',sans-serif]"
            >
              {resolved.titleEn}
            </p>
          </div>
        </div>

        {/* Bottom Hero Strip: اسم المنصة بالعربي (يمين) + اسم المنصة بالإنجليزي (يسار) */}
        <div className="relative z-10 mt-4 flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-black/15 px-3 py-1.5 backdrop-blur-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 className="h-3.5 w-3.5 text-[#F2CD78] shrink-0" />
            <span className="text-[11px] font-bold text-white truncate font-['Cairo',sans-serif]">
              {resolved.providerNameAr}
            </span>
          </div>

          <span
            dir="ltr"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/12 border border-[#D6A43B]/40 px-2.5 py-0.5 text-[10.5px] font-bold text-[#F2CD78] font-['Cairo',sans-serif] shrink-0"
          >
            <Building2 className="h-3 w-3 shrink-0" />
            <span>{resolved.providerNameEn}</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN STRUCTURED SECTIONS — متوازنة بالكامل في الأبعاد والخطوط والمسافات     */}
      {/* ========================================================================= */}
      <main className="px-0 md:px-4 pt-2.5 md:pt-4 space-y-2.5 md:space-y-4 relative z-20">
        {/* --------------------------------------------------------------------- */}
        {/* 1. جدول البيانات والمواصفات الأساسية للدورة                            */}
        {/* --------------------------------------------------------------------- */}
        <section
          className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:px-6 py-3 md:py-5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]"
          dir={publicDir}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

          {renderSectionHeader({
            id: 'course-basic-specs',
            icon: BookOpen,
            title: 'البيانات والمواصفات الأساسية للدورة',
          })}

          <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-[var(--mn-border)] shadow-2xs bg-[var(--mn-surface)] font-['Cairo',sans-serif]">
            <table className="w-full text-start border-collapse table-fixed font-['Cairo',sans-serif]">
              <thead>
                <tr className="bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)] font-['Cairo',sans-serif]">
                  <th className="py-2 px-3 text-[11px] sm:text-[11.5px] font-bold text-white w-[33%] sm:w-[31%] border-l border-white/15 font-['Cairo',sans-serif]">
                    البيان
                  </th>
                  <th className="py-2 pr-3 pl-3.5 text-[11px] sm:text-[11.5px] font-bold text-white w-[67%] sm:w-[69%] font-['Cairo',sans-serif]">
                    التفاصيل
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--mn-border)] font-['Cairo',sans-serif]">
                {basicInfoRows.map((row, idx) => (
                  <tr
                    key={`${row.label}-${idx}`}
                    className="odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors group font-['Cairo',sans-serif]"
                  >
                    <td className="relative py-2 pr-3.5 pl-2.5 text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] align-middle break-words font-['Cairo',sans-serif]">
                      <span className="pointer-events-none absolute top-2 right-0 bottom-2 w-[2.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)] opacity-75" />
                      <span>{row.label}</span>
                    </td>
                    <td
                      className={`py-2 pr-3 pl-3.5 text-[11px] sm:text-[11.5px] font-bold leading-relaxed align-middle font-['Cairo',sans-serif] ${
                        row.highlight
                          ? 'text-[#0E7C86] dark:text-[#38C6D4]'
                          : 'text-[var(--mn-heading)]'
                      }`}
                    >
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* --------------------------------------------------------------------- */}
        {/* 2. مواضيع ومحاور الدورة — بدون الرقم (4) وباللغة العربية وبخط القاهرة   */}
        {/* --------------------------------------------------------------------- */}
        <section
          className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:px-6 py-3 md:py-5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]"
          dir={publicDir}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

          {renderSectionHeader({
            id: 'course-topics',
            icon: Layers3,
            title: 'مواضيع ومحاور الدورة',
          })}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 items-stretch font-['Cairo',sans-serif]">
            {resolved.arabicTopics.map((topicAr, idx) => (
              <div
                key={`${topicAr}-${idx}`}
                className="group relative overflow-hidden rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] hover:border-[#142B5F]/45 px-3 py-2 md:py-3 transition-all flex items-center gap-2.5 h-full font-['Cairo',sans-serif]"
              >
                {/* دائرة مزدوجة بتدرج نيلي بترولي أفقي */}
                <span className="w-4 h-4 rounded-full bg-gradient-to-l from-[#142B5F] to-[#0E7C86] p-[2px] flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="w-full h-full rounded-full bg-[var(--mn-surface)] flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-l from-[#142B5F] to-[#0E7C86]" />
                  </span>
                </span>

                <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug text-start flex-1 font-['Cairo',sans-serif]">
                  {topicAr}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* --------------------------------------------------------------------- */}
        {/* 3. رابط الدورة المباشر — زر نسخ الرابط بخلفية بيضاء وإطار وخط نيلي وأيقونة بترولي */}
        {/* --------------------------------------------------------------------- */}
        <section
          className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:px-6 py-3 md:py-5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]"
          dir={publicDir}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

          {renderSectionHeader({
            id: 'course-direct-link',
            icon: Link2,
            title: 'رابط الدورة المباشر',
          })}

          <div className="space-y-2 font-['Cairo',sans-serif]">
            {/* صندوق عرض الرابط المباشر مع زر النسخ */}
            <div className="relative rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] pl-2.5 pr-3.5 py-2 flex items-center justify-between gap-2 overflow-hidden">
              <div className="absolute top-2 right-0 bottom-2 w-[3px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86]" />

              <button
                type="button"
                onClick={handleCopyUrl}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[var(--mn-surface)] border border-[#142B5F] dark:border-[#F2CD78]/75 text-[#142B5F] dark:text-[var(--mn-heading)] px-2.5 py-1 text-[10.5px] font-bold hover:border-[#0E7C86] transition-all cursor-pointer active:scale-95 shadow-2xs font-['Cairo',sans-serif]"
                title="نسخ رابط الدورة المباشر"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                    <span>نسخ الرابط</span>
                  </>
                )}
              </button>

              <a
                href={resolved.directCourseUrl}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                className="min-w-0 flex-1 truncate text-end text-[10.5px] font-bold text-[#0E7C86] dark:text-[#38C6D4] hover:underline font-['Cairo',sans-serif]"
              >
                {resolved.directCourseUrl}
              </a>
            </div>

            {/* زر الانتقال الرئيسي لبدء الدورة بحجم وخط متناسق مع بقية الأقسام */}
            <a
              href={resolved.directCourseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between gap-2 rounded-xl bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] px-3 py-2 text-white shadow-2xs hover:opacity-95 transition-all active:scale-[0.99] mn-inverse font-['Cairo',sans-serif]"
            >
              <span className="flex items-center gap-2 min-w-0">
                <ExternalLink className="h-3.5 w-3.5 text-[#F2CD78] shrink-0" />
                <span className="text-[11px] sm:text-[11.5px] font-bold text-white truncate font-['Cairo',sans-serif]">
                  الانتقال إلى صفحة الدورة الرسمية وبدء الدراسة
                </span>
              </span>
              <ArrowLeft className="h-3.5 w-3.5 text-[#F2CD78] shrink-0" />
            </a>
          </div>
        </section>

        {/* --------------------------------------------------------------------- */}
        {/* 4. تخصصات مرتبطة — 6 تخصصات في شبكة مربعات صغيرة مثل قسم التخصصات في جامعة أكسفورد */}
        {/* --------------------------------------------------------------------- */}
        <section
          className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2.5 sm:px-3 md:px-6 py-3 md:py-5 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]"
          dir={publicDir}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

          {renderSectionHeader({
            id: 'course-related',
            icon: Compass,
            title: 'تخصصات مرتبطة',
          })}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 font-['Cairo',sans-serif]">
            {resolved.relatedMajors.map((major, idx) => (
              <button
                key={`${major.id || major.name}-${idx}`}
                type="button"
                disabled={!major.id || !onOpenMajor}
                onClick={() => major.id && onOpenMajor?.(major.id)}
                className={`mn-major-chip w-full flex items-center justify-between gap-1.5 px-3 py-2 bg-[var(--mn-page)] border border-[#142B5F]/20 dark:border-[var(--mn-border)] text-[var(--mn-heading)] text-[10.5px] sm:text-[11px] font-bold rounded-xl transition-all group min-w-0 text-start font-['Cairo',sans-serif] ${
                  major.id && onOpenMajor
                    ? 'hover:border-[#0E7C86]/65 dark:hover:border-[#F2CD78]/65 hover:shadow-2xs active:scale-95 cursor-pointer'
                    : 'hover:border-[#0E7C86]/45 dark:hover:border-[#F2CD78]/45 cursor-default'
                }`}
              >
                <span className="truncate">{major.name}</span>
                <ArrowUpLeft className="w-3.5 h-3.5 text-[var(--mn-interactive-arrow)] opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
