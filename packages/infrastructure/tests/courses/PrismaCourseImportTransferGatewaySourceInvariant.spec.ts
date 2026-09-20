import { readFileSync } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(process.cwd());

describe('PrismaCourseImportTransferGateway source invariants', () => {
  it('binds all writes to the supplied atomic transaction client', () => {
    const source = readFileSync(
      path.join(root, 'packages/infrastructure/src/courses/PrismaCourseImportTransferGateway.ts'),
      'utf8',
    );
    expect(source).toContain('transactionClient');
    expect(source).toContain('COURSE_IMPORT_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    expect(source).toContain('courseFieldProvenance.upsert');
    expect(source).toContain('importPromotionWriter.recordPromotion');
    expect(source).toContain('courseImportAnalysis.update');
    expect(source).toContain('courseSourceIdentity.update');
    expect(source).toContain('courseSourceUrlHistory.upsert');
  });

  it('does not create Course directly and leaves canonical Course mutation to ICourseRepository', () => {
    const source = readFileSync(
      path.join(root, 'packages/infrastructure/src/courses/PrismaCourseImportTransferGateway.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/prisma\.course\.(create|update|upsert|delete)\s*\(/);
  });
});
