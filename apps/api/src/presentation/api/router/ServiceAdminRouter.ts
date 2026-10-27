import { testDiscoveryOwnerRouter } from './TestDiscoveryOwnerRouter.js';
import type {TestDiscoveryOwnerUseCases} from '@manaratak/application';
import { randomUUID } from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  AuthorizationEvaluatorService,
  ServiceAvailabilityStatus,
  ServiceCategory,
  ServiceDeliveryMode,
  ServiceFulfillmentType,
  ServiceStatus,
  ServiceCompletenessStatus,
  ServiceRequestStatus,
  UpdateServiceCatalogItemDto,
} from '@manaratak/domain';
import {
  ServiceOperationsUseCases,
  AdminServiceCatalogUseCases,
  AdminServiceFulfillmentUseCases,
} from '@manaratak/application';

export class ServiceAdminRouter {
  public static create(cradle: {
    serviceTestDiscovery?:TestDiscoveryOwnerUseCases;
    serviceOperationsUseCases: ServiceOperationsUseCases;
    authEvaluatorService: AuthorizationEvaluatorService;
    adminServiceCatalogUseCases: AdminServiceCatalogUseCases;
    adminServiceFulfillmentUseCases: AdminServiceFulfillmentUseCases;
  }): Router {
    const router = Router();
    if(cradle.serviceTestDiscovery)router.use('/:ownerKey/test-discovery',testDiscoveryOwnerRouter(cradle.serviceTestDiscovery,cradle.authEvaluatorService,{view:'admin:services:manage',propose:'admin:services:manage',review:'admin:services:manage'}));
    const { adminServiceCatalogUseCases, adminServiceFulfillmentUseCases } = cradle;
    const requirePermission = async (req: Request, permission: string) => {
      if (!req.authUserId) throw new Error('SERVICE_AUTHENTICATION_REQUIRED');
      const decision = await cradle.authEvaluatorService.evaluatePermission(
        req.authUserId,
        permission,
        {
          requestTime: new Date(),
          resourceId:
            req.params.requestId ??
            req.params.requestReference ??
            req.params.id ??
            req.path.split('/')[2],
          studentReferenceId: req.query.studentReferenceId,
          serviceId: req.query.serviceId,
          ip: req.ip,
        },
      );
      if (!decision.isGranted) throw new Error('SERVICE_ACCESS_DENIED');
    };
    router.use((req: Request, _res: Response, next: NextFunction) => {
      req.headers['x-correlation-id'] = randomUUID();
      next();
    });

    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

    const listQuerySchema = z.object({
      supportedCountryReferenceId: z.string().trim().min(1).max(160).optional(),
      supportedLanguageReferenceId: z.string().trim().min(1).max(160).optional(),
      search: z.string().trim().max(120).optional(),
      status: z.preprocess(
        (value) => (value === '' || value === 'all' ? undefined : value),
        z.nativeEnum(ServiceStatus).optional(),
      ),
      completenessStatus: z.nativeEnum(ServiceCompletenessStatus).optional(),
      serviceCategory: z.nativeEnum(ServiceCategory).optional(),
      fulfillmentType: z.nativeEnum(ServiceFulfillmentType).optional(),
      serviceAvailabilityStatus: z.nativeEnum(ServiceAvailabilityStatus).optional(),
      deliveryMode: z.nativeEnum(ServiceDeliveryMode).optional(),
      page: z.coerce.number().int().positive().max(10000).default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(20),
    });

    const serviceBodySchema = z.object({
      managedApplication: z.boolean().default(false),
      fulfillmentPolicy: z.enum(['FREE', 'CHARGEABLE', 'QUOTE_REQUIRED']).default('QUOTE_REQUIRED'),
      inputSchema: z
        .array(
          z
            .object({
              key: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/),
              type: z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'ASSET']),
              required: z.boolean(),
              sensitive: z.boolean().optional(),
            })
            .strict(),
        )
        .max(40)
        .refine((fields) => new Set(fields.map((f) => f.key)).size === fields.length)
        .default([]),
      localizedContent: z
        .object({
          ar: z.object({
            displayName: z.string().min(1).max(240),
            serviceDescription: z.string().min(1).max(10000),
          }),
          en: z.object({
            displayName: z.string().min(1).max(240),
            serviceDescription: z.string().min(1).max(10000),
          }),
        })
        .nullable()
        .optional(),
      displayName: z.string().min(1).max(240),
      serviceCategory: z.nativeEnum(ServiceCategory),
      fulfillmentType: z.nativeEnum(ServiceFulfillmentType),
      serviceDescription: z.string().min(1),
      serviceAvailabilityStatus: z.nativeEnum(ServiceAvailabilityStatus),
      requiredInputsOrDocuments: z.array(z.string().min(1)).min(1),
      deliveryMode: z.nativeEnum(ServiceDeliveryMode),
      responsibleServiceOwnerType: z.string().min(1),
      providerName: z.string().nullable().optional(),
      providerReferenceId: z.string().nullable().optional(),
      estimatedDeliveryTime: z.string().nullable().optional(),
      slaPolicy: z.record(z.string(), z.unknown()).nullable().optional(),
      appointmentRequired: z.boolean().nullable().optional(),
      supportedCountryReferenceIds: z.array(z.string().min(1)).nullable().optional(),
      supportedLanguageReferenceIds: z.array(z.string().min(1)).nullable().optional(),
      supportedCountries: z.array(z.string().min(1)).nullable().optional(),
      supportedLanguages: z.array(z.string().min(1)).nullable().optional(),
      servicePrerequisites: z.array(z.string()).nullable().optional(),
      deliveryArtifactTypes: z.array(z.string()).nullable().optional(),
      pricingReferenceId: z.string().nullable().optional(),
      thumbnailAssetId: z.string().nullable().optional(),
      publicDisplayMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
      optionalFields: z.record(z.string(), z.unknown()).nullable().optional(),
    });

    const expectedVersionSchema = z
      .object({ expectedVersion: z.number().int().positive() })
      .strict();
    const updateBodySchema = serviceBodySchema
      .partial()
      .extend({ expectedVersion: z.number().int().positive() })
      .strict();

    const requestListQuerySchema = z.object({
      search: z.string().trim().max(120).optional(),
      overdue: z
        .enum(['true', 'false'])
        .transform((value) => value === 'true')
        .optional(),
      mine: z.enum(['true','false']).transform(value=>value==='true').optional(),
      providerReferenceId: z.string().min(1).optional(),
      studentReferenceId: z.string().min(1).optional(),
      serviceId: z.string().min(1).optional(),
      status: z.preprocess(
        (value) => (value === '' || value === 'all' ? undefined : value),
        z.nativeEnum(ServiceRequestStatus).optional(),
      ),
      page: z.coerce.number().int().positive().max(10000).default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(20),
    });
    const requestTransitionSchema = z
      .object({
        status: z.nativeEnum(ServiceRequestStatus),
        fulfillmentMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
        expectedVersion: z.number().int().positive(),
      })
      .strict();
    const requestInvoiceSchema = z
      .object({
        description: z.string().trim().min(1).max(240).optional(),
        quantity: z.number().int().positive().max(100).optional(),
        amountMinorUnits: z.string().regex(/^[1-9]\d{0,29}$/),
        currencyCode: z.string().trim().min(3).max(3),
        scale: z.number().int().min(0).max(6),
        expectedVersion: z.number().int().positive(),
      })
      .strict();

    router.use(
      asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
        // Express matches routes case-insensitively and permits a trailing slash.
        const policyPath = req.path.replace(/\/+$/, '').toLowerCase();
        const requests = policyPath.startsWith('/requests');
        await requirePermission(
          req,
          requests
            ? req.method === 'GET'
              ? 'admin:services:requests:view'
              : 'admin:services:requests:fulfill'
            : policyPath.startsWith('/operations')
              ? req.method !== 'GET' && /^\/operations\/(?:bookings|executions|deliveries)(?:\/|$)/.test(policyPath)
                ? 'admin:services:requests:fulfill' : 'admin:services:operations:manage'
              : policyPath.endsWith('/mark-publishable')
              ? 'admin:services:review'
              : policyPath.endsWith('/publish') || policyPath.endsWith('/unpublish')
                ? 'admin:services:publish'
                : 'admin:services:manage',
        );
        if (policyPath.endsWith('/finance-invoice'))
          await requirePermission(req, 'admin:finance:invoice:manage');
        if (requests && req.method === 'GET' && !['/requests/unassigned','/requests'].includes(policyPath))
          await requirePermission(req, 'admin:services:requests:pii');
        next();
      }),
    );

    const mayReadAll = async (req: Request) =>
      (
        await cradle.authEvaluatorService.evaluatePermission(
          req.authUserId!,
          'admin:services:requests:all',
          { resourceId: req.path.split('/')[2] },
        )
      ).isGranted;
    const scopedRequest = async (req: Request) => {
      const reference = req.params.requestId ?? req.params.requestReference;
      const record = await adminServiceFulfillmentUseCases.getRequest(reference);
      if (record.assignedStaffId !== req.authUserId && !(await mayReadAll(req)))
        throw new Error('SERVICE_REQUEST_NOT_FOUND');
      return record;
    };
    router.get(
      '/requests/unassigned',
      asyncHandler(async (req: Request, res: Response) => {
        await requirePermission(req, 'admin:services:requests:assign');
        const result = await adminServiceFulfillmentUseCases.listRequests({
          unassigned: true,
          page: 1,
          pageSize: 20,
        });
        res.json({
          ...result,
          data: result.data.map((row) => ({
            id: row.id,
            publicId: row.publicId,
            serviceId: row.serviceId,
            status: row.status,
            version: row.version,
            dueAt: row.dueAt,
          })),
        });
      }),
    );
    router.post(
      '/requests/:requestId/claim',
      asyncHandler(async (req: Request, res: Response) => {
        await requirePermission(req, 'admin:services:requests:assign');
        const row = await adminServiceFulfillmentUseCases.claimRequest(
          req.params.requestId,
          req.authUserId!,
          z.number().int().positive().parse(req.body.expectedVersion),
        );
        res.json({ id: row.id, publicId: row.publicId, status: row.status, version: row.version });
      }),
    );
    router.get(
      '/requests/:requestReference/timeline',
      asyncHandler(async (req: Request, res: Response) => {
        const record = await scopedRequest(req);
        res.json({ data: await adminServiceFulfillmentUseCases.requestTimeline(record.id) });
      }),
    );
    const operationBody = {
      providers: z
        .object({
          displayName: z.string().min(1).max(200),
          timezone: z.string().max(100),
          capacity: z.number().int().min(1).max(1000),
          countryReferenceId: z.string().nullable().optional(),
          supportedServiceIds: z.array(z.string().min(1)).min(1).max(100),
          qualificationMetadata: z
            .object({ assetId: z.string().min(1), expiresAt: z.string().datetime() })
            .nullable()
            .optional(),
        })
        .strict(),
      packages: z
        .object({
          displayName: z.string().min(1).max(200),
          items: z
            .array(
              z
                .object({
                  serviceId: z.string().min(1),
                  sequence: z.number().int().positive(),
                  quantity: z.number().int().positive().max(100),
                  required: z.boolean().optional(),
                })
                .strict(),
            )
            .min(1)
            .max(50),
        })
        .strict(),
      pricing: z
        .object({
          serviceId: z.string().min(1).optional(),
          packageId: z.string().min(1).optional(),
          currencyCode: z.string().regex(/^[A-Z]{3}$/),
          scale: z.number().int().min(0).max(6),
          amountMinorUnits: z.string().regex(/^(?:0|[1-9]\d{0,29})$/),
          effectiveFrom: z.coerce.date().optional(),
          effectiveTo: z.coerce.date().nullable().optional(),
        })
        .strict(),
      slots: z
        .object({
          providerId: z.string().min(1),
          serviceId: z.string().min(1),
          startsAt: z.coerce.date(),
          endsAt: z.coerce.date(),
          timezone: z.string().max(100),
          capacity: z.number().int().min(1).max(1000).optional(),
        })
        .strict(),
      workflows: z
        .object({
          name: z.string().min(1).max(200),
          serviceId: z.string().min(1).optional(),
          packageId: z.string().min(1).optional(),
          steps: z
            .array(
              z
                .object({
                  key: z.string().min(1).max(80),
                  sequence: z.number().int().positive(),
                  slaMinutes: z.number().int().positive().optional(),
                  requiredArtifactTypes: z.array(z.string().max(80)).optional(),
                })
                .strict(),
            )
            .min(1)
            .max(50),
        })
        .strict(),
      discounts: z
        .object({
          code: z.string().max(80).optional(),
          discountType: z.enum(['FIXED', 'PERCENTAGE']),
          valueMinorUnits: z
            .string()
            .regex(/^[1-9]\d{0,29}$/)
            .optional(),
          percentageBasisPoints: z.number().int().min(1).max(10000).optional(),
          currencyCode: z
            .string()
            .regex(/^[A-Z]{3}$/)
            .optional(),
          serviceId: z.string().optional(),
          packageId: z.string().optional(),
          activeFrom: z.coerce.date().optional(),
          activeTo: z.coerce.date().nullable().optional(),
          maxRedemptions: z.number().int().positive().optional(),
        })
        .strict(),
      promotions: z
        .object({
          name: z.string().min(1).max(200),
          discountId: z.string().min(1),
          serviceId: z.string().optional(),
          packageId: z.string().optional(),
          activeFrom: z.coerce.date().optional(),
          activeTo: z.coerce.date().nullable().optional(),
        })
        .strict(),
    };
    const operation = (req: Request) => {
      const reason = z.string().trim().min(3).max(500).parse(req.body.reason);
      if (!req.authUserId) throw new Error('SERVICE_AUTHENTICATION_REQUIRED');
      return cradle.serviceOperationsUseCases.forActor({
        actorId: req.authUserId,
        reason,
        correlationId: String(req.headers['x-correlation-id']),
      });
    };
    router.get(
      '/operations/:kind',
      asyncHandler(async (req: Request, res: Response) => {
        await requirePermission(req, 'admin:services:operations:manage');
        if (['bookings', 'executions', 'deliveries'].includes(req.params.kind))
          await requirePermission(req, 'admin:services:requests:pii');
        const query = z.object({
          page: z.coerce.number().int().min(1).max(10000).default(1),
          search: z.string().trim().max(120).optional(),
        }).strict().parse(req.query);
        const actorScope = (await mayReadAll(req)) ? undefined : req.authUserId;
        res.setHeader('Cache-Control', 'no-store');
        res.json(query.search
          ? await cradle.serviceOperationsUseCases.listOperations(req.params.kind, query.page, actorScope, query.search)
          : await cradle.serviceOperationsUseCases.listOperations(req.params.kind, query.page, actorScope));
      }),
    );
    const creators = {
      providers: 'registerProvider',
      packages: 'createPackage',
      pricing: 'createPricing',
      slots: 'createAvailabilitySlot',
      workflows: 'createWorkflowDefinition',
      discounts: 'createDiscount',
      promotions: 'createPromotion',
    } as const;
    for (const kind of Object.keys(creators) as Array<keyof typeof creators>)
      router.post(
        `/operations/${kind}`,
        asyncHandler(async (req: Request, res: Response) => {
          await requirePermission(req, 'admin:services:operations:manage');
          const { reason, ...body } = operationBody[kind]
            .extend({ reason: z.string().trim().min(3).max(500) })
            .strict().parse(req.body);
          res
            .status(201)
            .json(await (operation(req)[creators[kind]] as any).call(operation(req), body));
        }),
      );
    router.post(
      '/operations/providers/:id/evidence',
      asyncHandler(async (req: Request, res: Response) => {
        await requirePermission(req, 'admin:services:operations:manage');
        const body = z
          .object({
            assetId: z.string().min(1),
            expiresAt: z.string().datetime(),
            expectedVersion: z.number().int().positive(),
            reason: z.string().min(3).max(500),
          })
          .strict()
          .parse(req.body);
        res.json(
          await operation(req).updateProviderEvidence(
            req.params.id,
            { assetId: body.assetId, expiresAt: body.expiresAt },
            body.expectedVersion,
          ),
        );
      }),
    );
    const activations = {
      providers: 'qualifyProvider',
      packages: 'activatePackage',
      pricing: 'activatePricing',
      promotions: 'activatePromotion',
      workflows: 'activateWorkflowDefinition',
    } as const;
    for (const kind of Object.keys(activations) as Array<keyof typeof activations>)
      router.post(
        `/operations/${kind}/:id/activate`,
        asyncHandler(async (req: Request, res: Response) => {
          await requirePermission(req, 'admin:services:operations:manage');
          await requirePermission(
            req,
            kind === 'providers'
              ? 'admin:services:providers:approve'
              : kind === 'pricing'
                ? 'admin:services:pricing:approve'
                : 'admin:services:review',
          );
          const version = z.number().int().positive().parse(req.body.expectedVersion);
          if (kind === 'providers') {
            const review = z
              .object({
                legalReviewed: z.literal(true),
                authorityReviewed: z.literal(true),
                scopeReviewed: z.literal(true),
              })
              .strict()
              .parse(req.body.review);
            res.json(await operation(req).qualifyProvider(req.params.id, version, review));
          } else res.json(await operation(req)[activations[kind]](req.params.id, version));
        }),
      );
    router.post(
      '/operations/bookings/:id/transition',
      asyncHandler(async (req: Request, res: Response) => {
        await requirePermission(req, 'admin:services:requests:fulfill');
        await cradle.serviceOperationsUseCases.assertCaseActor(
          req.params.id,
          req.authUserId!,
          await mayReadAll(req),
          false,
        );
        const body = z
          .object({
            status: z.enum(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
            expectedVersion: z.number().int().positive(),
            reason: z.string(),
          })
          .strict()
          .parse(req.body);
        res.json(
          await operation(req).transitionBooking(
            req.params.id,
            body.status as any,
            body.expectedVersion,
          ),
        );
      }),
    );
    router.post(
      '/operations/bookings/:id/start-workflow',
      asyncHandler(async (req: Request, res: Response) => {
        await requirePermission(req, 'admin:services:requests:fulfill');
        await cradle.serviceOperationsUseCases.assertCaseActor(
          req.params.id,
          req.authUserId!,
          await mayReadAll(req),
          false,
        );
        res.json(await operation(req).startWorkflow(req.params.id));
      }),
    );
    router.post(
      '/operations/executions/:id/advance',
      asyncHandler(async (req: Request, res: Response) => {
        await requirePermission(req, 'admin:services:requests:fulfill');
        await cradle.serviceOperationsUseCases.assertCaseActor(
          req.params.id,
          req.authUserId!,
          await mayReadAll(req),
          true,
        );
        res.json(
          await operation(req).advanceWorkflow(
            req.params.id,
            z.number().int().positive().parse(req.body.expectedVersion),
          ),
        );
      }),
    );
    router.post(
      '/operations/deliveries',
      asyncHandler(async (req: Request, res: Response) => {
        await requirePermission(req, 'admin:services:requests:fulfill');
        const { reason, ...body } = z
          .object({
            bookingId: z.string().min(1),
            workflowExecutionId: z.string().min(1),
            reason: z.string().trim().min(3).max(500),
            artifactType: z.string().min(1).max(80),
            assetId: z.string().min(1),
          })
          .strict()
          .parse(req.body);
        await cradle.serviceOperationsUseCases.assertCaseActor(
          body.bookingId,
          req.authUserId!,
          await mayReadAll(req),
        );
        res
          .status(201)
          .json(
            await operation(req).addDeliveryArtifact({ ...body, deliveredBy: req.authUserId! }),
          );
      }),
    );

    router.get(
      '/',
      asyncHandler(async (req: Request, res: Response) => {
        const filters = listQuerySchema.parse(req.query);
        res.json(await adminServiceCatalogUseCases.listServices(filters));
      }),
    );

    router.post(
      '/',
      asyncHandler(async (req: Request, res: Response) => {
        const body = serviceBodySchema.parse(req.body);
        res.status(201).json(await adminServiceCatalogUseCases.createService(body, req.authUserId));
      }),
    );

    router.get(
      '/requests',
      asyncHandler(async (req: Request, res: Response) => {
        res.setHeader('Cache-Control', 'no-store');
        const { mine, ...filters } = requestListQuerySchema.parse(req.query);
        const pii = (await cradle.authEvaluatorService.evaluatePermission(req.authUserId!, 'admin:services:requests:pii', {
          resourceId: 'requests', requestTime: new Date(), ip: req.ip, userAgent: req.headers['user-agent'],
        })).isGranted;
        // PII-derived filters and searches can themselves disclose identities through counts.
        if (!pii && (filters.studentReferenceId || filters.providerReferenceId || filters.search))
          throw new Error('SERVICE_ACCESS_DENIED');
        const result = await adminServiceFulfillmentUseCases.listRequests({
          ...filters,
          ...(mine || !(await mayReadAll(req)) ? { assignedStaffId: req.authUserId! } : {}),
        });
        res.json({ ...result, data: pii ? result.data : result.data.map(row => ({
          id: row.id, publicId: row.publicId, serviceId: row.serviceId,
          status: row.status, version: row.version, dueAt: row.dueAt,
          createdAt: row.createdAt, updatedAt: row.updatedAt,
        })) });
      }),
    );

    router.get(
      '/requests/:requestReference/quote',
      asyncHandler(async (req: Request, res: Response) => {
        await requirePermission(req, 'admin:finance:invoice:manage');
        await scopedRequest(req);
        res.json(
          await adminServiceFulfillmentUseCases.getRequestQuote(req.params.requestReference),
        );
      }),
    );
    router.get(
      '/requests/:requestReference',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await scopedRequest(req));
      }),
    );

    router.post(
      '/requests/:requestId/transition',
      asyncHandler(async (req: Request, res: Response) => {
        await scopedRequest(req);
        const body = requestTransitionSchema.parse(req.body);
        res.json(
          await adminServiceFulfillmentUseCases.transitionRequest(
            req.params.requestId,
            body.status,
            body.expectedVersion,
            body.fulfillmentMetadata,
          ),
        );
      }),
    );

    router.post(
      '/requests/:requestId/provider',
      asyncHandler(async (req: Request, res: Response) => {
        await scopedRequest(req);
        const body = z
          .object({
            providerReferenceId: z.string().trim().min(1).max(200),
            expectedVersion: z.number().int().positive(),
          })
          .strict()
          .parse(req.body);
        res.json(
          await adminServiceFulfillmentUseCases.assignProvider(
            req.params.requestId,
            body.providerReferenceId,
            body.expectedVersion,
          ),
        );
      }),
    );

    router.post(
      '/requests/:requestId/finance-invoice',
      asyncHandler(async (req: Request, res: Response) => {
        if (!req.authUserId) throw new Error('ADMIN_AUTHENTICATION_REQUIRED');
        await scopedRequest(req);
        const body = requestInvoiceSchema.parse(req.body);
        res.status(201).json(
          await adminServiceFulfillmentUseCases.createFinanceInvoice({
            requestId: req.params.requestId,
            actorId: req.authUserId,
            ...body,
          }),
        );
      }),
    );

    router.get(
      '/:id',
      asyncHandler(async (req: Request, res: Response) => {
        res.json(await adminServiceCatalogUseCases.getService(req.params.id));
      }),
    );

    router.patch(
      '/:id',
      asyncHandler(async (req: Request, res: Response) => {
        const { expectedVersion, ...updates } = updateBodySchema.parse(req.body);
        res.json(
          await adminServiceCatalogUseCases.updateService(
            req.params.id,
            updates as UpdateServiceCatalogItemDto,
            expectedVersion,
            req.authUserId,
          ),
        );
      }),
    );

    router.post(
      '/:id/mark-ready',
      asyncHandler(async (req: Request, res: Response) => {
        const { expectedVersion } = expectedVersionSchema.parse(req.body);
        res.json(
          await adminServiceCatalogUseCases.markReadyToReview(req.params.id, expectedVersion),
        );
      }),
    );

    const reviewBody = z
      .object({
        expectedVersion: z.number().int().positive(),
        reason: z.string().trim().min(3).max(500),
        checklist: z
          .object({
            legal: z.literal(true),
            provider: z.literal(true),
            price: z.literal(true),
            privacy: z.literal(true),
            availability: z.literal(true),
            language: z.literal(true),
          })
          .strict(),
      })
      .strict();
    router.post(
      '/:id/mark-publishable',
      asyncHandler(async (req: Request, res: Response) => {
        const { expectedVersion } = reviewBody.parse(req.body);
        res.json(
          await adminServiceCatalogUseCases.markReadyToPublish(
            req.params.id,
            expectedVersion,
            req.authUserId,
            reviewBody.parse(req.body),
          ),
        );
      }),
    );

    router.post(
      '/:id/publish',
      asyncHandler(async (req: Request, res: Response) => {
        const { expectedVersion } = expectedVersionSchema.parse(req.body);
        res.json(await adminServiceCatalogUseCases.publish(req.params.id, expectedVersion));
      }),
    );

    router.post(
      '/:id/unpublish',
      asyncHandler(async (req: Request, res: Response) => {
        const { expectedVersion } = expectedVersionSchema.parse(req.body);
        res.json(await adminServiceCatalogUseCases.unpublish(req.params.id, expectedVersion));
      }),
    );

    router.post(
      '/:id/reject',
      asyncHandler(async (req: Request, res: Response) => {
        const { expectedVersion } = expectedVersionSchema.parse(req.body);
        res.json(await adminServiceCatalogUseCases.reject(req.params.id, expectedVersion));
      }),
    );

    router.post(
      '/:id/archive',
      asyncHandler(async (req: Request, res: Response) => {
        const { expectedVersion } = expectedVersionSchema.parse(req.body);
        res.json(await adminServiceCatalogUseCases.archive(req.params.id, expectedVersion));
      }),
    );

    router.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      const allowed = new Set([
        'SERVICE_AND_PACKAGE_MUTUALLY_EXCLUSIVE',
        'SERVICE_APPOINTMENT_POLICY_REQUIRED',
        'SERVICE_APPROVED_PRICING_REQUIRED',
        'SERVICE_BOOKING_ACTIVE_PRICING_REQUIRED',
        'SERVICE_BOOKING_BEFORE_INVOICE_REQUIRED',
        'SERVICE_BOOKING_HOLD_EXPIRED',
        'SERVICE_BOOKING_NOT_CONFIRMED',
        'SERVICE_BOOKING_NOT_FOUND',
        'SERVICE_BOOKING_PAYLOAD_CONFLICT',
        'SERVICE_BOOKING_PROVIDER_SCOPE_MISMATCH',
        'SERVICE_BOOKING_REQUEST_MISMATCH',
        'SERVICE_BOOKING_REQUEST_REQUIRED',
        'SERVICE_BOOKING_REQUIRED',
        'SERVICE_BOOKING_SLOT_ALREADY_STARTED',
        'SERVICE_BOOKING_SLOT_PROVIDER_MISMATCH',
        'SERVICE_BOOKING_SLOT_SERVICE_MISMATCH',
        'SERVICE_BOOKING_SLOT_UNAVAILABLE',
        'SERVICE_BOOKING_STUDENT_REQUIRED',
        'SERVICE_BOOKING_TRANSITION_INVALID',
        'SERVICE_DELIVERY_ARTIFACT_METADATA_REQUIRED',
        'SERVICE_DELIVERY_ARTIFACT_TYPE_INVALID',
        'SERVICE_DELIVERY_POLICY_REQUIRED',
        'SERVICE_DELIVERY_REVIEW_REQUIRED',
        'SERVICE_DELIVERY_WORKFLOW_MISMATCH',
        'SERVICE_DISCOUNT_CURRENCY_MISMATCH',
        'SERVICE_DISCOUNT_FIXED_VALUE_INVALID',
        'SERVICE_DISCOUNT_MAX_REDEMPTIONS_INVALID',
        'SERVICE_DISCOUNT_NOT_ACTIVE',
        'SERVICE_DISCOUNT_PERCENTAGE_INVALID',
        'SERVICE_DISCOUNT_SCOPE_MISMATCH',
        'SERVICE_DISCOUNT_WINDOW_INVALID',
        'SERVICE_EXPECTED_VERSION_REQUIRED',
        'SERVICE_FINANCE_CANCELLATION_PENDING',
        'SERVICE_FINANCE_INVOICE_REQUIRED',
        'SERVICE_FINANCIAL_CLEARANCE_REQUIRED',
        'SERVICE_FREE_INVOICE_FORBIDDEN',
        'SERVICE_FREE_POLICY_REQUIRED',
        'SERVICE_FULFILLMENT_POLICY_REQUIRED',
        'SERVICE_IDEMPOTENCY_KEY_REQUIRED',
        'SERVICE_IDEMPOTENCY_PAYLOAD_CONFLICT',
        'SERVICE_INDEPENDENT_REVIEW_REQUIRED',
        'SERVICE_INPUT_CONSENT_REQUIRED',
        'SERVICE_INPUT_RAW_URL_FORBIDDEN',
        'SERVICE_INPUT_REQUIRED',
        'SERVICE_INPUT_SCHEMA_INVALID',
        'SERVICE_INPUT_SCHEMA_REQUIRED',
        'SERVICE_INPUT_TOO_LARGE',
        'SERVICE_INPUT_TYPE_INVALID',
        'SERVICE_INPUT_UNKNOWN_FIELD',
        'SERVICE_INVOICE_LINK_PENDING',
        'SERVICE_MAINTENANCE_LIMIT_INVALID',
        'SERVICE_MONEY_MINOR_UNITS_INVALID',
        'SERVICE_NOT_AVAILABLE',
        'SERVICE_NOT_FOUND',
        'SERVICE_NOT_PUBLISHED',
        'SERVICE_OPERATIONS_AUDIT_REQUIRED',
        'SERVICE_OPERATIONS_NOT_CONFIGURED',
        'SERVICE_OR_PACKAGE_REQUIRED',
        'SERVICE_PACKAGE_CONSENT_REQUIRED',
        'SERVICE_PACKAGE_DELIVERY_POLICY_REQUIRED',
        'SERVICE_PACKAGE_ITEM_NOT_PUBLISHED',
        'SERVICE_PACKAGE_ITEM_REQUIRED',
        'SERVICE_PACKAGE_NAME_REQUIRED',
        'SERVICE_PACKAGE_NOT_ACTIVE',
        'SERVICE_PACKAGE_NOT_DRAFT',
        'SERVICE_PACKAGE_NOT_FOUND',
        'SERVICE_PACKAGE_QUANTITY_INVALID',
        'SERVICE_PACKAGE_SEQUENCE_INVALID',
        'SERVICE_PRICE_QUOTE_MISMATCH',
        'SERVICE_PRICING_ACTIVE_VERSION_EXISTS',
        'SERVICE_PRICING_AMOUNT_INVALID',
        'SERVICE_PRICING_CURRENCY_INVALID',
        'SERVICE_PRICING_EFFECTIVE_WINDOW_INVALID',
        'SERVICE_PRICING_NOT_DRAFT',
        'SERVICE_PRICING_NOT_FOUND',
        'SERVICE_PRICING_REQUIRED',
        'SERVICE_PRICING_SCALE_INVALID',
        'SERVICE_PROMOTION_DISCOUNT_NOT_FOUND',
        'SERVICE_PROMOTION_DISCOUNT_SCOPE_MISMATCH',
        'SERVICE_PROMOTION_NAME_REQUIRED',
        'SERVICE_PROMOTION_NOT_ACTIVATABLE',
        'SERVICE_PROMOTION_NOT_ACTIVE',
        'SERVICE_PROMOTION_NOT_FOUND',
        'SERVICE_PROMOTION_SCOPE_MISMATCH',
        'SERVICE_PROMOTION_WINDOW_INVALID',
        'SERVICE_PROVIDER_ACCREDITATION_REQUIRED',
        'SERVICE_PROVIDER_CAPACITY_INVALID',
        'SERVICE_PROVIDER_COUNTRY_MISMATCH',
        'SERVICE_PROVIDER_NAME_REQUIRED',
        'SERVICE_PROVIDER_NOT_FOUND',
        'SERVICE_PROVIDER_NOT_QUALIFIED',
        'SERVICE_PROVIDER_REFERENCE_REQUIRED',
        'SERVICE_PROVIDER_REQUIRED',
        'SERVICE_PROVIDER_RETIRED',
        'SERVICE_PROVIDER_REVIEW_REQUIRED',
        'SERVICE_PROVIDER_SERVICE_NOT_SUPPORTED',
        'SERVICE_PROVIDER_SUPPORTED_SERVICE_REQUIRED',
        'SERVICE_PUBLICATION_TRANSITION_NOT_ALLOWED',
        'SERVICE_PUBLISHED_UPDATE_INCOMPLETE',
        'SERVICE_REFERENCE_GATEWAY_REQUIRED',
        'SERVICE_REQUEST_EXPECTED_VERSION_REQUIRED',
        'SERVICE_REQUEST_NOT_FOUND',
        'SERVICE_REQUEST_NOT_INVOICEABLE',
        'SERVICE_REQUEST_PROVIDER_ASSIGNMENT_CLOSED',
        'SERVICE_REQUEST_REFERENCE_REQUIRED',
        'SERVICE_REQUEST_VERSION_CONFLICT',
        'SERVICE_REVIEW_EVIDENCE_REQUIRED',
        'SERVICE_REVIEW_STALE',
        'SERVICE_REVIEW_TRANSITION_NOT_ALLOWED',
        'SERVICE_SECURE_DELIVERY_NOT_CONFIGURED',
        'SERVICE_SLA_REQUIRED',
        'SERVICE_SLOT_CAPACITY_INVALID',
        'SERVICE_SLOT_SERVICE_NOT_FOUND',
        'SERVICE_SLOT_TIMEZONE_PROVIDER_MISMATCH',
        'SERVICE_SLOT_WINDOW_INVALID',
        'SERVICE_SUPPORT_TRIAGE_NOT_CONFIGURED',
        'SERVICE_SUPPORT_TRIAGE_QUERY_INVALID',
        'SERVICE_TIMEZONE_INVALID',
        'SERVICE_TRANSLATIONS_REQUIRED',
        'SERVICE_WORKFLOW_ACTIVE_DEFINITION_REQUIRED',
        'SERVICE_WORKFLOW_ACTIVE_VERSION_EXISTS',
        'SERVICE_WORKFLOW_DEFINITION_INVALID',
        'SERVICE_WORKFLOW_DEFINITION_NOT_DRAFT',
        'SERVICE_WORKFLOW_DEFINITION_NOT_FOUND',
        'SERVICE_WORKFLOW_EXECUTION_NOT_FOUND',
        'SERVICE_WORKFLOW_EXECUTION_REQUIRED',
        'SERVICE_WORKFLOW_SLA_INVALID',
        'SERVICE_WORKFLOW_STEP_INVALID',
        'SERVICE_AND_PACKAGE_MUTUALLY_EXCLUSIVE',
        'SERVICE_BOOKING_ACTIVE_PRICING_REQUIRED',
        'SERVICE_BOOKING_CAPACITY_AUTHORITY_MISSING',
        'SERVICE_BOOKING_CAPACITY_CONFLICT',
        'SERVICE_BOOKING_CAPACITY_EXHAUSTED',
        'SERVICE_BOOKING_HOLD_EXPIRED',
        'SERVICE_BOOKING_NOT_CONFIRMED',
        'SERVICE_BOOKING_NOT_FOUND',
        'SERVICE_BOOKING_PAYLOAD_CONFLICT',
        'SERVICE_BOOKING_PRICING_SNAPSHOT_STALE',
        'SERVICE_BOOKING_PROVIDER_SCOPE_MISMATCH',
        'SERVICE_BOOKING_REQUEST_MISMATCH',
        'SERVICE_BOOKING_REQUEST_REQUIRED',
        'SERVICE_BOOKING_SLOT_ALREADY_STARTED',
        'SERVICE_BOOKING_SLOT_PROVIDER_MISMATCH',
        'SERVICE_BOOKING_SLOT_SERVICE_MISMATCH',
        'SERVICE_BOOKING_SLOT_UNAVAILABLE',
        'SERVICE_BOOKING_STUDENT_REQUIRED',
        'SERVICE_BOOKING_TRANSACTION_REQUIRED',
        'SERVICE_BOOKING_TRANSITION_INVALID',
        'SERVICE_DELIVERY_ARTIFACT_METADATA_REQUIRED',
        'SERVICE_DELIVERY_ARTIFACT_TYPE_INVALID',
        'SERVICE_DELIVERY_REVIEW_REQUIRED',
        'SERVICE_DELIVERY_WORKFLOW_MISMATCH',
        'SERVICE_DISCOUNT_ATOMIC_REDEMPTION_CONFLICT',
        'SERVICE_DISCOUNT_CURRENCY_MISMATCH',
        'SERVICE_DISCOUNT_FIXED_VALUE_INVALID',
        'SERVICE_DISCOUNT_MAX_REDEMPTIONS_INVALID',
        'SERVICE_DISCOUNT_NOT_ACTIVE',
        'SERVICE_DISCOUNT_PERCENTAGE_INVALID',
        'SERVICE_DISCOUNT_REDEMPTION_LIMIT_REACHED',
        'SERVICE_DISCOUNT_SCOPE_MISMATCH',
        'SERVICE_DISCOUNT_WINDOW_INVALID',
        'SERVICE_FINANCE_CANCELLATION_PENDING',
        'SERVICE_FINANCIAL_CLEARANCE_REQUIRED',
        'SERVICE_INDEPENDENT_REVIEW_REQUIRED',
        'SERVICE_MONEY_MINOR_UNITS_INVALID',
        'SERVICE_NOT_FOUND',
        'SERVICE_NOT_PUBLISHED',
        'SERVICE_OPERATIONS_AUDIT_REQUIRED',
        'SERVICE_OPERATIONS_NOT_CONFIGURED',
        'SERVICE_OPERATION_EXPECTED_VERSION_REQUIRED',
        'SERVICE_OPERATION_QUERY_INVALID',
        'SERVICE_OPERATION_TERMINAL',
        'SERVICE_OPERATION_VERSION_CONFLICT',
        'SERVICE_OR_PACKAGE_REQUIRED',
        'SERVICE_PACKAGE_ITEM_REQUIRED',
        'SERVICE_PACKAGE_NAME_REQUIRED',
        'SERVICE_PACKAGE_NOT_ACTIVE',
        'SERVICE_PACKAGE_NOT_DRAFT',
        'SERVICE_PACKAGE_NOT_FOUND',
        'SERVICE_PACKAGE_QUANTITY_INVALID',
        'SERVICE_PACKAGE_SEQUENCE_INVALID',
        'SERVICE_PRICING_ACTIVE_VERSION_EXISTS',
        'SERVICE_PRICING_AMOUNT_INVALID',
        'SERVICE_PRICING_CURRENCY_INVALID',
        'SERVICE_PRICING_EFFECTIVE_WINDOW_INVALID',
        'SERVICE_PRICING_NOT_DRAFT',
        'SERVICE_PRICING_NOT_FOUND',
        'SERVICE_PRICING_SCALE_INVALID',
        'SERVICE_PROMOTION_DISCOUNT_NOT_FOUND',
        'SERVICE_PROMOTION_DISCOUNT_SCOPE_MISMATCH',
        'SERVICE_PROMOTION_NAME_REQUIRED',
        'SERVICE_PROMOTION_NOT_ACTIVATABLE',
        'SERVICE_PROMOTION_NOT_ACTIVE',
        'SERVICE_PROMOTION_NOT_FOUND',
        'SERVICE_PROMOTION_SCOPE_MISMATCH',
        'SERVICE_PROMOTION_WINDOW_INVALID',
        'SERVICE_PROVIDER_ACCREDITATION_REQUIRED',
        'SERVICE_PROVIDER_CAPACITY_INVALID',
        'SERVICE_PROVIDER_CONCURRENT_CAPACITY_EXHAUSTED',
        'SERVICE_PROVIDER_NAME_REQUIRED',
        'SERVICE_PROVIDER_NOT_FOUND',
        'SERVICE_PROVIDER_NOT_QUALIFIED',
        'SERVICE_PROVIDER_RETIRED',
        'SERVICE_PROVIDER_SERVICE_NOT_SUPPORTED',
        'SERVICE_PROVIDER_SUPPORTED_SERVICE_REQUIRED',
        'SERVICE_SLOT_CAPACITY_INVALID',
        'SERVICE_SLOT_SERVICE_NOT_FOUND',
        'SERVICE_SLOT_TIMEZONE_PROVIDER_MISMATCH',
        'SERVICE_SLOT_WINDOW_INVALID',
        'SERVICE_TIMEZONE_INVALID',
        'SERVICE_WORKFLOW_ACTIVE_DEFINITION_REQUIRED',
        'SERVICE_WORKFLOW_ACTIVE_VERSION_EXISTS',
        'SERVICE_WORKFLOW_DEFINITION_INVALID',
        'SERVICE_WORKFLOW_DEFINITION_NOT_DRAFT',
        'SERVICE_WORKFLOW_DEFINITION_NOT_FOUND',
        'SERVICE_WORKFLOW_EXECUTION_NOT_FOUND',
        'SERVICE_WORKFLOW_EXECUTION_REQUIRED',
        'SERVICE_WORKFLOW_SLA_INVALID',
        'SERVICE_WORKFLOW_STEP_INVALID',
        'SERVICE_PROVIDER_REVIEW_REQUIRED',
        'SERVICE_PACKAGE_DELIVERY_POLICY_REQUIRED',
        'SERVICE_REVIEW_EVIDENCE_REQUIRED',
        'SERVICE_PROVIDER_CAPACITY_EXHAUSTED',
        'SERVICE_ACCESS_DENIED',
        'SERVICE_AND_PACKAGE_MUTUALLY_EXCLUSIVE',
        'SERVICE_APPOINTMENT_POLICY_REQUIRED',
        'SERVICE_APPROVED_PRICING_REQUIRED',
        'SERVICE_AUTHENTICATION_REQUIRED',
        'SERVICE_BOOKING_ACTIVE_PRICING_REQUIRED',
        'SERVICE_BOOKING_NOT_FOUND',
        'SERVICE_BOOKING_PROVIDER_SCOPE_MISMATCH',
        'SERVICE_BOOKING_SLOT_ALREADY_STARTED',
        'SERVICE_BOOKING_SLOT_PROVIDER_MISMATCH',
        'SERVICE_BOOKING_SLOT_SERVICE_MISMATCH',
        'SERVICE_BOOKING_SLOT_UNAVAILABLE',
        'SERVICE_BOOKING_STUDENT_REQUIRED',
        'SERVICE_DELIVERY_ARTIFACT_METADATA_REQUIRED',
        'SERVICE_DELIVERY_POLICY_REQUIRED',
        'SERVICE_DELIVERY_REVIEW_REQUIRED',
        'SERVICE_DISCOUNT_CURRENCY_MISMATCH',
        'SERVICE_DISCOUNT_FIXED_VALUE_INVALID',
        'SERVICE_DISCOUNT_MAX_REDEMPTIONS_INVALID',
        'SERVICE_DISCOUNT_NOT_ACTIVE',
        'SERVICE_DISCOUNT_PERCENTAGE_INVALID',
        'SERVICE_DISCOUNT_SCOPE_MISMATCH',
        'SERVICE_DISCOUNT_WINDOW_INVALID',
        'SERVICE_DURABLE_OUTBOX_REQUIRED',
        'SERVICE_EXPECTED_VERSION_REQUIRED',
        'SERVICE_FINANCE_CANCELLATION_PENDING',
        'SERVICE_FINANCE_INVOICE_REQUIRED',
        'SERVICE_FINANCE_ORIGIN_MISMATCH',
        'SERVICE_FINANCIAL_CLEARANCE_REQUIRED',
        'SERVICE_FREE_INVOICE_FORBIDDEN',
        'SERVICE_FULFILLMENT_POLICY_REQUIRED',
        'SERVICE_IDEMPOTENCY_KEY_REQUIRED',
        'SERVICE_IDEMPOTENCY_PAYLOAD_CONFLICT',
        'SERVICE_INDEPENDENT_REVIEW_REQUIRED',
        'SERVICE_INPUT_CONSENT_REQUIRED',
        'SERVICE_INPUT_RAW_URL_FORBIDDEN',
        'SERVICE_INPUT_REQUIRED',
        'SERVICE_INPUT_SCHEMA_INVALID',
        'SERVICE_INPUT_SCHEMA_REQUIRED',
        'SERVICE_INPUT_TOO_LARGE',
        'SERVICE_INPUT_TYPE_INVALID',
        'SERVICE_INPUT_UNKNOWN_FIELD',
        'SERVICE_INVOICE_LINK_PENDING',
        'SERVICE_MONEY_MINOR_UNITS_INVALID',
        'SERVICE_NOT_AVAILABLE',
        'SERVICE_NOT_FOUND',
        'SERVICE_NOT_PUBLISHED',
        'SERVICE_OPERATIONS_NOT_CONFIGURED',
        'SERVICE_OR_PACKAGE_REQUIRED',
        'SERVICE_PACKAGE_ITEM_REQUIRED',
        'SERVICE_PACKAGE_NAME_REQUIRED',
        'SERVICE_PACKAGE_NOT_ACTIVE',
        'SERVICE_PACKAGE_NOT_DRAFT',
        'SERVICE_PACKAGE_NOT_FOUND',
        'SERVICE_PACKAGE_QUANTITY_INVALID',
        'SERVICE_PACKAGE_SEQUENCE_INVALID',
        'SERVICE_PRICE_QUOTE_MISMATCH',
        'SERVICE_PRICING_ACTIVE_VERSION_EXISTS',
        'SERVICE_PRICING_AMOUNT_INVALID',
        'SERVICE_PRICING_CURRENCY_INVALID',
        'SERVICE_PRICING_EFFECTIVE_WINDOW_INVALID',
        'SERVICE_PRICING_NOT_DRAFT',
        'SERVICE_PRICING_NOT_FOUND',
        'SERVICE_PRICING_REQUIRED',
        'SERVICE_PRICING_SCALE_INVALID',
        'SERVICE_PROMOTION_DISCOUNT_NOT_FOUND',
        'SERVICE_PROMOTION_DISCOUNT_SCOPE_MISMATCH',
        'SERVICE_PROMOTION_NAME_REQUIRED',
        'SERVICE_PROMOTION_NOT_ACTIVATABLE',
        'SERVICE_PROMOTION_NOT_ACTIVE',
        'SERVICE_PROMOTION_NOT_FOUND',
        'SERVICE_PROMOTION_SCOPE_MISMATCH',
        'SERVICE_PROMOTION_WINDOW_INVALID',
        'SERVICE_PROVIDER_CAPACITY_INVALID',
        'SERVICE_PROVIDER_COUNTRY_MISMATCH',
        'SERVICE_PROVIDER_NAME_REQUIRED',
        'SERVICE_PROVIDER_NOT_FOUND',
        'SERVICE_PROVIDER_NOT_QUALIFIED',
        'SERVICE_PROVIDER_REFERENCE_REQUIRED',
        'SERVICE_PROVIDER_REQUIRED',
        'SERVICE_PROVIDER_RETIRED',
        'SERVICE_PROVIDER_SERVICE_NOT_SUPPORTED',
        'SERVICE_PROVIDER_SUPPORTED_SERVICE_REQUIRED',
        'SERVICE_PUBLICATION_TRANSITION_NOT_ALLOWED',
        'SERVICE_PUBLISHED_UPDATE_INCOMPLETE',
        'SERVICE_REQUEST_EXPECTED_VERSION_REQUIRED',
        'SERVICE_REQUEST_NOT_FOUND',
        'SERVICE_REQUEST_NOT_INVOICEABLE',
        'SERVICE_REQUEST_PROVIDER_ASSIGNMENT_CLOSED',
        'SERVICE_REQUEST_REFERENCE_REQUIRED',
        'SERVICE_REQUEST_VERSION_CONFLICT',
        'SERVICE_REVIEW_STALE',
        'SERVICE_REVIEW_TRANSITION_NOT_ALLOWED',
        'SERVICE_SLA_REQUIRED',
        'SERVICE_SLOT_CAPACITY_INVALID',
        'SERVICE_SLOT_SERVICE_NOT_FOUND',
        'SERVICE_SLOT_TIMEZONE_PROVIDER_MISMATCH',
        'SERVICE_SLOT_WINDOW_INVALID',
        'SERVICE_SUPPORT_TRIAGE_COUNT_OVERFLOW',
        'SERVICE_SUPPORT_TRIAGE_NOT_CONFIGURED',
        'SERVICE_SUPPORT_TRIAGE_QUERY_INVALID',
        'SERVICE_TIMEZONE_INVALID',
        'SERVICE_TRANSLATIONS_REQUIRED',
        'SERVICE_VERSION_CONFLICT',
        'SERVICE_WORKFLOW_ACTIVE_DEFINITION_REQUIRED',
        'SERVICE_WORKFLOW_ACTIVE_VERSION_EXISTS',
        'SERVICE_WORKFLOW_DEFINITION_INVALID',
        'SERVICE_WORKFLOW_DEFINITION_NOT_DRAFT',
        'SERVICE_WORKFLOW_DEFINITION_NOT_FOUND',
        'SERVICE_WORKFLOW_SLA_INVALID',
        'SERVICE_WORKFLOW_STEP_INVALID',
      ]);
      const code = ['P2002', 'P2034'].includes(err.code)
        ? 'SERVICE_OPERATION_VERSION_CONFLICT'
        : err.code === 'P2025'
          ? 'SERVICE_VERSION_CONFLICT'
          : allowed.has(err.message)
            ? err.message
            : 'SERVICE_OPERATION_FAILED';
      const status =
        code === 'SERVICE_OPERATION_FAILED'
          ? 500
          : code === 'SERVICE_AUTHENTICATION_REQUIRED'
            ? 401
            : code === 'SERVICE_ACCESS_DENIED'
              ? 403
              : code.includes('NOT_FOUND')
                ? 404
                : /CONFLICT|PENDING|CLEARANCE|REVIEW|INVOICE|NOT_/.test(code)
                  ? 409
                  : 422;
      res.status(status).json({ error: code, correlationId: req.headers['x-correlation-id'] });
    });

    return router;
  }
}
