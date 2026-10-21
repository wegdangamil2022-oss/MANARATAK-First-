import {readCertificateArtifact} from '@manaratak/application';
import type {StudentDocumentUploadUseCases,StudentDocumentReviewUseCases} from '@manaratak/application';
import { Router, Request, Response, NextFunction } from 'express';
import { careerStudentRouter } from './CareerStudentRouter.js';
import { CareerEngagementUseCases } from '@manaratak/application';
import { z } from 'zod';
import { IPrincipalAccessValidator, ISessionManager, ITokenProvider } from '@manaratak/core';
import { ServiceOperationsUseCases, FinancePlatformUseCases, FinanceStudentUseCases, StudentWorkspaceUseCases, StudentApplicationTrackerUseCases, StudentSavedItemHydrationService, StudentDashboardHydrationService, StudentServiceRequestUseCases, ProcessAssetLifecycleUseCase, CertificateReadModelService } from '@manaratak/application';
import { AssetId, AssetLifecycleState, IAssetRecordRepository, ServiceRequestStatus, StudentSavedItemType } from '@manaratak/domain';
import { AuthMiddleware } from '../../middleware/AuthMiddleware.js';
import { createStudentRoleGuard } from '../../security/StudentRoleGuard.js';
import type { IRoleAssignmentRepository } from '@manaratak/domain';
import { createCanonicalIdempotencyMiddleware } from '../../middleware/CanonicalIdempotencyMiddleware.js';
import type { PrismaApiIdempotencyStore } from '@manaratak/infrastructure';

export class StudentWorkspaceRouter {
  public static create(cradle: {
    studentDocumentUploadUseCases?:StudentDocumentUploadUseCases;
    studentDocumentReviewUseCases?:StudentDocumentReviewUseCases;
    careerEngagementUseCases: CareerEngagementUseCases;
    certificateReadModelService: CertificateReadModelService;
    studentWorkspaceUseCases: StudentWorkspaceUseCases;
    roleAssignmentRepository: IRoleAssignmentRepository;
    studentApplicationTrackerUseCases: StudentApplicationTrackerUseCases;
    financeStudentUseCases: FinanceStudentUseCases;
    financePlatformUseCases: FinancePlatformUseCases;
    studentSavedItemHydrationService: StudentSavedItemHydrationService;
    studentDashboardHydrationService: StudentDashboardHydrationService;
    studentServiceRequestUseCases: StudentServiceRequestUseCases;
    serviceOperationsUseCases?: ServiceOperationsUseCases;
    tokenProvider: ITokenProvider;
    sessionManager: ISessionManager;
    principalAccessValidator: IPrincipalAccessValidator;
    apiIdempotencyStore: PrismaApiIdempotencyStore;
    assetRecordRepository: IAssetRecordRepository & { queryAdmin(input: any): Promise<{ items: any[]; nextCursor: string | null; hasMore: boolean }> };
    processAssetLifecycleUseCase: ProcessAssetLifecycleUseCase;
  }): Router {
    const router = Router();
    const {
      studentWorkspaceUseCases,
      studentApplicationTrackerUseCases,
      financeStudentUseCases,
      financePlatformUseCases,
      studentSavedItemHydrationService,
      studentDashboardHydrationService,
      studentServiceRequestUseCases,
      tokenProvider,
      sessionManager,
      principalAccessValidator,
      apiIdempotencyStore,
      assetRecordRepository,
      processAssetLifecycleUseCase,
    } = cradle;

    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

    const workspaceSchema = z.object({
      expectedVersion: z.number().int().positive(),
      displayName: z.string().nullable().optional(),
      preferredLanguage: z.string().nullable().optional(),
      timezone: z.string().nullable().optional(),
      theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).nullable().optional(),
      avatarAssetId: z.string().nullable().optional(),
      layoutPreferences: z.record(z.string(), z.unknown()).nullable().optional(),
      notificationMatrix: z
        .object({
          inApp: z.boolean(),
          email: z.boolean(),
          push: z.boolean(),
          learning: z.boolean(),
          certificates: z.boolean(),
          scholarships: z.boolean(),
          payments: z.boolean(),
        })
        .nullable()
        .optional(),
      accessibilityPreferences: z
        .object({
          textScale: z.enum(['SMALL', 'DEFAULT', 'LARGE']),
          reduceMotion: z.boolean(),
          highContrast: z.boolean(),
        })
        .nullable()
        .optional(),
      metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    }).strict(); // privacyPreferences is intentionally rejected; use PUT /student/privacy-consent.

    const privacyConsentSchema = z.object({
      expectedVersion: z.number().int().positive(),
      purpose: z.string().trim().min(1).max(200),
      privacyPreferences: z.object({
        retainSearchHistory: z.boolean(),
        allowPersonalization: z.boolean(),
        allowProductAnalytics: z.boolean(),
        publicProfileEnabled: z.boolean(),
      }),
    });

