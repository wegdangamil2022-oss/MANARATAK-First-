import { useEffect, useRef, useState } from 'react';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useTranslation } from '../i18n/I18nProvider';

type Template = {
  active?: boolean;
  version?: number;
  usageCount?: number;
  id: string;
  channels: string[];
  requiredVariables: string[];
  localizations: string[];
};
type Intent = {
  id: string;
  templateId: string;
  recipientReference: string;
  deliveryState: string;
  attempts: number;
  nextAttemptAt?: string;
  deliveredAt?: string;
  lastErrorCode?: string;
  manualRetryCount?: number;
};
type Page<T> = { items: T[]; nextCursor?: string | null };
type Receipt = { channel: string; status: string; attempts: number; updatedAt: string };
type Recipient = { studentReferenceId: string; displayName?: string };
const states = [
  'PENDING',
  'PROCESSING',
  'DELIVERED',
  'ACCEPTED',
  'FAILED',
  'DEAD_LETTER',
  'SUPPRESSED',
  'CANCELLED',
  'EXPIRED',
];
const fresh = () => ({
  id: createAdminIdempotencyKey(),
  templateId: '',
  recipientReference: '',
  variables: {} as Record<string, string>,
  scheduledAt: '',
  expiresAt: '',
});

export function NotificationOperationsPage() {
  const { language, dir } = useTranslation(),
    { hasPermission } = useAdminAuthorization();
  const c = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const [templates, setTemplates] = useState<Template[]>([]),
    [result, setResult] = useState<Page<Intent>>({ items: [] });
  const [summary, setSummary] = useState<{
    from: string;
    to: string;
    counts: Record<string, number>;
  } | null>(null);
  const [cloneTarget, setCloneTarget] = useState('');
  const [fromDate, setFromDate] = useState(''),
    [toDate, setToDate] = useState(''),
    [recipientFilter, setRecipientFilter] = useState('');
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const [search, setSearch] = useState(''),
    [state, setState] = useState(''),
    [filterTemplate, setFilterTemplate] = useState('');
  const [cursor, setCursor] = useState(''),
    [previous, setPrevious] = useState<string[]>([]),
    [reload, setReload] = useState(0);
  const [draft, setDraft] = useState<ReturnType<typeof fresh> | null>(null),
    [locked, setLocked] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState(''),
    [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientCursor, setRecipientCursor] = useState(''),
    [recipientNext, setRecipientNext] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<{ id: string; items: Receipt[] } | null>(null);
  const [templateForm, setTemplateForm] = useState(false),
    [templateId, setTemplateId] = useState(''),
    [channel, setChannel] = useState('IN_APP');
  const [required, setRequired] = useState(''),
    [subjectAr, setSubjectAr] = useState(''),
    [bodyAr, setBodyAr] = useState(''),
    [subjectEn, setSubjectEn] = useState(''),
    [bodyEn, setBodyEn] = useState('');
  const [preview, setPreview] = useState<{
    title: string;
    message: string;
    locale: string;
    fallback: boolean;
  } | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState('');
  const [samples, setSamples] = useState('{}');
  const previewGeneration = useRef(0), receiptGeneration = useRef(0);
  const [previewBusy, setPreviewBusy] = useState(false);
  useEffect(() => {
    ++previewGeneration.current;
    setPreview(null);
    return () => { ++previewGeneration.current; };
  }, [previewTemplateId, samples, language]);
  const guard = useRef(false),
    keys = useRef(new Map<string, string>()),
    generation = useRef(0);
  const can = (action: string) => hasPermission(`admin:notifications:${action}`);
  const recipientLookupAllowed = can('intents:create') && can('recipients:pii');
  const selected = templates.find((t) => t.id === draft?.templateId);
  const date = (value?: string) =>
    value ? new Date(value).toLocaleString(language, { timeZone: 'UTC' }) + ' UTC' : '—';
  const stateName = (value: string) =>
    language === 'en'
      ? value
      : (
          {
            PENDING: 'قيد الانتظار',
            PROCESSING: 'جارٍ المعالجة',
            DELIVERED: 'تم التسليم',
            ACCEPTED: 'قبله المزود — التسليم غير مؤكد',
            FAILED: 'فشل',
            DEAD_LETTER: 'الفشل النهائي',
            SUPPRESSED: 'محجوب بالتفضيلات',
            CANCELLED: 'ملغي',
            EXPIRED: 'منتهي',
          } as Record<string, string>
        )[value] || value;
  useEffect(() => {
    const id = ++generation.current;
    setLoading(true);
    setNotice('');
    setResult({ items: [] });
    setReceipts(null);
    const query = new URLSearchParams({
      limit: '25',
      ...(cursor ? { cursor } : {}),
      ...(search ? { search } : {}),
      ...(state ? { deliveryState: state } : {}),
      ...(fromDate ? { from: new Date(fromDate).toISOString() } : {}),
      ...(toDate ? { to: new Date(toDate).toISOString() } : {}),
      ...(recipientFilter ? { recipientReference: recipientFilter } : {}),
      ...(filterTemplate ? { templateId: filterTemplate } : {}),
    });
    Promise.all([
      adminApiClient.request<Page<Template>>('/notifications/templates?limit=500'),
      adminApiClient.request<Page<Intent>>(`/notifications/intents?${query}`),
    ])
      .then(([t, i]) => {
        if (id === generation.current) {
          setTemplates(t.items);
          setResult(i);
        }
      })
      .catch(() => {
        if (id === generation.current) {
          setResult({ items: [] });
          setNotice(
            language === 'ar'
              ? 'تعذر تحميل الإشعارات. أعد المحاولة.'
              : 'Notifications could not be loaded. Retry.',
          );
        }
      })
      .finally(() => {
        if (id === generation.current) setLoading(false);
      });
    return () => {
      ++generation.current;
      ++receiptGeneration.current;
    };
  }, [cursor, search, state, filterTemplate, reload, language, fromDate, toDate, recipientFilter]);
  useEffect(() => {
    let active = true;
    setSummary(null);
    const to = new Date(),
      from = new Date(to.getTime() - 86400000);
    adminApiClient
      .request<{ from: string; to: string; counts: Record<string, number> }>(
        `/notifications/summary?${new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })}`,
      )
      .then((value) => {
        if (active) setSummary(value);
      })
      .catch(() => {
        if (active) setSummary(null);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  useEffect(() => {
    setRecipients([]);
    setRecipientNext(null);
    if (!draft || !recipientLookupAllowed) return;
    let active = true;
    const timer = setTimeout(() => {
      const query = new URLSearchParams({
        query: recipientQuery,
        ...(recipientCursor ? { cursor: recipientCursor } : {}),
      });
      adminApiClient
        .request<Page<Recipient>>(`/notifications/recipients?${query}`)
        .then((page) => {
          if (active) {
            setRecipients(page.items);
            setRecipientNext(page.nextCursor ?? null);
          }
        })
        .catch(() => {
          if (active) {
            setRecipients([]);
            setRecipientNext(null);
            setNotice(
              language === 'ar' ? 'تعذر تحميل المستلمين' : 'Recipients could not be loaded',
            );
          }
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [!!draft, recipientQuery, recipientCursor, language, recipientLookupAllowed]);
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => {
      if (draft || templateForm) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [draft, templateForm]);
  const write = async (path: string, body: unknown, onSuccess?: () => void) => {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setNotice('');
    const existing = keys.current.get(path),
      key = existing ?? createAdminIdempotencyKey();
    keys.current.set(path, key);
    try {
      await adminApiClient.request(path, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Idempotency-Key': key },
      });
      keys.current.delete(path);
      onSuccess?.();
      setReload((n) => n + 1);
      setNotice(
        c(
          'تم قبول العملية. إنشاء الإشعار لا يعني تسليمه.',
          'Operation accepted. Creating an intent does not confirm delivery.',
        ),
      );
    } catch {
      setNotice(
        c(
          'لم تُؤكد العملية. احتفظ بالبيانات وأعد الطلب بالمفتاح نفسه.',
          'The operation is unconfirmed. Keep the inputs and retry with the same key.',
        ),
      );
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };
  const resetPage = () => {
    setCursor('');
    setPrevious([]);
  };
  const requiredNames = [
    ...new Set(
      required
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  return (
    <section dir={dir} className="admin-owner-workspace mx-auto max-w-7xl space-y-6 text-[#203442]">
      <header className="admin-page-hero rounded-3xl bg-gradient-to-l from-[#142B5F] to-[#0E7C86] p-6 text-white"><h1 className="">{c('إدارة الإشعارات', 'Notification operations')}</h1><p>{c('قوالب الإرسال، إشعارات الطالب، الجدولة وحالة التسليم.', 'Delivery templates, student notifications, scheduling and delivery status.')}</p><nav className="flex w-full flex-wrap gap-3">
        <button disabled={busy || loading} onClick={() => setReload((n) => n + 1)}>
          {c('تحديث', 'Refresh')}
        </button>
        {can('intents:create') && can('recipients:pii') && (
          <button
            disabled={busy || !!draft}
            onClick={() => {
              setDraft(fresh());
              setLocked(false);
              setRecipients([]);
            }}
          >
            {c('إنشاء إشعار', 'Create intent')}
          </button>
        )}
        {can('templates:author') && (
          <button disabled={busy || templateForm} onClick={() => setTemplateForm(true)}>
            {c('إنشاء إصدار قالب', 'Create template revision')}
          </button>
        )}
      </nav></header>
      <p>
        {c(
          'سجل API فعلي. تحقق قاعدة البيانات والمزود والعامل مؤجل إلى ما بعد القسم 28.',
          'Live API records. Database, provider and worker validation is deferred until after section 28.',
        )}
      </p>
      <p>
        {c(
          'الأوقات المعروضة UTC. حالة «قبله المزود» لا تثبت وصول الرسالة.',
          'Displayed times are UTC. ACCEPTED does not prove that the recipient received the message.',
        )}
      </p>
      {summary ? (
        <div>
          <p>
            {c('إحصاءات جميع السجلات المنشأة في النافذة', 'All records created in this window')}:{' '}
            {date(summary.from)} — {date(summary.to)}
          </p>
          <p>
            {Object.entries(summary.counts)
              .map(([key, count]) => `${stateName(key)}: ${count}`)
              .join(' | ')}
          </p>
        </div>
      ) : (
        <p>{c('الإحصاءات العامة غير متاحة', 'Global counts unavailable')}</p>
      )}
      {notice && <p role="status">{notice}</p>}

      {templateForm && (
        <form
          className="space-y-3 border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void write(
              '/notifications/templates',
              {
                id: templateId,
                channels: channel.split(',').filter(Boolean),
                requiredVariables: requiredNames,
                localizations: ['ar', 'en'],
                contents: {
                  ar: { subject: subjectAr, body: bodyAr },
                  en: { subject: subjectEn, body: bodyEn },
                },
              },
              () => setTemplateForm(false),
            );
          }}
        >
          <p>
            {c(
              'كل إصدار له معرّف جديد. لا يعدّل القالب الحالي أو رسائله المعلقة. استخدم {{name}} للمتغيرات المعلنة.',
              'Each revision requires a new ID. Existing templates and pending messages stay pinned. Use {{name}} for declared variables.',
            )}
          </p>
          <fieldset
            disabled={busy || keys.current.has('/notifications/templates')}
            className="space-y-2"
          >
            <label>
              {c('معرّف الإصدار', 'Revision ID')}
              <input required value={templateId} onChange={(e) => setTemplateId(e.target.value)} />
            </label>
            <label>
              {c('القناة', 'Channel')}
              <select
                multiple
                value={channel.split(',')}
                onChange={(e) =>
                  setChannel([...e.target.selectedOptions].map((option) => option.value).join(','))
                }
              >
                {['IN_APP', 'EMAIL', 'PUSH'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              {c('متغيرات مطلوبة مفصولة بفواصل', 'Required variables, comma separated')}
              <input value={required} onChange={(e) => setRequired(e.target.value)} />
            </label>
            <label>
              AR — {c('العنوان', 'Subject')}
              <input
                required
                maxLength={240}
                value={subjectAr}
                onChange={(e) => setSubjectAr(e.target.value)}
              />
            </label>
            <label>
              AR — {c('الرسالة', 'Body')}
              <textarea required value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} />
            </label>
            <label>
              EN — {c('العنوان', 'Subject')}
              <input
                required
                maxLength={240}
                value={subjectEn}
                onChange={(e) => setSubjectEn(e.target.value)}
              />
            </label>
            <label>
              EN — {c('الرسالة', 'Body')}
              <textarea required value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} />
            </label>
          </fieldset>
          <button disabled={busy} type="submit">
            {c('حفظ الإصدار', 'Save revision')}
          </button>
          <button
            disabled={busy || keys.current.has('/notifications/templates')}
            type="button"
            onClick={() => setTemplateForm(false)}
          >
            {c('إغلاق', 'Close')}
          </button>
        </form>
      )}
      {can('templates:author') && (
        <details>
          <summary>{c('إدارة إصدارات القوالب', 'Manage template revisions')}</summary>
          <label>
            {c('معرّف الإصدار الجديد للنسخ', 'New revision ID for cloning')}
            <input
              disabled={busy || [...keys.current.keys()].some((key) => key.endsWith('/clone'))}
              value={cloneTarget}
              onChange={(e) => setCloneTarget(e.target.value)}
            />
          </label>
          {templates.map((t) => (
            <div key={t.id}>
              {t.id} — v{t.version ?? 1} — {c('سجلات مرتبطة', 'Linked intents')}:{' '}
              {t.usageCount ?? 0} —{' '}
              {t.active === false ? c('معطل', 'Inactive') : c('نشط', 'Active')}
              {t.active !== false && (
                <>
                  <button
                    disabled={busy || !cloneTarget}
                    onClick={() =>
                      void write(
                        `/notifications/templates/${encodeURIComponent(t.id)}/clone`,
                        { id: cloneTarget },
                        () => setCloneTarget(''),
                      )
                    }
                  >
                    {c('نسخ إلى إصدار مستقل', 'Clone to a new revision')}
                  </button>
                  {!t.id.startsWith('system.') && !t.id.startsWith('student-application-') && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void write(
                          `/notifications/templates/${encodeURIComponent(t.id)}/deactivate`,
                          { expectedVersion: t.version ?? 1 },
                        )
                      }
                    >
                      {c('تعطيل إن لم يكن قيد الاستخدام', 'Deactivate when not in use')}
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </details>
      )}
      {draft && (
        <form
          className="space-y-3 border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setLocked(true);
            void write(
              '/notifications/intents',
              {
                id: draft.id,
                reference: `admin:${draft.id}`,
                templateId: draft.templateId,
                recipientReference: draft.recipientReference,
                variables: draft.variables,
                purpose: 'TRANSACTIONAL',
                ...(draft.scheduledAt
                  ? { scheduledAt: new Date(draft.scheduledAt).toISOString() }
                  : {}),
                ...(draft.expiresAt ? { expiresAt: new Date(draft.expiresAt).toISOString() } : {}),
              },
              () => {
                setDraft(null);
                setLocked(false);
              },
            );
          }}
        >
          <fieldset disabled={busy || locked} className="space-y-2">
            <label>
              {c('القالب', 'Template')}
              <select
                required
                value={draft.templateId}
                onChange={(e) => setDraft({ ...draft, templateId: e.target.value, variables: {} })}
              >
                <option value="">—</option>
                {templates
                  .filter((t) => t.active !== false)
                  .map((t) => (
                    <option key={t.id}>{t.id}</option>
                  ))}
              </select>
            </label>
            <label>
              {c('بحث عن طالب نشط', 'Search active students')}
              <input
                value={recipientQuery}
                onChange={(e) => {
                  setRecipientQuery(e.target.value);
                  setRecipientCursor('');
                  setRecipients([]);
                }}
              />
            </label>
            <label>
              {c('المستلم المؤكد', 'Verified recipient')}
              <select
                required
                value={draft.recipientReference}
                onChange={(e) => setDraft({ ...draft, recipientReference: e.target.value })}
              >
                <option value="">—</option>
                {draft.recipientReference &&
                  !recipients.some((r) => r.studentReferenceId === draft.recipientReference) && (
                    <option value={draft.recipientReference}>{draft.recipientReference}</option>
                  )}
                {recipients.map((r) => (
                  <option key={r.studentReferenceId} value={r.studentReferenceId}>
                    {r.displayName || r.studentReferenceId}
                  </option>
                ))}
              </select>
            </label>
            {recipientNext && (
              <button type="button" onClick={() => setRecipientCursor(recipientNext)}>
                {c('مستلمون إضافيون', 'More recipients')}
              </button>
            )}
            {(selected?.requiredVariables ?? []).map((name) => (
              <label key={name}>
                {name}
                <textarea
                  required
                  maxLength={10000}
                  value={draft.variables[name] ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      variables: { ...draft.variables, [name]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
            <label>
              {c('جدولة بتوقيت الجهاز', 'Schedule in device timezone')} (
              {Intl.DateTimeFormat().resolvedOptions().timeZone})
              <input
                type="datetime-local"
                value={draft.scheduledAt}
                onChange={(e) => setDraft({ ...draft, scheduledAt: e.target.value })}
              />
            </label>
            <p>{draft.scheduledAt && date(new Date(draft.scheduledAt).toISOString())}</p>
            <label>
              {c('انتهاء الصلاحية بتوقيت الجهاز', 'Expiry in device timezone')}
              <input
                type="datetime-local"
                value={draft.expiresAt}
                onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })}
              />
            </label>
            <p>
              {c(
                'الرسائل الترويجية والمجموعات غير مفعلة. تُحترم تفضيلات القنوات قبل كل إرسال.',
                'Promotional and bulk messages are disabled. Channel preferences are checked before every send.',
              )}
            </p>
          </fieldset>
          <button type="submit" disabled={busy || !draft.recipientReference}>
            {c('حفظ / إعادة الطلب نفسه', 'Save / replay the same request')}
          </button>
          <button type="button" disabled={busy || locked} onClick={() => setDraft(null)}>
            {c('إغلاق', 'Close')}
          </button>
        </form>
      )}
      {can('templates:author') && (
        <details>
          <summary>
            {c('معاينة ببيانات تجريبية — دون إرسال', 'Preview with sample values — no sending')}
          </summary>
          <label>
            {c('قالب محفوظ', 'Saved template')}
            <select
              value={previewTemplateId}
              onChange={(e) => {
                setPreviewTemplateId(e.target.value);
                setPreview(null);
              }}
            >
              <option value="">—</option>
              {templates
                .filter((t) => t.active !== false)
                .map((t) => (
                  <option key={t.id}>{t.id}</option>
                ))}
            </select>
          </label>
          <label>
            {c('متغيرات تجريبية JSON', 'Sample variables as JSON')}
            <textarea value={samples} onChange={(e) => setSamples(e.target.value)} />
          </label>
          <button
            type="button"
            disabled={busy || previewBusy || !previewTemplateId}
            onClick={() => {
              try {
                const variables = JSON.parse(samples);
                const request = ++previewGeneration.current;
                setPreview(null);
                setPreviewBusy(true);
                void adminApiClient
                  .request<typeof preview>(
                    `/notifications/templates/${encodeURIComponent(previewTemplateId)}/preview`,
                    {
                      method: 'POST',
                      body: JSON.stringify({ locale: language, variables }),
                      headers: { 'Idempotency-Key': createAdminIdempotencyKey() },
                    },
                  )
                  .then((value) => { if (request === previewGeneration.current) setPreview(value); })
                  .catch(() => {
                    if (request !== previewGeneration.current) return;
                    setPreview(null);
                    setNotice(
                      c(
                        'تعذرت المعاينة. تحقق من المتغيرات والمحتوى.',
                        'Preview unavailable. Check the variables and content.',
                      ),
                    );
                  }).finally(() => setPreviewBusy(false));
              } catch {
                setNotice(c('JSON غير صالح', 'Invalid JSON'));
              }
            }}
          >
            {c('معاينة', 'Preview')}
          </button>
          {preview && (
            <div>
              <strong>{preview.title}</strong>
              <p>{preview.message}</p>
              <p>
                {preview.locale}
                {preview.fallback ? ' — fallback' : ''}
              </p>
            </div>
          )}
        </details>
      )}
      <div className="flex flex-wrap gap-3">
        <label>
          {c('من تاريخ UTC', 'From UTC date')}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              resetPage();
            }}
          />
        </label>
        <label>
          {c('إلى تاريخ UTC — غير شامل', 'To UTC date — exclusive')}
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              resetPage();
            }}
          />
        </label>
        {can('recipients:pii') && (
          <label>
            {c('تصفية بمعرّف المستلم', 'Filter by recipient ID')}
            <input
              value={recipientFilter}
              onChange={(e) => {
                setRecipientFilter(e.target.value);
                resetPage();
              }}
            />
          </label>
        )}

        <label>
          {c('بحث المعرّف أو القالب في الخادم', 'Server search by ID or template')}
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
          />
        </label>
        <label>
          {c('الحالة', 'Status')}
          <select
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              resetPage();
            }}
          >
            <option value="">{c('الكل', 'All')}</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {stateName(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {c('القالب', 'Template')}
          <select
            value={filterTemplate}
            onChange={(e) => {
              setFilterTemplate(e.target.value);
              resetPage();
            }}
          >
            <option value="">{c('الكل', 'All')}</option>
            {templates
              .filter((t) => t.active !== false)
              .map((t) => (
                <option key={t.id}>{t.id}</option>
              ))}
          </select>
        </label>
      </div>
      <p>
        {c('عدد سجلات هذه الصفحة فقط', 'Records on this page only')}: {result.items.length}
      </p>
      {loading ? (
        <p role="status">{c('جارٍ التحميل', 'Loading')}</p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-start">
            <thead>
              <tr>
                {[
                  c('المعرّف', 'ID'),
                  c('المستلم', 'Recipient'),
                  c('الحالة', 'Status'),
                  c('محاولات', 'Attempts'),
                  c('الموعد القادم UTC', 'Next attempt UTC'),
                  c('العمليات', 'Operations'),
                ].map((s) => (
                  <th key={s}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.items.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.id}
                    <p>{row.templateId}</p>
                  </td>
                  <td>{row.recipientReference}</td>
                  <td>
                    {stateName(row.deliveryState)}
                    <p>{row.lastErrorCode}</p>
                  </td>
                  <td>{row.attempts}</td>
                  <td>{date(row.nextAttemptAt)}</td>
                  <td>
                    <button
                      disabled={busy}
                      onClick={() => {
                        const request = ++receiptGeneration.current;
                        setReceipts(null);
                        void adminApiClient
                          .request<Page<Receipt>>(
                            `/notifications/intents/${encodeURIComponent(row.id)}/receipts`,
                          )
                          .then((p) => { if (request === receiptGeneration.current) setReceipts({ id: row.id, items: p.items }); })
                          .catch(() => {
                            if (request !== receiptGeneration.current) return;
                            setReceipts(null);
                            setNotice(c('تعذر تحميل المحاولات', 'Receipts could not be loaded'));
                          });
                      }}
                    >
                      {c('نتائج القنوات', 'Channel results')}
                    </button>
                    {['FAILED', 'DEAD_LETTER'].includes(row.deliveryState) &&
                      can('delivery:retry') &&
                      (row.manualRetryCount ?? 0) < 3 && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            void write(
                              `/notifications/intents/${encodeURIComponent(row.id)}/retry`,
                              {},
                            )
                          }
                        >
                          {c('إعادة محاولة — حتى 3 دورات', 'Retry — up to 3 cycles')}
                        </button>
                      )}
                    {['PENDING', 'FAILED', 'DEAD_LETTER'].includes(row.deliveryState) &&
                      can('intents:cancel') && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            void write(
                              `/notifications/intents/${encodeURIComponent(row.id)}/cancel`,
                              {},
                            )
                          }
                        >
                          {c('إلغاء القنوات المتبقية', 'Cancel remaining channels')}
                        </button>
                      )}
                    {!['PENDING', 'FAILED', 'DEAD_LETTER'].includes(row.deliveryState) && (
                      <p>
                        {c(
                          'لا يمكن الإلغاء في هذه الحالة. القنوات المقبولة أو المسلمة لا تُسحب.',
                          'Cancellation is unavailable in this state. Accepted or delivered channels cannot be recalled.',
                        )}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!result.items.length && (
            <p>{c('لا توجد نتائج لهذا الاستعلام', 'No results for this query')}</p>
          )}
        </div>
      )}
      <nav className="flex gap-3">
        <button
          disabled={loading || !previous.length}
          onClick={() => {
            setCursor(previous.at(-1) ?? '');
            setPrevious((p) => p.slice(0, -1));
          }}
        >
          {c('السابق', 'Previous')}
        </button>
        <button
          disabled={loading || !result.nextCursor}
          onClick={() => {
            setPrevious((p) => [...p, cursor]);
            setCursor(result.nextCursor ?? '');
          }}
        >
          {c('التالي', 'Next')}
        </button>
      </nav>
      {receipts && (
        <aside className="border p-4">
          <h2>{receipts.id}</h2>
          {receipts.items.map((r) => (
            <p key={`${r.channel}:${r.attempts}:${r.updatedAt}`}>
              {r.channel} — {stateName(r.status)} — {r.attempts} — {date(r.updatedAt)}
            </p>
          ))}
          {!receipts.items.length && (
            <p>{c('لا توجد نتائج قنوات محفوظة بعد', 'No channel checkpoints yet')}</p>
          )}
          <button onClick={() => setReceipts(null)}>{c('إغلاق', 'Close')}</button>
        </aside>
      )}
    </section>
  );
}
