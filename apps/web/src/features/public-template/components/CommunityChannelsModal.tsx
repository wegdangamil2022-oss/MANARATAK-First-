import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import { useOverlayDialog } from '../useOverlayDialog';
import {
  ArrowUpLeft,
  Award,
  BookOpen,
  Compass,
  GraduationCap,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import {
  COMMUNITY_CHANNELS,
  type ChannelAvatarCode,
  type ChannelCategoryFilter,
  type ChannelCategorySection,
  type CommunityChannelItem,
  getGroupedCommunityChannels,
} from '../communityChannelsData';

interface CommunityChannelsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTION_ICONS: Record<
  Exclude<ChannelCategoryFilter, 'all'>,
  React.ComponentType<{ className?: string }>
> = {
  'whatsapp-channels': Award,
  'telegram-channels': BookOpen,
  'telegram-groups': Users,
  'whatsapp-groups': GraduationCap,
};

/**
 * أيقونة واتساب الرسمية باللون الأخضر الأصلي (#25D366) بحجم متناسق مع الجداول والأزرار
 */
function WhatsAppBrandIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      fill="none"
    >
      <circle cx="12" cy="12" r="11" fill="#25D366" />
      <path
        d="M12.04 5.5a6.48 6.48 0 0 0-5.54 9.86L5.6 18.5l3.24-.85a6.47 6.47 0 0 0 3.2.84h.01a6.49 6.49 0 0 0 0-12.99Zm3.81 9.25c-.16.45-.94.86-1.31.92-.34.05-.77.08-1.25-.08-.29-.09-.66-.22-1.14-.43-2.01-.87-3.32-2.9-3.42-3.03-.1-.14-.82-1.08-.82-2.07 0-.98.52-1.47.7-1.67.18-.2.4-.25.53-.25.13 0 .27 0 .38.01.12.01.29-.05.45.34.17.4.57 1.38.62 1.48.05.1.08.22.02.35-.07.14-.1.22-.2.34-.1.12-.21.26-.3.35-.1.1-.2.21-.09.41.12.2.52.86 1.12 1.39.77.68 1.41.9 1.61 1 .2.1.32.08.44-.05.12-.14.5-.58.64-.78.13-.2.27-.17.45-.1.19.07 1.18.55 1.38.65.2.1.33.15.38.23.05.09.05.5-.11.95Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * أيقونة تليجرام الرسمية باللون الأزرق الأصلي (#229ED9) بحجم متناسق مع الجداول والأزرار
 */
function TelegramBrandIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      fill="none"
    >
      <circle cx="12" cy="12" r="11" fill="#229ED9" />
      <path
        d="M17.42 7.36 15.5 16.5c-.14.64-.52.8-1.05.5l-2.9-2.14-1.4 1.35c-.15.15-.28.28-.58.28l.21-2.96 5.38-4.86c.23-.21-.05-.33-.36-.12L8.14 12.74l-2.87-.9c-.62-.2-.64-.62.13-.92l11.2-4.32c.52-.19.97.12.82.76Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

const FILTERS: Array<{
  id: ChannelCategoryFilter;
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  isBrandIcon?: boolean;
}> = [
  { id: 'all', label: 'الكل', count: 22, icon: Compass },
  {
    id: 'whatsapp-channels',
    label: 'قنوات واتساب',
    count: 3,
    icon: WhatsAppBrandIcon,
    isBrandIcon: true,
  },
  {
    id: 'telegram-channels',
    label: 'قنوات تليجرام',
    count: 6,
    icon: TelegramBrandIcon,
    isBrandIcon: true,
  },
  {
    id: 'telegram-groups',
    label: 'قروبات تليجرام',
    count: 8,
    icon: TelegramBrandIcon,
    isBrandIcon: true,
  },
  {
    id: 'whatsapp-groups',
    label: 'قروبات واتساب',
    count: 5,
    icon: WhatsAppBrandIcon,
    isBrandIcon: true,
  },
];

/**
 * صورة دائرية صغيرة ممتلئة بالكامل قبل اسم القناة:
 * - للقنوات الرسمية العامة والدراسات العليا: الشعار الرسمي الجديد لمنارتك المعروض في الهيدر (/brand/manaratak-logo.png)
 * - للقنوات والقروبات الخاصة بالدول: علم الدولة ممتلئ بالكامل داخل الدائرة
 */
function ChannelCircularAvatar({ code, title }: { code: ChannelAvatarCode; title: string }) {
  const renderGraphic = () => {
    switch (code) {
      case 'official':
      case 'postgrad':
        return (
          <img
            src="/brand/manaratak-logo.png"
            alt={title}
            draggable={false}
            className="w-full h-full rounded-full object-cover scale-[1.08]"
          />
        );
      case 'cn':
        // علم الصين ممتلئ بالدائرة
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
            <rect width="100" height="100" fill="#DE2910" />
            <polygon
              points="32,22 35.8,33.5 48,33.5 38.2,40.6 41.8,52 32,44.8 22.2,52 25.8,40.6 16,33.5 28.2,33.5"
              fill="#FFDE00"
            />
            <circle cx="56" cy="19" r="3.6" fill="#FFDE00" />
            <circle cx="64" cy="28" r="3.6" fill="#FFDE00" />
            <circle cx="64" cy="41" r="3.6" fill="#FFDE00" />
            <circle cx="56" cy="50" r="3.6" fill="#FFDE00" />
          </svg>
        );
      case 'eu':
        // علم أوروبا ممتلئ بالدائرة
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
            <rect width="100" height="100" fill="#003399" />
            {Array.from({ length: 12 }).map((_, idx) => {
              const angle = (idx * 30 * Math.PI) / 180;
              const cx = 50 + 27 * Math.cos(angle);
              const cy = 50 + 27 * Math.sin(angle);
              return <circle key={idx} cx={cx} cy={cy} r="3.8" fill="#FFCC00" />;
            })}
          </svg>
        );
      case 'tr':
        // علم تركيا ممتلئ بالدائرة
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
            <rect width="100" height="100" fill="#E30A17" />
            <circle cx="43" cy="50" r="22" fill="#FFFFFF" />
            <circle cx="49" cy="50" r="17.5" fill="#E30A17" />
            <polygon
              points="69,50 56,54.5 60.5,41.5 60.5,58.5 56,45.5"
              fill="#FFFFFF"
            />
          </svg>
        );
      case 'ru':
        // علم روسيا ممتلئ بالدائرة
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
            <rect width="100" height="33.4" y="0" fill="#FFFFFF" />
            <rect width="100" height="33.4" y="33.3" fill="#0039A6" />
            <rect width="100" height="33.4" y="66.6" fill="#D52B1E" />
          </svg>
        );
      case 'sa':
        // علم السعودية ممتلئ بالدائرة
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
            <rect width="100" height="100" fill="#006C35" />
            <rect x="20" y="32" width="60" height="5" rx="2.5" fill="#FFFFFF" />
            <rect x="25" y="42" width="50" height="4.5" rx="2.2" fill="#FFFFFF" opacity="0.92" />
            <rect x="24" y="59" width="52" height="4.5" rx="2.2" fill="#FFFFFF" />
            <circle cx="26" cy="61.2" r="3.6" fill="#FFFFFF" />
          </svg>
        );
      case 'iq':
        // علم العراق ممتلئ بالدائرة
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
            <rect width="100" height="33.4" y="0" fill="#CE1126" />
            <rect width="100" height="33.4" y="33.3" fill="#FFFFFF" />
            <rect width="100" height="33.4" y="66.6" fill="#000000" />
            <rect x="22" y="45" width="24" height="9" rx="2" fill="#007A3D" />
            <rect x="52" y="45" width="26" height="9" rx="2" fill="#007A3D" />
          </svg>
        );
      case 'id':
        // علم إندونيسيا ممتلئ بالدائرة
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
            <rect width="100" height="50" y="0" fill="#CE1126" />
            <rect width="100" height="50" y="50" fill="#FFFFFF" />
          </svg>
        );
      case 'ye':
        // علم اليمن ممتلئ بالدائرة
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
            <rect width="100" height="33.4" y="0" fill="#CE1126" />
            <rect width="100" height="33.4" y="33.3" fill="#FFFFFF" />
            <rect width="100" height="33.4" y="66.6" fill="#000000" />
          </svg>
        );
    }
  };

  return (
    <span
      aria-hidden="true"
      className="w-[26px] h-[26px] sm:w-7 sm:h-7 rounded-full border border-[#D6A43B]/80 dark:border-[#F2CD78]/80 overflow-hidden shrink-0 shadow-2xs bg-[#142B5F] flex items-center justify-center"
    >
      {renderGraphic()}
    </span>
  );
}

