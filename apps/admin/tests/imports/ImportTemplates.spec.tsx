import { describe, expect, it } from 'vitest';
import {
  UniversityImportPayloadSchema,
  CourseImportPayloadSchema,
  InternationalTestImportPayloadSchema,
} from '@manaratak/domain';
import { IMPORT_FIELD_TEMPLATES } from '../../src/features/imports/ImportTemplates';
const row = (header: string, fields: Record<string, string>) =>
  Object.fromEntries(
    header.split(',').map((key) => [key, fields[key] ?? 'Isolated contract fixture']),
  );
describe('Import templates match canonical owner contracts', () => {
  it('uses universityName and keeps typed optional numbers out of the string-only CSV template', () => {
    const data = row(IMPORT_FIELD_TEMPLATES.UNIVERSITIES, {
      officialWebsite: 'https://example.test',
      officialSourceUrl: 'https://example.test/source',
    });
    expect(UniversityImportPayloadSchema.safeParse(data).success).toBe(true);
    expect(data.universityName).toBeDefined();
    expect(data.foundedYear).toBeUndefined();
  });
  it('includes the required course name, access type and direct link', () => {
    const data = row(IMPORT_FIELD_TEMPLATES.COURSES, {
      accessType: 'FREE_STUDY',
      directCourseUrl: 'https://example.test/course',
      officialSourceUrl: 'https://example.test/source',
    });
    expect(CourseImportPayloadSchema.safeParse(data).success).toBe(true);
    expect(data.courseName).toBeDefined();
  });
  it('uses accepted test identity fields rather than unconsumed name aliases', () => {
    const data = row(IMPORT_FIELD_TEMPLATES.TESTS, {});
    expect(InternationalTestImportPayloadSchema.safeParse(data).success).toBe(true);
    expect(data.canonicalName).toBeDefined();
    expect(data.localizedNameAr).toBeDefined();
  });
});
