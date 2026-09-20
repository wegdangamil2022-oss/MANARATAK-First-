export type ImportValidationState = 'VALID' | 'INVALID' | 'NEEDS_REVIEW';

export interface ImportValidationIssue {
  code: string;
  path?: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ImportArtifactIdentity {
  sourceId: string;
  artifactId?: string;
  rawArtifactReference?: string;
}

export interface ImportProvenance {
  sourceSystem: string;
  acquiredAt?: Date;
  sourceRowNumber?: number;
  contentHash?: string;
}

export interface ImportExecutionContext {
  executionId: string;
  importSessionId?: string;
  dryRun: boolean;
  attempt: number;
  idempotencyKey: string;
}

export interface UniversalImportHandoff {
  handoffId: string;
  ownerDomain: string;
  artifact: ImportArtifactIdentity;
  normalizedPayload: Readonly<Record<string, unknown>>;
  provenance: ImportProvenance;
  validation: {
    state: ImportValidationState;
    issues: readonly ImportValidationIssue[];
  };
  execution: ImportExecutionContext;
  correlationId?: string;
  referenceMetadata?: Readonly<Record<string, string>>;
}

/** The owning domain implements semantic matching, merge, and promotion. */
export interface IImportHandoffConsumer<TResult = unknown> {
  accept(handoff: UniversalImportHandoff): Promise<TResult>;
}
