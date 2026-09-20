export class JobOwnerReference {
  private constructor(private readonly value: string) {}

  public static from(value: string): JobOwnerReference {
    if (!value || value.trim().length === 0) {
      throw new Error('JobOwnerReference cannot be empty');
    }
    return new JobOwnerReference(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: JobOwnerReference): boolean {
    return this.value === other.getValue();
  }
}
