import {
  UniversityCompletenessClassifier,
  UniversityDeduplicationService,
  UniversityImportCompletenessState,
  UniversityImportPayloadSchema,
  UniversityNamingService,
  type IImportHandoffConsumer,
  type IUniversityRepository,
  type UniversalImportHandoff,
} from '@manaratak/domain';

const ALLOWED_OWNER_DOMAINS = new Set(['UNIVERSITY', 'UNIVERSITIES']);

export type UniversityImportStagingState =
  | 'STAGED_COMPLETE'
  | 'STAGED_NEEDS_REVIEW'
  | 'STAGED_INCOMPLETE'
  | 'STAGED_DUPLICATE_REVIEW';

export interface UniversityImportStagingCandidate {
  stagingKey: string;
  stageState: UniversityImportStagingState;
  normalizedPayload: Readonly<Record<string, unknown>>;
  normalizedUniversityName: string;
  completeness: ReturnType<typeof UniversityCompletenessClassifier.classify>;
  dedupe: {
    key: string;
    duplicate: boolean;
    existingUniversityId?: string;
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
 * Phase 6 -> Universities semantic handoff.
 *
 * The consumer validates and stages the normalized university candidate only.
 * It deliberately performs no University write and never publishes a record.
 * Admin review / canonical relationship resolution remains the owning-domain gate.
 */
export class UniversityImportHandoffService
  implements IImportHandoffConsumer<UniversityImportStagingCandidate>
{
  constructor(private readonly repository: IUniversityRepository) {}

  async accept(handoff: UniversalImportHandoff): Promise<UniversityImportStagingCandidate> {
    const ownerDomain = handoff.ownerDomain.trim().toUpperCase();
    if (!ALLOWED_OWNER_DOMAINS.has(ownerDomain)) {
      throw new Error(`UNIVERSITY_HANDOFF_OWNER_DOMAIN_INVALID:${handoff.ownerDomain}`);
    }
    if (handoff.validation.state === 'INVALID') {
      throw new Error('UNIVERSITY_HANDOFF_INVALID');
    }

    const parsed = UniversityImportPayloadSchema.safeParse(handoff.normalizedPayload);
    if (!parsed.success) {
      throw new Error('UNIVERSITY_HANDOFF_PAYLOAD_INVALID');
    }

    const normalizedPayload = {
      ...parsed.data,
      universityName: UniversityNamingService.normalize(parsed.data.universityName),
    };
    const completeness = UniversityCompletenessClassifier.classify(normalizedPayload);
    const dedupeKey = UniversityDeduplicationService.generateKey(normalizedPayload);
    const existing = await this.repository.findByDedupKey(dedupeKey);

    return {
      stagingKey: `UNIVERSITY|${handoff.execution.idempotencyKey}`,
      stageState: existing
        ? 'STAGED_DUPLICATE_REVIEW'
        : this.stageState(completeness.state),
      normalizedPayload,
      normalizedUniversityName: normalizedPayload.universityName,
      completeness,
      dedupe: {
        key: dedupeKey,
        duplicate: Boolean(existing),
        ...(existing ? { existingUniversityId: existing.id, existingPublicId: existing.publicId } : {}),
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

  private stageState(state: UniversityImportCompletenessState): UniversityImportStagingState {
    if (state === UniversityImportCompletenessState.COMPLETE) return 'STAGED_COMPLETE';
    if (state === UniversityImportCompletenessState.NEEDS_REVIEW) return 'STAGED_NEEDS_REVIEW';
    return 'STAGED_INCOMPLETE';
  }
}
