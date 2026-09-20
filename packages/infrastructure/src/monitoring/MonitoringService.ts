import {
  IMonitoringService,
  IMonitoringProvider,
  IHealthIndicator,
  HealthStatus,
  HealthCheckResult,
  IMetrics,
  IMonitoringSpan
} from '@manaratak/core';

export class MonitoringService implements IMonitoringService {
  private indicators: Map<string, IHealthIndicator> = new Map();

  constructor(private provider?: IMonitoringProvider) {}

  registerIndicator(indicator: IHealthIndicator): void {
    this.indicators.set(indicator.name, indicator);
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
      scope: 'PROCESS_LOCAL'
    } as any;
  }

  startSpan(name: string, attributes: Record<string, string | number | boolean> = {}): IMonitoringSpan {
    return this.provider?.startSpan?.(name, attributes) ?? {
      traceId: 'monitoring-not-configured',
      setAttribute: () => {},
      recordException: () => {},
      end: () => {},
    };
  }

  async forceFlush(): Promise<void> {
    await this.provider?.forceFlush?.();
  }

  async shutdown(): Promise<void> {
    await this.provider?.shutdown?.();
  }

  async getLiveness(): Promise<HealthCheckResult> {
    if (this.provider && typeof this.provider.getLiveness === 'function') {
      const providerRes = await this.provider.getLiveness();
      if (providerRes && providerRes.status) {
        return providerRes;
      }
    }
    return {
      status: HealthStatus.UP,
      timestamp: new Date().toISOString(),
      details: {
        liveness: HealthStatus.UP,
        uptime: process.uptime()
      }
    };
  }

  async getReadiness(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    if (this.indicators.size === 0) {
      return {
        status: HealthStatus.DOWN,
        timestamp,
        error: 'READINESS_NOT_CONFIGURED',
        details: { capabilityStatus: 'NOT_CONFIGURED', indicators: 0 }
      };
    }
    const details: Record<string, unknown> = {};
    let overallStatus: HealthStatus = HealthStatus.UP;

    for (const [name, indicator] of this.indicators.entries()) {
      try {
        const result = await indicator.checkHealth();
        const isOptional = indicator.isOptional === true;

        if (result.status === HealthStatus.DOWN) {
          if (!isOptional) {
            overallStatus = HealthStatus.DOWN;
            details[name] = result;
          } else {
            details[name] = {
              ...result,
              status: HealthStatus.DEGRADED,
              optional: true
            };
          }
        } else {
          details[name] = isOptional ? { ...result, optional: true } : result;
        }
      } catch (err: any) {
        const isOptional = indicator.isOptional === true;
        const errResult = {
          status: isOptional ? HealthStatus.DEGRADED : HealthStatus.DOWN,
          timestamp: new Date().toISOString(),
          error: err?.message || String(err),
          optional: isOptional
        };
        details[name] = errResult;
        if (!isOptional) {
          overallStatus = HealthStatus.DOWN;
        }
      }
    }

    return {
      status: overallStatus,
      timestamp,
      details
    };
  }

  async checkHealth(): Promise<HealthCheckResult> {
    return this.getReadiness();
  }
}
