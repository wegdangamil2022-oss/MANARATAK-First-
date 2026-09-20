import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ScholarshipAdminRouter } from '../../../../src/presentation/api/router/ScholarshipAdminRouter';
import { ScholarshipStatus } from '@manaratak/domain';

describe('ScholarshipAdminRouter', () => {
  const createMockUseCases = () => ({
    listScholarships: vi.fn(),
    getScholarshipSummary: vi.fn(),
    getScholarship: vi.fn(),
    updateScholarship: vi.fn(),
    markReadyToReview: vi.fn(),
    markReadyToPublish: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
    reject: vi.fn(),
    archive: vi.fn(),
  });

  it('forwards the complete canonical admin filter contract', async () => {
    const useCases = createMockUseCases();
    useCases.listScholarships.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    const res = await request(createApp(useCases)).get('/admin/scholarships?countryReferenceId=country-sa&degreeLevelId=degree-bachelor&majorId=major-cs&internationalTestId=test-ielts&universityId=university-1&academicProgramId=program-1&fundingCoverage=FULL&sponsorName=Ministry&verificationStatus=VERIFIED&translationState=NEEDS_TRANSLATION&sourceType=OFFICIAL&query=engineering&deadlineTo=2027-01-01T00:00:00.000Z');
    expect(res.status).toBe(200);
    expect(useCases.listScholarships).toHaveBeenCalledWith(expect.objectContaining({
      countryReferenceId: 'country-sa', degreeLevelId: 'degree-bachelor', majorId: 'major-cs', internationalTestId: 'test-ielts', universityId: 'university-1', academicProgramId: 'program-1', fundingCoverage: 'FULL', sponsorName: 'Ministry',
      verificationStatus: 'VERIFIED', translationState: 'NEEDS_TRANSLATION', sourceType: 'OFFICIAL', query: 'engineering',
      deadlineTo: new Date('2027-01-01T00:00:00.000Z'),
    }));
  });

  it('returns server-derived summary counters without a bounded catalog fetch', async () => {
    const useCases = createMockUseCases();
    useCases.getScholarshipSummary.mockResolvedValue({ all: 503, published: 155 });
    const res = await request(createApp(useCases)).get('/admin/scholarships/summary');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ all: 503, published: 155 });
    expect(useCases.listScholarships).not.toHaveBeenCalled();
  });

  const createApp = (useCases: any) => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.authUserId = 'admin-X';
      next();
    });
    app.use(
      '/admin/scholarships',
      ScholarshipAdminRouter.create({ adminScholarshipUseCases: useCases as any }),
    );
    return app;
  };

  it('GET /admin/scholarships calls listScholarships with parsed filters', async () => {
    const useCases = createMockUseCases();
    useCases.listScholarships.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
    const app = createApp(useCases);

    const res = await request(app).get(
      '/admin/scholarships?status=READY_TO_REVIEW&countryReferenceId=country-sa&page=2',
    );

    expect(res.status).toBe(200);
    expect(useCases.listScholarships).toHaveBeenCalledWith({
      status: ScholarshipStatus.READY_TO_REVIEW,
      countryReferenceId: 'country-sa',
      page: 2,
      pageSize: 20,
    });
  });


  it('rejects legacy country/degree text filters', async () => {
    const useCases = createMockUseCases();
    const res = await request(createApp(useCases)).get('/admin/scholarships?country=Saudi%20Arabia&degreeLevel=Bachelor');
    expect(res.status).toBe(400);
    expect(useCases.listScholarships).not.toHaveBeenCalled();
  });

  it('PATCH /admin/scholarships/:id validates body and calls updateScholarship', async () => {
    const useCases = createMockUseCases();
    useCases.updateScholarship.mockResolvedValue({ id: 'schol-1' });
    const app = createApp(useCases);

    const res = await request(app)
      .patch('/admin/scholarships/schol-1')
      .send({ displayName: 'New Name' });

    expect(res.status).toBe(200);
    expect(useCases.updateScholarship).toHaveBeenCalledWith(
      'schol-1',
      expect.objectContaining({
        displayName: 'New Name',
      }),
      expect.objectContaining({ actorId: 'admin-X', source: 'admin-scholarship-api' }),
    );
  });

  it('PATCH /admin/scholarships/:id strips readonly fields', async () => {
    const useCases = createMockUseCases();
    useCases.updateScholarship.mockResolvedValue({ id: 'schol-1' });
    const app = createApp(useCases);

    await request(app)
      .patch('/admin/scholarships/schol-1')
      .send({ id: 'injected-id', publicId: 'injected-pub', displayName: 'New Name' });

    expect(useCases.updateScholarship).toHaveBeenCalledWith(
      'schol-1',
      expect.not.objectContaining({
        id: 'injected-id',
        publicId: 'injected-pub',
      }),
      expect.any(Object),
    );
  });

  it('POST /admin/scholarships/:id/publish calls publish', async () => {
    const useCases = createMockUseCases();
    useCases.publish.mockResolvedValue(undefined);
    const app = createApp(useCases);

    const res = await request(app).post('/admin/scholarships/schol-1/publish');

    expect(res.status).toBe(200);
    expect(useCases.publish).toHaveBeenCalledWith(
      'schol-1',
      expect.objectContaining({ actorId: 'admin-X', source: 'admin-scholarship-api' }),
    );
  });

  it('returns 400 on use case error', async () => {
    const useCases = createMockUseCases();
    useCases.publish.mockRejectedValue(new Error('Only READY_TO_PUBLISH'));
    const app = createApp(useCases);

    const res = await request(app).post('/admin/scholarships/schol-1/publish');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Only READY_TO_PUBLISH' });
  });
});
