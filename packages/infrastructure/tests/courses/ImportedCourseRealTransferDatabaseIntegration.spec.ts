import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { writeXlsxWorkbook } from '@manaratak/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  AssetId, AssetLifecycleState, AssetMetadata, AssetOwnerReference, AssetRecord,
  AssetReference, AssetRetentionCategory, AssetRetentionMetadata, AssetSecurityClassification,
  AssetStorageLocator, AssetStorageZone, AtomicPersistenceContext,
} from '@manaratak/domain';
import {
  AtomicAuditedOutboxMutationExecutor, AtomicDomainMutationCoordinator, CourseImportArtifactUseCase,
  CourseImportCoordinator, CourseImportIdentityDiffUseCase, ImportAdminUseCases,
} from '@manaratak/application';
import { LocalAssetStorageGateway } from '../../src/asset-platform/LocalAssetStorageGateway';
import { PrismaAssetRecordRepository } from '../../src/asset-platform/PrismaAssetRecordRepository';
import { PrismaAuditRecordRepository } from '../../src/audit/PrismaAuditRecordRepository';
import { PrismaCourseImportAnalysisRepository } from '../../src/courses/PrismaCourseImportAnalysisRepository';
import { PrismaCourseImportTransferGateway } from '../../src/courses/PrismaCourseImportTransferGateway';
import { PrismaCourseRepository } from '../../src/courses/PrismaCourseRepository';
import { PrismaExternalCourseProviderRepository } from '../../src/courses/PrismaExternalCourseProviderRepository';
import { PrismaAtomicPersistenceUnitOfWork } from '../../src/event-foundation/PrismaAtomicPersistenceUnitOfWork';
import { PrismaTransactionalOutboxStore } from '../../src/event-foundation/PrismaTransactionalOutboxStore';
import { PrismaImportRepository } from '../../src/import-foundation/PrismaImportRepository';
import { destructiveDatabaseTestsEnabled } from './disposableDatabaseGuard';

const describeWithDatabase = destructiveDatabaseTestsEnabled() ? describe : describe.skip;
const headers = ['No.', 'Platform / University', 'Course Name', 'Direct Course URL', 'Study Free', 'Free Certificate', 'Certificate Type', 'Language', 'Study Level', 'Course Duration', 'Short Course Topics (4)'];

class FailingProvenanceGateway extends PrismaCourseImportTransferGateway {
  public override withTransaction(context: AtomicPersistenceContext): FailingProvenanceGateway {
    return new FailingProvenanceGateway((context as AtomicPersistenceContext & { transactionClient: PrismaClient }).transactionClient);
  }
  public override async writeFieldProvenance(): Promise<void> {
    throw new Error('WPIC10R1_TEST_PROVENANCE_FAILURE');
  }
}

