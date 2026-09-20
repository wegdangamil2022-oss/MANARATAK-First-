import {
  InternationalTestCompletenessClassifier,
  InternationalTestCompletenessStatus,
  InternationalTestDeduplicationService,
  InternationalTestImportPayloadSchema,
  InternationalTestNamingService,
  type IImportHandoffConsumer,
  type IInternationalTestRepository,
  type UniversalImportHandoff,
} from '@manaratak/domain';

const ALLOWED_OWNER_DOMAINS = new Set(['TESTS', 'INTERNATIONAL_TESTS']);

export type InternationalTestImportStagingState =
  | 'STAGED_COMPLETE'
  | 'STAGED_NEEDS_REVIEW'
  | 'STAGED_INCOMPLETE'
  | 'STAGED_DUPLICATE_REVIEW';

export interface InternationalTestImportStagingCandidate {
  stagingKey: string;
  stageState: InternationalTestImportStagingState;
  normalizedPayload: Readonly<Record<string, unknown>>;
  normalizedTestName: string;
  completeness: ReturnType<typeof InternationalTestCompletenessClassifier.classify>;
  dedupe: {
    key: string;
    duplicate: boolean;
    existingTestId?: string;
    existingPublicId?: string;
  };
  promotion: {
    automatic: false;
    publication: false;
    state: 'MANUAL_REVIEW_REQUIRED';
  };
  evidence: {
    handoffId: string;
    artifact: UniversalImportHandoff['artifact'];
    provenance: UniversalImportHandoff['provenance'];
    execution: UniversalImportHandoff['execution'];
    validation: UniversalImportHandoff['validation'];
    correlationId?: string;
    referenceMetadata?: Readonly<Record<string, string>>;
  };
}

/**
 * Phase 6 -> International Tests semantic handoff.
 *
 * The Tests domain owns normalization/deduplication semantics. This consumer only
 * produces a staging candidate; it never writes an InternationalTest and never
 * promotes/publishes automatically.
 */
export class InternationalTestImportHandoffService
  implements IImportHandoffConsumer<InternationalTestImportStagingCandidate>
{
  constructor(private readonly repository: IInternationalTestRepository) {}

  async accept(handoff: UniversalImportHandoff): Promise<InternationalTestImportStagingCandidate> {
    const ownerDomain = handoff.ownerDomain.trim().toUpperCase();
    if (!ALLOWED_OWNER_DOMAINS.has(ownerDomain)) {
      throw new Error(`INTERNATIONAL_TEST_HANDOFF_OWNER_DOMAIN_INVALID:${handoff.ownerDomain}`);
    }
    if (handoff.validation.state === 'INVALID') {
      throw new Error('INTERNATIONAL_TEST_HANDOFF_INVALID');
    }

    const parsed = InternationalTestImportPayloadSchema.safeParse(handoff.normalizedPayload);
    if (!parsed.success) throw new Error('INTERNATIONAL_TEST_HANDOFF_PAYLOAD_INVALID');

    const rawName = parsed.data.testName || parsed.data.canonicalName || parsed.data.displayName || '';
    const normalizedTestName = rawName ? InternationalTestNamingService.normalize(rawName) : '';
    const normalizedPayload = {
      ...parsed.data,
      ...(normalizedTestName ? { canonicalName: normalizedTestName } : {}),
    } as Record<string, unknown>;
    const completeness = InternationalTestCompletenessClassifier.classify(normalizedPayload);
    const dedupeKey = InternationalTestDeduplicationService.generateKey(normalizedPayload);
    const existing = normalizedTestName ? await this.repository.findByDedupKey(dedupeKey) : null;

    return {
      stagingKey: `INTERNATIONAL_TEST|${handoff.execution.idempotencyKey}`,
      stageState: existing ? 'STAGED_DUPLICATE_REVIEW' : this.stageState(completeness.state),
      normalizedPayload,
      normalizedTestName,
      completeness,
      dedupe: {
        key: dedupeKey,
        duplicate: Boolean(existing),
        ...(existing ? {
          existingTestId: existing.id,
          ...(typeof existing.publicId === 'string' ? { existingPublicId: existing.publicId } : {}),
        } : {}),
      },
      promotion: {
        automatic: false,
        publication: false,
        state: 'MANUAL_REVIEW_REQUIRED',
      },
      evidence: {
        handoffId: handoff.handoffId,
        artifact: handoff.artifact,
        provenance: handoff.provenance,
        execution: handoff.execution,
        validation: handoff.validation,
        correlationId: handoff.correlationId,
        referenceMetadata: handoff.referenceMetadata,
      },
    };
  }

  private stageState(state: InternationalTestCompletenessStatus): InternationalTestImportStagingState {
    if (state === InternationalTestCompletenessStatus.COMPLETE) return 'STAGED_COMPLETE';
    if (state === InternationalTestCompletenessStatus.NEEDS_REVIEW) return 'STAGED_NEEDS_REVIEW';
    return 'STAGED_INCOMPLETE';
  }
}
