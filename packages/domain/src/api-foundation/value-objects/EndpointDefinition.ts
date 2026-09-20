export class EndpointDefinition {
  constructor(
    private readonly name: string,
    private readonly purpose: string
  ) {
    if (!name) throw new Error('EndpointDefinition name cannot be empty');
    if (!purpose) throw new Error('EndpointDefinition purpose cannot be empty');
  }
  public getName(): string {
    return this.name;
  }
  public getPurpose(): string {
    return this.purpose;
  }
  public equals(other: EndpointDefinition): boolean {
    return this.name === other.getName() && this.purpose === other.getPurpose();
  }
}
