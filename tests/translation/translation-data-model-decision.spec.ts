import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface Decision {
  phase: number | string;
  domain: string;
  field: string;
  classification: string;
  strategy: string;
  wp06Action: string;
}

const matrixPath = resolve(
  process.cwd(),
  'docs/implementation-status/translation/translation-data-model.matrix.json',
);
const matrix = JSON.parse(readFileSync(matrixPath, 'utf8')) as {
  classifications: string[];
  storageStrategies: string[];
  decisions: Decision[];
};

const schema = readFileSync(
  resolve(process.cwd(), 'packages/infrastructure/prisma/schema.prisma'),
  'utf8',
);

describe('translation data model decision', () => {
  it('covers every Phase 7-11 bounded context required by TR-WP05', () => {
    const domains = new Set(matrix.decisions.map((decision) => decision.domain));
    for (const required of [
      'ReferenceCountry',
      'AdministrativeRegion',
      'ReferenceCity',
      'ReferenceLanguage',
      'ReferenceCurrency',
      'DegreeLevel',
      'AcademicTaxonomyNode',
      'InternationalTest',
      'Major',
      'University',
    ]) {
      expect(domains.has(required), required).toBe(true);
    }
  });

  it('uses only approved classifications and storage strategies', () => {
    for (const decision of matrix.decisions) {
      expect(matrix.classifications).toContain(decision.classification);
      expect(matrix.storageStrategies).toContain(decision.strategy);
    }
  });

  it('preserves known useful Prisma localization patterns', () => {
    expect(schema).toMatch(/model DegreeLevel[\s\S]*nameEn\s+String[\s\S]*nameAr\s+String/);
    expect(schema).toMatch(/model MajorContentSection[\s\S]*locale\s+String\?/);
    expect(schema).toMatch(/model MajorAlias[\s\S]*locale\s+String\?/);
    expect(schema).toMatch(/model InternationalTestContentBlock[\s\S]*locale\s+String\?/);
    expect(schema).toMatch(/model AcademicTaxonomyNode[\s\S]*localizedNames\s+Json\?/);
  });

  it('records University normalized translation as the implemented WP06 source strategy', () => {
    const universityDecision = matrix.decisions.find(
      (decision) =>
        decision.domain === 'University' &&
        decision.strategy === 'NEW_NORMALIZED_TRANSLATION_MODEL',
    );

    expect(universityDecision).toBeDefined();
    expect(schema).toMatch(/model UniversityTranslation\s*\{/);
    expect(schema).toMatch(/model UniversityLocalizedText\s*\{/);
  });

  it('does not authorize translation of protected identity values', () => {
    const identityDecisions = matrix.decisions.filter(
      (decision) => decision.classification === 'IDENTITY_FIELD',
    );
    expect(identityDecisions.length).toBeGreaterThan(0);
    expect(identityDecisions.every((decision) => decision.wp06Action !== 'TRANSLATE')).toBe(true);
  });
});
