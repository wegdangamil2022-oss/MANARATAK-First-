import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import {
  AssetId,
  type AtomicPersistenceContext,
  type AssetLifecycleReconciliationProof,
} from '@manaratak/domain';
import {
  assertLifecycleProof,
  type IAssetLifecycleRecoveryGateway,
  type AssetLifecycleRecoveryCandidate,
} from '@manaratak/application';
import { PrismaAssetRecordRepository } from './PrismaAssetRecordRepository';
export class PrismaAssetLifecycleRecoveryGateway implements IAssetLifecycleRecoveryGateway {
  constructor(private readonly db: PrismaClient) {}
  async pending(before: Date, limit: number) {
    const rows = await this.db.assetRecord.findMany({
      where: {
        updatedAt: { lte: before },
        OR: [
          {
            lifecycleState: 'ARCHIVED',
            malwareScanStatus: { path: ['archiveOperation', 'phase'], equals: 'RUNNING' },
          },
          {
            lifecycleState: 'ARCHIVED',
            malwareScanStatus: { path: ['archiveOperation', 'phase'], equals: 'RECOVERY_REQUIRED' },
          },
          {
            lifecycleState: 'DELETED',
            malwareScanStatus: { path: ['restoreOperation', 'phase'], equals: 'RESTORING' },
          },
          {
            lifecycleState: 'DELETED',
            malwareScanStatus: { path: ['restoreOperation', 'phase'], equals: 'RECOVERY_REQUIRED' },
          },
        ],
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: { id: true, lifecycleState: true, malwareScanStatus: true },
    });
    return rows.map((row) => {
      const kind = row.lifecycleState === 'ARCHIVED' ? 'ARCHIVE' : 'RESTORE';
      const operation = (row.malwareScanStatus as Record<string, { operationId: string }>)[
        kind === 'ARCHIVE' ? 'archiveOperation' : 'restoreOperation'
      ];
      return {
        assetId: row.id,
        kind,
        operationId: operation?.operationId ?? '',
      } as AssetLifecycleRecoveryCandidate;
    });
  }
  async load(candidate: AssetLifecycleRecoveryCandidate) {
    const details = await new PrismaAssetRecordRepository(this.db).findAdminDetails(
      new AssetId(candidate.assetId),
    );
    if (!details) throw new Error('ASSET_NOT_FOUND');
    const operation =
      candidate.kind === 'ARCHIVE'
        ? details.asset.archiveOperation
        : details.asset.restoreOperation;
    if (
      operation?.operationId !== candidate.operationId ||
      ['COMPLETED', 'CANCELLED'].includes(operation.phase)
    )
      throw new Error('ASSET_LIFECYCLE_RECOVERY_STALE');
    return { asset: details.asset, revision: details.governance.updatedAt.toISOString() };
  }
  async complete(
    candidate: AssetLifecycleRecoveryCandidate,
    revision: string,
    proof: AssetLifecycleReconciliationProof,
    context: AtomicPersistenceContext,
  ) {
    assertLifecycleProof(candidate, proof);
    const tx = (
      context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }
    ).transactionClient;
    if (!context.boundaryId || !tx) throw new Error('ASSET_RECOVERY_TRANSACTION_REQUIRED');
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "AssetRecord" WHERE "id"=${candidate.assetId} FOR UPDATE`,
    );
    const row = await tx.assetRecord.findUnique({ where: { id: candidate.assetId } });
    if (!row || row.updatedAt.toISOString() !== revision)
      throw new Error('ASSET_LIFECYCLE_RECOVERY_STALE');
    const scan = row.malwareScanStatus as Record<string, Prisma.InputJsonValue>,
      key = candidate.kind === 'ARCHIVE' ? 'archiveOperation' : 'restoreOperation';
    const operation = scan[key] as Record<string, Prisma.InputJsonValue>;
    if (
      operation.operationId !== candidate.operationId ||
      ['COMPLETED', 'CANCELLED'].includes(String(operation.phase))
    )
      throw new Error('ASSET_LIFECYCLE_RECOVERY_STALE');
    const next = {
      ...operation,
      phase: 'COMPLETED',
      updatedAt: new Date().toISOString(),
      recoveryProof: {
        operationId: proof.operationId,
        fenced: true,
        fenceDigest: createHash('sha256').update(proof.fenceToken).digest('hex'),
        observedAt: proof.observedAt,
      },
    };
    const data: Prisma.AssetRecordUpdateManyMutationInput = {
      malwareScanStatus: { ...scan, [key]: next },
      updatedAt: new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1)),
    };
    if (candidate.kind === 'RESTORE') {
      if (row.lifecycleState !== 'DELETED' || row.retentionClaimToken !== candidate.operationId)
        throw new Error('ASSET_LIFECYCLE_RECOVERY_STALE');
      const repo = new PrismaAssetRecordRepository(tx as unknown as PrismaClient),
        asset = await repo.findById(new AssetId(candidate.assetId));
      if (!asset) throw new Error('ASSET_NOT_FOUND');
      asset.recordRestoreOperation({ ...asset.restoreOperation!, phase: 'COMPLETED' });
      try {
        asset.restore();
        asset.assertCanDeliver();
        Object.assign(data, {
          lifecycleState: 'ACTIVE',
          retentionClaimToken: null,
          retentionClaimUntil: null,
          retentionProcessedAt: null,
          deletedAt: null,
          retentionCategory: asset.retention.category,
          retentionExpiresAt: asset.retention.expiresAt ?? null,
        });
      } catch (error) {
        if (!(error instanceof Error) || error.message !== 'ASSET_RESTORE_RETENTION_POLICY_EXPIRED')
          throw error;
        // A fresh provider fence closes the ambiguous operation. Expired rights to retain
        // the original object never authorize ACTIVE; retain DELETED and its existing policy.
        next.phase = 'CANCELLED';
        Object.assign(data, {
          lifecycleState: 'DELETED',
          retentionClaimToken: null,
          retentionClaimUntil: null,
        });
      }
    } else if (row.lifecycleState !== 'ARCHIVED') throw new Error('ASSET_LIFECYCLE_RECOVERY_STALE');
    const changed = await tx.assetRecord.updateMany({
      where: { id: row.id, updatedAt: row.updatedAt },
      data,
    });
    if (changed.count !== 1) throw new Error('ASSET_LIFECYCLE_RECOVERY_STALE');
  }
}
