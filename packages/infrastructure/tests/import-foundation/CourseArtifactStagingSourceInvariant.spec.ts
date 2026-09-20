import { readFileSync } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(process.cwd());
const source = (relative: string) =>
  readFileSync(path.join(root, relative), 'utf8');

describe('WP-IC-03 source invariants', () => {
  it('stages into Phase 06 and does not write canonical Course', () => {
    const useCase = source(
      'packages/application/src/courses/use-cases/CourseImportArtifactUseCase.ts',
    );
    expect(useCase).toContain('stageNormalizedRows');
    expect(useCase).toContain('ImportTargetDomain.Courses');
    expect(useCase).not.toMatch(/courseRepository|prisma\.course|CourseImportPromotionUseCase/);
  });

  it('guards XLSX archive before adapter parsing', () => {
    const parser = source(
      'packages/application/src/courses/parsers/CourseMasterArtifactParser.ts',
    );
    expect(parser.indexOf('inspectXlsxArchive(bytes)')).toBeLessThan(
      parser.indexOf('readXlsxWorkbook(bytes'),
    );
    expect(parser).toContain('COURSE_XLSX_COMPRESSION_RATIO_EXCEEDED');
    expect(parser).toContain('COURSE_XLSX_ENCRYPTED_ENTRY');
    expect(parser).toContain('COURSE_XLSX_ACTIVE_OR_EXTERNAL_CONTENT_REJECTED');
    expect(parser).toContain('COURSE_XLSX_FORMULA_CELL_REJECTED');
  });

  it('contains no WP-IC-03 Prisma migration or provider/course seed', () => {
    expect(source('packages/application/src/courses/use-cases/CourseImportArtifactUseCase.ts'))
      .not.toMatch(/upsertSeedProvider|createCourse|publishCourse/);
  });
});
