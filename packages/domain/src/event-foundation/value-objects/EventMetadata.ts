export class EventMetadata {
  private constructor(private readonly metadata: Readonly<Record<string, any>>) {}

  public static create(metadata: Record<string, any> = {}): EventMetadata {
    return new EventMetadata(Object.freeze({ ...metadata }));
  }

  public getMetadata(): Readonly<Record<string, any>> {
    return this.metadata;
  }
}
