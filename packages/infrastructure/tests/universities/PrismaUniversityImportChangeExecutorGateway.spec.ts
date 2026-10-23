import { sealUniversityImportPlan, universityImportContentHash, type UniversityImportChangePlan } from '../../../application/src/universities/use-cases/UniversityImportChangePlan';
import { describe, expect, it, vi } from 'vitest';
import { PrismaUniversityImportChangeExecutorGateway } from '../../src/universities/PrismaUniversityImportChangeExecutorGateway';
import { planUniversityScreenedSources, reviewUniversityScreeningPlan } from '@manaratak/application';

function sealed(plan: UniversityImportChangePlan) { return Object.assign(plan, sealUniversityImportPlan(plan)); }

function authorized<T extends object>(transaction: T) {
  return Object.assign(transaction, {
    identityRecord: { findUnique: vi.fn().mockResolvedValue({ id: 'admin-1', status: 'ACTIVE', deletedAt: null, user: { isEmailVerified: true }, account: { accessState: 'Active' } }) },
    roleAssignmentRecord: { findMany: vi.fn().mockResolvedValue([{ id: 'assignment', identityId: 'admin-1', roleId: 'importer', assignedAt: new Date() }]) },
    roleRecord: { findUnique: vi.fn().mockResolvedValue({ id: 'importer', name: 'Importer', description: 'Test fixture', permissions: ['admin:imports:manage', 'admin:universities:manage'], policyIds: [], createdAt: new Date(), updatedAt: new Date() }) },
    policyRecord: { findUnique: vi.fn().mockResolvedValue(null) },
  });
}

