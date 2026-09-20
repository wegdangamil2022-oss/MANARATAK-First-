import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  AuditRecord,
  AuditId,
  AuditReference,
  AuditAction,
  AuditCategory,
  AuditSeverity,
  ActorReference,
  TargetReference,
  SourceReference,
  AuditTimestamp,
  ContextMetadata,
  ComplianceMetadata,
  CorrelationReference,
  TraceReference,
  AuditChainReference,
  AuditRetentionMetadata,
  AuditRecordQuerySpecification
} from '@manaratak/domain';
import { PrismaAuditRecordRepository, AuditRecordRow } from '../../src/audit/PrismaAuditRecordRepository';

describe('PrismaAuditRecordRepository', () => {
  let mockPrisma: any;
  let repository: PrismaAuditRecordRepository;

  beforeEach(() => {
    mockPrisma = {
      auditRecord: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn()
      }
    };
    repository = new PrismaAuditRecordRepository(mockPrisma as unknown as PrismaClient);
  });

  const createSampleAuditRecord = (passwordValue = 'secret123') => {
    return AuditRecord.create(
      AuditId.create('audit-record-1'),
      AuditReference.create('AUD-2026-0001'),
      AuditAction.create('USER_LOGIN'),
      AuditCategory.create('AUTHENTICATION'),
      AuditSeverity.create('INFO'),
      ActorReference.create('user-100', 'IDENTITY'),
      TargetReference.create('system-portal', 'SYSTEM'),
      SourceReference.create('192.168.1.1'),
      AuditTimestamp.create(new Date('2026-07-29T10:00:00Z')),
      ContextMetadata.create({
        ip: '192.168.1.1',
        password: passwordValue,
        userAgent: 'Mozilla/5.0'
      }),
      ComplianceMetadata.create(['GDPR', 'HIPAA']),
      CorrelationReference.create('corr-888'),
      TraceReference.create('trace-999'),
      AuditChainReference.create(AuditReference.create('AUD-2026-0000')),
      AuditRetentionMetadata.create(90, new Date('2026-07-29T10:00:00Z'))
    );
  };

  it('saves an audit record and sanitizes sensitive metadata before persistence', async () => {
    const record = createSampleAuditRecord('super-secret-password');

    await repository.save(record);

    expect(mockPrisma.auditRecord.create).toHaveBeenCalledTimes(1);
    const createArgs = mockPrisma.auditRecord.create.mock.calls[0][0];

    expect(createArgs.data.id).toBe('audit-record-1');
    expect(createArgs.data.reference).toBe('AUD-2026-0001');
    expect(createArgs.data.action).toBe('USER_LOGIN');
    expect(createArgs.data.category).toBe('AUTHENTICATION');
    expect(createArgs.data.severity).toBe('INFO');
    expect(createArgs.data.actorId).toBe('user-100');
    expect(createArgs.data.actorType).toBe('IDENTITY');
    expect(createArgs.data.targetId).toBe('system-portal');
    expect(createArgs.data.targetType).toBe('SYSTEM');
    expect(createArgs.data.source).toBe('192.168.1.1');
    expect(createArgs.data.complianceMetadata).toEqual(['GDPR', 'HIPAA']);
    expect(createArgs.data.correlationReference).toBe('corr-888');
    expect(createArgs.data.traceReference).toBe('trace-999');
    expect(createArgs.data.chainReference).toBe('AUD-2026-0000');
    expect(createArgs.data.retentionPeriodInDays).toBe(90);

    // Verify secret sanitization in persisted payload
    expect(createArgs.data.contextMetadata.ip).toBe('192.168.1.1');
    expect(createArgs.data.contextMetadata.userAgent).toBe('Mozilla/5.0');
    expect(createArgs.data.contextMetadata.password).toBe('[REDACTED]');
  });

  it('rejects duplicate append attempts instead of updating historical evidence', async () => {
    mockPrisma.auditRecord.create.mockRejectedValue({ code: 'P2002' });
    await expect(repository.save(createSampleAuditRecord())).rejects.toThrow('AUDIT_APPEND_ONLY_DUPLICATE');
  });

  it('saves through the supplied transaction client for atomic mutations', async () => {
    const transactionCreate = vi.fn();
    const record = createSampleAuditRecord();

    await repository.saveInTransaction(record, {
      boundaryId: 'boundary-1',
      transactionClient: { auditRecord: { create: transactionCreate } }
    } as any);

    expect(transactionCreate).toHaveBeenCalledOnce();
    expect(mockPrisma.auditRecord.create).not.toHaveBeenCalled();
  });

  it('rejects atomic save without a transaction client', async () => {
    await expect(repository.saveInTransaction(createSampleAuditRecord(), { boundaryId: 'boundary-1' }))
      .rejects.toThrow('AUDIT_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
  });

  it('queries audit records via specification and maps Prisma rows to domain objects', async () => {
    const sampleRow: AuditRecordRow = {
      id: 'audit-record-1',
      reference: 'AUD-2026-0001',
      action: 'USER_LOGIN',
      category: 'AUTHENTICATION',
      severity: 'INFO',
      actorId: 'user-100',
      actorType: 'IDENTITY',
      targetId: 'system-portal',
      targetType: 'SYSTEM',
      source: '192.168.1.1',
      timestamp: new Date('2026-07-29T10:00:00Z'),
      contextMetadata: {
        ip: '192.168.1.1',
        password: 'rawSecretPassword'
      },
      complianceMetadata: ['GDPR'],
      correlationReference: 'corr-888',
      traceReference: 'trace-999',
      chainReference: 'AUD-2026-0000',
      retentionPeriodInDays: 90,
      retentionExpiresAt: new Date('2026-10-27T10:00:00Z'),
      lifecycleState: 'RECORDED',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockPrisma.auditRecord.findMany.mockResolvedValue([sampleRow]);

    const spec = new AuditRecordQuerySpecification({
      actorId: 'user-100',
      action: 'USER_LOGIN'
    });

    const results = await repository.findBy(spec);

    expect(results).toHaveLength(1);
    const domainRecord = results[0];

    expect(domainRecord.getId().getValue()).toBe('audit-record-1');
    expect(domainRecord.getReference().getValue()).toBe('AUD-2026-0001');
    expect(domainRecord.getAction().getValue()).toBe('USER_LOGIN');
    expect(domainRecord.getActor().getActorId()).toBe('user-100');
    expect(domainRecord.getContextMetadata().getData().password).toBe('[REDACTED]');
    expect(domainRecord.getComplianceMetadata()?.getRegulatoryTags()).toEqual(['GDPR']);
    expect(domainRecord.getCorrelationReference()?.getValue()).toBe('corr-888');
  });
});
