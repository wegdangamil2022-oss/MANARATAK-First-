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
      className="bg-white dark:bg-[#111E38] rounded-2xl border border-[#142B5F]/12 dark:border-white/10 hover:border-[#0E7C86]/45 dark:hover:border-[#38C6D4]/45 shadow-[0_4px_16px_rgba(20,43,95,0.04)] hover:shadow-[0_8px_24px_rgba(20,43,95,0.09)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.28)] transition-all duration-150 relative overflow-hidden group mn-panel cursor-pointer select-none w-full h-full flex flex-col active:scale-[0.985]"
    >
      {/* Subtle Official Top Hairline */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#142B5F]/32 dark:via-[#D6A43B]/38 to-transparent"
      />

      <div className="p-3.5 sm:p-4 md:p-5 space-y-2.5 flex-1 flex flex-col justify-between">
        {/* Centered Header: Official Navy #142B5F Icon Box with Geometric Gold Corner + Title + Thin Petrol Underline */}
        <div className="relative flex flex-col items-center text-center gap-2 pt-0.5 w-full">
          {isRestricted && (
            <span className="absolute top-0 left-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F6F8FA] dark:bg-[#0B1529] border border-[#142B5F]/15 text-[10px] font-bold text-[#5C707C] dark:text-[#F2CD78] shrink-0">
              <Lock className="w-2.5 h-2.5" />
              <span>{publicT('public_unavailable')}</span>
            </span>
          )}

          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#142B5F] text-[#F2CD78] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(20,43,95,0.22)] border border-[#D6A43B]/30 overflow-hidden transition-transform duration-200 group-hover:scale-105">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-[5px]"
            />
            <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#F2CD78] stroke-[2.1] relative z-10" />
          </div>

          <div className="flex flex-col items-center min-w-0">
            <h3 className="text-[13px] sm:text-[14px] md:text-[15.5px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] font-['Cairo',sans-serif] leading-snug group-hover:text-[#0E7C86] dark:group-hover:text-[#38C6D4] transition-colors text-center">
              {title}
            </h3>
            <div className="mt-1.5 h-[1.5px] w-16 rounded-full bg-[linear-gradient(90deg,transparent_0%,rgba(14,124,134,0.75)_22%,rgba(14,124,134,0.75)_78%,transparent_100%)] dark:bg-[linear-gradient(90deg,transparent_0%,rgba(56,198,212,0.82)_22%,rgba(56,198,212,0.82)_78%,transparent_100%)]" />
          </div>
        </div>

        <p className="text-[11px] sm:text-[11.5px] text-[#5C707C] dark:text-[#9BB4C7] font-semibold leading-5 text-center line-clamp-2 font-['Cairo',sans-serif]">
          {description}
        </p>

        <div className="space-y-1.5 pt-0.5 text-start">
          {features.map(({ label, icon: FeatureIcon }) => (
            <div
              key={label}
              className="min-w-0 overflow-hidden rounded-lg border border-[#142B5F]/10 dark:border-white/10 bg-[#F6F8FA] dark:bg-[#0B1529]/80 group-hover:bg-white dark:group-hover:bg-[#142342] px-2.5 py-1.5 flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-[#142B5F] dark:text-[#DCE7F0] font-['Cairo',sans-serif] transition-colors"
            >
              <FeatureIcon className="w-3.5 h-3.5 shrink-0 text-[#0E7C86] dark:text-[#38C6D4]" />
              <span className="min-w-0 leading-tight break-words">{label}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-[#142B5F]/8 dark:border-white/8">
          <button
            type="button"
            className="w-full bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] hover:opacity-95 text-white border border-transparent dark:border-[#38C6D4]/25 rounded-xl py-2 md:py-2.5 px-3.5 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-2xs mn-inverse group/btn font-['Cairo',sans-serif]"
            data-mn-design="8bba664dec"
          >
            <span className="text-[11px] sm:text-[12px] font-bold text-white font-['Cairo',sans-serif]">{cta}</span>
            <ChevronLeft className="w-3.5 h-3.5 text-[#F2CD78] group-hover/btn:-translate-x-0.5 transition-transform" />
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
      className="min-h-screen bg-[#F6F8FA] dark:bg-[#0A1326] text-[#203442] dark:text-[#EDF5F5] pb-24 font-['Cairo',sans-serif] select-none mn-panel dark:[--mn-border:rgba(255,255,255,0.12)]"
      dir={publicDir}
    >
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-3 pb-2.5 sm:pt-5 sm:pb-3.5 md:pt-6 md:pb-4 min-h-[201px] sm:min-h-[248px] md:min-h-[299px] flex flex-col justify-between overflow-hidden shadow-xs mn-inverse w-full">
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

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-3 left-5 grid grid-cols-5 gap-1.5 opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[#F2CD78]" />
            ))}
          </div>

          <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full border border-[#F2CD78]/20 pointer-events-none" />
          <div className="absolute -top-6 -left-6 w-72 h-72 rounded-full border border-[#F2CD78]/12 pointer-events-none" />

          <svg
            className="absolute -right-4 bottom-0 h-36 w-36 text-white/10 pointer-events-none"
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

          <svg
            className="absolute bottom-0 inset-x-0 w-full h-12 opacity-25"
            viewBox="0 0 500 80"
            fill="none"
            preserveAspectRatio="none"
          >
            <path d="M-20,70 Q250,-20 520,70" stroke="#F2CD78" strokeWidth="2" fill="none" />
          </svg>
        </div>

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-1.5 sm:space-y-2 md:space-y-3 pt-1 md:pt-3 my-auto w-full">
          <div className="flex justify-center">
            <Sparkles className="h-4.5 w-4.5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#F2CD78] drop-shadow-[0_0_8px_rgba(214,164,59,0.75)]" aria-hidden="true" />
          </div>

          <div className="space-y-0.5 md:space-y-1.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight font-['Cairo',sans-serif] tracking-tight">
              {publicDir === 'rtl' ? (
                <>
                  <span className="text-white">دليل الدورات</span>{' '}
                  <span className="text-[#F2CD78]">والبرامج التدريبية</span>
                </>
              ) : (
                <>
                  <span className="text-white">{publicT('public_directory_of')}</span>{' '}
                  <span className="text-[#F2CD78]">{publicT('public_courses_and_training_programs')}</span>
                </>
              )}
            </h1>

            <div className="flex justify-center pt-0.5 pb-0.5">
              <div className="w-10 md:w-14 h-0.5 bg-gradient-to-r from-[#D6A43B] via-[#F2CD78] to-[#D6A43B] rounded-full" />
            </div>

            <p className="text-[10px] sm:text-xs md:text-sm text-[#DDEFF2] font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto px-2 line-clamp-2">
              {publicT('public_choose_a_training_path_that_fits_your_goals')}
            </p>
          </div>
        </div>

        <div className="w-full max-w-md md:max-w-2xl mx-auto mn-inline-gutter mt-2.5 sm:mt-3 md:mt-4 relative z-20 pb-0 md:pb-1">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3.5">
            <div className="min-w-0 overflow-hidden bg-white dark:bg-[#111E38] border-1.5 border-[#142B5F]/18 dark:border-white/14 rounded-xl sm:rounded-2xl px-1 py-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] h-[48px] sm:h-[62px] md:h-[70px] mn-panel">
              <div className="min-w-0 flex items-center justify-center gap-1 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[9.5px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <Globe2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                <span className="min-w-0 leading-tight break-words">{publicT('public_global_platforms')}</span>
              </div>
            </div>

            <div className="min-w-0 overflow-hidden bg-white dark:bg-[#111E38] border-1.5 border-[#142B5F]/18 dark:border-white/14 rounded-xl sm:rounded-2xl px-1 py-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] h-[48px] sm:h-[62px] md:h-[70px] mn-panel">
              <div className="min-w-0 flex items-center justify-center gap-1 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[9.5px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                <span className="min-w-0 leading-tight break-words">{publicT('public_accredited_certificates')}</span>
              </div>
            </div>

            <div className="min-w-0 overflow-hidden bg-white dark:bg-[#111E38] border-1.5 border-[#142B5F]/18 dark:border-white/14 rounded-xl sm:rounded-2xl px-1 py-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] h-[48px] sm:h-[62px] md:h-[70px] mn-panel">
              <div className="min-w-0 flex items-center justify-center gap-1 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[9.5px] sm:text-xs md:text-sm font-['Cairo',sans-serif] w-full">
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                <span className="min-w-0 leading-tight break-words">{publicT('public_progress_tracking')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Official Gold Divider Ribbon */}
      <div className="w-full h-[1.5px] bg-gradient-to-r from-[#D6A43B]/45 via-[#F2CD78] to-[#D6A43B]/45 dark:from-[#D6A43B]/30 dark:via-[#F2CD78]/65 dark:to-[#D6A43B]/30 mb-3 md:mb-5" />

      <div className="max-w-4xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1 sm:px-2 md:px-4 pt-1 space-y-3">
        <div className="flex flex-col gap-2.5 sm:gap-3 md:grid md:grid-cols-3 md:gap-4 items-stretch">
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
