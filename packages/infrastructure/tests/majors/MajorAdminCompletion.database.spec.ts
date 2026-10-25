import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { preflightTargets } from '../../../../scripts/database/post28-isolation.mjs';
import { readDatabaseIdentity } from '../../../../scripts/database/post28-preflight.mjs';
import {
  AdminMajorUseCases,
  AtomicDomainMutationCoordinator,
  AtomicAuditedOutboxMutationExecutor,
} from '@manaratak/application';
import { PrismaMajorRepository } from '../../src/majors/PrismaMajorRepository';
import { PrismaNewMajorCandidateRepository } from '../../src/majors/PrismaNewMajorCandidateRepository';
import { PrismaAtomicPersistenceUnitOfWork } from '../../src/event-foundation/PrismaAtomicPersistenceUnitOfWork';
import { PrismaAuditRecordRepository } from '../../src/audit/PrismaAuditRecordRepository';
import { PrismaTransactionalOutboxStore } from '../../src/event-foundation/PrismaTransactionalOutboxStore';

describe('Section 05 on attested isolated PostgreSQL16', () => {
  let db: PrismaClient, other: PrismaClient, service: AdminMajorUseCases;
  const run = randomUUID(),
    actor = randomUUID(),
    majorId = randomUUID(),
    universityId = randomUUID(),
    scholarshipId = randomUUID();
  const label = 'Synthetic discovery ' + run;
  const degrees: Record<string, string> = {},
    profiles: Record<string, string> = {},
    versions: Record<string, string> = {};
  const context = (revision: number) => ({
    actorId: actor,
    actorType: 'IDENTITY',
    expectedRevision: revision,
    reason: 'Isolated section 05 acceptance',
    source: 'ISOLATED_MAJOR_ACCEPTANCE',
  });
  const current = () => service.getMajor(majorId);
  beforeAll(async () => {
    if (
      process.env.MAJOR_ADMIN_DATABASE_TESTS !== 'YES' ||
      process.env.NODE_ENV !== 'test' ||
      process.env.POST28_TARGET_LABEL !== 'DB-T' ||
      process.env.DATABASE_URL !== process.env.DIRECT_URL
    )
      throw Error('ISOLATED_MAJOR_TEST_AUTHORIZATION_REQUIRED');
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
    const [role] = await db.$queryRaw<
      Array<Record<string, boolean>>
    >`SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user`;
    expect(Object.values(role).every((value) => !value)).toBe(true);
    service = new AdminMajorUseCases(
      new PrismaMajorRepository(db),
      undefined,
      undefined,
      undefined,
      new AtomicDomainMutationCoordinator(
        new AtomicAuditedOutboxMutationExecutor(
          new PrismaAtomicPersistenceUnitOfWork(db),
          new PrismaAuditRecordRepository(db),
          new PrismaTransactionalOutboxStore(db),
        ),
      ),
    );
    await db.identityRecord.create({
      data: { id: actor, type: 'Human', status: 'ACTIVE', createdBy: 'ISOLATED_MAJOR_ACCEPTANCE' },
    });
    for (const level of ['BACHELOR', 'MASTER', 'DOCTORATE', 'FELLOWSHIP'])
      degrees[level] = (
        await db.degreeLevel.upsert({
          where: { canonicalCode: level },
          create: { canonicalCode: level, nameAr: level, nameEn: level, status: 'ACTIVE' },
          update: {},
        })
      ).id;
    await db.major.create({
      data: {
        id: majorId,
        publicId: 'MJR-TEST-' + run,
        slug: 'major-test-' + run,
        canonicalName: 'Synthetic authoring ' + run,
        canonicalDedupKey: 'major-test-' + run,
        displayName: 'تخصص اختبار معزول',
        status: 'READY_TO_REVIEW',
        completenessStatus: 'COMPLETE',
      },
    });
    for (const level of Object.keys(degrees)) {
      const p = await db.majorLevelProfile.create({
        data: {
          majorId,
          level,
          degreeLevelId: degrees[level],
          code: level + '-TEST-' + run,
          displayName: 'Synthetic ' + level,
          status: 'READY_TO_REVIEW',
          completenessStatus: 'COMPLETE',
        },
      });
      profiles[level] = p.id;
      const v = await db.majorVersion.create({
        data: {
          majorId,
          profileId: p.id,
          versionNumber: 1,
          status: 'NEEDS_REVIEW',
          sourceUri: 'https://example.org/isolated-major-source',
          sourceHash: 'a'.repeat(64),
        },
      });
      versions[level] = v.id;
    }
    await db.university.create({
      data: {
        id: universityId,
        publicId: 'INS-DISCOVERY-' + run,
        slug: 'uni-discovery-' + run,
        canonicalName: 'Synthetic University ' + run,
        canonicalDedupKey: 'uni-discovery-' + run,
        displayName: 'Synthetic University',
        country: 'France',
        status: 'READY_TO_REVIEW',
        completenessStatus: 'NEEDS_REVIEW',
      },
    });
    for (const level of ['BACHELOR', 'BACHELOR', 'MASTER', 'FELLOWSHIP', null])
      await db.universityAcademicProgram.create({
        data: {
          universityId,
          sourceProgramName: label,
          normalizedName: label,
          degreeLevelId: level ? degrees[level] : null,
          majorMappingState: 'MAJOR_REVIEW_REQUIRED',
          status: 'DRAFT',
        },
      });
    await db.scholarship.create({
      data: {
        id: scholarshipId,
        publicId: 'SCH-DISCOVERY-' + run,
        slug: 'sch-discovery-' + run,
        canonicalName: 'Synthetic Scholarship ' + run,
        canonicalDedupKey: 'sch-discovery-' + run,
        displayName: 'Synthetic Scholarship',
        status: 'READY_TO_REVIEW',
        completenessStatus: 'NEEDS_REVIEW',
      },
    });
    for (const level of ['BACHELOR', 'MASTER'])
      await db.scholarshipDegreeTarget.create({
        data: { scholarshipId, targetKey: level, degreeLevelId: degrees[level] },
      });
    await db.scholarshipMajorTarget.create({
      data: { scholarshipId, targetKey: 'major-test', sourceLabel: label },
    });
    await db.scholarshipEligibilityItem.create({
      data: {
        scholarshipId,
        itemKey: 'major-eligible',
        itemTypeCode: 'MAJOR',
        valueText: label,
        degreeLevelId: degrees.DOCTORATE,
      },
    });
    await db.scholarshipEligibilityItem.create({
      data: { scholarshipId, itemKey: 'age-eligible', itemTypeCode: 'AGE', valueText: label },
    });
  }, 60000);
  afterAll(async () => {
    await db?.$disconnect();
    await other?.$disconnect();
  });
  it('separates explicit degrees, groups same-degree sources, keeps scholarship context unconfirmed and excludes non-major eligibility', async () => {
    const repo = new PrismaNewMajorCandidateRepository(db),
      page = await repo.list({ search: run });
    expect(page.total).toBe(5);
    expect(page.data.find((row) => row.confirmedDegree === 'BACHELOR')?.sourceCount).toBe(2);
    const unknown = page.data.find((row) => row.confirmedDegree === 'UNKNOWN')!;
    expect(unknown.sourceCount).toBe(2);
    expect(unknown.degreeLevelIds).toEqual([]);
    expect(
      unknown.sources.find((row) => row.sourceType === 'SCHOLARSHIP_MAJOR_TARGET')
        ?.degreeReferences,
    ).toHaveLength(2);
    expect(page.data.find((row) => row.confirmedDegree === 'DOCTORATE')?.sourceTypes).toEqual([
      'SCHOLARSHIP_ELIGIBILITY',
    ]);
    const filtered = await repo.list({ search: run, degreeLevel: 'MASTER', pageSize: 1 });
    expect(filtered.total).toBe(1);
    expect(filtered.data[0].confirmedDegree).toBe('MASTER');
    const beyond = await repo.list({ search: run, page: 8, pageSize: 1 });
    expect(beyond.total).toBe(5);
    expect(beyond.data).toEqual([]);
  });
  it('preserves unchanged legacy rejection decisions across the new degree grouping without rewriting evidence', async () => {
    const repo = new PrismaNewMajorCandidateRepository(db),
      rows = (await repo.list({ search: run })).data;
    const sources = rows.flatMap((row) => row.sources);
    const legacyKey = (sources[0] as unknown as { legacyKey: string }).legacyKey;
    const [legacy] = await db.$queryRaw<
      Array<{ digest: string }>
    >`SELECT encode(sha256(convert_to(jsonb_agg((value-'rn'-'legacyKey'-'confirmedDegree')||jsonb_build_object('candidateKey',${legacyKey}) ORDER BY value->>'sourceType',value->>'sourceId')::text,'UTF8')),'hex') AS digest FROM jsonb_array_elements(${JSON.stringify(sources)}::jsonb)`;
    const decision = await db.newMajorCandidateDecision.create({
      data: {
        id: randomUUID(),
        candidateKey: legacyKey,
        sourceDigest: legacy.digest,
        decision: 'REJECTED',
        actorId: actor,
        reason: 'Legacy rejection acceptance',
        evidence: { original: 'preserved' },
      },
    });
    expect((await repo.list({ search: run })).total).toBe(0);
    expect(
      (await db.newMajorCandidateDecision.findUniqueOrThrow({ where: { id: decision.id } }))
        .evidence,
    ).toEqual({ original: 'preserved' });
    // A new owner timestamp invalidates the old complete-set evidence; decisions are not silently reused.
    const program = sources.find((row) => row.sourceType === 'UNIVERSITY_PROGRAM')!;
    await db.universityAcademicProgram.update({
      where: { id: program.sourceId },
      data: { updatedAt: new Date(Date.now() + 1000) },
    });
    expect((await repo.list({ search: run })).total).toBe(5);
  });
  it('rejects a changed source digest before owner linking and leaves all unresolved references unchanged', async () => {
    const candidate = (
      await new PrismaNewMajorCandidateRepository(db).list({ search: run, degreeLevel: 'MASTER' })
    ).data[0];
    await expect(
      db.$transaction(async (tx) =>
        new PrismaNewMajorCandidateRepository(
          tx as unknown as PrismaClient,
          undefined,
          undefined,
          true,
        ).resolve(candidate.candidateKey, majorId, '0'.repeat(64)),
      ),
    ).rejects.toThrow('STALE_SOURCE');
    expect(
      await db.universityAcademicProgram.count({ where: { universityId, majorId: null } }),
    ).toBe(5);
  });
  it('creates canonical manual slots independently in AR and EN with exact version/source metadata, audit and outbox', async () => {
    const owner = await current();
    const result = await service.updateContentSections(
      majorId,
      {
        profileId: profiles.BACHELOR,
        versionId: versions.BACHELOR,
        sections: ['ar', 'en'].map((locale) => ({
          sectionKey: '02-manual',
          locale,
          title: 'Synthetic overview',
          content: 'Synthetic author-entered ' + locale,
          reviewStatus: 'NEEDS_REVIEW',
          groupNumber: 2,
          sourceUri: 'https://example.org/author-evidence',
        })),
      },
      context(owner.revision!),
    );
    expect(result.count).toBe(2);
    expect(result.data).toHaveLength(2);
    expect(
      result.data.every(
        (row) =>
          row.profileId === profiles.BACHELOR &&
          row.versionId === versions.BACHELOR &&
          row.metadata?.manualGroupNumber === 2,
      ),
    ).toBe(true);
    expect((await current()).revision).toBeGreaterThan(owner.revision!);
    expect(
      await db.auditRecord.count({
        where: { targetId: majorId, action: 'MAJOR_CONTENT_SECTIONS_UPDATED' },
      }),
    ).toBeGreaterThan(0);
  });
  it('rejects duplicate creation instead of overwriting existing text and rolls back the owner revision', async () => {
    const owner = await current(),
      before = await db.majorContentSection.findMany({ where: { versionId: versions.BACHELOR } });
    await expect(
      service.updateContentSections(
        majorId,
        {
          profileId: profiles.BACHELOR,
          versionId: versions.BACHELOR,
          sections: [
            {
              sectionKey: '02-manual',
              locale: 'ar',
              content: 'Overwrite attempt',
              groupNumber: 2,
              sourceUri: 'https://example.org/evidence',
            },
          ],
        },
        context(owner.revision!),
      ),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(
      await db.majorContentSection.findMany({ where: { versionId: versions.BACHELOR } }),
    ).toEqual(before);
    expect((await current()).revision).toBe(owner.revision);
  });
  it('retains raw content, original source metadata and before/after history during explicit group assignment', async () => {
    const raw = await db.majorContentSection.create({
      data: {
        profileId: profiles.MASTER,
        versionId: versions.MASTER,
        sectionKey: 'unmapped-raw',
        locale: 'ar',
        title: 'Unmapped source',
        content: 'Original source text',
        sourceSectionPath: 'source.md#raw',
        metadata: { sourceMainTitle: 'Unresolved title', sentinel: 'preserve' },
      },
    });
    await service.updateContentSections(
      majorId,
      {
        profileId: profiles.MASTER,
        versionId: versions.MASTER,
        sections: [
          {
            id: raw.id,
            sectionKey: raw.sectionKey,
            locale: 'ar',
            title: raw.title!,
            content: raw.content,
            groupNumber: 6,
            sourceUri: 'https://example.org/mapping-proof',
          },
        ],
      },
      context((await current()).revision!),
    );
    const saved = await db.majorContentSection.findUniqueOrThrow({ where: { id: raw.id } });
    expect(saved.sectionKey).toBe(raw.sectionKey);
    expect(saved.content).toBe(raw.content);
    expect(saved.sourceSectionPath).toBe(raw.sourceSectionPath);
    expect(saved.metadata).toMatchObject({
      sentinel: 'preserve',
      sourceMainTitle: 'Unresolved title',
      manualGroupNumber: 6,
      groupAssignmentHistory: [
        { before: null, after: 6, sourceUri: 'https://example.org/mapping-proof' },
      ],
    });
  });
  it('uses the correct four templates and refuses invented slots or group numbers', async () => {
    for (const [level, last, group] of [
      ['MASTER', 25, 16],
      ['DOCTORATE', 26, 19],
      ['FELLOWSHIP', 18, 18],
    ] as const)
      await service.updateContentSections(
        majorId,
        {
          profileId: profiles[level],
          versionId: versions[level],
          sections: [
            {
              sectionKey: String(last).padStart(2, '0') + '-manual',
              locale: 'en',
              title: 'Synthetic source',
              content: 'Owner content only',
              groupNumber: group,
              sourceUri: 'https://example.org/template-proof',
            },
          ],
        },
        context((await current()).revision!),
      );
    await expect(
      service.updateContentSections(
        majorId,
        {
          profileId: profiles.BACHELOR,
          versionId: versions.BACHELOR,
          sections: [
            {
              sectionKey: 'unapproved-key',
              locale: 'ar',
              content: 'bad',
              groupNumber: 2,
              sourceUri: 'https://example.org/proof',
            },
          ],
        },
        context((await current()).revision!),
      ),
    ).rejects.toThrow('TEMPLATE_SLOT_REQUIRED');
  });
  it('protects simultaneous edits by owner revision, with one winner and one stale conflict', async () => {
    const owner = await current();
    const section = await db.majorContentSection.findFirstOrThrow({
      where: { versionId: versions.BACHELOR, locale: 'en' },
    });
    const commands = ['first concurrent draft', 'second concurrent draft'].map((content) =>
      service.updateContentSections(
        majorId,
        {
          profileId: profiles.BACHELOR,
          versionId: versions.BACHELOR,
          sections: [
            {
              id: section.id,
              sectionKey: section.sectionKey,
              locale: 'en',
              title: section.title!,
              content,
            },
          ],
        },
        context(owner.revision!),
      ),
    );
    const results = await Promise.allSettled(commands);
    expect(results.filter((row) => row.status === 'fulfilled')).toHaveLength(1);
    expect(
      results
        .filter((row) => row.status === 'rejected')
        .map((row) => (row as PromiseRejectedResult).reason.message),
    ).toEqual(['MAJOR_STALE_REVISION']);
  });
  it('pages/sorts the complete filtered profiles and reports roots separately with honest content state', async () => {
    const repo = new PrismaMajorRepository(db);
    const page = await repo.list({ search: run, sort: 'DEGREE', pageSize: 1 });
    expect(page.total).toBe(4);
    expect(page.data).toHaveLength(1);
    expect(page.uniqueRootTotal).toBe(1);
    expect(page.countUnit).toBe('DEGREE_PROFILE_OR_UNPROFILED_ROOT');
    expect(page.stats?.complete).toBe(0);
    expect(page.data[0].degreeLevel).toBe('BACHELOR');
    expect(page.data[0].contentReview?.state).toBe('NEEDS_REVIEW');
  });
  it('corrects a wrong reference only within the profile degree and preserves source evidence, text and owner links', async () => {
    const before = await db.majorContentSection.findMany({ where: { profileId: profiles.MASTER } });
    await db.majorLevelProfile.update({
      where: { id: profiles.MASTER },
      data: { degreeLevelId: degrees.BACHELOR },
    });
    await expect(
      service.correctDegreeReference(
        profiles.MASTER,
        { degreeLevelId: degrees.DOCTORATE, sourceUri: 'https://example.org/correction' },
        context((await current()).revision!),
      ),
    ).rejects.toThrow('LEVEL_MISMATCH');
    await service.correctDegreeReference(
      profiles.MASTER,
      { degreeLevelId: degrees.MASTER, sourceUri: 'https://example.org/correction' },
      context((await current()).revision!),
    );
    const checked = await db.majorLevelProfile.findUniqueOrThrow({
      where: { id: profiles.MASTER },
    });
    expect(checked.degreeLevelId).toBe(degrees.MASTER);
    expect(checked.level).toBe('MASTER');
    expect(checked.metadata).toMatchObject({
      degreeReferenceHistory: [
        {
          before: degrees.BACHELOR,
          after: degrees.MASTER,
          actorId: actor,
          sourceUri: 'https://example.org/correction',
        },
      ],
    });
    expect(
      (await db.majorContentSection.findMany({ where: { profileId: profiles.MASTER } })).map(
        (row) => row.content,
      ),
    ).toEqual(before.map((row) => row.content));
    expect(
      await db.universityAcademicProgram.count({ where: { universityId, majorId: null } }),
    ).toBe(5);
  });
  it('archives/restores only the selected profile for review without publishing or altering owner links', async () => {
    const before = await db.universityAcademicProgram.findMany({ where: { universityId } });
    await service.archive(profiles.FELLOWSHIP, context((await current()).revision!));
    expect(
      (await db.majorLevelProfile.findUniqueOrThrow({ where: { id: profiles.FELLOWSHIP } })).status,
    ).toBe('ARCHIVED');
    await service.restore(profiles.FELLOWSHIP, context((await current()).revision!));
    expect(
      await db.majorLevelProfile.findUniqueOrThrow({ where: { id: profiles.FELLOWSHIP } }),
    ).toMatchObject({
      status: 'READY_TO_REVIEW',
      completenessStatus: 'NEEDS_REVIEW',
      currentPublishedVersionId: null,
    });
    expect(await db.universityAcademicProgram.findMany({ where: { universityId } })).toEqual(
      before,
    );
    expect(await db.majorVersion.count({ where: { profileId: profiles.FELLOWSHIP } })).toBe(1);
    expect(await db.majorContentSection.count({ where: { versionId: versions.FELLOWSHIP } })).toBe(
      1,
    );
  });
  it('preserves source metadata when creating a working copy and refuses published-version edits', async () => {
    await db.majorVersion.update({
      where: { id: versions.DOCTORATE },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    const section = await db.majorContentSection.findFirstOrThrow({
      where: { versionId: versions.DOCTORATE },
    });
    await expect(
      service.updateContentSections(
        majorId,
        {
          profileId: profiles.DOCTORATE,
          versionId: versions.DOCTORATE,
          sections: [
            { id: section.id, sectionKey: section.sectionKey, locale: 'en', content: 'wrong' },
          ],
        },
        context((await current()).revision!),
      ),
    ).rejects.toThrow('IMMUTABLE');
    await db.$transaction(async (tx) =>
      new PrismaMajorRepository(tx as unknown as PrismaClient, false, true).startWorkingCopy(
        profiles.DOCTORATE,
        actor,
        'Preserve source mapping in isolated acceptance',
      ),
    );
    const copy = await db.majorVersion.findFirstOrThrow({
      where: { profileId: profiles.DOCTORATE },
      orderBy: { versionNumber: 'desc' },
    });
    expect(copy.id).not.toBe(versions.DOCTORATE);
    expect(copy.sourceHash).toBe('a'.repeat(64));
    const copied = await db.majorContentSection.findFirstOrThrow({ where: { versionId: copy.id } });
    expect(copied.metadata).toEqual(section.metadata);
  });
});
