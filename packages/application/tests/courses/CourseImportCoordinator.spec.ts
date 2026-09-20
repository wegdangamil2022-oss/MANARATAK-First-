import { describe, expect, it } from 'vitest';
import {
  CourseAccessType,
  CourseDto,
  CourseImportChangeState,
  CourseImportCompletenessState,
  CourseOriginType,
  CourseStatus,
  CreateCourseDto,
  UpdateCourseDto,
} from '@manaratak/domain';
import { CourseImportCoordinator } from '../../src/courses/use-cases/CourseImportCoordinator';
import type {
  CourseFieldProvenanceWrite,
  CourseImportTransferGateway,
} from '../../src/courses/contracts/CourseImportTransferContracts';

const ARTIFACT = 'b'.repeat(64);

function analysis(changeState = CourseImportChangeState.NEW, requiresReview = false, fieldDiffs?: Record<string, unknown>) {
  return {
    id: 'analysis-1',
    importRecordId: 'rec-1',
    resolvedProviderId: 'provider-1',
    sourceNativeKey: 'moodle-course:1',
    normalizedPayload: {
      semanticRow: {
        sourceOrder: 1,
        providerLabel: 'Saylor University',
        courseName: 'Business Strategy',
        directCourseUrl: changeState === CourseImportChangeState.URL_CHANGED
          ? 'https://learn.saylor.org/course/view.php?id=99'
          : 'https://learn.saylor.org/course/view.php?id=1',
        studyFreeRaw: 'Yes',
        freeCertificateRaw: 'Yes',
        certificateTypeRaw: 'Certificate of Completion',
        languageRaw: 'English',
        studyLevelRaw: 'Beginner',
        courseDurationRaw: '10 hours',
        shortCourseTopicsRaw: 'Business • Strategy',
      },
      identity: {
        providerId: 'provider-1',
        providerPublicId: 'ecp-saylor-university',
        sourceNativeKey: 'moodle-course:1',
        identityStrategy: 'PROVIDER_URL_KEY',
        languageVersionKey: 'english',
        normalizedTitle: 'business strategy',
        normalizedUrl: changeState === CourseImportChangeState.URL_CHANGED
          ? 'https://learn.saylor.org/course/view.php?id=99'
          : 'https://learn.saylor.org/course/view.php?id=1',
      },
      provenance: {
        artifactSha256: ARTIFACT,
        assetId: 'asset-1',
        sourceFilename: 'courses.xlsx',
        sourceSheetName: 'Courses',
        worksheetRowNumber: 2,
      },
    },
    eligibilityState: 'PENDING_WP_IC_05',
    completenessState: 'STAGED_COMPLETE',
    matchState: changeState === CourseImportChangeState.NEW ? 'NOT_DUPLICATE' : 'EXACT_EXISTING',
    matchedCourseId: changeState === CourseImportChangeState.NEW ? null : 'course-1',
    changeState,
    fieldDiffs: fieldDiffs ?? null,
    relationshipProposals: { sourceIdentityId: 'identity-1' },
    requiresReview,
    analyzedAt: new Date('2026-08-21T00:00:00Z'),
    updatedAt: new Date('2026-08-21T00:00:00Z'),
  };
}

class FakeGateway implements CourseImportTransferGateway {
  record: any = {
    id: 'rec-1',
    batchId: 'batch-1',
    status: 'COMPLETE',
    rawPayload: {},
    validationErrors: null,
    processingNotes: null,
    promotedEntityId: null,
    sourceRowNumber: 2,
  };
  batch: any = { id: 'batch-1', dataType: 'COURSES', batchStatus: 'COMPLETED' };
  analysis: any = analysis();
  identity: any = {
    id: 'identity-1',
    courseId: null,
    providerId: 'provider-1',
    sourceNativeKey: 'moodle-course:1',
    languageVersionKey: 'english',
    currentUrl: 'https://learn.saylor.org/course/view.php?id=1',
    status: 'ACTIVE',
  };
  provenance: CourseFieldProvenanceWrite[] = [];
  urlChanges: any[] = [];
  failOnProvenance = false;

