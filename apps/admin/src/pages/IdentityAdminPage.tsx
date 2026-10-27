import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AuthorizationEffectiveAccess } from '../components/AuthorizationEffectiveAccess';
import { IdentityRoleFilter } from '../components/IdentityRoleFilter';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';

interface IdentityView {
  assignedRoles?: { id: string; name: string }[];
  adminAccessAssigned?: boolean;
  latestAccessChange?: { action: string; timestamp: string } | null;
  id: string;
  type: string;
  status: string;
  user?: {
    profile: {
      displayName: string;
      avatarUrl: string;
      preferredLanguage: string;
      timeZone: string;
    };
    contactRegistry: { primaryEmail: string; primaryPhone?: string; isEmailVerified: boolean };
  };
  account: { accessState: string };
}
type Envelope<T> = { data: T };
const lifecycleStates = ['PROVISIONED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED', 'PURGED'] as const;
const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm';
const buttonClass =
  'rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm disabled:opacity-50';

/** Identity writes stay at the existing Identity owner; this page never grants roles. */
export function IdentityAdminPage({
  embedded = false,
  onDirtyChange,
}: { embedded?: boolean; onDirtyChange?: (dirty: boolean) => void } = {}) {
  const { t, dir } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const { identityId: detailId } = useParams<{ identityId: string }>();
  const [urlParams, setUrlParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const loadFailed = t('iam_load_failed');
  const [initialSearch] = useState(
    () =>
      new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
        .get('search')
        ?.slice(0, 240) || '',
  );
  const [initialType] = useState(() =>
    new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search).get('type') ===
    'Human'
      ? 'Human'
      : '',
  );
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(urlParams.get('status') || '');
  const [verified, setVerified] = useState(urlParams.get('verified') || '');
  const [query, setQuery] = useState(() =>
    new URLSearchParams({
      ...(initialSearch ? { search: initialSearch } : {}),
      ...(initialType ? { type: initialType } : {}),
      ...Object.fromEntries(
        ['status', 'verified', 'roleId', 'adminAccess', 'accessState'].flatMap((key) =>
          urlParams.has(key) ? [[key, urlParams.get(key)!]] : [],
        ),
      ),
    }).toString(),
  );
  const [cursor, setCursor] = useState(urlParams.get('cursor') || '');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [accessState, setAccessState] = useState(urlParams.get('accessState') || '');
  const [roleFilter, setRoleFilter] = useState(urlParams.get('roleId') || '');
  const [adminAccess, setAdminAccess] = useState(urlParams.get('adminAccess') || '');
  const [refresh, setRefresh] = useState(0);
  const [items, setItems] = useState<IdentityView[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<IdentityView | null>(null);
  const [profile, setProfile] = useState({
    displayName: '',
    avatarUrl: '',
    preferredLanguage: 'ar',
    timeZone: 'UTC',
  });
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [reason, setReason] = useState('');
  const command = useRef<{ signature: string; key: string } | null>(null);
  const mutationLock = useRef(false);
  const dirty =
    !!selected?.user &&
    (JSON.stringify(profile) !== JSON.stringify(selected.user.profile) ||
      email !== selected.user.contactRegistry.primaryEmail ||
      phone !== (selected.user.contactRegistry.primaryPhone ?? ''));
  const hasDraft = dirty || !!newName || !!newEmail;
  useEffect(() => {
    onDirtyChange?.(hasDraft);
    return () => onDirtyChange?.(false);
  }, [hasDraft, onDirtyChange]);

  useEffect(() => {
    if (!hasDraft) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protect);
    const protectNavigation = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('a[href]') &&
        !window.confirm(t('iam_discard_changes'))
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', protectNavigation, true);
    return () => {
      window.removeEventListener('beforeunload', protect);
      document.removeEventListener('click', protectNavigation, true);
    };
  }, [hasDraft, t]);

  useEffect(() => {
    if (detailId) return;
    let active = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams(query);
    params.set('limit', '20');
    params.set('cursor', cursor);
    adminApiClient
      .request<Envelope<{ items: IdentityView[]; total: number; nextCursor: string | null }>>(
        `/admin/identities?${params}`,
        { cache: 'no-store' },
      )
      .then((result) => {
        if (active) {
          setItems(result.data.items);
          setTotal(result.data.total);
          setNextCursor(result.data.nextCursor);
        }
      })
      .catch((failure: unknown) => {
        if (active) {
          setItems([]);
          setTotal(0);
          setError(failure instanceof Error ? failure.message : loadFailed);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, cursor, refresh, loadFailed, detailId]);

  useEffect(() => {
    if (!detailId) return;
    let active = true;
    setSelected(null);
    setBusy(true);
    setError('');
    void adminApiClient
      .request<Envelope<IdentityView>>(`/admin/identities/${encodeURIComponent(detailId)}`, {
        cache: 'no-store',
      })
      .then((result) => {
        if (!active) return;
        const current = result.data;
        setSelected(current);
        if (current.user) {
          setProfile(current.user.profile);
          setEmail(current.user.contactRegistry.primaryEmail);
          setPhone(current.user.contactRegistry.primaryPhone ?? '');
        }
        setReason('');
      })
      .catch((failure) => {
        if (active) setError(failure instanceof Error ? failure.message : loadFailed);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [detailId, loadFailed]);

  const mutate = async (endpoint: string, body: object, method = 'POST') => {
    if (busy || mutationLock.current) return;
    mutationLock.current = true;
    const signature = JSON.stringify([endpoint, method, body]);
    if (command.current?.signature !== signature)
      command.current = { signature, key: createAdminIdempotencyKey() };
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await adminApiClient.request<Envelope<IdentityView>>(endpoint, {
        method,
        body: JSON.stringify(body),
        idempotencyKey: command.current.key,
      });
      command.current = null;
      if (result.data) {
        setSelected(result.data);
        if (result.data.user) {
          if (!endpoint.endsWith('/contact')) setProfile(result.data.user.profile);
          if (!endpoint.endsWith('/profile')) {
            setEmail(result.data.user.contactRegistry.primaryEmail);
            setPhone(result.data.user.contactRegistry.primaryPhone ?? '');
          }
        }
      }
      if (endpoint === '/admin/identities') {
        setNewName('');
        setNewEmail('');
      }
      setReason('');
      setNotice(t('iam_saved'));
      setRefresh((value) => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('iam_save_failed'));
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (initialType) params.set('type', initialType);
    if (roleFilter.trim()) params.set('roleId', roleFilter.trim());
    if (adminAccess) params.set('adminAccess', adminAccess);
    if (accessState) params.set('accessState', accessState);
    if (search.trim()) params.set('search', search.trim());
    if (status) params.set('status', status);
    if (verified) params.set('verified', verified);
    setCursor('');
    setCursorHistory([]);
    setQuery(params.toString());
    params.set('tab', 'directory');
    setUrlParams(params);
  };

  const lifecycle = (action: 'activate' | 'suspend' | 'archive' | 'purge') => {
    if (!selected || (action !== 'activate' && reason.trim().length < 3)) return;
    if (dirty && !window.confirm(t('iam_discard_changes'))) return;
    if (
      !window.confirm(
        `${t('iam_confirm_action')}\n${selected.user?.profile.displayName ?? selected.id}\n${t(`iam_${action}`)}\n${reason}`,
      )
    )
      return;
    if (action === 'purge' && window.prompt(t('iam_purge_confirmation')) !== selected.id) return;
    void mutate(
      `/admin/identities/${encodeURIComponent(selected.id)}/${action}`,
      action === 'activate' ? {} : { reason: reason.trim() },
    );
  };

  return (
    <section
      dir={dir}
      className="iam-directory space-y-4 text-[#203442]"
      aria-label={t('admin_nav_identities')}
    >
      {!embedded && (
        <header className="admin-page-hero">
          <div>
            <h1 id="identity-heading" className="text-2xl font-bold">
              {t('admin_nav_identities')}
            </h1>
            <p>{t('iam_identity_help')}</p>
          </div>
          {hasPermission('admin:authorization:manage') && (
            <Link
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white"
              to="/authorization"
            >
              {t('admin_nav_authorization')}
            </Link>
          )}
        </header>
      )}
      {detailId ? (
        <Link className="sf-secondary" to={'/identities?' + urlParams.toString()}>
          {t('iam_previous')}
        </Link>
      ) : (
        <div className="sf-actions">
          <h2>{dir === 'rtl' ? 'دليل الهويات العام' : 'General identity directory'}</h2>
          <button
            type="button"
            className="sf-secondary"
            onClick={() => setCreating((value) => !value)}
          >
            {creating ? t('iam_cancel') : t('iam_provision')}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-green-50 p-3 text-green-800">
          {notice}
        </p>
      )}
      {!detailId && (
        <form
          onSubmit={applyFilters}
          className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-4"
        >
          <label>
            {t('iam_search')}
            <input
              className={inputClass}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              maxLength={240}
            />
          </label>
          <label>
            {t('iam_life_status')}
            <select
              className={inputClass}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">{t('iam_all')}</option>
              {lifecycleStates.map((state) => (
                <option key={state} value={state}>
                  {t(`iam_status_${state}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('iam_verified')}
            <select
              className={inputClass}
              value={verified}
              onChange={(event) => setVerified(event.target.value)}
            >
              <option value="">{t('iam_all')}</option>
              <option value="true">{t('iam_yes')}</option>
              <option value="false">{t('iam_no')}</option>
            </select>
          </label>
          <label>
            {t('iam_access_state')}
            <select
              className={inputClass}
              value={accessState}
              onChange={(event) => setAccessState(event.target.value)}
            >
              <option value="">{t('iam_all')}</option>
              {['Active', 'Suspended', 'Locked', 'RateLimited'].map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('iam_assigned_admin_access')}
            <select
              className={inputClass}
              value={adminAccess}
              onChange={(e) => setAdminAccess(e.target.value)}
            >
              <option value="">{t('iam_all')}</option>
              <option value="true">{t('iam_yes')}</option>
              <option value="false">{t('iam_no')}</option>
            </select>
          </label>
          <IdentityRoleFilter value={roleFilter} onChange={setRoleFilter} />
          <button className={buttonClass} disabled={loading}>
            {t('iam_apply')}
          </button>
        </form>
      )}
      {!detailId && (
        <div className="overflow-x-auto rounded-2xl bg-white p-4" aria-busy={loading}>
          {loading ? (
            <p role="status">{t('iam_loading')}</p>
          ) : (
            <>
              <p>
                {t('iam_total')}: {total}
              </p>
              <div className="max-w-full overflow-x-auto rounded-2xl border border-[#DDEFF2] bg-white shadow-xs">
                <table className="w-full text-start text-sm">
                  <thead>
                    <tr>
                      {[
                        'iam_name',
                        'iam_email',
                        'iam_life_status',
                        'iam_access_state',
                        'iam_verified',
                        'iam_assigned_roles',
                        'iam_assigned_admin_access',
                        'iam_latest_access_change',
                        'iam_actions',
                      ].map((key) => (
                        <th className="p-2 text-start" key={key}>
                          {t(key as Parameters<typeof t>[0])}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((identity) => (
                      <tr key={identity.id} className="border-t">
                        <td className="p-2">{identity.user?.profile.displayName ?? identity.id}</td>
                        <td className="p-2">
                          {identity.user?.contactRegistry.primaryEmail ?? '—'}
                        </td>
                        <td className="p-2">
                          {t(`iam_status_${identity.status}` as Parameters<typeof t>[0])}
                        </td>
                        <td className="p-2">{identity.account.accessState}</td>
                        <td className="p-2">
                          {t(identity.user?.contactRegistry.isEmailVerified ? 'iam_yes' : 'iam_no')}
                        </td>
                        <td>
                          {identity.assignedRoles?.map((role) => role.name).join(', ') || '—'}
                        </td>
                        <td>
                          {identity.adminAccessAssigned == null
                            ? t('iam_unavailable')
                            : t(identity.adminAccessAssigned ? 'iam_yes' : 'iam_no')}
                        </td>
                        <td>
                          {identity.latestAccessChange
                            ? `${identity.latestAccessChange.action} · ${identity.latestAccessChange.timestamp}`
                            : '—'}
                        </td>
                        <td>
                          <Link
                            className={buttonClass}
                            to={
                              '/identities/' +
                              encodeURIComponent(identity.id) +
                              '?' +
                              urlParams.toString()
                            }
                          >
                            {t('iam_open')}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {items.length === 0 && <p>{t('iam_empty')}</p>}
              <div className="mt-3 flex gap-3">
                <button
                  className={buttonClass}
                  disabled={loading || !cursor}
                  onClick={() => {
                    setCursor('');
                    setCursorHistory([]);
                    setUrlParams((previous) => {
                      const next = new URLSearchParams(previous);
                      next.delete('cursor');
                      return next;
                    });
                  }}
                >
                  {t('iam_first_page')}
                </button>
                <button
                  className={buttonClass}
                  disabled={loading || !cursorHistory.length}
                  onClick={() => {
                    setCursor(cursorHistory.at(-1)!);
                    setUrlParams((previous) => {
                      const next = new URLSearchParams(previous);
                      const value = cursorHistory.at(-1)!;
                      value ? next.set('cursor', value) : next.delete('cursor');
                      return next;
                    });
                    setCursorHistory((previous) => previous.slice(0, -1));
                  }}
                >
                  {t('iam_previous')}
                </button>
                <button
                  className={buttonClass}
                  disabled={loading || !nextCursor}
                  onClick={() => {
                    setCursorHistory((previous) => [...previous, cursor]);
                    setCursor(nextCursor!);
                    setUrlParams((previous) => {
                      const next = new URLSearchParams(previous);
                      next.set('cursor', nextCursor!);
                      return next;
                    });
                  }}
                >
                  {t('iam_next')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {!detailId && creating && (
        <form
          className="space-y-3 rounded-2xl bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!dirty || window.confirm(t('iam_discard_changes')))
              void mutate('/admin/identities', {
                type: 'Human',
                displayName: newName.trim(),
                primaryEmail: newEmail.trim(),
                preferredLanguage: 'ar',
                timeZone: 'UTC',
              });
          }}
        >
          <h2 className="font-bold">{t('iam_provision')}</h2>
          <p>{t('iam_provision_help')}</p>
          <label className="block">
            {t('iam_name')}
            <input
              className={inputClass}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              required
              maxLength={240}
            />
          </label>
          <label className="block">
            {t('iam_email')}
            <input
              className={inputClass}
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              required
              maxLength={320}
            />
          </label>
          <button className={buttonClass} disabled={busy}>
            {t('iam_provision')}
          </button>
        </form>
      )}
      {detailId && busy && !selected && <p role="status">{t('iam_loading')}</p>}
      {selected && (
        <section
          className="space-y-4 rounded-2xl bg-white p-4"
          aria-labelledby="identity-details-heading"
        >
          <h2 id="identity-details-heading" className="font-bold">
            {t('iam_details')}: {selected.user?.profile.displayName || selected.id}
          </h2>
          <details>
            <summary>{dir === 'rtl' ? 'مرجع الهوية' : 'Identity reference'}</summary>
            <p className="sf-reference">{selected.id}</p>
          </details>
          {hasPermission('admin:authorization:manage') && (
            <AuthorizationEffectiveAccess initialIdentityId={selected.id} />
          )}
          {selected.user && selected.status !== 'PURGED' && (
            <>
              <form
                className="grid gap-3 sm:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void mutate(
                    `/admin/identities/${encodeURIComponent(selected.id)}/profile`,
                    profile,
                    'PUT',
                  );
                }}
              >
                {(['displayName', 'avatarUrl', 'preferredLanguage', 'timeZone'] as const).map(
                  (field) => (
                    <label key={field}>
                      {t(`iam_field_${field}`)}
                      <input
                        className={inputClass}
                        value={profile[field]}
                        required={field !== 'avatarUrl'}
                        maxLength={
                          field === 'avatarUrl'
                            ? 2048
                            : field === 'displayName'
                              ? 240
                              : field === 'preferredLanguage'
                                ? 35
                                : 120
                        }
                        onChange={(event) =>
                          setProfile((value) => ({ ...value, [field]: event.target.value }))
                        }
                      />
                    </label>
                  ),
                )}
                <button className={buttonClass} disabled={busy}>
                  {t('iam_save_profile')}
                </button>
              </form>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const body = {
                    email: email.trim(),
                    ...(phone.trim() ? { phone: phone.trim() } : {}),
                  };
                  void mutate(
                    `/admin/identities/${encodeURIComponent(selected.id)}/contact`,
                    body,
                    'PUT',
                  );
                }}
              >
                <label className="block">
                  {t('iam_email')}
                  <input
                    className={inputClass}
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label className="block">
                  {t('iam_phone')}
                  <input
                    className={inputClass}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </label>
                <p>{t('iam_contact_help')}</p>
                <button className={buttonClass} disabled={busy}>
                  {t('iam_save_contact')}
                </button>
              </form>
            </>
          )}
          {selected.status !== 'PURGED' && (
            <details className="space-y-3 border-t pt-4">
              <summary>
                {dir === 'rtl'
                  ? 'إجراءات دورة حياة الهوية والأمان'
                  : 'Identity lifecycle and security actions'}
              </summary>
              <p className="sf-notice">
                {dir === 'rtl'
                  ? 'هذه الإجراءات تؤثر على الهوية كلها، بما فيها دخول الطالب. تعليق الهوية أو إتلافها ليس إجراء مغادرة موظف.'
                  : 'These actions affect the entire identity, including student access. Suspension or purge is not staff offboarding.'}
              </p>
              <label className="block">
                {t('iam_reason')}
                <textarea
                  className={inputClass}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={2000}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                {['PROVISIONED', 'SUSPENDED'].includes(selected.status) && (
                  <button
                    className={buttonClass}
                    disabled={busy}
                    onClick={() => lifecycle('activate')}
                  >
                    {t('iam_activate')}
                  </button>
                )}
                {selected.status === 'ACTIVE' && (
                  <button
                    className={buttonClass}
                    disabled={busy || reason.trim().length < 3}
                    onClick={() => lifecycle('suspend')}
                  >
                    {t('iam_suspend')}
                  </button>
                )}
                {selected.status !== 'ARCHIVED' && (
                  <button
                    className={buttonClass}
                    disabled={busy || reason.trim().length < 3}
                    onClick={() => lifecycle('archive')}
                  >
                    {t('iam_archive')}
                  </button>
                )}
                {selected.status === 'ARCHIVED' && (
                  <button
                    className={`${buttonClass} text-red-800`}
                    disabled={busy || reason.trim().length < 3}
                    onClick={() => lifecycle('purge')}
                  >
                    {t('iam_purge')}
                  </button>
                )}
              </div>
            </details>
          )}
        </section>
      )}
    </section>
  );
}
