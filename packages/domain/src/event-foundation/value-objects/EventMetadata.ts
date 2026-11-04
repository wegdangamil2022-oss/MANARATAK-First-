export class EventMetadata {
  private constructor(private readonly metadata: Readonly<Record<string, unknown>>) {}

  public static create(metadata: Record<string, unknown> = {}): EventMetadata {
    return new EventMetadata(Object.freeze({ ...metadata }));
  }

  public getMetadata(): Readonly<Record<string, unknown>> {
    return this.metadata;
  }
}
