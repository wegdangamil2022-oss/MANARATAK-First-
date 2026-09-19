import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Copy,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  FileJson,
  Gauge,
  HardDrive,
  Import,
  Layers3,
  RefreshCw,
  Server,
  ShieldCheck,
  Workflow,
  XCircle,
} from 'lucide-react';
import { adminApiClient } from '../api/client';

type HealthStatus = 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
type Severity = 'BLOCKER' | 'WARNING' | 'INFO';
type Tab = 'OVERVIEW' | 'COMPONENTS' | 'RELEASE' | 'COVERAGE' | 'REPORT';

interface HealthComponent {
  id: string;
  status: HealthStatus;
  optional: boolean;
  latencyMs?: number;
  capabilityStatus?: string;
  error?: string;
  checkedAt?: string;
  details?: Record<string, unknown>;
}

interface ProductionFinding {
  id: string;
  severity: Severity;
  area: string;
  message: string;
  recommendation: string;
}

interface ProductionReadiness {
  ready: boolean;
  blockerCount: number;
  warningCount: number;
  checkedAt: string;
  findings: ProductionFinding[];
}

interface HealthOverview {
  checkedAt: string;
  runtimeMode: string;
  runtimeStatus: HealthStatus;
  releaseReady: boolean;
  releaseGate: {
    configurationReady: boolean;
    runtimeReady: boolean;
    monitoringComplete: boolean;
  };
  api: {
    status: HealthStatus;
    latencyMs: number;
    uptimeSeconds: number;
  };
  summary: {
    up: number;
    degraded: number;
    down: number;
    unknown: number;
    productionBlockers: number;
    productionWarnings: number;
    monitoredComponents: number;
    missingProbes: number;
  };
  components: HealthComponent[];
  coverage: {
    expected: string[];
    monitored: string[];
    missingProbes: string[];
  };
  productionReadiness: ProductionReadiness;
}

const COMPONENT_META: Record<string, { ar: string; en: string; owner: string; href?: string; icon: typeof Server }> = {
  database: { ar: 'قاعدة البيانات', en: 'PostgreSQL / Prisma', owner: 'Core Infrastructure', icon: Database },
  redis: { ar: 'Redis وحالة التشغيل الموزع', en: 'Redis Runtime State', owner: 'Core Infrastructure', icon: Layers3 },
  'asset-platform': { ar: 'منصة الأصول والملفات', en: 'Enterprise Assets Platform', owner: 'Phase 05', icon: HardDrive },
  'import-foundation': { ar: 'مؤسسة الاستيراد', en: 'Import Foundation', owner: 'Phase 06', href: '/imports', icon: Import },
  'admin-auth': { ar: 'دخول وصلاحيات الإدارة', en: 'Admin Authentication', owner: 'Core Security / Phase 23', icon: ShieldCheck },
  'ai-providers': { ar: 'مزودات الذكاء الاصطناعي', en: 'AI Provider Capability', owner: 'Phase 17', href: '/ai', icon: Bot },
  'payment-gateway': { ar: 'بوابة الدفع', en: 'Payment Gateway', owner: 'Phase 19', href: '/finance', icon: CreditCard },
  notifications: { ar: 'الإشعارات والتنبيهات', en: 'Notifications Runtime', owner: 'Core Platform', icon: Bell },
  'background-jobs': { ar: 'المهام الخلفية', en: 'Background Jobs', owner: 'Core Platform', icon: Workflow },
  'database-schema': { ar: 'تزامن مخطط قاعدة البيانات', en: 'Database Schema / Migration State', owner: 'Core Infrastructure', icon: Database },
  'public-web': { ar: 'المنصة العامة', en: 'Public Web Reachability', owner: 'Phase 24', icon: Server },
};

