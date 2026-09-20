import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ScholarshipPublicRouter } from '../../../../src/presentation/api/router/ScholarshipPublicRouter';

describe('ScholarshipPublicRouter', () => {
  const createMockUseCases = () => ({
    listScholarships: vi.fn(),
    getScholarship: vi.fn(),
  });

  const createApp = (useCases: any) => {
    const app = express();
    app.use(express.json());
    app.use('/public/scholarships', ScholarshipPublicRouter.create({ publicScholarshipUseCases: useCases as any }));
    return app;
  };

  it('GET /public/scholarships calls listScholarships with parsed filters', async () => {
    const useCases = createMockUseCases();
    useCases.listScholarships.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    const app = createApp(useCases);

    const res = await request(app).get('/public/scholarships?countryReferenceId=country-us&degreeLevelId=degree-bachelor&majorId=major-cs&universityId=university-1&academicProgramId=program-1&internationalTestId=test-ielts&limit=50');
    
    expect(res.status).toBe(200);
    // Page size should be bounded to 50
    expect(useCases.listScholarships).toHaveBeenCalledWith({
      countryReferenceId: 'country-us',
      degreeLevelId: 'degree-bachelor',
      majorId: 'major-cs',
      universityId: 'university-1',
      academicProgramId: 'program-1',
      internationalTestId: 'test-ielts',
      limit: 50
    }, 'ar');
  });


  it('rejects legacy name-based relationship filters', async () => {
    const useCases = createMockUseCases();
    const app = createApp(useCases);
    const res = await request(app).get('/public/scholarships?studyCountry=USA&degreeLevel=Bachelor');
    expect(res.status).toBe(400);
    expect(useCases.listScholarships).not.toHaveBeenCalled();
  });
  it('GET /public/scholarships/:slug returns scholarship', async () => {
    const useCases = createMockUseCases();
    useCases.getScholarship.mockResolvedValue({ slug: 'test-slug', displayName: 'Test' });
    const app = createApp(useCases);

    const res = await request(app).get('/public/scholarships/test-slug');
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ slug: 'test-slug', displayName: 'Test' });
    expect(useCases.getScholarship).toHaveBeenCalledWith('test-slug', 'ar');
  });

  it('GET /public/scholarships/:slug returns 404 if not found', async () => {
    const useCases = createMockUseCases();
    useCases.getScholarship.mockRejectedValue(new Error('Scholarship not found'));
    const app = createApp(useCases);

    const res = await request(app).get('/public/scholarships/test-slug');
    
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('returns 500 on unexpected error', async () => {
    const useCases = createMockUseCases();
    useCases.getScholarship.mockRejectedValue(new Error('Database error'));
    const app = createApp(useCases);

    const res = await request(app).get('/public/scholarships/test-slug');
    
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal Server Error' });
  });
  it('forwards the requested public locale and removes it from domain filters', async () => {
    const useCases = createMockUseCases();
    useCases.listScholarships.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    const res = await request(createApp(useCases)).get('/public/scholarships?locale=en&limit=20');

    expect(res.status).toBe(200);
    expect(useCases.listScholarships).toHaveBeenCalledWith({ limit: 20 }, 'en');
  });

  it('rejects unsupported locales with the shared locale contract', async () => {
    const useCases = createMockUseCases();
    const res = await request(createApp(useCases)).get('/public/scholarships?locale=fr');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNSUPPORTED_LOCALE');
  });

});
