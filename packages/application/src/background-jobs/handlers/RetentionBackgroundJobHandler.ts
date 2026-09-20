import { RetentionSweepUseCase } from '../../retention/RetentionSweepUseCase';
import { BackgroundJobHandlerContext, IBackgroundJobHandler } from '../workers/DurableBackgroundJobContracts';

export const RETENTION_SWEEP_JOB_TYPE = 'platform.retention.sweep';

export class RetentionBackgroundJobHandler implements IBackgroundJobHandler {
  public readonly jobType = RETENTION_SWEEP_JOB_TYPE;
  public constructor(private readonly retentionSweep: RetentionSweepUseCase) {}

  public async handle(payload: Readonly<Record<string, unknown>>, context: BackgroundJobHandlerContext): Promise<void> {
    if (context.signal.aborted) throw context.signal.reason ?? new Error('BACKGROUND_JOB_ABORTED');
    const rawLimit = payload.limitPerOwner;
    const limitPerOwner = typeof rawLimit === 'number' && Number.isInteger(rawLimit) ? rawLimit : 100;
    const result = await this.retentionSweep.execute({ limitPerOwner });
    if (result.failed > 0) throw new Error(`RETENTION_SWEEP_PARTIAL_FAILURE:${result.failed}`);
  }
}
