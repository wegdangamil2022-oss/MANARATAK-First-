import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { MonitoringRouter } from '../../../../src/presentation/api/router/MonitoringRouter';
import { IMonitoringService, HealthStatus } from '@manaratak/core';

describe('MonitoringRouter', () => {
  it('should return health status', async () => {
    const mockMonitoringService: IMonitoringService = {
      checkHealth: vi.fn().mockResolvedValue({ status: HealthStatus.UP }),
      getLiveness: vi.fn().mockResolvedValue({ status: HealthStatus.UP }),
      getReadiness: vi.fn().mockResolvedValue({ status: HealthStatus.UP }),
      getMetrics: vi.fn(),
      registerIndicator: vi.fn(),
      recordMetric: vi.fn() // Add if necessary
    } as any;

    const app = express();
    app.use('/monitoring', MonitoringRouter.create({ monitoringService: mockMonitoringService }));

    const res = await request(app).get('/monitoring/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(HealthStatus.UP);
  });

  it('should return production readiness report without secret values', async () => {
    const mockMonitoringService: IMonitoringService = {
      checkHealth: vi.fn().mockResolvedValue({ status: HealthStatus.UP }),
      getLiveness: vi.fn().mockResolvedValue({ status: HealthStatus.UP }),
      getReadiness: vi.fn().mockResolvedValue({ status: HealthStatus.UP }),
      getMetrics: vi.fn(),
      registerIndicator: vi.fn(),
      recordMetric: vi.fn()
    } as any;

    const app = express();
    app.use('/monitoring', MonitoringRouter.create({
      monitoringService: mockMonitoringService,
      diagnosticsEnabled: true,
      productionReadinessReport: {
        ready: false,
        blockerCount: 1,
        warningCount: 0,
        checkedAt: '2026-07-27T00:00:00.000Z',
        findings: [{
          id: 'admin.strict_mode_required',
          severity: 'BLOCKER',
          area: 'Admin Security',
          message: 'Production admin access is not using strict mode.',
          recommendation: 'Set ADMIN_AUTH_MODE=strict.'
        }]
      }
    }));

    const res = await request(app).get('/monitoring/production-readiness');
    expect(res.status).toBe(200);
    expect(res.body.blockerCount).toBe(1);
    expect(JSON.stringify(res.body)).not.toContain('ADMIN_BEARER_TOKEN=');
  });
  it('returns a sanitized admin overview with normalized component indicators and coverage', async () => {
    const mockMonitoringService: IMonitoringService = {
      checkHealth: vi.fn().mockResolvedValue({
        status: HealthStatus.UP,
        timestamp: '2026-09-04T00:00:00.000Z',
        details: {
          database: {
            status: HealthStatus.UP,
            timestamp: '2026-09-04T00:00:00.000Z',
            details: { capabilityStatus: 'AVAILABLE', latencyMs: 12 },
          },
          redis: {
            status: HealthStatus.DEGRADED,
            timestamp: '2026-09-04T00:00:00.000Z',
            optional: true,
            error: 'redis://user:password@private.example:6379',
            details: { capabilityStatus: 'NOT_CONFIGURED' },
          },
        },
      }),
      getLiveness: vi.fn().mockResolvedValue({
        status: HealthStatus.UP,
        timestamp: '2026-09-04T00:00:00.000Z',
        details: { uptime: 120 },
      }),
      getReadiness: vi.fn().mockResolvedValue({
        status: HealthStatus.UP,
        timestamp: '2026-09-04T00:00:00.000Z',
        details: {
          database: {
            status: HealthStatus.UP,
            timestamp: '2026-09-04T00:00:00.000Z',
            details: { capabilityStatus: 'AVAILABLE', latencyMs: 12 },
          },
          redis: {
            status: HealthStatus.DEGRADED,
            timestamp: '2026-09-04T00:00:00.000Z',
            optional: true,
            error: 'redis://user:password@private.example:6379',
            details: { capabilityStatus: 'NOT_CONFIGURED' },
          },
        },
      }),
      getMetrics: vi.fn(),
      registerIndicator: vi.fn(),
      recordMetric: vi.fn(),
    } as any;

    const app = express();
    app.use('/monitoring', MonitoringRouter.create({
      monitoringService: mockMonitoringService,
      runtimeMode: 'test',
      diagnosticsEnabled: true,
      productionReadinessReport: {
        ready: false,
        blockerCount: 1,
        warningCount: 0,
        checkedAt: '2026-09-04T00:00:00.000Z',
        findings: [{
          id: 'release.blocked',
          severity: 'BLOCKER',
          area: 'Runtime',
          message: 'Blocked',
          recommendation: 'Fix configuration',
        }],
      },
    }));

    const res = await request(app).get('/monitoring/overview');
    expect(res.status).toBe(200);
    expect(res.body.runtimeMode).toBe('test');
    expect(res.body.components).toHaveLength(2);
    expect(res.body.components[0]).toMatchObject({ id: 'database', status: HealthStatus.UP, latencyMs: 12 });
    expect(res.body.coverage.missingProbes).toContain('asset-platform');
    expect(JSON.stringify(res.body)).not.toContain('user:password');
  });

  it('keeps details and exposes a normalized indicators map on health endpoints', async () => {
    const payload = {
      status: HealthStatus.UP,
      timestamp: '2026-09-04T00:00:00.000Z',
      details: {
        database: {
          status: HealthStatus.UP,
          timestamp: '2026-09-04T00:00:00.000Z',
        },
        capabilityStatus: 'AVAILABLE',
      },
    };
    const mockMonitoringService: IMonitoringService = {
      checkHealth: vi.fn().mockResolvedValue(payload),
      getLiveness: vi.fn().mockResolvedValue(payload),
      getReadiness: vi.fn().mockResolvedValue(payload),
      getMetrics: vi.fn(),
      registerIndicator: vi.fn(),
      recordMetric: vi.fn(),
    } as any;

    const app = express();
    app.use('/monitoring', MonitoringRouter.create({ monitoringService: mockMonitoringService }));

    const res = await request(app).get('/monitoring/health');
    expect(res.status).toBe(200);
    expect(res.body.details.database).toBeDefined();
    expect(res.body.indicators.database).toBeDefined();
    expect(res.body.indicators.capabilityStatus).toBeUndefined();
  });

});
