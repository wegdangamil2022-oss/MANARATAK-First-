import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { CrossDomainReadModelRouter } from '../../../../src/presentation/api/router/CrossDomainReadModelRouter';

describe('CrossDomainReadModelRouter', () => {
  const build = () => ({
    getMajorGraphBySlug: vi.fn(),
    getUniversityGraphBySlug: vi.fn(),
    getScholarshipGraphBySlug: vi.fn(),
    getCountryGraphByIso2Code: vi.fn(),
  });
  const app = (service: ReturnType<typeof build>) => {
    const instance = express();
    instance.use('/public/graph', CrossDomainReadModelRouter.create({ crossDomainGraphReadService: service as any }));
    return instance;
  };

  it('exposes canonical Major graph with bounded pagination', async () => {
    const service = build();
    service.getMajorGraphBySlug.mockResolvedValue({ subject: { ownerId: 'major-1' }, relationships: {} });
    const res = await request(app(service)).get('/public/graph/majors/computer-science?pageSize=50');
    expect(res.status).toBe(200);
    expect(service.getMajorGraphBySlug).toHaveBeenCalledWith('computer-science', { page: 1, pageSize: 50, locale: 'ar' });
  });

  it('exposes country graph by canonical ISO2 reference', async () => {
    const service = build();
    service.getCountryGraphByIso2Code.mockResolvedValue({ subject: { ownerId: 'country-ye', canonicalCode: 'YE' }, relationships: {} });
    const res = await request(app(service)).get('/public/graph/countries/YE');
    expect(res.status).toBe(200);
    expect(service.getCountryGraphByIso2Code).toHaveBeenCalledWith('YE', { page: 1, pageSize: 12, locale: 'ar' });
  });

  it('returns 404 for hidden or missing graph subjects', async () => {
    const service = build();
    service.getScholarshipGraphBySlug.mockRejectedValue(new Error('Scholarship not found'));
    expect((await request(app(service)).get('/public/graph/scholarships/missing')).status).toBe(404);
  });
});
