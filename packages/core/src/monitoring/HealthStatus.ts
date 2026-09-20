export enum HealthStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  DEGRADED = 'DEGRADED',
  UNKNOWN = 'UNKNOWN'
}

export interface IHealthIndicator {
  name: string;
  isOptional?: boolean;
  checkHealth(): Promise<HealthCheckResult>;
}

export interface HealthCheckResult {
  status: HealthStatus;
  details?: Record<string, unknown>;
  timestamp: string;
  error?: string;
  metrics?: Record<string, unknown>;
}
