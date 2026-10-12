export enum HealthStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  DEGRADED = 'DEGRADED',
  UNKNOWN = 'UNKNOWN',
}

export interface IHealthIndicator {
  name: string;
  isOptional?: boolean;
  /** Evidence is declared by the owning probe, never inferred from its class name. */
  evidenceKind?: 'READ_ONLY_OPERATION' | 'OBSERVED_RUNTIME' | 'CONFIGURATION_ONLY';
  probeVersion?: number;
  checkHealth(signal?: AbortSignal): Promise<HealthCheckResult>;
}

export interface HealthCheckResult {
  status: HealthStatus;
  details?: Record<string, unknown>;
  timestamp: string;
  error?: string;
  metrics?: Record<string, unknown>;
}
