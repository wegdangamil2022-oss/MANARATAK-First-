export class CorrelationReference {
  private constructor(private readonly value: string) {
    if (!value) throw new Error('CorrelationReference is required');
  }

  public static create(value: string): CorrelationReference {
    return new CorrelationReference(value);
  }

  public getValue(): string {
    return this.value;
  }
}
