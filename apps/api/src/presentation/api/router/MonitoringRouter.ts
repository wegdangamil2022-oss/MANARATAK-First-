import { Router } from 'express';
import { IMonitoringService, HealthStatus, HealthCheckResult } from '@manaratak/core';
import {
  ProductionReadinessReport,
  operationalProbeIds,
  launchDependencyManifest,
} from '@manaratak/config';
import { sanitizeDiagnostic, diagnosticErrorCode } from '../../monitoring/DiagnosticSanitizer.js';
import { HealthObservationHistory } from '../../monitoring/HealthObservationHistory.js';

type HealthComponent = {
  id: string;
  status: HealthStatus;
  optional: boolean;
  checkedAt: string;
  evidenceKind: string;
  probeVersion: number;
  operational: boolean;
  latencyMs?: number;
  capabilityStatus?: string;
  error?: string;
  details: Record<string, unknown>;
};
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
    router.use((_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      const sourceSha = process.env.RELEASE_SOURCE_SHA;
      if (sourceSha && /^[0-9a-f]{40}$/.test(sourceSha)) res.setHeader('X-Manaratak-Source-Sha', sourceSha);
      next();
    });
    const history = new HealthObservationHistory();
    const publicProbe = (path: string, probe: () => Promise<HealthCheckResult>) => {
      router.get(path, async (_req, res) => {
        try {
          const result = await probe(),
            up = result.status === HealthStatus.UP;
          res
            .status(up ? 200 : 503)
            .json({
              protocolVersion: 2,
              status: up ? HealthStatus.UP : HealthStatus.DOWN,
              timestamp: new Date().toISOString(),
              code: up ? 'AVAILABLE' : 'NOT_READY',
            });
        } catch {
          res
            .status(503)
            .json({
              protocolVersion: 2,
              status: HealthStatus.DOWN,
              timestamp: new Date().toISOString(),
              code: 'NOT_READY',
            });
        }
      });
    };
    publicProbe('/health', () => monitoringService.getReadiness());
    publicProbe('/health/liveness', () => monitoringService.getLiveness());
    publicProbe('/health/readiness', () => monitoringService.getReadiness());
    if (!diagnosticsEnabled) return router;
    router.get('/production-readiness', (_req, res) =>
      res.json(this.productionReport(productionReadinessReport)),
    );
    router.get('/history', (req, res) => {
      const window = req.query.window ?? '1h';
      if (window !== '1h' && window !== '24h' && window !== '7d') {
        res.status(422).json({ code: 'INVALID_HISTORY_WINDOW' });
        return;
      }
      const cursor = req.query.cursor;
      if (
        cursor !== undefined &&
        (typeof cursor !== 'string' || cursor.length > 40 || !Number.isFinite(Date.parse(cursor)))
      ) {
        res.status(422).json({ code: 'INVALID_HISTORY_CURSOR' });
        return;
      }
      res.json({ protocolVersion: 2, ...history.read(window, cursor as string | undefined) });
    });
    router.get('/overview', async (_req, res) => {
      const started = Date.now();
      try {
        const liveStarted = Date.now();
        const livenessTask = monitoringService
          .getLiveness()
          .then((value) => ({ value, duration: Date.now() - liveStarted }));
        const [readiness, live] = await Promise.all([
          monitoringService.getReadiness(),
          livenessTask,
        ]);
        const components = this.componentsFrom(readiness);
        const ids = new Set(components.map((component) => component.id));
        const missingProbes = operationalProbeIds.filter((id) => !ids.has(id));
        const extraProbes = [...ids].filter(
          (id) => !(operationalProbeIds as readonly string[]).includes(id),
        );
        const requiredUnverified = components
          .filter((component) => !component.optional && !component.operational)
          .map((component) => component.id);
        const environmentEligible = runtimeMode === 'production';
        const production = this.productionReport(productionReadinessReport);
        const releaseGate = {
          environmentEligible,
          configurationReady: production.ready,
          runtimeReady:
            readiness.status === HealthStatus.UP &&
            components.length > 0 &&
            components.every((c) => c.optional || c.status === HealthStatus.UP),
          monitoringComplete: missingProbes.length === 0 && requiredUnverified.length === 0,
        };
        const releaseReady = Object.values(releaseGate).every(Boolean);
        const counts = { up: 0, degraded: 0, down: 0, unknown: 0 };
        for (const c of components) {
          if (c.status === HealthStatus.UP) counts.up++;
          else if (c.status === HealthStatus.DOWN) counts.down++;
          else if (c.status === HealthStatus.DEGRADED) counts.degraded++;
          else counts.unknown++;
        }
        const checkedAt = readiness.timestamp;
        history.record({ checkedAt, components });
        res.json({
          protocolVersion: 2,
          checkedAt,
          runtimeMode,
          runtimeStatus: readiness.status,
          releaseReady,
          decisionScope: environmentEligible
            ? 'PRODUCTION_RELEASE_GATE'
            : runtimeMode === 'staging'
              ? 'STAGING_DIAGNOSTIC_ONLY'
              : 'DEVELOPMENT_DIAGNOSTIC_ONLY',
          releaseGate,
          diagnosticAggregationDurationMs: Math.max(0, Date.now() - started),
          api: {
            status: live.value.status,
            livenessDurationMs: live.duration,
            uptimeSeconds: Number.isFinite(Number(live.value.details?.uptime))
              ? Number(live.value.details?.uptime)
              : 0,
          },
          summary: {
            ...counts,
            productionBlockers: production.blockerCount,
            productionWarnings: production.warningCount,
            monitoredComponents: ids.size - extraProbes.length,
            missingProbes: missingProbes.length,
          },
          components,
          coverage: {
            expected: operationalProbeIds,
            monitored: [...ids],
            missingProbes,
            extraProbes,
            expectedCount: operationalProbeIds.length,
            matchedCount: ids.size - extraProbes.length,
            extraCount: extraProbes.length,
            missingCount: missingProbes.length,
            requiredUnverified,
            operationalCount: components.filter((c) => c.operational).length,
            testedCoverage: 'NOT_ATTESTED',
            dependencyManifest: launchDependencyManifest({ NODE_ENV: runtimeMode }),
          },
          productionReadiness: production,
        });
      } catch {
        res.status(503).json({ protocolVersion: 2, code: 'DIAGNOSTICS_UNAVAILABLE' });
      }
    });
    return router;
  }
  private static componentsFrom(result: HealthCheckResult): HealthComponent[] {
    return Object.entries(result.details ?? {})
      .filter(([, raw]) => raw && typeof raw === 'object' && 'status' in raw)
      .map(([id, raw]) => {
        const value = raw as Record<string, unknown>;
        const details = sanitizeDiagnostic(value.details ?? {}) as Record<string, unknown>;
        const timestamp = typeof value.timestamp === 'string' ? value.timestamp : '';
        const age = Date.now() - Date.parse(timestamp);
        const fresh = Number.isFinite(age) && age >= -1_000 && age <= 30_000;
        const status =
          Object.values(HealthStatus).includes(value.status as HealthStatus) && fresh
            ? (value.status as HealthStatus)
            : HealthStatus.UNKNOWN;
        const evidenceKind =
          typeof value.evidenceKind === 'string' ? value.evidenceKind : 'CONFIGURATION_ONLY';
        const probeVersion = typeof value.probeVersion === 'number' ? value.probeVersion : 0;
        const latency = Number(details.latencyMs);
        return {
          id,
          status,
          optional: value.optional === true,
          checkedAt: timestamp,
          evidenceKind,
          probeVersion,
          operational:
            status === HealthStatus.UP &&
            fresh &&
            probeVersion >= 1 &&
            ['READ_ONLY_OPERATION', 'OBSERVED_RUNTIME'].includes(evidenceKind) &&
            Object.keys(details).length > 0,
          ...(Number.isFinite(latency) && latency >= 0 ? { latencyMs: latency } : {}),
          ...(typeof details.capabilityStatus === 'string'
            ? { capabilityStatus: details.capabilityStatus }
            : {}),
          ...(diagnosticErrorCode(value.error) ? { error: diagnosticErrorCode(value.error) } : {}),
          details,
        };
      });
  }
  private static productionReport(report?: ProductionReadinessReport): ProductionReadinessReport {
    if (report && Array.isArray(report.findings) && Number.isFinite(Date.parse(report.checkedAt))) {
      const findings = report.findings
        .slice(0, 100)
        .map((finding) => ({
          severity: (['BLOCKER', 'WARNING', 'INFO'].includes(finding.severity) ? finding.severity : 'BLOCKER') as 'BLOCKER' | 'WARNING' | 'INFO',
          message: String(sanitizeDiagnostic(finding.message)),
          recommendation: String(sanitizeDiagnostic(finding.recommendation)),
          area: String(sanitizeDiagnostic(finding.area)),
          id: String(sanitizeDiagnostic(finding.id)),
        }));
      if (report.findings.length > 100) findings.push({ id: 'diagnostic.findings_limit', severity: 'BLOCKER', area: 'Monitoring', message: 'Diagnostic findings limit exceeded.', recommendation: 'Review the complete owner report.' });
      const blockerCount = findings.filter((f) => f.severity === 'BLOCKER').length;
      return {
        ready: report.ready === true && report.blockerCount === 0 && blockerCount === 0,
        blockerCount,
        warningCount: findings.filter((f) => f.severity === 'WARNING').length,
        checkedAt: report.checkedAt,
        findings,
      };
    }
    return {
      ready: false,
      blockerCount: 1,
      warningCount: 0,
      checkedAt: new Date().toISOString(),
      findings: [
        {
          id: 'production_readiness.not_configured',
          severity: 'BLOCKER',
          area: 'Operations',
          message: 'Production readiness report is not configured.',
          recommendation: 'Configure the production validator.',
        },
      ],
    };
  }
}
