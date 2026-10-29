import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiClient } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
interface Ticket {
  id: string;
  publicId: string;
  title: string;
  status: string;
  updatedAt: string;
  version: number;
}
interface Message {
  id: string;
  body: string;
  authorKind: 'STUDENT' | 'AGENT';
  createdAt: string;
}
const stateLabels: Record<string, string> = {
  NEW: 'جديدة',
  OPEN: 'مفتوحة',
  WAITING_ON_STUDENT: 'بانتظارك',
  WAITING_ON_OWNER: 'بانتظار القسم المختص',
  RESOLVED: 'محلولة',
  CLOSED: 'مغلقة',
  REOPENED: 'معاد فتحها',
  CANCELLED: 'ملغاة',
};
export function StudentSupportPanel() {
  const { language } = useTranslation(),
    c = (ar: string, en: string) => (language === 'ar' ? ar : en),
    [params, setParams] = useSearchParams();
  const id = params.get('case'),
    [items, setItems] = useState<Ticket[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [record, setRecord] = useState<Ticket | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [older, setOlder] = useState<string | null>(null),
    [ready, setReady] = useState<boolean | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [uncertain, setUncertain] = useState(false),
    [notice, setNotice] = useState(''),
    [closeConfirm, setCloseConfirm] = useState(false),
    [followup, setFollowup] = useState(false),
    [creating, setCreating] = useState(false),
    [title, setTitle] = useState(''),
    [category, setCategory] = useState('OTHER'),
    [body, setBody] = useState('');
  const retry = useRef<{ signature: string; key: string } | null>(null),
    generation = useRef(0),
    drafts = useRef(new Map<string, string>());
  const failure = (e: unknown) =>
    e instanceof Error && e.message.includes('FOLLOWUP_REQUIRED')
      ? c(
          'انتهت فترة إعادة الفتح. النص محفوظ؛ ارجع للصندوق وأنشئ طلب متابعة جديدًا.',
          'The reopen window expired. Your draft is kept; create a new follow-up case.',
        )
      : c(
          'تعذرت العملية. النص محفوظ؛ حدّث الحالة قبل إعادة الإرسال.',
          'Operation failed. Your draft is preserved; refresh before retrying.',
        );
  const load = async (next?: string) => {
    const current = ++generation.current;
    setBusy(true);
    setError('');
    try {
      const h = await ApiClient.mySupport<{ ready: boolean }>('/readiness');
      if (current !== generation.current) return;
      setReady(h.ready);
      if (!h.ready) return;
      if (id) {
        const r = await ApiClient.mySupport<Ticket>('/cases/' + encodeURIComponent(id)),
          m = await ApiClient.mySupport<{ items: Message[]; nextCursor: string | null }>(
            '/cases/' + encodeURIComponent(id) + '/messages?limit=30',
          );
        if (current !== generation.current) return;
        setRecord(r);
        setMessages(m.items);
        setOlder(m.nextCursor);
      } else {
        const r = await ApiClient.mySupport<{ items: Ticket[]; nextCursor: string | null }>(
          '/cases?' + new URLSearchParams({ limit: '25', ...(next ? { cursor: next } : {}) }),
        );
        if (current !== generation.current) return;
        setItems((old) =>
          next
            ? [...old, ...r.items.filter((row) => !old.some((item) => item.id === row.id))]
            : r.items,
        );
        setCursor(r.nextCursor);
      }
    } catch (e) {
      if (current === generation.current) setError(failure(e));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  };
  useEffect(() => {
    setBody(drafts.current.get(id ?? 'new') ?? '');
    setRecord(null);
    retry.current = null;
    setUncertain(false);
  }, [id]);
  useEffect(() => {
    void load();
    return () => {
      ++generation.current;
    };
  }, [id, language]);
  const draft = (value: string) => {
    setBody(value);
    drafts.current.set(id ?? 'new', value);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const input = id
        ? { body }
        : {
            title,
            category,
            body,
            ...(params.get('followup') ? { followupTo: params.get('followup') } : {}),
          },
      signature = JSON.stringify([id, input]);
    if (!retry.current || retry.current.signature !== signature)
      retry.current = { signature, key: crypto.randomUUID() };
    setBusy(true);
    setError('');
    try {
      const result = await ApiClient.mySupport<{ record: Ticket }>(
        id ? '/cases/' + encodeURIComponent(id) + '/messages' : '/cases',
        { body: input, key: retry.current.key },
      );
      draft('');
      retry.current = null;
      setNotice(
        c(
          'حُفظت رسالتك. وصول الإشعار عملية مستقلة.',
          'Your message is saved. Notification delivery is a separate process.',
        ),
      );
      setCreating(false);
      if (!id) {
        setTitle('');
        const next = new URLSearchParams(params);
        next.set('case', result.record.id);
        next.delete('followup');
        setParams(next);
      } else await load();
    } catch (e) {
      setError(failure(e));
      if (e instanceof Error && /^\[4(?:00|01|03|04|09|22)\]/.test(e.message)) retry.current = null;
      else setUncertain(true);
      if (e instanceof Error && e.message.includes('FOLLOWUP_REQUIRED')) setFollowup(true);
    } finally {
      setBusy(false);
    }
  };
  const recover = async () => {
    const attempt = retry.current;
    if (!attempt) return;
    setBusy(true);
    setError('');
    try {
      const status = await ApiClient.mySupport<{ state: 'SAVED' | 'UNKNOWN'; caseId?: string }>(
        '/command-status',
        { method: 'GET', key: attempt.key },
      );
      let caseId = status.caseId;
      if (status.state === 'UNKNOWN') {
        const [originalId, input] = JSON.parse(attempt.signature) as [
          string | null,
          Record<string, unknown>,
        ];
        const result = await ApiClient.mySupport<{ record: Ticket }>(
          originalId ? '/cases/' + encodeURIComponent(originalId) + '/messages' : '/cases',
          { body: input, key: attempt.key },
        );
        caseId = result.record.id;
      }
      draft('');
      retry.current = null;
      setUncertain(false);
      setCreating(false);
      if (caseId) {
        const q = new URLSearchParams(params);
        q.set('case', caseId);
        q.delete('followup');
        setParams(q);
      }
      await load();
      setNotice(c('تم التحقق من حفظ الطلب.', 'The command save was verified.'));
    } catch (e) {
      setError(failure(e));
      if (e instanceof Error && /^\[4(?:00|01|03|04|09|22)\]/.test(e.message)) {
        retry.current = null;
        setUncertain(false);
      }
    } finally {
      setBusy(false);
    }
  };
  const navigate = (ticket?: string) => {
    const q = new URLSearchParams(params);
    q.set('tab', 'support');
    ticket ? q.set('case', ticket) : q.delete('case');
    setParams(q);
    setNotice('');
  };
  return (
    <section className="font-['Cairo',sans-serif] student-support-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#142B5F]">
          {c('الدعم والمساعدة', 'Support and help')}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="font-['Cairo',sans-serif] rounded-lg border px-3 py-2 text-sm"
          >
            {c('تحديث', 'Refresh')}
          </button>
          {id ? (
            <button
              className="font-['Cairo',sans-serif] rounded-lg border px-3 py-2 text-sm"
              onClick={() => navigate()}
            >
              {c('جميع تذاكري', 'My cases')}
            </button>
          ) : (
            ready && (
              <button
                className="font-['Cairo',sans-serif] rounded-lg bg-[#0E7C86] px-3 py-2 text-sm text-white"
                onClick={() => setCreating((v) => !v)}
              >
                {c('طلب مساعدة جديد', 'New support case')}
              </button>
            )
          )}
        </div>
      </div>
      {ready === false && (
        <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">
          {c(
            'قناة التذاكر غير متاحة حاليًا. بيانات حسابك وخدماتك محفوظة في أقسامها.',
            'Support case storage is unavailable. Your account and service records remain with their owners.',
          )}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      {uncertain && (
        <p role="alert" className="mt-3 text-sm">
          {c(
            'نتيجة الحفظ غير مؤكدة؛ تحقق قبل الإرسال مجددًا.',
            'Save outcome unknown; verify before sending again.',
          )}{' '}
          <button
            className="font-['Cairo',sans-serif] rounded-lg border p-2"
            disabled={busy}
            onClick={() => void recover()}
          >
            {c('تحقق وأعد نفس الطلب عند الحاجة', 'Verify and safely retry the same command')}
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm text-[#0E7C86]">
          {notice}
        </p>
      )}
      {!id && !creating && ready && (
        <div className="mt-4 grid gap-2">
          {items.map((t) => (
            <button
              className="font-['Cairo',sans-serif] flex flex-wrap justify-between gap-3 rounded-xl border bg-white p-3 text-start text-sm"
              key={t.id}
              onClick={() => navigate(t.id)}
            >
              <span>
                <strong>{t.title}</strong>
                <br />
                {t.publicId}
              </span>
              <span>
                {language === 'ar'
                  ? (stateLabels[t.status] ?? t.status)
                  : t.status.toLowerCase().replaceAll('_', ' ')}
                <br />
                {new Date(t.updatedAt).toLocaleString(language)}
              </span>
            </button>
          ))}
          {!items.length && !busy && (
            <p className="p-4 text-center text-sm text-slate-500">
              {c('لا توجد تذاكر دعم بعد.', 'No support cases yet.')}
            </p>
          )}
          {cursor && (
            <button
              disabled={busy}
              className="font-['Cairo',sans-serif] rounded-lg border p-2 text-sm"
              onClick={() => void load(cursor)}
            >
              {c('تحميل المزيد', 'Load more')}
            </button>
          )}
        </div>
      )}
      {id && record && (
        <div className="mt-4 grid gap-3">
          <h3 className="text-base font-semibold">{record.title}</h3>
          {followup && (
            <button
              className="font-['Cairo',sans-serif] rounded-lg border p-2 text-sm"
              onClick={() => {
                drafts.current.set('new', body);
                setTitle(c('متابعة: ', 'Follow-up: ') + record.title);
                setCreating(true);
                setFollowup(false);
                const q = new URLSearchParams(params);
                q.delete('case');
                q.set('followup', id);
                setParams(q);
              }}
            >
              {c(
                'إنشاء متابعة مع الاحتفاظ بالنص وربط الطلب السابق',
                'Create linked follow-up, keeping your draft',
              )}
            </button>
          )}
          {!['CLOSED', 'CANCELLED'].includes(record.status) && (
            <div>
              <button
                className="font-['Cairo',sans-serif] rounded-lg border px-3 py-2 text-sm"
                type="button"
                disabled={busy || uncertain}
                onClick={() => setCloseConfirm((v) => !v)}
              >
                {c('إغلاق طلبي', 'Close my case')}
              </button>
              {closeConfirm && (
                <button
                  className="font-['Cairo',sans-serif] ms-2 rounded-lg border px-3 py-2 text-sm"
                  disabled={busy}
                  type="button"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await ApiClient.mySupport('/cases/' + encodeURIComponent(id) + '/close', {
                        body: { expectedVersion: record.version, confirm: true },
                        key: crypto.randomUUID(),
                      });
                      setCloseConfirm(false);
                      await load();
                    } catch (e) {
                      setError(failure(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {c('تأكيد أنني لا أحتاج متابعة الآن', 'Confirm I need no further help now')}
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500">
            {record.publicId} ·{' '}
            {language === 'ar'
              ? (stateLabels[record.status] ?? record.status)
              : record.status.toLowerCase().replaceAll('_', ' ')}
          </p>
          {older && (
            <button
              disabled={busy}
              className="font-['Cairo',sans-serif] rounded-lg border p-2 text-sm"
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await ApiClient.mySupport<{
                    items: Message[];
                    nextCursor: string | null;
                  }>(
                    '/cases/' +
                      encodeURIComponent(id) +
                      '/messages?' +
                      new URLSearchParams({ limit: '30', cursor: older }),
                  );
                  setMessages((old) => [
                    ...r.items.filter((item) => !old.some((row) => row.id === item.id)),
                    ...old,
                  ]);
                  setOlder(r.nextCursor);
                } catch (e) {
                  setError(failure(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {c('رسائل أقدم', 'Older messages')}
            </button>
          )}
          {messages.map((m) => (
            <article key={m.id} className="rounded-xl border bg-white p-3 text-sm">
              <div className="flex justify-between gap-2 text-xs text-slate-500">
                <strong>
                  {m.authorKind === 'STUDENT' ? c('أنت', 'You') : c('فريق الدعم', 'Support team')}
                </strong>
                <time>{new Date(m.createdAt).toLocaleString(language)}</time>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words">{m.body}</p>
            </article>
          ))}
        </div>
      )}
      {ready && (creating || Boolean(id && record)) && (
        <fieldset disabled={busy || uncertain} className="contents">
          <form
            className="mt-4 grid gap-3 rounded-xl border bg-white p-4 text-sm"
            onSubmit={submit}
          >
            {!id && (
              <>
                <label>
                  {c('العنوان', 'Subject')}
                  <input
                    className="font-['Cairo',sans-serif] mt-1 block w-full rounded-lg border p-2"
                    required
                    minLength={3}
                    maxLength={160}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label>
                  {c('موضوع الطلب', 'Category')}
                  <select
                    className="font-['Cairo',sans-serif] mt-1 block w-full rounded-lg border p-2"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {[
                      ['ACCOUNT', 'الحساب'],
                      ['APPLICATIONS', 'التقديم'],
                      ['COURSES', 'الدورات'],
                      ['CERTIFICATES', 'الشهادات'],
                      ['SERVICES', 'الخدمات'],
                      ['FILES', 'الملفات'],
                      ['TECHNICAL', 'مشكلة تقنية'],
                      ['OTHER', 'أخرى'],
                    ].map(([key, label]) => (
                      <option key={key} value={key}>
                        {c(label, key.toLowerCase())}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label>
              {c('رسالتك', 'Your message')}
              <textarea
                className="font-['Cairo',sans-serif] mt-1 block w-full rounded-lg border p-2"
                required
                minLength={id ? 1 : 3}
                maxLength={4000}
                rows={4}
                value={body}
                onChange={(e) => draft(e.target.value)}
              />
            </label>
            <p className="text-xs text-slate-500">
              {c(
                'لا تضع كلمات مرور أو رموز تحقق. إرفاق الملفات غير متاح في هذه القناة حاليًا.',
                'Do not include passwords or verification codes. Attachments are unavailable in this channel.',
              )}
            </p>
            <button
              disabled={busy || !body.trim()}
              className="font-['Cairo',sans-serif] rounded-lg bg-[#0E7C86] px-4 py-2 text-white"
            >
              {c(id ? 'حفظ الرد' : 'إنشاء الطلب', id ? 'Save reply' : 'Create case')}
            </button>
          </form>
        </fieldset>
      )}
      {busy && (
        <p className="mt-3 text-sm" role="status">
          {c('جارٍ تنفيذ الطلب…', 'Working…')}
        </p>
      )}
    </section>
  );
}
