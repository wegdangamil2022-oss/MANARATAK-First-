import { AuditReference } from './AuditReference';

export class AuditChainReference {
  private constructor(private readonly previousReference: AuditReference) {
    if (!previousReference) throw new Error('Previous audit reference is required for a chain reference');
  }

  public static create(previousReference: AuditReference): AuditChainReference {
    return new AuditChainReference(previousReference);
  }

  public getPreviousReference(): AuditReference {
    return this.previousReference;
  }
}