  withTransaction(): CourseImportTransferGateway { return this; }
  async getRecordById(id: string) { return id === this.record.id ? { ...this.record } : null; }
  async getBatchById(id: string) { return id === this.batch.id ? { ...this.batch } : null; }
  async getAnalysisByRecordId(id: string) { return id === this.record.id ? { ...this.analysis } : null; }
  async getSourceIdentity(id: string) { return id === this.identity.id ? { ...this.identity } : null; }
  async updateImportLink(input: any) {
    this.record.promotedEntityId = input.courseId;
    this.record.processingNotes = input.processingNotes;
  }
  async linkAnalysisCourse(input: any) {
    this.analysis.matchedCourseId = input.courseId;
    this.analysis.eligibilityState = input.eligibilityState;
    this.analysis.completenessState = input.completenessState;
  }
  async linkSourceIdentity(input: any) {
    if (this.identity.courseId && this.identity.courseId !== input.courseId) throw new Error('identity-conflict');
    this.identity.courseId = input.courseId;
    this.identity.currentUrl = input.currentUrl;
  }
  async applyVerifiedUrlChange(input: any) { this.urlChanges.push(input); }
  async writeFieldProvenance(input: CourseFieldProvenanceWrite[]) {
    if (this.failOnProvenance) throw new Error('provenance-failure');
    this.provenance.push(...input);
  }
  snapshot() {
    return JSON.parse(JSON.stringify({
      record: this.record, batch: this.batch, analysis: this.analysis, identity: this.identity,
      provenance: this.provenance, urlChanges: this.urlChanges,
    }));
  }
  restore(snapshot: any) {
    this.record = snapshot.record;
    this.batch = snapshot.batch;
    this.analysis = { ...snapshot.analysis, analyzedAt: new Date(snapshot.analysis.analyzedAt), updatedAt: new Date(snapshot.analysis.updatedAt) };
    this.identity = snapshot.identity;
    this.provenance = snapshot.provenance;
    this.urlChanges = snapshot.urlChanges;
  }
}

class FakeCourseRepository {
  courses = new Map<string, CourseDto>();
  nextId = 1;

  withTransaction() { return this; }
  async create(data: CreateCourseDto): Promise<CourseDto> {
    const id = `course-${this.nextId++}`;
    const dto: CourseDto = { id, version: 1, ...data, createdAt: new Date(), updatedAt: new Date() };
    this.courses.set(id, dto);
    return dto;
  }
  async update(id: string, data: UpdateCourseDto): Promise<CourseDto> {
    const current = this.courses.get(id);
    if (!current) throw new Error('not-found');
    const updated = { ...current, ...data, id: current.id, publicId: current.publicId, updatedAt: new Date() };
    this.courses.set(id, updated);
    return updated;
  }
  async findByDedupKey(key: string) {
    return [...this.courses.values()].find((item) => item.canonicalDedupKey === key) ?? null;
  }
  async findById(id: string) { return this.courses.get(id) ?? null; }
  async findByPublicId(publicId: string) { return [...this.courses.values()].find((x) => x.publicId === publicId) ?? null; }
  async findBySlug(slug: string) { return [...this.courses.values()].find((x) => x.slug === slug) ?? null; }
  async updateStatus() {}
  async updateImportLink() {}
  async listByStatus() { return []; }
  async list() { return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }; }
  async listPublished() { return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }; }
  snapshot() { return [...this.courses.entries()].map(([k, v]) => [k, { ...v }]); }
  restore(snapshot: any[]) { this.courses = new Map(snapshot as any); }
}

