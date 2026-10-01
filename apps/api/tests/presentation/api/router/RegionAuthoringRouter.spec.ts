import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { ReferenceRegionCommandError } from '@manaratak/domain';
import { ReferenceDataAdminRouter } from '../../../../src/presentation/api/router/ReferenceDataAdminRouter';
import { SecurityMiddlewareFactory } from '../../../../src/presentation/security/SecurityMiddlewareFactory';
import { SecurityService } from '../../../../../../packages/infrastructure/src/security/SecurityService';
import { createCanonicalIdempotencyMiddleware } from '../../../../src/presentation/middleware/CanonicalIdempotencyMiddleware';

const id = '913e0a15-54f3-4af1-a771-1f0bfcdd0d77';
const body = { countryIso2Code: 'YE', regionCode: 'YE-AD', name: 'Aden', aliases: [{ alias: 'عدن', locale: 'ar', aliasType: 'HISTORIC' }] };
function fixture(granted = true, authenticated = true) {
  const cases = { upsertRegion: vi.fn(async data => ({ ...data, id, versionNumber: 1 })), getRegion: vi.fn().mockResolvedValue({ id, ...body }),
    listPage: vi.fn().mockResolvedValue({ data: [], page: 2, pageSize: 50, total: 0, totalPages: 0 }),
    transitionReferenceLifecycle: vi.fn(), getReferenceHistory: vi.fn().mockResolvedValue([]) };
  const evaluator = { evaluatePermission: vi.fn().mockResolvedValue({ isGranted: granted }) };
  const security = new SecurityService(undefined, { signingSecret: 'region-source-only-signing-secret-32-chars' });
  const session = 'region-source-session'; const csrf = security.generateCsrfToken(session);
  const app = express(); app.use(express.json());
  app.use(SecurityMiddlewareFactory.createCsrfGuard(security));
  app.use((req, _res, next) => { if (authenticated) req.authUserId = 'verified-admin'; next(); });
  app.use('/admin/reference-data',
    SecurityMiddlewareFactory.createAdminPermissionGuard('admin:reference-data:manage', evaluator as any),
    createCanonicalIdempotencyMiddleware({ store: {
      begin: vi.fn().mockResolvedValue({ kind: 'STARTED', scopeHash: 'region-source', leaseToken: 'lease' }),
      complete: vi.fn().mockResolvedValue(undefined),
    } as any, requireKey: true }),
    ReferenceDataAdminRouter.create({ referenceDataUseCases: cases as any }));
  const command = (path = '/regions', method: 'post' | 'put' = 'post') => request(app)[method]('/admin/reference-data' + path)
    .set('Cookie', 'manaratak_refresh=' + session).set('X-CSRF-Token', csrf).set('Idempotency-Key', 'region-command');
  return { app, cases, evaluator, command, session, csrf };
}
describe('M10-07 region router/security contracts (no database)', () => {
  it('supports bounded scoped list/detail/create/edit and carries the authenticated actor', async () => {
    const f = fixture();
    expect((await request(f.app).get('/admin/reference-data/regions?countryIso2Code=YE&activeOnly=false&page=2&pageSize=50')).status).toBe(200);
    expect(f.cases.listPage).toHaveBeenCalledWith('regions', { countryIso2Code: 'YE', activeOnly: false, page: 2, pageSize: 50 });
    expect((await request(f.app).get('/admin/reference-data/regions/' + id)).body.id).toBe(id);
    expect((await f.command().send(body)).status).toBe(201);
    expect(f.cases.upsertRegion).toHaveBeenCalledWith(body, expect.objectContaining({ actorId: 'verified-admin' }));
    expect((await f.command('/regions/' + id, 'put').send({ ...body, expectedVersion: 1 })).status).toBe(200);
    expect(f.cases.upsertRegion).toHaveBeenLastCalledWith({ ...body, id, expectedVersion: 1 }, expect.objectContaining({ actorId: 'verified-admin' }));
  });
  it.each([
    { ...body, isActive: false }, { ...body, actorId: 'spoofed-owner' }, { ...body, id },
    { ...body, name: ' ' }, { ...body, regionCode: 'bad code' }, { ...body, aliases: [{ alias: '---' }] },
  ])('rejects unsupported/security-sensitive create fields and invalid names: %j', async invalid => {
    const f = fixture(); expect((await f.command().send(invalid)).status).toBe(400); expect(f.cases.upsertRegion).not.toHaveBeenCalled();
  });
  it('rejects update without expectedVersion and invalid stable IDs', async () => {
    const f = fixture(); expect((await f.command('/regions/' + id, 'put').send(body)).status).toBe(400);
    expect((await request(f.app).get('/admin/reference-data/regions/not-a-uuid')).status).toBe(400);
    expect(f.cases.upsertRegion).not.toHaveBeenCalled(); expect(f.cases.getRegion).not.toHaveBeenCalled();
  });
  it('requires expectedVersion for lifecycle and returns 204 only after the command succeeds', async () => {
    const f = fixture(); const path = '/governance/REGION/' + id + '/lifecycle';
    expect((await f.command(path).send({ toState: 'DEPRECATED', reason: 'source changed' })).status).toBe(400);
    expect(f.cases.transitionReferenceLifecycle).not.toHaveBeenCalled();
    expect((await f.command(path).send({ toState: 'DEPRECATED', reason: 'source changed', expectedVersion: 1 })).status).toBe(204);
    expect(f.cases.transitionReferenceLifecycle).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'REGION', referenceId: id, expectedVersion: 1 }), expect.objectContaining({ actorId: 'verified-admin' }));
  });
  it('exposes region version history through the governed owner API', async () => {
    const f = fixture(); expect((await request(f.app).get('/admin/reference-data/governance/REGION/' + id + '/history')).body).toEqual({ data: [] });
    expect(f.cases.getReferenceHistory).toHaveBeenCalledWith('REGION', id);
  });
  it.each(['REGION_VERSION_CONFLICT', 'REGION_HAS_DEPENDENCIES', 'REGION_IDENTITY_IMMUTABLE', 'REGION_CODE_CONFLICT'] as const)('returns a reviewable conflict without claiming success: %s', async code => {
    const f = fixture(); f.cases.upsertRegion.mockRejectedValue(new ReferenceRegionCommandError(code));
    const response = await f.command().send(body); expect(response.status).toBe(409); expect(response.body).toEqual({ error: code });
  });
  it('returns 404 for missing region', async () => {
    const f = fixture(); f.cases.getRegion.mockRejectedValue(new ReferenceRegionCommandError('REGION_NOT_FOUND'));
    expect((await request(f.app).get('/admin/reference-data/regions/' + id)).status).toBe(404);
  });
  it('denies every region read/write without the current reference-data permission', async () => {
    const f = fixture(false);
    for (const path of ['/regions', '/regions/' + id, '/governance/REGION/' + id + '/history']) expect((await request(f.app).get('/admin/reference-data' + path)).status).toBe(403);
    expect((await f.command().send(body)).status).toBe(403);
    expect((await f.command('/regions/' + id, 'put').send({ ...body, expectedVersion: 1 })).status).toBe(403);
    expect((await f.command('/governance/REGION/' + id + '/lifecycle').send({ expectedVersion: 1, toState: 'DEPRECATED', reason: 'changed' })).status).toBe(403);
    for (const fn of Object.values(f.cases)) expect(fn).not.toHaveBeenCalled();
    expect(f.evaluator.evaluatePermission).toHaveBeenCalledWith('verified-admin', 'admin:reference-data:manage', expect.anything());
  });
  it('denies anonymous reads and mutation without session CSRF or idempotency', async () => {
    const anonymous = fixture(true, false);
    expect((await request(anonymous.app).get('/admin/reference-data/regions')).status).toBe(401);
    const f = fixture();
    expect((await request(f.app).post('/admin/reference-data/regions').set('Cookie', 'manaratak_refresh=' + f.session).set('Idempotency-Key', 'key').send(body)).status).toBe(403);
    expect((await request(f.app).post('/admin/reference-data/regions').set('Cookie', 'manaratak_refresh=' + f.session).set('X-CSRF-Token', f.csrf).send(body)).status).toBe(400);
    expect(f.cases.upsertRegion).not.toHaveBeenCalled();
  });
});
