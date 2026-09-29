import { FormEvent, useEffect, useMemo, useState } from 'react';
import { adminApiClient } from '../api/client';
import { KeyRound, ShieldAlert, UserCheck, ShieldPlus, AlertTriangle, RefreshCw, Plus, Trash2 } from 'lucide-react';

interface RoleDto { id: string; name: string; description: string; permissions: string[]; policyIds: string[] }
interface AssignmentDto { id: string; identityId: string; roleId: string; assignedAt: string }
interface IdentityDto { id?: string; identityId?: string; type?: string; status?: string; displayName?: string; primaryEmail?: string }
interface EmergencyGrantDto { id:string; principalId:string; roleId:string; reason:string; changeTicket:string; requestedBy:string; approvedBy:string; startsAt:string; expiresAt:string; revokedAt?:string|null }

type Envelope<T> = { data?: T };

export function AuthorizationAdminPage() {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [identities, setIdentities] = useState<IdentityDto[]>([]);
  const [emergencyGrants, setEmergencyGrants] = useState<EmergencyGrantDto[]>([]);
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

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleResponse, assignmentResponse, permissionResponse, identityResponse, emergencyResponse] = await Promise.all([
        adminApiClient.request<Envelope<{ roles: RoleDto[] }>>('/admin/authorization/roles'),
        adminApiClient.request<Envelope<{ assignments: AssignmentDto[] }>>('/admin/authorization/assignments'),
        adminApiClient.request<Envelope<{ permissions: string[] }>>('/admin/authorization/permissions'),
        adminApiClient.request<Envelope<any>>('/admin/identities?limit=50&offset=0'),
        adminApiClient.request<Envelope<{ grants: EmergencyGrantDto[] }>>('/admin/authorization/emergency-access?limit=100'),
      ]);
      setRoles(roleResponse.data?.roles ?? []);
      setAssignments(assignmentResponse.data?.assignments ?? []);
      setPermissions(permissionResponse.data?.permissions ?? []);
      const identityData = identityResponse.data;
      setIdentities(Array.isArray(identityData) ? identityData : identityData?.items ?? identityData?.identities ?? []);
      setEmergencyGrants(emergencyResponse.data?.grants ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل بيانات الهوية والصلاحيات.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  const roleMap = useMemo(() => new Map(roles.map(role => [role.id, role])), [roles]);
  const approvalHeaders = () => ({
    ...(changeTicket.trim() ? { 'x-change-ticket': changeTicket.trim() } : {}),
    ...(secondApproverId.trim() ? { 'x-second-approver-id': secondApproverId.trim() } : {}),
  });

  const createRole = async (event: FormEvent) => {
    event.preventDefault(); setError(null);
    try {
      const id = `role_${crypto.randomUUID()}`;
      await adminApiClient.request('/admin/authorization/roles', {
        method: 'POST', headers: approvalHeaders(),
        body: JSON.stringify({ id, name: roleName.trim(), description: `دور إداري: ${roleName.trim()}`, permissions: selectedPermissions, policyIds: [] }),
      });
      setRoleName(''); setSelectedPermissions([]); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'فشل إنشاء الدور.'); }
  };

  const assign = async (event: FormEvent) => {
    event.preventDefault(); setError(null);
    try {
      await adminApiClient.request('/admin/authorization/assignments', {
        method: 'POST', headers: approvalHeaders(),
        body: JSON.stringify({ id: `role_assignment_${crypto.randomUUID()}`, identityId: identityId.trim(), roleId }),
      });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'فشل تعيين الدور.'); }
  };

  const revoke = async (assignment: AssignmentDto) => {
    const reason = window.prompt('سبب إلغاء هذا التعيين؟');
    if (!reason || reason.trim().length < 6) return;
    try {
      await adminApiClient.request(`/admin/authorization/assignments/${encodeURIComponent(assignment.id)}`, {
        method: 'DELETE', headers: approvalHeaders(), body: JSON.stringify({ reason: reason.trim() }),
      });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'فشل إلغاء التعيين.'); }
  };

  const grantEmergencyAccess = async (event: FormEvent) => {
    event.preventDefault(); setError(null);
    try {
      await adminApiClient.request('/admin/authorization/emergency-access', { method:'POST', headers: approvalHeaders(), body: JSON.stringify({ principalId: emergencyPrincipalId.trim(), roleId: emergencyRoleId, reason: emergencyReason.trim(), durationMinutes: emergencyDuration }) });
      setEmergencyPrincipalId(''); setEmergencyRoleId(''); setEmergencyReason(''); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'فشل منح الوصول الطارئ.'); }
  };
  const revokeEmergencyAccess = async (grant: EmergencyGrantDto) => {
    const reason = window.prompt('سبب إلغاء الوصول الطارئ؟'); if (!reason || reason.trim().length < 6) return;
    try { await adminApiClient.request(`/admin/authorization/emergency-access/${encodeURIComponent(grant.id)}/revoke`, { method:'POST', body:JSON.stringify({ reason: reason.trim() }) }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'فشل إلغاء الوصول الطارئ.'); }
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
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">الهوية والصلاحيات والوصول</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-cyan-50/90">
              حوكمة الأدوار الأقل امتيازاً، تعيين الصلاحيات، مصفوفة الأذونات، وضوابط الوصول الطارئ المحكوم.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#21A7B4] px-5 text-sm font-black text-white shadow-md transition hover:bg-[#1A8D99] shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث البيانات
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 shadow-xs">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldAlert className="h-4 w-4 text-[#0E7C86]" />
          <h3 className="font-black text-[#142B5F]">سياق اعتماد العمليات عالية المخاطر (Maker-Checker)</h3>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={changeTicket}
            onChange={(e) => setChangeTicket(e.target.value)}
            placeholder="مرجع تذكرة التغيير / الاعتماد (Change Ticket)"
            className="rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-[#21A7B4]"
          />
          <input
            value={secondApproverId}
            onChange={(e) => setSecondApproverId(e.target.value)}
            placeholder="معرف المعتمد الثاني (Second Approver Identity ID)"
            className="rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-[#21A7B4]"
          />
        </div>
        <p className="mt-2 text-xs font-medium text-slate-500">مطلوب عند تعديل أدوار تحتوي على صلاحيات حساسة أو صلاحيات الشامل (*).</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={createRole} className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldPlus className="h-4 w-4 text-[#21A7B4]" />
            <h3 className="font-black text-[#142B5F]">إنشاء دور جديد</h3>
          </div>
          <input
            required
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="اسم الدور (مثل: Content Reviewer)"
            className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-xs font-bold outline-none focus:border-[#21A7B4]"
          />
          <div className="mt-3 max-h-56 overflow-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-3 text-xs">
            {permissions.map((permission) => (
              <label key={permission} className="flex items-center gap-2 py-1.5 hover:text-[#0E7C86] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(permission)}
                  onChange={(e) =>
                    setSelectedPermissions((v) =>
                      e.target.checked ? [...v, permission] : v.filter((x) => x !== permission)
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

        <form onSubmit={assign} className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="h-4 w-4 text-[#0E7C86]" />
            <h3 className="font-black text-[#142B5F]">تعيين دور لمستخدم / هوية</h3>
          </div>
          <input
            required
            list="identity-list"
            value={identityId}
            onChange={(e) => setIdentityId(e.target.value)}
            placeholder="معرف الهوية أو البريد (Identity ID)"
            className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-xs font-medium outline-none focus:border-[#21A7B4]"
          />
          <datalist id="identity-list">
            {identities.map((item, index) => (
              <option key={item.id ?? item.identityId ?? index} value={item.id ?? item.identityId ?? ''}>
                {item.displayName ?? item.primaryEmail ?? item.status}
              </option>
            ))}
          </datalist>
          <select
            required
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold outline-none focus:border-[#21A7B4]"
          >
            <option value="">اختر الدور المطلوب</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#21A7B4] px-4 text-xs font-black text-white hover:bg-[#1A8D99] transition shadow-xs">
            <UserCheck className="h-4 w-4 me-1.5" /> اعتماد وتعيين الدور
          </button>
        </form>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <h3 className="mb-3 font-black text-[#142B5F]">مصفوفة الأدوار والصلاحيات ({roles.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold">
              <tr>
                <th className="p-3 text-start rounded-r-xl">الدور</th>
                <th className="p-3 text-start rounded-l-xl">الصلاحيات الممنوحة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-slate-50/50">
                  <td className="p-3 align-top">
                    <div className="font-bold text-[#142B5F]">{role.name}</div>
                    <code className="text-[10px] text-slate-400 font-mono">{role.id}</code>
                  </td>
                  <td className="p-3">
                    {role.permissions.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {role.permissions.map((p) => (
                          <code key={p} className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono text-[10px] text-slate-700">
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
        <h3 className="mb-3 font-black text-[#142B5F]">التعيينات الحالية ومراجعة الوصول ({assignments.length})</h3>
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
              {assignments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/50">
                  <td className="p-3">
                    <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">{a.identityId}</code>
                  </td>
                  <td className="p-3 font-bold text-[#142B5F]">{roleMap.get(a.roleId)?.name ?? a.roleId}</td>
                  <td className="p-3 text-slate-500">{new Date(a.assignedAt).toLocaleString('ar')}</td>
                  <td className="p-3">
                    <button
                      type="button"
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

      <section className="rounded-3xl border border-amber-200 bg-amber-50/40 p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h3 className="font-black text-[#142B5F]">الوصول الطارئ المحكوم (Break-glass Emergency Access)</h3>
        </div>
        <p className="mt-1 text-xs text-slate-600">وصول محدد بوقت (5 إلى 240 دقيقة)، معتمد من طرفين، ويتم تسجيله وإلغاؤه تلقائياً بعد انقضاء المدة.</p>
        <form onSubmit={grantEmergencyAccess} className="mt-4 grid gap-2.5 md:grid-cols-5">
          <input
            required
            value={emergencyPrincipalId}
            onChange={(e) => setEmergencyPrincipalId(e.target.value)}
            placeholder="معرف الهوية المستفيدة"
            className="rounded-xl border border-amber-200 bg-white p-2.5 text-xs outline-none focus:border-amber-400"
          />
          <select
            required
            value={emergencyRoleId}
            onChange={(e) => setEmergencyRoleId(e.target.value)}
            className="rounded-xl border border-amber-200 bg-white p-2.5 text-xs outline-none focus:border-amber-400"
          >
            <option value="">الدور الطارئ</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <input
            required
            minLength={12}
            value={emergencyReason}
            onChange={(e) => setEmergencyReason(e.target.value)}
            placeholder="سبب الوصول الطارئ (تفصيلي)"
            className="rounded-xl border border-amber-200 bg-white p-2.5 text-xs outline-none focus:border-amber-400"
          />
          <input
            type="number"
            min={5}
            max={240}
            value={emergencyDuration}
            onChange={(e) => setEmergencyDuration(Number(e.target.value))}
            placeholder="المدة بالدقائق"
            className="rounded-xl border border-amber-200 bg-white p-2.5 text-xs outline-none focus:border-amber-400"
          />
          <button className="rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white hover:bg-amber-700 transition shadow-xs">
            منح الوصول الطارئ
          </button>
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
              {emergencyGrants.map((g) => (
                <tr key={g.id}>
                  <td className="p-3">
                    <code>{g.principalId}</code>
                  </td>
                  <td className="p-3 font-bold">{roleMap.get(g.roleId)?.name ?? g.roleId}</td>
                  <td className="p-3 text-slate-500">{new Date(g.expiresAt).toLocaleString('ar')}</td>
                  <td className="p-3">
                    <code>{g.approvedBy}</code>
                  </td>
                  <td className="p-3">
                    {g.revokedAt ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500 font-bold">ملغى</span>
                    ) : new Date(g.expiresAt) <= new Date() ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-500 font-bold">منتهي</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void revokeEmergencyAccess(g)}
                        className="rounded border border-rose-200 bg-rose-50 px-2 py-1 font-bold text-rose-700"
                      >
                        سحب فوري
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
