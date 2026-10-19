import {careerAlumniConsentCurrent} from '../CareerPolicy';
import { createHash } from 'node:crypto';
import { careerJobOpen, publishedCareerJob } from '../CareerPolicy';
import { AssetSecurityClassification } from '@absheer/domain';
import {
  AlumniProfileVisibility,
  CareerAlumniProfileDto,
  CareerApplicationDto,
  CareerApplicationStatus,
  CareerProfileDto,
  CareerProfileVisibility,
  ICareerEngagementRepository,
  ICareerRepository,
  ICareerStudentOwnershipGateway,
} from '@absheer/domain';
import { AssetReferencePolicy, assertAssetReferenceUsable } from '../../asset-platform/AssetReferencePolicy';

export const ALLOWED_APPLICATION_TRANSITIONS: Record<CareerApplicationStatus, readonly CareerApplicationStatus[]> = {
  [CareerApplicationStatus.SUBMITTED]: [CareerApplicationStatus.UNDER_REVIEW, CareerApplicationStatus.WITHDRAWN],
  [CareerApplicationStatus.UNDER_REVIEW]: [CareerApplicationStatus.SHORTLISTED, CareerApplicationStatus.REJECTED, CareerApplicationStatus.WITHDRAWN],
  [CareerApplicationStatus.SHORTLISTED]: [CareerApplicationStatus.ACCEPTED, CareerApplicationStatus.REJECTED, CareerApplicationStatus.WITHDRAWN],
  [CareerApplicationStatus.REJECTED]: [],
  [CareerApplicationStatus.ACCEPTED]: [],
  [CareerApplicationStatus.WITHDRAWN]: [],
};

export class CareerEngagementUseCases {
  constructor(
    private readonly career: ICareerRepository,
    private readonly engagement: ICareerEngagementRepository,
    private readonly students: ICareerStudentOwnershipGateway,
    private readonly assetReferences?: AssetReferencePolicy,
  ) {}
  forActor(context: { actorId: string; reason: string; correlationId: string }) {
    if (!this.engagement.withActor) throw new Error('CAREER_AUDIT_REQUIRED');
    return new CareerEngagementUseCases(this.career, this.engagement.withActor(context), this.students, this.assetReferences);
  }
  async getMyProfile(studentReferenceId: string) { await this.students.assertActiveStudent(studentReferenceId); return this.engagement.findProfile(studentReferenceId); }
  async getMyAlumni(studentReferenceId: string) { await this.students.assertActiveStudent(studentReferenceId); return this.engagement.findAlumniProfile(studentReferenceId); }
  async alumniNetwork(studentReferenceId: string, page: number) {
    const profile = await this.getMyAlumni(studentReferenceId);
    if (!profile || !['PUBLIC','ALUMNI_ONLY'].includes(profile.visibility) || !careerAlumniConsentCurrent(profile))
      throw new Error('CAREER_ACCESS_DENIED');
    if (!this.engagement.listAlumniNetwork) throw new Error('CAREER_AUDIT_REQUIRED');
    return this.engagement.listAlumniNetwork(page, 20);
  }
  async getMyApplications(studentReferenceId: string, page: number) {
    await this.students.assertActiveStudent(studentReferenceId);
    const result = await this.engagement.listApplications({ studentReferenceId, page, pageSize: 20 });
    return { ...result, data: result.data.map(row => this.studentProjection(row)) };
  }
  async applicationForReview(id: string) { return this.requireApplication(id); }
  async assertCvForReview(id: string) {
    const row = await this.requireApplication(id);
    if (row.status === CareerApplicationStatus.WITHDRAWN) throw new Error('CAREER_ACCESS_DENIED');
    await this.students.assertActiveStudent(row.studentReferenceId);
    const consent = row.jobSnapshot;
    const consentTime = Date.parse(String(consent?.cvConsentAt ?? ''));
    if (consent?.consentActorStudentReferenceId !== row.studentReferenceId || !Number.isFinite(consentTime) || consentTime > Date.now())
      throw new Error('CAREER_CV_CONSENT_REQUIRED');
    if (!row.cvAssetId?.trim()) throw new Error('CAREER_APPLICATION_CV_REQUIRED');
    await assertAssetReferenceUsable(this.assetReferences, row.cvAssetId, { purpose: 'CAREER_APPLICATION_CV', allowedMimeTypePrefixes: ['application/pdf'], expectedOwnerId: row.studentReferenceId,
      allowedClassifications: Object.values(AssetSecurityClassification) });
    return row.cvAssetId;
  }
  private studentProjection(row: CareerApplicationDto) {
    return { ...row, cvAssetId: undefined, coverLetter: undefined, decisionMetadata: { studentMessage: row.decisionMetadata?.studentMessage ?? null } };
  }

