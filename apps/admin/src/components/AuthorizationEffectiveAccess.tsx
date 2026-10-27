import { useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { AuthorizationIdentityPicker } from './AuthorizationIdentityPicker';
import { ADMIN_PERMISSION_CATALOG } from '@manaratak/shared';
type AccessRole = {
  id: string;
  name?: string;
  missing: boolean;
  sources: string[];
  permissions: string[];
  policies: {
    id: string;
    name?: string;
    ruleType?: string;
    missing: boolean;
    conditionGranted?: boolean;
    reasons?: string[];
  }[];
};
type Decision = { permission: string; granted: boolean; reasons: string[] };
export function AuthorizationEffectiveAccess({
  initialIdentityId = '',
}: {
  initialIdentityId?: string;
}) {
  const { t, language } = useTranslation();
  const [permission, setPermission] = useState('');
  const label = (key: string) => {
    const entry = ADMIN_PERMISSION_CATALOG.find((item) => item.key === key);
    return entry ? (language === 'ar' ? entry.labelAr : entry.labelEn) : key;
  };
  const [identity, setIdentity] = useState(initialIdentityId);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const grouped = new Map<string, Decision[]>();
  for (const decision of decisions) {
    const domain =
      ADMIN_PERMISSION_CATALOG.find((item) => item.key === decision.permission)?.domain ?? 'other';
    grouped.set(domain, [...(grouped.get(domain) ?? []), decision]);
  }

  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [evaluatedAt, setEvaluatedAt] = useState('');
  const requestId = useRef(0);
  const select = (id: string) => {
    requestId.current++;
    setBusy(false);
    setIdentity(id);
    setDecisions([]);
    setRoles([]);
    setEvaluatedAt('');
    setError('');
  };
  const invalidateRequests = () => {
    requestId.current += 1;
  };
  useEffect(() => {
    select(initialIdentityId);
    return invalidateRequests;
  }, [initialIdentityId]);
  const evaluate = async () => {
    if (!identity || busy) return;
    const current = ++requestId.current;
    setBusy(true);
    setError('');
    setDecisions([]);
    setRoles([]);
    setEvaluatedAt('');
    try {
      const result = await adminApiClient.request<{
        data: { roles: AccessRole[]; decisions: Decision[]; evaluatedAt: string };
      }>(
        `/admin/authorization/effective-access/${encodeURIComponent(identity)}${permission ? `?${new URLSearchParams({ permission })}` : ''}`,
        {
          cache: 'no-store',
        },
      );
      if (current === requestId.current) {
        setDecisions(result.data.decisions);
        setRoles(result.data.roles);
        setEvaluatedAt(result.data.evaluatedAt);
      }
    } catch (failure) {
      if (current === requestId.current) setError(String(failure));
    } finally {
      if (current === requestId.current) setBusy(false);
    }
  };
  return (
    <section
      className="rounded-2xl border bg-white p-4 space-y-3"
      aria-labelledby="iam-effective-title"
    >
      <h2 id="iam-effective-title" className="font-bold">
        {t('iam_effective_access')}
      </h2>
      <p>{t('iam_effective_help')}</p>
      <p className="sf-notice">
        {language === 'ar'
          ? 'هذه نتيجة وقت الفحص وفي سياق اتصال المسؤول الحالي. لا تثبت جاهزية تسجيل دخول الموظف أو اكتمال MFA في جلسته.'
          : 'This result uses the current administrator connection and evaluation time. It does not prove the employee can sign in or has completed MFA in their session.'}
      </p>
      <AuthorizationIdentityPicker value={identity} onChange={select} />
      <label className="block">
        {t('iam_test_permission')}
        <select
          className="w-full rounded-xl border p-2"
          value={permission}
          disabled={busy}
          onChange={(event) => {
            setPermission(event.target.value);
            setDecisions([]);
            setRoles([]);
            setEvaluatedAt('');
          }}
        >
          <option value="">{t('iam_test_all_permissions')}</option>
          {ADMIN_PERMISSION_CATALOG.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {label(entry.key)} · {entry.key}
            </option>
          ))}
        </select>
      </label>
      <button type="button" disabled={!identity || busy} onClick={() => void evaluate()}>
        {t('iam_evaluate_access')}
      </button>
      {busy && <p role="status">{t('iam_loading')}</p>}
      {error && <p role="alert">{error}</p>}
      {evaluatedAt && <time dateTime={evaluatedAt}>{evaluatedAt}</time>}
      <ul>
        {roles.map((role) => (
          <li key={role.id}>
            <strong>{role.name || role.id}</strong> (
            {role.sources
              .map((source) =>
                source === 'EMERGENCY'
                  ? t('iam_access_source_emergency')
                  : t('iam_access_source_assignment'),
              )
              .join(', ')}
            ) — {role.missing && <span>{t('iam_unavailable')}</span>}
            {role.policies
              .map(
                (policy) =>
                  `${policy.name || policy.id}: ${policy.missing ? t('iam_unavailable') : `${policy.ruleType} — ${policy.conditionGranted === undefined ? t('iam_unavailable') : t(policy.conditionGranted ? 'iam_access_granted' : 'iam_access_denied')}`} ${(policy.reasons ?? []).join('; ')}`,
              )
              .join('; ')}
          </li>
        ))}
      </ul>
      {[...grouped].map(([domain, entries]) => (
        <section key={domain} className="space-y-2">
          <h3 className="font-bold">
            {t('iam_permission_domain')}: {domain}
          </h3>
          <ul>
            {entries.map((d) => (
              <li key={d.permission}>
                <strong>{label(d.permission)}</strong> · <code>{d.permission}</code>:{' '}
                {d.granted ? t('iam_access_granted') : t('iam_access_denied')} —{' '}
                {d.reasons.join('; ')}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
