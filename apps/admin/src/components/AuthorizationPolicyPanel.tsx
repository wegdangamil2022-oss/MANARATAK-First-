import { useEffect, useRef, useState } from 'react';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { AuthorizationIdentityPicker } from './AuthorizationIdentityPicker';

type PolicyRow = {
  id: string;
  name: string;
  description: string;
  ruleType: string;
  configuration: string;
  revision?: string;
};
const initial = {
  name: '',
  description: '',
  ruleType: 'TIME' as 'TIME' | 'IP',
  start: '09:00',
  end: '17:00',
  timezone: 'UTC',
  ips: '',
  days: [0, 1, 2, 3, 4, 5, 6] as number[],
};
export function AuthorizationPolicyPanel() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<PolicyRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<PolicyRow | null>(null);
  const [form, setForm] = useState(initial);
  const [approver, setApprover] = useState('');
  const [ticket, setTicket] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [testIp, setTestIp] = useState('');
  const [testTime, setTestTime] = useState('');
  const [confirming, setConfirming] = useState<'save' | 'retire' | null>(null);
  const [usage,setUsage]=useState<{id:string;name:string}[]>([]);
  const [usageCursor,setUsageCursor]=useState<string|null>(null);
  const selectedId=selected?.id || '';
  useEffect(()=>{
    let active=true;setUsage([]);setUsageCursor(null);if(!selectedId)return;
    adminApiClient.request<{data:{roles:{id:string;name:string}[];nextCursor:string|null}}>(`/admin/authorization/policies/${encodeURIComponent(selectedId)}/usage?limit=25`,{cache:'no-store'})
      .then(result=>{if(active){setUsage(result.data.roles);setUsageCursor(result.data.nextCursor);}}).catch(failure=>{if(active)setError(String(failure));});
    return()=>{active=false;};
  },[selectedId]);
  const moreUsage=async()=>{
    if(!selectedId||!usageCursor||lock.current)return;lock.current=true;setBusy(true);setError('');
    try{const result=await adminApiClient.request<{data:{roles:{id:string;name:string}[];nextCursor:string|null}}>(`/admin/authorization/policies/${encodeURIComponent(selectedId)}/usage?limit=25&cursor=${encodeURIComponent(usageCursor)}`);
      setUsage(previous=>[...new Map([...previous,...result.data.roles].map(row=>[row.id,row])).values()]);setUsageCursor(result.data.nextCursor);
    }catch(failure){setError(String(failure));}finally{lock.current=false;setBusy(false);}
  };
  const lock = useRef(false);
  const command = useRef<{ fingerprint: string; key: string; id: string } | null>(null);
  const baseline = useRef(JSON.stringify(initial));
  const dirty = JSON.stringify(form) !== baseline.current;
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const click = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('a[href]') &&
        !window.confirm(t('iam_discard_changes'))
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', click, true);
    window.addEventListener('beforeunload', guard);
    return () => {
      window.removeEventListener('beforeunload', guard);
      document.removeEventListener('click', click, true);
    };
  }, [dirty, t]);
  useEffect(() => {
    let active = true;
    adminApiClient
      .request<{ data: { policies: PolicyRow[]; nextCursor: string | null } }>(
        '/admin/authorization/policies?limit=25',
      )
      .then((result) => {
        if (active) {
          setRows(result.data.policies);
          setCursor(result.data.nextCursor);
        }
      })
      .catch((failure) => {
        if (active) setError(String(failure));
      });
    return () => {
      active = false;
    };
  }, []);
  const page = async (next: string | null = null) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await adminApiClient.request<{
        data: { policies: PolicyRow[]; nextCursor: string | null };
      }>(
        `/admin/authorization/policies?limit=25${next ? `&cursor=${encodeURIComponent(next)}` : ''}`,
        { cache: 'no-store' },
      );
      setRows(result.data.policies);
      setCursor(result.data.nextCursor);
    } catch (failure) {
      setError(String(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const select = (row: PolicyRow | null) => {
    if (dirty && !window.confirm(t('iam_discard_changes'))) return;
    try {
      let config: {
        start?: string;
        end?: string;
        timezone?: string;
        allowedIps?: string[];
        daysOfWeek?: number[];
      } = {};
      if (row) {
        const raw = row.configuration.trim();
        if (raw.startsWith('{')) config = JSON.parse(raw);
        else if (row.ruleType === 'TIME') {
          const [start, end] = raw.split('-');
          config = { start, end };
        } else if (row.ruleType === 'IP')
          config = {
            allowedIps: raw.startsWith('[')
              ? JSON.parse(raw)
              : raw.split(',').map((ip) => ip.trim()),
          };
      }
      // Legacy configurations and weekday restrictions are preserved until the typed editor supports them.
      if (row && !['TIME', 'IP', 'RETIRED'].includes(row.ruleType))
        throw new Error(t('iam_policy_legacy'));
      const next = row
        ? {
            ...initial,
            name: row.name,
            description: row.description,
            ruleType: row.ruleType === 'IP' ? ('IP' as const) : ('TIME' as const),
            start: config.start || '09:00',
            end: config.end || '17:00',
            timezone: config.timezone || 'UTC',
            ips: config.allowedIps?.join('\n') || '',
            days: config.daysOfWeek || initial.days,
          }
        : initial;
      setForm(next);
      baseline.current = JSON.stringify(next);
      setSelected(row);
      setConfirming(null);
      setPreview('');
      setError('');
    } catch (failure) {
      setError(String(failure));
    }
  };
  const definition = () => ({
    name: form.name,
    description: form.description,
    ruleType: form.ruleType,
    configuration:
      form.ruleType === 'TIME'
        ? { start: form.start, end: form.end, timezone: form.timezone, daysOfWeek: form.days }
        : {
            allowedIps: form.ips
              .split(/[\n,]/)
              .map((ip) => ip.trim())
              .filter(Boolean),
          },
  });
  const simulate = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setPreview('');
    try {
      const result = await adminApiClient.request<{
        data: { granted: boolean; reasons: string[] };
      }>('/admin/authorization/policies/test', {
        method: 'POST',
        idempotencyKey: createAdminIdempotencyKey(),
        body: JSON.stringify({
          ...definition(),
          ...(testIp ? { testIp } : {}),
          ...(testTime ? { testTime: new Date(testTime).toISOString() } : {}),
        }),
      });
      setPreview(
        `${result.data.granted ? t('iam_access_granted') : t('iam_access_denied')}: ${result.data.reasons.join('; ')}`,
      );
    } catch (failure) {
      setError(String(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const write = async () => {
    if (
      lock.current ||
      !confirming ||
      !approver ||
      ticket.trim().length < 6 ||
      reason.trim().length < 6
    )
      return;
    const fingerprint = JSON.stringify([
      selected?.id,
      selected?.revision,
      confirming,
      definition(),
      approver,
      ticket,
      reason,
    ]);
    if (command.current?.fingerprint !== fingerprint)
      command.current = {
        fingerprint,
        key: createAdminIdempotencyKey(),
        id: `policy-${createAdminIdempotencyKey()}`,
      };
    const body =
      confirming === 'retire'
        ? { expectedRevision: selected?.revision, reason }
        : {
            ...definition(),
            reason,
            ...(selected ? { expectedRevision: selected.revision } : { id: command.current.id }),
          };
    const endpoint = `/admin/authorization/policies${selected ? `/${encodeURIComponent(selected.id)}${confirming === 'retire' ? '/retire' : ''}` : ''}`;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await adminApiClient.request(endpoint, {
        method: selected && confirming === 'save' ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
        idempotencyKey: command.current.key,
        headers: { 'x-second-approver-id': approver, 'x-change-ticket': ticket.trim() },
      });
      command.current = null;
      setSelected(null);
      setForm(initial);
      baseline.current = JSON.stringify(initial);
      setConfirming(null);
      setReason('');
      lock.current = false;
      await page();
    } catch (failure) {
      setError(String(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section
      className="rounded-2xl border bg-white p-4 space-y-3"
      aria-labelledby="iam-policies-title"
    >
      <h2 id="iam-policies-title" className="font-bold">
        {t('iam_policies')}
      </h2>
      <p>{t('iam_policy_help')}</p>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">{t('iam_loading')}</p>}
      {!rows.length && <p>{t('iam_empty')}</p>}
      <div className="flex flex-wrap gap-2">
        {rows.map((row) => (
          <button disabled={busy} key={row.id} type="button" onClick={() => select(row)}>
            {row.name} ({row.ruleType})
          </button>
        ))}
      </div>
      <button type="button" disabled={busy} onClick={() => void page()}>
        {t('iam_first_page')}
      </button>
      <button type="button" disabled={busy || !cursor} onClick={() => void page(cursor)}>
        {t('iam_next')}
      </button>
      <button type="button" disabled={busy} onClick={() => select(null)}>
        {t('iam_new_policy')}
      </button>
      {selected && <section><h3>{t('iam_policy_usage')}</h3><ul>{usage.map(role=><li key={role.id}>{role.name} <code>{role.id}</code></li>)}</ul><button type="button" disabled={busy||!usageCursor} onClick={()=>void moreUsage()}>{t('iam_next')}</button></section>}
    <fieldset disabled={busy} className="space-y-2">
        <label className="block">
          {t('iam_name')}
          <input
            className="w-full border p-2"
            value={form.name}
            maxLength={240}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="block">
          {t('iam_role_description')}
          <textarea
            className="w-full border p-2"
            value={form.description}
            maxLength={2000}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label className="block">
          {t('iam_policy_type')}
          <select
            value={form.ruleType}
            onChange={(e) => setForm({ ...form, ruleType: e.target.value as 'TIME' | 'IP' })}
          >
            <option value="TIME">TIME</option>
            <option value="IP">IP</option>
          </select>
        </label>
        {form.ruleType === 'TIME' ? (
          <>
            <label>
              {t('iam_time_start')}
              <input
                type="time"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
              />
            </label>
            <label>
              {t('iam_time_end')}
              <input
                type="time"
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
              />
            </label>
            <label className="block">
              {t('iam_timezone')}
              <input
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              />
            </label>
          </>
        ) : (
          <label className="block">
            {t('iam_allowed_ips')}
            <textarea
              className="w-full border p-2"
              value={form.ips}
              onChange={(e) => setForm({ ...form, ips: e.target.value })}
            />
          </label>
        )}
        {form.ruleType === 'TIME' && (
          <fieldset>
            <legend>{t('iam_days')}</legend>
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <label className="inline-flex gap-1 m-1" key={day}>
                <input
                  type="checkbox"
                  checked={form.days.includes(day)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      days: e.target.checked
                        ? [...form.days, day]
                        : form.days.filter((value) => value !== day),
                    })
                  }
                />
                {t(`iam_day_${day}` as Parameters<typeof t>[0])}
              </label>
            ))}
          </fieldset>
        )}
        <label className="block">
          {t('iam_test_ip')}
          <input value={testIp} onChange={(e) => setTestIp(e.target.value)} />
        </label>
        <label className="block">
          {t('iam_test_time')}
          <input
            type="datetime-local"
            value={testTime}
            onChange={(e) => setTestTime(e.target.value)}
          />
        </label>
        <button type="button" disabled={!form.name.trim()} onClick={() => void simulate()}>
          {t('iam_test_policy')}
        </button>
        <button
          type="button"
          disabled={!form.name.trim() || (Boolean(selected) && !selected?.revision)}
          onClick={() => setConfirming('save')}
        >
          {t('iam_review_policy')}
        </button>
        {selected && (
          <button
            type="button"
            disabled={!selected.revision || selected.ruleType === 'RETIRED'}
            onClick={() => setConfirming('retire')}
          >
            {t('iam_retire_policy')}
          </button>
        )}
      </fieldset>
      {preview && <p role="status">{preview}</p>}
      {confirming && (
        <fieldset disabled={busy} className="border border-amber-300 p-3 space-y-2">
          <p>{t('iam_policy_change_warning')}</p>
          <AuthorizationIdentityPicker approver value={approver} onChange={setApprover} />
          <label>
            {t('iam_change_ticket')}
            <input value={ticket} maxLength={240} onChange={(e) => setTicket(e.target.value)} />
          </label>
          <label className="block">
            {t('iam_reason')}
            <textarea value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} />
          </label>
          <button
            type="button"
            disabled={!approver || ticket.trim().length < 6 || reason.trim().length < 6}
            onClick={() => void write()}
          >
            {t('iam_confirm')}
          </button>
          <button type="button" onClick={() => setConfirming(null)}>
            {t('iam_cancel')}
          </button>
        </fieldset>
      )}
    </section>
  );
}