describeWithDatabase('WP-IC-10R1 artifact to atomic transfer on disposable PostgreSQL', () => {
  const prisma = new PrismaClient();
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const providerName = `WPIC10R1 Provider ${suffix}`;
  const providerPublicId = `wpic10r1-provider-${suffix}`;
  const bucket = `wpic10r1-${suffix}`;
  let root = '';
  let providerId = '';
  const assetIds: string[] = [];
  const batchIds: string[] = [];
  const recordIds: string[] = [];
  const courseIds: string[] = [];
  const identityIds: string[] = [];

  beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'wpic10r1-assets-'));
    await prisma.$connect();
    const provider = await prisma.externalCourseProvider.create({ data: {
      publicId: providerPublicId, slug: providerPublicId, canonicalName: providerName,
      normalizedCanonicalName: providerName.toLowerCase(), displayName: providerName,
      status: 'APPROVED', sourceTrustLevel: 'TEST_REVIEWED', importStrategy: 'FILE',
      allowedDomains: { create: { domain: 'example.org', normalizedDomain: 'example.org' } },
    } });
    providerId = provider.id;
  });

  afterAll(async () => {
    if (recordIds.length) {
      await prisma.transactionalOutboxRecord.deleteMany({ where: { aggregateId: { in: recordIds } } });
      await prisma.auditRecord.deleteMany({ where: { targetId: { in: recordIds } } });
      await prisma.courseFieldProvenance.deleteMany({ where: { importRecordId: { in: recordIds } } });
      await prisma.courseImportAnalysis.deleteMany({ where: { importRecordId: { in: recordIds } } });
    }
    if (identityIds.length) await prisma.courseSourceUrlHistory.deleteMany({ where: { courseSourceIdentityId: { in: identityIds } } });
    if (identityIds.length) await prisma.courseSourceIdentity.deleteMany({ where: { id: { in: identityIds } } });
    if (courseIds.length) await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    if (recordIds.length) await prisma.importRecord.deleteMany({ where: { id: { in: recordIds } } });
    if (batchIds.length) await prisma.importBatch.deleteMany({ where: { id: { in: batchIds } } });
    if (assetIds.length) await prisma.assetRecord.deleteMany({ where: { id: { in: assetIds } } });
    if (providerId) await prisma.externalCourseProvider.deleteMany({ where: { id: providerId } });
    await prisma.$disconnect();
    if (root) await rm(root, { recursive: true, force: true });
  });

  async function stageWorkbook(name: string) {
    const url = `https://example.org/course/${name}`;
    const bytes = Buffer.from(await writeXlsxWorkbook([{ name: 'Courses', rows: [headers, [1, providerName, name, url, 'Yes', 'No', 'None', 'English', 'Beginner', '1 hour', 'Import; PostgreSQL']] }]));
    const assetId = `asset-${randomUUID()}`;
    const locator = new AssetStorageLocator(AssetStorageZone.CLEAN, bucket, `clean/${assetId}.xlsx`);
    await mkdir(path.join(root, bucket, 'clean'), { recursive: true });
    await writeFile(path.join(root, bucket, locator.pathKey), bytes);
    const asset = new AssetRecord({
      id: new AssetId(assetId), reference: new AssetReference(`ref-${assetId}`), locator,
      metadata: new AssetMetadata(`${name}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx', bytes.length),
      retention: new AssetRetentionMetadata(AssetRetentionCategory.TEMPORARY),
      owner: new AssetOwnerReference('wpic10r1-test', 'TEST'), classification: AssetSecurityClassification.INTERNAL,
      state: AssetLifecycleState.ACTIVE,
    });
    const assetRepository = new PrismaAssetRecordRepository(prisma);
    await assetRepository.save(asset);
    assetIds.push(assetId);
    const importAdmin = new ImportAdminUseCases(new PrismaImportRepository(prisma));
    const artifact = new CourseImportArtifactUseCase(assetRepository, new LocalAssetStorageGateway(bucket, root), new PrismaExternalCourseProviderRepository(prisma), importAdmin);
    const expectedSha256 = createHash('sha256').update(bytes).digest('hex');
    const preflight = await artifact.preflight({ assetId, expectedSha256, sourceSystem: `WPIC10R1:${suffix}` });
    expect(preflight.valid).toBe(true);
    const staged = await artifact.stage({ assetId, expectedSha256, sourceSystem: `WPIC10R1:${suffix}` });
    const batchId = String((staged.staging as { batch: { id: string } }).batch.id);
    const record = await prisma.importRecord.findFirstOrThrow({ where: { batchId }, orderBy: { sourceRowNumber: 'asc' } });
    batchIds.push(batchId); recordIds.push(record.id);
    return { batchId, recordId: record.id, url };
  }

  function coordinator(gateway = new PrismaCourseImportTransferGateway(prisma)) {
    const executor = new AtomicAuditedOutboxMutationExecutor(new PrismaAtomicPersistenceUnitOfWork(prisma), new PrismaAuditRecordRepository(prisma), new PrismaTransactionalOutboxStore(prisma));
    return new CourseImportCoordinator(gateway, new PrismaCourseRepository(prisma), new AtomicDomainMutationCoordinator(executor));
  }

  async function analyze(batchId: string) {
    const reader = new PrismaImportRepository(prisma);
    const result = await new CourseImportIdentityDiffUseCase(reader, new PrismaExternalCourseProviderRepository(prisma), new PrismaCourseImportAnalysisRepository(prisma)).analyzeBatch(batchId);
    expect(result.analyses).toHaveLength(1);
    expect(result.analyses[0].changeState).toBe('NEW');
    const id = String((result.analyses[0].relationshipProposals as { sourceIdentityId: string }).sourceIdentityId);
    identityIds.push(id);
    return id;
  }

  it('runs XLSX -> asset -> preflight/stage -> analysis -> coordinator transfer without manual staging writes', async () => {
    const staged = await stageWorkbook(`course-${suffix}`);
    const stagedRecord = await prisma.importRecord.findUniqueOrThrow({ where: { id: staged.recordId } });
    expect(stagedRecord.sourceRowNumber).toBe(1);
    expect(stagedRecord.rawPayload).toMatchObject({ providerLabel: providerName, _worksheetRowNumber: 2 });
    expect(await prisma.course.count({ where: { sourceImportRecordId: staged.recordId } })).toBe(0);
    const identityId = await analyze(staged.batchId);
    const transfer = await coordinator().transfer({ recordId: staged.recordId, actorId: 'wpic10r1-db-test', correlationId: suffix });
    courseIds.push(transfer.courseId);
    expect(transfer.state).toBe('TRANSFERRED_CREATED');
    const [course, identity, history, analysis, record, provenance, audit, outbox] = await Promise.all([
      prisma.course.findUnique({ where: { id: transfer.courseId } }), prisma.courseSourceIdentity.findUnique({ where: { id: identityId } }),
      prisma.courseSourceUrlHistory.findMany({ where: { courseSourceIdentityId: identityId, isCurrent: true } }),
      prisma.courseImportAnalysis.findUnique({ where: { importRecordId: staged.recordId } }), prisma.importRecord.findUnique({ where: { id: staged.recordId } }),
      prisma.courseFieldProvenance.findMany({ where: { courseId: transfer.courseId, importRecordId: staged.recordId } }),
      prisma.auditRecord.count({ where: { targetId: staged.recordId, action: 'COURSE_IMPORT_TRANSFERRED' } }),
      prisma.transactionalOutboxRecord.count({ where: { aggregateId: staged.recordId, eventType: 'COURSE_IMPORT_TRANSFERRED' } }),
    ]);
    expect(course).toMatchObject({ id: transfer.courseId, externalProviderId: providerId, directCourseUrl: staged.url, status: 'IMPORTED' });
    expect(course?.status).not.toBe('PUBLISHED'); expect(course?.status).not.toBe('READY_TO_PUBLISH');
    expect(identity).toMatchObject({ courseId: transfer.courseId, currentUrl: staged.url });
    expect(history).toHaveLength(1); expect(analysis?.matchedCourseId).toBe(transfer.courseId); expect(record?.promotedEntityId).toBe(transfer.courseId);
    expect(provenance.some((item) => item.fieldKey === 'directCourseUrl')).toBe(true); expect(audit).toBe(1); expect(outbox).toBe(1);
    const replay = await coordinator().transfer({ recordId: staged.recordId, actorId: 'wpic10r1-db-test' });
    expect(replay).toMatchObject({ state: 'TRANSFERRED_UNCHANGED', courseId: transfer.courseId });
    expect(await prisma.course.count({ where: { sourceImportRecordId: staged.recordId } })).toBe(1);
  }, 60_000);

  it('rolls back canonical writes when provenance fails after coordinator transfer begins', async () => {
    const staged = await stageWorkbook(`rollback-${suffix}`);
    const identityId = await analyze(staged.batchId);
    await expect(coordinator(new FailingProvenanceGateway(prisma)).transfer({ recordId: staged.recordId, actorId: 'wpic10r1-db-test' })).rejects.toThrow('WPIC10R1_TEST_PROVENANCE_FAILURE');
    const [courses, identity, record, provenance, audit, outbox] = await Promise.all([
      prisma.course.count({ where: { sourceImportRecordId: staged.recordId } }), prisma.courseSourceIdentity.findUnique({ where: { id: identityId } }),
      prisma.importRecord.findUnique({ where: { id: staged.recordId } }), prisma.courseFieldProvenance.count({ where: { importRecordId: staged.recordId } }),
      prisma.auditRecord.count({ where: { targetId: staged.recordId, action: 'COURSE_IMPORT_TRANSFERRED' } }), prisma.transactionalOutboxRecord.count({ where: { aggregateId: staged.recordId, eventType: 'COURSE_IMPORT_TRANSFERRED' } }),
    ]);
    expect(courses).toBe(0); expect(identity?.courseId).toBeNull(); expect(record?.promotedEntityId).toBeNull();
    expect(provenance).toBe(0); expect(audit).toBe(0); expect(outbox).toBe(0);
  }, 60_000);
});
