import { createHash } from 'node:crypto';
/** Redis observations are written by worker lifecycle events, never by health reads. */
export class WorkerHealthObservation {
  private readonly prefix?: string;
  private pending = new Map<string, Promise<void>>();
  constructor(
    private redis: any,
    config: { environment?: string; apiOrigin?: string; revision?: string; namespace?: string },
  ) {
    if (config.revision && config.environment && config.apiOrigin) {
      const namespace = config.namespace?.trim() || 'manaratak:';
      const scope = { environment: config.environment, apiOrigin: config.apiOrigin, revision: config.revision };
      this.prefix = `${namespace.endsWith(':') ? namespace : namespace + ':'}health:workers:v2:${createHash('sha256').update(JSON.stringify(scope)).digest('hex')}`;
    }
  }
  async publish(name: string, snapshot: Record<string, unknown>): Promise<void> {
    if (!this.prefix || !this.redis) return;
    const healthy = ['RUNNING', 'IDLE'].includes(String(snapshot.state));
    if (!healthy && !['DEGRADED', 'FAILED', 'STOPPED'].includes(String(snapshot.state))) return;
    let state = snapshot.state;
    let timestamp = (healthy ? [snapshot.lastPollAt, snapshot.lastSuccessAt] : [snapshot.lastFailureAt, snapshot.lastErrorAt, snapshot.lastStoppedAt])
      .filter((v): v is string => typeof v === 'string')
      .sort()
      .at(-1);
    if (typeof timestamp !== 'string' || !Number.isFinite(Date.parse(timestamp))) return;
    if (
      healthy &&
      typeof snapshot.lastErrorAt === 'string' &&
      Date.parse(snapshot.lastErrorAt) >= Date.parse(timestamp)
    ) {
      // Durable workers return to IDLE after recording a failed job. Store the
      // failure too; skipping it would leave the previous healthy Redis record.
      state = 'DEGRADED';
      timestamp = snapshot.lastErrorAt;
    }
    // Serialize lifecycle writes: a failure must not be dropped while a prior
    // successful observation is still being stored.
    const previous = this.pending.get(name) ?? Promise.resolve();
    const task = previous.catch(() => undefined).then(async () => {
      await this.redis.set(`${this.prefix}:${name}`, JSON.stringify({
        state, observedAt: timestamp,
        protocolVersion: 1, scope: 'DEPLOYMENT_CLUSTER',
      }), { PX: 3_600_000 });
    });
    this.pending.set(name, task);
    try {
      await task;
    } finally {
      if (this.pending.get(name) === task) this.pending.delete(name);
    }
  }
  async read(name: string): Promise<{ state: string; observedAt?: string; scope: string }> {
    if (!this.prefix || !this.redis) return { state: 'UNAVAILABLE', scope: 'DEPLOYMENT_CLUSTER' };
    const raw = await this.redis.get(`${this.prefix}:${name}`);
    if (!raw) return { state: 'NOT_STARTED', scope: 'DEPLOYMENT_CLUSTER' };
    const result = JSON.parse(raw);
    if (
      result.protocolVersion !== 1 ||
      !['RUNNING', 'IDLE', 'DEGRADED', 'FAILED', 'STOPPED'].includes(result.state) ||
      typeof result.observedAt !== 'string'
    )
      return { state: 'INVALID', scope: 'DEPLOYMENT_CLUSTER' };
    return { state: result.state, observedAt: result.observedAt, scope: 'DEPLOYMENT_CLUSTER' };
  }
}
