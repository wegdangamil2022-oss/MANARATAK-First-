export class PolicyUpdatedEvent {
  constructor(
    public readonly policyId: string,
    public readonly occurredOn: Date = new Date()
  ) {}
}
