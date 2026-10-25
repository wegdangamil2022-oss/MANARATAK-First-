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
  sourceUpdatedAt?: string;
  degreeReferences?: Array<{id:string; code:string; label?:string}>;
}

/**
 * Read-model for unresolved Major references discovered in owning domains.
 * It is deliberately not a Major identity. Promotion requires an explicit admin decision.
 */
export interface NewMajorCandidateDto {
  candidateKey: string;
  /** Digest of the complete unresolved source set; required for review commands. */
  sourceDigest: string;
  sourcesTruncated?: boolean;
  normalizedLabel: string;
  displayLabel: string;
  sourceCount: number;
  sourceTypes: NewMajorCandidateSourceType[];
  degreeLevelIds: string[];
  degreeLevelCodes: string[];
  degreeLevelLabels: string[];
  /** Only a degree explicitly attached to this owner reference is confirmed. */
  confirmedDegree?: 'BACHELOR' | 'MASTER' | 'DOCTORATE' | 'FELLOWSHIP' | 'UNKNOWN';
  facultyOrUnitNames: string[];
  officialSourceUrls: string[];
  sources: NewMajorCandidateSourceRef[];
  firstSeenAt?: Date;
  lastSeenAt?: Date;
}

export interface NewMajorCandidateFilters {
  search?: string;
  sourceType?: NewMajorCandidateSourceType;
  degreeLevel?: 'BACHELOR' | 'MASTER' | 'DOCTORATE' | 'FELLOWSHIP' | 'UNKNOWN';
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
  resolve(candidateKey: string, majorId: string, expectedDigest: string): Promise<NewMajorCandidateResolutionResult>;
  acquireReviewLock?(candidateKey: string): Promise<void>;
  recordDecision?(input: {candidateKey: string; sourceDigest: string; decision: 'APPROVED' | 'LINKED' | 'REJECTED'; actorId: string; reason: string; majorId?: string; evidence: NewMajorCandidateDto}): Promise<void>;
}

export interface ITransactionalNewMajorCandidateRepository extends INewMajorCandidateRepository {
  withTransaction(context: AtomicPersistenceContext): INewMajorCandidateRepository;
}

export interface NewMajorCandidateComparison {
  candidate: { candidateKey: string; displayLabel: string; normalizedLabel: string; sourceDigest: string; degreeLevelIds: string[]; facultyOrUnitNames: string[]; officialSourceUrls: string[]; sourceCount: number };
  target: { id: string; canonicalName: string; displayName: string; status: string; revision: number; academicFieldId?: string | null; disciplineId?: string | null; academicFieldOrDiscipline?: string | null; degreeLevelIds: string[]; aliases: string[]; sourceUrls: string[] };
  blockers: string[]; canLink: boolean; nameSignal: 'EXACT_NORMALIZED'|'REVIEW_REQUIRED';
}
