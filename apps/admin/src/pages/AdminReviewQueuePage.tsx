import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { ReviewOverview } from '../features/review-queue/ReviewOverview';
import { matchesReviewSearch } from '../features/review-queue/ReviewSearch';
import { ClipboardCheck, RefreshCw, Filter, Search, X, AlertTriangle, ShieldCheck, ArrowUpLeft, Eye, Layers, Clock3, SlidersHorizontal, ListFilter, Flag, Database, CalendarClock, ArrowDownWideNarrow, LayoutGrid, Languages, FileInput, CheckCircle2, Download, type LucideIcon } from 'lucide-react';
import { REVIEW_RESULTS_PAGE_SIZE, ReviewResultsPagination } from '../features/review-queue/ReviewResultsPagination';
import { reviewReadScope } from '../features/review-queue/ReviewSchedule';
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
  domain: ['القسم', 'Domain'],
  reason: ['سبب المراجعة', 'Reason'],
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
  DRAFT: ['مسودة', 'Draft'],
  IMPORTED: ['مستورد', 'Imported'],
  READY_TO_REVIEW: ['جاهز للمراجعة', 'Ready for review'],
  IN_REVIEW: ['قيد المراجعة', 'In review'],
  NEEDS_REVIEW: ['يحتاج مراجعة', 'Needs review'],
  READY_TO_PUBLISH: ['جاهز للنشر لدى القسم', 'Owner ready to publish'],
  PUBLISHED: ['منشور', 'Published'],
  ARCHIVED: ['مؤرشف', 'Archived'],
  INCOMPLETE: ['ناقص', 'Incomplete'],
  COMPLETE: ['مكتمل', 'Complete'],
};
const filterFields: Array<{key: keyof ReviewFilters; Icon: LucideIcon; tone: string}> = [
  {key:'domain',Icon:LayoutGrid,tone:'teal'}, {key:'reason',Icon:ListFilter,tone:'gold'},
  {key:'priority',Icon:Flag,tone:'navy'}, {key:'source',Icon:Database,tone:'teal'},
  {key:'age',Icon:CalendarClock,tone:'gold'}, {key:'sort',Icon:ArrowDownWideNarrow,tone:'navy'},
];
const quickViews: Record<string, {Icon: LucideIcon; title: [string,string]}> = {
  all:{Icon:LayoutGrid,title:['الكل','All']}, urgent:{Icon:Flag,title:['أولوية عالية','High priority']},
  overdue:{Icon:CalendarClock,title:['تجاوز الموعد','Overdue']}, imported_today:{Icon:FileInput,title:['مستورد اليوم','Imported today']},
  translation:{Icon:Languages,title:['الترجمة','Translation']}, source:{Icon:ShieldCheck,title:['تحقق المصدر','Source verification']}, ready:{Icon:CheckCircle2,title:['جاهز للنشر','Ready to publish']},
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
  const busyRef = useRef(false);
  const lastAttempt = useRef(0);
  const scopeKey = `${filters.domain}|${filters.reason}|${filters.view === 'ready' || filters.view === 'translation' ? filters.view : 'all'}`;
  const filtersRef = useRef(filters);
  const activeReadKeys = useRef(new Set<string>());
  filtersRef.current = filters;
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [listPage, setListPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
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
    async (continuation = false, sourceKey?: string, fullCoverage = false) => {
      controller.current?.abort();
      previewController.current?.abort();
      const token = ++generation.current;
      const abort = new AbortController();
      controller.current = abort;
      setSelected(null);
      setBusy(true);
      busyRef.current = true;
      lastAttempt.current = Date.now();
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
          (sourceKey ? sourceKey === state.source.key : fullCoverage || reviewReadScope(allowed, filtersRef.current).some(source => source.key === state.source.key)),
      );
      if (!sourceKey) activeReadKeys.current = new Set(requested.map(state => state.source.key));
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
      if (token === generation.current) { setBusy(false); busyRef.current = false; }
    },
    [allowed],
  );
  useEffect(() => {
    void load();
    const visibility = () => {
      if (document.visibilityState === 'visible' && !busyRef.current && Date.now() - lastAttempt.current > 300000) void load();
    };
    const focus = () => {
      visibility();
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
  }, [load, scopeKey]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setListPage(1);
  }, [params.toString(), searchQuery]);
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
    .filter((item) => matchesReviewItem(item, filters, clock) && matchesReviewSearch(item, searchQuery))
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
  const permittedStates = states.filter((state) => allowed.some((source) => source.key === state.source.key));
  const hasPartial = permittedStates.length === 0 || permittedStates.some((state) => state.availability !== 'ready' || state.windowLimited);
  const readSources = permittedStates.filter((state) => ['ready', 'partial'].includes(state.availability)).length;
  const unavailableSources = permittedStates.filter((state) => state.errorCode && ['unavailable', 'stale'].includes(state.availability));
  const lastRead = permittedStates.reduce<string | null>((latest, state) =>
    state.capturedAt && (!latest || state.capturedAt > latest) ? state.capturedAt : latest, null);
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
  const canContinue = permittedStates.some(
    (state) => activeReadKeys.current.has(state.source.key) && state.nextPage !== null && state.availability !== 'access_denied',
  );
  const currentPage = Math.min(listPage, Math.max(1, Math.ceil(filtered.length / REVIEW_RESULTS_PAGE_SIZE)));
  const visibleItems = filtered.slice((currentPage - 1) * REVIEW_RESULTS_PAGE_SIZE, currentPage * REVIEW_RESULTS_PAGE_SIZE);
  return (
    <div dir={dir} className="admin-owner-workspace admin-review-center mx-auto max-w-7xl space-y-5 text-[#203442]">
      <header className="admin-page-hero relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] px-5 py-6 text-white shadow-[0_18px_45px_rgba(20,43,95,0.18)] sm:px-7 sm:py-7">
        <div><span className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-[#F2CD78]"><ClipboardCheck className="h-4 w-4" aria-hidden="true" />{tr('مركز العمل الإداري', 'Administration work center')}</span>
        <h1 className="text-2xl font-bold">{tr('قائمة المراجعة', 'Enterprise Review Queue')}</h1>
        <p>{tr('إشارات المراجعة والجودة حسب المجال، مع الانتقال إلى القسم المسؤول لإتمام الإجراء.', 'Review and quality signals by domain, with handoffs to the responsible workspace.')}</p></div>
        <div className="flex flex-wrap items-stretch gap-3">
        <button disabled={busy} className="inline-flex items-center gap-2 rounded border px-4 py-2" onClick={() => void load()}>
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
          {tr('تحديث وإعادة التحقق', 'Refresh and recheck')}
        </button>
        </div>
      </header>
      <section className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm" aria-labelledby="review-filters">
      <div className="review-filter-heading"><h2 id="review-filters"><Filter aria-hidden="true" />{tr('البحث والتصفية', 'Search and filters')}</h2>
        <button type="button" onClick={() => { setSearchQuery(''); setParams(new URLSearchParams()); }} className="review-reset-button"><X aria-hidden="true" />{tr('مسح التصفية', 'Clear filters')}</button>
      </div>
      <div aria-label={tr('الفلاتر السريعة', 'Quick filters')} className="review-quick-filters">
        {reviewFilterValues.view.map((value) => { const {Icon,title}=quickViews[value]; return (
          <button key={value} type="button" aria-pressed={filters.view === value}
            onClick={() => updateFilter('view', value)}
            title={label(value === 'source' ? 'source_verification' : value)} className="review-quick-filter">
            <Icon aria-hidden="true" />{title[language === 'ar' ? 0 : 1]}
          </button>
        );})}
      </div>
      <div className="review-filter-fields">
        <label className="review-search-field">
          <span className="review-filter-caption"><Search aria-hidden="true" />{tr('البحث في السجلات المحمّلة', 'Search loaded records')}</span>
          <span className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-[#0E7C86]" />
            <input type="search" maxLength={200} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={tr('العنوان أو المعرّف أو رمز سبب المراجعة…', 'Title, ID or review reason code…')}
              className="min-h-11 w-full rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/30 py-2.5 pe-3 ps-10 text-sm" />
          </span>
        </label>
        {filterFields.map(({key,Icon,tone}) => (
          <label key={key} data-tone={tone}>
            <span className="review-filter-caption"><Icon aria-hidden="true" />{label(key)}</span>
            <select
              className="min-h-11 rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/30 px-3 py-2.5 text-sm font-medium"
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
      </section>
      {!busy && unavailableSources.length > 0 && (
        <p role="status" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-900">
          <AlertTriangle aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
          <span>{tr('بعض المصادر غير متاحة أو تحتاج إعادة تحقق. العدد غير المتاح ليس صفرًا؛ راجع تفاصيل التغطية أدناه.', 'Some sources are unavailable or need rechecking. Missing counts are not zero; see source coverage below.')}</span>
        </p>
      )}
      <p role="status" aria-live="polite" className="review-load-status">
        {busy ? <RefreshCw aria-hidden="true" className="animate-spin" /> : <CheckCircle2 aria-hidden="true" />}
        {busy
          ? tr('جار تحميل سجلات المراجعة…', 'Loading review records…')
          : tr('تم تحميل السجلات المتاحة', 'Available records loaded')}
        <span>{tr('النتائج تخص السجلات المحمّلة فقط', 'Results cover loaded records only')}</span>
      </p>
      <div className="review-read-summary">
        <span><Layers aria-hidden="true" />{tr('المصادر المقروءة', 'Sources read')} <b dir="ltr">{number(readSources)} / {number(permittedStates.length)}</b></span>
        <span><ClipboardCheck aria-hidden="true" />{tr('سجلات محمّلة', 'Loaded records')} <b>{number(items.length)}</b></span>
        <span><Filter aria-hidden="true" />{tr('نتائج التصفية', 'Filtered results')} <b>{number(filtered.length)}</b></span>
        <span><Clock3 aria-hidden="true" />{tr('آخر قراءة ناجحة', 'Latest successful read')} <b>{date(lastRead)}</b></span>
      </div>
      <details className="command-panel review-guide">
      <summary><ShieldCheck aria-hidden="true" />{tr('دليل المراجعة وحدود البيانات', 'Review and data guide')}</summary>
      <p className="command-caption">{hasPartial ? tr('هذه عينة جزئية؛ اختر مجالًا أو سببًا لقراءة مصادره، أو استخدم تحميل المزيد. أقدم وأشد الأعمال على مستوى المنصة غير معروف.', 'This is a partial sample. Select a domain or reason to read its sources, or load more. Global oldest and critical work remain unknown.') : tr('وصلت القراءة لنهاية المصادر المطلوبة؛ ليست لقطة موحدة.', 'Requested sources reached their page ends; reads are not an atomic snapshot.')}</p>
      <p className="command-caption">{tr('البحث داخل السجلات المحمّلة فقط ولا يضاف إلى رابط الصفحة.', 'Search only covers loaded records and is not added to the URL.')}</p>
      <p className="command-caption">{tr('إتمام المراجعة والنشر داخل القسم المختص. هذه الصفحة للمتابعة ومعاينة الأدلة.', 'Review and publish in the responsible workspace. Use this page to track work and preview evidence.')}</p>
      <p className="command-caption">
        {tr(
          'الفلاتر والأولوية المقترحة ومؤشرات الجودة تخص العينة فقط. العمر يبدأ من دليل دخول المراجعة؛ الاستيراد والتعديل منفصلان. SLA غير معروف دون وقت الدخول والموعد وسياسة المالك.',
          'Filters, suggested priority and quality indicators apply to the sample. Age uses review entry evidence; import and modification clocks are separate. SLA is unknown without entry time, due time and owner policy.',
        )}
      </p>
      </details>
      <div className="review-results-layout">
      <details className="admin-section-tools">
        <summary className="cursor-pointer font-semibold">
          {tr('تغطية المصادر والأعداد والأخطاء', 'Source coverage, counts and errors')}
        </summary>
        <p>
          {tr(
            'الإجماليات لكل استعلام وقد تتداخل؛ لا تجمعها كإجمالي سجلات فريد. الصفحات حية بترقيم offset، ويمكن أن تتغير أثناء القراءة؛ أعد التحقق لدى المالك.',
            'Query totals can overlap; they are not a unique record total. Live offset pages can change during reads; recheck with the owner.',
          )}
        </p>
        <button disabled={busy} onClick={() => void load(false, undefined, true)} className="review-outline-button">{tr('قراءة جميع مصادر التغطية', 'Read all coverage sources')}</button>
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
                    {!state.capturedAt && !state.errorCode ? tr('لم يُطلب بعد', 'Not requested yet') : label(state.availability)} {state.errorCode && <bdi>{state.errorCode}</bdi>}
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
      <section aria-labelledby="review-pending-work" className="overflow-hidden rounded-3xl border border-[#DDEFF2] bg-white shadow-sm">
        <div className="review-results-heading">
          <div><h2 id="review-pending-work"><ClipboardCheck aria-hidden="true" />{tr('سجلات المراجعة', 'Review records')}</h2>
            <p>{tr('عشرة سجلات في الصفحة. افتح السجل لإتمام العمل داخل قسمه.', 'Ten records per page. Open a record to complete work in its workspace.')}</p></div>
          <button type="button" disabled={busy || !canContinue} className="review-load-more" onClick={() => void load(true)} title={tr('جلب الصفحة التالية من المصادر المطلوبة؛ لا يحمّل كل قاعدة البيانات', 'Fetch the next page from requested sources, not the entire database')}><Download aria-hidden="true" />{tr('تحميل المزيد', 'Load more')}</button>
        </div>
        <ReviewResultsPagination page={currentPage} total={filtered.length} language={language} position="top" onPage={setListPage} />
      <div className="overflow-x-auto">
        <table className="w-full review-work-table">
          <thead>
            <tr>
              {[
                tr('السجل', 'Record'),
                tr('الإشارات والأولوية', 'Signals and priority'),
                tr('الإجراء', 'Action'),
              ].map((value) => (
                <th key={value} className="p-2 text-start">
                  {value}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.key} className="border-t align-top">
                <td className="p-2">
                  <strong className="review-record-title"><ClipboardCheck aria-hidden="true" /><bdi>{item.title}</bdi></strong>
                  <span className="review-record-domain">{label(item.domain)}</span>
                  <div className="review-record-tags">
                    {item.status && <span>{label(item.status)}</span>}
                    {item.completenessStatus && <span>{label(item.completenessStatus)}</span>}
                    {!item.status && !item.completenessStatus && <span>{item.domain === 'study-destinations' ? tr('لم يُنشأ ملف وجهة', 'Destination profile not created') : tr('التصنيف غير مزود', 'Classification not supplied')}</span>}
                  </div>
                  <details className="review-row-details"><summary>{tr('بيانات السجل', 'Record metadata')}</summary><bdi>{item.id}</bdi><p>{tr('لغة المصدر', 'Source locale')}: {item.locale ?? label('unknown')} · {label(item.sourceKind)}</p><p>{tr('استيراد', 'Imported')}: {date(item.importedAt)} · {tr('تعديل', 'Modified')}: {date(item.modifiedAt)}</p><p>{tr('تعيين المراجع غير مزود', 'Reviewer assignment not supplied')}</p></details>
                </td>
                <td className="p-2">
                  <div className="review-reason-tags">{[...new Set(item.signals.map(signal => signal.reason))].map(reason => <span key={reason}>{label(reason)}</span>)}</div>
                  {[...item.signals].sort((a,b) => ['critical','high','medium','low'].indexOf(a.priority) - ['critical','high','medium','low'].indexOf(b.priority)).slice(0,1).map((signal) => (
                    <div key={signal.key} className="review-signal">
                      <span className={`review-priority review-priority-${signal.priority}`}>{label(signal.priority)} (
                      {signal.priorityBasis === 'owner'
                        ? tr('المالك', 'Owner')
                        : tr('مقترحة', 'Suggested')}
                      )</span><small>SLA: {[...new Set(item.signals.map(entry => signalSla(entry, clock)))].map(label).join(' · ')}</small>
                    </div>
                  ))}
                </td>
                <td className="p-2">
                  <Link className="review-open-record" to={item.href}>
                    {tr('فتح السجل', 'Open record')}<ArrowUpLeft aria-hidden="true" />
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
                    className="review-preview-button"
                    onClick={(event) => {
                      selectionButton.current = event.currentTarget;
                      setSelected(item);
                    }}
                  >
                    <Eye aria-hidden="true" />{tr('معاينة الأدلة', 'Preview evidence')}
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
        <ReviewResultsPagination page={currentPage} total={filtered.length} language={language} position="bottom" onPage={setListPage} />
      </section>
      </div>
      <details className="command-panel review-analysis"><summary><SlidersHorizontal aria-hidden="true" />{tr('تحليل العينة ومساحات المراجعة', 'Sample analysis and review workspaces')}</summary>
        <ReviewOverview items={items} states={permittedStates} filters={filters} onFilter={updateFilter} language={language} now={clock} canOpenTranslations={hasPermission('admin:cms:manage')} />
      </details>
      <details className="command-panel review-guide">
        <summary><ShieldCheck aria-hidden="true" />{tr('الاعتماد والنشر داخل القسم المختص', 'Approval and publishing in the responsible workspace')}</summary>
        <p className="command-caption">{tr('تعرض هذه القائمة أدلة المراجعة وتوجّهك إلى القسم المسؤول. يبقى التحرير والاعتماد والنشر وسجل القرار داخل ذلك القسم وفق صلاحياتك.', 'This queue presents review evidence and routes you to the responsible workspace. Editing, approval, publishing and decision records remain there under your permissions.')}</p>
      </details>
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
            className="max-h-[90vh] w-full max-w-3xl space-y-4 overflow-auto rounded-3xl border border-[#DDEFF2] bg-[#FAF7F0] p-5 text-[#142B5F] shadow-xl sm:p-7"
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
