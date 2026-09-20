import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const handoffDir = resolve(process.cwd(), 'packages/application/src/scholarships/handoff');

function sourceFiles(): string[] {
  return readdirSync(handoffDir)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => resolve(handoffDir, name));
}

describe('WP12-4 Scholarship handoff source invariants', () => {
  it('does not depend on Scholarship canonical persistence or promotion', () => {
    const source = sourceFiles().map((file) => readFileSync(file, 'utf8')).join('\n');

    expect(source).not.toContain('IScholarshipRepository');
    expect(source).not.toContain('ScholarshipImportPromotionUseCase');
    expect(source).not.toMatch(/\.create\s*\(/);
    expect(source).not.toMatch(/\.update\s*\(/);
    expect(source).not.toMatch(/\.upsert\s*\(/);
    expect(source).not.toContain('updateStatus(');
  });

  it('uses the existing UniversalImportHandoff boundary', () => {
    const source = readFileSync(
      resolve(handoffDir, 'ScholarshipImportHandoffService.ts'),
      'utf8',
    );

    expect(source).toContain('IImportHandoffConsumer');
    expect(source).toContain('UniversalImportHandoff');
    expect(source).toContain('idempotencyKey');
  });

  it('registers the canonical lookup, screening, and handoff consumer in production composition', () => {
    const container = readFileSync(
      resolve(process.cwd(), 'apps/api/src/infrastructure/di/container.ts'),
      'utf8',
    );
    expect(container).toContain('PrismaScholarshipCanonicalLookupGateway');
    expect(container).toContain('scholarshipCanonicalResolutionService');
    expect(container).toContain('scholarshipHandoffCanonicalScreeningService');
    expect(container).toContain('scholarshipImportHandoffConsumer');
  });
});
