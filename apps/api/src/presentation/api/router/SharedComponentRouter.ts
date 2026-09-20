import { Router, Request, Response } from 'express';
import { ManageSharedComponentsUseCase } from '@manaratak/application';
import {
  parseStrict,
  sharedComponentCreateSchema,
  sharedComponentVersionSchema,
  sharedRefParamSchema,
} from '../../validation/StrictControlPlaneSchemas.js';

export class SharedComponentRouter {
  public static create({ manageSharedComponentsUseCase }: { manageSharedComponentsUseCase: ManageSharedComponentsUseCase }): Router {
    const router = Router();

    router.post('/', async (req: Request, res: Response) => {
      try {
        const result = await manageSharedComponentsUseCase.createComponent(parseStrict(sharedComponentCreateSchema, req.body));
        res.status(201).json(result);
      } catch {
        res.status(400).json({ error: 'SHARED_COMPONENT_REQUEST_INVALID' });
      }
    });

    router.post('/:ref/activate', async (req: Request, res: Response) => {
      try {
        const { ref } = parseStrict(sharedRefParamSchema, req.params);
        const result = await manageSharedComponentsUseCase.activateComponent(ref);
        res.json(result);
      } catch {
        res.status(400).json({ error: 'SHARED_COMPONENT_REQUEST_INVALID' });
      }
    });

    router.post('/versions', async (req: Request, res: Response) => {
      try {
        const result = await manageSharedComponentsUseCase.publishVersion(parseStrict(sharedComponentVersionSchema, req.body));
        res.status(201).json(result);
      } catch {
        res.status(400).json({ error: 'SHARED_COMPONENT_REQUEST_INVALID' });
      }
    });

    router.post('/:ref/deprecate', async (req: Request, res: Response) => {
      try {
        const { ref } = parseStrict(sharedRefParamSchema, req.params);
        const result = await manageSharedComponentsUseCase.deprecateComponent(ref);
        res.json(result);
      } catch {
        res.status(400).json({ error: 'SHARED_COMPONENT_REQUEST_INVALID' });
      }
    });

    router.post('/:ref/archive', async (req: Request, res: Response) => {
      try {
        const { ref } = parseStrict(sharedRefParamSchema, req.params);
        const result = await manageSharedComponentsUseCase.archiveComponent(ref);
        res.json(result);
      } catch {
        res.status(400).json({ error: 'SHARED_COMPONENT_REQUEST_INVALID' });
      }
    });

    return router;
  }
}
