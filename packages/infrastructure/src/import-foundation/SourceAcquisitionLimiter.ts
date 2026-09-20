import type { ISourceAcquisitionLimiter } from '@manaratak/application';
import type { ImportSourceDefinition } from '@manaratak/domain';
export class SourceAcquisitionLimiter implements ISourceAcquisitionLimiter {
  private readonly states = new Map<string, { tokens: number; lastRefill: number; lastRequest?: number }>();
  constructor(private readonly now: () => number = Date.now, private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {}
  async wait(source: ImportSourceDefinition): Promise<void> {
    const policy = source.metadata?.rateLimitPolicy as { requestsPerMinute?: number; burstLimit?: number; minimumDelayMs?: number } | undefined;
    const rpm = policy?.requestsPerMinute ?? source.rateLimitPerMinute ?? 60; const burst = Math.max(1, Math.floor(policy?.burstLimit ?? 1)); const minimumDelay = Math.max(0, policy?.minimumDelayMs ?? 0);
    const initialNow = this.now(); const state = this.states.get(source.sourceId) ?? { tokens: burst, lastRefill: initialNow };
    this.refill(state, initialNow, rpm, burst);
    const tokenDelay = state.tokens >= 1 ? 0 : Math.ceil((1 - state.tokens) * 60_000 / rpm);
    const spacingDelay = state.lastRequest === undefined ? 0 : Math.max(0, minimumDelay - (initialNow - state.lastRequest));
    const delay = Math.max(tokenDelay, spacingDelay); if (delay) await this.sleep(delay);
    const effectiveNow = this.now(); this.refill(state, effectiveNow, rpm, burst); state.tokens = Math.max(0, state.tokens - 1); state.lastRequest = effectiveNow; this.states.set(source.sourceId, state);
  }
  private refill(state: { tokens: number; lastRefill: number }, now: number, rpm: number, burst: number): void { state.tokens = Math.min(burst, state.tokens + Math.max(0, now - state.lastRefill) * rpm / 60_000); state.lastRefill = now; }
}
