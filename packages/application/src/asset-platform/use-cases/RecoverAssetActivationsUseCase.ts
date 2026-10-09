import { AssetId, AssetLifecycleState, IAssetRecordRepository, IAuditRecordRepository } from '@manaratak/domain';
import { createAuditRecordFromDto } from '../../audit/use-cases/AuditRecordFactory';
import { ProcessAssetLifecycleUseCase } from './ProcessAssetLifecycleUseCase';

export class RecoverAssetActivationsUseCase {
  constructor(
    private readonly assets: IAssetRecordRepository,
    private readonly lifecycle: Pick<ProcessAssetLifecycleUseCase, 'activateAsset'>,
    private readonly audit: Pick<IAuditRecordRepository, 'save'>,
  ) {}

  async execute(input: { before: Date; limit: number; jobReference: string; signal: AbortSignal }) {
    if (!Number.isFinite(input.before.getTime()) || input.before.getTime() > Date.now() ||
        !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100 ||
        !input.jobReference.trim() || input.jobReference.length > 240) {
      throw new Error('ASSET_ACTIVATION_RECOVERY_REQUEST_INVALID');
    }
    const checkAbort = () => {
      if (input.signal.aborted) throw new Error('ASSET_ACTIVATION_RECOVERY_ABORTED');
    };
    checkAbort();
    if (!this.assets.findPendingActivations || !this.audit?.save) throw new Error('ASSET_ACTIVATION_RECOVERY_NOT_CONFIGURED');
    const candidates = await this.assets.findPendingActivations(input.before, input.limit);
    if (candidates.length > input.limit) throw new Error('ASSET_ACTIVATION_RECOVERY_LIMIT_EXCEEDED');
    const result = { attempted: 0, recovered: 0, skipped: 0, failed: 0 };
    for (const candidate of candidates) {
      checkAbort();
      const current = await this.assets.findById(new AssetId(candidate.assetId));
      if (!current || current.state !== AssetLifecycleState.SANITIZING ||
          current.activationOperation?.phase !== 'PREPARED' ||
          current.activationOperation.operationId !== candidate.operationId) {
        result.skipped++;
        continue;
      }
      // No source URLs, digests, student data or provider exceptions enter audit/job payloads.
      const record = async (status: 'INTENT' | 'SUCCESS' | 'FAILURE') => {
        const id = globalThis.crypto.randomUUID();
        await this.audit.save(createAuditRecordFromDto({
          id, reference: `EAP-RECOVERY-${id}`, action: 'RECOVER_ASSET_ACTIVATION',
          category: 'ASSET_PLATFORM', severity: status === 'FAILURE' ? 'WARNING' : 'INFO',
          actorId: 'system:background-worker', actorType: 'SYSTEM', targetId: candidate.assetId,
          targetType: 'ASSET', source: 'BACKGROUND_WORKER', timestamp: new Date(),
          correlationReference: input.jobReference,
          contextMetadata: { result: status, operationId: candidate.operationId },
        }));
      };
      // Fail before provider work if intent auditing is unavailable.
      await record('INTENT');
      checkAbort();
      result.attempted++;
      try {
        await this.lifecycle.activateAsset({ assetId: candidate.assetId });
      } catch {
        result.failed++;
        await record('FAILURE');
        continue;
      }
      // Audit failure after committed recovery stays visible as a failed job;
      // it must never be reported as an atomic state+audit transaction.
      await record('SUCCESS');
      result.recovered++;
    }
    return result;
  }
}
