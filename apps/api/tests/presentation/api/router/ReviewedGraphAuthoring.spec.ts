import { asValue } from '@manaratak-vendor/awilix-core';
import { container } from '../../../../src/infrastructure/di/container';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { AdminMajorUseCases, CrossDomainGraphReadService, InternationalTestAdminUseCases } from '@manaratak/application';
import { MajorAdminRouter } from '../../../../src/presentation/api/router/MajorAdminRouter';
import { InternationalTestAdminRouter } from '../../../../src/presentation/api/router/InternationalTestAdminRouter';
import { SecurityMiddlewareFactory } from '../../../../src/presentation/security/SecurityMiddlewareFactory';
import { SecurityService } from '../../../../../../packages/infrastructure/src/security/SecurityService';
import { createCanonicalIdempotencyMiddleware } from '../../../../src/presentation/middleware/CanonicalIdempotencyMiddleware';

const owner = '913e0a15-54f3-4af1-a771-1f0bfcdd0d77';
const reference = '913e0a15-54f3-4af1-a771-1f0bfcdd0d78';
const review = { relationshipType: 'PRIMARY', reason: 'Official source checked', evidenceReference: 'review-1' };
function fixture(domain: 'major' | 'test', granted = true, authenticated = true) {
  container.register({authEvaluatorService: asValue({evaluatePermission: vi.fn().mockResolvedValue({isGranted: granted})})});
  const write = vi.fn().mockResolvedValue({ id: 'mapping' });
  const list = vi.fn().mockResolvedValue({ data: [] });
  const cases = { getMajor: vi.fn().mockResolvedValue({id: owner, revision: 2}), addClassificationMapping: write, addCanonicalRelationship: write, listMajors: list };
  const security = new SecurityService(undefined, { signingSecret: 'graph-source-signing-secret-32-characters' });
  const session = 'graph-source-session'; const csrf = security.generateCsrfToken(session);
  const app = express(); app.use(express.json()); app.use(SecurityMiddlewareFactory.createCsrfGuard(security));
  app.use((req, _res, next) => { if (authenticated) req.authUserId = 'verified-identity'; next(); });
  const store = { begin: vi.fn().mockResolvedValue({ kind: 'STARTED', scopeHash: 'graph-command', leaseToken: 'lease' }), complete: vi.fn().mockResolvedValue(undefined) };
  const permission = domain === 'major' ? 'admin:majors:manage' : 'admin:international-tests:manage';
  const root = domain === 'major' ? '/admin/majors' : '/admin/international-tests';
  const router = domain === 'major' ? MajorAdminRouter.create({ adminMajorUseCases: cases as unknown as AdminMajorUseCases })
    : InternationalTestAdminRouter.create({ internationalTestAdminUseCases: cases as unknown as InternationalTestAdminUseCases, crossDomainGraphReadService: {} as CrossDomainGraphReadService });
  app.use(root, SecurityMiddlewareFactory.createAdminPermissionGuard(permission, { evaluatePermission: vi.fn().mockResolvedValue({ isGranted: granted }) } as never), createCanonicalIdempotencyMiddleware({ store: store as never, requireKey: true }), router);
  const path = `${root}/${owner}/${domain === 'major' ? 'classification-mappings' : 'canonical-relationships'}`;
  const body = domain === 'major' ? { taxonomyNodeId: reference, ...review } : { kind: 'TAXONOMY', referenceId: reference, ...review };
  const command = () => request(app).post(path).set('If-Match', '1').set('X-Review-Reason', 'Reviewed source').set('Cookie', 'manaratak_refresh=' + session).set('X-CSRF-Token', csrf).set('Idempotency-Key', 'reviewed-graph');
  return { app, path, root, body, command, write, store, session, csrf, list };
}
describe.each(['major', 'test'] as const)('M10-10 %s graph API security and command contracts', domain => {
  it('passes stable canonical IDs, explicit evidence and verified actor', async () => {
    const f = fixture(domain); expect((await f.command().send(f.body)).status).toBe(201);
    expect(f.write).toHaveBeenCalledWith(owner, f.body, expect.objectContaining({ actorId: 'verified-identity' }));
  });
  it.each(['actorId', 'majorId', 'testId', 'status', 'standardCode', 'metadata'])('rejects injected authority/owner field %s', async field => {
    const f = fixture(domain); expect((await f.command().send({ ...f.body, [field]: 'injected' })).status).toBe(400); expect(f.write).not.toHaveBeenCalled();
  });
  it.each([{ reason: '' }, { evidenceReference: ' ' }, { relationshipType: '' }])('rejects missing review %#', async change => {
    const f = fixture(domain); expect((await f.command().send({ ...f.body, ...change })).status).toBe(400); expect(f.write).not.toHaveBeenCalled();
  });
  it('rejects a label instead of a canonical ID', async () => {
    const f = fixture(domain); expect((await f.command().send({ ...f.body, [domain === 'major' ? 'taxonomyNodeId' : 'referenceId']: 'Computer Science' })).status).toBe(400); expect(f.write).not.toHaveBeenCalled();
  });
  it.each([[false, true, 403], [true, false, 401]] as const)('denies permission or session %s/%s', async (granted, authenticated, expected) => {
    const f = fixture(domain, granted, authenticated); expect((await f.command().send(f.body)).status).toBe(expected); expect(f.write).not.toHaveBeenCalled();
  });
  it('requires session-bound CSRF and an idempotency key', async () => {
    const f = fixture(domain);
    expect((await request(f.app).post(f.path).set('Cookie', 'manaratak_refresh=' + f.session).send(f.body)).status).toBe(403);
    expect((await f.command().set('Cookie', 'manaratak_refresh=foreign-session').send(f.body)).status).toBe(403);
    expect((await request(f.app).post(f.path).set('Cookie', 'manaratak_refresh=' + f.session).set('X-CSRF-Token', f.csrf).send(f.body)).status).toBe(400);
    expect(f.write).not.toHaveBeenCalled();
  });
  it('replays a completed command, and refuses changed payload under the same key', async () => {
    const f = fixture(domain); expect((await f.command().send(f.body)).status).toBe(201);
    f.store.begin.mockResolvedValueOnce({ kind: 'REPLAY', statusCode: 201, responseBody: { success: true } });
    const replay = await f.command().send(f.body); expect(replay.status).toBe(201); expect(replay.headers['idempotency-replayed']).toBe('true');
    f.store.begin.mockResolvedValueOnce({ kind: 'CONFLICT' });
    expect((await f.command().send({ ...f.body, reason: 'Different' })).status).toBe(409); expect(f.write).toHaveBeenCalledOnce();
  });
});
it('filters by canonical taxonomy ID with explicit pagination and rejects raw labels', async () => {
  const f = fixture('major');
  expect((await request(f.app).get(`${f.root}?taxonomyNodeId=${reference}&page=2&pageSize=50`)).status).toBe(200);
  expect(f.list).toHaveBeenCalledWith(expect.objectContaining({ taxonomyNodeId: reference, page: 2, pageSize: 50 }));
  expect((await request(f.app).get(`${f.root}?taxonomyNodeId=Computing`)).status).toBe(400); expect(f.list).toHaveBeenCalledOnce();
});
