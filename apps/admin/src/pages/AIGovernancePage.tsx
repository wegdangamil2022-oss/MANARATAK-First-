import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Activity, AlertTriangle, BarChart3, Bot, Boxes, BrainCircuit, ChevronLeft, CircleDollarSign, Database, FileCode2, Gauge, Layers3, Loader2, PlayCircle, RefreshCw, Route, Save, ShieldCheck, Sparkles, UsersRound, Workflow } from 'lucide-react';
import { adminApiClient } from '../api/client';

type ResourceKey = 'providers' | 'models' | 'modelPrices' | 'capabilities' | 'routingPolicies' | 'prompts' | 'guardrails' | 'consumers' | 'workflows' | 'evaluations' | 'knowledgeIndexes' | 'knowledgeSources' | 'incidents' | 'platformSettings';
type SectionKey = 'overview' | 'executions' | 'playground' | ResourceKey;
interface RegistryRecord { id?: string; key: string; status?: string; displayName?: string; displayNameAr?: string; displayNameEn?: string; operationalStatus?: string; [key: string]: unknown }
interface ExecutionRecord { publicId: string; status: string; purpose: string; providerKey?: string | null; modelKey?: string | null; safetyDecision: string; inputTokens: number; outputTokens: number; createdAt: string }
interface Overview { overallStatus: string; providers: Record<string, number>; activeModels: number; activePrompts: number; executionsToday: number; blockedToday: number; costMonthToDate: number; currency: string; openIncidents: number }
interface QueueStatus { queued: number; running: number; retrying: number; failed: number; deadLetter: number; oldestQueuedAt: string | null }
interface AsyncJob { publicId: string; consumerKey: string; capabilityKey: string; status: string; attempts: number; maxAttempts: number; createdAt: string; errorCode?: string | null }

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
  const params = useParams<{ section?: string }>();
  const active = sections.some((item) => item.key === params.section) ? params.section as SectionKey : 'overview';
  const selected = sections.find((item) => item.key === active) ?? sections[0];
  return <div dir="rtl" className="mx-auto max-w-[1600px] overflow-hidden rounded-[28px] border border-[#0E7C86]/15 bg-white shadow-sm">
    <header className="relative overflow-hidden bg-gradient-to-l from-[#142B5F] via-[#142B5F] to-[#0E7C86] px-7 py-8 text-white">
      <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-white/10 px-3 py-1 text-xs text-white/80"><BrainCircuit className="h-4 w-4" /> Phase 17 · Provider-Neutral</div><h2 className="text-3xl font-black">مركز منارتك للذكاء الاصطناعي</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-white/80">حوكمة مركزية للمزوّدين والنماذج والتوجيه والموجّهات والسلامة والتكلفة والتقييم، دون تخزين أي مفاتيح سرية.</p></div><div className="rounded-2xl border border-emerald-300/20 bg-black/15 px-4 py-3 text-xs leading-6"><b>وضع التنفيذ الحالي</b><div>المزوّد غير المهيأ يظهر NOT_CONFIGURED — ولا يُعد فشلًا</div></div></div>
    </header>
    <div className="grid min-h-[720px] lg:grid-cols-[275px_1fr]"><aside className="border-l border-[#0E7C86]/15 bg-[#FAF7F0] p-4">{[...new Set(sections.map((item) => item.group))].map((group) => <div key={group} className="mb-5"><div className="mb-2 px-3 text-[11px] font-bold text-[#142B5F]/60">{group}</div><nav className="space-y-1">{sections.filter((item) => item.group === group).map((item) => <Link key={item.key} to={`/ai/${item.key}`} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active === item.key ? 'bg-[#142B5F] text-white shadow-md' : 'text-slate-700 hover:bg-[#0E7C86]/10'}`}><span className="[&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>{item.label}</Link>)}</nav></div>)}</aside>
      <main className="min-w-0 bg-slate-50/60 p-5 lg:p-8"><div className="mb-6 flex items-center gap-3 text-slate-500"><span className="text-sm">مركز الذكاء الاصطناعي</span><ChevronLeft className="h-4 w-4" /><h3 className="font-bold text-slate-900">{selected.label}</h3></div>{active === 'overview' ? <OverviewPanel /> : active === 'executions' ? <ExecutionsPanel /> : active === 'playground' ? <PlaygroundPanel /> : active === 'workflows' ? <WorkflowsPanel /> : active === 'prompts' ? <PromptsPanel /> : <RegistryPanel resource={active as ResourceKey} title={selected.label} />}</main>
    </div>
  </div>;
}

function OverviewPanel() {
  const [data, setData] = useState<Overview | null>(null); const [statuses, setStatuses] = useState<Array<{ key: string; status: string; capabilities: string[] }>>([]); const [error, setError] = useState('');
  const load = useCallback(async () => { setError(''); try { const [overview, providers] = await Promise.all([adminApiClient.request<Overview>('/admin/ai/overview'), adminApiClient.request<{ data: typeof statuses }>('/admin/ai/provider-statuses')]); setData(overview); setStatuses(providers.data); } catch (cause) { setError(errorMessage(cause)); } }, []);
  useEffect(() => { void load(); }, [load]);
  if (!data && !error) return <Loading />;
  return <div className="space-y-6">{error ? <ErrorBanner message={error} /> : null}{data ? <div className="flex items-center justify-between rounded-2xl border border-[#0E7C86]/15 bg-white p-4"><span className="font-black">الحالة التشغيلية العامة</span><StatusBadge value={data.overallStatus} /></div> : null}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="تنفيذات اليوم" value={data?.executionsToday ?? '—'} icon={<PlayCircle />} /><Metric label="النماذج النشطة" value={data?.activeModels ?? '—'} icon={<Bot />} /><Metric label="المحجوب اليوم" value={data?.blockedToday ?? '—'} icon={<ShieldCheck />} /><Metric label="تكلفة الشهر" value={data ? `${data.costMonthToDate} ${data.currency}` : 'UNKNOWN'} icon={<CircleDollarSign />} /></div><Panel title="جاهزية المزوّدين" subtitle="تُحسب من مراجع البيئة، ولا تُعاد قيمة السر إلى الخادم أو المتصفح."><div className="mb-4 flex justify-end"><button onClick={() => void load()} className="action-secondary"><RefreshCw className="h-4 w-4" /> تحديث</button></div><div className="grid gap-3 md:grid-cols-3">{statuses.map((provider) => <div key={provider.key} className="rounded-xl border p-4"><div className="flex items-center justify-between"><strong>{provider.key}</strong><StatusBadge value={provider.status} /></div><p className="mt-3 text-xs text-slate-500">{provider.capabilities.join(' · ')}</p></div>)}</div>{statuses.length === 0 ? <Empty text="لا توجد adapters مسجلة في التشغيل الحالي." /> : null}</Panel></div>;
}

function PlaygroundPanel() {
  const [capabilityKey, setCapabilityKey] = useState('');
  const [input, setInput] = useState('');
  const [classification, setClassification] = useState('INTERNAL');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setRunning(true); setError(''); setResult(null);
    try {
      setResult(await adminApiClient.request('/admin/ai/playground/execute', {
        method: 'POST',
        body: JSON.stringify({ capabilityKey, input, locale: 'ar', dataClassification: classification, idempotencyKey: crypto.randomUUID() }),
      }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setRunning(false);
    }
  };
  return <div className="grid gap-5 xl:grid-cols-2"><Panel title="مختبر التنفيذ المحكوم" subtitle="يرسل Capability Request حقيقية؛ لا يختار موجهًا أو نموذجًا أو مزودًا."><form onSubmit={submit} className="space-y-4"><Field label="مفتاح القدرة"><input required value={capabilityKey} onChange={(event) => setCapabilityKey(event.target.value)} className="input" dir="ltr" /></Field><Field label="تصنيف البيانات"><select value={classification} onChange={(event) => setClassification(event.target.value)} className="input"><option>PUBLIC</option><option>INTERNAL</option><option>CONFIDENTIAL</option></select></Field><Field label="المدخل"><textarea required value={input} onChange={(event) => setInput(event.target.value)} rows={10} maxLength={20000} className="input" /></Field>{error ? <ErrorBanner message={error} /> : null}<button disabled={running} className="action-primary w-full justify-center">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />} تشغيل عبر Phase 17</button></form></Panel><Panel title="النتيجة والتتبّع" subtitle="عند غياب الإعداد سيظهر NOT_CONFIGURED كحالة حقيقية.">{result ? <pre className="max-h-[620px] overflow-auto rounded-xl bg-slate-950 p-4 text-left text-xs text-white/80" dir="ltr">{JSON.stringify(result, null, 2)}</pre> : <Empty text="لم يُنفذ اختبار بعد." />}</Panel></div>;
}

function ExecutionsPanel() {
  const [page, setPage] = useState<{ data: ExecutionRecord[]; total: number } | null>(null); const [error, setError] = useState('');
  const load = useCallback(async () => { setError(''); try { setPage(await adminApiClient.request('/admin/ai/executions?page=1&pageSize=50')); } catch (cause) { setError(errorMessage(cause)); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <Panel title="التنفيذ والتتبّع" subtitle="كل طلب له هوية عامة وTrace ID وحالة أمان واستهلاك حقيقي."><div className="mb-4 flex justify-end"><button onClick={() => void load()} className="action-secondary"><RefreshCw className="h-4 w-4" /> تحديث</button></div>{error ? <ErrorBanner message={error} /> : !page ? <Loading /> : page.data.length === 0 ? <Empty text="لا توجد تنفيذات بعد. لن تُعرض بيانات تجريبية." /> : <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="p-3">المعرّف</th><th className="p-3">الحالة</th><th className="p-3">الغرض</th><th className="p-3">المزوّد / النموذج</th><th className="p-3">الأمان</th><th className="p-3">الاستهلاك</th><th className="p-3">الوقت</th></tr></thead><tbody>{page.data.map((item) => <tr key={item.publicId} className="border-b border-slate-100"><td className="p-3 font-mono text-xs">{item.publicId}</td><td className="p-3"><StatusBadge value={item.status} /></td><td className="p-3">{item.purpose}</td><td className="p-3">{item.providerKey ?? '—'}<div className="text-xs text-slate-500">{item.modelKey ?? '—'}</div></td><td className="p-3">{item.safetyDecision}</td><td className="p-3">{item.inputTokens + item.outputTokens} token</td><td className="p-3 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString('ar')}</td></tr>)}</tbody></table></div>}</Panel>;
}

function WorkflowsPanel() {
  const [queue, setQueue] = useState<QueueStatus | null>(null);
  const [jobs, setJobs] = useState<AsyncJob[]>([]);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try { const [status, page] = await Promise.all([adminApiClient.request<QueueStatus>('/admin/ai/async-queue/status'), adminApiClient.request<{ data: AsyncJob[] }>('/admin/ai/async-queue/jobs?page=1&pageSize=25')]); setQueue(status); setJobs(page.data); }
    catch (cause) { setError(errorMessage(cause)); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const operate = async (job: AsyncJob, action: 'RETRY' | 'CANCEL') => { if (!window.confirm(action === 'RETRY' ? 'هل تريد إعادة هذه المهمة يدويًا؟' : 'هل تريد إلغاء هذه المهمة؟')) return; setError(''); try { await adminApiClient.request(`/admin/ai/async-queue/jobs/${job.publicId}/${action}`, { method: 'POST', body: JSON.stringify({ confirmed: true }) }); await load(); } catch (cause) { setError(errorMessage(cause)); } };
  return <div className="space-y-6"><Panel title="طابور التنفيذ غير المتزامن" subtitle="حالة حقيقية من التخزين الدائم؛ الحمولة مشفرة بمفتاح بيئة ولا تظهر للواجهة."><div className="mb-4 flex justify-end"><button onClick={() => void load()} className="action-secondary"><RefreshCw className="h-4 w-4" /> تحديث</button></div>{error ? <ErrorBanner message={error} /> : !queue ? <Loading /> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="بانتظار التنفيذ" value={queue.queued} icon={<Workflow />} /><Metric label="قيد التنفيذ" value={queue.running} icon={<Activity />} /><Metric label="إعادة المحاولة" value={queue.retrying} icon={<RefreshCw />} /><Metric label="فشل" value={queue.failed} icon={<AlertTriangle />} /><Metric label="Dead letter" value={queue.deadLetter} icon={<ShieldCheck />} /></div><div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-right text-xs text-slate-500"><th className="p-2">المهمة</th><th className="p-2">المستهلك / القدرة</th><th className="p-2">الحالة</th><th className="p-2">المحاولات</th><th className="p-2">الإجراء</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.publicId} className="border-b"><td className="p-2 font-mono text-xs">{job.publicId}</td><td className="p-2">{job.consumerKey}<div className="text-xs text-slate-500">{job.capabilityKey}</div></td><td className="p-2"><StatusBadge value={job.status} /></td><td className="p-2">{job.attempts}/{job.maxAttempts}</td><td className="p-2">{['FAILED', 'DEAD_LETTER'].includes(job.status) ? <button onClick={() => void operate(job, 'RETRY')} className="action-secondary">إعادة</button> : ['QUEUED', 'RETRYING'].includes(job.status) ? <button onClick={() => void operate(job, 'CANCEL')} className="action-secondary">إلغاء</button> : '—'}</td></tr>)}</tbody></table>{jobs.length === 0 ? <Empty text="لا توجد مهام غير متزامنة." /> : null}</div></>}</Panel><RegistryPanel resource="workflows" title="تعريفات سير العمل" /></div>;
}

function PromptsPanel() {
  const [promptKey, setPromptKey] = useState(''); const [version, setVersion] = useState(1); const [template, setTemplate] = useState(''); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false);
  const action = async (operation: 'create' | 'approve' | 'deploy') => { setSaving(true); setError(''); setMessage(''); try { if (operation === 'create') await adminApiClient.request(`/admin/ai/prompts/${encodeURIComponent(promptKey)}/versions`, { method: 'POST', body: JSON.stringify({ version, template, status: 'REVIEW' }) }); else if (operation === 'approve') await adminApiClient.request(`/admin/ai/prompts/${encodeURIComponent(promptKey)}/versions/${version}/approve`, { method: 'POST' }); else await adminApiClient.request(`/admin/ai/prompts/${encodeURIComponent(promptKey)}/deployments`, { method: 'POST', body: JSON.stringify({ version }) }); setMessage(operation === 'create' ? 'أُنشئ إصدار REVIEW.' : operation === 'approve' ? 'اعتمد المراجع الإصدار.' : 'نُشر الإصدار بعد اجتياز بوابات التقييم.'); } catch (cause) { setError(errorMessage(cause)); } finally { setSaving(false); } };
  return <div className="space-y-6"><RegistryPanel resource="prompts" title="سجل الموجّهات" /><Panel title="دورة حياة إصدار الموجّه" subtitle="الإنشاء والمراجعة والاعتماد والنشر عمليات منفصلة. لا يوجد نشر تلقائي، وتُفرض بوابات التقييم عند النشر."><div className="grid gap-4 lg:grid-cols-[1fr_140px]"><Field label="مفتاح الموجّه"><input value={promptKey} onChange={(event) => setPromptKey(event.target.value)} className="input" dir="ltr" /></Field><Field label="رقم الإصدار"><input type="number" min="1" value={version} onChange={(event) => setVersion(Number(event.target.value))} className="input" /></Field><div className="lg:col-span-2"><Field label="قالب النظام (لا تضع مدخل المستخدم داخل {{input}})"><textarea value={template} onChange={(event) => setTemplate(event.target.value)} rows={8} className="input font-mono text-xs" dir="ltr" /></Field></div></div>{error ? <ErrorBanner message={error} /> : null}{message ? <div className="my-4 rounded-xl bg-[#FAF7F0] p-3 text-sm text-[#142B5F]">{message}</div> : null}<div className="mt-4 flex flex-wrap gap-3"><button disabled={saving || !promptKey || !template} onClick={() => void action('create')} className="action-secondary">إنشاء REVIEW</button><button disabled={saving || !promptKey} onClick={() => void action('approve')} className="action-secondary">اعتماد الإصدار</button><button disabled={saving || !promptKey} onClick={() => void action('deploy')} className="action-primary">نشر الإصدار</button></div></Panel></div>;
}

function RegistryPanel({ resource, title }: { resource: ResourceKey; title: string }) {
  const [records, setRecords] = useState<RegistryRecord[] | null>(null); const [editing, setEditing] = useState<RegistryRecord | null>(null); const [error, setError] = useState('');
  const load = useCallback(async () => { setError(''); try { setRecords((await adminApiClient.request<{ data: RegistryRecord[] }>(`/admin/ai/${resource}`)).data); } catch (cause) { setError(errorMessage(cause)); } }, [resource]);
  useEffect(() => { setEditing(null); void load(); }, [load]);
  return <div className="grid gap-5 xl:grid-cols-[1fr_390px]"><Panel title={title} subtitle={resource === 'providers' ? 'سجّل مرجع البيئة فقط؛ لا توجد حقول لإدخال أو عرض API keys.' : 'إدارة حقيقية عبر Backend مع هوية ثابتة ودورة حياة واضحة.'}><div className="mb-4 flex justify-between"><span className="text-sm text-slate-500">{records?.length ?? 0} سجل</span><button onClick={() => setEditing({ key: '', status: 'DRAFT' })} className="action-primary"><Sparkles className="h-4 w-4" /> سجل جديد</button></div>{error ? <ErrorBanner message={error} /> : !records ? <Loading /> : records.length === 0 ? <Empty text="لا توجد سجلات. أنشئ أول سجل من النموذج الجانبي." /> : <div className="grid gap-3">{records.map((record) => <button key={record.key} onClick={() => setEditing(record)} className="flex items-center justify-between rounded-xl border bg-white p-4 text-right hover:border-emerald-300"><div><strong>{displayName(record)}</strong><div className="mt-1 font-mono text-xs text-slate-500">{record.key}</div></div><StatusBadge value={record.operationalStatus ?? record.status ?? 'DRAFT'} /></button>)}</div>}</Panel><RegistryEditor resource={resource} value={editing} onSaved={() => { setEditing(null); void load(); }} /></div>;
}

function RegistryEditor({ resource, value, onSaved }: { resource: ResourceKey; value: RegistryRecord | null; onSaved: () => void }) {
  const [key, setKey] = useState(''); const [status, setStatus] = useState('DRAFT'); const [name, setName] = useState(''); const [secretRef, setSecretRef] = useState(''); const [json, setJson] = useState('{}'); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => { setKey(value?.key ?? ''); setStatus(String(value?.status ?? 'DRAFT')); setName(String(value?.displayName ?? value?.displayNameAr ?? '')); setSecretRef(String(value?.secretReference ?? '')); const rest: Record<string, unknown> = value ? { ...value } : {}; ['id', 'key', 'status', 'displayName', 'displayNameAr', 'secretReference', 'operationalStatus'].forEach((field) => delete rest[field]); setJson(JSON.stringify(rest, null, 2)); setError(''); }, [value]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(''); try { await adminApiClient.request(`/admin/ai/${resource}/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ ...JSON.parse(json || '{}'), status, displayName: name, ...(resource === 'providers' ? { secretReference: secretRef } : {}) }) }); onSaved(); } catch (cause) { setError(errorMessage(cause)); } finally { setSaving(false); } };
  return <aside className="h-fit rounded-2xl border border-[#0E7C86]/15 bg-white p-5 shadow-sm"><h4 className="font-black">{value?.key ? 'تعديل السجل' : 'إنشاء سجل'}</h4><p className="mt-1 text-xs leading-6 text-slate-500">الحفظ عبر API الفعلي. المفتاح هو الهوية الثابتة.</p>{value ? <form onSubmit={submit} className="mt-5 space-y-4"><Field label="المفتاح"><input required disabled={Boolean(value.key)} value={key} onChange={(e) => setKey(e.target.value)} className="input" dir="ltr" /></Field><Field label="الاسم"><input required value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field><Field label="الحالة"><select value={status} onChange={(e) => setStatus(e.target.value)} className="input"><option>DRAFT</option><option>REVIEW</option><option>ACTIVE</option><option>INACTIVE</option><option>ARCHIVED</option></select></Field>{resource === 'providers' ? <Field label="مرجع secret في البيئة"><input required value={secretRef} onChange={(e) => setSecretRef(e.target.value.toUpperCase())} placeholder="PROVIDER_API_KEY" className="input" dir="ltr" /><span className="mt-1 block text-[11px] text-[#142B5F]">مرجع فقط؛ لا تُدخل قيمة المفتاح.</span></Field> : null}<Field label="الإعدادات المتقدمة (JSON)"><textarea value={json} onChange={(e) => setJson(e.target.value)} rows={11} className="input font-mono text-xs" dir="ltr" /></Field>{error ? <ErrorBanner message={error} /> : null}<button disabled={saving} className="action-primary w-full justify-center">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ آمن</button></form> : <Empty text="اختر سجلًا أو أنشئ سجلًا جديدًا." />}</aside>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5"><h4 className="text-lg font-black">{title}</h4><p className="mt-1 text-xs leading-6 text-slate-500">{subtitle}</p></div>{children}</section>; }
