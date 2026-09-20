import { AlumniProfileVisibility, CareerApplicationStatus, CareerProfileVisibility } from '../enums';

export interface CareerProfileDto {
  id: string;
  studentReferenceId: string;
  headline?: string | null;
  summary?: string | null;
  skills: string[];
  resumeAssetId?: string | null;
  visibility: CareerProfileVisibility;
  version: number;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CareerApplicationDto {
  id: string;
  publicId: string;
  jobId: string;
  studentReferenceId: string;
  cvAssetId: string;
  coverLetter?: string | null;
  jobSnapshot: Record<string, unknown>;
  status: CareerApplicationStatus;
  submittedAt: Date | string;
  withdrawnAt?: Date | string | null;
  decisionMetadata?: Record<string, unknown> | null;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CareerAlumniProfileDto {
  id: string;
  studentReferenceId: string;
  displayName: string;
  graduationYear?: number | null;
  programReferenceId?: string | null;
  employerName?: string | null;
  visibility: AlumniProfileVisibility;
  consentGrantedAt?: Date | string | null;
  consentGrantedBy?: string | null;
  consentSource?: string | null;
  consentRevokedAt?: Date | string | null;
  consentRevokedBy?: string | null;
  version: number;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
