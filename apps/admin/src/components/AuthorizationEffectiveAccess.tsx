import { useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { AuthorizationIdentityPicker } from './AuthorizationIdentityPicker';
type AccessRole = {
  id: string;
  name?: string;
  missing: boolean;
  sources: string[];
  permissions: string[];
  policies: { id: string; name?: string; ruleType?: string; missing: boolean }[];
};
type Decision = { permission: string; granted: boolean; reasons: string[] };
export function AuthorizationEffectiveAccess({
  initialIdentityId = '',
}: {
  initialIdentityId?: string;
}) {
  const { t } = useTranslation();
  const [identity, setIdentity] = useState(initialIdentityId);
  const [decisions, setDecisions] = useState<Decision[]>([]);
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
  const invalidateRequests = () => { requestId.current += 1; };
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
    try {
      const result = await adminApiClient.request<{
        data: { roles: AccessRole[]; decisions: Decision[]; evaluatedAt: string };
      }>(`/admin/authorization/effective-access/${encodeURIComponent(identity)}`, {
        cache: 'no-store',
      });
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
      <AuthorizationIdentityPicker value={identity} onChange={select} />
      <button type="button" disabled={!identity || busy} onClick={() => void evaluate()}>
        {t('iam_evaluate_access')}
      </button>
      {busy && <p role="status">{t('iam_loading')}</p>}
      {error && <p role="alert">{error}</p>}
      {evaluatedAt && <time dateTime={evaluatedAt}>{evaluatedAt}</time>}
      <ul>
        {roles.map((role) => (
          <li key={role.id}>
            <strong>{role.name || role.id}</strong> ({role.sources.join(', ')}) —{' '}
            {role.policies
              .map(
                (policy) =>
                  `${policy.name || policy.id}: ${policy.missing ? t('iam_unavailable') : policy.ruleType}`,
              )
              .join('; ')}
          </li>
        ))}
      </ul>
      <ul>
        {decisions.map((d) => (
          <li key={d.permission}>
            <code>{d.permission}</code>:{' '}
            {d.granted ? t('iam_access_granted') : t('iam_access_denied')} — {d.reasons.join('; ')}
          </li>
        ))}
      </ul>
    </section>
  );
}
