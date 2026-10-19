import { GovernanceApprovalsPanel } from './GovernanceApprovalsPanel';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useEffect, useRef, useState } from 'react';
import { ADMIN_PERMISSION_CATALOG } from '@absheer/shared';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { AuthorizationIdentityPicker } from './AuthorizationIdentityPicker';
import { useTranslation } from '../i18n/I18nProvider';
interface Pair {
  id: string;
  first: string;
  second: string;
  description: string;
}
interface DutyException {
  id: string;
  principalId: string;
  expiresAt: string;
  reason: string;
  revokedAt?: string;
}
interface Review {
  id: string;
  principalId: string;
  decision: string;
  nextReviewAt: string;
  reviewedAt: string;
}
export function AuthorizationGovernancePanel() {
  const { t, language } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const exceptionAttempt = useRef<{ signature: string; id: string; startsAt: string } | null>(null);
  const [pairs, setPairs] = useState<Pair[]>([]),
    [revision, setRevision] = useState<string | null>(null);
  const [first, setFirst] = useState(''),
    [second, setSecond] = useState(''),
    [description, setDescription] = useState('');
  const [reason, setReason] = useState(''),
    [approver, setApprover] = useState(''),
    [ticket, setTicket] = useState('');
  const [exceptions, setExceptions] = useState<DutyException[]>([]),
    [exceptionCursor, setExceptionCursor] = useState<string | null>(null);
  const [resetPrincipal, setResetPrincipal] = useState('');
  const [principal, setPrincipal] = useState(''),
    [exceptionPairs, setExceptionPairs] = useState<string[]>([]),
    [until, setUntil] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]),
    [cursor, setCursor] = useState<string | null>(null);
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const command = useRef<{ signature: string; key: string } | null>(null);
  const errorText = t('iam_governance_failed');
  const refresh = async () => {
    const [policy, review, exceptionPage] = await Promise.all([
      adminApiClient.request<{ data: { policy: { pairs: Pair[] }; revision: string | null } }>(
        '/admin/authorization/governance/duties',
      ),
      adminApiClient.request<{ data: { items: Review[]; nextCursor: string | null } }>(
        '/admin/authorization/governance/access-reviews?limit=25',
      ),
      adminApiClient.request<{ data: { items: DutyException[]; nextCursor: string | null } }>(
        '/admin/authorization/governance/duties/exceptions?limit=25',
      ),
    ]);
    setExceptions(exceptionPage.data.items);
    setExceptionCursor(exceptionPage.data.nextCursor);
    setPairs(policy.data.policy.pairs);
    setRevision(policy.data.revision);
    setReviews(review.data.items);
    setCursor(review.data.nextCursor);
    setReady(true);
  };
  useEffect(() => {
    let active = true;
    refresh().catch(() => {
      if (active) setError(errorText);
    });
    return () => {
      active = false;
    };
  }, []);
  const mutate = async (endpoint: string, payload: object, method = 'POST', approved = false) => {
    if (busy || !ready) return;
    setBusy(true);
    setError('');
    setNotice('');
    const signature = JSON.stringify([
      endpoint,
      payload,
      method,
      approved ? [approver, ticket] : [],
    ]);
    if (command.current?.signature !== signature)
      command.current = { signature, key: createAdminIdempotencyKey() };
    try {
      if (approved) {
        const scope = endpoint.endsWith('/exceptions')
          ? 'DUTY_EXCEPTION'
          : endpoint.endsWith('/mfa-reset')
            ? 'MFA_RESET'
            : 'DUTY_POLICY';
        await adminApiClient.request('/admin/authorization/governance/approvals', {
          method: 'POST',
          idempotencyKey: command.current.key,
          headers: { 'x-second-approver-id': approver, 'x-change-ticket': ticket },
          body: JSON.stringify({
            id: command.current.key,
            scope,
            approverId: approver,
            payload: { ...payload, changeTicket: ticket },
          }),
        });
        setNotice(t('iam_approval_requested'));
        return;
      }
      await adminApiClient.request(endpoint, {
        method,
        body: JSON.stringify(payload),
        idempotencyKey: command.current.key,
        headers: approved ? { 'x-second-approver-id': approver, 'x-change-ticket': ticket } : {},
      });
      command.current = null;
      setNotice(t('iam_saved'));
      await refresh();
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message.includes('AUTHORIZATION_DUTY_CONFLICT')
          ? t('iam_duty_existing_conflict')
          : errorText,
      );
    } finally {
      setBusy(false);
    }
  };
  const labels = ADMIN_PERMISSION_CATALOG.map((entry) => ({
    key: entry.key,
    label: language === 'ar' ? entry.labelAr : entry.labelEn,
  }));
  return (
    <section
      className="space-y-5 rounded-2xl border bg-white p-5"
      aria-label={t('iam_governance_title')}
    >
      <h2 className="font-bold">{t('iam_governance_title')}</h2>
      <p>{t('iam_duty_help')}</p>
      {!ready && <p role="status">{t('iam_loading')}</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <fieldset disabled={!ready || busy} className="space-y-3">
        <legend className="font-bold">{t('iam_duty_pairs')}</legend>
        <div className="grid gap-3 md:grid-cols-3">
          <label>
            {t('iam_duty_first')}
            <select
              className="w-full rounded border p-2"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
            >
              <option value="">{t('iam_select_permission')}</option>
              {labels.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('iam_duty_second')}
            <select
              className="w-full rounded border p-2"
              value={second}
              onChange={(e) => setSecond(e.target.value)}
            >
              <option value="">{t('iam_select_permission')}</option>
              {labels.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('iam_description')}
            <input
              className="w-full rounded border p-2"
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={
            !first || !second || first === second || !description.trim() || pairs.length >= 100
          }
          onClick={() => {
            setPairs((old) => [...old, { id: crypto.randomUUID(), first, second, description }]);
            setFirst('');
            setSecond('');
            setDescription('');
          }}
        >
          {t('iam_duty_add')}
        </button>
        <ul>
          {pairs.map((pair) => (
            <li key={pair.id} className="flex gap-3 py-2">
              <span>{pair.description}</span>
              <span>
                {labels.find((p) => p.key === pair.first)?.label} /{' '}
                {labels.find((p) => p.key === pair.second)?.label}
              </span>
              <button
                type="button"
                onClick={() => setPairs((old) => old.filter((p) => p.id !== pair.id))}
              >
                {t('iam_remove')}
              </button>
            </li>
          ))}
        </ul>
        <label>
          {t('iam_change_reason')}
          <textarea
            className="w-full rounded border p-2"
            value={reason}
            minLength={12}
            maxLength={2000}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <AuthorizationIdentityPicker approver value={approver} onChange={setApprover} />
        <label>
          {t('iam_change_ticket')}
          <input
            className="w-full rounded border p-2"
            value={ticket}
            minLength={6}
            maxLength={240}
            onChange={(e) => setTicket(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!approver || ticket.trim().length < 6 || reason.trim().length < 12}
          onClick={() =>
            void mutate(
              '/admin/authorization/governance/duties',
              { pairs, expectedRevision: revision, reason },
              'PUT',
              true,
            )
          }
        >
          {t('iam_duty_save')}
        </button>
        <h3 className="font-bold">{t('iam_duty_exception')}</h3>
        <p>{t('iam_duty_exception_help')}</p>
        <AuthorizationIdentityPicker value={principal} onChange={setPrincipal} />
        {pairs.map((pair) => (
          <label key={pair.id} className="block">
            <input
              type="checkbox"
              checked={exceptionPairs.includes(pair.id)}
              onChange={(e) =>
                setExceptionPairs((old) =>
                  e.target.checked ? [...old, pair.id] : old.filter((id) => id !== pair.id),
                )
              }
            />{' '}
            {pair.description}
          </label>
        ))}
        <label>
          {t('iam_exception_until')}
          <input
            className="rounded border p-2"
            type="datetime-local"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={
            !revision ||
            !principal ||
            !exceptionPairs.length ||
            !until ||
            !approver ||
            reason.trim().length < 12 ||
            ticket.trim().length < 6
          }
          onClick={() => {
            const signature = JSON.stringify([
              principal,
              exceptionPairs,
              revision,
              until,
              reason,
              approver,
              ticket,
            ]);
            if (exceptionAttempt.current?.signature !== signature)
              exceptionAttempt.current = {
                signature,
                id: createAdminIdempotencyKey(),
                startsAt: new Date().toISOString(),
              };
            void mutate(
              '/admin/authorization/governance/duties/exceptions',
              {
                id: exceptionAttempt.current.id,
                principalId: principal,
                pairIds: exceptionPairs,
                policyRevision: revision,
                startsAt: exceptionAttempt.current.startsAt,
                expiresAt: new Date(until).toISOString(),
                reason,
              },
              'POST',
              true,
            );
          }}
        >
          {t('iam_exception_approve')}
        </button>
      </fieldset>
      <section className="space-y-3">
        <h3>{t('iam_duty_exception_history')}</h3>
        <ul>
          {exceptions.map((item) => (
            <li key={item.id}>
              {item.principalId} — {new Date(item.expiresAt).toLocaleString(language)} —{' '}
              {item.reason}
              {item.revokedAt ? (
                <span>{t('iam_exception_revoked')}</span>
              ) : (
                Date.parse(item.expiresAt) > Date.now() && (
                  <button
                    type="button"
                    disabled={busy || reason.trim().length < 6}
                    onClick={() =>
                      void mutate(
                        '/admin/authorization/governance/duties/exceptions/' +
                          encodeURIComponent(item.id) +
                          '/revoke',
                        { reason },
                      )
                    }
                  >
                    {t('iam_exception_revoke')}
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
        {exceptionCursor && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              try {
                const page = await adminApiClient.request<{
                  data: { items: DutyException[]; nextCursor: string | null };
                }>(
                  '/admin/authorization/governance/duties/exceptions?limit=25&cursor=' +
                    encodeURIComponent(exceptionCursor),
                );
                setExceptions((old) => [...old, ...page.data.items]);
                setExceptionCursor(page.data.nextCursor);
              } catch {
                setError(errorText);
              }
            }}
          >
            {t('iam_next')}
          </button>
        )}
      </section>
      <GovernanceApprovalsPanel key={notice} onApplied={refresh} />
      {hasPermission('admin:credentials:manage') && (
        <section className="space-y-3">
          <h3>{t('iam_mfa_reset')}</h3>
          <p>{t('iam_mfa_reset_help')}</p>
          <AuthorizationIdentityPicker value={resetPrincipal} onChange={setResetPrincipal} />
          <button
            type="button"
            disabled={
              busy ||
              !resetPrincipal ||
              !approver ||
              reason.trim().length < 12 ||
              ticket.trim().length < 6
            }
            onClick={() =>
              void mutate(
                '/admin/authorization/governance/mfa-reset',
                { identityId: resetPrincipal, reason },
                'POST',
                true,
              )
            }
          >
            {t('iam_mfa_reset_request')}
          </button>
        </section>
      )}
      <section className="space-y-3">
        <h3 className="font-bold">{t('iam_access_reviews')}</h3>
        <p>{t('iam_access_reviews_help')}</p>
        <AccessReviewForm onSaved={refresh} />
        <ul>
          {reviews.map((review) => (
            <li key={review.id}>
              {review.principalId} —{' '}
              {review.decision === 'KEEP' ? t('iam_review_keep') : t('iam_review_revoke')} —{' '}
              <time dateTime={review.nextReviewAt}>
                {new Date(review.nextReviewAt).toLocaleString(language)}
              </time>
            </li>
          ))}
        </ul>
        {cursor && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await adminApiClient.request<{
                  data: { items: Review[]; nextCursor: string | null };
                }>(
                  `/admin/authorization/governance/access-reviews?limit=25&cursor=${encodeURIComponent(cursor)}`,
                );
                setReviews((old) => [...old, ...result.data.items]);
                setCursor(result.data.nextCursor);
              } catch {
                setError(errorText);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('iam_next')}
          </button>
        )}
      </section>
    </section>
  );
}
function AccessReviewForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const { t } = useTranslation();
  const [principal, setPrincipal] = useState(''),
    [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]),
    [reason, setReason] = useState(''),
    [next, setNext] = useState(''),
    [decision, setDecision] = useState('KEEP');
  const [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState('');
  const signature = useRef<{ value: string; key: string; id: string } | null>(null);
  useEffect(() => {
    let active = true;
    setLoaded(false);
    setRoles([]);
    if (principal)
      adminApiClient
        .request<{ data: { roles: Array<{ id: string; name: string }> } }>(
          `/admin/authorization/governance/access-reviews/subjects/${encodeURIComponent(principal)}`,
        )
        .then((result) => {
          if (active) {
            setRoles(result.data.roles);
            setLoaded(true);
          }
        })
        .catch(() => {
          if (active) setError(t('iam_governance_failed'));
        });
    return () => {
      active = false;
    };
  }, [principal]);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || !loaded) return;
        setBusy(true);
        setError('');
        const value = JSON.stringify([principal, roles, reason, next, decision]);
        if (signature.current?.value !== value)
          signature.current = {
            value,
            id: createAdminIdempotencyKey(),
            key: createAdminIdempotencyKey(),
          };
        try {
          await adminApiClient.request('/admin/authorization/governance/access-reviews', {
            method: 'POST',
            idempotencyKey: signature.current.key,
            body: JSON.stringify({
              id: signature.current.id,
              principalId: principal,
              roleIds: roles.map((role) => role.id),
              reason,
              nextReviewAt: new Date(next).toISOString(),
              decision,
            }),
          });
          signature.current = null;
          setReason('');
          await onSaved();
        } catch {
          setError(t('iam_governance_failed'));
        } finally {
          setBusy(false);
        }
      }}
    >
      <AuthorizationIdentityPicker value={principal} onChange={setPrincipal} />
      <ul>
        {roles.map((role) => (
          <li key={role.id}>{role.name}</li>
        ))}
      </ul>
      <label>
        {t('iam_review_decision')}
        <select value={decision} onChange={(e) => setDecision(e.target.value)}>
          <option value="KEEP">{t('iam_review_keep')}</option>
          <option value="REVOKE_REQUIRED">{t('iam_review_revoke')}</option>
        </select>
      </label>
      <label>
        {t('iam_change_reason')}
        <textarea
          required
          minLength={6}
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <label>
        {t('iam_next_review')}
        <input
          required
          type="datetime-local"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </label>
      <button disabled={busy || !loaded}>{t('iam_review_save')}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
