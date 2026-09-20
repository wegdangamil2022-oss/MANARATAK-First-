export class EventCorrelationReference {
  private constructor(private readonly value: string) {}

  public static from(value: string): EventCorrelationReference {
    if (!value || value.trim().length === 0) {
      throw new Error('EventCorrelationReference cannot be empty');
    }
    return new EventCorrelationReference(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: EventCorrelationReference): boolean {
    return this.value === other.getValue();
  }
}
