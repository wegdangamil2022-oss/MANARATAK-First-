import { createHash, randomUUID } from 'crypto';
import {
  CourseDto,
  CourseImportChangeState,
  CourseStatus,
  ICourseRepository,
  ITransactionalCourseRepository,
} from '@manaratak/domain';
import { AtomicDomainMutationCoordinator } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { CourseImportMasterMapper, CourseImportMappedData } from '../services/CourseImportMasterMapper';
import {
  CourseFieldProvenanceWrite,
  CourseImportTransferApproval,
  CourseImportTransferAnalysis,
  CourseImportTransferGateway,
  CourseImportTransferStoredRecord,
  CourseImportTransferPreview,
  CourseImportTransferRequest,
  CourseImportTransferResult,
} from '../contracts/CourseImportTransferContracts';

const OWNER_DOMAIN = 'COURSES';
const SOURCE = 'course-import-coordinator';
const BLOCKING_STATES = new Set<string>([
  CourseImportChangeState.AMBIGUOUS_MATCH,
  CourseImportChangeState.CONFLICT,
  CourseImportChangeState.INVALID,
  CourseImportChangeState.INCOMPLETE,
  CourseImportChangeState.REJECTED,
]);
const CHANGED_STATES = new Set<string>([
  CourseImportChangeState.URL_CHANGED,
  CourseImportChangeState.METADATA_CHANGED,
  CourseImportChangeState.URL_AND_METADATA_CHANGED,
]);
const URL_CHANGED_STATES = new Set<string>([
  CourseImportChangeState.URL_CHANGED,
  CourseImportChangeState.URL_AND_METADATA_CHANGED,
]);

interface TransferPlan {
  record: CourseImportTransferStoredRecord;
  analysis: CourseImportTransferAnalysis;
  sourceIdentityId: string;
  sourceIdentityCurrentUrl: string;
  mapped: CourseImportMappedData;
  existing: CourseDto | null;
  requiredApprovalFields: string[];
  urlVerificationRequired: boolean;
  reasons: string[];
}

export class CourseImportCoordinator {
  public constructor(
    private readonly gateway: CourseImportTransferGateway,
    private readonly courseRepository: ICourseRepository,
    private readonly atomicMutations: AtomicDomainMutationCoordinator,
  ) {}

  public async preview(recordId: string): Promise<CourseImportTransferPreview> {
    const plan = await this.buildPlan(recordId, this.gateway, this.courseRepository);
    const blocked = plan.reasons.length > 0 || plan.analysis.requiresReview;
    return {
      recordId,
      state: blocked ? 'BLOCKED_REVIEW' : 'READY_TO_TRANSFER',
      analysisId: plan.analysis.id,
      changeState: plan.analysis.changeState,
      requiresReview: plan.analysis.requiresReview,
      requiredApprovalFields: plan.requiredApprovalFields,
      urlVerificationRequired: plan.urlVerificationRequired,
      reasons: plan.reasons,
    };
  }

