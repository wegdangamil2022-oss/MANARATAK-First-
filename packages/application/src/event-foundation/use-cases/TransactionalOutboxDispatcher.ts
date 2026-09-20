import {
  IOutboxDeliveryGateway,
  ITransactionalOutboxDispatcher,
  ITransactionalOutboxStore,
  OutboxDispatchRequest,
  OutboxDispatchResult,
  OutboxLeaseOwnership,
  SanitizedOutboxFailure,
} from '@manaratak/domain';

export class TransactionalOutboxDispatcher implements ITransactionalOutboxDispatcher {
  public constructor(
    private readonly store: ITransactionalOutboxStore,
    private readonly delivery: IOutboxDeliveryGateway,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async dispatchBatch(request: OutboxDispatchRequest): Promise<OutboxDispatchResult> {
    this.validate(request);
    const startedAt = this.now();
    const entries = await this.store.claimPendingBatch({
      workerId: request.workerId,
      batchSize: request.batchSize,
      now: startedAt,
      claimUntil: new Date(startedAt.getTime() + request.claimDurationMs),
      domain: request.domain,
      eventTypes: request.eventTypes,
    });
    const result: OutboxDispatchResult = { claimed: entries.length, processed: 0, failed: 0, exhausted: 0, leaseLost: 0 };
    const active = new Map(entries.filter(entry => entry.lease).map(entry => [entry.id, entry.lease!]));
    let heartbeatTask: Promise<void> | null = null;
    const heartbeatMs = Math.max(1_000, Math.floor(request.claimDurationMs / 3));
    const timer = setInterval(() => {
      if (heartbeatTask || active.size === 0) return;
      heartbeatTask = this.heartbeatActive(active, request.claimDurationMs).finally(() => { heartbeatTask = null; });
    }, heartbeatMs);
    timer.unref?.();

    try {
      for (const entry of entries) {
        const ownership = entry.lease;
        if (!ownership) { result.leaseLost += 1; continue; }
        const renewedAt = this.now();
        const renewed = await this.store.renewLease(entry.id, ownership, renewedAt, new Date(renewedAt.getTime() + request.claimDurationMs));
        if (!renewed) { active.delete(entry.id); result.leaseLost += 1; continue; }
        try {
          await this.delivery.deliver(entry, { idempotencyKey: entry.id });
          active.delete(entry.id);
          const processed = await this.store.markProcessed(entry.id, ownership, this.now());
          processed ? result.processed += 1 : result.leaseLost += 1;
        } catch (error) {
          active.delete(entry.id);
          const attempt = entry.attempts + 1;
          const exhausted = attempt >= request.maxAttempts;
          const failedAt = this.now();
          const applied = await this.store.markFailed(
            entry.id,
            ownership,
            this.sanitizeFailure(error, failedAt),
            exhausted ? new Date('9999-12-31T23:59:59.999Z') : new Date(failedAt.getTime() + this.backoff(attempt, request)),
          );
          if (!applied) { result.leaseLost += 1; continue; }
          result.failed += 1;
          if (exhausted) result.exhausted += 1;
        }
      }
    } finally {
      clearInterval(timer);
      await Promise.resolve(heartbeatTask).catch(() => undefined);
    }
    return result;
  }

  private async heartbeatActive(active: Map<string, OutboxLeaseOwnership>, claimDurationMs: number): Promise<void> {
    const now = this.now();
    await Promise.all([...active.entries()].map(async ([id, ownership]) => {
      const owned = await this.store.renewLease(id, ownership, now, new Date(now.getTime() + claimDurationMs));
      if (!owned) active.delete(id);
    }));
  }

  private backoff(attempt: number, request: OutboxDispatchRequest): number {
    return Math.min(request.baseBackoffMs * 2 ** Math.max(0, attempt - 1), request.maxBackoffMs);
  }

  private sanitizeFailure(error: unknown, failedAt: Date): SanitizedOutboxFailure {
    const raw = error instanceof Error ? error.message : 'Delivery failed';
    return { code: 'OUTBOX_DELIVERY_FAILED', message: raw.replace(/(password|token|secret|authorization)\s*[=:]\s*\S+/gi, '$1=[REDACTED]').slice(0, 500), failedAt };
  }

  private validate(request: OutboxDispatchRequest): void {
    if (!request.workerId.trim()) throw new Error('OUTBOX_WORKER_ID_REQUIRED');
    for (const [name, value] of Object.entries(request).filter(([key]) => !['workerId', 'domain', 'eventTypes'].includes(key))) {
      if (!Number.isInteger(value) || Number(value) <= 0) throw new Error(`OUTBOX_INVALID_${name.toUpperCase()}`);
    }
    if (request.domain !== undefined && !request.domain.trim()) throw new Error('OUTBOX_INVALID_DOMAIN');
    if (request.eventTypes !== undefined && (request.eventTypes.length === 0 || request.eventTypes.some(value => !value.trim()))) throw new Error('OUTBOX_INVALID_EVENT_TYPES');
  }
}
