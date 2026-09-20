export class EventDefinition {
  private constructor(
    private readonly type: string,
    private readonly category: string
  ) {}

  public static create(type: string, category: string): EventDefinition {
    if (!type || type.trim().length === 0) {
      throw new Error('Event type cannot be empty');
    }
    if (!category || category.trim().length === 0) {
      throw new Error('Event category cannot be empty');
    }
    return new EventDefinition(type.trim(), category.trim());
  }

  public getType(): string {
    return this.type;
  }

  public getCategory(): string {
    return this.category;
  }

  public equals(other: EventDefinition): boolean {
    return this.type === other.getType() && this.category === other.getCategory();
  }
}
