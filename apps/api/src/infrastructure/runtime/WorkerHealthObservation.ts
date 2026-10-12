import { createHash } from 'node:crypto';
/** Redis observations are written only by completed worker iterations, never by health reads. */
export class WorkerHealthObservation {
  private readonly prefix?: string;
  private pending = new Set<string>();
  constructor(
    private redis: any,
    config: { environment?: string; apiOrigin?: string; revision?: string },
  ) {
    if (config.revision && config.environment && config.apiOrigin) {
      this.prefix = `health:workers:v1:${createHash('sha256').update(JSON.stringify(config)).digest('hex')}`;
    }
  }
  async publish(name: string, snapshot: Record<string, unknown>): Promise<void> {
    if (!this.prefix || !this.redis || this.pending.has(name)) return;
    const timestamp = [snapshot.lastPollAt, snapshot.lastSuccessAt]
      .filter((v): v is string => typeof v === 'string')
      .sort()
      .at(-1);
    if (typeof timestamp !== 'string' || !Number.isFinite(Date.parse(timestamp))) return;
    if (!['RUNNING', 'IDLE'].includes(String(snapshot.state))) return;
    if (
      typeof snapshot.lastErrorAt === 'string' &&
      Date.parse(snapshot.lastErrorAt) > Date.parse(timestamp)
    )
      return;
    this.pending.add(name);
    try {
      await this.redis.set(
        `${this.prefix}:${name}`,
        JSON.stringify({
          state: snapshot.state,
          observedAt: timestamp,
          protocolVersion: 1,
          scope: 'DEPLOYMENT_CLUSTER',
        }),
        'PX',
        3_600_000,
      );
    } finally {
      this.pending.delete(name);
    }
  }
  async read(name: string): Promise<{ state: string; observedAt?: string; scope: string }> {
    if (!this.prefix || !this.redis) return { state: 'UNAVAILABLE', scope: 'DEPLOYMENT_CLUSTER' };
    const raw = await this.redis.get(`${this.prefix}:${name}`);
    if (!raw) return { state: 'NOT_STARTED', scope: 'DEPLOYMENT_CLUSTER' };
    const result = JSON.parse(raw);
    if (
      result.protocolVersion !== 1 ||
      !['RUNNING', 'IDLE'].includes(result.state) ||
      typeof result.observedAt !== 'string'
    )
      return { state: 'INVALID', scope: 'DEPLOYMENT_CLUSTER' };
    return { state: result.state, observedAt: result.observedAt, scope: 'DEPLOYMENT_CLUSTER' };
  }
}
