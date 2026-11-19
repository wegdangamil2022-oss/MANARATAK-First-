import { PreviewStudentApiClient } from './studentWorkspacePreviewApi';
const ApiClient =
  import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype'
    ? PreviewStudentApiClient
    : LiveApiClient;
import { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  RefreshCw,
  CheckCircle2,
  Check,
  Clock3,
  ArrowUpLeft,
  ListChecks,
} from 'lucide-react';
import {
  ApiClient as LiveApiClient,
  type StudentNotificationProjectionDto,
} from '../../api/client';
import {
  filterStudentNotifications,
  isNotificationRead,
  type NotificationFilterMode,
} from './studentAccountBriefLogic';
import { HorizontalSwipeTabs } from './StudentExpandedSections';

export function studentNotificationLink(value?: string | null): string | null {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u001f]/.test(value)
  )
    return null;
  return value;
}

export function StudentNotificationsView({
  items,
  available,
  onRefresh,
}: {
  items: StudentNotificationProjectionDto[];
  available: boolean;
  onRefresh: () => void;
}) {
  const [filterMode, setFilterMode] = useState<NotificationFilterMode>('ALL');
  const [reading, setReading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const busy = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const markRead = async (id: string) => {
    if (busy.current || !available) return;
    busy.current = true;
    setReading(id);
    setError(null);
    try {
      await ApiClient.markStudentNotificationRead(id);
      if (alive.current) {
        setReadIds((current) => new Set([...current, id]));
        onRefresh();
      }
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : 'تعذر حفظ حالة القراءة');
    } finally {
      busy.current = false;
      if (alive.current) setReading(null);
    }
  };

  const markAllRead = async () => {
    if (busy.current || !available) return;
    const unreadItems = items.filter((item) => !isNotificationRead(item, readIds));
    if (!unreadItems.length) return;
    busy.current = true;
    setReading('ALL');
    setError(null);
    try {
      await Promise.allSettled(
        unreadItems.map((item) => ApiClient.markStudentNotificationRead(item.id)),
      );
      if (alive.current) {
        setReadIds((current) => new Set([...current, ...unreadItems.map((i) => i.id)]));
        onRefresh();
      }
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : 'تعذر تحديث الإشعارات');
    } finally {
      busy.current = false;
      if (alive.current) setReading(null);
    }
  };

  const unreadCount = useMemo(
    () => items.filter((item) => !isNotificationRead(item, readIds)).length,
    [items, readIds],
  );
  const totalCount = items.length;
  const readCount = totalCount - unreadCount;

  const visible = useMemo(
    () => filterStudentNotifications(items, filterMode, readIds),
    [items, filterMode, readIds],
  );

  return (
    <div className="mn-student-notifications-page mt-0 space-y-3.5 font-['Cairo',sans-serif]">
      {/* Main section hero header with selective Navy start line */}
      <div className="relative -mx-3 sm:-mx-6 w-[calc(100%+1.5rem)] sm:w-[calc(100%+3rem)] -mt-px">
        <section
          aria-label="إشعاراتي والتنبيهات"
          className="mn-student-notifications-hero relative overflow-hidden rounded-none border-x-0 border-t border-b border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] shadow-2xs mn-panel font-['Cairo',sans-serif]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-[4px] z-10 bg-[#142B5F]"
          />

          <div className="px-3.5 pt-3 pb-3 pr-4 sm:px-5 sm:pt-3.5 sm:pb-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl border border-[#D6A43B]/45 bg-[#142B5F]">
                  <Bell className="h-3.5 w-3.5 text-[#F2CD78]" aria-hidden="true" />
                </span>
                <h2 className="mn-student-notifications-heading text-[14px] sm:text-[15px] font-bold leading-tight text-[#1E293B] dark:text-[#F8FAFC] font-['Cairo',sans-serif]">
                  إشعاراتي والتنبيهات
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    disabled={Boolean(reading)}
                    onClick={() => void markAllRead()}
                    className="inline-flex min-h-7 shrink-0 items-center justify-center gap-1 rounded-lg border border-[#0E7C86]/35 bg-[#0E7C86]/10 px-2.5 py-1 text-[11px] font-bold text-[#0E7C86] dark:text-[#55CBC5] hover:bg-[#0E7C86] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    <span>تعليم الكل كمقروء</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex min-h-7 shrink-0 items-center justify-center gap-1 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] dark:border-white/15 px-2.5 py-1 text-[11px] font-semibold text-[#334155] dark:text-[#E2E8F0] hover:border-[#0E7C86] transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3 text-[#0E7C86]" aria-hidden="true" />
                  <span>تحديث</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Independent Filter Tabs (ALL | UNREAD | READ) with Petrol Swipe Bar */}
        <HorizontalSwipeTabs
          ariaLabel="تصفية الإشعارات"
          activeId={filterMode}
          onSelect={setFilterMode}
          items={[
            { id: 'ALL', label: 'جميع الإشعارات', count: totalCount, icon: ListChecks },
            { id: 'UNREAD', label: 'غير المقروءة', count: unreadCount, icon: Bell },
            { id: 'READ', label: 'المقروءة', count: readCount, icon: CheckCircle2 },
          ]}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[12px] font-bold text-red-700 dark:text-red-400 font-['Cairo',sans-serif]"
        >
          {error}
        </p>
      )}

      {!available ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center mn-panel font-['Cairo',sans-serif]"
        >
          <p className="text-[12.5px] font-bold text-amber-900 dark:text-amber-200">
            تعذر تحميل الإشعارات حالياً. يرجى إعادة المحاولة.
          </p>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-xl bg-[#142B5F] px-3.5 py-1.5 text-[11.5px] font-bold text-white shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#E5B54F]" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      ) : !visible.length ? (
        <div className="relative -mx-3 sm:-mx-6 w-[calc(100%+1.5rem)] sm:w-[calc(100%+3rem)] rounded-none border-x-0 border-t border-b border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-5 text-center mn-panel shadow-2xs font-['Cairo',sans-serif]">
          <div className="w-9 h-9 rounded-xl bg-[#142B5F] border border-[#D6A43B]/45 flex items-center justify-center text-[#F2CD78] mx-auto mb-2 shadow-xs">
            <Bell className="w-4 h-4 text-[#F2CD78]" />
          </div>
          <h3 className="text-[12.5px] font-bold text-[#1E293B] dark:text-[#F8FAFC]">
            {filterMode === 'UNREAD'
              ? 'لا توجد إشعارات غير مقروءة'
              : filterMode === 'READ'
                ? 'لا توجد إشعارات مقروءة بعد'
                : 'لا توجد إشعارات حالياً في حسابك'}
          </h3>
          {filterMode !== 'ALL' && (
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className="mt-3 inline-flex min-h-8 items-center justify-center rounded-xl bg-[#142B5F] hover:bg-[#1a3675] px-3.5 py-1 text-[11.5px] font-bold text-white transition-colors border border-[#D6A43B]/35 cursor-pointer"
            >
              <span>عرض جميع الإشعارات</span>
            </button>
          )}
        </div>
      ) : (
        <section
          aria-label="سجل الإشعارات"
          className="mn-student-notifications-section relative -mx-3 sm:-mx-6 w-[calc(100%+1.5rem)] sm:w-[calc(100%+3rem)] min-w-0 rounded-none border-x-0 border-t border-b border-[var(--mn-border)] bg-[var(--mn-surface)] px-3.5 py-3 sm:px-5 sm:py-3.5 shadow-2xs mn-panel dark:border-white/10 font-['Cairo',sans-serif] overflow-hidden"
        >
          <div className="space-y-2.5">
            {visible.map((item) => {
              const href = studentNotificationLink(item.actionUrl);
              const occurred = new Date(item.occurredAt);
              const isUnread = !isNotificationRead(item, readIds);

              return (
                <article
                  key={item.id}
                  className={`relative overflow-hidden rounded-xl border p-3 transition-all font-['Cairo',sans-serif] ${
                    isUnread
                      ? 'border-[#0E7C86]/35 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)]'
                      : 'border-[var(--mn-border)] bg-[var(--mn-page)] dark:border-white/10 dark:bg-[var(--mn-surface-elevated)]'
                  }`}
                >
                  {/* Selective start-of-box Petrol line ONLY on unread notifications */}
                  {isUnread && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 right-0 w-[3.5px] bg-[#0E7C86]"
                    />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div className="w-6.5 h-6.5 rounded-lg bg-[#142B5F] border border-[#D6A43B]/35 flex items-center justify-center shrink-0">
                        <Bell className="w-3.5 h-3.5 text-[#F2CD78]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[12px] font-bold leading-snug text-[#1E293B] dark:text-[#F8FAFC] break-words">
                          {item.title}
                        </h4>
                        <div className="text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8] mt-0.5 flex items-center gap-1">
                          <Clock3 className="w-3 h-3 text-[#0E7C86]" />
                          <time>
                            {Number.isNaN(occurred.getTime())
                              ? '—'
                              : occurred.toLocaleDateString('ar', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                          </time>
                        </div>
                      </div>
                    </div>

                    {isUnread ? (
                      <span className="shrink-0 rounded-lg border border-[#0E7C86]/30 bg-[#0E7C86]/10 px-2 py-0.5 text-[10px] font-bold text-[#0E7C86] dark:text-[#55CBC5]">
                        جديد
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] px-2 py-0.5 text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                        مقروء
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-[11.5px] font-medium leading-[1.7] text-[#475569] dark:text-[#CBD5E1]">
                    {item.message}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-[var(--mn-border)] dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    {isUnread ? (
                      <button
                        type="button"
                        disabled={Boolean(reading)}
                        onClick={() => void markRead(item.id)}
                        className="inline-flex min-h-7 items-center gap-1 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-surface)] px-2.5 py-1 text-[11px] font-bold text-[#1E293B] hover:border-[#0E7C86] transition-colors cursor-pointer disabled:opacity-50 dark:text-[#F8FAFC]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0E7C86]" />
                        <span>{reading === item.id ? 'جارٍ الحفظ…' : 'تحديد كمقروء'}</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                        <Check className="w-3.5 h-3.5 text-[#0E7C86]" />
                        <span>تم الاطلاع</span>
                      </span>
                    )}

                    {href && (
                      <Link
                        to={href}
                        className="ms-auto inline-flex min-h-7 items-center gap-1 rounded-lg bg-[#142B5F] hover:bg-[#1a3675] px-3 py-1 text-[11px] font-bold text-white shadow-2xs transition-colors border border-[#D6A43B]/35"
                      >
                        <span>عرض التفاصيل</span>
                        <ArrowUpLeft className="h-3.5 w-3.5 text-[#F2CD78]" />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
