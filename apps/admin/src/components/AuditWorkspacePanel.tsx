import { AUDIT_QUERY_CATALOG, auditCodeLabel } from '@manaratak/shared';
import { useEffect, useRef, useState } from 'react';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useOwnerOperationScope } from '../security/useOwnerOperationScope';
interface Row {
  id: string;
  version: number;
  data: Record<string, unknown>;
}
export function AuditWorkspacePanel({
  kind,
}: { kind?: 'CASE' | 'ALERT_RULE' | 'RETENTION_POLICY' } = {}) {
  const { hasPermission } = useAdminAuthorization();
  const { t } = useTranslation();
  const [tab, setTab] = useState('CASE');
  const tabs = [
    ['CASE', 'admin:audit:cases:view', 'audit_ws_cases'],
    ['ALERT_RULE', 'admin:audit:alerts:manage', 'audit_ws_alerts'],
    ['RETENTION_POLICY', 'admin:audit:retention:manage', 'audit_ws_retention'],
  ];
  const visible = tabs.filter(([, permission]) => hasPermission(permission));
  const active = kind
    ? visible.find(([candidate]) => candidate === kind)?.[0]
    : visible.some(([candidate]) => candidate === tab)
      ? tab
      : visible[0]?.[0];
  if (!active) return null;
  return (
    <section className="operations-panel">
      {!kind && (
        <nav className="flex gap-3">
          {visible.map(([kind, , label]) => (
            <button
              key={kind}
              type="button"
              aria-pressed={active === kind}
              onClick={() => setTab(kind)}
            >
              {t(label as Parameters<typeof t>[0])}
            </button>
          ))}
        </nav>
      )}
      <WorkspaceForm
        key={active}
        kind={active}
        canManage={active !== 'CASE' || hasPermission('admin:audit:cases:manage')}
      />
    </section>
  );
}
function WorkspaceForm({ kind, canManage }: { kind: string; canManage: boolean }) {
  const owner = useOwnerOperationScope(`${kind}:${canManage}`);
  const locked = useRef(false);
  const { t, language } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const [choices, setChoices] = useState<{
    agents: Array<{ id: string; label: string }>;
    templates: Array<{ id: string; label: string }>;
  }>({ agents: [], templates: [] });
  const [preview, setPreview] = useState<{
    matchedCount: number;
    hasMore: boolean;
    thresholdReached: boolean;
    from: string;
    until: string;
  } | null>(null);
  useEffect(() => {
    if (!canManage || kind === 'RETENTION_POLICY') return;
    let live = true;
    void adminApiClient
      .request<typeof choices>(
        '/admin/audit/workspace/' + (kind === 'CASE' ? 'choices' : 'alert-choices'),
      )
      .then((result) => {
        if (live) setChoices(result);
      })
      .catch(() => {
        if (live) setChoices({ agents: [], templates: [] });
      });
    return () => {
      live = false;
    };
  }, [kind, canManage]);
  const [rows, setRows] = useState<Row[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [selected, setSelected] = useState<Row | null>(null);
  const [title, setTitle] = useState(''),
    [references, setReferences] = useState(''),
    [note, setNote] = useState(''),
    [assignee, setAssignee] = useState(''),
    [status, setStatus] = useState('OPEN'),
    [hold, setHold] = useState('');
  const [action, setAction] = useState(''),
    [severity, setSeverity] = useState('');
  const [category, setCategory] = useState('AUTHORIZATION_MUTATION'),
    [outcome, setOutcome] = useState('FAILURE'),
    [threshold, setThreshold] = useState(1),
    [window, setWindow] = useState(5),
    [cooldown, setCooldown] = useState(15),
    [recipient, setRecipient] = useState(''),
    [template, setTemplate] = useState(''),
    [enabled, setEnabled] = useState(false);
  const [durations, setDurations] = useState<Record<string, string>>({});
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const pending = useRef<{ signature: string; key: string; id: string; noteId: string } | null>(
    null,
  );
  const base = '/admin/audit/workspace';
  const endpoint =
    kind === 'CASE' ? '/cases' : kind === 'ALERT_RULE' ? '/alerts' : '/retention-policy';
  const load = async (next?: string) => {
    if (!owner.isCurrent()) return;
    const response = await adminApiClient.request<{
      data: Row | null | { items: Row[]; nextCursor: string | null };
    }>(
      base +
        endpoint +
        (kind !== 'RETENTION_POLICY'
          ? '?limit=25' + (next ? '&cursor=' + encodeURIComponent(next) : '')
          : ''),
    );
    if (!owner.isCurrent()) return;
    if (kind === 'RETENTION_POLICY') {
      const row = response.data as Row | null;
      setSelected(row);
      setDurations(
        Object.fromEntries(
          Object.entries((row?.data.durations as Record<string, number>) ?? {}).map(
            ([key, value]) => [key, String(value)],
          ),
        ),
      );
    } else {
      const page = response.data as { items: Row[]; nextCursor: string | null };
      setRows((old) => (next ? [...old, ...page.items] : page.items));
      setCursor(page.nextCursor);
    }
  };
  useEffect(() => {
    let active = true;
    load().catch(() => {
      if (active) setError(t('audit_ws_failed'));
    });
    return () => {
      active = false;
    };
  }, [kind]);
  const select = (row: Row) => {
    pending.current = null;
    setSelected(row);
    setTitle(String(row.data.title ?? row.data.name ?? ''));
    setReferences(((row.data.references as string[]) ?? []).join('\n'));
    setAssignee(String(row.data.assigneeId ?? ''));
    setStatus(String(row.data.status ?? 'OPEN'));
    setHold(row.data.legalHoldUntil ? String(row.data.legalHoldUntil).slice(0, 16) : '');
    setNote('');
    if (kind === 'ALERT_RULE') {
      setAction(String(row.data.action ?? ''));
      setSeverity(String(row.data.severity ?? ''));
      setCategory(String(row.data.category ?? ''));
      setOutcome(String(row.data.outcome ?? ''));
      setThreshold(Number(row.data.threshold));
      setWindow(Number(row.data.windowMinutes));
      setCooldown(Number(row.data.cooldownMinutes));
      setRecipient(String(row.data.recipientId));
      setTemplate(String(row.data.templateId));
      setEnabled(row.data.enabled === true);
    }
  };
  const save = async () => {
    if (locked.current || !owner.isCurrent() || !canManage) return;
    locked.current = true;
    setBusy(true);
    setError('');
    const signature = JSON.stringify([
      selected?.id,
      selected?.version,
      title,
      references,
      note,
      assignee,
      status,
      hold,
      action,
      severity,
      category,
      outcome,
      threshold,
      window,
      cooldown,
      recipient,
      template,
      enabled,
      durations,
    ]);
    if (pending.current && pending.current.signature !== signature) {
      locked.current = false;
      setBusy(false);
      setError(t('audit_ws_failed'));
      return;
    }
    pending.current ??= {
      signature,
      key: createAdminIdempotencyKey(),
      id: createAdminIdempotencyKey(),
      noteId: createAdminIdempotencyKey(),
    };
    const attempt = pending.current;
    try {
      const refs = references
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean);
      const data =
        kind === 'CASE'
          ? selected
            ? {
                expectedVersion: selected.version,
                references: refs,
                assigneeId: assignee || null,
                status,
                legalHoldUntil: hold ? new Date(hold + 'Z').toISOString() : null,
                ...(note.trim() ? { note: { id: attempt.noteId, text: note } } : {}),
              }
            : {
                id: attempt.id,
                title,
                references: refs,
                ...(assignee ? { assigneeId: assignee } : {}),
              }
          : kind === 'ALERT_RULE'
            ? {
                expectedVersion: selected?.version ?? 0,
                name: title,
                enabled,
                ...(action ? { action } : {}),
                ...(severity ? { severity } : {}),
                ...(category ? { category } : {}),
                ...(outcome ? { outcome } : {}),
                threshold,
                windowMinutes: window,
                cooldownMinutes: cooldown,
                recipientId: recipient,
                templateId: template,
              }
            : {
                expectedVersion: selected?.version ?? 0,
                durations: Object.fromEntries(
                  Object.entries(durations)
                    .filter(([, value]) => value.trim())
                    .map(([key, value]) => [key, Number(value)]),
                ),
              };
      const path =
        base +
        endpoint +
        (kind === 'CASE' && selected
          ? '/' + encodeURIComponent(selected.id)
          : kind === 'ALERT_RULE'
            ? '/' + encodeURIComponent(selected?.id ?? attempt.id)
            : '');
      const result = await adminApiClient.request<{ data: Row }>(path, {
        method: kind === 'CASE' ? (selected ? 'PATCH' : 'POST') : 'PUT',
        idempotencyKey: attempt.key,
        body: JSON.stringify(data),
      });
      if (!owner.isCurrent()) return;
      if (!result.data || (selected && result.data.id !== selected.id))
        throw Error('AUDIT_WORKSPACE_IDENTITY_MISMATCH');
      pending.current = null;
      select(result.data);
      await load();
    } catch (cause) {
      if (!owner.isCurrent()) return;
      if (cause instanceof Error && /^\[(400|401|403|404|409|422|428)\]/.test(cause.message))
        pending.current = null;
      setError(t('audit_ws_failed'));
    } finally {
      if (owner.isCurrent()) {
        locked.current = false;
        setBusy(false);
      }
    }
  };
  const input = (
    label: Parameters<typeof t>[0],
    value: string,
    onChange: (value: string) => void,
    type = 'text',
  ) => (
    <label className="block">
      {t(label)}
      <input
        className="block w-full rounded border p-2"
        type={type}
        value={value}
        maxLength={240}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
  return (
    <div className="space-y-3">
      <p>
        {t(
          kind === 'CASE'
            ? 'audit_ws_cases_help'
            : kind === 'ALERT_RULE'
              ? 'audit_ws_alerts_help'
              : 'audit_ws_retention_help',
        )}
      </p>
      {error && <p role="alert">{error}</p>}
      {kind !== 'RETENTION_POLICY' && (
        <>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setTitle('');
              setReferences('');
              setNote('');
              pending.current = null;
            }}
          >
            {t('audit_ws_new')}
          </button>
          <ul>
            {rows.map((row) => (
              <li key={row.id}>
                <button type="button" onClick={() => select(row)}>
                  {String(row.data.title ?? row.data.name)} — {t('audit_ws_version')} {row.version}
                </button>
              </li>
            ))}
          </ul>
          {cursor && (
            <button
              type="button"
              onClick={() => void load(cursor).catch(() => setError(t('audit_ws_failed')))}
            >
              {t('iam_next')}
            </button>
          )}
        </>
      )}
      <fieldset disabled={!canManage || busy} className="space-y-3">
        {kind !== 'RETENTION_POLICY' && input('audit_ws_title', title, setTitle)}
        {kind === 'CASE' && (
          <>
            <label className="block">
              {t('audit_ws_assignee')}
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">{language === 'ar' ? 'غير مسندة' : 'Unassigned'}</option>
                {assignee && !choices.agents.some((a) => a.id === assignee) && (
                  <option value={assignee}>
                    {language === 'ar' ? 'الموظف المسند حاليًا' : 'Current assignee'}
                  </option>
                )}
                {choices.agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              {t('audit_ws_references')}
              <textarea
                className="block w-full rounded border p-2"
                value={references}
                onChange={(e) => setReferences(e.target.value)}
                maxLength={24000}
              />
            </label>
            {selected && (
              <>
                <label>
                  {t('audit_ws_status')}
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    {['OPEN', 'INVESTIGATING', 'CLOSED'].map((value) => (
                      <option key={value} value={value}>
                        {t(('audit_ws_' + value.toLowerCase()) as Parameters<typeof t>[0])}
                      </option>
                    ))}
                  </select>
                </label>
                {input('audit_ws_hold', hold, setHold, 'datetime-local')}
                <label>
                  {t('audit_ws_note')}
                  <textarea
                    className="block w-full rounded border p-2"
                    value={note}
                    maxLength={4000}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
              </>
            )}
          </>
        )}
        {kind === 'ALERT_RULE' && (
          <>
            <label className="block">
              {t('audit_ws_action')}
              <select value={action} onChange={(event) => setAction(event.target.value)}>
                <option value="">{t('audit_ws_all')}</option>
                {AUDIT_QUERY_CATALOG.actions.map((value) => (
                  <option key={value} value={value}>
                    {auditCodeLabel(value, language)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              {t('audit_ws_severity')}
              <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
                <option value="">{t('audit_ws_all')}</option>
                {['INFO', 'WARNING', 'ERROR', 'CRITICAL'].map((value) => (
                  <option key={value} value={value}>
                    {auditCodeLabel(value, language)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              {t('audit_ws_category')}
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">{t('audit_ws_all')}</option>
                {AUDIT_QUERY_CATALOG.categories.map((value) => (
                  <option key={value} value={value}>
                    {auditCodeLabel(value, language)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('audit_result_label')}
              <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                <option value="">{t('audit_ws_all')}</option>
                {['SUCCESS', 'FAILURE', 'INTENT', 'UNKNOWN'].map((value) => (
                  <option key={value} value={value}>
                    {t(
                      value === 'SUCCESS'
                        ? 'audit_text_051'
                        : value === 'FAILURE'
                          ? 'audit_text_052'
                          : value === 'INTENT'
                            ? 'audit_text_050'
                            : 'audit_text_053',
                    )}
                  </option>
                ))}
              </select>
            </label>
            {input(
              'audit_ws_threshold',
              String(threshold),
              (v) => setThreshold(Number(v)),
              'number',
            )}
            {input('audit_ws_window', String(window), (v) => setWindow(Number(v)), 'number')}
            {input('audit_ws_cooldown', String(cooldown), (v) => setCooldown(Number(v)), 'number')}
            <label className="block">
              {t('audit_ws_recipient')}
              <select required value={recipient} onChange={(e) => setRecipient(e.target.value)}>
                <option value="">
                  {language === 'ar' ? 'اختر موظفًا مؤهلًا' : 'Choose an eligible agent'}
                </option>
                {choices.agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              {t('audit_ws_template')}
              <select required value={template} onChange={(e) => setTemplate(e.target.value)}>
                <option value="">
                  {language === 'ar' ? 'اختر قالبًا متوافقًا' : 'Choose a compatible template'}
                </option>
                {choices.templates.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            {selected && hasPermission('admin:audit:manage') && (
              <>
                <button
                  type="button"
                  className="operations-button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError('');
                    try {
                      setPreview(
                        await adminApiClient.request(
                          base + '/alerts/' + encodeURIComponent(selected.id) + '/preview',
                        ),
                      );
                    } catch {
                      setError(t('audit_ws_failed'));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {language === 'ar'
                    ? 'اختبار مطابقة القاعدة المحفوظة دون إرسال'
                    : 'Preview saved rule matches without sending'}
                </button>
                {preview && (
                  <p role="status">
                    {language === 'ar'
                      ? 'أحداث مطابقة ضمن صفحة محدودة'
                      : 'Matches in a bounded page'}
                    : {preview.matchedCount}
                    {preview.hasMore ? ' +' : ''} ·{' '}
                    {language === 'ar'
                      ? 'لا يفحص التهدئة ولا ينشئ إشعارًا'
                      : 'Cooldown not evaluated; no notification created'}
                  </p>
                )}
              </>
            )}
            <label>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              {t('audit_ws_enabled')}
            </label>
          </>
        )}
        {kind === 'RETENTION_POLICY' &&
          [
            'SECURITY_CRITICAL',
            'FINANCIAL',
            'IDENTITY_ACCESS',
            'AUTHENTICATION',
            'STANDARD_ADMIN',
          ].map((key) => (
            <div key={key}>
              {input(
                ('audit_ws_retention_' + key.toLowerCase()) as Parameters<typeof t>[0],
                durations[key] ?? '',
                (value) => setDurations((old) => ({ ...old, [key]: value })),
                'number',
              )}
            </div>
          ))}
        <button type="button" onClick={() => void save()}>
          {t('audit_ws_save')}
        </button>
      </fieldset>
      {kind === 'ALERT_RULE' && selected && (
        <AuditAlertReceipts key={selected.id + ':' + selected.version} ruleId={selected.id} />
      )}
      {kind === 'CASE' && selected && (
        <>
          <ul>
            {((selected.data.references as string[]) ?? []).map((reference) => (
              <li key={reference}>
                <a href={'/admin/audit?reference=' + encodeURIComponent(reference)}>{reference}</a>
              </li>
            ))}
          </ul>
          <h3>{t('audit_ws_notes')}</h3>
          <ul>
            {(
              (selected.data.notes as Array<{
                id: string;
                text: string;
                authorId: string;
                at: string;
              }>) ?? []
            ).map((item) => (
              <li key={item.id}>
                <p className="whitespace-pre-wrap">{item.text}</p>
                <small>
                  {item.authorId} — {new Date(item.at).toLocaleString(language)}
                </small>
              </li>
            ))}
          </ul>
          <h3>{t('audit_ws_history')}</h3>
          <ul>
            {(
              (selected.data.history as Array<{ actorId: string; at: string; change: string }>) ??
              []
            ).map((item, index) => (
              <li key={index}>
                {item.actorId} — {new Date(item.at).toLocaleString(language)} — {item.change}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function AuditAlertReceipts({ ruleId }: { ruleId: string }) {
  const { t, language } = useTranslation();
  const [rows, setRows] = useState<
      Array<{
        id: string;
        state: string;
        bucket: string;
        matchedCount: number;
        ruleVersion: number;
      }>
    >([]),
    [cursor, setCursor] = useState<string | null>(null),
    [error, setError] = useState('');
  const load = async (next?: string) => {
    const result = await adminApiClient.request<{
      data: { items: typeof rows; nextCursor: string | null };
    }>(
      '/admin/audit/workspace/alerts/' +
        encodeURIComponent(ruleId) +
        '/occurrences?limit=25' +
        (next ? '&cursor=' + encodeURIComponent(next) : ''),
    );
    setRows((old) => (next ? [...old, ...result.data.items] : result.data.items));
    setCursor(result.data.nextCursor);
  };
  useEffect(() => {
    void load().catch(() => setError(t('audit_ws_failed')));
  }, [ruleId]);
  return (
    <section>
      <h3>{t('audit_ws_receipts')}</h3>
      {error && <p role="alert">{error}</p>}
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            {new Date(row.bucket).toLocaleString(language)} — ≥{row.matchedCount} —{' '}
            {t(('audit_ws_receipt_' + row.state.toLowerCase()) as Parameters<typeof t>[0])} —{' '}
            {t('audit_ws_version')} {row.ruleVersion}
          </li>
        ))}
      </ul>
      {cursor && (
        <button
          type="button"
          onClick={() => void load(cursor).catch(() => setError(t('audit_ws_failed')))}
        >
          {t('iam_next')}
        </button>
      )}
    </section>
  );
}
