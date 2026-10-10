import type { ISourceAcquisitionLimiter } from '@manaratak/application';
import { SourceConnectorCategory, type ImportSourceDefinition } from '@manaratak/domain';

type Bucket = { tokens: number; lastRefill: number; lastRequest?: number };

/** Bounded process-local limiter. This is not a distributed production limiter. */
export class SourceAcquisitionLimiter implements ISourceAcquisitionLimiter {
  private readonly states = new Map<string, Bucket>();
  private readonly pending = new Map<string, Promise<void>>();
  private pendingRequestCount = 0;

  constructor(
    private readonly now: () => number = Date.now,
    private readonly sleep: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
  ) {}

  async wait(source: ImportSourceDefinition): Promise<void> {
    const policy = source.metadata?.rateLimitPolicy as {
      requestsPerMinute?: number; burstLimit?: number; minimumDelayMs?: number;
    } | undefined;
    const rpm = policy?.requestsPerMinute ?? source.rateLimitPerMinute ?? 60;
    const burst = policy?.burstLimit ?? 1;
    const minimumDelay = policy?.minimumDelayMs ?? 0;
    if (!Number.isFinite(rpm) || rpm < 1 || rpm > 60_000 ||
        !Number.isSafeInteger(burst) || burst < 1 || burst > 100 ||
        !Number.isFinite(minimumDelay) || minimumDelay < 0 || minimumDelay > 60_000) {
      throw new Error('SOURCE_RATE_LIMIT_POLICY_INVALID');
    }
    // Two source IDs aimed at one upstream must share its local request budget.
    const key = source.category === SourceConnectorCategory.MANUAL_UPLOAD
      ? `manual:${source.sourceId}` : new URL(source.baseUrl).origin;
    if (this.pendingRequestCount >= 1024) throw new Error('SOURCE_RATE_LIMIT_CAPACITY');
    this.pendingRequestCount++;
    const prior = this.pending.get(key) ?? Promise.resolve();
    const task = prior.then(() => this.acquire(key, rpm, burst, minimumDelay));
    const tail = task.catch(() => undefined);
    this.pending.set(key, tail);
    try { await task; }
    finally {
      this.pendingRequestCount--;
      if (this.pending.get(key) === tail) this.pending.delete(key);
    }
  }

  private async acquire(key: string, rpm: number, burst: number, minimumDelay: number): Promise<void> {
    const initialNow = this.now();
    let state = this.states.get(key);
    if (!state) {
      // Reclaim only fully idle buckets; never evict an actively throttled one
      // to let a caller mint a fresh burst. Fail closed at the resource ceiling.
      if (this.states.size >= 1024) {
        for (const [otherKey, bucket] of this.states) {
          if (!this.pending.has(otherKey) && initialNow - bucket.lastRefill >= 6_000_000) {
            this.states.delete(otherKey);
          }
        }
        if (this.states.size >= 1024) throw new Error('SOURCE_RATE_LIMIT_CAPACITY');
      }
      state = { tokens: burst, lastRefill: initialNow };
      this.states.set(key, state);
    }
    for (;;) {
      this.refill(state, this.now(), rpm, burst);
      const tokenDelay = state.tokens >= 1 ? 0 : Math.ceil((1 - state.tokens) * 60_000 / rpm);
      const spacingDelay = state.lastRequest === undefined ? 0
        : Math.max(0, minimumDelay - (this.now() - state.lastRequest));
      const delay = Math.max(tokenDelay, spacingDelay);
      if (!delay) break;
      if (delay > 30_000) throw new Error('SOURCE_RATE_LIMIT_DEFERRED');
      await this.sleep(delay);
    }
    state.tokens -= 1;
    state.lastRequest = this.now();
  }

  private refill(state: Bucket, now: number, rpm: number, burst: number): void {
    state.tokens = Math.min(burst, state.tokens + Math.max(0, now - state.lastRefill) * rpm / 60_000);
    state.lastRefill = Math.max(now, state.lastRefill);
  }
}
