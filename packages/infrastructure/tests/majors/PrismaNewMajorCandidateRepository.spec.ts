import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaNewMajorCandidateRepository } from '../../src/majors/PrismaNewMajorCandidateRepository';

describe('PrismaNewMajorCandidateRepository', () => {
  let prisma: any;
  let repository: PrismaNewMajorCandidateRepository;
  beforeEach(() => {
    prisma = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      universityAcademicProgram: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      scholarshipMajorTarget: { updateMany: vi.fn() },
      scholarshipEligibilityItem: { updateMany: vi.fn() },
    };
    repository = new PrismaNewMajorCandidateRepository(prisma);
  });
  it('discovers unresolved active programs and groups before applying pagination', async () => {
    await repository.list({page: 2, pageSize: 25, sourceType: 'UNIVERSITY_PROGRAM'});
    const [parts, ...values] = prisma.$queryRaw.mock.calls[0];
    const sql = {sql: parts.join('?'), values};
    expect(sql.sql).toContain('p."majorId" IS NULL');
    expect(sql.sql).toContain("p.status NOT IN ('INACTIVE','ARCHIVED','REJECTED')");
    expect(sql.sql.indexOf('GROUP BY "candidateKey"')).toBeLessThan(sql.sql.indexOf('LIMIT'));
    expect(sql.values).toContain('UNIVERSITY_PROGRAM');
    expect(sql.values.slice(-2)).toEqual([25,25]);
  });
  it('excludes archived scholarship owners and parameterizes source filters', async () => {
    await repository.list({page:1,pageSize:25,sourceType:'SCHOLARSHIP_MAJOR_TARGET'});
    const [parts, ...values] = prisma.$queryRaw.mock.calls[0];
    const sql = {sql: parts.join('?'), values};
    expect(sql.sql).toContain('t."majorId" IS NULL');
    expect(sql.sql).toContain("t.\"resolutionStatus\" NOT IN ('RESOLVED','NOT_APPLICABLE') AND s.status NOT IN ('ARCHIVED','REJECTED')");
    expect(sql.values).toContain('SCHOLARSHIP_MAJOR_TARGET');
  });
  it('requires transaction and current digest, then preserves owner identity in guarded writes', async () => {
    const digest='a'.repeat(64);
    const source={sourceType:'UNIVERSITY_PROGRAM',sourceId:'program-1',ownerId:'uni-1',rawLabel:'Computer Science',degreeLevelId:'degree-1',status:'ACTIVE',sourceUpdatedAt:'2026-09-02T00:00:00.000Z'};
    const row={candidateKey:'NMC-1',sourceDigest:digest,displayLabel:'Computer Science',normalizedLabel:'computer science',sourceCount:1,sources:[source],total:1};
    prisma.$queryRaw.mockImplementation(async (parts: TemplateStringsArray)=>parts.join('?').includes('WITH source_rows')?[row]:[]);
    await expect(repository.resolve('NMC-1','major-1',digest)).rejects.toThrow('TRANSACTION_REQUIRED');
    const bound=repository.withTransaction({boundaryId:'review-1',transactionClient:prisma} as any);
    await expect(bound.resolve('NMC-1','major-1','b'.repeat(64))).rejects.toThrow('STALE_SOURCE');
    expect(prisma.universityAcademicProgram.updateMany).not.toHaveBeenCalled();
    expect(await bound.resolve('NMC-1','major-1',digest)).toMatchObject({universityPrograms:1});
    expect(prisma.universityAcademicProgram.updateMany).toHaveBeenCalledWith({
      where: {OR:[{id:'program-1',universityId:'uni-1',sourceProgramName:'Computer Science',updatedAt:new Date(source.sourceUpdatedAt),degreeLevelId:'degree-1',status:'ACTIVE'}],majorId:null,majorMappingState:{in:['MAJOR_REVIEW_REQUIRED','UNMAPPED','AMBIGUOUS']},university:{is:{status:{notIn:['ARCHIVED','REJECTED']}}}},
      data:{majorId:'major-1',majorMappingState:'CANONICALLY_MAPPED'},
    });
  });
});
