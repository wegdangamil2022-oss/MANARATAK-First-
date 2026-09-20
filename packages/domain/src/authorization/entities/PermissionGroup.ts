import { PermissionReference } from '../value-objects/PermissionReference';

export interface PermissionGroupProps {
  id: string;
  name: string;
  description: string;
  permissions: PermissionReference[];
}

export class PermissionGroup {
  constructor(public readonly props: PermissionGroupProps) {}

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get permissions(): PermissionReference[] {
    return this.props.permissions;
  }
}
