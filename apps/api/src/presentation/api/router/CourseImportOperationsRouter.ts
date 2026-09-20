import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import {
  IExternalCourseProviderRepository,
  IImportedCourseLinkChecker,
  IImportedCourseOperationsRepository,
} from '@manaratak/domain';
import {
  CourseImportArtifactUseCase,
  CourseImportOperationsUseCases,
  CourseProviderContinuationUseCases,
  CourseProviderDriftError,
  defaultCourseProviderConnectorRegistry,
  ImportAdminUseCases,
} from '@manaratak/application';

export class CourseImportOperationsRouter {
  public static create(cradle: {
    courseImportOperationsUseCases: CourseImportOperationsUseCases;
    courseImportArtifactUseCase: CourseImportArtifactUseCase;
    externalCourseProviderRepository: IExternalCourseProviderRepository;
    importedCourseOperationsRepository: IImportedCourseOperationsRepository;
    importedCourseLinkChecker: IImportedCourseLinkChecker;
    importAdminUseCases: ImportAdminUseCases;
  }): Router {
    const router = Router();
    const {
      courseImportOperationsUseCases,
      courseImportArtifactUseCase,
      externalCourseProviderRepository,
      importedCourseOperationsRepository,
      importedCourseLinkChecker,
      importAdminUseCases,
    } = cradle;
    const providerContinuationUseCases = new CourseProviderContinuationUseCases(
      externalCourseProviderRepository,
      courseImportArtifactUseCase,
      courseImportOperationsUseCases,
      importedCourseOperationsRepository,
      importedCourseLinkChecker,
      importAdminUseCases,
      defaultCourseProviderConnectorRegistry,
    );

    const asyncHandler = (
      fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
    ) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

    const artifactSchema = z.object({
      assetId: z.string().trim().min(1),
      sourceSystem: z.string().trim().min(1).optional(),
      expectedSha256: z.string().trim().regex(/^[a-f0-9]{64}$/i).optional(),
    }).strict();

    const providerFileSchema = z.object({
      assetId: z.string().trim().min(1),
      expectedSha256: z.string().trim().regex(/^[a-f0-9]{64}$/i).optional(),
      mode: z.enum(['FULL_SNAPSHOT', 'INCREMENTAL']).optional(),
    }).strict();

    const pageQuerySchema = z.object({
      status: z.string().trim().max(64).optional(),
      page: z.string().optional().transform((value) => value ? Math.max(1, Number.parseInt(value, 10) || 1) : 1),
      pageSize: z.string().optional().transform((value) => value ? Math.min(100, Math.max(1, Number.parseInt(value, 10) || 50)) : 50),
    });

    const approvalSchema = z.object({
      expectedAnalysisId: z.string().min(1),
      reason: z.string().trim().min(1),
      approvedFields: z.array(z.string().min(1)).default([]),
      urlVerified: z.boolean().optional(),
    }).strict();

    const transferSchema = z.object({
      correlationId: z.string().trim().min(1).optional(),
      recordIds: z.array(z.string().trim().min(1)).max(100).optional(),
      approvals: z.record(z.string(), approvalSchema).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }).strict();

    const linkHealthJobSchema = z.object({
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(10).optional(),
      delayMs: z.number().int().min(750).max(10000).optional(),
    }).strict();

    router.get('/overview', asyncHandler(async (_req, res) => {
      res.json(await courseImportOperationsUseCases.overview());
    }));

    router.get('/providers', asyncHandler(async (_req, res) => {
      const providers = await externalCourseProviderRepository.list();
      res.json({ data: providers, total: providers.length });
    }));

    router.get('/providers/:id/continuation', asyncHandler(async (req, res) => {
      res.json(await providerContinuationUseCases.getProviderStatus(req.params.id));
    }));

    router.get('/providers/:id/changed-links', asyncHandler(async (req, res) => {
      const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? '100'), 10) || 100));
      res.json(await providerContinuationUseCases.getChangedLinkQueue(req.params.id, limit));
    }));

    router.post('/providers/:id/source-health/approve', asyncHandler(async (req, res) => {
      const payload = z.object({
        connectorVersion: z.string().trim().min(1).max(64).optional(),
      }).strict().parse(req.body ?? {});
      res.json(await providerContinuationUseCases.approveProviderSourceHealth(req.params.id, payload));
    }));

    router.get('/providers/:id/connector', asyncHandler(async (req, res) => {
      res.json(await providerContinuationUseCases.getConnectorStatus(req.params.id));
    }));

    router.post('/providers/:id/connector/run', asyncHandler(async (req, res) => {
      z.object({}).strict().parse(req.body ?? {});
      res.status(201).json(await providerContinuationUseCases.runRegisteredConnector(req.params.id));
    }));

    router.post('/providers/:id/files/preflight', asyncHandler(async (req, res) => {
      const payload = providerFileSchema.parse(req.body);
      res.json(await providerContinuationUseCases.preflightProviderFile(req.params.id, payload));
    }));

    router.post('/providers/:id/files/batches', asyncHandler(async (req, res) => {
      const payload = providerFileSchema.parse(req.body);
      const result = await providerContinuationUseCases.stageProviderFile(req.params.id, payload);
      res.status(result.duplicateArtifact ? 200 : 201).json(result);
    }));

    router.post('/providers/:id/link-health/jobs', asyncHandler(async (req, res) => {
      const payload = linkHealthJobSchema.parse(req.body ?? {});
      res.status(201).json(await providerContinuationUseCases.runLinkHealthJob(req.params.id, payload));
    }));

    router.post('/providers/:id/batches/:batchId/replay', asyncHandler(async (req, res) => {
      z.object({}).strict().parse(req.body ?? {});
      res.json(await providerContinuationUseCases.replayProviderBatch(req.params.id, req.params.batchId));
    }));

    router.post('/providers/:id/batches/:batchId/retry-transfer', asyncHandler(async (req, res) => {
      const body = transferSchema.parse(req.body);
      const actorId = req.authUserId;
      if (!actorId) throw new Error('COURSE_IMPORT_ACTOR_ID_REQUIRED');
      res.json(await providerContinuationUseCases.retryProviderTransfer(
        req.params.id,
        req.params.batchId,
        {
          actorId,
          correlationId: body.correlationId,
          recordIds: body.recordIds,
          approvals: body.approvals,
          limit: body.limit,
        },
      ));
    }));

    router.get('/providers/:id', asyncHandler(async (req, res) => {
      res.json(await providerContinuationUseCases.getProviderStatus(req.params.id));
    }));

    router.post('/preflight', asyncHandler(async (req, res) => {
      const payload = artifactSchema.parse(req.body);
      res.json(await courseImportArtifactUseCase.preflight(payload));
    }));

    router.post('/batches', asyncHandler(async (req, res) => {
      const payload = artifactSchema.parse(req.body);
      const result = await courseImportArtifactUseCase.stage(payload);
      const batchId = result.existingBatchId ?? (result.staging as any)?.batch?.id;
      if (!batchId) throw new Error('COURSE_IMPORT_BATCH_ID_MISSING_AFTER_STAGE');
      const analysis = await courseImportOperationsUseCases.analyzeBatch(batchId);
      res.status(result.duplicateArtifact ? 200 : 201).json({ ...result, analysis });
    }));

    router.get('/batches', asyncHandler(async (req, res) => {
      const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? '50'), 10) || 50));
      const data = await courseImportOperationsUseCases.listBatches(limit);
      res.json({ data, total: data.length });
    }));

    router.get('/batches/:id', asyncHandler(async (req, res) => {
      res.json(await courseImportOperationsUseCases.getBatch(req.params.id));
    }));

    router.get('/batches/:id/records', asyncHandler(async (req, res) => {
      const query = pageQuerySchema.parse(req.query);
      res.json(await courseImportOperationsUseCases.listBatchRecords(req.params.id, query));
    }));

    router.get('/review', asyncHandler(async (req, res) => {
      const query = pageQuerySchema.pick({ page: true, pageSize: true }).parse(req.query);
      res.json(await courseImportOperationsUseCases.reviewQueue(query));
    }));

    router.post('/batches/:id/transfer', asyncHandler(async (req, res) => {
      const body = transferSchema.parse(req.body);
      const actorId = req.authUserId;
      if (!actorId) throw new Error('COURSE_IMPORT_ACTOR_ID_REQUIRED');
      res.json(await courseImportOperationsUseCases.transferBatch({
        batchId: req.params.id,
        actorId,
        correlationId: body.correlationId,
        recordIds: body.recordIds,
        approvals: body.approvals,
        limit: body.limit,
      }));
    }));

    router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      if (err instanceof CourseProviderDriftError) {
        return res.status(409).json({ error: err.message, driftAlert: err.alert });
      }
      const message = err instanceof Error ? err.message : 'COURSE_IMPORT_OPERATION_FAILED';
      if (message.includes('NOT_FOUND')) return res.status(404).json({ error: message });
      if (
        message.includes('BLOCKED') ||
        message.includes('REQUIRED') ||
        message.includes('STALE') ||
        message.includes('INVALID') ||
        message.includes('CONFLICT') ||
        message.includes('TOO_LARGE') ||
        message.includes('NOT_APPROVED') ||
        message.includes('NOT_REGISTERED') ||
        message.includes('MISMATCH')
      ) {
        return res.status(409).json({ error: message });
      }
      return res.status(400).json({ error: message });
    });

    return router;
  }
}
