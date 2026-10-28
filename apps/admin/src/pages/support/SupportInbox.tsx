import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, Plus, Search, Inbox } from 'lucide-react';
import { adminApiClient, createAdminIdempotencyKey } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { OperationsNotice } from '../../features/operations/OperationsWorkspace';
import { SupportTicketDetail } from './SupportTicketDetail';
import {
  supportError,
  supportLabel,
  supportStates,
  type SupportTicket,
  type SupportPage,
} from './SupportModel';
const views = [
  ['ALL', 'الكل', 'All'],
  ['NEEDS_REPLY', 'تحتاج ردًا', 'Needs reply'],
  ['MINE', 'مسندة لي', 'Mine'],
  ['UNASSIGNED', 'غير مسندة', 'Unassigned'],
  ['WAITING', 'بانتظار الطالب', 'Waiting'],
  ['OVERDUE', 'متأخرة', 'Overdue'],
  ['REOPENED', 'معاد فتحها', 'Reopened'],
  ['RESOLVED', 'محلولة', 'Resolved'],
];
export function SupportInbox() {
  const { language } = useTranslation(),
    { hasPermission } = useAdminAuthorization(),
    [params, setParams] = useSearchParams();
  const c = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const [query, setQuery] = useState(params.get('q') ?? ''),
    [items, setItems] = useState<SupportTicket[]>([]),
    [next, setNext] = useState<string | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [ready, setReady] = useState<boolean | null>(null),
    [creating, setCreating] = useState(false),
    [revision, setRevision] = useState(0);
  const generation = useRef(0),
    view = params.get('view') ?? 'NEEDS_REPLY',
    status = params.get('status') ?? '',
    applied = params.get('q') ?? '',
    studentId = params.get('studentId') ?? '',
    ticket = params.get('ticket');
  const load = useCallback(
    async (cursor?: string) => {
      const current = ++generation.current;
      setLoading(true);
      setError('');
      try {
        const health = await adminApiClient.request<{ ready: boolean }>('/admin/support/readiness');
        if (current !== generation.current) return;
        setReady(health.ready);
        if (!health.ready) {
          setItems([]);
          setNext(null);
          return;
        }
        const q = new URLSearchParams({ limit: '25', view });
        if (studentId) q.set('studentId', studentId);
        if (applied) q.set('q', applied);
        if (status) q.set('status', status);
        if (cursor) q.set('cursor', cursor);
        const result = await adminApiClient.request<SupportPage<SupportTicket>>(
          '/admin/support/cases?' + q,
        );
        if (current !== generation.current) return;
        setItems((old) =>
          cursor
            ? [...old, ...result.items.filter((row) => !old.some((item) => item.id === row.id))]
            : result.items,
        );
        setNext(result.nextCursor);
      } catch (e) {
        if (current === generation.current) {
          setError(supportError(e, language));
          if (!cursor) setItems([]);
        }
      } finally {
        if (current === generation.current) setLoading(false);
      }
    },
    [view, status, applied, studentId, language],
  );
  useEffect(() => {
    void load();
    return () => {
      ++generation.current;
    };
  }, [load, revision]);
  const update = (key: string, value: string) => {
    const q = new URLSearchParams(params);
    value ? q.set(key, value) : q.delete(key);
    if (key !== 'ticket') q.delete('ticket');
    q.set('tab', 'inbox');
    setParams(q);
  };
  if (ticket)
    return <SupportTicketDetail id={ticket} onChanged={() => setRevision((value) => value + 1)} />;
  return (
    <>
      <div className="operations-actions">
        <button className="operations-button" disabled={loading} onClick={() => void load()}>
          <RefreshCw size={15} />
          {c('تحديث', 'Refresh')}
        </button>
        {ready &&
          hasPermission('admin:students:support:cases:create') &&
          hasPermission('admin:students:support:cases:all') &&
          hasPermission('admin:students:support') && (
            <button
              className="operations-button primary"
              onClick={() => setCreating((value) => !value)}
            >
              <Plus size={15} />
              {c('تذكرة بالنيابة عن طالب', 'Create by proxy')}
            </button>
          )}
      </div>
      {ready === false && (
        <OperationsNotice>
          {c(
            'تذاكر الدعم غير مفعلة على هذه القاعدة: يلزم اعتماد جداولها أولًا. دليل الطلاب والتشخيص يعملان بصورة مستقلة.',
            'Support storage needs its approved schema. The student directory and diagnostics remain independent.',
          )}
        </OperationsNotice>
      )}
      {error && <OperationsNotice error>{error}</OperationsNotice>}
      {creating && (
        <ProxyCaseForm
          onSaved={(id) => {
            setCreating(false);
            update('ticket', id);
          }}
        />
      )}
      <section className="operations-panel">
        <div className="operations-actions" aria-label={c('قوائم التذاكر', 'Inbox views')}>
          {views.map(([id, ar, en]) => (
            <button
              key={id}
              aria-pressed={view === id}
              className={'operations-button ' + (view === id ? 'selected' : '')}
              onClick={() => update('view', id)}
            >
              {c(ar, en)}
            </button>
          ))}
        </div>
        <form
          className="operations-filters"
          onSubmit={(event) => {
            event.preventDefault();
            update('q', query.trim());
          }}
        >
          <label>
            {c('رقم التذكرة أو العنوان', 'Case reference or subject')}
            <input maxLength={120} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <label>
            {c('الحالة', 'Status')}
            <select value={status} onChange={(e) => update('status', e.target.value)}>
              <option value="">{c('كل الحالات', 'All statuses')}</option>
              {supportStates.map((s) => (
                <option key={s} value={s}>
                  {supportLabel(s, language)}
                </option>
              ))}
            </select>
          </label>
          <div className="operations-actions">
            <button className="operations-button">
              <Search size={15} />
              {c('بحث', 'Search')}
            </button>
            <button
              className="operations-button"
              type="button"
              onClick={() => {
                setQuery('');
                setParams({ tab: 'inbox' });
              }}
            >
              {c('مسح المرشحات', 'Clear filters')}
            </button>
          </div>
        </form>
        <div className="operations-table-scroll" aria-busy={loading}>
          <table>
            <thead>
              <tr>
                {['التذكرة|Case', 'الحالة|Status', 'الأولوية|Priority', 'آخر تحديث|Updated'].map(
                  (label) => (
                    <th key={label}>{label.split('|')[language === 'ar' ? 0 : 1]}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link
                      to={
                        '/students/support?' +
                        new URLSearchParams({
                          ...Object.fromEntries(params),
                          tab: 'inbox',
                          ticket: item.id,
                        })
                      }
                    >
                      <strong>{item.title}</strong>
                      <br />
                      <span dir="ltr">{item.publicId}</span>
                    </Link>
                  </td>
                  <td>
                    {supportLabel(item.status, language)}
                    {item.slaBreached && (
                      <small className="block text-rose-700">
                        {c('تجاوز مسجل لمستوى الخدمة', 'Recorded SLA breach')}
                      </small>
                    )}
                  </td>
                  <td>{supportLabel(item.priority, language)}</td>
                  <td>{new Date(item.updatedAt).toLocaleString(language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length && !loading && ready && (
          <p className="operations-empty">
            <Inbox size={20} className="mx-auto mb-2" />
            {c(
              'لا توجد تذاكر ضمن النطاق والمرشحات الحالية.',
              'No cases in your current scope and filters.',
            )}
          </p>
        )}
        {loading && <p role="status">{c('جارٍ التحميل…', 'Loading…')}</p>}
        {next && (
          <button className="operations-button" disabled={loading} onClick={() => void load(next)}>
            {c('تحميل المزيد', 'Load more')}
          </button>
        )}
      </section>
    </>
  );
}
function ProxyCaseForm({ onSaved }: { onSaved: (id: string) => void }) {
  const { language } = useTranslation(),
    c = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const [q, setQ] = useState(''),
    [students, setStudents] = useState<Array<{ studentReferenceId: string; displayName?: string }>>(
      [],
    ),
    [student, setStudent] = useState(''),
    [title, setTitle] = useState(''),
    [body, setBody] = useState(''),
    [category, setCategory] = useState('OTHER'),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [uncertain, setUncertain] = useState(false);
  const pending = useRef<{ signature: string; key: string } | null>(null);
  const search = async () => {
    setBusy(true);
    try {
      const r = await adminApiClient.request<{ items: typeof students }>(
        '/admin/students/support?' +
          new URLSearchParams({ query: q, limit: '20', status: 'ACTIVE' }),
      );
      setStudents(r.items);
    } catch (e) {
      setError(supportError(e, language));
    } finally {
      setBusy(false);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = { studentId: student, title, body, category, reason },
      signature = JSON.stringify(payload);
    if (!pending.current || pending.current.signature !== signature)
      pending.current = { signature, key: createAdminIdempotencyKey() };
    setBusy(true);
    setError('');
    try {
      const r = await adminApiClient.request<{ record: SupportTicket }>('/admin/support/cases', {
        method: 'POST',
        body: signature,
        idempotencyKey: pending.current.key,
      });
      onSaved(r.record.id);
    } catch (e) {
      setError(supportError(e, language));
      if (e instanceof Error && /^\[4(?:00|01|03|04|09|22)\]/.test(e.message))
        pending.current = null;
      else setUncertain(true);
    } finally {
      setBusy(false);
    }
  };
  const recover = async () => {
    const attempt = pending.current;
    if (!attempt) return;
    setBusy(true);
    try {
      const status = await adminApiClient.request<{ state: 'SAVED' | 'UNKNOWN'; caseId?: string }>(
        '/admin/support/command-status',
        { headers: { 'Idempotency-Key': attempt.key } },
      );
      if (status.state === 'SAVED' && status.caseId) {
        onSaved(status.caseId);
        return;
      }
      const result = await adminApiClient.request<{ record: SupportTicket }>(
        '/admin/support/cases',
        { method: 'POST', body: attempt.signature, idempotencyKey: attempt.key },
      );
      onSaved(result.record.id);
    } catch (e) {
      setError(supportError(e, language));
      if (e instanceof Error && /^\[4(?:00|01|03|04|09|22)\]/.test(e.message)) {
        pending.current = null;
        setUncertain(false);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      {uncertain && (
        <OperationsNotice>
          {c(
            'تحقق من نتيجة الحفظ قبل إنشاء طلب آخر.',
            'Check the save outcome before another command.',
          )}{' '}
          <button className="operations-button" disabled={busy} onClick={() => void recover()}>
            {c('التحقق وإعادة نفس الطلب عند الحاجة', 'Verify and safely retry the same command')}
          </button>
        </OperationsNotice>
      )}
      <fieldset disabled={busy || uncertain} className="contents">
        <form className="operations-panel" onSubmit={submit}>
          <h2>{c('تذكرة بالنيابة عن الطالب', 'Proxy case')}</h2>
          <div className="operations-actions">
            <input
              aria-label={c('ابحث عن الطالب', 'Find student')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              maxLength={120}
            />
            <button
              type="button"
              className="operations-button"
              disabled={busy}
              onClick={() => void search()}
            >
              {c('البحث عن طالب', 'Find student')}
            </button>
          </div>
          <label>
            {c('الطالب', 'Student')}
            <select required value={student} onChange={(e) => setStudent(e.target.value)}>
              <option value="">{c('اختر نتيجة البحث', 'Choose search result')}</option>
              {students.map((s) => (
                <option key={s.studentReferenceId} value={s.studentReferenceId}>
                  {s.displayName || s.studentReferenceId}
                </option>
              ))}
            </select>
          </label>
          <label>
            {c('العنوان', 'Subject')}
            <input
              required
              minLength={3}
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            {c('التصنيف', 'Category')}
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {[
                'ACCOUNT',
                'SCHOLARSHIPS',
                'UNIVERSITIES',
                'APPLICATIONS',
                'COURSES',
                'CERTIFICATES',
                'SERVICES',
                'FILES',
                'TECHNICAL',
                'OTHER',
              ].map((key) => (
                <option key={key} value={key}>
                  {supportLabel(key, language)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {c('رسالة ظاهرة للطالب', 'Message visible to student')}
            <textarea
              required
              rows={4}
              minLength={3}
              maxLength={4000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <label>
            {c('سبب الإنشاء بالنيابة', 'Proxy reason')}
            <input
              required
              minLength={3}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button disabled={busy} className="operations-button primary">
            {c('حفظ التذكرة', 'Save case')}
          </button>
          {error && <OperationsNotice error>{error}</OperationsNotice>}
        </form>
      </fieldset>
    </div>
  );
}