  async upsertCareerProfile(input: {
    studentReferenceId: string;
    headline?: string | null;
    summary?: string | null;
    skills?: string[];
    resumeAssetId?: string | null;
    visibility?: CareerProfileVisibility;
    expectedVersion?: number;
    metadata?: Record<string, unknown> | null;
  }): Promise<CareerProfileDto> {
    await this.students.assertActiveStudent(input.studentReferenceId);
    if (input.visibility && input.visibility !== CareerProfileVisibility.PRIVATE) throw new Error('CAREER_PROFILE_PRIVATE_ONLY');
    const current = await this.engagement.findProfile(input.studentReferenceId);
    if (current && input.expectedVersion !== current.version) throw new Error('CAREER_PROFILE_VERSION_CONFLICT');
    const resumeAssetId = input.resumeAssetId === undefined ? current?.resumeAssetId ?? null : input.resumeAssetId;
    await assertAssetReferenceUsable(this.assetReferences, resumeAssetId, {
      purpose: 'CAREER_PROFILE_RESUME', allowedMimeTypePrefixes: ['application/pdf'], expectedOwnerId: input.studentReferenceId, allowedClassifications: Object.values(AssetSecurityClassification),
    });
    const skills = [...new Set((input.skills ?? current?.skills ?? []).map((value) => value.trim()).filter(Boolean))];
    return this.engagement.upsertProfile({
      studentReferenceId: input.studentReferenceId,
      headline: input.headline === undefined ? current?.headline ?? null : input.headline,
      summary: input.summary === undefined ? current?.summary ?? null : input.summary,
      skills,
      resumeAssetId,
      visibility: CareerProfileVisibility.PRIVATE,
      expectedVersion: current?.version,
      metadata: input.metadata ?? current?.metadata ?? null,
    });
  }

  async submitApplication(input: {
    jobId: string;
    studentReferenceId: string;
    cvAssetId: string;
    coverLetter?: string | null;
  }): Promise<CareerApplicationDto> {
    await this.students.assertActiveStudent(input.studentReferenceId);
    const rawJob = await this.career.findJobById(input.jobId);
    if (!careerJobOpen(rawJob)) throw new Error('CAREER_APPLICATION_JOB_NOT_OPEN');
    const job = publishedCareerJob(rawJob!);
    if (job.metadata?.applicationChannel !== 'INTERNAL') throw new Error('CAREER_APPLICATION_EXTERNAL_ONLY');
    const existing = await this.engagement.findApplicationByJobAndStudent(input.jobId, input.studentReferenceId);
    if (existing) {
      if (existing.cvAssetId !== input.cvAssetId || existing.coverLetter !== (input.coverLetter?.trim() || null)) throw new Error('CAREER_APPLICATION_PAYLOAD_CONFLICT');
      return existing;
    }
    if (!input.cvAssetId.trim()) throw new Error('CAREER_APPLICATION_CV_REQUIRED');
    await assertAssetReferenceUsable(this.assetReferences, input.cvAssetId, {
      purpose: 'CAREER_APPLICATION_CV', allowedMimeTypePrefixes: ['application/pdf'], expectedOwnerId: input.studentReferenceId, allowedClassifications: Object.values(AssetSecurityClassification),
    });
    return this.engagement.createApplication({
      publicId: `career_app_${createHash('sha256').update(JSON.stringify([input.studentReferenceId, input.jobId])).digest('hex').slice(0, 40)}`,
      jobId: input.jobId,
      studentReferenceId: input.studentReferenceId,
      cvAssetId: input.cvAssetId,
      coverLetter: input.coverLetter?.trim() || null,
      jobSnapshot: {
        cvConsentAt: new Date().toISOString(),
        consentActorStudentReferenceId: input.studentReferenceId,
        jobPublicId: job.publicId,
        title: job.title,
        employerId: job.employerId,
        opportunityType: job.opportunityType,
        employmentType: job.employmentType,
        countryReferenceId: job.countryReferenceId,
        cityReferenceId: job.cityReferenceId ?? null,
        applicationDeadline: job.applicationDeadline ? new Date(job.applicationDeadline).toISOString() : null,
        remoteOption: job.remoteOption,
      },
      status: CareerApplicationStatus.SUBMITTED,
    });
  }

  async withdrawApplication(input: { applicationId: string; studentReferenceId: string; expectedVersion: number }): Promise<CareerApplicationDto> {
    await this.students.assertActiveStudent(input.studentReferenceId);
    const application = await this.requireApplication(input.applicationId);
    if (application.studentReferenceId !== input.studentReferenceId) throw new Error('CAREER_APPLICATION_OWNER_MISMATCH');
    this.assertTransition(application.status, CareerApplicationStatus.WITHDRAWN);
    return this.engagement.updateApplicationStatus(application.id, CareerApplicationStatus.WITHDRAWN, {
      expectedVersion: input.expectedVersion,
      withdrawnAt: new Date(),
    });
  }

