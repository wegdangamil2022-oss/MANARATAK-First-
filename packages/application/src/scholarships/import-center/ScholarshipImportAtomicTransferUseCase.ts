import { randomUUID } from 'node:crypto';
import {
  ScholarshipCompletenessClassifier,
  ScholarshipDeduplicationService,
  ScholarshipImportPayloadSchema,
  ScholarshipNamingService,
  ScholarshipPublicationStatus,
  ScholarshipStatus,
  ScholarshipVerificationStatus,
  type CreateScholarshipDto,
  type IScholarshipRepository,
  type ITransactionalScholarshipRepository,
  type ScholarshipDto,
  type ScholarshipImportPayload,
  type UpdateScholarshipDto,
} from '@manaratak/domain';
import { AtomicDomainMutationCoordinator } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { ScholarshipImportScreeningReader } from './ScholarshipImportScreeningReader';
import type {
  IScholarshipImportAtomicGateway,
  IScholarshipImportReviewDecisionPort,
  IScholarshipImportTransferPort,
  IScholarshipImportVerificationDecisionPort,
  IScholarshipImportCanonicalResolutionDecisionPort,
  ScholarshipImportCenterBatchRecord,
  ScholarshipImportCenterStoredRecord,
  ScholarshipImportReviewDecisionRequest,
  ScholarshipImportReviewDecisionResult,
  ScholarshipImportTransferRequest,
  ScholarshipImportTransferResult,
} from './ScholarshipImportCenterContracts';
import {
  appendScholarshipImportReviewDecision,
  appendScholarshipImportTransferReceipt,
  readScholarshipImportReviewDecision,
  readScholarshipImportTransferReceipt,
  scholarshipImportReviewFingerprint,
  type ScholarshipImportReviewDecisionEnvelope,
} from './ScholarshipImportReviewDecisionCodec';

const OWNER_DOMAIN = 'SCHOLARSHIPS';
const SOURCE = 'scholarship-import-center';
const BLOCKING_CANONICAL_STATES = new Set(['UNRESOLVED', 'AMBIGUOUS', 'REVIEW_REQUIRED']);

type CanonicalTarget =
  | 'PROVIDER_UNIVERSITY'
  | 'UNIVERSITY'
  | 'ACADEMIC_PROGRAM'
  | 'COUNTRY'
  | 'LANGUAGE'
  | 'CURRENCY'
  | 'DEGREE_LEVEL'
  | 'MAJOR'
  | 'INTERNATIONAL_TEST';

interface CanonicalScreeningRecord {
  target: CanonicalTarget;
  state: string;
  rawValue: string | null;
  canonicalReferenceId: string | null;
  canonicalPublicId: string | null;
  canonicalStandardCode: string | null;
}

interface ResolvedDecisionSnapshot {
  verificationState: string;
  verificationDecisionId: string | null;
  verificationRecordedAt: string | null;
  canonical: CanonicalScreeningRecord[];
  canonicalDecisionIds: string[];
  fingerprint: string;
}

interface TransferPlan {
  record: ScholarshipImportCenterStoredRecord;
  batch: ScholarshipImportCenterBatchRecord;
  payload: ScholarshipImportPayload;
  cleanedName: ReturnType<typeof ScholarshipNamingService.clean>;
  canonical: CanonicalScreeningRecord[];
  duplicateKey: string;
  existing: ScholarshipDto | null;
  completeness: ReturnType<typeof ScholarshipCompletenessClassifier.classify>;
  reviewFingerprint: string;
  decisionSnapshot: ResolvedDecisionSnapshot;
}

/**
 * WP12-10 Scholarship-owned command service.
 *
 * Review decisions, canonical Scholarship mutation, ImportRecord promotion link,
 * business audit and transactional outbox are committed through one atomic boundary.
 * The service never creates cross-domain canonical entities and never publishes.
 */
