import { randomUUID } from 'node:crypto';
import {
  AlumniProfileVisibility,
  CareerAlumniProfileDto,
  CareerApplicationDto,
  CareerApplicationStatus,
  CareerJobStatus,
  CareerProfileDto,
  CareerProfileVisibility,
  ICareerEngagementRepository,
  ICareerRepository,
  ICareerStudentOwnershipGateway,
} from '@manaratak/domain';
import { AssetReferencePolicy, assertAssetReferenceUsable } from '../../asset-platform/AssetReferencePolicy';

const ALLOWED_APPLICATION_TRANSITIONS: Record<CareerApplicationStatus, readonly CareerApplicationStatus[]> = {
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
    const current = await this.engagement.findProfile(input.studentReferenceId);
    if (current && input.expectedVersion !== current.version) throw new Error('CAREER_PROFILE_VERSION_CONFLICT');
    const resumeAssetId = input.resumeAssetId === undefined ? current?.resumeAssetId ?? null : input.resumeAssetId;
    await assertAssetReferenceUsable(this.assetReferences, resumeAssetId, {
      purpose: 'CAREER_PROFILE_RESUME', expectedOwnerId: input.studentReferenceId,
    });
    const skills = [...new Set((input.skills ?? current?.skills ?? []).map((value) => value.trim()).filter(Boolean))];
    return this.engagement.upsertProfile({
      studentReferenceId: input.studentReferenceId,
      headline: input.headline ?? current?.headline ?? null,
      summary: input.summary ?? current?.summary ?? null,
      skills,
      resumeAssetId,
      visibility: input.visibility ?? current?.visibility ?? CareerProfileVisibility.PRIVATE,
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
    const job = await this.career.findJobById(input.jobId);
    if (!job || job.status !== CareerJobStatus.PUBLISHED) throw new Error('CAREER_APPLICATION_JOB_NOT_OPEN');
    if (job.applicationDeadline && new Date(job.applicationDeadline).getTime() <= Date.now()) throw new Error('CAREER_APPLICATION_DEADLINE_PASSED');
    if (await this.engagement.findApplicationByJobAndStudent(input.jobId, input.studentReferenceId)) throw new Error('CAREER_APPLICATION_ALREADY_EXISTS');
    await assertAssetReferenceUsable(this.assetReferences, input.cvAssetId, {
      purpose: 'CAREER_APPLICATION_CV', expectedOwnerId: input.studentReferenceId,
    });
    return this.engagement.createApplication({
      publicId: `career_app_${randomUUID()}`,
      jobId: input.jobId,
      studentReferenceId: input.studentReferenceId,
      cvAssetId: input.cvAssetId,
      coverLetter: input.coverLetter?.trim() || null,
      jobSnapshot: {
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
    const visibility = input.visibility ?? current?.visibility ?? AlumniProfileVisibility.PRIVATE;
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
    if (visibility !== AlumniProfileVisibility.PRIVATE && (!consentGrantedAt || !consentGrantedBy || !consentSource || consentRevokedAt)) throw new Error('CAREER_ALUMNI_PUBLIC_VISIBILITY_REQUIRES_CONSENT');
    return this.engagement.upsertAlumniProfile({
      studentReferenceId: input.studentReferenceId,
      displayName: input.displayName.trim(),
      graduationYear: input.graduationYear ?? current?.graduationYear ?? null,
      programReferenceId: input.programReferenceId ?? current?.programReferenceId ?? null,
      employerName: input.employerName ?? current?.employerName ?? null,
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
    if (!ALLOWED_APPLICATION_TRANSITIONS[from].includes(to)) throw new Error(`CAREER_APPLICATION_TRANSITION_NOT_ALLOWED:${from}->${to}`);
  }
}
