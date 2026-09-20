import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  HealthStatus,
  IHealthIndicator,
  IMonitoringService
} from '@manaratak/core';
import {
  MonitoringService,
  DatabaseHealthChecker,
  RedisHealthChecker
} from '@manaratak/infrastructure';
import { MonitoringRouter } from '../../../src/presentation/api/router/MonitoringRouter';

describe('Problem P02 - Health and Readiness Checks', () => {
  let monitoringService: MonitoringService;

  beforeEach(() => {
    monitoringService = new MonitoringService();
  });

  describe('MonitoringService & Health Indicators', () => {
    it('returns DOWN and NOT_CONFIGURED when readiness has no indicators', async () => {
      const readiness = await monitoringService.getReadiness();
      expect(readiness.status).toBe(HealthStatus.DOWN);
      expect(readiness.error).toBe('READINESS_NOT_CONFIGURED');
      expect(readiness.details?.capabilityStatus).toBe('NOT_CONFIGURED');
    });

    it('returns UP for liveness by default', async () => {
      const result = await monitoringService.getLiveness();
      expect(result.status).toBe(HealthStatus.UP);
      expect(result.details?.liveness).toBe(HealthStatus.UP);
    });

    it('returns UP for readiness when all required indicators pass', async () => {
      const dbIndicator: IHealthIndicator = {
        name: 'database',
        isOptional: false,
        checkHealth: async () => ({
          status: HealthStatus.UP,
          timestamp: new Date().toISOString(),
          details: { database: 'connected' }
        })
      };
      monitoringService.registerIndicator(dbIndicator);

      const readiness = await monitoringService.getReadiness();
      expect(readiness.status).toBe(HealthStatus.UP);
      expect(readiness.details?.database).toBeDefined();
    });

    it('returns DOWN for readiness when a required indicator (e.g. database) fails', async () => {
      const dbIndicator: IHealthIndicator = {
        name: 'database',
        isOptional: false,
        checkHealth: async () => ({
          status: HealthStatus.DOWN,
          timestamp: new Date().toISOString(),
          error: 'Connection refused'
        })
      };
      monitoringService.registerIndicator(dbIndicator);

      const readiness = await monitoringService.getReadiness();
      expect(readiness.status).toBe(HealthStatus.DOWN);
      expect(readiness.details?.database).toBeDefined();
    });

    it('returns DOWN when Redis is explicitly required even though its indicator name is redis', async () => {
      monitoringService.registerIndicator({
        name: 'redis',
        isOptional: false,
        checkHealth: async () => ({
          status: HealthStatus.DOWN,
          timestamp: new Date().toISOString(),
          error: 'Redis connection timeout'
        })
      });

      const readiness = await monitoringService.getReadiness();
      expect(readiness.status).toBe(HealthStatus.DOWN);
      expect((readiness.details?.redis as any).status).toBe(HealthStatus.DOWN);
    });

    it('returns UP for readiness when an optional indicator (e.g. redis) fails', async () => {
      const dbIndicator: IHealthIndicator = {
        name: 'database',
        isOptional: false,
        checkHealth: async () => ({
          status: HealthStatus.UP,
          timestamp: new Date().toISOString()
        })
      };
      const redisIndicator: IHealthIndicator = {
        name: 'redis',
        isOptional: true,
        checkHealth: async () => ({
          status: HealthStatus.DOWN,
          timestamp: new Date().toISOString(),
          error: 'Redis connection timeout'
        })
      };
      monitoringService.registerIndicator(dbIndicator);
      monitoringService.registerIndicator(redisIndicator);

      const readiness = await monitoringService.getReadiness();
      expect(readiness.status).toBe(HealthStatus.UP);
      expect((readiness.details?.redis as any).status).toBe(HealthStatus.DEGRADED);
    });
  });

  describe('DatabaseHealthChecker', () => {
    it('returns UP when $queryRaw succeeds', async () => {
      const mockPrisma = {
        $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }])
      };
      const checker = new DatabaseHealthChecker(mockPrisma);
      const result = await checker.checkHealth();

      expect(result.status).toBe(HealthStatus.UP);
      expect(result.details?.database).toBe('connected');
    });

    it('returns DOWN when $queryRaw throws an error', async () => {
      const mockPrisma = {
        $queryRaw: vi.fn().mockRejectedValue(new Error('DB unreachable'))
      };
      const checker = new DatabaseHealthChecker(mockPrisma);
      const result = await checker.checkHealth();

      expect(result.status).toBe(HealthStatus.DOWN);
      expect(result.error).toContain('DB unreachable');
      expect(result.details?.database).toBe('disconnected');
    });

    it('redacts credentials from database errors', async () => {
      const checker = new DatabaseHealthChecker({
        $queryRaw: vi.fn().mockRejectedValue(new Error('failed postgresql://user:password@db.internal/app'))
      });
      const result = await checker.checkHealth();
      expect(result.error).not.toContain('user:password');
      expect(result.error).toContain('postgresql://***@');
    });

    it('returns DOWN when database client is not initialized', async () => {
      const checker = new DatabaseHealthChecker(null);
      const result = await checker.checkHealth();

      expect(result.status).toBe(HealthStatus.DOWN);
      expect(result.error).toContain('Database connection instance not initialized');
    });

    it('times out safely if query hangs', async () => {
      vi.useFakeTimers();
      const mockPrisma = {
        $queryRaw: () => new Promise(() => {})
      };
      const checker = new DatabaseHealthChecker(mockPrisma);
      
      const checkPromise = checker.checkHealth();
      vi.advanceTimersByTime(2500);
      
      const result = await checkPromise;

      expect(result.status).toBe(HealthStatus.DOWN);
      expect(result.error).toContain('timed out');
      
      vi.useRealTimers();
    });
  });

  describe('RedisHealthChecker', () => {
    it('returns UP when ping succeeds', async () => {
      const mockRedis = {
        ping: vi.fn().mockResolvedValue('PONG')
      };
      const checker = new RedisHealthChecker(mockRedis);
      const result = await checker.checkHealth();

      expect(result.status).toBe(HealthStatus.UP);
      expect(result.details?.redis).toBe('connected');
    });

    it('returns DEGRADED when ping fails', async () => {
      const mockRedis = {
        ping: vi.fn().mockRejectedValue(new Error('Redis cluster down'))
      };
      const checker = new RedisHealthChecker(mockRedis);
      const result = await checker.checkHealth();

      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.error).toContain('Redis cluster down');
    });

    it('does not report UP when Redis ping response is not PONG', async () => {
      const checker = new RedisHealthChecker({ ping: vi.fn().mockResolvedValue('OK') });
      const result = await checker.checkHealth();
      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.error).toContain('unexpected response');
    });
  });

  describe('HTTP Endpoints Separation & Status Codes', () => {
    it('Liveness returns HTTP 200 with HealthStatus.UP even if DB is DOWN', async () => {
      const service = new MonitoringService();
      service.registerIndicator({
        name: 'database',
        isOptional: false,
        checkHealth: async () => ({
          status: HealthStatus.DOWN,
          timestamp: new Date().toISOString()
        })
      });

      const app = express();
      app.use('/monitoring', MonitoringRouter.create({ monitoringService: service }));

      const livenessRes = await request(app).get('/monitoring/health/liveness');
      expect(livenessRes.status).toBe(200);
      expect(livenessRes.body.status).toBe(HealthStatus.UP);

      const readinessRes = await request(app).get('/monitoring/health/readiness');
      expect(readinessRes.status).toBe(503);
      expect(readinessRes.body.status).toBe(HealthStatus.DOWN);
    });

    it('Readiness returns HTTP 200 when DB is UP', async () => {
      const service = new MonitoringService();
      service.registerIndicator({
        name: 'database',
        isOptional: false,
        checkHealth: async () => ({
          status: HealthStatus.UP,
          timestamp: new Date().toISOString()
        })
      });

      const app = express();
      app.use('/monitoring', MonitoringRouter.create({ monitoringService: service }));

      const res = await request(app).get('/monitoring/health/readiness');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(HealthStatus.UP);
    });


    it('keeps diagnostic overview and production readiness off the public monitoring surface', async () => {
      const service = new MonitoringService();
      service.registerIndicator({
        name: 'database',
        isOptional: false,
        checkHealth: async () => ({ status: HealthStatus.UP, timestamp: new Date().toISOString() })
      });
      const app = express();
      app.use('/monitoring', MonitoringRouter.create({ monitoringService: service }));

      expect((await request(app).get('/monitoring/overview')).status).toBe(404);
      expect((await request(app).get('/monitoring/production-readiness')).status).toBe(404);
    });

    it('computes the admin release gate from configuration, runtime and monitoring coverage together', async () => {
      const expected = [
        'database', 'redis', 'asset-platform', 'import-foundation', 'admin-auth', 'ai-providers',
        'payment-gateway', 'notifications', 'background-jobs', 'student-tools-quota', 'database-schema', 'public-web'
      ];
      const service = new MonitoringService();
      for (const name of expected) {
        service.registerIndicator({
          name,
          isOptional: false,
          checkHealth: async () => ({ status: HealthStatus.UP, timestamp: new Date().toISOString() })
        });
      }
      const app = express();
      app.use('/admin-monitoring', MonitoringRouter.create({
        monitoringService: service,
        diagnosticsEnabled: true,
        productionReadinessReport: {
          ready: true,
          blockerCount: 0,
          warningCount: 0,
          checkedAt: new Date().toISOString(),
          findings: []
        }
      }));

      const response = await request(app).get('/admin-monitoring/overview');
      expect(response.status).toBe(200);
      expect(response.body.releaseReady).toBe(true);
      expect(response.body.releaseGate).toEqual({
        configurationReady: true,
        runtimeReady: true,
        monitoringComplete: true
      });
    });

    it('returns HTTP 503 DOWN through the monitoring router when DB fails', async () => {
      const service = new MonitoringService();
      service.registerIndicator(new DatabaseHealthChecker({ $queryRaw: vi.fn().mockRejectedValue(new Error('database unavailable')) }));
      const app = express();
      app.use('/api/v1/monitoring', MonitoringRouter.create({ monitoringService: service }));
      const res = await request(app).get('/api/v1/monitoring/health/readiness');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe(HealthStatus.DOWN);
      expect(res.body.status).not.toBe('healthy');
    });

    it('returns HTTP 200 UP through the monitoring router when DB is healthy', async () => {
      const mockPrisma = {
        $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }])
      };
      const service = new MonitoringService();
      service.registerIndicator(new DatabaseHealthChecker(mockPrisma));
      const app = express();
      app.use('/api/v1/monitoring', MonitoringRouter.create({ monitoringService: service }));
      const res = await request(app).get('/api/v1/monitoring/health/readiness');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(HealthStatus.UP);
      expect(res.body.status).not.toBe('healthy');
    });
  });
});
