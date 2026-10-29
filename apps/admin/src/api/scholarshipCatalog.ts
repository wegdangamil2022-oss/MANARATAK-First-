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
  area:
    | 'COUNTRY'
    | 'STUDY_LANGUAGE'
    | 'CURRENCY'
    | 'DEGREE'
    | 'MAJOR'
    | 'UNIVERSITY'
    | 'ACADEMIC_PROGRAM'
    | 'INTERNATIONAL_TEST';
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
  publicHref?: string | null;
  publicationReadiness?: { eligible: boolean; blocker: string | null };
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
  historyHasMore?: boolean;
  historyLimit?: number;
}

export interface ScholarshipCatalogUpdate {
  metadata?: Record<string, unknown>;
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
  description?: string | null;
  notes?: string | null;

  benefits?: ScholarshipBenefitDto[];
  degreeTargets?: ScholarshipDegreeTargetDto[];
  majorTargets?: ScholarshipMajorTargetDto[];
  eligibilityItems?: ScholarshipEligibilityItemDto[];
  requiredDocumentItems?: ScholarshipRequiredDocumentDto[];
}

const BASE = '/admin/scholarships';
function revisionHeader(revision: number | undefined) {
  if (!Number.isSafeInteger(revision) || revision! < 1)
    throw new Error('SCHOLARSHIP_REVISION_PRECONDITION_REQUIRED');
  return String(revision);
}

export const scholarshipCatalogApi = {
  updateCriterion(
    id: string,
    key: string,
    text: string,
    reason: string,
    revision: number | undefined,
  ) {
    return adminApiClient.request<ScholarshipDto>(
      `${BASE}/${encodeURIComponent(id)}/eligibility-criteria/${encodeURIComponent(key)}`,
      {
        method: 'PATCH',
        headers: { 'X-Review-Reason': reason, 'If-Match': revisionHeader(revision) },
        body: JSON.stringify({ text }),
      },
    );
  },
  detail(id: string) {
    return adminApiClient.request<ScholarshipCatalogDetailResponse>(
      `${BASE}/${encodeURIComponent(id)}/catalog-detail`,
      { cache: 'no-store' },
    );
  },

  update(
    id: string,
    input: ScholarshipCatalogUpdate,
    reason: string,
    revision: number | undefined,
  ) {
    return adminApiClient.request<ScholarshipDto>(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'X-Review-Reason': reason, 'If-Match': revisionHeader(revision) },
      body: JSON.stringify(input),
    });
  },

  command(
    id: string,
    command: 'mark-ready' | 'mark-publishable' | 'publish' | 'unpublish' | 'archive' | 'reject',
    reason: string,
    revision: number | undefined,
  ) {
    return adminApiClient.request<{ success: true }>(
      `${BASE}/${encodeURIComponent(id)}/${command}`,
      {
        method: 'POST',
        headers: { 'X-Review-Reason': reason, 'If-Match': revisionHeader(revision) },
      },
    );
  },
};
