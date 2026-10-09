import { randomUUID } from 'node:crypto';
import { ResponseFormatter } from '../response/ResponseFormatter';
import { requireAuthenticatedPrincipal } from '../../security/AuthenticatedPrincipal.js';
import { Router, Request, Response, NextFunction } from 'express';
import { readFile } from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import {
  CourseImportArtifactUseCase,
  ImportArtifactUseCase,
  ImportSourceControlUseCases,
  ImportGovernanceUseCases,
  ImportAdminUseCases,
  MajorImportStagingUseCase,
  type ISourceRegistryGateway,
} from '@manaratak/application';
import {
  IAssetRecordRepository,
  IAssetStorageGateway,
  IExternalCourseProviderRepository,
  ImportTargetDomain,
  SourceStatus,
  SourceAccessClassification,
  SourceConnectorCategory,
} from '@manaratak/domain';

export class ImportAdminRouter {
  public static create(cradle: {
    importAdminUseCases: ImportAdminUseCases;
    importArtifactUseCase?: ImportArtifactUseCase;
    importSourceControlUseCases?: ImportSourceControlUseCases;
    importGovernanceUseCases?: ImportGovernanceUseCases;
    majorImportStagingUseCase: MajorImportStagingUseCase;
    assetRecordRepository: IAssetRecordRepository;
    assetStorageGateway: IAssetStorageGateway;
    externalCourseProviderRepository: IExternalCourseProviderRepository;
    sourceRegistryGateway?: ISourceRegistryGateway;
    auditRecordRepo?: {
      listRecentImportOperations?(limit?: number): Promise<
        Array<{
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
        }>
      >;
    };
  }): Router {
    const router = Router();
    // Versioned canonical contract; explicit v1 compatibility for existing automation.
    router.use((req: Request, res: Response, next: NextFunction) => {
      const formatter = new ResponseFormatter('import-v2');
      const supplied = req.headers['x-correlation-id'];
      const requestId = typeof supplied === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied) ? supplied : randomUUID();
      res.setHeader('X-Correlation-Id', requestId);
      const canonical = req.headers['x-import-envelope-version'] !== '1';
      if (canonical) res.setHeader('X-Import-Envelope-Version', '2');
      const send = res.json.bind(res);
      res.json = ((payload: unknown) => {
        if (!canonical) return send(payload);
        if (res.statusCode < 400) return send(formatter.success(payload, requestId));
        const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
        const candidate = body.code ?? body.error;
        const code = typeof candidate === 'string' && /^(IMPORT|SOURCE|PHASE6|AUTHENTICATED)_[A-Z0-9_]{1,128}$/.test(candidate)
          ? candidate : body.error === 'Validation Error' ? 'IMPORT_VALIDATION_FAILED' : `IMPORT_HTTP_${res.statusCode}`;
        const retryable = typeof body.retryable === 'boolean' ? body.retryable : [429, 503].includes(res.statusCode);
        return send(formatter.error({ code, message: code, traceId: requestId,
          details: { retryable, ...(body.details ? { validation: body.details } : {}) } }, requestId));
      }) as Response['json'];
      next();
    });
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
    const asyncHandler =
      (fn: RouteHandler) => (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
      };

    const actor = (req: Request) => requireAuthenticatedPrincipal(req);
    const artifactBody = z.object({ assetId: z.string().trim().min(1).max(120),
      ownerDomain: z.nativeEnum(ImportTargetDomain), expectedSha256: z.string().regex(/^[a-f0-9]{64}$/i),
      format: z.enum(['csv', 'ndjson', 'json']), mappingProfileId: z.string().uuid().optional() }).strict();
    router.get('/artifacts/capabilities', asyncHandler(async (_req, res) => {
      if (!cradle.importArtifactUseCase) return res.status(503).json({ error: 'IMPORT_ARTIFACT_UNAVAILABLE' });
      return res.json(cradle.importArtifactUseCase.capabilities());
    }));
    router.post('/artifacts/inspect', asyncHandler(async (req, res) => {
      if (!cradle.importArtifactUseCase) return res.status(503).json({ error: 'IMPORT_ARTIFACT_UNAVAILABLE' });
      const body = z.object({ assetId: z.string().trim().min(1).max(120) }).strict().parse(req.body);
      return res.json(await cradle.importArtifactUseCase.inspect(body.assetId, actor(req).principalId));
    }));
    router.post('/artifacts/preflight', asyncHandler(async (req, res) => {
      if (!cradle.importArtifactUseCase) return res.status(503).json({ error: 'IMPORT_ARTIFACT_UNAVAILABLE' });
      return res.json(await cradle.importArtifactUseCase.preflight(artifactBody.parse(req.body), actor(req).principalId));
    }));
    router.post('/artifacts', asyncHandler(async (req, res) => {
      if (!cradle.importArtifactUseCase) return res.status(503).json({ error: 'IMPORT_ARTIFACT_UNAVAILABLE' });
      const result = await cradle.importArtifactUseCase.stage(artifactBody.parse(req.body), actor(req).principalId);
      res.setHeader('Location', `/api/v1/admin/imports/queue/jobs/${encodeURIComponent(result.batchId)}`);
      return res.status(202).json(result);
    }));

