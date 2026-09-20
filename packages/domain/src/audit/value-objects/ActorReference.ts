export class ActorReference {
  private constructor(
    private readonly actorId: string,
    private readonly actorType: string
  ) {
    if (!actorId) throw new Error('Actor ID is required for ActorReference');
    if (!actorType) throw new Error('Actor type is required for ActorReference');
  }

  public static create(actorId: string, actorType: string): ActorReference {
    return new ActorReference(actorId, actorType);
  }

  public getActorId(): string {
    return this.actorId;
  }

  public getActorType(): string {
    return this.actorType;
  }
}
