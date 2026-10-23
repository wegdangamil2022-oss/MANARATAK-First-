import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID, createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { preflightTargets } from '../../../../scripts/database/post28-isolation.mjs';
import { readDatabaseIdentity } from '../../../../scripts/database/post28-preflight.mjs';
import { PrismaExecutiveDashboardGateway } from '../../src/dashboard/PrismaExecutiveDashboardGateway';
import {
  PrismaPublicAnalyticsGateway,
  PrismaManagedApplicationEvidenceGateway,
  safeApplicationHost,
} from '../../src/dashboard/PrismaDashboardMeasurementGateway';
import { PrismaServicePlatformRepository } from '../../src/services-platform/PrismaServicePlatformRepository';
import { PrismaAssetRecordRepository } from '../../src/asset-platform/PrismaAssetRecordRepository';
import { PrismaScholarshipRepository } from '../../src/scholarships/PrismaScholarshipRepository';
import {
  PublicScholarshipUseCases,
  StudentServiceRequestUseCases,
  AdminServiceFulfillmentUseCases,
  AssetReferencePolicy,
  dashboardPeriod,
  ManagedApplicationEvidenceUseCases,
  analyticsTokenHash,
} from '@manaratak/application';
import { ANALYTICS_POLICY_VERSION } from '@manaratak/shared';
import {
  AssetRecord,
  AssetId,
  AssetReference,
  AssetOwnerReference,
  AssetStorageLocator,
  AssetStorageZone,
  AssetMetadata,
  AssetChecksum,
  AssetSanitizationMetadata,
  AssetRetentionMetadata,
  AssetRetentionCategory,
  AssetLifecycleState,
  AssetSecurityClassification,
  ServiceRequestStatus,
} from '@manaratak/domain';

