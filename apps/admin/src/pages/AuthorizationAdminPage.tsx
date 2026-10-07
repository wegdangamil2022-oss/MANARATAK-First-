import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
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
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [identities, setIdentities] = useState<IdentityDto[]>([]);
  const [identityTotal, setIdentityTotal] = useState(0);
  const [identityOffset, setIdentityOffset] = useState(0);
  const [emergencyGrants, setEmergencyGrants] = useState<EmergencyGrantDto[]>([]);
  const [assignmentAudit, setAssignmentAudit] = useState<AssignmentAuditDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
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
  const [loadingMore, setLoadingMore] = useState(false);
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
  const moreRef = useRef(false);
  const generation = useRef(0);
  const commandKeys = useRef(new Map<string, { key: string; id: string }>());
  const refreshBlocked = busy || loading || loadingMore;
  const mutationBlocked = refreshBlocked || !permissionsReady;

  const load = async () => {
    const request = ++generation.current;
    loadRef.current = true;
    setLoading(true);
    setPermissionsReady(false);
    const sources = [
      '/admin/authorization/roles',
      '/admin/authorization/assignments',
      '/admin/authorization/permissions',
      '/admin/authorization/eligible-identities?limit=100&offset=0',
      '/admin/authorization/emergency-access?limit=200',
      '/admin/authorization/assignment-audit',
    ];
    const results = await Promise.allSettled(
      sources.map((source) => adminApiClient.request<Envelope<Record<string, unknown>>>(source)),
    );
    if (request !== generation.current) return;
    const errors: string[] = [];
    const names = [
      'الأدوار',
      'التعيينات',
      'الصلاحيات المتاحة',
      'الحسابات المؤهلة',
      'الوصول الطارئ',
      'سجل التعيينات',
    ];
    results.forEach((result, index) => {
      try {
        if (result.status === 'rejected') throw result.reason;
        const data = result.value.data;
        if (!data) throw new Error('استجابة غير صالحة');
        switch (index) {
          case 0:
            setRoles(arrayField<RoleDto>(data, 'roles'));
            break;
          case 1:
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
              throw new Error('بيانات ترقيم الحسابات غير صالحة');
            setIdentityTotal(Number(data.total));
            setIdentityOffset(Number(data.nextOffset));
            break;
          }
          case 4:
            setEmergencyGrants(arrayField<EmergencyGrantDto>(data, 'grants'));
            break;
          case 5:
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
          setIdentityTotal(0);
          setIdentityOffset(0);
        }
        if (index === 4) setEmergencyGrants([]);
        if (index === 5) setAssignmentAudit([]);
      }
    });
    setLoadErrors(errors);
    loadRef.current = false;
    setLoading(false);
  };

  useEffect(() => {
    void load();
    return () => {
      generation.current += 1;
    };
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const loadMoreIdentities = async () => {
    if (moreRef.current || busyRef.current || loadRef.current) return;
    moreRef.current = true;
    setLoadingMore(true);
    setError(null);
    const request = generation.current;
    try {
      const response = await adminApiClient.request<
        Envelope<{ identities: IdentityDto[]; total: number; nextOffset: number }>
      >(`/admin/authorization/eligible-identities?limit=100&offset=${identityOffset}`);
      if (request !== generation.current) return;
      const page = response.data;
      if (
        !page ||
        !Array.isArray(page.identities) ||
        !Number.isSafeInteger(page.total) ||
        !Number.isSafeInteger(page.nextOffset) ||
        (page.nextOffset <= identityOffset && page.nextOffset < page.total)
      )
        throw new Error('بيانات ترقيم الحسابات غير صالحة');
      setIdentities((previous) => [
        ...new Map([...previous, ...page.identities].map((item) => [item.id, item])).values(),
      ]);
      setIdentityTotal(page.total);
      setIdentityOffset(page.nextOffset);
    } catch (cause) {
      if (request === generation.current) setError(message(cause));
    } finally {
      moreRef.current = false;
      setLoadingMore(false);
    }
  };
  const roleMap = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);
  const identityMap = useMemo(
    () => new Map(identities.map((identity) => [identity.id, identity])),
    [identities],
  );
  const delegableRoles = useMemo(
    () =>
      roles.filter((role) =>
        role.permissions.every((permission) => permissions.includes(permission)),
      ),
    [roles, permissions],
  );
  const visiblePermissions = permissions.filter((permission) =>
    permission.toLowerCase().includes(permissionSearch.trim().toLowerCase()),
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
    if (busyRef.current || loadRef.current || moreRef.current || !permissionsReady) return;
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
      setSuccess('تم حفظ العملية. تتم إعادة قراءة بيانات الإدارة من الخادم.');
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
      setError('أدخل اسم الدور واختر صلاحية متاحة واحدة على الأقل.');
      return;
    }
    await mutate(
      'role',
      {
        name,
        description: `دور إداري: ${name}`,
        permissions: [...selectedPermissions].sort(),
        policyIds: [],
      },
      '/admin/authorization/roles',
      'POST',
      () => {
        setRoleName('');
        setSelectedPermissions([]);
      },
      true,
    );
  };
  const assign = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !identities.some((item) => item.id === identityId) ||
      !delegableRoles.some((item) => item.id === roleId)
    ) {
      setError('اختر حساباً مؤهلاً ودوراً متاحاً للتفويض.');
      return;
    }
    if (assignments.some((item) => item.identityId === identityId && item.roleId === roleId)) {
      setError('هذا الدور معيّن للحساب بالفعل.');
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
      `سبب إلغاء دور ${roleMap.get(assignment.roleId)?.name || assignment.roleId} عن الحساب ${identityMap.get(assignment.identityId)?.displayName || assignment.identityId}؟`,
    );
    if (reason === null) return;
    if (reason.trim().length < 6) {
      setError('سبب الإلغاء يجب أن يحتوي على 6 أحرف على الأقل.');
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
    if (
      !identities.some((item) => item.id === emergencyPrincipalId) ||
      !delegableRoles.some((item) => item.id === emergencyRoleId)
    ) {
      setError('اختر حساباً مؤهلاً ودوراً متاحاً للوصول الطارئ.');
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
      setError('أكمل مرجع الاعتماد والمعتمد الثاني والسبب والمدة (5–240 دقيقة).');
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
    const reason = window.prompt('سبب إلغاء الوصول الطارئ؟');
    if (reason === null) return;
    if (reason.trim().length < 6) {
      setError('سبب الإلغاء يجب أن يحتوي على 6 أحرف على الأقل.');
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
    <div dir="rtl" className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-[0_18px_45px_rgba(20,43,95,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-28 h-64 w-64 rounded-full border border-cyan-400/20" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-48 bg-gradient-to-r from-transparent via-[#21A7B4] to-[#0E7C86] sm:w-80" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-200 backdrop-blur-sm border border-white/15">
              <KeyRound className="h-4 w-4 text-[#21A7B4]" />
              <span>إدارة الهويات والصلاحيات · IAM & RBAC</span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">
              الموظفون والصلاحيات
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-cyan-50/90">
              حوكمة الأدوار الأقل امتيازاً، تعيين الصلاحيات، مصفوفة الأذونات، وضوابط الوصول الطارئ
              المحكوم.
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
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث البيانات
          </button>
        </div>
      </section>

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
          <p className="font-bold">
            تعذر تحميل بعض المصادر؛ القائمة الجزئية لا تعني عدم وجود سجلات.
          </p>
          <ul>
            {loadErrors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {busy && (
        <p role="status" className="text-sm font-bold text-[#0E7C86]">
          جارٍ حفظ العملية؛ يرجى انتظار الاستجابة.
        </p>
      )}
      {loading && (
        <p role="status" className="text-sm text-slate-500">
          جارٍ تحميل بيانات الصلاحيات...
        </p>
      )}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 shadow-xs">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldAlert className="h-4 w-4 text-[#0E7C86]" />
          <h3 className="font-black text-[#142B5F]">
            سياق اعتماد العمليات عالية المخاطر (Maker-Checker)
          </h3>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            maxLength={240}
            aria-label="مرجع اعتماد التغيير"
            value={changeTicket}
            onChange={(e) => setChangeTicket(e.target.value)}
            placeholder="مرجع تذكرة التغيير / الاعتماد (Change Ticket)"
            className="rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-[#21A7B4]"
          />
          <input
            maxLength={240}
            aria-label="معرف المعتمد الثاني"
            value={secondApproverId}
            onChange={(e) => setSecondApproverId(e.target.value)}
            placeholder="معرف المعتمد الثاني (Second Approver Identity ID)"
            className="rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-[#21A7B4]"
          />
        </div>
        <p className="mt-2 text-xs font-medium text-slate-500">
          مطلوب عند تعديل أدوار تحتوي على صلاحيات حساسة أو صلاحيات الشامل (*).
        </p>
      </section>

      <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-3">
        <label className="text-xs font-bold text-[#142B5F]">
          البحث في الأدوار والتعيينات والوصول الطارئ
          <input
            aria-label="بحث الصلاحيات"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="اسم، بريد، معرف أو صلاحية"
            className="mt-2 w-full rounded-xl border p-3"
          />
        </label>
        <label className="text-xs font-bold text-[#142B5F]">
          فلتر دور التعيينات
          <select
            value={assignmentRole}
            onChange={(event) => setAssignmentRole(event.target.value)}
            className="mt-2 w-full rounded-xl border bg-white p-3"
          >
            <option value="ALL">كل الأدوار</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-[#142B5F]">
          حالة الوصول الطارئ
          <select
            value={grantFilter}
            onChange={(event) => setGrantFilter(event.target.value)}
            className="mt-2 w-full rounded-xl border bg-white p-3"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="ACTIVE">نشط</option>
            <option value="SCHEDULED">لم يبدأ</option>
            <option value="EXPIRED">منتهي</option>
            <option value="REVOKED">ملغى</option>
          </select>
        </label>
      </section>
      <fieldset
        disabled={mutationBlocked}
        className="grid min-w-0 gap-6 xl:grid-cols-2 disabled:opacity-60"
      >
        <form
          onSubmit={createRole}
          className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldPlus className="h-4 w-4 text-[#21A7B4]" />
            <h3 className="font-black text-[#142B5F]">إنشاء دور جديد</h3>
          </div>
          <input
            required
            maxLength={240}
            aria-label="اسم الدور"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="اسم الدور (مثل: Content Reviewer)"
            className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-xs font-bold outline-none focus:border-[#21A7B4]"
          />
          <label className="mt-3 block text-xs font-bold">
            بحث الصلاحيات المتاحة ({selectedPermissions.length} مختارة)
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
                <code className="font-mono text-[11px]">{permission}</code>
              </label>
            ))}
          </div>
          <button className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#142B5F] px-4 text-xs font-black text-white hover:bg-[#0E7C86] transition shadow-xs">
            <Plus className="h-4 w-4 me-1.5" /> حفظ وإنشاء الدور
          </button>
        </form>

        <form
          onSubmit={assign}
          className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="h-4 w-4 text-[#0E7C86]" />
            <h3 className="font-black text-[#142B5F]">تعيين دور لمستخدم / هوية</h3>
          </div>
          <select
            required
            value={identityId}
            onChange={(e) => setIdentityId(e.target.value)}
            className="mt-4 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium outline-none focus:border-[#21A7B4]"
          >
            <option value="">اختر حسابًا موجودًا وموثّق البريد</option>
            {identities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName} — {item.primaryEmail}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500">
            المحمّل: {identities.length} حساب مؤهل. تُفحص الحسابات النشطة على دفعات؛ هذه ليست قائمة
            جميع مستخدمي المنصة.
          </p>
          {identityOffset < identityTotal && (
            <button
              type="button"
              disabled={refreshBlocked}
              onClick={() => void loadMoreIdentities()}
              className="mt-2 text-xs font-bold text-[#0E7C86] underline"
            >
              عرض حسابات موثقة إضافية
            </button>
          )}
          <select
            required
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold outline-none focus:border-[#21A7B4]"
          >
            <option value="">اختر الدور المطلوب</option>
            {delegableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#21A7B4] px-4 text-xs font-black text-white hover:bg-[#1A8D99] transition shadow-xs">
            <UserCheck className="h-4 w-4 me-1.5" /> اعتماد وتعيين الدور
          </button>
        </form>
      </fieldset>

      <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <h3 className="mb-3 font-black text-[#142B5F]">
          مصفوفة الأدوار والصلاحيات ({filteredRoles.length} من {roles.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold">
              <tr>
                <th className="p-3 text-start rounded-r-xl">الدور</th>
                <th className="p-3 text-start rounded-l-xl">الصلاحيات الممنوحة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && !filteredRoles.length && (
                <tr>
                  <td colSpan={2} className="p-5 text-slate-500">
                    لا توجد أدوار مطابقة ضمن البيانات المحمّلة.
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
                      <span className="text-slate-400">لا توجد صلاحيات</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <h3 className="mb-3 font-black text-[#142B5F]">
          التعيينات الحالية ومراجعة الوصول ({filteredAssignments.length} من {assignments.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold">
              <tr>
                <th className="p-3 text-start rounded-r-xl">الهوية (Identity)</th>
                <th className="p-3 text-start">الدور المسند</th>
                <th className="p-3 text-start">تاريخ التعيين</th>
                <th className="p-3 text-start rounded-l-xl">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && !filteredAssignments.length && (
                <tr>
                  <td colSpan={4} className="p-5 text-slate-500">
                    لا توجد تعيينات مطابقة ضمن البيانات المحمّلة.
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
                  <td className="p-3 text-slate-500">{dateLabel(a.assignedAt)}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      disabled={
                        mutationBlocked || !delegableRoles.some((role) => role.id === a.roleId)
                      }
                      onClick={() => void revoke(a)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition"
                    >
                      <Trash2 className="h-3 w-3" /> إلغاء التعيين
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="mb-3 font-black text-[#142B5F]">سجل منح الأدوار وإلغائها — آخر 100 حدث</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="p-3">العملية</th>
                <th className="p-3">المنفذ</th>
                <th className="p-3">الحساب المستهدف</th>
                <th className="p-3">الدور</th>
                <th className="p-3">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !assignmentAudit.length && (
                <tr>
                  <td colSpan={5} className="p-5 text-slate-500">
                    لا توجد أحداث ضمن دفعة التدقيق المحمّلة.
                  </td>
                </tr>
              )}
              {assignmentAudit.map((event, index) => (
                <tr
                  key={`${event.assignmentId}-${event.action}-${index}`}
                  className="border-b border-slate-100"
                >
                  <td className="p-3">{event.action === 'ROLE_ASSIGNED' ? 'منح' : 'إلغاء'}</td>
                  <td className="p-3">
                    {identityMap.get(event.actorId)?.displayName || event.actorId}
                  </td>
                  <td className="p-3 font-mono">{event.identityId || event.assignmentId}</td>
                  <td className="p-3">
                    {event.roleId ? (roleMap.get(event.roleId)?.name ?? event.roleId) : '—'}
                  </td>
                  <td className="p-3">{dateLabel(event.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50/40 p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h3 className="font-black text-[#142B5F]">
            الوصول الطارئ المحكوم (Break-glass Emergency Access)
          </h3>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          وصول محدد بوقت (5 إلى 240 دقيقة)، معتمد من طرفين، ويتم تسجيله وتنتهي صلاحية الوصول
          تلقائياً بعد انقضاء المدة.
        </p>
        <form onSubmit={grantEmergencyAccess}>
          <fieldset
            disabled={mutationBlocked}
            className="mt-4 grid min-w-0 gap-2.5 md:grid-cols-5 disabled:opacity-60"
          >
            <select
              required
              aria-label="الحساب المستفيد من الوصول الطارئ"
              value={emergencyPrincipalId}
              onChange={(event) => setEmergencyPrincipalId(event.target.value)}
              className="rounded-xl border border-amber-200 bg-white p-2.5 text-xs"
            >
              <option value="">اختر حساباً مؤهلاً</option>
              {identities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName} — {item.primaryEmail}
                </option>
              ))}
            </select>
            <select
              required
              value={emergencyRoleId}
              onChange={(e) => setEmergencyRoleId(e.target.value)}
              className="rounded-xl border border-amber-200 bg-white p-2.5 text-xs outline-none focus:border-amber-400"
            >
              <option value="">الدور الطارئ</option>
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
              aria-label="سبب الوصول الطارئ"
              value={emergencyReason}
              onChange={(e) => setEmergencyReason(e.target.value)}
              placeholder="سبب الوصول الطارئ (تفصيلي)"
              className="rounded-xl border border-amber-200 bg-white p-2.5 text-xs outline-none focus:border-amber-400"
            />
            <input
              type="number"
              min={5}
              max={240}
              aria-label="مدة الوصول الطارئ بالدقائق"
              step={1}
              required
              value={emergencyDuration}
              onChange={(e) => setEmergencyDuration(Number(e.target.value))}
              placeholder="المدة بالدقائق"
              className="rounded-xl border border-amber-200 bg-white p-2.5 text-xs outline-none focus:border-amber-400"
            />
            <button className="rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white hover:bg-amber-700 transition shadow-xs">
              منح الوصول الطارئ
            </button>
          </fieldset>
        </form>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-amber-200/80 bg-white">
          <table className="w-full text-start text-xs">
            <thead className="bg-amber-50/50 text-slate-600 font-bold border-b border-amber-100">
              <tr>
                <th className="p-3 text-start">المستفيد</th>
                <th className="p-3 text-start">الدور</th>
                <th className="p-3 text-start">وقت الانتهاء</th>
                <th className="p-3 text-start">المعتمد</th>
                <th className="p-3 text-start">الحالة / الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-50">
              {!loading && !filteredGrants.length && (
                <tr>
                  <td colSpan={5} className="p-5 text-slate-500">
                    لا توجد منح وصول مطابقة ضمن آخر 200 سجل محمّل.
                  </td>
                </tr>
              )}
              {filteredGrants.map((g) => (
                <tr key={g.id}>
                  <td className="p-3">
                    <code>{g.principalId}</code>
                  </td>
                  <td className="p-3 font-bold">{roleMap.get(g.roleId)?.name ?? g.roleId}</td>
                  <td className="p-3 text-slate-500">{dateLabel(g.expiresAt)}</td>
                  <td className="p-3">
                    <code>{g.approvedBy}</code>
                  </td>
                  <td className="p-3">
                    {g.revokedAt ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500 font-bold">
                        ملغى
                      </span>
                    ) : grantState(g) === 'EXPIRED' ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500 font-bold">
                        منتهي
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={mutationBlocked}
                        onClick={() => void revokeEmergencyAccess(g)}
                        className="rounded border border-rose-200 bg-rose-50 px-2 py-1 font-bold text-rose-700"
                      >
                        {grantState(g) === 'SCHEDULED' ? 'لم يبدأ — إلغاء' : 'نشط — سحب فوري'}
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
  return cause instanceof Error ? cause.message : 'تعذر إكمال العملية.';
}
function arrayField<T>(data: Record<string, unknown>, field: string): T[] {
  if (!Array.isArray(data[field])) throw new Error('استجابة غير صالحة');
  return data[field] as T[];
}
function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('ar-YE', { timeZone: 'Asia/Aden' });
}
