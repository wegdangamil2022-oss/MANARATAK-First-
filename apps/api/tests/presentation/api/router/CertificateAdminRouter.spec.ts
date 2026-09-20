import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { CertificateAdminRouter } from '../../../../src/presentation/api/router/CertificateAdminRouter';

describe('CertificateAdminRouter', () => {
  const setup = () => {
    const useCases: any = {
      list: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 25 }),
      analytics: vi.fn(),
      listTemplates: vi.fn(),
      createTemplate: vi.fn(),
      updateTemplate: vi.fn(),
      transitionTemplate: vi.fn(),
      issueFromCourseCompletion: vi.fn(),
      listStudentCertificates: vi.fn(),
      listLedger: vi.fn(),
      getCertificate: vi.fn(),
      revoke: vi.fn(),
      reissue: vi.fn(),
      archive: vi.fn(),
    };
    const authEvaluatorService: any = {
      evaluatePermission: vi.fn().mockResolvedValue({ isGranted: true }),
    };
    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => { req.authUserId = 'admin-1'; next(); });
    app.use('/certificates', CertificateAdminRouter.create({ certificateUseCases: useCases, authEvaluatorService }));
    return { app, useCases };
  };
  it('lists the real certificate registry', async () => {
    const { app, useCases } = setup();
    const response = await request(app).get('/certificates?status=ACTIVE');
    expect(response.status).toBe(200);
    expect(useCases.list).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACTIVE' }));
  });
  it('requires a meaningful revocation reason', async () => {
    const { app, useCases } = setup();
    const response = await request(app)
      .post('/certificates/cert-1/revoke')
      .send({ reason: 'short' });
    expect(response.status).toBe(400);
    expect(useCases.revoke).not.toHaveBeenCalled();
  });
  it('creates templates as governed drafts', async () => {
    const { app, useCases } = setup();
    useCases.createTemplate.mockResolvedValue({ id: 'template-1', status: 'DRAFT' });
    const response = await request(app)
      .post('/certificates/templates')
      .send({
        code: 'MNR_PRO',
        name: 'Professional',
        nameAr: 'قالب احترافي',
        nameEn: 'Professional Template',
        templateVersion: '1.0.0',
        issuerId: 'issuer-1',
        language: 'BILINGUAL',
        layout: 'LANDSCAPE',
        accentColor: '#075E45',
        secondaryColor: '#C9A227',
        titleAr: 'شهادة معتمدة',
        titleEn: 'CERTIFICATE',
        bodyAr: 'نص شهادة عربي احترافي مكتمل',
        bodyEn: 'Professional certificate body copy.',
        validityPolicy: 'PERMANENT',
      });
    expect(response.status).toBe(201);
    expect(useCases.createTemplate).toHaveBeenCalledOnce();
  });
});
