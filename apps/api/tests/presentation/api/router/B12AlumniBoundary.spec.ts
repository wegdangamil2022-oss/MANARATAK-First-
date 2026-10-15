import express from 'express';
import request from 'supertest';
import {describe, expect, it, vi} from 'vitest';
import {CareerAdminRouter} from '../../../../src/presentation/api/router/CareerAdminRouter';
import {careerStudentRouter} from '../../../../src/presentation/api/router/CareerStudentRouter';

describe('B12 alumni HTTP privacy boundary', () => {
  it.each([false, true])('requires alumni read permission (granted=%s)', async granted => {
    const listAdminAlumni = vi.fn().mockResolvedValue({data: []});
    const app = express();
    app.use((req: any, _res, next) => {req.authUserId = 'reviewer'; next();});
    app.use('/careers', CareerAdminRouter.create({
      careerAdminUseCases: {} as never,
      careerEngagementUseCases: {} as never,
      careerEngagementRepository: {listAdminAlumni} as never,
      processAssetLifecycleUseCase: {} as never,
      authEvaluatorService: {evaluatePermission: vi.fn(async () => ({isGranted: granted}))} as never,
    }));
    const response = await request(app).get('/careers/alumni');
    expect(response.status).toBe(granted ? 200 : 403);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(listAdminAlumni).toHaveBeenCalledTimes(granted ? 1 : 0);
    expect((await request(app).put('/careers/alumni')).status).toBe(404);
  });

  it('reads only the authenticated student profile without caching consent', async () => {
    const getMyAlumni = vi.fn().mockResolvedValue(null);
    const app = express();
    app.use((req: any, _res, next) => {req.authUserId = 'owner'; next();});
    app.use('/careers', careerStudentRouter({getMyAlumni} as never));
    const response = await request(app).get('/careers/alumni?studentReferenceId=other');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(getMyAlumni).toHaveBeenCalledWith('owner');
  });
});
