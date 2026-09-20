import { IBackgroundJobHandler } from './DurableBackgroundJobContracts';

export class BackgroundJobHandlerRegistry {
  private readonly handlers = new Map<string, IBackgroundJobHandler>();

  public constructor(handlers: readonly IBackgroundJobHandler[] = []) {
    for (const handler of handlers) this.register(handler);
  }

  public register(handler: IBackgroundJobHandler): void {
    const jobType = handler.jobType.trim();
    if (!jobType) throw new Error('BACKGROUND_JOB_HANDLER_TYPE_REQUIRED');
    if (this.handlers.has(jobType)) throw new Error(`BACKGROUND_JOB_HANDLER_DUPLICATE:${jobType}`);
    this.handlers.set(jobType, handler);
  }

  public resolve(jobType: string): IBackgroundJobHandler | undefined {
    return this.handlers.get(jobType);
  }

  public listJobTypes(): readonly string[] {
    return Object.freeze([...this.handlers.keys()].sort());
  }
}
