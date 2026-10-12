import { createHash } from 'node:crypto';
import type {
  AtomicPersistenceContext,
  AssetRecord,
  IAssetStorageGateway,
  AssetLifecycleReconciliationProof,
} from '@manaratak/domain';
import type { AtomicDomainMutationCoordinator } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
export interface AssetLifecycleRecoveryCandidate {
  assetId: string;
  operationId: string;
  kind: 'ARCHIVE' | 'RESTORE';
}
export interface IAssetLifecycleRecoveryGateway {
  pending(before: Date, limit: number): Promise<AssetLifecycleRecoveryCandidate[]>;
  load(
    candidate: AssetLifecycleRecoveryCandidate,
  ): Promise<{ asset: AssetRecord; revision: string }>;
  complete(
    candidate: AssetLifecycleRecoveryCandidate,
    revision: string,
    proof: AssetLifecycleReconciliationProof,
    context: AtomicPersistenceContext,
  ): Promise<void>;
}
export class RecoverAssetLifecycleUseCase {
  constructor(
    private readonly gateway: IAssetLifecycleRecoveryGateway,
    private readonly storage: IAssetStorageGateway,
    private readonly atomic: AtomicDomainMutationCoordinator,
  ) {}
  async execute(input: {
    before: Date;
    limit: number;
    signal?: AbortSignal;
    jobReference: string;
  }) {
    if (
      !Number.isInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > 100 ||
      !Number.isFinite(input.before.getTime())
    )
      throw new Error('ASSET_LIFECYCLE_RECOVERY_QUERY_INVALID');
    if (!this.storage.reconcileLifecycleOperation)
      throw new Error('ASSET_LIFECYCLE_RECONCILIATION_NOT_CONFIGURED');
    const candidates = await this.gateway.pending(input.before, input.limit);
    let completed = 0,
      pending = 0,
      failed = 0;
    for (const candidate of candidates) {
      if (input.signal?.aborted) throw new Error('ASSET_LIFECYCLE_RECOVERY_ABORTED');
      try {
        const { asset, revision } = await this.gateway.load(candidate);
        const proof = await this.storage.reconcileLifecycleOperation(asset.locator, {
          operationId: candidate.operationId,
          kind: candidate.kind,
          expectedSha256: asset.checksum?.hash,
        });
        if (!proof) {
          pending++;
          continue;
        }
        assertLifecycleProof(candidate, proof);
        if (candidate.kind === 'RESTORE') {
          if (!this.storage.verifyRestoredObject || !asset.checksum)
            throw new Error('ASSET_RESTORE_VERIFICATION_NOT_CONFIGURED');
          await this.storage.verifyRestoredObject(asset.locator, {
            expectedSha256: asset.checksum.hash,
            expectedByteSize: asset.metadata.byteSize,
            declaredMimeType: asset.metadata.mimeType,
          });
        }
        await this.atomic.execute(
          {
            domain: 'ASSET',
            aggregateType: 'ASSET_LIFECYCLE_RECOVERY',
            aggregateId: candidate.assetId,
            action: 'ASSET_LIFECYCLE_RECONCILED',
            context: {
              actorId: 'SYSTEM',
              actorType: 'SYSTEM',
              source: 'asset-lifecycle-recovery',
              correlationId: input.jobReference,
            },
            auditMetadata: {
              operationId: candidate.operationId,
              kind: candidate.kind,
              fenceDigest: createHash('sha256').update(proof.fenceToken).digest('hex'),
            },
          },
          (tx) => this.gateway.complete(candidate, revision, proof, tx),
        );
        completed++;
      } catch {
        failed++;
      }
    }
    return { completed, pending, failed };
  }
}
export function assertLifecycleProof(
  candidate: AssetLifecycleRecoveryCandidate,
  proof: AssetLifecycleReconciliationProof,
) {
  if (
    proof.operationId !== candidate.operationId ||
    proof.kind !== candidate.kind ||
    proof.fenced !== true ||
    proof.status !== (candidate.kind === 'ARCHIVE' ? 'ARCHIVED' : 'RESTORED') ||
    typeof proof.fenceToken !== 'string' ||
    !proof.fenceToken.trim() ||
    proof.fenceToken.length > 240 ||
    !Number.isFinite(Date.parse(proof.observedAt)) ||
    Math.abs(Date.now() - Date.parse(proof.observedAt)) > 300000
  )
    throw new Error('ASSET_LIFECYCLE_RECONCILIATION_PROOF_INVALID');
}
