import type { AtomicPersistenceContext } from '../event-foundation/outbox/TransactionalOutbox';

export type NewMajorCandidateSourceType =
  | 'UNIVERSITY_PROGRAM'
  | 'SCHOLARSHIP_MAJOR_TARGET'
  | 'SCHOLARSHIP_ELIGIBILITY';

export interface NewMajorCandidateSourceRef {
  sourceType: NewMajorCandidateSourceType;
  sourceId: string;
  ownerId: string;
  ownerPublicId?: string | null;
  ownerDisplayName: string;
  rawLabel: string;
  degreeLevelId?: string | null;
  degreeLevelCode?: string | null;
  degreeLevelLabel?: string | null;
  facultyOrUnitName?: string | null;
  officialSourceUrl?: string | null;
  sourceUrl?: string | null;
  status?: string | null;
}

/**
 * Read-model for unresolved Major references discovered in owning domains.
 * It is deliberately not a Major identity. Promotion requires an explicit admin decision.
 */
export interface NewMajorCandidateDto {
  candidateKey: string;
  normalizedLabel: string;
  displayLabel: string;
  sourceCount: number;
  sourceTypes: NewMajorCandidateSourceType[];
  degreeLevelIds: string[];
  degreeLevelCodes: string[];
  degreeLevelLabels: string[];
  facultyOrUnitNames: string[];
  officialSourceUrls: string[];
  sources: NewMajorCandidateSourceRef[];
  firstSeenAt?: Date;
  lastSeenAt?: Date;
}

export interface NewMajorCandidateFilters {
  search?: string;
  sourceType?: NewMajorCandidateSourceType;
  page?: number;
  pageSize?: number;
}

export interface PaginatedNewMajorCandidateResult {
  data: NewMajorCandidateDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface NewMajorCandidateResolutionResult {
  universityPrograms: number;
  scholarshipMajorTargets: number;
  scholarshipEligibilityItems: number;
}

export interface INewMajorCandidateRepository {
  list(filters: NewMajorCandidateFilters): Promise<PaginatedNewMajorCandidateResult>;
  findByKey(candidateKey: string): Promise<NewMajorCandidateDto | null>;
  resolve(candidateKey: string, majorId: string): Promise<NewMajorCandidateResolutionResult>;
}

export interface ITransactionalNewMajorCandidateRepository extends INewMajorCandidateRepository {
  withTransaction(context: AtomicPersistenceContext): INewMajorCandidateRepository;
}
