import { Router } from 'express';
import { ManageWorkflowsUseCase } from '@manaratak/application';
import {
  parseStrict,
  referenceParamSchema,
  workflowCreateSchema,
  workflowTransitionSchema,
} from '../../validation/StrictControlPlaneSchemas.js';

export class WorkflowRouter {
  public static create({ manageWorkflowsUseCase }: { manageWorkflowsUseCase: ManageWorkflowsUseCase }): Router {
    const router = Router();

    router.post('/', async (req, res, next) => {
      try {
        const result = await manageWorkflowsUseCase.createWorkflow(parseStrict(workflowCreateSchema, req.body));
        res.status(201).json(result);
      } catch (error: any) {
        next(error);
      }
    });

    router.post('/:reference/activate', async (req, res, next) => {
      try {
        const { reference } = parseStrict(referenceParamSchema, req.params);
        const result = await manageWorkflowsUseCase.activateWorkflow(reference);
        res.status(200).json(result);
      } catch (error: any) {
        next(error);
      }
    });

    router.post('/:reference/transition', async (req, res, next) => {
      try {
        const { reference } = parseStrict(referenceParamSchema, req.params);
        const { toState } = parseStrict(workflowTransitionSchema, req.body);
        const result = await manageWorkflowsUseCase.transitionWorkflow({ reference, toState });
        res.status(200).json(result);
      } catch (error: any) {
        next(error);
      }
    });

    router.post('/:reference/archive', async (req, res, next) => {
      try {
        const { reference } = parseStrict(referenceParamSchema, req.params);
        const result = await manageWorkflowsUseCase.archiveWorkflow(reference);
        res.status(200).json(result);
      } catch (error: any) {
        next(error);
      }
    });

    return router;
  }
}
