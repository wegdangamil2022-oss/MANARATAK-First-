export class ContextMetadata {
  private constructor(private readonly data: Record<string, unknown>) {
    if (!data) throw new Error('Metadata is required for ContextMetadata');
  }

  public static create(data: Record<string, unknown> = {}): ContextMetadata {
    return new ContextMetadata(data);
  }

  public getData(): Record<string, unknown> {
    return this.data;
  }
}
