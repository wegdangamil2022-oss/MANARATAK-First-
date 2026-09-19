import { FormEvent, useEffect, useMemo, useState } from 'react';
import { adminApiClient } from '../api/client';

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

  const load = async () => {
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
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load authorization workspace.'); }
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
        body: JSON.stringify({ id, name: roleName.trim(), description: `Administrative role: ${roleName.trim()}`, permissions: selectedPermissions, policyIds: [] }),
      });
      setRoleName(''); setSelectedPermissions([]); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to create role.'); }
  };

  const assign = async (event: FormEvent) => {
    event.preventDefault(); setError(null);
    try {
      await adminApiClient.request('/admin/authorization/assignments', {
        method: 'POST', headers: approvalHeaders(),
        body: JSON.stringify({ id: `role_assignment_${crypto.randomUUID()}`, identityId: identityId.trim(), roleId }),
      });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to assign role.'); }
  };

  const revoke = async (assignment: AssignmentDto) => {
    const reason = window.prompt('Reason for revoking this assignment?');
    if (!reason || reason.trim().length < 6) return;
    try {
      await adminApiClient.request(`/admin/authorization/assignments/${encodeURIComponent(assignment.id)}`, {
        method: 'DELETE', headers: approvalHeaders(), body: JSON.stringify({ reason: reason.trim() }),
      });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to revoke assignment.'); }
  };

  const grantEmergencyAccess = async (event: FormEvent) => {
    event.preventDefault(); setError(null);
    try {
      await adminApiClient.request('/admin/authorization/emergency-access', { method:'POST', headers: approvalHeaders(), body: JSON.stringify({ principalId: emergencyPrincipalId.trim(), roleId: emergencyRoleId, reason: emergencyReason.trim(), durationMinutes: emergencyDuration }) });
      setEmergencyPrincipalId(''); setEmergencyRoleId(''); setEmergencyReason(''); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to grant emergency access.'); }
  };
  const revokeEmergencyAccess = async (grant: EmergencyGrantDto) => {
    const reason = window.prompt('Emergency access revocation reason?'); if (!reason || reason.trim().length < 6) return;
    try { await adminApiClient.request(`/admin/authorization/emergency-access/${encodeURIComponent(grant.id)}/revoke`, { method:'POST', body:JSON.stringify({ reason: reason.trim() }) }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to revoke emergency access.'); }
  };

  return <div className="space-y-6">
    <div><h2 className="text-2xl font-black text-[#142B5F]">IAM & Authorization</h2><p className="mt-1 text-sm text-[#203442]/60">Least-privilege roles, assignments, permission matrix, and high-risk maker-checker controls.</p></div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <section className="rounded-2xl border border-[#DDEFF2] bg-white p-5">
      <h3 className="font-black text-[#142B5F]">High-risk approval context</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2"><input value={changeTicket} onChange={e=>setChangeTicket(e.target.value)} placeholder="Change ticket / approval reference" className="rounded-xl border p-2"/><input value={secondApproverId} onChange={e=>setSecondApproverId(e.target.value)} placeholder="Second approver identity ID" className="rounded-xl border p-2"/></div>
      <p className="mt-2 text-xs text-[#203442]/55">Required when a role can administer authorization/identities or contains wildcard administration.</p>
    </section>
    <div className="grid gap-6 xl:grid-cols-2">
      <form onSubmit={createRole} className="rounded-2xl border border-[#DDEFF2] bg-white p-5">
        <h3 className="font-black text-[#142B5F]">Create role</h3>
        <input required value={roleName} onChange={e=>setRoleName(e.target.value)} placeholder="Role name" className="mt-3 w-full rounded-xl border p-2"/>
        <div className="mt-3 max-h-64 overflow-auto rounded-xl border p-3 text-xs">{permissions.map(permission => <label key={permission} className="flex gap-2 py-1"><input type="checkbox" checked={selectedPermissions.includes(permission)} onChange={e=>setSelectedPermissions(v=>e.target.checked?[...v,permission]:v.filter(x=>x!==permission))}/><code>{permission}</code></label>)}</div>
        <button className="mt-3 rounded-xl bg-[#142B5F] px-4 py-2 text-sm font-bold text-white">Create governed role</button>
      </form>
      <form onSubmit={assign} className="rounded-2xl border border-[#DDEFF2] bg-white p-5">
        <h3 className="font-black text-[#142B5F]">Assign role</h3>
        <input required list="identity-list" value={identityId} onChange={e=>setIdentityId(e.target.value)} placeholder="Identity ID" className="mt-3 w-full rounded-xl border p-2"/>
        <datalist id="identity-list">{identities.map((item,index)=><option key={item.id??item.identityId??index} value={item.id??item.identityId??''}>{item.displayName??item.primaryEmail??item.status}</option>)}</datalist>
        <select required value={roleId} onChange={e=>setRoleId(e.target.value)} className="mt-3 w-full rounded-xl border p-2"><option value="">Select role</option>{roles.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}</select>
        <button className="mt-3 rounded-xl bg-[#0E7C86] px-4 py-2 text-sm font-bold text-white">Assign role</button>
      </form>
    </div>
    <section className="rounded-2xl border border-[#DDEFF2] bg-white p-5 overflow-x-auto"><h3 className="mb-3 font-black text-[#142B5F]">Role matrix</h3><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Role</th><th className="p-2">Permissions</th></tr></thead><tbody>{roles.map(role=><tr key={role.id} className="border-t"><td className="p-2 align-top"><div className="font-bold">{role.name}</div><code>{role.id}</code></td><td className="p-2">{role.permissions.length?role.permissions.map(p=><code key={p} className="me-2 inline-block">{p}</code>):'No permissions'}</td></tr>)}</tbody></table></section>
    <section className="rounded-2xl border border-[#DDEFF2] bg-white p-5 overflow-x-auto"><h3 className="mb-3 font-black text-[#142B5F]">Assignments / access review</h3><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Identity</th><th className="p-2">Role</th><th className="p-2">Assigned</th><th className="p-2">Action</th></tr></thead><tbody>{assignments.map(a=><tr key={a.id} className="border-t"><td className="p-2"><code>{a.identityId}</code></td><td className="p-2">{roleMap.get(a.roleId)?.name??a.roleId}</td><td className="p-2">{new Date(a.assignedAt).toLocaleString()}</td><td className="p-2"><button type="button" onClick={()=>void revoke(a)} className="rounded-lg border border-rose-200 px-2 py-1 font-bold text-rose-700">Revoke</button></td></tr>)}</tbody></table></section>
    <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
      <h3 className="font-black text-[#142B5F]">Break-glass emergency access</h3><p className="mt-1 text-xs text-[#203442]/60">Time-bounded (5–240 minutes), maker-checker approved, auditable, and automatically ignored by authorization after expiry.</p>
      <form onSubmit={grantEmergencyAccess} className="mt-3 grid gap-2 md:grid-cols-5"><input required value={emergencyPrincipalId} onChange={e=>setEmergencyPrincipalId(e.target.value)} placeholder="Principal ID" className="rounded-xl border p-2"/><select required value={emergencyRoleId} onChange={e=>setEmergencyRoleId(e.target.value)} className="rounded-xl border p-2"><option value="">Emergency role</option>{roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><input required minLength={12} value={emergencyReason} onChange={e=>setEmergencyReason(e.target.value)} placeholder="Emergency reason" className="rounded-xl border p-2"/><input type="number" min={5} max={240} value={emergencyDuration} onChange={e=>setEmergencyDuration(Number(e.target.value))} className="rounded-xl border p-2"/><button className="rounded-xl bg-amber-600 px-3 py-2 font-bold text-white">Grant</button></form>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Principal</th><th className="p-2">Role</th><th className="p-2">Expires</th><th className="p-2">Approver</th><th className="p-2">State</th></tr></thead><tbody>{emergencyGrants.map(g=><tr key={g.id} className="border-t"><td className="p-2"><code>{g.principalId}</code></td><td className="p-2">{roleMap.get(g.roleId)?.name??g.roleId}</td><td className="p-2">{new Date(g.expiresAt).toLocaleString()}</td><td className="p-2"><code>{g.approvedBy}</code></td><td className="p-2">{g.revokedAt?'REVOKED':new Date(g.expiresAt)<=new Date()?'EXPIRED':<button type="button" onClick={()=>void revokeEmergencyAccess(g)} className="rounded border border-rose-200 px-2 py-1 font-bold text-rose-700">Revoke</button>}</td></tr>)}</tbody></table></div>
    </section>
  </div>;
}
