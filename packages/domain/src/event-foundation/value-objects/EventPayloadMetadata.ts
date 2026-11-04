export class EventPayloadMetadata {
  private constructor(private readonly metadata: Readonly<Record<string, unknown>>) {}

  public static create(metadata: Record<string, unknown> = {}): EventPayloadMetadata {
    return new EventPayloadMetadata(Object.freeze({ ...metadata }));
  }

  public getMetadata(): Readonly<Record<string, unknown>> {
    return this.metadata;
  }
}
