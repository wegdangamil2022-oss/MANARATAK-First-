import {catalogReferenceReadStamp} from '../../integration/CatalogLifecycleReadPolicy';
import {studentDocumentAttestationState} from '@manaratak/domain';
import {
  AssetReferencePolicy,
  assertAssetReferenceUsable,
} from '../../asset-platform/AssetReferencePolicy';
import { AssetSecurityClassification } from '@manaratak/domain';
import {
  CreateStudentApplicationTrackerDto,
  IStudentApplicationScholarshipGateway,
  IStudentApplicationTrackerRepository,
  UpdateStudentApplicationTrackerDto,
} from '@manaratak/domain';

/** Reminder intents are now exclusively driven by the tracker's transactional P15 outbox. */
export class StudentApplicationTrackerUseCases {
  constructor(
    private readonly repository: IStudentApplicationTrackerRepository,
    private readonly scholarships: IStudentApplicationScholarshipGateway,
    private readonly assets?: AssetReferencePolicy,
  ) {}
  private reconciliationCursor: string | undefined;
  async create(
    input: Omit<CreateStudentApplicationTrackerDto, 'deadlineAt'> & { deadlineAt?: Date | null },
  ) {
    const owner = await this.scholarships.resolve(input.scholarshipId, input.cycleId);
    if (!owner) throw new Error('SCHOLARSHIP_NOT_FOUND');
    if (!owner.available) throw new Error('SCHOLARSHIP_NOT_AVAILABLE');
    if (!owner.cycleId || !owner.cycleKey || !owner.ownerVersionId)
      throw new Error('STUDENT_CANONICAL_CYCLE_REQUIRED');
    const tracker = await this.repository.create({
      ...input,
      cycleReferenceId: owner.cycleId,
      ownerSnapshot: {
        ownerId: owner.id,
        cycleId: owner.cycleId,
        cycleKey: owner.cycleKey,
        ownerVersionId: owner.ownerVersionId,
        deadlineAt: owner.deadlineAt?.toISOString() ?? null,
        displayName: owner.displayName,
        capturedAt: new Date().toISOString(),
      },
      scholarshipId: owner.id,
      scholarshipSlug: owner.slug ?? null,
      deadlineAt: owner.deadlineAt ?? null,
    });
    return { ...tracker, owner };
  }
  async cycles(scholarshipId: string) {
    const owner = await this.scholarships.resolve(scholarshipId);
    if (!owner?.available) throw new Error('SCHOLARSHIP_NOT_AVAILABLE');
    return { scholarshipId: owner.id, displayName: owner.displayName, cycles: owner.cycles ?? [] };
  }
  async bindDocument(
    studentReferenceId: string,
    trackerId: string,
    input: {
      requirementId: string;
      assetId: string;
      expectedVersion: number;
      consent: boolean;
      expiresAt?: Date | null;
    },
  ) {
    if (!input.consent || !input.assetId.trim())
      throw new Error('STUDENT_DOCUMENT_CONSENT_REQUIRED');
    if (
      input.expiresAt &&
      (!Number.isFinite(input.expiresAt.getTime()) || input.expiresAt.getTime() <= Date.now())
    )
      throw new Error('STUDENT_DOCUMENT_EXPIRED');
    const tracker = await this.repository.findById(studentReferenceId, trackerId);
    if (
      !tracker ||
      tracker.status !== 'ACTIVE' ||
      !tracker.cycleReferenceId ||
      tracker.cycleReferenceId === 'LEGACY'
    )
      throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND');
    const owner =
      tracker.cycleReferenceId === 'LEGACY'
        ? null
        : await this.scholarships.resolve(tracker.scholarshipId, tracker.cycleReferenceId);
    const requirement = owner?.requirements?.find((r) => r.id === input.requirementId);
    if (
      !owner?.available ||
      owner.id !== tracker.scholarshipId ||
      owner.cycleId !== tracker.cycleReferenceId ||
      !owner.ownerVersionId ||
      !requirement
    )
      throw new Error('STUDENT_DOCUMENT_REQUIREMENT_UNAVAILABLE');
    const asset=await assertAssetReferenceUsable(this.assets, input.assetId, {
      purpose: 'STUDENT_APPLICATION_DOCUMENT',
      expectedOwnerId: studentReferenceId,
      allowedClassifications: Object.values(AssetSecurityClassification),
      allowedOwnerTypes: ['STUDENT'],
      allowedMimeTypePrefixes: ['application/pdf', 'image/'],
    });
    if(asset?.retention?.expiresAt&&(!Number.isFinite(asset.retention.expiresAt.getTime())||asset.retention.expiresAt.getTime()<=Date.now()))throw new Error('STUDENT_DOCUMENT_ASSET_EXPIRED');
    if (!this.repository.saveDocumentBinding)
      throw new Error('STUDENT_DOCUMENT_STORAGE_NOT_CONFIGURED');
    return this.repository.saveDocumentBinding(
      studentReferenceId,
      trackerId,
      input.expectedVersion,
      {
        requirementId: requirement.id,
        assetId: input.assetId,
        ownerVersionId: owner.ownerVersionId,
        requirementSnapshot: { ...requirement, cycleId: tracker.cycleReferenceId },
        consentGrantedAt: new Date(),
        expiresAt: input.expiresAt ?? null,
        retentionUntil: new Date(Math.min(Date.now()+180*86400000,asset?.retention?.expiresAt?.getTime()??Infinity,input.expiresAt?.getTime()??Infinity)),
      },
    );
  }
  async unbindDocument(
    studentReferenceId: string,
    trackerId: string,
    requirementId: string,
    expectedVersion: number,
  ) {
    if (!this.repository.removeDocumentBinding)
      throw new Error('STUDENT_DOCUMENT_STORAGE_NOT_CONFIGURED');
    return this.repository.removeDocumentBinding(
      studentReferenceId,
      trackerId,
      requirementId,
      expectedVersion,
    );
  }
  async documentReadiness(studentReferenceId: string, trackerId: string) {
    const tracker = await this.repository.findById(studentReferenceId, trackerId);
    if (!tracker) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND');
    if (!this.repository.listDocumentBindings)
      throw new Error('STUDENT_DOCUMENT_STORAGE_NOT_CONFIGURED');
    const bindings = await this.repository.listDocumentBindings(studentReferenceId, trackerId);
    let owner = null;
    try {
      owner =
        tracker.cycleReferenceId && tracker.cycleReferenceId !== 'LEGACY'
          ? await this.scholarships.resolve(tracker.scholarshipId, tracker.cycleReferenceId)
          : null;
    } catch {
      /* Private history survives an unavailable public owner. */
    }
    const available = Boolean(
      owner?.available &&
      owner.id === tracker.scholarshipId &&
      owner.cycleId === tracker.cycleReferenceId &&
      owner.ownerVersionId,
    );
    const currentRequirements = available ? owner!.requirements ?? [] : [];
    const requirements = [...currentRequirements,...bindings.filter(b=>!currentRequirements.some(r=>r.id===b.requirementId)).map(b=>({id:b.requirementId,displayName:String(b.requirementSnapshot.displayName??b.requirementId),required:b.requirementSnapshot.required===true}))];
    const validFuture = (value: Date | string) =>
      Number.isFinite(new Date(value).getTime()) && new Date(value).getTime() > Date.now();
    const entries = await Promise.all(
      requirements.map(async (requirement) => {
        const binding = bindings.find((b) => b.requirementId === requirement.id);
        let state = !available
          ? 'OWNER_UNAVAILABLE'
          : !currentRequirements.some(r=>r.id===requirement.id) ? 'REQUIREMENT_REMOVED' : !binding
            ? 'UNFULFILLED'
            : binding.ownerVersionId !== owner!.ownerVersionId
              ? 'REVISION_CHANGED'
              : (binding.expiresAt && !validFuture(binding.expiresAt)) ||
                  !validFuture(binding.retentionUntil) ||
                  !Number.isFinite(new Date(binding.consentGrantedAt).getTime()) ||
                  new Date(binding.consentGrantedAt).getTime() > Date.now()
                ? 'EXPIRED'
                : 'ASSET_AVAILABLE_UNVERIFIED';
        let verification='NOT_ATTESTED';
        if (state === 'ASSET_AVAILABLE_UNVERIFIED')
          try {
            const asset=await assertAssetReferenceUsable(this.assets, binding!.assetId, {
              purpose: 'STUDENT_APPLICATION_DOCUMENT',
              expectedOwnerId: studentReferenceId,
              allowedClassifications: Object.values(AssetSecurityClassification),
              allowedOwnerTypes: ['STUDENT'],
              allowedMimeTypePrefixes: ['application/pdf', 'image/'],
            });
            if(asset?.retention?.expiresAt&&(!Number.isFinite(asset.retention.expiresAt.getTime())||asset.retention.expiresAt.getTime()<=Date.now()))throw new Error('STUDENT_DOCUMENT_ASSET_EXPIRED');
            verification=studentDocumentAttestationState(binding!,tracker.cycleReferenceId??undefined,asset?.checksum?.hash);
          } catch {
            state = 'ASSET_UNAVAILABLE';
          }
        return {
          requirementId: requirement.id,
          displayName: requirement.displayName,
          required: requirement.required,
          state,
          linked: Boolean(binding),
          bindable: available && currentRequirements.some(r=>r.id===requirement.id),
          verification,
          reviewConsentGranted:Boolean(binding?.reviewConsentGrantedAt),
          reviewRequested:Boolean(binding?.reviewConsentUntil&&binding.reviewConsentUntil.getTime()>Date.now()),
          reviewConsentUntil:binding?.reviewConsentUntil?.toISOString()??null,
        };
      }),
    );
    return {
      trackerId,
      cycleId: tracker.cycleReferenceId ?? 'LEGACY',
      ownerState: available ? 'AVAILABLE' : 'UNAVAILABLE',
      applicationSubmission: 'MANUAL_ONLY',
      entries,
    };
  }
  async listSupportPage(studentReferenceId: string, input: { limit?: number; cursor?: string }) {
    if (!studentReferenceId.trim()) throw new Error('STUDENT_REFERENCE_REQUIRED');
    return this.repository.listSupportPage(studentReferenceId, input);
  }
  /** P15-only, read-only and privacy-minimal tracker change history. */
  async listSupportHistory(
    studentReferenceId: string,
    trackerId: string,
    limit = 20,
    cursor?: string,
  ) {
    if (!studentReferenceId.trim() || !trackerId.trim())
      throw new Error('STUDENT_REFERENCE_REQUIRED');
    return this.repository.listSupportHistory(studentReferenceId, trackerId, limit, cursor);
  }
  async list(studentReferenceId: string) {
    const items = await this.repository.list(studentReferenceId);
    return Promise.all(
      items.map(async (tracker) => {
        let owner;
        try {
          owner =
            tracker.cycleReferenceId === 'LEGACY'
              ? null
              : await this.scholarships.resolve(
                  tracker.scholarshipId,
                  tracker.cycleReferenceId && tracker.cycleReferenceId !== 'LEGACY'
                    ? tracker.cycleReferenceId
                    : undefined,
                );
        } catch {
          owner = null;
        }
        return {
          ...tracker,
          snapshotDeadlineAt: tracker.ownerSnapshot?.deadlineAt ?? tracker.deadlineAt,
          deadlineAt: owner?.available ? (owner.deadlineAt ?? null) : null,
          scholarshipSlug: owner?.available ? (owner.slug ?? null) : null,
          owner,
          reconciliationState:
            (tracker.deadlineAt?.toISOString() ?? null) ===
            (owner?.available ? (owner.deadlineAt?.toISOString() ?? null) : null)
              ? 'CURRENT'
              : 'PENDING_OWNER_PULL',
          ownerRead:catalogReferenceReadStamp({ownerId:tracker.scholarshipId,publicId:null,version:owner?.ownerVersionId??null,effectiveAt:owner?.referenceState?.effectiveAt??null,changeType:owner?.referenceState?.state??(owner?.available?'CURRENT':'UNAVAILABLE'),subject:`SCHOLARSHIP_APPLICATION_CYCLE:${tracker.cycleReferenceId??'LEGACY'}`}),
          applicationMode: 'MANUAL_PLANNING' as const,
          eligibilityState: 'UNKNOWN' as const,
          ownerState: owner ? (owner.available ? 'AVAILABLE' : 'HISTORY_ONLY') : 'UNAVAILABLE',
          cycleSupport:
            tracker.cycleReferenceId && tracker.cycleReferenceId !== 'LEGACY'
              ? ('CANONICAL_CYCLE' as const)
              : ('LEGACY_HISTORY' as const),
        };
      }),
    );
  }
  /** Full catalog pass repeats at EOF/restart. Failed/CAS-conflicting rows retry next pass. */
  async reconcileOwnerPage() {
    if (!this.repository.listOwnerReconciliationPage || !this.repository.reconcileOwnerFacts)
      throw new Error('STUDENT_OWNER_RECONCILIATION_NOT_INTEGRATED');
    const expiredDocumentBindingsRemoved =
      (await this.repository.purgeExpiredDocumentBindings?.(50)) ?? 0;
    const page = await this.repository.listOwnerReconciliationPage(this.reconciliationCursor, 50);
    let changed = 0,
      failed = 0;
    for (const tracker of page.items) {
      try {
        const owner =
          tracker.cycleReferenceId === 'LEGACY'
            ? null
            : await this.scholarships.resolve(
                tracker.scholarshipId,
                tracker.cycleReferenceId && tracker.cycleReferenceId !== 'LEGACY'
                  ? tracker.cycleReferenceId
                  : undefined,
              );
        if (owner && owner.id !== tracker.scholarshipId)
          throw new Error('STUDENT_TRACKER_OWNER_ALIAS_REVIEW_REQUIRED');
        if (
          await this.repository.reconcileOwnerFacts(
            tracker.studentReferenceId,
            tracker.id,
            tracker.version,
            {
              scholarshipId: tracker.scholarshipId,
              slug: owner?.available ? (owner.slug ?? null) : null,
              deadlineAt: owner?.available ? (owner.deadlineAt ?? null) : null,
            },
          )
        )
          ++changed;
      } catch {
        ++failed;
      }
    }
    this.reconciliationCursor = page.nextCursor ?? undefined;
    return {
      scanned: page.items.length,
      changed,
      failed,
      expiredDocumentBindingsRemoved,
      hasMore: Boolean(page.nextCursor),
    };
  }
  async update(
    studentReferenceId: string,
    trackerId: string,
    input: UpdateStudentApplicationTrackerDto,
  ) {
    if (input.deadlineAt !== undefined)
      throw new Error('STUDENT_OFFICIAL_DEADLINE_OWNER_CONTROLLED');
    return this.repository.update(studentReferenceId, trackerId, input);
  }
  async setChecklistItem(
    studentReferenceId: string,
    trackerId: string,
    itemId: string,
    completed: boolean,
    expectedVersion: number,
  ) {
    return this.repository.setChecklistItem(
      studentReferenceId,
      trackerId,
      itemId,
      completed,
      expectedVersion,
    );
  }
  async archive(studentReferenceId: string, trackerId: string, expectedVersion: number) {
    return this.repository.archive(studentReferenceId, trackerId, expectedVersion);
  }
  async remove(studentReferenceId: string, trackerId: string) {
    return this.repository.remove(studentReferenceId, trackerId);
  }
}
