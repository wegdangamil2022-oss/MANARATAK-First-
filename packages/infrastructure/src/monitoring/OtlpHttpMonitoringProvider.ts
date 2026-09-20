import { randomBytes } from 'node:crypto';
import { HealthCheckResult, HealthStatus, IHealthIndicator, IMetrics, IMonitoringProvider, IMonitoringSpan } from '@manaratak/core';

export interface OtlpHttpMonitoringOptions {
  endpoint: string;
  serviceName: string;
  environment: string;
  exportIntervalMs?: number;
  periodicExport?: boolean;
  traceSampleRatio?: number;
  headers?: Record<string, string>;
}

type TelemetryPoint = { kind: 'counter' | 'histogram' | 'gauge'; name: string; value: number; tags: Record<string, string>; timeUnixNano: string };
type SpanPoint = { traceId: string; spanId: string; name: string; startedAt: number; endedAt: number; status: 'OK' | 'ERROR'; attributes: Record<string, string | number | boolean>; exception?: string };
type AttributeValue = string | number | boolean;

function otlpAttributes(input: Record<string, AttributeValue>): Array<{ key: string; value: Record<string, string | number | boolean> }> {
  return Object.entries(input).map(([key, value]) => {
    const encoded: Record<string, string | number | boolean> = typeof value === 'boolean'
      ? { boolValue: value }
      : typeof value === 'number'
        ? { doubleValue: value }
        : { stringValue: value };
    return { key, value: encoded };
  });
}

function millisToUnixNano(value: number): string {
  return String(BigInt(Math.trunc(value)) * 1_000_000n);
}

export class OtlpHttpMonitoringProvider implements IMonitoringProvider, IMetrics {
  public readonly capabilityStatus = 'CONFIGURED' as const;
  public readonly scope = 'OTLP_HTTP';
  private readonly indicators = new Map<string, IHealthIndicator>();
  private readonly metrics: TelemetryPoint[] = [];
  private readonly spans: SpanPoint[] = [];
  private readonly timer?: NodeJS.Timeout;
  private lastExportError: string | null = null;
  private exporting: Promise<void> | null = null;

