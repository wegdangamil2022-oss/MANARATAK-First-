export class CacheEntryId {
  private constructor(private readonly value: string) {}

  public static generate(): CacheEntryId {
    return new CacheEntryId(crypto.randomUUID());
  }

  public static from(value: string): CacheEntryId {
    if (!value || value.trim().length === 0) {
      throw new Error('CacheEntryId cannot be empty');
    }
    return new CacheEntryId(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: CacheEntryId): boolean {
    return this.value === other.getValue();
  }
}
