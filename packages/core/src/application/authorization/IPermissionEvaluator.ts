import { Role, Permission } from './Types';

export interface IPermissionEvaluator {
  hasPermission(roles: Role[], permission: Permission): Promise<boolean>;
  hasAnyPermission(roles: Role[], permissions: Permission[]): Promise<boolean>;
  hasAllPermissions(roles: Role[], permissions: Permission[]): Promise<boolean>;
}
