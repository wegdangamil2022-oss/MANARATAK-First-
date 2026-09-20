import { Request, Response, NextFunction } from 'express';
import { IAuthorizationService, Permission, ForbiddenException } from '@manaratak/core';

export class AuthorizationMiddleware {
  constructor(private readonly authorizationService: IAuthorizationService) {}

  public requirePermission = (permission: Permission) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.authUserId;
        if (!userId) {
          throw new ForbiddenException('User is not authenticated');
        }

        const hasPermission = await this.authorizationService.checkPermission(userId, permission);
        if (!hasPermission) {
          throw new ForbiddenException(`User lacks required permission: ${permission}`);
        }

        next();
      } catch {
        res.status(403).json({ message: 'Forbidden' });
      }
    };
  }
}
