import {
  AssetSecurityClassification,
  type IStudentApplicationTrackerRepository,
  type IStudentApplicationScholarshipGateway,
  type StudentDocumentAttestation,
} from '@manaratak/domain';
import {
  assertAssetReferenceUsable,
  type AssetReferencePolicy,
} from '../../asset-platform/AssetReferencePolicy';
import type { ProcessAssetLifecycleUseCase } from '../../asset-platform/use-cases/ProcessAssetLifecycleUseCase';
export class StudentDocumentReviewUseCases {
  constructor(
    private readonly repository: IStudentApplicationTrackerRepository,
    private readonly scholarships: IStudentApplicationScholarshipGateway,
    private readonly assets: AssetReferencePolicy,
    private readonly lifecycle: ProcessAssetLifecycleUseCase,
  ) {}
  list(after?: string) {
    if (!this.repository.listPendingDocumentReviews)
      throw new Error('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');
    return this.repository.listPendingDocumentReviews(after);
  }
  async consent(
    studentId: string,
    trackerId: string,
    requirementId: string,
    version: number,
    granted: boolean,
  ) {
    if (!this.repository.setDocumentReviewConsent)
      throw new Error('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');
    if (granted) {
      const rows = await this.repository.listDocumentBindings?.(studentId, trackerId),
        binding = rows?.find((row) => row.requirementId === requirementId);
      if (!binding) throw new Error('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');
      await this.context(binding.id, undefined);
    }
    await this.repository.setDocumentReviewConsent(
      studentId,
      trackerId,
      requirementId,
      version,
      granted,
    );
  }
  private async context(bindingId: string, reviewerId: string | undefined) {
    const item = await this.repository.findDocumentReview?.(bindingId);
    if (!item) throw new Error('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');
    const { binding, tracker } = item,
      now = Date.now();
    if (
      tracker.status !== 'ACTIVE' ||
      tracker.studentReferenceId === reviewerId ||
      binding.retentionUntil.getTime() <= now ||
      (binding.expiresAt && binding.expiresAt.getTime() <= now) ||
      (reviewerId &&
        (!binding.reviewConsentGrantedAt ||
          binding.reviewConsentGrantedAt.getTime() > now ||
          !binding.reviewConsentUntil ||
          binding.reviewConsentUntil.getTime() <= now))
    )
      throw new Error('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');
    if (reviewerId && binding.attestation)
      throw new Error('STUDENT_DOCUMENT_REVIEW_ALREADY_DECIDED');
    const owner = await this.scholarships.resolve(tracker.scholarshipId, tracker.cycleReferenceId);
    if (
      !owner?.available ||
      owner.id !== tracker.scholarshipId ||
      owner.cycleId !== tracker.cycleReferenceId ||
      owner.ownerVersionId !== binding.ownerVersionId ||
      !owner.requirements?.some((r) => r.id === binding.requirementId)
    )
      throw new Error('STUDENT_DOCUMENT_REVIEW_STALE');
    const asset = await assertAssetReferenceUsable(this.assets, binding.assetId, {
      purpose: 'STUDENT_DOCUMENT_REVIEW',
      expectedOwnerId: tracker.studentReferenceId,
      allowedOwnerTypes: ['STUDENT'],
      allowedClassifications: [
        AssetSecurityClassification.INTERNAL,
        AssetSecurityClassification.RESTRICTED,
        AssetSecurityClassification.CONFIDENTIAL,
      ],
      allowedMimeTypePrefixes: ['application/pdf', 'image/'],
    });
    if (!asset?.checksum?.hash || !/^[a-f0-9]{64}$/i.test(asset.checksum.hash))
      throw new Error('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');
    if (
      asset.retention?.expiresAt &&
      (!Number.isFinite(asset.retention.expiresAt.getTime()) ||
        asset.retention.expiresAt.getTime() <= now)
    )
      throw new Error('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');
    return { binding, tracker, asset };
  }
  async open(bindingId: string, reviewerId: string) {
    if (!reviewerId.trim()) throw new Error('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');
    const { binding, tracker, asset } = await this.context(bindingId, reviewerId);
    if (!this.repository.recordDocumentReviewAccess)
      throw new Error('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');
    await this.repository.recordDocumentReviewAccess(bindingId, tracker.version, reviewerId);
    await this.context(bindingId, reviewerId);
    const deadline = Math.min(
        binding.reviewConsentUntil!.getTime(),
        binding.retentionUntil.getTime(),
        binding.expiresAt?.getTime() ?? Infinity,
        asset.retention?.expiresAt?.getTime() ?? Infinity,
      ),
      ttl = Math.min(60, Math.floor((deadline - Date.now()) / 1000));
    if (ttl < 1) throw new Error('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');
    const grant = await this.lifecycle.requestDeliveryGrant({
      assetId: binding.assetId,
      expiresInSeconds: ttl,
    });
    if (!Number.isFinite(Date.parse(grant.expiresAt)) || Date.parse(grant.expiresAt) > deadline)
      throw new Error('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');
    await this.context(bindingId, reviewerId);
    return {
      id: binding.id,
      requirementName: String(binding.requirementSnapshot.displayName ?? 'Document'),
      expectedVersion: tracker.version,
      mimeType: asset.metadata.mimeType,
      retentionUntil: new Date(
        Math.min(
          binding.retentionUntil.getTime(),
          asset.retention?.expiresAt?.getTime() ?? Infinity,
        ),
      ),
      documentExpiresAt: binding.expiresAt,
      consentUntil: binding.reviewConsentUntil,
      delivery: { url: grant.url, headers: grant.headers, expiresAt: grant.expiresAt },
    };
  }
  async attest(
    bindingId: string,
    reviewerId: string,
    input: {
      expectedVersion: number;
      verdict: 'VERIFIED' | 'REJECTED';
      evidenceReference: string;
      reason: string;
      validUntil: string;
    },
  ) {
    const { binding, tracker, asset } = await this.context(bindingId, reviewerId),
      until = Date.parse(input.validUntil);
    if (
      !reviewerId.trim() ||
      !['VERIFIED', 'REJECTED'].includes(input.verdict) ||
      input.reason.trim().length < 6 ||
      input.reason.length > 1000 ||
      !/^[A-Za-z0-9][A-Za-z0-9:_.\/-]{2,239}$/.test(input.evidenceReference) ||
      !Number.isFinite(until) ||
      until <= Date.now() ||
      until > Math.min(binding.retentionUntil.getTime(), binding.expiresAt?.getTime() ?? Infinity)
    )
      throw new Error('STUDENT_DOCUMENT_ATTESTATION_INVALID');
    const attestation: StudentDocumentAttestation = {
      verdict: input.verdict,
      reviewedBy: reviewerId,
      reviewedAt: new Date().toISOString(),
      assetId: binding.assetId,
      checksumSha256: asset.checksum!.hash,
      ownerVersionId: binding.ownerVersionId,
      cycleId: tracker.cycleReferenceId!,
      evidenceReference: input.evidenceReference,
      validUntil: new Date(until).toISOString(),
    };
    if (!this.repository.saveDocumentAttestation)
      throw new Error('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');
    await this.repository.saveDocumentAttestation(
      bindingId,
      input.expectedVersion,
      attestation,
      input.reason.trim(),
    );
    return { state: input.verdict };
  }
}
