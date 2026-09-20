import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  ServiceAvailabilityStatus,
  ServiceCategory,
  ServiceDeliveryMode,
  ServiceFulfillmentType
} from '@manaratak/domain';
import { PublicServiceCatalogUseCases } from '@manaratak/application';

export class ServicePublicRouter {
  public static create(cradle: { publicServiceCatalogUseCases: PublicServiceCatalogUseCases }): Router {
    const router = Router();
    const { publicServiceCatalogUseCases } = cradle;

    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

    const listQuerySchema = z.object({
      serviceCategory: z.nativeEnum(ServiceCategory).optional(),
      fulfillmentType: z.nativeEnum(ServiceFulfillmentType).optional(),
      serviceAvailabilityStatus: z.nativeEnum(ServiceAvailabilityStatus).optional(),
      deliveryMode: z.nativeEnum(ServiceDeliveryMode).optional(),
      supportedCountryReferenceId: z.string().min(1).optional(),
      supportedLanguageReferenceId: z.string().min(1).optional(),
      cursor: z.string().trim().min(1).max(2048).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20)
    });

    router.get('/', asyncHandler(async (req: Request, res: Response) => {
      const filters = listQuerySchema.parse(req.query);
      res.json(await publicServiceCatalogUseCases.listServices(filters));
    }));

    router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
      res.json(await publicServiceCatalogUseCases.getService(req.params.slug));
    }));

    router.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      if (err instanceof Error && err.message === 'Service not found') {
        return res.status(404).json({ error: 'Not found' });
      }
      res.status(500).json({ error: 'SERVICE_REQUEST_FAILED' });
    });

    return router;
  }
}
