import {
  CareerAlumniProfileDto,
  CareerApplicationDto,
  CareerProfileDto,
} from '../entities';
import {
  AlumniProfileVisibility,
  CareerApplicationStatus,
  CareerProfileVisibility,
} from '../enums';

export interface ICareerEngagementRepository {
  upsertProfile(data: {
    studentReferenceId: string;
    headline?: string | null;
    summary?: string | null;
    skills: string[];
    resumeAssetId?: string | null;
    visibility: CareerProfileVisibility;
    expectedVersion?: number;
    metadata?: Record<string, unknown> | null;
  }): Promise<CareerProfileDto>;
  findProfile(studentReferenceId: string): Promise<CareerProfileDto | null>;
  createApplication(data: {
    publicId: string;
    jobId: string;
    studentReferenceId: string;
    cvAssetId: string;
    coverLetter?: string | null;
    jobSnapshot: Record<string, unknown>;
    status: CareerApplicationStatus;
  }): Promise<CareerApplicationDto>;
  findApplication(id: string): Promise<CareerApplicationDto | null>;
  findApplicationByJobAndStudent(jobId: string, studentReferenceId: string): Promise<CareerApplicationDto | null>;
  updateApplicationStatus(id: string, status: CareerApplicationStatus, input: {
    expectedVersion: number;
    withdrawnAt?: Date | null;
    decisionMetadata?: Record<string, unknown> | null;
  }): Promise<CareerApplicationDto>;
  listApplications(filters: { jobId?: string; studentReferenceId?: string; status?: CareerApplicationStatus; page?: number; pageSize?: number }): Promise<{ data: CareerApplicationDto[]; total: number; page: number; pageSize: number; totalPages: number }>;
  upsertAlumniProfile(data: {
    studentReferenceId: string;
    displayName: string;
    graduationYear?: number | null;
    programReferenceId?: string | null;
    employerName?: string | null;
    visibility: AlumniProfileVisibility;
    consentGrantedAt?: Date | null;
    consentGrantedBy?: string | null;
    consentSource?: string | null;
    consentRevokedAt?: Date | null;
    consentRevokedBy?: string | null;
    expectedVersion?: number;
    metadata?: Record<string, unknown> | null;
  }): Promise<CareerAlumniProfileDto>;
  findAlumniProfile(studentReferenceId: string): Promise<CareerAlumniProfileDto | null>;
}

export interface ICareerStudentOwnershipGateway {
  assertActiveStudent(studentReferenceId: string): Promise<void>;
}
