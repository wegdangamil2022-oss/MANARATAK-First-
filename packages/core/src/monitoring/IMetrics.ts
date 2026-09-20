export interface IMetrics {
  readonly capabilityStatus?: 'NOT_CONFIGURED' | 'CONFIGURED' | 'DEGRADED';
  readonly scope?: string;
  incrementCounter(name: string, value?: number, tags?: Record<string, string>): void;
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void;
  setGauge(name: string, value: number, tags?: Record<string, string>): void;
}
