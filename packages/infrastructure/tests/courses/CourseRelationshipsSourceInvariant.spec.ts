import { readFileSync } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(process.cwd());
const source = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

describe('WP-IC-06 relationship invariants', () => {
  it('uses exact taxonomy matching only in the automatic resolver', () => {
    const repository = source('packages/infrastructure/src/courses/PrismaCourseRelationshipRepository.ts');
    const resolverStart = repository.indexOf('resolveTaxonomyCandidates');
    const resolverEnd = repository.indexOf('upsertTaxonomyResolution');
    const resolver = repository.slice(resolverStart, resolverEnd);

    expect(resolver).toContain("equals: term");
    expect(resolver).not.toContain('contains:');
    expect(resolver).toContain("status: 'ACTIVE'");
  });

  it('preserves explicit ADMIN_REVIEW language decisions', () => {
    const service = source('packages/application/src/courses/services/CourseRelationshipResolutionService.ts');
    const repository = source('packages/infrastructure/src/courses/PrismaCourseRelationshipRepository.ts');

    expect(service).toContain("learningLanguageResolutionMethod === 'ADMIN_REVIEW'");
    expect(repository).toContain("learningLanguageResolutionMethod: 'ADMIN_REVIEW'");
    expect(repository).toContain('learningLanguageReviewedBy: input.actorId');
  });

  it('does not introduce course study-country inference', () => {
    const schema = source('packages/infrastructure/prisma/schema.prisma');
    const relationship = source('packages/domain/src/courses/relationships.ts');

    expect(schema).not.toMatch(/courseStudyCountry|studyCountryReferenceId/i);
    expect(relationship).toContain("semantics: 'PROVIDER_HEADQUARTERS_ONLY' | 'NO_GEOGRAPHY'");
    expect(relationship).toContain('studyCountryReferenceIds: string[]');
  });

  it('requires approved relationships for public major/taxonomy filters', () => {
    const repository = source('packages/infrastructure/src/courses/PrismaCourseRelationshipRepository.ts');

    expect(repository).toContain("reviewState: 'APPROVED'");
    expect(repository).toContain("projectionState: 'APPROVED'");
    expect(repository).toContain("status: 'PUBLISHED'");
  });

  it('keeps Major projections review-gated', () => {
    const service = source('packages/application/src/courses/services/CourseRelationshipResolutionService.ts');

    expect(service).toContain("projectionState: 'PROPOSED'");
    expect(service).not.toContain("projectionState: 'APPROVED'");
  });

  it('migration contains no seed/backfill/data update', () => {
    const migration = source('packages/infrastructure/prisma/migrations/20260822040000_course_relationships/migration.sql');

    expect(migration).not.toMatch(/INSERT\s+INTO/i);
    expect(migration).not.toMatch(/UPDATE\s+"Course"/i);
    expect(migration).not.toMatch(/DELETE\s+FROM/i);
    expect(migration).not.toMatch(/courseStudyCountry|studyCountryReferenceId/i);
  });
});
