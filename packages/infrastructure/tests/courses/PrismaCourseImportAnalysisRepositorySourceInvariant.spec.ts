import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('WP-IC-04 analysis persistence source invariant', () => {
  it('persists only analysis/source-identity/url-history models and never mutates canonical Course', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'packages/infrastructure/src/courses/PrismaCourseImportAnalysisRepository.ts'),
      'utf8',
    );

    expect(source).toContain('courseImportAnalysis');
    expect(source).toContain('courseSourceIdentity');
    expect(source).toContain('courseSourceUrlHistory');
    expect(source).not.toMatch(/\.course\.(create|update|upsert|delete)\s*\(/);
  });
});
