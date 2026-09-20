export class EventPayloadMetadata {
  private constructor(private readonly metadata: Readonly<Record<string, any>>) {}

  public static create(metadata: Record<string, any> = {}): EventPayloadMetadata {
    return new EventPayloadMetadata(Object.freeze({ ...metadata }));
  }

  public getMetadata(): Readonly<Record<string, any>> {
    return this.metadata;
  }
}
