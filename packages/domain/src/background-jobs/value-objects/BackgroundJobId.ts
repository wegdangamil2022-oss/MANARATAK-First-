export class BackgroundJobId {
  private constructor(private readonly value: string) {}

  public static generate(): BackgroundJobId {
    return new BackgroundJobId(crypto.randomUUID());
  }

  public static from(value: string): BackgroundJobId {
    if (!value || value.trim().length === 0) {
      throw new Error('BackgroundJobId cannot be empty');
    }
    return new BackgroundJobId(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: BackgroundJobId): boolean {
    return this.value === other.getValue();
  }
}
