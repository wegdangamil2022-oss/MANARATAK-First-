export class EventOwnerReference {
  private constructor(private readonly value: string) {}

  public static from(value: string): EventOwnerReference {
    if (!value || value.trim().length === 0) {
      throw new Error('EventOwnerReference cannot be empty');
    }
    return new EventOwnerReference(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: EventOwnerReference): boolean {
    return this.value === other.getValue();
  }
}
