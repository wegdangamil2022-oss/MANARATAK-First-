export class EventCausationReference {
  private constructor(private readonly value: string) {}

  public static from(value: string): EventCausationReference {
    if (!value || value.trim().length === 0) {
      throw new Error('EventCausationReference cannot be empty');
    }
    return new EventCausationReference(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: EventCausationReference): boolean {
    return this.value === other.getValue();
  }
}