  public async transfer(input: CourseImportTransferRequest): Promise<CourseImportTransferResult> {
    if (!input.recordId.trim()) throw new Error('COURSE_IMPORT_RECORD_ID_REQUIRED');
    if (!input.actorId.trim()) throw new Error('COURSE_IMPORT_ACTOR_ID_REQUIRED');
    const transactionalCourseRepository = this.transactionalCourseRepository();

    return this.atomicMutations.execute({
      domain: OWNER_DOMAIN,
      aggregateType: 'COURSE_IMPORT_RECORD',
      aggregateId: input.recordId,
      action: 'COURSE_IMPORT_TRANSFERRED',
      context: {
        actorId: input.actorId,
        correlationId: input.correlationId,
        source: SOURCE,
      },
    }, async (context) => {
      const gateway = this.gateway.withTransaction(context);
      const courseRepository = transactionalCourseRepository.withTransaction(context);
      const currentRecord = await gateway.getRecordById(input.recordId);
      if (!currentRecord) throw new Error('COURSE_IMPORT_RECORD_NOT_FOUND');

      if (currentRecord.promotedEntityId) {
        const already = await courseRepository.findById(currentRecord.promotedEntityId);
        if (!already) throw new Error('COURSE_IMPORT_PROMOTION_LINK_CORRUPT');
        return this.result(currentRecord.id, already, 'TRANSFERRED_UNCHANGED');
      }

      const plan = await this.buildPlan(input.recordId, gateway, courseRepository);
      this.assertTransferAllowed(plan, input.approval);

      let course: CourseDto;
      let state: CourseImportTransferResult['state'];
      const writtenFields = new Set<string>();

      if (!plan.existing) {
        const publicId = `course-${randomUUID().slice(0, 8)}`;
        const slugBase = this.slug(plan.mapped.row.courseName);
        course = await courseRepository.create({
          publicId,
          slug: `${slugBase}-${publicId.slice(-4)}`,
          ...plan.mapped.createData,
        });
        state = 'TRANSFERRED_CREATED';
        this.sourceFieldKeys().forEach((field) => writtenFields.add(field));
      } else {
        this.assertTargetMutable(plan.existing);
        this.assertStableProvider(plan.existing, plan.mapped.identity.providerId);

        if (plan.analysis.changeState === CourseImportChangeState.UNCHANGED) {
          course = plan.existing;
          state = 'TRANSFERRED_UNCHANGED';
        } else {
          const approvedFields = new Set(input.approval?.approvedFields ?? []);
          const changedFields = new Set(this.changedSemanticFields(plan.analysis));
          const allowUrl = URL_CHANGED_STATES.has(plan.analysis.changeState);
          const merge = CourseImportMasterMapper.buildMergeUpdate(
            plan.existing as unknown as Record<string, unknown>,
            plan.mapped,
            changedFields,
            allowUrl,
          );
          course = await courseRepository.update(plan.existing.id, merge);
          if (course.id !== plan.existing.id || course.publicId !== plan.existing.publicId) {
            throw new Error('COURSE_IMPORT_CANONICAL_IDENTITY_CHANGED');
          }
          if (allowUrl && !approvedFields.has('directCourseUrl')) {
            throw new Error('COURSE_IMPORT_URL_APPROVAL_REQUIRED');
          }
          changedFields.forEach((field) => writtenFields.add(field));
          if (allowUrl) writtenFields.add('directCourseUrl');
          state = 'TRANSFERRED_UPDATED';
        }
      }

      if (course.status === CourseStatus.PUBLISHED || course.status === CourseStatus.READY_TO_PUBLISH) {
        throw new Error('COURSE_IMPORT_TRANSFER_AUTO_PUBLISH_FORBIDDEN');
      }

      await gateway.linkSourceIdentity({
        identityId: plan.sourceIdentityId,
        courseId: course.id,
        currentUrl: URL_CHANGED_STATES.has(plan.analysis.changeState)
          ? plan.mapped.row.directCourseUrl
          : plan.sourceIdentityCurrentUrl,
      });

      if (URL_CHANGED_STATES.has(plan.analysis.changeState) && plan.existing) {
        await gateway.applyVerifiedUrlChange({
          identityId: plan.sourceIdentityId,
          previousUrl: plan.existing.directCourseUrl,
          nextUrl: plan.mapped.row.directCourseUrl,
          normalizedNextUrl: plan.mapped.identity.normalizedUrl,
          importRecordId: plan.record.id,
        });
      }

      const provenance = this.provenanceWrites(
        course.id,
        plan,
        input.actorId,
        writtenFields.size > 0 ? writtenFields : new Set(this.sourceFieldKeys()),
      );
      await gateway.writeFieldProvenance(provenance);

      const transferredAt = new Date().toISOString();
      const receipt = {
        version: 1,
        recordId: plan.record.id,
        courseId: course.id,
        publicId: course.publicId,
        actorId: input.actorId,
        correlationId: input.correlationId ?? null,
        transferredAt,
        state,
        analysisId: plan.analysis.id,
        analysisChangeState: plan.analysis.changeState,
        approvedFields: input.approval?.approvedFields ?? [],
        urlVerified: input.approval?.urlVerified ?? false,
      };
      await gateway.updateImportLink({
        recordId: plan.record.id,
        courseId: course.id,
        processingNotes: this.appendReceipt(plan.record.processingNotes, receipt),
      });
      await gateway.linkAnalysisCourse({
        importRecordId: plan.record.id,
        courseId: course.id,
        eligibilityState: 'ELIGIBLE_FREE_STUDY',
        completenessState: plan.mapped.completenessStatus,
      });

      return {
        recordId: plan.record.id,
        courseId: course.id,
        publicId: course.publicId,
        state,
        transferredAt,
        publicationStatus: course.status === CourseStatus.INCOMPLETE ? 'INCOMPLETE' : 'IMPORTED',
      };
    });
  }

