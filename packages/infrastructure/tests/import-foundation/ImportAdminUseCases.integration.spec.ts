import { describe, it, expect, beforeEach } from 'vitest';
import { ImportAdminUseCases, MajorImportStagingUseCase } from '@manaratak/application';
import { InMemoryImportQueueGateway } from '@manaratak/infrastructure';
import { ImportTargetDomain } from '@manaratak/domain';

describe('ImportAdminUseCases - Queue Status Integration', () => {
  let mockImportRepo: any;
  let queueGateway: InMemoryImportQueueGateway;
  let useCasesWithQueue: ImportAdminUseCases;
  let useCasesWithoutQueue: ImportAdminUseCases;

  beforeEach(() => {
    mockImportRepo = {
      createBatch: async (data: any) => ({ id: 'batch-123', ...data }),
      createRecord: async (data: any) => ({ id: 'rec-1', ...data }),
      updateBatchStats: async (id: string, stats: any) => ({ id, ...stats }),
      listBatches: async () => [],
      listRecords: async () => [],
    };
    queueGateway = new InMemoryImportQueueGateway();
    useCasesWithQueue = new ImportAdminUseCases(mockImportRepo, queueGateway);
    useCasesWithoutQueue = new ImportAdminUseCases(mockImportRepo);
  });

  it('returns null when no importQueueGateway is provided', async () => {
    const status = await useCasesWithoutQueue.getQueueJobStatus('batch-999');
    expect(status).toBeNull();
  });

  it('returns queue job status when importQueueGateway is present', async () => {
    const batchId = 'batch-test-queue-1';
    await queueGateway.enqueueImportJob({
      batchId,
      targetDomain: ImportTargetDomain.UNIVERSITIES,
      sourceSystem: 'ADMIN_CONSOLE',
    });

    const status = await useCasesWithQueue.getQueueJobStatus(batchId);
    expect(status).not.toBeNull();
    expect(status?.batchId).toBe(batchId);
    expect(status?.status).toBe('QUEUED');
    expect(status?.progress).toBe(0);
  });

  it('returns null for non-existent batchId in queue', async () => {
    const status = await useCasesWithQueue.getQueueJobStatus('batch-non-existent');
    expect(status).toBeNull();
  });

  describe('Queue Control Actions', () => {
    it('returns false for pause/resume/cancel/replay when gateway is missing', async () => {
      const batchId = 'batch-no-gateway';
      expect(await useCasesWithoutQueue.pauseQueueJob(batchId, 'pause')).toBe(false);
      expect(await useCasesWithoutQueue.resumeQueueJob(batchId)).toBe(false);
      expect(await useCasesWithoutQueue.cancelQueueJob(batchId, 'cancel')).toBe(false);
      expect(await useCasesWithoutQueue.replayQueueJob(batchId, false)).toBe(false);
    });

    it('delegates pause, resume, cancel, and replay when gateway exists', async () => {
      const batchId = 'batch-control-flow';
      await queueGateway.enqueueImportJob({
        batchId,
        targetDomain: ImportTargetDomain.COURSES,
        sourceSystem: 'ADMIN_PORTAL',
      });

      // Pause QUEUED job
      const paused = await useCasesWithQueue.pauseQueueJob(batchId, 'Maintenance pause');
      expect(paused).toBe(true);
      let status = await useCasesWithQueue.getQueueJobStatus(batchId);
      expect(status?.status).toBe('PAUSED');
      expect(status?.lastError).toBe('Maintenance pause');

      // Resume PAUSED job
      const resumed = await useCasesWithQueue.resumeQueueJob(batchId);
      expect(resumed).toBe(true);
      status = await useCasesWithQueue.getQueueJobStatus(batchId);
      expect(status?.status).toBe('QUEUED');

      // Cancel QUEUED job
      const cancelled = await useCasesWithQueue.cancelQueueJob(batchId, 'User cancelled');
      expect(cancelled).toBe(true);
      status = await useCasesWithQueue.getQueueJobStatus(batchId);
      expect(status?.status).toBe('CANCELLED');

      // Replay CANCELLED job
      const replayed = await useCasesWithQueue.replayQueueJob(batchId, false);
      expect(replayed).toBe(true);
      status = await useCasesWithQueue.getQueueJobStatus(batchId);
      expect(status?.status).toBe('QUEUED');
    });

    it('returns false for invalid status transitions via queue control methods', async () => {
      const batchId = 'batch-invalid-transitions';
      await queueGateway.enqueueImportJob({
        batchId,
        targetDomain: ImportTargetDomain.MAJORS,
        sourceSystem: 'ADMIN_PORTAL',
      });

      // Resume on QUEUED job is invalid
      expect(await useCasesWithQueue.resumeQueueJob(batchId)).toBe(false);

      // Replay on QUEUED job is invalid
      expect(await useCasesWithQueue.replayQueueJob(batchId)).toBe(false);

      // Cancel non-existent job is false
      expect(await useCasesWithQueue.cancelQueueJob('non-existent')).toBe(false);
    });
  });

  describe('ImportData - Bulk Chunking', () => {
    it('chunks large inline imports into bulkCreateRecords up to 500 records per chunk', async () => {
      let bulkCreateCount = 0;
      let totalCreatedRecords = 0;
      
      const bulkMockRepo = {
        ...mockImportRepo,
        bulkCreateRecords: async (records: any[]) => {
          bulkCreateCount++;
          totalCreatedRecords += records.length;
          return { count: records.length };
        }
      };
      
      const useCase = new ImportAdminUseCases(bulkMockRepo);
      
      // Create a CSV string with 1200 rows.
      const rowCount = 1200;
      let csvData = 'id,name\n';
      for (let i = 0; i < rowCount; i++) {
        csvData += `${i},Name ${i}\n`;
      }
      
      const result = await useCase.importData({
        dataText: csvData,
        dataType: ImportTargetDomain.UNIVERSITIES
      });
      
      expect(bulkCreateCount).toBe(3); // 500 + 500 + 200
      expect(totalCreatedRecords).toBe(1200);
      
      expect(result.summary.totalRecords).toBe(1200);
      expect(result.summary.stagedRecords).toBe(1200);
      expect(result.summary.skippedDuplicates).toBe(0);
      expect(result.records.length).toBe(100); // capped at 100
    });
  });

  describe('Phase 10 major import previews', () => {
    it('previews a major catalog without creating import batches', () => {
      let createdBatch = false;
      const previewRepo = {
        ...mockImportRepo,
        createBatch: async (data: any) => {
          createdBatch = true;
          return { id: 'batch-preview-should-not-exist', ...data };
        },
      };
      const useCase = new MajorImportStagingUseCase(new ImportAdminUseCases(previewRepo));

      const result = useCase.previewMajorCatalogText({
        catalogKind: 'BACHELOR',
        sourceFileName: 'sample.md',
        dataText: [
          '# القائمة الكاملة حسب الكليات',
          '## كلية الحاسب',
          '| MJR-0100 | علوم الحاسب | Computer Science |',
        ].join('\n'),
      });

      expect(createdBatch).toBe(false);
      expect(result.summary).toMatchObject({
        catalogKind: 'BACHELOR',
        totalRecords: 1,
        importMode: 'CATALOG_IDENTITY_ONLY',
        sourceFileName: 'sample.md',
      });
      expect(result.summary.duplicatePolicy).toContain('owning Major domain');
      expect(result.previewRows[0]).toMatchObject({
        code: 'MJR-0100',
        canonicalMajorName: 'Computer Science',
        degreeLevel: 'Bachelor',
      });
    });

    it('previews detail dossiers with extracted content section counts', () => {
      const useCase = new MajorImportStagingUseCase(new ImportAdminUseCases(mockImportRepo));

      const result = useCase.previewMajorDetailDossierText({
        catalogKind: 'MASTER',
        sourceFileName: 'masters.md',
        dataText: [
          '# 1. علوم البيانات — Data Science',
          'الكود: MAS-0001',
          '## النبذة',
          'تفاصيل مختصرة.',
          '## البحث أو المشروع',
          'مشروع تطبيقي.',
        ].join('\n'),
      });

      expect(result.summary).toMatchObject({
        catalogKind: 'MASTER',
        totalRecords: 1,
        totalContentSections: 2,
        importMode: 'DETAIL_DOSSIER',
      });
      expect(result.previewRows[0]).toMatchObject({
        code: 'MAS-0001',
        canonicalMajorName: 'Data Science',
        degreeLevel: 'Master',
        contentSectionCount: 2,
      });
    });

    it('previews multiple major detail dossier files without creating import batches', () => {
      let createdBatch = false;
      const previewRepo = {
        ...mockImportRepo,
        createBatch: async (data: any) => {
          createdBatch = true;
          return { id: 'batch-preview-should-not-exist', ...data };
        },
      };
      const useCase = new MajorImportStagingUseCase(new ImportAdminUseCases(previewRepo));

      const result = useCase.previewMajorDetailDossierFiles({
        catalogKind: 'BACHELOR',
        files: [
          {
            sourceFileName: 'batch-01.md',
            dataText: [
              '# 1. ط¹ظ„ظ… ط§ظ„ط£ط­ظٹط§ط، ط§ظ„ط·ط¨ظٹ â€” Medical Biology',
              'ط§ظ„ط±ظ…ط²: MJR-0011',
              '## ط§ظ„ظ†ط¨ط°ط©',
              'ظ†طµ ط§ظ„ظ†ط¨ط°ط©.',
            ].join('\n'),
          },
          {
            sourceFileName: 'batch-02.md',
            dataText: [
              '# 2. ط§ظ„ط£ط­ظٹط§ط، ط§ظ„ط¯ظ‚ظٹظ‚ط© ط§ظ„ط·ط¨ظٹط© â€” Medical Microbiology',
              'ط§ظ„ط±ظ…ط²: MJR-0012',
              '## ط§ظ„ظ…ظ‡ط§ط±ط§طھ',
              'ظ†طµ ط§ظ„ظ…ظ‡ط§ط±ط§طھ.',
            ].join('\n'),
          },
        ],
      });

      expect(createdBatch).toBe(false);
      expect(result.summary).toMatchObject({
        catalogKind: 'BACHELOR',
        totalFiles: 2,
        totalRecords: 2,
        totalContentSections: 2,
        importMode: 'DETAIL_DOSSIER',
      });
      expect(result.files.map((file) => file.sourceFileName)).toEqual(['batch-01.md', 'batch-02.md']);
    });

    it('imports multiple major detail dossier files as separately traceable batches', async () => {
      const createdBatches: any[] = [];
      const createdRecords: any[] = [];
      const bulkRepo = {
        ...mockImportRepo,
        createBatch: async (data: any) => {
          const batch = { id: `batch-${createdBatches.length + 1}`, ...data };
          createdBatches.push(batch);
          return batch;
        },
        bulkCreateRecords: async (records: any[]) => {
          createdRecords.push(...records);
          return { count: records.length };
        },
        updateBatchStats: async (id: string, stats: any) => ({ id, ...stats }),
      };
      const useCase = new MajorImportStagingUseCase(new ImportAdminUseCases(bulkRepo));

      const result = await useCase.importMajorDetailDossierFiles({
        catalogKind: 'BACHELOR',
        files: [
          {
            sourceFileName: 'medicine-01.md',
            dataText: [
              '# 1. ط¹ظ„ظ… ط§ظ„ط£ط­ظٹط§ط، ط§ظ„ط·ط¨ظٹ â€” Medical Biology',
              'ط§ظ„ط±ظ…ط²: MJR-0011',
              '## ط§ظ„ظ†ط¨ط°ط©',
              'ظ†طµ ط§ظ„ظ†ط¨ط°ط©.',
            ].join('\n'),
          },
          {
            sourceFileName: 'medicine-02.md',
            dataText: [
              '# 2. ط§ظ„ط£ط­ظٹط§ط، ط§ظ„ط¯ظ‚ظٹظ‚ط© ط§ظ„ط·ط¨ظٹط© â€” Medical Microbiology',
              'ط§ظ„ط±ظ…ط²: MJR-0012',
              '## ط§ظ„ظ…ظ‡ط§ط±ط§طھ',
              'ظ†طµ ط§ظ„ظ…ظ‡ط§ط±ط§طھ.',
            ].join('\n'),
          },
        ],
      });

      expect(createdBatches).toHaveLength(2);
      expect(createdRecords).toHaveLength(2);
      expect(result.summary).toMatchObject({
        totalFiles: 2,
        totalRecords: 2,
        stagedRecords: 2,
        totalContentSections: 2,
        importMode: 'DETAIL_DOSSIER',
      });
      expect(result.summary.batchIds).toEqual(['batch-1', 'batch-2']);
      expect(createdRecords.map((record) => record.rawPayload.sourceFileName)).toEqual(['medicine-01.md', 'medicine-02.md']);
    });
  });
});