function existingCourse(status = CourseStatus.IMPORTED): CourseDto {
  return {
    id: 'course-1',
    publicId: 'course-public-1',
    slug: 'business-strategy-0001',
    canonicalName: 'Business Strategy',
    canonicalDedupKey: 'legacy-placeholder',
    displayName: 'Business Strategy',
    accessType: CourseAccessType.FREE_STUDY_AND_CERTIFICATE,
    originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
    directCourseUrl: 'https://learn.saylor.org/course/view.php?id=1',
    status,
    completenessStatus: CourseImportCompletenessState.COMPLETE,
    version: 1,
    externalProviderId: 'provider-1',
    originalSourceTitle: 'Business Strategy',
    isStudyFree: true,
    isFreeCertificate: true,
    certificateType: 'Certificate of Completion',
    learningLanguageRaw: 'English',
    studyLevelRaw: 'Beginner',
    studyDurationRaw: '10 hours',
    shortCourseTopicsRaw: 'Business • Strategy',
    platformName: 'Saylor University',
    providerName: 'Saylor University',
    sourceUrl: 'https://learn.saylor.org/course/view.php?id=1',
    officialSourceUrl: 'https://learn.saylor.org/course/view.php?id=1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function fixture() {
  const gateway = new FakeGateway();
  const courses = new FakeCourseRepository();
  const atomic = {
    execute: async (_definition: any, mutation: any) => {
      const gatewaySnapshot = gateway.snapshot();
      const courseSnapshot = courses.snapshot();
      try {
        return await mutation({ boundaryId: 'test-boundary', transactionClient: {} });
      } catch (error) {
        gateway.restore(gatewaySnapshot);
        courses.restore(courseSnapshot);
        throw error;
      }
    },
  };
  const coordinator = new CourseImportCoordinator(gateway, courses as any, atomic as any);
  return { gateway, courses, coordinator };
}

describe('CourseImportCoordinator', () => {
  it('creates one imported Course atomically and never auto-publishes', async () => {
    const { coordinator, gateway, courses } = fixture();
    const result = await coordinator.transfer({ recordId: 'rec-1', actorId: 'admin-1' });
    expect(result.state).toBe('TRANSFERRED_CREATED');
    expect(result.publicationStatus).toBe('IMPORTED');
    expect(courses.courses.size).toBe(1);
    const course = await courses.findById(result.courseId);
    expect(course?.status).toBe(CourseStatus.IMPORTED);
    expect(gateway.record.promotedEntityId).toBe(result.courseId);
    expect(gateway.identity.courseId).toBe(result.courseId);
    expect(gateway.provenance.length).toBeGreaterThan(0);
  });

  it('re-transfer is idempotent and cannot create a duplicate', async () => {
    const { coordinator, courses } = fixture();
    const first = await coordinator.transfer({ recordId: 'rec-1', actorId: 'admin-1' });
    const second = await coordinator.transfer({ recordId: 'rec-1', actorId: 'admin-1' });
    expect(second.courseId).toBe(first.courseId);
    expect(second.state).toBe('TRANSFERRED_UNCHANGED');
    expect(courses.courses.size).toBe(1);
  });

  it('blocks metadata change without explicit field approval', async () => {
    const { coordinator, gateway, courses } = fixture();
    courses.courses.set('course-1', existingCourse());
    gateway.identity.courseId = 'course-1';
    gateway.analysis = analysis(CourseImportChangeState.METADATA_CHANGED, true, {
      fields: { certificateTypeRaw: { before: 'Old', after: 'Certificate of Completion' } },
    });
    await expect(coordinator.transfer({ recordId: 'rec-1', actorId: 'admin-1' }))
      .rejects.toThrow('COURSE_IMPORT_REVIEW_APPROVAL_REQUIRED');
  });

  it('applies a verified URL change to the same Course id/publicId', async () => {
    const { coordinator, gateway, courses } = fixture();
    const before = existingCourse();
    courses.courses.set(before.id, before);
    gateway.identity.courseId = before.id;
    gateway.analysis = analysis(CourseImportChangeState.URL_CHANGED, true);

    const result = await coordinator.transfer({
      recordId: 'rec-1',
      actorId: 'admin-1',
      approval: {
        expectedAnalysisId: 'analysis-1',
        approvedFields: ['directCourseUrl'],
        urlVerified: true,
        reason: 'Official provider URL verified.',
      },
    });

    const after = await courses.findById(before.id);
    expect(result.courseId).toBe(before.id);
    expect(after?.publicId).toBe(before.publicId);
    expect(after?.directCourseUrl).toBe('https://learn.saylor.org/course/view.php?id=99');
    expect(gateway.urlChanges).toHaveLength(1);
  });

  it('does not rewrite source-identity current URL for a tracking-only unchanged replay', async () => {
    const { coordinator, gateway, courses } = fixture();
    const before = existingCourse();
    courses.courses.set(before.id, before);
    gateway.identity.courseId = before.id;
    gateway.analysis = analysis(CourseImportChangeState.UNCHANGED, false);
    (gateway.analysis.normalizedPayload.semanticRow as any).directCourseUrl = `${before.directCourseUrl}&utm_source=mail`;

    const result = await coordinator.transfer({ recordId: 'rec-1', actorId: 'admin-1' });
    expect(result.state).toBe('TRANSFERRED_UNCHANGED');
    expect(gateway.identity.currentUrl).toBe(before.directCourseUrl);
    expect(gateway.urlChanges).toHaveLength(0);
  });

  it('blocks transfer when analysis language identity differs from the source identity', async () => {
    const { coordinator, gateway } = fixture();
    gateway.identity.languageVersionKey = 'en';
    await expect(coordinator.transfer({ recordId: 'rec-1', actorId: 'admin-1' }))
      .rejects.toThrow('COURSE_IMPORT_ANALYSIS_IDENTITY_DRIFT');
  });

  it('does not overwrite a reviewed value with an omitted incoming value', async () => {
    const { coordinator, gateway, courses } = fixture();
    const before = existingCourse();
    before.certificateType = 'Reviewed Certificate';
    courses.courses.set(before.id, before);
    gateway.identity.courseId = before.id;
    gateway.analysis = analysis(CourseImportChangeState.METADATA_CHANGED, true, {
      fields: { certificateTypeRaw: { before: 'Reviewed Certificate', after: '' } },
    });
    (gateway.analysis.normalizedPayload.semanticRow as any).certificateTypeRaw = '';

    await coordinator.transfer({
      recordId: 'rec-1',
      actorId: 'admin-1',
      approval: {
        expectedAnalysisId: 'analysis-1',
        approvedFields: ['certificateTypeRaw'],
        reason: 'Reviewed empty source value; retain current canonical value.',
      },
    });
    expect((await courses.findById(before.id))?.certificateType).toBe('Reviewed Certificate');
  });

  it('blocks ambiguous/conflict state even if an approval object is supplied', async () => {
    const { coordinator, gateway } = fixture();
    gateway.analysis = analysis(CourseImportChangeState.CONFLICT, true);
    await expect(coordinator.transfer({
      recordId: 'rec-1',
      actorId: 'admin-1',
      approval: {
        expectedAnalysisId: 'analysis-1',
        approvedFields: [],
        reason: 'Do not bypass identity conflict.',
      },
    })).rejects.toThrow('COURSE_IMPORT_TRANSFER_BLOCKED');
  });

  it('blocks mutation of published targets', async () => {
    const { coordinator, gateway, courses } = fixture();
    courses.courses.set('course-1', existingCourse(CourseStatus.PUBLISHED));
    gateway.identity.courseId = 'course-1';
    gateway.analysis = analysis(CourseImportChangeState.METADATA_CHANGED, true, {
      fields: { studyLevelRaw: { before: 'Beginner', after: 'Intermediate' } },
    });
    (gateway.analysis.normalizedPayload.semanticRow as any).studyLevelRaw = 'Intermediate';

    await expect(coordinator.transfer({
      recordId: 'rec-1',
      actorId: 'admin-1',
      approval: {
        expectedAnalysisId: 'analysis-1',
        approvedFields: ['studyLevelRaw'],
        reason: 'Reviewed.',
      },
    })).rejects.toThrow('COURSE_IMPORT_TARGET_PUBLICATION_LOCKED');
  });

  it('rolls back Course and linkage when provenance fails inside the atomic boundary', async () => {
    const { coordinator, gateway, courses } = fixture();
    gateway.failOnProvenance = true;
    await expect(coordinator.transfer({ recordId: 'rec-1', actorId: 'admin-1' }))
      .rejects.toThrow('provenance-failure');
    expect(courses.courses.size).toBe(0);
    expect(gateway.record.promotedEntityId).toBeNull();
    expect(gateway.identity.courseId).toBeNull();
  });
});
