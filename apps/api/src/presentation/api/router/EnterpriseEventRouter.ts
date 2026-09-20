import { Router, Request, Response } from 'express';
import { ManageEnterpriseEventsUseCase } from '@manaratak/application';
import { enterpriseEventPublishSchema, enterpriseEventRegisterSchema, parseStrict, referenceParamSchema } from '../../validation/StrictControlPlaneSchemas.js';

export class EnterpriseEventRouter {
  public readonly router: Router;

  constructor(private readonly manageEnterpriseEventsUseCase: ManageEnterpriseEventsUseCase) {
    this.router = Router();
    this.registerRoutes();
  }

  public static create({ manageEnterpriseEventsUseCase  }: { manageEnterpriseEventsUseCase: ManageEnterpriseEventsUseCase }): Router {
    const instance = new EnterpriseEventRouter(manageEnterpriseEventsUseCase);
    return instance.router;
  }

  private registerRoutes(): void {
    this.router.post('/register', this.register.bind(this));
    this.router.post('/publish', this.publish.bind(this));
    this.router.post('/:reference/archive', this.archive.bind(this));
    this.router.get('/:reference', this.getByReference.bind(this));
  }

  private async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.manageEnterpriseEventsUseCase.register(parseStrict(enterpriseEventRegisterSchema, req.body));
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async publish(req: Request, res: Response): Promise<void> {
    try {
      await this.manageEnterpriseEventsUseCase.publish(parseStrict(enterpriseEventPublishSchema, req.body));
      res.status(200).json({ message: 'Event successfully handed off for publication' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async archive(req: Request, res: Response): Promise<void> {
    try {
      const { reference } = parseStrict(referenceParamSchema, req.params);
      await this.manageEnterpriseEventsUseCase.archive(reference);
      res.status(200).json({ message: 'Event archived successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async getByReference(req: Request, res: Response): Promise<void> {
    try {
      const { reference } = parseStrict(referenceParamSchema, req.params);
      const result = await this.manageEnterpriseEventsUseCase.getByReference(reference);
      if (!result) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
