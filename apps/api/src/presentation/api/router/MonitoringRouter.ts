import { Router } from 'express';
import { IMonitoringService, HealthStatus, HealthCheckResult } from '@manaratak/core';
import { ProductionReadinessReport } from '@manaratak/config';

type HealthComponent = {
  id: string;
  status: HealthStatus;
  optional: boolean;
  latencyMs?: number;
  capabilityStatus?: string;
  error?: string;
  checkedAt?: string;
  details?: Record<string, unknown>;
};

const EXPECTED_OPERATIONAL_PROBES = [
  'database',
  'redis',
  'asset-platform',
  'import-foundation',
  'admin-auth',
  'ai-providers',
  'payment-gateway',
  'notifications',
  'background-jobs',
  'student-tools-quota',
  'database-schema',
  'public-web',
] as const;

export class MonitoringRouter {
  public static create({
    monitoringService,
    productionReadinessReport,
    runtimeMode = process.env.NODE_ENV || 'development',
    diagnosticsEnabled = false,
  }: {
    monitoringService: IMonitoringService;
    productionReadinessReport?: ProductionReadinessReport;
    runtimeMode?: string;
    diagnosticsEnabled?: boolean;
  }): Router {
    const router = Router();

    router.get('/health', async (_req, res) => {
      const result = await monitoringService.checkHealth();
      const status = result.status === HealthStatus.UP ? 200 : 503;
      res.status(status).json(this.withIndicators(result));
    });

    router.get('/health/liveness', async (_req, res) => {
      const result = await monitoringService.getLiveness();
      const status = result.status === HealthStatus.UP ? 200 : 503;
      res.status(status).json(result);
    });

    router.get('/health/readiness', async (_req, res) => {
      const result = await monitoringService.getReadiness();
      const status = result.status === HealthStatus.UP ? 200 : 503;
      res.status(status).json(this.withIndicators(result));
    });

    if (!diagnosticsEnabled) {
      return router;
    }

    router.get('/production-readiness', async (_req, res) => {
      res.status(200).json(this.productionReport(productionReadinessReport));
    });

    // Admin-only, read-only and sanitized aggregation endpoint. It deliberately
    // returns HTTP 200 even when the platform is degraded/down so operators can
    // inspect the diagnostic payload without exposing the control-plane report
    // through the public monitoring surface.
    router.get('/overview', async (_req, res) => {
      const livenessStartedAt = Date.now();
      const [health, liveness, readiness] = await Promise.all([
        monitoringService.checkHealth(),
        monitoringService.getLiveness(),
        monitoringService.getReadiness(),
      ]);
      const apiProbeLatencyMs = Math.max(0, Date.now() - livenessStartedAt);
      const components = this.componentsFrom(readiness, health);
      const componentIds = new Set(components.map((component) => component.id));
      const missingProbes = EXPECTED_OPERATIONAL_PROBES.filter((id) => !componentIds.has(id));
      const production = this.productionReport(productionReadinessReport);
      const releaseGate = {
        configurationReady: production.ready,
        runtimeReady: readiness.status === HealthStatus.UP,
        monitoringComplete: missingProbes.length === 0,
      };
      const releaseReady = releaseGate.configurationReady
        && releaseGate.runtimeReady
        && releaseGate.monitoringComplete;

      const counts = components.reduce(
        (acc, component) => {
          if (component.status === HealthStatus.UP) acc.up += 1;
          else if (component.status === HealthStatus.DEGRADED) acc.degraded += 1;
          else if (component.status === HealthStatus.DOWN) acc.down += 1;
          else acc.unknown += 1;
          return acc;
        },
        { up: 0, degraded: 0, down: 0, unknown: 0 },
      );

      res.status(200).json({
        checkedAt: new Date().toISOString(),
        runtimeMode,
        runtimeStatus: readiness.status,
        releaseReady,
        releaseGate,
        api: {
          status: liveness.status,
          latencyMs: apiProbeLatencyMs,
          uptimeSeconds: Number((liveness.details as any)?.uptime ?? 0),
        },
        summary: {
          ...counts,
          productionBlockers: production.blockerCount,
          productionWarnings: production.warningCount,
          monitoredComponents: components.length,
          missingProbes: missingProbes.length,
        },
        components,
        coverage: {
          expected: EXPECTED_OPERATIONAL_PROBES,
          monitored: [...componentIds],
          missingProbes,
        },
        productionReadiness: production,
      });
    });

    return router;
  }

  private static withIndicators(result: HealthCheckResult) {
    return {
      ...result,
      // Preserve the canonical `details` contract while providing the flattened
      // field consumed by the existing admin/dashboard clients.
      indicators: this.indicatorMap(result),
    };
  }

  private static indicatorMap(result: HealthCheckResult): Record<string, unknown> {
    if (!result.details || typeof result.details !== 'object') return {};
    return Object.fromEntries(
      Object.entries(result.details).filter(([, value]) => {
        return Boolean(value && typeof value === 'object' && 'status' in (value as Record<string, unknown>));
      }),
    );
  }

  private static componentsFrom(readiness: HealthCheckResult, health: HealthCheckResult): HealthComponent[] {
    const source = Object.keys(this.indicatorMap(readiness)).length ? readiness : health;
    const indicators = this.indicatorMap(source);

    return Object.entries(indicators).map(([id, raw]) => {
      const value = raw as Record<string, any>;
      const details = value.details && typeof value.details === 'object' ? value.details : {};
      const latencyCandidate = value.latencyMs ?? details.latencyMs ?? value.metrics?.latencyMs;
      return {
        id,
        status: Object.values(HealthStatus).includes(value.status) ? value.status : HealthStatus.UNKNOWN,
        optional: Boolean(value.optional),
        ...(Number.isFinite(Number(latencyCandidate)) ? { latencyMs: Number(latencyCandidate) } : {}),
        ...(typeof details.capabilityStatus === 'string' ? { capabilityStatus: details.capabilityStatus } : {}),
        ...(typeof value.error === 'string' ? { error: this.sanitize(value.error) } : {}),
        checkedAt: typeof value.timestamp === 'string' ? value.timestamp : source.timestamp,
        details: this.sanitizeDetails(details),
      };
    });
  }

  private static productionReport(report?: ProductionReadinessReport): ProductionReadinessReport {
    if (report) return report;
    return {
      ready: false,
      blockerCount: 1,
      warningCount: 0,
      checkedAt: new Date().toISOString(),
      findings: [{
        id: 'production_readiness.not_configured',
        severity: 'BLOCKER',
        area: 'Operations',
        message: 'Production readiness report is not configured.',
        recommendation: 'Wire ProductionReadinessValidator into the API bootstrap process.',
      }],
    };
  }

  private static sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const blockedKey = /(secret|password|token|credential|connection|string|url)/i;
    return Object.fromEntries(
      Object.entries(details)
        .filter(([key]) => !blockedKey.test(key))
        .map(([key, value]) => [key, typeof value === 'string' ? this.sanitize(value) : value]),
    );
  }

  private static sanitize(value: string): string {
    return value
      .replace(/([a-z][a-z0-9+.-]*:\/\/)([^\s/@:]+):([^\s/@]+)@/gi, '$1***@')
      .replace(/\b(sk-[A-Za-z0-9_-]{10,}|Bearer\s+[A-Za-z0-9._-]{10,})\b/gi, '[REDACTED]')
      .slice(0, 500);
  }
}
