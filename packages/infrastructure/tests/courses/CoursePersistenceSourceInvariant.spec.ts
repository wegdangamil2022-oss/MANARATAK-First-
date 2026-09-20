import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function findRepoRoot(start = process.cwd()): string {
  let current = resolve(start);
  for (;;) {
    if (existsSync(join(current, 'packages/infrastructure/prisma/schema.prisma'))) return current;
    const parent = dirname(current);
    if (parent === current) throw new Error('MANARATAK_REPO_ROOT_NOT_FOUND');
    current = parent;
  }
}

function source(path: string): string {
  return readFileSync(join(findRepoRoot(), path), 'utf8');
}

describe('WP-IC-01 course persistence source invariants', () => {
  it('defines canonical Course persistence with required uniqueness and operational indexes', () => {
    const schema = source('packages/infrastructure/prisma/schema.prisma');

    expect(schema).toContain('model Course {');
    expect(schema).toMatch(/publicId\s+String\s+@unique/);
    expect(schema).toMatch(/slug\s+String\s+@unique/);
    expect(schema).toMatch(/canonicalDedupKey\s+String\s+@unique/);
    expect(schema).toContain('@@index([status])');
    expect(schema).toContain('@@index([completenessStatus])');
    expect(schema).toContain('@@index([originType])');
    expect(schema).toContain('@@index([platformName])');
    expect(schema).toContain('@@index([sourceImportRecordId])');
  });

  it('exports the real repository and removes the infrastructure placeholder', () => {
    const infrastructureIndex = source('packages/infrastructure/src/index.ts');

    expect(infrastructureIndex).toContain("export * from './courses/PrismaCourseRepository';");
    expect(infrastructureIndex).not.toContain('export class PrismaCourseRepository {}');
  });

  it('wires real course, curriculum, and progress persistence', () => {
    const container = source('apps/api/src/infrastructure/di/container.ts');

    expect(container).toContain('PrismaCourseRepository,');
    expect(container).toContain(
      'courseRepository: asFunction(({ prisma }) => new PrismaCourseRepository(prisma)).singleton()',
    );
    expect(container).not.toContain(
      "courseRepository: asFunction(() => createUnavailableCapability('coursePersistence')).singleton()",
    );
    expect(container).toContain('new PrismaCourseCurriculumRepository(prisma)');
    expect(container).toContain('new PrismaCourseProgressRepository(prisma)');
    expect(container).not.toContain("createUnavailableCapability('courseCurriculumPersistence')");
    expect(container).not.toContain("createUnavailableCapability('courseProgressPersistence')");
  });

  it('keeps the legacy import promotion adapter present but fail-closed after P5 remediation', () => {
    const legacyPromotion = source(
      'packages/application/src/courses/use-cases/CourseImportPromotionUseCase.ts',
    );

    expect(legacyPromotion).toContain('export class CourseImportPromotionUseCase');
    expect(legacyPromotion).toContain('@deprecated P5 source closure disables');
    expect(legacyPromotion).toContain('COURSE_IMPORT_LEGACY_PROMOTION_DISABLED_USE_COURSE_IMPORT_COORDINATOR');
    expect(legacyPromotion).not.toContain('CourseDeduplicationService.generateKey');
  });

  it('ships migration SQL as source without any seed/backfill statements', () => {
    const migration = source(
      'packages/infrastructure/prisma/migrations/20260821233000_add_course_persistence/migration.sql',
    );

    expect(migration).toContain('CREATE TABLE "Course"');
    expect(migration).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(migration).not.toMatch(/\bUPDATE\s+"?Course"?\b/i);
  });
});
