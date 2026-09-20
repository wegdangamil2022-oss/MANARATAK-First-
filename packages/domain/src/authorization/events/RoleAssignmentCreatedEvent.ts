export class RoleAssignmentCreatedEvent {
  constructor(
    public readonly assignmentId: string,
    public readonly identityId: string,
    public readonly roleId: string,
    public readonly occurredOn: Date = new Date()
  ) {}
}
