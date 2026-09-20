export class CacheKey {
  private constructor(private readonly value: string) {}

  public static create(value: string): CacheKey {
    if (!value || value.trim().length === 0) {
      throw new Error('CacheKey cannot be empty');
    }
    return new CacheKey(value.trim());
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: CacheKey): boolean {
    return this.value === other.getValue();
  }
}
