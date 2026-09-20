import { describe, expect, it, vi } from 'vitest';
import {
  CourseProviderConnectorRegistry,
  CourseProviderContinuationUseCases,
  CourseProviderDriftError,
} from '../../src/courses/use-cases/CourseProviderContinuationUseCases';

const provider = {
  id: 'provider-1',
  publicId: 'ecp-provider-1',
  slug: 'provider-1',
  canonicalName: 'Provider One',
  normalizedCanonicalName: 'provider one',
  displayName: 'Provider One',
  status: 'APPROVED',
  sourceTrustLevel: 'OFFICIAL',
  importStrategy: 'MIXED',
  connectorKey: 'provider-one-connector',
  connectorVersion: '1.0.0',
  allowedDomains: ['courses.example.org'],
  aliases: [],
  createdAt: new Date('2026-08-01T00:00:00Z'),
  updatedAt: new Date('2026-08-01T00:00:00Z'),
} as any;

function build(options: {
  preflightRows?: number;
  canonicalTotal?: number;
  batchSourceSystem?: string;
  registry?: CourseProviderConnectorRegistry;
} = {}) {
  const preflightRows = options.preflightRows ?? 20;
  const canonicalTotal = options.canonicalTotal ?? 100;
  const providerRepository = {
    findById: vi.fn(async (id: string) => id === provider.id ? provider : null),
    findByPublicId: vi.fn(async (id: string) => id === provider.publicId ? provider : null),
    resolveByName: vi.fn(async (name: string) => name === provider.canonicalName ? provider : null),
    isDomainApproved: vi.fn(async () => true),
    upsertSeedProvider: vi.fn(async (input: any) => ({ ...provider, ...input })),
  } as any;
  const artifactUseCase = {
    preflight: vi.fn(async () => ({
      valid: true,
      artifact: { sheetName: 'Courses' },
      summary: { rowsFound: preflightRows },
      providers: [{
        label: provider.canonicalName,
        resolved: true,
        providerId: provider.id,
        rowCount: preflightRows,
      }],
      unknownColumns: [],
      issues: [],
    })),
    stage: vi.fn(async () => ({
      duplicateArtifact: false,
      staging: { batch: { id: 'batch-1' } },
    })),
  } as any;
  const operationsUseCases = {
    listBatches: vi.fn(async () => []),
    analyzeBatch: vi.fn(async () => ({
      analyses: [{
        changeState: 'NEW',
        matchState: 'NOT_DUPLICATE',
        requiresReview: false,
      }],
    })),
    getBatch: vi.fn(async () => ({
      id: 'batch-1',
      sourceSystem: options.batchSourceSystem ?? `COURSE_PROVIDER_FILE:${provider.publicId}:FULL_SNAPSHOT`,
    })),
    transferBatch: vi.fn(async (input: any) => ({ batchId: input.batchId, transferred: 1 })),
  } as any;
  const importedOperationsRepository = {
    listImportedCourses: vi.fn(async (filters: any) => ({
      data: filters.pageSize === 1 ? [] : [{
        id: 'course-1',
        directCourseUrl: 'https://courses.example.org/course/1',
      }],
      total: filters.linkHealth ? 0 : canonicalTotal,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 50,
      totalPages: 1,
      overview: {},
    })),
    listReviewQueue: vi.fn(async () => ({ data: [], total: 0, page: 1, pageSize: 100, totalPages: 0 })),
    listProviderReviewQueue: vi.fn(async () => ({ data: [], total: 0, page: 1, pageSize: 100, totalPages: 0 })),
    getProviderReviewSummary: vi.fn(async () => ({ reviewRequiredCount: 0, changedLinkQueueCount: 0 })),
    listProviderCourseBatches: vi.fn(async () => ({ data: [], total: 0 })),
    recordLinkCheck: vi.fn(async () => undefined),
  } as any;
  const linkChecker = {
    check: vi.fn(async () => ({ state: 'VERIFIED_DIRECT', checkedAt: new Date() })),
  } as any;
  const importAdminUseCases = {
    stageNormalizedRows: vi.fn(async () => ({ batch: { id: 'connector-batch' }, summary: {} })),
  } as any;
  const registry = options.registry ?? new CourseProviderConnectorRegistry();
  const service = new CourseProviderContinuationUseCases(
    providerRepository,
    artifactUseCase,
    operationsUseCases,
    importedOperationsRepository,
    linkChecker,
    importAdminUseCases,
    registry,
  );
  return {
    service,
    providerRepository,
    artifactUseCase,
    operationsUseCases,
    importedOperationsRepository,
    linkChecker,
    importAdminUseCases,
    registry,
  };
}

