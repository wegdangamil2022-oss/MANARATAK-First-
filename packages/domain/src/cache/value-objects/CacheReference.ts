export class CacheReference {
  private constructor(private readonly value: string) {}

  public static generate(): CacheReference {
    return new CacheReference(crypto.randomUUID());
  }

  public static from(value: string): CacheReference {
    if (!value || value.trim().length === 0) {
      throw new Error('CacheReference cannot be empty');
    }
    return new CacheReference(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: CacheReference): boolean {
    return this.value === other.getValue();
  }
}
