import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
  dependencies: Array<{ phase: string; required: boolean; description: string; capabilityKey?: string }>;
  inputSchema: { version: string; fields: Array<{ key: string; labelAr: string; required: boolean; type: string }> };
  outputSchema: { version: string; fields: Array<{ key: string; labelAr: string; required: boolean; type: string }> };
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
  return toolKey ? <ToolDetail toolKey={toolKey} /> : <ToolCatalog />;
}
function ToolCatalog() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, summary] = await Promise.all([
        adminApiClient.request<{ data: Tool[] }>('/admin/student-tools'),
        adminApiClient.request<{ data: Overview }>('/admin/student-tools/overview'),
      ]);
      setTools(list.data);
      setOverview(summary.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تحميل مركز الأدوات');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () =>
      tools.filter(
        (tool) =>
          (!status || tool.implementationStatus === status) &&
          (!search ||
            `${tool.nameAr} ${tool.nameEn} ${tool.toolKey}`
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [tools, search, status],
  );
  return (
    <main dir="rtl" className="mx-auto max-w-7xl space-y-6 font-['Cairo',sans-serif]">
      <header className="rounded-3xl bg-gradient-to-l from-[#142B5F] to-[#0E7C86] p-7 text-white">
        <p className="text-sm font-bold text-[#D6A43B]">Phase 18</p>
        <h1 className="mt-2 text-3xl font-black">مركز أدوات الطلاب</h1>
        <p className="mt-3 max-w-3xl leading-7 text-white/85">
          تحكم حقيقي في السجل والحالة والإتاحة والتنفيذ. لا توجد مؤشرات تجريبية أو نجاحات مصطنعة.
        </p>
      </header>
      {error ? <Alert>{error}</Alert> : null}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Settings2} label="إجمالي السجل" value={overview?.total} />
        <Metric icon={CheckCircle2} label="منفذة" value={overview?.implemented} />
        <Metric icon={Activity} label="نشطة" value={overview?.active} />
        <Metric icon={Clock3} label="ضمن الخطة" value={overview?.planned} />
      </section>
      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-xl border px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <span className="sr-only">بحث</span>
            <input
              className="min-h-11 w-full outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو المفتاح..."
            />
          </label>
          <select
            className="min-h-11 rounded-xl border px-3"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">كل حالات التنفيذ</option>
            <option value="IMPLEMENTED">منفذة</option>
            <option value="PLANNED">مخططة</option>
            <option value="IN_DEVELOPMENT">قيد التطوير</option>
          </select>
          <button className="rounded-xl border px-4 py-2 font-bold" onClick={() => void load()}>
            تحديث
          </button>
        </div>
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
  const load = useCallback(async () => {
    try {
      const response = await adminApiClient.request<{ data: Detail }>(
        `/admin/student-tools/${encodeURIComponent(toolKey)}`,
      );
      setDetail(response.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تحميل الأداة');
    }
  }, [toolKey]);
  useEffect(() => {
    void load();
  }, [load]);
  const saveFlags = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    setError('');
    try {
      await adminApiClient.request(`/admin/student-tools/${encodeURIComponent(toolKey)}/flags`, {
        method: 'PATCH',
        body: JSON.stringify(detail.tool.featureFlags),
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر الحفظ');
      await load();
    } finally {
      setSaving(false);
    }
  };
  const saveMetadata = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    setError('');
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
          tags: tool.tags ?? [],
          iconAssetId: tool.iconAssetId ?? null,
        }),
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر حفظ البيانات الوصفية');
    } finally {
      setSaving(false);
    }
  };

  const saveAvailability = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail || changeNote.trim().length < 3) {
      setError('اكتب سبب تغيير الإتاحة (3 أحرف على الأقل).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await adminApiClient.request(`/admin/student-tools/${encodeURIComponent(toolKey)}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...detail.tool.availability,
          semanticVersion: incrementPatchVersion(detail.tool.currentVersion.semanticVersion),
          changeNote: changeNote.trim(),
        }),
      });
      setChangeNote('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر حفظ الإتاحة المرقمة');
    } finally {
      setSaving(false);
    }
  };

  const transitionLifecycle = async (action: 'activate' | 'testing' | 'deprecate' | 'retire') => {
    if (!detail) return;
    if (action === 'activate' && !detail.readiness.ready) {
      setError('لا يمكن التفعيل قبل اجتياز فحص الجاهزية.');
      return;
    }
    if (!window.confirm(`تأكيد تغيير دورة حياة الأداة: ${action}؟`)) return;
    setSaving(true);
    setError('');
    try {
      await adminApiClient.request(
        `/admin/student-tools/${encodeURIComponent(toolKey)}/lifecycle/${action}`,
        { method: 'POST' },
      );
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تغيير دورة الحياة');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const runAdminTest = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setTestResult('');
    try {
      const input = JSON.parse(testInput);
      if (!input || Array.isArray(input) || typeof input !== 'object') throw new Error('TEST_INPUT_MUST_BE_OBJECT');
      const response = await adminApiClient.request<{ data: unknown }>(
        `/admin/student-tools/${encodeURIComponent(toolKey)}/test`,
        { method: 'POST', body: JSON.stringify({ input, locale: 'ar' }) },
      );
      setTestResult(JSON.stringify(response.data, null, 2));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تنفيذ اختبار الإدارة');
    } finally {
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
        className="inline-flex items-center gap-2 font-bold text-[#142B5F]"
      >
        <ArrowRight className="h-4 w-4" /> سجل الأدوات
      </Link>
      <header className="rounded-3xl bg-emerald-950 p-7 text-white">
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
                {detail.readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-[#142B5F]">العقود والمعالج والتبعيات والسياسات اجتازت الفحص.</p>
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
          <form onSubmit={saveMetadata} className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
            <input className="rounded-xl border p-3" value={tool.nameAr} onChange={(e) => setDetail((current) => current ? { ...current, tool: { ...current.tool, nameAr: e.target.value } } : current)} aria-label="الاسم العربي" />
            <input className="rounded-xl border p-3" dir="ltr" value={tool.nameEn} onChange={(e) => setDetail((current) => current ? { ...current, tool: { ...current.tool, nameEn: e.target.value } } : current)} aria-label="English name" />
            <textarea className="rounded-xl border p-3 sm:col-span-2" value={tool.descriptionAr} onChange={(e) => setDetail((current) => current ? { ...current, tool: { ...current.tool, descriptionAr: e.target.value } } : current)} aria-label="الوصف العربي" rows={3} />
            <input className="rounded-xl border p-3" value={tool.category} onChange={(e) => setDetail((current) => current ? { ...current, tool: { ...current.tool, category: e.target.value } } : current)} aria-label="الفئة" />
            <input className="rounded-xl border p-3" type="number" min={0} value={tool.estimatedMinutes} onChange={(e) => setDetail((current) => current ? { ...current, tool: { ...current.tool, estimatedMinutes: Number(e.target.value) } } : current)} aria-label="المدة المقدرة" />
            <button disabled={saving} className="rounded-xl bg-[#142B5F] px-4 py-3 font-black text-white sm:col-span-2">حفظ البيانات الوصفية</button>
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
                <li key={`${dep.phase}-${dep.description}`} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span><strong>{dep.phase}</strong> · {dep.required ? 'مطلوبة' : 'اختيارية'} — {dep.description}</span>
                    <Badge value={dep.status} />
                  </div>
                  {dep.capabilityKey ? <code className="mt-2 block text-xs text-slate-500" dir="ltr">{dep.capabilityKey}</code> : null}
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
                            featureFlags: { ...current.tool.featureFlags, [key]: e.target.checked },
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
          {(['publicEnabled', 'anonymousEnabled', 'authenticatedEnabled', 'adminOnly', 'maintenanceMode'] as const).map((key) => (
            <label key={key} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span>{key}</span>
              <input type="checkbox" checked={tool.availability[key]} onChange={(e) => setDetail((current) => current ? { ...current, tool: { ...current.tool, availability: { ...current.tool.availability, [key]: e.target.checked } } } : current)} />
            </label>
          ))}
          <input className="w-full rounded-xl border p-3" value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder={`سبب التغيير — الإصدار التالي ${incrementPatchVersion(tool.currentVersion.semanticVersion)}`} />
          <button disabled={saving} className="w-full rounded-xl bg-[#142B5F] px-4 py-3 font-black text-white">حفظ الإتاحة وإصدار نسخة جديدة</button>
        </form>
        <section className="space-y-4 rounded-3xl border bg-white p-6">
          <h2 className="text-xl font-black">دورة الحياة</h2>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={saving} onClick={() => void transitionLifecycle('testing')} className="rounded-xl border px-3 py-3 font-bold">إرسال للاختبار</button>
            <button type="button" disabled={saving || !detail.readiness.ready} onClick={() => void transitionLifecycle('activate')} className="rounded-xl bg-[#142B5F] px-3 py-3 font-bold text-white disabled:opacity-50">تفعيل</button>
            <button type="button" disabled={saving} onClick={() => void transitionLifecycle('deprecate')} className="rounded-xl border px-3 py-3 font-bold">إهمال تدريجي</button>
            <button type="button" disabled={saving} onClick={() => void transitionLifecycle('retire')} className="rounded-xl border border-red-300 px-3 py-3 font-bold text-red-700">تقاعد</button>
          </div>
          <p className="text-xs text-slate-500">التفعيل وحده يتطلب readiness؛ كل انتقال يتطلب تأكيدًا صريحًا.</p>
        </section>
      </section>
      <form onSubmit={runAdminTest} className="space-y-4 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-black">اختبار إداري فعلي</h2>
        <textarea dir="ltr" className="min-h-32 w-full rounded-xl border p-3 font-mono text-sm" value={testInput} onChange={(e) => setTestInput(e.target.value)} />
        <button disabled={saving} className="rounded-xl bg-[#142B5F] px-4 py-3 font-black text-white">تنفيذ اختبار</button>
        {testResult ? <pre dir="ltr" className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-white">{testResult}</pre> : null}
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
              <div key={`${entry.timestamp}-${entry.action}`} className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-[180px_1fr_160px]">
                <time>{new Date(entry.timestamp).toLocaleString('ar')}</time>
                <span className="font-bold">{entry.summary}</span>
                <code className="truncate text-xs" dir="ltr">{entry.actor}</code>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">لا توجد أحداث تدقيق مسجلة لهذه الأداة.</p>
        )}
      </section>
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
              <dd className="mt-1 text-xs text-slate-500"><code dir="ltr">{field.key}</code> · {field.type} · {field.required ? 'مطلوب' : 'اختياري'}</dd>
            </div>
          ))}
        </dl>
      ) : <p className="mt-4 text-slate-500">لا يوجد عقد تنفيذ لأن الأداة ما زالت ضمن الخطة.</p>}
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
  return value.replaceAll('_', ' ').toLowerCase();
}
function flagLabel(key: string) {
  return (
    (
      {
        globallyEnabled: 'التفعيل العام',
        anonymousEnabled: 'استخدام الزائر',
        authenticatedEnabled: 'استخدام الطالب',
        maintenanceMode: 'وضع الصيانة',
      } as Record<string, string>
    )[key] ?? key
  );
}
