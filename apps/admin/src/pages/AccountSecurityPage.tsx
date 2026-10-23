import { useEffect, useRef, useState } from 'react';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
export function AccountSecurityPage() {
  const { t, dir } = useTranslation();
  const [state, setState] = useState<{ enabled: boolean; stepUpFresh: boolean } | null>(null);
  const [password, setPassword] = useState(''),
    [code, setCode] = useState(''),
    [setup, setSetup] = useState<{ secret: string; provisioningUri: string } | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const command = useRef<{ signature: string; key: string } | null>(null);
  useEffect(() => {
    let active = true;
    adminApiClient
      .request<{ data: { enabled: boolean; stepUpFresh: boolean } }>('/auth/mfa')
      .then((result) => {
        if (active) setState(result.data);
      })
      .catch(() => {
        if (active) setError(t('mfa_failed'));
      });
    return () => {
      active = false;
    };
  }, []);
  const act = async (action: 'enroll' | 'confirm' | 'step-up' | 'disable') => {
    if (busy || !state) return;
    setBusy(true);
    setError('');
    setNotice('');
    const body =
      action === 'confirm' ? { code } : action === 'enroll' ? { password } : { password, code };
    const signature = JSON.stringify([action, body]);
    if (command.current?.signature !== signature)
      command.current = { signature, key: createAdminIdempotencyKey() };
    try {
      const result = await adminApiClient.request<{
        data: { secret?: string; provisioningUri?: string; loginRequired?: boolean };
      }>(`/auth/mfa/${action}`, {
        method: 'POST',
        body: JSON.stringify(body),
        idempotencyKey: command.current.key,
      });
      command.current = null;
      setPassword('');
      setCode('');
      if (action === 'enroll' && result.data.secret && result.data.provisioningUri)
        setSetup({ secret: result.data.secret, provisioningUri: result.data.provisioningUri });
      if (result.data.loginRequired) {
        setSetup(null);
        setNotice(t('mfa_login_again'));
        window.location.assign('/admin/login');
      }
      if (action === 'step-up') {
        setState({ enabled: true, stepUpFresh: true });
        setNotice(t('mfa_fresh'));
      }
    } catch {
      setError(t('mfa_failed'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section dir={dir} className="mx-auto max-w-2xl space-y-5 rounded-2xl border bg-white p-6">
      <header className="admin-page-hero"><h1 className="">{t('mfa_title')}</h1></header>
      <p>{t('mfa_help')}</p>
      {state ? (
        <p>{state.enabled ? t('mfa_enabled') : t('mfa_disabled')}</p>
      ) : (
        <p role="status">{t('iam_loading')}</p>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <label className="block">
        {t('mfa_password')}
        <input
          className="block w-full rounded border p-2"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={128}
        />
      </label>
      <label className="block">
        {t('mfa_code')}
        <input
          className="block w-full rounded border p-2"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
        />
      </label>
      {!state?.enabled && !setup && (
        <button
          type="button"
          disabled={busy || !state || !password}
          onClick={() => void act('enroll')}
        >
          {t('mfa_begin')}
        </button>
      )}
      {setup && (
        <div className="rounded border p-3">
          <p>{t('mfa_secret')}</p>
          <code dir="ltr" className="block break-all select-all">
            {setup.secret}
          </code>
          <a href={setup.provisioningUri}>{t('mfa_begin')}</a>
          <button
            type="button"
            disabled={busy || !/^\d{6}$/.test(code)}
            onClick={() => void act('confirm')}
          >
            {t('mfa_confirm')}
          </button>
        </div>
      )}
      {state?.enabled && (
        <div className="flex gap-4">
          <button
            type="button"
            disabled={busy || !password || !/^\d{6}$/.test(code)}
            onClick={() => void act('step-up')}
          >
            {t('mfa_step_up')}
          </button>
          <button
            type="button"
            disabled={busy || !password || !/^\d{6}$/.test(code)}
            onClick={() => void act('disable')}
          >
            {t('mfa_disable')}
          </button>
        </div>
      )}
      {state?.stepUpFresh && <p>{t('mfa_fresh')}</p>}
    </section>
  );
}
