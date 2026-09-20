import { Router, Request, Response } from 'express';
import { EvaluateAccessUseCase } from '@manaratak/application';
import { ResponseFormatter } from '../response/ResponseFormatter.js';
import { authorizationEvaluateSchema, parseStrict } from '../../validation/StrictControlPlaneSchemas.js';

export class AuthorizationRuntimeRouter {
  public static create({ evaluateAccessUseCase  }: { evaluateAccessUseCase: EvaluateAccessUseCase }): Router {
    const router = Router();
    const responseFormatter = new ResponseFormatter('v1');

    router.post('/evaluate', async (req: Request, res: Response) => {
      try {
        const decision = await evaluateAccessUseCase.execute(parseStrict(authorizationEvaluateSchema, req.body));
        res.status(200).json(responseFormatter.success(decision));
      } catch {
        res.status(400).json(responseFormatter.error({
          code: 'EVALUATION_ERROR',
          message: 'Access evaluation request is invalid'
        }));
      }
    });

    return router;
  }
}
