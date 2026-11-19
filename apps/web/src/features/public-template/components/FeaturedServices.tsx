import { HomeSectionEmptyCards } from './HomeSectionEmptyCards';
import { homeCatalogStatus } from '../homeCatalogState';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState } from 'react';
import {
  ArrowUpLeft,
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

interface FeaturedServicesProps {
  services: Service[];
  status?: PublicLiveDomainStatus;
  onRetry?: () => void;
  onViewAllClick?: () => void;
  onSelectService?: (service: Service) => void;
}

const getServiceIcon = (service: Service, index: number) => {
  const iconClass = "h-5 w-5 text-[#D6A43B]";
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

export const FeaturedServices: React.FC<FeaturedServicesProps> = ({
  services: sourceServices,
  status,
  onRetry,
  onViewAllClick,
  onSelectService,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const [activeTab, setActiveTab] = useState<'student' | 'general'>('student');
  const allServicesList = sourceServices;
  const services = allServicesList.filter((service) => service.audience === activeTab);
  const displayStatus = homeCatalogStatus(status, services.length);

  return (
    <section className="px-0 py-2.5 w-full font-['Cairo',sans-serif]">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--mn-border)] bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 px-2.5 py-3.5 shadow-sm sm:px-3.5 sm:py-4 md:px-6 md:py-5 mn-panel ">
        {/* Elegant top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />

        <div className="mb-3 md:mb-4 flex flex-col items-center gap-3">
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-1">
              <h3 className="inline-flex items-center justify-center gap-2 text-[15px] sm:text-base md:text-lg lg:text-xl font-bold text-[#142B5F] dark:text-[#D6A43B] leading-tight font-['Cairo',sans-serif]">
                <span className="mn-detail-section-icon mn-icon-mix02 shrink-0">
                  <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-md" />
                  <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 relative z-10 text-[#F2CD78]" />
                </span>
                <span className="inline-flex flex-col items-center">
                  <span>{publicT('public_manaratak_services')}</span>
                  <span className="w-full min-w-[115px] md:min-w-[140px] h-[2.5px] mt-1 rounded-full bg-[linear-gradient(90deg,transparent_0%,#D6A43B_18%,#D6A43B_82%,transparent_100%)]" />
                </span>
              </h3>
            </div>
            <p className="mx-auto text-[11px] sm:text-xs md:text-sm font-semibold leading-relaxed text-[var(--mn-text)] max-w-lg md:max-w-2xl font-['Cairo',sans-serif]">{publicT('public_student_services_and_general_support_for_your_study')}</p>
          </div>

          <div className="group relative w-full max-w-[255px] sm:max-w-[270px] md:max-w-[340px] shrink-0 overflow-hidden rounded-[12px] p-[1.5px]">
            <div className="animate-button-orbit absolute inset-[-100%] bg-[conic-gradient(from_0deg,var(--mn-primary),var(--mn-accent),var(--mn-primary),var(--mn-accent),var(--mn-primary))]" />
            <div className="relative flex w-full rounded-[10.5px] bg-[var(--mn-page)] p-0.5 mn-panel">
              <button
                type="button"
                onClick={() => setActiveTab('student')}
                data-mn-design="023f1723a7"
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[8.5px] py-1.5 md:py-2 px-2.5 md:px-4 text-[11px] sm:text-[11.5px] md:text-xs font-bold transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  activeTab === 'student'
                    ? 'bg-gradient-to-l from-[#142B5F] to-[#0E7C86] text-white shadow-xs'
                    : 'text-[var(--mn-heading)] hover:bg-[var(--mn-surface-muted)]/70'
                }`}
              >
                <GraduationCap className={`h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 transition-colors ${activeTab === 'student' ? 'text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#D6A43B]'}`} />
                <span>{publicT('public_student_services_2')}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                data-mn-design="023f1723a7"
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[8.5px] py-1.5 md:py-2 px-2.5 md:px-4 text-[11px] sm:text-[11.5px] md:text-xs font-bold transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  activeTab === 'general'
                    ? 'bg-gradient-to-l from-[#142B5F] to-[#0E7C86] text-white shadow-xs'
                    : 'text-[var(--mn-heading)] hover:bg-[var(--mn-surface-muted)]/70'
                }`}
              >
                <Building2 className={`h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 transition-colors ${activeTab === 'general' ? 'text-[#F2CD78]' : 'text-[#0E7C86] dark:text-[#D6A43B]'}`} />
                <span>{publicT('public_general_services')}</span>
              </button>
            </div>
          </div>
        </div>

        <div key={activeTab} className="mt-3 flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3.5 items-stretch animate-in fade-in slide-in-from-bottom-2 duration-300">
          {services.length === 0 ? <HomeSectionEmptyCards kind="services" status={displayStatus === 'ready' ? 'empty' : displayStatus} onRetry={onRetry} /> : services.map((service, index) => (
            <button
              type="button"
              key={service.id}
              onClick={() => onSelectService?.(service)}
              className="group relative h-full flex w-full items-center gap-2.5 md:gap-3 overflow-hidden rounded-xl md:rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-2.5 sm:p-3 md:p-3.5 text-start shadow-2xs transition-all hover:border-[#142B5F]/40 dark:hover:border-[#D6A43B]/50 hover:shadow-xs mn-panel cursor-pointer"
            >
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl bg-[#142B5F] border border-[#D6A43B]/60 shadow-2xs transition-transform group-hover:scale-105">
                {getServiceIcon(service, index)}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="truncate text-[11.5px] sm:text-[12.5px] md:text-sm font-bold text-[var(--mn-heading)] transition-colors group-hover:text-[#142B5F] dark:group-hover:text-[#D6A43B] font-['Cairo',sans-serif]">
                  {service.title}
                </h4>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-[var(--mn-text-muted)] sm:text-[11px] md:text-xs font-medium">{service.shortDescription}</p>
              </div>

              <div className="flex h-6 w-6 md:h-7 md:w-7 shrink-0 items-center justify-center rounded-full bg-[#142B5F] border border-[#D6A43B]/60 transition-all group-hover:scale-105 shadow-2xs">
                <ArrowUpLeft className="h-3 w-3 md:h-3.5 md:w-3.5 text-[#F2CD78]" />
              </div>
            </button>
          ))}
        </div>

        {onViewAllClick && (
          <div className="mt-3 md:mt-4 w-full">
            <button
              type="button"
              onClick={onViewAllClick}
              className="group relative w-full overflow-hidden rounded-xl px-3.5 py-2.5 md:py-3 bg-[var(--mn-page)] hover:bg-[#142B5F]/[0.04] dark:hover:bg-[#D6A43B]/10 border border-[#142B5F]/30 dark:border-[#D6A43B]/45 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] font-['Cairo',sans-serif] shadow-2xs cursor-pointer mn-panel"
            >
              <span className="pointer-events-none absolute top-0 right-0 w-5 h-3.5 border-t-[2.5px] border-r-[2.5px] border-[#0E7C86] dark:border-[#D6A43B] rounded-tr-xl" />
              <span className="pointer-events-none absolute bottom-0 left-0 w-5 h-3.5 border-b-[2.5px] border-l-[2.5px] border-[#142B5F] dark:border-[#D6A43B]/80 rounded-bl-xl" />
              <span className="inline-flex items-center justify-center gap-1.5">
                <span className="text-[12px] sm:text-[13px] md:text-[14.5px] font-extrabold text-[#142B5F] dark:text-[#F2CD78] text-center">{publicT('public_browse_all_services')}</span>
                <ArrowUpLeft className="w-4 h-4 md:w-4.5 md:h-4.5 -mt-1 text-[#0E7C86] dark:text-[#F2CD78] stroke-[2.5] shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
