import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState } from 'react';
import {
  Briefcase,
  Building2,
  ChevronLeft,
  GraduationCap,
  Compass,
  FileCheck,
  Award,
  Languages,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Service } from '../types';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';
import {
  HOME_INNER_CARD_CLASS,
  HOME_INNER_ICON_CLASS,
  HomeSectionCta,
  HomeSectionHeader,
  HomeSectionShell,
} from './HomeSectionPrimitives';

interface FeaturedServicesProps {
  services: Service[];
  status?: PublicLiveDomainStatus;
  onRetry?: () => void;
  onViewAllClick?: () => void;
  onSelectService?: (service: Service) => void;
}

const getServiceIcon = (service: Service, index: number) => {
  const iconClass = 'h-4.5 w-4.5 sm:h-5 sm:w-5 text-white stroke-[2]';
  const title = service.title || '';
  if (title.includes('اختيار') || title.includes('تضييق')) {
    return <Compass className={iconClass} />;
  }
  if (title.includes('خطاب') || title.includes('سيرة') || title.includes('تدقيق')) {
    return <FileCheck className={iconClass} />;
  }
  if (title.includes('منح') || title.includes('إرشاد')) {
    return <Award className={iconClass} />;
  }
  if (title.includes('ترجمة') || title.includes('ترجمات')) {
    return <Languages className={iconClass} />;
  }
  if (title.includes('تصديق') || title.includes('شهادات')) {
    return <CheckCircle2 className={iconClass} />;
  }
  if (title.includes('تأشيرة') || title.includes('فيزا') || title.includes('سفر')) {
    return <ShieldCheck className={iconClass} />;
  }

  const defaultIcons = [
    <Compass className={iconClass} />,
    <FileCheck className={iconClass} />,
    <Award className={iconClass} />,
    <Languages className={iconClass} />,
    <CheckCircle2 className={iconClass} />,
    <ShieldCheck className={iconClass} />,
  ];
  return defaultIcons[index % defaultIcons.length];
};

const COMPACT_SERVICE_SUMMARIES: Record<string, string> = {
  'service-university-major-consultation': 'بناء قائمة جامعات وتخصصات تناسب ملفك',
  'service-statement-of-purpose-review': 'تدقيق السيرة الذاتية وخطاب الدافع باحترافية',
  'service-scholarship-application-guidance': 'تجهيز ومراجعة ملفات التقديم للمنح',
  'service-certified-academic-translation': 'ترجمة معتمدة ومراجعة للوثائق الأكاديمية',
  'service-document-attestation-support': 'إرشاد ومتابعة تصديق الشهادات الرسمية',
  'service-visa-file-preparation-consultation': 'تدقيق مستندات التأشيرة الدراسية قبل التقديم',
};

const getCompactServiceSummary = (service: Service): string => {
  if (service.id && COMPACT_SERVICE_SUMMARIES[service.id]) {
    return COMPACT_SERVICE_SUMMARIES[service.id];
  }
  const title = service.title || '';
  if (title.includes('اختيار') && title.includes('الجامعة')) {
    return COMPACT_SERVICE_SUMMARIES['service-university-major-consultation'];
  }
  if (title.includes('السيرة الذاتية') || title.includes('خطاب الدافع')) {
    return COMPACT_SERVICE_SUMMARIES['service-statement-of-purpose-review'];
  }
  if (title.includes('المنح')) {
    return COMPACT_SERVICE_SUMMARIES['service-scholarship-application-guidance'];
  }
  if (title.includes('ترجمة') || title.includes('الترجمة')) {
    return COMPACT_SERVICE_SUMMARIES['service-certified-academic-translation'];
  }
  if (title.includes('تصديق')) {
    return COMPACT_SERVICE_SUMMARIES['service-document-attestation-support'];
  }
  if (title.includes('تأشيرة') || title.includes('التأشيرة')) {
    return COMPACT_SERVICE_SUMMARIES['service-visa-file-preparation-consultation'];
  }
  const raw = (service.shortDescription || '').trim();
  if (raw.length <= 44) return raw;
  const cut = raw.slice(0, 44);
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > 24 ? cut.slice(0, lastSpace) : cut;
};

