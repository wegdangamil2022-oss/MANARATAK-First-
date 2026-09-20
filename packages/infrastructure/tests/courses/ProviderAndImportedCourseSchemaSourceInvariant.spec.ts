import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../../..');
const source = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('WP-IC-02 provider and imported-course schema source invariants', () => {
  it('models provider identity, aliases, domains, source identity, URL history, analysis and provenance', () => {
    const schema = source('packages/infrastructure/prisma/schema.prisma');
    for (const model of [
      'ExternalCourseProvider',
      'ExternalCourseProviderAlias',
      'ExternalCourseProviderDomain',
      'CourseSourceIdentity',
      'CourseSourceUrlHistory',
      'CourseImportAnalysis',
      'CourseFieldProvenance',
    ]) {
      expect(schema).toContain(`model ${model} {`);
    }
    expect(schema).toContain('headquartersCountryReferenceId String?');
    expect(schema).toMatch(/normalizedAlias\s+String\s+@unique/);
  });

  it('stores all master semantics as explicit Course fields instead of optionalFields-only data', () => {
    const schema = source('packages/infrastructure/prisma/schema.prisma');
    for (const field of [
      'externalProviderId',
      'originalSourceTitle',
      'isStudyFree',
      'isFreeCertificate',
      'certificateType',
      'learningLanguageRaw',
      'studyLevelRaw',
      'studyDurationRaw',
      'shortCourseTopicsRaw',
    ]) {
      expect(schema).toMatch(new RegExp(`\\b${field}\\b`));
    }
  });

  it('ships a reviewed migration without executing a course seed or publishing courses', () => {
    const migration = source(
      'packages/infrastructure/prisma/migrations/20260822010000_external_course_provider_registry/migration.sql',
    );
    expect(migration).toContain('CREATE TABLE "ExternalCourseProvider"');
    expect(migration).toContain('ALTER TABLE "Course" ADD COLUMN');
    expect(migration).not.toMatch(/INSERT\s+INTO\s+"Course"/i);
    expect(migration).not.toMatch(/PUBLISHED/i);

    const seedMigration = source(
      'packages/infrastructure/prisma/migrations/20260822011000_seed_external_course_providers/migration.sql',
    );
    expect(seedMigration.match(/INSERT INTO \"ExternalCourseProvider\" \(/g) ?? []).toHaveLength(18);
    expect(seedMigration).not.toMatch(/INSERT\s+INTO\s+\"Course\"/i);
    expect(seedMigration).not.toMatch(/PUBLISHED/i);
  });

  it('does not move transfer behavior into WP-IC-02', () => {
    const promotion = source('packages/application/src/courses/use-cases/CourseImportPromotionUseCase.ts');
    expect(promotion).not.toContain('ExternalCourseProviderSeed');
    expect(promotion).not.toContain('CourseSourceUrlHistory');
  });
});
