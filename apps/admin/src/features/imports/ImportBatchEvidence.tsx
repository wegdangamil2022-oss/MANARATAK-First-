import { useEffect, useRef, useState } from 'react';
import { Activity, BarChart3, RefreshCw, AlertTriangle } from 'lucide-react';
import { adminApiClient } from '../../api/client';

type Timeline = {
  currentStatus?: string;
  createdAt?: string;
  stagingCompletedAt?: string | null;
  lastObservedAt?: string;
  historyComplete?: boolean;
  stageDurationsKnown?: boolean;
  truncated?: boolean;
  events?: Array<{
    eventId: string;
    kind?: string;
    createdAt?: string;
    errorCode?: string | null;
    message?: string;
    attempt?: number | null;
  }>;
};
type Evidence = { counters: Record<string, unknown> | null; timeline: Timeline | null };
const keys = [
  ['received', 'مستلمة', 'Received'],
  ['staged', 'مجهزة', 'Staged'],
  ['skipped', 'متكررة', 'Skipped'],
  ['invalid', 'غير صالحة', 'Invalid'],
  ['processed', 'معالجة', 'Processed'],
  ['failed', 'فاشلة', 'Failed'],
  ['review', 'للمراجعة', 'For review'],
] as const;

/** Canonical reads only: execution events and counters have different contracts. */
export function ImportBatchEvidence({ batchId, isArabic }: { batchId: string; isArabic: boolean }) {
  const [evidence, setEvidence] = useState<Evidence>({ counters: null, timeline: null });
  const [busy, setBusy] = useState('');
  const [failed, setFailed] = useState<keyof Evidence | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    const requests = generation;
    requests.current++;
    setEvidence({ counters: null, timeline: null });
    setBusy('');
    setFailed(null);
    return () => {
      requests.current++;
    };
  }, [batchId]);
  const read = async (kind: keyof Evidence) => {
    if (!batchId || busy) return;
    const current = generation.current;
    setBusy(kind);
    setFailed(null);
    try {
      const result = await adminApiClient.request<Record<string, unknown>>(
        `/admin/imports/batches/${encodeURIComponent(batchId)}/${kind === 'timeline' ? 'timeline' : 'counters'}`,
      );
      if (current === generation.current)
        setEvidence((previous) => ({ ...previous, [kind]: result }));
    } catch {
      if (current === generation.current) setFailed(kind);
    } finally {
      if (current === generation.current) setBusy('');
    }
  };
  const date = (value?: string | null) =>
    value && Number.isFinite(Date.parse(value))
      ? new Date(value).toLocaleString(isArabic ? 'ar' : 'en')
      : '—';
  return (
    <div className="import-batch-evidence">
      <div className="import-actions">
        <button
          type="button"
          disabled={!batchId || Boolean(busy)}
          onClick={() => {
            void read('timeline');
          }}
        >
          <Activity size={18} />
          {isArabic ? 'سجل التشغيل' : 'Execution history'}
        </button>
        <button
          type="button"
          disabled={!batchId || Boolean(busy)}
          onClick={() => {
            void read('counters');
          }}
        >
          <BarChart3 size={18} />
          {isArabic ? 'العدادات الموثقة' : 'Counters'}
        </button>
      </div>
      {busy && (
        <p role="status">{isArabic ? 'جارٍ تحميل أدلة الدفعة…' : 'Loading batch evidence…'}</p>
      )}
      {failed && (
        <div role="alert" className="import-inline-error">
          <AlertTriangle size={18} />
          {isArabic
            ? 'تعذر تحميل هذا الجزء؛ البيانات الأخرى محفوظة.'
            : 'This evidence could not be loaded; other results are retained.'}
          <button
            type="button"
            onClick={() => {
              void read(failed);
            }}
          >
            <RefreshCw size={16} />
            {isArabic ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}
      {evidence.counters && (
        <section aria-label={isArabic ? 'عدادات الدفعة' : 'Batch counters'}>
          <dl className="import-evidence-counts">
            {keys.map(([key, ar, en]) => {
              const value = evidence.counters![key];
              const known = typeof value === 'number' && Number.isFinite(value) && value >= 0;
              return (
                <div key={key}>
                  <dt>{isArabic ? ar : en}</dt>
                  <dd data-known={known}>
                    {known
                      ? value.toLocaleString(isArabic ? 'ar' : 'en')
                      : isArabic
                        ? 'غير متاح'
                        : 'Unavailable'}
                  </dd>
                </div>
              );
            })}
          </dl>
          {evidence.counters.consistent === false && (
            <p role="alert">
              {isArabic
                ? 'العدادات لا تتطابق؛ راجع أدلة الدفعة قبل إعادة المعالجة.'
                : 'Counters do not reconcile; inspect evidence before replaying.'}
            </p>
          )}
        </section>
      )}
      {evidence.timeline && (
        <section
          className="import-timeline"
          aria-label={isArabic ? 'أحداث الدفعة' : 'Batch execution events'}
        >
          <h3>
            <Activity size={18} />
            {isArabic ? 'سجل التشغيل' : 'Execution history'}
          </h3>
          <dl className="import-timeline-dates">
            <div>
              <dt>{isArabic ? 'الحالة الحالية' : 'Current status'}</dt>
              <dd>{evidence.timeline.currentStatus ?? '—'}</dd>
            </div>
            <div>
              <dt>{isArabic ? 'إنشاء الدفعة' : 'Created'}</dt>
              <dd>{date(evidence.timeline.createdAt)}</dd>
            </div>
            <div>
              <dt>{isArabic ? 'اكتمال التجهيز' : 'Staging completed'}</dt>
              <dd>{date(evidence.timeline.stagingCompletedAt)}</dd>
            </div>
            <div>
              <dt>{isArabic ? 'آخر رصد' : 'Last observed'}</dt>
              <dd>{date(evidence.timeline.lastObservedAt)}</dd>
            </div>
          </dl>
          {evidence.timeline.historyComplete !== true && (
            <p className="import-hint">
              {isArabic
                ? 'التاريخ المتاح جزئي؛ عدم وجود حدث لا يثبت أن المرحلة لم تُنفّذ.'
                : 'Recorded history is incomplete; an absent event does not prove a stage was not executed.'}
            </p>
          )}
          {evidence.timeline.truncated && (
            <p>
              {isArabic
                ? 'يُعرض أحدث 50 حدثًا محفوظًا.'
                : 'Showing the latest 50 persisted events.'}
            </p>
          )}
          {evidence.timeline.stageDurationsKnown !== true && (
            <p className="import-hint">
              {isArabic
                ? 'مدد المراحل التاريخية غير متاحة.'
                : 'Historical stage durations are unavailable.'}
            </p>
          )}
          {evidence.timeline.events?.length ? (
            <ol>
              {evidence.timeline.events.map((event) => (
                <li key={event.eventId}>
                  <strong>
                    {event.kind === 'WORKER_FAILURE'
                      ? isArabic
                        ? 'خطأ في المعالجة'
                        : 'Worker failure'
                      : event.kind === 'CHECKPOINT'
                        ? isArabic
                          ? 'نقطة استئناف'
                          : 'Checkpoint'
                        : (event.kind ?? '—')}
                  </strong>
                  <time>{date(event.createdAt)}</time>
                  {event.errorCode && <span dir="ltr">{event.errorCode}</span>}
                  {typeof event.attempt === 'number' && (
                    <span>
                      {isArabic ? 'المحاولة' : 'Attempt'}: {event.attempt}
                    </span>
                  )}
                  {event.message && <p>{event.message}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <p>
              {isArabic
                ? 'لا توجد أحداث تشغيل مسجلة ضمن التغطية المتاحة.'
                : 'No recorded execution events within the available history.'}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
