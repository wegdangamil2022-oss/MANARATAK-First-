export class ApiContractMetadata {
  constructor(
    private readonly formatType: string,
    private readonly isStreaming: boolean = false,
    private readonly requestSchemaType: string = 'implicit'
  ) {}

  public getFormatType(): string {
    return this.formatType;
  }

  public getIsStreaming(): boolean {
    return this.isStreaming;
  }

  public getRequestSchemaType(): string {
    return this.requestSchemaType;
  }

  public equals(other: ApiContractMetadata): boolean {
    return (
      this.formatType === other.getFormatType() &&
      this.isStreaming === other.getIsStreaming() &&
      this.requestSchemaType === other.getRequestSchemaType()
    );
  }
}
