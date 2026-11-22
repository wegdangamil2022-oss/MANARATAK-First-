import React from 'react';
import { ArrowUpLeft } from 'lucide-react';

/**
 * Approved Manaratak Home Section Primitives
 * Strictly aligned with MajorDetailPrimitives & Chinese Government Scholarship:
 * - Outer section card: Pure White (#FFFFFF / dark #111E38), border #142B5F/10, delicate top hairline
 * - Inner boxes/cards: Neutral Frost (#F6F8FA / dark #0B1529), border #142B5F/8
 * - Main section header icon: Navy (#142B5F) + Gold corner (#D6A43B) + Light Gold icon (#F2CD78)
 * - Main section underline: Thin, delicate Petrol hairline (1.5px)
 * - Inner card icon badge: Unified Navy-to-Petrol gradient (#142B5F -> #0E7C86) with crisp white icon
 * - Section bottom CTA: Clean soft-petrol-border button with circular arrow
 */

export const HOME_INNER_CARD_CLASS =
  'bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#142342] border border-[#142B5F]/12 dark:border-white/10 hover:border-[#0E7C86]/45 dark:hover:border-[#38C6D4]/50 shadow-[0_1px_5px_rgba(20,43,95,0.045)] hover:shadow-[0_4px_14px_rgba(20,43,95,0.085)] transition-all duration-200';

export const HOME_INNER_ICON_CLASS =
  'bg-gradient-to-br from-[#142B5F] via-[#133A6A] to-[#0E7C86] border border-[#142B5F]/15 dark:border-[#38C6D4]/30 text-white shadow-[0_2px_8px_rgba(20,43,95,0.16)]';

interface HomeSectionShellProps {
  id?: string;
  ariaLabelledBy?: string;
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}

