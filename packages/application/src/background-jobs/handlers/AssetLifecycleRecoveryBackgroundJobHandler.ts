import type { RecoverAssetLifecycleUseCase } from '../../asset-platform/use-cases/RecoverAssetLifecycleUseCase';
import type {
  IBackgroundJobHandler,
  BackgroundJobHandlerContext,
} from '../workers/DurableBackgroundJobContracts';
export const ASSET_LIFECYCLE_RECOVERY_JOB_TYPE = 'assets.lifecycle.recovery';
export class AssetLifecycleRecoveryBackgroundJobHandler implements IBackgroundJobHandler {
  readonly jobType = ASSET_LIFECYCLE_RECOVERY_JOB_TYPE;
  constructor(
    private readonly recovery: RecoverAssetLifecycleUseCase,
    private readonly enabled = false,
  ) {}
  async handle(payload: Readonly<Record<string, unknown>>, context: BackgroundJobHandlerContext) {
    if (!this.enabled) throw new Error('ASSET_LIFECYCLE_RECOVERY_DISABLED');
    if (Object.keys(payload).some((key) => !['limit', 'minimumAgeSeconds'].includes(key)))
      throw new Error('ASSET_LIFECYCLE_RECOVERY_PAYLOAD_INVALID');
    if (
      (payload.limit !== undefined && typeof payload.limit !== 'number') ||
      (payload.minimumAgeSeconds !== undefined && typeof payload.minimumAgeSeconds !== 'number')
    )
      throw new Error('ASSET_LIFECYCLE_RECOVERY_PAYLOAD_INVALID');
    const limit = Number(payload.limit ?? 25),
      age = Number(payload.minimumAgeSeconds ?? 300);
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isInteger(age) ||
      age < 60 ||
      age > 86400
    )
      throw new Error('ASSET_LIFECYCLE_RECOVERY_PAYLOAD_INVALID');
    const result = await this.recovery.execute({
      limit,
      before: new Date(Date.now() - age * 1000),
      signal: context.signal,
      jobReference: context.jobReference,
    });
    if (result.failed) throw new Error('ASSET_LIFECYCLE_RECOVERY_PARTIAL_FAILURE');
  }
}
