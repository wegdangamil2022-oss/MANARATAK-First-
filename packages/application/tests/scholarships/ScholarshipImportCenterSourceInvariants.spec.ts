import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const useCaseSource = readFileSync(
  resolve(process.cwd(), 'packages/application/src/scholarships/import-center/ScholarshipImportCenterUseCases.ts'),
  'utf8',
);
const contractsSource = readFileSync(
  resolve(process.cwd(), 'packages/application/src/scholarships/import-center/ScholarshipImportCenterContracts.ts'),
  'utf8',
);
const routerSource = readFileSync(
  resolve(process.cwd(), 'apps/api/src/presentation/api/router/ScholarshipAdminRouter.ts'),
  'utf8',
);

describe('WP12-7 Scholarship Import Center backend source invariants', () => {
  it('keeps Prisma out of Application and API presentation code', () => {
    expect(useCaseSource).not.toContain('@prisma/client');
    expect(contractsSource).not.toContain('@prisma/client');
    expect(routerSource).not.toContain('@prisma/client');
    expect(routerSource).not.toMatch(/prisma\./i);
  });

  it('does not hide review or transfer writes inside import processingNotes', () => {
    expect(useCaseSource).not.toContain('processingNotes =');
    expect(useCaseSource).not.toContain('updateRecord(');
    expect(contractsSource).toContain('IScholarshipImportReviewDecisionPort');
    expect(contractsSource).toContain('IScholarshipImportTransferPort');
  });

  it('exposes the approved backend sections and keeps WP12-10 transfer deferred by default', () => {
    for (const route of [
      '/import-center/overview',
      '/import-center/sources',
      '/import-center/records',
      '/import-center/screening',
      '/import-center/duplicates',
      '/import-center/missing-data',
      '/import-center/verification',
      '/import-center/review-queue',
      '/import-center/ready-to-transfer',
      '/import-center/history',
      '/diff',
      '/merge-proposal',
      '/decision',
      '/transfer',
    ]) {
      expect(routerSource).toContain(route);
    }
    expect(routerSource).not.toContain('SCHOLARSHIP_IMPORT_TRANSFER_DEFERRED_TO_WP12_10');
    expect(routerSource).toContain('requireImportCenter().transfer');
  });
});