export function AdminHealthReadinessPage() {
  const [overview, setOverview] = useState<HealthOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [selectedComponent, setSelectedComponent] = useState<HealthComponent | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApiClient.request<HealthOverview>('/admin/monitoring/overview');
      setOverview(data);
    } catch (requestError) {
      setOverview(null);
      setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل حالة النظام.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const database = overview?.components.find((component) => component.id === 'database');
  const redis = overview?.components.find((component) => component.id === 'redis');
  const activeFindings = useMemo(() => {
    if (!overview) return [] as Array<{ id: string; severity: Severity; title: string; detail: string; source: string }>;
    const runtimeFindings = overview.components
      .filter((component) => component.status !== 'UP')
      .map((component) => ({
        id: `runtime:${component.id}`,
        severity: component.status === 'DOWN' ? 'BLOCKER' as const : 'WARNING' as const,
        title: componentLabel(component.id).ar,
        detail: component.error || `حالة المكون: ${component.status}`,
        source: 'Runtime',
      }));
    const releaseFindings = overview.productionReadiness.findings
      .filter((finding) => finding.severity !== 'INFO')
      .map((finding) => ({
        id: `release:${finding.id}`,
        severity: finding.severity,
        title: finding.message,
        detail: finding.recommendation,
        source: finding.area,
      }));
    const coverageFindings = overview.coverage.missingProbes.map((probeId) => ({
      id: `coverage:${probeId}`,
      severity: 'BLOCKER' as const,
      title: `فحص مراقبة غير موصول: ${componentLabel(probeId).ar}`,
      detail: 'بوابة الإطلاق لا تعتبر التغطية مكتملة حتى يصبح لهذا المكون Probe حقيقي مسجل في الـBackend.',
      source: 'Monitoring Coverage',
    }));
    return [...runtimeFindings, ...releaseFindings, ...coverageFindings];
  }, [overview]);

  const copyReport = async () => {
    if (!overview) return;
    const text = diagnosticText(overview);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadReport = () => {
    if (!overview) return;
    const blob = new Blob([JSON.stringify(overview, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `manaratak-health-readiness-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full space-y-6 font-sans text-[#203442]" dir="rtl">
      <section
        className="overflow-hidden rounded-[28px] border border-[#c9dde1] bg-gradient-to-br from-[#142B5F] to-[#0E7C86] shadow-sm"
      >
        <div className="flex flex-col gap-5 p-6 text-white lg:flex-row lg:items-center lg:justify-between lg:p-8">
          <div className="max-w-3xl">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">مركز التشغيل والجاهزية</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono">{overview?.runtimeMode || '—'}</span>
            </div>
            <h1 className="text-2xl font-black md:text-3xl">صحة وجاهزية النظام</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">
              قراءة تشغيلية حقيقية وغير تدميرية لحالة الـAPI وقاعدة البيانات والبنية التشغيلية، مع بوابة منفصلة لجاهزية الإطلاق. لا تعرض هذه الصفحة أسرارًا ولا تنفذ إعادة ضبط أو حذفًا أو تدوير مفاتيح.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#142B5F] shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              إعادة الفحص
            </button>
            <button
              onClick={() => void copyReport()}
              disabled={!overview}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              <Copy className="h-4 w-4" />
              {copied ? 'تم النسخ' : 'نسخ الملخص'}
            </button>
            <button
              onClick={downloadReport}
              disabled={!overview}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              تقرير JSON
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-black">تعذر الحصول على لقطة التشغيل</div>
            <div className="mt-1">{error}</div>
          </div>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label="حالة التشغيل"
          value={loading ? '...' : statusArabic(overview?.runtimeStatus)}
          hint="Runtime Health"
          icon={Activity}
          tone={statusTone(overview?.runtimeStatus)}
        />
        <MetricCard
          label="بوابة الإطلاق"
          value={loading ? '...' : overview?.releaseReady ? 'جاهز' : overview ? 'غير جاهز' : '—'}
          hint="Configuration + Runtime + Coverage"
          icon={ShieldCheck}
          tone={overview?.releaseReady ? 'good' : overview ? 'bad' : 'neutral'}
        />
        <MetricCard
          label="استجابة API"
          value={overview ? `${overview.api.latencyMs} ms` : '—'}
          hint={`Uptime ${formatDuration(overview?.api.uptimeSeconds)}`}
          icon={Server}
          tone={statusTone(overview?.api.status)}
        />
        <MetricCard
          label="قاعدة البيانات"
          value={database?.latencyMs != null ? `${database.latencyMs} ms` : statusArabic(database?.status)}
          hint={database?.capabilityStatus || 'PostgreSQL / Prisma'}
          icon={Database}
          tone={statusTone(database?.status)}
        />
        <MetricCard
          label="Redis"
          value={statusArabic(redis?.status)}
          hint={redis?.capabilityStatus || 'Runtime State'}
          icon={Layers3}
          tone={statusTone(redis?.status)}
        />
        <MetricCard
          label="تغطية المراقبة"
          value={overview ? `${overview.summary.monitoredComponents}/${overview.coverage.expected.length}` : '—'}
          hint={overview?.summary.missingProbes ? `${overview.summary.missingProbes} فحص غير موصول` : 'المكونات المتوقعة'}
          icon={Gauge}
          tone={overview?.summary.missingProbes ? 'warn' : overview ? 'good' : 'neutral'}
        />
      </section>

      <nav className="flex flex-wrap gap-1 rounded-2xl border border-[#d7e6e8] bg-white p-1.5 shadow-sm">
        <TabButton active={activeTab === 'OVERVIEW'} onClick={() => setActiveTab('OVERVIEW')} label="نظرة عامة" count={activeFindings.length} />
        <TabButton active={activeTab === 'COMPONENTS'} onClick={() => setActiveTab('COMPONENTS')} label="المكونات" count={overview?.components.length} />
        <TabButton active={activeTab === 'RELEASE'} onClick={() => setActiveTab('RELEASE')} label="جاهزية الإطلاق" count={overview?.productionReadiness.findings.length} />
        <TabButton active={activeTab === 'COVERAGE'} onClick={() => setActiveTab('COVERAGE')} label="تغطية المراقبة" count={overview?.coverage.missingProbes.length} />
        <TabButton active={activeTab === 'REPORT'} onClick={() => setActiveTab('REPORT')} label="التقرير التشخيصي" />
      </nav>

      {loading && !overview ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border bg-white">
          <RefreshCw className="h-7 w-7 animate-spin text-[#0E7C86]" />
        </div>
      ) : null}

      {overview && activeTab === 'OVERVIEW' && (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <section className="rounded-2xl border border-[#d7e6e8] bg-white shadow-sm">
            <SectionHeader title="المشكلات النشطة" subtitle="مشتقة من الفحوصات الحالية وبوابة الإطلاق؛ ليست حوادث تجريبية أو سجلات مصطنعة." />
            <div className="divide-y">
              {activeFindings.length ? activeFindings.map((finding) => (
                <div key={finding.id} className="grid gap-3 p-4 md:grid-cols-[110px_1fr]">
                  <SeverityBadge severity={finding.severity} />
                  <div>
                    <div className="font-black">{finding.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">{finding.detail}</div>
                    <div className="mt-2 text-xs font-bold text-[#0E7C86]">{finding.source}</div>
                  </div>
                </div>
              )) : (
                <EmptyState icon={CheckCircle2} title="لا توجد مشكلات تشغيلية نشطة" detail="الفحوصات الحالية لا تعرض تحذيرات أو معوقات إطلاق." />
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#d7e6e8] bg-white shadow-sm">
            <SectionHeader title="ملخص آخر فحص" subtitle="الوقت والحالة مأخوذان من API الحالي، وليس من قيم ثابتة." />
            <div className="space-y-3 p-5 text-sm">
              <InfoRow label="آخر فحص" value={formatDate(overview.checkedAt)} />
              <InfoRow label="حالة API" value={statusArabic(overview.api.status)} />
              <InfoRow label="مكونات سليمة" value={String(overview.summary.up)} />
              <InfoRow label="مكونات متدهورة" value={String(overview.summary.degraded)} />
              <InfoRow label="مكونات متوقفة" value={String(overview.summary.down)} />
              <InfoRow label="معوقات الإنتاج" value={String(overview.summary.productionBlockers)} />
              <InfoRow label="تحذيرات الإنتاج" value={String(overview.summary.productionWarnings)} />
              <InfoRow label="فحوصات غير موصولة" value={String(overview.summary.missingProbes)} />
            </div>
          </section>
        </div>
      )}

      {overview && activeTab === 'COMPONENTS' && (
        <section className="overflow-hidden rounded-2xl border border-[#d7e6e8] bg-white shadow-sm">
          <SectionHeader title="حالة مكونات المنظومة" subtitle="تُعرض فقط الحالات التي يملك الـBackend فحصًا أو Capability Probe حقيقيًا لها." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-[#FAF7F0]">
                <tr className="text-right text-xs font-black text-slate-600">
                  <th className="px-5 py-3">المكون</th>
                  <th className="px-5 py-3">المالك</th>
                  <th className="px-5 py-3">الحالة</th>
                  <th className="px-5 py-3">Capability</th>
                  <th className="px-5 py-3">Latency</th>
                  <th className="px-5 py-3">آخر فحص</th>
                  <th className="px-5 py-3">إجراء آمن</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {overview.components.map((component) => {
                  const meta = componentLabel(component.id);
                  const Icon = meta.icon;
                  return (
                    <tr key={component.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="rounded-xl bg-[#DDEFF2] p-2 text-[#0E7C86]"><Icon className="h-4 w-4" /></span>
                          <div><div className="font-black">{meta.ar}</div><div className="text-xs text-slate-500">{meta.en}</div></div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-600">{meta.owner}</td>
                      <td className="px-5 py-4"><StatusBadge status={component.status} optional={component.optional} /></td>
                      <td className="px-5 py-4 font-mono text-xs">{component.capabilityStatus || '—'}</td>
                      <td className="px-5 py-4 font-mono text-xs">{component.latencyMs != null ? `${component.latencyMs} ms` : '—'}</td>
                      <td className="px-5 py-4 text-xs text-slate-500">{formatDate(component.checkedAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedComponent(component)} className="rounded-lg border px-3 py-1.5 text-xs font-bold hover:bg-slate-50">التفاصيل</button>
                          {meta.href && <Link to={meta.href} className="inline-flex items-center gap-1 rounded-lg bg-[#DDEFF2] px-3 py-1.5 text-xs font-bold text-[#0E7C86]">فتح القسم <ExternalLink className="h-3 w-3" /></Link>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {overview && activeTab === 'RELEASE' && (
        <section className="overflow-hidden rounded-2xl border border-[#d7e6e8] bg-white shadow-sm">
          <SectionHeader
            title="بوابة جاهزية الإنتاج"
            subtitle={`آخر تقييم: ${formatDate(overview.productionReadiness.checkedAt)} — هذه النتائج Sanitized ولا تحتوي قيم ENV السرية.`}
          />
          <div className={`border-b p-5 ${overview.releaseReady ? 'bg-emerald-50' : 'bg-orange-50'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-black">{overview.releaseReady ? 'جاهز للإطلاق من ناحية البوابة الشاملة' : 'الإطلاق محجوب حتى اكتمال التكوين والتشغيل والتغطية'}</div>
                <div className="mt-1 text-sm text-slate-600">{overview.productionReadiness.blockerCount} معوق • {overview.productionReadiness.warningCount} تحذير</div>
              </div>
              <StatusBadge status={overview.releaseReady ? 'UP' : 'DOWN'} />
            </div>
          </div>
          <div className="grid gap-3 border-b p-5 md:grid-cols-3">
            <GateCheck label="إعدادات الإنتاج" ready={overview.releaseGate.configurationReady} detail="Production configuration validator" />
            <GateCheck label="جاهزية التشغيل" ready={overview.releaseGate.runtimeReady} detail="Required runtime health probes" />
            <GateCheck label="اكتمال المراقبة" ready={overview.releaseGate.monitoringComplete} detail="All expected probes are registered" />
          </div>
          <div className="divide-y">
            {overview.productionReadiness.findings.length ? overview.productionReadiness.findings.map((finding) => (
              <div key={finding.id} className="grid gap-4 p-5 lg:grid-cols-[120px_180px_1fr]">
                <SeverityBadge severity={finding.severity} />
                <div className="text-xs font-black text-[#0E7C86]">{finding.area}</div>
                <div>
                  <div className="font-black">{finding.message}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">{finding.recommendation}</div>
                  <div className="mt-2 font-mono text-[11px] text-slate-400">{finding.id}</div>
                </div>
              </div>
            )) : <EmptyState icon={CheckCircle2} title="لا توجد نتائج مانعة" detail="بوابة التكوين لا تعرض معوقات أو تحذيرات حاليًا." />}
          </div>
        </section>
      )}

      {overview && activeTab === 'COVERAGE' && (
        <section className="rounded-2xl border border-[#d7e6e8] bg-white shadow-sm">
          <SectionHeader title="تغطية المراقبة" subtitle="الهدف هنا كشف النقص، لا إخفاؤه. عدم وجود Probe يظهر صراحة كفجوة مراقبة." />
          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            {overview.coverage.expected.map((id) => {
              const monitored = overview.coverage.monitored.includes(id);
              const meta = componentLabel(id);
              const Icon = meta.icon;
              return (
                <div key={id} className={`rounded-2xl border p-4 ${monitored ? 'border-[#b7ddd8] bg-[#f1fbfa]' : 'border-[#f2d39a] bg-[#fffaf0]'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${monitored ? 'text-[#0E7C86]' : 'text-[#D6A43B]'}`} /><span className="font-black">{meta.ar}</span></div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${monitored ? 'bg-[#d9f2ee] text-[#0E7C86]' : 'bg-[#fff0ca] text-[#946b13]'}`}>{monitored ? 'MONITORED' : 'NOT MONITORED'}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{meta.en}</div>
                </div>
              );
            })}
          </div>
          {overview.coverage.missingProbes.length > 0 && (
            <div className="m-5 mt-0 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-black">فجوات يجب ألا تُفسّر كحالة سليمة</div>
              <div className="mt-1 leading-6">{overview.coverage.missingProbes.map((id) => componentLabel(id).ar).join('، ')}</div>
            </div>
          )}
        </section>
      )}

      {overview && activeTab === 'REPORT' && (
        <section className="rounded-2xl border border-[#d7e6e8] bg-white shadow-sm">
          <SectionHeader title="التقرير التشخيصي" subtitle="نسخة Sanitized صالحة للنسخ أو التصدير. لا تتضمن كلمات مرور أو Tokens أو Connection Strings." />
          <div className="flex flex-wrap gap-2 border-b p-4">
            <button onClick={() => void copyReport()} className="inline-flex items-center gap-2 rounded-xl bg-[#DDEFF2] px-4 py-2 text-sm font-bold text-[#0E7C86]"><Copy className="h-4 w-4" />{copied ? 'تم النسخ' : 'نسخ الملخص'}</button>
            <button onClick={downloadReport} className="inline-flex items-center gap-2 rounded-xl bg-[#142B5F] px-4 py-2 text-sm font-bold text-white"><FileJson className="h-4 w-4" />تنزيل JSON</button>
          </div>
          <pre dir="ltr" className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words bg-[#0f1f36] p-5 text-left font-mono text-xs leading-6 text-[#dcecf0]">{diagnosticText(overview)}</pre>
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-2">
        <Link to="/review-queue" className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-black">جاهزية المحتوى والنشر</div>
              <p className="mt-1 text-sm leading-6 text-slate-500">مشكلات اكتمال المنح والجامعات والتخصصات والدورات والاختبارات والخدمات وCMS تبقى عند المجالات المالكة وتُجمع في قائمة المراجعة، ولا تُكرر داخل صحة التشغيل.</p>
            </div>
            <ClipboardCheck className="h-5 w-5 shrink-0 text-[#0E7C86]" />
          </div>
        </Link>
        <Link to="/certificates" className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-black">جاهزية الشهادات</div>
              <p className="mt-1 text-sm leading-6 text-slate-500">حالة القالب والجهة المصدرة والتوقيع وRenderer وإصدار الشهادة تُدار داخل مجال الشهادات؛ هذا القسم يراقب البنية ولا يتجاوز ملكية P14.</p>
            </div>
            <ShieldCheck className="h-5 w-5 shrink-0 text-[#D6A43B]" />
          </div>
        </Link>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-[#d6c18c] bg-[#FAF7F0] p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#D6A43B]" />
        <div>
          <div className="font-black">حدود القسم</div>
          <p className="mt-1 leading-6 text-slate-600">هذه الصفحة للمراقبة والتشخيص فقط. إصلاح البيانات، إعادة تشغيل دفعات الاستيراد، تغيير إعدادات الأمن، إدارة المفاتيح، أو تنفيذ عمليات مالية يتم من القسم المالك وبصلاحياته.</p>
        </div>
      </div>

      {selectedComponent && (
        <ComponentDrawer component={selectedComponent} onClose={() => setSelectedComponent(null)} />
      )}
    </div>
  );
}

function GateCheck({ label, ready, detail }: { label: string; ready: boolean; detail: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${ready ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-black">{label}</div>
          <div className="mt-1 text-xs text-slate-500">{detail}</div>
        </div>
        {ready ? <CheckCircle2 className="h-5 w-5 text-emerald-700" /> : <XCircle className="h-5 w-5 text-rose-700" />}
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint: string; icon: typeof Activity; tone: 'good' | 'warn' | 'bad' | 'neutral' }) {
  const palette = tone === 'good'
    ? 'border-[#b9e1d6] bg-[#effaf7] text-[#0E7C86]'
    : tone === 'warn'
      ? 'border-[#f0d49c] bg-[#fff9eb] text-[#D6A43B]'
      : tone === 'bad'
        ? 'border-[#efc1c1] bg-[#fff4f4] text-[#b42318]'
        : 'border-[#dce4ea] bg-[#f8fafc] text-[#142B5F]';
  return <div className={`rounded-2xl border p-4 shadow-sm ${palette}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-500">{label}</span><Icon className="h-4 w-4" /></div><div className="mt-2 text-xl font-black text-[#203442]">{value}</div><div className="mt-1 truncate text-[11px] text-slate-500">{hint}</div></div>;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="border-b p-5"><h2 className="text-lg font-black">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p></div>;
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return <button onClick={onClick} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${active ? 'bg-[#142B5F] text-white' : 'text-[#203442]'}`}>{label}{count != null ? <span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-white/15 text-white' : 'bg-[#DDEFF2] text-[#0E7C86]'}`}>{count}</span> : null}</button>;
}

function StatusBadge({ status, optional }: { status: HealthStatus; optional?: boolean }) {
  const map = status === 'UP' ? { tone: 'bg-[#dcf5ec] text-[#08745d]', icon: CheckCircle2 } : status === 'DEGRADED' ? { tone: 'bg-[#fff0ca] text-[#946b13]', icon: AlertTriangle } : status === 'DOWN' ? { tone: 'bg-[#fee4e2] text-[#b42318]', icon: XCircle } : { tone: 'bg-[#eef2f6] text-[#536273]', icon: CircleHelp };
  const Icon = map.icon;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${map.tone}`}><Icon className="h-3.5 w-3.5" />{statusArabic(status)}{optional ? ' • اختياري' : ''}</span>;
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const map = severity === 'BLOCKER' ? { tone: 'bg-[#fee4e2] text-[#b42318]', label: 'معوق' } : severity === 'WARNING' ? { tone: 'bg-[#fff0ca] text-[#946b13]', label: 'تحذير' } : { tone: 'bg-[#DDEFF2] text-[#0E7C86]', label: 'معلومة' };
  return <span className={`h-fit w-fit rounded-full px-3 py-1 text-xs font-black ${map.tone}`}>{map.label}</span>;
}

function EmptyState({ icon: Icon, title, detail }: { icon: typeof Activity; title: string; detail: string }) {
  return <div className="flex flex-col items-center justify-center p-10 text-center"><span className="rounded-2xl bg-[#DDEFF2] p-3 text-[#0E7C86]"><Icon className="h-6 w-6" /></span><div className="mt-3 font-black">{title}</div><div className="mt-1 max-w-lg text-sm leading-6 text-slate-500">{detail}</div></div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl bg-[#FAF7F0] px-3 py-2.5"><span className="text-slate-500">{label}</span><span className="font-black">{value}</span></div>;
}

function ComponentDrawer({ component, onClose }: { component: HealthComponent; onClose: () => void }) {
  const meta = componentLabel(component.id);
  const entries = Object.entries(component.details || {});
  return <div className="fixed inset-0 z-50 flex bg-slate-950/35 font-sans" dir="rtl" onMouseDown={onClose}><aside className="mr-auto h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="sticky top-0 flex items-start justify-between gap-4 border-b bg-white p-5"><div><div className="text-xl font-black">{meta.ar}</div><div className="mt-1 text-xs text-slate-500">{meta.en} • {meta.owner}</div></div><button onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm font-bold">إغلاق</button></div><div className="space-y-5 p-5"><div className="flex flex-wrap gap-2"><StatusBadge status={component.status} optional={component.optional} />{component.capabilityStatus && <span className="rounded-full bg-[#DDEFF2] px-3 py-1 text-xs font-bold text-[#0E7C86]">{component.capabilityStatus}</span>}</div>{component.error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="font-black">التشخيص</div><div className="mt-1 font-mono text-xs">{component.error}</div></div>}<div className="grid gap-3 sm:grid-cols-2"><InfoRow label="آخر فحص" value={formatDate(component.checkedAt)} /><InfoRow label="Latency" value={component.latencyMs != null ? `${component.latencyMs} ms` : '—'} /></div><div><div className="mb-2 font-black">تفاصيل آمنة</div>{entries.length ? <div className="divide-y rounded-xl border">{entries.map(([key, value]) => <div key={key} className="grid grid-cols-[150px_1fr] gap-3 p-3 text-xs"><span className="font-mono text-slate-500">{key}</span><span className="break-all font-bold">{displayValue(value)}</span></div>)}</div> : <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">لا توجد تفاصيل إضافية من الفحص الحالي.</div>}</div>{meta.href && <Link to={meta.href} className="inline-flex items-center gap-2 rounded-xl bg-[#0E7C86] px-4 py-2.5 text-sm font-bold text-white">فتح القسم المالك <ExternalLink className="h-4 w-4" /></Link>}</div></aside></div>;
}

function componentLabel(id: string) {
  return COMPONENT_META[id] || { ar: id, en: id, owner: 'Platform', icon: Server };
}

function statusArabic(status?: HealthStatus) {
  if (status === 'UP') return 'سليم';
  if (status === 'DEGRADED') return 'متدهور';
  if (status === 'DOWN') return 'متوقف';
  return 'غير معروف';
}

function statusTone(status?: HealthStatus): 'good' | 'warn' | 'bad' | 'neutral' {
  if (status === 'UP') return 'good';
  if (status === 'DEGRADED') return 'warn';
  if (status === 'DOWN') return 'bad';
  return 'neutral';
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ar-YE', { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
}

function formatDuration(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds)) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}س ${minutes}د`;
}

function displayValue(value: unknown) {
  if (value == null) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  try { return JSON.stringify(value); } catch { return '—'; }
}

function diagnosticText(overview: HealthOverview) {
  const lines = [
    'MANARATAK — Health & Readiness Diagnostic Summary',
    `Checked At: ${overview.checkedAt}`,
    `Runtime Mode: ${overview.runtimeMode}`,
    `Runtime Status: ${overview.runtimeStatus}`,
    `Release Ready: ${overview.releaseReady}`,
    `Release Gate: configuration=${overview.releaseGate.configurationReady}, runtime=${overview.releaseGate.runtimeReady}, monitoring=${overview.releaseGate.monitoringComplete}`,
    `API: ${overview.api.status} (${overview.api.latencyMs}ms)`,
    `Components: UP=${overview.summary.up}, DEGRADED=${overview.summary.degraded}, DOWN=${overview.summary.down}, UNKNOWN=${overview.summary.unknown}`,
    `Production Gate: blockers=${overview.summary.productionBlockers}, warnings=${overview.summary.productionWarnings}`,
    `Monitoring Coverage: ${overview.summary.monitoredComponents}/${overview.coverage.expected.length}`,
    '',
    'Components:',
    ...overview.components.map((component) => `- ${component.id}: ${component.status}; capability=${component.capabilityStatus || 'N/A'}; latency=${component.latencyMs ?? 'N/A'}ms; error=${component.error || 'none'}`),
    '',
    'Release Findings:',
    ...(overview.productionReadiness.findings.length ? overview.productionReadiness.findings.map((finding) => `- [${finding.severity}] ${finding.area}: ${finding.message} -> ${finding.recommendation}`) : ['- none']),
    '',
    `Missing Probes: ${overview.coverage.missingProbes.length ? overview.coverage.missingProbes.join(', ') : 'none'}`,
  ];
  return lines.join('\n');
}
