import React, { useState } from 'react';
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
  if (notification.type === 'opportunity') return notification.title.includes('جامعة') ? Building2 : GraduationCap;
  return Bell;
};

const FILTERS: Array<{ id: NotificationFilter; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'all', label: 'الكل', icon: Bell },
  { id: 'urgent', label: 'عاجل', icon: AlertTriangle },
  { id: 'opportunity', label: 'فرص', icon: GraduationCap },
  { id: 'deadline', label: 'مواعيد', icon: Clock },
  { id: 'course', label: 'دورات', icon: BookOpen },
];

export const PushNotificationCenter: React.FC<PushNotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onTriggerTestPush,
  onSelectAction,
  activeToast,
  onDismissToast,
}) => {
  useOverlayDialog(isOpen, onClose, 'mn-notification-dialog');
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const filteredNotifications = notifications.filter((notification) => filter === 'all' || notification.type === filter);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <>
      {activeToast && !isOpen && (() => {
        const ToastIcon = typeIcon(activeToast);
        return (
          <div id="instant-push-toast" className="fixed inset-x-2 top-3 z-[80] mx-auto max-w-md pointer-events-auto font-['Cairo',sans-serif]">
            <div className="rounded-2xl border border-[#D6A43B]/50 bg-[var(--mn-surface)] dark:bg-[#112450] p-3.5 shadow-2xl flex items-start gap-3 backdrop-blur-md">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D6A43B]/40 bg-[#142B5F] text-[#F3CE74] shadow-xs">
                <ToastIcon className="h-5 w-5" />
              </span>
              <button
                type="button"
                className="min-w-0 flex-1 text-right cursor-pointer"
                onClick={() => { onSelectAction?.(activeToast.actionType, activeToast.targetId); onDismissToast(); }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#D6A43B] dark:text-[#F3CE74]">منارتك · تنبيه فوري</span>
                  <span className="text-[10px] text-[var(--mn-text-muted)]">{activeToast.timestamp}</span>
                </div>
                <h4 className="mt-0.5 text-xs font-bold leading-snug text-[var(--mn-heading)]">{notificationTitle(activeToast.title)}</h4>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[var(--mn-text-muted)]">{activeToast.body}</p>
              </button>
              <button
                type="button"
                onClick={onDismissToast}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--mn-text-muted)] hover:bg-[var(--mn-surface-muted)] cursor-pointer"
                aria-label="إغلاق التنبيه"
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
          onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
          onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
          className="fixed inset-0 z-[80] flex items-start justify-center pt-2 sm:pt-8 pb-4 px-2 sm:px-4 bg-black/60 backdrop-blur-xs font-['Cairo',sans-serif]"
          dir="rtl"
        >
          <div
            id="mn-notification-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="مركز التنبيهات"
            tabIndex={-1}
            className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-[#D6A43B]/40 bg-[var(--mn-surface)] dark:bg-[#0c1a3b] shadow-2xl transition-all"
          >
            {/* Top Golden Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#B38018] via-[#DDAA35] to-[#B38018]" />

            {/* Header with Royal Gradient */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 bg-gradient-to-r from-[#142B5F] via-[#112450] to-[#0c1a3b] text-white">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D6A43B]/50 bg-white/10 text-[#F3CE74] shadow-xs">
                  <Bell className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white tracking-wide">مركز التنبيهات</h2>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-gradient-to-r from-[#B8841B] to-[#E2B040] px-2 py-0.5 text-[11px] font-bold text-[#0E1F44] shadow-xs">
                        {unreadCount} جديد
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/70 font-medium mt-0.5">منح، جامعات، دورات ومواعيد مهمة</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSoundEnabled((value) => !value)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer"
                  aria-label={soundEnabled ? 'كتم صوت التنبيهات' : 'تفعيل صوت التنبيهات'}
                  title={soundEnabled ? 'صوت التنبيهات مفعل' : 'صوت التنبيهات صامت'}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4 text-[#F3CE74]" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  aria-label="إغلاق"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs - Crisp separation from top header, identical box sizing across all states */}
            <div className="flex items-center gap-2 overflow-x-auto border-b border-[#E2E8F0] dark:border-white/10 bg-[#F8FAFC] dark:bg-[#081329] px-3.5 py-2.5 hide-scrollbar">
              {FILTERS.map((item) => {
                const Icon = item.icon;
                const isSelected = filter === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setFilter(item.id)}
                    aria-pressed={isSelected}
                    data-mn-design="28bfae757f"
                    className={`inline-flex shrink-0 h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[11px] font-bold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-[#142B5F] text-white border-[#D6A43B] shadow-sm ring-1 ring-[#D6A43B]/50'
                        : 'bg-white dark:bg-[#132347] text-[#475569] dark:text-[#E2E8F0] border-[#E2E8F0] dark:border-white/10 hover:border-[#D6A43B]/50 shadow-2xs'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-[#F3CE74]' : 'text-[var(--mn-text-muted)]'}`} />
                    <span data-mn-design="28bfae757f">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Notifications List - Unified, consistent, elegant cards */}
            <div className="flex-1 space-y-3 overflow-y-auto p-3.5 sm:p-4">
              {filteredNotifications.length === 0 ? (
                <div className="py-16 text-center text-xs text-[var(--mn-text-muted)] font-medium">
                  لا توجد تنبيهات في هذا التصنيف حاليًا.
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
                        if (notification.actionType) {
                          onSelectAction?.(notification.actionType, notification.targetId);
                          onClose();
                        }
                      }}
                      className={`w-full rounded-2xl border p-3.5 text-right transition cursor-pointer relative overflow-hidden group ${
                        isUnread
                          ? 'border-[var(--mn-accent)]/50 bg-gradient-to-br from-[#FFFDF9] to-[#FBF7EE] dark:from-[#132347] dark:to-[#0f1c3a] shadow-xs'
                          : 'border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] dark:bg-[#11203d]/60 hover:border-[#D6A43B]/40 shadow-xs'
                      }`}
                    >
                      {isUnread && (
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
                      )}

                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                            isUnread
                              ? 'border-[#D6A43B]/60 bg-[#142B5F] text-[#F3CE74] shadow-xs'
                              : 'border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface-muted)] dark:bg-white/5 text-[var(--mn-text-muted)]'
                          }`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 data-mn-design="88a8f9d359" className="text-[13px] font-bold leading-snug text-[var(--mn-heading)] group-hover:text-[#142B5F] dark:group-hover:text-[#F3CE74] transition-colors">
                              {notificationTitle(notification.title)}
                            </h4>
                            <span data-mn-design="88a8f9d359" className="whitespace-nowrap text-[10px] font-semibold text-[var(--mn-text-muted)]">
                              {notification.timestamp}
                            </span>
                          </div>

                          <p data-mn-design="88a8f9d359" className="mt-1 text-[11.5px] leading-relaxed text-[var(--mn-text-muted)] dark:text-white/70">
                            {notification.body}
                          </p>

                          {notification.actionType && (
                            <div className="mt-2.5 flex items-center justify-start">
                              <span data-mn-design="88a8f9d359" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D6A43B] dark:text-[#F3CE74] group-hover:translate-x-[-2px] transition-transform">
                                <span>عرض التفاصيل</span>
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </span>
                            </div>
                          )}
                        </div>

                        {isUnread && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#D6A43B] ring-2 ring-[#D6A43B]/30" aria-label="غير مقروء" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
