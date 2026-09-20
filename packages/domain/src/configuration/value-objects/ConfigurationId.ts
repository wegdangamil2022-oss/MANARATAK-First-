export class ConfigurationId {
  constructor(private readonly value: string = crypto.randomUUID()) {}
  public getValue(): string { return this.value; }
  public equals(other: ConfigurationId): boolean { return this.value === other.getValue(); }
}
