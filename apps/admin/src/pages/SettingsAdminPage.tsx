import { SettingsResolutionInspector } from '../components/SettingsResolutionInspector';
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  History,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
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
  revision?: string;
}

interface Version {
  id: string;
  value: unknown;
  valueType: ValueType;
  authorId?: string;
  createdAt: string;
  rollbackOfVersionId?: string;
  operation?: 'SET' | 'CLEAR_OVERRIDE';
  changeReason?: string;
}

interface Assignment {
  id: string;
  key: string;
  level: ScopeLevel;
  scopeId?: string;
  currentVersionId: string;
  currentValue: unknown;
  isOverrideCleared?: boolean;
  versions: Version[];
  versionCount?: number;
  isWritable?: boolean;
}

function safeId(prefix: string) {
  return `${prefix}-${createAdminIdempotencyKey()}`;
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
  const [historyVersions, setHistoryVersions] = useState<Version[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | undefined>();
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const historyGeneration = useRef(0);
  const historyBusy = useRef(false);

  const loadHistory = async (assignment: Assignment, cursor?: string) => {
    if (historyBusy.current) return;
    historyBusy.current = true;
    const request = ++historyGeneration.current;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const query = new URLSearchParams({ expectedCurrentVersionId: assignment.currentVersionId, limit: '50' });
      if (cursor) query.set('cursor', cursor);
      const result = await adminApiClient.request<{ data: { versions: Version[]; nextCursor?: string } }>(
        `/admin/settings/assignments/${encodeURIComponent(assignment.id)}/history?${query}`, { cache: 'no-store' });
      if (request !== historyGeneration.current) return;
      if (!Array.isArray(result.data?.versions)) throw new Error('Invalid history response');
      setHistoryVersions(previous => cursor ? [...new Map([...previous, ...result.data.versions].map(version => [version.id, version])).values()] : result.data.versions);
      setHistoryCursor(result.data.nextCursor);
    } catch (cause) {
      if (request === historyGeneration.current) setHistoryError(errorText(cause));
    } finally {
      if (request === historyGeneration.current) { setHistoryLoading(false); historyBusy.current = false; }
    }
  };

  useEffect(() => {
    setHistoryVersions([]);
    setHistoryCursor(undefined);
    setHistoryError('');
    historyBusy.current = false;
    if (selectedHistory) void loadHistory(selectedHistory);
    return () => { historyGeneration.current += 1; historyBusy.current = false; };
  }, [selectedHistory?.id, selectedHistory?.currentVersionId]);

  const [definitionForm, setDefinitionForm] = useState({
    key: '',
    valueType: 'String' as ValueType,
    description: '',
    defaultValue: '',
    isFeatureFlag: false,
    isSecret: false,
  });
  const [assignmentForm, setAssignmentForm] = useState({
    key: '',
    level: 'GLOBAL' as ScopeLevel,
    scopeId: '',
    value: '',
    changeReason: '',
  });

  const [notice, setNotice] = useState('');
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState('');
  const [classification, setClassification] = useState('ALL');
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [definitionCursors, setDefinitionCursors] = useState<string[]>([]);
  const [assignmentCursors, setAssignmentCursors] = useState<string[]>([]);
  const [definitionNext, setDefinitionNext] = useState<string | undefined>();
  const [assignmentNext, setAssignmentNext] = useState<string | undefined>();
  const [contextEpoch, setContextEpoch] = useState(0);
  const [contextState, setContextState] = useState<{ signature: string; definition: Definition; assignment: Assignment | null } | null>(null);
  const [contextError, setContextError] = useState('');
  const contextGeneration = useRef(0);
  const editingVersion = useRef<{ signature: string; version: string } | null>(null);
  const contextSignature = JSON.stringify([assignmentForm.key.trim(), assignmentForm.level, assignmentForm.level === 'GLOBAL' ? '' : assignmentForm.scopeId.trim()]);
  const selectedDefinition = contextState?.signature === contextSignature ? contextState.definition : undefined;
  const selectedAssignment = contextState?.signature === contextSignature ? contextState.assignment : undefined;
  const contextReady = contextState?.signature === contextSignature;

  useEffect(() => {
    if (search.trim() === appliedSearch) return;
    const timer = window.setTimeout(() => { setAppliedSearch(search.trim()); setDefinitionCursors([]); setAssignmentCursors([]); }, 250);
    return () => window.clearTimeout(timer);
  }, [search, appliedSearch]);
  useEffect(() => {
    const request = ++contextGeneration.current;
    setContextState(null); setContextError('');
    const [key, level, rawScopeId] = JSON.parse(contextSignature) as [string, ScopeLevel, string];
    const scopeId = level === 'GLOBAL' ? undefined : rawScopeId;
    if (!key || !/^[a-zA-Z0-9_\-.]+$/.test(key) || (level !== 'GLOBAL' && !scopeId)) return;
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({ key, level });
      if (scopeId) query.set('scopeId', scopeId);
      void adminApiClient.request<{ data: { definition: Definition; assignment: Assignment | null } }>(
        `/admin/settings/assignments/context?${query}`, { cache: 'no-store' }).then(result => {
          if (request !== contextGeneration.current) return;
          if (!result.data?.definition || !('assignment' in result.data)) throw new Error('Invalid context response');
          if (editingVersion.current?.signature === contextSignature && editingVersion.current.version !== result.data.assignment?.currentVersionId)
            throw new Error('SETTINGS_EDITOR_VERSION_CHANGED');
          setContextState({ signature: contextSignature, ...result.data });
        }).catch(cause => { if (request === contextGeneration.current) setContextError(errorText(cause)); });
    }, 250);
    return () => { window.clearTimeout(timer); contextGeneration.current += 1; };
  }, [contextSignature, contextEpoch]);
  const generation = useRef(0);
  const busy = useRef(false);
  const refreshing = useRef(false);
  const commands = useRef(
    new Map<
      string,
      { key: string; definitionId: string; assignmentId: string; versionId: string }
    >(),
  );
  const historyPanel = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const request = ++generation.current;
    refreshing.current = true;
    setLoading(true);
    setReady(false);
    const definitionQuery = new URLSearchParams({ limit: '50', classification });
    const assignmentQuery = new URLSearchParams({ limit: '50' });
    if (appliedSearch) { definitionQuery.set('q', appliedSearch); assignmentQuery.set('q', appliedSearch); }
    if (scopeFilter !== 'ALL') assignmentQuery.set('level', scopeFilter);
    if (definitionCursors.length) definitionQuery.set('cursor', definitionCursors.at(-1)!);
    if (assignmentCursors.length) assignmentQuery.set('cursor', assignmentCursors.at(-1)!);
    const results = await Promise.allSettled([
      adminApiClient.request<{ data: { definitions: Definition[]; nextCursor?: string } }>(
        `/admin/settings/definitions?${definitionQuery}`,
        { cache: 'no-store' },
      ),
      adminApiClient.request<{ data: { assignments: Assignment[]; nextCursor?: string } }>(
        `/admin/settings/assignments?${assignmentQuery}`,
        { cache: 'no-store' },
      ),
    ]);
    if (request !== generation.current) return;
    const failures: string[] = [];
    const [definitionResult, assignmentResult] = results;
    if (
      definitionResult.status === 'fulfilled' &&
      Array.isArray(definitionResult.value.data?.definitions)
    ) {
      setDefinitions(definitionResult.value.data.definitions);
      setDefinitionNext(definitionResult.value.data.nextCursor);
    } else {
      setDefinitionNext(undefined);
      setDefinitions([]);
      failures.push(
        `${isAr ? 'التعريفات' : 'Definitions'}: ${definitionResult.status === 'rejected' ? errorText(definitionResult.reason) : 'Invalid response'}`,
      );
    }
    if (
      assignmentResult.status === 'fulfilled' &&
      Array.isArray(assignmentResult.value.data?.assignments)
    ) {
      const values = assignmentResult.value.data.assignments;
      setAssignments(values);
      setAssignmentNext(assignmentResult.value.data.nextCursor);
      setSelectedHistory((previous) =>
        previous ? (values.find((item) => item.id === previous.id) ?? null) : null,
      );
    } else {
      setAssignments([]);
      setAssignmentNext(undefined);
      setSelectedHistory(null);
      failures.push(
        `${isAr ? 'القيم' : 'Values'}: ${assignmentResult.status === 'rejected' ? errorText(assignmentResult.reason) : 'Invalid response'}`,
      );
    }
    setLoadErrors(failures);
    setReady(!failures.length);
    setLoading(false);
    refreshing.current = false;
  };

  useEffect(() => {
    void refresh();
    return () => {
      generation.current += 1;
      refreshing.current = false;
    };
  }, [appliedSearch, classification, scopeFilter, definitionCursors, assignmentCursors]);
  useEffect(() => {
    if (!selectedHistory) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    historyPanel.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy.current) setSelectedHistory(null);
      if (event.key !== 'Tab') return;
      const controls = historyPanel.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      );
      if (!controls?.length) {
        event.preventDefault();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === historyPanel.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === historyPanel.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handler);
      previousFocus?.focus();
    };
  }, [selectedHistory?.id]);

  const filteredDefinitions = definitions;
  const filteredAssignments = assignments;
  // TENANT has no approved canonical owner/selector. Preserve historical reads,
  // but block new Admin edits and lifecycle mutations until its authority is decided.
  const canRestore = (assignment: Assignment) => ready && assignment.isWritable === true && assignment.level !== 'TENANT';
  const editAssignment = (item: Assignment) => {
    if (busy.current || item.level === 'TENANT') return;
    if (
      assignmentForm.value &&
      !window.confirm(
        isAr
          ? 'استبدال الإدخال غير المحفوظ بالقيمة المختارة؟'
          : 'Replace the unsaved input with this value?',
      )
    )
      return;
    setContextState(null);
    setContextEpoch(current => current + 1);
    editingVersion.current = { signature: JSON.stringify([item.key, item.level, item.scopeId || '']), version: item.currentVersionId };
    setAssignmentForm({
      key: item.key,
      level: item.level,
      scopeId: item.scopeId || '',
      changeReason: '',
      value:
        typeof item.currentValue === 'string'
          ? item.currentValue
          : JSON.stringify(item.currentValue),
    });
    setActiveTab('assignments');
    setNotice(
      isAr
        ? 'تم تحميل القيمة الحالية للتحرير؛ اضغط حفظ لإنشاء نسخة جديدة.'
        : 'Current value loaded for editing; save to create a new version.',
    );
  };
  const writableDefinitions = useMemo(
    () => definitions.filter((item) => !item.isSecret && !item.isDeprecated),
    [definitions],
  );

  const parseValue = (type: ValueType, raw: string): unknown => {
    if (type === 'String') return raw;
    if (type === 'Number') {
      if (!raw.trim()) throw new Error(isAr ? 'أدخل قيمة رقمية.' : 'Enter a numeric value.');
      const value = Number(raw);
      if (!Number.isFinite(value))
        throw new Error(isAr ? 'القيمة الرقمية غير صالحة.' : 'Invalid numeric value.');
      return value;
    }
    if (type === 'Boolean') {
      if (raw !== 'true' && raw !== 'false')
        throw new Error(isAr ? 'اختر true أو false.' : 'Choose true or false.');
      return raw === 'true';
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error(isAr ? 'قيمة JSON يجب أن تكون كائنًا.' : 'JSON value must be an object.');
    return parsed;
  };

  const saveCommand = async (
    operation: 'definition' | 'assignment' | 'rollback' | 'clear' | 'definition-update',
    payload: Record<string, unknown>,
    complete: () => void,
  ) => {
    if (busy.current || refreshing.current || !ready) return;
    const signature = JSON.stringify([operation, payload]);
    let command = commands.current.get(signature);
    if (!command) {
      command = {
        key: createAdminIdempotencyKey(),
        definitionId: safeId('setting-def'),
        assignmentId: safeId('setting-assignment'),
        versionId: safeId('setting-version'),
      };
      commands.current.set(signature, command);
    }
    busy.current = true;
    setSaving(true);
    setError(null);
    setNotice('');
    try {
      const body = {
        ...payload,
        ...(operation === 'definition'
          ? { id: command.definitionId }
          : operation === 'assignment'
            ? {
                assignmentId: selectedAssignment?.id ?? command.assignmentId,
                versionId: command.versionId,
              }
            : operation === 'definition-update' ? {} : { newVersionId: command.versionId }),
      };
      const endpoint =
        operation === 'definition'
          ? '/admin/settings/definitions'
          : operation === 'assignment'
            ? '/admin/settings/assignments'
            : operation === 'clear' ? '/admin/settings/assignments/clear'
              : operation === 'definition-update' ? '/admin/settings/definitions/update'
              : '/admin/settings/assignments/rollback';
      await adminApiClient.request(endpoint, {
        method: 'POST',
        idempotencyKey: command.key,
        body: JSON.stringify(body),
      });
      commands.current.delete(signature);
      complete();
      setNotice(
        isAr
          ? 'تم الحفظ؛ أُعيد طلب القيم من الخادم.'
          : 'Saved; current values were requested again from the server.',
      );
      if (operation === 'assignment') { editingVersion.current = null; setContextState(null); setContextEpoch(current => current + 1); }
      await refresh();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const createDefinition = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!/^[a-zA-Z0-9_\-.]+$/.test(definitionForm.key.trim()))
        throw new Error(isAr ? 'مفتاح الإعداد غير صالح.' : 'Invalid setting key.');
      const defaultValue =
        definitionForm.isSecret || definitionForm.defaultValue === ''
          ? undefined
          : parseValue(definitionForm.valueType, definitionForm.defaultValue);
      await saveCommand(
        'definition',
        {
          key: definitionForm.key.trim(),
          valueType: definitionForm.valueType,
          description: definitionForm.description.trim() || undefined,
          defaultValue,
          isFeatureFlag: definitionForm.isFeatureFlag,
          isSecret: definitionForm.isSecret,
        },
        () =>
          setDefinitionForm({
            key: '',
            valueType: 'String',
            description: '',
            defaultValue: '',
            isFeatureFlag: false,
            isSecret: false,
          }),
      );
    } catch (cause) {
      setError(errorText(cause));
    }
  };
  const assignValue = async (event: FormEvent) => {
    event.preventDefault();
    if (!contextReady || !selectedDefinition || selectedDefinition.isSecret || selectedDefinition.isDeprecated || assignmentForm.level === 'TENANT')
      return;
    try {
      if (assignmentForm.level !== 'GLOBAL' && !assignmentForm.scopeId.trim())
        throw new Error(isAr ? 'أدخل معرّف النطاق.' : 'Enter the scope identifier.');
      await saveCommand(
        'assignment',
        {
          key: selectedDefinition.key,
          level: assignmentForm.level,
          scopeId: assignmentForm.level === 'GLOBAL' ? undefined : assignmentForm.scopeId.trim(),
          value: parseValue(selectedDefinition.valueType, assignmentForm.value),
          type: selectedDefinition.valueType,
          expectedCurrentVersionId: selectedAssignment?.currentVersionId ?? null,
          changeReason: assignmentForm.changeReason.trim() || undefined,
        },
        () => setAssignmentForm((current) => ({ ...current, value: '', changeReason: '' })),
      );
    } catch (cause) {
      setError(errorText(cause));
    }
  };
  const rollback = async (assignment: Assignment, version: Version) => {
    if (busy.current || !canRestore(assignment) || version.id === assignment.currentVersionId)
      return;
    if (
      !window.confirm(
        isAr
          ? 'إنشاء نسخة جديدة مبنية على هذه النسخة التاريخية؟'
          : 'Create a new version from this historical version?',
      )
    )
      return;
    const changeReason = window.prompt(isAr ? 'سبب الرجوع (3 أحرف على الأقل)' : 'Rollback reason (at least 3 characters)')?.trim();
    if (!changeReason || changeReason.length < 3) return;
    await saveCommand(
      'rollback',
      {
        assignmentId: assignment.id,
        previousVersionId: version.id,
        changeReason,
        expectedCurrentVersionId: assignment.currentVersionId,
      },
      () => setSelectedHistory(null),
    );
  };

  const clearOverride = async (assignment: Assignment) => {
    if (busy.current || assignment.isOverrideCleared || !canRestore(assignment)) return;
    const changeReason = window.prompt(isAr ? 'سبب العودة للوراثة (3 أحرف على الأقل)' : 'Inheritance reason (at least 3 characters)')?.trim();
    if (!changeReason || changeReason.length < 3) return;
    await saveCommand('clear', { assignmentId: assignment.id, expectedCurrentVersionId: assignment.currentVersionId,
      changeReason }, () => setSelectedHistory(null));
  };
  const updateDefinition = async (definition: Definition, deprecate: boolean) => {
    if (busy.current || !definition.revision) return;
    try {
      let description: string | undefined;
      if (deprecate) {
        const impact = await adminApiClient.request<{ data: { assignmentCount: number } }>(
          `/admin/settings/definitions/${encodeURIComponent(definition.key)}/impact`, { cache: 'no-store' });
        if (!window.confirm(isAr ? `سيوقف هذا التعريف عن الحل والتعيين. توجد ${impact.data.assignmentCount} تعيينات؛ سيُحفظ التاريخ. موافق؟`
          : `This disables resolution and new writes. ${impact.data.assignmentCount} assignments retain their history. Continue?`)) return;
      } else {
        const value = window.prompt(isAr ? 'الوصف الجديد' : 'New description', definition.description ?? '');
        if (value === null) return;
        description = value;
      }
      const changeReason = window.prompt(isAr ? 'سبب التغيير (3 أحرف على الأقل)' : 'Change reason (at least 3 characters)')?.trim();
      if (!changeReason || changeReason.length < 3) return;
      await saveCommand('definition-update', { key: definition.key, expectedRevision: definition.revision,
        ...(deprecate ? { isDeprecated: true } : { description }), changeReason }, () => {});
    } catch (cause) { setError(errorText(cause)); }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      <section className="relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-[0_18px_45px_rgba(20,43,95,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-28 h-64 w-64 rounded-full border border-cyan-400/20" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-48 bg-gradient-to-r from-transparent via-[#21A7B4] to-[#0E7C86] sm:w-80" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-200 backdrop-blur-sm border border-white/15">
              <Settings2 className="h-4 w-4 text-[#21A7B4]" />
              <span>
                {isAr
                  ? 'حوكمة إعدادات المنصة ومفاتيح الميزات'
                  : 'Platform configuration governance'}
              </span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">
              {isAr ? 'إعدادات المنصة' : 'Settings'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-cyan-50/90">
              {isAr
                ? 'تعريفات إعدادات ديناميكية، قيم متدرجة حسب النطاق، سجل نسخ غير قابل للتعديل، وFeature Flags.'
                : 'Dynamic definitions, scoped assignments, immutable version history, and feature flags.'}
            </p>
          </div>
          <button
            onClick={() => {
              setError(null);
              setNotice('');
              void refresh();
            }}
            disabled={loading || saving}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#21A7B4] px-5 text-sm font-black text-white shadow-md transition hover:bg-[#1A8D99] shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {isAr ? 'تحديث البيانات' : 'Refresh'}
          </button>
        </div>
      </section>

      <SettingsResolutionInspector definitions={definitions} isAr={isAr} />

      <div className="grid gap-4 md:grid-cols-3">
        <Boundary
          icon={<ShieldCheck />}
          title={isAr ? 'RBAC منفصل' : 'RBAC is separate'}
          text={
            isAr
              ? 'المستخدمون والأدوار والصلاحيات يملكها IAM/Authorization، وليس Settings.'
              : 'Users, roles and permissions belong to IAM/Authorization, not Settings.'
          }
        />
        <Boundary
          icon={<KeyRound />}
          title={isAr ? 'لا أسرار في قاعدة الإعدادات' : 'No secrets in Settings DB'}
          text={
            isAr
              ? 'API Keys وكلمات المرور والشهادات تُحقن من Secret Provider/Environment فقط.'
              : 'API keys, passwords and certificates come only from the approved secret provider/environment.'
          }
        />
        <Link
          to="/settings/reference-data"
          className="rounded-2xl border border-[#D6A43B]/30 bg-[#D6A43B]/10 p-5 transition hover:border-[#D6A43B]/60"
        >
          <Database className="h-6 w-6 text-[#142B5F]" />
          <h2 className="mt-3 font-black text-[#142B5F]">
            {isAr ? 'البيانات المرجعية' : 'Reference Data'}
          </h2>
          <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">
            {isAr
              ? 'الدول والعملات واللغات والمدن تبقى في Reference Data، وليست إعدادات نصية.'
              : 'Countries, currencies, languages and cities remain owned by Reference Data.'}
          </p>
        </Link>
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800"
        >
          {notice}
        </div>
      )}
      {loadErrors.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          <p>
            {isAr
              ? 'تعذر تحميل بعض المصادر؛ لا تعني القائمة الفارغة عدم وجود إعدادات.'
              : 'Some sources could not be loaded; an empty list does not prove there are no settings.'}
          </p>
          <ul>
            {loadErrors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"
        >
          {error}
        </div>
      ) : null}

      <div className="flex w-fit gap-1 rounded-2xl border border-[#0E7C86]/10 bg-[#DDEFF2]/35 p-1.5">
        <Tab active={activeTab === 'definitions'} onClick={() => setActiveTab('definitions')}>
          {isAr ? 'التعريفات' : 'Definitions'}
        </Tab>
        <Tab active={activeTab === 'assignments'} onClick={() => setActiveTab('assignments')}>
          {isAr ? 'القيم وسجل النسخ' : 'Values & History'}
        </Tab>
      </div>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <Field
          label={isAr ? 'بحث المفتاح والوصف ومعرف النطاق' : 'Search key, description and scope'}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input"
          />
        </Field>
        <Field label={isAr ? 'تصنيف التعريفات' : 'Definition class'}>
          <select
            value={classification}
            onChange={(event) => { setClassification(event.target.value); setDefinitionCursors([]); }}
            className="input"
          >
            <option value="ALL">{isAr ? 'الكل' : 'All'}</option>
            <option value="SETTING">{isAr ? 'إعدادات عادية' : 'Settings'}</option>
            <option value="FLAG">Feature Flags</option>
            <option value="SECRET">{isAr ? 'متطلبات الأسرار' : 'Secret requirements'}</option>
            <option value="DEPRECATED">{isAr ? 'متوقفة' : 'Deprecated'}</option>
          </select>
        </Field>
        <Field label={isAr ? 'نطاق القيم' : 'Value scope'}>
          <select
            value={scopeFilter}
            onChange={(event) => { setScopeFilter(event.target.value); setAssignmentCursors([]); }}
            className="input"
          >
            <option value="ALL">{isAr ? 'كل النطاقات' : 'All scopes'}</option>
            {['GLOBAL', 'DOMAIN', 'TENANT', 'IDENTITY'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
      </section>
      <div className="flex items-center gap-3" aria-label={isAr ? 'تصفح صفحات الإعدادات' : 'Settings pagination'}>
        <button type="button" disabled={loading || saving || search.trim() !== appliedSearch || !(activeTab === 'definitions' ? definitionCursors.length : assignmentCursors.length)}
          onClick={() => activeTab === 'definitions' ? setDefinitionCursors(previous => previous.slice(0, -1)) : setAssignmentCursors(previous => previous.slice(0, -1))}
          className="rounded border px-3 py-2 disabled:opacity-50">{isAr ? 'الصفحة السابقة' : 'Previous page'}</button>
        <span>{isAr ? 'الصفحة' : 'Page'} {(activeTab === 'definitions' ? definitionCursors.length : assignmentCursors.length) + 1}</span>
        <button type="button" disabled={loading || saving || search.trim() !== appliedSearch || !(activeTab === 'definitions' ? definitionNext : assignmentNext)}
          onClick={() => activeTab === 'definitions' ? definitionNext && setDefinitionCursors(previous => [...previous, definitionNext]) : assignmentNext && setAssignmentCursors(previous => [...previous, assignmentNext])}
          className="rounded border px-3 py-2 disabled:opacity-50">{isAr ? 'الصفحة التالية' : 'Next page'}</button>
      </div>
      {loading ? (
        <div className="flex min-h-52 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0E7C86]" />
        </div>
      ) : activeTab === 'definitions' ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-black text-[#142B5F]">
                {isAr ? 'تعريفات الإعدادات' : 'Setting Definitions'}
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {definitions.length} {isAr ? 'تعريفًا في الصفحة الحالية' : 'definitions on this page'}
              </p>
            </div>
            {filteredDefinitions.length === 0 ? (
              <Empty
                text={
                  isAr
                    ? 'لا توجد تعريفات مطابقة ضمن البيانات المحمّلة.'
                    : 'No matching definitions in loaded data.'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <Th>{isAr ? 'المفتاح' : 'Key'}</Th>
                      <Th>{isAr ? 'النوع' : 'Type'}</Th>
                      <Th>{isAr ? 'التصنيف' : 'Classification'}</Th>
                      <Th>{isAr ? 'القيمة الافتراضية' : 'Default'}</Th>
                      <Th>{isAr ? 'الحالة والإجراءات' : 'Status and actions'}</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDefinitions.map((item) => (
                      <tr key={item.id}>
                        <Td mono>{item.key}</Td>
                        <Td>{item.valueType}</Td>
                        <Td>
                          <span
                            className={`rounded-lg border px-2 py-1 font-black ${item.isSecret ? 'border-amber-200 bg-amber-50 text-amber-800' : item.isFeatureFlag ? 'border-[#0E7C86]/20 bg-[#DDEFF2]/50 text-[#142B5F]' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                          >
                            {item.isSecret
                              ? isAr
                                ? 'متطلب سر — الربط غير مثبت'
                                : 'Secret requirement — binding unverified'
                              : item.isFeatureFlag
                                ? 'Feature Flag'
                                : isAr
                                  ? 'إعداد'
                                  : 'Setting'}
                          </span>
                        </Td>
                        <Td mono>{item.isSecret ? '••••••••' : displayValue(item.defaultValue)}</Td>
                        <Td>
                          <span>{item.isDeprecated ? (isAr ? 'متوقف' : 'Deprecated') : (isAr ? 'فعال' : 'Active')}</span>
                          <p className="text-slate-500">{item.description}</p>
                          <button type="button" disabled={saving || !item.revision} onClick={() => void updateDefinition(item, false)}
                            className="ms-2 rounded border px-2 py-1">{isAr ? 'تعديل الوصف' : 'Edit description'}</button>
                          {!item.isDeprecated && <button type="button" disabled={saving || !item.revision} onClick={() => void updateDefinition(item, true)}
                            className="ms-2 rounded border px-2 py-1">{isAr ? 'إيقاف التعريف' : 'Deprecate definition'}</button>}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <form
            onSubmit={createDefinition}
            className="h-fit rounded-2xl border border-[#0E7C86]/15 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 font-black text-[#142B5F]">
              <Plus className="h-4 w-4" />
              {isAr ? 'تعريف إعداد' : 'Create Definition'}
            </div>
            <fieldset
              disabled={saving || !ready}
              className="mt-4 min-w-0 space-y-4 disabled:opacity-60"
            >
              <Field label={isAr ? 'المفتاح namespaced' : 'Namespaced key'}>
                <input
                  required
                  maxLength={240}
                  value={definitionForm.key}
                  onChange={(e) => setDefinitionForm((f) => ({ ...f, key: e.target.value }))}
                  placeholder="platform.feature.enabled"
                  className="input"
                  dir="ltr"
                />
              </Field>
              <Field label={isAr ? 'نوع القيمة' : 'Value type'}>
                <select
                  disabled={definitionForm.isFeatureFlag}
                  value={definitionForm.valueType}
                  onChange={(e) =>
                    setDefinitionForm((f) => ({
                      ...f,
                      valueType: e.target.value as ValueType,
                      defaultValue: '',
                    }))
                  }
                  className="input"
                >
                  <option>String</option>
                  <option>Number</option>
                  <option>Boolean</option>
                  <option>Json</option>
                </select>
              </Field>
              <Field label={isAr ? 'الوصف' : 'Description'}>
                <textarea
                  maxLength={2000}
                  value={definitionForm.description}
                  onChange={(e) =>
                    setDefinitionForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={2}
                  className="input"
                />
              </Field>
              {!definitionForm.isSecret ? (
                <Field label={definitionForm.isFeatureFlag ? (isAr ? 'القيمة الافتراضية للميزة (إلزامية)' : 'Flag default (required)') : (isAr ? 'القيمة الافتراضية (اختيارية)' : 'Default value (optional)')}>
                  {definitionForm.valueType === 'Boolean' ? (
                    <select
                      value={definitionForm.defaultValue}
                      onChange={(e) =>
                        setDefinitionForm((f) => ({ ...f, defaultValue: e.target.value }))
                      }
                      className="input"
                    >
                      {!definitionForm.isFeatureFlag && <option value="">—</option>}
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <textarea
                      value={definitionForm.defaultValue}
                      onChange={(e) =>
                        setDefinitionForm((f) => ({ ...f, defaultValue: e.target.value }))
                      }
                      rows={definitionForm.valueType === 'Json' ? 4 : 1}
                      className="input font-mono text-xs"
                      dir="ltr"
                    />
                  )}
                </Field>
              ) : null}
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={definitionForm.isFeatureFlag}
                  onChange={(e) =>
                    setDefinitionForm((f) => ({
                      ...f,
                      isFeatureFlag: e.target.checked,
                      ...(e.target.checked
                        ? { valueType: 'Boolean', defaultValue: 'false', isSecret: false }
                        : {}),
                    }))
                  }
                />{' '}
                Feature Flag
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={definitionForm.isSecret}
                  onChange={(e) =>
                    setDefinitionForm((f) => ({
                      ...f,
                      isSecret: e.target.checked,
                      isFeatureFlag: false,
                      defaultValue: '',
                    }))
                  }
                />{' '}
                {isAr
                  ? 'تعريف حساس — القيمة من Secret Provider فقط'
                  : 'Sensitive definition — value comes only from Secret Provider'}
              </label>
              <button
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 py-3 text-xs font-black text-white hover:bg-[#0E7C86] disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isAr ? 'حفظ التعريف' : 'Save Definition'}
              </button>
            </fieldset>
          </form>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-black text-[#142B5F]">
                {isAr ? 'القيم المحفوظة حسب النطاق' : 'Stored Scoped Values'}
              </h2>
            </div>
            {filteredAssignments.length === 0 ? (
              <Empty
                text={
                  isAr
                    ? 'لا توجد قيم مطابقة ضمن البيانات المحمّلة.'
                    : 'No matching values in loaded data.'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <Th>{isAr ? 'المفتاح' : 'Key'}</Th>
                      <Th>{isAr ? 'النطاق' : 'Scope'}</Th>
                      <Th>{isAr ? 'القيمة الحالية' : 'Current Value'}</Th>
                      <Th>{isAr ? 'النسخ' : 'Versions'}</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAssignments.map((item) => (
                      <tr key={item.id}>
                        <Td mono>{item.key}</Td>
                        <Td>
                          {item.level}
                          {item.scopeId ? (
                            <span
                              className="block max-w-44 truncate text-[10px] text-slate-400"
                              dir="ltr"
                            >
                              {item.scopeId}
                            </span>
                          ) : null}
                        </Td>
                        <Td mono>{item.isOverrideCleared ? (isAr ? 'وراثة — دون قيمة محلية' : 'Inheriting — no local value') : displayValue(item.currentValue)}</Td>
                        <Td>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setSelectedHistory(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#0E7C86]/20 px-2.5 py-1.5 font-black text-[#142B5F] hover:bg-[#DDEFF2]/40"
                          >
                            <History className="h-3.5 w-3.5" />
                            {item.versionCount ?? item.versions.length}
                          </button>
                          {canRestore(item) && !item.isOverrideCleared && <button type="button" disabled={saving}
                            onClick={() => void clearOverride(item)} className="ms-2 rounded border px-2 py-1">
                            {isAr ? 'إلغاء القيمة والوراثة' : 'Clear override / inherit'}</button>}
                          {canRestore(item) && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => editAssignment(item)}
                              className="ms-2 rounded-lg border px-2.5 py-1.5 font-bold text-[#0E7C86]"
                            >
                              {isAr ? 'تعديل القيمة' : 'Edit value'}
                            </button>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <form
            onSubmit={assignValue}
            className="h-fit rounded-2xl border border-[#0E7C86]/15 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 font-black text-[#142B5F]">
              <SlidersHorizontal className="h-4 w-4" />
              {isAr ? 'تعيين قيمة' : 'Assign Value'}
            </div>
            <fieldset
              disabled={saving || !ready}
              className="mt-4 min-w-0 space-y-4 disabled:opacity-60"
            >
              <Field label={isAr ? 'التعريف' : 'Definition'}>
                <input required list="settings-definition-options" value={assignmentForm.key} maxLength={200}
                  onChange={event => { editingVersion.current = null; setAssignmentForm(form => ({ ...form, key: event.target.value, value: '' })); }} className="input" dir="ltr" />
                <datalist id="settings-definition-options">{writableDefinitions.map(item => <option key={item.id} value={item.key} />)}</datalist>
                <p className="text-xs text-slate-500">{isAr ? 'اختر أو أدخل مفتاح تعريف موجود؛ يُتحقق من التعريف والنطاق مباشرة.' : 'Choose or enter an existing key; definition and scope are checked directly.'}</p>
              </Field>
              <Field label={isAr ? 'النطاق' : 'Scope'}>
                <select
                  value={assignmentForm.level}
                  onChange={(e) =>
                    setAssignmentForm((f) => ({
                      ...f,
                      level: e.target.value as ScopeLevel,
                      scopeId: '',
                    }))
                  }
                  className="input"
                >
                  <option>GLOBAL</option>
                  <option>DOMAIN</option>
                  <option value="TENANT" disabled>{isAr ? 'TENANT — غير معتمد للتعديل' : 'TENANT — legacy read-only'}</option>
                  <option>IDENTITY</option>
                </select>
                <p className="text-xs text-slate-500">
                  {isAr
                    ? 'نطاق TENANT غير معتمد لإنشاء أو تعديل القيم؛ تبقى سجلاته القديمة قابلة للعرض فقط حتى تحديد الجهة المالكة.'
                    : 'TENANT is not approved for new Admin values or edits; existing records remain visible until an authoritative owner is established.'}
                </p>
              </Field>
              {assignmentForm.level !== 'GLOBAL' ? (
                <Field label={isAr ? 'معرّف النطاق' : 'Scope ID'}>
                  <input
                    required
                    maxLength={240}
                    value={assignmentForm.scopeId}
                    onChange={(e) => setAssignmentForm((f) => ({ ...f, scopeId: e.target.value }))}
                    className="input"
                    dir="ltr"
                  />
                </Field>
              ) : null}
              {contextError && <div role="alert" className="text-red-700">{contextError === 'SETTINGS_EDITOR_VERSION_CHANGED' ? (isAr ? 'تغيّرت النسخة؛ أعد تحميل القيمة قبل تعديلها.' : 'Version changed; reload the value before editing.') : contextError}
                <button type="button" onClick={() => { editingVersion.current = null; setAssignmentForm(form => ({ ...form, value: '' })); setContextState(null); setContextEpoch(current => current + 1); }} className="ms-2 rounded border px-2 py-1">{isAr ? 'إعادة التحقق ومسح الإدخال' : 'Recheck and clear input'}</button>
              </div>}
              {assignmentForm.key && !contextReady && !contextError && <p role="status">{isAr ? 'بانتظار التحقق من التعريف والنطاق…' : 'Waiting for definition and scope verification…'}</p>}
              {selectedDefinition ? (
                <Field label={`${isAr ? 'القيمة' : 'Value'} · ${selectedDefinition.valueType}`}>
                  {selectedDefinition.valueType === 'Boolean' ? (
                    <select
                      value={assignmentForm.value}
                      onChange={(e) => setAssignmentForm((f) => ({ ...f, value: e.target.value }))}
                      className="input"
                      required
                    >
                      <option value="">—</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <textarea
                      required
                      value={assignmentForm.value}
                      onChange={(e) => setAssignmentForm((f) => ({ ...f, value: e.target.value }))}
                      rows={selectedDefinition.valueType === 'Json' ? 5 : 2}
                      className="input font-mono text-xs"
                      dir="ltr"
                    />
                  )}
                </Field>
              ) : null}
              <Field label={isAr ? 'سبب التغيير' : 'Change reason'}>
                <input value={assignmentForm.changeReason} maxLength={1000} minLength={3}
                  required={selectedDefinition?.isFeatureFlag}
                  onChange={event => setAssignmentForm(form => ({ ...form, changeReason: event.target.value }))} className="input" />
              </Field>
              <button
                disabled={saving || !contextReady || !selectedDefinition || selectedDefinition.isSecret || selectedDefinition.isDeprecated || assignmentForm.level === 'TENANT'}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 py-3 text-xs font-black text-white hover:bg-[#0E7C86] disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isAr ? 'إنشاء نسخة جديدة' : 'Create New Version'}
              </button>
            </fieldset>
          </form>
        </div>
      )}

      {selectedHistory ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={() => {
            if (!busy.current) setSelectedHistory(null);
          }}
        >
          <div
            ref={historyPanel}
            role="dialog"
            aria-modal="true"
            aria-label={selectedHistory.key}
            tabIndex={-1}
            className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#142B5F]">{selectedHistory.key}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {selectedHistory.level} {selectedHistory.scopeId ?? ''}
                </p>
              </div>
              <button
                disabled={saving}
                onClick={() => setSelectedHistory(null)}
                className="rounded-xl border px-3 py-2 text-xs font-black"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {historyError && <div role="alert" className="text-red-700">{historyError}
                <button type="button" disabled={historyLoading} onClick={() => void loadHistory(selectedHistory, historyCursor)} className="ms-2 rounded border px-2 py-1">{isAr ? 'إعادة المحاولة' : 'Retry'}</button>
              </div>}
              {historyLoading && <p role="status">{isAr ? 'تحميل السجل…' : 'Loading history…'}</p>}
              {!historyLoading && !historyError && historyVersions.length === 0 && <p>{isAr ? 'لا توجد نسخ في هذه الصفحة.' : 'No versions on this page.'}</p>}
              {[...historyVersions]
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
                    b.id.localeCompare(a.id),
                )
                .map((version) => (
                  <div key={version.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-mono text-[11px] font-bold text-slate-500">
                          {version.id}
                        </div>
                        <div className="mt-1 break-all font-mono text-xs font-bold text-slate-900">
                          {version.operation === 'CLEAR_OVERRIDE' ? (isAr ? 'إلغاء Override والعودة للوراثة' : 'Override cleared; inheritance restored') : displayValue(version.value)}
                          {version.changeReason && <p className="mt-1 text-slate-600">{version.changeReason}</p>}
                        </div>
                        <div className="mt-2 text-[10px] font-semibold text-slate-400">
                          {new Date(version.createdAt).toLocaleString(isAr ? 'ar-YE' : 'en-GB', {
                            timeZone: 'Asia/Aden',
                          })}{' '}
                          · {version.authorId ?? 'SYSTEM'}
                          {version.rollbackOfVersionId
                            ? ` · rollback of ${version.rollbackOfVersionId}`
                            : ''}
                        </div>
                      </div>
                      {version.id === selectedHistory.currentVersionId ? (
                        <span className="rounded-lg bg-green-50 px-2 py-1 text-[10px] font-black text-green-700">
                          {isAr ? 'الحالية' : 'CURRENT'}
                        </span>
                      ) : (
                        <button
                          disabled={saving || !canRestore(selectedHistory)}
                          onClick={() => void rollback(selectedHistory, version)}
                          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-800 hover:bg-amber-100"
                        >
                          {isAr ? 'استعادة كنسخة جديدة' : 'Restore as new version'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              {historyCursor && !historyError && <button type="button" disabled={historyLoading} onClick={() => void loadHistory(selectedHistory, historyCursor)} className="rounded border px-3 py-2">{isAr ? 'تحميل نسخ أقدم' : 'Load older versions'}</button>}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Unable to complete the settings operation.';
}

function Boundary({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[#0E7C86]/15 bg-white p-5">
      <div className="text-[#0E7C86]">{icon}</div>
      <h2 className="mt-3 font-black text-[#142B5F]">{title}</h2>
      <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">{text}</p>
    </div>
  );
}
function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-5 py-2.5 text-xs font-black transition ${active ? 'bg-white text-[#142B5F] shadow-sm' : 'text-[#0E7C86]/70 hover:text-[#142B5F]'}`}
    >
      {children}
    </button>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black text-slate-600">{label}</span>
      {children}
    </label>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="p-12 text-center text-xs font-bold text-slate-400">{text}</div>;
}
function Th({ children }: { children: ReactNode }) {
  return <th className="px-5 py-3 text-start font-black">{children}</th>;
}
function Td({ children, mono = false }: { children: ReactNode; mono?: boolean }) {
  return (
    <td className={`px-5 py-4 font-semibold text-slate-700 ${mono ? 'font-mono text-[11px]' : ''}`}>
      {children}
    </td>
  );
}
