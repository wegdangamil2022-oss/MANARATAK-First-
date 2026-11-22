import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  ChevronLeft,
  CheckCircle2,
  FileText,
  GraduationCap,
  Briefcase,
  Languages,
  Plane,
  Search,
  Sparkles,
} from 'lucide-react';
import { ServiceAudience } from '../types';

interface ServicesLandingPageProps {
  onBack?: () => void;
  onOpenTrack?: (track: ServiceAudience) => void;
}

interface ServicePathCardProps {
  title: string;
  eyebrow: string;
  badge: string;
  description: string;
  icon: React.ElementType;
  features: Array<{ label: string; icon: React.ElementType }>;
  footer: string;
  onClick?: () => void;
}

function ServicePathCard({
  title,
  eyebrow,
  badge,
  description,
  icon: Icon,
  features,
  footer,
  onClick,
}: ServicePathCardProps) {
  const { t: publicT } = usePublicTemplateTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full h-full flex flex-col justify-between overflow-hidden rounded-r-[4px] rounded-l-2xl border border-[#142B5F]/12 dark:border-white/10 border-r-3 border-r-[#142B5F] dark:border-r-[#F2CD78]/85 bg-white dark:bg-[#111E38] p-3 sm:p-4 md:p-5 text-start shadow-[0_4px_16px_rgba(20,43,95,0.04)] hover:border-[#142B5F]/28 dark:hover:border-[#F2CD78]/45 hover:shadow-[0_8px_24px_rgba(20,43,95,0.08)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.28)] transition-all active:scale-[0.99] cursor-pointer mn-panel"
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white shadow-xs mn-inverse">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-['Cairo',sans-serif] text-[12.5px] sm:text-[14px] md:text-[15px] font-bold leading-snug text-[#142B5F] dark:text-[#EDF5F5] group-hover:text-[#0E7C86] dark:group-hover:text-[#F2CD78] transition-colors">
                {title}
              </h3>
              <p className="mt-0.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#0E7C86] dark:text-[#34BFC9]">
                {eyebrow}
              </p>
            </div>
            <span className="whitespace-nowrap rounded-full border border-[#0E7C86]/20 dark:border-[#34BFC9]/30 bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 px-2 py-0.5 text-[9px] font-bold text-[#0E7C86] dark:text-[#34BFC9]">
              {badge}
            </span>
          </div>
          <p className="mt-1.5 text-[10.5px] sm:text-[11.5px] font-medium leading-5 text-[#5C707C] dark:text-[#9BB4C7]">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {features.map(({ label, icon: FeatureIcon }) => (
          <span
            key={label}
            className="flex min-h-8 items-center justify-center gap-1 rounded-lg border border-[#142B5F]/8 dark:border-white/8 bg-[#F6F8FA] dark:bg-[#0B1529]/85 px-1.5 text-[9px] sm:text-[10px] font-bold text-[#203442] dark:text-[#DCE7F0] mn-panel"
          >
            <FeatureIcon className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
            <span className="truncate">{label}</span>
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#142B5F]/8 dark:border-white/8 pt-2.5">
        <span className="truncate text-[9.5px] sm:text-[10px] font-bold text-[#5C707C] dark:text-[#9BB4C7]">{footer}</span>
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-[#142B5F] group-hover:bg-[#0E7C86] dark:bg-[#162A52] dark:group-hover:bg-[#1C3566] border border-transparent dark:border-[#F2CD78]/35 px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-white dark:text-[#F2CD78] transition-colors shadow-2xs mn-inverse">
          {publicT('public_explore_services')}
          <ArrowLeft className="h-3.5 w-3.5 text-[#F2CD78] transition-transform group-hover:-translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

export const ServicesLandingPage: React.FC<ServicesLandingPageProps> = ({ onBack, onOpenTrack }) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#0A1326] pb-24 text-[#203442] dark:text-[#EDF5F5] font-['Cairo',sans-serif] select-none mn-panel dark:[--mn-border:rgba(255,255,255,0.12)]" dir={publicDir}>
      <div className="relative mn-search-hero overflow-hidden px-3 sm:px-4 pt-3 pb-2.5 sm:pt-5 sm:pb-3.5 md:pt-6 md:pb-4 min-h-[201px] sm:min-h-[248px] md:min-h-[299px] flex flex-col justify-between text-white shadow-xs mn-inverse w-full">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-5 top-3 grid grid-cols-5 gap-1.5 opacity-20">
            {Array.from({ length: 20 }).map((_, index) => (
              <div key={index} className="h-1 w-1 rounded-full bg-[#F2CD78]" />
            ))}
          </div>
          <div className="absolute -left-12 -top-12 h-56 w-56 rounded-full border border-[#D6A43B]/20" />
          <div className="absolute -left-6 -top-6 h-72 w-72 rounded-full border border-[#34BFC9]/15" />
          <GraduationCap className="absolute -right-4 bottom-0 h-32 w-32 text-white/10" strokeWidth={1.2} />
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-30 cursor-pointer text-white shadow-xs active:scale-95"
            title={publicT('public_back')}
            aria-label={publicT('public_back')}
          >
            <ChevronLeft className="w-4 h-4 rotate-180 text-white" />
          </button>
        )}

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-1.5 sm:space-y-2 md:space-y-3 pt-1 md:pt-3 my-auto w-full">
          <div className="flex justify-center">
            <Sparkles className="h-4.5 w-4.5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#F2CD78] drop-shadow-[0_0_8px_rgba(214,164,59,0.75)]" aria-hidden="true" />
          </div>

          <div className="space-y-0.5 md:space-y-1.5">
            <h1 className="font-['Cairo',sans-serif] text-xl sm:text-2xl md:text-3xl font-bold leading-tight tracking-tight text-white">
              {publicT('public_services')}{' '}
              <span className="text-[#F2CD78]">{publicT('public_manaratak')}</span>
            </h1>

            <div className="flex justify-center pt-0.5 pb-0.5 md:pt-1">
              <div className="w-10 md:w-14 h-0.5 bg-gradient-to-r from-[#D6A43B] via-[#F2CD78] to-[#D6A43B] rounded-full" />
            </div>

            <p className="text-[10px] sm:text-xs md:text-sm text-[#DDEFF2] font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto px-2 line-clamp-2">
              {publicT('public_support_throughout_your_study_journey_from_choosing_and')}
            </p>
          </div>
        </div>

        {/* 2 Balanced Quick Track Selector Tiles inside Hero */}
        <div className="w-full max-w-[320px] sm:max-w-[380px] md:max-w-[460px] mx-auto mt-2.5 sm:mt-3 md:mt-4 relative z-20 pb-0 md:pb-1">
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2.5 md:gap-3">
            <button
              type="button"
              onClick={() => onOpenTrack?.('student')}
              className="relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#38C6D4]/45 rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel"
            >
              <div className="min-w-0 flex items-center justify-center gap-1 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-[13px] font-['Cairo',sans-serif] w-full">
                <GraduationCap className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                <span className="min-w-0 truncate">{publicT('public_student_services')}</span>
              </div>
              <span className="text-[9px] sm:text-[9.5px] font-bold text-[#5C707C] dark:text-[#9BB4C7] mt-0.5 truncate max-w-full">استشارات وتجهيز أكاديمي</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenTrack?.('general')}
              className="relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#38C6D4]/45 rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel"
            >
              <div className="min-w-0 flex items-center justify-center gap-1 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-[13px] font-['Cairo',sans-serif] w-full">
                <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                <span className="min-w-0 truncate">{publicT('public_general_services_and_support')}</span>
              </div>
              <span className="text-[9px] sm:text-[9.5px] font-bold text-[#5C707C] dark:text-[#9BB4C7] mt-0.5 truncate max-w-full">ترجمة وتوثيق وإجراءات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gold Divider Ribbon Line */}
      <div className="w-full h-[1.5px] bg-gradient-to-r from-[#D6A43B]/45 via-[#F2CD78] to-[#D6A43B]/45 dark:from-[#D6A43B]/30 dark:via-[#F2CD78]/65 dark:to-[#D6A43B]/30 mb-3 md:mb-5" />

      <div className="relative z-20 mx-auto pt-1 max-w-4xl px-1 sm:px-2 md:px-4 pb-24 md:max-w-[1120px] lg:max-w-[1160px]">

        <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-5 items-stretch">
          <ServicePathCard
            title={publicT('public_student_services')}
            eyebrow="استشارات وتجهيز أكاديمي للطالب"
            badge="طلاب"
            description="اختيار الجامعة والتخصص، مراجعة وثائق التقديم، SOP، خطاب الدافع، المنح والسيرة الذاتية الأكاديمية."
            icon={GraduationCap}
            features={[
              { label: publicT('public_academic_choices'), icon: Search },
              { label: publicT('public_application_profile'), icon: CheckCircle2 },
              { label: publicT('public_guidance'), icon: BookOpenCheck },
            ]}
            footer="البحث وبطاقات الخدمات داخل القسم"
            onClick={() => onOpenTrack?.('student')}
          />

          <ServicePathCard
            title={publicT('public_general_services_and_support')}
            eyebrow="وثائق وإجراءات مساندة لرحلة الدراسة"
            badge="دعم عام"
            description="ترجمة وتصديق الوثائق، التأشيرات والنماذج والإجراءات المساندة والسكن والاستقبال عند توفر الخدمة."
            icon={FileText}
            features={[
              { label: publicT('public_translation'), icon: Languages },
              { label: publicT('public_documents'), icon: CheckCircle2 },
              { label: publicT('public_procedures'), icon: Plane },
            ]}
            footer="التوفر الفعلي يحدد حسب نوع الخدمة"
            onClick={() => onOpenTrack?.('general')}
          />
        </div>
      </div>
    </div>
  );
};
