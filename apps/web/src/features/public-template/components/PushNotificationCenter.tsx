import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useOverlayDialog } from '../useOverlayDialog';
import { PushNotificationItem } from '../types';
import {
  AlertTriangle,
  Bell,
  BellRing,
  BookOpen,
  Building2,
  ChevronLeft,
  Clock,
  GraduationCap,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

interface PushNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: PushNotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onTriggerTestPush: () => void;
  onSelectAction?: (actionType?: string, targetId?: string) => void;
  activeToast: PushNotificationItem | null;
  onDismissToast: () => void;
}

type NotificationFilter = 'all' | 'urgent' | 'opportunity' | 'deadline' | 'course';

const notificationTitle = (value: string) =>
  value.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s:–—-]+/u, '').trim();

const typeIcon = (notification: PushNotificationItem) => {
  if (notification.actionType === 'ai-tools' || notification.type === 'system') return Sparkles;
  if (notification.actionType === 'scholarship') return GraduationCap;
  if (notification.type === 'urgent') return AlertTriangle;
  if (notification.type === 'deadline') return Clock;
  if (notification.type === 'course') return BookOpen;
  if (notification.type === 'opportunity')
    return notification.title.includes('جامعة') ? Building2 : GraduationCap;
  return Bell;
};

const FILTERS: Array<{
  id: NotificationFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'all', label: 'public_all', icon: Bell },
  { id: 'urgent', label: 'public_urgent', icon: AlertTriangle },
  { id: 'opportunity', label: 'public_opportunities', icon: GraduationCap },
  { id: 'deadline', label: 'public_deadlines', icon: Clock },
  { id: 'course', label: 'public_courses_2', icon: BookOpen },
];

