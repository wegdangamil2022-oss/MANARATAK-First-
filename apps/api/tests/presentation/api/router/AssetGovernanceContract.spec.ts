import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import { AssetPlatformRouter } from '../../../../src/presentation/api/router/AssetPlatformRouter';
import { SecurityMiddlewareFactory } from '../../../../src/presentation/security/SecurityMiddlewareFactory';
function setup(allowed = true) {
  const uc = {
      rights: vi.fn(),
      renditions: vi.fn(async () => []),
      saveRendition: vi.fn(),
      deleteRendition: vi.fn(),
      renditionDelivery: vi.fn(),
    },
    evaluator = { evaluatePermission: vi.fn(async () => ({ isGranted: allowed })) },
    app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authUserId = 'asset-owner';
    next();
  });
  app.use(
    '/admin/assets',
    SecurityMiddlewareFactory.createAdminPermissionGuard('admin:assets:manage', evaluator as any),
    AssetPlatformRouter.create({
      ingestAssetUseCase: {} as any,
      processAssetLifecycleUseCase: {} as any,
      assetGovernanceUseCases: uc as any,
    }),
  );
  return { app, uc };
}
const rights = {
  rightsSource: 'Owner permission',
  attribution: 'University',
  usageScope: 'PUBLIC',
  publicationPolicy: 'MANDATORY',
};
describe('asset rights and rendition HTTP owner boundary (injected principal)', () => {
  it('denies governance reads without asset management', async () => {
    const s = setup(false);
    const res = await request(s.app).get('/admin/assets/parent/renditions');
    expect(res.status).toBe(403);
    expect(s.uc.renditions).not.toHaveBeenCalled();
  });
  it('rejects spoofed storage coordinates and actor IDs', async () => {
    const s = setup();
    for (const extra of [{ storageLocator: 'clean://secret/object' }, { actorId: 'spoofed' }]) {
      const res = await request(s.app)
        .put('/admin/assets/parent/rights')
        .send({
          expectedRevision: '2026-01-01T00:00:00.000Z',
          reason: 'Rights confirmed',
          rights,
          ...extra,
        });
      expect(res.status).toBe(400);
    }
    expect(s.uc.rights).not.toHaveBeenCalled();
  });
  it('requires the exact rights revision and authenticated actor', async () => {
    const s = setup();
    const res = await request(s.app)
      .put('/admin/assets/parent/rights')
      .send({ expectedRevision: '2026-01-01T00:00:00.000Z', reason: 'Rights confirmed', rights });
    expect(res.status).toBe(200);
    expect(s.uc.rights.mock.calls[0][4]).toMatchObject({ actorId: 'asset-owner' });
  });
  it('returns a safe 409 for changed rights or unverifiable rendition evidence', async () => {
    const s = setup();
    s.uc.saveRendition.mockRejectedValue(new Error('ASSET_RENDITION_EVIDENCE_INVALID'));
    const res = await request(s.app)
      .put('/admin/assets/parent/renditions/thumbnail')
      .send({ expectedVersion: 0, status: 'READY', generatedAssetId: 'child' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ASSET_RENDITION_EVIDENCE_INVALID');
  });
  it('fails as 503 when derivation verification is unavailable', async () => {
    const s = setup();
    s.uc.saveRendition.mockRejectedValue(new Error('ASSET_RENDITION_VERIFICATION_NOT_CONFIGURED'));
    expect(
      (
        await request(s.app)
          .put('/admin/assets/parent/renditions/thumbnail')
          .send({ expectedVersion: 0, status: 'READY', generatedAssetId: 'child' })
      ).status,
    ).toBe(503);
  });
  it('deletes only a version-matched rendition relationship', async () => {
    const s = setup();
    const res = await request(s.app)
      .delete('/admin/assets/parent/renditions/thumbnail')
      .send({ expectedVersion: 2 });
    expect(res.status).toBe(204);
    expect(s.uc.deleteRendition).toHaveBeenCalledWith(
      'parent',
      'thumbnail',
      2,
      expect.objectContaining({ actorId: 'asset-owner' }),
    );
  });
  it('refuses a fabricated processing state', async () => {
    const s = setup();
    expect(
      (
        await request(s.app)
          .put('/admin/assets/parent/renditions/thumbnail')
          .send({ expectedVersion: 0, status: 'TRANSFORMED_AUTOMATICALLY' })
      ).status,
    ).toBe(400);
    expect(s.uc.saveRendition).not.toHaveBeenCalled();
  });
});
