import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import {
  reviewSources,
  sourceAllowed,
  unsupportedCoverage,
} from '../features/review-queue/ReviewSources';
import {
  matchesReviewItem,
  mergeReviewItems,
  parseReviewFilters,
  reviewFilterValues,
  serializeReviewFilters,
  signalSla,
  type ReviewFilters,
  type ReviewItem,
} from '../features/review-queue/ReviewContracts';
import {
  auditQuery,
  parseAuditPreview,
  initialSourceState,
  loadReviewSources,
  reviewErrorCode,
  type ReviewPageState,
} from '../features/review-queue/ReviewLoader';

const labels: Record<string, [string, string]> = {
  all: ['الكل', 'All'],
  scholarships: ['المنح', 'Scholarships'],
  universities: ['الجامعات', 'Universities'],
  majors: ['التخصصات', 'Majors'],
  courses: ['الدورات', 'Courses'],
  tests: ['الاختبارات', 'Tests'],
  services: ['الخدمات', 'Services'],
  cms: ['المحتوى', 'CMS'],
  careers: ['الوظائف', 'Careers'],
  'study-destinations': ['وجهات الدراسة', 'Study destinations'],
  workflow_review: ['انتظار المراجعة', 'Workflow review'],
  incomplete: ['بيانات ناقصة', 'Incomplete'],
  ready_to_publish: ['جاهز لدى المالك', 'Owner ready to publish'],
  imported_unreviewed: ['مستورد', 'Imported'],
  needs_translation: ['بحاجة لترجمة', 'Translation needed'],
  source_verification: ['تحقق المصدر', 'Source verification'],
  broken_link: ['رابط معطل', 'Broken link'],
  import_review: ['مراجعة الاستيراد', 'Import review'],
  domain: ['المجال', 'Domain'],
  reason: ['السبب', 'Reason'],
  priority: ['الأولوية', 'Priority'],
  source: ['أصل السجل', 'Source kind'],
  age: ['عمر انتظار المراجعة', 'Review entry age'],
  sort: ['الترتيب', 'Sort'],
  view: ['عرض محفوظ', 'Preset'],
  critical: ['حرجة', 'Critical'],
  high: ['عالية', 'High'],
  medium: ['متوسطة', 'Medium'],
  low: ['منخفضة', 'Low'],
  imported: ['مستورد', 'Imported'],
  manual: ['يدوي', 'Manual'],
  unknown: ['غير معروف', 'Unknown'],
  today: ['اليوم', 'Today'],
  week: ['هذا الأسبوع', 'This week'],
  older: ['أقدم', 'Older'],
  newest: ['الأحدث تعديلًا', 'Latest modified'],
  oldest: ['الأقدم مراجعة', 'Oldest review entry'],
  urgent: ['أولوية عالية', 'Suggested urgent'],
  overdue: ['SLA متأخر بدليل المالك', 'Owner-evidenced overdue'],
  imported_today: ['مستورد اليوم بدليل المالك', 'Owner-evidenced imports today'],
  translation: ['الترجمة', 'Translation'],
  ready: ['جاهز', 'Ready'],
  partial: ['جزئي', 'Partial'],
  stale: ['قديم — أعد التحقق', 'Stale — recheck'],
  unavailable: ['غير متاح', 'Unavailable'],
  access_denied: ['محجوب بالصلاحيات', 'Access denied'],
  supported: ['مدعوم', 'Supported'],
  unsupported: ['غير مدعوم', 'Unsupported'],
  not_applicable: ['لا ينطبق', 'Not applicable'],
  forbidden: ['محجوب بالصلاحيات', 'Forbidden'],
  failed: ['فشل', 'Failed'],
  empty: ['لا أحداث في هذا النطاق', 'No events in this scope'],
  on_track: ['ضمن الموعد', 'On track'],
};
export function AdminReviewQueuePage() {
  const { language, dir } = useTranslation();
  const { permissions, hasPermission } = useAdminAuthorization();
  const permissionKey = [...permissions].sort().join('|');
  const [params, setParams] = useSearchParams();
  const filters = parseReviewFilters(params);
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const label = (value: string) => labels[value]?.[language === 'ar' ? 0 : 1] ?? value;
  const number = (value: number | null) =>
    value === null ? tr('غير معروف', 'Unknown') : new Intl.NumberFormat(language).format(value);
  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(language, {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'UTC',
        }).format(new Date(value)) + ' UTC'
      : tr('غير مزود', 'Not supplied');
  const allowed = useMemo(
    () => reviewSources.filter((source) => sourceAllowed(source, hasPermission)),
    [permissionKey],
  ); // Permission changes invalidate the entire read scope.
  const [states, setStates] = useState<ReviewPageState[]>(() =>
    reviewSources.map((source) => initialSourceState(source, sourceAllowed(source, hasPermission))),
  );
  const statesRef = useRef(states);
  statesRef.current = states;
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [listPage, setListPage] = useState(1);
  const [clock, setClock] = useState(Date.now());
  const selectionButton = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLDivElement | null>(null);
  const [audit, setAudit] = useState<{
    status: string;
    items: Array<{ id: string; action: string; timestamp: string }>;
    cursor: string | null;
    hasMore: boolean;
  }>({ status: 'unsupported', items: [], cursor: null, hasMore: false });
  const [diff, setDiff] = useState<{ status: string; fields: string[] }>({
    status: 'unsupported',
    fields: [],
  });
  const previewController = useRef<AbortController | null>(null);
  const load = useCallback(
    async (continuation = false, sourceKey?: string) => {
      controller.current?.abort();
      previewController.current?.abort();
      const token = ++generation.current;
      const abort = new AbortController();
      controller.current = abort;
      setSelected(null);
      setBusy(true);
      const initial = reviewSources.map((source) =>
        initialSourceState(
          source,
          allowed.some((entry) => entry.key === source.key),
        ),
      );
      const current = continuation ? statesRef.current : initial;
      if (!continuation) {
        setStates((previous) =>
          initial.map((state) => {
            const old = previous.find((entry) => entry.source.key === state.source.key);
            return state.availability !== 'access_denied' && old?.rows.length
              ? { ...old, availability: 'stale', nextPage: 1 }
              : state;
          }),
        );
        setListPage(1);
      }
      const requested = current.filter(
        (state) =>
          allowed.some((source) => source.key === state.source.key) &&
          (!sourceKey || sourceKey === state.source.key),
      );
      await loadReviewSources(
        requested,
        (url, options) => adminApiClient.request(url, options),
        abort.signal,
        (result) => {
          if (token !== generation.current) return;
          setStates((previous) =>
            previous.map((state) => {
              if (state.source.key !== result.source.key) return state;
              if (!continuation && result.availability === 'unavailable' && state.rows.length)
                return {
                  ...state,
                  availability: 'stale',
                  errorCode: result.errorCode,
                  nextPage: 1,
                };
              return result;
            }),
          );
        },
      );
      if (token === generation.current) setBusy(false);
    },
    [allowed],
  );
  useEffect(() => {
    void load();
    const visibility = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const focus = () => {
      void load();
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('focus', focus);
    return () => {
      ++generation.current;
      controller.current?.abort();
      previewController.current?.abort();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('focus', focus);
    };
  }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setListPage(1);
  }, [params.toString()]);
  // Strip unknown keys, PII/free-text and tampered enum values from shared URLs.
  useEffect(() => {
    const safe = serializeReviewFilters(parseReviewFilters(params));
    if (safe.toString() !== params.toString()) setParams(safe, { replace: true });
  }, [params, setParams]);
  const items = mergeReviewItems(
    states
      .filter(
        (state) =>
          allowed.some((source) => source.key === state.source.key) &&
          state.availability !== 'access_denied',
      )
      .flatMap((state) => state.rows),
  );
  const filtered = items
    .filter((item) => matchesReviewItem(item, filters, clock))
    .sort((a, b) => {
      const rank = (item: ReviewItem) =>
        Math.min(
          ...item.signals.map((signal) =>
            ['critical', 'high', 'medium', 'low'].indexOf(signal.priority),
          ),
        );
      const oldest = (item: ReviewItem) =>
        Math.min(
          ...item.signals.map((signal) =>
            signal.reviewEnteredAt ? Date.parse(signal.reviewEnteredAt) : Infinity,
          ),
        );
      if (filters.sort === 'newest')
        return Date.parse(b.modifiedAt ?? '1970-01-01') - Date.parse(a.modifiedAt ?? '1970-01-01');
      if (filters.sort === 'oldest') return oldest(a) - oldest(b);
      return rank(a) - rank(b) || a.key.localeCompare(b.key);
    });
  const hasPartial = states.some((state) => state.availability !== 'ready' || state.windowLimited);
  const openAudit = useCallback(
    async (item: ReviewItem, append = false, cursor?: string) => {
      const query = auditQuery(item, hasPermission('admin:audit:manage'), cursor);
      if (!query) {
        setAudit({
          status: hasPermission('admin:audit:manage') ? 'unsupported' : 'forbidden',
          items: [],
          cursor: null,
          hasMore: false,
        });
        return;
      }
      const signal = previewController.current?.signal;
      if (!signal) return;
      setAudit((previous) => ({ ...previous, status: 'loading' }));
      try {
        const response = await adminApiClient.request<{
          items: Array<{
            id: string;
            action: string;
            timestamp: string;
            target: { targetId: string; targetType: string };
          }>;
          nextCursor: string | null;
          hasMore: boolean;
        }>(query, { signal, cache: 'no-store' });
        if (signal.aborted) return;
        const safePage = parseAuditPreview(response, item);
        setAudit((previous) => ({
          status: safePage.items.length || append ? 'ready' : 'empty',
          items: append
            ? [
                ...new Map(
                  [...previous.items, ...safePage.items].map((row) => [row.id, row]),
                ).values(),
              ].slice(-120)
            : safePage.items,
          cursor: safePage.nextCursor,
          hasMore: safePage.hasMore,
        }));
      } catch (cause) {
        if (!signal.aborted)
          setAudit((previous) =>
            ['ACCESS_DENIED', 'SESSION_REQUIRED'].includes(reviewErrorCode(cause))
              ? { status: 'forbidden', items: [], cursor: null, hasMore: false }
              : { ...previous, status: 'failed' },
          );
      }
    },
    [permissionKey],
  );
  useEffect(() => {
    previewController.current?.abort();
    if (!selected) return;
    const abort = new AbortController();
    previewController.current = abort;
    setAudit({ status: 'loading', items: [], cursor: null, hasMore: false });
    setDiff({ status: selected.diff, fields: [] });
    void openAudit(selected);
    if (
      selected.diff === 'supported' &&
      hasPermission('admin:scholarships:manage') &&
      hasPermission('admin:imports:manage')
    ) {
      setDiff({ status: 'loading', fields: [] });
      void adminApiClient
        .request<{ recordId: string; fields: Array<{ field: string; state: string }> }>(
          `/admin/scholarships/import-center/records/${encodeURIComponent(selected.importRecordId!)}/diff`,
          { signal: abort.signal, cache: 'no-store' },
        )
        .then((value) => {
          if (abort.signal.aborted) return;
          if (value.recordId !== selected.importRecordId || !Array.isArray(value.fields))
            throw new Error('DIFF_TARGET_INVALID');
          setDiff({
            status: 'supported',
            fields: value.fields.slice(0, 100).map((field) => `${field.field}: ${field.state}`),
          });
        })
        .catch((cause) => {
          if (!abort.signal.aborted)
            setDiff({
              status: ['ACCESS_DENIED', 'SESSION_REQUIRED'].includes(reviewErrorCode(cause)) ? 'forbidden' : 'failed',
              fields: [],
            });
        });
    } else if (selected.diff === 'supported') setDiff({ status: 'forbidden', fields: [] });
    const prior = selectionButton.current;
    dialog.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
      if (event.key === 'Tab') {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], [tabindex="0"]',
        );
        if (!nodes?.length) {
          event.preventDefault();
          return;
        }
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === dialog.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || document.activeElement === dialog.current)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', escape);
    return () => {
      abort.abort();
      document.removeEventListener('keydown', escape);
      prior?.focus();
    };
  }, [selected, permissionKey, openAudit]);
  const updateFilter = (key: keyof ReviewFilters, value: string) =>
    setParams(serializeReviewFilters({ ...filters, [key]: value }));
  const canContinue = states.some(
    (state) => state.nextPage !== null && state.availability !== 'access_denied',
  );
  return (
    <div dir={dir} className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{tr('قائمة المراجعة', 'Enterprise Review Queue')}</h1>
        <button className="rounded border px-4 py-2" onClick={() => void load()}>
          {tr('تحديث وإعادة التحقق', 'Refresh and recheck')}
        </button>
      </header>
      <p>
        {tr(
          'للقراءة والتنقل إلى المالك فقط. لا موافقة أو نشر أو رفض من هنا.',
          'Read and navigate to the owner. Decisions remain in owner workspaces.',
        )}
      </p>
      <p role="status" aria-live="polite">
        {busy
          ? tr('جار تحميل صفحات محدودة…', 'Loading bounded source pages…')
          : tr('انتهت القراءة الحالية', 'Current reads completed')}{' '}
        · {tr('نطاق العينة المحفوظة', 'Retained sample scope')}: {number(items.length)} ·{' '}
        {tr('بعد الفلاتر', 'Filtered')}: {number(filtered.length)} ·{' '}
        {hasPartial
          ? tr(
              'التغطية جزئية أو غير متاحة؛ أقدم وأشد المهام عالميًا غير معروف.',
              'Coverage is partial or unavailable; global oldest and critical workload are unknown.',
            )
          : tr(
              'وصلت القراءات لنهاية الصفحات المتاحة؛ ليست لقطة موحدة.',
              'Reads reached available page ends; this is not a unified snapshot.',
            )}
      </p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {(Object.keys(reviewFilterValues) as Array<keyof ReviewFilters>).map((key) => (
          <label key={key} className="flex flex-col gap-1">
            {label(key)}
            <select
              className="rounded border p-2"
              value={filters[key]}
              onChange={(event) => updateFilter(key, event.target.value)}
            >
              {reviewFilterValues[key].map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <p className="text-sm">
        {tr(
          'الفلاتر والأولوية المقترحة ومؤشرات الجودة تخص العينة فقط. العمر يبدأ من دليل دخول المراجعة؛ الاستيراد والتعديل منفصلان. SLA غير معروف دون وقت الدخول والموعد وسياسة المالك.',
          'Filters, suggested priority and quality indicators apply to the sample. Age uses review entry evidence; import and modification clocks are separate. SLA is unknown without entry time, due time and owner policy.',
        )}
      </p>
      <details>
        <summary className="cursor-pointer font-semibold">
          {tr('تغطية المصادر والأعداد والأخطاء', 'Source coverage, counts and errors')}
        </summary>
        <p>
          {tr(
            'الإجماليات لكل استعلام وقد تتداخل؛ لا تجمعها كإجمالي سجلات فريد. الصفحات حية بترقيم offset، ويمكن أن تتغير أثناء القراءة؛ أعد التحقق لدى المالك.',
            'Query totals can overlap; they are not a unique record total. Live offset pages can change during reads; recheck with the owner.',
          )}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {[
                  tr('المصدر', 'Source'),
                  tr('الحالة', 'State'),
                  tr('مقروء / إجمالي', 'Read / total'),
                  tr('النطاق', 'Scope'),
                  tr('وقت القراءة', 'Read time'),
                  tr('الاستمرار', 'Continue'),
                ].map((value) => (
                  <th key={value} className="p-2 text-start">
                    {value}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {states.map((state) => (
                <tr key={state.source.key} className="border-t">
                  <td className="p-2">
                    <bdi>{state.source.key}</bdi>
                  </td>
                  <td>
                    {label(state.availability)} {state.errorCode && <bdi>{state.errorCode}</bdi>}
                  </td>
                  <td>
                    {number(state.scanned)} / {number(state.total)} ({number(state.rows.length)}{' '}
                    {tr('محفوظ', 'retained')})
                  </td>
                  <td>
                    {state.totalScope === 'owner_candidates'
                      ? tr(
                          'مرشحو المالك قبل تصفية الإشارات',
                          'Owner candidates before signal filtering',
                        )
                      : tr('سجلات الاستعلام', 'Query records')}
                    {state.windowLimited && (
                      <strong> · {tr('نافذة محدودة', 'Limited window')}</strong>
                    )}
                  </td>
                  <td>{date(state.capturedAt)}</td>
                  <td>
                    {state.nextPage !== null && state.availability !== 'access_denied' && (
                      <button
                        disabled={busy}
                        className="underline disabled:opacity-50"
                        onClick={() => void load(true, state.source.key)}
                      >
                        {tr('الصفحة التالية', 'Next page')} {number(state.nextPage)}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          {tr(
            'غير مدعوم بعقد إشارات آمن — ليس صفرًا:',
            'No safe signal contract supported — not zero:',
          )}{' '}
          <bdi>{unsupportedCoverage.join(', ')}</bdi>
        </p>
        <p>
          {tr(
            'أقصى نافذة محفوظة 500 سجل لكل مصدر. لا تُحمّل قاعدة كاملة؛ يمكن متابعة الأقدم مع إسقاط أقدم صفوف النافذة. روابط القوائم العامة تعرض معرف السجل للبحث لدى المالك.',
            'At most 500 rows are retained per source. Continue to older pages while earlier window rows are discarded. List handoffs show the record ID for owner lookup.',
          )}
        </p>
      </details>
      <button
        disabled={busy || !canContinue}
        className="rounded border px-4 py-2 disabled:opacity-50"
        onClick={() => void load(true)}
      >
        {tr('متابعة صفحة واحدة لكل مصدر متاح', 'Continue one page per available source')}
      </button>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {[
                tr('السجل', 'Record'),
                tr('الإشارات والأولوية', 'Signals and priority'),
                tr('الأوقات', 'Clocks'),
                tr('المالك', 'Owner'),
              ].map((value) => (
                <th key={value} className="p-2 text-start">
                  {value}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice((listPage - 1) * 40, listPage * 40).map((item) => (
              <tr key={item.key} className="border-t align-top">
                <td className="p-2">
                  <bdi>{item.title}</bdi>
                  <div>
                    {label(item.domain)} · <bdi>{item.id}</bdi>
                  </div>
                  <small>
                    {tr('لغة المصدر', 'Source locale')}: {item.locale ?? label('unknown')} ·{' '}
                    {label(item.sourceKind)}
                  </small>
                </td>
                <td className="p-2">
                  {item.signals.map((signal) => (
                    <div key={signal.key}>
                      {label(signal.reason)} · {label(signal.priority)} (
                      {signal.priorityBasis === 'owner'
                        ? tr('المالك', 'Owner')
                        : tr('مقترحة', 'Suggested')}
                      ) · SLA: {label(signalSla(signal, clock))}
                    </div>
                  ))}
                </td>
                <td className="p-2 text-sm">
                  {tr('استيراد', 'Imported')}: {date(item.importedAt)}
                  <br />
                  {tr('تعديل', 'Modified')}: {date(item.modifiedAt)}
                  <br />
                  {tr(
                    'تعيين المراجع: غير مزود بعقد المالك',
                    'Reviewer assignment: not supplied by owner contract',
                  )}
                </td>
                <td className="p-2">
                  <Link className="underline" to={item.href}>
                    {tr('فتح لدى المالك', 'Open owner workspace')}
                  </Link>
                  {!item.detail && (
                    <div className="text-sm">
                      {tr(
                        'انتقال لقائمة مفلترة؛ تحقق من المعرف المعروض',
                        'Filtered list handoff; verify the displayed ID',
                      )}
                    </div>
                  )}
                  <button
                    className="mt-2 block underline"
                    onClick={(event) => {
                      selectionButton.current = event.currentTarget;
                      setSelected(item);
                    }}
                  >
                    {tr('معاينة الأدلة', 'Preview evidence')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <p>
          {tr(
            'لا صفوف مطابقة في العينة الحالية. تحقق من التغطية قبل الاستنتاج.',
            'No matching rows in the current sample. Check coverage before drawing conclusions.',
          )}
        </p>
      )}
      <nav aria-label={tr('صفحات العينة', 'Sample pages')} className="flex gap-3">
        <button disabled={listPage <= 1} onClick={() => setListPage((page) => page - 1)}>
          {tr('السابق', 'Previous')}
        </button>
        <span>
          {number(listPage)} / {number(Math.max(1, Math.ceil(filtered.length / 40)))}
        </span>
        <button
          disabled={listPage * 40 >= filtered.length}
          onClick={() => setListPage((page) => page + 1)}
        >
          {tr('التالي', 'Next')}
        </button>
      </nav>
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-preview-title"
            tabIndex={-1}
            className="max-h-[90vh] w-full max-w-3xl space-y-3 overflow-auto rounded bg-white p-5 text-slate-900"
          >
            <h2 id="review-preview-title" className="text-xl font-bold">
              <bdi>{selected.title}</bdi>
            </h2>
            <button className="rounded border px-3 py-1" onClick={() => setSelected(null)}>
              {tr('إغلاق', 'Close')}
            </button>
            <p>
              {tr(
                'هذه أدلة قراءة؛ أعد التحقق من الحالة الحالية لدى المالك قبل القرار.',
                'This is read evidence; recheck the current owner state before deciding.',
              )}
            </p>
            {selected.signals.map((signal) => (
              <div key={signal.key} className="rounded border p-2">
                <bdi>{signal.source}</bdi> · {label(signal.reason)}{' '}
                {signal.ownerCode && <bdi>{signal.ownerCode}</bdi>}
                <p>
                  {tr('دخول المراجعة', 'Review entered')}: {date(signal.reviewEnteredAt)} ·{' '}
                  {tr('الموعد', 'Due')}: {date(signal.dueAt)} · {tr('قراءة', 'Captured')}:{' '}
                  {date(signal.capturedAt)}
                </p>
                <p>
                  {tr('سياسة المالك', 'Owner policy')}:{' '}
                  <bdi>{signal.policy ?? label('unknown')}</bdi> · SLA:{' '}
                  {label(signalSla(signal, clock))}
                </p>
              </div>
            ))}
            <p>
              {tr('معاينة التدقيق المحدودة', 'Bounded audit preview')}: {label(audit.status)} ·{' '}
              {tr(
                'النافذة الأخيرة حتى 120 حدثًا؛ لا عرض لبيانات المنفذ',
                'Latest window up to 120 events; actor details omitted',
              )}
            </p>
            {audit.items.map((row) => (
              <p key={row.id}>
                <bdi>{row.action}</bdi> · {date(row.timestamp)}
              </p>
            ))}
            {audit.hasMore && audit.cursor && (
              <button
                disabled={audit.status === 'loading'}
                className="underline"
                onClick={() => void openAudit(selected, true, audit.cursor!)}
              >
                {tr('المزيد من التدقيق — التاريخ جزئي', 'More audit — history is partial')}
              </button>
            )}
            <p>
              {tr('أصل الاستيراد', 'Import provenance')}:{' '}
              <bdi>
                {selected.sourceSystem ?? label('unknown')} / {selected.batchId ?? label('unknown')}{' '}
                / {selected.sourceRowNumber ?? label('unknown')}
              </bdi>
            </p>
            <p>
              {tr('دعم مقارنة المصدر', 'Source comparison capability')}: {label(diff.status)}
            </p>
            {diff.fields.map((field, index) => (
              <p key={index}>
                <bdi>{field}</bdi>
              </p>
            ))}
            {selected.sourceUrl && (
              <p>
                {tr(
                  'رابط خارجي؛ الثقة وحالة التحقق حسب دليل المالك',
                  'External link; trust and verification depend on owner evidence',
                )}
                : <bdi>{new URL(selected.sourceUrl).hostname}</bdi> ·{' '}
                <bdi>{selected.verificationState}</bdi>
                {selected.sourceUrl.startsWith('http:') && (
                  <strong> · {tr('HTTP غير مشفر', 'Unencrypted HTTP')}</strong>
                )}
                <a
                  className="ms-2 underline"
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tr(
                    'فتح المصدر الخارجي بعد مراجعة التحذير',
                    'Open external source after reviewing warning',
                  )}
                </a>
              </p>
            )}
            <Link className="underline" to={selected.href}>
              {tr('إعادة التحقق لدى المالك', 'Recheck with owner')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
