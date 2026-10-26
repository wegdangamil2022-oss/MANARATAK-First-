import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { preflightTargets } from '../../../../scripts/database/post28-isolation.mjs';
import { readDatabaseIdentity } from '../../../../scripts/database/post28-preflight.mjs';
import {
  AdminUniversityUseCases,
  AtomicDomainMutationCoordinator,
  AtomicAuditedOutboxMutationExecutor,
} from '@manaratak/application';
import { PrismaUniversityRepository } from '../../src/universities/PrismaUniversityRepository';
import { UniversityStageSourceReader } from '../../src/universities/UniversityStageSourceReader';
import { PrismaAtomicPersistenceUnitOfWork } from '../../src/event-foundation/PrismaAtomicPersistenceUnitOfWork';
import { PrismaAuditRecordRepository } from '../../src/audit/PrismaAuditRecordRepository';
import { PrismaTransactionalOutboxStore } from '../../src/event-foundation/PrismaTransactionalOutboxStore';
describe('University stage authoring on attested isolated PostgreSQL16', () => {
  let db: PrismaClient,
    other: PrismaClient,
    service: AdminUniversityUseCases,
    programId: string,
    majorId: string,
    testId: string,
    degreeId: string,
    countryId: string,
    cityId: string,
    currencyId: string;
  const id = randomUUID(),
    actor = randomUUID(),
    run = randomUUID();
  const createService = (client: PrismaClient) =>
    new AdminUniversityUseCases(
      new PrismaUniversityRepository(client),
      new AtomicDomainMutationCoordinator(
        new AtomicAuditedOutboxMutationExecutor(
          new PrismaAtomicPersistenceUnitOfWork(client),
          new PrismaAuditRecordRepository(client),
          new PrismaTransactionalOutboxStore(client),
        ),
      ),
      undefined,
      undefined,
      undefined,
      new UniversityStageSourceReader(),
    );
  const context = (revision: number) => ({
    actorId: actor,
    actorType: 'IDENTITY',
    expectedRevision: revision,
    reason: 'Isolated section 04 acceptance',
    source: 'ISOLATED_UNIVERSITY_ACCEPTANCE',
  });
  const current = () => service.getUniversity(id);
  beforeAll(async () => {
    if (
      process.env.UNIVERSITY_ADMIN_DATABASE_TESTS !== 'YES' ||
      process.env.NODE_ENV !== 'test' ||
      process.env.POST28_TARGET_LABEL !== 'DB-T' ||
      process.env.DATABASE_URL !== process.env.DIRECT_URL
    )
      throw Error('ISOLATED_UNIVERSITY_TEST_AUTHORIZATION_REQUIRED');
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
    await db.$connect();
    service = createService(db);
    const [role] = await db.$queryRaw<
      Array<{
        rolsuper: boolean;
        rolcreatedb: boolean;
        rolcreaterole: boolean;
        rolbypassrls: boolean;
      }>
    >`SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user`;
    expect(Object.values(role).every((v) => !v)).toBe(true);
    await db.identityRecord.create({
      data: {
        id: actor,
        type: 'Human',
        status: 'ACTIVE',
        createdBy: 'ISOLATED_UNIVERSITY_ACCEPTANCE',
      },
    });
    const country = await db.referenceCountry.upsert({
      where: { iso2Code: 'FR' },
      create: { iso2Code: 'FR', iso3Code: 'FRA', name: 'France', region: 'Europe' },
      update: {},
    });
    countryId = country.id;
    cityId = (
      await db.referenceCity.create({
        data: {
          countryIso2Code: 'FR',
          countryReferenceId: countryId,
          name: 'Synthetic test city ' + run,
        },
      })
    ).id;
    currencyId = (
      await db.referenceCurrency.upsert({
        where: { isoCode: 'USD' },
        create: { isoCode: 'USD', name: 'US Dollar' },
        update: {},
      })
    ).id;
    degreeId = (
      await db.degreeLevel.create({
        data: {
          canonicalCode: 'U-TEST-' + run,
          nameAr: 'درجة اختبار معزولة',
          nameEn: 'Synthetic test degree',
          status: 'ACTIVE',
        },
      })
    ).id;
    majorId = (
      await db.major.create({
        data: {
          publicId: 'MJR-U-TEST-' + run,
          slug: 'u-major-' + run,
          canonicalName: 'Synthetic major ' + run,
          canonicalDedupKey: 'u-major-' + run,
          displayName: 'Synthetic major',
          status: 'READY_TO_REVIEW',
          completenessStatus: 'NEEDS_REVIEW',
        },
      })
    ).id;
    await db.majorLevelProfile.create({
      data: { majorId, degreeLevelId: degreeId, level: 'BACHELOR' },
    });
    testId = (
      await db.internationalTest.create({
        data: {
          publicId: 'TEST-U-' + run,
          slug: 'u-test-' + run,
          canonicalName: 'Synthetic test ' + run,
          canonicalDedupKey: 'u-test-' + run,
          displayName: 'Synthetic requirement test',
          status: 'READY_TO_REVIEW',
          completenessStatus: 'NEEDS_REVIEW',
        },
      })
    ).id;
    await db.university.create({
      data: {
        id,
        publicId: 'INS-TEST-' + run,
        slug: 'u-test-' + run,
        canonicalName: 'Synthetic University ' + run,
        canonicalDedupKey: 'u-test-' + run,
        displayName: 'Synthetic University',
        country: 'France',
        city: 'Synthetic test city ' + run,
        countryReferenceId: countryId,
        cityReferenceId: cityId,
        institutionType: 'UNIVERSITY',
        officialWebsite: 'https://example.org',
        officialSourceUrl: 'https://example.org/source',
        status: 'READY_TO_REVIEW',
        completenessStatus: 'COMPLETE',
        optionalFields: { description: 'Preserve this description', sentinel: 'unchanged' },
      },
    });
  });
  afterAll(async () => {
    await db?.$disconnect();
    await other?.$disconnect();
  });
  it('reports actual source coverage without fabricating an imported stage', async () => {
    const result = await service.getSourceStages(id);
    expect(result.stages).toHaveLength(5);
    expect(result.stages[0].sourceState).toBe('AVAILABLE');
    expect(result.stages[4].sourceState).toBe('NOT_SUPPLIED');
    expect(result.stages.every((s) => s.importState === 'UNKNOWN')).toBe(true);
  });
  it('persists one canonical identity card, proof and stable University ID without changing other fields', async () => {
    const before = await current();
    const saved = await service.saveStageCard(
      id,
      'basic-identity',
      { displayName: 'Reviewed synthetic university' },
      { sourceUrl: 'https://example.org/identity', verifiedAt: '2026-10-24T00:00:00.000Z' },
      context(before.revision!),
    );
    const independent = await other.university.findUniqueOrThrow({ where: { id } });
    expect(independent.displayName).toBe('Reviewed synthetic university');
    expect(independent.publicId).toBe(before.publicId);
    expect(saved.revision).toBeGreaterThan(before.revision!);
    expect(independent.optionalFields).toMatchObject({
      sentinel: 'unchanged',
      description: 'Preserve this description',
      metadata: {
        universityCardEvidence: {
          'basic-identity': { sourceUrl: 'https://example.org/identity', actorId: actor },
        },
      },
    });
  });
  it('serializes competing staff edits so exactly one succeeds without a stale overwrite', async () => {
    const before = await current(),
      second = createService(other),
      proof = { sourceUrl: 'https://example.org/contact', verifiedAt: '2026-10-24T00:00:00.000Z' };
    const result = await Promise.allSettled([
      service.saveStageCard(
        id,
        'enrichment-contact',
        { contactPhone: 'Synthetic A' },
        proof,
        context(before.revision!),
      ),
      second.saveStageCard(
        id,
        'enrichment-contact',
        { contactPhone: 'Synthetic B' },
        proof,
        context(before.revision!),
      ),
    ]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(result.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(
      String((result.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason),
    ).toContain('UNIVERSITY_STALE_REVISION');
  });
  it('keeps zero, unknown and false distinct and saves finance without touching identity or programs', async () => {
    let before = await current();
    await service.replaceNormalizedDetails(
      id,
      {
        tuitionProfiles: [
          {
            profileType: 'ANNUAL',
            amount: 0,
            currencyCode: 'USD',
            currencyReferenceId: currencyId,
            officialSourceUrl: 'https://example.org/tuition',
          },
        ],
      },
      context(before.revision!),
    );
    before = await current();
    await service.replaceNormalizedDetails(
      id,
      {
        accommodationProfiles: [
          {
            accommodationAvailable: false,
            typicalCost: null,
            averageMonthlyLivingCost: 0,
            livingCostCurrencyCode: 'USD',
            livingCostCurrencyReferenceId: currencyId,
          },
        ],
      },
      context(before.revision!),
    );
    const read = await current();
    expect(read.displayName).toBe('Reviewed synthetic university');
    expect(Number((read.tuitionProfiles![0] as { amount: unknown }).amount)).toBe(0);
    expect(read.accommodationProfiles![0]).toMatchObject({
      accommodationAvailable: false,
      typicalCost: null,
    });
    expect(
      Number(
        (read.accommodationProfiles![0] as { averageMonthlyLivingCost: unknown })
          .averageMonthlyLivingCost,
      ),
    ).toBe(0);
  });
  it('creates campus, faculty and a canonical program/test relationship then preserves IDs through archive and restore', async () => {
    let before = await current();
    await service.replaceNormalizedDetails(
      id,
      {
        campuses: [
          {
            sourceReferenceId: 'campus-' + run,
            name: 'Synthetic campus',
            status: 'ACTIVE',
            countryReferenceId: countryId,
          },
        ],
        organizationUnits: [
          {
            sourceReferenceId: 'faculty-' + run,
            name: 'Synthetic faculty',
            unitType: 'FACULTY',
            status: 'ACTIVE',
            campusSourceReferenceId: 'campus-' + run,
          },
        ],
      },
      context(before.revision!),
    );
    before = await current();
    const campus = (before.campuses![0] as { id: string }).id,
      unit = (before.organizationUnits![0] as { id: string }).id;
    const saved = await service.upsertAcademicProgram(
      id,
      null,
      {
        sourceReferenceId: 'program-' + run,
        sourceProgramName: 'Synthetic program',
        degreeLevelId: degreeId,
        majorId,
        majorMappingState: 'CANONICALLY_MAPPED',
        organizationUnitId: unit,
        campusIds: [campus],
        status: 'DRAFT',
        admissionRequirements: [
          { internationalTestId: testId, status: 'REVIEW_REQUIRED', minimumScore: 0 },
        ],
      },
      context(before.revision!),
    );
    programId = saved.academicPrograms![0].id!;
    expect(saved.academicPrograms![0].admissionRequirements![0].minimumScore).toBe(0);
    before = await current();
    await service.archiveAcademicProgram(id, programId, context(before.revision!));
    expect((await current()).academicPrograms!.find((p) => p.id === programId)?.status).toBe(
      'ARCHIVED',
    );
    before = await current();
    await service.restoreAcademicProgram(id, programId, context(before.revision!));
    const restored = (await current()).academicPrograms!.find((p) => p.id === programId)!;
    expect(restored.status).toBe('DRAFT');
    expect(restored.campusIds).toEqual([campus]);
    expect(restored.degreeLevelId).toBe(degreeId);
    expect(restored.majorId).toBe(majorId);
    expect(restored.organizationUnitId).toBe(unit);
  });
  it('stores QS/THE/ARWU years and bands separately without creating a stage five import', async () => {
    const before = await current();
    await service.replaceNormalizedDetails(
      id,
      {
        rankings: ['QS', 'THE', 'ARWU'].map((provider) => ({
          provider: provider as 'QS' | 'THE' | 'ARWU',
          rankingYear: 2026,
          rank: '201–300',
          scope: 'GLOBAL',
          officialSourceUrl: 'https://example.org/' + provider.toLowerCase(),
          verifiedAt: new Date('2026-10-24T00:00:00Z'),
        })),
      },
      context(before.revision!),
    );
    const result = await service.getSourceStages(id);
    expect(result.university.rankings).toHaveLength(3);
    expect(result.stages[4].sourceState).toBe('NOT_SUPPLIED');
    expect(result.stages[4].importState).toBe('UNKNOWN');
    expect((result.university.rankings![0] as { rank: string }).rank).toBe('201–300');
  });
  it('publishes only through the real gate, locks editing, then unpublishes, archives and restores to review', async () => {
    let before = await current();
    expect((await service.checkPublicationReadiness(id)).ready).toBe(true);
    await service.markReadyToPublish(id, context(before.revision!));
    before = await current();
    await service.publish(id, context(before.revision!));
    expect((await service.getSourceStages(id)).publicHref).toBe('/universities/u-test-' + run);
    before = await current();
    await expect(
      service.saveStageCard(
        id,
        'basic-identity',
        { displayName: 'Must not overwrite' },
        { sourceUrl: 'https://example.org/source', verifiedAt: '2026-10-24T00:00:00Z' },
        context(before.revision!),
      ),
    ).rejects.toThrow('UNIVERSITY_NON_EDITABLE_STATUS');
    await service.unpublish(id, context(before.revision!));
    before = await current();
    await service.archive(id, context(before.revision!));
    before = await current();
    await service.restore(id, context(before.revision!));
    expect((await current()).status).toBe('READY_TO_REVIEW');
    expect((await service.getSourceStages(id)).publicHref).toBeNull();
  });
  it('rejects and restores without erasing IDs, finances, programs or source fields', async () => {
    let before = await current();
    await service.reject(id, context(before.revision!));
    before = await current();
    await service.restore(id, context(before.revision!));
    const result = await current();
    expect(result.id).toBe(id);
    expect(result.status).toBe('READY_TO_REVIEW');
    expect(result.academicPrograms!.find((p) => p.id === programId)).toBeDefined();
    expect(result.tuitionProfiles).toHaveLength(1);
    expect(result.optionalFields?.sentinel).toBe('unchanged');
  });
});