export const FeaturedServices: React.FC<FeaturedServicesProps> = ({
  services: sourceServices,
  onViewAllClick,
  onSelectService,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const [activeTab, setActiveTab] = useState<'student' | 'general'>('student');
  const services = sourceServices.filter((service) => service.audience === activeTab);

  return (
    <HomeSectionShell>
      <HomeSectionHeader
        title={publicT('public_manaratak_services')}
        subtitle={publicT('public_student_services_and_general_support_for_your_study')}
        icon={<Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.1]" />}
      />

      {/* Restored Navy-Petrol Filled Tab Boxes + Animated Navy Line */}
      <div className="flex flex-col items-center gap-1.5 mb-3 md:mb-4">
        <div className="inline-grid grid-cols-2 w-full max-w-[260px] sm:max-w-[300px] md:max-w-[340px] p-1 rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/90 border border-[#142B5F]/12 dark:border-white/12 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            data-mn-design="023f1723a7"
            className={`flex items-center justify-center gap-1.5 py-1.5 md:py-2 px-2.5 md:px-4 rounded-lg text-[10.5px] sm:text-[11.5px] md:text-[12.5px] font-extrabold transition-all duration-200 whitespace-nowrap cursor-pointer font-['Cairo',sans-serif] ${
              activeTab === 'student'
                ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white shadow-[0_2px_8px_rgba(20,43,95,0.22)]'
                : 'text-[#142B5F]/75 dark:text-[#9BB4C7] hover:text-[#142B5F] dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/5'
            }`}
          >
            <GraduationCap
              className={`h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 shrink-0 transition-colors ${
                activeTab === 'student'
                  ? 'text-white'
                  : 'text-[#0E7C86] dark:text-[#38C6D4]'
              }`}
            />
            <span>{publicT('public_student_services_2')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            data-mn-design="023f1723a7"
            className={`flex items-center justify-center gap-1.5 py-1.5 md:py-2 px-2.5 md:px-4 rounded-lg text-[10.5px] sm:text-[11.5px] md:text-[12.5px] font-extrabold transition-all duration-200 whitespace-nowrap cursor-pointer font-['Cairo',sans-serif] ${
              activeTab === 'general'
                ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white shadow-[0_2px_8px_rgba(20,43,95,0.22)]'
                : 'text-[#142B5F]/75 dark:text-[#9BB4C7] hover:text-[#142B5F] dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/5'
            }`}
          >
            <Building2
              className={`h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 shrink-0 transition-colors ${
                activeTab === 'general'
                  ? 'text-white'
                  : 'text-[#0E7C86] dark:text-[#38C6D4]'
              }`}
            />
            <span>{publicT('public_general_services')}</span>
          </button>
        </div>

        {/* Restored Moving Line (Changed from Gold to Navy) */}
        <div
          aria-hidden="true"
          className="w-full max-w-[210px] sm:max-w-[250px] relative h-[2px] rounded-full overflow-hidden bg-[#142B5F]/12 dark:bg-white/10"
        >
          <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-l from-transparent via-[#142B5F] to-[#142B5F] dark:from-transparent dark:via-[#60A5FA] dark:to-[#142B5F] animate-swipe-line shadow-[0_0_6px_rgba(20,43,95,0.45)]" />
        </div>
      </div>

      {/* Service Cards: Approved Frost Cards + Unified Navy-Petrol Gradient White Icons */}
      <div
        key={activeTab}
        className="flex flex-col gap-1.5 sm:gap-2 md:grid md:grid-cols-3 md:gap-3.5 items-stretch animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        {services.map((service, index) => (
          <button
            type="button"
            key={service.id}
            onClick={() => onSelectService?.(service)}
            className={`group relative h-full min-h-[56px] sm:min-h-[64px] flex w-full items-center gap-2 sm:gap-3 overflow-hidden rounded-xl sm:rounded-2xl py-2 px-2.5 sm:px-3.5 text-start hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer ${HOME_INNER_CARD_CLASS}`}
          >
            <div
              className={`flex h-8.5 w-8.5 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl transition-transform group-hover:scale-105 ${HOME_INNER_ICON_CLASS}`}
            >
              {getServiceIcon(service, index)}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-[10.5px] sm:text-[12px] md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] transition-colors group-hover:text-[#0E7C86] dark:group-hover:text-[#38C6D4] leading-snug line-clamp-2 font-['Cairo',sans-serif]">
                {service.title}
              </h4>
              <p className="mt-0.5 text-[9px] sm:text-[10px] md:text-[11px] text-[#5C707C] dark:text-[#9BB4C7] font-semibold leading-snug line-clamp-1 font-['Cairo',sans-serif]">
                {getCompactServiceSummary(service)}
              </p>
            </div>

            <div className="flex h-6 w-6 md:h-7 md:w-7 shrink-0 items-center justify-center rounded-full bg-white dark:bg-[#162749] border border-[#142B5F]/10 group-hover:bg-[#0E7C86] group-hover:border-[#0E7C86] text-[#142B5F] group-hover:text-white dark:text-[#38C6D4] transition-colors">
              <ChevronLeft className="h-3 w-3 md:h-4 md:w-4 transition-transform group-hover:-translate-x-0.5" />
            </div>
          </button>
        ))}
      </div>

      {onViewAllClick && (
        <div className="mt-2.5 md:mt-4 w-full">
          <HomeSectionCta
            label={publicT('public_browse_all_services')}
            onClick={onViewAllClick}
          />
        </div>
      )}
    </HomeSectionShell>
  );
};
