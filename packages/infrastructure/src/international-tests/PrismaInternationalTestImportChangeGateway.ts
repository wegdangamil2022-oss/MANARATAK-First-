import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthorizationEvaluatorService, InternationalTestDeduplicationService, OutboxProcessingState } from '@manaratak/domain';
import {
  AtomicAuditedOutboxMutationExecutor, internationalTestImportHash, InternationalTestMarkdownParser,
  type InternationalTestImportApproval, type InternationalTestImportChangeGateway,
  type InternationalTestImportPlan, type InternationalTestImportPreview, type InternationalTestImportResult,
} from '@manaratak/application';
import { PrismaInternationalTestRepository } from './PrismaInternationalTestRepository';
import { PrismaAuditRecordRepository } from '../audit/PrismaAuditRecordRepository';
import { PrismaTransactionalOutboxStore } from '../event-foundation/PrismaTransactionalOutboxStore';
import { PrismaRoleRepository } from '../authorization/PrismaRoleRepository';
import { PrismaRoleAssignmentRepository } from '../authorization/PrismaRoleAssignmentRepository';
import { PrismaPolicyRepository } from '../authorization/PrismaPolicyRepository';
import { DefaultPolicyEvaluator } from '../authorization/DefaultPolicyEvaluator';

type Tx = Prisma.TransactionClient;
const rootInclude = { _count: true } satisfies Prisma.InternationalTestInclude;
const versionInclude = { contentBlocks: { orderBy: { id: 'asc' as const } }, _count: true } satisfies Prisma.InternationalTestVersionInclude;
type Root = Prisma.InternationalTestGetPayload<{ include: typeof rootInclude }>;
type Version = Prisma.InternationalTestVersionGetPayload<{ include: typeof versionInclude }>;
const mutableSchema = z.object({ displayName: z.string(), localizedNameAr: z.string().nullable(), localizedNameEn: z.string().nullable(), abbreviation: z.string().nullable(), optionalFields: z.record(z.string(), z.unknown()).nullable() }).strict();
const journalSchema = z.object({
  changeSetId: z.string().uuid(), planHash: z.string(), previewHash: z.string(), sequence: z.number().int(), total: z.number().int(),
  state: z.enum(['APPLIED', 'ROLLED_BACK']), created: z.boolean(), targetId: z.string().uuid(), sourceKey: z.string(), sourceHash: z.string(),
  sourceCycle: z.string(), actorId: z.string(), reviewReason: z.string(), evidenceReference: z.string(),
  rootHash: z.string(), versionHash: z.string(), beforeMutable: mutableSchema.optional(),
  rollbackRootHash: z.string().optional(), rollbackVersionHash: z.string().optional(),
}).strict();
type Journal = z.infer<typeof journalSchema>;
const metadata = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const json = (value: unknown): Prisma.InputJsonObject => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
const versionHash = (version: Version): string => {
  const { updatedAt: _timestamp, metadata: fields, ...rest } = version;
  const { m10Import: _journal, ...other } = metadata(fields);
  return internationalTestImportHash({ ...rest, metadata: other });
};

/** Small reviewed pilot batches only. Version metadata is the durable receipt;
 * rollback preserves source/version evidence as SUPERSEDED and archives new roots. */