    const savedItemSchema = z.object({
      entityType: z.nativeEnum(StudentSavedItemType),
      entityId: z.string().min(1),
      collectionId: z.string().uuid().nullable().optional(),
      entitySlug: z.string().nullable().optional(),
      displayName: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    });

    const applicationTrackerCreateSchema = z.object({
      cycleId: z.string().trim().min(1).max(160).optional(),
      scholarshipId: z.string().trim().min(1), scholarshipSlug: z.string().trim().min(1).nullable().optional(),
      stage: z.string().trim().min(1).max(80).optional(), notes: z.string().trim().max(2000).nullable().optional(),
      deadlineAt: z.coerce.date().nullable().optional(), checklistLabels: z.array(z.string().trim().min(1).max(240)).max(25).optional(),
    }).strict();
    const applicationTrackerUpdateSchema = z.object({
      expectedVersion: z.number().int().positive(), stage: z.string().trim().min(1).max(80).optional(),
      notes: z.string().trim().max(2000).nullable().optional(), deadlineAt: z.coerce.date().nullable().optional(),
    }).strict();
    const applicationChecklistUpdateSchema = z.object({ expectedVersion: z.number().int().positive(), completed: z.boolean() }).strict();
    const applicationArchiveSchema = z.object({ expectedVersion: z.number().int().positive() }).strict();

    const collectionSchema = z.object({
      name: z.string().trim().min(1).max(80),
      description: z.string().trim().max(240).nullable().optional(),
      color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .nullable()
        .optional(),
      icon: z.string().trim().max(40).nullable().optional(),
    }).strict();

    router.use(new AuthMiddleware(tokenProvider, sessionManager, principalAccessValidator).generate());
    router.use(createStudentRoleGuard(cradle.roleAssignmentRepository));
    router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
    router.use(createCanonicalIdempotencyMiddleware({ store: apiIdempotencyStore, requireKey: true }));
    const ownStudent = (req: Request): string => {
      if (!req.authUserId) throw new Error('STUDENT_AUTHENTICATION_REQUIRED');
      return req.authUserId;
    };


    const ownStudentPath = (req: Request): string => {
      const studentReferenceId = ownStudent(req);
      if (req.params.studentReferenceId && req.params.studentReferenceId !== studentReferenceId) {
        throw new Error('STUDENT_ROUTE_OWNERSHIP_MISMATCH');
      }
      return studentReferenceId;
    };
    const assetDeliveryGrantSchema = z.object({
      expiresInSeconds: z.number().int().min(30).max(600).optional(),
    }).strict();

    const paymentAttemptSchema = z.object({
      amount: z.object({
        amountMinorUnits: z.string().regex(/^\d+$/),
        currencyCode: z.string().regex(/^[A-Z]{3}$/),
        scale: z.number().int().min(0).max(6),
      }),
      paymentMethodToken: z.string().trim().min(1).max(512),
      gatewayProvider: z.string().trim().min(1).max(80),
    }).strict();

