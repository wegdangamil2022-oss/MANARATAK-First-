export class ComplianceMetadata {
  private constructor(private readonly regulatoryTags: string[]) {
    if (!regulatoryTags) throw new Error('Regulatory tags are required for ComplianceMetadata');
  }

  public static create(regulatoryTags: string[] = []): ComplianceMetadata {
    return new ComplianceMetadata(regulatoryTags);
  }

  public getRegulatoryTags(): string[] {
    return this.regulatoryTags;
  }

  public hasTag(tag: string): boolean {
    return this.regulatoryTags.includes(tag);
  }
}
