import { PermissionReference } from '../value-objects/PermissionReference';

export interface RoleProps {
  id: string;
  name: string;
  description: string;
  permissions: PermissionReference[];
  policyIds: string[];
}

export class Role {
  constructor(private readonly props: RoleProps) {}

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get description(): string { return this.props.description; }
  get permissions(): PermissionReference[] { return this.props.permissions; }
  get policyIds(): string[] { return this.props.policyIds; }

  addPermission(permission: PermissionReference): void {
    if (!this.props.permissions.some(p => p.equals(permission))) {
      this.props.permissions.push(permission);
    }
  }

  removePermission(permission: PermissionReference): void {
    this.props.permissions = this.props.permissions.filter(p => !p.equals(permission));
  }

  addPolicy(policyId: string): void {
    if (!this.props.policyIds.includes(policyId)) {
      this.props.policyIds.push(policyId);
    }
  }

  removePolicy(policyId: string): void {
    this.props.policyIds = this.props.policyIds.filter(id => id !== policyId);
  }
}
