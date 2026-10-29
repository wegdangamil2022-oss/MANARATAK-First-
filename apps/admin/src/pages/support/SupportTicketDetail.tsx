import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { adminApiClient, createAdminIdempotencyKey } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { useOwnerOperationScope } from '../../security/useOwnerOperationScope';
import { OperationsNotice } from '../../features/operations/OperationsWorkspace';
import {
  supportError,
  supportLabel,
  type SupportTicket,
  type SupportMessageDto,
  type SupportPage,
} from './SupportModel';
const transitions: Record<string, string[]> = {
  NEW: ['OPEN', 'CANCELLED'],
  OPEN: ['WAITING_ON_STUDENT', 'WAITING_ON_OWNER', 'RESOLVED', 'CANCELLED'],
  WAITING_ON_STUDENT: ['OPEN', 'RESOLVED', 'CANCELLED'],
  WAITING_ON_OWNER: ['OPEN', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['REOPENED', 'CLOSED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['OPEN', 'WAITING_ON_STUDENT', 'WAITING_ON_OWNER', 'RESOLVED', 'CANCELLED'],
  CANCELLED: ['REOPENED'],
};
type Choices = {
  teams: Array<{ id: string; name: string }>;
  macros: Array<{ id: string; title: string; body: string; locale: string }>;
};
export function SupportTicketDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const { language } = useTranslation(),
    { hasPermission } = useAdminAuthorization(),
    c = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const scope = useOwnerOperationScope(id);
  const locked = useRef(false);
  const [record, setRecord] = useState<SupportTicket | null>(null),
    [messages, setMessages] = useState<SupportMessageDto[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [events, setEvents] = useState<Array<{ id: string; type: string; createdAt: string }>>([]),
    [eventsCursor, setEventsCursor] = useState<string | null>(null),
    [choices, setChoices] = useState<Choices>({ teams: [], macros: [] }),
    [agents, setAgents] = useState<Array<{ id: string; label: string }>>([]),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [uncertain, setUncertain] = useState(false),
    [delivery, setDelivery] = useState<Record<string, string>>({}),
    [notice, setNotice] = useState(''),
    [body, setBody] = useState(''),
    [internal, setInternal] = useState(false),
    [requestInformation, setRequestInformation] = useState(false),
    [status, setStatus] = useState(''),
    [priority, setPriority] = useState(''),
    [team, setTeam] = useState(''),
    [assignee, setAssignee] = useState(''),
    [reason, setReason] = useState(''),
    [related, setRelated] = useState(''),
    [relatedChoices, setRelatedChoices] = useState<SupportTicket[]>([]);
  const pending = useRef<{
      signature: string;
      key: string;
      path: string;
      method: 'POST' | 'PATCH';
    } | null>(null),
    generation = useRef(0);
  const base = '/admin/support/cases/' + encodeURIComponent(id);
  const load = useCallback(async () => {
    if (!scope.isCurrent()) return;
    const current = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const [r, m] = await Promise.all([
        adminApiClient.request<SupportTicket>(base),
        adminApiClient.request<SupportPage<SupportMessageDto>>(base + '/messages?limit=30'),
      ]);
      if (!scope.isCurrent() || current !== generation.current) return;
      if (r.id !== id) throw Error('SUPPORT_CASE_IDENTITY_MISMATCH');
      setRecord(r);
      setMessages(m.items);
      setCursor(m.nextCursor);
      setStatus(r.status);
      setPriority(r.priority);
      setTeam(r.teamId ?? '');
      setAssignee(r.assigneeId ?? '');
    } catch (e) {
      if (scope.isCurrent() && current === generation.current) setError(supportError(e, language));
    } finally {
      if (scope.isCurrent() && current === generation.current) setLoading(false);
    }
  }, [base, language, id, scope]);
  useEffect(() => {
    locked.current = false;
    setBusy(false);
    setRecord(null);
    setMessages([]);
    setCursor(null);
    setEventsCursor(null);
    setNotice('');
    setReason('');
    setRelated('');
    setBody('');
    pending.current = null;
    setUncertain(false);
    setDelivery({});
    setEvents([]);
  }, [id]);
  useEffect(() => {
    const pendingGeneration = generation;
    void load();
    return () => {
      ++pendingGeneration.current;
    };
  }, [load]);
  useEffect(() => {
    let live = true;
    void adminApiClient
      .request<Choices>('/admin/support/choices')
      .then((r) => {
        if (live) setChoices(r);
      })
      .catch(() => {
        if (live) setChoices({ teams: [], macros: [] });
      });
    return () => {
      live = false;
    };
  }, [id]);
  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!record || record.id !== id || locked.current || !scope.isCurrent()) return;
    const payload = {
        body,
        expectedVersion: record.version,
        internal,
        requestInformation: !internal && requestInformation,
      },
      signature = JSON.stringify(payload);
    if (
      pending.current &&
      (pending.current.signature !== signature || pending.current.path !== base + '/messages')
    ) {
      setUncertain(true);
      return;
    }
    pending.current ??= {
      signature,
      key: createAdminIdempotencyKey(),
      path: base + '/messages',
      method: 'POST',
    };
    locked.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await adminApiClient.request(base + '/messages', {
        method: 'POST',
        body: signature,
        idempotencyKey: pending.current.key,
      });
      if (!scope.isCurrent()) return;
      setBody('');
      pending.current = null;
      setNotice(
        c(
          'حُفظت الرسالة. حالة إشعار الطالب تُدار بصورة مستقلة؛ الحفظ لا يعني التسليم.',
          'Message saved. Notification delivery is separate from message persistence.',
        ),
      );
      await load();
      if (scope.isCurrent()) onChanged();
    } catch (e) {
      if (!scope.isCurrent()) return;
      setError(supportError(e, language));
      if (pending.current) {
        if (e instanceof Error && /^\[4(?:00|01|03|04|09|22)\]/.test(e.message))
          pending.current = null;
        else setUncertain(true);
      }
    } finally {
      if (scope.isCurrent()) {
        locked.current = false;
        setBusy(false);
      }
    }
  };
  const change = async (event: FormEvent) => {
    event.preventDefault();
    if (!record || record.id !== id || locked.current || !scope.isCurrent()) return;
    const payload = {
      expectedVersion: record.version,
      reason,
      ...(status !== record.status ? { status } : {}),
      ...(priority !== record.priority ? { priority } : {}),
      ...(team !== (record.teamId ?? '') ? { teamId: team || null } : {}),
      ...(assignee !== (record.assigneeId ?? '') ? { assigneeId: assignee || null } : {}),
      ...(related ? { relatedCaseId: related } : {}),
    };
    const signature = JSON.stringify(payload);
    if (
      pending.current &&
      (pending.current.signature !== signature || pending.current.path !== base)
    ) {
      setUncertain(true);
      return;
    }
    pending.current ??= {
      signature,
      key: createAdminIdempotencyKey(),
      path: base,
      method: 'PATCH',
    };
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await adminApiClient.request(base, {
        method: 'PATCH',
        body: signature,
        idempotencyKey: pending.current.key,
      });
      if (!scope.isCurrent()) return;
      pending.current = null;
      setReason('');
      setRelated('');
      await load();
      if (scope.isCurrent()) onChanged();
    } catch (e) {
      if (!scope.isCurrent()) return;
      setError(supportError(e, language));
      if (pending.current) {
        if (e instanceof Error && /^\[4(?:00|01|03|04|09|22)\]/.test(e.message))
          pending.current = null;
        else setUncertain(true);
      }
    } finally {
      if (scope.isCurrent()) {
        locked.current = false;
        setBusy(false);
      }
    }
  };
  const recover = async () => {
    const attempt = pending.current;
    if (!attempt || locked.current || !scope.isCurrent()) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await adminApiClient.request<{ state: 'SAVED' | 'UNKNOWN'; caseId?: string }>(
        '/admin/support/command-status',
        { headers: { 'Idempotency-Key': attempt.key } },
      );
      if (!scope.isCurrent()) return;
      if (!['SAVED', 'UNKNOWN'].includes(result.state) || (result.caseId && result.caseId !== id))
        throw Error('SUPPORT_COMMAND_IDENTITY_MISMATCH');
      if (result.state === 'UNKNOWN') {
        // Replay the exact frozen command and key, even if another refresh changed the visible version.
        await adminApiClient.request(attempt.path, {
          method: attempt.method,
          body: attempt.signature,
          idempotencyKey: attempt.key,
        });
      }
      if (!scope.isCurrent()) return;
      if (attempt.method === 'POST') setBody('');
      pending.current = null;
      setUncertain(false);
      setNotice(
        c(
          'تم التحقق من الحفظ؛ لم ننشئ طلبًا جديدًا.',
          'Save verified without creating a new command.',
        ),
      );
      await load();
      if (scope.isCurrent()) onChanged();
    } catch (e) {
      if (!scope.isCurrent()) return;
      setError(supportError(e, language));
      if (e instanceof Error && /^\[4(?:00|01|03|04|09|22)\]/.test(e.message)) {
        pending.current = null;
        setUncertain(false);
      }
    } finally {
      if (scope.isCurrent()) {
        locked.current = false;
        setBusy(false);
      }
    }
  };
  const inspectDelivery = async (messageId: string) => {
    if (!scope.isCurrent() || locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const r = await adminApiClient.request<{ saved: boolean; notification: string }>(
        base + '/messages/' + encodeURIComponent(messageId) + '/status',
      );
      if (!scope.isCurrent()) return;
      const labels: Record<string, string> = {
        NOT_REQUESTED: c('محفوظة داخليًا؛ لا إشعار', 'Saved internally; no notification'),
        QUEUED: c('محفوظة؛ بانتظار معالجة الإشعار', 'Saved; notification queued'),
        PENDING: c('محفوظة؛ الإشعار قيد المعالجة', 'Saved; notification pending'),
        DELIVERED: c('محفوظة؛ سُلّم الإشعار', 'Saved; notification delivered'),
        FAILED: c('محفوظة؛ تعذر الإشعار', 'Saved; notification failed'),
        SUPPRESSED: c('محفوظة؛ الإشعار محجوب بالسياسة', 'Saved; notification suppressed'),
        UNKNOWN: c('محفوظة؛ التسليم غير متحقق', 'Saved; delivery unverified'),
      };
      setDelivery((old) => ({ ...old, [messageId]: labels[r.notification] ?? labels.UNKNOWN }));
    } catch (e) {
      if (scope.isCurrent()) setError(supportError(e, language));
    } finally {
      if (scope.isCurrent()) {
        locked.current = false;
        setBusy(false);
      }
    }
  };
  const history = async (next?: string) => {
    if (!scope.isCurrent() || locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const r = await adminApiClient.request<
        SupportPage<{ id: string; type: string; createdAt: string }>
      >(
        base + '/events?' + new URLSearchParams({ limit: '25', ...(next ? { cursor: next } : {}) }),
      );
      if (!scope.isCurrent()) return;
      setEvents((old) => (next ? [...old, ...r.items] : r.items));
      setEventsCursor(r.nextCursor);
    } catch (e) {
      if (scope.isCurrent()) setError(supportError(e, language));
    } finally {
      if (scope.isCurrent()) {
        locked.current = false;
        setBusy(false);
      }
    }
  };
  return (
    <>
      <div className="operations-actions">
        <Link className="operations-button" to="/students/support?tab=inbox">
          {c('العودة إلى الصندوق', 'Back to inbox')}
        </Link>
        <button
          className="operations-button"
          disabled={loading || busy}
          onClick={() => void load()}
        >
          {c('تحديث التفاصيل مع الاحتفاظ بالمسودة', 'Refresh, keeping draft')}
        </button>
      </div>
      {error && <OperationsNotice error>{error}</OperationsNotice>}
      {notice && <OperationsNotice>{notice}</OperationsNotice>}
      {uncertain && (
        <OperationsNotice>
          {c(
            'نتيجة الحفظ غير مؤكدة. المسودة محفوظة؛ تحقق قبل إرسال أي تغيير آخر.',
            'Save outcome unknown. Your draft is kept; verify before another change.',
          )}{' '}
          <button className="operations-button" disabled={busy} onClick={() => void recover()}>
            {c('تحقق وأعد الطلب نفسه عند الحاجة', 'Verify and safely retry the same command')}
          </button>
        </OperationsNotice>
      )}
      {loading && <p role="status">{c('جارٍ تحميل التذكرة…', 'Loading case…')}</p>}
      {record && (
        <>
          <fieldset disabled={busy || uncertain} className="contents">
            <section className="operations-panel">
              <div>
                <h2>{record.title}</h2>
                <span dir="ltr">{record.publicId}</span> · {supportLabel(record.status, language)} ·{' '}
                {supportLabel(record.priority, language)}
              </div>
              {hasPermission('admin:students:support') && (
                <Link
                  to={
                    '/students/support?tab=directory&student=' +
                    encodeURIComponent(record.studentId)
                  }
                >
                  {c(
                    'فتح ملف الطالب حسب صلاحيات الأقسام',
                    'Open student record with owner permissions',
                  )}
                </Link>
              )}
              <p>
                {record.slaSnapshot
                  ? c(
                      'أهداف الخدمة محسوبة وفق نسخة السياسة المثبتة عند إنشاء التذكرة.',
                      'Service targets use the policy snapshot at case creation.',
                    )
                  : c(
                      'لا توجد سياسة مستوى خدمة معتمدة لهذه التذكرة.',
                      'No approved SLA policy for this case.',
                    )}
              </p>
              {record.firstReplyDueAt && (
                <p>
                  {c('موعد أول رد', 'First reply due')}:{' '}
                  {new Date(record.firstReplyDueAt).toLocaleString(language)}
                </p>
              )}
              {record.resolutionDueAt && (
                <p>
                  {c('موعد الحل', 'Resolution due')}:{' '}
                  {new Date(record.resolutionDueAt).toLocaleString(language)}{' '}
                  {record.slaPausedAt && c('(العد متوقف بانتظار الطالب)', '(paused for student)')}
                </p>
              )}
              {record.slaBreached && (
                <OperationsNotice>
                  {c(
                    'تجاوز مستوى الخدمة مسجل ويظل ظاهرًا بعد الرد.',
                    'An SLA breach was recorded and remains visible after a reply.',
                  )}
                </OperationsNotice>
              )}
            </section>
          </fieldset>
          <fieldset disabled={busy || uncertain} className="contents">
            <section className="operations-panel">
              <h2>{c('المحادثة', 'Conversation')}</h2>
              {cursor && (
                <button
                  disabled={busy}
                  className="operations-button"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await adminApiClient.request<SupportPage<SupportMessageDto>>(
                        base + '/messages?' + new URLSearchParams({ limit: '30', cursor }),
                      );
                      setMessages((old) => [
                        ...r.items.filter((item) => !old.some((row) => row.id === item.id)),
                        ...old,
                      ]);
                      setCursor(r.nextCursor);
                    } catch (e) {
                      setError(supportError(e, language));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {c('رسائل أقدم', 'Older messages')}
                </button>
              )}
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={
                    'support-message ' +
                    (message.visibility === 'INTERNAL' ? 'support-internal' : '')
                  }
                >
                  <div>
                    <strong>
                      {message.visibility === 'INTERNAL'
                        ? c('ملاحظة داخلية — للموظفين فقط', 'Internal note — staff only')
                        : message.authorKind === 'STUDENT'
                          ? c('الطالب', 'Student')
                          : c('فريق الدعم', 'Support team')}
                    </strong>
                    <time>{new Date(message.createdAt).toLocaleString(language)}</time>
                  </div>
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <button
                    type="button"
                    className="operations-button"
                    onClick={() => void inspectDelivery(message.id)}
                  >
                    {c('حالة الحفظ والإشعار', 'Save and notification status')}
                  </button>
                  {delivery[message.id] && <p role="status">{delivery[message.id]}</p>}
                </article>
              ))}
              {(hasPermission('admin:students:support:cases:reply') ||
                hasPermission('admin:students:support:cases:notes')) && (
                <fieldset disabled={busy || uncertain} className="contents">
                  <form className="grid gap-3" onSubmit={send}>
                    <div className="operations-actions">
                      {hasPermission('admin:students:support:cases:reply') && (
                        <button
                          className={'operations-button ' + (!internal ? 'selected' : '')}
                          type="button"
                          onClick={() => setInternal(false)}
                        >
                          {c('رد للطالب', 'Reply to student')}
                        </button>
                      )}
                      {hasPermission('admin:students:support:cases:notes') && (
                        <button
                          className={'operations-button ' + (internal ? 'selected' : '')}
                          type="button"
                          onClick={() => setInternal(true)}
                        >
                          {c('ملاحظة داخلية', 'Internal note')}
                        </button>
                      )}
                    </div>
                    {internal && (
                      <OperationsNotice>
                        {c(
                          'هذا النص للموظفين المصرح لهم فقط ولن يرسل إلى الطالب.',
                          'Only authorized staff can see this note; it is not sent to the student.',
                        )}
                      </OperationsNotice>
                    )}
                    {!internal && choices.macros.length > 0 && (
                      <label>
                        {c(
                          'إدراج رد محفوظ — راجعه قبل الإرسال',
                          'Insert saved reply — review before sending',
                        )}
                        <select
                          value=""
                          onChange={(e) => {
                            const macro = choices.macros.find((m) => m.id === e.target.value);
                            if (macro)
                              setBody((old) => (old ? old + '\n' + macro.body : macro.body));
                          }}
                        >
                          <option value="">{c('اختر الرد', 'Choose reply')}</option>
                          {choices.macros
                            .filter((m) => m.locale === language)
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.title}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                    <label>
                      {internal
                        ? c('نص الملاحظة', 'Internal note')
                        : c('نص الرد الظاهر للطالب', 'Reply visible to student')}
                      <textarea
                        required
                        rows={4}
                        maxLength={4000}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                      />
                    </label>
                    {!internal && (
                      <label>
                        <input
                          type="checkbox"
                          checked={requestInformation}
                          onChange={(e) => setRequestInformation(e.target.checked)}
                        />{' '}
                        {c(
                          'طلب معلومات وتحويلها إلى انتظار الطالب',
                          'Request information and wait for student',
                        )}
                      </label>
                    )}
                    <button
                      className="operations-button primary"
                      disabled={
                        busy ||
                        loading ||
                        !body.trim() ||
                        (!internal && !hasPermission('admin:students:support:cases:reply'))
                      }
                    >
                      {internal
                        ? c('حفظ الملاحظة الداخلية', 'Save internal note')
                        : c('حفظ الرد للطالب', 'Save public reply')}
                    </button>
                  </form>
                </fieldset>
              )}
            </section>
          </fieldset>
          {(hasPermission('admin:students:support:cases:manage') ||
            hasPermission('admin:students:support:cases:assign')) && (
            <fieldset disabled={busy || uncertain} className="contents">
              <form className="operations-panel" onSubmit={change}>
                <h2>{c('إدارة التذكرة', 'Case management')}</h2>
                <div className="operations-filters">
                  {hasPermission('admin:students:support:cases:manage') && (
                    <>
                      <label>
                        {c('الحالة', 'Status')}
                        <select value={status} onChange={(e) => setStatus(e.target.value)}>
                          {[record.status, ...(transitions[record.status] ?? [])].map((s) => (
                            <option key={s} value={s}>
                              {supportLabel(s, language)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {c('الأولوية', 'Priority')}
                        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                          {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((s) => (
                            <option key={s} value={s}>
                              {supportLabel(s, language)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                  {hasPermission('admin:students:support:cases:assign') && (
                    <>
                      <label>
                        {c('الفريق', 'Team')}
                        <select
                          value={team}
                          onChange={(e) => {
                            setTeam(e.target.value);
                            setAssignee('');
                          }}
                        >
                          <option value="">{c('بدون فريق', 'No team')}</option>
                          {choices.teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {c('الموظف المؤهل', 'Eligible agent')}
                        <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                          <option value="">{c('غير مسندة', 'Unassigned')}</option>
                          {record.assigneeId && !agents.some((a) => a.id === record.assigneeId) && (
                            <option value={record.assigneeId}>
                              {c('الموظف المسند حاليًا', 'Current assignee')}
                            </option>
                          )}
                          {agents.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="operations-button"
                        onClick={async () => {
                          try {
                            const r = await adminApiClient.request<{ items: typeof agents }>(
                              '/admin/support/agents',
                            );
                            setAgents(r.items);
                          } catch (e) {
                            setError(supportError(e, language));
                          }
                        }}
                      >
                        {c('تحميل الموظفين المؤهلين', 'Load eligible agents')}
                      </button>
                    </>
                  )}
                </div>
                {hasPermission('admin:students:support:cases:manage') && (
                  <details>
                    <summary>
                      {c(
                        'ربط تذكرة أخرى للطالب نفسه دون دمج',
                        'Link another case for the same student without merging',
                      )}
                    </summary>
                    <button
                      type="button"
                      className="operations-button"
                      onClick={async () => {
                        try {
                          const r = await adminApiClient.request<SupportPage<SupportTicket>>(
                            '/admin/support/cases?' +
                              new URLSearchParams({ studentId: record.studentId, limit: '50' }),
                          );
                          setRelatedChoices(r.items.filter((row) => row.id !== record.id));
                        } catch (e) {
                          setError(supportError(e, language));
                        }
                      }}
                    >
                      {c('جلب تذاكر الطالب ضمن النطاق', 'Load student cases within scope')}
                    </button>
                    <select
                      aria-label={c('التذكرة المرتبطة', 'Related case')}
                      value={related}
                      onChange={(e) => setRelated(e.target.value)}
                    >
                      <option value="">{c('بدون ربط جديد', 'No new link')}</option>
                      {relatedChoices.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.publicId} — {row.title}
                        </option>
                      ))}
                    </select>
                  </details>
                )}
                <label>
                  {c('سبب التغيير', 'Change reason')}
                  <input
                    required
                    minLength={3}
                    maxLength={2000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <button disabled={busy || loading} className="operations-button primary">
                  {c('حفظ التغييرات', 'Save changes')}
                </button>
              </form>
            </fieldset>
          )}
          <fieldset disabled={busy || uncertain} className="contents">
            <section className="operations-panel">
              <h2>{c('نشاط التذكرة', 'Case activity')}</h2>
              <button className="operations-button" disabled={busy} onClick={() => void history()}>
                {c('عرض النشاط', 'Show activity')}
              </button>
              {events.map((e) => (
                <p key={e.id}>
                  <span>{e.type}</span> ·{' '}
                  <time>{new Date(e.createdAt).toLocaleString(language)}</time>
                </p>
              ))}
              {eventsCursor && (
                <button
                  className="operations-button"
                  disabled={busy}
                  onClick={() => void history(eventsCursor)}
                >
                  {c('نشاط أقدم', 'Older activity')}
                </button>
              )}
            </section>
          </fieldset>
        </>
      )}
    </>
  );
}
