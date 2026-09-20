import { describe, expect, it } from 'vitest';
import {
  ScholarshipCanonicalResolutionService,
  type IScholarshipCanonicalLookupGateway,
  type ScholarshipCanonicalCandidate,
  type ScholarshipCanonicalLookupTarget,
  type ScholarshipCanonicalResolutionRequest,
} from '../../src';

class FakeGateway implements IScholarshipCanonicalLookupGateway {
  public readonly createdEntities = 0;
  constructor(private readonly results: Record<string, ScholarshipCanonicalCandidate[]> = {}) {}
  async findCandidates(
    target: ScholarshipCanonicalLookupTarget,
    request: ScholarshipCanonicalResolutionRequest,
  ): Promise<ScholarshipCanonicalCandidate[]> {
    const key = [
      target,
      request.canonicalId ?? '',
      request.standardCode ?? '',
      request.rawValue ?? '',
    ].join('|');
    return this.results[key] ?? [];
  }
}

const candidate = (
  target: ScholarshipCanonicalCandidate['target'],
  id: string,
  input: Partial<ScholarshipCanonicalCandidate> = {},
): ScholarshipCanonicalCandidate => ({
  target,
  id,
  canonicalName: input.canonicalName ?? `${target} ${id}`,
  displayName: input.displayName ?? `${target} ${id}`,
  method: input.method ?? 'EXACT_CANONICAL_NAME',
  publicId: input.publicId,
  standardCode: input.standardCode,
});

