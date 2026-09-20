export class ApiOwnerReference {
  constructor(private readonly value: string) {
    if (!value) throw new Error('ApiOwnerReference cannot be empty');
  }
  public getValue(): string {
    return this.value;
  }
  public equals(other: ApiOwnerReference): boolean {
    return this.value === other.getValue();
  }
}
