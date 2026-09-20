import { describe, expect, it } from 'vitest';
import { AdminBootstrapVerifier } from '../../src/authorization/AdminBootstrapVerifier';

describe('AdminBootstrapVerifier', () => {
  it('reports READY for an active persisted admin assignment without exposing identity IDs', async () => {
    const prisma = client({
      roles: [{ id: 'role-owner', name: 'Project Owner', permissions: ['admin:*'] }],
      assignments: [{ id: 'assignment-1', identityId: 'identity-secret-id', roleId: 'role-owner' }],
      identities: [{ id: 'identity-secret-id', status: 'ACTIVE', deletedAt: null }],
    });
    const report = await new AdminBootstrapVerifier(prisma as any).verify();

    expect(report.status).toBe('READY');
    expect(report.counts.activeAssignments).toBe(1);
    expect(report.identityFingerprints).toHaveLength(1);
    expect(JSON.stringify(report)).not.toContain('identity-secret-id');
    expect(report.databaseWrites).toBe(0);
  });

  it('reports DEGRADED when the admin role has no active identity assignment', async () => {
    const prisma = client({ roles: [{ id: 'role-admin', name: 'Admin', permissions: ['admin:*'] }], assignments: [], identities: [] });
    const report = await new AdminBootstrapVerifier(prisma as any).verify();
    expect(report.status).toBe('DEGRADED');
  });

  it('reports UNAVAILABLE instead of fake success without persisted repositories', async () => {
    const report = await new AdminBootstrapVerifier({} as any).verify();
    expect(report.status).toBe('UNAVAILABLE');
    expect(report.missingPermissions).toContain('admin:authorization:manage');
  });
});

function client(input: { roles: any[]; assignments: any[]; identities: any[] }) {
  return {
    roleRecord: { findMany: async () => input.roles },
    roleAssignmentRecord: { findMany: async () => input.assignments },
    identityRecord: { findMany: async () => input.identities },
  };
}
