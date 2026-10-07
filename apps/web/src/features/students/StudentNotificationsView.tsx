import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ExternalLink } from 'lucide-react';
import { ApiClient, type StudentNotificationProjectionDto } from '../../api/client';

export function studentNotificationLink(value?: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value))
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
  const [unreadOnly, setUnreadOnly] = useState(false);
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
      if (alive.current) setError(cause instanceof Error ? cause.message : 'تعذر حفظ حالة القراءة');
    } finally {
      busy.current = false;
      if (alive.current) setReading(null);
    }
  };
  const visible = unreadOnly
    ? items.filter((item) => !item.readAt && !readIds.has(item.id))
    : items;
  return (
    <section className="space-y-4">
      <header className="mn-panel rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold text-[var(--mn-heading)]">
            <Bell className="h-5 w-5" /> إشعاراتي
          </h2>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-xl border border-[var(--mn-border)] px-3 py-2 text-xs font-bold"
          >
            تحديث
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--mn-text-muted)]">
          آخر الإشعارات المرتبطة بحسابك ودوراتك وطلباتك.
        </p>
        <div className="mt-4 flex gap-2">
          {[false, true].map((unread) => (
            <button
              key={String(unread)}
              type="button"
              aria-pressed={unreadOnly === unread}
              onClick={() => setUnreadOnly(unread)}
              className={`rounded-xl px-3 py-2 text-xs font-bold ${unreadOnly === unread ? 'bg-[var(--mn-primary)] text-white' : 'bg-[var(--mn-page)] text-[var(--mn-text)]'}`}
            >
              {unread ? 'غير المقروءة' : 'الكل'}
            </button>
          ))}
        </div>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {!available ? (
        <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          تعذر تحميل الإشعارات. أعد المحاولة.
        </p>
      ) : !visible.length ? (
        <p className="mn-panel rounded-2xl border border-[var(--mn-border)] p-6 text-center text-sm text-[var(--mn-text-muted)]">
          {unreadOnly
            ? 'لا توجد إشعارات غير مقروءة ضمن القائمة الحالية.'
            : 'لا توجد إشعارات حالياً.'}
        </p>
      ) : (
        visible.map((item) => {
          const href = studentNotificationLink(item.actionUrl);
          const occurred = new Date(item.occurredAt);
          return (
            <article
              key={item.id}
              className="mn-panel rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-[var(--mn-heading)]">{item.title}</h3>
                {!item.readAt && !readIds.has(item.id) && (
                  <span className="rounded-full bg-teal-50 px-2 py-1 text-xs text-teal-800">
                    غير مقروء
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--mn-text-muted)]">
                {item.message}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--mn-text-muted)]">
                <time>
                  {Number.isNaN(occurred.getTime()) ? '—' : occurred.toLocaleString('ar')}
                </time>
                {!item.readAt && !readIds.has(item.id) && (
                  <button
                    type="button"
                    disabled={Boolean(reading)}
                    onClick={() => void markRead(item.id)}
                    className="rounded-lg border px-3 py-2 font-bold text-[var(--mn-primary)] disabled:opacity-50"
                  >
                    {reading === item.id ? 'جارٍ الحفظ…' : 'تحديد كمقروء'}
                  </button>
                )}
                {href && (
                  <Link
                    to={href}
                    className="inline-flex items-center gap-1 font-bold text-[var(--mn-primary)]"
                  >
                    عرض التفاصيل <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}
