import { CareerEmployerStatus } from '../enums';

export interface CareerEmployerDto {
  id: string;
  publicId: string;
  slug: string;
  canonicalName: string;
  canonicalDedupKey: string;
  displayName: string;
  employerType: string;
  industry?: string | null;
  /** Canonical Phase 7 geography identity. */
  countryReferenceId?: string | null;
  cityReferenceId?: string | null;
  /** Compatibility/source labels only. */
  country?: string | null;
  city?: string | null;
  websiteUrl?: string | null;
  logoAssetId?: string | null;
  verificationStatus: CareerEmployerStatus;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  version: number;
}

export interface CreateCareerEmployerDto extends Omit<CareerEmployerDto, 'id' | 'createdAt' | 'updatedAt' | 'version'> {}

export interface UpdateCareerEmployerDto {
  displayName?: string;
  employerType?: string;
  industry?: string | null;
  countryReferenceId?: string | null;
  cityReferenceId?: string | null;
  country?: string | null;
  city?: string | null;
  websiteUrl?: string | null;
  logoAssetId?: string | null;
  verificationStatus?: CareerEmployerStatus;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CareerEmployerFilters {
  verificationStatus?: CareerEmployerStatus;
  employerType?: string;
  countryReferenceId?: string;
  page?: number;
  pageSize?: number;
}
