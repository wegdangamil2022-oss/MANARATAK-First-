export class EventReference {
  private constructor(private readonly value: string) {}

  public static generate(): EventReference {
    return new EventReference(crypto.randomUUID());
  }

  public static from(value: string): EventReference {
    if (!value || value.trim().length === 0) {
      throw new Error('EventReference cannot be empty');
    }
    return new EventReference(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: EventReference): boolean {
    return this.value === other.getValue();
  }
}
