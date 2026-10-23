import { describe, expect, it, vi } from 'vitest';
import { PrismaUniversityImportChangeExecutorGateway } from '../../src/universities/PrismaUniversityImportChangeExecutorGateway';

function authorized<T extends object>(transaction: T) {
  return Object.assign(transaction, {
    identityRecord: { findUnique: vi.fn().mockResolvedValue({ id: 'admin-1', status: 'ACTIVE', deletedAt: null, user: { isEmailVerified: true }, account: { accessState: 'Active' } }) },
    roleAssignmentRecord: { findMany: vi.fn().mockResolvedValue([{ id: 'assignment', identityId: 'admin-1', roleId: 'importer', assignedAt: new Date() }]) },
    roleRecord: { findUnique: vi.fn().mockResolvedValue({ id: 'importer', name: 'Importer', description: 'Test fixture', permissions: ['admin:imports:manage', 'admin:universities:manage'], policyIds: [], createdAt: new Date(), updatedAt: new Date() }) },
    policyRecord: { findUnique: vi.fn().mockResolvedValue(null) },
  });
}

describe('PrismaUniversityImportChangeExecutorGateway', () => {
  it.each(['unknown', 'unverified', 'inactive', 'student', 'imports-only', 'university-only', 'policy-denied'])('denies %s for apply and rollback before reading receipts', async kind => {
    for (const mode of ['apply', 'rollback']) {
      const tx = authorized({
        $queryRaw: vi.fn().mockResolvedValue([]),
        universityImportChangeSet: { findUnique: vi.fn() },
      });
      if (kind === 'unknown') tx.identityRecord.findUnique.mockResolvedValue(null);
      if (kind === 'unverified') tx.identityRecord.findUnique.mockResolvedValue({ status: 'ACTIVE', user: { isEmailVerified: false }, account: { accessState: 'Active' } });
      if (kind === 'inactive') tx.identityRecord.findUnique.mockResolvedValue({ status: 'DISABLED', user: { isEmailVerified: true }, account: { accessState: 'Active' } });
      const permissions = kind === 'imports-only' ? ['admin:imports:manage'] : kind === 'university-only' ? ['admin:universities:manage'] : [];
      if (['student', 'imports-only', 'university-only', 'policy-denied'].includes(kind)) tx.roleRecord.findUnique.mockResolvedValue({ id: 'importer', name: 'Importer', description: '', permissions: kind === 'policy-denied' ? ['admin:*'] : permissions, policyIds: kind === 'policy-denied' ? ['missing-policy'] : [], createdAt: new Date(), updatedAt: new Date() });
      const gateway = new PrismaUniversityImportChangeExecutorGateway({ $transaction: async work => work(tx) } as never);
      const plan = { changeSetId: 'STAGE_1:fixture', stage: 'STAGE_1' as const, sourceArtifactId: 'fixture', validationIssues: [], changes: [], databaseWrites: 0 as const };
      await expect(mode === 'apply' ? gateway.apply(plan, 'admin-1') : gateway.rollback(plan.changeSetId, 'admin-1')).rejects.toThrow(/UNIVERSITY_IMPORT_(VERIFIED_ACTIVE_ACTOR_REQUIRED|ACTOR_PERMISSION_DENIED)/);
      expect(tx.universityImportChangeSet.findUnique).not.toHaveBeenCalled();
    }
  });

  it('reauthorizes a replay and locks persisted authorization rows in its transaction', async () => {
    const tx = authorized({ $queryRaw: vi.fn().mockResolvedValue([]), universityImportChangeSet: { findUnique: vi.fn().mockResolvedValue({ id: 'STAGE_1:fixture', state: 'APPLIED', changes: [] }) } });
    const gateway = new PrismaUniversityImportChangeExecutorGateway({ $transaction: async work => work(tx) } as never);
    const plan = { changeSetId: 'STAGE_1:fixture', stage: 'STAGE_1' as const, sourceArtifactId: 'fixture', validationIssues: [], changes: [], databaseWrites: 0 as const };
    await expect(gateway.apply(plan, 'admin-1')).resolves.toMatchObject({ appliedChanges: 0 });
    const locks = tx.$queryRaw.mock.calls.map(([query]) => query.sql ?? '').join('\n');
    expect(locks).toContain('FOR SHARE'); expect(locks).toContain('RoleAssignmentRecord'); expect(locks).toContain('PolicyRecord');
    tx.roleAssignmentRecord.findMany.mockResolvedValue([]);
    await expect(gateway.apply(plan, 'admin-1')).rejects.toThrow('ACTOR_PERMISSION_DENIED');
    expect(tx.universityImportChangeSet.findUnique).toHaveBeenCalledTimes(1);
  });
  it('rejects a root University whose valid geography ids have incompatible parents', async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      universityImportChangeSet: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn() },
      universityImportChange: { create: vi.fn() },
      university: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
      referenceCountry: { findUnique: vi.fn().mockResolvedValue({ iso2Code: 'YE', isActive: true, lifecycleState: 'ACTIVE' }) },
      administrativeRegion: { findUnique: vi.fn().mockResolvedValue({ countryIso2Code: 'SA', lifecycleState: 'ACTIVE' }) },
      referenceCity: { findUnique: vi.fn().mockResolvedValue({ countryIso2Code: 'YE', administrativeRegionId: 'region-ye', isActive: true, lifecycleState: 'ACTIVE' }) },
    };
    const prisma = { $transaction: vi.fn(async (work) => work(authorized(transaction))) };
    const gateway = new PrismaUniversityImportChangeExecutorGateway(prisma as never);
    const plan = {
      changeSetId: 'STAGE_1:bad-geography', stage: 'STAGE_1' as const, sourceArtifactId: 'artifact', validationIssues: [], databaseWrites: 0 as const,
      changes: [{ sequence: 1, sourceReferenceId: 'INS-YEM-0001', entityType: 'UNIVERSITY' as const, entityKey: 'INS-YEM-0001', operation: 'CREATE' as const,
        afterState: { officialEnglishName: 'Yemen University', countryReferenceId: 'country-ye', regionReferenceId: 'region-sa', cityReferenceId: 'city-ye' } }],
    };
    await expect(gateway.apply(plan, 'admin-1')).rejects.toThrow('UNIVERSITY_CAMPUS_REGION_COUNTRY_MISMATCH');
    expect(transaction.university.create).not.toHaveBeenCalled();
  });

  it('applies university, provenance, audit, and outbox in one transaction', async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      universityImportChangeSet: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn(),
      },
      universityImportChange: { create: vi.fn() },
      university: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'db-uni-1', publicId: 'INS-DZA-0001' }),
        create: vi.fn().mockResolvedValue({
          id: 'db-uni-1',
          publicId: 'INS-DZA-0001',
          displayName: 'University of Algiers',
        }),
      },
      universitySourceRecord: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'source-1', sourceHash: 'hash-1' }),
      },
      auditRecord: { create: vi.fn() },
      transactionalOutboxRecord: { create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn(async (work) => work(authorized(transaction))) };
    const gateway = new PrismaUniversityImportChangeExecutorGateway(prisma as never);
    const plan = {
      changeSetId: 'STAGE_1:artifact-1',
      stage: 'STAGE_1' as const,
      sourceArtifactId: 'artifact-1',
      validationIssues: [],
      databaseWrites: 0 as const,
      changes: [
        {
          sequence: 1,
          sourceReferenceId: 'INS-DZA-0001',
          entityType: 'UNIVERSITY' as const,
          entityKey: 'INS-DZA-0001',
          operation: 'CREATE' as const,
          afterState: { officialEnglishName: 'University of Algiers', country: 'Algeria' },
        },
        {
          sequence: 2,
          sourceReferenceId: 'INS-DZA-0001',
          entityType: 'SOURCE_RECORD' as const,
          entityKey: 'handoff-1',
          operation: 'UPSERT_CHILD' as const,
          afterState: { sourceRowNumber: 1, contentHash: 'hash-1' },
        },
      ],
    };

    await expect(gateway.apply(plan, 'admin-1')).resolves.toEqual({
      changeSetId: plan.changeSetId,
      appliedChanges: 2,
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(transaction.universityImportChange.create).toHaveBeenCalledTimes(2);
    expect(transaction.auditRecord.create).toHaveBeenCalledOnce();
    expect(transaction.transactionalOutboxRecord.create).toHaveBeenCalledOnce();
    expect(transaction.universitySourceRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ sourceIdentityKey: 'STAGE_1|artifact-1|row:1' }),
    }));
  });

  it('fails closed when immutable source provenance belongs to another University', async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      universityImportChangeSet: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn() },
      universityImportChange: { create: vi.fn() },
      university: { findUnique: vi.fn().mockResolvedValue({ id: 'db-uni-1', publicId: 'INS-DZA-0001' }) },
      universitySourceRecord: {
        findUnique: vi.fn().mockResolvedValue({ id: 'source-1', universityId: 'db-uni-OTHER' }),
        update: vi.fn(), create: vi.fn(),
      },
    };
    const prisma = { $transaction: vi.fn(async (work) => work(authorized(transaction))) };
    const gateway = new PrismaUniversityImportChangeExecutorGateway(prisma as never);
    const plan = {
      changeSetId: 'STAGE_3:artifact-1', stage: 'STAGE_3' as const, sourceArtifactId: 'artifact-1', validationIssues: [], databaseWrites: 0 as const,
      changes: [{ sequence: 1, sourceReferenceId: 'INS-DZA-0001', entityType: 'SOURCE_RECORD' as const, entityKey: 'handoff-1', operation: 'UPSERT_CHILD' as const, afterState: { sourceRowNumber: 1, contentHash: 'hash-1' } }],
    };
    await expect(gateway.apply(plan, 'admin-1')).rejects.toThrow('UNIVERSITY_SOURCE_PROVENANCE_OWNERSHIP_MISMATCH');
    expect(transaction.universitySourceRecord.update).not.toHaveBeenCalled();
  });

  it('keeps a program without canonical DegreeLevel in review instead of inferring from university-level degrees', async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      universityImportChangeSet: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn() },
      universityImportChange: { create: vi.fn() },
      university: {
        findUnique: vi.fn().mockResolvedValue({ id: 'db-uni-1', publicId: 'INS-DZA-0001' }),
      },
      universityAcademicProgram: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'program-1', status: 'REVIEW_REQUIRED' }),
      },
      auditRecord: { create: vi.fn() },
      transactionalOutboxRecord: { create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn(async (work) => work(authorized(transaction))) };
    const gateway = new PrismaUniversityImportChangeExecutorGateway(prisma as never);
    const plan = {
      changeSetId: 'STAGE_3:artifact-3',
      stage: 'STAGE_3' as const,
      sourceArtifactId: 'artifact-3',
      validationIssues: [],
      databaseWrites: 0 as const,
      changes: [
        {
          sequence: 1,
          sourceReferenceId: 'INS-DZA-0001',
          entityType: 'ACADEMIC_PROGRAM' as const,
          entityKey: 'INS-DZA-0001:program:computer-science',
          operation: 'UPSERT_CHILD' as const,
          afterState: { sourceProgramName: 'Computer Science', status: 'REVIEW_REQUIRED' },
        },
      ],
    };
    await expect(gateway.apply(plan, 'admin-1')).resolves.toEqual({
      changeSetId: plan.changeSetId,
      appliedChanges: 1,
    });
    expect(transaction.universityAcademicProgram.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          degreeLevelId: undefined,
          status: 'REVIEW_REQUIRED',
        }),
      }),
    );
  });

  it('resolves tuition currency through canonical ReferenceCurrency while preserving source currencyCode', async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      universityImportChangeSet: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn() },
      universityImportChange: { create: vi.fn() },
      university: {
        findUnique: vi.fn().mockResolvedValue({ id: 'db-uni-1', publicId: 'INS-DZA-0001' }),
      },
      referenceCurrency: {
        findUnique: vi.fn().mockResolvedValue({ id: 'currency-usd', isoCode: 'USD', isActive: true, lifecycleState: 'ACTIVE' }),
      },
      universityTuitionProfile: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'tuition-1', currencyReferenceId: 'currency-usd' }),
      },
      auditRecord: { create: vi.fn() },
      transactionalOutboxRecord: { create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn(async (work) => work(authorized(transaction))) };
    const gateway = new PrismaUniversityImportChangeExecutorGateway(prisma as never);
    const plan = {
      changeSetId: 'STAGE_4:artifact-4',
      stage: 'STAGE_4' as const,
      sourceArtifactId: 'artifact-4',
      validationIssues: [],
      databaseWrites: 0 as const,
      changes: [{
        sequence: 1,
        sourceReferenceId: 'INS-DZA-0001',
        entityType: 'TUITION' as const,
        entityKey: 'INS-DZA-0001:tuition:general',
        operation: 'UPSERT_CHILD' as const,
        afterState: { annualTuitionFee: 1200, currencyCode: 'usd' },
      }],
    };

    await expect(gateway.apply(plan, 'admin-1')).resolves.toEqual({
      changeSetId: plan.changeSetId,
      appliedChanges: 1,
    });
    expect(transaction.referenceCurrency.findUnique).toHaveBeenCalledWith({
      where: { isoCode: 'USD' },
      select: { id: true, isoCode: true, isActive: true, lifecycleState: true },
    });
    expect(transaction.universityTuitionProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currencyCode: 'usd',
          currencyReferenceId: 'currency-usd',
        }),
      }),
    );
  });

  it('rolls back created records in reverse order with audit and outbox evidence', async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      universityImportChangeSet: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'STAGE_1:artifact-1',
          state: 'APPLIED',
          changes: [
            {
              sequence: 2,
              entityType: 'SOURCE_RECORD',
              entityId: 'source-1',
              operation: 'CREATE',
              beforeState: null,
            },
            {
              sequence: 1,
              entityType: 'UNIVERSITY',
              entityId: 'db-uni-1',
              operation: 'CREATE',
              beforeState: null,
            },
          ],
        }),
        update: vi.fn(),
      },
      universitySourceRecord: { delete: vi.fn() },
      university: { delete: vi.fn() },
      auditRecord: { create: vi.fn() },
      transactionalOutboxRecord: { create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn(async (work) => work(authorized(transaction))) };
    const gateway = new PrismaUniversityImportChangeExecutorGateway(prisma as never);

    await expect(gateway.rollback('STAGE_1:artifact-1', 'admin-1')).resolves.toEqual({
      changeSetId: 'STAGE_1:artifact-1',
      revertedChanges: 2,
    });
    expect(transaction.universitySourceRecord.delete).toHaveBeenCalledBefore(
      transaction.university.delete,
    );
    expect(transaction.auditRecord.create).toHaveBeenCalledOnce();
    expect(transaction.transactionalOutboxRecord.create).toHaveBeenCalledOnce();
  });
});
