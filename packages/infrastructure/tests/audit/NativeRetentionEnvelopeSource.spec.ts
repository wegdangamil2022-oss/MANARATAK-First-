import { readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { PrismaAuditWorkspaceGateway } from '../../src/audit/PrismaAuditWorkspaceGateway';
const source = readFileSync(
  new URL('../../prisma/migrations/20261012010000_audit_workspace/migration.sql', import.meta.url),
  'utf8',
);
describe('native retention source contract; does not execute SQL', () => {
  it('covers every INSERT while leaving existing audit events untouched', () => {
    expect(source).toContain('BEFORE INSERT ON "AuditRecord"');
    expect(source).toContain('NEW."retentionExpiresAt"');
    expect(source).toContain('UNCONFIGURED_RETAIN');
    expect(source).not.toMatch(/UPDATE\s+"AuditRecord"/);
    expect(source).not.toMatch(/DELETE\s+FROM\s+"AuditRecord"/);
  });
  it('declares all retention classes and preserves explicit owner durations', () => {
    for (const key of [
      'SECURITY_CRITICAL',
      'FINANCIAL',
      'IDENTITY_ACCESS',
      'AUTHENTICATION',
      'STANDARD_ADMIN',
    ])
      expect(source).toContain(key);
    expect(source).toContain('EXPLICIT_OWNER_DURATION');
    expect(source).toContain("IS DISTINCT FROM 'APPROVED_POLICY'");
    expect(source).toContain('data INTO policy');
  });
  it('refuses a lower-privilege workspace kind using the retention key', async () => {
    const db = { auditWorkspaceRecord: { create: vi.fn() }, $queryRaw: vi.fn() };
    const gateway = new PrismaAuditWorkspaceGateway(db as any, vi.fn());
    await expect(
      gateway.save({ id: 'audit-retention-policy', kind: 'CASE', version: 1, data: {} }, 0, {
        boundaryId: 'test',
        transactionClient: db,
      } as any),
    ).rejects.toThrow('NAMESPACE_INVALID');
    expect(db.auditWorkspaceRecord.create).not.toHaveBeenCalled();
  });
  it('refuses retention configuration when its native all-writer guard is absent', async () => {
    const db = {
      auditWorkspaceRecord: { create: vi.fn() },
      $queryRaw: vi.fn(async () => [{ installed: false }]),
    };
    const gateway = new PrismaAuditWorkspaceGateway(db as any, vi.fn());
    await expect(
      gateway.save(
        {
          id: 'audit-retention-policy',
          kind: 'RETENTION_POLICY',
          version: 1,
          data: { durations: {} },
        },
        0,
        { boundaryId: 'test', transactionClient: db } as any,
      ),
    ).rejects.toThrow('NOT_INSTALLED');
    expect(db.auditWorkspaceRecord.create).not.toHaveBeenCalled();
  });
});
