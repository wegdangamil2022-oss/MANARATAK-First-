import type {
  ScholarshipBenefitDto,
  ScholarshipDegreeTargetDto,
  ScholarshipDto,
  ScholarshipEligibilityItemDto,
  ScholarshipMajorTargetDto,
  ScholarshipRequiredDocumentDto,
} from '@manaratak/domain';
import { adminApiClient } from './client';

export interface ScholarshipCatalogUnresolvedLink {
  area: 'COUNTRY' | 'STUDY_LANGUAGE' | 'CURRENCY' | 'DEGREE' | 'MAJOR' | 'UNIVERSITY' | 'ACADEMIC_PROGRAM' | 'INTERNATIONAL_TEST';
  key: string;
  rawValue: string | null;
  canonicalId: string | null;
  resolutionStatus: string;
}

export interface ScholarshipCatalogAuditEvent {
  id: string;
  action: string;
  actorId: string;
  actorType: string;
  source: string;
  timestamp: string;
  correlationReference?: string;
}

export interface ScholarshipCatalogDetailResponse {
  scholarship: ScholarshipDto;
  completeness: {
    state: 'INCOMPLETE' | 'NEEDS_REVIEW' | 'COMPLETE';
    missingFields: string[];
    identityMissingFields: string[];
    coreMissingFields: string[];
    optionalMissingFields: string[];
    missingCount: number;
    identityReady: boolean;
  };
  unresolvedLinks: ScholarshipCatalogUnresolvedLink[];
  history: ScholarshipCatalogAuditEvent[];
  historyAvailable: boolean;
}

export interface ScholarshipCatalogUpdate {
  displayName?: string;
  providerName?: string | null;
  amountMinorUnits?: string | null;
  amountCurrencyCode?: string | null;
  isFullyFunded?: boolean;
  applicationDeadline?: string | null;
  officialWebsite?: string | null;
  sourceUrl?: string | null;
  academicYear?: string | null;
  cycleName?: string | null;
  countrySourceLabel?: string | null;
  countryScope?: string | null;
  fundingTypeCode?: string | null;
  deadlineType?: string | null;
  applicationMethod?: string | null;
  applicationUrl?: string | null;
  officialSourceUrl?: string | null;
  sourceLocale?: string | null;
  studyLanguageSourceLabel?: string | null;

  benefits?: ScholarshipBenefitDto[];
  degreeTargets?: ScholarshipDegreeTargetDto[];
  majorTargets?: ScholarshipMajorTargetDto[];
  eligibilityItems?: ScholarshipEligibilityItemDto[];
  requiredDocumentItems?: ScholarshipRequiredDocumentDto[];
}

const BASE = '/admin/scholarships';

export const scholarshipCatalogApi = {
  detail(id: string) {
    return adminApiClient.request<ScholarshipCatalogDetailResponse>(
      `${BASE}/${encodeURIComponent(id)}/catalog-detail`,
    );
  },

  update(id: string, input: ScholarshipCatalogUpdate) {
    return adminApiClient.request<ScholarshipDto>(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  command(
    id: string,
    command: 'mark-ready' | 'mark-publishable' | 'publish' | 'unpublish' | 'archive' | 'reject',
  ) {
    return adminApiClient.request<{ success: true }>(
      `${BASE}/${encodeURIComponent(id)}/${command}`,
      { method: 'POST' },
    );
  },
};
