import { HealthStatus, HealthCheckResult, IHealthIndicator } from '@manaratak/core';

export class DatabaseHealthChecker implements IHealthIndicator {
  public readonly name = 'database';

  public readonly evidenceKind = 'READ_ONLY_OPERATION' as const;
  public readonly probeVersion = 1;

  private pendingQuery?: Promise<unknown>;
  constructor(private client?: any) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const start = Date.now();
    const checkedAt = new Date().toISOString();

    if (!this.client) {
      return {
        status: HealthStatus.DOWN,
        timestamp: checkedAt,
        error: 'Database connection instance not initialized',
        details: { database: 'disconnected' },
      };
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (this.pendingQuery) throw new Error('Previous health query remains pending');
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Database health check timed out after 2000ms'));
        }, 2000);
        if (typeof timer === 'object' && 'unref' in timer) {
          (timer as any).unref();
        }
      });

      let queryPromise: Promise<any>;
      if (typeof this.client.checkHealth === 'function') {
        queryPromise = this.client.checkHealth();
      } else if (typeof this.client.$queryRaw === 'function') {
        queryPromise = this.client.$queryRaw`SELECT 1`;
      } else if (typeof this.client.$queryRawUnsafe === 'function') {
        queryPromise = this.client.$queryRawUnsafe('SELECT 1');
      } else if (typeof this.client.query === 'function') {
        queryPromise = this.client.query('SELECT 1');
      } else if (typeof this.client.execute === 'function') {
        queryPromise = this.client.execute('SELECT 1');
      } else {
        throw new Error('Database client does not expose a verifiable health query');
      }

      this.pendingQuery = Promise.resolve(queryPromise);
      void this.pendingQuery.finally(() => { this.pendingQuery = undefined; }).catch(() => undefined);
      await Promise.race([queryPromise, timeoutPromise]);
      const latencyMs = Date.now() - start;

      return {
        status: HealthStatus.UP,
        timestamp: checkedAt,
        details: { database: 'connected', latencyMs },
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      const safeError = this.sanitize(err?.message || String(err));
      return {
        status: HealthStatus.DOWN,
        timestamp: checkedAt,
        error: safeError,
        details: { database: 'disconnected', capabilityStatus: 'UNAVAILABLE', latencyMs },
      };
    } finally { clearTimeout(timer); }
  }

  private sanitize(message: string): string {
    return message
      .replace(/(postgres(?:ql)?:\/\/)([^@\s]+)@/gi, '$1***@')
      .replace(/(password|token|secret)\s*[=:]\s*\S+/gi, '$1=[REDACTED]')
      .slice(0, 500);
  }
}
