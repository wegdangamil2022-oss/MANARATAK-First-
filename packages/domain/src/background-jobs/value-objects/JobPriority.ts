export class JobPriority {
  private constructor(private readonly level: number) {}

  public static create(level: number): JobPriority {
    if (level < 0) {
      throw new Error('Priority level cannot be negative');
    }
    return new JobPriority(level);
  }

  public getLevel(): number {
    return this.level;
  }

  public equals(other: JobPriority): boolean {
    return this.level === other.getLevel();
  }
}