export const PushNotificationCenter: React.FC<PushNotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectAction,
  activeToast,
  onDismissToast,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  useOverlayDialog(isOpen, onClose, 'mn-notification-dialog');
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const filteredNotifications = notifications.filter(
    (notification) => filter === 'all' || notification.type === filter,
  );
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  // مؤشر السحب الأفقي لشريط الفلاتر (الكل، عاجل، فرص...)
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

  // مؤشر السحب العمودي لقائمة الإشعارات
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollMeta, setScrollMeta] = useState({
    thumbHeightPct: 35,
    thumbTopPct: 0,
    canScroll: true,
  });

  const updateScrollIndicator = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + 2) {
      setScrollMeta({ thumbHeightPct: 100, thumbTopPct: 0, canScroll: false });
      return;
    }
    const rawThumbPct = Math.max(22, Math.min(75, (clientHeight / scrollHeight) * 100));
    const maxScroll = scrollHeight - clientHeight;
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollTop / maxScroll)) : 0;
    const thumbTopPct = progress * (100 - rawThumbPct);
    setScrollMeta({ thumbHeightPct: rawThumbPct, thumbTopPct, canScroll: true });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      updateTabsScrollIndicator();
      updateScrollIndicator();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [isOpen, filter, filteredNotifications.length, updateTabsScrollIndicator, updateScrollIndicator]);

  return (
    <>
      {activeToast &&
        !isOpen &&
        (() => {
          const ToastIcon = typeIcon(activeToast);
          return (
            <div
              id="instant-push-toast"
              className="fixed inset-x-2 top-3 z-[80] mx-auto max-w-md pointer-events-auto font-['Cairo',sans-serif]"
            >
              <div className="relative overflow-hidden rounded-2xl border border-[var(--mn-border-brand)] bg-[var(--mn-surface)] p-3.5 shadow-xl flex items-start gap-3 mn-panel">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#142B5F_100%)]"
                />
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#142B5F] text-[#F2CD78] shadow-2xs">
                  <ToastIcon className="h-4.5 w-4.5 text-[#F2CD78]" />
                </span>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-start cursor-pointer"
                  onClick={() => {
                    onSelectAction?.(activeToast.actionType, activeToast.targetId);
                    onDismissToast();
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold text-[#0E7C86] dark:text-[#21A7B4]">
                      {publicT('public_manaratak_instant_notification')}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--mn-text-muted)]">
                      {activeToast.timestamp}
                    </span>
                  </div>
                  <h4 className="mt-0.5 text-[12px] font-bold leading-snug text-[var(--mn-heading)]">
                    {notificationTitle(activeToast.title)}
                  </h4>
                  <p className="mt-0.5 line-clamp-2 text-[11px] font-bold leading-relaxed text-[var(--mn-text)]">
                    {activeToast.body}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={onDismissToast}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--mn-text-muted)] hover:bg-[var(--mn-page)] cursor-pointer"
                  aria-label={publicT('public_close_notification')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })()}

      {isOpen && (
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
          <div
            id="mn-notification-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={publicT('public_notification_center')}
            tabIndex={-1}
            className="flex max-h-[84vh] w-full max-w-full sm:max-w-[580px] flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border-y sm:border border-[var(--mn-border-brand)] bg-[#EAEEF3] dark:bg-[#0B1733] shadow-2xl transition-all mn-panel"
          >
            {/* القسم العلوي: البترولي في الجهة اليمنى والنيلي في الجهة اليسرى (90deg) مع لمسات ذهبية */}
            <div className="relative shrink-0 overflow-hidden px-3 py-3.5 sm:px-5 sm:py-4 bg-[linear-gradient(90deg,#142B5F_0%,#142B5F_42%,#0D5C6E_74%,#0E7C86_100%)] text-white border-b border-[#D6A43B]/60">
              {/* زخارف ولمسات ذهبية هادئة في الخلفية */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute top-2 left-24 grid grid-cols-4 gap-1 opacity-25">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <span key={idx} className="w-1 h-1 rounded-full bg-[#F2CD78]" />
                  ))}
                </div>
                <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full border border-[#D6A43B]/25" />
                <div className="absolute -top-5 -left-5 w-48 h-48 rounded-full border border-[#D6A43B]/15" />
                <svg
                  viewBox="0 0 500 90"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full opacity-25"
                >
                  <path
                    d="M -30,25 Q 140,-10 290,32 T 540,18"
                    stroke="#F2CD78"
                    strokeWidth="1.4"
                    fill="none"
                  />
                  <path
                    d="M -20,65 Q 180,25 350,60 T 550,38"
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
                {/* اليمين: الأيقونة ومقابلها مباشرة في المنتصف "مركز التنبيهات" كاملة بدون أي قص */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    aria-hidden="true"
                    className="relative overflow-hidden flex h-[32px] w-[32px] sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-[#142B5F] border-[1.5px] border-[#F2CD78] text-[#F2CD78] shadow-[0_0_10px_rgba(214,164,59,0.35)]"
                  >
                    <span className="pointer-events-none absolute top-0 right-0 w-2 h-2 bg-[#D6A43B] rounded-bl-sm" />
                    <BellRing className="h-4 w-4 relative z-10 text-[#F2CD78]" />
                  </span>
                  <h2 className="text-[13.5px] sm:text-[15.5px] font-extrabold text-white leading-none whitespace-nowrap">
                    {publicT('public_notification_center')}
                  </h2>
                </div>

                {/* اليسار: المربعان (N جديد + قراءة الكل) بنفس الارتفاع والتنسيق + الصوت + الإغلاق */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {unreadCount > 0 && (
                    <span className="inline-flex h-[28px] items-center justify-center rounded-lg bg-[#142B5F] border border-[#F2CD78]/75 px-2 text-[9.5px] sm:text-[10.5px] font-bold text-[#F2CD78] leading-none whitespace-nowrap shadow-2xs">
                      {unreadCount} {publicT('public_new')}
                    </span>
                  )}
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllAsRead}
                      className="min-h-0! h-[28px]! px-2 rounded-lg bg-[#142B5F]/80 hover:bg-[#142B5F] border border-white/35 text-[9.5px] sm:text-[10.5px] font-bold text-white leading-none whitespace-nowrap transition cursor-pointer flex items-center justify-center shadow-2xs"
                    >
                      قراءة الكل
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSoundEnabled((value) => !value)}
                    className="min-h-0! h-[28px]! w-[28px]! sm:h-8! sm:w-8! flex items-center justify-center rounded-lg bg-[#142B5F]/85 hover:bg-[#142B5F] border border-[#F2CD78]/60 text-[#F2CD78] transition cursor-pointer shadow-2xs"
                    aria-label={
                      soundEnabled
                        ? publicT('public_mute_notifications')
                        : publicT('public_enable_notification_sound')
                    }
                    title={
                      soundEnabled
                        ? publicT('public_notification_sound_enabled')
                        : publicT('public_notification_sound_muted')
                    }
                  >
                    {soundEnabled ? (
                      <Volume2 className="h-3.5 w-3.5 text-[#F2CD78]" />
                    ) : (
                      <VolumeX className="h-3.5 w-3.5 text-[#F2CD78]/75" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={publicT('public_close')}
                    onClick={onClose}
                    className="min-h-0! h-[28px]! w-[28px]! sm:h-8! sm:w-8! flex items-center justify-center rounded-lg bg-[#142B5F]/85 hover:bg-[#142B5F] border border-[#F2CD78]/65 text-[#F2CD78] transition cursor-pointer shadow-2xs"
                  >
                    <X className="h-3.5 w-3.5 text-[#F2CD78]" />
                  </button>
                </div>
              </div>
            </div>

            {/* شريط الفلاتر (الكل، عاجل، فرص، مواعيد، دورات): النيلي في اليسار والبترولي في اليمين + أيقونات نيلي */}
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
                      className={`min-h-0! h-[31px]! sm:h-[33px]! inline-flex shrink-0 sm:flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 sm:px-3 py-1 text-[10.5px] sm:text-[11px] font-bold leading-none transition cursor-pointer border ${
                        isSelected
                          ? 'bg-[linear-gradient(90deg,#142B5F_0%,#142B5F_42%,#0E7C86_100%)] text-white border-[#D6A43B]/70 shadow-2xs'
                          : 'bg-[var(--mn-page)] text-[var(--mn-heading)] border-[var(--mn-border)] hover:border-[#142B5F]/45'
                      }`}
                    >
                      <Icon
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isSelected ? 'text-[#F2CD78]' : 'text-[#142B5F] dark:text-[#F2CD78]'
                        }`}
                      />
                      <span>{publicT(item.label)}</span>
                    </button>
                  );
                })}
              </div>

              {/* شريط السحب النيلي البترولي أسفل أزرار الفلاتر */}
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

            {/* قائمة بطاقات التنبيهات القابلة للتمرير */}
            <div className="relative flex-1 min-h-0 flex bg-[#EAEEF3] dark:bg-[#0B1733] shadow-inner">
              {/* خط السحب المرئي في الجانب الأيمن */}
              {scrollMeta.canScroll && filteredNotifications.length > 0 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-2.5 bottom-2.5 right-0.5 w-[3.5px] rounded-full bg-[#142B5F]/15 dark:bg-white/15 z-20 overflow-hidden"
                >
                  <div
                    className="absolute inset-x-0 rounded-full bg-gradient-to-b from-[#0E7C86] to-[#142B5F] dark:from-[#F2CD78] dark:to-[#0E7C86] transition-all duration-75"
                    style={{
                      height: `${scrollMeta.thumbHeightPct}%`,
                      top: `${scrollMeta.thumbTopPct}%`,
                    }}
                  />
                </div>
              )}

              <div
                ref={listRef}
                onScroll={updateScrollIndicator}
                className="flex-1 max-h-[60vh] sm:max-h-[64vh] space-y-2 overflow-y-auto overscroll-contain scroll-smooth hide-scrollbar px-2 sm:px-3.5 py-2.5"
              >
                {filteredNotifications.length === 0 ? (
                  <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] py-12 px-4 text-center text-xs text-[var(--mn-text-muted)] font-bold">
                    {publicT('public_there_are_currently_no_notifications_in_this_category')}
                  </div>
                ) : (
                  filteredNotifications.map((notification) => {
                    const Icon = typeIcon(notification);
                    const isUnread = !notification.read;
                    return (
                      <button
                        type="button"
                        key={notification.id}
                        onClick={() => {
                          onMarkAsRead(notification.id);
                          onSelectAction?.(
                            notification.actionType || 'scholarship',
                            notification.targetId || 'csc-china',
                          );
                          onClose();
                        }}
                        className={`min-h-0! w-full rounded-xl border p-2.5 sm:p-3 pr-3.5 text-start transition-all cursor-pointer relative overflow-hidden group bg-[var(--mn-surface)] shadow-2xs space-y-1.5 ${
                          isUnread
                            ? 'border-[#142B5F]/35 dark:border-[#D6A43B]/45'
                            : 'border-[var(--mn-border)] hover:border-[#0E7C86]/40'
                        }`}
                      >
                        {/* خط الجانب الأيمن على جميع بطاقات الإشعارات */}
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute top-2 bottom-2 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#142B5F_100%)]"
                        />

                        {/* الصف العلوي: أيقونة مصغّرة مناسبة لحجم الخط (22px) مقابل العنوان تماماً + الوقت على اليسار */}
                        <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-[var(--mn-border)]/75 w-full">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="flex h-[22px] w-[22px] sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-md bg-[#142B5F] border border-[#D6A43B]/75 text-[#F2CD78] shadow-2xs">
                              <Icon className="h-3 w-3 text-[#F2CD78]" />
                            </span>
                            <h4 className="min-w-0 flex-1 text-[10.5px] sm:text-[12px] font-bold leading-snug text-[var(--mn-heading)] group-hover:text-[#0E7C86] transition-colors break-words whitespace-normal">
                              {notificationTitle(notification.title)}
                            </h4>
                          </div>

                          <span className="shrink-0 inline-flex items-center rounded-md bg-[var(--mn-page)] border border-[var(--mn-border)] px-1.5 py-0.5 text-[8.5px] sm:text-[9.5px] font-bold text-[var(--mn-text-muted)] leading-none whitespace-nowrap">
                            {notification.timestamp}
                          </span>
                        </div>

                        {/* نص الإشعار ممتلئ على عرض المربع + زر عرض التفاصيل نازل قليلاً بمساحة مريحة ومربع أبيض بإطار وخط وسهم نيلي */}
                        <div className="flow-root w-full text-[10px] sm:text-[11.5px] font-semibold leading-[1.75] text-[var(--mn-text)] text-start pt-0.5">
                          <span>{notification.body}</span>
                          <span className="float-left inline-flex items-center gap-1 rounded-full bg-white dark:bg-[#10264A] border-[1.5px] border-[#142B5F] dark:border-[#F2CD78] px-2.5 py-1 mr-2 mt-2 !text-[9px] sm:!text-[10px] !leading-none font-bold text-[#142B5F] dark:text-[#F2CD78] shadow-2xs group-hover:bg-[#142B5F] group-hover:text-white transition-all whitespace-nowrap">
                            <span>{publicT('public_view_details')}</span>
                            <ChevronLeft className="h-2.5 w-2.5 text-[#142B5F] dark:text-[#F2CD78] group-hover:text-white stroke-[2.5]" />
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
