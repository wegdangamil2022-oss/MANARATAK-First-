import { IMetrics } from './IMetrics';
import { HealthCheckResult, IHealthIndicator } from './HealthStatus';

export interface IMonitoringSpan {
  readonly traceId: string;
  setAttribute(name: string, value: string | number | boolean): void;
  recordException(error: unknown): void;
  end(status?: 'OK' | 'ERROR'): void;
}

export interface IMonitoringProvider {
  getMetrics(): IMetrics;
  getLiveness(): Promise<HealthCheckResult>;
  getReadiness(): Promise<HealthCheckResult>;
  checkHealth(): Promise<HealthCheckResult>;
  registerIndicator(indicator: IHealthIndicator): void;
  startSpan?(name: string, attributes?: Record<string, string | number | boolean>): IMonitoringSpan;
  forceFlush?(): Promise<void>;
  shutdown?(): Promise<void>;
}
