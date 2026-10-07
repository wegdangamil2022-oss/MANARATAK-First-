import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useState,
  useRef,
  useContext,
  createContext,
  useId,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Boxes,
  BrainCircuit,
  ChevronLeft,
  CircleDollarSign,
  Database,
  FileCode2,
  Gauge,
  Layers3,
  Loader2,
  PlayCircle,
  RefreshCw,
  Route,
  Save,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow,
} from 'lucide-react';
import { adminApiClient } from '../api/client';

type ResourceKey =
  | 'providers'
  | 'models'
  | 'modelPrices'
  | 'capabilities'
  | 'routingPolicies'
  | 'prompts'
  | 'guardrails'
  | 'consumers'
  | 'workflows'
  | 'evaluations'
  | 'knowledgeIndexes'
  | 'knowledgeSources'
  | 'incidents'
  | 'platformSettings';
type SectionKey = 'overview' | 'executions' | 'playground' | ResourceKey;
interface RegistryRecord {
  id?: string;
  key: string;
  status?: string;
  displayName?: string;
  displayNameAr?: string;
  displayNameEn?: string;
  operationalStatus?: string;
  [key: string]: unknown;
}
interface ExecutionRecord {
  publicId: string;
  status: string;
  purpose: string;
  providerKey?: string | null;
  modelKey?: string | null;
  safetyDecision: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
}
interface Overview {
  overallStatus: string;
  providers: Record<string, number>;
  activeModels: number;
  activePrompts: number;
  executionsToday: number;
  blockedToday: number;
  costMonthToDate: number;
  currency: string;
  costMonthToDateByCurrency?: Record<string, number>;
  openIncidents: number;
}
interface QueueStatus {
  queued: number;
  running: number;
  retrying: number;
  failed: number;
  deadLetter: number;
  oldestQueuedAt: string | null;
}
interface AsyncJob {
  publicId: string;
  consumerKey: string;
  capabilityKey: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  errorCode?: string | null;
}

const sections: Array<{ key: SectionKey; label: string; group: string; icon: ReactNode }> = [
  { key: 'overview', label: 'نظرة عامة', group: 'المراقبة', icon: <Gauge /> },
  { key: 'executions', label: 'التنفيذ والتتبّع', group: 'المراقبة', icon: <Activity /> },
  { key: 'providers', label: 'المزوّدون', group: 'السجلات', icon: <Boxes /> },
  { key: 'models', label: 'النماذج والأسعار', group: 'السجلات', icon: <Bot /> },
  { key: 'modelPrices', label: 'تاريخ الأسعار', group: 'السجلات', icon: <CircleDollarSign /> },
  { key: 'capabilities', label: 'القدرات', group: 'السجلات', icon: <Sparkles /> },
  { key: 'routingPolicies', label: 'التوجيه والبدائل', group: 'التشغيل', icon: <Route /> },
  { key: 'prompts', label: 'الموجّهات والإصدارات', group: 'التشغيل', icon: <FileCode2 /> },
  { key: 'playground', label: 'مختبر التجربة', group: 'التشغيل', icon: <PlayCircle /> },
  { key: 'guardrails', label: 'الأمان والحواجز', group: 'الحوكمة', icon: <ShieldCheck /> },
  { key: 'consumers', label: 'المستهلكون والميزانيات', group: 'الحوكمة', icon: <UsersRound /> },
  { key: 'workflows', label: 'سير العمل', group: 'الأتمتة', icon: <Workflow /> },
  { key: 'evaluations', label: 'التقييمات', group: 'الجودة', icon: <BarChart3 /> },
  { key: 'knowledgeIndexes', label: 'المعرفة والفهارس', group: 'المعرفة', icon: <Database /> },
  { key: 'knowledgeSources', label: 'مصادر المعرفة', group: 'المعرفة', icon: <Layers3 /> },
  { key: 'incidents', label: 'الحوادث', group: 'الحوكمة', icon: <AlertTriangle /> },
  { key: 'platformSettings', label: 'إعدادات المنصة', group: 'الحوكمة', icon: <Gauge /> },
];

