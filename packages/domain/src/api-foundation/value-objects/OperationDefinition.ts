export class OperationDefinition {
  constructor(
    private readonly name: string,
    private readonly inputType: string,
    private readonly outputType: string,
    private readonly isIdempotent: boolean = false
  ) {
    if (!name) throw new Error('OperationDefinition name cannot be empty');
    if (!inputType) throw new Error('OperationDefinition inputType cannot be empty');
    if (!outputType) throw new Error('OperationDefinition outputType cannot be empty');
  }
  public getName(): string {
    return this.name;
  }
  public getInputType(): string {
    return this.inputType;
  }
  public getOutputType(): string {
    return this.outputType;
  }
  public getIsIdempotent(): boolean {
    return this.isIdempotent;
  }
  public equals(other: OperationDefinition): boolean {
    return (
      this.name === other.getName() &&
      this.inputType === other.getInputType() &&
      this.outputType === other.getOutputType() &&
      this.isIdempotent === other.getIsIdempotent()
    );
  }
}
