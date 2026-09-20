import { Router, Request, Response, NextFunction } from 'express';
import { readFile } from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { CourseImportArtifactUseCase, ImportAdminUseCases, MajorImportStagingUseCase, type ISourceRegistryGateway } from '@manaratak/application';
import {
  IAssetRecordRepository,
  IAssetStorageGateway,
  IExternalCourseProviderRepository,
  ImportTargetDomain,
  SourceStatus,
} from '@manaratak/domain';

export class ImportAdminRouter {
  public static create(cradle: { 
    importAdminUseCases: ImportAdminUseCases;
    majorImportStagingUseCase: MajorImportStagingUseCase;
    assetRecordRepository: IAssetRecordRepository;
    assetStorageGateway: IAssetStorageGateway;
    externalCourseProviderRepository: IExternalCourseProviderRepository;
    sourceRegistryGateway?: ISourceRegistryGateway;
    auditRecordRepo?: {
      listRecentImportOperations?(limit?: number): Promise<Array<{
        id: string;
        actorId: string;
        action: string;
        severity: string;
        targetId: string;
        timestamp: Date | string;
        method?: string;
        path?: string;
        httpStatus?: number;
        result?: 'SUCCESS' | 'FAILURE';
      }>>;
    };
  }): Router {
    const router = Router();
    const {
      importAdminUseCases,
      majorImportStagingUseCase,
      sourceRegistryGateway,
      auditRecordRepo,
    } = cradle;

    const courseImportArtifactUseCase = new CourseImportArtifactUseCase(
      cradle.assetRecordRepository,
      cradle.assetStorageGateway,
      cradle.externalCourseProviderRepository,
      importAdminUseCases,
    );

    type RouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;
    const asyncHandler = (fn: RouteHandler) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

    const INLINE_IMPORT_MAX_LENGTH = 90 * 1024; // 90KB max string length
    const DEFAULT_PAGE = 1;
    const DEFAULT_PAGE_SIZE = 50;
    const MAX_PAGE_SIZE = 100;
    const MAJOR_CATALOG_FILES = {
      BACHELOR: 'MANARATAK_Bachelor_Majors_By_Colleges_v1.0.md',
      MASTER: 'MANARATAK_Master_Specializations_By_Academic_Fields_v1.0.md',
      DOCTORATE: 'MANARATAK_Doctoral_Specializations_By_Academic_Fields_v1.0.md',
      FELLOWSHIP: 'MANARATAK_Fellowships_By_Professional_Domains_v1.0.md',
    } as const;
    const MAJOR_DETAIL_DOSSIER_FILES = {
      BACHELOR: 'MANARATAK_Bachelor_Majors_Medicine_01_First_10.md',
      MASTER: 'masters_MAS-0001_to_MAS-0010.md',
      DOCTORATE: 'doctorates_DOC-0001_to_DOC-0010.md',
      FELLOWSHIP: 'fellowships_FEL-0001_to_FEL-0010.md',
    } as const;
    const MAJOR_DETAIL_SUBDIRS = {
      BACHELOR: 'bachelor',
      MASTER: 'master',
      DOCTORATE: 'doctorate',
      FELLOWSHIP: '',
    } as const;

    const majorCatalogKindSchema = z.enum(['BACHELOR', 'MASTER', 'DOCTORATE', 'FELLOWSHIP']);
    
    const importBodySchema = z.object({
      dataText: z.string()
        .min(1, 'Import text or CSV content is required')
        .max(INLINE_IMPORT_MAX_LENGTH, 'Import payload is too large. Large imports must use the future artifact/EAP import flow. Inline dataText is only for small/manual imports.'),
      sourceSystem: z.string().trim().min(1).max(120).optional(),
      dataType: z.nativeEnum(ImportTargetDomain)
        .or(z.literal('INTERNATIONAL_TESTS'))
        .optional()
        .transform(val => val === 'INTERNATIONAL_TESTS' ? ImportTargetDomain.Tests : val),
    }).strict();

    const courseArtifactBodySchema = z.object({
      assetId: z.string().trim().min(1),
      sourceSystem: z.string().trim().min(1).optional(),
      expectedSha256: z.string().trim().regex(/^[a-f0-9]{64}$/i).optional(),
    }).strict();

    const majorCatalogBodySchema = z.object({
      dataText: z.string().min(1).optional(),
      catalogKind: majorCatalogKindSchema,
      sourceSystem: z.string().optional(),
      sourceFileName: z.string().optional(),
    }).strict().refine((value) => Boolean(value.dataText), {
      message: 'dataText is required for direct catalog import.',
      path: ['dataText'],
    });

    const majorDetailDossierBodySchema = z.object({
      dataText: z.string().min(1).optional(),
      catalogKind: majorCatalogKindSchema,
      sourceSystem: z.string().optional(),
      sourceFileName: z.string().optional(),
    }).strict().refine((value) => Boolean(value.dataText), {
      message: 'dataText is required for direct detail dossier import.',
      path: ['dataText'],
    });

    const majorTextImportFileSchema = z.object({
      dataText: z.string().min(1),
      sourceSystem: z.string().optional(),
      sourceFileName: z.string().optional(),
    }).strict();

    const majorMultiFileBodySchema = z.object({
      catalogKind: majorCatalogKindSchema,
      sourceSystem: z.string().optional(),
      files: z.array(majorTextImportFileSchema).min(1).max(50),
    }).strict();

    // GET /admin/imports/overview - exact server-derived counters for the control plane.
    router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
      let dataType = req.query.dataType as string | undefined;
      if (dataType === 'ALL' || !dataType) dataType = undefined;
      if (dataType === 'INTERNATIONAL_TESTS') dataType = ImportTargetDomain.Tests;
      if (dataType && !(Object.values(ImportTargetDomain) as string[]).includes(dataType)) {
        return res.status(400).json({ error: 'Validation Error', details: [{ message: 'Invalid dataType filter' }] });
      }
      res.json(await importAdminUseCases.getOverview(dataType ? { dataType } : undefined));
    }));

    // GET /admin/imports/operations - operational diagnostics for queues, retry/DLQ and stuck batches.
    router.get('/operations', asyncHandler(async (req: Request, res: Response) => {
      let dataType = req.query.dataType as string | undefined;
      if (dataType === 'ALL' || !dataType) dataType = undefined;
      if (dataType === 'INTERNATIONAL_TESTS') dataType = ImportTargetDomain.Tests;
      if (dataType && !(Object.values(ImportTargetDomain) as string[]).includes(dataType)) {
        return res.status(400).json({ error: 'Validation Error', details: [{ message: 'Invalid dataType filter' }] });
      }
      res.json(await importAdminUseCases.getOperationalInsights(dataType ? { dataType } : undefined));
    }));

    // GET /admin/imports/capabilities - explicit truth about staging and owning-domain handoff readiness.
    router.get('/capabilities', asyncHandler(async (_req: Request, res: Response) => {
      res.json(importAdminUseCases.getDomainCapabilities([
        ImportTargetDomain.Scholarships,
        ImportTargetDomain.Universities,
        ImportTargetDomain.Majors,
        ImportTargetDomain.Courses,
        ImportTargetDomain.Tests,
        ImportTargetDomain.Services,
        ImportTargetDomain.Cms,
      ]));
    }));

    // GET /admin/imports/error-report - exact FAILED/DLQ rows for review/export; never mutates records.
    router.get('/error-report', asyncHandler(async (req: Request, res: Response) => {
      let dataType = req.query.dataType as string | undefined;
      if (dataType === 'ALL' || !dataType) dataType = undefined;
      if (dataType === 'INTERNATIONAL_TESTS') dataType = ImportTargetDomain.Tests;
      if (dataType && !(Object.values(ImportTargetDomain) as string[]).includes(dataType)) {
        return res.status(400).json({ error: 'Validation Error', details: [{ message: 'Invalid dataType filter' }] });
      }
      const limitRaw = Number(req.query.limit ?? 500);
      const limit = Number.isFinite(limitRaw) ? Math.min(1000, Math.max(1, Math.trunc(limitRaw))) : 500;
      res.json(await importAdminUseCases.getErrorReport({
        ...(dataType ? { dataType } : {}),
        ...(typeof req.query.batchId === 'string' && req.query.batchId ? { batchId: req.query.batchId } : {}),
        limit,
      }));
    }));

    // GET /admin/imports/activity - read-only Import Operations Center audit trail.
    router.get('/activity', asyncHandler(async (req: Request, res: Response) => {
      if (!auditRecordRepo?.listRecentImportOperations) {
        return res.status(503).json({ error: 'IMPORT_AUDIT_ACTIVITY_UNAVAILABLE' });
      }
      const limitRaw = Number(req.query.limit ?? 20);
      const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.trunc(limitRaw))) : 20;
      res.json({ data: await auditRecordRepo.listRecentImportOperations(limit) });
    }));

    // POST /admin/imports/preflight - parse/deduplicate preview only; no persistence and no publication.
    router.post('/preflight', asyncHandler(async (req: Request, res: Response) => {
      const payload = importBodySchema.parse(req.body);
      res.status(200).json(await importAdminUseCases.preflightData(payload));
    }));

    // Real source registry visibility for the generic import control plane.
    router.get('/sources', asyncHandler(async (_req: Request, res: Response) => {
      if (!sourceRegistryGateway) return res.status(503).json({ error: 'IMPORT_SOURCE_REGISTRY_UNAVAILABLE' });
      res.json({ data: await sourceRegistryGateway.listSources() });
    }));

    const sourceStatusSchema = z.nativeEnum(SourceStatus);
    const sourceStatusUpdateSchema = z.object({
      status: sourceStatusSchema,
      reason: z.string().trim().min(1).max(500).optional(),
    }).strict();
    const queueReasonSchema = z.object({ reason: z.string().trim().min(1).max(1000).optional() }).strict();
    const queueReplaySchema = z.object({ fromCheckpoint: z.boolean().optional() }).strict();
    const emptyQueueCommandSchema = z.object({}).strict();
    router.patch('/sources/:sourceId/status', asyncHandler(async (req: Request, res: Response) => {
      if (!sourceRegistryGateway) return res.status(503).json({ error: 'IMPORT_SOURCE_REGISTRY_UNAVAILABLE' });
      const { status, reason } = sourceStatusUpdateSchema.parse(req.body);
      const updated = await sourceRegistryGateway.updateSourceStatus(req.params.sourceId, status, reason);
      if (!updated) return res.status(404).json({ error: 'IMPORT_SOURCE_NOT_FOUND' });
      const source = await sourceRegistryGateway.getSource(req.params.sourceId);
      res.json({ data: source });
    }));

    // POST /admin/imports
    router.post('/', asyncHandler(async (req: Request, res: Response) => {
       const payload = importBodySchema.parse(req.body);
       const result = await importAdminUseCases.importData(payload);
       res.status(201).json(result);
     }));

    router.post('/courses/preflight', asyncHandler(async (req: Request, res: Response) => {
      const payload = courseArtifactBodySchema.parse(req.body);
      const result = await courseImportArtifactUseCase.preflight(payload);
      res.status(200).json(result);
    }));

    router.post('/courses/stage', asyncHandler(async (req: Request, res: Response) => {
      const payload = courseArtifactBodySchema.parse(req.body);
      const result = await courseImportArtifactUseCase.stage(payload);
      res.status(result.duplicateArtifact ? 200 : 201).json(result);
    }));

    router.post('/major-catalogs', asyncHandler(async (req: Request, res: Response) => {
      const payload = majorCatalogBodySchema.parse(req.body);
      const result = await majorImportStagingUseCase.importMajorCatalogText({
        dataText: payload.dataText ?? '',
        catalogKind: payload.catalogKind,
        sourceSystem: payload.sourceSystem,
        sourceFileName: payload.sourceFileName,
      });
      res.status(201).json(result);
    }));

    router.post('/major-catalogs/preview', asyncHandler(async (req: Request, res: Response) => {
      const payload = majorCatalogBodySchema.parse(req.body);
      const result = majorImportStagingUseCase.previewMajorCatalogText({
        dataText: payload.dataText ?? '',
        catalogKind: payload.catalogKind,
        sourceFileName: payload.sourceFileName,
      });
      res.status(200).json(result);
    }));

    router.post('/major-catalogs/bulk', asyncHandler(async (req: Request, res: Response) => {
      const payload = majorMultiFileBodySchema.parse(req.body);
      const result = await majorImportStagingUseCase.importMajorCatalogFiles({
        catalogKind: payload.catalogKind,
        sourceSystem: payload.sourceSystem,
        files: payload.files,
      });
      res.status(201).json(result);
    }));

    router.post('/major-catalogs/bulk/preview', asyncHandler(async (req: Request, res: Response) => {
      const payload = majorMultiFileBodySchema.parse(req.body);
      const result = majorImportStagingUseCase.previewMajorCatalogFiles({
        catalogKind: payload.catalogKind,
        sourceSystem: payload.sourceSystem,
        files: payload.files,
      });
      res.status(200).json(result);
    }));

    router.post('/major-catalogs/workspace/:catalogKind', asyncHandler(async (req: Request, res: Response) => {
      const catalogKind = majorCatalogKindSchema.parse(req.params.catalogKind);
      const sourceFileName = MAJOR_CATALOG_FILES[catalogKind];
      const catalogPath = path.resolve(process.cwd(), 'workspace', 'phase-10-major-catalogs', sourceFileName);
      const dataText = await readFile(catalogPath, 'utf8');

      const result = await majorImportStagingUseCase.importMajorCatalogText({
        dataText,
        catalogKind,
        sourceSystem: `PHASE_10_${catalogKind}_CATALOG`,
        sourceFileName,
      });
      res.status(201).json(result);
    }));

    router.get('/major-catalogs/workspace/:catalogKind/preview', asyncHandler(async (req: Request, res: Response) => {
      const catalogKind = majorCatalogKindSchema.parse(req.params.catalogKind);
      const sourceFileName = MAJOR_CATALOG_FILES[catalogKind];
      const catalogPath = path.resolve(process.cwd(), 'workspace', 'phase-10-major-catalogs', sourceFileName);
      const dataText = await readFile(catalogPath, 'utf8');

      const result = majorImportStagingUseCase.previewMajorCatalogText({
        dataText,
        catalogKind,
        sourceFileName,
      });
      res.status(200).json(result);
    }));

    router.post('/major-detail-dossiers', asyncHandler(async (req: Request, res: Response) => {
      const payload = majorDetailDossierBodySchema.parse(req.body);
      const result = await majorImportStagingUseCase.importMajorDetailDossierText({
        dataText: payload.dataText ?? '',
        catalogKind: payload.catalogKind,
        sourceSystem: payload.sourceSystem,
        sourceFileName: payload.sourceFileName,
      });
      res.status(201).json(result);
    }));

    router.post('/major-detail-dossiers/preview', asyncHandler(async (req: Request, res: Response) => {
      const payload = majorDetailDossierBodySchema.parse(req.body);
      const result = majorImportStagingUseCase.previewMajorDetailDossierText({
        dataText: payload.dataText ?? '',
        catalogKind: payload.catalogKind,
        sourceFileName: payload.sourceFileName,
      });
      res.status(200).json(result);
    }));

    router.post('/major-detail-dossiers/bulk', asyncHandler(async (req: Request, res: Response) => {
      const payload = majorMultiFileBodySchema.parse(req.body);
      const result = await majorImportStagingUseCase.importMajorDetailDossierFiles({
        catalogKind: payload.catalogKind,
        sourceSystem: payload.sourceSystem,
        files: payload.files,
      });
      res.status(201).json(result);
    }));

    router.post('/major-detail-dossiers/bulk/preview', asyncHandler(async (req: Request, res: Response) => {
      const payload = majorMultiFileBodySchema.parse(req.body);
      const result = majorImportStagingUseCase.previewMajorDetailDossierFiles({
        catalogKind: payload.catalogKind,
        sourceSystem: payload.sourceSystem,
        files: payload.files,
      });
      res.status(200).json(result);
    }));

    router.post('/major-detail-dossiers/workspace/:catalogKind', asyncHandler(async (req: Request, res: Response) => {
      const catalogKind = majorCatalogKindSchema.parse(req.params.catalogKind);
      const sourceFileName = MAJOR_DETAIL_DOSSIER_FILES[catalogKind];
      const subDir = MAJOR_DETAIL_SUBDIRS[catalogKind] || '';
      const dossierPath = path.resolve(process.cwd(), 'workspace', 'phase-10-major-detail-dossiers', subDir, sourceFileName);
      const dataText = await readFile(dossierPath, 'utf8');

      const result = await majorImportStagingUseCase.importMajorDetailDossierText({
        dataText,
        catalogKind,
        sourceSystem: `PHASE_10_${catalogKind}_DETAIL_DOSSIER`,
        sourceFileName,
      });
      res.status(201).json(result);
    }));

    router.get('/major-detail-dossiers/workspace/:catalogKind/preview', asyncHandler(async (req: Request, res: Response) => {
      const catalogKind = majorCatalogKindSchema.parse(req.params.catalogKind);
      const sourceFileName = MAJOR_DETAIL_DOSSIER_FILES[catalogKind];
      const subDir = MAJOR_DETAIL_SUBDIRS[catalogKind] || '';
      const dossierPath = path.resolve(process.cwd(), 'workspace', 'phase-10-major-detail-dossiers', subDir, sourceFileName);
      const dataText = await readFile(dossierPath, 'utf8');

      const result = majorImportStagingUseCase.previewMajorDetailDossierText({
        dataText,
        catalogKind,
        sourceFileName,
      });
      res.status(200).json(result);
    }));

    // GET /admin/imports/queue/jobs/:batchId
    router.get('/queue/jobs/:batchId', asyncHandler(async (req: Request, res: Response) => {
      const batchId = req.params.batchId;
      const status = await importAdminUseCases.getQueueJobStatus(batchId);
      if (!status) {
        return res.status(404).json({ error: `Queue job status not found for batchId: ${batchId}` });
      }
      res.json(status);
    }));

    // POST /admin/imports/queue/jobs/:batchId/pause
    router.post('/queue/jobs/:batchId/pause', asyncHandler(async (req: Request, res: Response) => {
      const batchId = req.params.batchId;
      const { reason } = queueReasonSchema.parse(req.body ?? {});
      const success = await importAdminUseCases.pauseQueueJob(batchId, reason);
      if (!success) {
        return res.status(409).json({ error: 'Queue job action is not valid for current state or job does not exist.' });
      }
      res.json({ status: 'ok', action: 'pause', batchId });
    }));

    // POST /admin/imports/queue/jobs/:batchId/resume
    router.post('/queue/jobs/:batchId/resume', asyncHandler(async (req: Request, res: Response) => {
      const batchId = req.params.batchId;
      emptyQueueCommandSchema.parse(req.body ?? {});
      const success = await importAdminUseCases.resumeQueueJob(batchId);
      if (!success) {
        return res.status(409).json({ error: 'Queue job action is not valid for current state or job does not exist.' });
      }
      res.json({ status: 'ok', action: 'resume', batchId });
    }));

    // POST /admin/imports/queue/jobs/:batchId/cancel
    router.post('/queue/jobs/:batchId/cancel', asyncHandler(async (req: Request, res: Response) => {
      const batchId = req.params.batchId;
      const { reason } = queueReasonSchema.parse(req.body ?? {});
      const success = await importAdminUseCases.cancelQueueJob(batchId, reason);
      if (!success) {
        return res.status(409).json({ error: 'Queue job action is not valid for current state or job does not exist.' });
      }
      res.json({ status: 'ok', action: 'cancel', batchId });
    }));

    // POST /admin/imports/queue/jobs/:batchId/replay
    router.post('/queue/jobs/:batchId/replay', asyncHandler(async (req: Request, res: Response) => {
      const batchId = req.params.batchId;
      const { fromCheckpoint } = queueReplaySchema.parse(req.body ?? {});
      const success = await importAdminUseCases.replayQueueJob(batchId, fromCheckpoint);
      if (!success) {
        return res.status(409).json({ error: 'Queue job action is not valid for current state or job does not exist.' });
      }
      res.json({ status: 'ok', action: 'replay', batchId });
    }));

    // GET /admin/imports/batches
    router.get('/batches', asyncHandler(async (req: Request, res: Response) => {
      let dataTypeFilter = req.query.dataType === 'ALL' || !req.query.dataType ? undefined : req.query.dataType as string;
      if (dataTypeFilter === 'INTERNATIONAL_TESTS') {
        dataTypeFilter = ImportTargetDomain.Tests;
      }
      
      if (dataTypeFilter && !(Object.values(ImportTargetDomain) as string[]).includes(dataTypeFilter)) {
         return res.status(400).json({ error: 'Validation Error', details: [{ message: 'Invalid dataType filter' }] });
      }

      const batches = await importAdminUseCases.listBatches(dataTypeFilter ? { dataType: dataTypeFilter } : {});
      res.json(batches);
    }));

    // GET /admin/imports/records
    router.get('/records', asyncHandler(async (req: Request, res: Response) => {
      const batchId = req.query.batchId as string;
      const status = req.query.status as string;
      
      let dataTypeFilter = req.query.dataType === 'ALL' || !req.query.dataType ? undefined : req.query.dataType as string;
      if (dataTypeFilter === 'INTERNATIONAL_TESTS') {
        dataTypeFilter = ImportTargetDomain.Tests;
      }
      
      if (dataTypeFilter && !(Object.values(ImportTargetDomain) as string[]).includes(dataTypeFilter)) {
         return res.status(400).json({ error: 'Validation Error', details: [{ message: 'Invalid dataType filter' }] });
      }

      let page = parseInt(req.query.page as string, 10);
      if (isNaN(page) || page < 1) {
        page = DEFAULT_PAGE;
      }

      let pageSize = parseInt(req.query.pageSize as string, 10);
      if (isNaN(pageSize) || pageSize < 1) {
        pageSize = DEFAULT_PAGE_SIZE;
      } else if (pageSize > MAX_PAGE_SIZE) {
        pageSize = MAX_PAGE_SIZE;
      }

      const records = await importAdminUseCases.listRecords({
        batchId,
        status,
        dataType: dataTypeFilter,
        page,
        pageSize,
      });
      res.json(records);
    }));

    const phase6PromotionDisabled = {
      error: 'PHASE6_DOMAIN_PROMOTION_DISABLED',
      message: 'Import Foundation owns source acquisition, parsing, normalization, validation, staging, execution and handoff only. Semantic promotion belongs to the owning domain.',
      nextAction: 'Open the owning domain workspace or its dedicated import workflow after domain review.',
    };

    // Legacy compatibility endpoints. They intentionally never mutate canonical domain records.
    router.post('/records/:id/promote', asyncHandler(async (_req: Request, res: Response) => {
      res.status(422).json(phase6PromotionDisabled);
    }));

    router.post('/batches/:id/promote', asyncHandler(async (_req: Request, res: Response) => {
      res.status(422).json(phase6PromotionDisabled);
    }));

    // POST /admin/imports/records/:id/transfer
    router.post('/records/:id/transfer', asyncHandler(async (_req: Request, res: Response) => {
      res.status(422).json(phase6PromotionDisabled);
    }));

    // POST /admin/imports/batches/:id/transfer
    router.post('/batches/:id/transfer', asyncHandler(async (_req: Request, res: Response) => {
      res.status(422).json(phase6PromotionDisabled);
    }));

    router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      res.status(400).json({ error: err instanceof Error ? err.message : 'An error occurred' });
    });

    return router;
  }
}
