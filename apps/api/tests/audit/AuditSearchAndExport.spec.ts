import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { InMemoryAuditRecordRepository, AsyncLogContext, DefaultErrorSerializer } from '@manaratak/infrastructure';
import { createAuditRecordFromDto, ManageAuditRecordsUseCase } from '@manaratak/application';
import { AuditRouter } from '../../src/presentation/api/router/AuditRouter';
import { GlobalExceptionHandler } from '../../src/presentation/middleware/GlobalExceptionHandler';

async function setup() {
  const repository = new InMemoryAuditRecordRepository();
  const common = { severity: 'INFO', category: 'AUTHORIZATION_MUTATION', actorId: 'operator', actorType: 'IDENTITY',
    targetId: 'role-1', targetType: 'ROLE', source: 'admin-api', timestamp: new Date('2026-10-01T00:00:00Z'),
    correlationReference: 'operation-1', traceReference: 'trace-1', regulatoryTags: ['GDPR'] };
  for (const [id, action, metadata] of [
    ['a', 'ROLE_ASSIGNED', { result: 'SUCCESS', atomicity: 'BUSINESS_AUDIT_OUTBOX', method: 'POST', path: '/api/v1/admin/authorization/roles', password: 'secret-fixture' }],
    ['b', 'ROLE_ASSIGNMENT_REVOKED', { result: 'FAILURE' }],
    ['c', 'MUTATION_INTENT_RECORDED', { result: 'SUCCESS', auditEvent: 'MUTATION_INTENT' }],
    ['d', 'LEGACY_EVENT', {}],
  ] as const) {
    await repository.save(createAuditRecordFromDto({ ...common, id, reference: `AUD-${id}`, action, contextMetadata: metadata }));
  }
  const app = express();
  app.use('/audit', AuditRouter.create({ manageAuditRecordsUseCase: new ManageAuditRecordsUseCase(repository) }));
  // Use the real global error boundary so query errors cannot be hidden by a test-only mapper.
  app.use(new GlobalExceptionHandler({ error: () => {}, warn: () => {} } as never, new AsyncLogContext(), new DefaultErrorSerializer()).generate());
  return { app, repository };
}

describe('audit filtered search and bounded exports', () => {
  it.each([['SUCCESS', 'a'], ['FAILURE', 'b'], ['INTENT', 'c'], ['UNKNOWN', 'd']])
    ('filters %s on the server without treating intent as success', async (result, id) => {
      const { app } = await setup();
      const response = await request(app).get(`/audit/records?result=${result}`);
      expect(response.status).toBe(200);
      expect(response.body.items.map((item: { id: string }) => item.id)).toEqual([id]);
    });

  it.each([
    ['reference', 'AUD-a'], ['traceId', 'trace-1'], ['actorType', 'IDENTITY'],
    ['targetType', 'ROLE'], ['source', 'admin-api'], ['lifecycleState', 'RECORDED'],
    ['complianceTag', 'GDPR'], ['method', 'POST'], ['path', '/api/v1/admin/authorization/roles'],
  ])('supports the %s investigation filter', async (key, value) => {
    const { app } = await setup();
    const query = new URLSearchParams({ [key]: value, result: 'SUCCESS' });
    const response = await request(app).get(`/audit/records?${query}`);
    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { id: string }) => item.id)).toEqual(['a']);
    const missing = await request(app).get(`/audit/records?${new URLSearchParams({ [key]: key === 'lifecycleState' ? 'ARCHIVED' : key === 'method' ? 'DELETE' : 'absent' })}`);
    expect(missing.body.items).toEqual([]);
  });

  it('paginates equal timestamps and exports the same filtered result server-side', async () => {
    const { app } = await setup();
    const first = await request(app).get('/audit/export?format=json&limit=2');
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ bounded: true, hasMore: true });
    expect(first.body.items.map((item: { id: string }) => item.id)).toEqual(['d', 'c']);
    const second = await request(app).get(`/audit/export?format=json&limit=2&cursor=${encodeURIComponent(first.body.nextCursor)}`);
    expect(second.body.items.map((item: { id: string }) => item.id)).toEqual(['b', 'a']);
    expect(second.body.hasMore).toBe(false);
    expect(JSON.stringify(second.body)).not.toContain('secret-fixture');
    const filtered = await request(app).get('/audit/export?format=json&result=FAILURE');
    expect(filtered.body.items.map((item: { id: string }) => item.id)).toEqual(['b']);
  });

  it('protects server CSV formulas and exposes the bounded export scope', async () => {
    const { app, repository } = await setup();
    await repository.save(createAuditRecordFromDto({ id: 'formula', reference: 'AUD-formula', action: 'ROLE_ASSIGNED',
      category: 'AUTHORIZATION', severity: 'INFO', actorId: '=SUM(A1)', actorType: 'IDENTITY', targetId: '@formula',
      targetType: 'ROLE', source: 'admin-api', timestamp: new Date(), contextMetadata: { result: 'SUCCESS' } }));
    const response = await request(app).get('/audit/export?format=csv&reference=AUD-formula');
    expect(response.status).toBe(200);
    expect(response.text).toContain('"\'=SUM(A1)"');
    expect(response.text).toContain('"\'@formula"');
    expect(response.headers['x-audit-export-scope']).toBe('BOUNDED_PAGE');
    expect(response.headers['x-audit-export-count']).toBe('1');
    expect(response.headers['x-audit-has-more']).toBe('false');
  });

  it.each(['result=INVALID', 'contextMetadata=arbitrary', 'cursor=bad', 'limit=101',
    'from=2026-10-02T00:00:00Z&until=2026-10-01T00:00:00Z'])
    ('returns canonical validation errors for %s', async query => {
      const { app } = await setup();
      const response = await request(app).get(`/audit/records?${query}`);
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
});