export class PrismaInternationalTestImportChangeGateway implements InternationalTestImportChangeGateway {
  constructor(private readonly prisma: PrismaClient) {}
  preview(plan: InternationalTestImportPlan, actorId: string): Promise<InternationalTestImportPreview> {
    return this.readOnly(async tx => { await this.assertActor(tx, actorId); return this.inspect(tx, plan); });
  }
  async reconcile(plan: InternationalTestImportPlan, actorId: string) {
    return this.readOnly(async tx => {
      await this.assertActor(tx, actorId);
      const report = await this.inspect(tx, plan);
      const issues = [...report.issues];
      if (!['APPLIED', 'ROLLED_BACK'].includes(report.state)) issues.push('TEST_IMPORT_RECEIPT_NOT_APPLIED');
      return { state: issues.length ? 'FAIL' as const : 'PASS' as const, issues, databaseWrites: 0 as const };
    });
  }
  async commit(plan: InternationalTestImportPlan, approval: InternationalTestImportApproval): Promise<InternationalTestImportResult> {
    return this.prisma.$transaction(async tx => {
      await this.lock(tx, plan, approval.actorId);
      const receipts = await this.receipts(tx, plan);
      if (receipts.length) {
        this.assertReceipts(receipts, plan);
        if (receipts.some(row => this.journal(row).state !== 'APPLIED')) throw new Error('TEST_IMPORT_ROLLED_BACK_REQUIRES_NEW_REVIEW');
        const report = await this.inspect(tx, plan);
        if (report.issues.length) throw new Error('TEST_IMPORT_REPLAY_DRIFT');
        return this.result(plan, 'APPLIED', true, 0);
      }
      const preview = await this.inspect(tx, plan);
      if (preview.issues.length || preview.state !== 'READY') throw new Error('TEST_IMPORT_PREVIEW_BLOCKED');
      if (preview.previewHash !== approval.previewHash) throw new Error('TEST_IMPORT_STALE_PREVIEW');
      return this.audited(tx, plan, approval, 'INTERNATIONAL_TEST_CHANGE_SET_APPLIED', async () => {
        let writes = 0;
        for (const [sequence, entry] of plan.entries.entries()) {
          const before = await tx.internationalTest.findUnique({ where: { id: entry.targetId }, include: rootInclude });
          const provider = await tx.internationalTestProvider.findUniqueOrThrow({ where: { id: entry.core.providerId } });
          if (!before) {
            await tx.internationalTest.create({ data: {
              id: entry.targetId, ...entry.core, providerName: provider.displayName,
              canonicalDedupKey: InternationalTestDeduplicationService.generateKey({ canonicalName: entry.core.canonicalName, providerName: provider.displayName }),
              status: 'NEEDS_REVIEW', completenessStatus: 'NEEDS_REVIEW', isSourceVerified: false, isPubliclyVisible: false,
              optionalFields: { m10Source: { sourceKey: entry.sourceKey, sourceHash: entry.sourceHash, changeSetId: plan.changeSetId } },
            } });
          } else {
            await tx.internationalTest.update({ where: { id: before.id }, data: {
              displayName: entry.core.displayName,
              ...(entry.core.localizedNameAr !== undefined ? { localizedNameAr: entry.core.localizedNameAr } : {}),
              ...(entry.core.localizedNameEn !== undefined ? { localizedNameEn: entry.core.localizedNameEn } : {}),
              ...(entry.core.abbreviation !== undefined ? { abbreviation: entry.core.abbreviation } : {}),
              optionalFields: json({ ...metadata(before.optionalFields), m10Source: { sourceKey: entry.sourceKey, sourceHash: entry.sourceHash, changeSetId: plan.changeSetId } }),
            } });
          }
          const repository = new PrismaInternationalTestRepository(tx as unknown as PrismaClient);
          const draft = await repository.createImportDraftVersion(entry.targetId, {
            sourceFileName: entry.sourceKey.split('/').at(-1)!, sourceLocale: 'ar', sourceUri: entry.sourceUri,
            sourceHash: entry.sourceHash, rawContent: entry.rawContent, importedBy: approval.actorId,
            unmappedSections: InternationalTestMarkdownParser.parse(entry.rawContent).map(block => ({ sectionKey: block.blockKey, title: block.title, locale: 'ar', content: block.content, sourceSectionPath: block.blockKey })),
            metadata: { sourceCycle: entry.sourceCycle, sourceKey: entry.sourceKey, sourceClassification: entry.sourceClassification, resolution: entry.resolution, reviewReason: entry.reviewReason, evidenceReference: entry.evidenceReference, sourceManifestHash: plan.sourceManifestHash },
          });
          const root = await tx.internationalTest.findUniqueOrThrow({ where: { id: entry.targetId }, include: rootInclude });
          const version = await tx.internationalTestVersion.findUniqueOrThrow({ where: { id: draft.versionId }, include: versionInclude });
          const journal: Journal = {
            changeSetId: plan.changeSetId, planHash: plan.planHash, previewHash: approval.previewHash, sequence, total: plan.entries.length,
            state: 'APPLIED', created: !before, targetId: root.id, sourceKey: entry.sourceKey, sourceHash: entry.sourceHash,
            sourceCycle: entry.sourceCycle, actorId: approval.actorId, reviewReason: entry.reviewReason, evidenceReference: entry.evidenceReference,
            rootHash: internationalTestImportHash(root), versionHash: versionHash(version),
            ...(before ? { beforeMutable: this.mutable(before) } : {}),
          };
          await this.saveJournal(tx, version, journal);
          writes += 3 + draft.createdContentBlockCount;
        }
        return this.result(plan, 'APPLIED', false, writes + 2);
      });
    }, { isolationLevel: 'Serializable', timeout: 30_000, maxWait: 10_000 });
  }
  async rollback(plan: InternationalTestImportPlan, approval: InternationalTestImportApproval): Promise<InternationalTestImportResult> {
    return this.prisma.$transaction(async tx => {
      await this.lock(tx, plan, approval.actorId);
      const receipts = await this.receipts(tx, plan);
      this.assertReceipts(receipts, plan);
      const report = await this.inspect(tx, plan);
      if (report.issues.length) throw new Error('TEST_IMPORT_ROLLBACK_DRIFT');
      if (receipts.every(row => this.journal(row).state === 'ROLLED_BACK')) return this.result(plan, 'ROLLED_BACK', true, 0);
      if (report.previewHash !== approval.previewHash) throw new Error('TEST_IMPORT_STALE_ROLLBACK_PREVIEW');
      return this.audited(tx, plan, approval, 'INTERNATIONAL_TEST_CHANGE_SET_ROLLED_BACK', async () => {
        for (const version of [...receipts].reverse()) {
          const journal = this.journal(version);
          if (version.status !== 'DRAFT') throw new Error('TEST_IMPORT_VERSION_NOT_ROLLBACKABLE');
          const root = await tx.internationalTest.findUniqueOrThrow({ where: { id: version.testId }, include: rootInclude });
          if (root.currentPublishedVersionId || root.isPubliclyVisible || root.status === 'PUBLISHED') throw new Error('TEST_IMPORT_PUBLISHED_OWNER_NOT_ROLLBACKABLE');
          if (Object.entries(version._count).some(([key, count]) => key !== 'contentBlocks' && count > 0)) throw new Error('TEST_IMPORT_VERSION_DEPENDENCIES_REQUIRE_RECOVERY');
          if (journal.created && Object.entries(root._count).some(([key, count]) => key !== 'versions' && count > 0)) throw new Error('TEST_IMPORT_NEW_OWNER_DEPENDENCIES_REQUIRE_RECOVERY');
          if (journal.created && root._count.versions !== 1) throw new Error('TEST_IMPORT_NEW_OWNER_VERSION_DRIFT');
          await tx.internationalTest.update({ where: { id: root.id }, data: journal.created
            ? { status: 'ARCHIVED', isPubliclyVisible: false }
            : this.restoreMutable(journal.beforeMutable) });
          const updatedVersion = await tx.internationalTestVersion.update({ where: { id: version.id }, data: { status: 'SUPERSEDED', supersededAt: new Date() }, include: versionInclude });
          const updatedRoot = await tx.internationalTest.findUniqueOrThrow({ where: { id: root.id }, include: rootInclude });
          await this.saveJournal(tx, updatedVersion, { ...journal, state: 'ROLLED_BACK', rollbackRootHash: internationalTestImportHash(updatedRoot), rollbackVersionHash: versionHash(updatedVersion) });
        }
        return this.result(plan, 'ROLLED_BACK', false, receipts.length * 3 + 2);
      });
    }, { isolationLevel: 'Serializable', timeout: 30_000, maxWait: 10_000 });
  }
  private readOnly<T>(operation: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async tx => { await tx.$executeRaw`SET TRANSACTION READ ONLY`; return operation(tx); }, { isolationLevel: 'RepeatableRead', timeout: 30_000 });
  }
  private async lock(tx: Tx, plan: InternationalTestImportPlan, actorId: string): Promise<void> {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(725111)::text`;
    // Persisted identity/roles are evaluated inside the same transaction, with
    // row locks preventing a concurrent revocation from being ignored.
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "IdentityRecord" WHERE "id" = ${actorId} FOR SHARE`);
    await tx.$queryRaw(Prisma.sql`SELECT "identityId" FROM "UserRecord" WHERE "identityId" = ${actorId} FOR SHARE`);
    await tx.$queryRaw(Prisma.sql`SELECT "identityId" FROM "AccountRecord" WHERE "identityId" = ${actorId} FOR SHARE`);
    await tx.$queryRaw(Prisma.sql`SELECT a."id" FROM "RoleAssignmentRecord" a JOIN "RoleRecord" r ON r."id" = a."roleId" WHERE a."identityId" = ${actorId} FOR SHARE OF a, r`);
    await tx.$queryRaw(Prisma.sql`SELECT p."id" FROM "PolicyRecord" p WHERE p."id" IN (
      SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(r."policyIds") = 'array' THEN r."policyIds" ELSE '[]'::jsonb END)
      FROM "RoleAssignmentRecord" a JOIN "RoleRecord" r ON r."id" = a."roleId" WHERE a."identityId" = ${actorId}
    ) FOR SHARE OF p`);
    await this.assertActor(tx, actorId);
    for (const entry of [...plan.entries].sort((a, b) => a.targetId.localeCompare(b.targetId))) {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "InternationalTest" WHERE "id" = ${entry.targetId} FOR UPDATE`);
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "InternationalTestProvider" WHERE "id" = ${entry.core.providerId} FOR SHARE`);
      if (entry.core.familyId) await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "InternationalTestFamily" WHERE "id" = ${entry.core.familyId} FOR SHARE`);
    }
  }
  private async assertActor(tx: Tx, actorId: string): Promise<void> {
    const identity = await tx.identityRecord.findUnique({ where: { id: actorId }, include: { user: true, account: true } });
    if (!identity || identity.deletedAt || identity.status !== 'ACTIVE' || !identity.user?.isEmailVerified || identity.account?.accessState !== 'Active') throw new Error('TEST_IMPORT_VERIFIED_ACTIVE_ACTOR_REQUIRED');
    const client = tx as unknown as PrismaClient;
    const evaluator = new AuthorizationEvaluatorService(new PrismaRoleRepository(client), new PrismaPolicyRepository(client), new PrismaRoleAssignmentRepository(client), new DefaultPolicyEvaluator());
    for (const permission of ['admin:imports:manage', 'admin:international-tests:manage']) {
      if (!(await evaluator.evaluatePermission(actorId, permission, { requestTime: new Date(), source: 'reviewed-test-import-cli' })).isGranted) throw new Error('TEST_IMPORT_ACTOR_PERMISSION_DENIED');
    }
  }
  private async inspect(tx: Tx, plan: InternationalTestImportPlan): Promise<InternationalTestImportPreview> {
    const receipts = await this.receipts(tx, plan);
    const changes: InternationalTestImportPreview['changes'] = [];
    const issues: string[] = [];
    if (receipts.length) {
      this.assertReceipts(receipts, plan);
      const states = receipts.map(row => this.journal(row).state);
      if (new Set(states).size !== 1) issues.push('TEST_IMPORT_MIXED_RECEIPT_STATE');
      const observed = [];
      for (const version of receipts) {
        const journal = this.journal(version);
        const root = await tx.internationalTest.findUnique({ where: { id: version.testId }, include: rootInclude });
        const expectedRoot = journal.state === 'APPLIED' ? journal.rootHash : journal.rollbackRootHash;
        const expectedVersion = journal.state === 'APPLIED' ? journal.versionHash : journal.rollbackVersionHash;
        const currentHash = root ? internationalTestImportHash(root) : null;
        if (currentHash !== expectedRoot || versionHash(version) !== expectedVersion) issues.push(`TEST_IMPORT_RECEIPT_DRIFT:${journal.sequence}`);
        observed.push({ currentHash, versionHash: versionHash(version) });
        changes.push({ targetId: version.testId, operation: journal.created ? 'CREATE' : 'UPDATE', sourceHash: journal.sourceHash, currentHash, blockCount: version.contentBlocks.length });
      }
      return { changeSetId: plan.changeSetId, planHash: plan.planHash, previewHash: internationalTestImportHash({ planHash: plan.planHash, states, observed }), state: states[0], changes, issues, databaseWrites: 0 };
    }
    const observed = [];
    const plannedDedupKeys = new Set<string>();
    for (const entry of plan.entries) {
      const root = await tx.internationalTest.findUnique({ where: { id: entry.targetId }, include: rootInclude });
      const provider = await tx.internationalTestProvider.findUnique({ where: { id: entry.core.providerId } });
      const family = entry.core.familyId ? await tx.internationalTestFamily.findUnique({ where: { id: entry.core.familyId } }) : null;
      if (!provider) issues.push('TEST_IMPORT_PROVIDER_NOT_FOUND');
      if (entry.core.familyId && (!family || family.category !== entry.core.testCategory)) issues.push('TEST_IMPORT_FAMILY_CATEGORY_MISMATCH');
      if (entry.resolution === 'APPROVE_CREATE' && root) issues.push('TEST_IMPORT_CREATE_ID_EXISTS');
      if (entry.resolution === 'APPROVE_UPDATE' && !root) issues.push('TEST_IMPORT_UPDATE_OWNER_NOT_FOUND');
      if (root) {
        if (['PUBLISHED', 'ARCHIVED', 'REJECTED', 'SUPERSEDED', 'MERGED'].includes(root.status) || root.isPubliclyVisible || root.currentPublishedVersionId) issues.push('TEST_IMPORT_OWNER_IMMUTABLE');
        for (const key of ['publicId', 'slug', 'canonicalName', 'providerId', 'testCategory'] as const) if (root[key] !== entry.core[key]) issues.push(`TEST_IMPORT_IDENTITY_MISMATCH:${key}`);
        if ((root.familyId ?? undefined) !== entry.core.familyId) issues.push('TEST_IMPORT_IDENTITY_MISMATCH:familyId');
      }
      const dedupKey = InternationalTestDeduplicationService.generateKey({ canonicalName: entry.core.canonicalName, providerName: provider?.displayName });
      if (plannedDedupKeys.has(dedupKey)) issues.push('TEST_IMPORT_CANONICAL_IDENTITY_COLLISION');
      plannedDedupKeys.add(dedupKey);
      const collisions = await tx.internationalTest.findMany({ where: { id: { not: entry.targetId }, OR: [{ publicId: entry.core.publicId }, { slug: entry.core.slug }, { canonicalDedupKey: dedupKey }] }, select: { id: true } });
      if (collisions.length) issues.push('TEST_IMPORT_CANONICAL_IDENTITY_COLLISION');
      const duplicate = await tx.internationalTestVersion.findFirst({ where: { testId: entry.targetId, sourceHash: entry.sourceHash, metadata: { path: ['sourceCycle'], equals: entry.sourceCycle }, NOT: { status: 'SUPERSEDED' } } });
      if (duplicate) issues.push('TEST_IMPORT_SOURCE_CYCLE_ALREADY_EXISTS');
      const currentHash = root ? internationalTestImportHash(root) : null;
      const blockCount = InternationalTestMarkdownParser.parse(entry.rawContent).length + 1;
      changes.push({ targetId: entry.targetId, operation: entry.resolution === 'APPROVE_CREATE' ? 'CREATE' : 'UPDATE', sourceHash: entry.sourceHash, currentHash, blockCount });
      observed.push({ currentHash, provider, family, collisions, duplicate });
    }
    return { changeSetId: plan.changeSetId, planHash: plan.planHash, previewHash: internationalTestImportHash({ planHash: plan.planHash, observed }), state: issues.length ? 'BLOCKED' : 'READY', changes, issues, databaseWrites: 0 };
  }
  private receipts(tx: Tx, plan: InternationalTestImportPlan): Promise<Version[]> {
    return tx.internationalTestVersion.findMany({ where: { metadata: { path: ['m10Import', 'changeSetId'], equals: plan.changeSetId } }, include: versionInclude, orderBy: { testId: 'asc' } });
  }
  private journal(version: Version): Journal { return journalSchema.parse(metadata(version.metadata).m10Import); }
  private assertReceipts(receipts: Version[], plan: InternationalTestImportPlan): void {
    if (receipts.length !== plan.entries.length) throw new Error('TEST_IMPORT_RECEIPT_INCOMPLETE');
    const seen = new Set<number>();
    for (const row of receipts) {
      const receipt = this.journal(row); const entry = plan.entries[receipt.sequence];
      if (!entry || seen.has(receipt.sequence) || receipt.total !== plan.entries.length || receipt.planHash !== plan.planHash || receipt.targetId !== entry.targetId || row.testId !== entry.targetId || receipt.sourceHash !== entry.sourceHash || receipt.sourceKey !== entry.sourceKey) throw new Error('TEST_IMPORT_RECEIPT_PLAN_MISMATCH');
      seen.add(receipt.sequence);
    }
  }
  private saveJournal(tx: Tx, version: Version, journal: Journal) {
    return tx.internationalTestVersion.update({ where: { id: version.id }, data: { metadata: json({ ...metadata(version.metadata), m10Import: journal }) } });
  }
  private mutable(root: Root): z.infer<typeof mutableSchema> {
    return mutableSchema.parse({ displayName: root.displayName, localizedNameAr: root.localizedNameAr, localizedNameEn: root.localizedNameEn, abbreviation: root.abbreviation, optionalFields: root.optionalFields });
  }
  private restoreMutable(value: unknown): Prisma.InternationalTestUpdateInput {
    const before = mutableSchema.parse(value);
    return { ...before, optionalFields: before.optionalFields === null ? Prisma.DbNull : json(before.optionalFields) };
  }
  private result(plan: InternationalTestImportPlan, state: InternationalTestImportResult['state'], replayed: boolean, databaseWrites: number): InternationalTestImportResult {
    return { changeSetId: plan.changeSetId, planHash: plan.planHash, state, created: plan.entries.filter(entry => entry.resolution === 'APPROVE_CREATE').length, updated: plan.entries.filter(entry => entry.resolution === 'APPROVE_UPDATE').length, replayed, databaseWrites };
  }
  private audited<T>(tx: Tx, plan: InternationalTestImportPlan, approval: InternationalTestImportApproval, action: string, mutation: () => Promise<T>): Promise<T> {
    const client = tx as unknown as PrismaClient;
    const context = { boundaryId: randomUUID(), transactionClient: tx };
    const unit = { execute: <R>(operation: (ctx: typeof context) => Promise<R>) => operation(context) };
    const executor = new AtomicAuditedOutboxMutationExecutor(unit, new PrismaAuditRecordRepository(client), new PrismaTransactionalOutboxStore(client));
    const id = randomUUID(); const now = new Date();
    return executor.execute({ id, reference: `AUD-${id}`, action, category: 'INTERNATIONAL_TEST_IMPORT', severity: 'INFO', actorId: approval.actorId, actorType: 'IDENTITY', targetId: plan.changeSetId, targetType: 'TEST_IMPORT_CHANGE_SET', source: 'reviewed-test-import-cli', timestamp: now,
      contextMetadata: { result: 'SUCCESS', atomicity: 'BUSINESS_AUDIT_OUTBOX', planHash: plan.planHash, previewHash: approval.previewHash, recoveryEvidenceReference: approval.recoveryEvidenceReference, count: plan.entries.length } },
    { id: randomUUID(), eventType: action, domain: 'INTERNATIONAL_TESTS', aggregate: { domain: 'INTERNATIONAL_TESTS', aggregateType: 'TEST_IMPORT_CHANGE_SET', aggregateId: plan.changeSetId }, payload: { changeSetId: plan.changeSetId, planHash: plan.planHash, count: plan.entries.length }, metadata: { actorId: approval.actorId }, createdAt: now, availableAt: now, state: OutboxProcessingState.PENDING, attempts: 0 }, mutation);
  }
}