// Hard fail outside the explicit, freshly attested local application-role target.
describe('Executive dashboard on a new isolated PostgreSQL 16 target', () => {
  let db: PrismaClient,
    reads: PrismaExecutiveDashboardGateway,
    analytics: PrismaPublicAnalyticsGateway,
    evidence: PrismaManagedApplicationEvidenceGateway;
  const now = new Date(),
    student = randomUUID(),
    staff = randomUUID(),
    scholarshipId = randomUUID(),
    versionId = randomUUID(),
    serviceId = randomUUID(),
    cycleId = randomUUID();
  const firstToken = '1'.repeat(64),
    secondToken = '2'.repeat(64),
    period = dashboardPeriod(30, now);
  const fixture = {
    scope: 'SYNTHETIC_ONLY_NEW_LOCAL_CLUSTER',
    isolation: null as unknown,
    latencyMs: [] as number[],
    queryPlan: null as unknown,
  };
  let requestId = '',
    requestVersion = 0,
    proofId = '';
  const require = createRequire(path.join(process.cwd(), 'package.json'));
  // PostgreSQL timestamp(3) rounds server defaults; wait past the committed
  // timestamp before asserting a strict, exclusive JS millisecond upper bound.
  async function periodAfter(stamp: Date) {
    const deadline = Date.now() + 100;
    while (Date.now() <= +stamp) {
      if (Date.now() >= deadline) throw new Error('ISOLATED_DATABASE_CLOCK_SKEW');
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    return dashboardPeriod(30);
  }
  async function verifiedAsset(ownerId: string) {
    const id = randomUUID(),
      stamp = new Date(),
      bytes = Buffer.from('%PDF-1.4\nSynthetic isolated evidence only\n%%EOF'),
      hash = createHash('sha256').update(bytes).digest('hex'),
      quarantine = `quarantine://synthetic/uploads/${id}.pdf`;
    const asset = new AssetRecord({
      id: new AssetId(id),
      reference: new AssetReference('dashboard-fixture-' + id),
      owner: new AssetOwnerReference(ownerId, 'STUDENT'),
      state: AssetLifecycleState.ACTIVE,
      classification: AssetSecurityClassification.CONFIDENTIAL,
      locator: new AssetStorageLocator(AssetStorageZone.CLEAN, 'synthetic', `clean/${id}.pdf`),
      metadata: new AssetMetadata('synthetic-evidence.pdf', 'application/pdf', 'pdf', bytes.length),
      retention: new AssetRetentionMetadata(
        AssetRetentionCategory.TEMPORARY,
        new Date(+stamp + 180 * 86400000),
      ),
      checksum: new AssetChecksum('sha256', hash),
      sanitization: new AssetSanitizationMetadata(true, stamp),
      malwareScan: { status: 'PASSED', locator: quarantine, scannedAt: stamp.toISOString() },
      uploadVerification: {
        locator: quarantine,
        byteSize: bytes.length,
        verifiedMimeType: 'application/pdf',
        checksumSha256: hash,
        verifiedAt: stamp.toISOString(),
        signatureVerified: true,
      },
    });
    asset.assertCanDeliver();
    await new PrismaAssetRecordRepository(db).save(asset);
    return id;
  }
  beforeAll(async () => {
    if (
      process.env.EXECUTIVE_DASHBOARD_DB_TESTS !== 'YES' ||
      process.env.POST28_TARGET_LABEL !== 'DB-T' ||
      process.env.DATABASE_URL !== process.env.DIRECT_URL
    )
      throw new Error('EXECUTIVE_ISOLATED_DATABASE_AUTHORIZATION_REQUIRED');
    const contract = JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE!, 'utf8'));
    if (contract.kind !== 'POST28_LOCAL_DATABASE_TARGETS' || contract.postgresMajor !== 16)
      throw new Error('EXECUTIVE_LOCAL_POSTGRES16_REQUIRED');
    fixture.isolation = await preflightTargets(
      contract,
      [{ label: 'DB-T', url: process.env.DATABASE_URL }],
      process.env,
      contract.sourceSha,
      readDatabaseIdentity,
      { requireValidatedCatalog: true },
    );
    const Client = process.env.EXECUTIVE_PRISMA_CLIENT_MODULE
      ? require(process.env.EXECUTIVE_PRISMA_CLIENT_MODULE).PrismaClient
      : PrismaClient;
    db = new Client({ datasources: { db: { url: process.env.DATABASE_URL } } });
    await db.$connect();
    expect(await db.identityRecord.count()).toBe(0);
    expect(await db.serviceRequestRecord.count()).toBe(0);
    const role = await db.$queryRaw<
      Array<{
        rolsuper: boolean;
        rolcreatedb: boolean;
        rolcreaterole: boolean;
        rolbypassrls: boolean;
      }>
    >`SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user`;
    expect(Object.values(role[0]).every((value) => value === false)).toBe(true);
    await db.roleRecord.create({
      data: {
        id: 'student',
        name: 'Student',
        description: 'Isolated role',
        permissions: [],
        policyIds: [],
      },
    });
    const people = [
      { id: student, age: 2, status: 'ACTIVE', verified: true, student: true },
      { id: staff, age: 10, status: 'ACTIVE', verified: true, student: false },
      { id: randomUUID(), age: 3, status: 'SUSPENDED', verified: true, student: true },
      { id: randomUUID(), age: 40, status: 'ACTIVE', verified: true, student: false },
      { id: randomUUID(), age: 2, status: 'PROVISIONED', verified: false, student: true },
      { id: randomUUID(), age: 2, status: 'ARCHIVED', verified: true, student: true },
    ];
    for (const person of people)
      await db.identityRecord.create({
        data: {
          id: person.id,
          type: 'Human',
          status: person.status,
          createdBy: 'isolated-dashboard-fixture',
          createdAt: new Date(+now - person.age * 86400000),
          user: {
            create: {
              displayName: 'Synthetic user',
              primaryEmail: person.id + '@example.test',
              isEmailVerified: person.verified,
            },
          },
          account: {
            create: { accessState: person.status === 'SUSPENDED' ? 'Suspended' : 'Active' },
          },
          ...(person.student
            ? { roleAssignments: { create: { id: randomUUID(), roleId: 'student' } } }
            : {}),
        },
      });
    await db.identityRecord.create({
      data: {
        id: randomUUID(),
        type: 'Service',
        status: 'ACTIVE',
        createdBy: 'isolated-dashboard-fixture',
      },
    });
    await db.studentWorkspace.create({ data: { studentReferenceId: student, status: 'ACTIVE' } });
    await db.scholarship.create({
      data: {
        id: scholarshipId,
        publicId: 'dashboard-scholarship',
        slug: 'dashboard-scholarship',
        canonicalName: 'Synthetic Scholarship',
        canonicalDedupKey: randomUUID(),
        displayName: 'Synthetic Scholarship',
        status: 'PUBLISHED',
        publicationStatus: 'PUBLISHED',
        verificationStatus: 'VERIFIED',
        completenessStatus: 'COMPLETE',
        applicationUrl: 'https://university.example.org/apply',
        sourceLocale: 'en',
        versions: {
          create: {
            id: versionId,
            versionNumber: 1,
            status: 'PUBLISHED',
            snapshot: {},
            publishedAt: now,
          },
        },
      },
    });
    await db.scholarshipApplicationCycle.create({
      data: { id: cycleId, scholarshipId, versionId, cycleKey: '2026', status: 'PUBLISHED' },
    });
    await db.studentApplicationTracker.create({
      data: {
        studentReferenceId: student,
        scholarshipId,
        scholarshipSlug: 'dashboard-scholarship',
        cycleReferenceId: cycleId,
        ownerSnapshot: { scholarshipId, versionId, cycleId },
      },
    });
    const published = new PublicScholarshipUseCases(new PrismaScholarshipRepository(db));
    const resolver = async (key: string) => {
      const owner =
        key === scholarshipId
          ? await db.scholarship.findUnique({ where: { id: key } })
          : await db.scholarship.findUnique({ where: { slug: key } });
      if (!owner) return null;
      try {
        const value = await published.getScholarship(owner.slug, 'en');
        return { id: owner.id, applicationUrl: value.applicationUrl };
      } catch {
        return null;
      }
    };
    reads = new PrismaExecutiveDashboardGateway(db);
    analytics = new PrismaPublicAnalyticsGateway(db, resolver);
    evidence = new PrismaManagedApplicationEvidenceGateway(db, resolver);
    await db.serviceCatalogRecord.create({
      data: {
        id: serviceId,
        publicId: 'dashboard-service',
        slug: 'dashboard-service',
        canonicalName: 'Managed application',
        canonicalDedupKey: randomUUID(),
        displayName: 'Managed application',
        status: 'PUBLISHED',
        completenessStatus: 'COMPLETE',
        serviceCategory: 'ACADEMIC_SERVICES',
        fulfillmentType: 'APPLICATION_SUPPORT',
        managedApplication: true,
        serviceDescription: 'Synthetic managed application',
        serviceAvailabilityStatus: 'AVAILABLE',
        requiredInputsOrDocuments: ['document'],
        deliveryMode: 'ONLINE',
        responsibleServiceOwnerType: 'MANARATAK_TEAM',
        fulfillmentPolicy: 'FREE',
        inputSchema: [{ key: 'document', type: 'ASSET', required: true }],
      },
    });
  });
  afterAll(async () => {
    if (db) await db.$disconnect();
    if (process.env.EXECUTIVE_DATABASE_EVIDENCE_FILE)
      fs.writeFileSync(
        process.env.EXECUTIVE_DATABASE_EVIDENCE_FILE,
        JSON.stringify(fixture, null, 2),
      );
  });
  it('counts qualified accounts and canonical students separately; time-series totals and comparisons agree', async () => {
    const result = await reads.users(period);
    expect(result.registeredUsers).toBe(4);
    expect(result.registeredStudents).toBe(2);
    expect(result.newRegistrations).toBe(3);
    expect(result.previousRegistrations).toBe(1);
    expect(result.growthPercent).toBe(200);
    expect(result.registrations.reduce((sum, p) => sum + (p.value ?? 0), 0)).toBe(3);
  });
  it('has no fabricated traffic history before the first consenting event', async () => {
    const off = await reads.traffic(period, false),
      fresh = await reads.traffic(period, true);
    expect(off.visitors).toBeNull();
    expect(fresh.pageViews).toBeNull();
    expect(fresh.measurementStartedAt).toBeNull();
    expect(fresh.visits).toEqual([]);
  });
  it('separates visitors from views, retries from events, and outbound referral from application', async () => {
    await analytics.grant(
      analyticsTokenHash(firstToken),
      new Date(Date.now() + 29 * 86400000),
      ANALYTICS_POLICY_VERSION,
    );
    await analytics.grant(
      analyticsTokenHash(secondToken),
      new Date(Date.now() + 29 * 86400000),
      ANALYTICS_POLICY_VERSION,
    );
    const event = { eventId: randomUUID(), kind: 'page_view' as const, pageKey: 'home' as const };
    expect(await analytics.record(analyticsTokenHash(firstToken), event)).toBe('recorded');
    expect(await analytics.record(analyticsTokenHash(firstToken), event)).toBe('duplicate');
    expect(
      await analytics.record(analyticsTokenHash(firstToken), { ...event, eventId: randomUUID() }),
    ).toBe('duplicate');
    await analytics.record(analyticsTokenHash(firstToken), {
      eventId: randomUUID(),
      kind: 'page_view',
      pageKey: 'scholarships',
    });
    await analytics.record(analyticsTokenHash(secondToken), { ...event, eventId: randomUUID() });
    await analytics.record(analyticsTokenHash(firstToken), {
      eventId: randomUUID(),
      kind: 'application_outbound_click',
      pageKey: 'scholarships',
      opportunityId: 'dashboard-scholarship',
    });
    const end = dashboardPeriod(30),
      traffic = await reads.traffic(end, true);
    expect(traffic.pageViews).toBe(3);
    expect(traffic.visitors).toBe(2);
    expect(traffic.outboundClicks).toBe(1);
    expect(traffic.outboundVisitors).toBe(1);
    expect(traffic.destinations).toEqual([{ host: 'university.example.org', clicks: 1 }]);
    expect(traffic.status).toBe('partial');
    const applications = await reads.applications(end);
    expect(applications.managedServiceRequests).toBe(0);
    expect(applications.managedUniversitySubmissions).toBe(0);
    expect(await db.studentApplicationTracker.count()).toBe(1);
  });
  it('creates one submitted service receipt with canonical opportunity and safe documents; uploads/trackers never count', async () => {
    const document = await verifiedAsset(student),
      repo = new PrismaServicePlatformRepository(db),
      policy = new AssetReferencePolicy(new PrismaAssetRecordRepository(db));
    expect((await reads.applications(dashboardPeriod(30))).managedServiceRequests).toBe(0);
    const creator = new StudentServiceRequestUseCases(repo, repo, policy, async (key) =>
        key === 'dashboard-scholarship' ? scholarshipId : null,
      ),
      input = {
        studentReferenceId: student,
        serviceId,
        applicationOpportunityId: 'dashboard-scholarship',
        consent: true,
        idempotencyKey: 'dashboard-request-1',
        requestParameters: { document },
      };
    const a = await creator.createRequest(input),
      b = await creator.createRequest(input);
    expect(a.id).toBe(b.id);
    requestId = a.id;
    requestVersion = a.version;
    const projection = await reads.applications(await periodAfter(a.createdAt));
    expect(projection.managedServiceRequests).toBe(1);
    expect(projection.managedUniversitySubmissions).toBe(0);
    expect(
      (await db.serviceRequestRecord.findUniqueOrThrow({ where: { id: a.id } }))
        .applicationOpportunityId,
    ).toBe(scholarshipId);
    expect(
      await db.transactionalOutboxRecord.count({
        where: { aggregateId: a.id, eventType: 'ServiceRequested.v1' },
      }),
    ).toBe(1);
  });
  it('records university submission only after trusted private proof; audit/outbox/event commit atomically', async () => {
    const repo = new PrismaServicePlatformRepository(db),
      finance = {
        getInvoiceClearance: async () => {
          throw new Error('UNEXPECTED_FINANCIAL_OPERATION');
        },
      },
      fulfillment = new AdminServiceFulfillmentUseCases(repo, repo, finance as never);
    let row = await fulfillment.transitionRequest(
      requestId,
      ServiceRequestStatus.ACCEPTED,
      requestVersion,
    );
    row = await fulfillment.transitionRequest(
      requestId,
      ServiceRequestStatus.IN_PROGRESS,
      row.version,
    );
    requestVersion = row.version;
    proofId = await verifiedAsset(staff);
    const useCases = new ManagedApplicationEvidenceUseCases(
      evidence,
      repo,
      new AssetReferencePolicy(new PrismaAssetRecordRepository(db)),
      finance as never,
    );
    const input = {
      requestId,
      expectedVersion: requestVersion,
      actorId: staff,
      kind: 'UNIVERSITY_SUBMITTED' as const,
      evidenceAssetId: proofId,
      key: 'dashboard-submit-1',
    };
    const recorded = await useCases.append(input);
    expect(await useCases.append(input)).toEqual(recorded);
    const source = await reads.applications(dashboardPeriod(30));
    expect(source.managedUniversitySubmissions).toBe(1);
    expect(source.officialAccepted).toBe(0);
    expect(source.officialRejected).toBe(0);
    expect(
      await db.auditRecord.count({
        where: { targetId: requestId, action: 'MANAGED_APPLICATION_EVIDENCE_RECORDED' },
      }),
    ).toBe(1);
    expect(
      await db.transactionalOutboxRecord.count({
        where: { aggregateId: requestId, eventType: 'ManagedApplicationEvidenceRecorded.v1' },
      }),
    ).toBe(1);
    await expect(
      db.serviceApplicationEvidence.update({
        where: { id: recorded.id },
        data: { kind: 'ADMISSION_ACCEPTED' },
      }),
    ).rejects.toThrow();
    await expect(
      db.serviceApplicationEvidence.delete({ where: { id: recorded.id } }),
    ).rejects.toThrow();
    requestVersion = (await db.serviceRequestRecord.findUniqueOrThrow({ where: { id: requestId } }))
      .version;
  });
  it('enforces one official outcome and no duplicated effect; preserves a distinct unverified self-report', async () => {
    const repo = new PrismaServicePlatformRepository(db),
      finance = {
        getInvoiceClearance: async () => {
          throw new Error('UNEXPECTED_FINANCIAL_OPERATION');
        },
      },
      useCases = new ManagedApplicationEvidenceUseCases(
        evidence,
        repo,
        new AssetReferencePolicy(new PrismaAssetRecordRepository(db)),
        finance as never,
      );
    await useCases.append({
      requestId,
      expectedVersion: requestVersion,
      actorId: staff,
      kind: 'ADMISSION_ACCEPTED',
      evidenceAssetId: proofId,
      key: 'dashboard-accept-1',
    });
    const current = await db.serviceRequestRecord.findUniqueOrThrow({ where: { id: requestId } });
    await expect(
      useCases.append({
        requestId,
        expectedVersion: current.version,
        actorId: staff,
        kind: 'ADMISSION_REJECTED',
        evidenceAssetId: proofId,
        key: 'dashboard-reject-1',
      }),
    ).rejects.toThrow('DECISION_ALREADY_RECORDED');
    await evidence.selfReport(student, 'dashboard-scholarship', 'report-one');
    await evidence.selfReport(student, 'dashboard-scholarship', 'report-two');
    const report = await db.directApplicationReport.findFirstOrThrow({
      where: { studentId: student },
    });
    const result = await reads.applications(await periodAfter(report.reportedAt));
    expect(result.officialAccepted).toBe(1);
    expect(result.officialRejected).toBe(0);
    expect(result.directSelfReportedApplications).toBe(1);
    expect(result.managedServiceRequests).toBe(1);
  });
  it('withdrawal races cannot retain a late event or allow another write; the transaction protects deletion', async () => {
    await Promise.allSettled([
      analytics.record(analyticsTokenHash(firstToken), {
        eventId: randomUUID(),
        kind: 'page_view',
        pageKey: 'courses',
      }),
      analytics.withdraw(analyticsTokenHash(firstToken)),
    ]);
    expect(
      await db.publicAnalyticsEvent.count({
        where: { consentHash: analyticsTokenHash(firstToken) },
      }),
    ).toBe(0);
    await expect(
      analytics.record(analyticsTokenHash(firstToken), {
        eventId: randomUUID(),
        kind: 'page_view',
        pageKey: 'majors',
      }),
    ).rejects.toThrow('CONSENT_REQUIRED');
  });
  it('purges expired events without deleting current consented observations', async () => {
    const token = analyticsTokenHash('expired-token'),
      grantedAt = new Date(Date.now() - 100 * 86400000),
      receivedAt = new Date(+grantedAt + 86400000);
    await db.publicAnalyticsConsent.create({
      data: {
        tokenHash: token,
        policyVersion: ANALYTICS_POLICY_VERSION,
        grantedAt,
        expiresAt: new Date(+grantedAt + 29 * 86400000),
      },
    });
    await db.publicAnalyticsEvent.create({
      data: {
        id: createHash('sha256').update(randomUUID()).digest('hex'),
        consentHash: token,
        eventId: randomUUID(),
        kind: 'page_view',
        pageKey: 'home',
        receivedAt,
        expiresAt: new Date(+receivedAt + 90 * 86400000),
      },
    });
    expect(await analytics.purgeExpired()).toBe(1);
    expect(await db.publicAnalyticsEvent.count({ where: { consentHash: token } })).toBe(0);
    expect(
      await db.publicAnalyticsEvent.count({
        where: { consentHash: analyticsTokenHash(secondToken) },
      }),
    ).toBe(1);
  });
  it('does not expose personal rows and keeps bounded indexed aggregates usable under a small load', async () => {
    const people = Array.from({ length: 2000 }, () => randomUUID());
    await db.identityRecord.createMany({
      data: people.map((id) => ({
        id,
        type: 'Human',
        status: 'ACTIVE',
        createdBy: 'synthetic-load-only',
        createdAt: new Date(),
      })),
    });
    await db.userRecord.createMany({
      data: people.map((identityId) => ({
        identityId,
        displayName: 'Synthetic load account',
        primaryEmail: identityId + '@example.test',
        isEmailVerified: true,
      })),
    });
    await db.accountRecord.createMany({
      data: people.map((identityId) => ({ identityId, accessState: 'Active' })),
    });
    const eventTime = new Date();
    await db.publicAnalyticsEvent.createMany({
      data: Array.from({ length: 5000 }, () => ({
        id: createHash('sha256').update(randomUUID()).digest('hex'),
        consentHash: analyticsTokenHash(secondToken),
        eventId: randomUUID(),
        kind: 'page_view',
        pageKey: 'home',
        receivedAt: eventTime,
        expiresAt: new Date(+eventTime + 89 * 86400000),
      })),
    });
    const started = performance.now();
    for (let i = 0; i < 5; i++) {
      const before = performance.now();
      const result = await reads.users(dashboardPeriod(30));
      fixture.latencyMs.push(performance.now() - before);
      expect(JSON.stringify(result)).not.toContain('@example.test');
    }
    expect(performance.now() - started).toBeLessThan(10000);
    fixture.queryPlan =
      await db.$queryRaw`EXPLAIN (FORMAT JSON) SELECT count(*) FROM "PublicAnalyticsEvent" WHERE kind='page_view' AND "receivedAt">now()-interval '7 days'`;
    expect(() => safeApplicationHost('http://127.0.0.1/private')).toThrow();
    expect(safeApplicationHost('https://university.example.org/apply?token=not-stored')).toBe(
      'university.example.org',
    );
  });
  it('boots the actual API with real sessions and permissions and displays its PostgreSQL aggregates in the browser', async () => {
    const { createApiApp } = await import('../../../../apps/api/src/app');
    const { container } = await import('../../../../apps/api/src/infrastructure/di/container');
    const app = await createApiApp({
      resetCache: true,
      connectExternalServices: false,
      databaseClient: db,
      env: {
        NODE_ENV: 'test',
        LOG_LEVEL: 'error',
        DATABASE_URL: process.env.DATABASE_URL,
        DIRECT_URL: process.env.DIRECT_URL,
      },
    });
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('ISOLATED_API_BIND_FAILED');
    const origin = 'http://127.0.0.1:' + address.port;
    let browser: any;
    try {
      await db.credentialRecord.createMany({
        data: [staff, student].map((identityId) => ({
          identityId,
          type: 'password',
          passwordHash: 'synthetic-session-fixture-no-password-login',
        })),
      });
      await db.roleRecord.create({
        data: {
          id: 'dashboard-lab-admin',
          name: 'Isolated Dashboard Administrator',
          description: 'Synthetic local authorization only',
          permissions: ['admin:*'],
          policyIds: [],
        },
      });
      await db.roleAssignmentRecord.create({
        data: { id: randomUUID(), identityId: staff, roleId: 'dashboard-lab-admin' },
      });
      const tokens = container.resolve<any>('tokenProvider'),
        sessions = container.resolve<any>('sessionManager');
      const credentials = async (actor: string) => {
        const sessionId = randomUUID();
        await sessions.createSession(actor, await tokens.generateRefreshToken(), sessionId);
        return tokens.generateAccessToken({ userId: actor, sessionId });
      };
      const adminToken = await credentials(staff),
        studentToken = await credentials(student);
      expect((await fetch(origin + '/api/v1/admin/dashboard/users')).status).toBe(401);
      expect(
        (
          await fetch(origin + '/api/v1/admin/dashboard/users', {
            headers: { Authorization: 'Bearer ' + studentToken },
          })
        ).status,
      ).toBe(403);
      const headers = { Authorization: 'Bearer ' + adminToken };
      const response = await fetch(origin + '/api/v1/admin/dashboard/users?days=30', { headers });
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toContain('no-store');
      const realUsers = await response.json();
      expect(realUsers.registeredUsers).toBe(2004);
      const applications = await fetch(origin + '/api/v1/admin/dashboard/applications?days=30', {
        headers,
      });
      expect(applications.status).toBe(200);
      expect((await applications.json()).officialAccepted).toBe(1);
      if (process.env.EXECUTIVE_DASHBOARD_BROWSER_ORIGIN) {
        const { chromium } = require('playwright');
        browser = await chromium.launch({
          executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
          headless: true,
        });
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        await context.route('**/api/v1/**', async (route: any) => {
          const url = new URL(route.request().url());
          const actual = await route.fetch({
            url: origin + url.pathname + url.search,
            headers: { ...route.request().headers(), ...headers },
          });
          await route.fulfill({ response: actual });
        });
        const page = await context.newPage();
        await page.goto(process.env.EXECUTIVE_DASHBOARD_BROWSER_ORIGIN + '/admin/dashboard');
        await page.waitForFunction(
          () =>
            document.querySelector('.executive-header button')?.getAttribute('disabled') === null &&
            document.querySelectorAll('.executive-kpi-grid output').length === 8,
        );
        const text = await page.locator('.executive-kpi-grid output').first().innerText();
        expect(text.replace(/[,٬\s]/g, '')).toMatch(/^(2004|٢٠٠٤)$/);
        expect(await page.locator('.executive-dashboard').innerText()).not.toContain(
          '@example.test',
        );
        await page.screenshot({
          path: path.join(
            path.dirname(process.env.EXECUTIVE_DATABASE_EVIDENCE_FILE!),
            'REAL_DATABASE_DASHBOARD.png',
          ),
          fullPage: true,
        });
      }
      (fixture as any).fullStory = {
        actualAppMount: true,
        actualJwtSession: true,
        actualRolePermissions: true,
        anonymous: 401,
        student: 403,
        admin: 200,
        registeredUsers: realUsers.registeredUsers,
        browser: Boolean(browser),
        noExternalServices: true,
      };
    } finally {
      await browser?.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await app.locals.runtimeResourceRegistry?.closeAll();
    }
  }, 60000);
});
