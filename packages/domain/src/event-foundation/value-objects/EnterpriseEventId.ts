export class EnterpriseEventId {
  private constructor(private readonly value: string) {}

  public static generate(): EnterpriseEventId {
    return new EnterpriseEventId(crypto.randomUUID());
  }

  public static from(value: string): EnterpriseEventId {
    if (!value || value.trim().length === 0) {
      throw new Error('EnterpriseEventId cannot be empty');
    }
    return new EnterpriseEventId(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: EnterpriseEventId): boolean {
    return this.value === other.getValue();
  }
}
