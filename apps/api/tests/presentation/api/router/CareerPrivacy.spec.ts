import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { CareerAdminRouter } from '../../../../src/presentation/api/router/CareerAdminRouter';
function fixture(permissions: string[]) {
  const engagement = {
    applicationForReview: vi.fn().mockResolvedValue({ id: 'app', jobId: 'job' }),
    assertCvForReview: vi.fn().mockResolvedValue('cv'),
  };
  const grant = vi.fn().mockResolvedValue({ url: 'https://delivery.example/cv' });
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.authUserId = 'reviewer';
    next();
  });
  app.use(
    '/careers',
    CareerAdminRouter.create({
      careerAdminUseCases: {
        getJob: vi.fn().mockResolvedValue({ id: 'job', employerId: 'employer' }),
      } as never,
      careerEngagementUseCases: engagement as never,
      careerEngagementRepository: {} as never,
      authEvaluatorService: {
        evaluatePermission: async (_actor: string, p: string) => ({
          isGranted: permissions.includes(p),
        }),
      } as never,
      processAssetLifecycleUseCase: { requestDeliveryGrant: grant } as never,
    }),
  );
  return { app, engagement, grant };
}
describe('Career CV permission intersection', () => {
  it.each([[], ['admin:careers:applications:review'], ['admin:careers:applications:pii']].map(permissions => [permissions]))(
    'denies incomplete review/PII capabilities %j',
    async (permissions) => {
      const f = fixture(permissions);
      const res = await request(f.app).post('/careers/applications/app/cv-grant').send({});
      expect(res.status).toBe(403);
      expect(f.grant).not.toHaveBeenCalled();
      expect(f.engagement.assertCvForReview).not.toHaveBeenCalled();
    },
  );
  it('denies absent owner consent without issuing a grant', async () => {
    const f = fixture(['admin:careers:applications:review', 'admin:careers:applications:pii']);
    f.engagement.assertCvForReview.mockRejectedValue(new Error('CAREER_CV_CONSENT_REQUIRED'));
    const res = await request(f.app).post('/careers/applications/app/cv-grant').send({});
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('CAREER_CV_CONSENT_REQUIRED');
    expect(f.grant).not.toHaveBeenCalled();
  });
  it('issues only a short grant for a validated CV with both permissions', async () => {
    const f = fixture(['admin:careers:applications:review', 'admin:careers:applications:pii']);
    const res = await request(f.app).post('/careers/applications/app/cv-grant').send({});
    expect(res.status).toBe(200);
    expect(f.grant).toHaveBeenCalledWith({ assetId: 'cv', expiresInSeconds: 120 });
  });
});
