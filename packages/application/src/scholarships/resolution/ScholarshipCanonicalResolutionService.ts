import type {
  IScholarshipCanonicalLookupGateway,
  ScholarshipCanonicalLookupTarget,
} from './IScholarshipCanonicalLookupGateway';
import type {
  ScholarshipCanonicalCandidate,
  ScholarshipCanonicalResolutionRequest,
  ScholarshipCanonicalResolutionResult,
} from './ScholarshipCanonicalResolutionContracts';

const UNIVERSITY_PUBLIC_ID = /^INS-[A-Z0-9]{2,8}-\d+$/i;
const MAJOR_PUBLIC_ID = /^(MJR|MAS|DOC|FEL)-\d+$/i;

export class ScholarshipCanonicalResolutionService {
  constructor(private readonly gateway: IScholarshipCanonicalLookupGateway) {}

  public async resolve(
    request: ScholarshipCanonicalResolutionRequest,
  ): Promise<ScholarshipCanonicalResolutionResult> {
    const normalized = this.normalizeRequest(request);

    if (normalized.target === 'PROVIDER_UNIVERSITY') {
      return this.resolveProviderUniversity(normalized);
    }

    if (normalized.optional && !this.hasLookupValue(normalized)) {
      return this.result(normalized, {
        state: 'NOT_APPLICABLE',
        method: 'NOT_APPLICABLE',
        reason: 'Optional Scholarship source value was not supplied.',
      });
    }

    if (!this.hasLookupValue(normalized)) {
      return this.result(normalized, {
        state: 'REVIEW_REQUIRED',
        reason: 'No canonical id, standard code, or raw source value was supplied.',
      });
    }

    if (normalized.target === 'UNIVERSITY') {
      if (!normalized.canonicalId) {
        return this.result(normalized, {
          state: 'REVIEW_REQUIRED',
          reason: 'University resolution requires an explicit canonical INS-* public identity.',
        });
      }
      if (!UNIVERSITY_PUBLIC_ID.test(normalized.canonicalId)) {
        return this.result(normalized, {
          state: 'REVIEW_REQUIRED',
          reason: 'University canonical identity must use the INS-* format.',
        });
      }
    }

    if (normalized.target === 'ACADEMIC_PROGRAM' && !normalized.canonicalId) {
      return this.result(normalized, {
        state: 'REVIEW_REQUIRED',
        reason: 'Academic Program resolution requires an explicit canonical program id; name matching is prohibited.',
      });
    }

    if (
      normalized.target === 'MAJOR' &&
      normalized.canonicalId &&
      !MAJOR_PUBLIC_ID.test(normalized.canonicalId)
    ) {
      return this.result(normalized, {
        state: 'REVIEW_REQUIRED',
        reason: 'Major canonical identity must use an existing MJR-*, MAS-*, DOC-* or FEL-* public id.',
      });
    }

    const target = normalized.target as ScholarshipCanonicalLookupTarget;
    const candidates = await this.gateway.findCandidates(target, normalized);
    return this.classifyCandidates(normalized, candidates);
  }

  public async resolveMany(
    requests: readonly ScholarshipCanonicalResolutionRequest[],
  ): Promise<ScholarshipCanonicalResolutionResult[]> {
    const results: ScholarshipCanonicalResolutionResult[] = [];
    for (const request of requests) results.push(await this.resolve(request));
    return results;
  }

