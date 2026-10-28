import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { preflightTargets } from '../../../../scripts/database/post28-isolation.mjs';
import { readDatabaseIdentity } from '../../../../scripts/database/post28-preflight.mjs';
import { PrismaReviewWorkspaceGateway } from '../../src/review-workspace/PrismaReviewWorkspaceGateway';
import { ReviewWorkspaceUseCases, type ReviewAccess } from '@manaratak/application';
import {
  reviewDomains,
  type ReviewCommand,
  type ReviewRecord,
  type ReviewOwner,
} from '@manaratak/shared';

describe('Section 02 on a new attested isolated PostgreSQL 16 database', () => {
  let db: PrismaClient, gateway: PrismaReviewWorkspaceGateway;
  const staff = randomUUID(),
    reviewer = randomUUID(),
    student = randomUUID(),
    team = randomUUID(),
    universityIds = Array.from({ length: 620 }, () => randomUUID()),
    scholarshipId = randomUUID(),
    courseId = randomUUID();
  const access: ReviewAccess = {
    actorId: staff,
    domains: [...reviewDomains],
    coordinate: true,
    imports: true,
  };
  const authorize = async (id: string) => [staff, reviewer].includes(id);
  const evidence: { isolation: unknown; latencyMs: number[]; cases: Record<string, unknown> } = {
    isolation: null,
    latencyMs: [],
    cases: {},
  };
  const command = (
    row: ReviewRecord,
    action: ReviewCommand['action'],
    extra: Partial<ReviewCommand> = {},
  ): ReviewCommand => ({
    key: row.key,
    version: row.version,
    ownerRevision: row.ownerRevision,
    idempotencyKey: randomUUID(),
    action,
    reason: 'Isolated review workflow test',
    ...extra,
  });
  const find = async (id: string) => (await gateway.list(access, { search: id })).records[0];
  beforeAll(async () => {
    if (
      process.env.REVIEW_WORKSPACE_DB_TESTS !== 'YES' ||
      process.env.NODE_ENV !== 'test' ||
      process.env.POST28_TARGET_LABEL !== 'DB-T' ||
      process.env.DATABASE_URL !== process.env.DIRECT_URL
    )
      throw new Error('REVIEW_ISOLATED_DATABASE_AUTHORIZATION_REQUIRED');
    const contract = JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE!, 'utf8'));
    if (contract.kind !== 'POST28_LOCAL_DATABASE_TARGETS' || contract.postgresMajor !== 16)
      throw new Error('REVIEW_LOCAL_POSTGRES16_REQUIRED');
    evidence.isolation = await preflightTargets(
      contract,
      [{ label: 'DB-T', url: process.env.DATABASE_URL }],
      process.env,
      contract.sourceSha,
      readDatabaseIdentity,
      { requireValidatedCatalog: true },
    );
    db = new PrismaClient();
    await db.$connect();
    const [role] = await db.$queryRaw<
      Array<Record<string, boolean>>
    >`SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user`;
    expect(Object.values(role).every((value) => value === false)).toBe(true);
    expect(await db.university.count()).toBe(0);
    await db.identityRecord.createMany({
      data: [staff, reviewer, student].map((id) => ({
        id,
        type: 'Human',
        status: 'ACTIVE',
        createdBy: 'ISOLATED_REVIEW_TEST',
      })),
    });
    await db.accountRecord.createMany({
      data: [staff, reviewer, student].map((identityId) => ({ identityId, accessState: 'Active' })),
    });
    await db.userRecord.createMany({
      data: [staff, reviewer, student].map((identityId, i) => ({
        identityId,
        displayName: ['مراجع الاختبار', 'Review reviewer', 'Synthetic student'][i],
        primaryEmail: identityId + '@isolated.invalid',
        isEmailVerified: true,
      })),
    });
    await db.roleRecord.create({
      data: {
        id: team,
        name: 'Synthetic editorial team',
        description: 'Isolated only',
        permissions: [],
        policyIds: [],
      },
    });
    await db.roleAssignmentRecord.createMany({
      data: [staff, reviewer].map((identityId) => ({ id: randomUUID(), roleId: team, identityId })),
    });
    await db.university.createMany({
      data: universityIds.map((id, index) => ({
        id,
        publicId: 'REVIEW-U-' + String(index).padStart(4, '0'),
        slug: 'review-u-' + index,
        canonicalName: 'University ' + index,
        canonicalDedupKey: id,
        displayName:
          index === 619 ? 'إِدارةُ المِنَح — خارج أول خمسمائة' : 'جامعة الاختبار ' + index,
        status: 'READY_TO_REVIEW',
        completenessStatus: index % 2 ? 'COMPLETE' : 'INCOMPLETE',
      })),
    });
    await db.scholarship.create({
      data: {
        id: scholarshipId,
        publicId: 'REVIEW-S-001',
        slug: 'review-s-001',
        canonicalName: 'Scholarship test',
        canonicalDedupKey: scholarshipId,
        displayName: 'منحة اختبار',
        status: 'READY_TO_REVIEW',
        completenessStatus: 'INCOMPLETE',
        verificationStatus: 'PENDING',
      },
    });
    await db.course.create({
      data: {
        id: courseId,
        publicId: 'REVIEW-C-001',
        slug: 'review-c-001',
        canonicalName: 'Course test',
        canonicalDedupKey: courseId,
        displayName: 'دورة اختبار',
        accessType: 'FREE',
        originType: 'INTERNAL',
        directCourseUrl: 'https://example.invalid/course',
        status: 'READY_TO_REVIEW',
        completenessStatus: 'COMPLETE',
      },
    });
    gateway = new PrismaReviewWorkspaceGateway(db);
  });
  afterAll(async () => {
    if (process.env.REVIEW_DATABASE_EVIDENCE_FILE)
      fs.writeFileSync(
        process.env.REVIEW_DATABASE_EVIDENCE_FILE,
        JSON.stringify(
          {
            ...evidence,
            scope: 'SYNTHETIC_NEW_ISOLATED_POSTGRES16_ONLY',
            productionOrNeonTouched: false,
          },
          null,
          2,
        ),
      );
    await db?.$disconnect();
  });
  it('has no fabricated totals before synchronization, then counts unique owner records despite overlapping reasons', async () => {
    const before = await gateway.list(access, {});
    expect(before.total).toBeNull();
    expect(before.coverage).toBe('partial');
    const sources = await gateway.synchronize(access);
    evidence.cases.sources = sources;
    const page = await gateway.list(access, {});
    expect(page.total).toBe(622);
    expect(page.records.length).toBe(25);
    expect(page.counters.open).toBe(622);
    expect(page.counters.overdue).toBeNull();
    expect(page.counters.withoutSla).toBe(622);
    expect(page.coverage).toBe('complete');
    const scholarship = await find(scholarshipId);
    expect(scholarship.reasons).toEqual(
      expect.arrayContaining([
        'workflow_review',
        'incomplete',
        'source_verification',
        'needs_translation',
      ]),
    );
    expect((await gateway.list(access, { domain: 'scholarships' })).total).toBe(1);
  });
  it('finds Arabic/English/reference/id/reason matches beyond row 500 on the server without exposing PII', async () => {
    const start = performance.now(),
      page = await gateway.list(access, { search: 'ادارة المنح' });
    evidence.latencyMs.push(performance.now() - start);
    expect(page.total).toBe(1);
    expect(page.records[0].ownerId).toBe(universityIds[619]);
    expect((await gateway.list(access, { search: 'REVIEW-U-0619' })).records[0].ownerId).toBe(
      universityIds[619],
    );
    expect((await gateway.list(access, { search: 'بيانات ناقصة' })).total).toBe(311);
    expect(JSON.stringify(page)).not.toMatch(
      /primaryEmail|primaryPhone|passwordHash|rawPayload|alternativeContacts/,
    );
    expect((await gateway.list(access, { search: "%' OR true --" })).total).toBe(0);
  });
  it('traverses all results once with stable keyset and rejects stale traversal after owner or access changes', async () => {
    let page = await gateway.list(access, { domain: 'universities', pageSize: 50 }),
      keys = page.records.map((row) => row.key);
    const first = page;
    while (page.nextCursor) {
      page = await gateway.list(access, {
        domain: 'universities',
        pageSize: 50,
        cursor: page.nextCursor,
        snapshot: page.snapshot,
      });
      keys.push(...page.records.map((row) => row.key));
    }
    expect(keys).toHaveLength(620);
    expect(new Set(keys).size).toBe(620);
    await db.university.update({
      where: { id: universityIds[0] },
      data: { displayName: 'Changed after snapshot' },
    });
    await expect(
      gateway.list(access, {
        domain: 'universities',
        pageSize: 50,
        cursor: first.nextCursor!,
        snapshot: first.snapshot,
      }),
    ).rejects.toThrow('REVIEW_SNAPSHOT_CHANGED');
    await expect(
      gateway.list(
        { ...access, actorId: reviewer },
        { domain: 'universities', pageSize: 50, cursor: first.nextCursor! },
      ),
    ).rejects.toThrow('REVIEW_SNAPSHOT_CHANGED');
  });
  it('persists claims, notes, assignment audit/outbox and prevents replay duplication or incompatible replay', async () => {
    await gateway.synchronize(access, 'universities');
    let row = await find(universityIds[1]);
    const claim = command(row, 'claim');
    const result = await gateway.command(access, claim, authorize);
    expect(await gateway.command(access, claim, authorize)).toEqual(result);
    row = await find(universityIds[1]);
    expect(row.assigneeId).toBe(staff);
    expect(row.version).toBe(claim.version + 1);
    await expect(
      gateway.command(access, { ...claim, reason: 'different request' }, authorize),
    ).rejects.toThrow('REVIEW_IDEMPOTENCY_CONFLICT');
    await gateway.command(
      access,
      command(row, 'note', { note: 'Professional isolated review note' }),
      authorize,
    );
    row = await find(universityIds[1]);
    await gateway.command(access, command(row, 'assign', { assigneeId: reviewer }), authorize);
    const history = await gateway.history(access, row.key);
    expect(history.filter((event) => event.action === 'CLAIM')).toHaveLength(1);
    expect(history.some((event) => event.note === 'Professional isolated review note')).toBe(true);
    expect(
      await db.auditRecord.count({ where: { targetId: row.key, targetType: 'REVIEW_WORK_CASE' } }),
    ).toBe(3);
    const notices = await db.transactionalOutboxRecord.findMany({
      where: { domain: 'REVIEW_QUEUE', aggregateId: row.key },
    });
    expect(notices).toHaveLength(1);
    expect(notices[0].payload).toMatchObject({ recipientReference: reviewer });
    expect(JSON.stringify(notices[0].payload)).not.toContain('Professional isolated');
  });
  it('refuses an unauthorized reviewer, source revision mismatch and stale optimistic versions', async () => {
    const row = await find(universityIds[2]);
    await expect(
      gateway.command(access, command(row, 'assign', { assigneeId: student }), authorize),
    ).rejects.toThrow('REVIEW_ASSIGNEE_FORBIDDEN');
    await db.university.update({
      where: { id: row.ownerId },
      data: { displayName: 'Owner edited concurrently' },
    });
    await expect(gateway.command(access, command(row, 'claim'), authorize)).rejects.toThrow(
      'REVIEW_OWNER_CHANGED',
    );
    const fresh = await find(universityIds[2]);
    await gateway.command(access, command(fresh, 'priority', { priority: 'critical' }), authorize);
    await expect(
      gateway.command(access, command(fresh, 'note', { note: 'stale note' }), authorize),
    ).rejects.toThrow('REVIEW_VERSION_CONFLICT');
  });
  it('rolls back coordination when history persistence fails and keeps history append-only', async () => {
    const row = await find(universityIds[10]);
    await expect(
      gateway.command(access, command(row, 'note', { note: 'x'.repeat(2001) }), authorize),
    ).rejects.toThrow();
    expect((await find(row.ownerId)).version).toBe(row.version);
    expect((await gateway.history(access, row.key)).some((event) => event.action === 'NOTE')).toBe(
      false,
    );
    await expect(
      db.$executeRaw`UPDATE "ReviewWorkEvent" SET note='tampered' WHERE "caseKey"=${row.key}`,
    ).rejects.toThrow('REVIEW_HISTORY_APPEND_ONLY');
  });
  it('allows only one of two simultaneous claims', async () => {
    const row = await find(universityIds[3]);
    const result = await Promise.allSettled([
      gateway.command(access, command(row, 'claim'), authorize),
      gateway.command({ ...access, actorId: reviewer }, command(row, 'claim'), authorize),
    ]);
    expect(result.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(result.filter((item) => item.status === 'rejected')).toHaveLength(1);
  });
  it('supports explicitly approved team membership and prevents team assignment to unauthorized members', async () => {
    await db.settings.create({
      data: { key: 'review-workspace.approved-team-roles', value: [team] },
    });
    const row = await find(universityIds[4]);
    await gateway.command(access, command(row, 'assign', { teamId: team }), authorize);
    expect((await find(row.ownerId)).teamId).toBe(team);
    await db.roleAssignmentRecord.create({
      data: { id: randomUUID(), identityId: student, roleId: team },
    });
    const another = await find(universityIds[5]);
    await expect(
      gateway.command(access, command(another, 'assign', { teamId: team }), authorize),
    ).rejects.toThrow('REVIEW_TEAM_FORBIDDEN');
  });
  it('records first observation, completion and a new review cycle only after a proven owner change', async () => {
    const row = await find(courseId);
    expect(row.enteredAt).not.toBeNull();
    await db.course.update({ where: { id: courseId }, data: { status: 'PUBLISHED' } });
    await gateway.synchronize(access, 'courses');
    expect((await gateway.list(access, { domain: 'courses' })).total).toBe(0);
    expect(
      (await gateway.history(access, row.key)).some(
        (event) => event.action === 'OBSERVED_COMPLETED',
      ),
    ).toBe(true);
    await db.course.update({ where: { id: courseId }, data: { status: 'READY_TO_REVIEW' } });
    await gateway.synchronize(access, 'courses');
    expect((await find(courseId)).cycle).toBe(2);
    const analytics = await gateway.analytics(access, 30);
    expect(analytics.completed).toBeGreaterThanOrEqual(1);
    expect(analytics.newCases).toBeGreaterThanOrEqual(623);
    expect(analytics.medianHours).not.toBeNull();
    expect(analytics.measuredFrom).not.toBeNull();
    evidence.cases.analytics = analytics;
  });
  it('uses approved UTC elapsed-hour policy for new cycles only, without retroactive deadlines', async () => {
    const before = await find(courseId);
    expect(before.dueAt).toBeNull();
    await gateway.approvePolicy(access, {
      domain: 'courses',
      version: 0,
      hours: 24,
      warningHours: 3,
      reason: 'Synthetic owner-approved elapsed-hour review policy',
    });
    await db.course.update({ where: { id: courseId }, data: { status: 'PUBLISHED' } });
    await gateway.synchronize(access, 'courses');
    await db.course.update({ where: { id: courseId }, data: { status: 'READY_TO_REVIEW' } });
    await gateway.synchronize(access, 'courses');
    const after = await find(courseId);
    expect(after.policyId).toBe('courses:1');
    expect(after.sla).toBe('on_track');
    expect(+new Date(after.dueAt!) - +new Date(after.enteredAt!)).toBe(86400000);
    await gateway.approvePolicy(access, {
      domain: 'courses',
      version: 1,
      hours: 72,
      warningHours: 2,
      reason: 'Synthetic updated policy for future cycles only',
    });
    await db.$executeRaw`UPDATE "ReviewWorkCase" SET "dueAt"=CURRENT_TIMESTAMP+interval '150 minutes' WHERE "key"=${after.key}`;
    expect((await find(courseId)).sla).toBe('near_due');
    await db.$executeRaw`UPDATE "ReviewWorkCase" SET "dueAt"=CURRENT_TIMESTAMP-interval '1 second',"enteredAt"=CURRENT_TIMESTAMP-interval '1 day' WHERE "key"=${after.key}`;
    expect(
      (await gateway.list(access, { view: 'overdue' })).records.map((row) => row.ownerId),
    ).toContain(courseId);
    expect((await gateway.list(access, {})).counters.overdue).toBe(1);
  });
  it('keeps partial source counts unknown and never closes cases after failed source reads', async () => {
    await db.$executeRaw`UPDATE "ReviewSourceCheckpoint" SET "errorCode"='REVIEW_SOURCE_UNAVAILABLE' WHERE domain='universities'`;
    const page = await gateway.list(access, {});
    expect(page.total).toBeNull();
    expect(page.counters.open).toBeNull();
    expect(page.sources.find((source) => source.domain === 'universities')?.state).toBe(
      'unavailable',
    );
    expect((await find(universityIds[6])).caseId).not.toBeNull();
    await gateway.synchronize(access, 'universities');
  });
  it('keeps personal/shared views free of saved search text and reports partial bulk results per record', async () => {
    await expect(
      gateway.saveView(access, {
        name: 'Private search',
        shared: false,
        filters: { search: 'private name' },
      }),
    ).rejects.toThrow('REVIEW_SEARCH_STORAGE_FORBIDDEN');
    await gateway.saveView(access, {
      name: 'My urgent reviews',
      shared: false,
      filters: { view: 'mine', priority: 'high' },
    });
    expect(
      (await gateway.views({ ...access, actorId: reviewer })).some(
        (view) => view.name === 'My urgent reviews',
      ),
    ).toBe(false);
    const uc = new ReviewWorkspaceUseCases(gateway, {
        evaluatePermission: async () => ({ isGranted: true }),
      } as never),
      a = await find(universityIds[8]),
      b = await find(universityIds[9]);
    const result = await uc.bulk(staff, [
      command(a, 'priority', { priority: 'low' }),
      command(b, 'priority', { version: b.version + 99, priority: 'low' }),
    ]);
    expect(result.results.map((row) => row.ok)).toEqual([true, false]);
  });
  it('covers all nine owners and preserves profile/import identities', async () => {
    const canonical = (name: string) => ({
      id: randomUUID(),
      publicId: 'RW-' + randomUUID(),
      slug: 'rw-' + randomUUID(),
      canonicalName: name,
      canonicalDedupKey: randomUUID(),
      displayName: name,
    });
    const country = await db.referenceCountry.create({
      data: {
        iso2Code: 'XX',
        iso3Code: 'XXX',
        name: 'Synthetic destination',
        nameAr: 'وجهة اختبار معزولة',
      },
    });
    const major = await db.major.create({
      data: {
        ...canonical('هندسة اختبار المراجعة'),
        localizedNameEn: 'Review Engineering',
        status: 'READY_TO_REVIEW',
        completenessStatus: 'NEEDS_REVIEW',
      },
    });
    const profile = await db.majorLevelProfile.create({
      data: {
        majorId: major.id,
        level: 'BACHELOR',
        localizedNameAr: 'هندسة اختبار المراجعة',
        status: 'READY_TO_REVIEW',
        completenessStatus: 'NEEDS_REVIEW',
      },
    });
    await db.internationalTest.create({
      data: {
        ...canonical('اختبار لغوي معزول'),
        status: 'READY_TO_REVIEW',
        completenessStatus: 'INCOMPLETE',
      },
    });
    await db.serviceCatalogRecord.create({
      data: {
        ...canonical('خدمة كتالوج اختبار'),
        status: 'READY_TO_REVIEW',
        completenessStatus: 'INCOMPLETE',
        serviceCategory: 'EDUCATION',
        fulfillmentType: 'MANUAL',
        serviceDescription: 'Synthetic catalog only',
        serviceAvailabilityStatus: 'AVAILABLE',
        requiredInputsOrDocuments: [],
        deliveryMode: 'ONLINE',
        responsibleServiceOwnerType: 'INTERNAL',
      },
    });
    await db.cmsContentNode.create({
      data: {
        publicId: 'CMS-' + randomUUID(),
        slug: 'cms-' + randomUUID(),
        contentType: 'ARTICLE',
        status: 'IN_REVIEW',
        title: 'محتوى المراجعة المعزول',
        authorId: staff,
        ownerId: staff,
        lastModifiedBy: staff,
      },
    });
    const employer = await db.careerEmployerRecord.create({
      data: {
        ...canonical('Synthetic employer'),
        employerType: 'ORGANIZATION',
        verificationStatus: 'VERIFIED',
      },
    });
    await db.careerJobPostingRecord.create({
      data: {
        publicId: 'JOB-' + randomUUID(),
        slug: 'job-' + randomUUID(),
        canonicalTitle: 'Synthetic review opportunity',
        canonicalDedupKey: randomUUID(),
        title: 'فرصة مراجعة معزولة',
        opportunityType: 'JOB',
        employmentType: 'FULL_TIME',
        jobCategory: 'EDUCATION',
        description: 'Synthetic owner record',
        countryReferenceId: country.id,
        status: 'READY_TO_REVIEW',
        employerId: employer.id,
      },
    });
    const batch = await db.importBatch.create({
      data: {
        sourceSystem: 'ISOLATED_OWNER_SOURCE',
        dataType: 'SCHOLARSHIPS',
        batchStatus: 'COMPLETED',
      },
    });
    const imported = await db.importRecord.create({
      data: {
        batchId: batch.id,
        status: 'STAGED_INCOMPLETE',
        rawPayload: { scholarshipName: 'منحة مصدر معزول', _operationalClass: 'REAL' },
      },
    });
    await db.importRecord.create({
      data: {
        batchId: batch.id,
        status: 'STAGED_INCOMPLETE',
        rawPayload: { scholarshipName: 'Never show DEMO', _operationalClass: 'DEMO' },
      },
    });
    await gateway.synchronize(access);
    expect((await gateway.list(access, {})).coverage).toBe('complete');
    for (const domain of reviewDomains)
      expect((await gateway.list(access, { domain })).records.length).toBeGreaterThan(0);
    const majorRow = (await gateway.list(access, { domain: 'majors' })).records[0];
    expect(majorRow.ownerId).toBe(major.id);
    expect(majorRow.profileId).toBe(profile.id);
    expect(majorRow.href).toContain('profileId=' + profile.id);
    const destination = (await gateway.list(access, { domain: 'study-destinations' })).records[0];
    expect(destination.ownerId).toBe(country.id);
    expect(destination.href).toBe('/study-destinations/XX');
    const importPage = await gateway.list(access, { reason: 'import_review' });
    expect(importPage.total).toBe(1);
    expect(importPage.records[0].ownerId).toBe(imported.id);
    expect(importPage.records[0].href).toContain('/imports/scholarships?reviewBatch=');
    expect(
      (await gateway.list({ ...access, imports: false }, { reason: 'import_review' })).records,
    ).toHaveLength(0);
    await expect(
      gateway.history({ ...access, imports: false }, importPage.records[0].key),
    ).rejects.toThrow('REVIEW_FORBIDDEN');
    const withoutImports = { ...access, imports: false };
    for (const days of [7, 30, 90, 365]) {
      const measured = await gateway.analytics(withoutImports, days);
      const [expected] = await db.$queryRaw<
        Array<{ entered: bigint; completed: bigint; measured: Date | null }>
      >`
        SELECT count(*) FILTER(WHERE e.action IN ('OBSERVED_ENTERED','OBSERVED_REOPENED') AND e."createdAt">=CURRENT_TIMESTAMP-make_interval(days=>${days}::int)) entered,
        count(*) FILTER(WHERE e.action='OBSERVED_COMPLETED' AND e."createdAt">=CURRENT_TIMESTAMP-make_interval(days=>${days}::int)) completed,
        min(e."createdAt") measured FROM "ReviewWorkEvent" e JOIN "ReviewWorkCase" c ON c."key"=e."caseKey"
        WHERE c."profileId" IS DISTINCT FROM 'import'`;
      expect(measured.newCases).toBe(Number(expected.entered));
      expect(measured.completed).toBe(Number(expected.completed));
      expect(measured.measuredFrom).toBe(expected.measured?.toISOString() ?? null);
      expect(measured.series.reduce((sum, day) => sum + day.entered, 0)).toBe(
        Number(expected.entered),
      );
      expect(measured.series.reduce((sum, day) => sum + day.completed, 0)).toBe(
        Number(expected.completed),
      );
      const withImports = await gateway.analytics(access, days);
      expect(withImports.newCases).toBeGreaterThan(measured.newCases!);
    }
    evidence.cases.allOwnerCoverage = reviewDomains;
  });
  it('does not leak owner records or history outside explicitly permitted domains', async () => {
    const restricted = { ...access, domains: ['courses'] as ReviewOwner[] };
    const page = await gateway.list(restricted, {});
    expect(page.records.every((row) => row.domain === 'courses')).toBe(true);
    expect(page.sources.find((source) => source.domain === 'universities')).toMatchObject({
      state: 'forbidden',
      observed: null,
      synchronizedAt: null,
    });
    await expect(
      gateway.history(restricted, 'universities:' + universityIds[0] + ':'),
    ).rejects.toThrow('REVIEW_FORBIDDEN');
  });
});
