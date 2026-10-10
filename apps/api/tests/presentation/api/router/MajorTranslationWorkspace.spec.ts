import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { MajorAdminRouter } from '../../../../src/presentation/api/router/MajorAdminRouter';

describe('Major translation workspace route', () => {
  it('rejects localized-name and identity writes through the generic authoring endpoint', async () => {
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

    const response = await request(app).patch('/admin/majors/major-1').set('If-Match', '1').set('X-Review-Reason', 'Reviewed official source').send({
      localizedNameAr: 'علوم الحاسوب',
      localizedNameEn: 'Computer Science',
      id: 'different-id',
      publicId: 'MJR-9999',
    });

    expect(response.status).toBe(400);
    expect(updateMajor).not.toHaveBeenCalled();
  });
});
