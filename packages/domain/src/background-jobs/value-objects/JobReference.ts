export class JobReference {
  private constructor(private readonly value: string) {}

  public static generate(): JobReference {
    return new JobReference(crypto.randomUUID());
  }

  public static from(value: string): JobReference {
    if (!value || value.trim().length === 0) {
      throw new Error('JobReference cannot be empty');
    }
    return new JobReference(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: JobReference): boolean {
    return this.value === other.getValue();
  }
}