export function AIGovernancePage() {
  const [guards, setGuards] = useState<Record<string, { dirty: boolean; busy: boolean }>>({});
  const report = useCallback((key: string, state: { dirty: boolean; busy: boolean } | null) => {
    setGuards((previous) => {
      const next = { ...previous };
      if (state) next[key] = state;
      else delete next[key];
      return next;
    });
  }, []);
  const dirty = Object.values(guards).some((state) => state.dirty);
  const busy = Object.values(guards).some((state) => state.busy);
  useEffect(() => {
    if (!dirty && !busy) return;
    const listener = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [dirty, busy]);
  const params = useParams<{ section?: string }>();
  const active = sections.some((item) => item.key === params.section)
    ? (params.section as SectionKey)
    : 'overview';
  const selected = sections.find((item) => item.key === active) ?? sections[0];
  return (
    <GovernanceGuard.Provider value={report}>
      <div
        onClickCapture={(event) => {
          const anchor = (event.target as HTMLElement).closest('a[href]');
          if (!anchor || (!busy && !dirty)) return;
          if (busy || !window.confirm('هناك تعديلات غير محفوظة؛ مغادرة الصفحة؟')) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        dir="rtl"
        className="mx-auto max-w-[1600px] space-y-6"
      >
        <section className="relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-[0_18px_45px_rgba(20,43,95,0.18)] sm:p-8">
          <div className="pointer-events-none absolute -left-16 -top-28 h-64 w-64 rounded-full border border-cyan-400/20" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-48 bg-gradient-to-r from-transparent via-[#21A7B4] to-[#0E7C86] sm:w-80" />
          <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-200 backdrop-blur-sm border border-white/15">
                <BrainCircuit className="h-4 w-4 text-[#21A7B4]" />
                <span>مركز الذكاء الاصطناعي والحوكمة · </span>
              </div>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">
                مركز منارتك للذكاء الاصطناعي
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-cyan-50/90">
                حوكمة مركزية للمزوّدين والنماذج والتوجيه والموجّهات والسلامة والتكلفة والتقييم، دون
                تخزين أي مفاتيح سرية.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs leading-6 backdrop-blur-md shadow-xs shrink-0">
              <div className="font-bold text-cyan-100">وضع التنفيذ الحالي</div>
              <div className="text-white/80">
                المزوّد غير المهيأ يظهر NOT_CONFIGURED — ولا يُعد فشلًا
              </div>
            </div>
          </div>
        </section>

        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
          <div className="grid min-h-[720px] lg:grid-cols-[275px_1fr]">
            <aside className="border-l border-slate-100 bg-slate-50/60 p-4">
              {[...new Set(sections.map((item) => item.group))].map((group) => (
                <div key={group} className="mb-5">
                  <div className="mb-2 px-3 text-[11px] font-bold text-[#142B5F]/70">{group}</div>
                  <nav className="space-y-1">
                    {sections
                      .filter((item) => item.group === group)
                      .map((item) => (
                        <Link
                          key={item.key}
                          to={`/ai/${item.key}`}
                          className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition ${
                            active === item.key
                              ? 'bg-[#142B5F] text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0E7C86]'
                          }`}
                        >
                          <span
                            className={`[&>svg]:h-4 [&>svg]:w-4 ${active === item.key ? 'text-[#21A7B4]' : 'text-slate-400'}`}
                          >
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      ))}
                  </nav>
                </div>
              ))}
            </aside>
            <main className="min-w-0 bg-white p-5 lg:p-8">
              <div className="mb-6 flex items-center gap-2 text-slate-500">
                <span className="text-xs font-bold">مركز الذكاء الاصطناعي</span>
                <ChevronLeft className="h-3.5 w-3.5 text-slate-400" />
                <h3 className="text-base font-black text-[#142B5F]">{selected.label}</h3>
              </div>
              {active === 'overview' ? (
                <OverviewPanel />
              ) : active === 'executions' ? (
                <ExecutionsPanel />
              ) : active === 'playground' ? (
                <PlaygroundPanel />
              ) : active === 'workflows' ? (
                <WorkflowsPanel />
              ) : active === 'evaluations' ? (
                <div className="space-y-6">
                  <RegistryPanel resource="evaluations" title="تعريفات التقييم" />
                  <GovernedRunPanel kind="evaluations" />
                </div>
              ) : active === 'knowledgeSources' ? (
                <div className="space-y-6">
                  <RegistryPanel resource="knowledgeSources" title="مصادر المعرفة" />
                  <KnowledgeIndexingPanel />
                </div>
              ) : active === 'incidents' ? (
                <div className="space-y-6">
                  <RegistryPanel resource="incidents" title="الحوادث" />
                  <IncidentEventPanel />
                </div>
              ) : active === 'prompts' ? (
                <PromptsPanel />
              ) : (
                <RegistryPanel
                  key={active}
                  resource={active as ResourceKey}
                  title={selected.label}
                />
              )}
            </main>
          </div>
        </div>
      </div>
    </GovernanceGuard.Provider>
  );
}

function useAIData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const generation = ++sequence.current;
    if (!path) {
      setData(null);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setData(null);
    try {
      const value = await adminApiClient.request<T>(path);
      if (generation === sequence.current) setData(value);
    } catch (cause) {
      if (generation === sequence.current) setError(errorMessage(cause));
    } finally {
      if (generation === sequence.current) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void load();
    return () => {
      sequence.current += 1;
    };
  }, [load]);
  return { data, error, loading, load };
}
const GovernanceGuard = createContext<
  (key: string, state: { dirty: boolean; busy: boolean } | null) => void
>(() => {});
function useGovernanceGuard(dirty: boolean, busy: boolean) {
  const report = useContext(GovernanceGuard);
  const id = useId();
  useEffect(() => {
    report(id, { dirty, busy });
    return () => report(id, null);
  }, [report, id, dirty, busy]);
}
function Pagination({
  page,
  total,
  size,
  onPage,
}: {
  page: number;
  total: number;
  size: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span>
        {total} سجل · صفحة {page} من {pages}
      </span>
      <div className="flex gap-2">
        <button className="action-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          السابق
        </button>
        <button
          className="action-secondary"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          التالي
        </button>
      </div>
    </div>
  );
}
function OverviewPanel() {
  const overview = useAIData<Overview>('/admin/ai/overview');
  const providers = useAIData<{
    data: Array<{ key: string; status: string; capabilities: string[] }>;
  }>('/admin/ai/provider-statuses');
  const data = overview.data;
  const costs = data?.costMonthToDateByCurrency;
  const cost =
    costs && Object.keys(costs).length
      ? Object.entries(costs)
          .map(
            ([currency, amount]) =>
              `${amount.toLocaleString('ar', { maximumFractionDigits: 6 })} ${currency}`,
          )
          .join(' · ')
      : data?.currency === 'MULTI'
        ? 'عملات متعددة'
        : data?.currency === 'N/A'
          ? 'لا يوجد استهلاك مسجل'
          : data
            ? `${data.costMonthToDate} ${data.currency}`
            : '—';
  return (
    <div className="space-y-6">
      <button
        className="action-secondary"
        disabled={overview.loading || providers.loading}
        onClick={() => {
          void overview.load();
          void providers.load();
        }}
      >
        <RefreshCw className="h-4 w-4" /> تحديث
      </button>
      {overview.error && <ErrorBanner message={overview.error} />}
      {overview.loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="flex justify-between rounded-2xl border p-4">
              <strong>الحالة التشغيلية العامة</strong>
              <StatusBadge value={data.overallStatus} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="تنفيذات اليوم" value={data.executionsToday} icon={<PlayCircle />} />
              <Metric label="النماذج النشطة" value={data.activeModels} icon={<Bot />} />
              <Metric label="المحجوب اليوم" value={data.blockedToday} icon={<ShieldCheck />} />
              <Metric label="تكلفة الشهر حسب العملة" value={cost} icon={<CircleDollarSign />} />
            </div>
          </>
        )
      )}
      <Panel
        title="جاهزية المزوّدين"
        subtitle="وجود مفتاح في البيئة يتيح المحاولة؛ READY تتطلب استجابة فعلية. التحديث لا يستدعي خدمة مدفوعة."
      >
        {providers.error && <ErrorBanner message={providers.error} />}
        {providers.loading ? (
          <Loading />
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {providers.data?.data.map((provider) => (
              <div key={provider.key} className="rounded-xl border p-4">
                <div className="flex justify-between">
                  <strong>{provider.key}</strong>
                  <StatusBadge value={provider.status} />
                </div>
                <p className="mt-3 text-xs text-slate-500">{provider.capabilities.join(' · ')}</p>
              </div>
            ))}
          </div>
        )}
        {providers.data?.data.length === 0 && <Empty text="لا توجد محولات مزوّدين مسجلة." />}
      </Panel>
    </div>
  );
}
function PlaygroundPanel() {
  const capabilities = useAIData<{ data: RegistryRecord[] }>(
    '/admin/ai/capabilities?status=ACTIVE',
  );
  const [capabilityKey, setCapabilityKey] = useState('');
  const [input, setInput] = useState('');
  const [classification, setClassification] = useState('INTERNAL');
  const [running, setRunning] = useState(false);
  const lock = useRef(false);
  const readiness = useAIData<{ ready: boolean; reason?: string; candidateCount: number }>(
    capabilityKey
      ? `/admin/ai/capabilities/${encodeURIComponent(capabilityKey)}/readiness?dataClassification=${classification}`
      : null,
  );
  const intent = useRef<{ fingerprint: string; key: string } | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  useGovernanceGuard(false, running);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current || !input.trim() || !capabilityKey) return;
    if (!window.confirm('هذا تشغيل فعلي وقد يستهلك رصيد المزوّد وفق الميزانية المحددة. متابعة؟'))
      return;
    const payload = { capabilityKey, input, locale: 'ar', dataClassification: classification };
    const fingerprint = JSON.stringify(payload);
    if (intent.current?.fingerprint !== fingerprint)
      intent.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true;
    setRunning(true);
    setError('');
    setResult(null);
    try {
      setResult(
        await adminApiClient.request('/admin/ai/playground/execute', {
          method: 'POST',
          idempotencyKey: intent.current.key,
          body: JSON.stringify({ ...payload, idempotencyKey: intent.current.key }),
        }),
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      lock.current = false;
      setRunning(false);
    }
  };
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel
        title="مختبر التنفيذ المحكوم"
        subtitle="التشغيل يدوي ويخضع لسياسة المستهلك admin-ai-playground. لا تُرسل بيانات سرية."
      >
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={running} className="space-y-4">
            <Field label="القدرة النشطة">
              <select
                required
                value={capabilityKey}
                onChange={(e) => {
                  setCapabilityKey(e.target.value);
                  intent.current = null;
                }}
                className="input"
              >
                <option value="">اختر القدرة</option>
                {capabilities.data?.data.map((record) => (
                  <option key={record.key} value={record.key}>
                    {displayName(record)}
                  </option>
                ))}
              </select>
            </Field>
            {capabilities.error && <ErrorBanner message={capabilities.error} />}
            {readiness.error && <ErrorBanner message={readiness.error} />}
            {readiness.data && (
              <p className="text-xs">
                {readiness.data.ready
                  ? 'السياسة تسمح بالمحاولة؛ نجاح المزوّد يتأكد عند التنفيذ.'
                  : `القدرة غير جاهزة: ${readiness.data.reason}`}
              </p>
            )}
            <Field label="تصنيف البيانات">
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="input"
              >
                {['PUBLIC', 'INTERNAL', 'CONFIDENTIAL'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label="المدخل">
              <textarea
                required
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={10}
                maxLength={20000}
                className="input"
              />
            </Field>
          </fieldset>
          {error && <ErrorBanner message={error} />}
          <button
            disabled={
              running ||
              capabilities.loading ||
              readiness.loading ||
              readiness.data?.ready !== true ||
              !capabilityKey ||
              !input.trim()
            }
            className="action-primary w-full justify-center"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}{' '}
            تشغيل فعلي
          </button>
          <p className="text-xs text-slate-500">
            إعادة الطلب نفسه تستخدم مفتاحه السابق لتفادي تكرار الاستهلاك. النتائج المسجلة تظهر في
            سجل التنفيذ.
          </p>
        </form>
      </Panel>
      <Panel title="النتيجة والتتبّع" subtitle="غياب الإعداد لا يعني وجود نتيجة تجريبية.">
        {result ? <JsonView value={result} /> : <Empty text="لم يُنفّذ طلب من هذه الصفحة." />}
      </Panel>
    </div>
  );
}
function ExecutionsPanel() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
      setSelected('');
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams({
    page: String(page),
    pageSize: '25',
    ...(status ? { status } : {}),
    ...(query ? { search: query } : {}),
  });
  const list = useAIData<{ data: ExecutionRecord[]; total: number }>(
    `/admin/ai/executions?${params}`,
  );
  useEffect(() => {
    if (list.data && page > Math.max(1, Math.ceil(list.data.total / 25)))
      setPage(Math.max(1, Math.ceil(list.data.total / 25)));
  }, [list.data, page]);
  return (
    <div className="space-y-5">
      <Panel
        title="التنفيذ والتتبّع"
        subtitle="البحث بالمعرف أو Trace ID أو المستهلك أو القدرة أو النموذج."
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            aria-label="بحث التنفيذ"
            placeholder="بحث"
            className="input flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="حالة التنفيذ"
            className="input max-w-52"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
              setSelected('');
            }}
          >
            <option value="">كل الحالات</option>
            {[
              'RECEIVED',
              'QUEUED',
              'ACCEPTED',
              'RUNNING',
              'RETRYING',
              'BLOCKED',
              'REVIEW_REQUIRED',
              'COMPLETED',
              'FAILED',
              'CANCELLED',
              'TIMED_OUT',
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <button
            disabled={list.loading}
            onClick={() => void list.load()}
            className="action-secondary"
          >
            تحديث
          </button>
        </div>
        {list.error && <ErrorBanner message={list.error} />}
        {list.loading ? (
          <Loading />
        ) : (
          list.data && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="border-b text-xs text-slate-500">
                      {[
                        'المعرّف والتفاصيل',
                        'الحالة',
                        'الغرض',
                        'المزوّد / النموذج',
                        'الأمان',
                        'الاستهلاك',
                        'الوقت',
                      ].map((label) => (
                        <th key={label} className="p-3">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.data.map((item) => (
                      <tr key={item.publicId} className="border-b">
                        <td className="p-3">
                          <button
                            onClick={() => setSelected(item.publicId)}
                            className="font-mono text-xs text-[#0E7C86] underline"
                          >
                            {item.publicId}
                          </button>
                        </td>
                        <td>
                          <StatusBadge value={item.status} />
                        </td>
                        <td>{item.purpose}</td>
                        <td>
                          {item.providerKey ?? '—'}
                          <div className="text-xs">{item.modelKey ?? '—'}</div>
                        </td>
                        <td>{item.safetyDecision}</td>
                        <td>{item.inputTokens + item.outputTokens} token</td>
                        <td className="text-xs">{new Date(item.createdAt).toLocaleString('ar')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!list.data.data.length && <Empty text="لا توجد نتائج لهذه الفلاتر." />}
              <Pagination page={page} total={list.data.total} size={25} onPage={setPage} />
            </>
          )
        )}
      </Panel>
      {selected && (
        <ExecutionDetails key={selected} publicId={selected} onClose={() => setSelected('')} />
      )}
    </div>
  );
}
function ExecutionDetails({ publicId, onClose }: { publicId: string; onClose: () => void }) {
  const record = useAIData<Record<string, unknown>>(
    `/admin/ai/executions/${encodeURIComponent(publicId)}`,
  );
  const trace = useAIData<{ data: Record<string, unknown>[] }>(
    `/admin/ai/executions/${encodeURIComponent(publicId)}/trace`,
  );
  return (
    <Panel
      title="تفاصيل التنفيذ ومراحله"
      subtitle="المعاينات مختصرة ومقيدة بتصنيف البيانات، وليست نسخة كاملة من الإجابة."
    >
      <button onClick={onClose} className="action-secondary mb-3">
        إغلاق
      </button>
      {record.error && <ErrorBanner message={record.error} />}
      {record.loading ? <Loading /> : record.data && <JsonView value={record.data} />}
      {trace.error && <ErrorBanner message={trace.error} />}
      {trace.data && <JsonView value={trace.data.data} />}
    </Panel>
  );
}
function WorkflowsPanel() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const queue = useAIData<QueueStatus>('/admin/ai/async-queue/status');
  const jobs = useAIData<{ data: AsyncJob[]; total: number }>(
    `/admin/ai/async-queue/jobs?page=${page}&pageSize=25${status ? `&status=${status}` : ''}`,
  );
  useGovernanceGuard(false, busy);
  const operate = async (job: AsyncJob, action: 'RETRY' | 'CANCEL') => {
    if (
      lock.current ||
      !window.confirm(
        action === 'RETRY'
          ? 'إعادة المهمة قد تستدعي المزوّد وتستهلك رصيداً. متابعة؟'
          : 'إلغاء المهمة المنتظرة؟',
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await adminApiClient.request(`/admin/ai/async-queue/jobs/${job.publicId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ confirmed: true }),
      });
      await Promise.all([queue.load(), jobs.load()]);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <Panel title="طابور التنفيذ غير المتزامن" subtitle="الحمولة مشفرة ولا تُعرض في لوحة الإدارة.">
        <div className="mb-4 flex gap-3">
          <select
            aria-label="حالة المهمة"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            disabled={busy}
            className="input"
          >
            <option value="">كل الحالات</option>
            {[
              'QUEUED',
              'RUNNING',
              'RETRYING',
              'COMPLETED',
              'FAILED',
              'DEAD_LETTER',
              'CANCELLED',
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <button
            disabled={busy || jobs.loading || queue.loading}
            className="action-secondary"
            onClick={() => {
              void queue.load();
              void jobs.load();
            }}
          >
            تحديث
          </button>
        </div>
        {error && <ErrorBanner message={error} />}
        {queue.error && <ErrorBanner message={queue.error} />}
        {queue.data && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ['بانتظار التنفيذ', queue.data.queued],
              ['قيد التنفيذ', queue.data.running],
              ['إعادة المحاولة', queue.data.retrying],
              ['فشل', queue.data.failed],
              ['Dead letter', queue.data.deadLetter],
            ].map(([label, value]) => (
              <Metric key={label} label={String(label)} value={value} icon={<Workflow />} />
            ))}
          </div>
        )}
        {jobs.error && <ErrorBanner message={jobs.error} />}
        {jobs.loading ? (
          <Loading />
        ) : (
          jobs.data && (
            <>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right text-xs">
                      {[
                        'المهمة',
                        'المستهلك / القدرة',
                        'الحالة',
                        'المحاولات / الخطأ',
                        'الإجراء',
                      ].map((label) => (
                        <th className="p-2" key={label}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.data.data.map((job) => (
                      <tr key={job.publicId} className="border-b">
                        <td className="p-2 font-mono text-xs">{job.publicId}</td>
                        <td>
                          {job.consumerKey}
                          <div className="text-xs">{job.capabilityKey}</div>
                        </td>
                        <td>
                          <StatusBadge value={job.status} />
                        </td>
                        <td>
                          {job.attempts}/{job.maxAttempts}
                          <div className="text-xs">{job.errorCode}</div>
                        </td>
                        <td>
                          {['FAILED', 'DEAD_LETTER'].includes(job.status) ? (
                            <button
                              disabled={busy}
                              onClick={() => void operate(job, 'RETRY')}
                              className="action-secondary"
                            >
                              إعادة
                            </button>
                          ) : ['QUEUED', 'RETRYING'].includes(job.status) ? (
                            <button
                              disabled={busy}
                              onClick={() => void operate(job, 'CANCEL')}
                              className="action-secondary"
                            >
                              إلغاء
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!jobs.data.data.length && <Empty text="لا توجد مهام لهذه الحالة." />}
              <Pagination page={page} total={jobs.data.total} size={25} onPage={setPage} />
            </>
          )
        )}
      </Panel>
      <RegistryPanel resource="workflows" title="تعريفات سير العمل" />
      <GovernedRunPanel kind="workflows" />
    </div>
  );
}
function PromptsPanel() {
  const [promptKey, setPromptKey] = useState('');
  const [version, setVersion] = useState(1);
  const [template, setTemplate] = useState('');
  const [snapshot, setSnapshot] = useState('');
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useGovernanceGuard(template !== snapshot, busy);
  const action = async (operation: 'load' | 'create' | 'approve' | 'deploy' | 'rollback') => {
    if (
      lock.current ||
      !/^[a-zA-Z0-9_.:-]{1,160}$/.test(promptKey) ||
      !Number.isSafeInteger(version) ||
      version < 1
    ) {
      setError('أدخل مفتاحاً صالحاً ورقم إصدار صحيحاً.');
      return;
    }
    if (
      ['approve', 'deploy', 'rollback'].includes(operation) &&
      !window.confirm(
        `تأكيد ${operation === 'approve' ? 'اعتماد' : operation === 'rollback' ? 'استعادة' : 'نشر'} الإصدار ${version}؟`,
      )
    )
      return;
    if (
      operation !== 'create' &&
      template !== snapshot &&
      !window.confirm('هناك قالب غير محفوظ؛ تجاهل تعديلاته ومتابعة قراءة الإصدار المحفوظ؟')
    )
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    const path = `/admin/ai/prompts/${encodeURIComponent(promptKey)}`;
    let written = false;
    try {
      if (operation === 'create') {
        await adminApiClient.request(`${path}/versions`, {
          method: 'POST',
          body: JSON.stringify({ version, template, status: 'REVIEW' }),
        });
        written = true;
      } else if (operation === 'approve') {
        await adminApiClient.request(`${path}/versions/${version}/approve`, {
          method: 'POST',
          body: '{}',
        });
        written = true;
      } else if (operation === 'deploy' || operation === 'rollback') {
        await adminApiClient.request(
          `${path}/${operation === 'deploy' ? 'deployments' : 'rollback'}`,
          { method: 'POST', body: JSON.stringify({ version }) },
        );
        written = true;
      }
      const saved = await adminApiClient.request<Record<string, unknown>>(
        `${path}/versions/${version}`,
      );
      setRecord(saved);
      setTemplate(String(saved.template ?? ''));
      setSnapshot(String(saved.template ?? ''));
      if (operation === 'deploy' || operation === 'rollback') {
        const current = await adminApiClient.request<RegistryRecord>(path);
        if (current.activeVersion !== version || current.status !== 'ACTIVE')
          throw new Error('القراءة اللاحقة لا تؤكد نشر الإصدار المطلوب.');
      }
      setMessage(
        operation === 'load'
          ? 'تم تحميل الإصدار المحفوظ.'
          : 'نجحت العملية وأُعيدت قراءة الإصدار من الخادم.',
      );
    } catch (cause) {
      setError(
        `${written ? 'نجحت استجابة الكتابة، لكن تعذر تأكيد القراءة اللاحقة. حمّل الإصدار قبل إعادة العملية. ' : ''}${errorMessage(cause)}`,
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const changeIdentity = (change: () => void) => {
    if (busy || (template !== snapshot && !window.confirm('تجاهل تعديل القالب غير المحفوظ؟')))
      return;
    change();
    setTemplate('');
    setSnapshot('');
    setRecord(null);
    setError('');
    setMessage('');
  };
  return (
    <div className="space-y-6">
      <RegistryPanel resource="prompts" title="سجل الموجّهات" />
      <Panel
        title="دورة حياة إصدار الموجّه"
        subtitle="حمّل الإصدار لمراجعته قبل الاعتماد. النشر والاستعادة يخضعان لبوابات التقييم."
      >
        <fieldset disabled={busy} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_140px]">
            <Field label="مفتاح الموجّه">
              <input
                value={promptKey}
                onChange={(e) => changeIdentity(() => setPromptKey(e.target.value))}
                className="input"
                dir="ltr"
              />
            </Field>
            <Field label="رقم الإصدار">
              <input
                type="number"
                min="1"
                value={version}
                onChange={(e) => changeIdentity(() => setVersion(Number(e.target.value)))}
                className="input"
              />
            </Field>
          </div>
          <Field label="قالب النظام (مدخل الطالب يُرسل منفصلاً)">
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={8}
              className="input font-mono text-xs"
              dir="ltr"
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={!promptKey}
              onClick={() => void action('load')}
              className="action-secondary"
            >
              تحميل الإصدار
            </button>
            <button
              disabled={!promptKey || !template.trim() || record !== null}
              onClick={() => void action('create')}
              className="action-secondary"
            >
              إنشاء إصدار REVIEW
            </button>
            <button
              disabled={
                !record ||
                !['DRAFT', 'REVIEW'].includes(String(record.status)) ||
                template !== snapshot
              }
              onClick={() => void action('approve')}
              className="action-secondary"
            >
              اعتماد الإصدار المحفوظ
            </button>
            <button
              disabled={record?.status !== 'APPROVED' || template !== snapshot}
              onClick={() => void action('deploy')}
              className="action-primary"
            >
              نشر الإصدار
            </button>
            <button
              disabled={record?.status !== 'APPROVED' || template !== snapshot}
              onClick={() => void action('rollback')}
              className="action-secondary"
            >
              استعادة هذا الإصدار
            </button>
          </div>
        </fieldset>
        {error && <ErrorBanner message={error} />}
        {message && <p className="mt-4 text-sm text-[#0E7C86]">{message}</p>}
        {record && (
          <div className="mt-4">
            <StatusBadge value={String(record.status)} />
            <p className="mt-2 break-all font-mono text-xs">{String(record.checksum ?? '')}</p>
          </div>
        )}
      </Panel>
    </div>
  );
}
function KnowledgeIndexingPanel() {
  const indexes = useAIData<{ data: RegistryRecord[] }>('/admin/ai/knowledgeIndexes?status=ACTIVE');
  const [key, setKey] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [reference, setReference] = useState('');
  const [sourceVersion, setSourceVersion] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const lock = useRef(false);
  const intent = useRef<{ body: string; key: string } | null>(null);
  useGovernanceGuard(!!content, busy);
  const index = indexes.data?.data.find((item) => item.key === key);
  const domains = Array.isArray(index?.sourceDomains)
    ? index.sourceDomains.filter((item): item is string => typeof item === 'string')
    : [];
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      lock.current ||
      !window.confirm(
        'فهرسة فعلية قد تستهلك رصيد المزوّد. المحتوى المدخل يدوياً لا يُعتمد كمصدر رسمي تلقائياً. متابعة؟',
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const body = JSON.stringify({
        sourceType,
        sourceReferenceId: reference.trim(),
        ...(sourceVersion.trim() ? { sourceVersion: sourceVersion.trim() } : {}),
        locale: 'ar',
        content,
      });
      if (intent.current?.body !== body) intent.current = { body, key: crypto.randomUUID() };
      const value = await adminApiClient.request<Record<string, unknown>>(
        `/admin/ai/knowledge-indexes/${encodeURIComponent(key)}/index`,
        { method: 'POST', idempotencyKey: intent.current.key, body },
      );
      setResult(value);
      if (value.status === 'COMPLETED') setContent('');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Panel
      title="فهرسة مصدر معرفة"
      subtitle="تتطلب قدرة knowledge.indexing من نوع EMBEDDINGS ومستهلك knowledge-indexing نشطاً بميزانية، ومزوّداً ونموذجاً معتمدين."
    >
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          <Field label="الفهرس النشط">
            <select
              required
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setSourceType('');
                setResult(null);
              }}
              className="input"
            >
              <option value="">اختر الفهرس</option>
              {indexes.data?.data.map((item) => (
                <option key={item.key} value={item.key}>
                  {displayName(item)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="نطاق المصدر المسموح">
            <select
              required
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="input"
            >
              <option value="">اختر النطاق</option>
              {domains.map((domain) => (
                <option key={domain}>{domain}</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="معرف المصدر">
              <input
                required
                maxLength={500}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="input"
                dir="ltr"
              />
            </Field>
            <Field label="إصدار المصدر الحقيقي (اختياري)">
              <input
                maxLength={200}
                value={sourceVersion}
                onChange={(e) => setSourceVersion(e.target.value)}
                className="input"
                dir="ltr"
              />
            </Field>
          </div>
          <Field label="المحتوى المراد فهرسته">
            <textarea
              required
              maxLength={2000000}
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input"
            />
          </Field>
        </fieldset>
        {indexes.error && <ErrorBanner message={indexes.error} />}
        {error && <ErrorBanner message={error} />}
        <button
          disabled={busy || !key || !sourceType || !reference.trim() || !content.trim()}
          className="action-primary"
        >
          فهرسة عبر السياسة والميزانية
        </button>
        {result && <JsonView value={result} />}
      </form>
    </Panel>
  );
}
function IncidentEventPanel() {
  const incidents = useAIData<{ data: RegistryRecord[] }>('/admin/ai/incidents');
  const [key, setKey] = useState('');
  const [action, setAction] = useState('NOTE_ADDED');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const lock = useRef(false);
  useGovernanceGuard(!!note, busy);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await adminApiClient.request(`/admin/ai/incidents/${encodeURIComponent(key)}/events`, {
        method: 'POST',
        body: JSON.stringify({ action, note }),
      });
      setNote('');
      setResult(await adminApiClient.request(`/admin/ai/incidents/${encodeURIComponent(key)}`));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Panel
      title="سجل متابعة الحادثة"
      subtitle="تضاف الملاحظات كأحداث محفوظة مع التدقيق؛ لا يُعاد كتابة التاريخ من محرر الإعدادات."
    >
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          <Field label="الحادثة">
            <select
              required
              className="input"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setResult(null);
              }}
            >
              <option value="">اختر الحادثة</option>
              {incidents.data?.data.map((item) => (
                <option key={item.key} value={item.key}>
                  {displayName(item)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="نوع المتابعة">
            <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
              {[
                'NOTE_ADDED',
                'INVESTIGATION_UPDATE',
                'MITIGATION_RECORDED',
                'RESOLUTION_RECORDED',
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="الملاحظة">
            <textarea
              required
              maxLength={4000}
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input"
            />
          </Field>
        </fieldset>
        {incidents.error && <ErrorBanner message={incidents.error} />}
        {error && <ErrorBanner message={error} />}
        <button disabled={busy || !key || !note.trim()} className="action-primary">
          حفظ المتابعة
        </button>
        {result && <JsonView value={result} />}
      </form>
    </Panel>
  );
}

function GovernedRunPanel({ kind }: { kind: 'workflows' | 'evaluations' }) {
  const definitions = useAIData<{ data: RegistryRecord[] }>(`/admin/ai/${kind}?status=ACTIVE`);
  const [key, setKey] = useState('');
  const [publicId, setPublicId] = useState('');
  const [argumentsJson, setArgumentsJson] = useState('{}');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingRead, setPendingRead] = useState(false);
  const lock = useRef(false);
  const intent = useRef<{ signature: string; key: string } | null>(null);
  const runPath = kind === 'workflows' ? 'workflow-runs' : 'evaluation-runs';
  useGovernanceGuard(false, busy);
  const act = async (operation: 'start' | 'load' | 'execute' | 'approve') => {
    if (lock.current) return;
    if (
      operation === 'execute' &&
      !window.confirm(
        'تشغيل فعلي قد يُرسل عدة طلبات مدفوعة للمزوّد وفق السياسات والميزانيات. متابعة؟',
      )
    )
      return;
    if (operation === 'approve' && !window.confirm('اعتماد نتائج التقييم المحفوظة بعد مراجعتها؟'))
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    let written = false;
    try {
      let id = publicId.trim();
      if (operation !== 'load') {
        const args: unknown = JSON.parse(argumentsJson);
        if (!args || typeof args !== 'object' || Array.isArray(args))
          throw new Error('المعاملات يجب أن تكون كائن JSON.');
        if (operation === 'start' && !key) throw new Error('اختر تعريفاً نشطاً.');
        if (operation !== 'start' && !/^[a-zA-Z0-9_.:-]{1,160}$/.test(id))
          throw new Error('أدخل معرف تشغيل صالحاً.');
        const path =
          operation === 'start'
            ? `/admin/ai/${kind}/${encodeURIComponent(key)}/runs`
            : `/admin/ai/${runPath}/${encodeURIComponent(id)}/${operation}`;
        const body = JSON.stringify(
          operation === 'start' || (kind === 'workflows' && operation === 'execute') ? args : {},
        );
        const signature = `${path}:${body}`;
        if (intent.current?.signature !== signature)
          intent.current = { signature, key: crypto.randomUUID() };
        const saved = await adminApiClient.request<Record<string, unknown>>(path, {
          method: 'POST',
          idempotencyKey: intent.current.key,
          body,
        });
        written = true;
        id = String(saved.publicId ?? id);
        setPublicId(id);
        setPendingRead(true);
      }
      if (!/^[a-zA-Z0-9_.:-]{1,160}$/.test(id)) throw new Error('أدخل معرف تشغيل صالحاً.');
      const saved = await adminApiClient.request<Record<string, unknown>>(
        `/admin/ai/${runPath}/${encodeURIComponent(id)}`,
      );
      setResult(saved);
      setPendingRead(false);
    } catch (cause) {
      setError(
        `${written ? 'وصلت استجابة العملية؛ تعذرت القراءة اللاحقة. حمّل الحالة قبل إعادة التنفيذ. ' : ''}${errorMessage(cause)}`,
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Panel
      title={kind === 'workflows' ? 'تشغيل سير العمل' : 'تشغيل التقييم ومراجعة النتائج'}
      subtitle="إنشاء سجل التشغيل لا ينفّذه. التنفيذ خطوة يدوية مستقلة ومقيدة بالميزانيات."
    >
      <fieldset disabled={busy} className="space-y-4">
        <Field label="التعريف النشط">
          <select
            className="input"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setPublicId('');
              setResult(null);
              setPendingRead(false);
              intent.current = null;
            }}
          >
            <option value="">اختر التعريف</option>
            {definitions.data?.data.map((record) => (
              <option key={record.key} value={record.key}>
                {displayName(record)}
              </option>
            ))}
          </select>
        </Field>
        {definitions.error && <ErrorBanner message={definitions.error} />}
        <Field
          label={
            kind === 'workflows'
              ? 'مدخل سير العمل (JSON؛ أعد استخدامه نفسه عند الاستئناف)'
              : 'خيارات التقييم (JSON؛ مثل promptVersion للإصدار المستهدف)'
          }
        >
          <textarea
            className="input font-mono text-xs"
            dir="ltr"
            rows={5}
            value={argumentsJson}
            onChange={(e) => setArgumentsJson(e.target.value)}
          />
        </Field>
        <Field label="معرف سجل التشغيل">
          <input
            className="input"
            dir="ltr"
            value={publicId}
            onChange={(e) => {
              setPublicId(e.target.value);
              setResult(null);
              setPendingRead(true);
            }}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={!key || pendingRead}
            className="action-secondary"
            onClick={() => void act('start')}
          >
            إنشاء سجل تشغيل
          </button>
          <button
            disabled={!publicId.trim()}
            className="action-secondary"
            onClick={() => void act('load')}
          >
            تحميل الحالة
          </button>
          <button
            disabled={
              pendingRead ||
              !result ||
              !['QUEUED', ...(kind === 'workflows' ? ['FAILED'] : [])].includes(
                String(result.status),
              )
            }
            className="action-primary"
            onClick={() => void act('execute')}
          >
            تنفيذ فعلي
          </button>
          {kind === 'evaluations' && (
            <button
              disabled={pendingRead || result?.status !== 'COMPLETED' || !!result.approvedBy}
              className="action-secondary"
              onClick={() => void act('approve')}
            >
              اعتماد النتائج
            </button>
          )}
        </div>
      </fieldset>
      {error && <ErrorBanner message={error} />}
      {result && <JsonView value={result} />}
    </Panel>
  );
}

function registryDefaults(resource: ResourceKey): RegistryRecord {
  const shared = { key: '', status: 'DRAFT' };
  switch (resource) {
    case 'providers':
      return {
        ...shared,
        displayName: '',
        type: 'OPENAI_COMPATIBLE',
        secretReference: '',
        timeoutMs: 30000,
        maxRetries: 1,
        productionApproved: false,
        maxDataClassification: 'INTERNAL',
      };
    case 'models':
      return {
        ...shared,
        displayName: '',
        providerKey: '',
        providerModelId: '',
        capabilities: ['TEXT_GENERATION'],
        supportsStreaming: false,
        supportsTools: false,
        supportsStructuredOutput: false,
        productionApproved: false,
        maxDataClassification: 'INTERNAL',
        maxOutputTokens: 1024,
      };
    case 'modelPrices':
      return {
        ...shared,
        modelKey: '',
        currency: 'USD',
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        effectiveFrom: new Date().toISOString(),
      };
    case 'capabilities':
      return {
        ...shared,
        displayNameAr: '',
        displayNameEn: '',
        kind: 'TEXT_GENERATION',
        riskLevel: 'LOW',
        requiresHumanReview: false,
        allowedPurposes: [],
        allowedDataClassifications: ['PUBLIC', 'INTERNAL'],
      };
    case 'routingPolicies':
      return { ...shared, capabilityKey: '', fallbackEnabled: false, maxAttempts: 1, targets: [] };
    case 'prompts':
      return {
        ...shared,
        capabilityKey: '',
        purpose: 'TOOL_ASSISTANCE',
        descriptionAr: '',
        descriptionEn: '',
        activeVersion: null,
      };
    case 'guardrails':
      return { ...shared, stage: 'BOTH', action: 'BLOCK', rules: { patterns: [] }, version: 1 };
    case 'consumers':
      return {
        ...shared,
        displayName: '',
        consumerKey: '',
        allowedCapabilities: [],
        allowedModels: null,
        requestsPerMinute: 5,
        dailyRequestLimit: 20,
        monthlyTokenLimit: 100000,
        monthlyCostLimit: 0,
        currency: 'USD',
        requireHumanReview: false,
        allowAsyncJobs: false,
        allowedDataClassifications: ['PUBLIC', 'INTERNAL'],
      };
    case 'workflows':
      return {
        ...shared,
        displayNameAr: '',
        displayNameEn: '',
        activeVersion: null,
        definition: { steps: [] },
      };
    case 'evaluations':
      return {
        ...shared,
        displayName: '',
        capabilityKey: '',
        target: { type: 'PROMPT', key: '' },
        dataset: [],
        evaluators: [],
        deploymentGate: { minimumScore: 1, maximumSafetyFailures: 0, requiresHumanApproval: true },
      };
    case 'knowledgeIndexes':
      return {
        ...shared,
        displayName: '',
        embeddingModelKey: '',
        dimensions: 1536,
        sourceDomains: [],
        chunkingStrategy: { maxCharacters: 1600, overlapCharacters: 160 },
      };
    case 'incidents':
      return {
        ...shared,
        status: 'OPEN',
        publicId: '',
        title: '',
        description: '',
        severity: 'LOW',
        timeline: [],
      };
    case 'platformSettings':
      return { ...shared, key: 'runtime', globalEnabled: false };
    default:
      return shared;
  }
}
function RegistryPanel({ resource, title }: { resource: ResourceKey; title: string }) {
  const list = useAIData<{ data: RegistryRecord[] }>(`/admin/ai/${resource}`);
  const [editing, setEditing] = useState<RegistryRecord | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const guard = useRef({ dirty: false, busy: false });
  const setGuard = useCallback((state: { dirty: boolean; busy: boolean }) => {
    guard.current = state;
  }, []);
  const choose = (record: RegistryRecord | null) => {
    if (
      guard.current.busy ||
      (guard.current.dirty && !window.confirm('تجاهل التعديلات غير المحفوظة؟'))
    )
      return;
    setEditing(record);
    setMessage('');
  };
  const refresh = () => {
    if (
      guard.current.busy ||
      (guard.current.dirty && !window.confirm('التحديث سيغلق المحرر ويفقد التعديلات. متابعة؟'))
    )
      return;
    setEditing(null);
    void list.load();
  };
  const records = (list.data?.data ?? []).filter(
    (record) =>
      (!status || record.status === status) &&
      JSON.stringify([
        record.key,
        record.displayNameAr,
        record.displayNameEn,
        record.displayName,
        record.title,
      ])
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const statuses =
    resource === 'incidents'
      ? ['OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED']
      : resource === 'knowledgeSources'
        ? ['PENDING', 'INDEXED', 'FAILED', 'REMOVED']
        : ['DRAFT', 'REVIEW', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];
  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(1, Math.ceil(records.length / 20))));
  }, [records.length]);
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <Panel
        title={title}
        subtitle={
          resource === 'providers'
            ? 'مراجع البيئة فقط. العنوان ومرجع المفتاح يجب أن يطابقا محول التشغيل المسجل.'
            : resource === 'knowledgeSources'
              ? 'مصادر القراءة والفهرسة؛ حالة INDEXED تُحدّث عبر مسار الفهرسة فقط.'
              : 'السجلات محفوظة في الخادم. ACTIVE لا تثبت وحدها جاهزية التنفيذ.'
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            className="input flex-1"
            aria-label="بحث السجلات"
            placeholder="اسم أو مفتاح"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="حالة السجل"
            className="input max-w-40"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كل الحالات</option>
            {statuses.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <button onClick={refresh} disabled={list.loading} className="action-secondary">
            تحديث
          </button>
          {resource !== 'knowledgeSources' && (
            <button onClick={() => choose(registryDefaults(resource))} className="action-primary">
              سجل جديد
            </button>
          )}
        </div>
        {message && <p className="mb-3 text-sm text-[#0E7C86]">{message}</p>}
        {list.error && <ErrorBanner message={list.error} />}
        {list.loading ? (
          <Loading />
        ) : (
          <>
            <div className="grid gap-3">
              {records.slice((page - 1) * 20, page * 20).map((record) => (
                <button
                  key={record.key}
                  onClick={() => choose(record)}
                  className="flex items-center justify-between rounded-xl border bg-white p-4 text-right hover:border-[#21A7B4]"
                >
                  <div>
                    <strong>{displayName(record)}</strong>
                    <div className="mt-1 font-mono text-xs text-slate-500">{record.key}</div>
                  </div>
                  <div className="space-x-1">
                    <StatusBadge value={record.status ?? 'DRAFT'} />
                    {record.operationalStatus && <StatusBadge value={record.operationalStatus} />}
                  </div>
                </button>
              ))}
            </div>
            {records.length === 0 && <Empty text="لا توجد سجلات مطابقة." />}
            <Pagination page={page} total={records.length} size={20} onPage={setPage} />
          </>
        )}
      </Panel>
      <RegistryEditor
        key={editing?.id ?? editing?.key ?? 'empty'}
        resource={resource}
        value={editing}
        onState={setGuard}
        onSaved={() => {
          guard.current = { dirty: false, busy: false };
          setEditing(null);
          setMessage('تم الحفظ وإعادة قراءة السجل من الخادم.');
          void list.load();
        }}
      />
    </div>
  );
}
function RegistryEditor({
  resource,
  value,
  onSaved,
  onState,
}: {
  resource: ResourceKey;
  value: RegistryRecord | null;
  onSaved: () => void;
  onState: (state: { dirty: boolean; busy: boolean }) => void;
}) {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [json, setJson] = useState('{}');
  const [snapshot, setSnapshot] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const intent = useRef<{ body: string; key: string } | null>(null);
  useEffect(() => {
    const rest: Record<string, unknown> = value ? { ...value } : {};
    ['id', 'key', 'status', 'operationalStatus', 'updatedAt'].forEach(
      (field) => delete rest[field],
    );
    if (resource !== 'providers') delete rest.secretReference;
    const content = JSON.stringify(rest, null, 2);
    const identity = value?.key ?? '';
    const state = value?.status ?? 'DRAFT';
    setKey(identity);
    setStatus(state);
    setJson(content);
    setSnapshot(JSON.stringify([identity, state, content]));
    setError('');
    setUncertain(false);
    intent.current = null;
  }, [value, resource]);
  const dirty = !!value && JSON.stringify([key, status, json]) !== snapshot;
  useGovernanceGuard(dirty, saving);
  useEffect(() => {
    onState({ dirty, busy: saving });
    return () => onState({ dirty: false, busy: false });
  }, [dirty, saving, onState]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current || uncertain) return;
    setError('');
    if (!/^[a-zA-Z0-9_.:-]{1,160}$/.test(key)) {
      setError('المفتاح يجب أن يحتوي حروفاً إنجليزية أو أرقاماً أو . _ : -');
      return;
    }
    lock.current = true;
    setSaving(true);
    let written = false;
    try {
      const settings: unknown = JSON.parse(json);
      if (!settings || typeof settings !== 'object' || Array.isArray(settings))
        throw new Error('الإعدادات يجب أن تكون كائن JSON.');
      const payload: Record<string, unknown> = {
        ...(settings as Record<string, unknown>),
        key,
        status,
        ...(value?.updatedAt ? { expectedUpdatedAt: value.updatedAt } : {}),
      };
      if (resource === 'consumers' && !value?.id) payload.consumerKey = key;
      if (resource === 'incidents' && !value?.id) payload.publicId = key;
      const body = JSON.stringify(payload);
      if (intent.current?.body !== body) intent.current = { body, key: crypto.randomUUID() };
      const path = `/admin/ai/${resource}/${encodeURIComponent(key)}`;
      await adminApiClient.request(path, {
        method: 'PUT',
        idempotencyKey: intent.current.key,
        body,
      });
      written = true;
      const saved = await adminApiClient.request<RegistryRecord>(path);
      const mismatched = Object.entries(payload).some(
        ([field, candidate]) =>
          !['expectedUpdatedAt', 'operationalStatus'].includes(field) &&
          canonicalJson(saved[field]) !== canonicalJson(candidate),
      );
      if (mismatched) throw new Error('القيم المسترجعة لا تطابق الإعدادات المطلوبة.');
      setSnapshot(JSON.stringify([key, status, json]));
      onSaved();
    } catch (cause) {
      setUncertain(written);
      setError(
        `${written ? 'وصلت استجابة الحفظ، لكن لم تُؤكّد القراءة اللاحقة. حدّث السجل قبل أي كتابة أخرى. ' : ''}${errorMessage(cause)}`,
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  const statuses =
    resource === 'incidents'
      ? ['OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED']
      : ['DRAFT', 'REVIEW', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];
  return (
    <aside className="h-fit rounded-2xl border border-[#0E7C86]/15 bg-white p-5 shadow-sm">
      <h4 className="font-black text-[#142B5F]">{value?.id ? 'تعديل السجل' : 'إنشاء سجل'}</h4>
      {value ? (
        resource === 'knowledgeSources' ? (
          <JsonView value={value} />
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <fieldset disabled={saving || uncertain} className="space-y-4">
              <Field label="المفتاح الثابت">
                <input
                  required
                  disabled={!!value.id || resource === 'platformSettings'}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="input"
                  dir="ltr"
                />
              </Field>
              <Field label="الحالة">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="input"
                >
                  {statuses.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="الإعدادات والأسماء الأصلية (JSON)">
                <textarea
                  value={json}
                  onChange={(e) => setJson(e.target.value)}
                  rows={18}
                  className="input font-mono text-xs"
                  dir="ltr"
                />
              </Field>
              <p className="text-xs leading-6 text-slate-500">
                الأسماء العربية والإنجليزية محفوظة بحقولها. لا تدخل الأسرار؛ استخدم secretReference
                للمزوّد. نشر الموجّهات من دورة الإصدارات فقط.
              </p>
            </fieldset>
            {dirty && <p className="text-xs text-amber-800">تعديلات غير محفوظة</p>}
            {error && <ErrorBanner message={error} />}
            <button
              disabled={saving || uncertain || !dirty}
              className="action-primary w-full justify-center"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{' '}
              حفظ الإعدادات
            </button>
          </form>
        )
      ) : (
        <Empty text="اختر سجلاً أو أنشئ سجلاً جديداً." />
      )}
    </aside>
  );
}
function canonicalJson(value: unknown): string {
  if (value == null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`;
}
function JsonView({ value }: { value: unknown }) {
  return (
    <pre
      className="mt-3 max-h-[620px] overflow-auto rounded-xl bg-slate-950 p-4 text-left text-xs text-white/80"
      dir="ltr"
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h4 className="text-lg font-black text-[#142B5F]">{title}</h4>
        <p className="mt-1 text-xs leading-6 text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#0E7C86]/15 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0E7C86]/10 text-[#142B5F] [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}
function StatusBadge({ value }: { value: string }) {
  const good = ['ACTIVE', 'APPROVED', 'READY', 'COMPLETED', 'ALLOWED', 'RESOLVED'].includes(value);
  const neutral = ['ARCHIVED', 'INACTIVE', 'DISABLED', 'CANCELLED', 'RETIRED'].includes(value);
  const warn = [
    'DRAFT',
    'REVIEW',
    'NOT_CONFIGURED',
    'RUNTIME_PENDING',
    'QUEUED',
    'RUNNING',
    'RETRYING',
    'INVESTIGATING',
  ].includes(value);
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${neutral ? 'bg-slate-100 text-slate-600' : good ? 'bg-[#0E7C86]/10 text-[#142B5F]' : warn ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}
    >
      {value}
    </span>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-bold text-slate-700">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
function Loading() {
  return (
    <div className="flex min-h-48 items-center justify-center text-[#142B5F]">
      <Loader2 className="h-7 w-7 animate-spin" />
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
      {message}
    </div>
  );
}
function displayName(record: RegistryRecord) {
  return String(
    record.displayNameAr ??
      record.displayName ??
      record.displayNameEn ??
      record.title ??
      record.key,
  );
}
function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : 'تعذر إكمال العملية.';
}
