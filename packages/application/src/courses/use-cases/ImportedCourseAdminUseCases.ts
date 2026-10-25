import type {AtomicMutationRequestContext} from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { randomUUID } from 'node:crypto';
import { CourseSourceIdentityPolicy } from '../services/CourseSourceIdentityPolicy';
import {
  CourseOriginType,
  ExternalCourseProviderImportStrategy,
  ExternalCourseProviderStatus,
  IExternalCourseProviderRepository,
  IImportedCourseLinkChecker,
  IImportedCourseOperationsRepository,
  ImportedCourseAdminFilters,
  ImportedCourseAdminRecord,
  ImportedCourseAdminDetail,
  ImportedCourseLinkCheckResult,
  ImportedCoursePage,
  ImportedCourseUpdateInput,
  ManualExternalCourseInput, CourseAccessType, CourseStatus, CourseImportCompletenessState,
} from '@manaratak/domain';
import { AdminCourseUseCases } from './AdminCourseUseCases';

export class ImportedCourseAdminUseCases {
  public async history(id: string, page = 1) {
    const course = await this.get(id);
    if (!this.operationsRepository.history) throw new Error('COURSE_HISTORY_NOT_CONFIGURED');
    return this.operationsRepository.history(course.id, page);
  }
  public constructor(
    private readonly operationsRepository: IImportedCourseOperationsRepository,
    private readonly providerRepository: IExternalCourseProviderRepository,
    private readonly adminCourseUseCases: AdminCourseUseCases,
    private readonly linkChecker: IImportedCourseLinkChecker,
  ) {}

  public async createManual(input: ManualExternalCourseInput, actorId: string) {
    if (!actorId || !input.originalSourceTitle.trim()) throw new Error('MANUAL_COURSE_TITLE_AND_ACTOR_REQUIRED');
    if (!this.operationsRepository.createManualCourse) throw new Error('MANUAL_COURSE_TRANSACTION_REQUIRED');
    if (input.certificateAvailable === false && input.isFreeCertificate === true) throw new Error('COURSE_CERTIFICATE_FACTS_CONFLICT');
    const observedAt = Date.parse(input.evidenceObservedAt);
    if (!Number.isFinite(observedAt) || observedAt > Date.now()) throw new Error('COURSE_EVIDENCE_DATE_INVALID');
    const provider = await this.providerRepository.findById(input.externalProviderId);
    if (!provider || provider.status !== ExternalCourseProviderStatus.APPROVED) throw new Error('MANUAL_COURSE_PROVIDER_NOT_APPROVED');
    const identity = CourseSourceIdentityPolicy.derive(provider, input.originalSourceTitle, input.learningLanguageRaw ?? '', input.directCourseUrl);
    const evidenceUrl = CourseSourceIdentityPolicy.normalizeUrl(input.evidenceUrl);
    if (!(await this.providerRepository.isDomainApproved(provider.id, identity.normalizedUrl)) || !(await this.providerRepository.isDomainApproved(provider.id, evidenceUrl))) throw new Error('MANUAL_COURSE_DOMAIN_NOT_APPROVED');
    const id = randomUUID().replace(/-/g, '');
    const accessType = input.isStudyFree === false ? CourseAccessType.PAID : input.isStudyFree === true && input.isFreeCertificate === true ? CourseAccessType.FREE_STUDY_AND_CERTIFICATE : CourseAccessType.FREE_STUDY;
    return this.operationsRepository.createManualCourse({ identity, normalizedUrl: identity.normalizedUrl, course: {
      publicId: `CRS-EXT-${id.slice(0, 12).toUpperCase()}`, slug: `external-course-${id}`, canonicalName: identity.normalizedOriginalTitle,
      canonicalDedupKey: identity.canonicalDedupKey, displayName: input.displayName?.trim() || input.originalSourceTitle.trim(),
      originType: CourseOriginType.EXTERNAL_LINKED_COURSE, accessType, directCourseUrl: input.directCourseUrl,
      status: CourseStatus.DRAFT, completenessStatus: CourseImportCompletenessState.NEEDS_REVIEW,
      externalProviderId: provider.id, originalSourceTitle: input.originalSourceTitle.trim(), providerName: provider.displayName,
      platformName: input.platformName?.trim(), learningLanguageRaw: input.learningLanguageRaw, studyLevelRaw: input.studyLevelRaw,
      studyDurationRaw: input.studyDurationRaw, shortCourseTopicsRaw: input.shortCourseTopicsRaw, certificateType: input.certificateType,
      isStudyFree: input.isStudyFree ?? undefined, isFreeCertificate: input.isFreeCertificate ?? undefined, certificateAvailable: input.certificateAvailable ?? undefined,
      sourceUrl: evidenceUrl, officialSourceUrl: evidenceUrl,
      optionalFields: { creationOrigin: 'MANUAL', manualEvidence: { url: evidenceUrl, observedAt: input.evidenceObservedAt, actorId, note: input.evidenceNote?.trim() ?? '' },
        description: input.description?.trim(), learningOutcomes: input.learningOutcomes, prerequisites: input.prerequisites, acquiredSkills: input.acquiredSkills,
        certificateConditions: input.certificateConditions?.trim() },
    } });
  }

