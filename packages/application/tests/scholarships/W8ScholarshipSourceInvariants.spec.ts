import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('W8 scholarship source invariants', () => {
  it('does not allow optionalFields to overwrite the public projection', () => {
    const source = read('packages/application/src/scholarships/use-cases/PublicScholarshipUseCases.ts');
    expect(source).not.toContain('...(optionalFields || {})');
    expect(source).toContain('findPublishedBySlug');
  });

  it('uses canonical country fields for admin filtering', () => {
    const source = read('packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts');
    expect(source).toContain('countryReferenceId');
    expect(source).toContain('countrySourceLabel');
    expect(source).not.toContain("where.optionalFields = { path: ['studyCountry']");
  });

  it('uses one dedupe-v2 identity across handoff, import center and transfer', () => {
    const handoff = read('packages/application/src/scholarships/handoff/ScholarshipImportHandoffService.ts');
    const center = read('packages/application/src/scholarships/import-center/ScholarshipImportCenterUseCases.ts');
    const transfer = read('packages/application/src/scholarships/import-center/ScholarshipImportAtomicTransferUseCase.ts');
    for (const source of [handoff, center, transfer]) {
      expect(source).toContain('officialSourceUrl');
      expect(source).toContain('countryReferenceId');
    }
  });

  it('records the exact durable decision snapshot used for transfer', () => {
    const source = read('packages/application/src/scholarships/import-center/ScholarshipImportAtomicTransferUseCase.ts');
    expect(source).toContain('verificationDecisionId');
    expect(source).toContain('canonicalDecisionIds');
    expect(source).toContain('decisionSnapshotFingerprint');
    const reader = read('packages/application/src/scholarships/import-center/ScholarshipImportScreeningReader.ts');
    expect(reader).toContain('_domainHandoff');
    expect(source).toContain('ScholarshipImportScreeningReader');
  });
  it('binds verified transfer state and publication lifecycle to historical versions', () => {
    const transfer = read('packages/application/src/scholarships/import-center/ScholarshipImportAtomicTransferUseCase.ts');
    const repo = read('packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts');
    expect(transfer).toContain("verificationStatus: plan.decisionSnapshot.verificationState === 'VERIFIED'");
    expect(transfer).toContain('verificationRecordedAt');
    expect(repo).toContain('private jsonSafe');
    expect(repo).toContain("status: 'SUPERSEDED'");
    expect(repo).toContain("versionId: latest.id, status: 'PUBLISHED'");
  });

});
