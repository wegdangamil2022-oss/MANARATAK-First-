import { Role, Permission } from './Types';

export interface IAuthorizationService {
  getUserRoles(userId: string): Promise<Role[]>;
  checkPermission(userId: string, permission: Permission): Promise<boolean>;
}
