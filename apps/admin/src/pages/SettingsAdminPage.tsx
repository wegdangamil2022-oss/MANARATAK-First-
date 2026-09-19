import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, History, KeyRound, Loader2, Plus, RefreshCw, Save, Settings2, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';

type ValueType = 'String' | 'Number' | 'Boolean' | 'Json';
type ScopeLevel = 'GLOBAL' | 'TENANT' | 'DOMAIN' | 'IDENTITY';

interface Definition {
  id: string;
  key: string;
  valueType: ValueType;
  description?: string;
  defaultValue?: unknown;
  isFeatureFlag: boolean;
  isDeprecated: boolean;
  isSecret: boolean;
}

interface Version {
  id: string;
  value: unknown;
  valueType: ValueType;
  authorId?: string;
  createdAt: string;
  rollbackOfVersionId?: string;
}

interface Assignment {
  id: string;
  key: string;
  level: ScopeLevel;
  scopeId?: string;
  currentVersionId: string;
  currentValue: unknown;
  versions: Version[];
}

function safeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function displayValue(value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export function SettingsAdminPage() {
  const { language } = useTranslation();
  const isAr = language === 'ar';
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'definitions' | 'assignments'>('definitions');
  const [selectedHistory, setSelectedHistory] = useState<Assignment | null>(null);

  const [definitionForm, setDefinitionForm] = useState({ key: '', valueType: 'String' as ValueType, description: '', defaultValue: '', isFeatureFlag: false, isSecret: false });
  const [assignmentForm, setAssignmentForm] = useState({ key: '', level: 'GLOBAL' as ScopeLevel, scopeId: '', value: '' });

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [definitionRes, assignmentRes] = await Promise.all([
        adminApiClient.request<{ data: { definitions: Definition[] } }>('/admin/settings/definitions'),
        adminApiClient.request<{ data: { assignments: Assignment[] } }>('/admin/settings/assignments'),
      ]);
      setDefinitions(definitionRes.data.definitions ?? []);
      setAssignments(assignmentRes.data.assignments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isAr ? 'تعذر تحميل الإعدادات.' : 'Unable to load settings.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const selectedDefinition = useMemo(() => definitions.find((item) => item.key === assignmentForm.key), [definitions, assignmentForm.key]);
  const writableDefinitions = useMemo(() => definitions.filter((item) => !item.isSecret && !item.isDeprecated), [definitions]);

  const parseValue = (type: ValueType, raw: string): unknown => {
    if (type === 'String') return raw;
    if (type === 'Number') {
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error(isAr ? 'القيمة الرقمية غير صالحة.' : 'Invalid numeric value.');
      return value;
    }
    if (type === 'Boolean') return raw === 'true';
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(isAr ? 'قيمة JSON يجب أن تكون كائنًا.' : 'JSON value must be an object.');
    return parsed;
  };

  const createDefinition = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const defaultValue = definitionForm.isSecret || definitionForm.defaultValue === ''
        ? undefined
        : parseValue(definitionForm.valueType, definitionForm.defaultValue);
      await adminApiClient.request('/admin/settings/definitions', {
        method: 'POST',
        body: JSON.stringify({
          id: safeId('setting-def'),
          key: definitionForm.key.trim(),
          valueType: definitionForm.valueType,
          description: definitionForm.description.trim() || undefined,
          defaultValue,
          isFeatureFlag: definitionForm.isFeatureFlag,
          isSecret: definitionForm.isSecret,
        }),
      });
      setDefinitionForm({ key: '', valueType: 'String', description: '', defaultValue: '', isFeatureFlag: false, isSecret: false });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : (isAr ? 'فشل إنشاء تعريف الإعداد.' : 'Failed to create setting definition.'));
    } finally { setSaving(false); }
  };

  const assignValue = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDefinition) return;
    setSaving(true);
    setError(null);
    try {
      await adminApiClient.request('/admin/settings/assignments', {
        method: 'POST',
        body: JSON.stringify({
          assignmentId: safeId('setting-assignment'),
          key: selectedDefinition.key,
          level: assignmentForm.level,
          scopeId: assignmentForm.level === 'GLOBAL' ? undefined : assignmentForm.scopeId.trim(),
          versionId: safeId('setting-version'),
          value: parseValue(selectedDefinition.valueType, assignmentForm.value),
          type: selectedDefinition.valueType,
        }),
      });
      setAssignmentForm((current) => ({ ...current, value: '' }));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : (isAr ? 'فشل حفظ قيمة الإعداد.' : 'Failed to save setting value.'));
    } finally { setSaving(false); }
  };

  const rollback = async (assignment: Assignment, version: Version) => {
    if (version.id === assignment.currentVersionId) return;
    if (!window.confirm(isAr ? 'إنشاء نسخة جديدة مبنية على هذه النسخة التاريخية؟' : 'Create a new version from this historical version?')) return;
    setSaving(true);
    setError(null);
    try {
      await adminApiClient.request('/admin/settings/assignments/rollback', {
        method: 'POST',
        body: JSON.stringify({ assignmentId: assignment.id, previousVersionId: version.id, newVersionId: safeId('setting-version') }),
      });
      await refresh();
      setSelectedHistory(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isAr ? 'فشل التراجع.' : 'Rollback failed.'));
    } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="rounded-3xl border border-[#0E7C86]/15 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black text-[#0E7C86]"><Settings2 className="h-4 w-4" /> {isAr ? 'حوكمة إعدادات المنصة' : 'Platform configuration governance'}</div>
            <h1 className="text-3xl font-black text-[#142B5F]">{isAr ? 'الإعدادات' : 'Settings'}</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-500">{isAr ? 'تعريفات إعدادات ديناميكية، قيم متدرجة حسب النطاق، سجل نسخ غير قابل للتعديل، وFeature Flags. الصلاحيات والأسرار ليست مملوكة لهذا المجال.' : 'Dynamic definitions, scoped assignments, immutable version history, and feature flags. Authorization and secrets are owned by separate boundaries.'}</p>
          </div>
          <button onClick={() => void refresh()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0E7C86]/20 bg-[#FAF7F0] px-4 py-2.5 text-xs font-black text-[#142B5F] hover:bg-[#DDEFF2]/50"><RefreshCw className="h-4 w-4" />{isAr ? 'تحديث' : 'Refresh'}</button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Boundary icon={<ShieldCheck />} title={isAr ? 'RBAC منفصل' : 'RBAC is separate'} text={isAr ? 'المستخدمون والأدوار والصلاحيات يملكها IAM/Authorization، وليس Settings.' : 'Users, roles and permissions belong to IAM/Authorization, not Settings.'} />
        <Boundary icon={<KeyRound />} title={isAr ? 'لا أسرار في قاعدة الإعدادات' : 'No secrets in Settings DB'} text={isAr ? 'API Keys وكلمات المرور والشهادات تُحقن من Secret Provider/Environment فقط.' : 'API keys, passwords and certificates come only from the approved secret provider/environment.'} />
        <Link to="/settings/reference-data" className="rounded-2xl border border-[#D6A43B]/30 bg-[#D6A43B]/10 p-5 transition hover:border-[#D6A43B]/60">
          <Database className="h-6 w-6 text-[#142B5F]" /><h2 className="mt-3 font-black text-[#142B5F]">{isAr ? 'البيانات المرجعية' : 'Reference Data'}</h2><p className="mt-1 text-xs font-semibold leading-6 text-slate-500">{isAr ? 'الدول والعملات واللغات والمدن تبقى في Reference Data، وليست إعدادات نصية.' : 'Countries, currencies, languages and cities remain owned by Reference Data.'}</p>
        </Link>
      </div>

      {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}

      <div className="flex w-fit gap-1 rounded-2xl border border-[#0E7C86]/10 bg-[#DDEFF2]/35 p-1.5">
        <Tab active={activeTab === 'definitions'} onClick={() => setActiveTab('definitions')}>{isAr ? 'التعريفات' : 'Definitions'}</Tab>
        <Tab active={activeTab === 'assignments'} onClick={() => setActiveTab('assignments')}>{isAr ? 'القيم وسجل النسخ' : 'Values & History'}</Tab>
      </div>

      {loading ? <div className="flex min-h-52 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0E7C86]" /></div> : activeTab === 'definitions' ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-black text-[#142B5F]">{isAr ? 'تعريفات الإعدادات' : 'Setting Definitions'}</h2><p className="mt-1 text-xs font-semibold text-slate-500">{definitions.length} {isAr ? 'تعريفًا مسجلًا' : 'registered definitions'}</p></div>
            {definitions.length === 0 ? <Empty text={isAr ? 'لا توجد تعريفات إعدادات بعد.' : 'No setting definitions yet.'} /> : <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50 text-slate-600"><tr><Th>{isAr ? 'المفتاح' : 'Key'}</Th><Th>{isAr ? 'النوع' : 'Type'}</Th><Th>{isAr ? 'التصنيف' : 'Classification'}</Th><Th>{isAr ? 'القيمة الافتراضية' : 'Default'}</Th></tr></thead><tbody className="divide-y divide-slate-100">{definitions.map((item) => <tr key={item.id}><Td mono>{item.key}</Td><Td>{item.valueType}</Td><Td><span className={`rounded-lg border px-2 py-1 font-black ${item.isSecret ? 'border-amber-200 bg-amber-50 text-amber-800' : item.isFeatureFlag ? 'border-[#0E7C86]/20 bg-[#DDEFF2]/50 text-[#142B5F]' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{item.isSecret ? (isAr ? 'مرجع سر خارجي' : 'External secret ref') : item.isFeatureFlag ? 'Feature Flag' : (isAr ? 'إعداد' : 'Setting')}</span></Td><Td mono>{item.isSecret ? '••••••••' : displayValue(item.defaultValue)}</Td></tr>)}</tbody></table></div>}
          </section>

          <form onSubmit={createDefinition} className="h-fit rounded-2xl border border-[#0E7C86]/15 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 font-black text-[#142B5F]"><Plus className="h-4 w-4" />{isAr ? 'تعريف إعداد' : 'Create Definition'}</div>
            <div className="mt-4 space-y-4">
              <Field label={isAr ? 'المفتاح namespaced' : 'Namespaced key'}><input required value={definitionForm.key} onChange={(e) => setDefinitionForm((f) => ({ ...f, key: e.target.value }))} placeholder="platform.feature.enabled" className="input" dir="ltr" /></Field>
              <Field label={isAr ? 'نوع القيمة' : 'Value type'}><select value={definitionForm.valueType} onChange={(e) => setDefinitionForm((f) => ({ ...f, valueType: e.target.value as ValueType, defaultValue: '' }))} className="input"><option>String</option><option>Number</option><option>Boolean</option><option>Json</option></select></Field>
              <Field label={isAr ? 'الوصف' : 'Description'}><textarea value={definitionForm.description} onChange={(e) => setDefinitionForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="input" /></Field>
              {!definitionForm.isSecret ? <Field label={isAr ? 'القيمة الافتراضية (اختيارية)' : 'Default value (optional)'}>{definitionForm.valueType === 'Boolean' ? <select value={definitionForm.defaultValue} onChange={(e) => setDefinitionForm((f) => ({ ...f, defaultValue: e.target.value }))} className="input"><option value="">—</option><option value="true">true</option><option value="false">false</option></select> : <textarea value={definitionForm.defaultValue} onChange={(e) => setDefinitionForm((f) => ({ ...f, defaultValue: e.target.value }))} rows={definitionForm.valueType === 'Json' ? 4 : 1} className="input font-mono text-xs" dir="ltr" />}</Field> : null}
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={definitionForm.isFeatureFlag} onChange={(e) => setDefinitionForm((f) => ({ ...f, isFeatureFlag: e.target.checked }))} /> Feature Flag</label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={definitionForm.isSecret} onChange={(e) => setDefinitionForm((f) => ({ ...f, isSecret: e.target.checked, defaultValue: '' }))} /> {isAr ? 'تعريف حساس — القيمة من Secret Provider فقط' : 'Sensitive definition — value comes only from Secret Provider'}</label>
              <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 py-3 text-xs font-black text-white hover:bg-[#0E7C86] disabled:opacity-50"><Save className="h-4 w-4" />{isAr ? 'حفظ التعريف' : 'Save Definition'}</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-black text-[#142B5F]">{isAr ? 'القيم الفعلية حسب النطاق' : 'Scoped Effective Values'}</h2></div>
            {assignments.length === 0 ? <Empty text={isAr ? 'لا توجد قيم مخصصة بعد؛ ستستخدم التعريفات قيمها الافتراضية.' : 'No scoped assignments yet; definitions fall back to defaults.'} /> : <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50 text-slate-600"><tr><Th>{isAr ? 'المفتاح' : 'Key'}</Th><Th>{isAr ? 'النطاق' : 'Scope'}</Th><Th>{isAr ? 'القيمة الحالية' : 'Current Value'}</Th><Th>{isAr ? 'النسخ' : 'Versions'}</Th></tr></thead><tbody className="divide-y divide-slate-100">{assignments.map((item) => <tr key={item.id}><Td mono>{item.key}</Td><Td>{item.level}{item.scopeId ? <span className="block max-w-44 truncate text-[10px] text-slate-400" dir="ltr">{item.scopeId}</span> : null}</Td><Td mono>{displayValue(item.currentValue)}</Td><Td><button onClick={() => setSelectedHistory(item)} className="inline-flex items-center gap-1 rounded-lg border border-[#0E7C86]/20 px-2.5 py-1.5 font-black text-[#142B5F] hover:bg-[#DDEFF2]/40"><History className="h-3.5 w-3.5" />{item.versions.length}</button></Td></tr>)}</tbody></table></div>}
          </section>

          <form onSubmit={assignValue} className="h-fit rounded-2xl border border-[#0E7C86]/15 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 font-black text-[#142B5F]"><SlidersHorizontal className="h-4 w-4" />{isAr ? 'تعيين قيمة' : 'Assign Value'}</div>
            <div className="mt-4 space-y-4">
              <Field label={isAr ? 'التعريف' : 'Definition'}><select required value={assignmentForm.key} onChange={(e) => setAssignmentForm((f) => ({ ...f, key: e.target.value, value: '' }))} className="input"><option value="">—</option>{writableDefinitions.map((item) => <option key={item.id} value={item.key}>{item.key}</option>)}</select></Field>
              <Field label={isAr ? 'النطاق' : 'Scope'}><select value={assignmentForm.level} onChange={(e) => setAssignmentForm((f) => ({ ...f, level: e.target.value as ScopeLevel, scopeId: '' }))} className="input"><option>GLOBAL</option><option>DOMAIN</option><option>TENANT</option><option>IDENTITY</option></select></Field>
              {assignmentForm.level !== 'GLOBAL' ? <Field label={isAr ? 'معرّف النطاق' : 'Scope ID'}><input required value={assignmentForm.scopeId} onChange={(e) => setAssignmentForm((f) => ({ ...f, scopeId: e.target.value }))} className="input" dir="ltr" /></Field> : null}
              {selectedDefinition ? <Field label={`${isAr ? 'القيمة' : 'Value'} · ${selectedDefinition.valueType}`}>{selectedDefinition.valueType === 'Boolean' ? <select value={assignmentForm.value} onChange={(e) => setAssignmentForm((f) => ({ ...f, value: e.target.value }))} className="input" required><option value="">—</option><option value="true">true</option><option value="false">false</option></select> : <textarea required value={assignmentForm.value} onChange={(e) => setAssignmentForm((f) => ({ ...f, value: e.target.value }))} rows={selectedDefinition.valueType === 'Json' ? 5 : 2} className="input font-mono text-xs" dir="ltr" />}</Field> : null}
              <button disabled={saving || !selectedDefinition} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 py-3 text-xs font-black text-white hover:bg-[#0E7C86] disabled:opacity-50"><Save className="h-4 w-4" />{isAr ? 'إنشاء نسخة جديدة' : 'Create New Version'}</button>
            </div>
          </form>
        </div>
      )}

      {selectedHistory ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={() => setSelectedHistory(null)}><div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black text-[#142B5F]">{selectedHistory.key}</h2><p className="mt-1 text-xs font-semibold text-slate-500">{selectedHistory.level} {selectedHistory.scopeId ?? ''}</p></div><button onClick={() => setSelectedHistory(null)} className="rounded-xl border px-3 py-2 text-xs font-black">{isAr ? 'إغلاق' : 'Close'}</button></div><div className="mt-5 space-y-3">{[...selectedHistory.versions].reverse().map((version) => <div key={version.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="font-mono text-[11px] font-bold text-slate-500">{version.id}</div><div className="mt-1 break-all font-mono text-xs font-bold text-slate-900">{displayValue(version.value)}</div><div className="mt-2 text-[10px] font-semibold text-slate-400">{new Date(version.createdAt).toLocaleString()} · {version.authorId ?? 'SYSTEM'}{version.rollbackOfVersionId ? ` · rollback of ${version.rollbackOfVersionId}` : ''}</div></div>{version.id === selectedHistory.currentVersionId ? <span className="rounded-lg bg-green-50 px-2 py-1 text-[10px] font-black text-green-700">{isAr ? 'الحالية' : 'CURRENT'}</span> : <button disabled={saving} onClick={() => void rollback(selectedHistory, version)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-800 hover:bg-amber-100">{isAr ? 'استعادة كنسخة جديدة' : 'Restore as new version'}</button>}</div></div>)}</div></div></div> : null}
    </div>
  );
}

function Boundary({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="rounded-2xl border border-[#0E7C86]/15 bg-white p-5"><div className="text-[#0E7C86]">{icon}</div><h2 className="mt-3 font-black text-[#142B5F]">{title}</h2><p className="mt-1 text-xs font-semibold leading-6 text-slate-500">{text}</p></div>; }
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <button onClick={onClick} className={`rounded-xl px-5 py-2.5 text-xs font-black transition ${active ? 'bg-white text-[#142B5F] shadow-sm' : 'text-[#0E7C86]/70 hover:text-[#142B5F]'}`}>{children}</button>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-[11px] font-black text-slate-600">{label}</span>{children}</label>; }
function Empty({ text }: { text: string }) { return <div className="p-12 text-center text-xs font-bold text-slate-400">{text}</div>; }
function Th({ children }: { children: ReactNode }) { return <th className="px-5 py-3 text-start font-black">{children}</th>; }
function Td({ children, mono = false }: { children: ReactNode; mono?: boolean }) { return <td className={`px-5 py-4 font-semibold text-slate-700 ${mono ? 'font-mono text-[11px]' : ''}`}>{children}</td>; }
