import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

export type AdminBootstrapVerificationStatus = 'READY' | 'DEGRADED' | 'UNAVAILABLE';

export interface AdminBootstrapVerificationReport {
  status: AdminBootstrapVerificationStatus;
  checkedAt: string;
  capability: 'PERSISTED_RBAC_ADMIN_BOOTSTRAP';
  counts: { adminRoles: number; activeAssignments: number; inactiveAssignments: number; missingRoleAssignments: number };
  requiredPermissions: string[];
  missingPermissions: string[];
  identityFingerprints: string[];
  databaseWrites: 0;
}

export class AdminBootstrapVerifier {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly requiredPermissions: string[] = ['admin:authorization:manage'],
  ) {}

  public async verify(): Promise<AdminBootstrapVerificationReport> {
    const checkedAt = new Date().toISOString();
    const client = this.prisma as any;
    if (!client?.roleRecord?.findMany || !client?.roleAssignmentRecord?.findMany || !client?.identityRecord?.findMany) {
      return this.report('UNAVAILABLE', checkedAt);
    }

    try {
      const [roles, assignments, identities] = await Promise.all([
        client.roleRecord.findMany(),
        client.roleAssignmentRecord.findMany(),
        client.identityRecord.findMany({ select: { id: true, status: true, deletedAt: true } }),
      ]);
      const roleMap = new Map<string, string[]>(roles.map((role: any) => [role.id, this.permissions(role.permissions)]));
      const adminRoleIds = new Set<string>(roles.filter((role: any) => this.isAdminRole(role, roleMap.get(role.id) ?? [])).map((role: any) => role.id));
      const identityMap = new Map<string, any>(identities.map((identity: any) => [identity.id, identity]));
      let activeAssignments = 0;
      let inactiveAssignments = 0;
      let missingRoleAssignments = 0;
      const fingerprints = new Set<string>();

      for (const assignment of assignments) {
        if (!roleMap.has(assignment.roleId)) {
          missingRoleAssignments += 1;
          continue;
        }
        if (!adminRoleIds.has(assignment.roleId)) continue;
        const identity = identityMap.get(assignment.identityId);
        if (identity && identity.status === 'ACTIVE' && !identity.deletedAt) {
          activeAssignments += 1;
          fingerprints.add(this.fingerprint(assignment.identityId));
        } else {
          inactiveAssignments += 1;
        }
      }

      const granted = new Set([...adminRoleIds].flatMap(id => roleMap.get(id) ?? []));
      const missingPermissions = this.requiredPermissions.filter(permission => !this.isPermissionCovered(permission, granted));
      const status: AdminBootstrapVerificationStatus = adminRoleIds.size > 0 && activeAssignments > 0 && missingPermissions.length === 0 && missingRoleAssignments === 0
        ? 'READY'
        : 'DEGRADED';
      return {
        status, checkedAt, capability: 'PERSISTED_RBAC_ADMIN_BOOTSTRAP',
        counts: { adminRoles: adminRoleIds.size, activeAssignments, inactiveAssignments, missingRoleAssignments },
        requiredPermissions: [...this.requiredPermissions], missingPermissions,
        identityFingerprints: [...fingerprints].sort(), databaseWrites: 0,
      };
    } catch {
      return this.report('UNAVAILABLE', checkedAt);
    }
  }

  private report(status: AdminBootstrapVerificationStatus, checkedAt: string): AdminBootstrapVerificationReport {
    return { status, checkedAt, capability: 'PERSISTED_RBAC_ADMIN_BOOTSTRAP', counts: { adminRoles: 0, activeAssignments: 0, inactiveAssignments: 0, missingRoleAssignments: 0 }, requiredPermissions: [...this.requiredPermissions], missingPermissions: [...this.requiredPermissions], identityFingerprints: [], databaseWrites: 0 };
  }

  private permissions(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
  private isAdminRole(role: any, permissions: string[]): boolean { return /(^|[\s_-])(owner|admin)([\s_-]|$)/i.test(String(role.name ?? role.id)) || permissions.some(permission => permission === '*' || permission.startsWith('admin:')); }
  private isPermissionCovered(required: string, granted: Set<string>): boolean { return granted.has('*') || granted.has(required) || granted.has('admin:*'); }
  private fingerprint(identityId: string): string { return createHash('sha256').update(identityId).digest('hex').slice(0, 16); }
}
