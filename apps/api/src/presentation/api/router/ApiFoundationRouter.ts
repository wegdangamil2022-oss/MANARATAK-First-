import { Router } from 'express';
import { ManageApiServicesUseCase } from '@manaratak/application';
import {
  apiServiceCreateSchema,
  apiServiceListQuerySchema,
  apiServicePublishVersionSchema,
  parseStrict,
  referenceParamSchema,
} from '../../validation/StrictControlPlaneSchemas.js';

export class ApiFoundationRouter {
  public static create({ manageApiServicesUseCase }: { manageApiServicesUseCase: ManageApiServicesUseCase }): Router {
    const router = Router();

    router.post('/', async (req, res, next) => {
      try {
        const result = await manageApiServicesUseCase.createApiService(parseStrict(apiServiceCreateSchema, req.body));
        res.status(201).json(result);
      } catch (error: any) {
        next(error);
      }
    });

    router.get('/', async (req, res, next) => {
      try {
        const criteria = parseStrict(apiServiceListQuerySchema, req.query);
        const result = await manageApiServicesUseCase.listApiServices(criteria);
        res.status(200).json(result);
      } catch (error: any) {
        next(error);
      }
    });

    router.get('/:reference', async (req, res, next) => {
      try {
        const { reference } = parseStrict(referenceParamSchema, req.params);
        const result = await manageApiServicesUseCase.getApiServiceByReference(reference);
        res.status(200).json(result);
      } catch (error: any) {
        next(error);
      }
    });

    router.post('/:reference/activate', async (req, res, next) => {
      try {
        const { reference } = parseStrict(referenceParamSchema, req.params);
        const result = await manageApiServicesUseCase.activateApiService(reference);
        res.status(200).json(result);
      } catch (error: any) {
        next(error);
      }
    });

    router.post('/:reference/deprecate', async (req, res, next) => {
      try {
        const { reference } = parseStrict(referenceParamSchema, req.params);
        const result = await manageApiServicesUseCase.deprecateApiService(reference);
        res.status(200).json(result);
      } catch (error: any) {
        next(error);
      }
    });

    router.post('/:reference/archive', async (req, res, next) => {
      try {
        const { reference } = parseStrict(referenceParamSchema, req.params);
        const result = await manageApiServicesUseCase.archiveApiService(reference);
        res.status(200).json(result);
      } catch (error: any) {
        next(error);
      }
    });

    router.post('/:reference/publish-version', async (req, res, next) => {
      try {
        const { reference } = parseStrict(referenceParamSchema, req.params);
        const payload = parseStrict(apiServicePublishVersionSchema, req.body);
        const result = await manageApiServicesUseCase.publishVersion({ reference, ...payload });
        res.status(201).json(result);
      } catch (error: any) {
        next(error);
      }
    });

    return router;
  }
}
