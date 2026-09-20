import { Router } from 'express';
import { ManageBackgroundJobsUseCase } from '@manaratak/application';
import { backgroundJobEnqueueSchema, jobReferenceParamSchema, parseStrict } from '../../validation/StrictControlPlaneSchemas.js';

/**
 * Operator control plane. Lifecycle start/complete/fail transitions are intentionally
 * absent: only the durable worker holding the current lease token may mutate execution state.
 */
export class BackgroundJobRouter {
  public static create({ manageBackgroundJobsUseCase }: { manageBackgroundJobsUseCase: ManageBackgroundJobsUseCase }): Router {
    const router = Router();

    router.post('/', async (req, res, next) => {
      try {
        const dto = parseStrict(backgroundJobEnqueueSchema, req.body);
        const reference = await manageBackgroundJobsUseCase.enqueueJob(dto);
        res.status(201).json({ reference });
      } catch (error: any) { next(error); }
    });

    router.get('/:jobReference/status', async (req, res, next) => {
      try {
        const { jobReference } = parseStrict(jobReferenceParamSchema, req.params);
        const status = await manageBackgroundJobsUseCase.getJobStatus({ jobReference });
        res.status(200).json({ status });
      } catch (error: any) {
        if (error.message === 'Job not found') return res.status(404).json({ error: error.message });
        next(error);
      }
    });

    router.delete('/:jobReference', async (req, res, next) => {
      try {
        const { jobReference } = parseStrict(jobReferenceParamSchema, req.params);
        await manageBackgroundJobsUseCase.cancelJob({ jobReference });
        res.status(204).send();
      } catch (error: any) {
        if (error.message === 'Job not found') return res.status(404).json({ error: error.message });
        next(error);
      }
    });

    return router;
  }
}