    router.post('/document-uploads',asyncHandler(async(req:Request,res:Response)=>{
      if(!cradle.studentDocumentUploadUseCases)return void res.status(503).json({error:'DOCUMENT_UPLOAD_UNAVAILABLE'});
      const body=z.object({originalFilename:z.string().trim().min(1).max(240),mimeType:z.enum(['application/pdf','image/jpeg','image/png']),byteSize:z.number().int().positive().max(10*1024*1024),consent:z.literal(true)}).strict().parse(req.body);
      res.setHeader('Cache-Control','no-store');res.status(201).json({data:await cradle.studentDocumentUploadUseCases.allocate(ownStudent(req),body)});
    }));
    router.post('/document-uploads/:assetId/complete',asyncHandler(async(req:Request,res:Response)=>{
      if(!cradle.studentDocumentUploadUseCases)return void res.status(503).json({error:'DOCUMENT_UPLOAD_UNAVAILABLE'});
      z.object({}).strict().parse(req.body??{});res.setHeader('Cache-Control','no-store');res.json({data:await cradle.studentDocumentUploadUseCases.complete(ownStudent(req),z.string().uuid().parse(req.params.assetId))});
    }));
    router.put('/application-trackers/:trackerId/documents/:requirementId/review-consent',asyncHandler(async(req:Request,res:Response)=>{
      if(!cradle.studentDocumentReviewUseCases)return void res.status(503).json({error:'DOCUMENT_REVIEW_UNAVAILABLE'});
      const body=z.object({expectedVersion:z.number().int().positive(),granted:z.boolean()}).strict().parse(req.body);
      res.setHeader('Cache-Control','no-store');await cradle.studentDocumentReviewUseCases.consent(ownStudent(req),req.params.trackerId,req.params.requirementId,body.expectedVersion,body.granted);res.status(204).send();
    }));
    router.get(
      '/assets',
      asyncHandler(async (req: Request, res: Response) => {
        const ownerId = ownStudent(req);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50) || 50));
        const result = await assetRecordRepository.queryAdmin({
          lifecycleState: AssetLifecycleState.ACTIVE,
          ownerType: 'STUDENT',
          ownerId,
          mimeTypePrefix: typeof req.query.mimeTypePrefix === 'string' ? req.query.mimeTypePrefix : 'image/',
          limit,
          cursor: typeof req.query.cursor === 'string' ? req.query.cursor : undefined,
        });
        res.json(result);
      }),
    );
    router.get('/certificates',asyncHandler(async(req:Request,res:Response)=>{
      const {cursor}=z.object({cursor:z.string().uuid().optional()}).strict().parse(req.query);
      const data=await cradle.certificateReadModelService.listForStudent(ownStudent(req),cursor);
      res.json({data,nextCursor:data.length===50 ? data[data.length-1].certificateId : null});
    }));
    router.get('/certificates/:certificateId/artifacts/:kind/content', asyncHandler(async (req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-store');
      const ownerId = ownStudent(req), kind = z.enum(['pdf', 'preview']).parse(req.params.kind);
      const content = await readCertificateArtifact(kind,
        () => cradle.certificateReadModelService.deliveryArtifact(req.params.certificateId, kind, ownerId),
        processAssetLifecycleUseCase);
      res.setHeader('Content-Type', content.mimeType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', kind === 'pdf' ? 'attachment; filename="certificate.pdf"' : 'inline; filename="preview"');
      res.send(Buffer.from(content.bytes));
    }));
    router.post('/certificates/:certificateId/artifacts/:kind/delivery-grant', asyncHandler(async (req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-store');
      const kind = z.enum(['pdf', 'preview']).parse(req.params.kind);
      await cradle.certificateReadModelService.deliveryArtifact(req.params.certificateId, kind, ownStudent(req));
      res.status(410).json({error: 'CERTIFICATE_AUTHENTICATED_DELIVERY_REQUIRED'});
    }));

    router.post(
      '/assets/:assetId/delivery-grant',
      asyncHandler(async (req: Request, res: Response) => {
        const ownerId = ownStudent(req);
        const asset = await assetRecordRepository.findById(new AssetId(req.params.assetId));
        if (!asset) return void res.status(404).json({ error: 'ASSET_NOT_FOUND' });
        if (asset.owner.ownerType !== 'STUDENT' || asset.owner.ownerId !== ownerId) {
          return void res.status(404).json({ error: 'ASSET_NOT_FOUND' });
        }
        const { expiresInSeconds } = assetDeliveryGrantSchema.parse(req.body ?? {});
        res.json(await processAssetLifecycleUseCase.requestDeliveryGrant({
          assetId: req.params.assetId,
          expiresInSeconds: expiresInSeconds ?? 300,
        }));
      }),
    );

    router.get(
      '/workspace',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await studentWorkspaceUseCases.getWorkspace(ownStudent(req)));
      }),
    );
    router.put(
      '/workspace',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(
          await studentWorkspaceUseCases.upsertWorkspace({
            studentReferenceId: ownStudent(req),
            ...workspaceSchema.parse(req.body),
          }),
        );
      }),
    );
    router.put(
      '/privacy-consent',
      asyncHandler(async (req: Request, res: Response) => {
        const studentReferenceId = ownStudent(req);
        const body = privacyConsentSchema.parse(req.body);
        res.json(await studentWorkspaceUseCases.updatePrivacyConsent({
          studentReferenceId,
          actorId: studentReferenceId,
          actorType: 'USER',
          source: 'student-workspace-api',
          ...body,
        }));
      }),
    );
    router.get(
      '/dashboard',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await studentDashboardHydrationService.getDashboard(ownStudent(req)));
      }),
    );
    router.post('/notifications/:notificationId/read', asyncHandler(async (req: Request, res: Response) => {
      z.object({}).strict().parse(req.body ?? {});
      const notificationId = z.string().trim().min(1).max(200).parse(req.params.notificationId);
      await studentWorkspaceUseCases.markNotificationRead(ownStudent(req), notificationId);
      res.json({ success: true });
    }));
    router.get(
      '/collections',
      asyncHandler(async (req: Request, res: Response) => {
        res.json({ data: await studentWorkspaceUseCases.listCollections(ownStudent(req)) });
      }),
    );
    router.post(
      '/collections',
      asyncHandler(async (req: Request, res: Response) => {
        res
          .status(201)
          .json(
            await studentWorkspaceUseCases.createCollection({
              studentReferenceId: ownStudent(req),
              ...collectionSchema.parse(req.body),
            }),
          );
      }),
    );
    router.patch(
      '/collections/:collectionId',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(
          await studentWorkspaceUseCases.updateCollection(
            ownStudent(req),
            req.params.collectionId,
            collectionSchema.partial().parse(req.body),
          ),
        );
      }),
    );
    router.delete(
      '/collections/:collectionId',
      asyncHandler(async (req: Request, res: Response) => {
        await studentWorkspaceUseCases.deleteCollection(ownStudent(req), req.params.collectionId);
        res.status(204).send();
      }),
    );
    router.post(
      '/saved-items/:itemId/move',
      asyncHandler(async (req: Request, res: Response) => {
        const body = z.object({ collectionId: z.string().uuid().nullable() }).parse(req.body);
        res.json(
          await studentWorkspaceUseCases.moveSavedItem(
            ownStudent(req),
            req.params.itemId,
            body.collectionId,
          ),
        );
      }),
    );
    router.get(
      '/recently-viewed',
      asyncHandler(async (req: Request, res: Response) => {
        res.json({ data: await studentWorkspaceUseCases.listRecentlyViewed(ownStudent(req)) });
      }),
    );
    router.post(
      '/recently-viewed',
      asyncHandler(async (req: Request, res: Response) => {
        const body = savedItemSchema
          .pick({ entityType: true, entityId: true, entitySlug: true })
          .parse(req.body);
        res
          .status(201)
          .json(
            await studentWorkspaceUseCases.recordRecentlyViewed({
              studentReferenceId: ownStudent(req),
              ...body,
            }),
          );
      }),
    );
    router.delete(
      '/recently-viewed',
      asyncHandler(async (req: Request, res: Response) => {
        await studentWorkspaceUseCases.clearRecentlyViewed(ownStudent(req));
        res.status(204).send();
      }),
    );
    router.get(
      '/snapshots',
      asyncHandler(async (req: Request, res: Response) => {
        res.json({ data: await studentWorkspaceUseCases.listSnapshots(ownStudent(req)) });
      }),
    );
    router.post(
      '/snapshots',
      asyncHandler(async (req: Request, res: Response) => {
        const body = z.object({ label: z.string().max(80).nullable().optional() }).parse(req.body);
        res
          .status(201)
          .json(await studentWorkspaceUseCases.createSnapshot(ownStudent(req), body.label));
      }),
    );
    router.post(
      '/snapshots/:snapshotId/restore',
      asyncHandler(async (req: Request, res: Response) => {
        const body = z.object({ expectedVersion: z.number().int().positive() }).parse(req.body);
        res.json(
          await studentWorkspaceUseCases.restoreSnapshot(
            ownStudent(req),
            req.params.snapshotId,
            body.expectedVersion,
          ),
        );
      }),
    );
    router.post(
      '/dashboard/layout/reset',
      asyncHandler(async (req: Request, res: Response) => {
        const body = z.object({ expectedVersion: z.number().int().positive() }).parse(req.body);
        res.json(await studentWorkspaceUseCases.resetLayout(ownStudent(req), body.expectedVersion));
      }),
    );
    router.delete(
      '/search-history',
      asyncHandler(async (req: Request, res: Response) => {
        await studentWorkspaceUseCases.clearSearchHistory(ownStudent(req));
        res.status(204).send();
      }),
    );

    router.get(
      '/saved-items/:savedReference/private-result',
      asyncHandler(async (req: Request, res: Response) => {
        res.setHeader('Cache-Control', 'no-store');
        res.json({
          data: await studentWorkspaceUseCases.readPrivateToolResult(
            ownStudent(req),
            z.string().uuid().parse(req.params.savedReference),
          ),
        });
      }),
    );
    router.get(
      '/saved-items/hydrated',
      asyncHandler(async (req: Request, res: Response) => {
        res.json({ data: await studentSavedItemHydrationService.listHydrated(ownStudent(req)) });
      }),
    );
    router.post(
      '/saved-items',
      asyncHandler(async (req: Request, res: Response) => {
        const body = savedItemSchema.parse(req.body);
        const saved = await studentWorkspaceUseCases.saveItem({
          studentReferenceId: ownStudent(req),
          ...body,
        });
        res.status(201).json(saved);
      }),
    );
    router.delete(
      '/saved-items/:entityType/:entityId',
      asyncHandler(async (req: Request, res: Response) => {
        const entityType = z.nativeEnum(StudentSavedItemType).parse(req.params.entityType);
        await studentWorkspaceUseCases.removeSavedItem(
          ownStudent(req),
          entityType,
          req.params.entityId,
        );
        res.status(204).send();
      }),
    );
    router.get(
      '/application-trackers',
      asyncHandler(async (req: Request, res: Response) => {
        res.json({ data: await studentApplicationTrackerUseCases.list(ownStudent(req)) });
      }),
    );
    router.post(
      '/application-trackers',
      asyncHandler(async (req: Request, res: Response) => {
        const body = applicationTrackerCreateSchema.parse(req.body);
        res
          .status(201)
          .json(
            await studentApplicationTrackerUseCases.create({
              studentReferenceId: ownStudent(req),
              ...body,
            }),
          );
      }),
    );
    router.get('/scholarships/:scholarshipId/application-cycles', asyncHandler(async (req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-store');
      res.json({ data: await studentApplicationTrackerUseCases.cycles(req.params.scholarshipId) });
    }));
    router.get('/application-trackers/:trackerId/documents', asyncHandler(async (req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-store');
      res.json({ data: await studentApplicationTrackerUseCases.documentReadiness(ownStudent(req), req.params.trackerId) });
    }));
    router.delete('/application-trackers/:trackerId/documents/:requirementId', asyncHandler(async (req:Request,res:Response)=>{
      const body=z.object({expectedVersion:z.number().int().positive()}).strict().parse(req.body);
      await studentApplicationTrackerUseCases.unbindDocument(ownStudent(req),req.params.trackerId,req.params.requirementId,body.expectedVersion);
      res.setHeader('Cache-Control','no-store');
      res.status(204).end();
    }));
    router.post('/application-trackers/:trackerId/documents', asyncHandler(async (req: Request, res: Response) => {
      const body = z.object({ requirementId: z.string().trim().min(1).max(160), assetId: z.string().trim().min(1).max(160), expectedVersion: z.number().int().positive(), consent: z.literal(true), expiresAt: z.coerce.date().nullable().optional() }).strict().parse(req.body);
      res.setHeader('Cache-Control', 'no-store');
      res.status(201).json({ data: await studentApplicationTrackerUseCases.bindDocument(ownStudent(req), req.params.trackerId, body) });
    }));
    router.patch(
      '/application-trackers/:trackerId',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(
          await studentApplicationTrackerUseCases.update(
            ownStudent(req),
            req.params.trackerId,
            applicationTrackerUpdateSchema.parse(req.body),
          ),
        );
      }),
    );
    router.patch(
      '/application-trackers/:trackerId/checklist/:itemId',
      asyncHandler(async (req: Request, res: Response) => {
        const body = applicationChecklistUpdateSchema.parse(req.body);
        res.json(
          await studentApplicationTrackerUseCases.setChecklistItem(
            ownStudent(req),
            req.params.trackerId,
            req.params.itemId,
            body.completed,
            body.expectedVersion,
          ),
        );
      }),
    );
    router.post(
      '/application-trackers/:trackerId/archive',
      asyncHandler(async (req: Request, res: Response) => {
        const body = applicationArchiveSchema.parse(req.body);
        res.json(
          await studentApplicationTrackerUseCases.archive(
            ownStudent(req),
            req.params.trackerId,
            body.expectedVersion,
          ),
        );
      }),
    );
    router.delete(
      '/application-trackers/:trackerId',
      asyncHandler(async (req: Request, res: Response) => {
        await studentApplicationTrackerUseCases.remove(ownStudent(req), req.params.trackerId);
        res.status(204).send();
      }),
    );

    router.get(
      '/services/requests',
      asyncHandler(async (req: Request, res: Response) => {
        const query = z
          .object({
            status: z.nativeEnum(ServiceRequestStatus).optional(),
            page: z.coerce.number().int().positive().optional(),
            pageSize: z.coerce.number().int().positive().max(100).optional(),
          })
          .parse(req.query);
        res.json(await studentServiceRequestUseCases.listMyRequests(ownStudent(req), query));
      }),
    );
    router.post(
      '/services/requests',
      asyncHandler(async (req: Request, res: Response) => {
        const body = z
          .object({
            serviceId: z.string().min(1),
            consent: z.literal(true),
            requestParameters: z.record(z.string(), z.unknown()).optional(),
          })
          .strict()
          .parse(req.body);
        res.status(201).json(
          await studentServiceRequestUseCases.createRequest({
            studentReferenceId: ownStudent(req),
            idempotencyKey: String(req.headers['idempotency-key'] ?? ''),
            ...body,
          }),
        );
      }),
    );
    router.get(
      '/services/requests/:requestId',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(
          await studentServiceRequestUseCases.getMyRequest(ownStudent(req), req.params.requestId),
        );
      }),
    );

    router.delete('/services/requests/:requestId/inputs',asyncHandler(async(req:Request,res:Response)=>{
      const body=z.object({expectedVersion:z.number().int().positive()}).strict().parse(req.body);
      res.json(await studentServiceRequestUseCases.eraseMyRequestInputs(ownStudent(req),req.params.requestId,body.expectedVersion));
    }));
    router.get('/services/requests/:requestId/availability',asyncHandler(async(req:Request,res:Response)=>{
      if (!cradle.serviceOperationsUseCases) throw new Error('SERVICE_OPERATIONS_NOT_CONFIGURED');
      res.json(await cradle.serviceOperationsUseCases.availableForRequest(ownStudent(req),req.params.requestId,z.string().min(1).max(2048).optional().parse(req.query.cursor)));
    }));
    router.post('/services/requests/:requestId/bookings',asyncHandler(async(req:Request,res:Response)=>{
      const body=z.object({slotId:z.string().min(1),packageId:z.string().min(1).optional(),packageConsent:z.literal(true).optional(),packageParameters:z.record(z.string(),z.record(z.string(),z.unknown())).optional()}).strict().parse(req.body);
      if (!cradle.serviceOperationsUseCases) throw new Error('SERVICE_OPERATIONS_NOT_CONFIGURED');
      const actorId=ownStudent(req);
      const operation=cradle.serviceOperationsUseCases.forActor({actorId,correlationId:actorId,reason:'Student booking request'});
      res.status(201).json(await operation.bookRequest(actorId,req.params.requestId,body.slotId,String(req.headers['idempotency-key']??''),body.packageId,body.packageConsent,body.packageParameters));
    }));
    router.get('/services/requests/:requestId/packages',asyncHandler(async(req:Request,res:Response)=>{
      if(!cradle.serviceOperationsUseCases)throw new Error('SERVICE_OPERATIONS_NOT_CONFIGURED');
      res.json(await cradle.serviceOperationsUseCases.packagesForRequest(ownStudent(req),req.params.requestId,z.string().min(1).max(2048).optional().parse(req.query.cursor)));
    }));
    router.get('/services/requests/:requestId/deliverables',asyncHandler(async(req:Request,res:Response)=>{
      if(!cradle.serviceOperationsUseCases)throw new Error('SERVICE_OPERATIONS_NOT_CONFIGURED');
      res.json({data:await cradle.serviceOperationsUseCases.myDeliverables(ownStudent(req),req.params.requestId)});
    }));
    router.post('/services/requests/:requestId/deliverables/:artifactId/grant',asyncHandler(async(req:Request,res:Response)=>{
      if(!cradle.serviceOperationsUseCases)throw new Error('SERVICE_OPERATIONS_NOT_CONFIGURED');
      res.json(await cradle.serviceOperationsUseCases.myDeliveryGrant(ownStudent(req),req.params.requestId,req.params.artifactId));
    }));
    router.use('/services', (err: any, _req: Request, res: Response, next: NextFunction) => {
      if (!err) return next();
      const allowed = new Set(['SERVICE_INPUT_ERASURE_LEGAL_HOLD','SERVICE_INPUT_ERASURE_BOOKING_ACTIVE','SERVICE_REQUEST_VERSION_CONFLICT','SERVICE_FINANCE_CANCELLATION_PENDING','SERVICE_IDEMPOTENCY_KEY_REQUIRED','SERVICE_IDEMPOTENCY_PAYLOAD_CONFLICT','SERVICE_INPUT_CONSENT_REQUIRED','SERVICE_INPUT_UNKNOWN_FIELD','SERVICE_INPUT_REQUIRED','SERVICE_INPUT_TYPE_INVALID','SERVICE_INPUT_RAW_URL_FORBIDDEN','SERVICE_INPUT_TOO_LARGE','SERVICE_NOT_AVAILABLE','SERVICE_REQUEST_NOT_FOUND','SERVICE_BOOKING_SLOT_UNAVAILABLE','SERVICE_BOOKING_CAPACITY_EXHAUSTED','SERVICE_BOOKING_CAPACITY_CONFLICT','SERVICE_BOOKING_REQUEST_MISMATCH','SERVICE_BOOKING_ACTIVE_PRICING_REQUIRED','SERVICE_PACKAGE_CONSENT_REQUIRED','SERVICE_PACKAGE_ITEM_NOT_PUBLISHED','SERVICE_DELIVERY_REVIEW_REQUIRED','SERVICE_DELIVERY_WORKFLOW_MISMATCH','SERVICE_SECURE_DELIVERY_NOT_CONFIGURED','SERVICE_BOOKING_BEFORE_INVOICE_REQUIRED','SERVICE_FREE_POLICY_REQUIRED','SERVICE_PACKAGE_INPUT_ASSET_OWNER_MISMATCH']);
      const code = allowed.has(err.message) ? err.message : err instanceof z.ZodError ? 'SERVICE_VALIDATION_ERROR' : 'SERVICE_REQUEST_FAILED';
      res.status(code === 'SERVICE_REQUEST_FAILED' ? 500 : code.includes('CONFLICT') ? 409 : code.includes('NOT_FOUND') ? 404 : 422).json({ error: code });
    });

    router.use('/careers', careerStudentRouter(cradle.careerEngagementUseCases));

    router.use('/:studentReferenceId', (req: Request, res: Response, next: NextFunction) => {
      if (req.authUserId !== req.params.studentReferenceId) {
        res.status(403).json({ error: 'STUDENT_WORKSPACE_ACCESS_DENIED' });
        return;
      }
      next();
    });

    router.get(
      '/:studentReferenceId/workspace',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await studentWorkspaceUseCases.getWorkspace(req.params.studentReferenceId));
      }),
    );

    router.put(
      '/:studentReferenceId/workspace',
      asyncHandler(async (req: Request, res: Response) => {
        const body = workspaceSchema.parse(req.body);
        res.json(
          await studentWorkspaceUseCases.upsertWorkspace({
            studentReferenceId: req.params.studentReferenceId,
            ...body,
          }),
        );
      }),
    );

    router.get(
      '/:studentReferenceId/dashboard',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(
          await studentDashboardHydrationService.getDashboard(req.params.studentReferenceId),
        );
      }),
    );

    router.get(
      '/:studentReferenceId/saved-items',
      asyncHandler(async (req: Request, res: Response) => {
        res.json({
          data: await studentWorkspaceUseCases.listSavedItems(req.params.studentReferenceId),
        });
      }),
    );

    router.get(
      '/:studentReferenceId/collections',
      asyncHandler(async (req: Request, res: Response) => {
        res.json({
          data: await studentWorkspaceUseCases.listCollections(req.params.studentReferenceId),
        });
      }),
    );

    router.post(
      '/:studentReferenceId/collections',
      asyncHandler(async (req: Request, res: Response) => {
        const body = collectionSchema.parse(req.body);
        const collection = await studentWorkspaceUseCases.createCollection({
          studentReferenceId: req.params.studentReferenceId,
          ...body,
        });
        res.status(201).json(collection);
      }),
    );

    router.post(
      '/:studentReferenceId/saved-items',
      asyncHandler(async (req: Request, res: Response) => {
        const body = savedItemSchema.parse(req.body);
        const saved = await studentWorkspaceUseCases.saveItem({
          studentReferenceId: req.params.studentReferenceId,
          ...body,
        });
        res.status(201).json(saved);
      }),
    );

    router.delete(
      '/:studentReferenceId/saved-items/:entityType/:entityId',
      asyncHandler(async (req: Request, res: Response) => {
        const entityType = z.nativeEnum(StudentSavedItemType).parse(req.params.entityType);
        await studentWorkspaceUseCases.removeSavedItem(
          req.params.studentReferenceId,
          entityType,
          req.params.entityId,
        );
        res.status(204).send();
      }),
    );

    router.post(
      '/:studentReferenceId/activity',
      asyncHandler(async (req: Request, res: Response) => {
        const body = z
          .object({
            activityType: z.string().trim().min(1).max(60),
            title: z.string().trim().min(1).max(160),
            entityType: z.string().trim().max(60).nullable().optional(),
            entityId: z.string().trim().max(160).nullable().optional(),
            entitySlug: z.string().trim().max(160).nullable().optional(),
            metadata: z.record(z.string(), z.unknown()).nullable().optional(),
          })
          .parse(req.body);
        res.status(201).json(
          await studentWorkspaceUseCases.recordActivity({
            studentReferenceId: req.params.studentReferenceId,
            ...body,
          }),
        );
      }),
    );

    router.post(
      '/:studentReferenceId/search-history',
      asyncHandler(async (req: Request, res: Response) => {
        const { query } = z.object({ query: z.string().trim().min(1).max(160) }).parse(req.body);
        await studentWorkspaceUseCases.recordSearch(req.params.studentReferenceId, query);
        res.status(204).send();
      }),
    );

    router.delete(
      '/:studentReferenceId/search-history',
      asyncHandler(async (req: Request, res: Response) => {
        await studentWorkspaceUseCases.clearSearchHistory(req.params.studentReferenceId);
        res.status(204).send();
      }),
    );

    router.post(
      '/:studentReferenceId/snapshots',
      asyncHandler(async (req: Request, res: Response) => {
        const { label } = z
          .object({ label: z.string().trim().max(80).nullable().optional() })
          .parse(req.body ?? {});
        res
          .status(201)
          .json(
            await studentWorkspaceUseCases.createSnapshot(req.params.studentReferenceId, label),
          );
      }),
    );

    router.get(
      '/:studentReferenceId/finance/invoices',
      asyncHandler(async (req: Request, res: Response) => {
        const pagination = z
          .object({
            page: z.coerce.number().int().positive().optional(),
            pageSize: z.coerce.number().int().positive().max(100).optional(),
          })
          .parse(req.query);
        res.json(await financeStudentUseCases.listStudentInvoices(ownStudentPath(req), pagination));
      }),
    );

    for (const kind of ['wallets', 'transfers'] as const) {
      router.get(
        `/:studentReferenceId/finance/${kind}`,
        asyncHandler(async (req: Request, res: Response) => {
          const pagination = z
            .object({
              page: z.coerce.number().int().positive().default(1),
              pageSize: z.coerce.number().int().min(1).max(50).default(20),
            })
            .parse(req.query);
          res.json(await financeStudentUseCases.listHistory(ownStudentPath(req), kind, pagination));
        }),
      );
    }
    router.get(
      '/:studentReferenceId/finance/overview',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await financeStudentUseCases.getStudentFinancialOverview(ownStudentPath(req)));
      }),
    );

    router.get(
      '/:studentReferenceId/finance/invoices/:invoiceId',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(
          await financeStudentUseCases.getStudentInvoice(ownStudentPath(req), req.params.invoiceId),
        );
      }),
    );

    router.get(
      '/:studentReferenceId/finance/invoices/:invoiceId/payments',
      asyncHandler(async (req: Request, res: Response) => {
        res.json({
          data: await financeStudentUseCases.listStudentInvoicePayments(
            ownStudentPath(req),
            req.params.invoiceId,
          ),
        });
      }),
    );

    router.post(
      '/:studentReferenceId/finance/invoices/:invoiceId/wallet-payment',
      asyncHandler(async (req: Request, res: Response) => {
        const studentReferenceId = ownStudentPath(req);
        await financeStudentUseCases.getStudentInvoice(studentReferenceId, req.params.invoiceId);
        const body = z
          .object({
            consent: z.literal(true),
            walletId: z.string().min(1).max(160),
            expectedVersion: z.number().int().positive(),
            amount: z.object({
              amountMinorUnits: z.string().regex(/^[1-9]\d{0,29}$/),
              currencyCode: z.string().regex(/^[A-Z]{3}$/),
              scale: z.number().int().min(0).max(6),
            }),
          })
          .strict()
          .parse(req.body);
        const idempotencyKey = String(req.headers['idempotency-key'] || '').trim();
        if (!idempotencyKey || idempotencyKey.length > 160)
          throw new Error('FINANCE_IDEMPOTENCY_REQUIRED');
        res.json(
          await financePlatformUseCases.payInvoiceFromWallet(
            { invoiceId: req.params.invoiceId, walletId: body.walletId, amount: body.amount },
            {
              actorId: studentReferenceId,
              idempotencyKey,
              expectedVersion: body.expectedVersion,
              reason: 'Authenticated payer consent for invoice wallet payment',
              correlationId:
                String(req.headers['x-correlation-id'] || '').slice(0, 100) || undefined,
            },
          ),
        );
      }),
    );
    router.post(
      '/:studentReferenceId/finance/invoices/:invoiceId/payment-attempts',
      asyncHandler(async (req: Request, res: Response) => {
        const studentReferenceId = ownStudentPath(req);
        await financeStudentUseCases.getStudentInvoice(studentReferenceId, req.params.invoiceId);
        const idempotencyKey = String(req.headers['idempotency-key'] || '').trim();
        if (!idempotencyKey) throw new Error('PAYMENT_IDEMPOTENCY_KEY_REQUIRED');
        const body = paymentAttemptSchema.parse(req.body);
        res.status(201).json(
          await financePlatformUseCases.capturePayment(
            {
              invoiceId: req.params.invoiceId,
              amount: body.amount,
              paymentMethodToken: body.paymentMethodToken,
              gatewayProvider: body.gatewayProvider,
            },
            {
              actorId: studentReferenceId,
              idempotencyKey,
              correlationId: String(req.headers['x-correlation-id'] || '').trim() || undefined,
              reason: 'Authenticated student payment attempt',
            },
          ),
        );
      }),
    );

    router.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (!req.path.includes('/finance/')) return next(err);
      const message = String(err?.message || '');
      let status = 500,
        code = 'FINANCE_INTERNAL_ERROR';
      if (err instanceof z.ZodError) {
        status = 400;
        code = 'FINANCE_VALIDATION_ERROR';
      } else if (/NOT_CONFIGURED|RUNTIME_PENDING/.test(message)) {
        status = 503;
        code = 'FINANCE_CAPABILITY_UNAVAILABLE';
      } else if (/OWNERSHIP|not found|NOT_FOUND/.test(message)) {
        status = 404;
        code = 'FINANCE_RECORD_NOT_FOUND';
      } else if (/CONSENT/.test(message)) {
        status = 403;
        code = 'FINANCE_PAYER_CONSENT_REQUIRED';
      } else if (/VERSION|CONFLICT|idempotency|already|RESERVED|OUTCOME_PENDING/i.test(message)) {
        status = 409;
        code = 'FINANCE_COMMAND_CONFLICT';
      } else if (/invalid|required|cannot|must|exceed|Insufficient|not payable/i.test(message)) {
        status = 400;
        code = 'FINANCE_OPERATION_REJECTED';
      } else if (/PROVIDER|EVIDENCE/.test(message)) {
        status = 503;
        code = 'FINANCE_PROVIDER_OUTCOME_UNCONFIRMED';
      }
      res.status(status).json({ error: code, code });
    });
    router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      const code = err.message || 'An error occurred';
      const status =
        code.includes('NOT_CONFIGURED') ||
        code.includes('RUNTIME_PENDING') ||
        code.includes('runtime transport is pending')
          ? 503
          : code.includes('STUDENT_ROUTE_OWNERSHIP_MISMATCH')
            ? 404
            : code.includes('VERSION_CONFLICT')
              ? 409
              : code.includes('SUSPENDED') || code.includes('ARCHIVED')
                ? 423
                : code.includes('NOT_FOUND')
                  ? 404
                  : 400;
      res.status(status).json({ error: code });
    });

    return router;
  }
}
