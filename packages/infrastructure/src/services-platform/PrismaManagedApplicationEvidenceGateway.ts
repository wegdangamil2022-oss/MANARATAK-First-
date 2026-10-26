import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { AssetId } from '@manaratak/domain';
import type { ManagedApplicationEvidenceGateway } from '@manaratak/application';
import { PrismaAssetRecordRepository } from '../asset-platform/PrismaAssetRecordRepository';
import type { PublishedApplicationResolver } from '../dashboard/ApplicationDestination';
export class PrismaManagedApplicationEvidenceGateway implements ManagedApplicationEvidenceGateway {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly resolve: PublishedApplicationResolver,
  ) {}
  async assets(actorId: string, after?: string) {
    const rows = await this.prisma.assetRecord.findMany({
      where: {
        ownerId: actorId,
        lifecycleState: 'ACTIVE',
        securityClassification: { in: ['CONFIDENTIAL', 'RESTRICTED'] },
        retentionExpiresAt: { gt: new Date() },
        deletedAt: null,
        ...(after ? { id: { gt: after } } : {}),
      },
      orderBy: { id: 'asc' },
      take: 21,
      select: { id: true, metadata: true },
    });
    return {
      items: rows.slice(0, 20).map((row) => ({
        id: row.id,
        name: String(
          (row.metadata as Record<string, unknown>).originalFilename ?? 'Document',
        ).slice(0, 240),
      })),
      nextCursor: rows.length > 20 ? rows[19].id : null,
    };
  }
  async append(input: Parameters<ManagedApplicationEvidenceGateway['append']>[0]) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "ServiceRequestRecord" WHERE id=${input.requestId} FOR UPDATE`;
        const request = await tx.serviceRequestRecord.findUnique({
          where: { id: input.requestId },
        });
        const previous = await tx.serviceApplicationEvidence.findUnique({
          where: {
            requestId_idempotencyKey: { requestId: input.requestId, idempotencyKey: input.key },
          },
        });
        if (previous) {
          if (previous.kind !== input.kind || previous.evidenceAssetId !== input.evidenceAssetId)
            throw new Error('MANAGED_APPLICATION_IDEMPOTENCY_CONFLICT');
          return { id: previous.id, kind: previous.kind };
        }
        const snapshot = request?.serviceSnapshot as Record<string, unknown> | null;
        if (
          !request ||
          snapshot?.managedApplication !== true ||
          request.version !== input.expectedVersion ||
          request.status === 'CANCELLED' ||
          (request.status === 'COMPLETED' && !input.kind.startsWith('ADMISSION_'))
        )
          throw new Error('SERVICE_REQUEST_VERSION_CONFLICT');
        const submitted = await tx.serviceApplicationEvidence.findFirst({
          where: { requestId: input.requestId, kind: 'UNIVERSITY_SUBMITTED' },
        });
        if (input.kind.startsWith('ADMISSION_')) {
          if (!submitted) throw new Error('MANAGED_UNIVERSITY_SUBMISSION_REQUIRED');
          if (
            await tx.serviceApplicationEvidence.findFirst({
              where: {
                requestId: input.requestId,
                kind: { in: ['ADMISSION_ACCEPTED', 'ADMISSION_REJECTED'] },
              },
            })
          )
            throw new Error('MANAGED_APPLICATION_DECISION_ALREADY_RECORDED');
        }
        if (input.evidenceAssetId)
          await tx.$queryRaw`SELECT id FROM "AssetRecord" WHERE id=${input.evidenceAssetId} FOR SHARE`;
        const asset = input.evidenceAssetId
          ? await tx.assetRecord.findUnique({ where: { id: input.evidenceAssetId } })
          : null;
        const proven = [
          'UNIVERSITY_SUBMITTED',
          'ADMISSION_ACCEPTED',
          'ADMISSION_REJECTED',
        ].includes(input.kind);
        if (proven && input.evidenceAssetId) {
          const trustedAsset = await new PrismaAssetRecordRepository(
            tx as unknown as PrismaClient,
          ).findById(new AssetId(input.evidenceAssetId));
          if (!trustedAsset) throw new Error('MANAGED_APPLICATION_EVIDENCE_REQUIRED');
          trustedAsset.assertCanDeliver();
        }
        if (
          proven &&
          (!asset ||
            asset.ownerId !== input.actorId ||
            !['CONFIDENTIAL', 'RESTRICTED'].includes(asset.securityClassification) ||
            asset.deletedAt !== null ||
            asset.lifecycleState !== 'ACTIVE' ||
            !asset.checksumHash ||
            !asset.retentionExpiresAt ||
            +asset.retentionExpiresAt <= Date.now())
        )
          throw new Error('MANAGED_APPLICATION_EVIDENCE_REQUIRED');
        if (
          proven &&
          (await tx.serviceApplicationEvidence.findFirst({
            where: { requestId: input.requestId, kind: input.kind },
          }))
        )
          throw new Error('MANAGED_APPLICATION_STAGE_ALREADY_RECORDED');
        const id = randomUUID(),
          now = new Date();
        await tx.serviceApplicationEvidence.create({
          data: {
            id,
            requestId: input.requestId,
            kind: input.kind,
            actorId: input.actorId,
            idempotencyKey: input.key,
            evidenceAssetId: input.evidenceAssetId,
            evidenceDigest: asset?.checksumHash ?? null,
            expiresAt: request.retentionUntil ?? new Date(+now + 180 * 86400000),
          },
        });
        await tx.serviceRequestRecord.update({
          where: { id: input.requestId },
          data: { version: { increment: 1 } },
        });
        const auditId = randomUUID();
        await tx.auditRecord.create({
          data: {
            id: auditId,
            reference: 'managed-application:' + id,
            action: 'MANAGED_APPLICATION_EVIDENCE_RECORDED',
            category: 'SERVICES',
            severity: 'INFO',
            actorId: input.actorId,
            actorType: 'USER',
            targetId: request.id,
            targetType: 'ServiceRequest',
            source: 'service-application-evidence',
            timestamp: now,
            contextMetadata: {
              kind: input.kind,
              evidenceId: id,
              atomicity: 'BUSINESS_AUDIT_OUTBOX',
              result: 'SUCCESS',
            },
          },
        });
        await tx.transactionalOutboxRecord.create({
          data: {
            id: randomUUID(),
            domain: 'SERVICES',
            eventType: 'ManagedApplicationEvidenceRecorded.v1',
            aggregateType: 'ServiceRequest',
            aggregateId: request.id,
            payload: { evidenceId: id, kind: input.kind },
            metadata: { schemaVersion: 1 },
          },
        });
        return { id, kind: input.kind };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async purgeExpired() {
    const cleared = await this.prisma
      .$executeRaw`UPDATE "ServiceApplicationEvidence" SET "evidenceAssetId"=NULL WHERE id IN (
      SELECT e.id FROM "ServiceApplicationEvidence" e JOIN "AssetRecord" a ON a.id=e."evidenceAssetId" JOIN "ServiceRequestRecord" r ON r.id=e."requestId"
      WHERE a."retentionExpiresAt"<=now() AND (a."legalHoldUntil" IS NULL OR a."legalHoldUntil"<=now())
      AND (r."legalHoldUntil" IS NULL OR r."legalHoldUntil"<=now()) LIMIT 1000 FOR UPDATE OF e SKIP LOCKED FOR SHARE OF a,r SKIP LOCKED)`;
    const reports = await this.prisma
      .$executeRaw`DELETE FROM "DirectApplicationReport" WHERE id IN (SELECT id FROM "DirectApplicationReport" WHERE "expiresAt"<=now() ORDER BY "expiresAt" LIMIT 1000 FOR UPDATE SKIP LOCKED)`;
    const attestations = await this.prisma
      .$executeRaw`DELETE FROM "ServiceApplicationEvidence" WHERE id IN (SELECT e.id FROM "ServiceApplicationEvidence" e JOIN "ServiceRequestRecord" r ON r.id=e."requestId"
      LEFT JOIN "AssetRecord" a ON a.id=e."evidenceAssetId" WHERE e."expiresAt"<=now() AND (r."legalHoldUntil" IS NULL OR r."legalHoldUntil"<=now())
      AND (a."legalHoldUntil" IS NULL OR a."legalHoldUntil"<=now()) ORDER BY e."expiresAt" LIMIT 1000 FOR UPDATE OF e SKIP LOCKED)`;
    return cleared + reports + attestations;
  }
  async selfReport(studentId: string, opportunityId: string, _key: string) {
    const opportunity = await this.resolve(opportunityId);
    if (!opportunity) throw new Error('APPLICATION_PUBLISHED_DESTINATION_REQUIRED');
    await this.prisma.directApplicationReport.upsert({
      where: { studentId_opportunityId: { studentId, opportunityId: opportunity.id } },
      create: {
        studentId,
        opportunityId: opportunity.id,
        expiresAt: new Date(Date.now() + 180 * 86400000),
      },
      update: {},
    });
  }
}
