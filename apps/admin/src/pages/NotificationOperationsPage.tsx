import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, RefreshCw, RotateCcw, TriangleAlert, Plus, Search, X } from 'lucide-react';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';

type TemplateSummary = {
  id: string;
  channels: string[];
  requiredVariables: string[];
  localizations: string[];
  updatedAt?: string;
};
type IntentSummary = {
  id: string;
  reference: string;
  templateId: string;
  recipientReference: string;
  state: string;
  deliveryState: string;
  attempts: number;
  nextAttemptAt?: string;
  deliveredAt?: string | null;
  lastErrorCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
type ListResponse<T> = { items: T[] };
const deliveryStates: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  PROCESSING: 'جارٍ المعالجة',
  DELIVERED: 'تم التسليم',
  FAILED: 'فشل التسليم',
  DEAD_LETTER: 'الفشل النهائي',
  SUPPRESSED: 'موقوف بتفضيلات الطالب',
  CANCELLED: 'ملغي',
  EXPIRED: 'انتهت صلاحيته',
};
const pageSize = 25;
const blankDraft = () => ({
  id: createAdminIdempotencyKey(),
  templateId: '',
  recipientReference: '',
  variables: {} as Record<string, string>,
  scheduledAt: '',
  expiresAt: '',
});
const dateLabel = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ar');
};

