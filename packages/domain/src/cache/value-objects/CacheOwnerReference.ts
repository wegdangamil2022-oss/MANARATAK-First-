export class CacheOwnerReference {
  private constructor(private readonly value: string) {}

  public static from(value: string): CacheOwnerReference {
    if (!value || value.trim().length === 0) {
      throw new Error('CacheOwnerReference cannot be empty');
    }
    return new CacheOwnerReference(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: CacheOwnerReference): boolean {
    return this.value === other.getValue();
  }
}
