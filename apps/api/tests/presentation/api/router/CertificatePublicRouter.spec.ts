import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { CertificateStatus } from '@manaratak/domain';
import { CertificatePublicRouter } from '../../../../src/presentation/api/router/CertificatePublicRouter';

describe('CertificatePublicRouter', () => {
  const createUseCases = () => ({
    verifyPublic: vi.fn(),
  });

  const createApp = (useCases: ReturnType<typeof createUseCases>) => {
    const app = express();
    app.use(express.json());
    app.use('/certificates', CertificatePublicRouter.create({ certificateReadModelService: useCases as any }));
    return app;
  };

  it('verifies a certificate by verification code', async () => {
    const useCases = createUseCases();
    useCases.verifyPublic.mockResolvedValue({
      publicId: 'cert-public-1',
      serialNumber: 'MNR-CERT-1',
      verificationCode: 'MNR-VERIFY',
      status: CertificateStatus.ACTIVE,
      studentReferenceId: 'student-1',
      courseId: 'course-1',
      courseDisplayName: 'Native Course',
      courseCompletedAt: new Date(),
      issuedAt: new Date(),
      isValid: true
    });
    const app = createApp(useCases);

    const res = await request(app).get('/certificates/verify/MNR-VERIFY');

    expect(res.status).toBe(200);
    expect(res.body.isValid).toBe(true);
    expect(useCases.verifyPublic).toHaveBeenCalledWith('MNR-VERIFY');
  });

  it('returns 404 when a certificate cannot be found', async () => {
    const useCases = createUseCases();
    useCases.verifyPublic.mockRejectedValue(new Error('Certificate not found'));
    const app = createApp(useCases);

    const res = await request(app).get('/certificates/verify/UNKNOWN');

    expect(res.status).toBe(404);
  });
});
