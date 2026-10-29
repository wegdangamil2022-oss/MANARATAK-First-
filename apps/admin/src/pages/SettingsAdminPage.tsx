import { SettingsGovernancePanel } from '../components/SettingsGovernancePanel';
import { SettingsResolutionInspector } from '../components/SettingsResolutionInspector';
import { canEditSettingsAssignment, canEditSettingsScope } from './settingsAssignmentGovernance';
import { SettingsIdentityScopePicker } from '../components/SettingsIdentityScopePicker';
import { ADMIN_PERMISSION_CATALOG } from '@manaratak/shared';
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useOwnerOperationScope } from '../security/useOwnerOperationScope';
import { useAdministrationDraftGuard } from '../features/reference-data/useAdministrationDraftGuard';
import { OperationsHeading } from '../features/operations/OperationsWorkspace';
import {
  SettingsNavigation,
  SettingsOverview,
  SettingsDialog,
} from '../features/settings/SettingsWorkspace';
import {
  settingsView,
  parseSettingsValue,
  settingsOperationError,
  type SettingsView,
} from '../features/settings/settingsModel';
import {
  History,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';

type ValueType = 'String' | 'Number' | 'Boolean' | 'Json';
type ScopeLevel = 'GLOBAL' | 'TENANT' | 'DOMAIN' | 'IDENTITY';
const knownDomainScopeKeys = [
  ...new Set(ADMIN_PERMISSION_CATALOG.map((item) => item.domain)),
].sort();

interface Definition {
  id: string;
  key: string;
  valueType: ValueType;
  description?: string;
  defaultValue?: unknown;
  validationRules?: Record<string, unknown>;
  isFeatureFlag: boolean;
  isDeprecated: boolean;
  isSecret: boolean;
  revision?: string;
  consumerDomain?: string;
  lastChangedBy?: string;
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
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 240 ? `${text.slice(0, 240)}…` : text;
}

export function SettingsAdminPage() {
  const { language } = useTranslation();
  const isAr = language === 'ar';
  const { hasPermission } = useAdminAuthorization();
  const owner = useOwnerOperationScope('settings-workspace');
  const [params, setParams] = useSearchParams();
  const view = settingsView(params.get('view'));
  const activeTab = view === 'assignments' ? 'assignments' : 'definitions';
  const [editor, setEditor] = useState<'definition' | 'assignment' | null>(null);
  const [review, setReview] = useState<{
    operation: 'assignment' | 'rollback' | 'clear' | 'definition-update';
    title: string;
    key: string;
    before: unknown;
    after: unknown;
    payload: Record<string, unknown>;
    metadata?: Definition;
    deprecate?: boolean;
    impact?: number;
  } | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [reviewDescription, setReviewDescription] = useState('');
  const [reviewDomain, setReviewDomain] = useState('');
  const [impactLoading, setImpactLoading] = useState(false);
  const impactGeneration = useRef(0);
  const [governanceDirty, setGovernanceDirty] = useState(false);
  const [governanceBusy, setGovernanceBusy] = useState(false);
  const [metadataEpoch, setMetadataEpoch] = useState(0);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const pendingCommand = useRef<null | {
    endpoint: string;
    body: string;
    key: string;
    complete: () => void;
    operation: string;
  }>(null);
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<Assignment | null>(null);
  const [historyVersions, setHistoryVersions] = useState<Version[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | undefined>();
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const historyGeneration = useRef(0);
  const historyBusy = useRef(false);

  const loadHistory = useCallback(async (assignment: Assignment, cursor?: string) => {
    if (historyBusy.current) return;
    historyBusy.current = true;
    const request = ++historyGeneration.current;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const query = new URLSearchParams({
        expectedCurrentVersionId: assignment.currentVersionId,
        limit: '50',
      });
      if (cursor) query.set('cursor', cursor);
      const result = await adminApiClient.request<{
        data: { versions: Version[]; nextCursor?: string };
      }>(`/admin/settings/assignments/${encodeURIComponent(assignment.id)}/history?${query}`, {
        cache: 'no-store',
      });
      if (request !== historyGeneration.current) return;
      if (!Array.isArray(result.data?.versions)) throw new Error('Invalid history response');
      setHistoryVersions((previous) =>
        cursor
          ? [
              ...new Map(
                [...previous, ...result.data.versions].map((version) => [version.id, version]),
              ).values(),
            ]
          : result.data.versions,
      );
      setHistoryCursor(result.data.nextCursor);
    } catch (cause) {
      if (request === historyGeneration.current) setHistoryError(errorText(cause));
    } finally {
      if (request === historyGeneration.current) {
        setHistoryLoading(false);
        historyBusy.current = false;
      }
    }
  }, []);

  useEffect(() => {
    setHistoryVersions([]);
    setHistoryCursor(undefined);
    setHistoryError('');
    historyBusy.current = false;
    if (selectedHistory) void loadHistory(selectedHistory);
    return () => {
      historyGeneration.current += 1;
      historyBusy.current = false;
    };
  }, [selectedHistory, loadHistory]);

  const [definitionForm, setDefinitionForm] = useState({
    key: '',
    valueType: 'String' as ValueType,
    description: '',
    defaultValue: '',
    validationRulesText: '',
    consumerDomain: '',
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
  const [sourceReady, setReady] = useState(false);
  const [loadedSignature, setLoadedSignature] = useState('');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const classification =
    view === 'flags'
      ? 'FLAG'
      : ['ALL', 'SETTING', 'FLAG', 'SECRET', 'DEPRECATED'].includes(params.get('class') ?? '')
        ? params.get('class')!
        : 'ALL';
  const scopeFilter = ['GLOBAL', 'DOMAIN', 'IDENTITY', 'TENANT'].includes(params.get('level') ?? '')
    ? params.get('level')!
    : 'ALL';
  const appliedSearch = params.get('q') ?? '';
  const updateFilter = useCallback(
    (name: string, value: string) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value && value !== 'ALL') next.set(name, value);
          else next.delete(name);
          return next;
        },
        { replace: true },
      );
      setDefinitionCursors([]);
      setAssignmentCursors([]);
    },
    [setParams],
  );
  const setClassification = (value: string) => updateFilter('class', value);
  const setScopeFilter = (value: string) => updateFilter('level', value);
  useEffect(() => {
    setSearch(appliedSearch);
    setDefinitionCursors([]);
    setAssignmentCursors([]);
  }, [appliedSearch, classification, scopeFilter]);
  const [definitionCursors, setDefinitionCursors] = useState<string[]>([]);
  const [assignmentCursors, setAssignmentCursors] = useState<string[]>([]);
  const [definitionNext, setDefinitionNext] = useState<string | undefined>();
  const [assignmentNext, setAssignmentNext] = useState<string | undefined>();
  const listSignature = JSON.stringify([
    appliedSearch,
    classification,
    scopeFilter,
    definitionCursors,
    assignmentCursors,
  ]);
  const ready = sourceReady && loadedSignature === listSignature;
  const [contextEpoch, setContextEpoch] = useState(0);
  const [contextState, setContextState] = useState<{
    signature: string;
    definition: Definition;
    assignment: Assignment | null;
  } | null>(null);
  const [contextError, setContextError] = useState('');
  const contextGeneration = useRef(0);
  const editingVersion = useRef<{ signature: string; version: string } | null>(null);
  const contextSignature = JSON.stringify([
    assignmentForm.key.trim(),
    assignmentForm.level,
    assignmentForm.level === 'GLOBAL' ? '' : assignmentForm.scopeId.trim(),
  ]);
  const selectedDefinition =
    contextState?.signature === contextSignature ? contextState.definition : undefined;
  const selectedAssignment =
    contextState?.signature === contextSignature ? contextState.assignment : undefined;
  const contextReady = contextState?.signature === contextSignature;

  useEffect(() => {
    if (search.trim() === appliedSearch) return;
    const timer = window.setTimeout(() => {
      updateFilter('q', search.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, appliedSearch, updateFilter]);
  useEffect(() => {
    const request = ++contextGeneration.current;
    setContextState(null);
    setContextError('');
    const [key, level, rawScopeId] = JSON.parse(contextSignature) as [string, ScopeLevel, string];
    const scopeId = level === 'GLOBAL' ? undefined : rawScopeId;
    if (!key || !/^[a-zA-Z0-9_\-.]+$/.test(key) || (level !== 'GLOBAL' && !scopeId)) return;
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({ key, level });
      if (scopeId) query.set('scopeId', scopeId);
      void adminApiClient
        .request<{ data: { definition: Definition; assignment: Assignment | null } }>(
          `/admin/settings/assignments/context?${query}`,
          { cache: 'no-store' },
        )
        .then((result) => {
          if (request !== contextGeneration.current) return;
          if (!result.data?.definition || !('assignment' in result.data))
            throw new Error('Invalid context response');
          if (
            editingVersion.current?.signature === contextSignature &&
            editingVersion.current.version !== result.data.assignment?.currentVersionId
          )
            throw new Error('SETTINGS_EDITOR_VERSION_CHANGED');
          setContextState({ signature: contextSignature, ...result.data });
        })
        .catch((cause) => {
          if (request === contextGeneration.current) setContextError(errorText(cause));
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      contextGeneration.current += 1;
    };
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

  const refresh = useCallback(async () => {
    if (!owner.isCurrent()) return;
    const request = ++generation.current;
    refreshing.current = true;
    setLoading(true);
    setReady(false);
    const definitionQuery = new URLSearchParams({ limit: '50', classification });
    const assignmentQuery = new URLSearchParams({ limit: '50' });
    if (appliedSearch) {
      definitionQuery.set('q', appliedSearch);
      assignmentQuery.set('q', appliedSearch);
    }
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
    if (!owner.isCurrent() || request !== generation.current) return;
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
    setLoadedSignature(listSignature);
    setLoadErrors(failures);
    setReady(!failures.length);
    setLoading(false);
    refreshing.current = false;
  }, [
    classification,
    appliedSearch,
    scopeFilter,
    definitionCursors,
    assignmentCursors,
    isAr,
    listSignature,
    owner,
  ]);

  useEffect(() => {
    void refresh();
    return () => {
      generation.current += 1;
      refreshing.current = false;
    };
  }, [refresh]);
  useEffect(() => {
    if (!selectedHistory || review) return;
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
  }, [selectedHistory, review]);

  const filteredDefinitions = definitions;
  const filteredAssignments = assignments;
  // TENANT has no approved canonical owner/selector. Preserve historical reads,
  // but block new Admin edits and lifecycle mutations until its authority is decided.
  const canRestore = (assignment: Assignment) =>
    canEditSettingsAssignment(assignment.level, assignment.isWritable, ready);
  const editAssignment = (item: Assignment) => {
    if (busy.current || !canEditSettingsScope(item.level)) return;
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
    setContextEpoch((current) => current + 1);
    editingVersion.current = {
      signature: JSON.stringify([item.key, item.level, item.scopeId || '']),
      version: item.currentVersionId,
    };
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
    setParams({ view: 'assignments' });
    setEditor('assignment');
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

  const parseValue = parseSettingsValue;

  const saveCommand = async (
    operation: 'definition' | 'assignment' | 'rollback' | 'clear' | 'definition-update',
    payload: Record<string, unknown>,
    complete: () => void,
  ) => {
    if (
      !owner.isCurrent() ||
      busy.current ||
      refreshing.current ||
      !ready ||
      pendingCommand.current
    )
      return;
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
            : operation === 'definition-update'
              ? {}
              : { newVersionId: command.versionId }),
      };
      const endpoint =
        operation === 'definition'
          ? '/admin/settings/definitions'
          : operation === 'assignment'
            ? '/admin/settings/assignments'
            : operation === 'clear'
              ? '/admin/settings/assignments/clear'
              : operation === 'definition-update'
                ? '/admin/settings/definitions/update'
                : '/admin/settings/assignments/rollback';
      const frozen = {
        endpoint,
        body: JSON.stringify(body),
        key: command.key,
        complete,
        operation,
      };
      pendingCommand.current = frozen;
      await adminApiClient.request(endpoint, {
        method: 'POST',
        idempotencyKey: frozen.key,
        body: frozen.body,
      });
      if (!owner.isCurrent()) return;
      pendingCommand.current = null;
      setUnconfirmed(false);
      commands.current.delete(signature);
      complete();
      setEditor(null);
      setReview(null);
      setMetadataEpoch((value) => value + 1);
      setNotice(
        isAr
          ? 'تم الحفظ؛ أُعيد طلب القيم من الخادم.'
          : 'Saved; current values were requested again from the server.',
      );
      if (operation === 'assignment') {
        editingVersion.current = null;
        setContextState(null);
        setContextEpoch((current) => current + 1);
      }
      await refresh();
    } catch (cause) {
      if (!owner.isCurrent()) return;
      const message = cause instanceof Error ? cause.message : '';
      if (/^\[(400|401|403|404|409|422|429)\]/.test(message)) pendingCommand.current = null;
      else if (pendingCommand.current) setUnconfirmed(true);
      setError(settingsOperationError(cause, isAr));
    } finally {
      if (owner.isCurrent()) {
        busy.current = false;
        setSaving(false);
      }
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
      const validationRules = definitionForm.validationRulesText.trim()
        ? (JSON.parse(definitionForm.validationRulesText) as unknown)
        : undefined;
      if (
        validationRules !== undefined &&
        (!validationRules || typeof validationRules !== 'object' || Array.isArray(validationRules))
      )
        throw new Error(
          isAr ? 'قيود التحقق يجب أن تكون كائن JSON.' : 'Validation rules must be a JSON object.',
        );
      await saveCommand(
        'definition',
        {
          key: definitionForm.key.trim(),
          valueType: definitionForm.valueType,
          description: definitionForm.description.trim() || undefined,
          defaultValue,
          validationRules,
          ...(definitionForm.consumerDomain
            ? { consumerDomain: definitionForm.consumerDomain }
            : {}),
          isFeatureFlag: definitionForm.isFeatureFlag,
          isSecret: definitionForm.isSecret,
        },
        () =>
          setDefinitionForm({
            key: '',
            valueType: 'String',
            description: '',
            defaultValue: '',
            validationRulesText: '',
            consumerDomain: '',
            isFeatureFlag: false,
            isSecret: false,
          }),
      );
    } catch (cause) {
      setError(settingsOperationError(cause, isAr));
    }
  };
  const assignValue = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !contextReady ||
      !selectedDefinition ||
      selectedDefinition.isSecret ||
      selectedDefinition.isDeprecated ||
      !canEditSettingsScope(assignmentForm.level)
    )
      return;
    try {
      if (assignmentForm.level !== 'GLOBAL' && !assignmentForm.scopeId.trim())
        throw new Error(isAr ? 'أدخل معرّف النطاق.' : 'Enter the scope identifier.');
      const payload = {
        key: selectedDefinition.key,
        level: assignmentForm.level,
        scopeId: assignmentForm.level === 'GLOBAL' ? undefined : assignmentForm.scopeId.trim(),
        value: parseValue(selectedDefinition.valueType, assignmentForm.value),
        type: selectedDefinition.valueType,
        expectedCurrentVersionId: selectedAssignment?.currentVersionId ?? null,
      };
      setReviewReason(assignmentForm.changeReason);
      setReview({
        operation: 'assignment',
        title: isAr ? 'مراجعة القيمة قبل الحفظ' : 'Review value before saving',
        key: selectedDefinition.key,
        before: selectedAssignment?.isOverrideCleared
          ? isAr
            ? 'وراثة'
            : 'Inherited'
          : selectedAssignment?.currentValue,
        after: payload.value,
        payload,
      });
    } catch (cause) {
      setError(settingsOperationError(cause, isAr));
    }
  };
  const rollback = (assignment: Assignment, version: Version) => {
    if (busy.current || !canRestore(assignment) || version.id === assignment.currentVersionId)
      return;
    setReviewReason('');
    setReview({
      operation: 'rollback',
      title: isAr ? 'استعادة نسخة محفوظة' : 'Restore a saved version',
      key: assignment.key,
      before: assignment.currentValue,
      after:
        version.operation === 'CLEAR_OVERRIDE'
          ? isAr
            ? 'العودة للوراثة'
            : 'Inherit'
          : version.value,
      payload: {
        assignmentId: assignment.id,
        previousVersionId: version.id,
        expectedCurrentVersionId: assignment.currentVersionId,
      },
    });
  };
  const clearOverride = (assignment: Assignment) => {
    if (busy.current || assignment.isOverrideCleared || !canRestore(assignment)) return;
    setReviewReason('');
    setReview({
      operation: 'clear',
      title: isAr ? 'إلغاء القيمة المحلية والعودة للوراثة' : 'Clear local value and inherit',
      key: assignment.key,
      before: assignment.currentValue,
      after: isAr
        ? 'يرجع الحل إلى النطاق التالي؛ لا يُحذف السجل.'
        : 'Resolution falls back to the next scope; history is preserved.',
      payload: {
        assignmentId: assignment.id,
        expectedCurrentVersionId: assignment.currentVersionId,
      },
    });
  };
  const updateDefinition = async (definition: Definition, deprecate: boolean) => {
    if (busy.current || pendingCommand.current || !definition.revision) return;
    setReviewReason('');
    setReviewDescription(definition.description ?? '');
    setReviewDomain(definition.consumerDomain ?? '');
    setReview({
      operation: 'definition-update',
      title: deprecate
        ? isAr
          ? 'إيقاف تعريف الإعداد'
          : 'Deprecate setting definition'
        : isAr
          ? 'تعديل بيانات التعريف'
          : 'Edit definition metadata',
      key: definition.key,
      before: deprecate ? (isAr ? 'فعال' : 'Active') : definition.description,
      after: deprecate
        ? isAr
          ? 'متوقف؛ يبقى السجل محفوظًا.'
          : 'Deprecated; history is preserved.'
        : definition.description,
      payload: { key: definition.key, expectedRevision: definition.revision },
      metadata: definition,
      deprecate,
    });
    if (deprecate) {
      const token = ++impactGeneration.current;
      setImpactLoading(true);
      try {
        const result = await adminApiClient.request<{ data: { assignmentCount: number } }>(
          `/admin/settings/definitions/${encodeURIComponent(definition.key)}/impact`,
          { cache: 'no-store' },
        );
        if (!Number.isSafeInteger(result.data.assignmentCount) || result.data.assignmentCount < 0)
          throw Error('SETTINGS_IMPACT_INVALID');
        if (token === impactGeneration.current)
          setReview((current) =>
            current ? { ...current, impact: result.data.assignmentCount } : current,
          );
      } catch (cause) {
        if (token === impactGeneration.current) setError(settingsOperationError(cause, isAr));
      } finally {
        if (token === impactGeneration.current) setImpactLoading(false);
      }
    }
  };
  const resetDrafts = () => {
    setEditor(null);
    setReview(null);
    setGovernanceDirty(false);
    setDefinitionForm({
      key: '',
      valueType: 'String',
      description: '',
      defaultValue: '',
      validationRulesText: '',
      consumerDomain: '',
      isFeatureFlag: false,
      isSecret: false,
    });
    setAssignmentForm({ key: '', level: 'GLOBAL', scopeId: '', value: '', changeReason: '' });
  };
  const dirty =
    (!!editor &&
      (!!definitionForm.key ||
        !!definitionForm.description ||
        !!definitionForm.defaultValue ||
        !!definitionForm.validationRulesText ||
        !!definitionForm.consumerDomain ||
        !!assignmentForm.key ||
        !!assignmentForm.value ||
        !!assignmentForm.changeReason)) ||
    (!!review && !!reviewReason) ||
    governanceDirty;
  const mayDiscard = () =>
    !saving &&
    !governanceBusy &&
    !pendingCommand.current &&
    (!dirty ||
      window.confirm(
        isAr ? 'لديك تعديلات غير محفوظة. هل تريد إغلاقها؟' : 'Discard the unsaved changes?',
      ));
  useAdministrationDraftGuard(
    dirty || saving || governanceBusy || unconfirmed,
    isAr,
    resetDrafts,
    () => !busy.current && !governanceBusy && !pendingCommand.current,
  );
  const navigate = (next: SettingsView, key?: string) => {
    if (!mayDiscard()) return;
    resetDrafts();
    setSelectedHistory(null);
    setDefinitionCursors([]);
    setAssignmentCursors([]);
    setParams({ view: next, ...(key ? { key } : {}) });
  };
  const openDefinition = () => {
    if (!mayDiscard()) return;
    resetDrafts();
    if (view === 'flags')
      setDefinitionForm({
        key: '',
        valueType: 'Boolean',
        description: '',
        defaultValue: 'false',
        validationRulesText: '',
        consumerDomain: '',
        isFeatureFlag: true,
        isSecret: false,
      });
    setEditor('definition');
  };
  const openAssignment = (definition?: Definition) => {
    if (!mayDiscard()) return;
    resetDrafts();
    editingVersion.current = null;
    setContextState(null);
    if (definition)
      setAssignmentForm({
        key: definition.key,
        level: 'GLOBAL',
        scopeId: '',
        value: '',
        changeReason: '',
      });
    setParams({ view: 'assignments' });
    setEditor('assignment');
  };
  const closeEditor = () => {
    if (mayDiscard()) resetDrafts();
  };
  const closeReview = () => {
    if (
      saving ||
      pendingCommand.current ||
      (reviewReason &&
        !window.confirm(
          isAr ? 'إغلاق مراجعة التغيير دون حفظ؟' : 'Close this review without saving?',
        ))
    )
      return;
    impactGeneration.current++;
    setImpactLoading(false);
    setReview(null);
  };
  const retryPending = async () => {
    const frozen = pendingCommand.current;
    if (!frozen || busy.current || !owner.isCurrent()) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      await adminApiClient.request(frozen.endpoint, {
        method: 'POST',
        idempotencyKey: frozen.key,
        body: frozen.body,
      });
      if (!owner.isCurrent()) return;
      pendingCommand.current = null;
      setUnconfirmed(false);
      frozen.complete();
      setEditor(null);
      setReview(null);
      setContextEpoch((value) => value + 1);
      setMetadataEpoch((value) => value + 1);
      setNotice(
        isAr ? 'تأكد حفظ الطلب؛ جارٍ إعادة قراءة البيانات.' : 'Request confirmed; refreshing data.',
      );
      await refresh();
    } catch (cause) {
      if (!owner.isCurrent()) return;
      if (/^\[(400|401|403|404|409|422|429)\]/.test(cause instanceof Error ? cause.message : '')) {
        pendingCommand.current = null;
        setUnconfirmed(false);
      }
      setError(settingsOperationError(cause, isAr));
    } finally {
      if (owner.isCurrent()) {
        busy.current = false;
        setSaving(false);
      }
    }
  };
  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !review ||
      reviewReason.trim().length < 3 ||
      impactLoading ||
      (review.deprecate && review.impact === undefined)
    )
      return;
    const payload = {
      ...review.payload,
      changeReason: reviewReason.trim(),
      ...(review.metadata
        ? review.deprecate
          ? { isDeprecated: true }
          : {
              description: reviewDescription,
              ...(reviewDomain ? { consumerDomain: reviewDomain } : {}),
            }
        : {}),
    };
    await saveCommand(review.operation, payload, () => {
      if (review.operation === 'assignment') {
        editingVersion.current = null;
        setAssignmentForm((current) => ({ ...current, value: '', changeReason: '' }));
      }
      if (review.operation === 'clear' || review.operation === 'rollback') setSelectedHistory(null);
    });
  };

  const operationFeedback = (
    <>
      {error && <p role="alert">{error}</p>}
      {unconfirmed && (
        <div role="alert">
          <p>
            {isAr
              ? 'نتيجة الطلب غير مؤكدة؛ أعد تأكيد الطلب نفسه.'
              : 'The outcome is uncertain; retry the same request.'}
          </p>
          <button type="button" disabled={saving} onClick={() => void retryPending()}>
            {isAr ? 'تأكيد الطلب المحفوظ' : 'Retry the frozen request'}
          </button>
        </div>
      )}
    </>
  );
  return (
    <div
      className="settings-workspace operations-workspace sf-workspace"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <OperationsHeading
        title={isAr ? 'إعدادات المنصة' : 'Platform settings'}
        description={
          isAr
            ? 'إعدادات واضحة، تغييرات مُراجعة، وقيم يمكن تتبع مصدرها.'
            : 'Clear configuration, reviewed changes and traceable effective values.'
        }
        icon={Settings2}
        actions={
          <button
            type="button"
            disabled={loading || saving || governanceBusy || unconfirmed}
            onClick={() => {
              setError(null);
              setNotice('');
              void refresh();
            }}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {isAr ? 'تحديث البيانات' : 'Refresh data'}
          </button>
        }
      />
      <SettingsNavigation
        view={view}
        ar={isAr}
        disabled={saving || governanceBusy || unconfirmed}
        onChange={navigate}
      />
      {view === 'overview' && (
        <SettingsOverview ar={isAr} onChange={navigate}>
          {hasPermission('admin:authorization:manage') && (
            <Link to="/authorization">{isAr ? 'الأدوار والصلاحيات' : 'Roles and permissions'}</Link>
          )}
          {hasPermission('admin:reference-data:manage') && (
            <Link to="/settings/reference-data">
              {isAr ? 'البيانات المرجعية' : 'Reference data'}
            </Link>
          )}
          {hasPermission('admin:audit:manage') && (
            <Link to="/audit">{isAr ? 'سجل التدقيق' : 'Audit records'}</Link>
          )}
          {hasPermission('admin:platform:manage') && (
            <Link to="/health-readiness">{isAr ? 'الصحة والجاهزية' : 'Health and readiness'}</Link>
          )}
        </SettingsOverview>
      )}
      {view === 'resolution' && (
        <SettingsResolutionInspector
          key={params.get('key') ?? ''}
          initialKey={params.get('key') ?? ''}
          definitions={definitions}
          isAr={isAr}
        />
      )}
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

      {unconfirmed && !editor && !review && (
        <div role="alert" className="settings-panel">
          <p>
            {isAr
              ? 'نتيجة الحفظ غير مؤكدة. أعد إرسال الطلب نفسه لتأكيد النتيجة.'
              : 'The save outcome is uncertain. Retry the same request to confirm.'}
          </p>
          <button type="button" disabled={saving} onClick={() => void retryPending()}>
            {isAr ? 'تأكيد الطلب المحفوظ' : 'Retry the frozen request'}
          </button>
        </div>
      )}
      {view === 'governance' && (
        <SettingsGovernancePanel
          definitions={definitions}
          onSaved={() => {
            void refresh();
          }}
          onDirtyChange={setGovernanceDirty}
          onBusyChange={setGovernanceBusy}
        />
      )}
      {['catalog', 'flags', 'assignments'].includes(view) && (
        <>
          <section
            className="settings-panel settings-filters"
            aria-label={isAr ? 'البحث وتصفية الإعدادات' : 'Search and filter settings'}
          >
            <Field
              label={isAr ? 'بحث بالمفتاح أو الوصف أو النطاق' : 'Search key, description or scope'}
            >
              <input
                value={search}
                maxLength={200}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field>
            {view === 'assignments' ? (
              <Field label={isAr ? 'نطاق القيم' : 'Value scope'}>
                <select
                  value={scopeFilter}
                  onChange={(event) => setScopeFilter(event.target.value)}
                >
                  <option value="ALL">{isAr ? 'كل النطاقات' : 'All scopes'}</option>
                  {['GLOBAL', 'DOMAIN', 'IDENTITY', 'TENANT'].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label={isAr ? 'التصنيف' : 'Classification'}>
                <select
                  value={classification}
                  disabled={view === 'flags'}
                  onChange={(event) => setClassification(event.target.value)}
                >
                  {[
                    ['ALL', isAr ? 'الكل' : 'All'],
                    ['SETTING', isAr ? 'إعدادات' : 'Settings'],
                    ['FLAG', isAr ? 'مفاتيح الميزات' : 'Feature flags'],
                    ['SECRET', isAr ? 'متطلبات الأسرار' : 'Secret requirements'],
                    ['DEPRECATED', isAr ? 'متوقفة' : 'Deprecated'],
                  ].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <button
              type="button"
              disabled={saving || unconfirmed}
              onClick={() => {
                setSearch('');
                setDefinitionCursors([]);
                setAssignmentCursors([]);
                setParams({ view });
              }}
            >
              {isAr ? 'مسح الفلاتر' : 'Clear filters'}
            </button>
          </section>
          <div className="settings-actions">
            <button
              type="button"
              className="settings-primary"
              disabled={!ready || saving || unconfirmed}
              onClick={() => (view === 'assignments' ? openAssignment() : openDefinition())}
            >
              <Plus size={16} aria-hidden="true" />
              {view === 'assignments'
                ? isAr
                  ? 'تعيين قيمة'
                  : 'Assign a value'
                : view === 'flags'
                  ? isAr
                    ? 'تعريف مفتاح ميزة'
                    : 'Define feature flag'
                  : isAr
                    ? 'تعريف إعداد'
                    : 'Define a setting'}
            </button>
          </div>
          <div
            className="settings-pagination"
            aria-label={isAr ? 'تصفح صفحات الإعدادات' : 'Settings pagination'}
          >
            <button
              type="button"
              disabled={
                loading ||
                saving ||
                unconfirmed ||
                !ready ||
                search.trim() !== appliedSearch ||
                !(activeTab === 'definitions' ? definitionCursors.length : assignmentCursors.length)
              }
              onClick={() =>
                activeTab === 'definitions'
                  ? setDefinitionCursors((previous) => previous.slice(0, -1))
                  : setAssignmentCursors((previous) => previous.slice(0, -1))
              }
              className="rounded border px-3 py-2 disabled:opacity-50"
            >
              {isAr ? 'الصفحة السابقة' : 'Previous page'}
            </button>
            <span>
              {isAr ? 'الصفحة' : 'Page'}{' '}
              {(activeTab === 'definitions' ? definitionCursors.length : assignmentCursors.length) +
                1}
            </span>
            <button
              type="button"
              disabled={
                loading ||
                saving ||
                unconfirmed ||
                !ready ||
                search.trim() !== appliedSearch ||
                !(activeTab === 'definitions' ? definitionNext : assignmentNext)
              }
              onClick={() =>
                activeTab === 'definitions'
                  ? definitionNext &&
                    setDefinitionCursors((previous) => [...previous, definitionNext])
                  : assignmentNext &&
                    setAssignmentCursors((previous) => [...previous, assignmentNext])
              }
              className="rounded border px-3 py-2 disabled:opacity-50"
            >
              {isAr ? 'الصفحة التالية' : 'Next page'}
            </button>
          </div>
          {loading || loadedSignature !== listSignature ? (
            <div className="flex min-h-52 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0E7C86]" />
            </div>
          ) : activeTab === 'definitions' ? (
            <div className="settings-list-layout">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="font-black text-[#142B5F]">
                    {isAr ? 'تعريفات الإعدادات' : 'Setting Definitions'}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {definitions.length}{' '}
                    {isAr ? 'تعريفًا في الصفحة الحالية' : 'definitions on this page'}
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
                            <Td mono>
                              {item.isSecret ? '••••••••' : displayValue(item.defaultValue)}
                            </Td>
                            <Td>
                              <span>
                                {item.isDeprecated
                                  ? isAr
                                    ? 'متوقف'
                                    : 'Deprecated'
                                  : isAr
                                    ? 'فعال'
                                    : 'Active'}
                              </span>
                              <p className="text-slate-500">{item.description}</p>
                              <SettingsDefinitionMetadata
                                key={item.key + metadataEpoch}
                                definition={item}
                                isAr={isAr}
                              />
                              {!item.isSecret && !item.isDeprecated && (
                                <button
                                  type="button"
                                  disabled={!ready || saving || unconfirmed}
                                  onClick={() => openAssignment(item)}
                                >
                                  {isAr ? 'تعيين قيمة' : 'Assign value'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => navigate('resolution', item.key)}
                              >
                                {isAr ? 'فحص القيمة الفعالة' : 'Inspect effective value'}
                              </button>
                              <button
                                type="button"
                                disabled={saving || unconfirmed || !ready || !item.revision}
                                onClick={() => void updateDefinition(item, false)}
                                className="ms-2 rounded border px-2 py-1"
                              >
                                {isAr ? 'تعديل الوصف' : 'Edit description'}
                              </button>
                              {!item.isDeprecated && (
                                <button
                                  type="button"
                                  disabled={saving || unconfirmed || !ready || !item.revision}
                                  onClick={() => void updateDefinition(item, true)}
                                  className="ms-2 rounded border px-2 py-1"
                                >
                                  {isAr ? 'إيقاف التعريف' : 'Deprecate definition'}
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

              {editor === 'definition' && (
                <SettingsDialog
                  title={
                    view === 'flags'
                      ? isAr
                        ? 'تعريف مفتاح ميزة'
                        : 'Define feature flag'
                      : isAr
                        ? 'تعريف إعداد'
                        : 'Define a setting'
                  }
                  onClose={closeEditor}
                  busy={saving || unconfirmed}
                >
                  <form
                    onSubmit={createDefinition}
                    className="h-fit rounded-2xl border border-[#0E7C86]/15 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-2 font-black text-[#142B5F]">
                      <Plus className="h-4 w-4" />
                      {view === 'flags'
                        ? isAr
                          ? 'تعريف مفتاح ميزة'
                          : 'Define feature flag'
                        : isAr
                          ? 'تعريف إعداد'
                          : 'Create definition'}
                    </div>
                    {operationFeedback}
                    <fieldset
                      disabled={saving || !ready || unconfirmed}
                      className="mt-4 min-w-0 space-y-4 disabled:opacity-60"
                    >
                      <Field label={isAr ? 'المفتاح namespaced' : 'Namespaced key'}>
                        <input
                          required
                          maxLength={240}
                          value={definitionForm.key}
                          onChange={(e) =>
                            setDefinitionForm((f) => ({ ...f, key: e.target.value }))
                          }
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
                              validationRulesText: '',
                              consumerDomain: '',
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
                        <Field
                          label={
                            definitionForm.isFeatureFlag
                              ? isAr
                                ? 'القيمة الافتراضية للميزة (إلزامية)'
                                : 'Flag default (required)'
                              : isAr
                                ? 'القيمة الافتراضية (اختيارية)'
                                : 'Default value (optional)'
                          }
                        >
                          {definitionForm.valueType === 'Boolean' ? (
                            <select
                              value={definitionForm.defaultValue}
                              onChange={(e) =>
                                setDefinitionForm((f) => ({ ...f, defaultValue: e.target.value }))
                              }
                              className="input"
                            >
                              {!definitionForm.isFeatureFlag && <option value="">—</option>}
                              <option value="true">
                                {isAr ? 'مفعّل · true' : 'Enabled · true'}
                              </option>
                              <option value="false">
                                {isAr ? 'معطل · false' : 'Disabled · false'}
                              </option>
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
                      <Field
                        label={
                          isAr
                            ? 'المجال المستهلك المعلن (اختياري)'
                            : 'Declared consumer domain (optional)'
                        }
                      >
                        <select
                          value={definitionForm.consumerDomain}
                          onChange={(event) =>
                            setDefinitionForm((form) => ({
                              ...form,
                              consumerDomain: event.target.value,
                            }))
                          }
                          className="input"
                        >
                          <option value="">—</option>
                          {knownDomainScopeKeys.map((domain) => (
                            <option key={domain}>{domain}</option>
                          ))}
                        </select>
                      </Field>
                      <Field
                        label={
                          isAr
                            ? 'قيود اختيارية على القيمة (JSON)'
                            : 'Optional value constraints (JSON)'
                        }
                      >
                        <textarea
                          value={definitionForm.validationRulesText}
                          onChange={(event) =>
                            setDefinitionForm((form) => ({
                              ...form,
                              validationRulesText: event.target.value,
                            }))
                          }
                          rows={3}
                          className="input font-mono text-xs"
                          dir="ltr"
                          placeholder={
                            definitionForm.valueType === 'Number'
                              ? '{"min":0,"max":100,"integer":true}'
                              : definitionForm.valueType === 'String'
                                ? '{"minLength":1,"maxLength":240}'
                                : definitionForm.valueType === 'Boolean'
                                  ? '{"allowedValues":[true,false]}'
                                  : ''
                          }
                        />
                        <p className="text-xs text-slate-500">
                          {isAr
                            ? 'المسموح: min/max/integer للأرقام، minLength/maxLength للنصوص، allowedValues للأنواع البسيطة. لا يُقبل Regex أو JSON Schema.'
                            : 'Supported: numeric bounds/integer, string lengths and scalar allowedValues. Regex and arbitrary JSON Schema are not accepted.'}
                        </p>
                      </Field>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          disabled={view === 'flags'}
                          checked={definitionForm.isFeatureFlag}
                          onChange={(e) =>
                            setDefinitionForm((f) => ({
                              ...f,
                              isFeatureFlag: e.target.checked,
                              ...(e.target.checked
                                ? {
                                    valueType: 'Boolean',
                                    defaultValue: 'false',
                                    isSecret: false,
                                    validationRulesText: '',
                                  }
                                : {}),
                            }))
                          }
                        />{' '}
                        Feature Flag
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          disabled={definitionForm.isFeatureFlag}
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
                </SettingsDialog>
              )}
            </div>
          ) : (
            <div className="settings-list-layout">
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
                            <Td mono>
                              {item.isOverrideCleared
                                ? isAr
                                  ? 'وراثة — دون قيمة محلية'
                                  : 'Inheriting — no local value'
                                : displayValue(item.currentValue)}
                            </Td>
                            <Td>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => setSelectedHistory(item)}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#0E7C86]/20 px-2.5 py-1.5 font-black text-[#142B5F] hover:bg-[#DDEFF2]/40"
                              >
                                <History className="h-3.5 w-3.5" />
                                {isAr ? 'سجل النسخ · ' : 'Version history · '}
                                {item.versionCount ?? item.versions.length}
                              </button>
                              {canRestore(item) && !item.isOverrideCleared && (
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => void clearOverride(item)}
                                  className="ms-2 rounded border px-2 py-1"
                                >
                                  {isAr ? 'إلغاء القيمة والوراثة' : 'Clear override / inherit'}
                                </button>
                              )}
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

              {editor === 'assignment' && !review && (
                <SettingsDialog
                  title={isAr ? 'تعيين قيمة حسب النطاق' : 'Assign a scoped value'}
                  onClose={closeEditor}
                  busy={saving || unconfirmed}
                >
                  <form
                    onSubmit={assignValue}
                    className="h-fit rounded-2xl border border-[#0E7C86]/15 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-2 font-black text-[#142B5F]">
                      <SlidersHorizontal className="h-4 w-4" />
                      {isAr ? 'تعيين قيمة' : 'Assign Value'}
                    </div>
                    {operationFeedback}
                    <fieldset
                      disabled={saving || !ready || unconfirmed}
                      className="mt-4 min-w-0 space-y-4 disabled:opacity-60"
                    >
                      <Field label={isAr ? 'التعريف' : 'Definition'}>
                        <input
                          required
                          list="settings-definition-options"
                          value={assignmentForm.key}
                          maxLength={200}
                          onChange={(event) => {
                            editingVersion.current = null;
                            setAssignmentForm((form) => ({
                              ...form,
                              key: event.target.value,
                              value: '',
                            }));
                          }}
                          className="input"
                          dir="ltr"
                        />
                        <datalist id="settings-definition-options">
                          {writableDefinitions.map((item) => (
                            <option key={item.id} value={item.key} />
                          ))}
                        </datalist>
                        <p className="text-xs text-slate-500">
                          {isAr
                            ? 'اختر أو أدخل مفتاح تعريف موجود؛ يُتحقق من التعريف والنطاق مباشرة.'
                            : 'Choose or enter an existing key; definition and scope are checked directly.'}
                        </p>
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
                          <option value="TENANT" disabled>
                            {isAr ? 'TENANT — غير معتمد للتعديل' : 'TENANT — legacy read-only'}
                          </option>
                          <option>IDENTITY</option>
                        </select>
                        <p className="text-xs text-slate-500">
                          {isAr
                            ? 'DOMAIN يختار من المجالات المعروفة للمنصة، وIDENTITY من IAM. نطاق TENANT القديم للقراءة فقط.'
                            : 'DOMAIN uses published platform domain keys, IDENTITY uses IAM. Legacy TENANT stays read-only.'}
                        </p>
                      </Field>
                      {assignmentForm.level === 'DOMAIN' ? (
                        <Field label={isAr ? 'المجال المعتمد' : 'Approved domain'}>
                          <select
                            required
                            value={assignmentForm.scopeId}
                            className="input"
                            dir="ltr"
                            onChange={(event) =>
                              setAssignmentForm((f) => ({ ...f, scopeId: event.target.value }))
                            }
                          >
                            <option value="">{isAr ? 'اختر المجال' : 'Select domain'}</option>
                            {knownDomainScopeKeys.map((domain) => (
                              <option key={domain} value={domain}>
                                {domain}
                              </option>
                            ))}
                          </select>
                        </Field>
                      ) : null}
                      {assignmentForm.level === 'IDENTITY' ? (
                        <Field label={isAr ? 'الهوية من IAM' : 'IAM identity'}>
                          <SettingsIdentityScopePicker
                            value={assignmentForm.scopeId}
                            isAr={isAr}
                            disabled={saving}
                            onChange={(id) => setAssignmentForm((f) => ({ ...f, scopeId: id }))}
                          />
                        </Field>
                      ) : null}
                      {contextError && (
                        <div role="alert" className="text-red-700">
                          {contextError === 'SETTINGS_EDITOR_VERSION_CHANGED'
                            ? isAr
                              ? 'تغيّرت النسخة؛ أعد تحميل القيمة قبل تعديلها.'
                              : 'Version changed; reload the value before editing.'
                            : contextError}
                          <button
                            type="button"
                            onClick={() => {
                              editingVersion.current = null;
                              setAssignmentForm((form) => ({ ...form, value: '' }));
                              setContextState(null);
                              setContextEpoch((current) => current + 1);
                            }}
                            className="ms-2 rounded border px-2 py-1"
                          >
                            {isAr ? 'إعادة التحقق ومسح الإدخال' : 'Recheck and clear input'}
                          </button>
                        </div>
                      )}
                      {assignmentForm.key && !contextReady && !contextError && (
                        <p role="status">
                          {isAr
                            ? 'بانتظار التحقق من التعريف والنطاق…'
                            : 'Waiting for definition and scope verification…'}
                        </p>
                      )}
                      {selectedDefinition ? (
                        <Field
                          label={`${isAr ? 'القيمة' : 'Value'} · ${selectedDefinition.valueType}`}
                        >
                          {selectedDefinition.valueType === 'Boolean' ? (
                            <select
                              value={assignmentForm.value}
                              onChange={(e) =>
                                setAssignmentForm((f) => ({ ...f, value: e.target.value }))
                              }
                              className="input"
                              required
                            >
                              <option value="">—</option>
                              <option value="true">
                                {isAr ? 'مفعّل · true' : 'Enabled · true'}
                              </option>
                              <option value="false">
                                {isAr ? 'معطل · false' : 'Disabled · false'}
                              </option>
                            </select>
                          ) : (
                            <textarea
                              required
                              value={assignmentForm.value}
                              onChange={(e) =>
                                setAssignmentForm((f) => ({ ...f, value: e.target.value }))
                              }
                              rows={selectedDefinition.valueType === 'Json' ? 5 : 2}
                              className="input font-mono text-xs"
                              dir="ltr"
                            />
                          )}
                        </Field>
                      ) : null}
                      <Field label={isAr ? 'سبب التغيير' : 'Change reason'}>
                        <input
                          value={assignmentForm.changeReason}
                          maxLength={1000}
                          minLength={3}
                          required
                          onChange={(event) =>
                            setAssignmentForm((form) => ({
                              ...form,
                              changeReason: event.target.value,
                            }))
                          }
                          className="input"
                        />
                      </Field>
                      <button
                        disabled={
                          saving ||
                          !contextReady ||
                          !selectedDefinition ||
                          selectedDefinition.isSecret ||
                          selectedDefinition.isDeprecated ||
                          !canEditSettingsScope(assignmentForm.level)
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 py-3 text-xs font-black text-white hover:bg-[#0E7C86] disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        {isAr ? 'مراجعة وحفظ القيمة' : 'Review and save value'}
                      </button>
                    </fieldset>
                  </form>
                </SettingsDialog>
              )}
            </div>
          )}
        </>
      )}
      {review && (
        <SettingsDialog title={review.title} onClose={closeReview} busy={saving || unconfirmed}>
          <form onSubmit={(event) => void submitReview(event)}>
            {operationFeedback}
            <code>{review.key}</code>
            {review.metadata && !review.deprecate ? (
              <>
                <Field label={isAr ? 'الوصف' : 'Description'}>
                  <textarea
                    value={reviewDescription}
                    maxLength={2000}
                    disabled={saving || unconfirmed}
                    onChange={(event) => setReviewDescription(event.target.value)}
                  />
                </Field>
                <Field label={isAr ? 'المجال المستهلك' : 'Consumer domain'}>
                  <select
                    value={reviewDomain}
                    disabled={saving || unconfirmed}
                    onChange={(event) => setReviewDomain(event.target.value)}
                  >
                    <option value="" disabled={!!review.metadata.consumerDomain}>
                      —
                    </option>
                    {knownDomainScopeKeys.map((domain) => (
                      <option key={domain}>{domain}</option>
                    ))}
                  </select>
                </Field>
              </>
            ) : (
              <div className="settings-review">
                <div>
                  <strong>{isAr ? 'قبل' : 'Before'}</strong>
                  <p>{displayValue(review.before)}</p>
                </div>
                <div>
                  <strong>{isAr ? 'بعد' : 'After'}</strong>
                  <p>{displayValue(review.after)}</p>
                </div>
              </div>
            )}
            {!!review.payload.level && (
              <p>
                {String(review.payload.level)} · {String(review.payload.scopeId ?? 'GLOBAL')}
              </p>
            )}
            {review.deprecate && (
              <p role="status">
                {impactLoading
                  ? isAr
                    ? 'جارٍ فحص الأثر…'
                    : 'Checking impact…'
                  : review.impact === undefined
                    ? isAr
                      ? 'تعذر تأكيد الأثر؛ أغلق وأعد المحاولة.'
                      : 'Impact was not confirmed; close and retry.'
                    : (isAr ? 'التعيينات المتأثرة: ' : 'Affected assignments: ') + review.impact}
              </p>
            )}
            <Field label={isAr ? 'سبب التغيير' : 'Change reason'}>
              <textarea
                required
                minLength={3}
                maxLength={1000}
                value={reviewReason}
                disabled={saving || unconfirmed}
                onChange={(event) => setReviewReason(event.target.value)}
              />
            </Field>
            <p className="settings-help">
              {isAr
                ? 'تُراجع النسخة الحالية قبل الحفظ، ويبقى سجل التغييرات محفوظًا.'
                : 'The current version is checked before saving; change history is preserved.'}
            </p>
            <div className="settings-actions">
              <button
                type="submit"
                disabled={
                  saving ||
                  unconfirmed ||
                  !ready ||
                  reviewReason.trim().length < 3 ||
                  impactLoading ||
                  (review.deprecate && review.impact === undefined)
                }
              >
                {isAr ? 'تأكيد وحفظ' : 'Confirm and save'}
              </button>
              <button type="button" disabled={saving || unconfirmed} onClick={closeReview}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </form>
        </SettingsDialog>
      )}

      {selectedHistory && !review ? (
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
              {historyError && (
                <div role="alert" className="text-red-700">
                  {historyError}
                  <button
                    type="button"
                    disabled={historyLoading}
                    onClick={() => void loadHistory(selectedHistory, historyCursor)}
                    className="ms-2 rounded border px-2 py-1"
                  >
                    {isAr ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                </div>
              )}
              {historyLoading && <p role="status">{isAr ? 'تحميل السجل…' : 'Loading history…'}</p>}
              {!historyLoading && !historyError && historyVersions.length === 0 && (
                <p>{isAr ? 'لا توجد نسخ في هذه الصفحة.' : 'No versions on this page.'}</p>
              )}
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
                          {version.operation === 'CLEAR_OVERRIDE'
                            ? isAr
                              ? 'إلغاء Override والعودة للوراثة'
                              : 'Override cleared; inheritance restored'
                            : displayValue(version.value)}
                          {version.changeReason && (
                            <p className="mt-1 text-slate-600">{version.changeReason}</p>
                          )}
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
              {historyCursor && !historyError && (
                <button
                  type="button"
                  disabled={historyLoading}
                  onClick={() => void loadHistory(selectedHistory, historyCursor)}
                  className="rounded border px-3 py-2"
                >
                  {isAr ? 'تحميل نسخ أقدم' : 'Load older versions'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SettingsDefinitionMetadata({
  definition,
  isAr,
}: {
  definition: Definition;
  isAr: boolean;
}) {
  const [count, setCount] = useState<number | null>(null);
  const [flag, setFlag] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    setCount(null);
    setFlag('');
    setError('');
    setLoading(false);
    return () => {
      generation.current++;
    };
  }, [definition.key, definition.revision]);
  const inspect = async () => {
    if (loading) return;
    const current = generation.current;
    setLoading(true);
    setError('');
    try {
      const response = await adminApiClient.request<{ data: { assignmentCount: number } }>(
        `/admin/settings/definitions/${encodeURIComponent(definition.key)}/impact`,
        { cache: 'no-store' },
      );
      if (!Number.isSafeInteger(response.data.assignmentCount) || response.data.assignmentCount < 0)
        throw new Error('SETTINGS_IMPACT_RESPONSE_INVALID');
      if (current === generation.current) setCount(response.data.assignmentCount);
      if (definition.isFeatureFlag && !definition.isSecret) {
        const value = await adminApiClient.request<{ data: { status: string; value?: unknown } }>(
          `/settings/inspect/${encodeURIComponent(definition.key)}`,
          { cache: 'no-store' },
        );
        if (current === generation.current)
          setFlag(
            value.data.status === 'RESOLVED' && typeof value.data.value === 'boolean'
              ? value.data.value
                ? isAr
                  ? 'مفعّل'
                  : 'Enabled'
                : isAr
                  ? 'معطل'
                  : 'Disabled'
              : isAr
                ? 'غير متاح'
                : 'Unavailable',
          );
      }
    } catch {
      if (current === generation.current)
        setError(isAr ? 'تعذر تحميل البيانات الإضافية.' : 'Additional metadata is unavailable.');
    } finally {
      if (current === generation.current) setLoading(false);
    }
  };
  return (
    <details className="mt-2">
      <summary>{isAr ? 'بيانات التعريف' : 'Definition metadata'}</summary>
      <p>
        {isAr ? 'آخر تحديث محفوظ' : 'Last persisted update'}: {definition.revision ?? '—'}
      </p>
      <p>
        {isAr ? 'قواعد التحقق' : 'Validation rules'}:{' '}
        {definition.validationRules
          ? displayValue(definition.validationRules)
          : isAr
            ? 'نوع القيمة فقط'
            : 'Value type only'}
      </p>
      <p>
        {isAr ? 'المجال المستهلك المعلن' : 'Declared consumer domain'}:{' '}
        {definition.consumerDomain ?? '—'}
      </p>
      <p>
        {isAr ? 'آخر محرر مسجل' : 'Last recorded editor'}:{' '}
        {definition.lastChangedBy ?? (isAr ? 'غير مسجل تاريخيًا' : 'Not recorded historically')}
      </p>

      <button
        type="button"
        disabled={loading}
        onClick={() => void inspect()}
        className="rounded border px-2 py-1"
      >
        {isAr ? 'تحميل عدد التعيينات وحالة الميزة' : 'Load assignment count and flag state'}
      </button>
      {count !== null && (
        <p>
          {isAr ? 'عدد التعيينات' : 'Assignment count'}: {count}
        </p>
      )}
      {flag && (
        <p>
          {isAr ? 'القيمة الفعالة العامة' : 'Effective global value'}: {flag}
        </p>
      )}
      {error && <p role="status">{error}</p>}
    </details>
  );
}

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Unable to complete the settings operation.';
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
  return <div className="settings-empty">{text}</div>;
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
