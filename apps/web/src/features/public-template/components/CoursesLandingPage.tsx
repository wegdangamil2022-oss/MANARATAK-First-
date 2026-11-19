import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  BookOpen,
  BookOpenCheck,
  Briefcase,
  ChevronLeft,
  CreditCard,
  ExternalLink,
  Globe2,
  GraduationCap,
  Layers3,
  Lock,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingUp,
} from 'lucide-react';

type CourseTrack = 'imported' | 'native' | 'paid';

type PathFeature = {
  label: string;
  icon: React.ElementType;
};

interface CoursesLandingPageProps {
  onBack?: () => void;
  onOpenTrack?: (track: CourseTrack) => void;
  onRestrictedTrack?: () => void;
}

interface CoursePathCardProps {
  title: string;
  eyebrow?: string;
  badge?: string;
  description: string;
  icon: React.ElementType;
  features: PathFeature[];
  footer?: string;
  cta: string;
  isRestricted?: boolean;
  onClick?: () => void;
}

function CoursePathCard({ title, description, icon: Icon, features, cta, isRestricted, onClick }: CoursePathCardProps) {
  const { t: publicT } = usePublicTemplateTranslation();

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      onClick={onClick}
      className="bg-[var(--mn-surface)] rounded-2xl border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] dark:hover:border-[#D6A43B] shadow-sm hover:shadow-md transition-all relative overflow-hidden group mn-panel text-start cursor-pointer select-none w-full h-full flex flex-col active:scale-[0.99]"
    >
      {/* Prominent Navy Top Line (خط نيلي واضح أعلى كل بطاقة) */}
      <div className="h-[3px] w-full bg-[#142B5F] shadow-2xs shrink-0" />

      {/* Subtle Right Hover Strip */}
      <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#142B5F] dark:from-[#D6A43B] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-3 sm:p-3.5 md:p-5 space-y-2 md:space-y-3 flex-1 flex flex-col justify-between">
        {/* Centered Title & Icon Header with Golden Line Underneath */}
        <div className="flex flex-col items-center justify-center text-center gap-1.5 pt-0.5">
          <div className="flex items-center justify-center gap-2">
            <div className="w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 rounded-full p-0.5 bg-gradient-to-tr from-[var(--mn-accent)] via-[var(--mn-accent)] to-[var(--mn-hero-secondary)] shadow-xs shrink-0 flex items-center justify-center mn-gold">
              <div className="w-full h-full rounded-full overflow-hidden bg-[var(--mn-primary)] border border-white/40 flex items-center justify-center text-white shadow-inner">
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E5B54F]" />
              </div>
            </div>

            <h3 className="text-[14.5px] sm:text-[15.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif] leading-tight group-hover:text-[var(--mn-primary)] dark:group-hover:text-[var(--mn-accent)] transition-colors">
              {title}
            </h3>

            {isRestricted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-600 dark:text-[#E5B54F]">
                <Lock className="w-2.5 h-2.5" />
                <span>{publicT('public_unavailable')}</span>
              </span>
            )}
          </div>

          {/* Golden Line Under Title */}
          <div className="flex items-center justify-center gap-2 w-full pt-0.5">
            <div className="w-14 h-0.5 bg-gradient-to-r from-transparent to-[#D6A43B] dark:to-[#E5B54F]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#D6A43B] dark:bg-[#E5B54F] shadow-xs" />
            <div className="w-14 h-0.5 bg-gradient-to-l from-transparent to-[#D6A43B] dark:to-[#E5B54F]" />
          </div>
        </div>

        {/* Middle: Balanced & Clear Description */}
        <p className="text-[11px] sm:text-[11.5px] text-[var(--mn-text-muted)] font-semibold leading-5 text-start line-clamp-2 font-['Cairo',sans-serif]">
          {description}
        </p>

        {/* Feature Tags List in Vertical Layout (أيقونات باللون البترولي الأفق) */}
        <div className="space-y-1 pt-0.5">
          {features.map(({ label, icon: FeatureIcon }) => (
            <div
              key={label}
              className="rounded-lg sm:rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-slate-900/50 px-2.5 py-1 flex items-center gap-2 text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif] transition-colors"
            >
              <FeatureIcon className="w-3.5 h-3.5 shrink-0 text-[#0E7C86] dark:text-[#38C6D4]" />
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>

        {/* Bottom Action Button (استكشف الدورات باللون الذهبي) */}
        <div className="pt-1.5 border-t border-[var(--mn-border)]/50 dark:border-white/10">
          <button
            type="button"
            className="w-full bg-[var(--mn-primary)] hover:bg-[#1a3777] text-[#F2CD78] rounded-xl py-1.5 md:py-2.5 px-3.5 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-2xs mn-inverse hover:mn-inverse group/btn font-['Cairo',sans-serif]"
            data-mn-design="8bba664dec"
          >
            <span className="text-[11px] sm:text-[11.5px] font-bold text-[#F2CD78] font-['Cairo',sans-serif]">{cta}</span>
            <ChevronLeft className="w-3.5 h-3.5 text-[#F2CD78] group-hover/btn:-translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const CoursesLandingPage: React.FC<CoursesLandingPageProps> = ({ onBack, onOpenTrack }) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  return (
    <div
      className="min-h-screen bg-[var(--mn-page)] text-[var(--mn-heading)] pb-24 font-['Cairo',sans-serif] select-none mn-panel "
      dir={publicDir}
    >
      {/* ========================================================================= */}
      {/* HERO BANNER - BALANCED HEIGHT MATCHING OTHER SEARCH SECTIONS              */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-5 pb-4.5 sm:pt-6 sm:pb-5 overflow-hidden shadow-xs mn-inverse w-full">
        {/* Top-Right Circular Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-30 cursor-pointer text-white shadow-xs active:scale-95"
            title={publicT('public_back')}
            aria-label={publicT('public_back')}
          >
            <ChevronLeft className="w-4 h-4 rotate-180 text-white" />
          </button>
        )}

        {/* Background Decorative Mosque Silhouettes, Dot Grid & Gold Arcs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Top-left dot grid */}
          <div className="absolute top-3 left-5 grid grid-cols-5 gap-1.5 opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[var(--mn-accent)] mn-gold" />
            ))}
          </div>

          {/* Thin gold curved orbital line on left */}
          <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full border border-[var(--mn-accent)]/25 pointer-events-none" />
          <div className="absolute -top-6 -left-6 w-72 h-72 rounded-full border border-[var(--mn-accent)]/15 pointer-events-none" />

          {/* Mosque / Architectural silhouette on right in dark shade */}
          <svg
            className="absolute -right-4 bottom-0 h-40 w-40 text-white/10 pointer-events-none"
            viewBox="0 0 200 200"
            fill="currentColor"
          >
            <rect x="140" y="50" width="16" height="150" />
            <polygon points="148,25 138,50 158,50" />
            <circle cx="148" cy="20" r="3" />
            <path d="M 80,130 Q 115,70 150,130 Z" />
            <circle cx="115" cy="65" r="4" />
            <rect x="70" y="80" width="12" height="120" />
            <polygon points="76,60 68,80 84,80" />
          </svg>

          {/* Lower Curved Gold Swirl */}
          <svg
            className="absolute bottom-0 inset-x-0 w-full h-12 opacity-30"
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

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-2.5 md:space-y-3 pt-1.5">
          {/* Top 4-pointed Gold Sparkle Star */}
          <div className="flex justify-center">
            <Sparkles className="h-5 w-5 text-[var(--mn-accent-text)] drop-shadow-[0_0_8px_rgba(214,164,59,0.8)]" aria-hidden="true" />
          </div>

          {/* Main Header with Small Right-Side Icon before دليل الدورات */}
          <div className="space-y-1">
            <div className="inline-flex items-center justify-center gap-2">
              <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-xl p-0.5 bg-gradient-to-tr from-[#B38018] via-[#F2CD78] to-[#B38018] shrink-0 flex items-center justify-center shadow-sm">
                <div className="w-full h-full rounded-[10px] bg-gradient-to-br from-[#10224D] to-[#0A173B] border border-white/20 flex items-center justify-center text-white shadow-inner">
                  <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-[#F2CD78]" />
                </div>
              </div>

              <h1 className="text-lg sm:text-xl md:text-3xl font-bold text-white leading-tight font-['Cairo',sans-serif] tracking-tight">
                {publicDir === 'rtl' ? (
                  <>
                    <span className="text-white">دليل الدورات</span>{' '}
                    <span className="text-[var(--mn-accent-text)]">والبرامج التدريبية</span>
                  </>
                ) : (
                  <>
                    <span className="text-white">{publicT('public_directory_of')}</span>{' '}
                    <span className="text-[var(--mn-accent-text)]">{publicT('public_courses_and_training_programs')}</span>
                  </>
                )}
              </h1>
            </div>

            {/* Small Gold Horizontal Divider */}
            <div className="flex justify-center pt-1.5 pb-1">
              <div className="w-10 md:w-14 h-0.5 bg-[var(--mn-accent)] rounded-full mn-gold" />
            </div>

            <p className="text-[11px] sm:text-xs md:text-sm text-white font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto line-clamp-2">
              {publicT('public_choose_a_training_path_that_fits_your_goals')}
            </p>
          </div>
        </div>

        {/* White Feature Boxes (منصات عالمية • شهادات معتمدة • تتبع التقدم) */}
        <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto mn-inline-gutter mt-4 relative z-20 pb-0.5">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 md:gap-3.5">
            <div className="bg-[var(--mn-surface)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 rounded-xl sm:rounded-2xl px-1.5 py-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] h-[54px] sm:h-[60px] mn-panel">
              <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-bold text-[10px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <Globe2 className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="whitespace-nowrap">{publicT('public_global_platforms')}</span>
              </div>
            </div>

            <div className="bg-[var(--mn-surface)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 rounded-xl sm:rounded-2xl px-1.5 py-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] h-[54px] sm:h-[60px] mn-panel">
              <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-bold text-[10px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <Award className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="whitespace-nowrap">{publicT('public_accredited_certificates')}</span>
              </div>
            </div>

            <div className="bg-[var(--mn-surface)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 rounded-xl sm:rounded-2xl px-1.5 py-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] h-[54px] sm:h-[60px] mn-panel">
              <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-bold text-[10px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <TrendingUp className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="whitespace-nowrap">{publicT('public_progress_tracking')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gold Divider Ribbon Line */}
      <div className="w-full h-0.5 bg-gradient-to-r from-[var(--mn-accent-text)] via-[var(--mn-accent-soft)] to-[var(--mn-accent-text)] shadow-xs mb-1" />

      <div className="max-w-md sm:max-w-xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto mn-inline-gutter pt-2.5 sm:pt-3 md:pt-5 space-y-2.5 sm:space-y-3">
        {/* Course Path Cards */}
        <div className="space-y-2.5 sm:space-y-3 md:space-y-0 md:grid md:grid-cols-3 md:gap-5 items-stretch">
          <CoursePathCard
            title={publicT('public_global_courses')}
            description="استكشف مئات الدورات والبرامج المعتمدة التي تجمعها لك منصة منارتك من كبرى الجامعات والمنصات التعليمية العالمية، مع توجيهك المباشر للتسجيل والدراسة من المصدر الرسمي بكل موثوقية."
            icon={Globe2}
            isRestricted={false}
            features={[
              { label: publicT('public_global_platforms'), icon: Layers3 },
              { label: publicT('public_accredited_certificates'), icon: BadgeCheck },
              { label: publicT('public_official_source_2'), icon: ExternalLink },
            ]}
            cta="استكشف الدورات"
            onClick={() => onOpenTrack?.('imported')}
          />

          <CoursePathCard
            title={publicT('public_manaratak_courses')}
            description="برامج تعليمية ودورات تدريبية متكاملة مصممة ومبنية حصرياً داخل منصة منارتك، مقسمة إلى وحدات وفصول تفاعلية مع حفظ تقدمك الأكاديمي أولاً بأول وتوفير شهادات إتمام رقمية."
            icon={GraduationCap}
            features={[
              { label: publicT('public_interactive_modules'), icon: BookOpenCheck },
              { label: publicT('public_save_progress'), icon: TrendingUp },
              { label: publicT('public_completion_certificate'), icon: Award },
            ]}
            cta="استكشف الدورات"
            onClick={() => onOpenTrack?.('native')}
          />

          <CoursePathCard
            title={publicT('public_paid_courses')}
            description="مسار مخصص للبرامج التدريبية الاحترافية والماستر كلاس المتقدم، يقدم لك تفاصيل شفافة لرسوم الاشتراك والمميزات الحصرية وإمكانية معاينة محاور الدورة ونبذة المدربين قبل الانضمام."
            icon={CreditCard}
            isRestricted={false}
            features={[
              { label: publicT('public_clear_pricing'), icon: Tag },
              { label: publicT('public_advanced_level'), icon: Sparkles },
              { label: publicT('public_access_guarantee'), icon: ShieldCheck },
            ]}
            cta="استكشف الدورات"
            onClick={() => onOpenTrack?.('paid')}
          />
        </div>
      </div>
    </div>
  );
}
