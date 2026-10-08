import { describe, expect, it, vi } from 'vitest';
import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { ZodError } from 'zod';
import { AsyncLogContext, InMemoryAuditRecordRepository } from '@manaratak/infrastructure';
import { AtomicDomainMutationCoordinator, ManageAuditRecordsUseCase } from '@manaratak/application';
import { LoggingMiddleware } from '../../src/presentation/middleware/LoggingMiddleware';
import { MutationAuditMiddleware, MutationAuditPolicy } from '../../src/presentation/audit/MutationAuditMiddleware';
import { AuditRouter } from '../../src/presentation/api/router/AuditRouter';
import { createAuditRecordFromDto } from '../../../../packages/application/src/audit/use-cases/AuditRecordFactory';

describe('audit source, correlation and evidence semantics', () => {
  it('shares one server UUID across intent, atomic business audit, outbox and outcome', async () => {
    const repository = new InMemoryAuditRecordRepository();
    const outbox: Array<{ correlationId?: string }> = [];
    const coordinator = new AtomicDomainMutationCoordinator({ execute: vi.fn(async (audit, event, mutation) => {
      await mutation({ boundaryId: 'mock-transaction' });
      await repository.save(createAuditRecordFromDto(audit));
      outbox.push(event);
    }) } as never);
    const app = express();
    app.use(new LoggingMiddleware(new AsyncLogContext(), { logRequest: vi.fn(), logResponse: vi.fn() }).generate());
    app.use((req, _res, next) => { req.authUserId = 'operator'; next(); });
    app.use('/api/v1/admin', new MutationAuditMiddleware(repository, 'ADMIN').generate());
    app.post('/api/v1/admin/authorization/test', async (req, res) => {
      await coordinator.execute({ domain: 'AUTHORIZATION', aggregateType: 'ROLE', aggregateId: 'role-1', action: 'ROLE_ASSIGNED',
        context: { actorId: 'operator', correlationId: String(req.headers['x-correlation-id']) } }, async () => undefined);
      res.status(201).json({ ok: true });
    });
    const response = await request(app).post('/api/v1/admin/authorization/test?token=sensitive-query')
      .set('x-correlation-id', 'forged-client-value').set('x-actor-id', 'forged-actor');
    await new Promise(resolve => setImmediate(resolve));
    const correlationId = response.headers['x-correlation-id'];
    expect(correlationId).not.toBe('forged-client-value');
    expect(correlationId).toMatch(/^[0-9a-f-]{36}$/);
    const page = await repository.queryPage({ correlationId });
    expect(page.items).toHaveLength(3);
    expect(new Set(page.items.map(item => item.getActor().getActorId()))).toEqual(new Set(['operator']));
    expect(new Set(page.items.map(item => item.getSource().getValue()))).toEqual(new Set(['admin-api']));
    expect(outbox[0].correlationId).toBe(correlationId);
    for (const item of page.items.filter(item => item.getTarget().getTargetType() === 'API_ROUTE')) {
      expect(item.getContextMetadata().getData()).toMatchObject({ requestIp: expect.any(String), path: '/api/v1/admin/authorization/test' });
      expect(JSON.stringify(item.getContextMetadata().getData())).not.toContain('sensitive-query');
    }
  });

  it('classifies private support reset and public destination publication as critical', () => {
    for (const path of ['/api/v1/admin/students/support/student-1/reset-layout',
      '/api/v1/admin/study-destinations/EG/publish', '/api/v1/admin/study-destinations/EG/archive']) {
      expect(MutationAuditPolicy.classify({ method: 'POST', originalUrl: path } as Request, 'ADMIN')).toBe('CRITICAL_AUDIT_REQUIRED');
    }
    expect(MutationAuditPolicy.classify({ method: 'PATCH', originalUrl: '/api/v1/admin/study-destinations/EG/profile' } as Request, 'ADMIN')).toBe('STANDARD_AUDIT_REQUIRED');
  });
});

describe('bounded integrity API and honest result projection', () => {
  const appFor = (repository: InMemoryAuditRecordRepository) => {
    const app = express();
    app.use('/audit', AuditRouter.create({ manageAuditRecordsUseCase: new ManageAuditRecordsUseCase(repository) }));
    app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      res.status(error instanceof ZodError ? 400 : 500).json({ code: 'INVALID_QUERY' });
    });
    return app;
  };

  it.each(['limit=101', 'cursor=bad', 'from=2026-10-02T00:00:00Z&until=2026-10-01T00:00:00Z', 'unknown=true'])
    ('rejects invalid verification query: %s', async query => {
      expect((await request(appFor(new InMemoryAuditRecordRepository())).get(`/audit/integrity?${query}`)).status).toBe(400);
    });

  it('never reports an intent row as successful business completion', async () => {
    const repository = new InMemoryAuditRecordRepository();
    await repository.save(createAuditRecordFromDto({ id: 'intent', reference: 'AUD-intent',
      action: 'MUTATION_INTENT_RECORDED', category: 'CRITICAL_MUTATION', severity: 'WARNING',
      actorId: 'operator', actorType: 'IDENTITY', targetId: '/route', targetType: 'API_ROUTE',
      source: 'admin-api', timestamp: new Date(), contextMetadata: { result: 'SUCCESS', auditEvent: 'MUTATION_INTENT' } }));
    const response = await request(appFor(repository)).get('/audit/records');
    expect(response.body.items[0]).toMatchObject({ result: 'INTENT', evidenceLevel: 'INTENT_OBSERVED' });
    const report = await request(appFor(repository)).get('/audit/integrity');
    expect(report.body).toMatchObject({ scope: 'REFERENCE_LINKAGE_AND_TIMESTAMPS', cryptographicVerification: false,
      checkedRecords: 1, hasMore: false, nextCursor: null });
  });

  it('round-trips the verification cursor through the HTTP contract', async () => {
    const repository = new InMemoryAuditRecordRepository();
    for (const id of ['a', 'b']) {
      await repository.save(createAuditRecordFromDto({ id, reference: `AUD-${id}`,
        action: 'ROLE_ASSIGNED', category: 'AUTHORIZATION_MUTATION', severity: 'INFO',
        actorId: 'operator', actorType: 'IDENTITY', targetId: 'role', targetType: 'ROLE',
        source: 'admin-api', timestamp: new Date('2026-10-01T00:00:00Z'), contextMetadata: {} }));
    }
    const app = appFor(repository);
    const first = await request(app).get('/audit/integrity?limit=1');
    expect(first.body).toMatchObject({ checkedRecords: 1, hasMore: true });
    expect(typeof first.body.nextCursor).toBe('string');
    const second = await request(app).get(`/audit/integrity?limit=1&cursor=${encodeURIComponent(first.body.nextCursor)}`);
    expect(second.body).toMatchObject({ checkedRecords: 1, hasMore: false, nextCursor: null });
  });
});
