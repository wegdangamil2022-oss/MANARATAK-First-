export class SourceReference {
  private constructor(private readonly value: string) {
    if (!value) throw new Error('SourceReference is required');
  }

  public static create(value: string): SourceReference {
    return new SourceReference(value);
  }

  public getValue(): string {
    return this.value;
  }
}
