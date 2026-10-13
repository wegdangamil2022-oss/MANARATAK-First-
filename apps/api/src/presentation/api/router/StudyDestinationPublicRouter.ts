import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { StudyDestinationUseCases } from '@manaratak/application';

export class StudyDestinationPublicRouter {
  public static create(cradle: { studyDestinationUseCases: StudyDestinationUseCases }): Router {
    const router = Router();
    router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
    const { studyDestinationUseCases } = cradle;
    const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);
    const listSchema = z.object({
      q:z.string().trim().max(200).optional(),region:z.string().trim().max(100).optional(),
      isFeatured: z.preprocess((value: unknown) => value === undefined ? undefined : String(value).toLowerCase() === 'true', z.boolean().optional()),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
    });

    router.get('/', asyncHandler(async (req: Request, res: Response) => {
      res.json(await studyDestinationUseCases.listPublic(listSchema.parse(req.query)));
    }));

    router.get('/:slug/cities',asyncHandler(async(req:Request,res:Response)=>{const page=z.coerce.number().int().min(1).max(10000).parse(req.query.page??1);res.json(await studyDestinationUseCases.getPublicCities(req.params.slug,page));}));
    router.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
      res.json(await studyDestinationUseCases.getPublicBySlug(req.params.slug));
    }));

    router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (err instanceof z.ZodError) {
        const validationError = err as z.ZodError;
        return res.status(400).json({ error: 'Validation Error', details: validationError.issues });
      }
      if (err instanceof Error && err.message === 'STUDY_DESTINATION_NOT_FOUND') return res.status(404).json({ error: err.message });
      return next(err);
    });
    return router;
  }
}