export function NotificationOperationsPage() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [intents, setIntents] = useState<IntentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [limit, setLimit] = useState(200);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [templateFilter, setTemplateFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<ReturnType<typeof blankDraft> | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const generation = useRef(0);
  const mutationBusy = useRef(false);
  const alive = useRef(true);
  const creationKey = useRef<string | null>(null);
  const [draftLocked, setDraftLocked] = useState(false);

  const load = useCallback(
    async (preserveNotice = false) => {
      const request = ++generation.current;
      setLoading(true);
      setError(null);
      if (!preserveNotice) setNotice(null);
      const results = await Promise.allSettled([
        adminApiClient.request<ListResponse<TemplateSummary>>('/notifications/templates?limit=500'),
        adminApiClient.request<ListResponse<IntentSummary>>(
          `/notifications/intents?limit=${limit}`,
        ),
      ]);
      if (!alive.current || request !== generation.current) return false;
      const errors: string[] = [];
      if (results[0].status === 'fulfilled') setTemplates(results[0].value.items ?? []);
      else {
        setTemplates([]);
        errors.push('تعذر تحميل القوالب');
      }
      if (results[1].status === 'fulfilled') setIntents(results[1].value.items ?? []);
      else {
        setIntents([]);
        errors.push('تعذر تحميل سجل الإشعارات');
      }
      setError(errors.length ? errors.join('؛ ') : null);
      setLoading(false);
      return !errors.length;
    },
    [limit],
  );

  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      ++generation.current;
    };
  }, [load]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (draft || showTemplateForm) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', unload);
    return () => window.removeEventListener('beforeunload', unload);
  }, [draft, showTemplateForm]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return intents.filter(
      (intent) =>
        (stateFilter === 'ALL' || intent.deliveryState === stateFilter) &&
        (templateFilter === 'ALL' || intent.templateId === templateFilter) &&
        (!query ||
          [
            intent.id,
            intent.reference,
            intent.templateId,
            intent.recipientReference,
            intent.lastErrorCode,
          ].some((value) => value?.toLocaleLowerCase().includes(query))),
    );
  }, [intents, search, stateFilter, templateFilter]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => setPage((current) => Math.min(current, pages)), [pages]);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const counts = useMemo(
    () => ({
      total: intents.length,
      delivered: intents.filter((item) => item.deliveryState === 'DELIVERED').length,
      pending: intents.filter((item) => ['PENDING', 'PROCESSING'].includes(item.deliveryState))
        .length,
      failed: intents.filter((item) => ['FAILED', 'DEAD_LETTER'].includes(item.deliveryState))
        .length,
      suppressed: intents.filter((item) => item.deliveryState === 'SUPPRESSED').length,
    }),
    [intents],
  );
  const currentTemplate = templates.find((template) => template.id === draft?.templateId);
  const requiredVariables = [
    ...new Set([
      ...(currentTemplate?.requiredVariables ?? []),
      ...(currentTemplate?.channels.includes('IN_APP') ? ['title', 'message'] : []),
    ]),
  ];

  const mutate = async (
    key: string,
    operation: () => Promise<unknown>,
    message: string,
    afterWrite?: () => void,
  ) => {
    if (mutationBusy.current) return;
    mutationBusy.current = true;
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await operation();
      if (!alive.current) return;
      afterWrite?.();
      setNotice(message);
      const reloaded = await load(true);
      if (!reloaded && alive.current)
        setError('نجح الطلب، لكن تعذرت إعادة قراءة البيانات. حدّث السجل قبل إعادة المحاولة.');
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ العملية');
    } finally {
      mutationBusy.current = false;
      if (alive.current) setBusy(null);
    }
  };

  const retry = (intent: IntentSummary) => {
    if (mutationBusy.current || !window.confirm(`إعادة محاولة تسليم الإشعار ${intent.reference}؟`))
      return;
    void mutate(
      intent.id,
      () =>
        adminApiClient.request(`/notifications/intents/${encodeURIComponent(intent.id)}/retry`, {
          method: 'POST',
          body: '{}',
        }),
      'تم قبول إعادة المحاولة. التسليم يتم بواسطة عامل الإشعارات، وليس فور الضغط.',
    );
  };
  const cancel = (intent: IntentSummary) => {
    if (mutationBusy.current || !window.confirm(`إلغاء الإشعار ${intent.reference} قبل تسليمه؟`))
      return;
    void mutate(
      intent.id,
      () =>
        adminApiClient.request(`/notifications/intents/${encodeURIComponent(intent.id)}/cancel`, {
          method: 'POST',
          body: '{}',
        }),
      'تم إلغاء الإشعار.',
    );
  };
  const closeDraft = () => {
    if (mutationBusy.current || !window.confirm('ترك مسودة الإشعار؟')) return;
    setDraft(null);
    setDraftLocked(false);
    creationKey.current = null;
  };
  const createIntent = () => {
    if (!draft || !currentTemplate || mutationBusy.current) return;
    if (
      !draft.recipientReference.trim() ||
      requiredVariables.some((name) => !draft.variables[name]?.trim())
    ) {
      setError('أدخل معرّف المستلم وجميع المتغيرات المطلوبة.');
      return;
    }
    const scheduledAt = draft.scheduledAt ? new Date(draft.scheduledAt) : null;
    const expiresAt = draft.expiresAt ? new Date(draft.expiresAt) : null;
    if (
      (scheduledAt && Number.isNaN(scheduledAt.getTime())) ||
      (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) ||
      (scheduledAt && expiresAt && scheduledAt >= expiresAt)
    ) {
      setError('راجع موعد الجدولة وانتهاء الصلاحية.');
      return;
    }
    const actionUrl = draft.variables.actionUrl?.trim();
    if (
      actionUrl &&
      (!actionUrl.startsWith('/') ||
        actionUrl.startsWith('//') ||
        /[\\\u0000-\u001f]/.test(actionUrl))
    ) {
      setError('رابط التفاصيل يجب أن يكون مساراً داخلياً صالحاً.');
      return;
    }
    if (
      !window.confirm(
        'حفظ الإشعار في قائمة الإرسال للمستلم المحدد؟ قد يتم تسليمه عند تشغيل العامل.',
      )
    )
      return;
    creationKey.current ??= createAdminIdempotencyKey();
    setDraftLocked(true);
    const variables = Object.fromEntries(
      Object.entries(draft.variables).map(([name, value]) => [name, value.trim()]),
    );
    void mutate(
      'create-intent',
      () =>
        adminApiClient.request('/notifications/intents', {
          method: 'POST',
          idempotencyKey: creationKey.current!,
          body: JSON.stringify({
            id: draft.id,
            reference: `admin:${draft.id}`,
            templateId: draft.templateId,
            recipientReference: draft.recipientReference.trim(),
            variables,
            ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}),
            ...(expiresAt ? { expiresAt: expiresAt.toISOString() } : {}),
          }),
        }),
      'تم حفظ الإشعار في قائمة الإرسال. هذا لا يعني تسليمه بعد.',
      () => {
        setDraft(null);
        setDraftLocked(false);
        creationKey.current = null;
      },
    );
  };
  const createTemplate = () => {
    const id = templateId.trim();
    if (!id || mutationBusy.current) return;
    if (templates.some((template) => template.id === id) || id.startsWith('system.')) {
      setError('استخدم معرّف قالب جديداً؛ لا تستبدل القوالب القائمة أو النظامية.');
      return;
    }
    void mutate(
      'create-template',
      () =>
        adminApiClient.request('/notifications/templates', {
          method: 'POST',
          body: JSON.stringify({
            id,
            channels: ['IN_APP'],
            requiredVariables: ['title', 'message'],
            localizations: ['ar', 'en'],
          }),
        }),
      'تم حفظ قالب إشعار الطالب داخل الموقع.',
      () => {
        setShowTemplateForm(false);
        setTemplateId('');
      },
    );
  };

  return (
    <main dir="rtl" className="mx-auto max-w-7xl space-y-5">
      <header className="rounded-3xl bg-gradient-to-l from-[#142B5F] to-[#0E7C86] p-6 text-white">
        <h1 className="flex items-center gap-2 text-3xl font-black">
          <Bell /> إدارة الإشعارات
        </h1>
        <p className="mt-3 text-sm leading-7">
          قوالب الإرسال، إشعارات الطالب، الجدولة وحالة التسليم.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold disabled:opacity-50"
            disabled={loading || Boolean(busy)}
            onClick={() => void load()}
          >
            <RefreshCw className="inline h-4 w-4" /> تحديث
          </button>
          <button
            className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-bold disabled:opacity-50"
            disabled={loading || Boolean(busy) || Boolean(draft) || !templates.length}
            onClick={() => {
              setDraft(blankDraft());
              setDraftLocked(false);
              creationKey.current = null;
            }}
          >
            <Plus className="inline h-4 w-4" /> إنشاء إشعار
          </button>
          <button
            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold disabled:opacity-50"
            disabled={loading || Boolean(busy)}
            onClick={() => setShowTemplateForm(true)}
          >
            قالب إشعار داخل الموقع
          </button>
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800"
        >
          {notice}
        </div>
      )}
      <p className="rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
        الأرقام والفلاتر تخص أحدث {limit} سجل محمّل؛ التحديث يدوي. إشعارات داخل الموقع تظهر في حساب
        الطالب بعد تسليمها بواسطة العامل. البريد وPush يتطلبان مزوّد إرسال مهيأ.
      </p>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="السجلات المحمّلة" value={counts.total} />
        <Metric label="تم التسليم" value={counts.delivered} />
        <Metric label="انتظار / معالجة" value={counts.pending} />
        <Metric label="موقوف بالتفضيلات" value={counts.suppressed} />
        <Metric label="فشل / فشل نهائي" value={counts.failed} alert={counts.failed > 0} />
      </section>
      {showTemplateForm && (
        <form
          className="space-y-3 rounded-2xl border bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            createTemplate();
          }}
        >
          <fieldset disabled={Boolean(busy) || loading} className="space-y-3">
            <h2 className="font-bold text-[#142B5F]">قالب جديد لإشعار داخل حساب الطالب</h2>
            <p className="text-xs text-slate-500">
              قناة IN_APP، العربية والإنجليزية، مع عنوان ورسالة يُحددان عند إنشاء الإشعار.
            </p>
            <label className="block text-sm">
              معرّف القالب
              <input
                required
                maxLength={120}
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                className="mt-1 w-full rounded-xl border p-3"
                placeholder="admin.student-message.v1"
                dir="ltr"
              />
            </label>
            <button className="rounded-xl bg-[#142B5F] px-4 py-2 text-white">حفظ القالب</button>
            <button
              type="button"
              className="mr-2 rounded-xl border px-4 py-2"
              onClick={() => {
                if (!templateId || window.confirm('ترك مسودة القالب؟')) setShowTemplateForm(false);
              }}
            >
              إلغاء
            </button>
          </fieldset>
        </form>
      )}
      {draft && (
        <form
          className="space-y-3 rounded-2xl border bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            createIntent();
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#142B5F]">إنشاء إشعار للمستلم</h2>
            <button
              type="button"
              disabled={Boolean(busy)}
              aria-label="إغلاق المسودة"
              onClick={closeDraft}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <fieldset
            disabled={Boolean(busy) || loading || draftLocked}
            className="grid gap-3 sm:grid-cols-2"
          >
            <label className="text-sm">
              القالب
              <select
                required
                value={draft.templateId}
                onChange={(event) =>
                  setDraft({ ...draft, templateId: event.target.value, variables: {} })
                }
                className="mt-1 w-full rounded-xl border p-3"
              >
                <option value="">اختر القالب</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.id} ({template.channels.join(', ')})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              معرّف حساب المستلم
              <input
                required
                maxLength={120}
                dir="ltr"
                value={draft.recipientReference}
                onChange={(event) => setDraft({ ...draft, recipientReference: event.target.value })}
                className="mt-1 w-full rounded-xl border p-3"
              />
              <span className="text-xs text-slate-500">
                استخدم معرّف الحساب الفعلي من إدارة الطلاب، وليس الاسم أو البريد.
              </span>
            </label>
            {requiredVariables.map((name) => (
              <label key={name} className="text-sm">
                {name === 'title' ? 'عنوان الإشعار' : name === 'message' ? 'نص الإشعار' : name}
                <textarea
                  required
                  maxLength={10000}
                  rows={name === 'message' ? 3 : 1}
                  value={draft.variables[name] ?? ''}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      variables: { ...draft.variables, [name]: event.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border p-3"
                />
              </label>
            ))}
            {currentTemplate?.channels.includes('IN_APP') &&
              !requiredVariables.includes('actionUrl') && (
                <label className="text-sm">
                  رابط تفاصيل داخلي (اختياري)
                  <input
                    dir="ltr"
                    maxLength={1000}
                    placeholder="/student"
                    value={draft.variables.actionUrl ?? ''}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        variables: { ...draft.variables, actionUrl: event.target.value },
                      })
                    }
                    className="mt-1 w-full rounded-xl border p-3"
                  />
                </label>
              )}
            <label className="text-sm">
              الجدولة (وقت الجهاز، اختياري)
              <input
                type="datetime-local"
                value={draft.scheduledAt}
                onChange={(event) => setDraft({ ...draft, scheduledAt: event.target.value })}
                className="mt-1 w-full rounded-xl border p-3"
              />
            </label>
            <label className="text-sm">
              انتهاء الصلاحية (اختياري)
              <input
                type="datetime-local"
                value={draft.expiresAt}
                onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value })}
                className="mt-1 w-full rounded-xl border p-3"
              />
            </label>
          </fieldset>
          {draftLocked && (
            <p className="text-xs text-amber-800">
              المسودة مقفلة بعد محاولة الإرسال. أعد المحاولة بنفس البيانات؛ لإنشاء طلب مختلف اترك
              المسودة وافتح طلباً جديداً.
            </p>
          )}
          <button
            disabled={Boolean(busy) || loading || !currentTemplate}
            className="rounded-xl bg-[#142B5F] px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            {busy === 'create-intent'
              ? 'جارٍ الحفظ…'
              : draftLocked
                ? 'إعادة محاولة الحفظ نفسه'
                : 'حفظ في قائمة الإرسال'}
          </button>
        </form>
      )}
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="mb-3 font-bold text-[#142B5F]">القوالب المحمّلة ({templates.length})</h2>
        <p className="mb-3 text-xs text-slate-500">
          وجود القالب لا يثبت جاهزية مزوّد الإرسال الخارجي. تظهر حتى 500 قالب.
        </p>
        <div className="overflow-auto">
          <table className="w-full min-w-[600px] text-right text-xs">
            <thead>
              <tr>
                {['المعرّف', 'القنوات', 'المتغيرات المطلوبة', 'اللغات'].map((label) => (
                  <th key={label} className="p-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-5 text-center">
                    جارٍ التحميل…
                  </td>
                </tr>
              ) : !templates.length ? (
                <tr>
                  <td colSpan={4} className="p-5 text-center">
                    لا توجد قوالب محمّلة.
                  </td>
                </tr>
              ) : (
                templates.map((template) => (
                  <tr key={template.id} className="border-t">
                    <td className="p-3 font-bold">{template.id}</td>
                    <td className="p-3">{template.channels.join(', ')}</td>
                    <td className="p-3">{template.requiredVariables.join(', ') || '—'}</td>
                    <td className="p-3">{template.localizations.join(', ')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="mb-4 font-bold text-[#142B5F]">سجل التسليم</h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
            <input
              aria-label="بحث الإشعارات"
              className="w-full rounded-xl border p-3 pr-9 text-xs"
              placeholder="مرجع، قالب، مستلم، رمز خطأ"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            aria-label="حالة التسليم"
            className="rounded-xl border p-3 text-xs"
            value={stateFilter}
            onChange={(event) => {
              setStateFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">جميع الحالات</option>
            {Object.entries(deliveryStates).map(([state, label]) => (
              <option key={state} value={state}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="قالب الإشعار"
            className="rounded-xl border p-3 text-xs"
            value={templateFilter}
            onChange={(event) => {
              setTemplateFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">كل القوالب</option>
            {[
              ...new Set([
                ...templates.map((item) => item.id),
                ...intents.map((item) => item.templateId),
              ]),
            ].map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <select
            aria-label="عدد السجلات المحمّلة"
            disabled={Boolean(busy) || loading}
            className="rounded-xl border p-3 text-xs"
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
          >
            {[100, 200, 500].map((size) => (
              <option key={size} value={size}>
                أحدث {size} سجل
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[1100px] text-right text-xs">
            <thead>
              <tr>
                {[
                  'المرجع / القالب',
                  'المستلم',
                  'الحالة',
                  'المحاولات',
                  'الموعد التالي',
                  'وقت التسليم',
                  'رمز الخطأ',
                  'الإجراء',
                ].map((label) => (
                  <th key={label} className="p-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    جارٍ تحميل السجل…
                  </td>
                </tr>
              ) : !rows.length ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    لا توجد سجلات مطابقة ضمن القائمة المحمّلة.
                  </td>
                </tr>
              ) : (
                rows.map((intent) => (
                  <tr key={intent.id} className="border-t">
                    <td className="p-3">
                      <div className="font-bold text-[#142B5F]">{intent.reference}</div>
                      <div className="mt-1 text-slate-500">{intent.templateId}</div>
                    </td>
                    <td className="p-3 font-mono">{intent.recipientReference}</td>
                    <td className="p-3">
                      {deliveryStates[intent.deliveryState] ?? intent.deliveryState}
                    </td>
                    <td className="p-3">{intent.attempts}</td>
                    <td className="p-3">{dateLabel(intent.nextAttemptAt)}</td>
                    <td className="p-3">{dateLabel(intent.deliveredAt)}</td>
                    <td className="p-3 text-red-700">{intent.lastErrorCode ?? '—'}</td>
                    <td className="space-y-2 p-3">
                      {intent.state === 'CREATED' &&
                        ['FAILED', 'DEAD_LETTER'].includes(intent.deliveryState) && (
                          <button
                            disabled={Boolean(busy) || loading}
                            className="flex items-center gap-1 rounded-lg border px-3 py-2 font-bold text-teal-800 disabled:opacity-50"
                            onClick={() => retry(intent)}
                          >
                            <RotateCcw className="h-3 w-3" />
                            إعادة المحاولة
                          </button>
                        )}
                      {intent.state === 'CREATED' &&
                        ['PENDING', 'FAILED', 'DEAD_LETTER'].includes(intent.deliveryState) && (
                          <button
                            disabled={Boolean(busy) || loading}
                            className="rounded-lg border px-3 py-2 text-red-700 disabled:opacity-50"
                            onClick={() => cancel(intent)}
                          >
                            إلغاء الإشعار
                          </button>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs">
          <button
            disabled={loading || page <= 1}
            className="rounded-lg border px-3 py-2 disabled:opacity-40"
            onClick={() => setPage((value) => value - 1)}
          >
            السابق
          </button>
          <span>
            {filtered.length} نتيجة · الصفحة {page} من {pages}
          </span>
          <button
            disabled={loading || page >= pages}
            className="rounded-lg border px-3 py-2 disabled:opacity-40"
            onClick={() => setPage((value) => value + 1)}
          >
            التالي
          </button>
        </div>
      </section>
    </main>
  );
}
function Metric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-4 ${alert ? 'border-red-200' : 'border-slate-200'}`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-black ${alert ? 'text-red-700' : 'text-[#142B5F]'}`}>
        {value}
      </div>
    </div>
  );
}