export const HomeSectionShell: React.FC<HomeSectionShellProps> = ({
  id,
  ariaLabelledBy,
  className = '',
  innerClassName = '',
  children,
}) => {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={`w-full px-0 py-0.5 sm:py-1.5 font-['Cairo',sans-serif] ${className}`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl sm:rounded-3xl px-1.5 py-2.5 sm:px-4 sm:py-4 md:px-6 md:py-5.5 bg-white dark:bg-[#111E38] border border-[#142B5F]/10 dark:border-white/10 shadow-[0_2px_12px_rgba(20,43,95,0.04)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.25)] transition-colors ${innerClassName}`}
      >
        {/* Subtle approved top hairline matching MajorDetailPrimitives */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#142B5F]/32 dark:via-[#D6A43B]/35 to-transparent"
        />
        <div className="relative z-10">{children}</div>
      </div>
    </section>
  );
};

interface HomeSectionHeaderProps {
  id?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon: React.ReactNode;
  align?: 'center' | 'true-center' | 'start' | 'start-md';
  compact?: boolean;
  actionSlot?: React.ReactNode;
  className?: string;
}

export const HomeSectionHeader: React.FC<HomeSectionHeaderProps> = ({
  id,
  title,
  subtitle,
  icon,
  align = 'center',
  compact = false,
  actionSlot,
  className = 'mb-2 sm:mb-3 md:mb-4',
}) => {
  const isStart = align === 'start';
  const isStartMd = align === 'start-md';
  const isTrueCenter = align === 'true-center';

  // Flexible leading rail (matching approved MajorSectionHeader):
  // Visually centers each heading inside the card while anchoring every section's
  // Navy-Gold icon along one balanced vertical axis across the entire Home page.
  const spacerClass =
    isStart || isTrueCenter
      ? 'hidden'
      : isStartMd
        ? 'grow-0 shrink basis-[22%] sm:basis-[26%] md:basis-0'
        : compact
          ? 'grow-0 shrink basis-[22%] sm:basis-[26%] md:basis-[28%]'
          : 'grow-0 shrink basis-[22%] sm:basis-[26%] md:basis-[39%]';

  return (
    <div
      className={`${
        isStart ? 'text-start' : isStartMd ? 'text-center md:text-start' : 'text-center'
      } font-['Cairo',sans-serif] ${className}`}
    >
      <div
        className={`flex items-center gap-2 mb-1 w-full ${
          actionSlot ? 'justify-between' : isTrueCenter ? 'justify-center' : 'justify-start'
        }`}
      >
        {!actionSlot && !isTrueCenter && <span aria-hidden="true" className={spacerClass} />}

        <h3
          id={id}
          className="text-[13px] sm:text-[14.5px] md:text-[16px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] inline-flex items-center gap-2 leading-tight font-['Cairo',sans-serif] shrink-0 max-w-full"
        >
          {/* Approved Navy Square with Gold Corner & Light Gold Icon — Balanced Center Vertical Rail */}
          <span
            aria-hidden="true"
            className="relative overflow-hidden w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 md:w-8 md:h-8 rounded-lg bg-[#142B5F] text-[#F2CD78] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(20,43,95,0.2)]"
          >
            <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 bg-[#D6A43B] rounded-bl-[4px]" />
            <span className="relative z-10 inline-flex items-center justify-center text-[#F2CD78]">
              {icon}
            </span>
          </span>

          <span className={`inline-flex flex-col min-w-0 ${isTrueCenter ? 'items-center' : 'items-start'}`}>
            <span className="truncate">{title}</span>
            {/* Thin, Delicate Petrol Underline */}
            <span
              aria-hidden="true"
              className={`w-full min-w-[84px] md:min-w-[112px] h-[1.5px] mt-0.5 sm:mt-1 rounded-full ${
                isStart
                  ? 'bg-[linear-gradient(270deg,rgba(14,124,134,0.65)_0%,rgba(14,124,134,0.35)_68%,transparent_100%)] dark:bg-[linear-gradient(270deg,rgba(56,198,212,0.75)_0%,rgba(56,198,212,0.38)_68%,transparent_100%)]'
                  : 'bg-[linear-gradient(90deg,transparent_0%,rgba(14,124,134,0.6)_18%,rgba(14,124,134,0.6)_82%,transparent_100%)] dark:bg-[linear-gradient(90deg,transparent_0%,rgba(56,198,212,0.68)_18%,rgba(56,198,212,0.68)_82%,transparent_100%)]'
              }`}
            />
          </span>
        </h3>

        {actionSlot && <div className="shrink-0">{actionSlot}</div>}
      </div>

      {subtitle && (
        <p
          className={`text-[10px] sm:text-[11px] md:text-[12px] font-semibold leading-snug text-[#5C707C] dark:text-[#9BB4C7] font-['Cairo',sans-serif] px-1 sm:px-0 whitespace-nowrap overflow-hidden text-ellipsis sm:whitespace-normal ${
            isStart
              ? 'max-w-2xl ps-9 sm:ps-9.5 md:ps-10'
              : isStartMd
                ? 'mx-auto max-w-full md:mx-0 md:max-w-2xl md:ps-10'
                : 'mx-auto max-w-full md:max-w-2xl'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

interface HomeSectionCtaProps {
  id?: string;
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
}

export const HomeSectionCta: React.FC<HomeSectionCtaProps> = ({
  id,
  label,
  onClick,
  className = '',
}) => {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-xl px-4 py-1.5 sm:py-2.5 md:py-3 bg-[#F6F8FA] hover:bg-gradient-to-l hover:from-[#142B5F] hover:via-[#133A6A] hover:to-[#0E7C86] dark:bg-[#0B1529]/80 dark:hover:from-[#0E7C86] dark:hover:to-[#142B5F] border border-[#0E7C86]/28 hover:border-transparent dark:border-[#38C6D4]/30 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] font-['Cairo',sans-serif] cursor-pointer ${className}`}
    >
      <span className="text-[11px] sm:text-[12px] md:text-[13px] font-extrabold text-[#142B5F] group-hover:text-white dark:text-[#EDF5F5] text-center transition-colors">
        {label}
      </span>
      <span className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-[#0E7C86]/12 group-hover:bg-white/20 dark:bg-[#38C6D4]/15 inline-flex items-center justify-center shrink-0 transition-colors">
        <ArrowUpLeft className="w-3.5 h-3.5 text-[#0E7C86] group-hover:text-[#F2CD78] dark:text-[#38C6D4] stroke-[2.5] transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </button>
  );
};
