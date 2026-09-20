import { ImportAdminUseCases } from '../../import-foundation/use-cases/ImportAdminUseCases';
import { BackgroundJobHandlerContext, IBackgroundJobHandler } from '../workers/DurableBackgroundJobContracts';

export const IMPORT_QUEUE_SWEEP_JOB_TYPE = 'imports.queue.sweep';

export class ImportQueueBackgroundJobHandler implements IBackgroundJobHandler {
  public readonly jobType = IMPORT_QUEUE_SWEEP_JOB_TYPE;
  public constructor(private readonly imports: ImportAdminUseCases) {}

  public async handle(payload: Readonly<Record<string, unknown>>, context: BackgroundJobHandlerContext): Promise<void> {
    const maxJobs = typeof payload.maxJobs === 'number' && Number.isInteger(payload.maxJobs) ? Math.min(100, Math.max(1, payload.maxJobs)) : 10;
    for (let index = 0; index < maxJobs; index += 1) {
      if (context.signal.aborted) throw context.signal.reason ?? new Error('BACKGROUND_JOB_ABORTED');
      const result = await this.imports.processNextQueuedBatch(`bg-import:${context.jobReference}:${context.attempt}`);
      if (result === 'IDLE') break;
    }
  }
}
