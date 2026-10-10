import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { CertificateAdminRouter } from '../../../../src/presentation/api/router/CertificateAdminRouter';
import { CertificatePublicRouter } from '../../../../src/presentation/api/router/CertificatePublicRouter';
function admin(granted: string[] = []) {
  const useCases: any = {
    approveIssuer: vi.fn(),
    getTemplateVersion: vi.fn(),
    deliveryArtifact: vi.fn(),
    reviewCertificate: vi.fn(),
    list: vi.fn(async () => ({ data: [], total: 0 })),
  };
  const app = express();
  app.use(express.json(), (req: any, _res, next) => {
    req.authUserId = 'actor';
    next();
  });
  app.use(
    CertificateAdminRouter.create({
      certificateUseCases: useCases,
      authEvaluatorService: {
        evaluatePermission: async (_actor: string, key: string) => ({
          isGranted: granted.includes(key),
        }),
      } as any,
    }),
  );
  return { app, useCases };
}
describe('section 14 permission and query contracts', () => {
  for (const endpoint of [
    '/issuers/11111111-1111-4111-8111-111111111111/approve',
    '/c/artifacts/pdf/delivery-grant',
    '/c/recipient-correction/approve',
    '/c/revalidation',
  ]) {
    it(`denies view-only mutation ${endpoint}`, async () => {
      const h = admin(['admin:certificates:view']);
      const res = await request(h.app).post(endpoint).send({});
      expect(res.status).toBe(403);
      expect(h.useCases.approveIssuer).not.toHaveBeenCalled();
      expect(h.useCases.deliveryArtifact).not.toHaveBeenCalled();
      expect(h.useCases.reviewCertificate).not.toHaveBeenCalled();
    });
  }
  it('requires an issuer revision precondition before approval', async () => {
    const h = admin(['admin:certificates:issuers:approve']);
    const res = await request(h.app)
      .post('/issuers/issuer/approve')
      .send({
        evidenceAssetId: '11111111-1111-4111-8111-111111111111',
        authorityReference: 'authority',
        reason: 'Evidence reviewed',
      });
    expect(res.status).toBe(428);
    expect(h.useCases.approveIssuer).not.toHaveBeenCalled();
  });
  for (const query of [
    'page=0',
    'pageSize=101',
    'issuerId=unknown',
    'studentReferenceId=not-uuid',
    'issuedFrom=2026-10-11T00:00:00.000Z&issuedTo=2026-10-10T00:00:00.000Z',
    'unexpected=1',
  ]) {
    it(`rejects malformed list query ${query}`, async () => {
      const h = admin(['admin:certificates:view']);
      expect((await request(h.app).get('/?' + query)).status).toBe(400);
      expect(h.useCases.list).not.toHaveBeenCalled();
    });
  }
  it('passes filters to the owner without dropping pagination', async () => {
    const h = admin(['admin:certificates:view']);
    expect(
      (
        await request(h.app).get(
          '/?issuerId=11111111-1111-4111-8111-111111111111&page=2&pageSize=10',
        )
      ).status,
    ).toBe(200);
    expect(h.useCases.list).toHaveBeenCalledWith(
      expect.objectContaining({
        issuerId: '11111111-1111-4111-8111-111111111111',
        page: 2,
        pageSize: 10,
      }),
    );
  });
  it('limits anonymous verification while continuing to read current owner status', async () => {
    let valid = true;
    const read: any = { verifyPublic: vi.fn(async () => ({ isValid: valid })) };
    const app = express();
    app.use(CertificatePublicRouter.create({ certificateReadModelService: read }));
    let result = await request(app).get('/verify/CODE');
    expect(result.body.isValid).toBe(true);
    valid = false;
    result = await request(app).get('/verify/CODE');
    expect(result.body.isValid).toBe(false);
    expect(result.headers['cache-control']).toBe('no-store');
    for (let i = 0; i < 58; i++) await request(app).get('/verify/CODE');
    result = await request(app).get('/verify/CODE');
    expect(result.status).toBe(429);
    expect(read.verifyPublic).toHaveBeenCalledTimes(60);
  });
});
