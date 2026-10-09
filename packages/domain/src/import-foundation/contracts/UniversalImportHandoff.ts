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

/**
 * A Phase 6 dispatcher can invoke a SCREENING_ONLY adapter. Such an adapter
 * must not write, publish or merge canonical entities.
 *
 * A CANONICAL_MUTATION adapter is deliberately NOT admitted by Phase 6 until
 * it has an owning-domain transactional inbox/receipt and independent tests
 * demonstrating atomic idempotency with its canonical side effects.
 * This declaration documents the trust boundary; it is not proof of receipt.
 */
export type ImportHandoffEffectMode = 'SCREENING_ONLY' | 'CANONICAL_MUTATION';

/** The owning domain implements semantic matching, merge, and promotion. */
export interface IImportHandoffConsumer<TResult = unknown> {
  readonly effectMode: ImportHandoffEffectMode;
  accept(handoff: UniversalImportHandoff): Promise<TResult>;
}
