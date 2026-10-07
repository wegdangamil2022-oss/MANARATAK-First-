import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Search,
  Settings2,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { adminApiClient } from '../api/client';

type Tool = {
  toolKey: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: string;
  executionType: string;
  visibility: string;
  implementationStatus: string;
  lifecycle: string;
  implementationPriority: string;
  estimatedMinutes: number;
  tags: string[];
  iconAssetId?: string | null;
  availability: {
    publicEnabled: boolean;
    anonymousEnabled: boolean;
    authenticatedEnabled: boolean;
    adminOnly: boolean;
    allowedLocales: string[];
    allowedRegions: string[];
    maintenanceMode: boolean;
  };
  featureFlags: {
    globallyEnabled: boolean;
    anonymousEnabled: boolean;
    authenticatedEnabled: boolean;
    maintenanceMode: boolean;
  };
  rateLimitPolicy: {
    anonymousRequestsPerMinute: number;
    authenticatedRequestsPerMinute: number;
    adminTestRequestsPerMinute: number;
  };
  dependencies: Array<{
    phase: string;
    required: boolean;
    description: string;
    capabilityKey?: string;
  }>;
  inputSchema: {
    version: string;
    fields: Array<{ key: string; labelAr: string; required: boolean; type: string }>;
  };
  outputSchema: {
    version: string;
    fields: Array<{ key: string; labelAr: string; required: boolean; type: string }>;
  };
  currentVersion: { semanticVersion: string };
  updatedAt?: string;
};
type Overview = {
  total: number;
  implemented: number;
  active: number;
  planned: number;
  telemetry: {
    executions24h: number | null;
    successRate: number | null;
    p95LatencyMs: number | null;
  };
};
type Detail = {
  tool: Tool;
  telemetry: Record<string, number | null>;
  executions: {
    data: Array<{
      executionId: string;
      status: string;
      durationMs?: number;
      startedAt: string;
      isTest: boolean;
    }>;
    total: number;
  };
  audit: Array<{ timestamp: string; actor: string; action: string; summary: string }>;
  readiness: { ready: boolean; blockers: string[] };
  health: string;
  dependencies: Array<{
    phase: string;
    required: boolean;
    description: string;
    capabilityKey?: string;
    status: string;
  }>;
};
const labels: Record<string, string> = {
  IMPLEMENTED: 'منفذة',
  RUNTIME_BLOCKED: 'تشغيل محجوب',
  UNDER_DEVELOPMENT: 'قيد التطوير',
  DISABLED: 'معطلة',
  HEALTHY: 'سليمة',
  DEGRADED: 'متأثرة',
  MAINTENANCE: 'صيانة',
  OFFLINE: 'متوقفة',
  NOT_CONFIGURED: 'غير مهيأة',
  COMPLETED: 'مكتمل',
  FAILED: 'فشل',
  BLOCKED: 'محجوب',
  RUNNING: 'قيد التنفيذ',
  ACADEMIC_CALCULATORS: 'الحاسبات الأكاديمية',
  UNIVERSITIES: 'الجامعات',
  SCHOLARSHIPS: 'المنح',
  DOCUMENTS_AND_WRITING: 'الكتابة والوثائق',
  STUDENT_PLANNING: 'التخطيط الدراسي',
  DETERMINISTIC: 'حسابات وبيانات',
  AI_DELEGATED: 'ذكاء اصطناعي',
  HYBRID: 'هجينة',
  ADMIN_INTERNAL: 'إدارية',
  PLANNED: 'مخططة',
  IN_DEVELOPMENT: 'قيد التطوير',
  ACTIVE: 'نشطة',
  COMING_SOON: 'قريبًا',
  HIDDEN_ADMIN_ONLY: 'إدارية فقط',
  DRAFT: 'مسودة',
  TESTING: 'اختبار',
  DEPRECATED: 'متقادمة',
  RETIRED: 'متقاعدة',
};
export function StudentToolsAdminPage() {
  const { toolKey } = useParams();
  return toolKey ? <ToolDetail key={toolKey} toolKey={toolKey} /> : <ToolCatalog />;
}
function ToolCatalog() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [lifecycle, setLifecycle] = useState('');
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const [list, summary] = await Promise.allSettled([
        adminApiClient.request<{ data: Tool[] }>('/admin/student-tools'),
        adminApiClient.request<{ data: Overview }>('/admin/student-tools/overview'),
      ]);
      if (current !== requestId.current) return;
      if (list.status === 'rejected') throw list.reason;
      setTools(list.value.data);
      setOverview(summary.status === 'fulfilled' ? summary.value.data : null);
      if (summary.status === 'rejected') setError('تم تحميل الأدوات؛ تعذر تحميل الإحصاءات.');
    } catch (reason) {
      if (current === requestId.current)
        setError(reason instanceof Error ? reason.message : 'تعذر تحميل مركز الأدوات');
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    return () => {
      ++requestId.current;
    };
  }, [load]);
  const filtered = useMemo(
    () =>
      tools.filter(
        (tool) =>
          (!status || tool.implementationStatus === status) &&
          (!category || tool.category === category) &&
          (!lifecycle || tool.lifecycle === lifecycle) &&
          (!search.trim() ||
            `${tool.nameAr} ${tool.nameEn} ${tool.toolKey}`
              .toLowerCase()
              .includes(search.trim().toLowerCase())),
      ),
    [tools, search, status, category, lifecycle],
  );
  return (
    <main dir="rtl" className="mx-auto max-w-7xl space-y-6 font-sans">
      <section className="relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-[0_18px_45px_rgba(20,43,95,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-28 h-64 w-64 rounded-full border border-cyan-400/20" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-48 bg-gradient-to-r from-transparent via-[#21A7B4] to-[#0E7C86] sm:w-80" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-200 backdrop-blur-sm border border-white/15">
              <Wrench className="h-4 w-4 text-[#21A7B4]" />
              <span>منظومة أدوات وحاسبات الطلاب</span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">
              مركز أدوات الطلاب
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-cyan-50/90">
              تحكم حقيقي في السجل والحالة والإتاحة والتنفيذ لحاسبات ومساعدات الطلاب.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#21A7B4] px-5 text-sm font-black text-white shadow-md transition hover:bg-[#1A8D99] disabled:opacity-60 shrink-0"
          >
            تحديث البيانات
          </button>
        </div>
      </section>
      {error ? <Alert>{error}</Alert> : null}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Settings2} label="إجمالي السجل" value={overview?.total} />
        <Metric icon={CheckCircle2} label="منفذة" value={overview?.implemented} />
        <Metric icon={Activity} label="نشطة" value={overview?.active} />
        <Metric icon={Clock3} label="ضمن الخطة" value={overview?.planned} />
      </section>
      <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 focus-within:border-[#21A7B4]">
            <Search className="h-4 w-4 text-slate-400" />
            <span className="sr-only">بحث</span>
            <input
              className="min-h-11 w-full text-xs font-medium outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو المفتاح..."
            />
          </label>
          <select
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3.5 text-xs font-bold outline-none focus:border-[#21A7B4]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">كل حالات التنفيذ</option>
            <option value="IMPLEMENTED">منفذة</option>
            <option value="PLANNED">مخططة</option>
            <option value="IN_DEVELOPMENT">قيد التطوير</option>
            <option value="RUNTIME_BLOCKED">تشغيل محجوب</option>
          </select>
          <select
            aria-label="الفئة"
            className="rounded-2xl border p-3 text-xs"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">كل الفئات</option>
            {Array.from(new Set(tools.map((t) => t.category)))
              .sort()
              .map((value) => (
                <option key={value} value={value}>
                  {format(value)}
                </option>
              ))}
          </select>
          <select
            aria-label="دورة الحياة"
            className="rounded-2xl border p-3 text-xs"
            value={lifecycle}
            onChange={(e) => setLifecycle(e.target.value)}
          >
            <option value="">كل الحالات</option>
            {['DRAFT', 'TESTING', 'ACTIVE', 'DEPRECATED', 'RETIRED'].map((value) => (
              <option key={value} value={value}>
                {labels[value]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="text-sm text-[#0E7C86]"
            onClick={() => {
              setSearch('');
              setStatus('');
              setCategory('');
              setLifecycle('');
            }}
          >
            إعادة ضبط
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {filtered.length} أداة من أصل {tools.length}
        </p>
      </section>
      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-slate-500">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAF7F0] text-[#142B5F]">
                <tr>
                  {['الأداة', 'الفئة', 'التنفيذ', 'الحالة', 'الإتاحة', 'الإصدار', ''].map(
                    (label) => (
                      <th key={label} className="px-5 py-4 text-right font-black">
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {!filtered.length && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      لا توجد أدوات مطابقة للفلاتر.
                    </td>
                  </tr>
                )}
                {filtered.map((tool) => (
                  <tr key={tool.toolKey} className="border-t hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="font-black text-slate-950">{tool.nameAr}</div>
                      <code className="text-xs text-slate-500">{tool.toolKey}</code>
                    </td>
                    <td className="px-5 py-4">{format(tool.category)}</td>
                    <td className="px-5 py-4">{format(tool.executionType)}</td>
                    <td className="px-5 py-4">
                      <Badge value={tool.implementationStatus} />
                      <div className="mt-1 text-xs text-slate-500">
                        {labels[tool.lifecycle] ?? tool.lifecycle}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {tool.featureFlags.globallyEnabled ? 'مفعّلة' : 'متوقفة'} ·{' '}
                      {tool.availability.publicEnabled ? 'عامة' : 'غير عامة'}
                    </td>
                    <td className="px-5 py-4">{tool.currentVersion.semanticVersion}</td>
                    <td className="px-5 py-4">
                      <Link
                        className="font-black text-[#142B5F]"
                        to={`/student-tools/${tool.toolKey}`}
                      >
                        إدارة
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
function ToolDetail({ toolKey }: { toolKey: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [testInput, setTestInput] = useState('{}');
  const [testResult, setTestResult] = useState('');
  const [notice, setNotice] = useState('');
  const [tagsText, setTagsText] = useState('');
  const baseline = useRef<Tool | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const begin = () => {
    if (busy.current) return false;
    busy.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    return true;
  };
  const dirty = Boolean(
    detail &&
    baseline.current &&
    (JSON.stringify(editable(detail.tool)) !== JSON.stringify(editable(baseline.current)) ||
      JSON.stringify(splitCodes(tagsText)) !== JSON.stringify(baseline.current.tags)),
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const load = useCallback(
    async (saved?: 'metadata' | 'featureFlags' | 'availability' | 'reset') => {
      const response = await adminApiClient.request<{ data: Detail }>(
        `/admin/student-tools/${encodeURIComponent(toolKey)}`,
      );
      if (!mounted.current) return;
      const previous = baseline.current;
      const fresh = response.data;
      if (!previous || saved === 'reset' || saved === 'metadata')
        setTagsText(fresh.tool.tags.join('، '));
      setDetail((current) => {
        if (!current || !previous || saved === 'reset') return fresh;
        const next = { ...fresh.tool };
        for (const key of metadataKeys) {
          if (
            saved !== 'metadata' &&
            JSON.stringify(current.tool[key]) !== JSON.stringify(previous[key])
          )
            Object.assign(next, { [key]: current.tool[key] });
        }
        if (
          saved !== 'featureFlags' &&
          JSON.stringify(current.tool.featureFlags) !== JSON.stringify(previous.featureFlags)
        )
          next.featureFlags = current.tool.featureFlags;
        if (
          saved !== 'availability' &&
          JSON.stringify(current.tool.availability) !== JSON.stringify(previous.availability)
        )
          next.availability = current.tool.availability;
        return { ...fresh, tool: next };
      });
      baseline.current = fresh.tool;
    },
    [toolKey],
  );
  useEffect(() => {
    void load().catch((reason) => {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'تعذر تحميل الأداة');
    });
  }, [load]);
  const saveFlags = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    if (!begin()) return;
    let committed = false;
    try {
      await adminApiClient.request(`/admin/student-tools/${encodeURIComponent(toolKey)}/flags`, {
        method: 'PATCH',
        body: JSON.stringify(detail.tool.featureFlags),
      });
      committed = true;
      await load('featureFlags');
      setNotice('حُفظت مفاتيح التشغيل وأعيدت قراءتها.');
    } catch (reason) {
      setError(
        committed
          ? 'استجاب الخادم بنجاح للحفظ، لكن تعذرت إعادة القراءة. حدّث البيانات قبل إعادة الحفظ.'
          : reason instanceof Error
            ? reason.message
            : 'تعذر الحفظ',
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const saveMetadata = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    if (!begin()) return;
    let committed = false;
    try {
      const { tool } = detail;
      await adminApiClient.request(`/admin/student-tools/${encodeURIComponent(toolKey)}/metadata`, {
        method: 'PATCH',
        body: JSON.stringify({
          nameAr: tool.nameAr,
          nameEn: tool.nameEn,
          descriptionAr: tool.descriptionAr,
          descriptionEn: tool.descriptionEn,
          category: tool.category,
          implementationPriority: tool.implementationPriority,
          visibility: tool.visibility,
          implementationStatus: tool.implementationStatus,
          estimatedMinutes: tool.estimatedMinutes,
          tags: splitCodes(tagsText),
          iconAssetId: tool.iconAssetId ?? null,
        }),
      });
      committed = true;
      await load('metadata');
      setNotice('حُفظت بيانات الأداة وأعيدت قراءتها.');
    } catch (reason) {
      setError(
        committed
          ? 'استجاب الخادم بنجاح للحفظ، لكن تعذرت إعادة القراءة. حدّث البيانات قبل إعادة الحفظ.'
          : reason instanceof Error
            ? reason.message
            : 'تعذر حفظ البيانات الوصفية',
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const saveAvailability = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail || changeNote.trim().length < 3) {
      setError('اكتب سبب تغيير الإتاحة (3 أحرف على الأقل).');
      return;
    }
    if (!begin()) return;
    let committed = false;
    try {
      await adminApiClient.request(
        `/admin/student-tools/${encodeURIComponent(toolKey)}/availability`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            ...detail.tool.availability,
            semanticVersion: incrementPatchVersion(detail.tool.currentVersion.semanticVersion),
            changeNote: changeNote.trim(),
          }),
        },
      );
      setChangeNote('');
      committed = true;
      await load('availability');
      setNotice('حُفظت الإتاحة بإصدار جديد وأعيدت قراءتها.');
    } catch (reason) {
      setError(
        committed
          ? 'استجاب الخادم بنجاح للحفظ، لكن تعذرت إعادة القراءة. حدّث البيانات قبل إعادة الحفظ.'
          : reason instanceof Error
            ? reason.message
            : 'تعذر حفظ الإتاحة المرقمة',
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const transitionLifecycle = async (action: 'activate' | 'testing' | 'deprecate' | 'retire') => {
    if (!detail) return;
    if (dirty) {
      setError('احفظ التعديلات أو تراجع عنها قبل تغيير الحالة.');
      return;
    }
    if (action === 'activate' && !detail.readiness.ready) {
      setError('لا يمكن التفعيل قبل اجتياز فحص الجاهزية.');
      return;
    }
    if (
      !window.confirm(
        `تأكيد تغيير حالة الأداة: ${{ activate: 'تفعيل', testing: 'اختبار', deprecate: 'إهمال تدريجي', retire: 'تقاعد' }[action]}؟`,
      )
    )
      return;
    if (!begin()) return;
    try {
      await adminApiClient.request(
        `/admin/student-tools/${encodeURIComponent(toolKey)}/lifecycle/${action}`,
        { method: 'POST' },
      );
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تغيير دورة الحياة');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const runAdminTest = async (event: FormEvent) => {
    event.preventDefault();
    if (!begin()) return;
    setTestResult('');
    try {
      const input = JSON.parse(testInput);
      if (!input || Array.isArray(input) || typeof input !== 'object')
        throw new Error('TEST_INPUT_MUST_BE_OBJECT');
      const response = await adminApiClient.request<{ data: unknown }>(
        `/admin/student-tools/${encodeURIComponent(toolKey)}/test`,
        { method: 'POST', body: JSON.stringify({ input, locale: 'ar' }) },
      );
      setTestResult(JSON.stringify(response.data, null, 2));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تنفيذ اختبار الإدارة');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  if (!detail)
    return (
      <main dir="rtl" className="p-8">
        {error ? <Alert>{error}</Alert> : 'جاري التحميل...'}
      </main>
    );
  const tool = detail.tool;
  return (
    <main dir="rtl" className="mx-auto max-w-6xl space-y-6">
      <Link
        to="/student-tools"
        onClick={(event) => {
          if (dirty && !window.confirm('لديك تعديلات غير محفوظة. مغادرة الصفحة؟'))
            event.preventDefault();
        }}
        className="inline-flex items-center gap-2 font-bold text-[#142B5F]"
      >
        <ArrowRight className="h-4 w-4" /> سجل الأدوات
      </Link>
      <header className="rounded-3xl bg-gradient-to-l from-[#0E7C86] to-[#142B5F] p-7 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[#D6A43B]">{tool.nameEn}</p>
            <h1 className="mt-1 text-3xl font-black">{tool.nameAr}</h1>
            <code className="mt-3 block text-[#D6A43B]">{tool.toolKey}</code>
          </div>
          <Badge value={tool.implementationStatus} />
          <Badge value={detail.health} />
        </div>
      </header>
      {error ? <Alert>{error}</Alert> : null}
      {notice && (
        <p role="status" className="rounded-2xl bg-teal-50 p-4 text-[#0E7C86]">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span>{dirty ? 'لديك تعديلات غير محفوظة' : 'لا توجد تعديلات غير محفوظة'}</span>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            if (dirty && !window.confirm('التراجع عن التعديلات غير المحفوظة؟')) return;
            if (!begin()) return;
            void load('reset')
              .then(() => setChangeNote(''))
              .catch((reason) =>
                setError(reason instanceof Error ? reason.message : 'تعذر التحميل'),
              )
              .finally(() => {
                busy.current = false;
                setSaving(false);
              });
          }}
        >
          إعادة تحميل / تراجع
        </button>
        <a
          target="_blank"
          rel="noreferrer"
          href={`/tools/${encodeURIComponent(toolKey)}`}
          className="font-bold text-[#0E7C86]"
        >
          فتح الصفحة العامة
        </a>
      </div>
      <fieldset disabled={saving} className="min-w-0 space-y-6">
        <section
          className={`rounded-3xl border p-5 ${
            detail.readiness.ready
              ? 'border-emerald-200 bg-[#FAF7F0]'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-black">
                {detail.readiness.ready ? 'الأداة جاهزة للتفعيل' : 'توجد موانع للجاهزية'}
              </h2>
              {detail.readiness.blockers.length ? (
                <ul className="mt-2 list-inside list-disc text-sm text-amber-900">
                  {detail.readiness.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-[#142B5F]">
                  العقود والمعالج والتبعيات والسياسات اجتازت الفحص.
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={!detail.readiness.ready || saving || tool.lifecycle === 'ACTIVE'}
              onClick={() => void transitionLifecycle('activate')}
              className="min-h-11 rounded-xl bg-[#142B5F] px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {tool.lifecycle === 'ACTIVE' ? 'نشطة حاليًا' : 'تفعيل الأداة'}
            </button>
          </div>
        </section>
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-5 rounded-3xl border bg-white p-6 lg:col-span-2">
            <h2 className="text-xl font-black">الهوية والعقود</h2>
            <form
              onSubmit={saveMetadata}
              className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2"
            >
              <input
                className="rounded-xl border p-3"
                value={tool.nameAr}
                onChange={(e) =>
                  setDetail((current) =>
                    current
                      ? { ...current, tool: { ...current.tool, nameAr: e.target.value } }
                      : current,
                  )
                }
                required
                maxLength={240}
                aria-label="الاسم العربي"
              />
              <input
                className="rounded-xl border p-3"
                dir="ltr"
                value={tool.nameEn}
                onChange={(e) =>
                  setDetail((current) =>
                    current
                      ? { ...current, tool: { ...current.tool, nameEn: e.target.value } }
                      : current,
                  )
                }
                required
                maxLength={240}
                aria-label="English name"
              />
              <textarea
                className="rounded-xl border p-3 sm:col-span-2"
                value={tool.descriptionAr}
                onChange={(e) =>
                  setDetail((current) =>
                    current
                      ? { ...current, tool: { ...current.tool, descriptionAr: e.target.value } }
                      : current,
                  )
                }
                aria-label="الوصف العربي"
                rows={3}
              />
              <select
                className="rounded-xl border p-3"
                value={tool.category}
                onChange={(e) =>
                  setDetail((current) =>
                    current
                      ? { ...current, tool: { ...current.tool, category: e.target.value } }
                      : current,
                  )
                }
                aria-label="الفئة"
              >
                {Array.from(
                  new Set([
                    tool.category,
                    'ACADEMIC_CALCULATORS',
                    'UNIVERSITIES',
                    'SCHOLARSHIPS',
                    'DOCUMENTS_AND_WRITING',
                    'STUDENT_PLANNING',
                  ]),
                ).map((value) => (
                  <option key={value} value={value}>
                    {format(value)}
                  </option>
                ))}
              </select>
              <input
                className="rounded-xl border p-3"
                type="number"
                required
                min={0}
                max={100000}
                step={1}
                value={tool.estimatedMinutes}
                onChange={(e) =>
                  setDetail((current) =>
                    current
                      ? {
                          ...current,
                          tool: { ...current.tool, estimatedMinutes: Number(e.target.value) },
                        }
                      : current,
                  )
                }
                aria-label="المدة المقدرة"
              />
              <textarea
                className="rounded-xl border p-3 sm:col-span-2"
                dir="ltr"
                rows={3}
                aria-label="الوصف الإنجليزي"
                value={tool.descriptionEn}
                onChange={(e) =>
                  setDetail((current) =>
                    current
                      ? { ...current, tool: { ...current.tool, descriptionEn: e.target.value } }
                      : current,
                  )
                }
              />
              <label className="grid gap-2 text-sm">
                الظهور
                <select
                  className="rounded-xl border p-3"
                  value={tool.visibility}
                  onChange={(e) =>
                    setDetail((current) =>
                      current
                        ? { ...current, tool: { ...current.tool, visibility: e.target.value } }
                        : current,
                    )
                  }
                >
                  {[
                    'ACTIVE',
                    'COMING_SOON',
                    'UNDER_DEVELOPMENT',
                    'HIDDEN_ADMIN_ONLY',
                    'DISABLED',
                    'RETIRED',
                  ].map((value) => (
                    <option key={value} value={value}>
                      {labels[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                وسوم البحث
                <input
                  className="rounded-xl border p-3"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                />
              </label>
              <button
                disabled={saving}
                className="rounded-xl bg-[#142B5F] px-4 py-3 font-black text-white sm:col-span-2"
              >
                حفظ البيانات الوصفية
              </button>
            </form>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Info label="نوع التنفيذ" value={format(tool.executionType)} />
              <Info label="دورة الحياة" value={labels[tool.lifecycle] ?? tool.lifecycle} />
              <Info label="الظهور" value={labels[tool.visibility] ?? tool.visibility} />
              <Info label="الإصدار" value={tool.currentVersion.semanticVersion} />
            </dl>
            <h3 className="font-black">التبعيات</h3>
            {detail.dependencies.length ? (
              <ul className="space-y-2">
                {detail.dependencies.map((dep) => (
                  <li
                    key={`${dep.phase}-${dep.description}`}
                    className="rounded-xl bg-slate-50 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <strong>{dep.phase}</strong> · {dep.required ? 'مطلوبة' : 'اختيارية'} —{' '}
                        {dep.description}
                      </span>
                      <Badge value={dep.status} />
                    </div>
                    {dep.capabilityKey ? (
                      <code className="mt-2 block text-xs text-slate-500" dir="ltr">
                        {dep.capabilityKey}
                      </code>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">لا توجد تبعيات تشغيلية.</p>
            )}
          </section>
          <form
            onSubmit={saveFlags}
            className="space-y-4 rounded-3xl border border-emerald-200 bg-[#FAF7F0] p-6"
          >
            <h2 className="text-xl font-black text-[#142B5F]">مفاتيح الإتاحة</h2>
            {Object.entries(tool.featureFlags).map(([key, value]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"
              >
                <span>{flagLabel(key)}</span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    setDetail((current) =>
                      current
                        ? {
                            ...current,
                            tool: {
                              ...current.tool,
                              featureFlags: {
                                ...current.tool.featureFlags,
                                [key]: e.target.checked,
                              },
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>
            ))}
            <button
              disabled={saving}
              className="w-full rounded-xl bg-[#142B5F] px-4 py-3 font-black text-white"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ الإتاحة'}
            </button>
            <p className="text-xs leading-6 text-emerald-900">
              التفعيل لا يحوّل أداة غير منفذة إلى تنفيذ حقيقي، ولا ينشرها تلقائيًا.
            </p>
          </form>
        </div>
        <section className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={saveAvailability} className="space-y-4 rounded-3xl border bg-white p-6">
            <h2 className="text-xl font-black">الإتاحة المرقمة</h2>
            {(
              [
                'publicEnabled',
                'anonymousEnabled',
                'authenticatedEnabled',
                'adminOnly',
                'maintenanceMode',
              ] as const
            ).map((key) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
              >
                <span>{flagLabel(key)}</span>
                <input
                  type="checkbox"
                  checked={tool.availability[key]}
                  onChange={(e) =>
                    setDetail((current) =>
                      current
                        ? {
                            ...current,
                            tool: {
                              ...current.tool,
                              availability: {
                                ...current.tool.availability,
                                [key]: e.target.checked,
                              },
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>
            ))}
            <label className="grid gap-2 text-sm">
              لغات التشغيل المسموحة (عدم الاختيار = دون تقييد)
              <select
                multiple
                className="rounded-xl border p-3"
                value={tool.availability.allowedLocales}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, (option) => option.value);
                  setDetail((current) =>
                    current
                      ? {
                          ...current,
                          tool: {
                            ...current.tool,
                            availability: { ...current.tool.availability, allowedLocales: values },
                          },
                        }
                      : current,
                  );
                }}
              >
                {Array.from(new Set(['ar', 'en', ...tool.availability.allowedLocales])).map(
                  (value) => (
                    <option key={value} value={value}>
                      {value === 'ar' ? 'العربية' : value === 'en' ? 'الإنجليزية' : value}
                    </option>
                  ),
                )}
              </select>
            </label>
            <input
              className="w-full rounded-xl border p-3"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder={`سبب التغيير — الإصدار التالي ${incrementPatchVersion(tool.currentVersion.semanticVersion)}`}
            />
            <button
              disabled={saving}
              className="w-full rounded-xl bg-[#142B5F] px-4 py-3 font-black text-white"
            >
              حفظ الإتاحة وإصدار نسخة جديدة
            </button>
          </form>
          <section className="space-y-4 rounded-3xl border bg-white p-6">
            <h2 className="text-xl font-black">دورة الحياة</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void transitionLifecycle('testing')}
                className="rounded-xl border px-3 py-3 font-bold"
              >
                إرسال للاختبار
              </button>
              <button
                type="button"
                disabled={saving || !detail.readiness.ready}
                onClick={() => void transitionLifecycle('activate')}
                className="rounded-xl bg-[#142B5F] px-3 py-3 font-bold text-white disabled:opacity-50"
              >
                تفعيل
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void transitionLifecycle('deprecate')}
                className="rounded-xl border px-3 py-3 font-bold"
              >
                إهمال تدريجي
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void transitionLifecycle('retire')}
                className="rounded-xl border border-red-300 px-3 py-3 font-bold text-red-700"
              >
                تقاعد
              </button>
            </div>
            <p className="text-xs text-slate-500">
              التفعيل وحده يتطلب readiness؛ كل انتقال يتطلب تأكيدًا صريحًا.
            </p>
          </section>
        </section>
        <form onSubmit={runAdminTest} className="space-y-4 rounded-3xl border bg-white p-6">
          <h2 className="text-xl font-black">اختبار إداري فعلي</h2>
          <textarea
            dir="ltr"
            className="min-h-32 w-full rounded-xl border p-3 font-mono text-sm"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
          />
          <button
            disabled={saving}
            className="rounded-xl bg-[#142B5F] px-4 py-3 font-black text-white"
          >
            تنفيذ اختبار
          </button>
          {testResult ? (
            <pre
              dir="ltr"
              className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-white"
            >
              {testResult}
            </pre>
          ) : null}
        </form>
        <section className="grid gap-6 lg:grid-cols-2">
          <SchemaPanel title="عقد المدخلات" schema={tool.inputSchema} />
          <SchemaPanel title="عقد المخرجات" schema={tool.outputSchema} />
        </section>
        <section className="grid gap-4 sm:grid-cols-3">
          <Metric icon={Activity} label="تنفيذات 24 ساعة" value={detail.telemetry.executions24h} />
          <Metric
            icon={ShieldCheck}
            label="نسبة النجاح"
            value={
              typeof detail.telemetry.successRate === 'number'
                ? `${Math.round(detail.telemetry.successRate * 100)}%`
                : '—'
            }
          />
          <Metric
            icon={Wrench}
            label="زمن P95"
            value={
              typeof detail.telemetry.p95LatencyMs === 'number'
                ? `${detail.telemetry.p95LatencyMs}ms`
                : '—'
            }
          />
        </section>
        <section className="rounded-3xl border bg-white p-6">
          <h2 className="mb-4 text-xl font-black">آخر التنفيذات</h2>
          <p className="mb-3 text-sm text-slate-500">
            تظهر آخر {detail.executions.data.length} عملية من أصل {detail.executions.total}.
          </p>
          {detail.executions.data.length ? (
            <div className="space-y-2">
              {detail.executions.data.map((entry) => (
                <div
                  key={entry.executionId}
                  className="flex flex-wrap justify-between gap-3 rounded-xl bg-slate-50 p-3"
                >
                  <code>{entry.executionId}</code>
                  <span>{labels[entry.status] ?? entry.status}</span>
                  <span>{entry.durationMs ?? '—'} ms</span>
                  <time>{new Date(entry.startedAt).toLocaleString('ar')}</time>
                  <span>{entry.isTest ? 'اختبار إداري' : 'استخدام طالب'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">لا توجد تنفيذات مسجلة بعد. هذه ليست بيانات افتراضية.</p>
          )}
        </section>
        <section className="rounded-3xl border bg-white p-6">
          <h2 className="mb-4 text-xl font-black">سجل التدقيق</h2>
          {detail.audit.length ? (
            <div className="space-y-2">
              {detail.audit.map((entry) => (
                <div
                  key={`${entry.timestamp}-${entry.action}`}
                  className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-[180px_1fr_160px]"
                >
                  <time>{new Date(entry.timestamp).toLocaleString('ar')}</time>
                  <span className="font-bold">{entry.summary}</span>
                  <code className="truncate text-xs" dir="ltr">
                    {entry.actor}
                  </code>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">لا توجد أحداث تدقيق مسجلة لهذه الأداة.</p>
          )}
        </section>
      </fieldset>
    </main>
  );
}
function SchemaPanel({ title, schema }: { title: string; schema: Tool['inputSchema'] }) {
  return (
    <section className="rounded-3xl border bg-white p-6">
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">الإصدار {schema.version}</p>
      {schema.fields.length ? (
        <dl className="mt-4 space-y-2">
          {schema.fields.map((field) => (
            <div key={field.key} className="rounded-xl bg-slate-50 p-3">
              <dt className="font-bold">{field.labelAr}</dt>
              <dd className="mt-1 text-xs text-slate-500">
                <code dir="ltr">{field.key}</code> · {field.type} ·{' '}
                {field.required ? 'مطلوب' : 'اختياري'}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 text-slate-500">لا يوجد عقد تنفيذ لأن الأداة ما زالت ضمن الخطة.</p>
      )}
    </section>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <Icon className="h-5 w-5 text-[#142B5F]" />
      <div className="mt-4 text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-black text-slate-950">{value ?? '—'}</div>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 font-bold">{value}</dd>
    </div>
  );
}
function Badge({ value }: { value: string }) {
  const good = value === 'IMPLEMENTED' || value === 'ACTIVE';
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${good ? 'bg-[#0E7C86]/10 text-[#142B5F]' : 'bg-amber-100 text-amber-800'}`}
    >
      {labels[value] ?? value}
    </span>
  );
}
function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
      {children}
    </div>
  );
}
function incrementPatchVersion(value: string) {
  const [major, minor, patch] = value.split('.').map((part) => Number(part));
  if (![major, minor, patch].every(Number.isInteger)) return '1.0.0';
  return `${major}.${minor}.${patch + 1}`;
}
function format(value: string) {
  return labels[value] ?? value.replaceAll('_', ' ').toLowerCase();
}
function flagLabel(key: string) {
  return (
    (
      {
        publicEnabled: 'الظهور للعامة',
        adminOnly: 'إدارية فقط',
        globallyEnabled: 'التفعيل العام',
        anonymousEnabled: 'استخدام الزائر',
        authenticatedEnabled: 'استخدام الطالب',
        maintenanceMode: 'وضع الصيانة',
      } as Record<string, string>
    )[key] ?? key
  );
}

const metadataKeys = [
  'nameAr',
  'nameEn',
  'descriptionAr',
  'descriptionEn',
  'category',
  'implementationPriority',
  'visibility',
  'implementationStatus',
  'estimatedMinutes',
  'tags',
  'iconAssetId',
] as const;
function editable(tool: Tool) {
  return {
    ...Object.fromEntries(metadataKeys.map((key) => [key, tool[key]])),
    featureFlags: tool.featureFlags,
    availability: tool.availability,
  };
}
function splitCodes(value: string) {
  return [
    ...new Set(
      value
        .split(/[،,]/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}
