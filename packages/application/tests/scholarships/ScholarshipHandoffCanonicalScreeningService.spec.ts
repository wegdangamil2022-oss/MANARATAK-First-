import { describe, expect, it, vi } from 'vitest';
import { ScholarshipHandoffCanonicalScreeningService } from '../../src/scholarships/handoff/ScholarshipHandoffCanonicalScreeningService';

describe('ScholarshipHandoffCanonicalScreeningService P3 canonical targets', () => {
  it('sends explicit University and AcademicProgram identities to canonical resolution', async () => {
    const resolver = { resolveMany: vi.fn(async (requests: any[]) => requests) };
    const service = new ScholarshipHandoffCanonicalScreeningService(resolver as any);
    await service.screen({
      scholarshipName: 'Scholarship',
      targetUniversityReferences: [{ canonicalId: 'INS-QA-0001', sourceLabel: 'Qatar University' }],
      targetAcademicProgramReferences: [{ canonicalId: 'program-cs-phd', sourceLabel: 'Computer Science PhD' }],
    } as any);
    const requests = resolver.resolveMany.mock.calls[0][0];
    expect(requests).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: 'UNIVERSITY', canonicalId: 'INS-QA-0001' }),
      expect.objectContaining({ target: 'ACADEMIC_PROGRAM', canonicalId: 'program-cs-phd' }),
    ]));
  });

  it('keeps legacy AcademicProgram text as review input without synthesizing an id', async () => {
    const resolver = { resolveMany: vi.fn(async (requests: any[]) => requests) };
    const service = new ScholarshipHandoffCanonicalScreeningService(resolver as any);
    await service.screen({ scholarshipName: 'Scholarship', targetAcademicPrograms: ['Computer Science PhD'] } as any);
    const request = resolver.resolveMany.mock.calls[0][0].find((item: any) => item.target === 'ACADEMIC_PROGRAM');
    expect(request).toMatchObject({ rawValue: 'Computer Science PhD' });
    expect(request.canonicalId).toBeUndefined();
  });
});
