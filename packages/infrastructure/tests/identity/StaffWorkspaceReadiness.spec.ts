import { describe, it, expect, vi } from 'vitest';
import { PrismaStaffWorkspaceRepository } from '../../src/identity/PrismaStaffWorkspaceRepository';
const tables = [
  'StaffDepartmentRecord',
  'StaffJobTitleRecord',
  'StaffMembershipRecord',
  'StaffLifecycleEventRecord',
];
describe('staff storage readiness fail closed', () => {
  it('reports missing tables rather than inventing an empty staff count', async () => {
    const db = {
      $queryRaw: vi.fn(async () =>
        tables.map((name) => ({ name, present: false, permitted: false })),
      ),
      staffMembershipRecord: { findMany: vi.fn() },
    };
    const result = await new PrismaStaffWorkspaceRepository(db as any).readiness();
    expect(result.ready).toBe(false);
    expect(result.missingTables).toEqual(tables);
    expect(result.capabilities.drafts).toBe(false);
    expect(db.staffMembershipRecord.findMany).not.toHaveBeenCalled();
  });
  it('requires the application database role privileges as well as table presence', async () => {
    const db = {
      $queryRaw: vi.fn(async () =>
        tables.map((name) => ({
          name,
          present: true,
          permitted: name !== 'StaffMembershipRecord',
        })),
      ),
    };
    const result = await new PrismaStaffWorkspaceRepository(db as any).readiness();
    expect(result.ready).toBe(false);
    expect(result.missingTables).toEqual([]);
    expect(result.missingPrivileges).toEqual(['StaffMembershipRecord']);
  });
  it('never enables invitation, activation or offboarding merely because draft tables exist', async () => {
    const db = {
      $queryRaw: vi.fn(async () =>
        tables.map((name) => ({ name, present: true, permitted: true })),
      ),
    };
    const result = await new PrismaStaffWorkspaceRepository(db as any).readiness();
    expect(result.ready).toBe(true);
    expect(result.capabilities).toEqual({
      drafts: true,
      organization: true,
      invitations: false,
      activation: false,
      offboarding: false,
    });
  });
});
