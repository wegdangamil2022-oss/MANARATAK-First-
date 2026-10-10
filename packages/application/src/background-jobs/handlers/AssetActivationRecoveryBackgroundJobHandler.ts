import { RecoverAssetActivationsUseCase } from '../../asset-platform/use-cases/RecoverAssetActivationsUseCase';
import { BackgroundJobHandlerContext, IBackgroundJobHandler } from '../workers/DurableBackgroundJobContracts';

export const ASSET_ACTIVATION_RECOVERY_JOB_TYPE = 'assets.activation.recovery';

export class AssetActivationRecoveryBackgroundJobHandler implements IBackgroundJobHandler {
  readonly jobType = ASSET_ACTIVATION_RECOVERY_JOB_TYPE;
  constructor(private readonly recovery: RecoverAssetActivationsUseCase, private readonly enabled = false) {}

  async handle(payload: Readonly<Record<string, unknown>>, context: BackgroundJobHandlerContext): Promise<void> {
    if (!this.enabled) throw new Error('ASSET_ACTIVATION_RECOVERY_DISABLED');
    if (Object.keys(payload).some(key => !['limit', 'minimumAgeSeconds'].includes(key))) {
      throw new Error('ASSET_ACTIVATION_RECOVERY_PAYLOAD_INVALID');
    }
    const limit = payload.limit ?? 25;
    const age = payload.minimumAgeSeconds ?? 300;
    if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 100 ||
        typeof age !== 'number' || !Number.isInteger(age) || age < 60 || age > 86400) {
      throw new Error('ASSET_ACTIVATION_RECOVERY_PAYLOAD_INVALID');
    }
    const result = await this.recovery.execute({ before: new Date(Date.now() - age * 1000),
      limit, jobReference: context.jobReference, signal: context.signal }).catch(() => {
        // Queue diagnostics are visible to operators; never persist raw DB/provider errors.
        throw new Error('ASSET_ACTIVATION_RECOVERY_FAILED');
      });
    if (result.failed) throw new Error('ASSET_ACTIVATION_RECOVERY_PARTIAL_FAILURE');
  }
}
