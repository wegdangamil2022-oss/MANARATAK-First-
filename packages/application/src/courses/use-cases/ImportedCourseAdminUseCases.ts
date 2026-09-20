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
} from '@manaratak/domain';
import { AdminCourseUseCases } from './AdminCourseUseCases';

export class ImportedCourseAdminUseCases {
  public constructor(
    private readonly operationsRepository: IImportedCourseOperationsRepository,
    private readonly providerRepository: IExternalCourseProviderRepository,
    private readonly adminCourseUseCases: AdminCourseUseCases,
    private readonly linkChecker: IImportedCourseLinkChecker,
  ) {}

  public list(filters: ImportedCourseAdminFilters): Promise<ImportedCoursePage> {
    return this.operationsRepository.listImportedCourses(filters);
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

    await this.adminCourseUseCases.updateCourse(existing.id, {
      ...updates,
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

  public async publish(id: string): Promise<ImportedCourseAdminDetail> {
    const course = await this.get(id);
    await this.verifySource(course.id);
    this.assertVerifiedLink(course);
    await this.adminCourseUseCases.publish(course.id);
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