function Metric({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) { return <div className="rounded-2xl border border-[#0E7C86]/15 bg-white p-5 shadow-sm"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0E7C86]/10 text-[#142B5F] [&>svg]:h-5 [&>svg]:w-5">{icon}</div><div className="text-2xl font-black">{value}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>; }
function StatusBadge({ value }: { value: string }) { const good = ['ACTIVE', 'READY', 'COMPLETED', 'ALLOWED'].includes(value); const warn = ['DRAFT', 'REVIEW', 'NOT_CONFIGURED', 'RUNTIME_PENDING', 'QUEUED', 'RUNNING'].includes(value); return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${good ? 'bg-[#0E7C86]/10 text-[#142B5F]' : warn ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{value}</span>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-xs font-bold text-slate-700"><span className="mb-1.5 block">{label}</span>{children}</label>; }
function Loading() { return <div className="flex min-h-48 items-center justify-center text-[#142B5F]"><Loader2 className="h-7 w-7 animate-spin" /></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">{text}</div>; }
function ErrorBanner({ message }: { message: string }) { return <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{message}</div>; }
function displayName(record: RegistryRecord) { return String(record.displayNameAr ?? record.displayName ?? record.displayNameEn ?? record.key); }
function errorMessage(cause: unknown) { return cause instanceof Error ? cause.message : 'تعذر إكمال العملية.'; }
