import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { MajorAdminRouter } from '../../../../src/presentation/api/router/MajorAdminRouter';

describe('Major translation workspace route', () => {
  it('updates normalized Arabic/English names on the same canonical major id', async () => {
    const updateMajor = vi.fn().mockResolvedValue({
      id: 'major-1',
      publicId: 'MJR-0001',
      localizedNameAr: 'علوم الحاسوب',
      localizedNameEn: 'Computer Science',
    });
    const useCases = { updateMajor } as any;
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.authUserId = 'admin-X';
      next();
    });
    app.use('/admin/majors', MajorAdminRouter.create({ adminMajorUseCases: useCases }));

    const response = await request(app).patch('/admin/majors/major-1').send({
      localizedNameAr: 'علوم الحاسوب',
      localizedNameEn: 'Computer Science',
      id: 'different-id',
      publicId: 'MJR-9999',
    });

    expect(response.status).toBe(200);
    expect(updateMajor).toHaveBeenCalledTimes(1);
    const [id, updates] = updateMajor.mock.calls[0];
    expect(id).toBe('major-1');
    expect(updates).toMatchObject({
      localizedNameAr: 'علوم الحاسوب',
      localizedNameEn: 'Computer Science',
    });
    expect(updates).not.toHaveProperty('id');
    expect(updates).not.toHaveProperty('publicId');
  });
});
