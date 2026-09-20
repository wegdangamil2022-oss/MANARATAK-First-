export class RoleCreatedEvent {
  constructor(
    public readonly roleId: string,
    public readonly occurredOn: Date = new Date()
  ) {}
}
