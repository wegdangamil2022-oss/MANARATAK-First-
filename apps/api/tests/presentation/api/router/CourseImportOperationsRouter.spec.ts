import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { ImportAdminUseCases } from '@manaratak/application';
import type {
  IImportedCourseLinkChecker,
  IImportedCourseOperationsRepository,
} from '@manaratak/domain';
import { PrismaImportRepository } from '@manaratak/infrastructure';
import { CourseImportOperationsRouter } from '../../../../src/presentation/api/router/CourseImportOperationsRouter';

function fixture() {
  const operations = {
    overview: vi.fn().mockResolvedValue({ providersTotal: 18, providersApproved: 18 }),
    listBatches: vi.fn().mockResolvedValue([{ id: 'batch-1', dataType: 'COURSES' }]),
    getBatch: vi.fn().mockResolvedValue({ id: 'batch-1', dataType: 'COURSES' }),
    listBatchRecords: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 50 }),
    reviewQueue: vi
      .fn()
      .mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }),
    analyzeBatch: vi.fn().mockResolvedValue({ batchId: 'batch-1', analyzed: 2 }),
    transferBatch: vi.fn().mockResolvedValue({ batchId: 'batch-1', attempted: 1, transferred: 1 }),
  };
  const artifact = {
    preflight: vi.fn().mockResolvedValue({ valid: true, summary: { rowsFound: 2 } }),
    stage: vi.fn().mockResolvedValue({
      duplicateArtifact: false,
      staging: { batch: { id: 'batch-1' } },
      preflight: { valid: true },
    }),
  };
  const providers = {
    list: vi
      .fn()
      .mockResolvedValue([{ id: 'provider-1', displayName: 'Provider', status: 'APPROVED' }]),
    findById: vi.fn().mockResolvedValue({ id: 'provider-1' }),
    findByPublicId: vi.fn(),
  };
  const importedCourseOperationsRepository: IImportedCourseOperationsRepository = {
    listImportedCourses: vi.fn(),
    getImportedCourseById: vi.fn(),
    getOverview: vi.fn(),
    getVerificationContext: vi.fn(),
    recordLinkCheck: vi.fn(),
    getImportOperationsOverview: vi.fn(),
    listCourseBatches: vi.fn(),
    listProviderCourseBatches: vi.fn(),
    getCourseBatchById: vi.fn(),
    listReviewQueue: vi.fn(),
    listProviderReviewQueue: vi.fn(),
    getProviderReviewSummary: vi.fn(),
  };
  const importedCourseLinkChecker: IImportedCourseLinkChecker = { check: vi.fn() };
  const importAdminUseCases = new ImportAdminUseCases(
    new PrismaImportRepository(undefined, 'DEVELOPMENT_ONLY'),
  );
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authUserId = 'admin-1';
    next();
  });
  app.use(
    '/admin/imports/courses',
    CourseImportOperationsRouter.create({
      courseImportOperationsUseCases: operations as any,
      courseImportArtifactUseCase: artifact as any,
      externalCourseProviderRepository: providers as any,
      importedCourseOperationsRepository,
      importedCourseLinkChecker,
      importAdminUseCases,
    }),
  );
  return { app, operations, artifact, providers };
}

describe('CourseImportOperationsRouter', () => {
  it('returns DB-backed overview and provider registry', async () => {
    const f = fixture();
    const overview = await request(f.app).get('/admin/imports/courses/overview');
    const providers = await request(f.app).get('/admin/imports/courses/providers');
    expect(overview.status).toBe(200);
    expect(overview.body.providersTotal).toBe(18);
    expect(providers.status).toBe(200);
    expect(f.providers.list).toHaveBeenCalled();
  });

  it('preflights and stages via the existing artifact flow, then runs WP-IC-04 analysis', async () => {
    const f = fixture();
    const body = { assetId: 'asset-1' };
    expect((await request(f.app).post('/admin/imports/courses/preflight').send(body)).status).toBe(
      200,
    );

    const staged = await request(f.app).post('/admin/imports/courses/batches').send(body);
    expect(staged.status).toBe(201);
    expect(f.artifact.stage).toHaveBeenCalledWith(expect.objectContaining({ assetId: 'asset-1' }));
    expect(f.operations.analyzeBatch).toHaveBeenCalledWith('batch-1');
  });

  it('exposes batch history before the dynamic batch detail route', async () => {
    const f = fixture();
    const res = await request(f.app).get('/admin/imports/courses/batches');
    expect(res.status).toBe(200);
    expect(f.operations.listBatches).toHaveBeenCalled();
  });

  it('transfers through the controlled batch use case', async () => {
    const f = fixture();
    const res = await request(f.app)
      .post('/admin/imports/courses/batches/batch-1/transfer')
      .send({ limit: 50 });
    expect(res.status).toBe(200);
    expect(f.operations.transferBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        batchId: 'batch-1',
        actorId: 'admin-1',
        limit: 50,
      }),
    );
  });
});