  private async resolveProviderUniversity(
    request: ScholarshipCanonicalResolutionRequest,
  ): Promise<ScholarshipCanonicalResolutionResult> {
    if (request.canonicalId) {
      if (!UNIVERSITY_PUBLIC_ID.test(request.canonicalId)) {
        return this.result(request, {
          state: 'REVIEW_REQUIRED',
          reason: 'Provider-to-University linking requires an explicit canonical INS-* identity.',
        });
      }

      const universityRequest: ScholarshipCanonicalResolutionRequest = {
        ...request,
        target: 'UNIVERSITY',
      };
      const candidates = await this.gateway.findCandidates('UNIVERSITY', universityRequest);
      const classified = this.classifyCandidates(universityRequest, candidates);
      return { ...classified, target: 'PROVIDER_UNIVERSITY' };
    }

    if (request.providerKind === 'NON_UNIVERSITY') {
      return this.result(request, {
        state: 'NOT_APPLICABLE',
        method: 'NOT_APPLICABLE',
        reason: 'Provider is explicitly non-University; raw provider data remains contextual Scholarship data.',
      });
    }

    if (!request.rawValue && request.optional) {
      return this.result(request, {
        state: 'NOT_APPLICABLE',
        method: 'NOT_APPLICABLE',
        reason: 'Optional provider value was not supplied.',
      });
    }

    return this.result(request, {
      state: 'REVIEW_REQUIRED',
      reason: request.rawValue
        ? 'Provider text alone cannot create or select a University; an existing INS-* identity is required.'
        : 'Provider identity is missing.',
    });
  }

  private classifyCandidates(
    request: ScholarshipCanonicalResolutionRequest,
    candidates: ScholarshipCanonicalCandidate[],
  ): ScholarshipCanonicalResolutionResult {
    const unique = this.uniqueCandidates(candidates);
    if (unique.length === 0) {
      return this.result(request, {
        state: 'UNRESOLVED',
        candidates: [],
        reason: 'No existing canonical entity matched the deterministic Scholarship lookup.',
      });
    }
    if (unique.length > 1) {
      return this.result(request, {
        state: 'AMBIGUOUS',
        candidates: unique,
        reason: 'More than one existing canonical entity matched the exact lookup; manual review is required.',
      });
    }

    const candidate = unique[0];
    return this.result(request, {
      state: 'RESOLVED',
      candidates: unique,
      candidate,
      method: candidate.method,
      reason: `Resolved to existing ${candidate.target} canonical entity.`,
    });
  }

  private result(
    request: ScholarshipCanonicalResolutionRequest,
    input: {
      state: ScholarshipCanonicalResolutionResult['state'];
      candidates?: ScholarshipCanonicalCandidate[];
      candidate?: ScholarshipCanonicalCandidate;
      method?: ScholarshipCanonicalResolutionResult['method'];
      reason: string;
    },
  ): ScholarshipCanonicalResolutionResult {
    return {
      target: request.target,
      state: input.state,
      rawValue: request.rawValue ?? null,
      requestedCanonicalId: request.canonicalId ?? null,
      requestedStandardCode: request.standardCode ?? null,
      canonicalReferenceId: input.candidate?.id ?? null,
      canonicalPublicId: input.candidate?.publicId ?? null,
      canonicalStandardCode: input.candidate?.standardCode ?? null,
      canonicalName: input.candidate?.canonicalName ?? null,
      method: input.method ?? null,
      candidates: input.candidates ?? [],
      reason: input.reason,
    };
  }

  private normalizeRequest(
    request: ScholarshipCanonicalResolutionRequest,
  ): ScholarshipCanonicalResolutionRequest {
    return {
      ...request,
      rawValue: this.clean(request.rawValue),
      canonicalId: this.clean(request.canonicalId),
      standardCode: this.clean(request.standardCode)?.toUpperCase() ?? null,
      providerKind: request.providerKind ?? 'UNKNOWN',
    };
  }

  private clean(value: string | null | undefined): string | null {
    const cleaned = value?.normalize('NFKC').trim().replace(/\s+/g, ' ');
    return cleaned || null;
  }

  private hasLookupValue(request: ScholarshipCanonicalResolutionRequest): boolean {
    return Boolean(request.canonicalId || request.standardCode || request.rawValue);
  }

  private uniqueCandidates(
    candidates: ScholarshipCanonicalCandidate[],
  ): ScholarshipCanonicalCandidate[] {
    const byId = new Map<string, ScholarshipCanonicalCandidate>();
    for (const candidate of candidates) {
      if (!byId.has(candidate.id)) byId.set(candidate.id, candidate);
    }
    return [...byId.values()];
  }
}
