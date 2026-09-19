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
} from 'lucide-react';
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
  useDetailSearchTarget(searchAnchor, searchTerm);
  return (
    <div
      className="w-full bg-[var(--mn-page)] dark:bg-[var(--mn-page)] animate-fade-in font-['Cairo',sans-serif] min-h-screen mn-panel dark:mn-panel "
      dir="rtl"
    >
      {/* 1. القسم الأول: رأس الصفحة الملتصق بالهيدر والجوانب */}
      <div className="w-full bg-gradient-to-b from-[var(--mn-primary)] via-[var(--mn-section-line)] to-[var(--mn-primary)] dark:from-[var(--mn-surface-elevated)] dark:via-[var(--mn-surface-elevated)] dark:to-[var(--mn-surface-elevated)] pt-3 pb-4 border-b-[3px] border-[var(--mn-accent)]/70 relative z-10 shadow-md overflow-hidden mn-inverse dark:mn-panel ">
        <div className="absolute top-2 right-2 z-30"><DetailBackButton onBack={onClose} mode="close" /></div>
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Top-left dot grid */}
          <div className="absolute top-2 left-4 grid grid-cols-5 gap-1.5 opacity-20">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[var(--mn-accent)] mn-gold " />
            ))}
          </div>

          {/* Thin gold curved orbital line on left */}
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full border border-[var(--mn-accent)]/25 pointer-events-none" />
          <div className="absolute -top-4 -left-4 w-60 h-60 rounded-full border border-[var(--mn-accent)]/15 pointer-events-none" />

          {/* University / Academic Building silhouette on right in transparent shade */}
          <svg
            className="absolute -right-6 bottom-0 h-44 w-44 text-[var(--mn-heading)] pointer-events-none"
            viewBox="0 0 200 200"
            fill="currentColor"
          >
            {/* Columns and Pediment (Academic building) */}
            <polygon points="100,30 40,80 160,80" />
            <rect x="50" y="80" width="15" height="120" />
            <rect x="85" y="80" width="15" height="120" />
            <rect x="120" y="80" width="15" height="120" />
            <rect x="40" y="180" width="130" height="20" />
          </svg>

          {/* Lower Curved Gold Swirl */}
          <svg
            className="absolute bottom-0 inset-x-0 w-full h-10 opacity-30"
            viewBox="0 0 500 80"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-20,70 Q250,-20 520,70"
              stroke="var(--mn-accent)"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        <div className="mn-detail-content mn-detail-content-narrow flex flex-col gap-3 relative z-10">
          {/* البيانات العلوية: الشعار، الاسم، زر المفضلة */}
          <div className="flex justify-between items-start mt-1">
            <div className="flex items-start gap-3 sm:gap-4">
              {/* المربع حق العلم مع خط ذهبي */}
              <div className="w-11 h-11 sm:w-14 sm:h-14 bg-white/10 rounded-xl flex items-center justify-center text-2xl sm:text-3xl border border-[var(--mn-accent)] shrink-0 shadow-sm backdrop-blur-sm">
                {university.countryFlag}
              </div>
              <div className="flex flex-col pt-0.5">
                <h1 className="text-[22px] sm:text-[28px] font-bold text-white leading-tight drop-shadow-sm flex items-baseline gap-2 flex-wrap">
                  <span>{university.name}</span>
                  <span className="text-sm sm:text-base text-[var(--mn-accent-text)] font-bold opacity-90">
                    ({university.nameEn.replace('University of ', '').replace(' University', '')})
                  </span>
                </h1>
              </div>
            </div>
            <button
              onClick={onToggleSave}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all border shrink-0 ${
                isSaved
                  ? 'bg-[var(--mn-danger-solid)]/20 border-[var(--mn-danger-border)]'
                  : 'bg-white/10 hover:bg-white/20 border-white/10 backdrop-blur-sm'
              }`}
            >
              <Heart
                className={`w-4 h-4 sm:w-5 sm:h-5 ${isSaved ? 'fill-red-500 text-[var(--mn-danger-text)]' : 'text-white'}`}
              />
            </button>
          </div>

          {/* 4 عناصر بيانات - تم تحويلها لعرض طولي/شبكي (2x2) لمنع اختفاء النص */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 border-t border-white/10 pt-3 mt-1">
            <button
              type="button"
              onClick={() => university.countryReferenceId && onOpenCountry?.(university.countryReferenceId)}
              className="bg-[var(--mn-surface-elevated)]/95 backdrop-blur-sm w-full rounded-lg py-1.5 px-2.5 flex flex-col sm:flex-row items-center text-center sm:text-right gap-1.5 shadow-sm border border-[var(--mn-border)] transition-all hover:border-[var(--mn-accent)]/70 hover:shadow-md cursor-pointer mn-panel "
              title={`استكشف الدراسة في ${university.country}`}
            >
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--mn-accent-text)] shrink-0" />
              <span className="text-[10px] sm:text-[11.5px] text-[var(--mn-heading)] font-bold leading-snug">
                {university.country}
                {university.city ? `، ${university.city}` : ''}
              </span>
            </button>

            <div className="bg-[var(--mn-surface-elevated)]/95 backdrop-blur-sm w-full rounded-lg py-1.5 px-2.5 flex flex-col sm:flex-row items-center text-center sm:text-right gap-1.5 shadow-sm border border-[var(--mn-border)] mn-panel ">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--mn-accent-text)] shrink-0" />
              <span className="text-[10px] sm:text-[11.5px] text-[var(--mn-heading)] font-bold leading-snug">
                {university.ownership || 'غير محدد'}
              </span>
            </div>

            <div className="bg-[var(--mn-surface-elevated)]/95 backdrop-blur-sm w-full rounded-lg py-1.5 px-2.5 flex flex-col sm:flex-row items-center text-center sm:text-right gap-1.5 shadow-sm border border-[var(--mn-border)] mn-panel ">
              <Landmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--mn-accent-text)] shrink-0" />
              <span className="text-[10px] sm:text-[11.5px] text-[var(--mn-heading)] font-bold leading-snug">
                {university.type || 'غير محدد'}
              </span>
            </div>

            <div className="bg-[var(--mn-surface-elevated)]/95 backdrop-blur-sm w-full rounded-lg py-1.5 px-2.5 flex flex-col sm:flex-row items-center text-center sm:text-right gap-1.5 shadow-sm border border-[var(--mn-border)] mn-panel ">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--mn-accent-text)] shrink-0" />
              <span className="text-[10px] sm:text-[11.5px] text-[var(--mn-heading)] font-bold leading-snug">
                {university.foundationYear || 'غير محدد'}
              </span>
            </div>
          </div>

          {/* زر الموقع الرسمي - لون أبيض وخط أخضر وحجم أصغر */}
          {university.websiteUrl ? (
            <div className="w-full flex justify-center mt-1">
              <a
                href={university.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mn-external-link inline-flex min-h-10 w-auto items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold sm:text-xs"
              >
                <span>الموقع الرسمي للجامعة</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className="w-full flex justify-center mt-1">
              <div className="w-full sm:w-2/3 bg-white/10 text-white rounded-lg py-2 flex items-center justify-center gap-2 font-bold text-[11px] sm:text-xs border border-white/10">
                <span>الموقع الرسمي غير متوفر</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. استكمال باقي الصفحة (الأقسام الـ 11) */}
      <div className="mn-detail-content mn-detail-content-narrow pt-6 pb-24 flex flex-col gap-6">
        {/* القسم الأول: نبذة عن الجامعة */}
        <div
          className="mn-detail-full-bleed relative bg-[var(--mn-surface)] border-y border-[var(--mn-border-brand)]/30 dark:border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/50 dark:shadow-none overflow-hidden mn-panel dark:mn-panel "
          dir="rtl"
        >
          {/* خط التزيين العلوي المتدرج */}
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

          <DetailSectionHeader
            id="university-about"
            icon={Info}
            title="1. نبذة عن الجامعة"
            className="mx-4 mt-4 sm:mx-5"
          />

          <div className="p-4 sm:p-5">
            <div className="bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] rounded-2xl p-4 sm:p-5 border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] shadow-2xs relative overflow-hidden mn-panel dark:mn-panel ">
              {/* زخرفة خلفية ناعمة */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[var(--mn-page)] to-[var(--mn-surface-muted)]/50 rounded-bl-full -z-10 opacity-70 mn-panel "></div>

              <p className="text-[12.5px] sm:text-[13.5px] font-semibold text-[var(--mn-text)] dark:text-[var(--mn-text)] leading-[1.9] text-justify font-['Cairo',sans-serif] whitespace-pre-line">
                {university.description}
              </p>
            </div>
          </div>
        </div>

        {/* القسم الثاني: التصنيفات العالمية — تصميم احترافي فاخر ملتصق بالجوانب ومتناسق مع باقي الأقسام */}
        {university.rankings && university.rankings.length > 0 && (
          <div
            className="mn-detail-full-bleed relative bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border-y border-[var(--mn-border-brand)]/30 dark:border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/50 dark:shadow-none overflow-hidden mn-panel dark:mn-panel "
            dir="rtl"
          >
            {/* خط التزيين العلوي المتدرج */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

            <DetailSectionHeader
              id="university-rankings"
              icon={Trophy}
              title="2. التصنيفات والاعتمادات الأكاديمية العالمية"
              className="mx-4 mt-4 sm:mx-5"
            />

            {/* المحتوى الداخلي لقائمة التصنيفات */}
            <div className="p-4 sm:p-5 space-y-2.5 font-['Cairo',sans-serif]">
              {university.rankings.map((ranking, idx) => {
                const rankNum = ranking.rank.replace('#', '').replace('عالميًا', '').trim();
                return (
                  <div
                    key={idx}
                    className="bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] rounded-2xl border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] hover:border-[var(--mn-border-brand)] dark:hover:border-[var(--mn-accent)] p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-2.5 relative overflow-hidden group mn-panel dark:mn-panel "
                  >
                    {/* Right / Start: Accent bar + Rank Pill */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {/* Left vertical emerald/gold accent curve */}
                      <div className="w-1.5 h-9 bg-gradient-to-b from-[var(--mn-primary)] to-[var(--mn-accent-soft)] rounded-full shrink-0 mn-inverse " />

                      {/* Rank Pill with Trophy */}
                      <div className="bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border border-[var(--mn-border-gold)] dark:border-[var(--mn-accent)]/30 rounded-full py-1 px-3 flex items-center gap-2 shadow-2xs mn-panel dark:mn-panel ">
                        <div className="w-6 h-6 rounded-full bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)]/20 flex items-center justify-center text-[var(--mn-accent-text)] dark:text-[var(--mn-accent-text)] shrink-0 mn-inverse ">
                          <Trophy className="w-3.5 h-3.5 text-[var(--mn-accent-text)] dark:text-[var(--mn-accent-text)]" />
                        </div>
                        <span className="text-xs sm:text-[12.5px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] font-['Cairo',sans-serif]">
                          {rankNum} عالميًا
                        </span>
                      </div>
                    </div>

                    {/* Middle: Ranking Name & Edition Year */}
                    <div className="flex flex-col items-start text-right flex-1 min-w-0 px-2">
                      {ranking.link ? (
                        <a
                          href={ranking.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs sm:text-[12.5px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-text)] hover:text-[var(--mn-heading)] dark:hover:text-[var(--mn-accent-text)] transition-colors font-['Cairo',sans-serif] leading-snug line-clamp-1"
                        >
                          {ranking.name}
                        </a>
                      ) : (
                        <h3 className="text-xs sm:text-[12.5px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-text)] font-['Cairo',sans-serif] leading-snug line-clamp-1">
                          {ranking.name}
                        </h3>
                      )}
                      <span className="text-[10px] text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)] font-medium font-['Cairo',sans-serif] mt-0.5">
                        إصدار {ranking.year}
                      </span>
                    </div>

                    {/* Left / End: External Link Icon */}
                    <div className="shrink-0">
                      {ranking.link ? (
                        <a
                          href={ranking.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)] dark:hover:text-[var(--mn-accent-text)] hover:bg-[var(--mn-page)] dark:hover:bg-[var(--mn-surface-muted)] transition-colors hover:mn-panel dark:hover:mn-panel "
                          title="زيارة صفحة التصنيف"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)]">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* القسم الثالث: الدراسة والتخصصات — تصميم احترافي فاخر ملتصق بالجوانب ومتنوع الأنماط */}
        {university.studyPrograms && (
          <div
            className="mn-detail-full-bleed relative bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border-y border-[var(--mn-border-brand)]/30 dark:border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/50 dark:shadow-none overflow-hidden mn-panel dark:mn-panel "
            dir="rtl"
          >
            {/* خط التزيين العلوي المتدرج */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

            <DetailSectionHeader
              id="university-programs"
              icon={GraduationCap}
              title="3. الدراسة والتخصصات والبرامج الأكاديمية"
              className="mx-4 mt-4 sm:mx-5"
            />

            {/* المحتوى الداخلي المتنوع الأنماط والتفاصيل */}
            <div className="p-4 sm:p-5 space-y-4 font-['Cairo',sans-serif]">
              {/* 1. لغات التدريس وأنماط الدراسة (المربع الأول) */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] space-y-2.5 shadow-2xs mn-panel dark:mn-panel">
                <div className="flex items-center gap-2">
                  <div className="w-5.5 h-5.5 rounded-lg bg-[var(--mn-primary)]/10 dark:bg-[var(--mn-accent)]/20 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] flex items-center justify-center shrink-0">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11.5px] sm:text-xs font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] font-['Cairo',sans-serif]">
                    لغات التدريس وأنماط الدراسة
                  </span>
                </div>

                <div className="space-y-2 pt-0.5">
                  {/* لغات التدريس */}
                  {university.studyPrograms.teachingLanguages && university.studyPrograms.teachingLanguages.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text-muted)] shrink-0">
                        لغات التدريس:
                      </span>
                      {university.studyPrograms.teachingLanguages.map((lang) => (
                        <div
                          key={lang}
                          className="bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border border-[var(--mn-accent)]/30 dark:border-[var(--mn-accent)]/25 text-[var(--mn-heading)] dark:text-[var(--mn-text)] px-2.5 py-1 rounded-lg text-[10px] sm:text-[10.5px] font-bold flex items-center gap-1.5 shadow-2xs font-['Cairo',sans-serif] mn-panel dark:mn-panel"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] shrink-0 mn-inverse dark:mn-gold" />
                          <span>{lang}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* أنماط الدراسة والحضور */}
                  {university.studyPrograms.studyModes && university.studyPrograms.studyModes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text-muted)] shrink-0">
                        أنماط الحضور:
                      </span>
                      {university.studyPrograms.studyModes.map((mode) => (
                        <div
                          key={mode}
                          className="bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border border-[var(--mn-accent)]/30 dark:border-[var(--mn-accent)]/25 text-[var(--mn-heading)] dark:text-[var(--mn-text)] px-2.5 py-1 rounded-lg text-[10px] sm:text-[10.5px] font-bold flex items-center gap-1.5 shadow-2xs font-['Cairo',sans-serif] mn-panel dark:mn-panel"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] shrink-0 mn-inverse dark:mn-gold" />
                          <span>{mode}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. الدرجات التعليمية المتاحة */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] space-y-2 shadow-2xs mn-panel dark:mn-panel ">
                <div className="flex items-center gap-2">
                  <div className="w-5.5 h-5.5 rounded-lg bg-[var(--mn-primary)]/10 dark:bg-[var(--mn-accent)]/20 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] flex items-center justify-center shrink-0">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11.5px] sm:text-xs font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] font-['Cairo',sans-serif]">
                    الدرجات التعليمية المتاحة للقبول والدراسة
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {(university.studyPrograms.degrees ?? []).map((degree) => (
                    <div
                      key={degree}
                      className="bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border border-[var(--mn-accent)]/30 dark:border-[var(--mn-accent)]/25 text-[var(--mn-heading)] dark:text-[var(--mn-text)] px-2.5 py-1 rounded-lg text-[10px] sm:text-[10.5px] font-bold flex items-center gap-1.5 shadow-2xs hover:border-[var(--mn-border-brand)] transition-all font-['Cairo',sans-serif] mn-panel dark:mn-panel "
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] shrink-0 mn-inverse dark:mn-gold " />
                      <span>{degree}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. الكليات والأقسام الأكاديمية الرئيسية */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] space-y-2 shadow-2xs mn-panel dark:mn-panel ">
                <div className="flex items-center gap-2">
                  <div className="w-5.5 h-5.5 rounded-lg bg-[var(--mn-primary)]/10 dark:bg-[var(--mn-accent)]/20 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11.5px] sm:text-xs font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] font-['Cairo',sans-serif]">
                    الكليات والأقسام الأكاديمية الرئيسية
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {(university.studyPrograms.faculties ?? []).map((faculty, index) => (
                    <div
                      key={index}
                      className="bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border border-[var(--mn-accent)]/30 dark:border-[var(--mn-accent)]/25 text-[var(--mn-heading)] dark:text-[var(--mn-text)] px-2.5 py-1 rounded-lg text-[10px] sm:text-[10.5px] font-bold flex items-center gap-1.5 shadow-2xs hover:border-[var(--mn-border-brand)] transition-all font-['Cairo',sans-serif] mn-panel dark:mn-panel "
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] shrink-0 mn-inverse dark:mn-gold " />
                      <span>{faculty}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. أهم التخصصات الرائدة */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] space-y-2 shadow-2xs mn-panel dark:mn-panel ">
                <div className="flex items-center gap-2">
                  <div className="w-5.5 h-5.5 rounded-lg bg-[var(--mn-primary)]/10 dark:bg-[var(--mn-accent)]/20 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] flex items-center justify-center shrink-0">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11.5px] sm:text-xs font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] font-['Cairo',sans-serif]">
                    أبرز التخصصات الأكاديمية الرائدة بالجامعة
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {(
                    university.studyPrograms.topKeyMajors?.length
                      ? university.studyPrograms.topKeyMajors
                      : (university.studyPrograms.majorLinks ?? []).map((l) => l.label)
                  ).map((majorName, idx) => {
                    const matchedLink = university.studyPrograms.majorLinks?.find(
                      (l) => l.label === majorName || l.programLabel === majorName
                    );
                    const majorId = matchedLink?.majorId;

                    return (
                      <div
                        key={majorId || `${majorName}-${idx}`}
                        onClick={majorId ? () => onOpenMajor?.(majorId) : undefined}
                        role={majorId ? 'button' : undefined}
                        tabIndex={majorId ? 0 : undefined}
                        className={`bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border border-[var(--mn-accent)]/30 dark:border-[var(--mn-accent)]/25 text-[var(--mn-heading)] dark:text-[var(--mn-text)] px-2.5 py-1 rounded-lg text-[10px] sm:text-[10.5px] font-bold flex items-center gap-1.5 shadow-2xs hover:border-[var(--mn-border-brand)] transition-all font-['Cairo',sans-serif] mn-panel dark:mn-panel ${
                          majorId ? 'cursor-pointer hover:text-[var(--mn-accent-text)]' : ''
                        }`}
                        title={majorId ? `افتح تخصص ${majorName} في منارتك` : undefined}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] shrink-0 mn-inverse dark:mn-gold " />
                        <span>{majorName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. زر الدليل الرسمي المباشر */}
              {(university.studyPrograms.undergradDirectoryUrl || university.studyPrograms.postgradDirectoryUrl) && (
                <div className="pt-2 pb-0.5 flex justify-center">
                  <a
                    href={
                      university.studyPrograms.undergradDirectoryUrl ||
                      university.studyPrograms.postgradDirectoryUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500/10 via-cyan-600/15 to-indigo-600/10 hover:from-teal-500/20 hover:via-cyan-600/25 hover:to-indigo-600/20 text-teal-950 border border-teal-400/50 dark:from-amber-500/15 dark:via-yellow-500/20 dark:to-amber-600/15 dark:hover:from-amber-500/25 dark:hover:via-yellow-500/30 dark:hover:to-amber-600/25 dark:text-amber-200 dark:border-amber-400/50 shadow-2xs hover:shadow-xs transition-all duration-200 text-[10px] sm:text-[10.5px] font-bold font-['Cairo',sans-serif] group text-center"
                  >
                    <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-teal-600 via-cyan-700 to-indigo-800 text-white dark:from-amber-500 dark:via-yellow-500 dark:to-amber-600 dark:text-zinc-950 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform font-bold">
                      <FileText className="w-2.5 h-2.5" />
                    </div>
                    <span>استكشف دليل البرامج والتخصصات الرسمي للجامعة</span>
                    <ExternalLink className="w-2.5 h-2.5 text-cyan-700 dark:text-amber-300 group-hover:translate-x-[-2px] transition-transform" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* القسم الرابع: القبول للطلاب الدوليين */}
        {university.internationalAdmissions && (
        <div
          className="mn-detail-full-bleed relative bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border-y border-[var(--mn-border-brand)]/30 dark:border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/50 dark:shadow-none overflow-hidden mn-panel dark:mn-panel "
          dir="rtl"
        >
          {/* خط التزيين الأزرق العلوي المتدرج */}
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

          <DetailSectionHeader
            id="university-admissions"
            icon={Globe}
            title="4. القبول والتسجيل للطلاب الدوليين"
            className="mx-4 mt-4 sm:mx-5"
          />

          {/* المحتوى الداخلي لقسم القبول والتسجيل */}
          <div className="p-4 sm:p-5 space-y-4 font-['Cairo',sans-serif]">
            {/* 1. هل تقبل الجامعة طلابًا دوليين؟ */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-[var(--mn-page)]/90 dark:from-[var(--mn-surface-elevated)] via-[var(--mn-surface)] dark:via-[var(--mn-surface-elevated)] to-[var(--mn-surface-muted)]/30 dark:to-[var(--mn-surface-muted)] border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] space-y-2.5 shadow-2xs mn-panel dark:mn-panel ">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[var(--mn-primary)]/10 dark:bg-[var(--mn-accent)]/20 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] flex items-center justify-center shrink-0">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs sm:text-[13px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] font-['Cairo',sans-serif]">
                  هل تقبل الجامعة طلابًا دوليين؟
                </span>
              </div>

              <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] dark:text-[var(--mn-text)] leading-relaxed pr-8 font-['Cairo',sans-serif]">
                {university.internationalAdmissions.acceptsDescription ||
                  (university.internationalAdmissions.acceptsInternationalStudents === true
                    ? `نعم، تقبل ${university.name} الطلاب الدوليين وفق متطلبات القبول الرسمية للجامعة.`
                    : university.internationalAdmissions.acceptsInternationalStudents === false
                      ? `لا تشير البيانات الحالية إلى قبول ${university.name} للطلاب الدوليين في هذه المرحلة.`
                      : 'حالة قبول الطلاب الدوليين غير محددة في البيانات الحالية.') }
              </p>
            </div>

            {/* 2. روابط وبوابات التقديم الرسمية المعتمدة (في مربع واحد موحد) */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] space-y-2.5 shadow-2xs mn-panel dark:mn-panel font-['Cairo',sans-serif]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-5.5 h-5.5 rounded-lg bg-[var(--mn-primary)]/10 dark:bg-[var(--mn-accent)]/20 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] flex items-center justify-center shrink-0">
                    <Globe2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11.5px] sm:text-xs font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] font-['Cairo',sans-serif]">
                    روابط وبوابات التقديم الرسمية المعتمدة
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[9.5px] font-bold text-[var(--mn-accent-text)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border border-[var(--mn-border-gold)]/60 dark:border-[var(--mn-border)] px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  مواقع معتمدة
                </span>
              </div>

              {/* شبكة بوابات التقديم الفرعية الموحدة */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                {/* 1. قبول البكالوريوس */}
                {university.internationalAdmissions.undergradAdmissionUrl && (
                  <a
                    href={university.internationalAdmissions.undergradAdmissionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] dark:hover:bg-[var(--mn-surface-muted)] rounded-xl p-2 sm:p-2.5 border border-[var(--mn-border-gold)]/50 dark:border-[var(--mn-border)] hover:border-[var(--mn-accent)] transition-all flex items-center justify-between gap-2 text-right mn-panel dark:mn-panel"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[var(--mn-primary)]/10 dark:bg-[var(--mn-accent)]/15 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <BookOpenCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-text)] group-hover:text-[var(--mn-accent-text)] transition-colors leading-tight truncate">
                          قبول البكالوريوس
                        </span>
                        <span className="text-[9px] font-medium text-[var(--mn-text-muted)] truncate mt-0.5">
                          شروط الدرجة الجامعية
                        </span>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-md bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] text-[var(--mn-text-muted)] group-hover:text-[var(--mn-accent-text)] flex items-center justify-center shrink-0 transition-colors">
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                  </a>
                )}

                {/* 2. قبول الدراسات العليا */}
                {university.internationalAdmissions.postgradAdmissionUrl && (
                  <a
                    href={university.internationalAdmissions.postgradAdmissionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] dark:hover:bg-[var(--mn-surface-muted)] rounded-xl p-2 sm:p-2.5 border border-[var(--mn-border-gold)]/50 dark:border-[var(--mn-border)] hover:border-[var(--mn-accent)] transition-all flex items-center justify-between gap-2 text-right mn-panel dark:mn-panel"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Scroll className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-text)] group-hover:text-[var(--mn-accent-text)] transition-colors leading-tight truncate">
                          قبول الدراسات العليا
                        </span>
                        <span className="text-[9px] font-medium text-[var(--mn-text-muted)] truncate mt-0.5">
                          الماجستير والدكتوراه
                        </span>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-md bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] text-[var(--mn-text-muted)] group-hover:text-[var(--mn-accent-text)] flex items-center justify-center shrink-0 transition-colors">
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                  </a>
                )}

                {/* 3. صفحة الطلاب الدوليين */}
                {university.internationalAdmissions.internationalStudentsUrl && (
                  <a
                    href={university.internationalAdmissions.internationalStudentsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] dark:hover:bg-[var(--mn-surface-muted)] rounded-xl p-2 sm:p-2.5 border border-[var(--mn-border-gold)]/50 dark:border-[var(--mn-border)] hover:border-[var(--mn-accent)] transition-all flex items-center justify-between gap-2 text-right mn-panel dark:mn-panel"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Compass className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-text)] group-hover:text-[var(--mn-accent-text)] transition-colors leading-tight truncate">
                          دليل الوافدين والتأشيرة
                        </span>
                        <span className="text-[9px] font-medium text-[var(--mn-text-muted)] truncate mt-0.5">
                          مكتب الطلاب الدوليين
                        </span>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-md bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] text-[var(--mn-text-muted)] group-hover:text-[var(--mn-accent-text)] flex items-center justify-center shrink-0 transition-colors">
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                  </a>
                )}

                {/* 4. بوابة التقديم الإلكتروني الرئيسية */}
                {university.internationalAdmissions.applicationPortalUrl && (
                  <a
                    href={university.internationalAdmissions.applicationPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] dark:hover:bg-[var(--mn-surface-muted)] rounded-xl p-2 sm:p-2.5 border border-[var(--mn-border-gold)]/60 dark:border-[var(--mn-accent)]/40 hover:border-[var(--mn-accent)] transition-all flex items-center justify-between gap-2 text-right mn-panel dark:mn-panel"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--mn-primary)] via-[var(--mn-accent)] to-[var(--mn-primary)] text-white dark:text-zinc-950 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-text)] group-hover:text-[var(--mn-accent-text)] transition-colors leading-tight">
                            بوابة التقديم الإلكتروني الرئيسية
                          </span>
                          <span className="inline-flex items-center text-[8px] font-bold text-white dark:text-zinc-950 bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] px-1 py-0.2 rounded shrink-0">
                            البوابة المباشرة
                          </span>
                        </div>
                        <span className="text-[9px] font-medium text-[var(--mn-text-muted)] truncate mt-0.5">
                          منصة التسجيل وإنشاء حساب الطالب بالجامعة
                        </span>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-md bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] text-[var(--mn-text-muted)] group-hover:text-[var(--mn-accent-text)] flex items-center justify-center shrink-0 transition-colors">
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                  </a>
                )}
              </div>

              {/* ملاحظة الأمان والتوثيق */}
              <div className="flex items-center justify-center gap-1.5 pt-1 text-[9.5px] font-medium text-[var(--mn-text-muted)]">
                <ShieldCheck className="w-3 h-3 text-[var(--mn-accent-text)] shrink-0" />
                <span>جميع البوابات تنقلك مباشرة إلى المنصات الرسمية المعتمدة للجامعة.</span>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* القسم الخامس: الرسوم الدراسية وتكاليف الدراسة */}
        {university.tuitionFees && (
          <div
            className="mn-detail-full-bleed relative bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border-y border-[var(--mn-border-brand)]/30 dark:border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/50 dark:shadow-none overflow-hidden mn-panel dark:mn-panel "
            dir="rtl"
          >
            {/* خط التزيين العلوي المتدرج */}
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

            <DetailSectionHeader
              id="university-tuition"
              icon={Landmark}
              title="5. الرسوم الدراسية وتكاليف الدراسة"
              className="mx-4 mt-4 sm:mx-5"
            />

            {/* المحتوى الداخلي لقسم الرسوم */}
            <div className="p-4 sm:p-5 space-y-4 font-['Cairo',sans-serif]">
              {/* بطاقة الرسوم السنوية العامة والعملة - تصميم عصري مدمج ومريح للهاتف */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] space-y-3 shadow-2xs relative overflow-hidden mn-panel dark:mn-panel font-['Cairo',sans-serif]">
                {/* رأس البطاقة */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[var(--mn-primary)]/10 dark:bg-[var(--mn-accent)]/20 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] flex items-center justify-center shrink-0">
                    <Landmark className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-[13px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] font-['Cairo',sans-serif]">
                    متوسط الرسوم السنوية العامة
                  </span>
                </div>

                {/* لوحة القيمة البارزة للرسوم متضمنة العملة المعتمدة على الجانب الأيسر */}
                {university.tuitionFees.annualAverageTuition && (
                  <div className="rounded-xl p-3 sm:p-3.5 bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border border-[var(--mn-border-gold)]/60 dark:border-[var(--mn-border)] shadow-2xs flex items-center justify-between gap-2.5 mn-panel dark:mn-panel">
                    {/* الجانب الأيمن: المبلغ البارز */}
                    <div className="text-xs sm:text-sm md:text-[15px] font-extrabold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] font-['Cairo',sans-serif] tracking-tight">
                      {university.tuitionFees.annualAverageTuition}
                    </div>

                    {/* الجانب الأيسر: شارة العملة على جنب */}
                    {university.tuitionFees.currency && (
                      <div className="bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border-gold)]/70 dark:border-[var(--mn-border)] rounded-xl py-1.5 px-2.5 flex items-center gap-1.5 shadow-2xs shrink-0">
                        <Coins className="w-3 h-3 text-[var(--mn-accent-text)]" />
                        <span className="text-[9.5px] sm:text-[10px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] whitespace-nowrap">
                          العملة: {university.tuitionFees.currency}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* الملاحظة التوضيحية التفصيلية للرسوم */}
                {university.tuitionFees.generalDescription && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--mn-page)]/60 dark:bg-[var(--mn-surface)]/60 border border-[var(--mn-border-gold)]/40 dark:border-[var(--mn-border)]/60">
                    <Info className="w-3.5 h-3.5 text-[var(--mn-accent-text)] shrink-0 mt-0.5" />
                    <p className="text-[10px] sm:text-[10.5px] font-medium text-[var(--mn-text-muted)] leading-relaxed font-['Cairo',sans-serif]">
                      {university.tuitionFees.generalDescription}
                    </p>
                  </div>
                )}
              </div>

              {/* شبكة رسوم التخصصات والمراحل الأكاديمية */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 pr-1">
                  <div className="w-6 h-6 rounded-full bg-[var(--mn-primary)]/5 dark:bg-[var(--mn-accent)]/10 border border-[var(--mn-accent)]/60 ring-2 ring-[var(--mn-focus)]/20 flex items-center justify-center shrink-0 shadow-2xs">
                    <Building2 className="w-3 h-3 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)]" />
                  </div>
                  <span className="text-[11.5px] sm:text-xs font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] leading-tight font-['Cairo',sans-serif]">
                    تفصيل الرسوم حسب الكلية والمرحلة
                  </span>
                </div>

                <div className="flex flex-col gap-2 pt-0.5">
                  {/* 1. رسوم البكالوريوس (المرحلة الجامعية) */}
                  {university.tuitionFees.undergradTuition && (
                    <div className="bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] rounded-xl border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] hover:border-[var(--mn-border-brand)] dark:hover:border-[var(--mn-accent)] p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all flex flex-row items-center justify-between gap-3 relative overflow-hidden group mn-panel dark:mn-panel ">
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="w-1.5 h-8 bg-gradient-to-b from-[var(--mn-primary)] to-[var(--mn-accent-soft)] rounded-full shrink-0 mn-inverse " />
                        <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-text)]">
                          رسوم البكالوريوس
                        </span>
                      </div>
                      <div className="bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border border-[var(--mn-border)] dark:border-[var(--mn-border)] rounded-lg py-1.5 px-3 flex items-center justify-center text-center shadow-2xs shrink-0 max-w-[55%] group-hover:border-[var(--mn-border-brand)]/30 dark:group-hover:border-[var(--mn-accent)]/50 transition-colors mn-panel dark:mn-panel ">
                        <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] dark:text-white">
                          {university.tuitionFees.undergradTuition}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2. رسوم البكالوريوس في الطب */}
                  {university.tuitionFees.medicineTuition && (
                    <div className="bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] rounded-xl border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] hover:border-[var(--mn-border-brand)] dark:hover:border-[var(--mn-accent)] p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all flex flex-row items-center justify-between gap-3 relative overflow-hidden group mn-panel dark:mn-panel ">
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="w-1.5 h-8 bg-gradient-to-b from-[var(--mn-primary)] to-[var(--mn-accent-soft)] rounded-full shrink-0 mn-inverse " />
                        <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-text)]">
                          رسوم كلية الطب
                        </span>
                      </div>
                      <div className="bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border border-[var(--mn-border)] dark:border-[var(--mn-border)] rounded-lg py-1.5 px-3 flex items-center justify-center text-center shadow-2xs shrink-0 max-w-[55%] group-hover:border-[var(--mn-border-brand)]/30 dark:group-hover:border-[var(--mn-accent)]/50 transition-colors mn-panel dark:mn-panel ">
                        <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] dark:text-white">
                          {university.tuitionFees.medicineTuition}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 3. رسوم الكليات الهندسية */}
                  {university.tuitionFees.engineeringTuition && (
                    <div className="bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] rounded-xl border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] hover:border-[var(--mn-border-brand)] dark:hover:border-[var(--mn-accent)] p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all flex flex-row items-center justify-between gap-3 relative overflow-hidden group mn-panel dark:mn-panel ">
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="w-1.5 h-8 bg-gradient-to-b from-[var(--mn-primary)] to-[var(--mn-accent-soft)] rounded-full shrink-0 mn-inverse " />
                        <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-text)]">
                          رسوم الكليات الهندسية
                        </span>
                      </div>
                      <div className="bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border border-[var(--mn-border)] dark:border-[var(--mn-border)] rounded-lg py-1.5 px-3 flex items-center justify-center text-center shadow-2xs shrink-0 max-w-[55%] group-hover:border-[var(--mn-border-brand)]/30 dark:group-hover:border-[var(--mn-accent)]/50 transition-colors mn-panel dark:mn-panel ">
                        <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] dark:text-white">
                          {university.tuitionFees.engineeringTuition}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 4. رسوم الدراسات العليا */}
                  {university.tuitionFees.postgradTuition && (
                    <div className="bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] rounded-xl border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] hover:border-[var(--mn-border-brand)] dark:hover:border-[var(--mn-accent)] p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all flex flex-row items-center justify-between gap-3 relative overflow-hidden group mn-panel dark:mn-panel ">
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="w-1.5 h-8 bg-gradient-to-b from-[var(--mn-primary)] to-[var(--mn-accent-soft)] rounded-full shrink-0 mn-inverse " />
                        <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-text)]">
                          رسوم الدراسات العليا
                        </span>
                      </div>
                      <div className="bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border border-[var(--mn-border)] dark:border-[var(--mn-border)] rounded-lg py-1.5 px-3 flex items-center justify-center text-center shadow-2xs shrink-0 max-w-[55%] group-hover:border-[var(--mn-border-brand)]/30 dark:group-hover:border-[var(--mn-accent)]/50 transition-colors mn-panel dark:mn-panel ">
                        <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] dark:text-white">
                          {university.tuitionFees.postgradTuition}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* زر رابط الرسوم الرسمي الممتد - بنفس التصميم المميز والأنيق */}
              {university.tuitionFees.officialTuitionUrl && (
                <div className="pt-2 pb-0.5 flex justify-center">
                  <a
                    href={university.tuitionFees.officialTuitionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500/10 via-cyan-600/15 to-indigo-600/10 hover:from-teal-500/20 hover:via-cyan-600/25 hover:to-indigo-600/20 text-teal-950 border border-teal-400/50 dark:from-amber-500/15 dark:via-yellow-500/20 dark:to-amber-600/15 dark:hover:from-amber-500/25 dark:hover:via-yellow-500/30 dark:hover:to-amber-600/25 dark:text-amber-200 dark:border-amber-400/50 shadow-2xs hover:shadow-xs transition-all duration-200 text-[10px] sm:text-[10.5px] font-bold font-['Cairo',sans-serif] group text-center"
                  >
                    <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-teal-600 via-cyan-700 to-indigo-800 text-white dark:from-amber-500 dark:via-yellow-500 dark:to-amber-600 dark:text-zinc-950 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform font-bold">
                      <Landmark className="w-2.5 h-2.5" />
                    </div>
                    <span>رابط جدول الرسوم والمصروفات الدراسية الرسمي للجامعة</span>
                    <ExternalLink className="w-2.5 h-2.5 text-cyan-700 dark:text-amber-300 group-hover:translate-x-[-2px] transition-transform" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* المنح الدراسية تأتي مباشرة بعد الرسوم لمساعدة الطالب على تقييم خيارات التمويل */}
        {university.scholarships && university.scholarships.length > 0 && (
          <section
            className="mn-detail-full-bleed relative bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border-y border-[var(--mn-border-brand)]/30 dark:border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/40 dark:shadow-none overflow-hidden mn-panel dark:mn-panel"
            dir="rtl"
            aria-labelledby="university-scholarships"
          >
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

            <div className="flex items-center justify-between mx-4 mt-4 sm:mx-5">
              <DetailSectionHeader
                id="university-scholarships"
                icon={Award}
                title="6. المنح الدراسية المتاحة"
                subtitle="المنح المرتبطة بالجامعة مع خيارات التمويل وشروط التقديم والمصادر الرسمية."
              />
              <span className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-bold text-[var(--mn-accent-text)] bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] px-2.5 py-1 rounded-full shrink-0">
                <GraduationCap className="w-3.5 h-3.5" />
                {university.scholarships.length} منح دراسية
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 p-3.5 sm:grid-cols-2 sm:gap-3 sm:p-4">
              {university.scholarships.map((scholarship, index) => (
                <article
                  key={scholarship.id}
                  className="group relative overflow-hidden rounded-2xl border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] hover:bg-[var(--mn-surface)] dark:hover:bg-[var(--mn-surface)] p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all hover:border-[var(--mn-accent)] flex flex-col justify-between mn-panel dark:mn-panel"
                >
                  <div>
                    {/* الصف العلوي: الأيقونة والعناوين والنوع */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                          <Award className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h3 className="text-[11.5px] sm:text-[12px] font-bold leading-snug text-[var(--mn-heading)] dark:text-white group-hover:text-[var(--mn-accent-text)] transition-colors truncate">
                            {scholarship.name}
                          </h3>
                          {scholarship.nameEn && (
                            <p className="text-[9px] font-medium text-[var(--mn-text-muted)] truncate" dir="ltr">
                              {scholarship.nameEn}
                            </p>
                          )}
                        </div>
                      </div>

                      {scholarship.type && (
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[8.5px] font-bold text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 shrink-0 whitespace-nowrap">
                          {scholarship.type}
                        </span>
                      )}
                    </div>

                    {/* الفئة المستهدفة */}
                    {scholarship.audience && (
                      <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-[var(--mn-border-gold)]/20 dark:border-[var(--mn-border)] text-[9.5px]">
                        <Users className="w-2.5 h-2.5 text-[var(--mn-accent-text)] shrink-0" />
                        <span className="font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] shrink-0 text-[9px]">
                          المستهدفون:
                        </span>
                        <span className="text-[var(--mn-text-muted)] font-medium truncate">
                          {scholarship.audience}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* أزرار الإجراءات المدمجة أسفل الكارت */}
                  <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-[var(--mn-border-gold)]/20 dark:border-[var(--mn-border)]">
                    {scholarship.platformScholarshipId ? (
                      <button
                        type="button"
                        onClick={() => onOpenScholarship?.(scholarship.platformScholarshipId!)}
                        className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[var(--mn-accent-text)] hover:underline cursor-pointer py-0.5"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>دليل المنحة</span>
                        <ChevronLeft className="w-2.5 h-2.5" />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-[var(--mn-text-muted)]">
                        <ShieldCheck className="w-2.5 h-2.5 text-[var(--mn-accent-text)]" />
                        <span>منحة معتمدة</span>
                      </span>
                    )}

                    <a
                      href={scholarship.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-[var(--mn-text-muted)] hover:text-[var(--mn-accent-text)] transition-colors py-0.5"
                    >
                      <span>المصدر الرسمي</span>
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <UniversityDecisionSections university={university} onOpenExam={onOpenExam} />

        {(contextualServices.length > 0 || (university.relatedArticles && university.relatedArticles.length > 0)) && (
          <section className="mx-4 sm:mx-5 mb-8 mt-2 rounded-2xl border border-[var(--mn-border-brand)]/30 dark:border-[var(--mn-border)] bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] shadow-md shadow-[var(--mn-shadow-ink)]/50 dark:shadow-none overflow-hidden mn-panel dark:mn-panel relative">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
            
            <div className="p-4 sm:p-5">
              {contextualServices.length > 0 && (
                <div className={university.relatedArticles && university.relatedArticles.length > 0 ? "mb-6 pb-6 border-b border-[var(--mn-border-brand)]/10 dark:border-[var(--mn-border)]" : ""}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[var(--mn-primary)]/10 text-[var(--mn-heading)] dark:bg-[var(--mn-accent)]/10 dark:text-[var(--mn-accent-text)]">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-bold text-[var(--mn-heading)]">خدمات قد تساعدك أثناء التقديم</h3>
                      <p className="text-[8.5px] font-medium text-[var(--mn-text-muted)] mt-0.5 leading-4">اقتراح سياقي فقط؛ لا يعني أن هذه الخدمات تابعة للجامعة أو معتمدة منها.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {contextualServices.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => onOpenService?.(service)}
                        className="group flex min-h-12 items-center gap-2.5 rounded-xl border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] px-3 py-2.5 text-right transition-colors hover:border-[var(--mn-accent)] dark:hover:border-[var(--mn-border-gold)] active:scale-[0.99] mn-panel dark:mn-panel shadow-2xs"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--mn-primary)]/10 dark:bg-[var(--mn-accent)]/10 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)]">
                          <GraduationCap className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[9.5px] font-bold text-[var(--mn-text)] dark:text-[var(--mn-text)] group-hover:text-[var(--mn-heading)] transition-colors">{service.title}</span>
                          <span className="mt-0.5 block truncate text-[8.5px] font-medium text-[var(--mn-text-muted)]">{service.category}</span>
                        </span>
                        <ChevronLeft className="h-4 w-4 shrink-0 text-[var(--mn-accent-text)] transition-transform group-hover:-translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {university.relatedArticles && university.relatedArticles.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[var(--mn-primary)]/10 text-[var(--mn-heading)] dark:bg-[var(--mn-accent)]/10 dark:text-[var(--mn-accent-text)]">
                      <BookOpenText className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-bold text-[var(--mn-heading)]">مقالات وأدلة مرتبطة</h3>
                      <p className="text-[8.5px] font-medium text-[var(--mn-text-muted)] mt-0.5 leading-4">محتوى تحريري يساعدك على فهم المتطلبات والسياق</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {university.relatedArticles.map((article) => (
                      <button
                        key={article.id}
                        type="button"
                        onClick={() => onOpenArticle?.(article.id)}
                        disabled={!onOpenArticle}
                        className="group flex flex-col justify-between rounded-xl border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] p-3.5 text-right transition-colors enabled:hover:border-[var(--mn-accent)] dark:enabled:hover:border-[var(--mn-border-gold)] enabled:active:scale-[0.99] mn-panel dark:mn-panel shadow-2xs h-full"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 text-[8px] font-bold text-[var(--mn-accent-text)] mb-2">
                            <span>{article.typeLabel || 'مقال'}</span>
                            {article.category && <span className="text-[var(--mn-text-muted)]">• {article.category}</span>}
                          </div>
                          <p className="text-[10px] sm:text-[10.5px] font-bold leading-5 text-[var(--mn-text)] group-hover:text-[var(--mn-heading)] transition-colors line-clamp-2">{article.title}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--mn-border-gold)]/50 dark:border-[var(--mn-border)]/50 pt-2.5">
                          {article.meta ? <p className="line-clamp-1 text-[8.5px] font-semibold text-[var(--mn-text-muted)]">{article.meta}</p> : <span />}
                          <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-[var(--mn-accent-text)] transition-transform group-hover:-translate-x-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

function UniversityDecisionSections({
  university,
  onOpenExam,
}: {
  university: University;
  onOpenExam?: (examId: string) => void;
}) {
  const language = university.languageRequirements;
  const documents = university.documentRequirements;
  const housing = university.housing;
  const livingCosts = university.livingCosts;
  const contacts = university.officialContacts;
  const dataTrust = university.dataTrust;

  return (
    <div className="mn-detail-full-bleed space-y-6" dir="rtl">
      {language && (
        <section
          className="mn-detail-full-bleed relative bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border-y border-[var(--mn-border-brand)]/30 dark:border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/50 dark:shadow-none overflow-hidden mn-panel dark:mn-panel "
          aria-labelledby="language-requirements"
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

          <CompactSectionHeader
            id="language-requirements"
            title="7. متطلبات اللغة"
            icon={<Languages className="h-4 w-4" />}
          />
          <div className="space-y-3 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2">
              <CompactFact label="هل توجد متطلبات لغة؟" value={language.required ? 'نعم' : 'لا'} />
              <CompactFact label="اللغة المطلوبة" value={language.languages.join('، ')} />
            </div>
            <div className="rounded-xl border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] p-3 mn-panel dark:mn-panel ">
              <p className="mb-2 text-[10px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)]">
                الاختبارات المقبولة
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(language.acceptedTestLinks?.length
                  ? language.acceptedTestLinks.map((link) => ({ label: link.label, examId: link.examId }))
                  : language.acceptedTests.map((label) => ({ label, examId: '' }))).map((test) => {
                  const className =
                    "rounded-lg border border-[var(--mn-accent)]/30 bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] px-2 py-0.5 text-[8.5px] sm:text-[9px] font-semibold text-[var(--mn-text)] dark:text-[var(--mn-text)] mn-panel dark:mn-panel tracking-normal";

                  return test.examId ? (
                    <button
                      type="button"
                      key={test.examId}
                      onClick={() => onOpenExam?.(test.examId)}
                      className={`${className} cursor-pointer transition-all hover:border-[var(--mn-accent)] hover:text-[var(--mn-heading)]`}
                      title={`افتح صفحة ${test.label}`}
                    >
                      {test.label}
                    </button>
                  ) : (
                    <span key={test.label} className={className}>
                      {test.label}
                    </span>
                  );
                })}
              </div>
            </div>
            <OfficialInfoLink
              href={language.officialUrl}
              label="متطلبات اللغة الرسمية"
              icon={<Languages className="w-2.5 h-2.5" />}
            />
          </div>
        </section>
      )}

      {documents && (
        <section
          className="mn-detail-full-bleed relative bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border-y border-[var(--mn-border-brand)]/30 dark:border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/50 dark:shadow-none overflow-hidden mn-panel dark:mn-panel "
          aria-labelledby="required-documents-title"
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

          <CompactSectionHeader
            id="required-documents-title"
            title="8. الوثائق المطلوبة"
            icon={<FileText className="h-4 w-4" />}
          />
          <div className="space-y-3 p-4 sm:p-5">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <DocumentList title="الوثائق العامة المطلوبة" items={documents.generalDocuments} />
              <DocumentList
                title="متطلبات إضافية للدراسات العليا"
                items={documents.graduateAdditionalDocuments}
              />
            </div>
            <OfficialInfoLink
              href={documents.officialUrl}
              label="دليل الوثائق والمستندات الرسمي"
              icon={<FileText className="w-2.5 h-2.5" />}
            />
          </div>
        </section>
      )}

      {housing && (
        <section
          className="mn-detail-full-bleed relative bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border-y border-[var(--mn-border-brand)]/30 dark:border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/50 dark:shadow-none overflow-hidden mn-panel dark:mn-panel "
          aria-labelledby="university-housing"
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

          <CompactSectionHeader
            id="university-housing"
            title="9. السكن الجامعي"
            icon={<Building2 className="h-4 w-4" />}
          />
          <div className="space-y-3 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <CompactFact label="هل يتوفر سكن؟" value={housing.available ? 'نعم' : 'لا'} />
              <CompactFact
                label="الطلاب الدوليون"
                value={housing.internationalStudentsEligible ? 'مؤهلون' : 'غير مؤهلين'}
              />
              <CompactFact label="التكلفة النموذجية" value={housing.typicalCost} />
              <CompactFact label="العملة" value={housing.currency} />
            </div>
            {housing.officialUrl && (
              <OfficialInfoLink
                href={housing.officialUrl}
                label="دليل ومعلومات السكن الجامعي الرسمي"
                icon={<Building2 className="w-2.5 h-2.5" />}
              />
            )}
          </div>
        </section>
      )}

      {livingCosts && (
        <section
          className="mn-detail-full-bleed relative bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border-y border-[var(--mn-border-brand)]/30 dark:border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/50 dark:shadow-none overflow-hidden mn-panel dark:mn-panel "
          aria-labelledby="university-living-costs-title"
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

          <CompactSectionHeader
            id="university-living-costs-title"
            title="10. تكاليف المعيشة"
            icon={<Banknote className="h-4 w-4" />}
          />
          <div className="space-y-2.5 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2">
              <CompactFact label="التكلفة الشهرية التقديرية" value={livingCosts.monthlyEstimate} />
              <CompactFact label="العملة" value={livingCosts.currency} />
            </div>
            <p className="rounded-xl border border-[var(--mn-border-gold)] bg-[var(--mn-surface-muted)] px-3 py-2 text-[9.5px] font-semibold leading-4 text-[var(--mn-text-muted)] dark:border-[var(--mn-border)] dark:bg-[var(--mn-surface-elevated)] dark:text-[var(--mn-text-muted)] mn-panel dark:mn-panel ">
              {livingCosts.variationNote}
            </p>
            {livingCosts.officialUrl && (
              <OfficialInfoLink
                href={livingCosts.officialUrl}
                label="تفاصيل ودليل تكاليف المعيشة الرسمية"
                icon={<Banknote className="w-2.5 h-2.5" />}
              />
            )}
          </div>
        </section>
      )}

      {contacts && (
        <section
          className="mn-detail-full-bleed relative bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border-y border-[var(--mn-border-brand)]/30 dark:border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/50 dark:shadow-none overflow-hidden mn-panel dark:mn-panel "
          aria-labelledby="university-contacts"
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

          <CompactSectionHeader
            id="university-contacts"
            title="11. التواصل والروابط الرسمية"
            icon={<Phone className="h-4 w-4" />}
          />
          <div className="mn-detail-small-grid p-4 sm:p-5">
            {contacts.phone && (
              <ReferenceLink
                href={`tel:${contacts.phone.replace(/\s/g, '')}`}
                label="الهاتف الرسمي"
                value={contacts.phone}
              />
            )}
            <ReferenceLink
              href={contacts.officialWebsite}
              label="الموقع الرسمي"
              value={getUrlDisplayHost(contacts.officialWebsite)}
            />
            {contacts.mainSocial && (
              <ReferenceLink
                href={contacts.mainSocial.url}
                label="التواصل الاجتماعي"
                value={contacts.mainSocial.label}
                icon={<Share2 className="h-3.5 w-3.5" />}
              />
            )}
            {contacts.governmentRegister && (
              <ReferenceLink
                href={contacts.governmentRegister.url}
                label="الجهة الرسمية"
                value={contacts.governmentRegister.label}
              />
            )}
            {contacts.usefulLinks?.map((link) => (
              <ReferenceLink
                key={link.url}
                href={link.url}
                label="رابط رسمي مفيد"
                value={link.label}
              />
            ))}
          </div>
        </section>
      )}

      {dataTrust && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[var(--mn-primary)] px-4 py-2.5 text-[9px] font-bold text-[var(--mn-on-dark-muted)] mn-inverse ">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--mn-accent-text)]" />
            آخر تحقق من البيانات: {dataTrust.lastVerified}
          </span>
          <span className="hidden h-3 w-px bg-white/25 sm:block" />
          <a
            href={dataTrust.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--mn-accent-text)] underline-offset-2 hover:underline"
          >
            المصدر: {dataTrust.sourceLabel}
          </a>
        </div>
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
}: {
  href: string;
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={href.startsWith('tel:') ? undefined : '_blank'}
      rel={href.startsWith('tel:') ? undefined : 'noopener noreferrer'}
      className="group flex min-h-12 items-center gap-2 rounded-xl border border-[var(--mn-border-gold)] bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] px-3 py-2 transition-colors hover:border-[var(--mn-accent)] dark:border-[var(--mn-border)] mn-panel dark:mn-panel "
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--mn-primary)]/10 text-[var(--mn-heading)] dark:bg-[var(--mn-accent)]/10 dark:text-[var(--mn-accent-text)]">
        {icon ?? <ExternalLink className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[8.5px] font-bold text-[var(--mn-accent-text)] dark:text-[var(--mn-accent-text)]">
          {label}
        </span>
        <span className="block text-[9.5px] font-bold leading-4 text-[var(--mn-text)] group-hover:text-[var(--mn-heading)] dark:text-[var(--mn-text)]">
          {value}
        </span>
      </span>
    </a>
  );
}

function CompactSectionHeader({
  id,
  title,
  icon,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
}) {
  return <DetailSectionHeader id={id} iconNode={icon} title={title} className="px-4 pt-4 sm:px-5" />;
}

function CompactFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] px-2.5 py-2.5 shadow-2xs mn-panel dark:mn-panel ">
      <span className="block text-[9px] font-bold text-[var(--mn-accent-text)] dark:text-[var(--mn-accent-text)]">
        {label}
      </span>
      <span className="mt-1 block text-[10px] sm:text-[10.5px] font-bold leading-4 text-[var(--mn-text)] dark:text-[var(--mn-text)]">
        {value}
      </span>
    </div>
  );
}

function DocumentList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-[var(--mn-border-gold)] dark:border-[var(--mn-border)] bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] p-3 mn-panel dark:mn-panel ">
      <h3 className="mb-2 text-[10px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)]">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-1.5 text-[9.5px] sm:text-[10px] font-semibold leading-4 text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)]"
          >
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[var(--mn-accent-text)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
    <div className="pt-2 pb-0.5 flex justify-center">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500/10 via-cyan-600/15 to-indigo-600/10 hover:from-teal-500/20 hover:via-cyan-600/25 hover:to-indigo-600/20 text-teal-950 border border-teal-400/50 dark:from-amber-500/15 dark:via-yellow-500/20 dark:to-amber-600/15 dark:hover:from-amber-500/25 dark:hover:via-yellow-500/30 dark:hover:to-amber-600/25 dark:text-amber-200 dark:border-amber-400/50 shadow-2xs hover:shadow-xs transition-all duration-200 text-[10px] sm:text-[10.5px] font-bold font-['Cairo',sans-serif] group text-center"
      >
        <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-teal-600 via-cyan-700 to-indigo-800 text-white dark:from-amber-500 dark:via-yellow-500 dark:to-amber-600 dark:text-zinc-950 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform font-bold">
          {icon ?? <FileText className="w-2.5 h-2.5" />}
        </div>
        <span>{label}</span>
        <ExternalLink className="w-2.5 h-2.5 text-cyan-700 dark:text-amber-300 group-hover:translate-x-[-2px] transition-transform" />
      </a>
    </div>
  );
}