  public async list(filters: ImportedCourseAdminFilters): Promise<ImportedCoursePage> {
    const page = await this.operationsRepository.listImportedCourses(filters);
    return { ...page, data: page.data.map(record => ({ ...record,
      verificationState: record.sourceVerified === true ? 'VERIFIED' as const
        : record.sourceVerified === false ? 'NEEDS_VERIFICATION' as const : 'UNKNOWN' as const,
    })) };
  }

  public async get(id: string): Promise<ImportedCourseAdminDetail> {
    const course = await this.operationsRepository.getImportedCourseById(id);
    if (!course) throw new Error('IMPORTED_COURSE_NOT_FOUND');
    this.assertImported(course);
    return course;
  }

  public async update(id: string, updates: ImportedCourseUpdateInput): Promise<ImportedCourseAdminDetail> {
    const existing = await this.get(id);
    if (updates.originType && updates.originType !== CourseOriginType.EXTERNAL_LINKED_COURSE) {
      throw new Error('IMPORTED_COURSE_ORIGIN_CHANGE_FORBIDDEN');
    }
    if (
      updates.externalProviderId !== undefined &&
      updates.externalProviderId !== existing.externalProviderId
    ) {
      throw new Error('IMPORTED_COURSE_PROVIDER_IDENTITY_CHANGE_FORBIDDEN');
    }

    const directUrlChanged =
      updates.directCourseUrl !== undefined &&
      updates.directCourseUrl !== existing.directCourseUrl;

    if (directUrlChanged) {
      // URL evolution is source-lineage metadata. It must go through the reviewed
      // identity/diff -> CourseImportCoordinator path so CourseSourceIdentity,
      // CourseSourceUrlHistory, provenance, and the canonical Course change atomically.
      throw new Error('IMPORTED_COURSE_DIRECT_URL_CHANGE_REQUIRES_CONTROLLED_IMPORT');
    }

    let accessType = updates.accessType;
    if (updates.certificateAvailable !== undefined || updates.isFreeCertificate !== undefined || updates.isStudyFree !== undefined) {
      const current = await this.adminCourseUseCases.getCourse(id);
      const nextAvailable = updates.certificateAvailable !== undefined ? updates.certificateAvailable : current.certificateAvailable;
      const nextFree = updates.isFreeCertificate !== undefined ? updates.isFreeCertificate : current.isFreeCertificate;
      if (nextAvailable === false && nextFree === true) throw new Error('COURSE_CERTIFICATE_FACTS_CONFLICT');
      const study = updates.isStudyFree !== undefined ? updates.isStudyFree : current.isStudyFree;
      if (study === true) accessType = nextFree === true ? CourseAccessType.FREE_STUDY_AND_CERTIFICATE : CourseAccessType.FREE_STUDY;
      else if (study === false) accessType = CourseAccessType.PAID;
    }

    await this.adminCourseUseCases.updateCourse(existing.id, {
      ...updates,
      ...(accessType !== undefined ? { accessType } : {}),
      externalProviderId: existing.externalProviderId,
      originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
    });

    return this.get(existing.id);
  }

