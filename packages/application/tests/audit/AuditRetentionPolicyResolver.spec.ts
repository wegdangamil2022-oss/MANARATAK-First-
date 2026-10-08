import { describe, expect, it } from 'vitest';
import { AuditRetentionPolicyResolver } from '../../src/audit/use-cases/AuditRetentionPolicyResolver';
import { createAuditRecordFromDto } from '../../src/audit/use-cases/AuditRecordFactory';

const dto = { id: 'audit-1', reference: 'AUD-1', action: 'ROLE_ASSIGNED', category: 'AUTHORIZATION_MUTATION',
  severity: 'INFO', actorId: 'operator', actorType: 'IDENTITY', targetId: 'role-1', targetType: 'ROLE',
  source: 'admin-api', timestamp: new Date('2026-10-01T00:00:00Z'), contextMetadata: {} };

describe('central audit retention policy', () => {
  it.each([
    ['FINANCE_MUTATION', 'FINANCIAL'], ['AUTHORIZATION_MUTATION', 'IDENTITY_ACCESS'],
    ['IDENTITY', 'IDENTITY_ACCESS'], ['AUTHENTICATION', 'AUTHENTICATION'],
    ['CRITICAL_MUTATION', 'SECURITY_CRITICAL'], ['CMS_MUTATION', 'STANDARD_ADMIN'],
  ])('classifies %s without inventing an expiry', (category, expected) => {
    const resolver = new AuditRetentionPolicyResolver();
    expect(resolver.resolve({ category, severity: 'INFO' })).toMatchObject({
      retentionClass: expected, status: 'UNCONFIGURED_RETAIN', retentionPeriodInDays: undefined,
    });
    const record = createAuditRecordFromDto({ ...dto, category });
    expect(record.getRetentionMetadata()).toBeUndefined();
    expect(record.getContextMetadata().getData()).toMatchObject({
      auditRetention: { retentionClass: expected, status: 'UNCONFIGURED_RETAIN' },
    });
  });

  it('uses an explicitly configured policy and protects its metadata from spoofing', () => {
    const resolver = new AuditRetentionPolicyResolver({ IDENTITY_ACCESS: 90 });
    const record = createAuditRecordFromDto({ ...dto, contextMetadata: {
      auditRetention: { retentionClass: 'FINANCIAL', status: 'APPROVED_POLICY' },
    } }, resolver);
    expect(record.getRetentionMetadata()?.getRetentionPeriodInDays()).toBe(90);
    expect(record.getContextMetadata().getData().auditRetention).toEqual({ retentionClass: 'IDENTITY_ACCESS', status: 'APPROVED_POLICY' });
  });

  it('preserves trusted owner durations and rejects invalid configuration', () => {
    expect(createAuditRecordFromDto({ ...dto, retentionPeriodInDays: 120 }).getRetentionMetadata()?.getRetentionPeriodInDays()).toBe(120);
    for (const days of [0, -1, NaN, Infinity, 1.5]) {
      expect(() => new AuditRetentionPolicyResolver({ FINANCIAL: days })).toThrow('AUDIT_RETENTION_DURATION_INVALID');
    }
  });
});
