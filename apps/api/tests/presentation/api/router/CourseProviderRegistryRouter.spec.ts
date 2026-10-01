import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { CourseProviderRegistryError } from '@manaratak/domain';
import { CourseProviderRegistryRouter } from '../../../../src/presentation/api/router/CourseProviderRegistryRouter';
import { SecurityMiddlewareFactory } from '../../../../src/presentation/security/SecurityMiddlewareFactory';
import { SecurityService } from '../../../../../../packages/infrastructure/src/security/SecurityService';
import { createCanonicalIdempotencyMiddleware } from '../../../../src/presentation/middleware/CanonicalIdempotencyMiddleware';
import type { CourseProviderRegistryUseCases } from '@manaratak/application';

const id = '913e0a15-54f3-4af1-a771-1f0bfcdd0d77';
const body = { expectedUpdatedAt: '2026-10-01T00:00:00.000Z', displayName: 'Provider', officialWebsite: 'https://example.com', aliases: [{ alias: 'Source label' }], allowedDomains: ['example.com'], mappingsReviewed: true, reason: 'Official record checked', evidenceReference: 'review-001' };
function fixture(granted = true, authenticated = true) {
  const cases = { list: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }), get: vi.fn().mockResolvedValue({ id }), update: vi.fn().mockResolvedValue({ id, ...body }), resolveLabel: vi.fn().mockResolvedValue({ state: 'REVIEW_REQUIRED', providerId: null }) };
  const evaluator = { evaluatePermission: vi.fn().mockResolvedValue({ isGranted: granted }) };
  const security = new SecurityService(undefined, { signingSecret: 'provider-source-signing-secret-32-characters' });
  const session = 'provider-test-session'; const csrf = security.generateCsrfToken(session);
  const app = express(); app.use(express.json()); app.use(SecurityMiddlewareFactory.createCsrfGuard(security));
  app.use((req, _res, next) => { if (authenticated) req.authUserId = 'verified-actor'; next(); });
  const store = { begin: vi.fn().mockResolvedValue({ kind: 'STARTED', scopeHash: 'provider-command', leaseToken: 'lease' }), complete: vi.fn().mockResolvedValue(undefined) };
  app.use('/admin/courses/providers', SecurityMiddlewareFactory.createAdminPermissionGuard('admin:courses:manage', evaluator as never), createCanonicalIdempotencyMiddleware({ store: store as never, requireKey: true }), CourseProviderRegistryRouter.create({ courseProviderRegistryUseCases: cases as unknown as CourseProviderRegistryUseCases }));
  const command = () => request(app).put('/admin/courses/providers/' + id).set('Cookie', 'manaratak_refresh=' + session).set('X-CSRF-Token', csrf).set('Idempotency-Key', 'provider-review');
  return { app, cases, command, session, csrf, store };
}
describe('M10-09 provider router and administration security', () => {
  it('passes explicit page/status filters and authenticated actor to the owner use case', async () => {
    const f = fixture(); expect((await request(f.app).get('/admin/courses/providers?page=2&pageSize=50&status=APPROVED')).status).toBe(200);
    expect(f.cases.list).toHaveBeenCalledWith({ page: 2, pageSize: 50, status: 'APPROVED' });
    expect((await f.command().send(body)).status).toBe(200);
    expect(f.cases.update).toHaveBeenCalledWith(id, body, 'verified-actor', undefined);
  });
  it.each(['page=0', 'pageSize=101', 'unknown=x', 'status=FAKE', 'page=1&page=2'])('rejects invalid/unsupported queries: %s', async query => {
    const f = fixture(); expect((await request(f.app).get('/admin/courses/providers?' + query)).status).toBe(400); expect(f.cases.list).not.toHaveBeenCalled();
  });
  it.each([{ ...body, actorId: 'forged' }, { ...body, publicId: 'replaced' }, { ...body, status: 'APPROVED' }, { ...body, lastVerifiedAt: '2026-10-02T00:00:00Z' }, { ...body, mappingsReviewed: false }, { ...body, expectedUpdatedAt: undefined }])('rejects client-owned authority/identity or missing review/fence %#', async bad => {
    const f = fixture(); expect((await f.command().send(bad)).status).toBe(400); expect(f.cases.update).not.toHaveBeenCalled();
  });
  it.each([[false, true, 403], [true, false, 401]] as const)('denies missing permission/session without invoking registry: %s/%s', async (granted, authenticated, expected) => {
    const f = fixture(granted, authenticated); expect((await request(f.app).get('/admin/courses/providers')).status).toBe(expected);
    expect((await f.command().send(body)).status).toBe(expected); expect(f.cases.update).not.toHaveBeenCalled(); expect(f.cases.list).not.toHaveBeenCalled();
  });
  it('denies missing or foreign-session CSRF and missing idempotency key before writing', async () => {
    const f = fixture();
    expect((await request(f.app).put('/admin/courses/providers/' + id).set('Cookie', 'manaratak_refresh=' + f.session).send(body)).status).toBe(403);
    expect((await f.command().set('Cookie', 'manaratak_refresh=another-session').send(body)).status).toBe(403);
    expect((await request(f.app).put('/admin/courses/providers/' + id).set('Cookie', 'manaratak_refresh=' + f.session).set('X-CSRF-Token', f.csrf).send(body)).status).toBe(400);
    expect(f.cases.update).not.toHaveBeenCalled();
  });
  it('returns a conflict for stale mappings, without turning the conflict into success', async () => {
    const f = fixture(); f.cases.update.mockRejectedValue(new CourseProviderRegistryError('PROVIDER_STALE'));
    const result = await f.command().send(body); expect(result.status).toBe(409); expect(result.body.error).toBe('PROVIDER_STALE');
    expect(f.store.complete).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409, responseBody: { error: 'PROVIDER_STALE' } }));
  });
  it('replays the stored command result once and rejects a changed payload under the same key', async () => {
    const f = fixture();
    expect((await f.command().send(body)).status).toBe(200);
    f.store.begin.mockResolvedValueOnce({ kind: 'REPLAY', statusCode: 200, responseBody: { id, ...body } });
    const replay = await f.command().send(body); expect(replay.status).toBe(200); expect(replay.headers['idempotency-replayed']).toBe('true');
    f.store.begin.mockResolvedValueOnce({ kind: 'CONFLICT' });
    expect((await f.command().send({ ...body, displayName: 'Different' })).status).toBe(409);
    expect(f.cases.update).toHaveBeenCalledTimes(1); expect(f.store.complete).toHaveBeenCalledTimes(1);
  });
});