describe('PrismaUniversityImportChangeExecutorGateway', () => {
  it('preserves current identity and optional fields in the initial Stage 2 founding-year slice', async () => {
    const original = { id: 'owner', publicId: 'INS-DZA-0001', displayName: 'Later owner name', status: 'READY_TO_REVIEW', optionalFields: { preserve: 'manual data' }, updatedAt: new Date('2026-10-23T01:00:00.000Z') };
    const tx = authorized({ $queryRaw: vi.fn().mockResolvedValue([]),
      universityImportChangeSet: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn() }, universityImportChange: { create: vi.fn() },
      university: { findUnique: vi.fn().mockResolvedValue(original), update: vi.fn().mockResolvedValue({ ...original, foundedYear: 1900 }) },
      auditRecord: { create: vi.fn() }, transactionalOutboxRecord: { create: vi.fn() },
    });
    const plan = sealed({ changeSetId: '', stage: 'STAGE_2', sourceArtifactId: 'stage2', validationIssues: [], databaseWrites: 0,
      changes: [{ sequence: 1, sourceReferenceId: original.publicId, entityType: 'UNIVERSITY', entityKey: original.id, operation: 'UPDATE',
        beforeState: { id: original.id, updatedAt: original.updatedAt.toISOString(), stateHash: universityImportContentHash(original) },
        afterState: { foundedYear: 1900, universityName: 'Historical source name', country: 'Historical country' } }] });
    await new PrismaUniversityImportChangeExecutorGateway({ $transaction: async work => work(tx) } as never).apply(plan, 'admin-1');
    expect(tx.university.update).toHaveBeenCalledWith({ where: { id: 'owner' }, data: { foundedYear: 1900, status: 'READY_TO_REVIEW', completenessStatus: 'NEEDS_REVIEW' } });
    expect(tx.$queryRaw.mock.calls.some(([query]) => Array.isArray(query) && query.join('').includes('FOR UPDATE'))).toBe(true);
  });
  it.each(['missing', 'changed', 'replacement', 'same-time-edit'])('rejects an unsafe Stage 2 owner snapshot before mutation: %s', async kind => {
    const original = { id: 'owner', publicId: 'INS-DZA-0001', displayName: 'Existing', status: 'READY_TO_REVIEW', updatedAt: new Date('2026-10-23T01:00:00.000Z') };
    const tx = authorized({ $queryRaw: vi.fn().mockResolvedValue([]),
      universityImportChangeSet: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
      university: { findUnique: vi.fn().mockResolvedValue({ ...original, ...(kind === 'replacement' ? { id: 'replacement' } : {}),
        ...(kind === 'same-time-edit' ? { displayName: 'Manual edit without timestamp change' } : {}), ...(kind === 'changed' ? { updatedAt: new Date('2026-10-23T01:00:01.000Z') } : {}) }), update: vi.fn() },
    });
    const gateway = new PrismaUniversityImportChangeExecutorGateway({ $transaction: async work => work(tx) } as never);
    const plan = sealed({ changeSetId: '', stage: 'STAGE_2', sourceArtifactId: 'stage2', validationIssues: [], databaseWrites: 0,
      changes: [{ sequence: 1, sourceReferenceId: 'INS-DZA-0001', entityType: 'UNIVERSITY', entityKey: 'owner', operation: 'UPDATE',
        ...(kind !== 'missing' ? { beforeState: { id: 'owner', updatedAt: original.updatedAt.toISOString(), stateHash: universityImportContentHash(original) } } : {}), afterState: { foundedYear: 1900 } }] });
    await expect(gateway.apply(plan, 'admin-1')).rejects.toThrow(kind === 'missing' ? 'UNIVERSITY_ENRICHMENT_VERSION_REQUIRED' : 'UNIVERSITY_ENRICHMENT_CONFLICT');
    expect(tx.university.update).not.toHaveBeenCalled();
  });
  it.each(['payload-tamper', 'receipt-drift', 'asset-retired', 'different-reviewer'])('rechecks reviewed source evidence before any canonical write: %s', async kind => {
    const binding = { sourceReferenceId: 'INS-DZA-0001', receiptId: 'receipt', requestHash: 'a'.repeat(64), assetId: 'asset', artifactSha256: 'b'.repeat(64) };
    const receipt = { id: binding.receiptId, ownerDomain: 'UNIVERSITIES', requestHash: binding.requestHash, result: {
      stageState: 'STAGED_COMPLETE', promotion: { automatic: false, publication: false, state: 'MANUAL_REVIEW_REQUIRED' },
      normalizedPayload: { sourceReferenceId: binding.sourceReferenceId, universityName: 'Source University', country: 'Algeria', countryIso3: 'DZA', institutionType: 'UNIVERSITY',
        metadata: { sourceWorkbookSha256: 'c'.repeat(64), rawRowSha256: 'd'.repeat(64), sourceRowNumber: 1 } },
      evidence: { artifact: { artifactId: 'asset' }, referenceMetadata: { artifactSha256: binding.artifactSha256 }, validation: { state: 'VALID' } },
    } };
    const asset = { id: 'asset', lifecycleState: 'ACTIVE', securityClassification: 'INTERNAL', checksumAlgorithm: 'SHA256', checksumHash: binding.artifactSha256, retentionExpiresAt: null, deletedAt: null, purgedAt: null };
    const [preview] = await planUniversityScreenedSources({ read: async () => ({ receipt, asset, existingUniversity: null }) }, [binding]);
    const plan = reviewUniversityScreeningPlan(preview, { previewPlanHash: preview.planHash!, reviewedBy: kind === 'different-reviewer' ? 'another-actor' : 'admin-1', reason: 'Explicit source review',
      geography: [{ sourceReferenceId: binding.sourceReferenceId, countryReferenceId: 'country', regionReferenceId: 'region', cityReferenceId: 'city' }] });
    if (kind === 'payload-tamper') { plan.changes[0].afterState = { ...plan.changes[0].afterState, universityName: 'Unreviewed replacement' }; sealed(plan); }
    if (kind === 'receipt-drift') receipt.requestHash = 'f'.repeat(64);
    if (kind === 'asset-retired') asset.lifecycleState = 'ARCHIVED';
    const tx = authorized({ $queryRaw: vi.fn().mockResolvedValue([]),
      importScreeningReceipt: { findUnique: vi.fn().mockResolvedValue(receipt) }, assetRecord: { findUnique: vi.fn().mockResolvedValue(asset) },
      university: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
      universityImportChangeSet: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    });
    const gateway = new PrismaUniversityImportChangeExecutorGateway({ $transaction: async work => work(tx) } as never);
    await expect(gateway.apply(plan, 'admin-1')).rejects.toThrow(/UNIVERSITY_(SOURCE_REVIEW|SCREENING_)/);
    expect(tx.universityImportChangeSet.create).not.toHaveBeenCalled(); expect(tx.university.create).not.toHaveBeenCalled();
  });
  it('rejects a resealed screening plan whose owner decision was removed before writing a change set', async () => {
    const tx = authorized({ $queryRaw: vi.fn().mockResolvedValue([]), universityImportChangeSet: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() } });
    const gateway = new PrismaUniversityImportChangeExecutorGateway({ $transaction: async work => work(tx) } as never);
    const plan = sealed({ stage: 'STAGE_1', sourceArtifactId: 'fixture', changeSetId: '', validationIssues: [], databaseWrites: 0,
      screeningBindings: [{ sourceReferenceId: 'INS-DZA-0001' }], changes: [{ sequence: 1, sourceReferenceId: 'INS-DZA-0001', entityKey: 'INS-DZA-0001', entityType: 'UNIVERSITY', operation: 'CREATE', afterState: { universityName: 'Source University' } }] } as never);
    await expect(gateway.apply(plan, 'admin-1')).rejects.toThrow('SOURCE_REVIEW_REQUIRED');
    expect(tx.universityImportChangeSet.create).not.toHaveBeenCalled();
  });
  it('reads screening evidence only in a read-only snapshot after checking operator permissions', async () => {
    const tx = authorized({ $queryRaw: vi.fn(), $executeRaw: vi.fn(),
      importScreeningReceipt: { findUnique: vi.fn().mockResolvedValue(null) },
      assetRecord: { findUnique: vi.fn().mockResolvedValue(null) },
      university: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    });
    const transaction = vi.fn(async work => work(tx));
    const gateway = new PrismaUniversityImportChangeExecutorGateway({ $transaction: transaction } as never);
    const binding = { sourceReferenceId: 'INS-DZA-0001', receiptId: 'receipt', assetId: 'asset', requestHash: 'a'.repeat(64), artifactSha256: 'b'.repeat(64) };
    await expect(gateway.previewScreenedSources([binding], 'admin-1')).rejects.toThrow('RECEIPT_MISMATCH');
    expect((tx.$executeRaw.mock.calls[0][0] as string[])[0]).toBe('SET TRANSACTION READ ONLY');
    expect(transaction.mock.calls[0][1]).toMatchObject({ isolationLevel: 'RepeatableRead' });
    expect(tx.university.create).not.toHaveBeenCalled();
    tx.roleAssignmentRecord.findMany.mockResolvedValue([]); tx.importScreeningReceipt.findUnique.mockClear();
    await expect(gateway.previewScreenedSources([binding], 'admin-1')).rejects.toThrow('PERMISSION_DENIED');
    expect(tx.importScreeningReceipt.findUnique).not.toHaveBeenCalled();
  });
  it.each(['edited', 'published', 'source-edited', 'new-translation'])('preserves the whole batch on rollback drift: %s', async kind => {
    const original = { id: 'u1', status: 'READY_TO_REVIEW', displayName: 'Original' };
    const source = { id: 's1', universityId: 'u1', sourceHash: 'original' };
    const root = { ...original, ...(kind === 'edited' ? { displayName: 'Changed' } : {}), ...(kind === 'published' ? { status: 'PUBLISHED' } : {}) };
    const tx = authorized({
      $queryRaw: vi.fn().mockResolvedValue([]),
      universityImportChangeSet: { findUnique: vi.fn().mockResolvedValue({ state: 'APPLIED', changes: [
        { sequence: 2, entityType: 'SOURCE_RECORD', entityId: 's1', universityId: 'u1', operation: 'CREATE', beforeState: null, afterState: source },
        { sequence: 1, entityType: 'UNIVERSITY', entityId: 'u1', universityId: 'u1', operation: 'CREATE', beforeState: null, afterState: original },
      ] }), update: vi.fn() },
      university: { findUnique: vi.fn().mockResolvedValue({ ...root, _count: { sourceRecords: 1, importChanges: 2, translations: kind === 'new-translation' ? 1 : 0 } }), delete: vi.fn() },
      universitySourceRecord: { findUnique: vi.fn().mockResolvedValue({ ...source, sourceHash: kind === 'source-edited' ? 'changed' : source.sourceHash }), delete: vi.fn() },
      auditRecord: { create: vi.fn() }, transactionalOutboxRecord: { create: vi.fn() },
    });
    const gateway = new PrismaUniversityImportChangeExecutorGateway({ $transaction: async work => work(tx) } as never);
    await expect(gateway.rollback('STAGE_1:fixture', 'admin-1')).rejects.toThrow(/ROLLBACK_(CONFLICT|DEPENDENCIES|OWNER_IMMUTABLE)/);
    expect(tx.university.delete).not.toHaveBeenCalled(); expect(tx.universitySourceRecord.delete).not.toHaveBeenCalled();
    expect(tx.universityImportChangeSet.update).not.toHaveBeenCalled(); expect(tx.auditRecord.create).not.toHaveBeenCalled();
  });
  it('rejects a modified bounded plan before opening a transaction', async () => {
    const prisma = { $transaction: vi.fn() };
    const gateway = new PrismaUniversityImportChangeExecutorGateway(prisma as never);
    const plan = sealed({ changeSetId: '', stage: 'STAGE_1', sourceArtifactId: 'artifact', validationIssues: [], databaseWrites: 0,
      changes: [{ sequence: 1, sourceReferenceId: 'INS-DZA-0001', entityType: 'UNIVERSITY', entityKey: 'INS-DZA-0001', operation: 'CREATE', afterState: { officialName: 'Original' } }] });
    plan.changes[0].afterState = { officialName: 'Tampered' };
    await expect(gateway.apply(plan, 'admin-1')).rejects.toThrow('PLAN_SEAL');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
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
      const plan = { changeSetId: 'STAGE_1:fixture', stage: 'STAGE_1' as const, sourceArtifactId: 'fixture', validationIssues: [], changes: [{ sequence: 1, sourceReferenceId: 'INS-DZA-0001', entityType: 'UNIVERSITY' as const, entityKey: 'INS-DZA-0001', operation: 'CREATE' as const, afterState: { officialName: 'Synthetic' } }], databaseWrites: 0 as const };
      await expect(mode === 'apply' ? gateway.apply(sealed(plan), 'admin-1') : gateway.rollback(plan.changeSetId, 'admin-1')).rejects.toThrow(/UNIVERSITY_IMPORT_(VERIFIED_ACTIVE_ACTOR_REQUIRED|ACTOR_PERMISSION_DENIED)/);
      expect(tx.universityImportChangeSet.findUnique).not.toHaveBeenCalled();
    }
  });

  it('reauthorizes a replay and locks persisted authorization rows in its transaction', async () => {
    const tx = authorized({ $queryRaw: vi.fn().mockResolvedValue([]), universityImportChangeSet: { findUnique: vi.fn().mockResolvedValue({ id: 'STAGE_1:fixture', state: 'APPLIED', changes: [] }) } });
    const gateway = new PrismaUniversityImportChangeExecutorGateway({ $transaction: async work => work(tx) } as never);
    const plan = { changeSetId: 'STAGE_1:fixture', stage: 'STAGE_1' as const, sourceArtifactId: 'fixture', validationIssues: [], changes: [{ sequence: 1, sourceReferenceId: 'INS-DZA-0001', entityType: 'UNIVERSITY' as const, entityKey: 'INS-DZA-0001', operation: 'CREATE' as const, afterState: { officialName: 'Synthetic' } }], databaseWrites: 0 as const };
    await expect(gateway.apply(sealed(plan), 'admin-1')).resolves.toMatchObject({ appliedChanges: 0 });
    const locks = tx.$queryRaw.mock.calls.map(([query]) => query.sql ?? '').join('\n');
    expect(locks).toContain('FOR SHARE'); expect(locks).toContain('RoleAssignmentRecord'); expect(locks).toContain('PolicyRecord');
    tx.roleAssignmentRecord.findMany.mockResolvedValue([]);
    await expect(gateway.apply(sealed(plan), 'admin-1')).rejects.toThrow('ACTOR_PERMISSION_DENIED');
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
    await expect(gateway.apply(sealed(plan), 'admin-1')).rejects.toThrow('UNIVERSITY_CAMPUS_REGION_COUNTRY_MISMATCH');
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

    await expect(gateway.apply(sealed(plan), 'admin-1')).resolves.toEqual({
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
    await expect(gateway.apply(sealed(plan), 'admin-1')).rejects.toThrow('UNIVERSITY_SOURCE_PROVENANCE_OWNERSHIP_MISMATCH');
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
    await expect(gateway.apply(sealed(plan), 'admin-1')).resolves.toEqual({
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

    await expect(gateway.apply(sealed(plan), 'admin-1')).resolves.toEqual({
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
              universityId: 'db-uni-1',
              operation: 'CREATE',
              beforeState: null,
              afterState: { id: 'source-1', universityId: 'db-uni-1', sourceHash: 'original' },
            },
            {
              sequence: 1,
              entityType: 'UNIVERSITY',
              entityId: 'db-uni-1',
              universityId: 'db-uni-1',
              operation: 'CREATE',
              beforeState: null,
              afterState: { id: 'db-uni-1', status: 'READY_TO_REVIEW' },
            },
          ],
        }),
        update: vi.fn(),
      },
      universitySourceRecord: { findUnique: vi.fn().mockResolvedValue({ id: 'source-1', universityId: 'db-uni-1', sourceHash: 'original' }), delete: vi.fn() },
      university: { findUnique: vi.fn().mockResolvedValue({ id: 'db-uni-1', status: 'READY_TO_REVIEW', _count: { sourceRecords: 1, importChanges: 2 } }), delete: vi.fn() },
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
