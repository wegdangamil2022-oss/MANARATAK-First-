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
import { PUBLIC_SERVICES } from '../data/serviceData';

interface FeaturedServicesProps {
  services: Service[];
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
  onViewAllClick,
  onSelectService,
}) => {
  const [activeTab, setActiveTab] = useState<'student' | 'general'>('student');
  const allServicesList = (sourceServices && sourceServices.length >= 6) ? sourceServices : PUBLIC_SERVICES;
  const services = allServicesList.filter((service) => service.audience === activeTab);

  return (
    <section className="px-0 py-3 w-full font-['Cairo',sans-serif]">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--mn-border)] bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 p-4 shadow-sm sm:p-5 mn-panel ">
        {/* Elegant top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        
        <div className="mb-4 sm:mb-5 flex flex-col items-center gap-3 sm:gap-4">
          <div className="text-center">
            <div className="relative pb-1 mb-1 inline-block">
              <h3 className="inline-flex items-center justify-center gap-1.5 text-[14.5px] sm:text-base font-bold text-[#142B5F] dark:text-[#D6A43B] font-['Cairo',sans-serif]">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#142B5F] border border-[#D6A43B]/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D6A43B]" />
                </span>
                <span>خدمات منارتك</span>
              </h3>
              <div className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
            </div>
            <p className="mx-auto text-[11px] sm:text-xs font-medium text-[var(--mn-text-muted)] max-w-md font-['Cairo',sans-serif]">
              خدمات طلابية ودعم عام مرتبطة برحلة الدراسة والتقديم
            </p>
          </div>

          <div className="group relative w-full max-w-[285px] shrink-0 overflow-hidden rounded-[14px] p-[2px]">
            <div className="animate-button-orbit absolute inset-[-100%] bg-[conic-gradient(from_0deg,var(--mn-primary),var(--mn-accent),var(--mn-primary),var(--mn-accent),var(--mn-primary))]" />
            <div className="relative flex w-full rounded-xl bg-[var(--mn-page)] p-1 mn-panel">
              <button
                type="button"
                onClick={() => setActiveTab('student')}
                style={{ fontFamily: "'Cairo', sans-serif", fontSize: '13px', fontWeight: 700 }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  activeTab === 'student'
                    ? 'bg-[#142B5F] text-white dark:bg-[#D6A43B] dark:text-[#142B5F] shadow-md ring-1 ring-[#142B5F]/20 dark:ring-[#D6A43B]/40'
                    : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-surface-muted)]/70 hover:text-[var(--mn-heading)]'
                }`}
              >
                <GraduationCap className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'student' ? 'text-[#D6A43B] dark:text-[#142B5F]' : 'text-[var(--mn-text-muted)]'}`} />
                <span>خدمات طلابية</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                style={{ fontFamily: "'Cairo', sans-serif", fontSize: '13px', fontWeight: 700 }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  activeTab === 'general'
                    ? 'bg-[#142B5F] text-white dark:bg-[#D6A43B] dark:text-[#142B5F] shadow-md ring-1 ring-[#142B5F]/20 dark:ring-[#D6A43B]/40'
                    : 'text-[var(--mn-text-muted)] hover:bg-[var(--mn-surface-muted)]/70 hover:text-[var(--mn-heading)]'
                }`}
              >
                <Building2 className={`h-4 w-4 shrink-0 transition-colors ${activeTab === 'general' ? 'text-[#D6A43B] dark:text-[#142B5F]' : 'text-[var(--mn-text-muted)]'}`} />
                <span>خدمات عامة</span>
              </button>
            </div>
          </div>
        </div>

        <div key={activeTab} className="mt-4 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {services.map((service, index) => (
            <button
              type="button"
              key={service.id}
              onClick={() => onSelectService?.(service)}
              className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3 text-right shadow-2xs transition-all hover:border-[#142B5F]/40 dark:hover:border-[#D6A43B]/50 hover:shadow-xs mn-panel cursor-pointer"
            >
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-[#142B5F] border border-[#D6A43B]/60 shadow-2xs transition-transform group-hover:scale-105">
                {getServiceIcon(service, index)}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="truncate text-[11px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] transition-colors group-hover:text-[#142B5F] dark:group-hover:text-[#D6A43B] font-['Cairo',sans-serif]">
                  {service.title}
                </h4>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-[var(--mn-text-muted)] sm:text-[11px] font-medium">{service.shortDescription}</p>
              </div>

              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--mn-surface-muted)] transition-all group-hover:bg-[#142B5F] dark:group-hover:bg-[#D6A43B] shadow-2xs">
                <ArrowUpLeft className="h-3 w-3 text-[var(--mn-text-muted)] group-hover:text-white dark:group-hover:text-[#142B5F]" />
              </div>
            </button>
          ))}
        </div>

        {onViewAllClick && (
          <div className="mt-5 flex w-full justify-center">
            <button
              type="button"
              onClick={onViewAllClick}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#142B5F]/50 dark:border-[#D6A43B]/50 bg-[var(--mn-surface-muted)] px-6 py-2.5 text-xs font-bold text-[#142B5F] dark:text-[#D6A43B] transition-all hover:bg-[#142B5F]/5 dark:hover:bg-[#D6A43B]/10 active:scale-95 sm:w-auto sm:px-8 sm:py-3 font-['Cairo',sans-serif] shadow-xs "
            >
              <span className="text-[12px] sm:text-sm font-bold">تصفح جميع الخدمات</span>
              <ChevronLeft className="h-4 w-4 text-[#142B5F] dark:text-[#D6A43B] transition-transform group-hover:-translate-x-1" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
