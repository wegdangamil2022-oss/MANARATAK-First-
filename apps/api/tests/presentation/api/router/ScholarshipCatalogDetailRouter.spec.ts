import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ScholarshipAdminRouter } from '../../../../src/presentation/api/router/ScholarshipAdminRouter';

describe('WP12-9 ScholarshipAdminRouter normalized catalog detail', () => {
  function setup() {
    const adminScholarshipUseCases = {
      getScholarshipCatalogDetail: vi.fn(async () => ({
        scholarship: { id: 'sch-1', displayName: 'Sample' },
        completeness: { state: 'COMPLETE', missingFields: [] },
        unresolvedLinks: [],
      })),
      updateScholarship: vi.fn(async (_id, updates) => ({ id: 'sch-1', ...updates })),
    };
    const manageAuditRecordsUseCase = {
      queryAuditPage: vi.fn(async () => ({ items: [], hasMore: true })),
    };
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.authUserId = 'admin-X';
      next();
    });
    app.use(
      '/admin/scholarships',
      ScholarshipAdminRouter.create({
        adminScholarshipUseCases: adminScholarshipUseCases as any,
        manageAuditRecordsUseCase: manageAuditRecordsUseCase as any,
      }),
    );
    return { app, adminScholarshipUseCases, manageAuditRecordsUseCase };
  }

  it('returns normalized catalog detail plus real audit history projection', async () => {
    const env = setup();
    const response = await request(env.app).get('/admin/scholarships/sch-1/catalog-detail');
    expect(response.status).toBe(200);
    expect(response.body.scholarship.id).toBe('sch-1');
    expect(response.body.historyAvailable).toBe(true);
    expect(response.body.historyHasMore).toBe(true);
    expect(response.body.historyLimit).toBe(50);
    expect(env.manageAuditRecordsUseCase.queryAuditPage).toHaveBeenCalledWith({
      targetId: 'sch-1',
      category: 'SCHOLARSHIPS_MUTATION',
      limit: 50,
    });
  });

  it('passes normalized nested structures directly instead of repacking optionalFields', async () => {
    const env = setup();
    const response = await request(env.app)
      .patch('/admin/scholarships/sch-1').set('If-Match', '1').set('X-Review-Reason', 'Reviewed official source')
      .send({
        displayName: 'Updated',
        fundingTypeCode: 'FULLY_FUNDED',
        benefits: [{ benefitKey: 'b1', benefitTypeCode: 'TUITION' }],
        degreeTargets: [
          {
            targetKey: 'd1',
            sourceLabel: 'Bachelor',
            degreeLevelId: 'injected-degree',
            resolutionStatus: 'RESOLVED',
          },
        ],
        requiredDocumentItems: [
          {
            documentKey: 'doc1',
            displayName: 'Transcript',
            internationalTestId: 'injected-test',
            resolutionStatus: 'RESOLVED',
            isRequired: true,
          },
        ],
      });
    expect(response.status).toBe(200);
    expect(env.adminScholarshipUseCases.updateScholarship).toHaveBeenCalledWith(
      'sch-1',
      expect.objectContaining({
        fundingTypeCode: 'FULLY_FUNDED',
        benefits: [{ benefitKey: 'b1', benefitTypeCode: 'TUITION' }],
        degreeTargets: [{ targetKey: 'd1', sourceLabel: 'Bachelor' }],
        requiredDocumentItems: [
          { documentKey: 'doc1', displayName: 'Transcript', isRequired: true },
        ],
      }),
      expect.any(Object),
    );
    const updates = env.adminScholarshipUseCases.updateScholarship.mock.calls[0][1];
    expect(updates.optionalFields).toBeUndefined();
  });

  it('strips lifecycle and immutable fields from generic PATCH', async () => {
    const env = setup();
    await request(env.app).patch('/admin/scholarships/sch-1').set('If-Match', '1').set('X-Review-Reason', 'Reviewed official source').send({
      id: 'bad',
      publicId: 'bad-public',
      status: 'PUBLISHED',
      publicationStatus: 'PUBLISHED',
      canonicalDedupKey: 'bad-key',
      displayName: 'Safe',
    });
    const updates = env.adminScholarshipUseCases.updateScholarship.mock.calls[0][1];
    expect(updates).toEqual(expect.objectContaining({ displayName: 'Safe' }));
    expect(updates.id).toBeUndefined();
    expect(updates.publicId).toBeUndefined();
    expect(updates.status).toBeUndefined();
    expect(updates.publicationStatus).toBeUndefined();
    expect(updates.canonicalDedupKey).toBeUndefined();
  });
});
