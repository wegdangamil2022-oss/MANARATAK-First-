export class ContextMetadata {
  private constructor(private readonly data: Record<string, any>) {
    if (!data) throw new Error('Metadata is required for ContextMetadata');
  }

  public static create(data: Record<string, any> = {}): ContextMetadata {
    return new ContextMetadata(data);
  }

  public getData(): Record<string, any> {
    return this.data;
  }
}
