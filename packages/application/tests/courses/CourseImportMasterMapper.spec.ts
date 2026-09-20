import { describe, expect, it } from 'vitest';
import {
  CourseAccessType,
  CourseImportCompletenessState,
  CourseStatus,
} from '@manaratak/domain';
import { CourseImportMasterMapper } from '../../src/courses/services/CourseImportMasterMapper';

function payload(overrides: Record<string, unknown> = {}) {
  return {
    semanticRow: {
      sourceOrder: 1,
      providerLabel: 'Saylor University',
      courseName: 'Business Strategy',
      directCourseUrl: 'https://learn.saylor.org/course/view.php?id=1',
      studyFreeRaw: 'Yes',
      freeCertificateRaw: 'Yes',
      certificateTypeRaw: 'Certificate of Completion',
      languageRaw: 'English',
      studyLevelRaw: 'Beginner',
      courseDurationRaw: '10 hours',
      shortCourseTopicsRaw: 'Business • Strategy',
    },
    identity: {
      providerId: 'provider-1',
      providerPublicId: 'ecp-saylor-university',
      sourceNativeKey: 'moodle-course:1',
      identityStrategy: 'PROVIDER_URL_KEY',
      languageVersionKey: 'english',
      normalizedTitle: 'business strategy',
      normalizedUrl: 'https://learn.saylor.org/course/view.php?id=1',
    },
    provenance: {
      artifactSha256: 'a'.repeat(64),
      assetId: 'asset-1',
      sourceFilename: 'courses.xlsx',
      sourceSheetName: 'Courses',
      worksheetRowNumber: 2,
    },
    ...overrides,
  };
}

describe('CourseImportMasterMapper', () => {
  it('maps explicit free-study/free-certificate semantics without certificateAvailable ambiguity', () => {
    const result = CourseImportMasterMapper.map(payload(), 'course-src:key', 'rec-1');
    expect(result.accessType).toBe(CourseAccessType.FREE_STUDY_AND_CERTIFICATE);
    expect(result.createData.isStudyFree).toBe(true);
    expect(result.createData.isFreeCertificate).toBe(true);
    expect(result.createData.certificateAvailable).toBe(true);
    expect(result.createData.status).toBe(CourseStatus.IMPORTED);
    expect(result.createData.completenessStatus).toBe(CourseImportCompletenessState.COMPLETE);
    expect(result.createData.learningLanguage).toBe('English');
    expect(result.normalizedTopics).toEqual(['Business', 'Strategy']);
  });

  it('keeps a free-study course when the certificate is not free', () => {
    const source = payload();
    (source.semanticRow as any).freeCertificateRaw = 'No';
    (source.semanticRow as any).certificateTypeRaw = 'Paid Certificate';
    const result = CourseImportMasterMapper.map(source, 'course-src:key', 'rec-1');
    expect(result.accessType).toBe(CourseAccessType.FREE_STUDY);
    expect(result.createData.isFreeCertificate).toBe(false);
    expect(result.createData.certificateAvailable).toBeUndefined();
    expect(result.createData.certificateType).toBe('Paid Certificate');
  });

  it('rejects non-free study from the global free-course transfer path', () => {
    const source = payload();
    (source.semanticRow as any).studyFreeRaw = 'No';
    expect(() => CourseImportMasterMapper.map(source, 'course-src:key', 'rec-1'))
      .toThrow('COURSE_IMPORT_NOT_ELIGIBLE_FREE_STUDY');
  });

  it('preserves unresolved source language rather than inventing a canonical reference', () => {
    const source = payload();
    (source.semanticRow as any).languageRaw = 'Language X';
    const result = CourseImportMasterMapper.map(source, 'course-src:key', 'rec-1');
    expect(result.createData.learningLanguageRaw).toBe('Language X');
    expect(result.createData.learningLanguage).toBeUndefined();
    expect(result.createData.completenessStatus).toBe(CourseImportCompletenessState.NEEDS_REVIEW);
  });

  it('merge omission never emits null/empty destructive replacements', () => {
    const mapped = CourseImportMasterMapper.map(payload(), 'course-src:key', 'rec-2');
    (mapped.createData as any).certificateType = undefined;
    const update = CourseImportMasterMapper.buildMergeUpdate(
      {
        externalProviderId: 'provider-1',
        platformName: 'Saylor University',
        providerName: 'Saylor University',
      },
      mapped,
      new Set(['certificateTypeRaw']),
      false,
    );
    expect(update.certificateType).toBeUndefined();
    expect(update.directCourseUrl).toBeUndefined();
  });
});
