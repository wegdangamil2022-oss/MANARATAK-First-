import { useTranslation } from '../../../i18n/I18nProvider';
import { serviceCopy } from '../serviceCopy';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  Clock3,
  FileText,
  GraduationCap,
  Briefcase,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Wallet,
  X,
  Sparkles,
} from 'lucide-react';
import { ApiClient } from '../../../api/client';
import { mapService } from '../publicLiveDataSource';
import { Service, ServiceAudience } from '../types';
import { FavoriteButton } from './FavoriteButton';
import { PublicCardsPagination, PublicFilterSelectModal, usePaginatedCatalog } from './DetailUi';

interface ServicesDirectoryPageProps {
  services: Service[];
  remote?: boolean;
  audience: ServiceAudience;
  onBack?: () => void;
  onSelectService?: (service: Service) => void;
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
}

export const ServicesDirectoryPage: React.FC<ServicesDirectoryPageProps> = ({
  services,
  remote = false,
  audience,
  onBack,
  onSelectService,
  favoriteIds = [],
  onToggleFavorite,
}) => {
  const { language, dir } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [remoteRows, setRemoteRows] = useState<Service[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverSearch, setServerSearch] = useState('');
  const sequence = useRef(0);
  const loadingMore = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => setServerSearch(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const categoryCodes: Record<string, string> = {
    'خدمات الطلاب': 'STUDENT_SERVICES',
    'خدمات المستندات': 'DOCUMENT_SERVICES',
    'خدمات التأشيرات': 'VISA_SERVICES',
    'خدمات السفر': 'TRAVEL_SERVICES',
    'خدمات أكاديمية': 'ACADEMIC_SERVICES',
    'خدمات مهنية': 'PROFESSIONAL_SERVICES',
    'خدمات المؤسسات': 'ENTERPRISE_SERVICES',
  };
  useEffect(() => {
    if (!remote) return;
    let current = true;
    const generation = ++sequence.current;
    setLoading(true);
    setError('');
    setRemoteRows([]);
    setCursor(null);
    void ApiClient.getServices({
      search: serverSearch,
      locale: language,
      audience,
      serviceCategory: categoryCodes[selectedCategory],
      limit: 20,
    })
      .then((page) => {
        if (current && generation === sequence.current) {
          setRemoteRows(page.data.map((row) => mapService(row, language)));
          setCursor(page.nextCursor ?? null);
        }
      })
      .catch(() => {
        if (current) setError(serviceCopy('تعذر تحميل الخدمات.', language));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [remote, serverSearch, selectedCategory, language, audience]);
  async function more() {
    if (!cursor || loadingMore.current) return;
    loadingMore.current = true;
    setLoading(true);
    const generation = sequence.current;
    try {
      const page = await ApiClient.getServices({
        search: serverSearch,
        locale: language,
        audience,
        serviceCategory: categoryCodes[selectedCategory],
        cursor,
        limit: 20,
      });
      if (generation === sequence.current) {
        setRemoteRows((previous) => [
          ...previous,
          ...page.data.map((row) => mapService(row, language)),
        ]);
        setCursor(page.nextCursor ?? null);
      }
    } catch {
      setError(serviceCopy('تعذر تحميل الصفحة التالية.', language));
    } finally {
      loadingMore.current = false;
      if (generation === sequence.current) setLoading(false);
    }
  }

  const audienceServices = useMemo(
    () => (remote ? remoteRows : services).filter((service) => service.audience === audience),
    [services, audience, remote, remoteRows],
  );

  const categories = useMemo(
    () => [
      'الكل',
      ...(remote
        ? Object.keys(categoryCodes)
        : Array.from(new Set(audienceServices.map((service) => service.category)))),
    ],
    [audienceServices, remote],
  );

  const filteredServices = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return audienceServices.filter((service) => {
      const matchesCategory = selectedCategory === 'الكل' || service.category === selectedCategory;
      const matchesSearch =
        remote ||
        !normalizedQuery ||
        service.title.toLowerCase().includes(normalizedQuery) ||
        service.shortDescription.toLowerCase().includes(normalizedQuery) ||
        service.category.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesSearch;
    });
  }, [audienceServices, searchQuery, selectedCategory, remote]);

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedServices,
    goToPage,
  } = usePaginatedCatalog(filteredServices, `${searchQuery}|${selectedCategory}|${audience}`, 30);

  const isStudent = audience === 'student';
  const activeFiltersCount =
    (selectedCategory !== 'الكل' ? 1 : 0) + (searchQuery.trim() !== '' ? 1 : 0);

  return (
    <div
      className="min-h-screen bg-[var(--mn-page)] pb-24 text-[var(--mn-heading)] font-['Cairo',sans-serif] select-none mn-panel "
      dir={dir}
    >
      <div aria-live="polite">
        {loading && serviceCopy('جارٍ التحميل…', language)}
        {error && <p role="alert">{error}</p>}
        {remote && cursor && (
          <button type="button" disabled={loading} onClick={() => void more()}>
            {serviceCopy('تحميل المزيد', language)}
          </button>
        )}
      </div>
      <div className="relative mn-search-hero overflow-hidden px-3 sm:px-4 pt-4 pb-3 text-white shadow-xs mn-inverse ">
        <button
          type="button"
          onClick={onBack}
          className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-30 cursor-pointer text-white shadow-xs active:scale-95"
          title={serviceCopy('العودة', language)}
          aria-label={serviceCopy('العودة', language)}
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
            <GraduationCap
              className="absolute -right-5 bottom-0 h-36 w-36 text-[var(--mn-heading)]"
              strokeWidth={1.1}
            />
          ) : (
            <FileText
              className="absolute -right-5 bottom-0 h-36 w-36 text-[var(--mn-heading)]"
              strokeWidth={1.1}
            />
          )}
        </div>

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-2 pt-1">
          <div className="flex justify-center">
            <Sparkles
              className="h-5 w-5 text-[var(--mn-accent-text)] drop-shadow-[0_0_8px_rgba(214,164,59,0.8)]"
              aria-hidden="true"
            />
          </div>

          <div className="space-y-0.5">
            <h1 className="font-['Cairo',sans-serif] text-xl sm:text-2xl font-bold leading-tight tracking-tight text-white">
              {isStudent
                ? serviceCopy('الخدمات الطلابية', language)
                : serviceCopy('الخدمات العامة والدعم', language)}
            </h1>

            {/* Small Gold Horizontal Divider */}
            <div className="flex justify-center pt-1 pb-0.5">
              <div className="w-10 h-0.5 bg-[var(--mn-accent)] rounded-full mn-gold " />
            </div>

            <p className="text-[11px] sm:text-xs text-white font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md mx-auto truncate">
              {isStudent
                ? serviceCopy(
                    'خدمات تساعد الطالب في الاختيار وتجهيز ملفه الأكاديمي والتقديم.',
                    language,
                  )
                : serviceCopy('خدمات مساندة للوثائق والإجراءات المرتبطة برحلة الدراسة.', language)}
            </p>
          </div>

          <div className="pt-1 max-w-sm sm:max-w-md md:max-w-xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={serviceCopy('ابحث عن خدمة...', language)}
                className="w-full py-2.5 pl-4 pr-10 bg-[var(--mn-surface)] text-[var(--mn-heading)] rounded-full text-[12px] font-bold placeholder:text-[var(--mn-text-muted)] placeholder:text-[12px] placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none shadow-md border border-[var(--mn-border)] focus:border-[var(--mn-accent)] transition-all text-center font-['Cairo',sans-serif] mn-panel "
              />
              <Search className="w-4 h-4 text-[var(--mn-accent-text)] absolute right-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--mn-text-muted)] hover:text-[var(--mn-text)] cursor-pointer"
                  aria-label={serviceCopy('مسح البحث', language)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex justify-center mt-2 relative z-10">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('الكل');
              }}
              className="text-[10px] font-bold text-[var(--mn-danger-text)] hover:text-[var(--mn-danger-text)] bg-[var(--mn-surface-elevated)]/95 px-2.5 py-0.5 rounded-full shadow-xs transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif] mn-panel "
            >
              <RotateCcw className="w-3 h-3" />
              <span>{serviceCopy('إعادة التعيين', language)} ({activeFiltersCount})</span>
            </button>
          </div>
        )}

        {/* FLOATING FILTER TILE INSIDE HERO */}
        <div className="max-w-lg md:max-w-2xl mx-auto mn-inline-gutter mt-2.5 relative z-20 pb-0">
          <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsCategoryModalOpen(true);
                }
              }}
              onClick={() => setIsCategoryModalOpen(true)}
              className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer mn-panel font-['Cairo',sans-serif]"
              title={serviceCopy('نوع الخدمة', language)}
            >
              <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-bold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="truncate font-['Cairo',sans-serif]">
                  {selectedCategory === 'الكل'
                    ? serviceCopy('نوع الخدمة', language)
                    : serviceCopy(selectedCategory, language)}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)] mt-0.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Gold Divider Ribbon Line */}
      <div className="w-full h-0.5 bg-gradient-to-r from-[var(--mn-accent-text)] via-[var(--mn-accent-soft)] to-[var(--mn-accent-text)] shadow-xs mb-1" />

      <div className="relative z-20 mx-auto pt-3 max-w-md mn-inline-gutter pb-24 sm:max-w-xl md:max-w-[1120px] lg:max-w-[1160px]">
        <div className="mb-2 flex items-center justify-between px-1">
          <div>
            <h2 className="text-[13px] font-bold text-[var(--mn-heading)]">
              {serviceCopy('الخدمات المتاحة', language)}
            </h2>
            <p className="text-[9px] font-bold text-[var(--mn-text-muted)]">
              {serviceCopy('الخدمات المنشورة والمتاحة من كتالوج منارتك', language)}
            </p>
          </div>
          <span className="rounded-full border border-[var(--mn-accent)]/20 bg-[var(--mn-accent)]/10 px-2 py-1 text-[9px] font-bold text-[var(--mn-accent-text)]">
            {filteredServices.length}
            {serviceCopy('خدمة', language)}
          </span>
        </div>

        <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch">
          {filteredServices.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-5 text-center shadow-sm mn-panel ">
              <Search className="mx-auto h-6 w-6 text-[var(--mn-text-muted)]" />
              <h3 className="mt-2 text-xs font-bold text-[var(--mn-text)]">
                {serviceCopy('لا توجد خدمات مطابقة', language)}
              </h3>
              <p className="mt-1 text-[10px] font-semibold text-[var(--mn-text-muted)]">
                {serviceCopy('غيّر البحث أو نوع الخدمة.', language)}
              </p>
            </div>
          ) : (
            <>
              {paginatedServices.map((service) => (
                <article
                  key={service.id}
                  className="relative group overflow-hidden rounded-2xl border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] bg-[var(--mn-surface)] p-3 md:p-4 shadow-sm transition-all hover:shadow-md mn-panel h-full flex flex-col justify-between"
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
                          <p className="mt-0.5 text-[9px] font-bold text-[var(--mn-accent-text)]">
                            {serviceCopy(service.category, language)}
                          </p>
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
                      {serviceCopy('عرض التفاصيل', language)}
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                  </div>
                </article>
              ))}

              <div className="col-span-full">
                <PublicCardsPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredServices.length}
                  pageSize={30}
                  onPageChange={goToPage}
                  dir={dir}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <PublicFilterSelectModal
        isOpen={isCategoryModalOpen}
        title={serviceCopy('نوع الخدمة', language)}
        icon={SlidersHorizontal}
        selectedValue={selectedCategory}
        onSelect={(val) => setSelectedCategory(val)}
        onClose={() => setIsCategoryModalOpen(false)}
        dir={dir}
        options={categories.map((category) => {
          const val = serviceCopy(category, language);
          return { value: val, label: val };
        })}
      />
    </div>
  );
};
