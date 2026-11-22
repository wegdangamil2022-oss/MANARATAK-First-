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
import { PublicCardsPagination, PublicInlineFilterPanel, usePaginatedCatalog } from './DetailUi';

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
      className="min-h-screen bg-[#F6F8FA] dark:bg-[#0A1326] pb-24 text-[#203442] dark:text-[#EDF5F5] font-['Cairo',sans-serif] select-none mn-panel dark:[--mn-border:rgba(255,255,255,0.12)]"
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
      <div className="relative mn-search-hero overflow-hidden px-3 sm:px-4 pt-2.5 pb-2.5 sm:pt-4 sm:pb-3 text-white shadow-xs mn-inverse">
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
              <div key={index} className="h-1 w-1 rounded-full bg-[#F2CD78]" />
            ))}
          </div>
          <div className="absolute -left-12 -top-12 h-56 w-56 rounded-full border border-[#D6A43B]/20" />
          <div className="absolute -left-6 -top-6 h-72 w-72 rounded-full border border-[#34BFC9]/15" />
          {isStudent ? (
            <GraduationCap
              className="absolute -right-5 bottom-0 h-32 w-32 text-white/10"
              strokeWidth={1.1}
            />
          ) : (
            <FileText
              className="absolute -right-5 bottom-0 h-32 w-32 text-white/10"
              strokeWidth={1.1}
            />
          )}
        </div>

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-1.5 sm:space-y-2 md:space-y-3 pt-0.5 md:pt-2">
          <div className="flex justify-center">
            <Sparkles
              className="h-4.5 w-4.5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#F2CD78] drop-shadow-[0_0_8px_rgba(214,164,59,0.75)]"
              aria-hidden="true"
            />
          </div>

          <div className="space-y-0.5 md:space-y-1">
            <h1 className="font-['Cairo',sans-serif] text-xl sm:text-2xl md:text-3xl font-bold leading-tight tracking-tight text-white">
              {isStudent
                ? serviceCopy('الخدمات الطلابية', language)
                : serviceCopy('الخدمات العامة والدعم', language)}
            </h1>

            <div className="flex justify-center pt-0.5 pb-0.5 md:pt-1.5">
              <div className="w-10 md:w-14 h-0.5 bg-gradient-to-r from-[#D6A43B] via-[#F2CD78] to-[#D6A43B] rounded-full" />
            </div>

            <p className="text-[10px] sm:text-xs md:text-sm text-[#DDEFF2] font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto px-2 line-clamp-2">
              {isStudent
                ? serviceCopy(
                    'خدمات تساعد الطالب في الاختيار وتجهيز ملفه الأكاديمي والتقديم.',
                    language,
                  )
                : serviceCopy('خدمات مساندة للوثائق والإجراءات المرتبطة برحلة الدراسة.', language)}
            </p>
          </div>

          <div className="pt-0.5 md:pt-2 max-w-sm sm:max-w-md md:max-w-xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={serviceCopy('ابحث عن خدمة...', language)}
                className="w-full py-2 sm:py-2.5 md:py-3 pl-4 pr-10 md:pr-11 bg-white dark:bg-[#111E38] text-[#203442] dark:text-[#EDF5F5] rounded-full text-[12px] md:text-sm font-bold placeholder:text-[#5C707C] dark:placeholder:text-[#9BB4C7] focus:outline-none shadow-md border border-[#142B5F]/12 dark:border-white/14 focus:border-[#0E7C86] dark:focus:border-[#34BFC9] transition-all text-center font-['Cairo',sans-serif] mn-panel"
              />
              <Search className="w-4 h-4 md:w-4.5 md:h-4.5 text-[#0E7C86] dark:text-[#34BFC9] absolute right-3.5 md:right-4 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-[#5C707C] dark:text-[#9BB4C7] hover:text-[#142B5F] dark:hover:text-white cursor-pointer"
                  aria-label={serviceCopy('مسح البحث', language)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex justify-center mt-1.5 md:mt-2.5 relative z-10">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('الكل');
              }}
              className="text-[10px] md:text-xs font-bold text-[#142B5F] dark:text-[#F2CD78] bg-white/95 dark:bg-[#111E38]/95 border border-[#142B5F]/15 dark:border-[#F2CD78]/30 px-2.5 md:px-3.5 py-0.5 md:py-1 rounded-full shadow-xs transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif] mn-panel"
            >
              <RotateCcw className="w-3 h-3 text-[#0E7C86] dark:text-[#34BFC9]" />
              <span>{serviceCopy('إعادة التعيين', language)} ({activeFiltersCount})</span>
            </button>
          </div>
        )}

        {/* BALANCED FILTER TILE INSIDE HERO */}
        <div className="max-w-[170px] sm:max-w-[210px] md:max-w-[240px] mx-auto mt-2 sm:mt-2.5 md:mt-3.5 relative z-20 pb-0 md:pb-1">
          <div className="grid grid-cols-1 gap-1.5 sm:gap-2.5">
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsCategoryModalOpen((prev) => !prev);
                }
              }}
              onClick={() => setIsCategoryModalOpen((prev) => !prev)}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                isCategoryModalOpen
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedCategory !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]`}
              title={serviceCopy('نوع الخدمة', language)}
            >
              <div className="min-w-0 flex items-center justify-center gap-1 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-[13px] font-['Cairo',sans-serif] w-full">
                <SlidersHorizontal className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                <span className="min-w-0 truncate font-['Cairo',sans-serif]">
                  {selectedCategory === 'الكل'
                    ? serviceCopy('نوع الخدمة', language)
                    : serviceCopy(selectedCategory, language)}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${isCategoryModalOpen ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Gold Divider Ribbon Line */}
      <div className="w-full h-[1.5px] bg-gradient-to-r from-[#D6A43B]/45 via-[#F2CD78] to-[#D6A43B]/45 dark:from-[#D6A43B]/30 dark:via-[#F2CD78]/65 dark:to-[#D6A43B]/30 mb-3 md:mb-5" />

      {/* Inline Attached Filter Panel */}
      <PublicInlineFilterPanel
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

      <div className="relative z-20 mx-auto pt-1 max-w-4xl px-1 sm:px-2 md:px-4 pb-24 md:max-w-[1120px] lg:max-w-[1160px] space-y-3 md:space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-[11.5px] sm:text-[13px] md:text-sm font-bold text-[#142B5F] dark:text-[#EDF5F5]">
              {serviceCopy('الخدمات المتاحة', language)}
            </h2>
            <p className="text-[9.5px] sm:text-[10px] font-medium text-[#5C707C] dark:text-[#9BB4C7]">
              {serviceCopy('الخدمات المنشورة والمتاحة من كتالوج منارتك', language)}
            </p>
          </div>
          <span className="rounded-full border border-[#0E7C86]/20 dark:border-[#34BFC9]/30 bg-[#DDEFF2]/80 dark:bg-[#0E7C86]/20 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-[#0E7C86] dark:text-[#34BFC9]">
            {filteredServices.length}{' '}
            {serviceCopy('خدمة', language)}
          </span>
        </div>

        <div className="flex flex-col gap-2.5 sm:gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch">
          {filteredServices.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-[#142B5F]/12 dark:border-white/10 bg-white dark:bg-[#111E38] p-6 text-center shadow-2xs mn-panel">
              <Search className="mx-auto h-6 w-6 text-[#0E7C86] dark:text-[#34BFC9]" />
              <h3 className="mt-2 text-xs font-bold text-[#142B5F] dark:text-[#EDF5F5]">
                {serviceCopy('لا توجد خدمات مطابقة', language)}
              </h3>
              <p className="mt-1 text-[10px] font-medium text-[#5C707C] dark:text-[#9BB4C7]">
                {serviceCopy('غيّر البحث أو نوع الخدمة.', language)}
              </p>
            </div>
          ) : (
            <>
              {paginatedServices.map((service) => (
                <article
                  key={service.id}
                  onClick={() => onSelectService?.(service)}
                  className="relative group overflow-hidden rounded-r-[4px] rounded-l-2xl border border-[#142B5F]/12 dark:border-white/10 border-r-3 border-r-[#142B5F] dark:border-r-[#F2CD78]/85 hover:border-[#142B5F]/28 dark:hover:border-[#F2CD78]/45 bg-white dark:bg-[#111E38] p-2.5 sm:p-3 md:p-4 shadow-[0_4px_16px_rgba(20,43,95,0.04)] hover:shadow-[0_8px_24px_rgba(20,43,95,0.08)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.28)] transition-all active:scale-[0.985] cursor-pointer mn-panel h-full flex flex-col justify-between gap-2 sm:gap-2.5"
                >
                  {onToggleFavorite && (
                    <FavoriteButton
                      active={favoriteIds.includes(service.id)}
                      onToggle={(event) => {
                        event.stopPropagation();
                        onToggleFavorite(service.id);
                      }}
                      className="absolute left-2.5 top-2.5 z-20"
                    />
                  )}
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-9.5 w-9.5 sm:h-10.5 sm:w-10.5 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white shadow-xs mn-inverse">
                      {isStudent ? (
                        <GraduationCap className="h-4.5 w-4.5 text-white" />
                      ) : (
                        <Briefcase className="h-4.5 w-4.5 text-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pl-9">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="font-['Cairo',sans-serif] text-[11.5px] sm:text-[13px] md:text-[13.5px] font-bold leading-snug text-[#142B5F] dark:text-[#EDF5F5] group-hover:text-[#0E7C86] dark:group-hover:text-[#F2CD78] transition-colors">
                          {service.title}
                        </h3>
                        <span className="rounded-full bg-[#DDEFF2]/85 dark:bg-[#0E7C86]/20 border border-[#0E7C86]/18 dark:border-[#34BFC9]/25 px-2 py-0.5 text-[8.5px] sm:text-[9px] font-bold text-[#0E7C86] dark:text-[#34BFC9]">
                          {service.badge}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[9.5px] sm:text-[10px] font-bold text-[#0E7C86] dark:text-[#34BFC9]">
                        {serviceCopy(service.category, language)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[10px] sm:text-[11px] font-medium leading-4.5 text-[#5C707C] dark:text-[#9BB4C7]">
                        {service.shortDescription}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#142B5F]/8 dark:border-white/8 sm:grid-cols-3">
                    <div className="min-w-0 overflow-hidden flex min-h-8 items-center justify-start gap-1.5 rounded-lg border border-[#142B5F]/8 dark:border-white/8 bg-[#F6F8FA] dark:bg-[#0B1529]/85 px-2 py-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] mn-panel">
                      <Clock3 className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
                      <span className="min-w-0 leading-tight line-clamp-2 break-words">{service.turnaround}</span>
                    </div>
                    <div className="min-w-0 overflow-hidden flex min-h-8 items-center justify-start gap-1.5 rounded-lg border border-[#142B5F]/8 dark:border-white/8 bg-[#F6F8FA] dark:bg-[#0B1529]/85 px-2 py-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] mn-panel">
                      <Wallet className="h-3.5 w-3.5 shrink-0 text-[#0E7C86] dark:text-[#34BFC9]" />
                      <span className="min-w-0 leading-tight line-clamp-2 break-words">{service.priceLabel}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectService?.(service);
                      }}
                      className="min-w-0 overflow-hidden col-span-2 flex min-h-8 items-center justify-center gap-1 rounded-lg bg-[#142B5F] hover:bg-[#0E7C86] dark:bg-[#162A52] dark:hover:bg-[#1C3566] border border-transparent dark:border-[#F2CD78]/35 px-2.5 text-[10px] sm:text-[11px] font-bold text-white dark:text-[#F2CD78] shadow-2xs transition-all active:scale-95 cursor-pointer sm:col-span-1 mn-inverse"
                    >
                      <span className="truncate">{serviceCopy('عرض التفاصيل', language)}</span>
                      <ChevronLeft className="h-3.5 w-3.5 text-[#F2CD78] shrink-0" />
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

    </div>
  );
};