describe('CourseProviderContinuationUseCases', () => {
  it('blocks a suspiciously small full snapshot before staging', async () => {
    const { service, artifactUseCase } = build({ preflightRows: 20, canonicalTotal: 100 });
    const result = await service.preflightProviderFile(provider.id, {
      assetId: 'asset-1',
      mode: 'FULL_SNAPSHOT',
    });
    expect(result.canStage).toBe(false);
    expect(result.driftAlerts.some((item) => item.driftType === 'LOW_YIELD')).toBe(true);
    expect(artifactUseCase.stage).not.toHaveBeenCalled();
  });

  it('allows an intentionally incremental provider file without the full-snapshot low-yield gate', async () => {
    const { service } = build({ preflightRows: 20, canonicalTotal: 100 });
    const result = await service.preflightProviderFile(provider.id, {
      assetId: 'asset-1',
      mode: 'INCREMENTAL',
    });
    expect(result.canStage).toBe(true);
    expect(result.driftAlerts).toEqual([]);
  });

  it('halts a registered connector before staging when the source signature drifts', async () => {
    const registry = new CourseProviderConnectorRegistry();
    registry.register({
      connectorKey: provider.connectorKey,
      connectorVersion: provider.connectorVersion,
      expectedSignature: { schema: 1 },
      mode: 'INCREMENTAL',
      async fetch() {
        return {
          rows: [],
          observedSignature: { schema: 2 },
        };
      },
    });
    const { service, importAdminUseCases } = build({ canonicalTotal: 0, registry });
    await expect(service.runRegisteredConnector(provider.id)).rejects.toBeInstanceOf(CourseProviderDriftError);
    expect(importAdminUseCases.stageNormalizedRows).not.toHaveBeenCalled();
  });

  it('stages and analyzes rows only through an explicitly registered matching connector', async () => {
    const registry = new CourseProviderConnectorRegistry();
    registry.register({
      connectorKey: provider.connectorKey,
      connectorVersion: provider.connectorVersion,
      expectedSignature: { schema: 1 },
      mode: 'INCREMENTAL',
      async fetch() {
        return {
          observedSignature: { schema: 1 },
          rows: [{
            sourceOrder: 1,
            providerLabel: provider.canonicalName,
            courseName: 'Course One',
            directCourseUrl: 'https://courses.example.org/course/1',
            studyFreeRaw: 'Yes',
            freeCertificateRaw: 'Yes',
            certificateTypeRaw: 'Certificate',
            languageRaw: 'English',
            studyLevelRaw: 'Beginner',
            courseDurationRaw: '1 hour',
            shortCourseTopicsRaw: 'Topic A',
          }],
        };
      },
    });
    const { service, importAdminUseCases, operationsUseCases } = build({ canonicalTotal: 0, registry });
    const result = await service.runRegisteredConnector(provider.id);
    expect(importAdminUseCases.stageNormalizedRows).toHaveBeenCalledTimes(1);
    const stagedInput = importAdminUseCases.stageNormalizedRows.mock.calls[0][0];
    expect(stagedInput.ownerDomain).toBe('COURSES');
    expect(stagedInput.rows[0]._artifactSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(stagedInput.rows[0]._sourceSheetName).toBe('REGISTERED_CONNECTOR');
    expect(stagedInput.rows[0]._worksheetRowNumber).toBe(1);
    expect(operationsUseCases.analyzeBatch).toHaveBeenCalledWith('connector-batch');
    expect(result.inventoryComparison.newSinceLastImport).toBe(1);
  });

  it('halts connector output with a URL outside approved provider domains before Phase 06 staging', async () => {
    const registry = new CourseProviderConnectorRegistry();
    registry.register({
      connectorKey: provider.connectorKey,
      connectorVersion: provider.connectorVersion,
      expectedSignature: { schema: 1 },
      mode: 'INCREMENTAL',
      async fetch() {
        return {
          observedSignature: { schema: 1 },
          rows: [{
            sourceOrder: 1,
            providerLabel: provider.canonicalName,
            courseName: 'Course One',
            directCourseUrl: 'https://unapproved.example.net/course/1',
            studyFreeRaw: 'Yes',
            freeCertificateRaw: 'No',
            certificateTypeRaw: 'No free certificate',
            languageRaw: 'English',
            studyLevelRaw: 'Beginner',
            courseDurationRaw: '1 hour',
            shortCourseTopicsRaw: 'Topic A',
          }],
        };
      },
    });
    const built = build({ canonicalTotal: 0, registry });
    built.providerRepository.isDomainApproved.mockResolvedValue(false);
    await expect(built.service.runRegisteredConnector(provider.id)).rejects.toBeInstanceOf(CourseProviderDriftError);
    expect(built.importAdminUseCases.stageNormalizedRows).not.toHaveBeenCalled();
    expect(built.providerRepository.upsertSeedProvider).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'NEEDS_REVIEW' }),
    );
  });

  it('runs bounded link verification only against canonical provider course URLs and approved domains', async () => {
    const { service, linkChecker, importedOperationsRepository } = build({ canonicalTotal: 1 });
    const result = await service.runLinkHealthJob(provider.id, { page: 1, limit: 2, delayMs: 750 });
    expect(result.attempted).toBe(1);
    expect(linkChecker.check).toHaveBeenCalledWith({
      url: 'https://courses.example.org/course/1',
      allowedDomains: ['courses.example.org'],
    });
    expect(importedOperationsRepository.recordLinkCheck).toHaveBeenCalledTimes(1);
  });

  it('force-reanalyzes an owned provider batch during replay instead of reusing cached analysis', async () => {
    const { service, operationsUseCases } = build();
    await service.replayProviderBatch(provider.id, 'batch-1');
    expect(operationsUseCases.analyzeBatch).toHaveBeenCalledWith('batch-1', { force: true });
  });

  it('refuses replay of a batch that is not owned by the selected provider continuation source', async () => {
    const { service } = build({ batchSourceSystem: 'COURSE_PROVIDER_FILE:another-provider:FULL_SNAPSHOT' });
    await expect(service.replayProviderBatch(provider.id, 'batch-1'))
      .rejects.toThrow('COURSE_PROVIDER_CONTINUATION_BATCH_PROVIDER_MISMATCH');
  });

  it('blocks an empty FULL_SNAPSHOT connector even without a prior baseline', async () => {
    const registry = new CourseProviderConnectorRegistry();
    registry.register({ connectorKey: provider.connectorKey, connectorVersion: provider.connectorVersion, expectedSignature: { schema: 1 }, mode: 'FULL_SNAPSHOT', async fetch() { return { rows: [], observedSignature: { schema: 1 } }; } });
    const { service, importAdminUseCases } = build({ canonicalTotal: 0, registry });
    await expect(service.runRegisteredConnector(provider.id)).rejects.toBeInstanceOf(CourseProviderDriftError);
    expect(importAdminUseCases.stageNormalizedRows).not.toHaveBeenCalled();
  });

  it('does not let source-health approval mutate a connector version to bypass execution checks', async () => {
    const { service } = build();
    await expect(service.approveProviderSourceHealth(provider.id, { connectorVersion: '9.9.9' }))
      .rejects.toThrow('COURSE_PROVIDER_CONNECTOR_VERSION_MUTATION_FORBIDDEN');
  });

  it('uses provider-scoped batch data so a global first-100 cap cannot hide the latest snapshot', async () => {
    const { service, importedOperationsRepository } = build();
    importedOperationsRepository.listProviderCourseBatches.mockImplementation(async (input: any) => {
      if (input.sourcePrefix) return { data: [{ id: 'late-full', totalRecords: 42 }], total: 1 };
      return { data: [{ id: 'late-current', sourceSystem: `COURSE_PROVIDER_FILE:${provider.publicId}:INCREMENTAL` }], total: 101 };
    });
    const status = await service.getProviderStatus(provider.id);
    expect(status.continuation.continuationBatchCount).toBe(101);
    expect(status.continuation.latestBatch.id).toBe('late-current');
    const result = await service.preflightProviderFile(provider.id, { assetId: 'asset-1', mode: 'FULL_SNAPSHOT' });
    expect(result.driftAlerts).toEqual([]);
  });

  it('uses provider-scoped review pagination instead of sampling the first 2,000 global records', async () => {
    const { service, importedOperationsRepository } = build();
    importedOperationsRepository.getProviderReviewSummary.mockResolvedValue({ reviewRequiredCount: 2101, changedLinkQueueCount: 0 });
    const status = await service.getProviderStatus(provider.id);
    expect(status.continuation.reviewRequiredCount).toBe(2101);
    expect(importedOperationsRepository.listReviewQueue).not.toHaveBeenCalled();
    expect(importedOperationsRepository.getProviderReviewSummary).toHaveBeenCalledWith(provider.id);
  });
});
