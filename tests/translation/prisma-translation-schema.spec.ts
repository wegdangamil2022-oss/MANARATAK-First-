import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(
  resolve(process.cwd(), 'packages/infrastructure/prisma/schema.prisma'),
  'utf8',
);

const migration = readFileSync(
  resolve(
    process.cwd(),
    'packages/infrastructure/prisma/migrations/20260817010000_translation_phase7_11_extensions/migration.sql',
  ),
  'utf8',
);

function modelBody(modelName: string): string {
  const match = schema.match(
    new RegExp(
      `model ${modelName}\\s*\\{([\\s\\S]*?)\\n\\}`,
      'm',
    ),
  );
  if (!match) throw new Error(`Model not found: ${modelName}`);
  return match[1];
}

describe('TR-WP06 translation Prisma source', () => {
  it('keeps the Phase 7 reference strategy lightweight and explicit', () => {
    for (const model of [
      'ReferenceCountry',
      'ReferenceCurrency',
      'ReferenceLanguage',
      'ReferenceCity',
    ]) {
      expect(modelBody(model)).toMatch(/\bnameAr\s+String\?/);
    }
    expect(modelBody('AdministrativeRegion')).toMatch(/\bnameAr\s+String\?/);
  });

  it('preserves useful Phase 8 localization patterns', () => {
    expect(modelBody('DegreeLevel')).toMatch(/\bnameEn\s+String/);
    expect(modelBody('DegreeLevel')).toMatch(/\bnameAr\s+String/);
    expect(modelBody('AcademicTaxonomyNode')).toMatch(/\blocalizedNames\s+Json\?/);
    expect(modelBody('AcademicTaxonomyAlias')).toMatch(/\blocale\s+String\?/);
  });

  it('adds only the missing Phase 9 source-locale provenance field', () => {
    expect(modelBody('InternationalTestVersion')).toMatch(/\bsourceLocale\s+String\?/);
    expect(modelBody('InternationalTestContentBlock')).toMatch(/\blocale\s+String\?/);
  });

  it('adds top-level Major/Fellowship localized names and Major source locale', () => {
    expect(modelBody('Major')).toMatch(/\blocalizedNameAr\s+String\?/);
    expect(modelBody('Major')).toMatch(/\blocalizedNameEn\s+String\?/);
    expect(modelBody('FellowshipDefinition')).toMatch(/\blocalizedNameAr\s+String\?/);
    expect(modelBody('FellowshipDefinition')).toMatch(/\blocalizedNameEn\s+String\?/);
    expect(modelBody('MajorSource')).toMatch(/\bsourceLocale\s+String\?/);
    expect(modelBody('MajorContentSection')).toMatch(/\blocale\s+String\?/);
    expect(modelBody('MajorAlias')).toMatch(/\blocale\s+String\?/);
  });

  it('creates bounded University translation models on the same canonical University', () => {
    const translation = modelBody('UniversityTranslation');
    const localizedText = modelBody('UniversityLocalizedText');

    expect(translation).toMatch(/\buniversityId\s+String/);
    expect(translation).toMatch(/\blocale\s+String/);
    expect(translation).toMatch(/@@unique\(\[universityId,\s*locale\]\)/);

    expect(localizedText).toMatch(/\buniversityId\s+String/);
    expect(localizedText).toMatch(/\btargetType\s+String/);
    expect(localizedText).toMatch(/\btargetId\s+String/);
    expect(localizedText).toMatch(/\bfieldKey\s+String/);
    expect(localizedText).toMatch(/\blocale\s+String/);
    expect(localizedText).toMatch(/\bvalue\s+String/);
    expect(localizedText).toMatch(
      /@@unique\(\[universityId,\s*targetType,\s*targetId,\s*fieldKey,\s*locale\]\)/,
    );
  });

  it('places inverse translation provenance relations only on UniversitySourceRecord', () => {
    const sourceRecord = modelBody('UniversitySourceRecord');
    const campus = modelBody('UniversityCampus');

    expect(sourceRecord).toMatch(
      /translations\s+UniversityTranslation\[\]\s+@relation\("UniversityTranslationSourceRecord"\)/,
    );
    expect(sourceRecord).toMatch(
      /localizedTexts\s+UniversityLocalizedText\[\]\s+@relation\("UniversityLocalizedTextSourceRecord"\)/,
    );
    expect(campus).not.toMatch(/UniversityTranslationSourceRecord/);
    expect(campus).not.toMatch(/UniversityLocalizedTextSourceRecord/);
  });

  it('preserves protected canonical identity columns', () => {
    expect(modelBody('University')).toMatch(/\bpublicId\s+String\s+@unique/);
    expect(modelBody('Major')).toMatch(/\bpublicId\s+String\s+@unique/);
    expect(modelBody('FellowshipDefinition')).toMatch(/\bpublicId\s+String\s+@unique/);
  });

  it('keeps the migration additive and data-write free', () => {
    expect(migration).not.toMatch(
      /\b(DROP\s+(TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM|UPDATE\s+\S+\s+SET)\b/i,
    );
    expect(migration).toContain('CREATE TABLE "UniversityTranslation"');
    expect(migration).toContain('CREATE TABLE "UniversityLocalizedText"');
  });
});