    const governance = () => {
      if (!cradle.importGovernanceUseCases) throw new Error('IMPORT_GOVERNANCE_UNAVAILABLE');
      return cradle.importGovernanceUseCases;
    };
    const commandContext = (req: Request) => ({ actorId: actor(req).principalId, actorType: actor(req).actorType,
      source: 'admin-import-governance', correlationId: req.headers['x-correlation-id'] as string | undefined });
    const reasonField = z.string().trim().min(3).max(1000);
    const governanceId = z.string().trim().min(1).max(180);
    router.get('/batches/:id/timeline', asyncHandler(async (req, res) =>
      res.json(await importAdminUseCases.getTimeline(governanceId.parse(req.params.id)))));
    const mappingDefinition = z.object({ fields: z.array(z.object({ target: z.string().min(1).max(120),
      aliases: z.array(z.string().min(1).max(240)).min(1).max(20), type: z.enum(['string','number','boolean']),
      required: z.boolean() }).strict()).min(1).max(100) }).strict();
    router.get('/mapping-profiles', asyncHandler(async (req, res) => {
      const input = z.object({ sourceId: governanceId, ownerDomain: z.nativeEnum(ImportTargetDomain) }).strict().parse(req.query);
      return res.json({ data: await governance().profiles(input.sourceId, input.ownerDomain) });
    }));
    router.post('/mapping-profiles', asyncHandler(async (req, res) => {
      const input = z.object({ sourceId: governanceId, ownerDomain: z.nativeEnum(ImportTargetDomain), sourceRevision: z.string().datetime(),
        expectedVersion: z.number().int().min(0), definition: mappingDefinition, reason: reasonField }).strict().parse(req.body);
      return res.status(201).json(await governance().saveProfile(input, commandContext(req)));
    }));
    router.post('/mapping-profiles/:profileId/preview', asyncHandler(async (req, res) => {
      actor(req);
      const input = z.object({ sourceId: governanceId, ownerDomain: z.nativeEnum(ImportTargetDomain),
        rows: z.array(z.record(z.string(), z.unknown())).max(20) }).strict().parse(req.body);
      const profile = await governance().pinnedProfile(z.string().uuid().parse(req.params.profileId), input.sourceId, input.ownerDomain);
      return res.json({ data: governance().preview(profile, input.rows), profileId: profile.id, definitionHash: profile.definitionHash });
    }));
    router.get('/review-queue', asyncHandler(async (req, res) => {
      const input = z.object({ assigneeId: governanceId.optional(), batchId: governanceId.optional(),
        page: z.coerce.number().int().min(1).max(1000).default(1) }).strict().parse(req.query);
      return res.json(await governance().reviews(input));
    }));
    router.post('/records/:recordId/assignment', asyncHandler(async (req, res) => {
      const input = z.object({ assigneeId: governanceId, dueAt: z.string().datetime(), expectedVersion: z.number().int().min(0), reason: reasonField }).strict().parse(req.body);
      return res.json(await governance().assign({ ...input, recordId: governanceId.parse(req.params.recordId) }, commandContext(req)));
    }));
    router.post('/records/:recordId/claim', asyncHandler(async (req, res) => {
      const input = z.object({ expectedVersion: z.number().int().min(1), reason: reasonField }).strict().parse(req.body);
      return res.json(await governance().claim({ ...input, recordId: governanceId.parse(req.params.recordId) }, commandContext(req)));
    }));
    router.post('/records/:recordId/release', asyncHandler(async (req, res) => {
      const input = z.object({ expectedVersion: z.number().int().min(1), reason: reasonField }).strict().parse(req.body);
      return res.json(await governance().release({ ...input, recordId: governanceId.parse(req.params.recordId) }, commandContext(req)));
    }));
    router.post('/records/:recordId/reconcile-receipt', asyncHandler(async (req, res) => {
      const input = z.object({ expectedUpdatedAt: z.string().datetime(), reason: reasonField }).strict().parse(req.body);
      return res.json(await governance().reconcile({ ...input, recordId: governanceId.parse(req.params.recordId) }, commandContext(req)));
    }));
    router.get('/sources/:sourceId/observation', asyncHandler(async (req, res) => res.json({ data: await governance().observation(governanceId.parse(req.params.sourceId)) })));
    router.post('/sources/:sourceId/drift-decision', asyncHandler(async (req, res) => {
      const input = z.object({ expectedUpdatedAt: z.string().datetime(), decision: z.enum(['ACCEPT','REJECT']), reason: reasonField }).strict().parse(req.body);
      return res.json(await governance().decideDrift({ ...input, sourceId: governanceId.parse(req.params.sourceId) }, commandContext(req)));
    }));
    router.post('/sources/:sourceId/fallback', asyncHandler(async (req, res) => {
      const input = z.object({ fallbackSourceId: governanceId.nullable(), sourceRevision: z.string().datetime(),
        fallbackSourceRevision: z.string().datetime().optional(), reason: reasonField }).strict().parse(req.body);
      return res.json(await governance().fallback({ ...input, sourceId: governanceId.parse(req.params.sourceId) }, commandContext(req)));
    }));
    router.get('/batches/:batchId/counters', asyncHandler(async (req, res) => res.json(await governance().counters(governanceId.parse(req.params.batchId)))));
    router.post('/batches/:batchId/recover', asyncHandler(async (req, res) => {
      const input = z.object({ expectedUpdatedAt: z.string().datetime(), decision: z.enum(['QUEUE','REJECT']), reason: reasonField }).strict().parse(req.body);
      return res.json(await governance().recover({ ...input, batchId: governanceId.parse(req.params.batchId) }, commandContext(req)));
    }));
    router.post('/batches/:batchId/retention-policy', asyncHandler(async (req, res) => {
      const input = z.object({ expectedUpdatedAt: z.string().datetime(), days: z.number().int().min(30).max(3650), reason: reasonField }).strict().parse(req.body);
      return res.json(await governance().retention({ ...input, batchId: governanceId.parse(req.params.batchId) }, commandContext(req)));
    }));