  private async buildPlan(
    recordId: string,
    gateway: CourseImportTransferGateway,
    repository: ICourseRepository,
  ): Promise<TransferPlan> {
    const record = await gateway.getRecordById(recordId);
    if (!record) throw new Error('COURSE_IMPORT_RECORD_NOT_FOUND');
    const batch = await gateway.getBatchById(record.batchId);
    if (!batch || batch.dataType !== OWNER_DOMAIN) throw new Error('COURSE_IMPORT_BATCH_DOMAIN_MISMATCH');

    const analysis = await gateway.getAnalysisByRecordId(recordId);
    if (!analysis) throw new Error('COURSE_IMPORT_ANALYSIS_REQUIRED');

    const reasons: string[] = [];
    if (BLOCKING_STATES.has(analysis.changeState)) reasons.push(`CHANGE_STATE:${analysis.changeState}`);
    if (record.validationErrors && this.hasValidationErrors(record.validationErrors)) reasons.push('PHASE_06_VALIDATION_ERRORS');

    const relationship = this.object(analysis.relationshipProposals);
    const sourceIdentityId = this.stringValue(relationship?.sourceIdentityId);
    if (!sourceIdentityId) throw new Error('COURSE_IMPORT_SOURCE_IDENTITY_PROPOSAL_REQUIRED');
    const identity = await gateway.getSourceIdentity(sourceIdentityId);
    if (!identity) throw new Error('COURSE_IMPORT_SOURCE_IDENTITY_NOT_FOUND');
    if (identity.status !== 'ACTIVE') reasons.push(`SOURCE_IDENTITY_STATUS:${identity.status}`);

    const dedupKey = this.canonicalDedupKey(identity.providerId, identity.sourceNativeKey, identity.languageVersionKey);
    const mapped = CourseImportMasterMapper.map(analysis.normalizedPayload, dedupKey, record.id);
    if (
      mapped.identity.providerId !== identity.providerId
      || mapped.identity.sourceNativeKey !== identity.sourceNativeKey
      || mapped.identity.languageVersionKey !== identity.languageVersionKey
    ) {
      throw new Error('COURSE_IMPORT_ANALYSIS_IDENTITY_DRIFT');
    }

    const matchedId = this.stringValue(analysis.matchedCourseId) || this.stringValue(identity.courseId);
    if (analysis.matchedCourseId && identity.courseId && analysis.matchedCourseId !== identity.courseId) {
      throw new Error('COURSE_IMPORT_MATCHED_COURSE_IDENTITY_CONFLICT');
    }

    let existing = matchedId ? await repository.findById(matchedId) : null;
    const byDedup = await repository.findByDedupKey(dedupKey);
    if (existing && byDedup && existing.id !== byDedup.id) {
      throw new Error('COURSE_IMPORT_DEDUP_TARGET_CONFLICT');
    }
    if (!existing) existing = byDedup;

    if (existing && existing.externalProviderId && existing.externalProviderId !== identity.providerId) {
      reasons.push('EXISTING_PROVIDER_MISMATCH');
    }

    const requiredApprovalFields = this.requiredApprovalFields(analysis);
    const urlVerificationRequired = URL_CHANGED_STATES.has(analysis.changeState);
    return {
      record,
      analysis,
      sourceIdentityId,
      sourceIdentityCurrentUrl: identity.currentUrl,
      mapped,
      existing,
      requiredApprovalFields,
      urlVerificationRequired,
      reasons,
    };
  }

  private assertTransferAllowed(plan: TransferPlan, approval?: CourseImportTransferApproval): void {
    if (plan.reasons.length > 0) {
      throw new Error(`COURSE_IMPORT_TRANSFER_BLOCKED:${plan.reasons.join(',')}`);
    }
    if (BLOCKING_STATES.has(plan.analysis.changeState)) {
      throw new Error(`COURSE_IMPORT_TRANSFER_BLOCKED:${plan.analysis.changeState}`);
    }

    if (plan.analysis.requiresReview || CHANGED_STATES.has(plan.analysis.changeState)) {
      if (!approval) throw new Error('COURSE_IMPORT_REVIEW_APPROVAL_REQUIRED');
      if (approval.expectedAnalysisId !== plan.analysis.id) throw new Error('COURSE_IMPORT_REVIEW_APPROVAL_STALE');
      if (!approval.reason.trim()) throw new Error('COURSE_IMPORT_REVIEW_REASON_REQUIRED');
      const approved = new Set(approval.approvedFields);
      for (const field of plan.requiredApprovalFields) {
        if (!approved.has(field)) throw new Error(`COURSE_IMPORT_FIELD_APPROVAL_REQUIRED:${field}`);
      }
      if (plan.urlVerificationRequired && approval.urlVerified !== true) {
        throw new Error('COURSE_IMPORT_URL_VERIFICATION_REQUIRED');
      }
    }
  }