export const CommunityChannelsModal: React.FC<CommunityChannelsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { dir: publicDir } = usePublicTemplateTranslation();
  useOverlayDialog(isOpen, onClose, 'mn-channels-dialog');

  const [filter, setFilter] = useState<ChannelCategoryFilter>('all');

  // مؤشر السحب الأفقي لشريط الفلاتر (الكل، قنوات واتساب...)
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const [tabsScrollMeta, setTabsScrollMeta] = useState({
    thumbWidthPct: 38,
    thumbRightPct: 0,
  });

  const updateTabsScrollIndicator = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 2) {
      const activeIdx = Math.max(0, FILTERS.findIndex((f) => f.id === filter));
      const stepPct = (100 - 34) / Math.max(1, FILTERS.length - 1);
      setTabsScrollMeta({
        thumbWidthPct: 34,
        thumbRightPct: activeIdx * stepPct,
      });
      return;
    }
    const rawWidthPct = Math.max(26, Math.min(60, (clientWidth / scrollWidth) * 100));
    const progress = Math.min(1, Math.max(0, Math.abs(scrollLeft) / maxScroll));
    const thumbRightPct = progress * (100 - rawWidthPct);
    setTabsScrollMeta({
      thumbWidthPct: rawWidthPct,
      thumbRightPct,
    });
  }, [filter]);

  // مؤشر السحب العمودي لقائمة الجداول
  const listRef = useRef<HTMLDivElement | null>(null);
  const [listScrollMeta, setListScrollMeta] = useState({
    thumbHeightPct: 28,
    thumbTopPct: 0,
    canScroll: true,
  });

  const updateListScrollIndicator = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + 2) {
      setListScrollMeta({ thumbHeightPct: 100, thumbTopPct: 0, canScroll: false });
      return;
    }
    const rawThumbPct = Math.max(20, Math.min(75, (clientHeight / scrollHeight) * 100));
    const maxScroll = scrollHeight - clientHeight;
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollTop / maxScroll)) : 0;
    const thumbTopPct = progress * (100 - rawThumbPct);
    setListScrollMeta({ thumbHeightPct: rawThumbPct, thumbTopPct, canScroll: true });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
    const timer = window.setTimeout(() => {
      updateTabsScrollIndicator();
      updateListScrollIndicator();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [isOpen, filter, updateTabsScrollIndicator, updateListScrollIndicator]);

  if (!isOpen) return null;

  const groupedSections = getGroupedCommunityChannels(filter, COMMUNITY_CHANNELS);

  const renderSectionTable = (
    section: ChannelCategorySection,
    items: CommunityChannelItem[],
  ) => {
    const SectionIcon = SECTION_ICONS[section.id] || BookOpen;

    return (
      <section
        key={section.id}
        data-testid={`channels-section-${section.id}`}
        className="relative w-full bg-[var(--mn-surface)] rounded-none sm:rounded-xl px-2.5 py-2 sm:p-3 border-y sm:border border-[var(--mn-border)] overflow-hidden font-['Cairo',sans-serif]"
      >
        {/* الخط العلوي في بداية المربع */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent z-10" />

        {/* مربع عنوان القسم الفرعي (قنوات المنح الدراسية واتساب / تليجرام...):
            خلفية بيضاء أنيقة، الكلام مقابل الأيقونة تماماً والخط الذهبي تحته بدون عداد القنوات */}
        <div className="relative overflow-hidden flex items-center justify-start gap-2 px-3 py-2.5 mb-2 rounded-xl bg-white dark:bg-[#10264A] border border-[#142B5F]/20 dark:border-[#D6A43B]/45 shadow-2xs">
          {/* خط جانبي أيمن أنيق يجمع النيلي والبترولي والذهبي */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1.5 bottom-1.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#142B5F_0%,#0E7C86_60%,#D6A43B_100%)]"
          />

          <div className="flex items-center gap-2.5 min-w-0 relative z-10 pr-1">
            <span
              aria-hidden="true"
              className="relative overflow-hidden w-[27px] h-[27px] sm:w-[30px] sm:h-[30px] rounded-lg bg-[#142B5F] border border-[#D6A43B] text-[#F2CD78] flex items-center justify-center shrink-0 shadow-2xs"
            >
              <span className="pointer-events-none absolute top-0 right-0 w-1.5 h-1.5 bg-[#D6A43B] rounded-bl-xs" />
              <SectionIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 relative z-10 text-[#F2CD78]" />
            </span>

            {/* إنزال الكلام قليلاً مع الخط الذهبي بحيث يكون الكلام مقابل الأيقونة تماماً والخط الذهبي تحته */}
            <div className="inline-flex flex-col items-start min-w-0 translate-y-[3px]">
              <div className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
                <h3 className="text-[12px] sm:text-[13.5px] font-extrabold text-[#142B5F] dark:text-white leading-none truncate">
                  {section.title}
                </h3>
                {section.platform === 'whatsapp' ? (
                  <WhatsAppBrandIcon className="h-4 w-4 sm:h-[17px] sm:w-[17px]" />
                ) : (
                  <TelegramBrandIcon className="h-4 w-4 sm:h-[17px] sm:w-[17px]" />
                )}
              </div>
              {/* الخط الذهبي تحت الكلام */}
              <span
                aria-hidden="true"
                className="mt-1.5 h-[2px] w-full rounded-full bg-[linear-gradient(90deg,#D6A43B_0%,#F2CD78_50%,#D6A43B_100%)]"
              />
            </div>
          </div>
        </div>

        {/* جدول القنوات: صورة دائرية صغيرة ممتلئة قبل الاسم + سهم أيقونة نيلي بذهبي فقط على اليسار */}
        <div className="w-full overflow-hidden rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)]/70 shadow-2xs">
          <table className="w-full text-start border-collapse table-fixed font-['Cairo',sans-serif]">
            <tbody className="divide-y divide-[var(--mn-border)]">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/60 transition-colors group"
                >
                  {/* خلية اسم القناة مسبوقة بصورة دائرية صغيرة ممتلئة (علم الدولة أو شعار منارتك الجديد) بدون خط جانبي وبدون نقطة */}
                  <td className="py-2 sm:py-2.5 pr-2.5 pl-2 text-[11px] sm:text-[12px] font-bold text-[var(--mn-heading)] align-middle w-[86%] sm:w-[88%]">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                    >
                      <ChannelCircularAvatar code={item.avatarCode} title={item.title} />
                      <span className="leading-snug truncate group-hover:text-[#0E7C86] dark:group-hover:text-[#F2CD78] transition-colors">
                        {item.title}
                      </span>
                    </a>
                  </td>

                  {/* خلية السهم: فقط أيقونة سهم باللون النيلي داخله ذهبي بدون كلمة انضمام */}
                  <td className="py-1.5 px-2.5 text-left align-middle w-[14%] sm:w-[12%]">
                    <div className="flex items-center justify-end">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`فتح ${item.title}`}
                        title={item.title}
                        className="w-[26px] h-[26px] sm:w-7 sm:h-7 rounded-full bg-[#142B5F] hover:bg-[#0E7C86] border border-[#D6A43B]/85 text-[#F2CD78] hover:text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-all cursor-pointer"
                      >
                        <ArrowUpLeft className="h-3.5 w-3.5 shrink-0 stroke-[2.25]" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  return (
    <div
      role="presentation"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[80] flex items-start justify-center pt-8 sm:pt-12 pb-14 px-0 sm:px-4 bg-black/55 backdrop-blur-xs font-['Cairo',sans-serif]"
      dir={publicDir}
    >
      {/* المربع ممتلئ بالكامل في الجانب الأيمن والأيسر بدون مساحة جانبية في الهاتف وبحجم متوازن */}
      <div
        id="mn-channels-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="دليل قنوات ومجتمعات منارتك"
        tabIndex={-1}
        className="flex max-h-[82vh] sm:max-h-[84vh] w-full max-w-full sm:max-w-[650px] flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border-y sm:border border-[var(--mn-border-brand)] bg-[#EAEEF3] dark:bg-[#0B1733] shadow-xl transition-all"
      >
        {/* القسم العلوي: البترولي في الجهة اليمنى والنيلي في الجهة اليسرى (90deg) مع لمسات ذهبية والوصف باللون الأبيض */}
        <div className="relative shrink-0 overflow-hidden px-3.5 pt-4 pb-4 sm:px-5 sm:pt-4.5 sm:pb-4.5 bg-[linear-gradient(270deg,#142B5F_0%,#142B5F_42%,#0D5C6E_74%,#0E7C86_100%)] text-white border-b border-[#D6A43B]/60">
          {/* زخارف ولمسات ذهبية هادئة في الخلفية */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute top-2.5 left-14 grid grid-cols-4 gap-1 opacity-25">
              {Array.from({ length: 12 }).map((_, idx) => (
                <span key={idx} className="w-1 h-1 rounded-full bg-[#F2CD78]" />
              ))}
            </div>
            <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full border border-[#D6A43B]/25" />
            <div className="absolute -top-5 -left-5 w-48 h-48 rounded-full border border-[#D6A43B]/15" />
            <svg
              viewBox="0 0 500 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full opacity-25"
            >
              <path
                d="M -30,28 Q 140,-10 290,34 T 540,18"
                stroke="#F2CD78"
                strokeWidth="1.4"
                fill="none"
              />
              <path
                d="M -20,72 Q 180,28 350,65 T 550,40"
                stroke="#D6A43B"
                strokeWidth="1"
                fill="none"
              />
              <circle cx="45" cy="22" r="1.5" fill="#F2CD78" />
              <circle cx="445" cy="24" r="1.5" fill="#F2CD78" />
            </svg>
            <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#D6A43B]/35 via-[#F2CD78] to-[#D6A43B]/35" />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                aria-hidden="true"
                className="relative overflow-hidden flex h-[38px] w-[38px] sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-[#142B5F] border-[1.5px] border-[#F2CD78] text-[#F2CD78] shadow-[0_0_10px_rgba(214,164,59,0.35)]"
              >
                <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 bg-[#D6A43B] rounded-bl-sm" />
                <ShieldCheck className="h-4.5 w-4.5 sm:h-5 sm:w-5 relative z-10 text-[#F2CD78]" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[13.5px] sm:text-[15.5px] font-extrabold text-white leading-snug">
                  دليل قنوات ومجتمعات منارتك
                </h2>
                <p className="text-[9.5px] sm:text-[11px] font-semibold text-white/95 mt-1 leading-snug whitespace-nowrap">
                  انضم إلى قنواتنا وقروباتنا التعليمية لمتابعة أحدث المنح والفرص
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="إغلاق"
              onClick={onClose}
              className="min-h-0! h-[30px]! w-[30px]! sm:h-[34px]! sm:w-[34px]! flex shrink-0 items-center justify-center rounded-xl bg-[#142B5F]/85 hover:bg-[#142B5F] border border-[#F2CD78]/65 text-[#F2CD78] transition cursor-pointer shadow-2xs"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* شريط تصفية الأقسام (الكل، قنوات واتساب...): النيلي في اليسار والبترولي في اليمين */}
        <div className="shrink-0 border-b border-[var(--mn-border)] bg-[var(--mn-surface)] px-2.5 sm:px-3.5 pt-2 pb-1.5 space-y-1.5">
          <div
            ref={tabsRef}
            onScroll={updateTabsScrollIndicator}
            className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar scroll-smooth"
          >
            {FILTERS.map((item) => {
              const Icon = item.icon;
              const isSelected = filter === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  aria-pressed={isSelected}
                  className={`min-h-0! h-[32px]! sm:h-[34px]! inline-flex shrink-0 sm:flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1 text-[10.5px] sm:text-[11.5px] font-bold leading-none transition cursor-pointer border ${
                    isSelected
                      ? 'bg-[linear-gradient(90deg,#142B5F_0%,#142B5F_42%,#0E7C86_100%)] text-white border-[#D6A43B]/70 shadow-2xs'
                      : 'bg-[var(--mn-page)] text-[var(--mn-heading)] border-[var(--mn-border)] hover:border-[#142B5F]/45'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      item.isBrandIcon
                        ? ''
                        : isSelected
                          ? 'text-[#F2CD78]'
                          : 'text-[#142B5F] dark:text-[#F2CD78]'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* شريط السحب النيلي البترولي أسفل أزرار الكل / قنوات واتساب */}
          <div
            aria-hidden="true"
            className="relative h-[3px] w-full rounded-full bg-[#142B5F]/12 dark:bg-white/15 overflow-hidden"
          >
            <div
              className="absolute inset-y-0 rounded-full bg-[linear-gradient(90deg,#142B5F_0%,#142B5F_42%,#0E7C86_100%)] dark:from-[#F2CD78] dark:to-[#0E7C86] transition-all duration-150"
              style={{
                width: `${tabsScrollMeta.thumbWidthPct}%`,
                right: `${tabsScrollMeta.thumbRightPct}%`,
              }}
            />
          </div>
        </div>

        {/* المحتوى القابل للتمرير مسحوب للداخل وممتلئ من اليمين لليسار بدون فراغات جانبية */}
        <div className="relative flex-1 min-h-0 flex bg-[#EAEEF3] dark:bg-[#0B1733] shadow-inner">
          {listScrollMeta.canScroll && groupedSections.length > 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-2 bottom-2 right-0.5 w-[3.5px] rounded-full bg-[#142B5F]/15 dark:bg-white/15 z-20 overflow-hidden"
            >
              <div
                className="absolute inset-x-0 rounded-full bg-gradient-to-b from-[#0E7C86] to-[#142B5F] dark:from-[#F2CD78] dark:to-[#0E7C86] transition-all duration-75"
                style={{
                  height: `${listScrollMeta.thumbHeightPct}%`,
                  top: `${listScrollMeta.thumbTopPct}%`,
                }}
              />
            </div>
          )}

          <div
            ref={listRef}
            onScroll={updateListScrollIndicator}
            className="flex-1 overflow-y-auto overscroll-contain scroll-smooth hide-scrollbar px-0 sm:px-2.5 py-2 space-y-2"
          >
            {groupedSections.map(({ section, items }) => renderSectionTable(section, items))}
          </div>
        </div>
      </div>
    </div>
  );
};
