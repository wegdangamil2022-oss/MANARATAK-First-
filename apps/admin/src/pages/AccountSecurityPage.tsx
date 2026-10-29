import { useCallback, useEffect, useRef, useState } from 'react';
import { useOwnerOperationScope } from '../security/useOwnerOperationScope';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
export function AccountSecurityPage() {
  const { t, dir, language } = useTranslation();
  const scope = useOwnerOperationScope('account-security');
  const lock = useRef(false),
    readSequence = useRef(0);
  const [reading, setReading] = useState(true);
  const [state, setState] = useState<{ enabled: boolean; stepUpFresh: boolean } | null>(null);
  const [password, setPassword] = useState(''),
    [code, setCode] = useState(''),
    [setup, setSetup] = useState<{ secret: string; provisioningUri: string } | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const command = useRef<{ signature: string; key: string } | null>(null);
  const read = useCallback(async () => {
    const current = ++readSequence.current;
    setReading(true);
    setError('');
    await adminApiClient
      .request<{ data: { enabled: boolean; stepUpFresh: boolean } }>('/auth/mfa', {
        cache: 'no-store',
      })
      .then((result) => {
        if (scope.isCurrent() && current === readSequence.current) {
          if (
            typeof result.data?.enabled !== 'boolean' ||
            typeof result.data?.stepUpFresh !== 'boolean'
          )
            throw Error('INVALID_MFA_READ');
          setState(result.data);
        }
      })
      .catch(() => {
        if (scope.isCurrent() && current === readSequence.current) {
          setState(null);
          setError(t('mfa_failed'));
        }
      })
      .finally(() => {
        if (scope.isCurrent() && current === readSequence.current) setReading(false);
      });
  }, [scope, t]);
  useEffect(() => {
    const pendingSequence = readSequence;
    void read();
    return () => {
      pendingSequence.current++;
    };
  }, [read]);
  const act = async (action: 'enroll' | 'confirm' | 'step-up' | 'disable') => {
    if (lock.current || !scope.isCurrent() || !state) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const body =
      action === 'confirm' ? { code } : action === 'enroll' ? { password } : { password, code };
    const signature = JSON.stringify([action, body]);
    if (command.current && command.current.signature !== signature) {
      lock.current = false;
      setBusy(false);
      setError(
        language === 'ar'
          ? 'نتيجة المحاولة السابقة غير مؤكدة. أعد المحاولة بالبيانات نفسها أو تحقق من حالة الحساب.'
          : 'The previous attempt is uncertain. Retry the same request or verify the account state.',
      );
      return;
    }
    command.current ??= { signature, key: createAdminIdempotencyKey() };
    try {
      const result = await adminApiClient.request<{
        data: {
          secret?: string;
          provisioningUri?: string;
          loginRequired?: boolean;
          stepUpFresh?: boolean;
        };
      }>(`/auth/mfa/${action}`, {
        method: 'POST',
        body: JSON.stringify(body),
        idempotencyKey: command.current.key,
      });
      if (!scope.isCurrent()) return;
      if (action === 'step-up' && result.data.stepUpFresh !== true) throw Error('INVALID_MFA_ACK');
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
    } catch (cause) {
      if (!scope.isCurrent()) return;
      if (cause instanceof Error && /^\[(400|401|403|404|409|422|428)\]/.test(cause.message))
        command.current = null;
      setError(t('mfa_failed'));
    } finally {
      if (scope.isCurrent()) {
        lock.current = false;
        setBusy(false);
      }
    }
  };
  return (
    <section dir={dir} className="mx-auto max-w-2xl space-y-5 rounded-2xl border bg-white p-6">
      <header className="admin-page-hero">
        <h1 className="">{t('mfa_title')}</h1>
      </header>
      <p>{t('mfa_help')}</p>
      {state ? (
        <p>{state.enabled ? t('mfa_enabled') : t('mfa_disabled')}</p>
      ) : reading ? (
        <p role="status">{t('iam_loading')}</p>
      ) : (
        <button type="button" disabled={busy} onClick={() => void read()}>
          {language === 'ar' ? 'إعادة تحميل حالة الأمان' : 'Reload security state'}
        </button>
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
        <div className="flex flex-wrap gap-4">
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