  private assertTargetMutable(course: CourseDto): void {
    if (course.status === CourseStatus.PUBLISHED || course.status === CourseStatus.READY_TO_PUBLISH) {
      throw new Error('COURSE_IMPORT_TARGET_PUBLICATION_LOCKED');
    }
  }

  private assertStableProvider(course: CourseDto, providerId: string): void {
    if (course.externalProviderId && course.externalProviderId !== providerId) {
      throw new Error('COURSE_IMPORT_PROVIDER_IDENTITY_CHANGE_FORBIDDEN');
    }
  }

  private requiredApprovalFields(analysis: CourseImportTransferAnalysis): string[] {
    const fields = this.changedSemanticFields(analysis);
    if (URL_CHANGED_STATES.has(analysis.changeState)) fields.push('directCourseUrl');
    return [...new Set(fields)].sort();
  }

  private changedSemanticFields(analysis: CourseImportTransferAnalysis): string[] {
    if (!analysis.fieldDiffs) return [];
    const fields = this.object(analysis.fieldDiffs.fields);
    return fields ? Object.keys(fields).sort() : [];
  }

  private canonicalDedupKey(providerId: string, sourceNativeKey: string, languageVersionKey: string): string {
    return `course-src:${this.sha256(`${providerId}|${sourceNativeKey}|${languageVersionKey}`)}`;
  }

  private provenanceWrites(
    courseId: string,
    plan: TransferPlan,
    actorId: string,
    fields: ReadonlySet<string>,
  ): CourseFieldProvenanceWrite[] {
    const row = plan.mapped.row as unknown as Record<string, unknown>;
    const identity = plan.mapped.identity;
    return [...fields].map((fieldKey) => {
      const value = fieldKey === 'directCourseUrl' ? plan.mapped.row.directCourseUrl : row[fieldKey];
      return {
        courseId,
        fieldKey,
        importRecordId: plan.record.id,
        sourceArtifactHash: plan.mapped.provenance.artifactSha256,
        sourceRowNumber: plan.mapped.provenance.worksheetRowNumber,
        providerId: identity.providerId,
        sourceUrl: plan.mapped.row.directCourseUrl,
        valueHash: this.sha256(this.stableJson(value ?? null)),
        reviewedBy: plan.analysis.requiresReview ? actorId : undefined,
        reviewStatus: plan.analysis.requiresReview ? 'APPROVED' : 'UNREVIEWED',
      };
    });
  }

  private sourceFieldKeys(): string[] {
    return [
      'courseName',
      'directCourseUrl',
      'studyFreeRaw',
      'freeCertificateRaw',
      'certificateTypeRaw',
      'languageRaw',
      'studyLevelRaw',
      'courseDurationRaw',
      'shortCourseTopicsRaw',
    ];
  }

  private result(
    recordId: string,
    course: CourseDto,
    state: 'TRANSFERRED_UNCHANGED',
  ): CourseImportTransferResult {
    return {
      recordId,
      courseId: course.id,
      publicId: course.publicId,
      state,
      transferredAt: course.updatedAt.toISOString(),
      publicationStatus: course.status === CourseStatus.INCOMPLETE ? 'INCOMPLETE' : 'IMPORTED',
    };
  }

  private appendReceipt(existing: string | null | undefined, receipt: Record<string, unknown>): string {
    const marker = `[COURSE_IMPORT_TRANSFER_RECEIPT]${JSON.stringify(receipt)}`;
    return existing?.trim() ? `${existing.trim()}\n${marker}` : marker;
  }

  private slug(value: string): string {
    const slug = value
      .normalize('NFKC')
      .toLocaleLowerCase('en-US')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72);
    return slug || 'course';
  }

  private hasValidationErrors(value: unknown): boolean {
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  }

  private object(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
  }

  private stringValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private stableJson(value: unknown): string {
    const normalize = (item: unknown): unknown => {
      if (Array.isArray(item)) return item.map(normalize);
      if (item && typeof item === 'object') {
        return Object.fromEntries(
          Object.entries(item as Record<string, unknown>)
            .filter(([, entry]) => entry !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, entry]) => [key, normalize(entry)]),
        );
      }
      return item;
    };
    return JSON.stringify(normalize(value));
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private transactionalCourseRepository(): ITransactionalCourseRepository {
    const repository = this.courseRepository as ITransactionalCourseRepository;
    if (typeof repository.withTransaction !== 'function') {
      throw new Error('COURSE_TRANSACTIONAL_REPOSITORY_REQUIRED');
    }
    return repository;
  }
}
