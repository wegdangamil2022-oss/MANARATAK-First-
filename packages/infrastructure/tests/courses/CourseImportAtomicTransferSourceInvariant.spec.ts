import { readFileSync } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(process.cwd());
const source = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

describe('WP-IC-05 source invariants', () => {
  it('uses the enterprise atomic mutation coordinator and transactional repositories', () => {
    const code = source('packages/application/src/courses/use-cases/CourseImportCoordinator.ts');
    expect(code).toContain('AtomicDomainMutationCoordinator');
    expect(code).toContain('withTransaction(context)');
    expect(code).toContain("action: 'COURSE_IMPORT_TRANSFERRED'");
    expect(code).toContain('writeFieldProvenance');
    expect(code).toContain('updateImportLink');
  });

  it('never routes production transfer through the legacy prototype', () => {
    const code = source('packages/application/src/courses/use-cases/CourseImportCoordinator.ts');
    expect(code).not.toContain('CourseImportPromotionUseCase');
  });

  it('forbids auto-publish and fuzzy conflict override', () => {
    const code = source('packages/application/src/courses/use-cases/CourseImportCoordinator.ts');
    expect(code).toContain('COURSE_IMPORT_TRANSFER_AUTO_PUBLISH_FORBIDDEN');
    expect(code).toContain('COURSE_IMPORT_TARGET_PUBLICATION_LOCKED');
    expect(code).toContain('CourseImportChangeState.AMBIGUOUS_MATCH');
    expect(code).toContain('CourseImportChangeState.CONFLICT');
  });

  it('requires verified URL approval before an official URL mutation', () => {
    const code = source('packages/application/src/courses/use-cases/CourseImportCoordinator.ts');
    expect(code).toContain('COURSE_IMPORT_URL_VERIFICATION_REQUIRED');
    expect(code).toContain("approvedFields");
    expect(code).toContain('applyVerifiedUrlChange');
  });
});
