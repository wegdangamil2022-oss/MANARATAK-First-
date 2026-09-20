import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  ServiceAvailabilityStatus,
  ServiceCategory,
  ServiceDeliveryMode,
  ServiceFulfillmentType,
  ServiceStatus,
  ServiceCompletenessStatus,
  ServiceRequestStatus,
  UpdateServiceCatalogItemDto
} from '@manaratak/domain';
import { AdminServiceCatalogUseCases, AdminServiceFulfillmentUseCases } from '@manaratak/application';

export class ServiceAdminRouter {
  public static create(cradle: { adminServiceCatalogUseCases: AdminServiceCatalogUseCases; adminServiceFulfillmentUseCases: AdminServiceFulfillmentUseCases }): Router {
    const router = Router();
    const { adminServiceCatalogUseCases, adminServiceFulfillmentUseCases } = cradle;

    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

    const listQuerySchema = z.object({
      status: z.nativeEnum(ServiceStatus).optional(),
      completenessStatus: z.nativeEnum(ServiceCompletenessStatus).optional(),
      serviceCategory: z.nativeEnum(ServiceCategory).optional(),
      fulfillmentType: z.nativeEnum(ServiceFulfillmentType).optional(),
      serviceAvailabilityStatus: z.nativeEnum(ServiceAvailabilityStatus).optional(),
      deliveryMode: z.nativeEnum(ServiceDeliveryMode).optional(),
      page: z.string().optional().transform((value) => value ? parseInt(value, 10) : 1),
      pageSize: z.string().optional().transform((value) => value ? Math.min(parseInt(value, 10), 50) : 20)
    });

    const serviceBodySchema = z.object({
      displayName: z.string().min(1),
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
      optionalFields: z.record(z.string(), z.unknown()).nullable().optional()
    });

    const expectedVersionSchema = z.object({ expectedVersion: z.number().int().positive() }).strict();
    const updateBodySchema = serviceBodySchema.partial().extend({ expectedVersion: z.number().int().positive() }).strict();

    const requestListQuerySchema = z.object({
      studentReferenceId: z.string().min(1).optional(),
      serviceId: z.string().min(1).optional(),
      status: z.nativeEnum(ServiceRequestStatus).optional(),
      page: z.string().optional().transform((value) => value ? parseInt(value, 10) : 1),
      pageSize: z.string().optional().transform((value) => value ? Math.min(parseInt(value, 10), 100) : 20),
    });
    const requestTransitionSchema = z.object({
      status: z.nativeEnum(ServiceRequestStatus),
      fulfillmentMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
      expectedVersion: z.number().int().positive(),
    }).strict();
    const requestInvoiceSchema = z.object({
      description: z.string().trim().min(1).max(240).optional(),
      quantity: z.number().int().positive().max(100).optional(),
      amountMinorUnits: z.string().regex(/^\d+$/),
      currencyCode: z.string().trim().min(3).max(3),
      scale: z.number().int().min(0).max(6),
      expectedVersion: z.number().int().positive(),
    }).strict();

    router.get('/', asyncHandler(async (req: Request, res: Response) => {
      const filters = listQuerySchema.parse(req.query);
      res.json(await adminServiceCatalogUseCases.listServices(filters));
    }));

    router.post('/', asyncHandler(async (req: Request, res: Response) => {
      const body = serviceBodySchema.parse(req.body);
      res.status(201).json(await adminServiceCatalogUseCases.createService(body));
    }));

    router.get('/requests', asyncHandler(async (req: Request, res: Response) => {
      res.json(await adminServiceFulfillmentUseCases.listRequests(requestListQuerySchema.parse(req.query)));
    }));

    router.get('/requests/:requestReference', asyncHandler(async (req: Request, res: Response) => {
      res.json(await adminServiceFulfillmentUseCases.getRequest(req.params.requestReference));
    }));

    router.post('/requests/:requestId/transition', asyncHandler(async (req: Request, res: Response) => {
      const body = requestTransitionSchema.parse(req.body);
      res.json(await adminServiceFulfillmentUseCases.transitionRequest(req.params.requestId, body.status, body.expectedVersion, body.fulfillmentMetadata));
    }));

    router.post('/requests/:requestId/provider', asyncHandler(async (req: Request, res: Response) => {
      const body = z.object({ providerReferenceId: z.string().trim().min(1).max(200), expectedVersion: z.number().int().positive() }).strict().parse(req.body);
      res.json(await adminServiceFulfillmentUseCases.assignProvider(req.params.requestId, body.providerReferenceId, body.expectedVersion));
    }));

    router.post('/requests/:requestId/finance-invoice', asyncHandler(async (req: Request, res: Response) => {
      if (!req.authUserId) throw new Error('ADMIN_AUTHENTICATION_REQUIRED');
      const body = requestInvoiceSchema.parse(req.body);
      res.status(201).json(await adminServiceFulfillmentUseCases.createFinanceInvoice({
        requestId: req.params.requestId,
        actorId: req.authUserId,
        ...body,
      }));
    }));

    router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
      res.json(await adminServiceCatalogUseCases.getService(req.params.id));
    }));

    router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
      const { expectedVersion, ...updates } = updateBodySchema.parse(req.body);
      res.json(await adminServiceCatalogUseCases.updateService(req.params.id, updates as UpdateServiceCatalogItemDto, expectedVersion));
    }));

    router.post('/:id/mark-ready', asyncHandler(async (req: Request, res: Response) => {
      const { expectedVersion } = expectedVersionSchema.parse(req.body);
      res.json(await adminServiceCatalogUseCases.markReadyToReview(req.params.id, expectedVersion));
    }));

    router.post('/:id/mark-publishable', asyncHandler(async (req: Request, res: Response) => {
      const { expectedVersion } = expectedVersionSchema.parse(req.body);
      res.json(await adminServiceCatalogUseCases.markReadyToPublish(req.params.id, expectedVersion));
    }));

    router.post('/:id/publish', asyncHandler(async (req: Request, res: Response) => {
      const { expectedVersion } = expectedVersionSchema.parse(req.body);
      res.json(await adminServiceCatalogUseCases.publish(req.params.id, expectedVersion));
    }));

    router.post('/:id/unpublish', asyncHandler(async (req: Request, res: Response) => {
      const { expectedVersion } = expectedVersionSchema.parse(req.body);
      res.json(await adminServiceCatalogUseCases.unpublish(req.params.id, expectedVersion));
    }));

    router.post('/:id/reject', asyncHandler(async (req: Request, res: Response) => {
      const { expectedVersion } = expectedVersionSchema.parse(req.body);
      res.json(await adminServiceCatalogUseCases.reject(req.params.id, expectedVersion));
    }));

    router.post('/:id/archive', asyncHandler(async (req: Request, res: Response) => {
      const { expectedVersion } = expectedVersionSchema.parse(req.body);
      res.json(await adminServiceCatalogUseCases.archive(req.params.id, expectedVersion));
    }));

    router.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      res.status(400).json({ error: err.message || 'An error occurred' });
    });

    return router;
  }
}