  async reviewApplication(input: {
    applicationId: string;
    nextStatus: CareerApplicationStatus;
    expectedVersion: number;
    actorId: string;
    decisionMetadata?: Record<string, unknown> | null;
  }): Promise<CareerApplicationDto> {
    if (!input.actorId.trim()) throw new Error('CAREER_APPLICATION_REVIEW_ACTOR_REQUIRED');
    if (input.nextStatus === CareerApplicationStatus.WITHDRAWN || input.nextStatus === CareerApplicationStatus.SUBMITTED) throw new Error('CAREER_APPLICATION_ADMIN_TRANSITION_INVALID');
    const application = await this.requireApplication(input.applicationId);
    this.assertTransition(application.status, input.nextStatus);
    return this.engagement.updateApplicationStatus(application.id, input.nextStatus, {
      expectedVersion: input.expectedVersion,
      decisionMetadata: { ...(input.decisionMetadata ?? {}), reviewedBy: input.actorId },
    });
  }

  async listApplications(filters: Parameters<ICareerEngagementRepository['listApplications']>[0]) {
    return this.engagement.listApplications(filters);
  }

  async upsertAlumniProfile(input: {
    studentReferenceId: string;
    displayName: string;
    graduationYear?: number | null;
    programReferenceId?: string | null;
    employerName?: string | null;
    visibility?: AlumniProfileVisibility;
    consentGranted?: boolean;
    consentActorStudentReferenceId?: string | null;
    consentSource?: string | null;
    expectedVersion?: number;
    metadata?: Record<string, unknown> | null;
  }): Promise<CareerAlumniProfileDto> {
    await this.students.assertActiveStudent(input.studentReferenceId);
    if (!input.displayName.trim()) throw new Error('CAREER_ALUMNI_DISPLAY_NAME_REQUIRED');
    if (input.graduationYear != null && (!Number.isInteger(input.graduationYear) || input.graduationYear < 1900 || input.graduationYear > new Date().getUTCFullYear() + 1)) throw new Error('CAREER_ALUMNI_GRADUATION_YEAR_INVALID');
    const current = await this.engagement.findAlumniProfile(input.studentReferenceId);
    if (current && input.expectedVersion !== current.version) throw new Error('CAREER_ALUMNI_VERSION_CONFLICT');
    const visibility = input.consentGranted === false ? AlumniProfileVisibility.PRIVATE : input.visibility ?? current?.visibility ?? AlumniProfileVisibility.PRIVATE;
    let consentGrantedAt = current?.consentGrantedAt ? new Date(current.consentGrantedAt) : null;
    let consentGrantedBy = current?.consentGrantedBy ?? null;
    let consentSource = current?.consentSource ?? null;
    let consentRevokedAt = current?.consentRevokedAt ? new Date(current.consentRevokedAt) : null;
    let consentRevokedBy = current?.consentRevokedBy ?? null;
    if (input.consentGranted !== undefined) {
      if (input.consentActorStudentReferenceId !== input.studentReferenceId) throw new Error('CAREER_ALUMNI_CONSENT_ACTOR_MISMATCH');
      if (input.consentGranted === true) {
        if (!input.consentSource?.trim()) throw new Error('CAREER_ALUMNI_CONSENT_SOURCE_REQUIRED');
        consentGrantedAt = new Date(); consentGrantedBy = input.studentReferenceId; consentSource = input.consentSource.trim();
        consentRevokedAt = null; consentRevokedBy = null;
      } else {
        consentRevokedAt = new Date(); consentRevokedBy = input.studentReferenceId;
      }
    }
    if (visibility !== AlumniProfileVisibility.PRIVATE && !careerAlumniConsentCurrent({studentReferenceId:input.studentReferenceId,consentGrantedAt,consentGrantedBy,consentSource,consentRevokedAt})) throw new Error('CAREER_ALUMNI_PUBLIC_VISIBILITY_REQUIRES_CONSENT');
    return this.engagement.upsertAlumniProfile({
      studentReferenceId: input.studentReferenceId,
      displayName: input.displayName.trim(),
      graduationYear: input.graduationYear === undefined ? current?.graduationYear ?? null : input.graduationYear,
      programReferenceId: input.programReferenceId ?? current?.programReferenceId ?? null,
      employerName: input.employerName === undefined ? current?.employerName ?? null : input.employerName,
      visibility,
      consentGrantedAt,
      consentGrantedBy,
      consentSource,
      consentRevokedAt,
      consentRevokedBy,
      expectedVersion: current?.version,
      metadata: input.metadata ?? current?.metadata ?? null,
    });
  }

  private async requireApplication(id: string) {
    const application = await this.engagement.findApplication(id);
    if (!application) throw new Error('CAREER_APPLICATION_NOT_FOUND');
    return application;
  }

  private assertTransition(from: CareerApplicationStatus, to: CareerApplicationStatus) {
    if (!ALLOWED_APPLICATION_TRANSITIONS[from]?.includes(to)) throw new Error('CAREER_APPLICATION_TRANSITION_NOT_ALLOWED');
  }
}
