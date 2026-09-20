import { 
  IAuthorizationService, 
  IPermissionEvaluator,
  Role,
  Permission
} from '@manaratak/core';

export interface IUserRoleProvider {
  getRolesForUser(userId: string): Promise<Role[]>;
}

export class AuthorizationService implements IAuthorizationService {
  constructor(
    private readonly roleProvider: IUserRoleProvider,
    private readonly permissionEvaluator: IPermissionEvaluator
  ) {}

  public async getUserRoles(userId: string): Promise<Role[]> {
    return this.roleProvider.getRolesForUser(userId);
  }

  public async checkPermission(userId: string, permission: Permission): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return this.permissionEvaluator.hasPermission(roles, permission);
  }
}
