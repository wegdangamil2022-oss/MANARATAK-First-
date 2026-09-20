export class CacheScope {
  private constructor(private readonly value: string) {}

  public static create(value: string): CacheScope {
    if (!value || value.trim().length === 0) {
      throw new Error('CacheScope cannot be empty');
    }
    const sanitized = value.trim().toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(sanitized)) {
      throw new Error('CacheScope must be alphanumeric with dashes or underscores');
    }
    return new CacheScope(sanitized);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: CacheScope): boolean {
    return this.value === other.getValue();
  }
}
