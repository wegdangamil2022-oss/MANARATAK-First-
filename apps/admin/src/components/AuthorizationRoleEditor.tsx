import { useEffect, useRef, useState } from 'react';
import { ADMIN_PERMISSION_CATALOG } from '@manaratak/shared';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { AuthorizationIdentityPicker } from './AuthorizationIdentityPicker';

interface RoleDetail {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  policyIds: string[];
  revision?: string;
  createdAt?: string;
  updatedAt?: string;
  memberCount: number | null;
}
export function AuthorizationRoleEditor({
  roleId,
  availablePermissions,
  onSaved,
  onDirtyChange,
  onDuplicate,
}: {
  roleId: string;
  availablePermissions: string[];
  onSaved: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onDuplicate?: (role: RoleDetail) => void;
}) {
  const { t, language } = useTranslation();
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [approver, setApprover] = useState('');
  const [ticket, setTicket] = useState('');
  const [confirming, setConfirming] = useState<'save' | 'retire' | null>(null);
  const [policies, setPolicies] = useState<{ id: string; name: string; ruleType: string }[]>([]);
  const [policyCursor, setPolicyCursor] = useState<string | null>(null);
  const [original, setOriginal] = useState('');
  const originalRisk = useRef(false);
  const lock = useRef(false);
  const needsApproval =
    originalRisk.current ||
    !!role?.permissions.some((p) =>
      ADMIN_PERMISSION_CATALOG.some((entry) => entry.key === p && entry.risk !== 'STANDARD'),
    ) ||
    Boolean(role?.policyIds.length);
  const dirty = Boolean(role && JSON.stringify(role) !== original);
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);
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
    window.addEventListener('beforeunload', guard);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('beforeunload', guard);
      document.removeEventListener('click', click, true);
    };
  }, [dirty, t]);
  useEffect(() => {
    let active = true;
    adminApiClient
      .request<{
        data: {
          policies: { id: string; name: string; ruleType: string }[];
          nextCursor: string | null;
        };
      }>('/admin/authorization/policies?limit=25')
      .then((result) => {
        if (active) {
          setPolicies(result.data.policies);
          setPolicyCursor(result.data.nextCursor);
        }
      })
      .catch((failure) => {
        if (active) setError(String(failure));
      });
    return () => {
      active = false;
    };
  }, []);
  const morePolicies = async () => {
    if (!policyCursor || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const result = await adminApiClient.request<{
        data: {
          policies: { id: string; name: string; ruleType: string }[];
          nextCursor: string | null;
        };
      }>(`/admin/authorization/policies?limit=25&cursor=${encodeURIComponent(policyCursor)}`);
      setPolicies((previous) => [
        ...new Map([...previous, ...result.data.policies].map((row) => [row.id, row])).values(),
      ]);
      setPolicyCursor(result.data.nextCursor);
    } catch (failure) {
      setError(String(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const command = useRef<{ fingerprint: string; key: string } | null>(null);
  useEffect(() => {
    let active = true;
    setRole(null);
    setBusy(true);
    setError('');
    setConfirming(null);
    adminApiClient
      .request<{ data: RoleDetail }>(`/admin/authorization/roles/${encodeURIComponent(roleId)}`, {
        cache: 'no-store',
      })
      .then((result) => {
        if (active) {
          setRole(result.data);
          setOriginal(JSON.stringify(result.data));
          originalRisk.current =
            result.data.policyIds.length > 0 ||
            result.data.permissions.some((p) =>
              ADMIN_PERMISSION_CATALOG.some(
                (entry) => entry.key === p && entry.risk !== 'STANDARD',
              ),
            );
        }
      })
      .catch((failure) => {
        if (active) setError(String(failure));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [roleId]);
  const write = async () => {
    if (
      !role?.revision ||
      !confirming ||
      (needsApproval && (!approver || ticket.trim().length < 6)) ||
      reason.trim().length < 6 ||
      lock.current
    )
      return;
    const body =
      confirming === 'save'
        ? {
            name: role.name,
            description: role.description,
            permissions: role.permissions,
            policyIds: role.policyIds,
            expectedRevision: role.revision,
            reason,
          }
        : { expectedRevision: role.revision, reason };
    const endpoint = `/admin/authorization/roles/${encodeURIComponent(role.id)}${confirming === 'retire' ? '/retire' : ''}`;
    const fingerprint = JSON.stringify([endpoint, body, approver, ticket]);
    if (command.current?.fingerprint !== fingerprint)
      command.current = { fingerprint, key: createAdminIdempotencyKey() };
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await adminApiClient.request(endpoint, {
        method: confirming === 'save' ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
        idempotencyKey: command.current.key,
        headers: needsApproval
          ? { 'x-second-approver-id': approver, 'x-change-ticket': ticket.trim() }
          : {},
      });
      onDirtyChange?.(false);
      command.current = null;
      setConfirming(null);
      setRole(null);
      onSaved();
    } catch (failure) {
      setError(String(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const protectedRole =
    !!role &&
    (['student', 'administrator'].includes(role.id) ||
      /^(system|canonical|baseline)[:_-]/i.test(role.id) ||
      role.permissions.some((permission) => !availablePermissions.includes(permission)));
  return (
    <section
      className="rounded-2xl border bg-white p-4 space-y-3"
      aria-labelledby="role-editor-title"
    >
      <h2 id="role-editor-title" className="font-bold">
        {t('iam_edit_role')}
      </h2>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">{t('iam_loading')}</p>}
      {role && (
        <>
          <p>
            {t('iam_role_metadata')}: {role.createdAt || '—'} /{' '}
            {role.updatedAt || role.revision || '—'}
          </p>
          <p>
            {t('iam_member_count')}: {role.memberCount ?? t('iam_unavailable')}
          </p>
          {protectedRole && <p>{t('iam_protected_role')}</p>}
          <fieldset disabled={busy || protectedRole || !role.revision} className="space-y-3">
            <label className="block">
              {t('iam_name')}
              <input
                className="w-full rounded-xl border p-2"
                value={role.name}
                maxLength={240}
                onChange={(event) => setRole({ ...role, name: event.target.value })}
              />
            </label>
            <label className="block">
              {t('iam_role_description')}
              <textarea
                className="w-full rounded-xl border p-2"
                value={role.description}
                maxLength={2000}
                onChange={(event) => setRole({ ...role, description: event.target.value })}
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {availablePermissions.map((permission) => {
                const entry = ADMIN_PERMISSION_CATALOG.find((item) => item.key === permission);
                return (
                  <label className="flex gap-2" key={permission}>
                    <input
                      type="checkbox"
                      checked={role.permissions.includes(permission)}
                      onChange={(event) =>
                        setRole({
                          ...role,
                          permissions: event.target.checked
                            ? [...role.permissions, permission]
                            : role.permissions.filter((item) => item !== permission),
                        })
                      }
                    />
                    {entry ? (language === 'ar' ? entry.labelAr : entry.labelEn) : permission}
                  </label>
                );
              })}
            </div>
            <fieldset className="border p-3">
              <legend>{t('iam_policies')}</legend>
              {policies
                .filter(
                  (policy) =>
                    ['TIME', 'IP'].includes(policy.ruleType) || role.policyIds.includes(policy.id),
                )
                .map((policy) => (
                  <label key={policy.id} className="block">
                    <input
                      type="checkbox"
                      checked={role.policyIds.includes(policy.id)}
                      onChange={(e) =>
                        setRole({
                          ...role,
                          policyIds: e.target.checked
                            ? [...role.policyIds, policy.id]
                            : role.policyIds.filter((id) => id !== policy.id),
                        })
                      }
                    />
                    {policy.name} ({policy.ruleType})
                  </label>
                ))}
              {role.policyIds
                .filter((id) => !policies.some((policy) => policy.id === id))
                .map((id) => (
                  <label className="block" key={id}>
                    <input
                      type="checkbox"
                      checked
                      onChange={() =>
                        setRole({
                          ...role,
                          policyIds: role.policyIds.filter((value) => value !== id),
                        })
                      }
                    />
                    {id}
                  </label>
                ))}
              <button
                type="button"
                disabled={!policyCursor || busy}
                onClick={() => void morePolicies()}
              >
                {t('iam_next')}
              </button>
            </fieldset>
            <button
              type="button"
              disabled={!role.name.trim() || !role.description.trim() || !role.permissions.length}
              onClick={() => setConfirming('save')}
            >
              {t('iam_save_role')}
            </button>
            {onDuplicate && (
              <button
                type="button"
                onClick={() => {
                  if (!dirty || window.confirm(t('iam_discard_changes'))) onDuplicate(role);
                }}
              >
                {t('iam_duplicate_role')}
              </button>
            )}
            <button type="button" onClick={() => setConfirming('retire')}>
              {t('iam_retire_role')}
            </button>
          </fieldset>
          {confirming && (
            <section
              className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3"
              aria-label={t('iam_approval_context')}
            >
              <p>{t('iam_approval_help')}</p>
              {needsApproval && (
                <AuthorizationIdentityPicker approver value={approver} onChange={setApprover} />
              )}
              {needsApproval && (
                <label className="block">
                  {t('iam_change_ticket')}
                  <input
                    className="w-full rounded-xl border p-2"
                    value={ticket}
                    maxLength={240}
                    onChange={(event) => setTicket(event.target.value)}
                  />
                </label>
              )}
              <label className="block">
                {t('iam_reason')}
                <textarea
                  className="w-full rounded-xl border p-2"
                  value={reason}
                  maxLength={2000}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={
                  busy ||
                  (needsApproval && (!approver || ticket.trim().length < 6)) ||
                  reason.trim().length < 6
                }
                onClick={() => void write()}
              >
                {t('iam_confirm')}
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirming(null)}>
                {t('iam_cancel')}
              </button>
            </section>
          )}
        </>
      )}
    </section>
  );
}
