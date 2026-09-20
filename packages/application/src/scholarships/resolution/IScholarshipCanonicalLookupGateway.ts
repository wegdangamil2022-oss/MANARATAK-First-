import type {
  ScholarshipCanonicalCandidate,
  ScholarshipCanonicalResolutionRequest,
  ScholarshipCanonicalResolutionTarget,
} from './ScholarshipCanonicalResolutionContracts';

export type ScholarshipCanonicalLookupTarget = Exclude<
  ScholarshipCanonicalResolutionTarget,
  'PROVIDER_UNIVERSITY'
>;

export interface IScholarshipCanonicalLookupGateway {
  findCandidates(
    target: ScholarshipCanonicalLookupTarget,
    request: ScholarshipCanonicalResolutionRequest,
  ): Promise<ScholarshipCanonicalCandidate[]>;
}
