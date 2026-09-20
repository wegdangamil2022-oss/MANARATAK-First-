export class TraceReference {
  private constructor(private readonly value: string) {
    if (!value) throw new Error('TraceReference is required');
  }

  public static create(value: string): TraceReference {
    return new TraceReference(value);
  }

  public getValue(): string {
    return this.value;
  }
}
