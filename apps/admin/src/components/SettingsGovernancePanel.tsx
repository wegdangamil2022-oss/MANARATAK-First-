import { useEffect, useRef, useState } from 'react';
import { ADMIN_PERMISSION_CATALOG } from '@manaratak/shared';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import {
  parseSettingsValue,
  settingsOperationError,
  settingsProposalStatus,
} from '../features/settings/settingsModel';
interface Definition {
  key: string;
  valueType: string;
  isSecret: boolean;
  isDeprecated: boolean;
  consumerDomain?: string;
}
interface Rule {
  id: string;
  triggerKey: string;
  requiredKeys: string[];
  context?: { domainId?: string; identityId?: string };
}
interface Draft {
  key: string;
  level: 'GLOBAL' | 'DOMAIN';
  scopeId: string;
  text: string;
}
interface Plan {
  kind: 'VALUES' | 'DEPENDENCIES';
  expectedPolicyRevision: number;
  changes?: Array<{
    key: string;
    level: string;
    scopeId?: string;
    expectedCurrentVersionId: string | null;
    value: unknown;
  }>;
  policy?: { rules: Rule[] };
}
interface Preview {
  previewDigest: string;
  rows: Array<{
    key: string;
    level: string;
    scopeId?: string;
    oldValue: unknown;
    newValue: unknown;
    consumerDomain: string | null;
    constraints: unknown;
  }>;
}
interface Proposal {
  id: string;
  request: Plan & { reason: string };
  requestedBy: string;
  approverId: string;
  approvedAt: string | null;
  consumedAt: string | null;
  expiresAt: string;
  canApprove: boolean;
  canCommit: boolean;
}
const domains: string[] = [
  ...new Set(ADMIN_PERMISSION_CATALOG.map((entry) => entry.domain)),
].sort();
const text = (value: unknown) => {
  const string = JSON.stringify(value);
  return (string ?? '—').slice(0, 500);
};
export function SettingsGovernancePanel({
  definitions,
  onSaved,
  onDirtyChange,
  onBusyChange,
}: {
  definitions: Definition[];
  onSaved: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { language } = useTranslation();
  const ar = language === 'ar';
  const [mode, setMode] = useState<'VALUES' | 'DEPENDENCIES'>('VALUES');
  const [tab, setTab] = useState<'compose' | 'requests'>('compose');
  const [dirty, setDirty] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [revision, setRevision] = useState<number | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([
    { key: '', level: 'GLOBAL', scopeId: '', text: '' },
  ]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [rows, setRows] = useState<Proposal[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reason, setReason] = useState('');
  const [approver, setApprover] = useState('');
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState<Array<{ id: string; name: string }>>([]);
  const [peopleCursor, setPeopleCursor] = useState<string | null>(null);
  const proposalId = useRef(createAdminIdempotencyKey());
  const request = useRef<{ signature: string; key: string; path: string; body: string } | null>(
    null,
  );
  const lock = useRef(false);
  const mutationConfirmed = useRef(false);
  const generation = useRef(0);
  const peopleGeneration = useRef(0);
  const reloadGeneration = useRef(0);
  useEffect(() => {
    onDirtyChange?.(dirty || uncertain);
  }, [dirty, uncertain, onDirtyChange]);
  useEffect(() => {
    onBusyChange?.(busy || uncertain);
  }, [busy, uncertain, onBusyChange]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => {
      window.clearInterval(timer);
      peopleGeneration.current++;
      reloadGeneration.current++;
    };
  }, []);
  const invalid = () => {
    if (request.current) return;
    setDirty(true);
    setPreview(null);
    setPlan(null);
    request.current = null;
    proposalId.current = createAdminIdempotencyKey();
  };
  const reload = async (next = false) => {
    const current = ++reloadGeneration.current;
    const value = await adminApiClient.request<{
      data: { items: Proposal[]; nextCursor: string | null };
    }>(
      `/admin/settings/governance/change-sets${next && cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
      { cache: 'no-store' },
    );
    if (current !== reloadGeneration.current) return;
    setRows((old) =>
      next
        ? [
            ...old,
            ...value.data.items.filter((row) => !old.some((previous) => previous.id === row.id)),
          ]
        : value.data.items,
    );
    setCursor(value.data.nextCursor);
  };
  useEffect(() => {
    const current = ++generation.current;
    void Promise.all([
      adminApiClient.request<{ data: { revision: number; policy: { rules: Rule[] } } }>(
        '/admin/settings/governance/dependencies',
        { cache: 'no-store' },
      ),
      adminApiClient.request<{ data: { items: Proposal[]; nextCursor: string | null } }>(
        '/admin/settings/governance/change-sets',
        { cache: 'no-store' },
      ),
    ])
      .then(([policy, list]) => {
        if (current === generation.current) {
          setRevision(policy.data.revision);
          setRules(policy.data.policy.rules);
          setRows(list.data.items);
          setCursor(list.data.nextCursor);
        }
      })
      .catch(() => {
        if (current === generation.current)
          setError(
            ar
              ? 'تعذر تحميل الحوكمة؛ تحقق من الصلاحية وتجهيز قاعدة البيانات.'
              : 'Governance unavailable; check permission and database preparation.',
          );
      });
    return () => {
      generation.current++;
    };
  }, [ar]);
  const loadPeople = async (next = false) => {
    const current = ++peopleGeneration.current;
    const params = new URLSearchParams({ search });
    if (next && peopleCursor) params.set('cursor', peopleCursor);
    const result = await adminApiClient.request<{
      data: { items: Array<{ id: string; name: string }>; nextCursor: string | null };
    }>(`/admin/settings/governance/approvers?${params}`, { cache: 'no-store' });
    if (current !== peopleGeneration.current) return;
    setPeople((old) =>
      next
        ? [
            ...old,
            ...result.data.items.filter((row) => !old.some((person) => person.id === row.id)),
          ]
        : result.data.items,
    );
    setPeopleCursor(result.data.nextCursor);
  };
  const act = async (work: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    mutationConfirmed.current = false;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (cause) {
      setError(
        mutationConfirmed.current
          ? ar
            ? 'تأكدت العملية، لكن تعذر تحديث العرض. حدّث السياسة والطلبات.'
            : 'Operation confirmed, but the view could not be refreshed. Refresh policy and requests.'
          : settingsOperationError(cause, ar),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const mutate = async (path: string, body: unknown) => {
    const signature = JSON.stringify([path, body]);
    if (request.current && request.current.signature !== signature)
      throw new Error('SETTINGS_PENDING_REQUEST');
    if (!request.current)
      request.current = {
        signature,
        key: createAdminIdempotencyKey(),
        path,
        body: JSON.stringify(body),
      };
    try {
      const result = await adminApiClient.request(request.current.path, {
        method: 'POST',
        body: request.current.body,
        idempotencyKey: request.current.key,
      });
      request.current = null;
      setUncertain(false);
      mutationConfirmed.current = true;
      return result;
    } catch (cause) {
      if (/^\[(400|401|403|404|409|422|429)\]/.test(cause instanceof Error ? cause.message : ''))
        request.current = null;
      else setUncertain(true);
      throw cause;
    }
  };
  const preflight = async () => {
    if (revision === null) return;
    const prepared: Plan = { kind: mode, expectedPolicyRevision: revision };
    if (mode === 'DEPENDENCIES') prepared.policy = { rules };
    else {
      prepared.changes = [];
      const contexts = new Set<string>();
      for (const draft of drafts) {
        if (
          !/^[a-zA-Z0-9_\-.]+$/.test(draft.key) ||
          (draft.level === 'DOMAIN' && !domains.includes(draft.scopeId))
        )
          throw new Error('SETTINGS_CHANGE_REJECTED');
        const context = JSON.stringify([draft.key, draft.level, draft.scopeId]);
        if (contexts.has(context)) throw new Error('SETTINGS_CHANGE_REJECTED');
        contexts.add(context);
        const params = new URLSearchParams({ key: draft.key, level: draft.level });
        if (draft.level !== 'GLOBAL') params.set('scopeId', draft.scopeId);
        const result = await adminApiClient.request<{
          data: { definition: Definition; assignment: { currentVersionId: string } | null };
        }>(`/admin/settings/assignments/context?${params}`, { cache: 'no-store' });
        if (result.data.definition.isSecret || result.data.definition.isDeprecated)
          throw new Error('SETTINGS_DEFINITION_NOT_WRITABLE');
        prepared.changes.push({
          key: draft.key,
          level: draft.level,
          ...(draft.level !== 'GLOBAL' ? { scopeId: draft.scopeId } : {}),
          expectedCurrentVersionId: result.data.assignment?.currentVersionId ?? null,
          value: parseSettingsValue(result.data.definition.valueType, draft.text),
        });
      }
    }
    const result = await adminApiClient.request<{ data: Preview }>(
      '/admin/settings/governance/preview',
      { method: 'POST', body: JSON.stringify(prepared) },
    );
    setPlan(prepared);
    setPreview(result.data);
    request.current = null;
  };
  return (
    <section className="settings-governance settings-panel space-y-3">
      <h2 className="font-bold">
        {ar ? 'مجموعات التغيير واعتمادات الإعدادات' : 'Change sets and setting dependencies'}
      </h2>
      <p>
        {ar
          ? 'المعاينة لا تحفظ قيمًا. الحفظ الكامل يتطلب موافقة شخص مستقل، ونسخًا لم تتغير. القواعد تنطبق فقط على السياقات الإدارية المحددة؛ تأثير المستهلك الحي يحتاج تحققًا لاحقًا.'
          : 'Preview saves no values. Atomic commit requires an independent approver and unchanged versions. Rules govern their declared contexts; live consumer effects require later verification.'}
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {
        <button
          type="button"
          disabled={busy || uncertain}
          onClick={() =>
            (!dirty ||
              window.confirm(
                ar
                  ? 'تحديث السياسة وإلغاء مسودة التغيير الحالية؟'
                  : 'Refresh policy and discard this draft?',
              )) &&
            void act(async () => {
              const policy = await adminApiClient.request<{
                data: { revision: number; policy: { rules: Rule[] } };
              }>('/admin/settings/governance/dependencies', { cache: 'no-store' });
              setRevision(policy.data.revision);
              setRules(policy.data.policy.rules);
              setPreview(null);
              setPlan(null);
              setReason('');
              setApprover('');
              setDrafts([{ key: '', level: 'GLOBAL', scopeId: '', text: '' }]);
              setDirty(false);
              await reload();
            })
          }
        >
          {revision === null
            ? ar
              ? 'إعادة تحميل الحوكمة'
              : 'Retry governance load'
            : ar
              ? 'تحديث السياسة والطلبات'
              : 'Refresh policy and requests'}
        </button>
      }
      <div
        className="settings-actions"
        role="group"
        aria-label={ar ? 'مساحات التغييرات' : 'Change workspaces'}
      >
        <button
          type="button"
          aria-pressed={tab === 'compose'}
          disabled={busy || uncertain}
          onClick={() => setTab('compose')}
        >
          {ar ? 'إعداد مجموعة تغيير' : 'Prepare change set'}
        </button>
        <button
          type="button"
          aria-pressed={tab === 'requests'}
          disabled={busy || uncertain}
          onClick={() => setTab('requests')}
        >
          {ar ? 'طلبات الموافقة' : 'Approval requests'}
        </button>
      </div>
      {uncertain && (
        <p role="alert">
          {ar
            ? 'لم تتأكد نتيجة الطلب. أعد إرسال الطلب نفسه قبل إجراء تعديل آخر.'
            : 'The outcome is uncertain. Retry the same request before another change.'}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const pending = request.current;
                if (!pending) return;
                await mutate(pending.path, JSON.parse(pending.body));
                setDirty(false);
                setPreview(null);
                setPlan(null);
                await reload();
                onSaved();
                setNotice(
                  ar
                    ? 'تأكد الطلب؛ راجع حالته ضمن طلبات الموافقة.'
                    : 'Request confirmed; check its status in approval requests.',
                );
                setTab('requests');
              })
            }
          >
            {ar ? 'إعادة تأكيد الطلب نفسه' : 'Retry the same request'}
          </button>
        </p>
      )}
      {tab === 'compose' && (
        <fieldset disabled={busy || uncertain || revision === null} className="space-y-3">
          <label>
            {ar ? 'نوع التغيير' : 'Change type'}
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as typeof mode);
                invalid();
              }}
            >
              <option value="VALUES">{ar ? 'قيم متعددة' : 'Multiple values'}</option>
              <option value="DEPENDENCIES">{ar ? 'قواعد الاعتماد' : 'Dependency policy'}</option>
            </select>
          </label>
          {mode === 'VALUES' ? (
            <>
              {drafts.map((draft, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-4">
                  <label>
                    {ar ? 'المفتاح' : 'Key'}
                    <input
                      list="settings-governance-keys"
                      value={draft.key}
                      maxLength={240}
                      onChange={(e) => {
                        setDrafts((old) =>
                          old.map((item, n) => (n === i ? { ...item, key: e.target.value } : item)),
                        );
                        invalid();
                      }}
                    />
                  </label>
                  <label>
                    {ar ? 'النطاق' : 'Scope'}
                    <select
                      value={draft.level}
                      onChange={(e) => {
                        setDrafts((old) =>
                          old.map((item, n) =>
                            n === i
                              ? { ...item, level: e.target.value as Draft['level'], scopeId: '' }
                              : item,
                          ),
                        );
                        invalid();
                      }}
                    >
                      <option value="GLOBAL">GLOBAL</option>
                      <option value="DOMAIN">DOMAIN</option>
                    </select>
                  </label>
                  {draft.level === 'DOMAIN' && (
                    <label>
                      {ar ? 'المجال' : 'Domain'}
                      <select
                        value={draft.scopeId}
                        onChange={(e) => {
                          setDrafts((old) =>
                            old.map((item, n) =>
                              n === i ? { ...item, scopeId: e.target.value } : item,
                            ),
                          );
                          invalid();
                        }}
                      >
                        <option value="">—</option>
                        {domains.map((domain) => (
                          <option key={domain}>{domain}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    {ar
                      ? 'القيمة الجديدة (غير النص يكتب JSON)'
                      : 'New value (JSON for non-text types)'}
                    <textarea
                      value={draft.text}
                      maxLength={8192}
                      onChange={(e) => {
                        setDrafts((old) =>
                          old.map((item, n) =>
                            n === i ? { ...item, text: e.target.value } : item,
                          ),
                        );
                        invalid();
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={drafts.length === 1}
                    onClick={() => {
                      setDrafts((old) => old.filter((_, n) => n !== i));
                      invalid();
                    }}
                  >
                    {ar ? 'إزالة' : 'Remove'}
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={drafts.length >= 20}
                onClick={() => {
                  setDrafts((old) => [...old, { key: '', level: 'GLOBAL', scopeId: '', text: '' }]);
                  invalid();
                }}
              >
                {ar ? 'إضافة إعداد' : 'Add setting'}
              </button>
            </>
          ) : (
            <>
              {!rules.length && (
                <p>
                  {ar
                    ? 'لا توجد قواعد مفترضة. أضف فقط الاعتمادات المعتمدة إداريًا.'
                    : 'No dependencies are assumed. Add only administratively approved rules.'}
                </p>
              )}
              {rules.map((rule, i) => (
                <div key={rule.id} className="space-y-2 rounded border p-3">
                  <label>
                    {ar ? 'مفتاح Boolean المحفز' : 'Trigger Boolean key'}
                    <select
                      value={rule.triggerKey}
                      onChange={(e) => {
                        setRules((old) =>
                          old.map((item, n) =>
                            n === i ? { ...item, triggerKey: e.target.value } : item,
                          ),
                        );
                        invalid();
                      }}
                    >
                      <option value="">—</option>
                      {definitions
                        .filter((d) => d.valueType === 'Boolean' && !d.isSecret && !d.isDeprecated)
                        .map((d) => (
                          <option key={d.key}>{d.key}</option>
                        ))}
                    </select>
                  </label>
                  <label>
                    {ar ? 'المفاتيح المطلوبة عند التفعيل' : 'Required keys when enabled'}
                    <input
                      value={rule.requiredKeys.join(', ')}
                      list="settings-governance-keys"
                      maxLength={1300}
                      onChange={(e) => {
                        setRules((old) =>
                          old.map((item, n) =>
                            n === i
                              ? {
                                  ...item,
                                  requiredKeys: e.target.value
                                    .split(/[,،]/)
                                    .map((key) => key.trim())
                                    .filter(Boolean),
                                }
                              : item,
                          ),
                        );
                        invalid();
                      }}
                    />
                  </label>
                  <label>
                    {ar ? 'السياق (فارغ = عام)' : 'Context (empty = global)'}
                    <select
                      value={rule.context?.domainId ?? ''}
                      onChange={(e) => {
                        setRules((old) =>
                          old.map((item, n) =>
                            n === i
                              ? {
                                  ...item,
                                  context: e.target.value
                                    ? { domainId: e.target.value }
                                    : undefined,
                                }
                              : item,
                          ),
                        );
                        invalid();
                      }}
                    >
                      <option value="">GLOBAL</option>
                      {domains.map((domain) => (
                        <option key={domain}>{domain}</option>
                      ))}
                    </select>
                  </label>
                  {rule.context?.identityId && (
                    <p>
                      {ar
                        ? 'سياق هوية محفوظ؛ تغييره إلى عام أو مجال يزيل قيد الهوية.'
                        : 'Saved identity context; choosing global or domain removes the identity context.'}{' '}
                      <code>{rule.context.identityId}</code>
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setRules((old) => old.filter((_, n) => n !== i));
                      invalid();
                    }}
                  >
                    {ar ? 'إزالة القاعدة' : 'Remove rule'}
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={rules.length >= 25}
                onClick={() => {
                  setRules((old) => [
                    ...old,
                    { id: createAdminIdempotencyKey(), triggerKey: '', requiredKeys: [] },
                  ]);
                  invalid();
                }}
              >
                {ar ? 'إضافة قاعدة' : 'Add rule'}
              </button>
            </>
          )}
          <datalist id="settings-governance-keys">
            {definitions
              .filter((d) => !d.isSecret && !d.isDeprecated)
              .map((d) => (
                <option key={d.key} value={d.key} />
              ))}
          </datalist>
          <button type="button" onClick={() => void act(preflight)}>
            {ar ? 'معاينة المجموعة' : 'Preview change set'}
          </button>
          {preview && (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>{ar ? 'المفتاح والسياق' : 'Key and scope'}</th>
                    <th>{ar ? 'قبل' : 'Before'}</th>
                    <th>{ar ? 'بعد' : 'After'}</th>
                    <th>{ar ? 'المستهلك والقواعد' : 'Consumer and constraints'}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.key + row.level + row.scopeId}>
                      <td>
                        {row.key} · {row.level}:{row.scopeId ?? '—'}
                      </td>
                      <td>{text(row.oldValue)}</td>
                      <td>{text(row.newValue)}</td>
                      <td>
                        {row.consumerDomain ?? '—'} · {text(row.constraints)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <label>
                {ar ? 'سبب التغيير' : 'Change reason'}
                <input
                  value={reason}
                  maxLength={1000}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setDirty(true);
                  }}
                />
              </label>
              <label>
                {ar ? 'ابحث عن معتمد مستقل' : 'Search for an independent approver'}
                <input
                  value={search}
                  maxLength={240}
                  onChange={(e) => {
                    peopleGeneration.current++;
                    setSearch(e.target.value);
                    setPeople([]);
                    setPeopleCursor(null);
                    setApprover('');
                  }}
                />
              </label>
              <button type="button" onClick={() => void act(() => loadPeople())}>
                {ar ? 'بحث' : 'Search'}
              </button>
              <select
                aria-label={ar ? 'المعتمد' : 'Approver'}
                value={approver}
                onChange={(e) => setApprover(e.target.value)}
              >
                <option value="">—</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              {peopleCursor && (
                <button type="button" onClick={() => void act(() => loadPeople(true))}>
                  {ar ? 'المعتمدون التاليون' : 'Next approvers'}
                </button>
              )}
              <button
                type="button"
                disabled={!approver || reason.trim().length < 3}
                onClick={() =>
                  void act(async () => {
                    await mutate('/admin/settings/governance/change-sets', {
                      ...plan,
                      id: proposalId.current,
                      approverId: approver,
                      reason,
                      previewDigest: preview.previewDigest,
                    });
                    setNotice(
                      ar
                        ? 'سجل الطلب؛ على المعتمد الدخول والموافقة بنفسه.'
                        : 'Request recorded; the approver must sign in and approve.',
                    );
                    setDirty(false);
                    setPreview(null);
                    setPlan(null);
                    setReason('');
                    setApprover('');
                    setTab('requests');
                    await reload();
                  })
                }
              >
                {ar ? 'طلب الموافقة' : 'Request approval'}
              </button>
            </>
          )}
        </fieldset>
      )}
      {tab === 'requests' && (
        <>
          <h3 className="font-bold">
            {ar
              ? 'طلباتك وطلبات الموافقة الموجهة إليك'
              : 'Your requests and approvals assigned to you'}
          </h3>
          <button
            type="button"
            disabled={busy || uncertain}
            onClick={() => void act(() => reload())}
          >
            {ar ? 'تحديث الطلبات' : 'Refresh requests'}
          </button>
          {!rows.length && <p>{ar ? 'لا طلبات محملة.' : 'No loaded requests.'}</p>}
          {rows.map((row) => (
            <article key={row.id} className="space-y-2 rounded border p-3">
              <p>
                {row.request.reason} · <time>{row.expiresAt}</time>
              </p>
              <ul>
                {row.request.changes?.map((change) => (
                  <li key={change.key + change.level + change.scopeId}>
                    <code>{change.key}</code> · {change.level}:{change.scopeId ?? '—'} →{' '}
                    {text(change.value)}
                  </li>
                ))}
              </ul>
              {row.request.policy && (
                <ul>
                  {row.request.policy.rules.map((rule) => (
                    <li key={rule.id}>
                      {rule.triggerKey} → {rule.requiredKeys.join(', ')} ·{' '}
                      {rule.context?.domainId ?? 'GLOBAL'} {rule.context?.identityId ?? ''}
                    </li>
                  ))}
                </ul>
              )}
              <p>
                {settingsProposalStatus(row, now) === 'EXPIRED'
                  ? ar
                    ? 'انتهت صلاحية الطلب؛ أنشئ معاينة جديدة.'
                    : 'Expired; prepare a new preview.'
                  : row.consumedAt
                    ? ar
                      ? 'تم الحفظ'
                      : 'Committed'
                    : row.approvedAt
                      ? ar
                        ? 'معتمد؛ بانتظار صاحب الطلب'
                        : 'Approved; awaiting requester'
                      : ar
                        ? 'بانتظار الموافقة'
                        : 'Awaiting approval'}
              </p>
              {row.canApprove && settingsProposalStatus(row, now) === 'PENDING' && (
                <button
                  type="button"
                  disabled={busy || uncertain}
                  onClick={() =>
                    void act(async () => {
                      await mutate(`/admin/settings/governance/change-sets/${row.id}/approve`, {});
                      await reload();
                    })
                  }
                >
                  {ar ? 'الموافقة على المجموعة' : 'Approve change set'}
                </button>
              )}
              {row.canCommit && settingsProposalStatus(row, now) === 'APPROVED' && (
                <button
                  type="button"
                  disabled={busy || uncertain}
                  onClick={() =>
                    void act(async () => {
                      await mutate(`/admin/settings/governance/change-sets/${row.id}/commit`, {});
                      await reload();
                      const policy = await adminApiClient.request<{
                        data: { revision: number; policy: { rules: Rule[] } };
                      }>('/admin/settings/governance/dependencies');
                      setRevision(policy.data.revision);
                      setRules(policy.data.policy.rules);
                      setPreview(null);
                      setPlan(null);
                      setDirty(false);
                      onSaved();
                      setNotice(ar ? 'تم الحفظ الكامل في معاملة واحدة.' : 'Committed atomically.');
                    })
                  }
                >
                  {ar ? 'حفظ المجموعة كاملة' : 'Commit entire change set'}
                </button>
              )}
            </article>
          ))}
          {cursor && (
            <button
              type="button"
              disabled={busy || uncertain}
              onClick={() => void act(() => reload(true))}
            >
              {ar ? 'تحميل طلبات أخرى' : 'Load more requests'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
