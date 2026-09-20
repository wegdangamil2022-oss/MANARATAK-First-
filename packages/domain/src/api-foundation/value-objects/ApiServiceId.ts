export class ApiServiceId {
  constructor(private readonly value: string) {
    if (!value) throw new Error('ApiServiceId cannot be empty');
  }
  public getValue(): string {
    return this.value;
  }
  public equals(other: ApiServiceId): boolean {
    return this.value === other.getValue();
  }
}
