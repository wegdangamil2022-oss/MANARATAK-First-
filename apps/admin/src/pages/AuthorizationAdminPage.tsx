import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { ADMIN_PERMISSION_CATALOG } from '@manaratak/shared';
import { useTranslation } from '../i18n/I18nProvider';
import { Link } from 'react-router-dom';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { AuthorizationIdentityPicker } from '../components/AuthorizationIdentityPicker';
import { AuthorizationPermissionCatalog } from '../components/AuthorizationPermissionCatalog';
import { AuthorizationPolicyPanel } from '../components/AuthorizationPolicyPanel';
import { AuthorizationEffectiveAccess } from '../components/AuthorizationEffectiveAccess';
import { AuthorizationRoleEditor } from '../components/AuthorizationRoleEditor';
import {
  KeyRound,
  ShieldAlert,
  UserCheck,
  ShieldPlus,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react';

interface RoleDto {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  policyIds: string[];
}
interface AssignmentDto {
  id: string;
  identityId: string;
  roleId: string;
  assignedAt: string;
}
interface IdentityDto {
  id: string;
  displayName: string;
  primaryEmail: string;
  isEmailVerified: boolean;
}
interface AssignmentAuditDto {
  action: string;
  actorId: string;
  assignmentId: string;
  identityId?: string;
  roleId?: string;
  timestamp: string;
}
interface EmergencyGrantDto {
  id: string;
  principalId: string;
  roleId: string;
  reason: string;
  changeTicket: string;
  requestedBy: string;
  approvedBy: string;
  startsAt: string;
  expiresAt: string;
  revokedAt?: string | null;
}

type Envelope<T> = { data?: T };

export function AuthorizationAdminPage() {
  const { t, language } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const [tab, setTab] = useState('roles');
  const [roleDirty, setRoleDirty] = useState(false);
  const [pageCursors, setPageCursors] = useState<Record<string, string | null>>({});
  const [pageBusy, setPageBusy] = useState(false);
  const [auditFilters, setAuditFilters] = useState({
    category: 'AUTHORIZATION_MUTATION',
    actorId: '',
    targetId: '',
    action: '',
    from: '',
    until: '',
  });
  const appliedAuditFilters = useRef(auditFilters);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [identities, setIdentities] = useState<IdentityDto[]>([]);
  const [emergencyGrants, setEmergencyGrants] = useState<EmergencyGrantDto[]>([]);
  const [assignmentAudit, setAssignmentAudit] = useState<AssignmentAuditDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [rolePolicyIds, setRolePolicyIds] = useState<string[]>([]);
  const [editingRoleId, setEditingRoleId] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [identityId, setIdentityId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [changeTicket, setChangeTicket] = useState('');
  const [secondApproverId, setSecondApproverId] = useState('');
  const [emergencyPrincipalId, setEmergencyPrincipalId] = useState('');
  const [emergencyRoleId, setEmergencyRoleId] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyDuration, setEmergencyDuration] = useState(60);
  const [loading, setLoading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [search, setSearch] = useState('');
  const [assignmentRole, setAssignmentRole] = useState('ALL');
  const [grantFilter, setGrantFilter] = useState('ALL');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [clock, setClock] = useState(Date.now());
  const busyRef = useRef(false);
  const loadRef = useRef(false);
  const generation = useRef(0);
  const commandKeys = useRef(new Map<string, { key: string; id: string }>());
  const refreshBlocked = busy || loading || pageBusy;
  const mutationBlocked = refreshBlocked || !permissionsReady;

  const draftsDirty = Boolean(
    roleName || roleDescription || selectedPermissions.length || emergencyReason,
  );
  const discardMessage = t('iam_discard_changes');
  useEffect(() => {
    if (!draftsDirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const click = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('a[href]') &&
        !window.confirm(discardMessage)
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', click, true);
    };
  }, [draftsDirty, discardMessage]);
  const pageLock = useRef(false);
  const fetchPage = async (kind: 'roles' | 'assignments' | 'audit' | 'emergency', next = false) => {
    if (pageLock.current || busyRef.current || loadRef.current) return;
    pageLock.current = true;
    setPageBusy(true);
    setError(null);
    const currentGeneration = generation.current;
    try {
      const params = new URLSearchParams({ limit: '25' });
      const cursor = next ? pageCursors[kind] : null;
      if (kind === 'emergency' && grantFilter !== 'ALL') params.set('state', grantFilter);
      if (kind === 'assignments' && assignmentRole !== 'ALL') params.set('roleId', assignmentRole);
      if (kind === 'audit') {
        if (!next) appliedAuditFilters.current = auditFilters;
        for (const [key, value] of Object.entries(appliedAuditFilters.current))
          if (value)
            params.set(
              key,
              key === 'from' || key === 'until' ? new Date(value).toISOString() : value,
            );
      }
      if (kind === 'audit' && cursor) {
        const c = JSON.parse(cursor) as { timestamp: string; id: string };
        params.set('cursorTime', c.timestamp);
        params.set('cursorId', c.id);
      } else if (cursor) params.set('cursor', cursor);
      if (kind !== 'audit' && kind !== 'emergency' && search.trim())
        params.set('search', search.trim());
      const response = await adminApiClient.request<Envelope<Record<string, unknown>>>(
        `/admin/authorization/${kind === 'audit' ? 'assignment-audit' : kind === 'emergency' ? 'emergency-access' : kind}?${params}`,
        { cache: 'no-store' },
      );
      if (currentGeneration !== generation.current) return;
      const data = response.data;
      if (!data) throw new Error('INVALID_RESPONSE');
      if (kind === 'roles') setRoles(arrayField<RoleDto>(data, 'roles'));
      if (kind === 'assignments') setAssignments(arrayField<AssignmentDto>(data, 'assignments'));
      if (kind === 'emergency') setEmergencyGrants(arrayField<EmergencyGrantDto>(data, 'grants'));
      if (kind === 'audit') setAssignmentAudit(arrayField<AssignmentAuditDto>(data, 'events'));
      setPageCursors((previous) => ({
        ...previous,
        [kind]:
          kind === 'audit'
            ? data.nextCursor
              ? JSON.stringify(data.nextCursor)
              : null
            : (data.nextCursor as string | null),
      }));
    } catch (cause) {
      setError(message(cause));
    } finally {
      pageLock.current = false;
      setPageBusy(false);
    }
  };
  const load = async () => {
    const request = ++generation.current;
    loadRef.current = true;
    setLoading(true);
    setPermissionsReady(false);
    const sources = [
      '/admin/authorization/roles',
      '/admin/authorization/assignments',
      '/admin/authorization/permissions',
      '/admin/authorization/eligible-identities?limit=100&cursor=',
      '/admin/authorization/emergency-access?limit=25',
      '/admin/authorization/assignment-audit',
    ];
    const results = await Promise.allSettled(
      sources.map((source) => adminApiClient.request<Envelope<Record<string, unknown>>>(source)),
    );
    if (request !== generation.current) return;
    const errors: string[] = [];
    const names = [
      t('iam_workspace_0'),
      t('iam_workspace_1'),
      t('iam_workspace_2'),
      t('iam_workspace_3'),
      t('iam_workspace_4'),
      t('iam_workspace_5'),
    ];
    results.forEach((result, index) => {
      try {
        if (result.status === 'rejected') throw result.reason;
        const data = result.value.data;
        if (!data) throw new Error(t('iam_workspace_6'));
        switch (index) {
          case 0:
            setPageCursors((previous) => ({
              ...previous,
              roles: data.nextCursor as string | null,
            }));
            setRoles(arrayField<RoleDto>(data, 'roles'));
            break;
          case 1:
            setPageCursors((previous) => ({
              ...previous,
              assignments: data.nextCursor as string | null,
            }));
            setAssignments(arrayField<AssignmentDto>(data, 'assignments'));
            break;
          case 2:
            setPermissions(arrayField<string>(data, 'permissions'));
            setPermissionsReady(true);
            break;
          case 3: {
            setIdentities(arrayField<IdentityDto>(data, 'identities'));
            if (
              !Number.isSafeInteger(data.total) ||
              Number(data.total) < 0 ||
              !Number.isSafeInteger(data.nextOffset)
            )
              throw new Error(t('iam_workspace_7'));
            break;
          }
          case 4:
            setPageCursors((previous) => ({
              ...previous,
              emergency: data.nextCursor as string | null,
            }));
            setEmergencyGrants(arrayField<EmergencyGrantDto>(data, 'grants'));
            break;
          case 5:
            setPageCursors((previous) => ({
              ...previous,
              audit: data.nextCursor ? JSON.stringify(data.nextCursor) : null,
            }));
            setAssignmentAudit(arrayField<AssignmentAuditDto>(data, 'events'));
            break;
        }
      } catch (cause) {
        errors.push(`${names[index]}: ${message(cause)}`);
        if (index === 0) setRoles([]);
        if (index === 1) setAssignments([]);
        if (index === 2) {
          setPermissions([]);
          setPermissionsReady(false);
        }
        if (index === 3) {
          setIdentities([]);
        }
        if (index === 4) setEmergencyGrants([]);
        if (index === 5) setAssignmentAudit([]);
      }
    });
    setLoadErrors(errors);
    loadRef.current = false;
    setLoading(false);
  };

  // Initial read runs once; later refreshes use the current render's load function.
  const initialLoad = useRef(load);
  useEffect(() => {
    void initialLoad.current();
    return () => {
      generation.current += 1;
    };
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const roleMap = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);
  const identityMap = useMemo(
    () => new Map(identities.map((identity) => [identity.id, identity])),
    [identities],
  );
  const delegableRoles = useMemo(
    () =>
      roles.filter(
        (role) =>
          role.permissions.length > 0 &&
          role.permissions.every((permission) => permissions.includes(permission)),
      ),
    [roles, permissions],
  );
  const visiblePermissions = permissions.filter((permission) =>
    [
      permission,
      ...ADMIN_PERMISSION_CATALOG.filter((entry) => entry.key === permission).flatMap((entry) => [
        entry.labelAr,
        entry.labelEn,
        entry.domain,
      ]),
    ].some((value) => value.toLowerCase().includes(permissionSearch.trim().toLowerCase())),
  );
  const match = (values: string[]) =>
    values.join(' ').toLowerCase().includes(search.trim().toLowerCase());
  const filteredRoles = roles.filter((role) =>
    match([role.name, role.id, role.description, ...role.permissions]),
  );
  const filteredAssignments = assignments.filter(
    (item) =>
      (assignmentRole === 'ALL' || item.roleId === assignmentRole) &&
      match([
        item.identityId,
        item.id,
        roleMap.get(item.roleId)?.name || item.roleId,
        identityMap.get(item.identityId)?.displayName || '',
        identityMap.get(item.identityId)?.primaryEmail || '',
      ]),
  );
  const grantState = (grant: EmergencyGrantDto) =>
    grant.revokedAt
      ? 'REVOKED'
      : new Date(grant.expiresAt).getTime() <= clock
        ? 'EXPIRED'
        : new Date(grant.startsAt).getTime() > clock
          ? 'SCHEDULED'
          : 'ACTIVE';
  const filteredGrants = emergencyGrants.filter(
    (grant) =>
      (grantFilter === 'ALL' || grantState(grant) === grantFilter) &&
      match([
        grant.principalId,
        grant.reason,
        grant.changeTicket,
        roleMap.get(grant.roleId)?.name || grant.roleId,
      ]),
  );
  const approvalHeaders = () => ({
    ...(changeTicket.trim() ? { 'x-change-ticket': changeTicket.trim() } : {}),
    ...(secondApproverId.trim() ? { 'x-second-approver-id': secondApproverId.trim() } : {}),
  });

  // Keep the same command identity when a response is lost and the user retries.
  const mutate = async (
    operation: string,
    payload: Record<string, unknown>,
    endpoint: string,
    method: string,
    complete: () => void,
    approved = false,
  ) => {
    if (busyRef.current || loadRef.current || !permissionsReady) return;
    const headers = approved ? approvalHeaders() : {};
    const signature = JSON.stringify([operation, payload, headers]);
    let command = commandKeys.current.get(signature);
    if (!command) {
      command = {
        key: createAdminIdempotencyKey(),
        id: `${operation}_${createAdminIdempotencyKey()}`,
      };
      commandKeys.current.set(signature, command);
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setSuccess('');
    try {
      const body = {
        ...payload,
        ...(operation === 'role' || operation === 'role_assignment' ? { id: command.id } : {}),
      };
      await adminApiClient.request(endpoint, {
        method,
        headers: { ...headers, 'Idempotency-Key': command.key },
        body: JSON.stringify(body),
      });
      commandKeys.current.delete(signature);
      complete();
      setSuccess(t('iam_workspace_8'));
      await load();
    } catch (cause) {
      setError(message(cause));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const createRole = async (event: FormEvent) => {
    event.preventDefault();
    const name = roleName.trim();
    if (
      !name ||
      !selectedPermissions.length ||
      selectedPermissions.some((permission) => !permissions.includes(permission))
    ) {
      setError(t('iam_workspace_9'));
      return;
    }
    await mutate(
      'role',
      {
        name,
        description: roleDescription.trim() || name,
        permissions: [...selectedPermissions].sort(),
        policyIds: rolePolicyIds,
      },
      '/admin/authorization/roles',
      'POST',
      () => {
        setRoleName('');
        setRoleDescription('');
        setRolePolicyIds([]);
        setSelectedPermissions([]);
      },
      true,
    );
  };
  const assign = async (event: FormEvent) => {
    event.preventDefault();
    if (!identityId || !delegableRoles.some((item) => item.id === roleId)) {
      setError(t('iam_workspace_10'));
      return;
    }
    if (assignments.some((item) => item.identityId === identityId && item.roleId === roleId)) {
      setError(t('iam_workspace_11'));
      return;
    }
    await mutate(
      'role_assignment',
      { identityId, roleId },
      '/admin/authorization/assignments',
      'POST',
      () => {
        setIdentityId('');
        setRoleId('');
      },
      true,
    );
  };
  const revoke = async (assignment: AssignmentDto) => {
    if (mutationBlocked) return;
    const reason = window.prompt(
      `${t('iam_revoke_reason')}: ${roleMap.get(assignment.roleId)?.name || assignment.roleId} / ${identityMap.get(assignment.identityId)?.displayName || assignment.identityId}`,
    );
    if (reason === null) return;
    if (reason.trim().length < 6) {
      setError(t('iam_workspace_12'));
      return;
    }
    await mutate(
      'revoke-assignment',
      { reason: reason.trim() },
      `/admin/authorization/assignments/${encodeURIComponent(assignment.id)}`,
      'DELETE',
      () => {},
      true,
    );
  };
  const grantEmergencyAccess = async (event: FormEvent) => {
    event.preventDefault();
    if (!emergencyPrincipalId || !delegableRoles.some((item) => item.id === emergencyRoleId)) {
      setError(t('iam_workspace_13'));
      return;
    }
    if (
      changeTicket.trim().length < 6 ||
      !secondApproverId.trim() ||
      emergencyReason.trim().length < 12 ||
      !Number.isInteger(emergencyDuration) ||
      emergencyDuration < 5 ||
      emergencyDuration > 240
    ) {
      setError(t('iam_workspace_14'));
      return;
    }
    await mutate(
      'emergency',
      {
        principalId: emergencyPrincipalId,
        roleId: emergencyRoleId,
        reason: emergencyReason.trim(),
        durationMinutes: emergencyDuration,
      },
      '/admin/authorization/emergency-access',
      'POST',
      () => {
        setEmergencyPrincipalId('');
        setEmergencyRoleId('');
        setEmergencyReason('');
      },
      true,
    );
  };
  const revokeEmergencyAccess = async (grant: EmergencyGrantDto) => {
    if (mutationBlocked) return;
    const reason = window.prompt(t('iam_workspace_15'));
    if (reason === null) return;
    if (reason.trim().length < 6) {
      setError(t('iam_workspace_12'));
      return;
    }
    await mutate(
      'revoke-emergency',
      { reason: reason.trim() },
      `/admin/authorization/emergency-access/${encodeURIComponent(grant.id)}/revoke`,
      'POST',
      () => {},
    );
  };

  return (
    <div dir={language === 'ar' ? "rtl" : 'ltr'} className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-[0_18px_45px_rgba(20,43,95,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-28 h-64 w-64 rounded-full border border-cyan-400/20" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-48 bg-gradient-to-r from-transparent via-[#21A7B4] to-[#0E7C86] sm:w-80" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-200 backdrop-blur-sm border border-white/15">
              <KeyRound className="h-4 w-4 text-[#21A7B4]" />
              <span>{t('iam_workspace_16')}</span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">
              {t('iam_workspace_17')}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-cyan-50/90">
              {t('iam_workspace_18')}
            </p>
          </div>
          <button
            onClick={() => {
              setError(null);
              setSuccess('');
              void load();
            }}
            disabled={refreshBlocked}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#21A7B4] px-5 text-sm font-black text-white shadow-md transition hover:bg-[#1A8D99] shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{' '}
            {t('iam_workspace_19')}
          </button>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2" aria-label={t('iam_workspace_17')}>
        {(
          [
            ['roles', 'iam_workspace_0'],
            ['catalog', 'iam_workspace_2'],
            ['assignments', 'iam_workspace_1'],
            ['policies', 'iam_policies'],
            ['effective', 'iam_effective_access'],
            ['emergency', 'iam_workspace_4'],
            ['audit', 'iam_workspace_5'],
          ] as const
        ).map(([value, key]) => (
          <button
            type="button"
            key={value}
            aria-pressed={tab === value}
            className="rounded-xl border px-3 py-2"
            onClick={() => setTab(value)}
          >
            {t(key)}
          </button>
        ))}
        {hasPermission('admin:identities:manage') && (
          <Link to="/identities">{t('iam_staff_title')}</Link>
        )}
      </nav>
      {success && (
        <div
          role="status"
          className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800"
        >
          {success}
        </div>
      )}
      {loadErrors.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          <p className="font-bold">{t('iam_workspace_20')}</p>
          <ul>
            {loadErrors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {busy && (
        <p role="status" className="text-sm font-bold text-[#0E7C86]">
          {t('iam_workspace_21')}
        </p>
      )}
      {loading && (
        <p role="status" className="text-sm text-slate-500">
          {t('iam_workspace_22')}
        </p>
      )}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 shadow-xs">
          {error}
        </div>
      )}

      <section
        hidden={
          tab !== 'emergency' &&
          !(
            tab === 'assignments' &&
            roleMap.get(roleId)
              ?.permissions.some((permission) =>
                ADMIN_PERMISSION_CATALOG.some(
                  (entry) => entry.key === permission && entry.risk !== 'STANDARD',
                ),
              )
          ) &&
          !(
            tab === 'roles' &&
            (rolePolicyIds.length > 0 ||
              selectedPermissions.some((permission) =>
                ADMIN_PERMISSION_CATALOG.some(
                  (entry) => entry.key === permission && entry.risk !== 'STANDARD',
                ),
              ))
          )
        }
        className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldAlert className="h-4 w-4 text-[#0E7C86]" />
          <h3 className="font-black text-[#142B5F]">{t('iam_workspace_23')}</h3>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            maxLength={240}
            aria-label={t('iam_workspace_24')}
            value={changeTicket}
            onChange={(e) => setChangeTicket(e.target.value)}
            placeholder={t('iam_workspace_25')}
            className="rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-[#21A7B4]"
          />
          <AuthorizationIdentityPicker
            approver
            value={secondApproverId}
            onChange={setSecondApproverId}
          />
        </div>
        <p className="mt-2 text-xs font-medium text-slate-500">{t('iam_workspace_28')}</p>
      </section>

      <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-3">
        <label className="text-xs font-bold text-[#142B5F]">
          {t('iam_workspace_29')}
          <input
            aria-label={t('iam_workspace_30')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('iam_workspace_31')}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </label>
        <label className="text-xs font-bold text-[#142B5F]">
          {t('iam_workspace_32')}
          <select
            value={assignmentRole}
            onChange={(event) => setAssignmentRole(event.target.value)}
            className="mt-2 w-full rounded-xl border bg-white p-3"
          >
            <option value="ALL">{t('iam_workspace_33')}</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-[#142B5F]">
          {t('iam_workspace_34')}
          <select
            value={grantFilter}
            onChange={(event) => setGrantFilter(event.target.value)}
            className="mt-2 w-full rounded-xl border bg-white p-3"
          >
            <option value="ALL">{t('iam_workspace_35')}</option>
            <option value="ACTIVE">{t('iam_workspace_36')}</option>
            <option value="SCHEDULED">{t('iam_workspace_37')}</option>
            <option value="EXPIRED">{t('iam_workspace_38')}</option>
            <option value="REVOKED">{t('iam_workspace_39')}</option>
          </select>
        </label>
      </section>
      <section hidden={tab !== 'roles'} className="rounded-2xl border bg-white p-4 space-y-3">
        <label>
          {t('iam_edit_role')}
          <select
            className="w-full rounded-xl border p-2"
            value={editingRoleId}
            onChange={(event) => {
              if (!roleDirty || window.confirm(t('iam_discard_changes')))
                setEditingRoleId(event.target.value);
            }}
          >
            <option value="">{t('iam_select_role')}</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        {editingRoleId && (
          <AuthorizationRoleEditor
            roleId={editingRoleId}
            availablePermissions={permissions}
            onDirtyChange={setRoleDirty}
            onDuplicate={(role) => {
              setRoleName(`${role.name} (${t('iam_role_copy')})`);
              setRoleDescription(role.description);
              setSelectedPermissions(role.permissions);
              setRolePolicyIds(role.policyIds);
              setEditingRoleId('');
              setRoleDirty(false);
            }}
            onSaved={() => {
              setEditingRoleId('');
              void load();
            }}
          />
        )}
      </section>
      <div hidden={tab !== 'catalog'}>
        <AuthorizationPermissionCatalog permissions={permissions} />
      </div>
      <div hidden={tab !== 'policies'}>
        <AuthorizationPolicyPanel />
      </div>
      <div hidden={tab !== 'effective'}>
        <AuthorizationEffectiveAccess />
      </div>
      <fieldset
        hidden={tab !== 'roles' && tab !== 'assignments'}
        disabled={mutationBlocked}
        className={`${tab !== 'roles' && tab !== 'assignments' ? 'hidden' : 'grid'} min-w-0 gap-6 xl:grid-cols-2 disabled:opacity-60`}
      >
        <form
          hidden={tab !== 'roles'}
          onSubmit={createRole}
          className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldPlus className="h-4 w-4 text-[#21A7B4]" />
            <h3 className="font-black text-[#142B5F]">{t('iam_workspace_40')}</h3>
          </div>
          <input
            required
            maxLength={240}
            aria-label={t('iam_workspace_41')}
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder={t('iam_workspace_42')}
            className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-xs font-bold outline-none focus:border-[#21A7B4]"
          />
          <label className="mt-3 block text-xs font-bold">
            {t('iam_role_description')}
            <textarea
              className="mt-2 w-full rounded-xl border p-3"
              value={roleDescription}
              maxLength={2000}
              onChange={(event) => setRoleDescription(event.target.value)}
            />
          </label>
          <label className="mt-3 block text-xs font-bold">
            {t('iam_workspace_43')}
            {selectedPermissions.length} {t('iam_workspace_44')}
            <input
              value={permissionSearch}
              onChange={(event) => setPermissionSearch(event.target.value)}
              className="mt-2 w-full rounded-xl border p-3"
            />
          </label>
          <div className="mt-3 max-h-56 overflow-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-3 text-xs">
            {visiblePermissions.map((permission) => (
              <label
                key={permission}
                className="flex items-center gap-2 py-1.5 hover:text-[#0E7C86] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(permission)}
                  onChange={(e) =>
                    setSelectedPermissions((v) =>
                      e.target.checked ? [...v, permission] : v.filter((x) => x !== permission),
                    )
                  }
                  className="rounded text-[#21A7B4] focus:ring-[#21A7B4]"
                />
                <span className="flex flex-col">
                  <span>
                    {(() => {
                      const entry = ADMIN_PERMISSION_CATALOG.find(
                        (item) => item.key === permission,
                      );
                      return entry
                        ? language === 'ar'
                          ? entry.labelAr
                          : entry.labelEn
                        : permission;
                    })()}
                  </span>
                  <span>
                    {(() => {
                      const entry = ADMIN_PERMISSION_CATALOG.find(
                        (item) => item.key === permission,
                      );
                      return entry
                        ? `${entry.domain} / ${entry.action} · ${entry.risk} — ${language === 'ar' ? entry.descriptionAr : entry.descriptionEn}`
                        : '';
                    })()}
                  </span>
                  <code className="font-mono text-[11px]">{permission}</code>
                </span>
              </label>
            ))}
          </div>
          {rolePolicyIds.length > 0 && (
            <p>
              {t('iam_copied_policies')}: {rolePolicyIds.join(', ')}
            </p>
          )}
          <button className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#142B5F] px-4 text-xs font-black text-white hover:bg-[#0E7C86] transition shadow-xs">
            <Plus className="h-4 w-4 me-1.5" /> {t('iam_workspace_45')}
          </button>
        </form>

        <form
          hidden={tab !== 'assignments'}
          onSubmit={assign}
          className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="h-4 w-4 text-[#0E7C86]" />
            <h3 className="font-black text-[#142B5F]">{t('iam_workspace_46')}</h3>
          </div>
          <AuthorizationIdentityPicker value={identityId} onChange={setIdentityId} />
          <select
            required
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold outline-none focus:border-[#21A7B4]"
          >
            <option value="">{t('iam_workspace_51')}</option>
            {delegableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          {rolePolicyIds.length > 0 && (
            <p>
              {t('iam_copied_policies')}: {rolePolicyIds.join(', ')}
            </p>
          )}
          <button className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#21A7B4] px-4 text-xs font-black text-white hover:bg-[#1A8D99] transition shadow-xs">
            <UserCheck className="h-4 w-4 me-1.5" /> {t('iam_workspace_52')}
          </button>
        </form>
      </fieldset>

      <section
        hidden={tab !== 'roles'}
        className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs"
      >
        <h3 className="mb-3 font-black text-[#142B5F]">
          {t('iam_workspace_53')}
          {filteredRoles.length} {t('iam_workspace_54')}
          {roles.length})
        </h3>
        <div className="flex gap-3 my-3">
          <button type="button" disabled={refreshBlocked} onClick={() => void fetchPage('roles')}>
            {t('iam_first_page')}
          </button>
          <button
            type="button"
            disabled={refreshBlocked || !pageCursors.roles}
            onClick={() => void fetchPage('roles', true)}
          >
            {t('iam_next')}
          </button>
        </div>
        <button type="button" disabled={refreshBlocked} onClick={() => void fetchPage('roles')}>
          {t('iam_search')}
        </button>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold">
              <tr>
                <th className="p-3 text-start rounded-r-xl">{t('iam_workspace_55')}</th>
                <th className="p-3 text-start rounded-l-xl">{t('iam_workspace_56')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && !filteredRoles.length && (
                <tr>
                  <td colSpan={2} className="p-5 text-slate-500">
                    {t('iam_workspace_57')}
                  </td>
                </tr>
              )}
              {filteredRoles.map((role) => (
                <tr key={role.id} className="hover:bg-slate-50/50">
                  <td className="p-3 align-top">
                    <div className="font-bold text-[#142B5F]">{role.name}</div>
                    <code className="text-[10px] text-slate-400 font-mono">{role.id}</code>
                  </td>
                  <td className="p-3">
                    {role.permissions.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {role.permissions.map((p) => (
                          <code
                            key={p}
                            className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono text-[10px] text-slate-700"
                          >
                            {p}
                          </code>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">{t('iam_workspace_58')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        hidden={tab !== 'assignments'}
        className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs"
      >
        <h3 className="mb-3 font-black text-[#142B5F]">
          {t('iam_workspace_59')}
          {filteredAssignments.length} {t('iam_workspace_54')}
          {assignments.length})
        </h3>
        <div className="flex gap-3 my-3">
          <button
            type="button"
            disabled={refreshBlocked}
            onClick={() => void fetchPage('assignments')}
          >
            {t('iam_first_page')}
          </button>
          <button
            type="button"
            disabled={refreshBlocked || !pageCursors.assignments}
            onClick={() => void fetchPage('assignments', true)}
          >
            {t('iam_next')}
          </button>
        </div>
        <button
          type="button"
          disabled={refreshBlocked}
          onClick={() => void fetchPage('assignments')}
        >
          {t('iam_search')}
        </button>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold">
              <tr>
                <th className="p-3 text-start rounded-r-xl">{t('iam_workspace_60')}</th>
                <th className="p-3 text-start">{t('iam_workspace_61')}</th>
                <th className="p-3 text-start">{t('iam_workspace_62')}</th>
                <th className="p-3 text-start rounded-l-xl">{t('iam_workspace_63')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && !filteredAssignments.length && (
                <tr>
                  <td colSpan={4} className="p-5 text-slate-500">
                    {t('iam_workspace_64')}
                  </td>
                </tr>
              )}
              {filteredAssignments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/50">
                  <td className="p-3">
                    <div className="font-bold">
                      {identityMap.get(a.identityId)?.displayName || a.identityId}
                    </div>
                    <div className="text-slate-500">
                      {identityMap.get(a.identityId)?.primaryEmail}
                    </div>
                    <code className="text-[10px] text-slate-400">{a.identityId}</code>
                  </td>
                  <td className="p-3 font-bold text-[#142B5F]">
                    {roleMap.get(a.roleId)?.name ?? a.roleId}
                  </td>
                  <td className="p-3 text-slate-500">{dateLabel(a.assignedAt, language)}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      disabled={
                        mutationBlocked || !delegableRoles.some((role) => role.id === a.roleId)
                      }
                      onClick={() => void revoke(a)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition"
                    >
                      <Trash2 className="h-3 w-3" /> {t('iam_workspace_65')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        hidden={tab !== 'audit'}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xs"
      >
        <h3 className="mb-3 font-black text-[#142B5F]">{t('iam_workspace_66')}</h3>
        <div className="flex gap-3 my-3">
          <button type="button" disabled={refreshBlocked} onClick={() => void fetchPage('audit')}>
            {t('iam_first_page')}
          </button>
          <button
            type="button"
            disabled={refreshBlocked || !pageCursors.audit}
            onClick={() => void fetchPage('audit', true)}
          >
            {t('iam_next')}
          </button>
        </div>
        <fieldset disabled={refreshBlocked} className="grid gap-2 sm:grid-cols-3">
          <legend>{t('iam_audit_filters')}</legend>
          <label>
            {t('iam_audit_category')}
            <select
              value={auditFilters.category}
              onChange={(e) => setAuditFilters({ ...auditFilters, category: e.target.value })}
            >
              <option value="AUTHORIZATION_MUTATION">{t('iam_audit_success')}</option>
              <option value="AUTHORIZATION">{t('iam_audit_rejected')}</option>
            </select>
          </label>
          {(['actorId', 'targetId', 'action', 'from', 'until'] as const).map((field) => (
            <label key={field}>
              {t(`iam_audit_${field}`)}
              <input
                type={field === 'from' || field === 'until' ? 'datetime-local' : 'text'}
                value={auditFilters[field]}
                onChange={(e) => setAuditFilters({ ...auditFilters, [field]: e.target.value })}
              />
            </label>
          ))}
        </fieldset>
        {hasPermission('admin:audit:manage') && (
          <Link to="/audit?category=AUTHORIZATION_MUTATION">{t('iam_open_audit')}</Link>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="p-3">{t('iam_workspace_67')}</th>
                <th className="p-3">{t('iam_workspace_68')}</th>
                <th className="p-3">{t('iam_workspace_69')}</th>
                <th className="p-3">{t('iam_workspace_55')}</th>
                <th className="p-3">{t('iam_workspace_70')}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !assignmentAudit.length && (
                <tr>
                  <td colSpan={5} className="p-5 text-slate-500">
                    {t('iam_workspace_71')}
                  </td>
                </tr>
              )}
              {assignmentAudit.map((event, index) => (
                <tr
                  key={`${event.assignmentId}-${event.action}-${index}`}
                  className="border-b border-slate-100"
                >
                  <td className="p-3">{event.action}</td>
                  <td className="p-3">
                    {identityMap.get(event.actorId)?.displayName || event.actorId}
                  </td>
                  <td className="p-3 font-mono">{event.identityId || event.assignmentId}</td>
                  <td className="p-3">
                    {event.roleId ? (roleMap.get(event.roleId)?.name ?? event.roleId) : '—'}
                  </td>
                  <td className="p-3">{dateLabel(event.timestamp, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        hidden={tab !== 'emergency'}
        className="rounded-3xl border border-amber-200 bg-amber-50/40 p-6 shadow-xs"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h3 className="font-black text-[#142B5F]">{t('iam_workspace_74')}</h3>
        </div>
        <p className="mt-1 text-xs text-slate-600">{t('iam_workspace_75')}</p>
        <div className="flex gap-3 my-3">
          <button
            type="button"
            disabled={refreshBlocked}
            onClick={() => void fetchPage('emergency')}
          >
            {t('iam_first_page')}
          </button>
          <button
            type="button"
            disabled={refreshBlocked || !pageCursors.emergency}
            onClick={() => void fetchPage('emergency', true)}
          >
            {t('iam_next')}
          </button>
        </div>
        <form onSubmit={grantEmergencyAccess}>
          <fieldset
            disabled={mutationBlocked}
            className="mt-4 grid min-w-0 gap-2.5 md:grid-cols-5 disabled:opacity-60"
          >
            <AuthorizationIdentityPicker
              value={emergencyPrincipalId}
              onChange={setEmergencyPrincipalId}
            />
            <select
              required
              value={emergencyRoleId}
              onChange={(e) => setEmergencyRoleId(e.target.value)}
              className="rounded-xl border border-amber-200 bg-white p-2.5 text-xs outline-none focus:border-amber-400"
            >
              <option value="">{t('iam_workspace_78')}</option>
              {delegableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <input
              required
              minLength={12}
              maxLength={2000}
              aria-label={t('iam_workspace_79')}
              value={emergencyReason}
              onChange={(e) => setEmergencyReason(e.target.value)}
              placeholder={t('iam_workspace_80')}
              className="rounded-xl border border-amber-200 bg-white p-2.5 text-xs outline-none focus:border-amber-400"
            />
            <input
              type="number"
              min={5}
              max={240}
              aria-label={t('iam_workspace_81')}
              step={1}
              required
              value={emergencyDuration}
              onChange={(e) => setEmergencyDuration(Number(e.target.value))}
              placeholder={t('iam_workspace_82')}
              className="rounded-xl border border-amber-200 bg-white p-2.5 text-xs outline-none focus:border-amber-400"
            />
            <button className="rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white hover:bg-amber-700 transition shadow-xs">
              {t('iam_workspace_83')}
            </button>
          </fieldset>
        </form>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-amber-200/80 bg-white">
          <table className="w-full text-start text-xs">
            <thead className="bg-amber-50/50 text-slate-600 font-bold border-b border-amber-100">
              <tr>
                <th className="p-3 text-start">{t('iam_workspace_84')}</th>
                <th className="p-3 text-start">{t('iam_workspace_55')}</th>
                <th className="p-3 text-start">{t('iam_workspace_85')}</th>
                <th className="p-3 text-start">{t('iam_workspace_86')}</th>
                <th className="p-3 text-start">{t('iam_workspace_87')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-50">
              {!loading && !filteredGrants.length && (
                <tr>
                  <td colSpan={5} className="p-5 text-slate-500">
                    {t('iam_workspace_88')}
                  </td>
                </tr>
              )}
              {filteredGrants.map((g) => (
                <tr key={g.id}>
                  <td className="p-3">
                    <code>{g.principalId}</code>
                  </td>
                  <td className="p-3 font-bold">{roleMap.get(g.roleId)?.name ?? g.roleId}</td>
                  <td className="p-3 text-slate-500">{dateLabel(g.expiresAt, language)}</td>
                  <td className="p-3">
                    <code>{g.approvedBy}</code>
                  </td>
                  <td className="p-3">
                    {g.revokedAt ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500 font-bold">
                        {t('iam_workspace_39')}
                      </span>
                    ) : grantState(g) === 'EXPIRED' ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500 font-bold">
                        {t('iam_workspace_38')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={mutationBlocked}
                        onClick={() => void revokeEmergencyAccess(g)}
                        className="rounded border border-rose-200 bg-rose-50 px-2 py-1 font-bold text-rose-700"
                      >
                        {grantState(g) === 'SCHEDULED'
                          ? t('iam_workspace_89')
                          : t('iam_workspace_90')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Operation failed.';
}
function arrayField<T>(data: Record<string, unknown>, field: string): T[] {
  if (!Array.isArray(data[field])) throw new Error('INVALID_RESPONSE');
  return data[field] as T[];
}
function dateLabel(value: string, language: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString(language === 'ar' ? 'ar-YE' : 'en-GB', { timeZone: 'Asia/Aden' });
}