  public constructor(private readonly options: OtlpHttpMonitoringOptions) {
    if (!/^https?:\/\//i.test(options.endpoint)) throw new Error('OTEL_EXPORTER_OTLP_ENDPOINT_INVALID');
    const interval = Math.max(1_000, options.exportIntervalMs ?? 10_000);
    if (options.periodicExport !== false) {
      this.timer = setInterval(() => { void this.forceFlush().catch(() => undefined); }, interval);
      this.timer.unref?.();
    }
  }

  public getMetrics(): IMetrics { return this; }
  public registerIndicator(indicator: IHealthIndicator): void { this.indicators.set(indicator.name, indicator); }
  public incrementCounter(name: string, value = 1, tags: Record<string, string> = {}): void { this.pushMetric('counter', name, value, tags); }
  public recordHistogram(name: string, value: number, tags: Record<string, string> = {}): void { this.pushMetric('histogram', name, value, tags); }
  public setGauge(name: string, value: number, tags: Record<string, string> = {}): void { this.pushMetric('gauge', name, value, tags); }

  public startSpan(name: string, attributes: Record<string, AttributeValue> = {}): IMonitoringSpan {
    const ratio = Math.max(0, Math.min(1, this.options.traceSampleRatio ?? 1));
    const sampled = Math.random() <= ratio;
    const traceId = randomBytes(16).toString('hex');
    const spanId = randomBytes(8).toString('hex');
    const startedAt = Date.now();
    let ended = false;
    let exception: string | undefined;
    const attrs = { ...attributes };
    return {
      traceId,
      setAttribute: (key, value) => { attrs[key] = value; },
      recordException: (error) => { exception = error instanceof Error ? error.message : String(error); },
      end: (status = exception ? 'ERROR' : 'OK') => {
        if (ended) return;
        ended = true;
        if (sampled) this.spans.push({ traceId, spanId, name, startedAt, endedAt: Date.now(), status, attributes: attrs, ...(exception ? { exception } : {}) });
      },
    };
  }

  public async getLiveness(): Promise<HealthCheckResult> {
    return { status: HealthStatus.UP, timestamp: new Date().toISOString(), details: { capabilityStatus: this.capabilityStatus, scope: this.scope } };
  }

  public async getReadiness(): Promise<HealthCheckResult> {
    return {
      status: this.lastExportError ? HealthStatus.DEGRADED : HealthStatus.UP,
      timestamp: new Date().toISOString(),
      ...(this.lastExportError ? { error: 'OTEL_EXPORT_LAST_ATTEMPT_FAILED' } : {}),
      details: { capabilityStatus: this.capabilityStatus, scope: this.scope, endpointConfigured: true, bufferedMetrics: this.metrics.length, bufferedSpans: this.spans.length },
    };
  }
  public checkHealth(): Promise<HealthCheckResult> { return this.getReadiness(); }

  public async forceFlush(): Promise<void> {
    if (this.exporting) return this.exporting;
    this.exporting = this.flushNow().finally(() => { this.exporting = null; });
    return this.exporting;
  }

  public async shutdown(): Promise<void> {
    clearInterval(this.timer);
    await this.forceFlush();
  }

  private pushMetric(kind: TelemetryPoint['kind'], name: string, value: number, tags: Record<string, string>): void {
    this.metrics.push({ kind, name, value, tags, timeUnixNano: String(BigInt(Date.now()) * 1_000_000n) });
    if (this.metrics.length > 10_000) this.metrics.splice(0, this.metrics.length - 10_000);
  }

  private async flushNow(): Promise<void> {
    const metrics = this.metrics.splice(0);
    const spans = this.spans.splice(0);
    if (!metrics.length && !spans.length) return;
    try {
      await Promise.all([
        metrics.length ? this.post('v1/metrics', this.metricsEnvelope(metrics)) : Promise.resolve(),
        spans.length ? this.post('v1/traces', this.tracesEnvelope(spans)) : Promise.resolve(),
      ]);
      this.lastExportError = null;
    } catch (error) {
      this.lastExportError = error instanceof Error ? error.message : String(error);
      this.metrics.unshift(...metrics);
      this.spans.unshift(...spans);
      throw error;
    }
  }

  private resourceAttributes(): Array<{ key: string; value: Record<string, string | number | boolean> }> {
    return otlpAttributes({ 'service.name': this.options.serviceName, 'deployment.environment.name': this.options.environment });
  }

  private metricsEnvelope(points: TelemetryPoint[]): unknown {
    const metrics = points.map((point) => {
      const common = { attributes: otlpAttributes(point.tags), timeUnixNano: point.timeUnixNano };
      if (point.kind === 'counter') {
        return { name: point.name, sum: { aggregationTemporality: 1, isMonotonic: true, dataPoints: [{ ...common, asDouble: point.value }] } };
      }
      if (point.kind === 'histogram') {
        return { name: point.name, histogram: { aggregationTemporality: 1, dataPoints: [{ ...common, count: '1', sum: point.value, explicitBounds: [], bucketCounts: ['1'] }] } };
      }
      return { name: point.name, gauge: { dataPoints: [{ ...common, asDouble: point.value }] } };
    });
    return {
      resourceMetrics: [{
        resource: { attributes: this.resourceAttributes() },
        scopeMetrics: [{ scope: { name: 'manaratak.monitoring', version: '1' }, metrics }],
      }],
    };
  }

  private tracesEnvelope(points: SpanPoint[]): unknown {
    const spans = points.map((point) => ({
      traceId: point.traceId,
      spanId: point.spanId,
      name: point.name,
      kind: 1,
      startTimeUnixNano: millisToUnixNano(point.startedAt),
      endTimeUnixNano: millisToUnixNano(point.endedAt),
      attributes: otlpAttributes(point.attributes),
      status: { code: point.status === 'ERROR' ? 2 : 1 },
      ...(point.exception ? {
        events: [{
          timeUnixNano: millisToUnixNano(point.endedAt),
          name: 'exception',
          attributes: otlpAttributes({ 'exception.message': point.exception }),
        }],
      } : {}),
    }));
    return {
      resourceSpans: [{
        resource: { attributes: this.resourceAttributes() },
        scopeSpans: [{ scope: { name: 'manaratak.monitoring', version: '1' }, spans }],
      }],
    };
  }

  private async post(pathname: string, body: unknown): Promise<void> {
    const endpoint = `${this.options.endpoint.replace(/\/$/, '')}/${pathname}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(this.options.headers ?? {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`OTEL_EXPORT_HTTP_${response.status}`);
  }
}
