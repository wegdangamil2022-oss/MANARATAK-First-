export interface RoleAssignmentProps {
  id: string;
  identityId: string;
  roleId: string;
  assignedAt: Date;
}

export class RoleAssignment {
  constructor(private readonly props: RoleAssignmentProps) {}

  get id(): string { return this.props.id; }
  get identityId(): string { return this.props.identityId; }
  get roleId(): string { return this.props.roleId; }
  get assignedAt(): Date { return this.props.assignedAt; }
}
