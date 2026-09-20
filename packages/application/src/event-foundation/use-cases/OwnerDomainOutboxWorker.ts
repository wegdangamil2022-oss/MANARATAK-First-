import { ITransactionalOutboxDispatcher, OutboxDispatchResult } from '@manaratak/domain';

export interface OwnerDomainOutboxWorkerOptions {
  batchSize?: number;
  claimDurationMs?: number;
  maxAttempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
}

/**
 * Poller for owner-domain integration events that do not have a dedicated
 * business worker. Each dispatcher is idempotent/fenced by the canonical
 * transactional outbox; domain filters prevent competing consumers.
 */
export class OwnerDomainOutboxWorker {
  public constructor(
    private readonly projectionDispatcher: ITransactionalOutboxDispatcher,
    private readonly servicesDispatcher: ITransactionalOutboxDispatcher,
    private readonly options: OwnerDomainOutboxWorkerOptions = {},
  ) {}

  public runSettingsOnce(workerId: string): Promise<OutboxDispatchResult> { return this.run(this.projectionDispatcher, workerId, 'SETTINGS'); }
  public runCareerOnce(workerId: string): Promise<OutboxDispatchResult> { return this.run(this.projectionDispatcher, workerId, 'CAREER'); }
  public runServicesOnce(workerId: string): Promise<OutboxDispatchResult> { return this.run(this.servicesDispatcher, workerId, 'SERVICES'); }

  private run(dispatcher: ITransactionalOutboxDispatcher, workerId: string, domain: string): Promise<OutboxDispatchResult> {
    if (!workerId.trim()) throw new Error('OWNER_DOMAIN_OUTBOX_WORKER_ID_REQUIRED');
    return dispatcher.dispatchBatch({
      workerId: workerId.trim(),
      domain,
      batchSize: this.options.batchSize ?? 50,
      claimDurationMs: this.options.claimDurationMs ?? 60_000,
      maxAttempts: this.options.maxAttempts ?? 8,
      baseBackoffMs: this.options.baseBackoffMs ?? 1_000,
      maxBackoffMs: this.options.maxBackoffMs ?? 120_000,
    });
  }
}
