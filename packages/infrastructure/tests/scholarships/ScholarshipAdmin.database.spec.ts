import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { preflightTargets } from '../../../../scripts/database/post28-isolation.mjs';
import { readDatabaseIdentity } from '../../../../scripts/database/post28-preflight.mjs';
import {
  AdminScholarshipUseCases,
  AtomicDomainMutationCoordinator,
  AtomicAuditedOutboxMutationExecutor,
} from '@manaratak/application';
import { PrismaScholarshipRepository } from '../../src/scholarships/PrismaScholarshipRepository';
import { PrismaScholarshipCanonicalLookupGateway } from '../../src/scholarships/PrismaScholarshipCanonicalLookupGateway';
import { PrismaAtomicPersistenceUnitOfWork } from '../../src/event-foundation/PrismaAtomicPersistenceUnitOfWork';
import { PrismaAuditRecordRepository } from '../../src/audit/PrismaAuditRecordRepository';
import { PrismaTransactionalOutboxStore } from '../../src/event-foundation/PrismaTransactionalOutboxStore';
describe('Scholarship owner workflow on attested isolated PostgreSQL 16', () => {
  let db: PrismaClient, other: PrismaClient, service: AdminScholarshipUseCases;
  const id = randomUUID(),
    actor = randomUUID(),
    degree = randomUUID(),
    run = randomUUID();
  const useCases = (client: PrismaClient) =>
    new AdminScholarshipUseCases(
      new PrismaScholarshipRepository(client),
      new AtomicDomainMutationCoordinator(
        new AtomicAuditedOutboxMutationExecutor(
          new PrismaAtomicPersistenceUnitOfWork(client),
          new PrismaAuditRecordRepository(client),
          new PrismaTransactionalOutboxStore(client),
        ),
      ),
      new PrismaScholarshipCanonicalLookupGateway(client),
    );
  const context = (revision: number) => ({
    actorId: actor,
    actorType: 'IDENTITY',
    expectedRevision: revision,
    reason: 'Isolated scholarship section 03 acceptance',
    source: 'ISOLATED_SCHOLARSHIP_ACCEPTANCE',
  });
  const read = () => service.getScholarship(id);
  beforeAll(async () => {
    if (
      process.env.SCHOLARSHIP_ADMIN_DATABASE_TESTS !== 'YES' ||
      process.env.NODE_ENV !== 'test' ||
      process.env.POST28_TARGET_LABEL !== 'DB-T' ||
      process.env.DATABASE_URL !== process.env.DIRECT_URL
    )
      throw Error('ISOLATED_SCHOLARSHIP_TEST_AUTHORIZATION_REQUIRED');
    const contract = JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE!, 'utf8'));
    await preflightTargets(
      contract,
      [{ label: 'DB-T', url: process.env.DATABASE_URL }],
      process.env,
      contract.sourceSha,
      readDatabaseIdentity,
      { requireValidatedCatalog: true },
    );
    db = new PrismaClient();
    other = new PrismaClient();
    service = useCases(db);
    await db.$connect();
    const [role] = await db.$queryRaw<
      Array<{
        rolsuper: boolean;
        rolcreatedb: boolean;
        rolcreaterole: boolean;
        rolbypassrls: boolean;
      }>
    >`SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user`;
    expect(Object.values(role).every((value) => !value)).toBe(true);
    await db.identityRecord.create({
      data: {
        id: actor,
        type: 'Human',
        status: 'ACTIVE',
        createdBy: 'ISOLATED_SCHOLARSHIP_ACCEPTANCE',
      },
    });
    await db.degreeLevel.create({
      data: {
        id: degree,
        canonicalCode: 'TEST-' + run,
        nameEn: 'Synthetic Bachelor',
        nameAr: 'درجة اختبار معزولة',
        status: 'ACTIVE',
      },
    });
    await db.scholarship.create({
      data: {
        id,
        publicId: 'SCH-TEST-' + run,
        slug: 'sch-test-' + run,
        canonicalName: 'Isolated scholarship ' + run,
        canonicalDedupKey: 'isolated-scholarship-' + run,
        displayName: 'Isolated scholarship ' + run,
        providerName: 'Isolated synthetic provider',
        status: 'READY_TO_REVIEW',
        completenessStatus: 'COMPLETE',
        verificationStatus: 'VERIFIED',
        publicationStatus: 'DRAFT',
        countryScope: 'GLOBAL',
        isFullyFunded: true,
        fundingTypeCode: 'FULLY_FUNDED',
        deadlineType: 'OPEN_ALL_YEAR',
        officialSourceUrl: 'https://example.org/scholarship',
        optionalFields: { description: 'Synthetic original scholarship description' },
        benefits: {
          create: {
            benefitKey: 'tuition',
            benefitTypeCode: 'TUITION',
            valueText: 'Synthetic tuition evidence',
          },
        },
        degreeTargets: {
          create: {
            targetKey: 'bachelor',
            sourceLabel: 'Synthetic Bachelor',
            degreeLevelId: degree,
            resolutionStatus: 'RESOLVED',
          },
        },
        eligibilityItems: {
          create: {
            itemKey: 'general',
            itemTypeCode: 'GENERAL',
            valueText: 'Synthetic source criterion',
          },
        },
        requiredDocuments: {
          create: { documentKey: 'transcript', displayName: 'Synthetic transcript' },
        },
        sourceEvidence: {
          create: {
            evidenceKey: 'official',
            sourceTypeCode: 'OFFICIAL',
            sourceUrl: 'https://example.org/scholarship',
            isOfficial: true,
          },
        },
        sponsorContext: { create: { displayName: 'Synthetic sponsor', sponsorType: 'CONTEXTUAL' } },
        versions: {
          create: {
            versionNumber: 1,
            status: 'DRAFT',
            snapshot: { scope: 'ISOLATED_SYNTHETIC_ACCEPTANCE' },
          },
        },
        applicationCycles: { create: { cycleKey: 'test-cycle', status: 'DRAFT' } },
      },
    });
  }, 60000);
  afterAll(async () => {
    await other?.$disconnect();
    await db?.$disconnect();
  });
  it('counts incomplete rows and review status exactly, without adding overlap', async () => {
    const incomplete = randomUUID();
    await db.scholarship.create({
      data: {
        id: incomplete,
        publicId: 'SCH-INC-' + run,
        slug: 'sch-inc-' + run,
        canonicalName: 'Incomplete ' + run,
        canonicalDedupKey: 'inc-' + run,
        displayName: 'Incomplete synthetic row',
        status: 'READY_TO_REVIEW',
        completenessStatus: 'INCOMPLETE',
        verificationStatus: 'PENDING',
      },
    });
    const summary = await service.getScholarshipSummary();
    expect(summary.incomplete).toBe(
      await db.scholarship.count({ where: { completenessStatus: 'INCOMPLETE' } }),
    );
    expect(summary.inReview).toBe(
      await db.scholarship.count({ where: { status: 'READY_TO_REVIEW' } }),
    );
    const list = await service.listScholarships({
      completenessStatus: 'INCOMPLETE' as never,
      pageSize: 100,
    });
    expect(list.total).toBe(summary.incomplete);
  });
  it('persists a content update, a new revision, real audit and an outbox record', async () => {
    const before = await read();
    const saved = await service.updateScholarship(
      id,
      { description: 'Isolated corrected source description' },
      context(before.revision!),
    );
    const independent = await useCases(other).getScholarship(id);
    expect(independent.description).toBe('Isolated corrected source description');
    expect(independent.revision).toBe(saved.revision);
    expect(independent.revision).toBe(before.revision! + 1);
    expect(
      await db.auditRecord.count({ where: { targetId: id, action: 'SCHOLARSHIP_UPDATED' } }),
    ).toBeGreaterThan(0);
    expect(
      await db.transactionalOutboxRecord.count({ where: { aggregateId: id } }),
    ).toBeGreaterThan(0);
  });
  it('allows one writer from two database clients and rejects the stale writer without overwrite', async () => {
    const revision = (await read()).revision!;
    const result = await Promise.allSettled([
      service.updateScholarship(id, { notes: 'Session A' }, context(revision)),
      useCases(other).updateScholarship(id, { notes: 'Session B' }, context(revision)),
    ]);
    expect(result.filter((row) => row.status === 'fulfilled')).toHaveLength(1);
    expect(result.filter((row) => row.status === 'rejected')).toHaveLength(1);
    const rejected = result.find((row) => row.status === 'rejected') as PromiseRejectedResult;
    expect(String(rejected.reason)).toContain('SCHOLARSHIP_STALE_REVISION');
    expect((await read()).revision).toBe(revision + 1);
  });
  it('saves canonical relationships independently while preserving content and canonical IDs', async () => {
    const before = await read();
    await service.replaceCanonicalRelationships(
      id,
      { degreeTargets: before.degreeTargets },
      context(before.revision!),
    );
    const saved = await useCases(other).getScholarship(id);
    expect(saved.degreeTargets?.[0].degreeLevelId).toBe(degree);
    expect(saved.description).toBe(before.description);
    expect(saved.revision).toBe(before.revision! + 1);
  });
  it('preserves the existing content-translation policy and rolls back rejected translation writes', async () => {
    const before = await read(),
      events = await db.transactionalOutboxRecord.count({ where: { aggregateId: id } }),
      audit = await db.auditRecord.count({ where: { targetId: id } });
    await expect(
      service.saveLocalizedDescription(
        id,
        {
          locale: 'en',
          displayName: 'Synthetic translated name',
          description: 'Synthetic translated description',
        },
        context(before.revision!),
      ),
    ).rejects.toThrow('TRANSLATION_CONTENT_AUTHORING_DISABLED:SCHOLARSHIP');
    const saved = await useCases(other).getScholarship(id);
    expect(saved.revision).toBe(before.revision);
    expect(saved.optionalFields).toEqual(before.optionalFields);
    expect(await db.transactionalOutboxRecord.count({ where: { aggregateId: id } })).toBe(events);
    expect(await db.auditRecord.count({ where: { targetId: id } })).toBe(audit);
  });
  it('uses real owner readiness and publishes only after the ready-to-publish transition', async () => {
    const detail = await service.getScholarshipCatalogDetail(id);
    expect(detail.completeness.state).toBe('COMPLETE');
    expect(detail.unresolvedLinks).toEqual([]);
    expect(detail.publicationReadiness).toEqual({ eligible: true, blocker: null });
    expect(detail.publicHref).toBeNull();
    await expect(service.publish(id, context(detail.scholarship.revision!))).rejects.toThrow(
      'READY_TO_PUBLISH',
    );
    await service.markReadyToPublish(id, context((await read()).revision!));
    await service.publish(id, context((await read()).revision!));
    const published = await useCases(other).getScholarshipCatalogDetail(id);
    expect(published.scholarship.publicationStatus).toBe('PUBLISHED');
    expect(published.publicHref).toBe('/scholarships/sch-test-' + run);
    expect(
      await db.scholarshipVersion.count({ where: { scholarshipId: id, status: 'PUBLISHED' } }),
    ).toBe(1);
  });
  it('rejects published edits, then unpublishes and archives through audited owner commands', async () => {
    await expect(
      service.updateScholarship(id, { notes: 'Not permitted' }, context((await read()).revision!)),
    ).rejects.toThrow('SCHOLARSHIP_NON_EDITABLE_STATUS');
    await service.unpublish(id, context((await read()).revision!));
    expect((await service.getScholarshipCatalogDetail(id)).publicHref).toBeNull();
    await service.archive(id, context((await read()).revision!));
    expect((await read()).status).toBe('ARCHIVED');
    expect((await read()).publicationStatus).toBe('ARCHIVED');
  });
});