export class ScholarshipImportAtomicTransferUseCase
  implements IScholarshipImportReviewDecisionPort, IScholarshipImportTransferPort
{
  constructor(
    private readonly importGateway: IScholarshipImportAtomicGateway,
    private readonly scholarshipRepository: IScholarshipRepository,
    private readonly atomicMutations: AtomicDomainMutationCoordinator,
    private readonly verificationDecisions?: IScholarshipImportVerificationDecisionPort,
    private readonly canonicalDecisions?: IScholarshipImportCanonicalResolutionDecisionPort,
  ) {}

  async recordDecision(
    input: ScholarshipImportReviewDecisionRequest,
  ): Promise<ScholarshipImportReviewDecisionResult> {
    const repository = this.transactionalScholarshipRepository();
    const initialRecord = await this.requireRecord(this.importGateway, input.recordId);
    const initialBatch = await this.requireScholarshipBatch(this.importGateway, initialRecord.batchId);
    const initialPlan = await this.buildPlan(initialRecord, initialBatch, this.scholarshipRepository, false);

    if (initialRecord.promotedEntityId) {
      throw new Error('SCHOLARSHIP_IMPORT_RECORD_ALREADY_TRANSFERRED');
    }
    if (input.action === 'MERGE' && !initialPlan.existing) {
      throw new Error('SCHOLARSHIP_IMPORT_MERGE_TARGET_NOT_FOUND');
    }

    const decision: ScholarshipImportReviewDecisionEnvelope = {
      version: 1,
      decisionId: randomUUID(),
      recordId: input.recordId,
      action: input.action,
      actorId: input.actorId,
      reason: input.reason,
      correlationId: input.correlationId,
      recordedAt: new Date().toISOString(),
      duplicateKey: initialPlan.duplicateKey,
      targetScholarshipId: initialPlan.existing?.id ?? null,
      reviewFingerprint: initialPlan.reviewFingerprint,
    };

    await this.atomicMutations.execute({
      domain: 'SCHOLARSHIPS',
      aggregateType: 'SCHOLARSHIP_IMPORT_RECORD',
      aggregateId: input.recordId,
      action: 'SCHOLARSHIP_IMPORT_REVIEW_DECISION_RECORDED',
      context: {
        actorId: input.actorId,
        correlationId: input.correlationId,
        source: SOURCE,
      },
    }, async (context) => {
      const importTx = this.importGateway.withTransaction(context);
      const scholarshipTx = repository.withTransaction(context);
      const current = await this.requireRecord(importTx, input.recordId);
      const batch = await this.requireScholarshipBatch(importTx, current.batchId);
      const currentPlan = await this.buildPlan(current, batch, scholarshipTx, false);
      if (current.promotedEntityId) throw new Error('SCHOLARSHIP_IMPORT_RECORD_ALREADY_TRANSFERRED');
      if (currentPlan.reviewFingerprint !== initialPlan.reviewFingerprint) {
        throw new Error('SCHOLARSHIP_IMPORT_REVIEW_CONTEXT_CHANGED');
      }
      if (input.action === 'MERGE' && currentPlan.existing?.id !== initialPlan.existing?.id) {
        throw new Error('SCHOLARSHIP_IMPORT_MERGE_TARGET_CHANGED');
      }
      await importTx.updateRecord(input.recordId, {
        processingNotes: appendScholarshipImportReviewDecision(current.processingNotes, decision),
      });
    });

    return {
      decisionId: decision.decisionId,
      recordId: decision.recordId,
      action: decision.action,
      recordedAt: decision.recordedAt,
    };
  }

  async transfer(input: ScholarshipImportTransferRequest): Promise<ScholarshipImportTransferResult> {
    const repository = this.transactionalScholarshipRepository();

    return this.atomicMutations.execute({
      domain: 'SCHOLARSHIPS',
      aggregateType: 'SCHOLARSHIP_IMPORT_RECORD',
      aggregateId: input.recordId,
      action: 'SCHOLARSHIP_IMPORT_TRANSFERRED',
      context: {
        actorId: input.actorId,
        correlationId: input.correlationId,
        source: SOURCE,
      },
    }, async (context) => {
      const importTx = this.importGateway.withTransaction(context);
      const scholarshipTx = repository.withTransaction(context);
      const record = await this.requireRecord(importTx, input.recordId);
      const batch = await this.requireScholarshipBatch(importTx, record.batchId);

      if (record.promotedEntityId) {
        const linked = await scholarshipTx.findById(record.promotedEntityId);
        if (!linked) throw new Error('SCHOLARSHIP_IMPORT_PROMOTION_LINK_CORRUPT');
        const receipt = readScholarshipImportTransferReceipt(record.processingNotes);
        if (!receipt || receipt.recordId !== record.id || receipt.scholarshipId !== linked.id) {
          throw new Error('SCHOLARSHIP_IMPORT_PROMOTION_LINK_CORRUPT');
        }
        return {
          recordId: record.id,
          scholarshipId: linked.id,
          transferredAt: receipt.transferredAt,
          publicationStatus: linked.publicationStatus ?? ScholarshipPublicationStatus.DRAFT,
        };
      }

      const plan = await this.buildPlan(record, batch, scholarshipTx, true);
      const decision = readScholarshipImportReviewDecision(record.processingNotes);
      let scholarship: ScholarshipDto;
      let mode: 'CREATE' | 'MERGE';

      if (plan.existing) {
        this.assertMergeDecision(decision, plan);
        if (
          plan.existing.publicationStatus === 'PUBLISHED' ||
          plan.existing.publicationStatus === 'ARCHIVED'
        ) {
          throw new Error('SCHOLARSHIP_IMPORT_TARGET_PUBLICATION_LOCKED');
        }
        scholarship = await scholarshipTx.update(
          plan.existing.id,
          this.buildMergeUpdate(plan.existing, plan),
        );
        if (scholarship.id !== plan.existing.id || scholarship.publicId !== plan.existing.publicId) {
          throw new Error('SCHOLARSHIP_IMPORT_CANONICAL_IDENTITY_CHANGED');
        }
        mode = 'MERGE';
      } else {
        if (decision) throw new Error('SCHOLARSHIP_IMPORT_REVIEW_DECISION_NOT_APPLICABLE');
        scholarship = await scholarshipTx.create(this.buildCreate(plan));
        mode = 'CREATE';
      }

      if (scholarship.publicationStatus === 'PUBLISHED') {
        throw new Error('SCHOLARSHIP_IMPORT_TRANSFER_AUTO_PUBLISH_FORBIDDEN');
      }

      const transferredAt = new Date().toISOString();
      await importTx.updateRecord(record.id, {
        promotedEntityId: scholarship.id,
        processingNotes: appendScholarshipImportTransferReceipt(record.processingNotes, {
          version: 1,
          recordId: record.id,
          scholarshipId: scholarship.id,
          actorId: input.actorId,
          correlationId: input.correlationId,
          transferredAt,
          mode,
          verificationDecisionId: plan.decisionSnapshot.verificationDecisionId ?? undefined,
          canonicalDecisionIds: plan.decisionSnapshot.canonicalDecisionIds,
          decisionSnapshotFingerprint: plan.decisionSnapshot.fingerprint,
        }),
      });

      return {
        recordId: record.id,
        scholarshipId: scholarship.id,
        transferredAt,
        publicationStatus: scholarship.publicationStatus ?? ScholarshipPublicationStatus.DRAFT,
      };
    });
  }

  private async buildPlan(
    record: ScholarshipImportCenterStoredRecord,
    batch: ScholarshipImportCenterBatchRecord,
    repository: IScholarshipRepository,
    requireTransferReadiness: boolean,
  ): Promise<TransferPlan> {
    const parsed = ScholarshipImportPayloadSchema.safeParse(record.rawPayload);
    if (!parsed.success) throw new Error('SCHOLARSHIP_IMPORT_PAYLOAD_INVALID');
    const payload = parsed.data;
    const metadata = this.object(payload.metadata);
    const aliases = this.strings(metadata.sourceAliases);
    const cleanedName = ScholarshipNamingService.clean(payload.scholarshipName, aliases);
    const decisionSnapshot = await this.resolvedDecisionSnapshot(record);
    const canonical = decisionSnapshot.canonical;
    const providerCanonicalPublicId = this.stringValue(metadata.providerCanonicalPublicId)
      ?? canonical.find((item) =>
        item.target === 'PROVIDER_UNIVERSITY' && item.state === 'RESOLVED'
      )?.canonicalPublicId
      ?? null;
    const sourceTraceable = this.sourceTraceable(payload, batch);
    const completeness = ScholarshipCompletenessClassifier.classify({
      ...payload,
      cleanedScholarshipName: cleanedName.cleanedScholarshipName,
      providerCanonicalPublicId,
      sourceTraceable,
      extractedFundingTypeCode: cleanedName.extracted.fundingTypeCode,
      extractedDegreeLevels: cleanedName.extracted.degreeLevelLabels,
    });
    if (!completeness.identityReady) {
      throw new Error(`SCHOLARSHIP_IMPORT_THRESHOLD_A_NOT_MET:${completeness.identityMissingFields.join(',')}`);
    }

    if (requireTransferReadiness) {
      if (decisionSnapshot.verificationState !== 'VERIFIED') {
        throw new Error('SCHOLARSHIP_IMPORT_SOURCE_NOT_VERIFIED');
      }
      if (canonical.length === 0) {
        throw new Error('SCHOLARSHIP_IMPORT_CANONICAL_SCREENING_REQUIRED');
      }
      if (canonical.some((item) => BLOCKING_CANONICAL_STATES.has(item.state))) {
        throw new Error('SCHOLARSHIP_IMPORT_CANONICAL_REVIEW_REQUIRED');
      }
    }

    const year = this.stringValue(metadata.academicYear) ?? cleanedName.detectedYear;
    const dedupeInput = {
      cleanedScholarshipName: cleanedName.cleanedScholarshipName,
      providerName: payload.providerName ?? payload.sponsorName,
      providerCanonicalPublicId,
      year,
      countryReferenceId: this.firstResolved(canonical, 'COUNTRY')?.canonicalReferenceId ?? null,
      countrySourceLabel: payload.studyCountry ?? null,
      officialSourceUrl: payload.officialSourceUrl ?? payload.sourceUrl ?? payload.officialWebsite ?? payload.applicationLink ?? null,
      incomingSourceImportRecordId: record.id,
    };
    const duplicateKey = ScholarshipDeduplicationService.buildKey(dedupeInput).duplicateKey;
    let existing = await repository.findByDedupKey(duplicateKey);
    if (!existing) {
      const legacyKey = ScholarshipDeduplicationService.buildLegacyKey(dedupeInput);
      const legacyCandidate = await repository.findByDedupKey(legacyKey);
      if (legacyCandidate) {
        if (!this.legacyDedupeCompatible(legacyCandidate, dedupeInput)) {
          throw new Error('SCHOLARSHIP_LEGACY_DEDUPE_RECONCILIATION_REQUIRED');
        }
        existing = legacyCandidate;
      }
    }
    const reviewFingerprint = scholarshipImportReviewFingerprint({
      rawPayload: record.rawPayload,
      duplicateKey,
      targetScholarshipId: existing?.id ?? null,
    });

    return {
      record,
      batch,
      payload,
      cleanedName,
      canonical,
      duplicateKey,
      existing,
      completeness,
      reviewFingerprint,
      decisionSnapshot,
    };
  }

  private assertMergeDecision(
    decision: ScholarshipImportReviewDecisionEnvelope | null,
    plan: TransferPlan,
  ): void {
    if (!decision) throw new Error('SCHOLARSHIP_IMPORT_REVIEW_DECISION_REQUIRED');
    if (decision.action === 'KEEP_CURRENT') {
      throw new Error('SCHOLARSHIP_IMPORT_KEEP_CURRENT_BLOCKS_TRANSFER');
    }
    if (decision.action === 'SPLIT') {
      throw new Error('SCHOLARSHIP_IMPORT_SPLIT_REQUIRES_NEW_DEDUPE_IDENTITY');
    }
    if (
      decision.action !== 'MERGE' ||
      decision.recordId !== plan.record.id ||
      decision.duplicateKey !== plan.duplicateKey ||
      decision.targetScholarshipId !== plan.existing?.id ||
      decision.reviewFingerprint !== plan.reviewFingerprint
    ) {
      throw new Error('SCHOLARSHIP_IMPORT_REVIEW_DECISION_STALE');
    }
  }

  private buildCreate(plan: TransferPlan): CreateScholarshipDto {
    const common = this.incomingData(plan);
    const publicId = `schol-${randomUUID().slice(0, 8)}`;
    const slugBase = plan.cleanedName.cleanedScholarshipName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'scholarship';
    return {
      publicId,
      slug: `${slugBase}-${publicId.slice(-4)}`,
      canonicalName: plan.cleanedName.cleanedScholarshipName,
      canonicalDedupKey: plan.duplicateKey,
      status: ScholarshipStatus.IMPORTED,
      publicationStatus: ScholarshipPublicationStatus.DRAFT,
      verificationStatus: ScholarshipVerificationStatus.PENDING,
      ...common,
    };
  }

  private buildMergeUpdate(existing: ScholarshipDto, plan: TransferPlan): UpdateScholarshipDto {
    const incoming = this.incomingData(plan);
    const updates: UpdateScholarshipDto = {
      completenessStatus: incoming.completenessStatus,
      sourceImportRecordId: existing.sourceImportRecordId ?? plan.record.id,
    };

    const scalarKeys: Array<keyof UpdateScholarshipDto> = [
      'displayName', 'providerName', 'amountMinorUnits', 'amountCurrencyCode', 'isFullyFunded',
      'applicationDeadline', 'officialWebsite', 'sourceUrl', 'academicYear', 'cycleName',
      'countryReferenceId', 'countrySourceLabel', 'countryScope', 'fundingTypeCode', 'deadlineType',
      'applicationMethod', 'applicationUrl', 'officialSourceUrl', 'sourceLocale', 'lastVerifiedAt', 'verificationStatus',
      'fundingCoverage', 'coverageDetails', 'eligibleMajorsOrFields', 'degreeLevel', 'studyCountry',
      'applicationLink', 'sponsorName', 'requiredDocuments', 'eligibilityCriteria', 'studyLanguage',
      'targetUniversities', 'targetAcademicPrograms', 'fundingAmount', 'currency', 'duration',
      'localizedNames', 'metadata', 'optionalFields',
    ];
    for (const key of scalarKeys) {
      const value = incoming[key as keyof typeof incoming];
      if (this.meaningful(value)) (updates as any)[key] = value;
    }

    if (incoming.benefits?.length) updates.benefits = incoming.benefits;
    if (incoming.degreeTargets?.length) updates.degreeTargets = incoming.degreeTargets;
    if (incoming.majorTargets?.length) updates.majorTargets = incoming.majorTargets;
    if (incoming.eligibilityItems?.length) updates.eligibilityItems = incoming.eligibilityItems;
    if (incoming.requiredDocumentItems?.length) updates.requiredDocumentItems = incoming.requiredDocumentItems;
    if (incoming.universityLinks?.length) updates.universityLinks = incoming.universityLinks;
    updates.sourceEvidence = this.mergeSourceEvidence(existing, incoming.sourceEvidence ?? []);
    return updates;
  }

  private incomingData(plan: TransferPlan): Omit<CreateScholarshipDto, 'publicId' | 'slug' | 'canonicalName' | 'canonicalDedupKey' | 'status'> {
    const payload = plan.payload;
    const metadata = this.object(payload.metadata);
    const countryLabels = this.strings(payload.studyCountry, payload.targetCountries);
    const degreeLabels = this.uniqueStrings(
      this.strings(payload.degreeLevel, payload.studyLevels).concat(plan.cleanedName.extracted.degreeLevelLabels),
    );
    const majorLabels = this.uniqueStrings(this.strings(payload.eligibleMajorsOrFields));
    const currencyResult = this.firstResolved(plan.canonical, 'CURRENCY');
    const countryResult = this.firstResolved(plan.canonical, 'COUNTRY');
    const languageLabels = this.uniqueStrings(this.strings(payload.studyLanguage));
    const languageResult = languageLabels.length ? this.resolutionFor(plan.canonical, 'LANGUAGE', languageLabels[0]) : undefined;
    const fundingTypeCode = this.stringValue(metadata.fundingTypeCode)
      ?? plan.cleanedName.extracted.fundingTypeCode
      ?? (payload.isFullyFunded === true ? 'FULLY_FUNDED' : null);
    const applicationDeadline = this.dateValue(payload.applicationDeadline);
    const officialSourceUrl = this.stringValue(payload.officialSourceUrl)
      ?? this.stringValue(payload.sourceUrl)
      ?? this.stringValue(payload.officialWebsite)
      ?? this.stringValue(payload.applicationLink);
    const sourceLocale = this.stringValue(metadata.sourceLocale)
      ?? this.stringValue(this.object(plan.record.rawPayload)._sourceLocale);
    const lastVerifiedAt = this.dateValue(
      metadata.lastVerifiedAt ?? metadata.verifiedAt ?? plan.decisionSnapshot.verificationRecordedAt,
    );

    return {
      displayName: plan.cleanedName.displayName,
      providerName: payload.providerName ?? payload.sponsorName ?? null,
      completenessStatus: plan.completeness.state,
      verificationStatus: plan.decisionSnapshot.verificationState === 'VERIFIED'
        ? ScholarshipVerificationStatus.VERIFIED
        : ScholarshipVerificationStatus.PENDING,
      amountMinorUnits: payload.amountMinorUnits ?? null,
      amountCurrencyCode: payload.amountCurrencyCode ?? payload.currency ?? null,
      isFullyFunded: payload.isFullyFunded,
      applicationDeadline,
      officialWebsite: payload.officialWebsite ?? null,
      sourceUrl: payload.sourceUrl ?? officialSourceUrl ?? null,
      academicYear: this.stringValue(metadata.academicYear) ?? plan.cleanedName.detectedYear,
      cycleName: this.stringValue(metadata.cycleName),
      countryReferenceId: countryResult?.canonicalReferenceId ?? null,
      countrySourceLabel: countryLabels[0] ?? null,
      countryScope: this.stringValue(metadata.countryScope),
      fundingTypeCode,
      deadlineType: this.stringValue(metadata.deadlineType ?? metadata.deadlineMode),
      applicationMethod: this.stringValue(metadata.applicationMethod),
      applicationUrl: payload.applicationLink ?? null,
      officialSourceUrl: officialSourceUrl ?? null,
      sourceImportRecordId: plan.record.id,
      sourceLocale,
      lastVerifiedAt,
      studyLanguageReferenceId: languageResult?.canonicalReferenceId ?? null,
      studyLanguageSourceLabel: languageLabels[0] ?? null,
      studyLanguageResolutionStatus: languageResult?.state ?? (languageLabels.length ? 'SOURCE_ONLY' : null),
      benefits: this.benefits(plan, fundingTypeCode, currencyResult?.canonicalReferenceId ?? null),
      degreeTargets: degreeLabels.map((label, index) => {
        const resolved = this.resolutionFor(plan.canonical, 'DEGREE_LEVEL', label);
        return {
          targetKey: `degree-${index + 1}-${this.shortKey(label)}`,
          degreeLevelId: resolved?.canonicalReferenceId ?? null,
          sourceLabel: label,
          resolutionStatus: resolved?.state ?? 'SOURCE_ONLY',
        };
      }),
      majorTargets: majorLabels.map((label, index) => {
        const resolved = this.resolutionFor(plan.canonical, 'MAJOR', label);
        return {
          targetKey: `major-${index + 1}-${this.shortKey(label)}`,
          majorId: resolved?.canonicalReferenceId ?? null,
          sourceLabel: label,
          resolutionStatus: resolved?.state ?? 'SOURCE_ONLY',
        };
      }),
      eligibilityItems: this.eligibilityItems(plan),
      requiredDocumentItems: this.requiredDocuments(plan),
      sourceEvidence: this.sourceEvidence(plan, officialSourceUrl, lastVerifiedAt),
      universityLinks: this.universityLinks(plan),
      fundingCoverage: payload.fundingCoverage,
      coverageDetails: payload.coverageDetails,
      eligibleMajorsOrFields: payload.eligibleMajorsOrFields,
      degreeLevel: payload.degreeLevel,
      studyCountry: payload.studyCountry,
      applicationLink: payload.applicationLink,
      sponsorName: payload.sponsorName,
      requiredDocuments: payload.requiredDocuments,
      eligibilityCriteria: payload.eligibilityCriteria,
      studyLanguage: payload.studyLanguage,
      targetUniversities: payload.targetUniversities,
      targetAcademicPrograms: payload.targetAcademicPrograms,
      fundingAmount: payload.fundingAmount,
      currency: payload.currency,
      duration: payload.duration,
      localizedNames: payload.localizedNames,
      metadata: {
        ...(payload.metadata ?? {}),
        rawSourceTitle: plan.cleanedName.rawSourceTitle,
        sourceAliases: plan.cleanedName.sourceAliases,
      },
      optionalFields: {
        rawSourceTitle: plan.cleanedName.rawSourceTitle,
        sourceAliases: plan.cleanedName.sourceAliases,
      },
    };
  }

  private benefits(
    plan: TransferPlan,
    fundingTypeCode: string | null,
    currencyReferenceId: string | null,
  ): NonNullable<CreateScholarshipDto['benefits']> {
    const metadata = this.object(plan.payload.metadata);
    const structured = Array.isArray(metadata.benefits) ? metadata.benefits : [];
    const mapped = structured.flatMap((value, index) => {
      const item = this.object(value);
      const valueText = this.stringValue(item.valueText ?? item.description ?? item.name);
      const benefitTypeCode = this.stringValue(item.benefitTypeCode ?? item.type) ?? fundingTypeCode ?? 'GENERAL';
      if (!valueText && !benefitTypeCode) return [];
      return [{
        benefitKey: this.stringValue(item.benefitKey) ?? `benefit-${index + 1}-${this.shortKey(valueText ?? benefitTypeCode)}`,
        benefitTypeCode,
        coverageTypeCode: this.stringValue(item.coverageTypeCode),
        amount: this.numericValue(item.amount),
        currencyReferenceId,
        valueText,
        durationText: this.stringValue(item.durationText),
        frequencyCode: this.stringValue(item.frequencyCode),
        isCovered: typeof item.isCovered === 'boolean' ? item.isCovered : true,
        isOptional: typeof item.isOptional === 'boolean' ? item.isOptional : false,
        displayOrder: typeof item.displayOrder === 'number' ? item.displayOrder : index,
        notes: this.stringValue(item.notes),
      }];
    });
    if (mapped.length) return mapped;
    const summary = plan.payload.coverageDetails ?? plan.payload.fundingCoverage;
    if (!summary && !fundingTypeCode) return [];
    return [{
      benefitKey: 'funding-summary',
      benefitTypeCode: fundingTypeCode ?? 'GENERAL',
      coverageTypeCode: plan.payload.fundingCoverage ?? null,
      currencyReferenceId,
      valueText: summary ?? null,
      durationText: plan.payload.duration ?? null,
      isCovered: true,
      isOptional: false,
      displayOrder: 0,
    }];
  }

  private eligibilityItems(plan: TransferPlan): NonNullable<CreateScholarshipDto['eligibilityItems']> {
    const items: NonNullable<CreateScholarshipDto['eligibilityItems']> = [];
    if (plan.payload.eligibilityCriteria) {
      items.push({
        itemKey: 'eligibility-text',
        itemTypeCode: 'GENERAL',
        valueText: plan.payload.eligibilityCriteria,
        isRequired: true,
        priorityOrder: 0,
        resolutionStatus: 'SOURCE_ONLY',
      });
    }
    const tests = this.uniqueStrings(this.strings(this.object(plan.payload.metadata).internationalTests));
    tests.forEach((label, index) => {
      const resolved = this.resolutionFor(plan.canonical, 'INTERNATIONAL_TEST', label);
      items.push({
        itemKey: `test-${index + 1}-${this.shortKey(label)}`,
        itemTypeCode: 'INTERNATIONAL_TEST',
        valueText: label,
        internationalTestId: resolved?.canonicalReferenceId ?? null,
        isRequired: true,
        priorityOrder: index + 1,
        resolutionStatus: resolved?.state ?? 'SOURCE_ONLY',
      });
    });
    return items;
  }

  private requiredDocuments(plan: TransferPlan): NonNullable<CreateScholarshipDto['requiredDocumentItems']> {
    const metadata = this.object(plan.payload.metadata);
    const rawItems = Array.isArray(metadata.requiredDocumentItems) ? metadata.requiredDocumentItems : [];
    const structured = rawItems.flatMap((value) => {
      const item = this.object(value);
      const label = this.stringValue(item.displayName ?? item.name ?? item.sourceLabel);
      if (!label) return [];
      const testLabel = this.stringValue(item.internationalTestLabel ?? item.testName);
      const resolved = testLabel ? this.resolutionFor(plan.canonical, 'INTERNATIONAL_TEST', testLabel) : undefined;
      return [{ label, internationalTestId: resolved?.canonicalReferenceId ?? null,
        sourceLabel: this.stringValue(item.sourceLabel) ?? label,
        resolutionStatus: this.stringValue(item.resolutionStatus) ?? resolved?.state ?? 'SOURCE_ONLY' }];
    });
    const labels = this.uniqueStrings(this.strings(plan.payload.requiredDocuments));
    const combined = [
      ...labels.map((label) => ({ label, internationalTestId: null, sourceLabel: label, resolutionStatus: 'SOURCE_ONLY' })),
      ...structured.filter((item) => !labels.includes(item.label)),
    ];
    return combined.map((item, index) => ({
      documentKey: `document-${index + 1}-${this.shortKey(item.label)}`,
      displayName: item.label,
      internationalTestId: item.internationalTestId,
      sourceLabel: item.sourceLabel,
      resolutionStatus: item.resolutionStatus,
      isRequired: true,
      displayOrder: index,
    }));
  }

  private sourceEvidence(
    plan: TransferPlan,
    officialSourceUrl: string | null,
    verifiedAt: Date | null,
  ): NonNullable<CreateScholarshipDto['sourceEvidence']> {
    const urls = this.uniqueStrings(this.strings(
      plan.payload.officialSourceUrl,
      plan.payload.sourceUrl,
      plan.payload.officialWebsite,
      plan.payload.applicationLink,
    ));
    if (officialSourceUrl && !urls.includes(officialSourceUrl)) urls.unshift(officialSourceUrl);
    return urls.map((sourceUrl, index) => ({
      evidenceKey: `source-${this.shortKey(`${plan.record.id}|${sourceUrl}`)}`,
      sourceTypeCode: index === 0 ? 'OFFICIAL_SOURCE' : 'SOURCE_LINK',
      sourceUrl,
      sourceName: plan.batch.sourceSystem,
      trustLevel: index === 0 ? 'PRIMARY' : 'SUPPORTING',
      isOfficial: index === 0,
      importRecordId: plan.record.id,
      capturedAt: this.dateValue(plan.record.createdAt) ?? new Date(),
      verifiedAt,
      metadata: { sourceRowNumber: plan.record.sourceRowNumber ?? null },
    }));
  }

  private universityLinks(plan: TransferPlan): NonNullable<CreateScholarshipDto['universityLinks']> {
    const links: NonNullable<CreateScholarshipDto['universityLinks']> = [];

    (plan.payload.targetUniversityReferences ?? []).forEach((reference, index) => {
      const resolved = this.resolutionForCanonicalId(plan.canonical, 'UNIVERSITY', reference.canonicalId);
      links.push({
        linkKey: `university-ref-${index + 1}-${this.shortKey(reference.canonicalId)}`,
        universityId: resolved?.canonicalReferenceId ?? null,
        sourceLabel: reference.sourceLabel ?? null,
        relationshipTypeCode: 'TARGET_UNIVERSITY',
        resolutionStatus: resolved?.state ?? 'UNRESOLVED',
      });
    });

    this.uniqueStrings(this.strings(plan.payload.targetUniversities)).forEach((label, index) => {
      const resolved = this.resolutionFor(plan.canonical, 'UNIVERSITY', label);
      links.push({
        linkKey: `university-${index + 1}-${this.shortKey(label)}`,
        universityId: resolved?.canonicalReferenceId ?? null,
        sourceLabel: label,
        relationshipTypeCode: 'TARGET_UNIVERSITY',
        resolutionStatus: resolved?.state ?? 'SOURCE_ONLY',
      });
    });

    (plan.payload.targetAcademicProgramReferences ?? []).forEach((reference, index) => {
      const resolved = this.resolutionForCanonicalId(plan.canonical, 'ACADEMIC_PROGRAM', reference.canonicalId);
      links.push({
        linkKey: `program-ref-${index + 1}-${this.shortKey(reference.canonicalId)}`,
        academicProgramId: resolved?.canonicalReferenceId ?? null,
        sourceLabel: reference.sourceLabel ?? null,
        relationshipTypeCode: 'TARGET_PROGRAM',
        resolutionStatus: resolved?.state ?? 'UNRESOLVED',
      });
    });

    this.uniqueStrings(this.strings(plan.payload.targetAcademicPrograms)).forEach((label, index) => {
      const resolved = this.resolutionFor(plan.canonical, 'ACADEMIC_PROGRAM', label);
      links.push({
        linkKey: `program-${index + 1}-${this.shortKey(label)}`,
        academicProgramId: resolved?.canonicalReferenceId ?? null,
        sourceLabel: label,
        relationshipTypeCode: 'TARGET_PROGRAM',
        resolutionStatus: resolved?.state ?? 'UNRESOLVED',
      });
    });

    const seen = new Set<string>();
    return links.filter((link) => {
      const key = `${link.relationshipTypeCode}|${link.universityId ?? ''}|${link.academicProgramId ?? ''}|${this.normalize(link.sourceLabel ?? '')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private mergeSourceEvidence(
    existing: ScholarshipDto,
    incoming: NonNullable<CreateScholarshipDto['sourceEvidence']>,
  ): NonNullable<CreateScholarshipDto['sourceEvidence']> {
    const combined = [...(existing.sourceEvidence ?? []), ...incoming];
    const seen = new Set<string>();
    return combined.filter((item) => {
      const key = `${item.evidenceKey}|${item.importRecordId ?? ''}|${item.sourceUrl}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private legacyDedupeCompatible(existing: ScholarshipDto, input: { countryReferenceId?: string | null; countrySourceLabel?: string | null; officialSourceUrl?: string | null }): boolean {
    const countryMatches = Boolean(input.countryReferenceId && existing.countryReferenceId && input.countryReferenceId === existing.countryReferenceId) ||
      Boolean(input.countrySourceLabel && existing.countrySourceLabel && this.normalize(input.countrySourceLabel) === this.normalize(existing.countrySourceLabel));
    const incomingUrl = input.officialSourceUrl ? this.normalizeUrl(input.officialSourceUrl) : null;
    const existingUrl = existing.officialSourceUrl ? this.normalizeUrl(existing.officialSourceUrl) : null;
    return Boolean(countryMatches && incomingUrl && existingUrl && incomingUrl === existingUrl);
  }

  private normalizeUrl(value: string): string {
    try {
      const url = new URL(value);
      return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/u, '') || '/'}`;
    } catch {
      return this.normalize(value);
    }
  }

  private async resolvedDecisionSnapshot(record: ScholarshipImportCenterStoredRecord): Promise<ResolvedDecisionSnapshot> {
    const verification = this.verificationDecisions ? await this.verificationDecisions.latest(record.id) : null;
    const decisions = this.canonicalDecisions ? await this.canonicalDecisions.list(record.id) : [];
    const resolved = ScholarshipImportScreeningReader.resolve(record.rawPayload, decisions);
    const canonical = resolved.entries as CanonicalScreeningRecord[];
    const canonicalDecisionIds = resolved.decisionIds;
    const verificationState = verification?.state ?? this.verificationState(record.rawPayload);
    const verificationDecisionId = verification?.decisionId ?? null;
    const verificationRecordedAt = verification?.recordedAt ?? null;
    const fingerprint = scholarshipImportReviewFingerprint({
      verificationState, verificationDecisionId, verificationRecordedAt, canonical, canonicalDecisionIds,
    });
    return { verificationState, verificationDecisionId, verificationRecordedAt, canonical, canonicalDecisionIds, fingerprint };
  }

  private firstResolved(
    items: CanonicalScreeningRecord[],
    target: CanonicalTarget,
  ): CanonicalScreeningRecord | null {
    return items.find((item) => item.target === target && item.state === 'RESOLVED') ?? null;
  }

  private resolutionFor(
    items: CanonicalScreeningRecord[],
    target: CanonicalTarget,
    sourceLabel: string,
  ): CanonicalScreeningRecord | null {
    const normalized = this.normalize(sourceLabel);
    return items.find((item) =>
      item.target === target &&
      item.state === 'RESOLVED' &&
      item.rawValue !== null &&
      this.normalize(item.rawValue) === normalized
    ) ?? null;
  }

  private resolutionForCanonicalId(
    items: CanonicalScreeningRecord[],
    target: CanonicalTarget,
    canonicalId: string,
  ): CanonicalScreeningRecord | null {
    const normalized = this.normalize(canonicalId);
    return items.find((item) =>
      item.target === target &&
      item.state === 'RESOLVED' &&
      [item.canonicalReferenceId, item.canonicalPublicId]
        .filter((value): value is string => Boolean(value))
        .some((value) => this.normalize(value) === normalized)
    ) ?? null;
  }

  private verificationState(rawPayload: unknown): string {
    const raw = this.object(rawPayload);
    const metadata = this.object(raw.metadata);
    return (this.stringValue(metadata.verificationState) ?? this.stringValue(raw._verificationState) ?? 'PENDING').toUpperCase();
  }

  private sourceTraceable(payload: ScholarshipImportPayload, batch: ScholarshipImportCenterBatchRecord): boolean {
    return Boolean(
      this.stringValue(payload.officialSourceUrl) ||
      this.stringValue(payload.sourceUrl) ||
      this.stringValue(payload.officialWebsite) ||
      this.stringValue(payload.applicationLink) ||
      this.stringValue(batch.sourceSystem)
    );
  }

  private async requireRecord(
    gateway: Pick<IScholarshipImportAtomicGateway, 'getRecordById'>,
    recordId: string,
  ): Promise<ScholarshipImportCenterStoredRecord> {
    const record = await gateway.getRecordById(recordId);
    if (!record) throw new Error('SCHOLARSHIP_IMPORT_RECORD_NOT_FOUND');
    return record;
  }

  private async requireScholarshipBatch(
    gateway: Pick<IScholarshipImportAtomicGateway, 'getBatchById'>,
    batchId: string,
  ): Promise<ScholarshipImportCenterBatchRecord> {
    const batch = await gateway.getBatchById(batchId);
    if (!batch || batch.dataType.trim().toUpperCase() !== OWNER_DOMAIN) {
      throw new Error('SCHOLARSHIP_IMPORT_RECORD_NOT_IN_SCHOLARSHIP_BATCH');
    }
    return batch;
  }

  private transactionalScholarshipRepository(): ITransactionalScholarshipRepository {
    const repository = this.scholarshipRepository as Partial<ITransactionalScholarshipRepository>;
    if (typeof repository.withTransaction !== 'function') {
      throw new Error('SCHOLARSHIP_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    }
    return this.scholarshipRepository as ITransactionalScholarshipRepository;
  }

  private object(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private strings(...values: unknown[]): string[] {
    return values.flatMap((value) => {
      if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
      if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
      return [];
    });
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.map((value) => value.normalize('NFKC').trim()).filter(Boolean))];
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private normalize(value: string): string {
    return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
  }

  private dateValue(value: unknown): Date | null {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value !== 'string' || !value.trim()) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private numericValue(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/u.test(value.trim())) return Number(value);
    return null;
  }

  private shortKey(value: string): string {
    return scholarshipImportReviewFingerprint(value).slice(0, 12);
  }

  private meaningful(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }
}
