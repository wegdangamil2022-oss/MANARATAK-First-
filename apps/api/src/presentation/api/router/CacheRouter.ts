import { Router } from 'express';
import { ManageCacheUseCase } from '@manaratak/application';
import { cacheAllocateSchema, cacheKeyParamSchema, parseStrict } from '../../validation/StrictControlPlaneSchemas.js';

export class CacheRouter {
  public static create({ manageCacheUseCase }: { manageCacheUseCase: ManageCacheUseCase }): Router {
    const router = Router();

    router.post('/', async (req, res, next) => {
      try {
        const dto = parseStrict(cacheAllocateSchema, req.body);
        const reference = await manageCacheUseCase.allocateCache(dto);
        res.status(201).json({ reference });
      } catch (error: any) {
        next(error);
      }
    });

    router.get('/:scope/:key', async (req, res, next) => {
      try {
        const { scope, key } = parseStrict(cacheKeyParamSchema, req.params);
        const payload = await manageCacheUseCase.getCache({ scope, key });
        if (!payload) return res.status(404).json({ error: 'Cache entry not found or expired' });
        res.status(200).json({ payload });
      } catch (error: any) {
        next(error);
      }
    });

    router.delete('/:scope/:key', async (req, res, next) => {
      try {
        const { scope, key } = parseStrict(cacheKeyParamSchema, req.params);
        await manageCacheUseCase.invalidateCache({ scope, key });
        res.status(204).send();
      } catch (error: any) {
        next(error);
      }
    });

    return router;
  }
}