describe('ScholarshipCanonicalResolutionService', () => {
  it('resolves University only from an exact existing INS public identity', async () => {
    const gateway = new FakeGateway({
      'UNIVERSITY|INS-YEM-0001||': [
        candidate('UNIVERSITY', 'u-1', { publicId: 'INS-YEM-0001', method: 'EXACT_PUBLIC_ID' }),
      ],
    });
    const result = await new ScholarshipCanonicalResolutionService(gateway).resolve({
      target: 'UNIVERSITY',
      canonicalId: 'INS-YEM-0001',
    });
    expect(result.state).toBe('RESOLVED');
    expect(result.canonicalPublicId).toBe('INS-YEM-0001');
    expect(gateway.createdEntities).toBe(0);
  });

  it('keeps a University name-only source value reviewable', async () => {
    const result = await new ScholarshipCanonicalResolutionService(new FakeGateway()).resolve({
      target: 'UNIVERSITY',
      rawValue: 'Sample University',
    });
    expect(result.state).toBe('REVIEW_REQUIRED');
    expect(result.rawValue).toBe('Sample University');
  });


  it('resolves AcademicProgram only from an explicit canonical program id', async () => {
    const gateway = new FakeGateway({
      'ACADEMIC_PROGRAM|program-1||': [candidate('ACADEMIC_PROGRAM', 'program-1', { method: 'EXACT_CANONICAL_ID' })],
    });
    const result = await new ScholarshipCanonicalResolutionService(gateway).resolve({ target: 'ACADEMIC_PROGRAM', canonicalId: 'program-1' });
    expect(result.state).toBe('RESOLVED');
    expect(result.canonicalReferenceId).toBe('program-1');
  });

  it('keeps AcademicProgram name-only input reviewable instead of name-matching', async () => {
    const result = await new ScholarshipCanonicalResolutionService(new FakeGateway()).resolve({ target: 'ACADEMIC_PROGRAM', rawValue: 'Computer Science PhD' });
    expect(result.state).toBe('REVIEW_REQUIRED');
    expect(result.reason).toContain('explicit canonical program id');
  });

  it('returns NOT_APPLICABLE only when provider is explicitly non-University', async () => {
    const result = await new ScholarshipCanonicalResolutionService(new FakeGateway()).resolve({
      target: 'PROVIDER_UNIVERSITY',
      rawValue: 'Example Foundation',
      providerKind: 'NON_UNIVERSITY',
      optional: true,
    });
    expect(result.state).toBe('NOT_APPLICABLE');
    expect(result.rawValue).toBe('Example Foundation');
  });

  it('keeps an unknown provider name in REVIEW_REQUIRED rather than assuming it is not a University', async () => {
    const result = await new ScholarshipCanonicalResolutionService(new FakeGateway()).resolve({
      target: 'PROVIDER_UNIVERSITY',
      rawValue: 'Example University Foundation',
      providerKind: 'UNKNOWN',
    });
    expect(result.state).toBe('REVIEW_REQUIRED');
  });

  it.each([
    ['COUNTRY', 'YE', 'ref-country-ye'],
    ['LANGUAGE', 'AR', 'ref-language-ar'],
    ['CURRENCY', 'USD', 'ref-currency-usd'],
    ['DEGREE_LEVEL', 'BACHELOR', 'degree-bachelor'],
  ] as const)('resolves %s from an exact standard code', async (target, code, id) => {
    const gateway = new FakeGateway({
      [`${target}||${code}|`]: [
        candidate(target, id, { standardCode: code, method: 'EXACT_STANDARD_CODE' }),
      ],
    });
    const result = await new ScholarshipCanonicalResolutionService(gateway).resolve({
      target,
      standardCode: code,
    });
    expect(result.state).toBe('RESOLVED');
    expect(result.canonicalReferenceId).toBe(id);
  });

  it('resolves an existing Major public identity without regenerating it', async () => {
    const gateway = new FakeGateway({
      'MAJOR|MJR-0843||Planetary Health': [
        candidate('MAJOR', 'major-843', { publicId: 'MJR-0843', method: 'EXACT_PUBLIC_ID' }),
      ],
    });
    const result = await new ScholarshipCanonicalResolutionService(gateway).resolve({
      target: 'MAJOR',
      canonicalId: 'MJR-0843',
      rawValue: 'Planetary Health',
    });
    expect(result.state).toBe('RESOLVED');
    expect(result.rawValue).toBe('Planetary Health');
    expect(result.canonicalPublicId).toBe('MJR-0843');
  });

  it('resolves an existing Fellowship public identity as a canonical Major target', async () => {
    const gateway = new FakeGateway({
      'MAJOR|FEL-0001||Fellowship': [
        candidate('MAJOR', 'major-fellowship-1', {
          publicId: 'FEL-0001',
          method: 'EXACT_PUBLIC_ID',
        }),
      ],
    });
    const result = await new ScholarshipCanonicalResolutionService(gateway).resolve({
      target: 'MAJOR',
      canonicalId: 'FEL-0001',
      rawValue: 'Fellowship',
    });
    expect(result.state).toBe('RESOLVED');
    expect(result.canonicalPublicId).toBe('FEL-0001');
  });

  it('preserves unresolved Major text', async () => {
    const result = await new ScholarshipCanonicalResolutionService(new FakeGateway()).resolve({
      target: 'MAJOR',
      rawValue: 'Unknown New Major',
    });
    expect(result.state).toBe('UNRESOLVED');
    expect(result.rawValue).toBe('Unknown New Major');
  });

  it('returns AMBIGUOUS when multiple exact International Test candidates remain', async () => {
    const gateway = new FakeGateway({
      'INTERNATIONAL_TEST|||Academic Test': [
        candidate('INTERNATIONAL_TEST', 'test-a'),
        candidate('INTERNATIONAL_TEST', 'test-b'),
      ],
    });
    const result = await new ScholarshipCanonicalResolutionService(gateway).resolve({
      target: 'INTERNATIONAL_TEST',
      rawValue: 'Academic Test',
    });
    expect(result.state).toBe('AMBIGUOUS');
    expect(result.candidates).toHaveLength(2);
    expect(result.rawValue).toBe('Academic Test');
  });

  it('returns NOT_APPLICABLE for an omitted optional value', async () => {
    const result = await new ScholarshipCanonicalResolutionService(new FakeGateway()).resolve({
      target: 'LANGUAGE',
      optional: true,
    });
    expect(result.state).toBe('NOT_APPLICABLE');
  });
});
