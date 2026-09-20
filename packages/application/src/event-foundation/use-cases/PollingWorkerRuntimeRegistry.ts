export interface PollingWorkerRuntimeSnapshot {
  state: 'STOPPED' | 'RUNNING' | 'DEGRADED';
  lastStartedAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastFailureCode?: string;
}

/** Runtime-only operational evidence for interval-based outbox workers. */
export class PollingWorkerRuntimeRegistry {
  private readonly states = new Map<string, PollingWorkerRuntimeSnapshot>();

  public started(name: string): void {
    this.states.set(name, { ...this.snapshot(name), state: 'RUNNING', lastStartedAt: new Date().toISOString() });
  }
  public success(name: string): void {
    this.states.set(name, { ...this.snapshot(name), state: 'RUNNING', lastSuccessAt: new Date().toISOString(), lastFailureCode: undefined });
  }
  public failure(name: string, error: unknown): void {
    const code = error instanceof Error ? error.message.split(':', 1)[0].slice(0, 120) : 'WORKER_ITERATION_FAILED';
    this.states.set(name, { ...this.snapshot(name), state: 'DEGRADED', lastFailureAt: new Date().toISOString(), lastFailureCode: code });
  }
  public stopped(name: string): void { this.states.set(name, { ...this.snapshot(name), state: 'STOPPED' }); }
  public snapshot(name: string): PollingWorkerRuntimeSnapshot { return this.states.get(name) ?? { state: 'STOPPED' }; }
  public all(): Record<string, PollingWorkerRuntimeSnapshot> { return Object.fromEntries(this.states.entries()); }
}
