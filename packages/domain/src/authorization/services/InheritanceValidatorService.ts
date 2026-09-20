import { Role } from '../aggregates/Role';
import { PermissionGroup } from '../entities/PermissionGroup';
import { IRoleRepository } from '../repositories/IRoleRepository';

export class InheritanceValidatorService {
  constructor(_roleRepository: IRoleRepository) {}

  public async validateRoleInheritance(_roles: Role[]): Promise<boolean> {
    // Basic structural check. If roles eventually support inheritance,
    // this would check for cycles in the graph.
    // Currently, the architecture mentions avoiding circular inheritance
    // but the Role aggregate itself doesn't explicitly store parent role IDs yet.
    // If it did, this is where the cycle detection would live.
    return true;
  }

  public validatePermissionGroupInheritance(_groups: PermissionGroup[]): boolean {
    return true;
  }
}
