export class ApiServiceReference {
  constructor(private readonly value: string) {
    if (!value) throw new Error('ApiServiceReference cannot be empty');
  }
  public getValue(): string {
    return this.value;
  }
  public equals(other: ApiServiceReference): boolean {
    return this.value === other.getValue();
  }
}
