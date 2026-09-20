import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { UniversityStatus } from '@manaratak/domain';
import { UniversityAdminRouter } from '../../../../src/presentation/api/router/UniversityAdminRouter';

describe('UniversityAdminRouter', () => {
  const createMockUseCases = () => ({
    listUniversities: vi.fn(),
    listOrganizationUnits: vi.fn(),
    getUniversity: vi.fn(),
    updateUniversity: vi.fn(),
    replaceNormalizedDetails: vi.fn(),
    checkPublicationReadiness: vi.fn(),
    markReadyToReview: vi.fn(),
    markReadyToPublish: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
    reject: vi.fn(),
    archive: vi.fn(),
  });

  const createApp = (useCases: ReturnType<typeof createMockUseCases>) => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.authUserId = 'admin-X';
      next();
    });
    app.use(
      '/admin/universities',
      UniversityAdminRouter.create({ adminUniversityUseCases: useCases as any }),
    );
    return app;
  };

  it('GET /admin/universities calls listUniversities with parsed filters', async () => {
    const useCases = createMockUseCases();
    useCases.listUniversities.mockResolvedValue({
      data: [],
      total: 0,
      page: 2,
      pageSize: 20,
      totalPages: 0,
    });
    const app = createApp(useCases);

    const res = await request(app).get(
      '/admin/universities?status=READY_TO_REVIEW&countryReferenceId=country-qa&page=2',
    );

    expect(res.status).toBe(200);
    expect(useCases.listUniversities).toHaveBeenCalledWith({
      status: UniversityStatus.READY_TO_REVIEW,
      countryReferenceId: 'country-qa',
      page: 2,
      pageSize: 50,
    });
  });


  it('GET /admin/universities/organization-units lists existing faculties/colleges without creating a second admin section', async () => {
    const useCases = createMockUseCases();
    useCases.listOrganizationUnits.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 });
    const app = createApp(useCases);

    const res = await request(app).get('/admin/universities/organization-units?unitType=FACULTY&search=Engineering');

    expect(res.status).toBe(200);
    expect(useCases.listOrganizationUnits).toHaveBeenCalledWith({
      unitType: 'FACULTY', search: 'Engineering', page: 1, pageSize: 50,
    });
    expect(useCases.getUniversity).not.toHaveBeenCalledWith('organization-units');
  });

  it('PATCH /admin/universities/:id validates body and strips readonly fields', async () => {
    const useCases = createMockUseCases();
    useCases.updateUniversity.mockResolvedValue({ id: 'uni-1' });
    const app = createApp(useCases);

    const res = await request(app).patch('/admin/universities/uni-1').send({
      id: 'injected',
      publicId: 'injected-public',
      displayName: 'Updated Qatar University',
      officialWebsite: 'https://www.qu.edu.qa',
    });

    expect(res.status).toBe(200);
    expect(useCases.updateUniversity).toHaveBeenCalledWith(
      'uni-1',
      expect.objectContaining({
        displayName: 'Updated Qatar University',
        officialWebsite: 'https://www.qu.edu.qa',
      }),
      expect.objectContaining({ actorId: 'admin-X', source: 'admin-university-api' }),
    );
    expect(useCases.updateUniversity).toHaveBeenCalledWith(
      'uni-1',
      expect.not.objectContaining({
        id: 'injected',
        publicId: 'injected-public',
      }),
      expect.any(Object),
    );
  });

  it('POST /admin/universities/:id/publish calls publish', async () => {
    const useCases = createMockUseCases();
    useCases.publish.mockResolvedValue(undefined);
    const app = createApp(useCases);

    const res = await request(app).post('/admin/universities/uni-1/publish');

    expect(res.status).toBe(200);
    expect(useCases.publish).toHaveBeenCalledWith(
      'uni-1',
      expect.objectContaining({ actorId: 'admin-X', source: 'admin-university-api' }),
    );
  });

  it('PUT /admin/universities/:id/normalized-details validates canonical relationships', async () => {
    const useCases = createMockUseCases();
    useCases.replaceNormalizedDetails.mockResolvedValue({ id: 'uni-1', academicPrograms: [] });
    const app = createApp(useCases);

    const details = {
      campuses: [{ sourceReferenceId: 'CAMPUS-1', name: 'Main Campus' }],
      organizationUnits: [
        { sourceReferenceId: 'FAC-1', unitType: 'FACULTY', name: 'Faculty of Engineering' },
      ],
      academicPrograms: [
        {
          sourceReferenceId: 'PROGRAM-1',
          organizationUnitSourceReferenceId: 'FAC-1',
          sourceProgramName: 'Computer Science',
          degreeLevelId: 'degree-bachelor',
          majorId: 'major-cs',
          majorMappingState: 'CANONICALLY_MAPPED',
          campusSourceReferenceIds: ['CAMPUS-1'],
          admissionRequirements: [{ internationalTestId: 'test-ielts', minimumScore: 6.5 }],
        },
      ],
    };
    const res = await request(app)
      .put('/admin/universities/uni-1/normalized-details')
      .send(details);

    expect(res.status).toBe(200);
    expect(useCases.replaceNormalizedDetails).toHaveBeenCalledWith(
      'uni-1',
      details,
      expect.objectContaining({ actorId: 'admin-X', source: 'admin-university-api' }),
    );
  });

  it('returns 400 on use case errors', async () => {
    const useCases = createMockUseCases();
    useCases.publish.mockRejectedValue(
      new Error('Only READY_TO_PUBLISH universities can be PUBLISHED'),
    );
    const app = createApp(useCases);

    const res = await request(app).post('/admin/universities/uni-1/publish');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Only READY_TO_PUBLISH universities can be PUBLISHED' });
  });
});
