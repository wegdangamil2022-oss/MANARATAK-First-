import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ImportAdminRouter } from '../../../../src/presentation/api/router/ImportAdminRouter';
import { ImportTargetDomain } from '@manaratak/domain';

describe('ImportAdminRouter', () => {
  beforeEach(() => {
    process.env.WP1_RECOVERY_GATE = 'CLOSED';
    process.env.ALLOW_DATABASE_MUTATIONS = 'YES';
  });

  afterEach(() => {
    delete process.env.WP1_RECOVERY_GATE;
    delete process.env.ALLOW_DATABASE_MUTATIONS;
  });
  const createMockUseCases = () => ({
    importData: vi.fn(),
    getQueueJobStatus: vi.fn(),
    getHandoffReconciliation: vi.fn(),
    pauseQueueJob: vi.fn(),
    resumeQueueJob: vi.fn(),
    cancelQueueJob: vi.fn(),
    replayQueueJob: vi.fn(),
    listBatches: vi.fn(),
    listRecords: vi.fn(),
    previewMajorCatalogText: vi.fn(),
    previewMajorDetailDossierText: vi.fn(),
    previewMajorCatalogFiles: vi.fn(),
    previewMajorDetailDossierFiles: vi.fn(),
    importMajorCatalogText: vi.fn(),
    importMajorDetailDossierText: vi.fn(),
    importMajorCatalogFiles: vi.fn(),
    importMajorDetailDossierFiles: vi.fn()
  });
  
  const createMockRepository = () => ({
    getRecordById: vi.fn(),
    getBatchById: vi.fn(),
    listRecords: vi.fn(),
    updateRecord: vi.fn()
  });

  const createApp = (useCases: any) => {
    const app = express();
    app.use(express.json());
    app.use('/admin/imports', ImportAdminRouter.create({
      importAdminUseCases: useCases,
      majorImportStagingUseCase: useCases,
      assetRecordRepository: {} as any,
      assetStorageGateway: {} as any,
      externalCourseProviderRepository: {} as any,
    }));
    return app;
  };

  describe('Phase 10 major import preview endpoints', () => {
    it('POST /admin/imports/major-catalogs/preview returns parsed catalog preview', async () => {
      const useCases = createMockUseCases();
      useCases.previewMajorCatalogText.mockReturnValue({
        summary: { catalogKind: 'BACHELOR', totalRecords: 1 },
        previewRows: [{ code: 'MJR-0100', canonicalMajorName: 'Computer Science' }]
      });
      const app = createApp(useCases);

      const res = await request(app)
        .post('/admin/imports/major-catalogs/preview')
        .send({
          catalogKind: 'BACHELOR',
          sourceFileName: 'sample.md',
          dataText: '| MJR-0100 | علوم الحاسب | Computer Science |'
        });

      expect(res.status).toBe(200);
      expect(res.body.summary.totalRecords).toBe(1);
      expect(useCases.previewMajorCatalogText).toHaveBeenCalledWith(expect.objectContaining({
        catalogKind: 'BACHELOR',
        sourceFileName: 'sample.md',
      }));
    });

    it('POST /admin/imports/major-detail-dossiers/preview returns parsed detail preview', async () => {
      const useCases = createMockUseCases();
      useCases.previewMajorDetailDossierText.mockReturnValue({
        summary: { catalogKind: 'MASTER', totalRecords: 1, totalContentSections: 2 },
        previewRows: [{ code: 'MAS-0001', contentSectionCount: 2 }]
      });
      const app = createApp(useCases);

      const res = await request(app)
        .post('/admin/imports/major-detail-dossiers/preview')
        .send({
          catalogKind: 'MASTER',
          sourceFileName: 'masters.md',
          dataText: '# 1. علوم البيانات — Data Science\nالكود: MAS-0001\n## النبذة\nنص'
        });

      expect(res.status).toBe(200);
      expect(res.body.summary.totalContentSections).toBe(2);
      expect(useCases.previewMajorDetailDossierText).toHaveBeenCalledWith(expect.objectContaining({
        catalogKind: 'MASTER',
        sourceFileName: 'masters.md',
      }));
    });

    it('POST /admin/imports/major-detail-dossiers/bulk/preview previews multiple files', async () => {
      const useCases = createMockUseCases();
      useCases.previewMajorDetailDossierFiles.mockReturnValue({
        summary: { catalogKind: 'BACHELOR', totalFiles: 2, totalRecords: 20, totalContentSections: 280 },
        files: []
      });
      const app = createApp(useCases);

      const res = await request(app)
        .post('/admin/imports/major-detail-dossiers/bulk/preview')
        .send({
          catalogKind: 'BACHELOR',
          files: [
            { sourceFileName: 'medicine-01.md', dataText: '# 1. A â€” A\nMJR-0001' },
            { sourceFileName: 'medicine-02.md', dataText: '# 2. B â€” B\nMJR-0002' },
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.summary).toMatchObject({ totalFiles: 2, totalRecords: 20 });
      expect(useCases.previewMajorDetailDossierFiles).toHaveBeenCalledWith(expect.objectContaining({
        catalogKind: 'BACHELOR',
        files: expect.arrayContaining([
          expect.objectContaining({ sourceFileName: 'medicine-01.md' }),
          expect.objectContaining({ sourceFileName: 'medicine-02.md' }),
        ]),
      }));
    });

    it('POST /admin/imports/major-detail-dossiers/bulk imports multiple files', async () => {
      const useCases = createMockUseCases();
      useCases.importMajorDetailDossierFiles.mockResolvedValue({
        summary: { catalogKind: 'BACHELOR', totalFiles: 2, totalRecords: 20, stagedRecords: 20 },
        files: [{ batch: { id: 'batch-1' } }, { batch: { id: 'batch-2' } }]
      });
      const app = createApp(useCases);

      const res = await request(app)
        .post('/admin/imports/major-detail-dossiers/bulk')
        .send({
          catalogKind: 'BACHELOR',
          sourceSystem: 'PHASE_10_BULK_DETAILS',
          files: [
            { sourceFileName: 'medicine-01.md', dataText: '# 1. A â€” A\nMJR-0001' },
            { sourceFileName: 'medicine-02.md', dataText: '# 2. B â€” B\nMJR-0002' },
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.summary).toMatchObject({ totalFiles: 2, stagedRecords: 20 });
      expect(useCases.importMajorDetailDossierFiles).toHaveBeenCalledWith(expect.objectContaining({
        catalogKind: 'BACHELOR',
        sourceSystem: 'PHASE_10_BULK_DETAILS',
      }));
    });
  });


  describe('Phase 06 read-only owner handoff reconciliation', () => {
    it('returns a bounded projection without invoking any mutation or replay', async () => {
      const useCases = createMockUseCases();
      useCases.getHandoffReconciliation.mockResolvedValue({
        data: [{
          recordId: 'record-review', batchId: 'batch-review',
          ownerDomain: 'UNIVERSITIES',
          handoffState: 'MANUAL_RECONCILIATION_REQUIRED',
          manualVerificationRequired: true,
        }],
        total: 1, page: 2, pageSize: 10,
      });
      const app = createApp(useCases);
      const result = await request(app)
        .get('/admin/imports/queue/jobs/batch-review/handoffs/reconciliation?page=2&pageSize=10');
      expect(result.status).toBe(200);
      expect(result.body.data[0].handoffState).toBe('MANUAL_RECONCILIATION_REQUIRED');
      expect(useCases.getHandoffReconciliation).toHaveBeenCalledWith({
        batchId: 'batch-review', page: 2, pageSize: 10,
      });
      expect(useCases.replayQueueJob).not.toHaveBeenCalled();
      expect(useCases.resumeQueueJob).not.toHaveBeenCalled();
    });

    it('fails closed with 503 when the operational reader is absent', async () => {
      const useCases = createMockUseCases();
      useCases.getHandoffReconciliation.mockRejectedValue(
        new Error('IMPORT_RECONCILIATION_READER_UNAVAILABLE'),
      );
      const res = await request(createApp(useCases))
        .get('/admin/imports/queue/jobs/batch-review/handoffs/reconciliation');
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'IMPORT_RECONCILIATION_READER_UNAVAILABLE' });
    });
  });

  describe('Phase 06 semantic promotion boundary', () => {
    it('rejects legacy record promotion regardless of database mutation flags', async () => {
      const app = createApp(createMockUseCases());
      const res = await request(app).post('/admin/imports/records/rec-1/promote');

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('PHASE6_DOMAIN_PROMOTION_DISABLED');
      expect(res.body.message).toContain('Semantic promotion belongs to the owning domain');
    });

    it('rejects legacy batch promotion without reading or mutating domain records', async () => {
      const app = createApp(createMockUseCases());
      const res = await request(app).post('/admin/imports/batches/batch-1/promote');

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('PHASE6_DOMAIN_PROMOTION_DISABLED');
    });

    it('rejects transfer compatibility endpoints with the same owning-domain contract', async () => {
      const app = createApp(createMockUseCases());
      const record = await request(app).post('/admin/imports/records/rec-1/transfer');
      const batch = await request(app).post('/admin/imports/batches/batch-1/transfer');

      expect(record.status).toBe(422);
      expect(batch.status).toBe(422);
      expect(record.body.error).toBe('PHASE6_DOMAIN_PROMOTION_DISABLED');
      expect(batch.body.error).toBe('PHASE6_DOMAIN_PROMOTION_DISABLED');
    });
  });

});

describe('verified artifact and source authoring boundaries', () => {
  function setup(authenticated = true) {
    const artifacts = { inspect: vi.fn(async () => ({ assetId: 'a', expectedSha256: '1'.repeat(64) })),
      preflight: vi.fn(async () => ({ validRows: 1 })), stage: vi.fn(async () => ({ batchId: 'batch-1', status: 'QUEUED' })) };
    const sources = { save: vi.fn(async () => ({ sourceId: 's', status: 'DISABLED' })) };
    const app = express(); app.use(express.json());
    if (authenticated) app.use((req, _res, next) => { req.authUserId = 'server-admin'; next(); });
    app.use('/admin/imports', ImportAdminRouter.create({ importAdminUseCases: {} as any, majorImportStagingUseCase: {} as any,
      assetRecordRepository: {} as any, assetStorageGateway: {} as any, externalCourseProviderRepository: {} as any,
      importArtifactUseCase: artifacts as any, importSourceControlUseCases: sources as any }));
    app.use((error: any, _req: any, res: any, _next: any) => res.status(error.message === 'AUTHENTICATED_PRINCIPAL_REQUIRED' ? 401 : 400).json({ error: error.message }));
    return { app, artifacts, sources };
  }
  const body = { assetId: 'a', expectedSha256: '1'.repeat(64), format: 'csv', ownerDomain: 'GENERIC' };
  it('uses the authenticated actor and returns a queued 202 with job location', async () => {
    const { app, artifacts } = setup(); const response = await request(app).post('/admin/imports/artifacts').send(body);
    expect(response.status).toBe(202); expect(response.headers.location).toContain('/queue/jobs/batch-1');
    expect(artifacts.stage).toHaveBeenCalledWith(body, 'server-admin');
  });
  it('denies unauthenticated reads/staging and caller identity/locator injection', async () => {
    const unauthenticated = setup(false);
    expect((await request(unauthenticated.app).post('/admin/imports/artifacts').send(body)).status).toBe(401);
    expect(unauthenticated.artifacts.stage).not.toHaveBeenCalled();
    const { app, artifacts } = setup();
    expect((await request(app).post('/admin/imports/artifacts').send({ ...body, actorId: 'forged' })).status).toBe(400);
    expect((await request(app).post('/admin/imports/artifacts/inspect').send({ assetId: 'a', locator: '/etc/passwd' })).status).toBe(400);
    expect(artifacts.stage).not.toHaveBeenCalled(); expect(artifacts.inspect).not.toHaveBeenCalled();
  });
  it('rejects unsupported advertised formats and forged official source metadata', async () => {
    const { app, artifacts, sources } = setup();
    expect((await request(app).post('/admin/imports/artifacts').send({ ...body, format: 'xlsx' })).status).toBe(400);
    const source = { sourceId: 's', displayName: 'source', baseUrl: 'https://example.org/', category: 'OFFICIAL_API',
      accessClassification: 'PUBLIC_ALLOWED', connectorId: 'api', connectorVersion: '1', rateLimitPerMinute: 20,
      allowedPathPrefixes: ['/'], reason: 'reviewed', metadata: { robotsApproved: true } };
    expect((await request(app).post('/admin/imports/sources').send(source)).status).toBe(400);
    expect(sources.save).not.toHaveBeenCalled(); expect(artifacts.stage).not.toHaveBeenCalled();
  });
});
