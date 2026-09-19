import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  Clock3,
  FileText,
  GraduationCap,
  Briefcase,
  Search,
  SlidersHorizontal,
  Wallet,
  X,
  Sparkles,
} from 'lucide-react';
import { Service, ServiceAudience } from '../types';
import { FavoriteButton } from './FavoriteButton';

interface ServicesDirectoryPageProps {
  services: Service[];
  audience: ServiceAudience;
  onBack?: () => void;
  onSelectService?: (service: Service) => void;
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
}

export const ServicesDirectoryPage: React.FC<ServicesDirectoryPageProps> = ({
  services,
  audience,
  onBack,
  onSelectService,
  favoriteIds = [],
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');

  const audienceServices = useMemo(
    () => services.filter((service) => service.audience === audience),
    [services, audience],
  );

  const categories = useMemo(
    () => ['الكل', ...Array.from(new Set(audienceServices.map((service) => service.category)))],
    [audienceServices],
  );

  const filteredServices = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return audienceServices.filter((service) => {
      const matchesCategory = selectedCategory === 'الكل' || service.category === selectedCategory;
      const matchesSearch =
        !normalizedQuery ||
        service.title.toLowerCase().includes(normalizedQuery) ||
        service.shortDescription.toLowerCase().includes(normalizedQuery) ||
        service.category.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesSearch;
    });
  }, [audienceServices, searchQuery, selectedCategory]);

  const isStudent = audience === 'student';

  return (
    <div className="min-h-screen bg-[var(--mn-page)] pb-24 text-[var(--mn-heading)] font-['Cairo',sans-serif] select-none mn-panel " dir="rtl">
      <div className="relative mn-search-hero overflow-hidden px-3 pb-12 pt-4 text-white shadow-xs sm:px-4 sm:pb-14 mn-inverse ">
        <button
          type="button"
          onClick={onBack}
          className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-30 cursor-pointer text-white shadow-xs active:scale-95"
          title="العودة"
          aria-label="العودة"
        >
          <ChevronLeft className="w-4 h-4 rotate-180 text-white" />
        </button>

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-5 top-3 grid grid-cols-5 gap-1.5 opacity-20">
            {Array.from({ length: 20 }).map((_, index) => (
              <div key={index} className="h-1 w-1 rounded-full bg-[var(--mn-accent)] mn-gold " />
            ))}
          </div>
          <div className="absolute -left-12 -top-12 h-56 w-56 rounded-full border border-[var(--mn-accent)]/25" />
          {isStudent ? (
            <GraduationCap className="absolute -right-5 bottom-0 h-36 w-36 text-[var(--mn-heading)]" strokeWidth={1.1} />
          ) : (
            <FileText className="absolute -right-5 bottom-0 h-36 w-36 text-[var(--mn-heading)]" strokeWidth={1.1} />
          )}
        </div>

        <div className="relative z-10 mx-auto max-w-md space-y-2 pt-2 text-center sm:max-w-xl">
          <div className="flex justify-center">
            <Sparkles className="h-5 w-5 text-[var(--mn-accent-text)] drop-shadow-[0_0_8px_rgba(214,164,59,0.8)]" aria-hidden="true" />
          </div>
          <h1 className="font-['Cairo',sans-serif] text-xl font-bold leading-tight text-white sm:text-2xl">
            {isStudent ? 'الخدمات الطلابية' : 'الخدمات العامة والدعم'}
          </h1>
          <p className="mx-auto max-w-[90%] text-[11px] font-semibold leading-5 text-[var(--mn-on-dark-muted)] sm:text-xs">
            {isStudent
              ? 'خدمات تساعد الطالب في الاختيار وتجهيز ملفه الأكاديمي والتقديم.'
              : 'خدمات مساندة للوثائق والإجراءات المرتبطة برحلة الدراسة.'}
          </p>

          <div className="relative mx-auto mt-3 max-w-md">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ابحث عن خدمة..."
              className="h-11 w-full rounded-2xl border border-white/15 bg-[var(--mn-surface)] px-10 text-[11px] font-bold text-[var(--mn-heading)] shadow-lg outline-none transition focus:border-[var(--mn-accent)] sm:text-xs mn-panel "
            />
            <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mn-accent-text)]" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mn-text-muted)]"
                aria-label="مسح البحث"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-20 mx-auto -mt-5 max-w-md mn-inline-gutter pb-24 sm:max-w-xl">
        <div className="mb-3 rounded-[20px] border border-[var(--mn-border)] bg-[var(--mn-surface)] p-2.5 shadow-lg mn-panel ">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--mn-primary)]/10 text-[var(--mn-heading)]">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-[9px] font-bold text-[var(--mn-text-muted)]">نوع الخدمة</label>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="h-9 w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-2 text-[10px] font-bold text-[var(--mn-text)] outline-none mn-panel "
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between px-1">
          <div>
            <h2 className="text-[13px] font-bold text-[var(--mn-heading)]">الخدمات المتاحة</h2>
            <p className="text-[9px] font-bold text-[var(--mn-text-muted)]">الخدمات المنشورة والمتاحة من كتالوج منارتك</p>
          </div>
          <span className="rounded-full border border-[var(--mn-accent)]/20 bg-[var(--mn-accent)]/10 px-2 py-1 text-[9px] font-bold text-[var(--mn-accent-text)]">
            {filteredServices.length} خدمة
          </span>
        </div>

        <div className="space-y-2.5">
          {filteredServices.length === 0 ? (
            <div className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-5 text-center shadow-sm mn-panel ">
              <Search className="mx-auto h-6 w-6 text-[var(--mn-text-muted)]" />
              <h3 className="mt-2 text-xs font-bold text-[var(--mn-text)]">لا توجد خدمات مطابقة</h3>
              <p className="mt-1 text-[10px] font-semibold text-[var(--mn-text-muted)]">غيّر البحث أو نوع الخدمة.</p>
            </div>
          ) : (
            filteredServices.map((service) => (
              <article
                key={service.id}
                className="relative group overflow-hidden rounded-2xl border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] bg-[var(--mn-surface)] p-3 shadow-sm transition-all hover:shadow-md mn-panel "
              >
                {onToggleFavorite && (
                  <FavoriteButton
                    active={favoriteIds.includes(service.id)}
                    onToggle={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(service.id);
                    }}
                    className="absolute left-3 top-3 z-20"
                  />
                )}
                <div className="flex items-start gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--mn-accent)]/20 bg-[var(--mn-accent)]/10">
                    {isStudent ? (
                      <GraduationCap className="h-5 w-5 text-[var(--mn-heading)]" />
                    ) : (
                      <Briefcase className="h-5 w-5 text-[var(--mn-heading)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <h3 className="font-['Cairo',sans-serif] text-[12.5px] font-bold leading-5 text-[var(--mn-heading)] sm:text-[13.5px]">
                          {service.title}
                        </h3>
                        <p className="mt-0.5 text-[9px] font-bold text-[var(--mn-accent-text)]">{service.category}</p>
                      </div>
                      <span className="rounded-full bg-[var(--mn-primary)]/10 px-2 py-1 text-[8px] font-bold text-[var(--mn-heading)]">
                        {service.badge}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[10px] font-semibold leading-4 text-[var(--mn-text-muted)]">
                      {service.shortDescription}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  <div className="flex min-h-8 items-center justify-center gap-1 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-2 text-[9px] font-bold text-[var(--mn-text-muted)] mn-panel ">
                    <Clock3 className="h-3 w-3 shrink-0 text-[var(--mn-accent-text)]" />
                    <span className="truncate">{service.turnaround}</span>
                  </div>
                  <div className="flex min-h-8 items-center justify-center gap-1 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-2 text-[9px] font-bold text-[var(--mn-text-muted)] mn-panel ">
                    <Wallet className="h-3 w-3 shrink-0 text-[var(--mn-heading)]" />
                    <span className="truncate">{service.priceLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectService?.(service)}
                    className="col-span-2 flex min-h-8 items-center justify-center gap-1 rounded-lg bg-[var(--mn-primary)] px-2 text-[9.5px] font-bold text-white shadow-2xs transition hover:bg-[var(--mn-primary)] active:scale-95 sm:col-span-1 mn-inverse hover:mn-inverse "
                  >
                    عرض التفاصيل
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

