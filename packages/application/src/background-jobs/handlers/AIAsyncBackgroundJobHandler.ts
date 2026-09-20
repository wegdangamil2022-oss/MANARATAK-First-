import { AIExecutionOrchestrator } from '../../ai-platform/use-cases/AIPlatformUseCases';
import { BackgroundJobHandlerContext, IBackgroundJobHandler } from '../workers/DurableBackgroundJobContracts';

export const AI_ASYNC_SWEEP_JOB_TYPE = 'ai.async.sweep';

export class AIAsyncBackgroundJobHandler implements IBackgroundJobHandler {
  public readonly jobType = AI_ASYNC_SWEEP_JOB_TYPE;
  public constructor(private readonly ai: AIExecutionOrchestrator) {}

  public async handle(payload: Readonly<Record<string, unknown>>, context: BackgroundJobHandlerContext): Promise<void> {
    const limit = typeof payload.limit === 'number' && Number.isInteger(payload.limit) ? Math.min(50, Math.max(1, payload.limit)) : 10;
    await this.ai.processDueAsyncJobs(`bg-ai:${context.jobReference}:${context.attempt}`, limit, context.signal);
  }
}
