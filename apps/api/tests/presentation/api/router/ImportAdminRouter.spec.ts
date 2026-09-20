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
