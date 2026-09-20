import { Router } from 'express';

export class ApiRouter {
  private readonly router: Router;

  constructor() {
    this.router = Router();
  }

  public registerVersion(version: string, versionRouter: Router): void {
    this.router.use(`/${version}`, versionRouter);
  }

  public getRouter(): Router {
    return this.router;
  }
}
