export class JobDefinition {
  private constructor(private readonly type: string) {}

  public static create(type: string): JobDefinition {
    if (!type || type.trim().length === 0) {
      throw new Error('Job type cannot be empty');
    }
    return new JobDefinition(type.trim());
  }

  public getType(): string {
    return this.type;
  }

  public equals(other: JobDefinition): boolean {
    return this.type === other.getType();
  }
}
