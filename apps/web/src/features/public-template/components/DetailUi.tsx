import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useEffect, useState, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';

export interface PublicFilterSelectOption {
  value: string;
  label: string;
}

export function PublicInlineFilterPanel({
  isOpen,
  title,
  icon: Icon,
  options,
  selectedValue,
  value,
  onSelect,
  onChange,
  onClose,
  dir = 'rtl',
  maxWidthClass = 'max-w-4xl md:max-w-[1120px] lg:max-w-[1160px]',
}: {
  isOpen: boolean;
  title: string;
  icon?: LucideIcon;
  options: PublicFilterSelectOption[];
  selectedValue?: string;
  value?: string;
  onSelect?: (value: string) => void;
  onChange?: (value: string) => void;
  onClose: () => void;
  dir?: 'rtl' | 'ltr';
  maxWidthClass?: string;
}) {
  const { t: publicT } = usePublicTemplateTranslation();
  if (!isOpen) return null;
  const HeaderIcon = Icon || SlidersHorizontal;
  const currentValue = selectedValue !== undefined ? selectedValue : value;
  const handleSelect = onSelect || onChange;
  const hasLongOption = options.some((opt) => (opt.label || '').trim().length > 15);
  const showScrollHint = hasLongOption ? options.length > 5 : options.length > 8;

  return (
    <div
      dir={dir}
      className={`w-full ${maxWidthClass} mx-auto px-1.5 sm:px-2 md:px-4 -mt-1.5 sm:-mt-2.5 mb-2.5 sm:mb-3`}
    >
      <div className="relative overflow-hidden bg-white dark:bg-[#111E38] border border-[#142B5F]/10 dark:border-white/10 rounded-xl shadow-[0_1px_6px_rgba(20,43,95,0.035)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] px-2.5 py-2 sm:px-3.5 sm:py-2.5 font-['Cairo',sans-serif] select-none mn-panel">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#0E7C86]/45 to-transparent"
        />

        {/* Compact Header */}
        <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[#142B5F]/8 dark:border-white/8">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="relative w-6 h-6 rounded-md bg-[#142B5F] text-[#F2CD78] flex items-center justify-center shrink-0 overflow-hidden">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 right-0 w-1.5 h-1.5 bg-[#D6A43B] rounded-bl-[3px]"
              />
              <HeaderIcon className="w-3 h-3 text-[#F2CD78] relative z-10" />
            </span>
            <h4 className="text-[11px] sm:text-[12px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] truncate font-['Cairo',sans-serif]">
              {title}
            </h4>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={publicT('public_close')}
            className="w-6 h-6 !min-h-[24px] rounded-md bg-[#F6F8FA] dark:bg-[#0B1529] border border-[#142B5F]/10 dark:border-white/10 text-[#142B5F] dark:text-[#EDF5F5] hover:border-[#0E7C86] hover:text-[#0E7C86] flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Adaptive Compact Options Grid — 1 col on mobile when labels are long so text never clips or overflows */}
        <div
          className={`grid ${hasLongOption ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-1.5 max-h-[212px] sm:max-h-[232px] overflow-y-auto overscroll-contain scroll-smooth py-0.5 pe-0.5`}
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#0E7C86 transparent' }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === currentValue;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  handleSelect?.(opt.value);
                  onClose();
                }}
                className={`w-full min-w-0 overflow-hidden !min-h-[34px] flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[10.5px] sm:text-[11.5px] font-bold font-['Cairo',sans-serif] transition-colors cursor-pointer text-start ${
                  isSelected
                    ? 'bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white'
                    : 'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#162747] text-[#142B5F] dark:text-[#DCE7F0] border border-[#142B5F]/8 dark:border-white/8 hover:border-[#0E7C86]/40'
                }`}
              >
                <span
                  className={`min-w-0 flex-1 font-['Cairo',sans-serif] ${
                    hasLongOption ? 'leading-snug break-words whitespace-normal' : 'truncate'
                  }`}
                >
                  {opt.label}
                </span>
                {isSelected ? (
                  <Check className="w-3 h-3 text-[#38C6D4] shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#142B5F]/18 dark:bg-white/20" />
                )}
              </button>
            );
          })}
        </div>

        {/* Compact Scroll Hint only when list scrolls */}
        {showScrollHint && (
          <div className="mt-1.5 pt-1 border-t border-[#142B5F]/8 dark:border-white/8 flex items-center justify-center gap-1 text-[9px] font-bold text-[#0E7C86] dark:text-[#38C6D4] font-['Cairo',sans-serif]">
            <ChevronDown className="w-2.5 h-2.5" />
            <span>{dir === 'ltr' ? `Scroll for more (${options.length})` : `اسحب لعرض بقية الخيارات (${options.length})`}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PublicFilterSelectModal({
  isOpen,
  title,
  icon: Icon,
  options,
  selectedValue,
  value,
  onSelect,
  onChange,
  onClose,
  dir = 'rtl',
}: {
  isOpen: boolean;
  title: string;
  icon?: LucideIcon;
  options: PublicFilterSelectOption[];
  selectedValue?: string;
  value?: string;
  onSelect?: (value: string) => void;
  onChange?: (value: string) => void;
  onClose: () => void;
  dir?: 'rtl' | 'ltr';
}) {
  return (
    <PublicInlineFilterPanel
      isOpen={isOpen}
      title={title}
      icon={Icon}
      options={options}
      selectedValue={selectedValue}
      value={value}
      onSelect={onSelect}
      onChange={onChange}
      onClose={onClose}
      dir={dir}
    />
  );
}

export function usePaginatedCatalog<T>(
  items: T[],
  resetTrigger?: string,
  pageSize = 30,
) {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [resetTrigger]);

  const totalItems = items.length;
  const totalPages = useMemo(() => {
    if (totalItems === 0) return 1;
    return Math.max(2, Math.ceil(totalItems / pageSize));
  }, [totalItems, pageSize]);

  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const pageItems = useMemo(() => {
    if (totalItems === 0) return [];
    const start = (safePage - 1) * pageSize;
    const sliced = items.slice(start, start + pageSize);
    if (sliced.length > 0) return sliced;
    // When preview dataset has <= 30 items and user selects page 2, show the second half cleanly
    if (totalItems > 1) {
      return items.slice(Math.floor(totalItems / 2));
    }
    return items;
  }, [items, safePage, pageSize, totalItems]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return {
    currentPage: safePage,
    setCurrentPage,
    goToPage,
    totalPages,
    pageItems,
    paginatedItems: pageItems,
    totalItems,
  };
}

export function PublicCardsPagination({
  currentPage,
  totalPages,
  onPageChange,
  dir = 'rtl',
}: {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  dir?: 'rtl' | 'ltr';
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, idx) => idx + 1);
  const isRtl = dir !== 'ltr';

  const handleSelectPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  return (
    <nav
      aria-label={isRtl ? 'التنقل بين الصفحات' : 'Pagination'}
      dir={dir}
      className="pt-3 pb-2 flex items-center justify-center gap-1.5 font-['Cairo',sans-serif] select-none"
    >
      {/* Previous Page Button */}
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => handleSelectPage(currentPage - 1)}
        className={`h-9 px-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all font-['Cairo',sans-serif] ${
          currentPage <= 1
            ? 'bg-[var(--mn-surface)]/50 text-[var(--mn-text-muted)]/50 border-[var(--mn-border)] cursor-not-allowed'
            : 'bg-[var(--mn-surface)] hover:bg-[#142B5F]/8 text-[#142B5F] dark:text-[#F2CD78] border-[#142B5F]/35 dark:border-[#D6A43B]/45 hover:border-[#142B5F] cursor-pointer active:scale-95 shadow-2xs'
        }`}
      >
        {isRtl ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        <span>{isRtl ? 'السابق' : 'Prev'}</span>
      </button>

      {/* Numbered Page Buttons (1, 2, ...) */}
      <div className="flex items-center gap-1.5">
        {pages.map((page) => {
          const isActive = page === currentPage;
          return (
            <button
              key={page}
              type="button"
              onClick={() => handleSelectPage(page)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-w-[36px] h-9 px-3 rounded-xl font-bold text-[12px] flex items-center justify-center transition-all cursor-pointer font-['Cairo',sans-serif] ${
                isActive
                  ? 'bg-[#142B5F] text-white border border-[#142B5F] shadow-[0_4px_12px_rgba(20,43,95,0.28)] scale-[1.03]'
                  : 'bg-[var(--mn-surface)] hover:bg-[#142B5F]/8 text-[#142B5F] dark:text-[#F2CD78] border border-[#142B5F]/35 dark:border-[#D6A43B]/45 hover:border-[#142B5F] shadow-2xs active:scale-95'
              }`}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Next Page Button */}
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => handleSelectPage(currentPage + 1)}
        className={`h-9 px-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all font-['Cairo',sans-serif] ${
          currentPage >= totalPages
            ? 'bg-[var(--mn-surface)]/50 text-[var(--mn-text-muted)]/50 border-[var(--mn-border)] cursor-not-allowed'
            : 'bg-[var(--mn-surface)] hover:bg-[#142B5F]/8 text-[#142B5F] dark:text-[#F2CD78] border-[#142B5F]/35 dark:border-[#D6A43B]/45 hover:border-[#142B5F] cursor-pointer active:scale-95 shadow-2xs'
        }`}
      >
        <span>{isRtl ? 'التالي' : 'Next'}</span>
        {isRtl ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
    </nav>
  );
}

export function DetailSectionHeader({
  id,
  icon: Icon,
  iconNode,
  title,
  subtitle,
  level = 2,
  className = '',
  titleClassName = '',
  iconClassName = '',
}: {
  id?: string;
  icon?: LucideIcon;
  iconNode?: React.ReactNode;
  title: string;
  subtitle?: string;
  level?: 2 | 3 | 4;
  className?: string;
  titleClassName?: string;
  iconClassName?: string;
}) {
  const Heading = level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4';
  return (
    <div id={id} className={`mn-detail-section-header scroll-mt-28 flex flex-col items-center text-center ${className}`}>
      <div className="mn-detail-section-header-row">
        <span className={`mn-detail-section-icon shrink-0 ${iconClassName}`} aria-hidden="true">{Icon ? <Icon className="h-4 w-4" /> : iconNode}</span>
        <Heading className={`mn-detail-section-title ${titleClassName}`}>{title}</Heading>
      </div>
      {subtitle ? <p className="mt-1 text-[11px] font-medium leading-5 text-[var(--mn-text-muted)] max-w-xl mx-auto text-center">{subtitle}</p> : null}
    </div>
  );
}

export function DetailBackButton({
  onBack,
  mode = 'back',
  className = '',
}: {
  onBack: () => void;
  mode?: 'back' | 'close';
  className?: string;
}) {
  const { t: publicT } = usePublicTemplateTranslation();

  return (
    <button
      type="button"
      onClick={onBack}
      className={`mn-detail-close ${className}`}
      aria-label={mode === 'close' ? publicT('public_close') : publicT('public_back')}
      title={mode === 'close' ? publicT('public_close') : publicT('public_back')}
    >
      {mode === 'close' ? <X className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
    </button>
  );
}

/** Scrolls to a stable section anchor after a detail view opens and highlights it briefly. */
export function useDetailSearchTarget(anchor?: string, searchTerm?: string) {
  useEffect(() => {
    if (!anchor) return;
    let timer: number | undefined;
    let target: HTMLElement | null = null;
    let marked: HTMLElement | null = null;
    const frame = requestAnimationFrame(() => {
      target = document.getElementById(anchor);
      if (!target) return;
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      target.classList.add('mn-search-highlight');
      target.setAttribute('data-search-match', searchTerm || 'true');

      const needle = searchTerm?.trim();
      if (needle) {
        const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent || parent.closest('script, style, [aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;
            const value = node.nodeValue || '';
            return value.toLocaleLowerCase().includes(needle.toLocaleLowerCase()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
          },
        });
        const textNode = walker.nextNode() as Text | null;
        if (textNode?.nodeValue) {
          const at = textNode.nodeValue.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
          if (at >= 0) {
            const range = document.createRange();
            range.setStart(textNode, at);
            range.setEnd(textNode, at + needle.length);
            marked = document.createElement('mark');
            marked.className = 'mn-search-term-mark';
            range.surroundContents(marked);
          }
        }
      }

      timer = window.setTimeout(() => {
        target?.classList.remove('mn-search-highlight');
        target?.removeAttribute('data-search-match');
        if (marked?.parentNode) marked.replaceWith(document.createTextNode(marked.textContent || ''));
      }, 1900);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer !== undefined) window.clearTimeout(timer);
      target?.classList.remove('mn-search-highlight');
      target?.removeAttribute('data-search-match');
      if (marked?.parentNode) marked.replaceWith(document.createTextNode(marked.textContent || ''));
    };
  }, [anchor, searchTerm]);
}
