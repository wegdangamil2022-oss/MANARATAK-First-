import { describe, expect, it, vi } from 'vitest';
import { CourseImportOperationsUseCases } from '../../src/courses/use-cases/CourseImportOperationsUseCases';

function createFixture() {
  const operationsRepository = {
    getImportOperationsOverview: vi.fn().mockResolvedValue({
      providersTotal: 18,
      providersApproved: 18,
      batchesTotal: 1,
      recordsTotal: 2,
      reviewRequired: 1,
      transferred: 0,
      latestBatch: null,
    }),
    listCourseBatches: vi.fn().mockResolvedValue([{ id: 'batch-1', dataType: 'COURSES' }]),
    getCourseBatchById: vi.fn().mockResolvedValue({ id: 'batch-1', dataType: 'COURSES' }),
    listReviewQueue: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }),
  };
  const batchReader = {
    getBatchById: vi.fn(),
    listRecords: vi.fn().mockResolvedValue({
      data: [{ id: 'rec-1' }, { id: 'rec-2' }],
      total: 2,
      page: 1,
      pageSize: 50,
    }),
  };
  const coordinator = {
    preview: vi.fn().mockResolvedValue({ state: 'READY_TO_TRANSFER' }),
    transfer: vi.fn().mockImplementation(async ({ recordId }: any) => ({
      recordId,
      courseId: `course-${recordId}`,
      publicId: `public-${recordId}`,
      state: 'TRANSFERRED_CREATED',
    })),
  };
  const identityDiff = {
    analyzeBatch: vi.fn().mockResolvedValue({ batchId: 'batch-1', analyzed: 2 }),
  };
  return {
    operationsRepository,
    batchReader,
    coordinator,
    identityDiff,
    useCases: new CourseImportOperationsUseCases(
      operationsRepository as any,
      batchReader as any,
      coordinator as any,
      identityDiff as any,
    ),
  };
}

describe('CourseImportOperationsUseCases', () => {
  it('returns database-backed overview and batch history', async () => {
    const f = createFixture();
    expect((await f.useCases.overview()).providersTotal).toBe(18);
    expect((await f.useCases.listBatches()).length).toBe(1);
  });

  it('analyzes a newly staged batch through WP-IC-04 identity/diff', async () => {
    const f = createFixture();
    const result = await f.useCases.analyzeBatch('batch-1');
    expect(result.analyzed).toBe(2);
    expect(f.identityDiff.analyzeBatch).toHaveBeenCalledWith('batch-1');
  });

  it('forwards explicit force reanalysis only when requested by the continuation replay path', async () => {
    const f = createFixture();
    await f.useCases.analyzeBatch('batch-1', { force: true });
    expect(f.identityDiff.analyzeBatch).toHaveBeenCalledWith('batch-1', { force: true });
  });

  it('transfers through WP-IC-05 CourseImportCoordinator and never invents a second transfer path', async () => {
    const f = createFixture();
    const result = await f.useCases.transferBatch({
      batchId: 'batch-1',
      actorId: 'admin-1',
      limit: 50,
    });
    expect(result.transferred).toBe(2);
    expect(f.coordinator.transfer).toHaveBeenCalledTimes(2);
  });

  it('requires an actor for transfer auditing', async () => {
    const f = createFixture();
    await expect(f.useCases.transferBatch({
      batchId: 'batch-1',
      actorId: '',
    })).rejects.toThrow('COURSE_IMPORT_ACTOR_ID_REQUIRED');
  });

  it('rejects an unknown course batch', async () => {
    const f = createFixture();
    f.operationsRepository.getCourseBatchById.mockResolvedValue(null);
    await expect(f.useCases.getBatch('missing')).rejects.toThrow('COURSE_IMPORT_BATCH_NOT_FOUND');
  });
});
