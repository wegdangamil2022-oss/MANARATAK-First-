import {
  IMonitoringService,
  IMonitoringProvider,
  IHealthIndicator,
  HealthStatus,
  HealthCheckResult,
  IMetrics,
  IMonitoringSpan,
} from '@manaratak/core';

export class MonitoringService implements IMonitoringService {
  private indicators: Map<string, IHealthIndicator> = new Map();

  private inFlight: Promise<HealthCheckResult> | null = null;
  private cached?: { until: number; value: HealthCheckResult };
  // Keep hung underlying clients single-flight even after the HTTP deadline.
  private activeProbes = new Map<string, Promise<HealthCheckResult>>();
  constructor(
    private provider?: IMonitoringProvider,
    private options: {
      probeTimeoutMs?: number;
      totalTimeoutMs?: number;
      concurrency?: number;
      cacheMs?: number;
    } = {},
  ) {}

  registerIndicator(indicator: IHealthIndicator): void {
    if (typeof indicator.name !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(indicator.name) || this.indicators.has(indicator.name))
      throw new Error('HEALTH_PROBE_DUPLICATE_OR_INVALID');
    this.indicators.set(indicator.name, indicator);
    this.cached = undefined;
    if (this.provider && typeof this.provider.registerIndicator === 'function') {
      this.provider.registerIndicator(indicator);
    }
  }

  getMetrics(): IMetrics {
    if (this.provider && typeof this.provider.getMetrics === 'function') {
      return this.provider.getMetrics();
    }
    return {
      incrementCounter: () => {},
      recordHistogram: () => {},
      setGauge: () => {},
      capabilityStatus: 'NOT_CONFIGURED',
      scope: 'PROCESS_LOCAL',
    } as any;
  }

  startSpan(
    name: string,
    attributes: Record<string, string | number | boolean> = {},
  ): IMonitoringSpan {
    return (
      this.provider?.startSpan?.(name, attributes) ?? {
        traceId: 'monitoring-not-configured',
        setAttribute: () => {},
        recordException: () => {},
        end: () => {},
      }
    );
  }

  async forceFlush(): Promise<void> {
    await this.provider?.forceFlush?.();
  }

  async shutdown(): Promise<void> {
    await this.provider?.shutdown?.();
  }

  async getLiveness(): Promise<HealthCheckResult> {
    return {
      status: HealthStatus.UP,
      timestamp: new Date().toISOString(),
      details: {
        liveness: HealthStatus.UP,
        uptime: process.uptime(),
      },
    };
  }

  async getReadiness(): Promise<HealthCheckResult> {
    if (this.cached && this.cached.until > Date.now()) return structuredClone(this.cached.value);
    if (!this.inFlight) {
      this.inFlight = this.collectReadiness()
        .then((value) => {
          this.cached = { until: Date.now() + (this.options.cacheMs ?? 500), value };
          return value;
        })
        .finally(() => {
          this.inFlight = null;
        });
    }
    return structuredClone(await this.inFlight);
  }

  private async collectReadiness(): Promise<HealthCheckResult> {
    const started = Date.now(),
      timestamp = new Date(started).toISOString();
    if (!this.indicators.size)
      return {
        status: HealthStatus.DOWN,
        timestamp,
        error: 'READINESS_NOT_CONFIGURED',
        details: { capabilityStatus: 'NOT_CONFIGURED' },
      };
    const entries = [...this.indicators.entries()],
      details: Record<string, unknown> = {};
    let next = 0;
    const deadline = started + (this.options.totalTimeoutMs ?? 8_000);
    const run = async () => {
      while (next < entries.length) {
        const [name, indicator] = entries[next++];
        const optional = indicator.isOptional === true;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const controller = new AbortController();
        try {
          if (this.activeProbes.has(name)) throw new Error('HEALTH_PROBE_PREVIOUS_ATTEMPT_PENDING');
          const remaining = Math.min(this.options.probeTimeoutMs ?? 2_500, deadline - Date.now());
          if (remaining <= 0) throw new Error('HEALTH_TOTAL_DEADLINE');
          const task = Promise.resolve().then(() => indicator.checkHealth(controller.signal));
          this.activeProbes.set(name, task);
          void task
            .finally(() => {
              this.activeProbes.delete(name);
            })
            .catch(() => undefined);
          const result = await Promise.race([
            task,
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => {
                controller.abort();
                reject(new Error('HEALTH_PROBE_TIMEOUT'));
              }, remaining);
            }),
          ]);
          const valid =
            result &&
            Object.values(HealthStatus).includes(result.status) &&
            Number.isFinite(Date.parse(result.timestamp)) &&
            Date.parse(result.timestamp) >= started - 30_000 &&
            Date.parse(result.timestamp) <= Date.now() + 1_000;
          if (!valid) throw new Error('HEALTH_PROBE_INVALID_OR_STALE');
          details[name] = {
            ...structuredClone(result),
            optional,
            probeVersion: indicator.probeVersion ?? 1,
            evidenceKind: indicator.evidenceKind ?? 'CONFIGURATION_ONLY',
          };
        } catch (error) {
          details[name] = {
            status: optional ? HealthStatus.DEGRADED : HealthStatus.DOWN,
            timestamp: new Date().toISOString(),
            optional,
            probeVersion: indicator.probeVersion ?? 1,
            evidenceKind: indicator.evidenceKind ?? 'CONFIGURATION_ONLY',
            error:
              error instanceof Error && /^HEALTH_[A-Z_]+$/.test(error.message)
                ? error.message
                : 'HEALTH_PROBE_FAILED',
          };
        } finally {
          clearTimeout(timer);
        }
      }
    };
    await Promise.all(
      Array.from(
        { length: Math.min(entries.length, Math.max(1, this.options.concurrency ?? 4)) },
        run,
      ),
    );
    const requiredFailure = Object.values(details).some((value) => {
      const probe = value as { optional: boolean; status: HealthStatus };
      return !probe.optional && probe.status !== HealthStatus.UP;
    });
    return { status: requiredFailure ? HealthStatus.DOWN : HealthStatus.UP, timestamp, details };
  }

  async checkHealth(): Promise<HealthCheckResult> {
    return this.getReadiness();
  }
}
