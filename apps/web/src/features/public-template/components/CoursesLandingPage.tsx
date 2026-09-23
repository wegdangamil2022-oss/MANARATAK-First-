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

function CoursePathCard({ title, eyebrow, description, icon: Icon, features, cta, isRestricted, onClick }: CoursePathCardProps) {
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
      className="bg-[var(--mn-surface)] rounded-2xl border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] dark:hover:border-[#D6A43B] shadow-sm hover:shadow-md transition-all relative overflow-hidden group mn-panel text-right cursor-pointer select-none w-full block active:scale-[0.99]"
    >
      {/* Prominent Golden Top Line (خط ذهبي واضح أعلى كل بطاقة) */}
      <div className="h-1 sm:h-1.5 w-full bg-gradient-to-r from-[#D6A43B] via-[#F3CE74] to-[#D6A43B] shadow-2xs" />

      {/* Subtle Right Hover Strip */}
      <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-[#142B5F] dark:from-[#D6A43B] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-3.5 sm:p-4 space-y-3">
        {/* Centered Title & Icon Header with Golden Line Underneath */}
        <div className="flex flex-col items-center justify-center text-center gap-2 pt-1">
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-full p-0.5 bg-gradient-to-tr from-[var(--mn-accent)] via-[var(--mn-accent)] to-[var(--mn-hero-secondary)] shadow-xs shrink-0 flex items-center justify-center mn-gold">
              <div className="w-full h-full rounded-full overflow-hidden bg-[var(--mn-primary)] border border-white/40 flex items-center justify-center text-white shadow-inner">
                <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#E5B54F]" />
              </div>
            </div>

            <h3 className="text-[15.5px] sm:text-base font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif] leading-tight group-hover:text-[var(--mn-primary)] dark:group-hover:text-[var(--mn-accent)] transition-colors">
              {title}
            </h3>

            {isRestricted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-600 dark:text-[#E5B54F]">
                <Lock className="w-2.5 h-2.5" />
                <span>غير متاح</span>
              </span>
            )}
          </div>

          {/* Golden Line Under Title */}
          <div className="flex items-center justify-center gap-2 w-full pt-0.5 pb-1">
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-[#D6A43B] dark:to-[#E5B54F]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#D6A43B] dark:bg-[#E5B54F] shadow-xs" />
            <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-[#D6A43B] dark:to-[#E5B54F]" />
          </div>
        </div>

        {/* Middle: Balanced & Clear Description */}
        <p className="text-[11.5px] sm:text-xs text-[var(--mn-text-muted)] font-medium leading-5 text-right">
          {description}
        </p>

        {/* Feature Tags List in Vertical Layout (ألوان هادئة وغامقة ومريحة للعين) */}
        <div className="space-y-1 pt-0.5">
          {features.map(({ label, icon: FeatureIcon }) => (
            <div
              key={label}
              className="rounded-lg sm:rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-slate-900/50 px-2.5 py-1 flex items-center gap-2 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] transition-colors"
            >
              <FeatureIcon className="w-3.5 h-3.5 shrink-0 text-[#142B5F] dark:text-[#E5B54F]" />
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>

        {/* Bottom Action Button (استكشف الدورات) */}
        <div className="pt-2 border-t border-[var(--mn-border)]/50 dark:border-white/10">
          <button
            type="button"
            className="w-full bg-[var(--mn-primary)] hover:bg-[#1a3777] text-white rounded-xl py-2 px-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-2xs mn-inverse hover:mn-inverse group/btn"
            data-mn-design="8bba664dec"
          >
            <span>{cta}</span>
            <ChevronLeft className="w-3.5 h-3.5 text-white/90 group-hover/btn:-translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const CoursesLandingPage: React.FC<CoursesLandingPageProps> = ({ onBack, onOpenTrack, onRestrictedTrack }) => {
  return (
    <div
      className="min-h-screen bg-[var(--mn-page)] text-[var(--mn-heading)] pb-24 font-['Cairo',sans-serif] select-none mn-panel "
      dir="rtl"
    >
      {/* ========================================================================= */}
      {/* HERO BANNER - AUTHENTIC MANARATAK FULL WIDTH WITH GOLD ACCENTS            */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3.5 sm:px-6 pt-4 pb-4 overflow-hidden shadow-xs mn-inverse w-full">
        {/* Top-Right Circular Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-30 cursor-pointer text-white shadow-xs active:scale-95"
            title="العودة"
            aria-label="العودة"
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
            {/* Minaret 1 */}
            <rect x="140" y="50" width="16" height="150" />
            <polygon points="148,25 138,50 158,50" />
            <circle cx="148" cy="20" r="3" />
            {/* Dome */}
            <path d="M 80,130 Q 115,70 150,130 Z" />
            <circle cx="115" cy="65" r="4" />
            {/* Minaret 2 */}
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

        <div className="max-w-md sm:max-w-xl mx-auto relative z-10 space-y-3 pt-1 text-center sm:text-right">
          {/* Top Pill / Badge */}
          <div className="flex items-center justify-center sm:justify-start">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-accent-text)] shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[var(--mn-accent-text)]" />
              <span>مسارات التعلم والتطوير المهني</span>
            </span>
          </div>

          {/* Main Header with Royal Icon */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-3.5">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl p-0.5 bg-gradient-to-tr from-[#B38018] via-[#F2CD78] to-[#B38018] shrink-0 flex items-center justify-center shadow-md">
              <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-[#10224D] to-[#0A173B] border border-white/20 flex items-center justify-center text-white shadow-inner">
                <BookOpen className="w-5.5 h-5.5 sm:w-6 sm:h-6 text-[#F2CD78]" />
              </div>
            </div>

            <div className="space-y-1 sm:space-y-1.5 flex-1 text-center sm:text-right">
              <h1 className="text-lg sm:text-xl mn-font-emphasis text-white leading-tight font-['Cairo',sans-serif] tracking-tight">
                دليل <span className="text-[var(--mn-accent-text)]">الدورات والبرامج التدريبية</span>
              </h1>
              <p className="text-[11.5px] sm:text-[12px] leading-relaxed text-white/90 font-medium max-w-xl font-['Cairo',sans-serif]">
                اختر المسار التدريبي المناسب لأهدافك، واستكشف مئات الدورات العالمية المعتمدة، وبرامج منارتك التفاعلية، والماستر كلاس المتقدم، مع أدوات بحث وتصفية متكاملة.
              </p>
            </div>
          </div>

          {/* Micro Feature Pillars / Highlights */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/15 text-right">
            <div className="rounded-xl bg-white/[0.08] border border-white/15 backdrop-blur-xs p-2 flex flex-col sm:flex-row items-center sm:items-center gap-1.5 text-center sm:text-right">
              <div className="w-6 h-6 rounded-lg bg-[#F2CD78]/20 flex items-center justify-center shrink-0">
                <Globe2 className="w-3.5 h-3.5 text-[#F2CD78]" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-white/95 leading-tight">
                منصات عالمية
              </span>
            </div>

            <div className="rounded-xl bg-white/[0.08] border border-white/15 backdrop-blur-xs p-2 flex flex-col sm:flex-row items-center sm:items-center gap-1.5 text-center sm:text-right">
              <div className="w-6 h-6 rounded-lg bg-[#F2CD78]/20 flex items-center justify-center shrink-0">
                <Award className="w-3.5 h-3.5 text-[#F2CD78]" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-white/95 leading-tight">
                شهادات معتمدة
              </span>
            </div>

            <div className="rounded-xl bg-white/[0.08] border border-white/15 backdrop-blur-xs p-2 flex flex-col sm:flex-row items-center sm:items-center gap-1.5 text-center sm:text-right">
              <div className="w-6 h-6 rounded-lg bg-[#F2CD78]/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-[#F2CD78]" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-white/95 leading-tight">
                تتبع التقدم
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md sm:max-w-xl mx-auto mn-inline-gutter pt-3 sm:pt-4 space-y-3 sm:space-y-3.5">

        {/* Course Path Cards */}
        <div className="space-y-3.5 sm:space-y-4">
          <CoursePathCard
            title="الدورات العالمية"
            description="استكشف مئات الدورات والبرامج المعتمدة التي تجمعها لك منصة منارتك من كبرى الجامعات والمنصات التعليمية العالمية، مع توجيهك المباشر للتسجيل والدراسة من المصدر الرسمي بكل موثوقية."
            icon={Globe2}
            isRestricted={false}
            features={[
              { label: 'منصات عالمية', icon: Layers3 },
              { label: 'شهادات معتمدة', icon: BadgeCheck },
              { label: 'مصدر رسمي', icon: ExternalLink },
            ]}
            cta="استكشف الدورات"
            onClick={() => onOpenTrack?.('imported')}
          />

          <CoursePathCard
            title="دورات منارتك"
            description="برامج تعليمية ودورات تدريبية متكاملة مصممة ومبنية حصرياً داخل منصة منارتك، مقسمة إلى وحدات وفصول تفاعلية مع حفظ تقدمك الأكاديمي أولاً بأول وتوفير شهادات إتمام رقمية."
            icon={GraduationCap}
            features={[
              { label: 'وحدات تفاعلية', icon: BookOpenCheck },
              { label: 'حفظ التقدم', icon: TrendingUp },
              { label: 'شهادة إنجاز', icon: Award },
            ]}
            cta="استكشف الدورات"
            onClick={() => onOpenTrack?.('native')}
          />

          <CoursePathCard
            title="الدورات المدفوعة"
            description="مسار مخصص للبرامج التدريبية الاحترافية والماستر كلاس المتقدم، يقدم لك تفاصيل شفافة لرسوم الاشتراك والمميزات الحصرية وإمكانية معاينة محاور الدورة ونبذة المدربين قبل الانضمام."
            icon={CreditCard}
            isRestricted={false}
            features={[
              { label: 'تسعير واضح', icon: Tag },
              { label: 'مستوى متقدم', icon: Sparkles },
              { label: 'ضمان الوصول', icon: ShieldCheck },
            ]}
            cta="استكشف الدورات"
            onClick={() => onOpenTrack?.('paid')}
          />
        </div>
      </div>
    </div>
  );
}
