import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

describe('P4 cross-domain read-model source invariants', () => {
  it('projects Major reverse reads from P11/P12/P13 owner queries keyed by canonical majorId', () => {
    const service = read('packages/application/src/read-models/CrossDomainGraphReadService.ts');
    expect(service).toContain('listPublished({ majorId: major.id');
    expect(service).toContain('listPublishedCoursesForMajor(major.id');
    expect(service).not.toContain('listPublished({ major: major.displayName');
    expect(service).not.toContain('listPublishedCoursesForMajor(major.displayName');
    expect(service).toContain('Boolean(program.degreeLevelId)');
    expect(service).toContain('publishedMajorIds.has(program.majorId)');
  });

  it('keeps University reverse-major ownership in AcademicProgram instead of P10 collections', () => {
    const repo = read('packages/infrastructure/src/universities/PrismaUniversityRepository.ts');
    expect(repo).toMatch(/some:\s*{[\s\S]*?majorId: filters\.majorId,[\s\S]*?majorMappingState: 'CANONICALLY_MAPPED'/);
    const schema = read('packages/infrastructure/prisma/schema.prisma');
    expect(schema).not.toContain('MajorUniversity');
  });

  it('includes Scholarship major targets and eligibility references in canonical reverse reads', () => {
    const repo = read('packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts');
    expect(repo).toContain('{ majorTargets: { some: { majorId: filters.majorId } } }');
    expect(repo).toContain('{ eligibilityItems: { some: { majorId: filters.majorId } } }');
  });

  it('exposes stable linked identities without sourceLabel/name resolution', () => {
    const service = read('packages/application/src/read-models/CrossDomainGraphReadService.ts');
    expect(service).toContain('ownerId:');
    expect(service).toContain('publicId:');
    expect(service).toContain('slug:');
    expect(service).not.toMatch(/sourceLabel.*find|find.*sourceLabel/i);
  });

  it('composes Country detail outside P7 and preserves course geography semantics', () => {
    const service = read('packages/application/src/read-models/CrossDomainGraphReadService.ts');
    expect(service).toContain('providerHeadquartersCountryReferenceId: country.id');
    expect(service).toContain('countryReferenceId: country.id');
    const courseRelationship = read('packages/domain/src/courses/relationships.ts');
    expect(courseRelationship).toContain("semantics: 'PROVIDER_HEADQUARTERS_ONLY' | 'NO_GEOGRAPHY'");
  });

  it('wires P13 reverse relationship reads into the public Course API', () => {
    const router = read('apps/api/src/presentation/api/router/CoursePublicRouter.ts');
    expect(router).toContain('majorId: z.string().trim().min(1).optional()');
    expect(router).toContain('courseRelationshipQueryService.listPublishedRelatedCourses');
  });
});