  public async verifySource(id: string): Promise<{
    verified: boolean;
    reason: string;
    providerId: string;
    providerName: string;
  }> {
    const course = await this.get(id);
    const context = await this.operationsRepository.getVerificationContext(course.id);
    if (!context?.providerId) throw new Error('IMPORTED_COURSE_PROVIDER_REQUIRED');

    const provider = await this.providerRepository.findById(context.providerId);
    if (!provider) throw new Error('IMPORTED_COURSE_PROVIDER_NOT_FOUND');
    if (provider.status !== ExternalCourseProviderStatus.APPROVED) {
      throw new Error(`IMPORTED_COURSE_PROVIDER_NOT_APPROVED:${provider.status}`);
    }

    const approved = await this.providerRepository.isDomainApproved(provider.id, context.directCourseUrl);
    if (!approved) throw new Error('IMPORTED_COURSE_SOURCE_DOMAIN_NOT_APPROVED');

    return {
      verified: true,
      reason: 'APPROVED_PROVIDER_AND_DOMAIN',
      providerId: provider.id,
      providerName: provider.displayName,
    };
  }

  public async checkLink(id: string): Promise<ImportedCourseLinkCheckResult> {
    const course = await this.get(id);
    const verification = await this.verifySource(course.id);
    const provider = await this.providerRepository.findById(verification.providerId);
    if (!provider) throw new Error('IMPORTED_COURSE_PROVIDER_NOT_FOUND');

    const result = await this.linkChecker.check({
      url: course.directCourseUrl,
      allowedDomains: provider.allowedDomains,
      directCoursePathPatterns: provider.directCoursePathPatterns,
    });
    await this.operationsRepository.recordLinkCheck(course.id, result, course.directCourseUrl);
    return result;
  }

  public async fetchMissing(id: string): Promise<never> {
    const course = await this.get(id);
    if (!course.externalProviderId) throw new Error('IMPORTED_COURSE_PROVIDER_REQUIRED');
    const provider = await this.providerRepository.findById(course.externalProviderId);
    if (!provider) throw new Error('IMPORTED_COURSE_PROVIDER_NOT_FOUND');

    if (provider.importStrategy === ExternalCourseProviderImportStrategy.FILE) {
      throw new Error('COURSE_FETCH_MISSING_PROVIDER_POLICY_FILE_ONLY');
    }
    if (!provider.connectorKey?.trim()) {
      throw new Error('COURSE_FETCH_MISSING_PROVIDER_CONNECTOR_NOT_REGISTERED');
    }

    // A provider-specific connector adapter is required. This work package must
    // never fall back to arbitrary crawling when no registered adapter exists.
    throw new Error(`COURSE_FETCH_MISSING_CONNECTOR_ADAPTER_UNAVAILABLE:${provider.connectorKey}`);
  }

  public async markReady(id: string): Promise<ImportedCourseAdminDetail> {
    const course = await this.get(id);
    await this.verifySource(course.id);
    this.assertVerifiedLink(course);
    await this.adminCourseUseCases.markReadyToPublish(course.id);
    return this.get(course.id);
  }

  public async publish(id: string, context?:AtomicMutationRequestContext): Promise<ImportedCourseAdminDetail> {
    const course = await this.get(id);
    await this.verifySource(course.id);
    this.assertVerifiedLink(course);
    await this.adminCourseUseCases.publish(course.id,context);
    return this.get(course.id);
  }

  public async unpublish(id: string): Promise<ImportedCourseAdminDetail> {
    const course = await this.get(id);
    await this.adminCourseUseCases.unpublish(course.id);
    return this.get(course.id);
  }

  public async reject(id: string): Promise<ImportedCourseAdminDetail> {
    const course = await this.get(id);
    await this.adminCourseUseCases.reject(course.id);
    return this.get(course.id);
  }

  public async archive(id: string): Promise<ImportedCourseAdminDetail> {
    const course = await this.get(id);
    await this.adminCourseUseCases.archive(course.id);
    return this.get(course.id);
  }

  private assertImported(course: Pick<ImportedCourseAdminRecord, 'originType'>): void {
    if (course.originType !== CourseOriginType.EXTERNAL_LINKED_COURSE) {
      throw new Error('COURSE_IS_NOT_IMPORTED_EXTERNAL_COURSE');
    }
  }

  private assertVerifiedLink(course: Pick<ImportedCourseAdminRecord, 'linkHealth'>): void {
    if (!['VERIFIED_DIRECT', 'REDIRECTED_VALID'].includes(course.linkHealth)) {
      throw new Error(`IMPORTED_COURSE_LINK_VERIFICATION_REQUIRED:${course.linkHealth}`);
    }
  }
}
