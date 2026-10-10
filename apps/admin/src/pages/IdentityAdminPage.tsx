import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
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
export function IdentityAdminPage() {
  const { t, dir } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const loadFailed = t('iam_load_failed');
  const [initialSearch] = useState(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search).get('search')?.slice(0, 240) || '');
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState('');
  const [verified, setVerified] = useState('');
  const [query, setQuery] = useState(() => initialSearch ? new URLSearchParams({ search: initialSearch }).toString() : '');
  const [cursor, setCursor] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [accessState, setAccessState] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [adminAccess, setAdminAccess] = useState('');
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
  const selectionRequest = useRef(0);
  const mutationLock = useRef(false);
  const dirty =
    !!selected?.user &&
    (JSON.stringify(profile) !== JSON.stringify(selected.user.profile) ||
      email !== selected.user.contactRegistry.primaryEmail ||
      phone !== (selected.user.contactRegistry.primaryPhone ?? ''));

  useEffect(() => {
    if (!dirty) return;
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
  }, [dirty, t]);

  useEffect(() => {
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
  }, [query, cursor, refresh, loadFailed]);

  const select = async (identity: IdentityView) => {
    if (dirty && !window.confirm(t('iam_discard_changes'))) return;
    const generation = ++selectionRequest.current;
    setBusy(true);
    setError('');
    try {
      const result = await adminApiClient.request<Envelope<IdentityView>>(
        `/admin/identities/${encodeURIComponent(identity.id)}`,
        { cache: 'no-store' },
      );
      if (generation !== selectionRequest.current) return;
      const current = result.data;
      setSelected(current);
      if (current.user) {
        setProfile(current.user.profile);
        setEmail(current.user.contactRegistry.primaryEmail);
        setPhone(current.user.contactRegistry.primaryPhone ?? '');
      }
      setReason('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('iam_load_failed'));
    } finally {
      if (generation === selectionRequest.current) setBusy(false);
    }
  };

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
    if (roleFilter.trim()) params.set('roleId', roleFilter.trim());
    if (adminAccess) params.set('adminAccess', adminAccess);
    if (accessState) params.set('accessState', accessState);
    if (search.trim()) params.set('search', search.trim());
    if (status) params.set('status', status);
    if (verified) params.set('verified', verified);
    setCursor('');
    setCursorHistory([]);
    setQuery(params.toString());
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
    <section dir={dir} className="space-y-5" aria-labelledby="identity-heading">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 id="identity-heading" className="text-2xl font-bold">
            {t('admin_nav_identities')}
          </h1>
          <p>{t('iam_identity_help')}</p>
        </div>
        {hasPermission('admin:authorization:manage') && (
          <Link className={buttonClass} to="/authorization">
            {t('admin_nav_authorization')}
          </Link>
        )}
      </header>
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
      <form onSubmit={applyFilters} className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-4">
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
      <div className="overflow-x-auto rounded-2xl bg-white p-4" aria-busy={loading}>
        {loading ? (
          <p role="status">{t('iam_loading')}</p>
        ) : (
          <>
            <p>
              {t('iam_total')}: {total}
            </p>
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
                    <td className="p-2">{identity.user?.contactRegistry.primaryEmail ?? '—'}</td>
                    <td className="p-2">
                      {t(`iam_status_${identity.status}` as Parameters<typeof t>[0])}
                    </td>
                    <td className="p-2">{identity.account.accessState}</td>
                    <td className="p-2">
                      {t(identity.user?.contactRegistry.isEmailVerified ? 'iam_yes' : 'iam_no')}
                    </td>
                    <td>{identity.assignedRoles?.map((role) => role.name).join(', ') || '—'}</td>
                    <td>
                      {identity.latestAccessChange
                        ? `${identity.latestAccessChange.action} · ${identity.latestAccessChange.timestamp}`
                        : '—'}
                    </td>
                    <td>
                      <button
                        className={buttonClass}
                        disabled={busy}
                        onClick={() => void select(identity)}
                      >
                        {t('iam_open')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && <p>{t('iam_empty')}</p>}
            <div className="mt-3 flex gap-3">
              <button
                className={buttonClass}
                disabled={loading || !cursorHistory.length}
                onClick={() => {
                  setCursor(cursorHistory.at(-1)!);
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
                }}
              >
                {t('iam_next')}
              </button>
            </div>
          </>
        )}
      </div>
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
      {selected && (
        <section
          className="space-y-4 rounded-2xl bg-white p-4"
          aria-labelledby="identity-details-heading"
        >
          <h2 id="identity-details-heading" className="font-bold">
            {t('iam_details')}: {selected.id}
          </h2>
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
            <div className="space-y-3 border-t pt-4">
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
            </div>
          )}
        </section>
      )}
    </section>
  );
}