    const sourceIdentifier = z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
    const sourceFields = { sourceId: sourceIdentifier, displayName: z.string().trim().min(1).max(240),
      baseUrl: z.string().url().max(2000), category: z.nativeEnum(SourceConnectorCategory),
      accessClassification: z.nativeEnum(SourceAccessClassification), connectorId: z.string().min(1).max(120),
      connectorVersion: z.string().min(1).max(120), rateLimitPerMinute: z.number().int().min(1).max(60000),
      robotsPolicyUrl: z.string().url().max(2000).optional(), allowedPathPrefixes: z.array(z.string().min(1).max(500)).max(20),
      reason: z.string().trim().min(3).max(1000) };
    router.get('/sources/connectors', asyncHandler(async (_req, res) => {
      if (!cradle.importSourceControlUseCases) return res.status(503).json({ error: 'IMPORT_SOURCE_CONTROL_UNAVAILABLE' });
      return res.json({ data: cradle.importSourceControlUseCases.capabilities() });
    }));
    router.get('/sources/:sourceId', asyncHandler(async (req, res) => {
      if (!cradle.importSourceControlUseCases) return res.status(503).json({ error: 'IMPORT_SOURCE_CONTROL_UNAVAILABLE' });
      const source = await cradle.importSourceControlUseCases.get(sourceIdentifier.parse(req.params.sourceId));
      if (!source) return res.status(404).json({ error: 'IMPORT_SOURCE_NOT_FOUND' });
      return res.json({ data: source });
    }));
    router.post('/sources/:sourceId/test', asyncHandler(async (req, res) => {
      actor(req);
      z.object({}).strict().parse(req.body ?? {});
      if (!cradle.importSourceControlUseCases) return res.status(503).json({ error: 'IMPORT_SOURCE_CONTROL_UNAVAILABLE' });
      return res.json(await cradle.importSourceControlUseCases.testConfiguration(sourceIdentifier.parse(req.params.sourceId)));
    }));
    router.post('/sources/:sourceId/run', asyncHandler(async (req, res) => {
      if (!cradle.importSourceControlUseCases) return res.status(503).json({ error: 'IMPORT_SOURCE_CONTROL_UNAVAILABLE' });
      const principal = actor(req);
      const input = z.object({ expectedUpdatedAt: z.string().datetime(), ownerDomain: z.nativeEnum(ImportTargetDomain),
        format: z.enum(['csv', 'ndjson', 'json']), reason: z.string().trim().min(3).max(1000),
        mappingProfileId: z.string().uuid().optional(), useApprovedFallback: z.boolean().optional() }).strict().parse(req.body);
      const result = await cradle.importSourceControlUseCases.run(sourceIdentifier.parse(req.params.sourceId), input,
        { actorId: principal.principalId, actorType: principal.actorType, source: 'admin-import-source-run' });
      res.setHeader('Location', `/api/v1/admin/imports/queue/jobs/${encodeURIComponent(result.batchId)}`);
      return res.status(202).json(result);
    }));
    const saveSource = async (req: Request, res: Response, update: boolean) => {
      if (!cradle.importSourceControlUseCases) return res.status(503).json({ error: 'IMPORT_SOURCE_CONTROL_UNAVAILABLE' });
      const body = z.object({ ...sourceFields,
        ...(update ? { expectedUpdatedAt: z.string().datetime() } : {}) }).strict().parse(req.body);
      if (update && sourceIdentifier.parse(req.params.sourceId) !== body.sourceId)
        return res.status(400).json({ error: 'IMPORT_SOURCE_ID_MISMATCH' });
      const { reason, ...definition } = body;
      const principal = actor(req);
      try {
        const source = await cradle.importSourceControlUseCases.save(definition,
          update ? String((body as { expectedUpdatedAt?: string }).expectedUpdatedAt) : null, reason,
          { actorId: principal.principalId, actorType: principal.actorType, source: 'admin-import-source-api' });
        return res.status(update ? 200 : 201).json({ data: source });
      } catch (error) {
        if (error instanceof Error && error.message === 'IMPORT_SOURCE_STATUS_CONFLICT')
          return res.status(409).json({ error: error.message });
        if (error instanceof Error && error.message === 'IMPORT_SOURCE_OWNER_WORKSPACE_REQUIRED')
          return res.status(403).json({ error: error.message });
        throw error;
      }
    };
    router.post('/sources', asyncHandler(async (req, res) => saveSource(req, res, false)));
    router.put('/sources/:sourceId', asyncHandler(async (req, res) => saveSource(req, res, true)));

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
      DOCTORATE: 'doctorate_specialties_DOC-0001_to_DOC-0010.md',
      FELLOWSHIP: 'fellowships_FEL-0001_to_FEL-0010.md',
    } as const;
    const MAJOR_DETAIL_SUBDIRS = {
      BACHELOR: 'bachelor',
      MASTER: 'master',
      DOCTORATE: 'doctorate',
      FELLOWSHIP: '',
    } as const;

    const majorCatalogKindSchema = z.enum(['BACHELOR', 'MASTER', 'DOCTORATE', 'FELLOWSHIP']);

    const importBodySchema = z
      .object({
        dataText: z
          .string()
          .min(1, 'Import text or CSV content is required')
          .refine(
            (value) => Buffer.byteLength(value, 'utf8') <= INLINE_IMPORT_MAX_LENGTH,
            'Import payload is too large. Large imports must use /admin/imports/artifacts with a verified EAP asset. Inline dataText is only for small/manual imports.',
          ),
        sourceSystem: z.string().trim().min(1).max(120).optional(),
        dataType: z
          .nativeEnum(ImportTargetDomain)
          .or(z.literal('INTERNATIONAL_TESTS'))
          .optional()
          .transform((val) => (val === 'INTERNATIONAL_TESTS' ? ImportTargetDomain.Tests : val)),
      })
      .strict();

    const courseArtifactBodySchema = z
      .object({
        assetId: z.string().trim().min(1),
        sourceSystem: z.string().trim().min(1).optional(),
        expectedSha256: z
          .string()
          .trim()
          .regex(/^[a-f0-9]{64}$/i)
          .optional(),
      })
      .strict();

    const majorCatalogBodySchema = z
      .object({
        dataText: z.string().min(1).optional(),
        catalogKind: majorCatalogKindSchema,
        sourceSystem: z.string().optional(),
        sourceFileName: z.string().optional(),
      })
      .strict()
      .refine((value) => Boolean(value.dataText), {
        message: 'dataText is required for direct catalog import.',
        path: ['dataText'],
      });

    const majorDetailDossierBodySchema = z
      .object({
        dataText: z.string().min(1).optional(),
        catalogKind: majorCatalogKindSchema,
        sourceSystem: z.string().optional(),
        sourceFileName: z.string().optional(),
      })
      .strict()
      .refine((value) => Boolean(value.dataText), {
        message: 'dataText is required for direct detail dossier import.',
        path: ['dataText'],
      });

    const majorTextImportFileSchema = z
      .object({
        dataText: z.string().min(1),
        sourceSystem: z.string().optional(),
        sourceFileName: z.string().optional(),
      })
      .strict();

    const majorMultiFileBodySchema = z
      .object({
        catalogKind: majorCatalogKindSchema,
        sourceSystem: z.string().optional(),
        files: z.array(majorTextImportFileSchema).min(1).max(50),
      })
      .strict();

    // GET /admin/imports/overview - exact server-derived counters for the control plane.
    router.get(
      '/overview',
      asyncHandler(async (req: Request, res: Response) => {
        let dataType = req.query.dataType as string | undefined;
        if (dataType === 'ALL' || !dataType) dataType = undefined;
        if (dataType === 'INTERNATIONAL_TESTS') dataType = ImportTargetDomain.Tests;
        if (dataType && !(Object.values(ImportTargetDomain) as string[]).includes(dataType)) {
          return res
            .status(400)
            .json({ error: 'Validation Error', details: [{ message: 'Invalid dataType filter' }] });
        }
        res.json(await importAdminUseCases.getOverview(dataType ? { dataType } : undefined));
      }),
    );

    // GET /admin/imports/operations - operational diagnostics for queues, retry/DLQ and stuck batches.
    router.get(
      '/operations',
      asyncHandler(async (req: Request, res: Response) => {
        let dataType = req.query.dataType as string | undefined;
        if (dataType === 'ALL' || !dataType) dataType = undefined;
        if (dataType === 'INTERNATIONAL_TESTS') dataType = ImportTargetDomain.Tests;
        if (dataType && !(Object.values(ImportTargetDomain) as string[]).includes(dataType)) {
          return res
            .status(400)
            .json({ error: 'Validation Error', details: [{ message: 'Invalid dataType filter' }] });
        }
        res.json(
          await importAdminUseCases.getOperationalInsights(dataType ? { dataType } : undefined),
        );
      }),
    );

    // GET /admin/imports/capabilities - explicit truth about staging and owning-domain handoff readiness.
    router.get(
      '/capabilities',
      asyncHandler(async (_req: Request, res: Response) => {
        res.json(
          importAdminUseCases.getDomainCapabilities([
            ImportTargetDomain.Scholarships,
            ImportTargetDomain.Universities,
            ImportTargetDomain.Majors,
            ImportTargetDomain.Courses,
            ImportTargetDomain.Tests,
            ImportTargetDomain.Services,
            ImportTargetDomain.Cms,
          ]),
        );
      }),
    );

    // GET /admin/imports/error-report - exact FAILED/DLQ rows for review/export; never mutates records.
    router.get(
      '/error-report',
      asyncHandler(async (req: Request, res: Response) => {
        let dataType = req.query.dataType as string | undefined;
        if (dataType === 'ALL' || !dataType) dataType = undefined;
        if (dataType === 'INTERNATIONAL_TESTS') dataType = ImportTargetDomain.Tests;
        if (dataType && !(Object.values(ImportTargetDomain) as string[]).includes(dataType)) {
          return res
            .status(400)
            .json({ error: 'Validation Error', details: [{ message: 'Invalid dataType filter' }] });
        }
        const limitRaw = Number(req.query.limit ?? 500);
        const limit = Number.isFinite(limitRaw)
          ? Math.min(1000, Math.max(1, Math.trunc(limitRaw)))
          : 500;
        res.json(
          await importAdminUseCases.getErrorReport({
            ...(dataType ? { dataType } : {}),
            ...(typeof req.query.batchId === 'string' && req.query.batchId
              ? { batchId: req.query.batchId }
              : {}),
            limit,
          }),
        );
      }),
    );

    // GET /admin/imports/activity - read-only Import Operations Center audit trail.
    router.get(
      '/activity',
      asyncHandler(async (req: Request, res: Response) => {
        if (!auditRecordRepo?.listRecentImportOperations) {
          return res.status(503).json({ error: 'IMPORT_AUDIT_ACTIVITY_UNAVAILABLE' });
        }
        const limitRaw = Number(req.query.limit ?? 20);
        const limit = Number.isFinite(limitRaw)
          ? Math.min(50, Math.max(1, Math.trunc(limitRaw)))
          : 20;
        res.json({ data: await auditRecordRepo.listRecentImportOperations(limit) });
      }),
    );

    // POST /admin/imports/preflight - parse/deduplicate preview only; no persistence and no publication.
    router.post(
      '/preflight',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = importBodySchema.parse(req.body);
        res.status(200).json(await importAdminUseCases.preflightData(payload));
      }),
    );

    // Real source registry visibility for the generic import control plane.
    router.get(
      '/sources',
      asyncHandler(async (_req: Request, res: Response) => {
        if (!sourceRegistryGateway)
          return res.status(503).json({ error: 'IMPORT_SOURCE_REGISTRY_UNAVAILABLE' });
        res.json({ data: await sourceRegistryGateway.listSources() });
      }),
    );

    const sourceStatusSchema = z.nativeEnum(SourceStatus);
    const sourceStatusUpdateSchema = z
      .object({
        status: sourceStatusSchema,
        reason: z.string().trim().min(3).max(500),
        expectedUpdatedAt: z.string().datetime(),
      })
      .strict();
    const queueReasonSchema = z
      .object({ reason: z.string().trim().min(1).max(1000).optional() })
      .strict();
    const queueReplaySchema = z.object({ fromCheckpoint: z.boolean().optional() }).strict();
    const emptyQueueCommandSchema = z.object({}).strict();
    router.patch(
      '/sources/:sourceId/status',
      asyncHandler(async (req: Request, res: Response) => {
        if (!cradle.importSourceControlUseCases)
          return res.status(503).json({ error: 'IMPORT_SOURCE_CONTROL_UNAVAILABLE' });
        const { status, reason, expectedUpdatedAt } = sourceStatusUpdateSchema.parse(req.body);
        const principal = actor(req);
        const source = await cradle.importSourceControlUseCases.changeStatus(sourceIdentifier.parse(req.params.sourceId),
          status, expectedUpdatedAt, reason, { actorId: principal.principalId,
            actorType: principal.actorType, source: 'admin-import-source-status' });
        res.json({ data: source });
      }),
    );

    // POST /admin/imports
    router.post(
      '/',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = importBodySchema.parse(req.body);
        const result = await importAdminUseCases.importData(payload);
        res.status(201).json(result);
      }),
    );

    router.post(
      '/courses/preflight',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = courseArtifactBodySchema.parse(req.body);
        const result = await courseImportArtifactUseCase.preflight(payload);
        res.status(200).json(result);
      }),
    );

    router.post(
      '/courses/stage',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = courseArtifactBodySchema.parse(req.body);
        const result = await courseImportArtifactUseCase.stage(payload);
        res.status(result.duplicateArtifact ? 200 : 201).json(result);
      }),
    );

    router.post(
      '/major-catalogs',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = majorCatalogBodySchema.parse(req.body);
        const result = await majorImportStagingUseCase.importMajorCatalogText({
          dataText: payload.dataText ?? '',
          catalogKind: payload.catalogKind,
          sourceSystem: payload.sourceSystem,
          sourceFileName: payload.sourceFileName,
        });
        res.status(201).json(result);
      }),
    );

    router.post(
      '/major-catalogs/preview',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = majorCatalogBodySchema.parse(req.body);
        const result = majorImportStagingUseCase.previewMajorCatalogText({
          dataText: payload.dataText ?? '',
          catalogKind: payload.catalogKind,
          sourceFileName: payload.sourceFileName,
        });
        res.status(200).json(result);
      }),
    );

    router.post(
      '/major-catalogs/bulk',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = majorMultiFileBodySchema.parse(req.body);
        const result = await majorImportStagingUseCase.importMajorCatalogFiles({
          catalogKind: payload.catalogKind,
          sourceSystem: payload.sourceSystem,
          files: payload.files,
        });
        res.status(201).json(result);
      }),
    );

    router.post(
      '/major-catalogs/bulk/preview',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = majorMultiFileBodySchema.parse(req.body);
        const result = majorImportStagingUseCase.previewMajorCatalogFiles({
          catalogKind: payload.catalogKind,
          sourceSystem: payload.sourceSystem,
          files: payload.files,
        });
        res.status(200).json(result);
      }),
    );

    router.post(
      '/major-catalogs/workspace/:catalogKind',
      asyncHandler(async (req: Request, res: Response) => {
        const catalogKind = majorCatalogKindSchema.parse(req.params.catalogKind);
        const sourceFileName = MAJOR_CATALOG_FILES[catalogKind];
        const catalogPath = path.resolve(
          process.cwd(),
          'workspace',
          'phase-10-major-catalogs',
          sourceFileName,
        );
        const dataText = await readFile(catalogPath, 'utf8');

        const result = await majorImportStagingUseCase.importMajorCatalogText({
          dataText,
          catalogKind,
          sourceSystem: `PHASE_10_${catalogKind}_CATALOG`,
          sourceFileName,
        });
        res.status(201).json(result);
      }),
    );

    router.get(
      '/major-catalogs/workspace/:catalogKind/preview',
      asyncHandler(async (req: Request, res: Response) => {
        const catalogKind = majorCatalogKindSchema.parse(req.params.catalogKind);
        const sourceFileName = MAJOR_CATALOG_FILES[catalogKind];
        const catalogPath = path.resolve(
          process.cwd(),
          'workspace',
          'phase-10-major-catalogs',
          sourceFileName,
        );
        const dataText = await readFile(catalogPath, 'utf8');

        const result = majorImportStagingUseCase.previewMajorCatalogText({
          dataText,
          catalogKind,
          sourceFileName,
        });
        res.status(200).json(result);
      }),
    );

    router.post(
      '/major-detail-dossiers',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = majorDetailDossierBodySchema.parse(req.body);
        const result = await majorImportStagingUseCase.importMajorDetailDossierText({
          dataText: payload.dataText ?? '',
          catalogKind: payload.catalogKind,
          sourceSystem: payload.sourceSystem,
          sourceFileName: payload.sourceFileName,
        });
        res.status(201).json(result);
      }),
    );

    router.post(
      '/major-detail-dossiers/preview',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = majorDetailDossierBodySchema.parse(req.body);
        const result = majorImportStagingUseCase.previewMajorDetailDossierText({
          dataText: payload.dataText ?? '',
          catalogKind: payload.catalogKind,
          sourceFileName: payload.sourceFileName,
        });
        res.status(200).json(result);
      }),
    );

    router.post(
      '/major-detail-dossiers/bulk',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = majorMultiFileBodySchema.parse(req.body);
        const result = await majorImportStagingUseCase.importMajorDetailDossierFiles({
          catalogKind: payload.catalogKind,
          sourceSystem: payload.sourceSystem,
          files: payload.files,
        });
        res.status(201).json(result);
      }),
    );

    router.post(
      '/major-detail-dossiers/bulk/preview',
      asyncHandler(async (req: Request, res: Response) => {
        const payload = majorMultiFileBodySchema.parse(req.body);
        const result = majorImportStagingUseCase.previewMajorDetailDossierFiles({
          catalogKind: payload.catalogKind,
          sourceSystem: payload.sourceSystem,
          files: payload.files,
        });
        res.status(200).json(result);
      }),
    );

    router.post(
      '/major-detail-dossiers/workspace/:catalogKind',
      asyncHandler(async (req: Request, res: Response) => {
        const catalogKind = majorCatalogKindSchema.parse(req.params.catalogKind);
        const sourceFileName = MAJOR_DETAIL_DOSSIER_FILES[catalogKind];
        const subDir = MAJOR_DETAIL_SUBDIRS[catalogKind] || '';
        const dossierPath = path.resolve(
          process.cwd(),
          'workspace',
          'phase-10-major-detail-dossiers',
          subDir,
          sourceFileName,
        );
        const dataText = await readFile(dossierPath, 'utf8');

        const result = await majorImportStagingUseCase.importMajorDetailDossierText({
          dataText,
          catalogKind,
          sourceSystem: `PHASE_10_${catalogKind}_DETAIL_DOSSIER`,
          sourceFileName,
        });
        res.status(201).json(result);
      }),
    );

    router.get(
      '/major-detail-dossiers/workspace/:catalogKind/preview',
      asyncHandler(async (req: Request, res: Response) => {
        const catalogKind = majorCatalogKindSchema.parse(req.params.catalogKind);
        const sourceFileName = MAJOR_DETAIL_DOSSIER_FILES[catalogKind];
        const subDir = MAJOR_DETAIL_SUBDIRS[catalogKind] || '';
        const dossierPath = path.resolve(
          process.cwd(),
          'workspace',
          'phase-10-major-detail-dossiers',
          subDir,
          sourceFileName,
        );
        const dataText = await readFile(dossierPath, 'utf8');

        const result = majorImportStagingUseCase.previewMajorDetailDossierText({
          dataText,
          catalogKind,
          sourceFileName,
        });
        res.status(200).json(result);
      }),
    );

    router.get('/batches/:batchId/diff', asyncHandler(async (req, res) => {
      const query = z.object({ againstBatchId: z.string().trim().min(1).max(180),
        page: z.coerce.number().int().min(1).max(50).optional(), cursor: z.string().min(1).max(1024).optional() }).strict().parse(req.query);
      return res.json(await importAdminUseCases.compareBatches(z.string().trim().min(1).max(180).parse(req.params.batchId),
        query.againstBatchId, query.page, query.cursor));
    }));

    // GET /admin/imports/queue/jobs/:batchId/handoffs/reconciliation
    // Operational read-only evidence. Never exposes imported payloads or
    // performs owner replay, manual release, canonical merge or publication.
    router.get(
      '/queue/jobs/:batchId/handoffs/reconciliation',
      asyncHandler(async (req: Request, res: Response) => {
        const batchId = z.string().trim().min(1).max(180).parse(req.params.batchId);
        const filters = z.object({
          page: z.coerce.number().int().min(1).optional(),
          pageSize: z.coerce.number().int().min(1).max(100).optional(),
        }).strict().parse(req.query);
        try {
          const result = await importAdminUseCases.getHandoffReconciliation({ batchId, ...filters });
          res.status(200).json(result);
        } catch (error) {
          if (error instanceof Error && error.message === 'IMPORT_RECONCILIATION_READER_UNAVAILABLE') {
            return res.status(503).json({ error: 'IMPORT_RECONCILIATION_READER_UNAVAILABLE' });
          }
          throw error;
        }
      }),
    );

    // GET /admin/imports/queue/jobs/:batchId
    router.get(
      '/queue/jobs/:batchId',
      asyncHandler(async (req: Request, res: Response) => {
        const batchId = req.params.batchId;
        const status = await importAdminUseCases.getQueueJobStatus(batchId);
        if (!status) {
          return res
            .status(404)
            .json({ error: `Queue job status not found for batchId: ${batchId}` });
        }
        res.json(status);
      }),
    );

    // POST /admin/imports/queue/jobs/:batchId/pause
    router.post(
      '/queue/jobs/:batchId/pause',
      asyncHandler(async (req: Request, res: Response) => {
        const batchId = req.params.batchId;
        const { reason } = queueReasonSchema.parse(req.body ?? {});
        const success = await importAdminUseCases.pauseQueueJob(batchId, reason);
        if (!success) {
          return res
            .status(409)
            .json({
              error: 'Queue job action is not valid for current state or job does not exist.',
            });
        }
        res.json({ status: 'ok', action: 'pause', batchId });
      }),
    );

    // POST /admin/imports/queue/jobs/:batchId/resume
    router.post(
      '/queue/jobs/:batchId/resume',
      asyncHandler(async (req: Request, res: Response) => {
        const batchId = req.params.batchId;
        emptyQueueCommandSchema.parse(req.body ?? {});
        const success = await importAdminUseCases.resumeQueueJob(batchId);
        if (!success) {
          return res
            .status(409)
            .json({
              error: 'Queue job action is not valid for current state or job does not exist.',
            });
        }
        res.json({ status: 'ok', action: 'resume', batchId });
      }),
    );

    // POST /admin/imports/queue/jobs/:batchId/cancel
    router.post(
      '/queue/jobs/:batchId/cancel',
      asyncHandler(async (req: Request, res: Response) => {
        const batchId = req.params.batchId;
        const { reason } = queueReasonSchema.parse(req.body ?? {});
        const success = await importAdminUseCases.cancelQueueJob(batchId, reason);
        if (!success) {
          return res
            .status(409)
            .json({
              error: 'Queue job action is not valid for current state or job does not exist.',
            });
        }
        res.json({ status: 'ok', action: 'cancel', batchId });
      }),
    );

    // POST /admin/imports/queue/jobs/:batchId/replay
    router.post(
      '/queue/jobs/:batchId/replay',
      asyncHandler(async (req: Request, res: Response) => {
        const batchId = req.params.batchId;
        const { fromCheckpoint } = queueReplaySchema.parse(req.body ?? {});
        const success = await importAdminUseCases.replayQueueJob(batchId, fromCheckpoint);
        if (!success) {
          return res
            .status(409)
            .json({
              error: 'Queue job action is not valid for current state or job does not exist.',
            });
        }
        res.json({ status: 'ok', action: 'replay', batchId });
      }),
    );

    // GET /admin/imports/batches
    router.get(
      '/batches',
      asyncHandler(async (req: Request, res: Response) => {
        let dataTypeFilter =
          req.query.dataType === 'ALL' || !req.query.dataType
            ? undefined
            : (req.query.dataType as string);
        if (dataTypeFilter === 'INTERNATIONAL_TESTS') {
          dataTypeFilter = ImportTargetDomain.Tests;
        }

        if (
          dataTypeFilter &&
          !(Object.values(ImportTargetDomain) as string[]).includes(dataTypeFilter)
        ) {
          return res
            .status(400)
            .json({ error: 'Validation Error', details: [{ message: 'Invalid dataType filter' }] });
        }

        const batches = await importAdminUseCases.listBatches(
          dataTypeFilter ? { dataType: dataTypeFilter } : {},
        );
        res.json(batches);
      }),
    );

    // GET /admin/imports/records
    router.get(
      '/records',
      asyncHandler(async (req: Request, res: Response) => {
        const batchId = req.query.batchId as string;
        const status =
          typeof req.query.status === 'string' &&
          req.query.status !== 'ALL' &&
          req.query.status.trim()
            ? req.query.status.trim()
            : undefined;

        let dataTypeFilter =
          req.query.dataType === 'ALL' || !req.query.dataType
            ? undefined
            : (req.query.dataType as string);
        if (dataTypeFilter === 'INTERNATIONAL_TESTS') {
          dataTypeFilter = ImportTargetDomain.Tests;
        }

        if (
          dataTypeFilter &&
          !(Object.values(ImportTargetDomain) as string[]).includes(dataTypeFilter)
        ) {
          return res
            .status(400)
            .json({ error: 'Validation Error', details: [{ message: 'Invalid dataType filter' }] });
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
      }),
    );

    const phase6PromotionDisabled = {
      error: 'PHASE6_DOMAIN_PROMOTION_DISABLED',
      message:
        'Import Foundation owns source acquisition, parsing, normalization, validation, staging, execution and handoff only. Semantic promotion belongs to the owning domain.',
      nextAction:
        'Open the owning domain workspace or its dedicated import workflow after domain review.',
    };

    // Legacy compatibility endpoints. They intentionally never mutate canonical domain records.
    router.post(
      '/records/:id/promote',
      asyncHandler(async (_req: Request, res: Response) => {
        res.status(422).json(phase6PromotionDisabled);
      }),
    );

    router.post(
      '/batches/:id/promote',
      asyncHandler(async (_req: Request, res: Response) => {
        res.status(422).json(phase6PromotionDisabled);
      }),
    );

    // POST /admin/imports/records/:id/transfer
    router.post(
      '/records/:id/transfer',
      asyncHandler(async (_req: Request, res: Response) => {
        res.status(422).json(phase6PromotionDisabled);
      }),
    );

    // POST /admin/imports/batches/:id/transfer
    router.post(
      '/batches/:id/transfer',
      asyncHandler(async (_req: Request, res: Response) => {
        res.status(422).json(phase6PromotionDisabled);
      }),
    );

    router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof Error && /^(IMPORT_GOVERNANCE_UNAVAILABLE|IMPORT_TIMELINE_UNAVAILABLE|SOURCE_DISTRIBUTED_BUDGET_BUSY)$/.test(err.message))
        return res.status(503).json({ error: err.message, code: err.message, retryable: true });
      if (err instanceof Error && /^(IMPORT_[A-Z0-9_]*(CONFLICT|EVIDENCE_REQUIRED|REVIEW_REQUIRED|NOT_READY)|IMPORT_RECEIPT_NOT_FOUND)$/.test(err.message))
        return res.status(409).json({ error: err.message, code: err.message, retryable: false });
      if (err instanceof Error && /^(SOURCE_ACCESS_SIGNED_APPROVAL_REQUIRED|SOURCE_ACCESS_APPROVAL_SCOPE_MISMATCH|SOURCE_ACCOUNT_CREDENTIAL_REQUIRED|SOURCE_ROBOTS_[A-Z_]+|IMPORT_REVIEWER_AUTHORITY_REQUIRED|IMPORT_FALLBACK_APPROVAL_REQUIRED)$/.test(err.message))
        return res.status(403).json({ error: err.message, code: err.message, retryable: false });
      if (err instanceof Error && err.message === 'IMPORT_ARTIFACT_SPOOL_CAPACITY')
        return res.status(503).json({ error: err.message, code: err.message, retryable: true });
      if (err instanceof Error && ['IMPORT_SOURCE_STATUS_CONFLICT', 'IMPORT_SOURCE_STAGING_BUSY', 'IMPORT_STAGING_LEASE_LOST', 'IMPORT_BATCH_DIFF_VERSION_CONFLICT'].includes(err.message))
        return res.status(409).json({ error: err.message, code: err.message });
      if (err instanceof Error && err.message === 'IMPORT_SOURCE_NOT_FOUND')
        return res.status(404).json({ error: err.message, code: err.message });
      if (err instanceof Error && /^(IMPORT_SOURCE_OWNER_WORKSPACE_REQUIRED|SOURCE_ACCESS_BLOCKED|SOURCE_(ROBOTS_POLICY_DECISION|AUTHORIZED_ACCOUNT_CAPABILITY|DATA_AGREEMENT_APPROVAL)_REQUIRED)$/.test(err.message))
        return res.status(403).json({ error: err.message, code: err.message });
      if (err instanceof Error && err.message === 'AUTHENTICATED_PRINCIPAL_REQUIRED')
        return res.status(401).json({ error: err.message });
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT')
        return res.status(404).json({ error: 'IMPORT_SOURCE_FILE_NOT_FOUND' });
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      const code = err instanceof Error && /^(IMPORT|SOURCE)_[A-Z0-9_]{1,120}$/.test(err.message) ? err.message : 'IMPORT_REQUEST_FAILED';
      res.status(400).json({ error: code, code, retryable: false });
    });

    return router;
  }
}
