import { describe, expect, it } from 'vitest';
import {
  MajorImportCompletenessState,
  MajorStatus,
  UniversityImportCompletenessState,
  UniversityStatus,
  type InternationalTestDto,
  type MajorDto,
  type UniversityDto,
} from '@manaratak/domain';
import { ApplicationLocaleProjectionService } from '../../src/localization/ApplicationLocaleProjectionService';

const projection = new ApplicationLocaleProjectionService();

describe('ApplicationLocaleProjectionService', () => {
  it('projects a published University translation without changing canonical identity', () => {
    const university: UniversityDto = {
      id: 'db-u1',
      publicId: 'INS-ITA-0010',
      slug: 'university-of-florence',
      canonicalName: 'University of Florence',
      canonicalDedupKey: 'uof|it',
      displayName: 'University of Florence',
      status: UniversityStatus.PUBLISHED,
      completenessStatus: UniversityImportCompletenessState.COMPLETE,
      sourceRecords: [{ id: 'src-u1', sourceLocale: 'en' }],
      translations: [
        {
          id: 'tr-ar',
          locale: 'ar',
          displayName: 'جامعة فلورنسا',
          description: 'وصف عربي',
          reviewStatus: 'PUBLISHED',
        },
      ],
      campuses: [{ id: 'camp-1', name: 'Main Campus', address: 'Piazza San Marco' }],
      localizedTexts: [
        {
          id: 'txt-1',
          targetType: 'CAMPUS',
          targetId: 'camp-1',
          fieldKey: 'name',
          locale: 'ar',
          value: 'الحرم الرئيسي',
          reviewStatus: 'PUBLISHED',
        },
      ],
    };

    const result = projection.projectUniversity(university, 'ar');
    expect(result.publicId).toBe('INS-ITA-0010');
    expect(result.slug).toBe('university-of-florence');
    expect(result.displayName).toBe('جامعة فلورنسا');
    expect(result.description).toBe('وصف عربي');
    expect((result.campuses?.[0] as { name: string }).name).toBe('الحرم الرئيسي');
    expect(result.translations).toBeUndefined();
    expect(result.localizedTexts).toBeUndefined();
  });

  it('does not expose an unreviewed University translation publicly', () => {
    const university: UniversityDto = {
      id: 'db-u2',
      publicId: 'INS-GBR-0001',
      slug: 'example-university',
      canonicalName: 'Example University',
      canonicalDedupKey: 'example|gb',
      displayName: 'Example University',
      status: UniversityStatus.PUBLISHED,
      completenessStatus: UniversityImportCompletenessState.COMPLETE,
      sourceRecords: [{ sourceLocale: 'en' }],
      translations: [
        { locale: 'ar', displayName: 'ترجمة غير مراجعة', reviewStatus: 'NEEDS_REVIEW' },
      ],
    };

    expect(projection.projectUniversity(university, 'ar').displayName).toBe('Example University');
  });

  it('selects one Major content section per key for the requested locale', () => {
    const major: MajorDto = {
      id: 'major-1',
      publicId: 'MJR-0001',
      slug: 'computer-science',
      canonicalName: 'Computer Science',
      canonicalDedupKey: 'computer-science',
      displayName: 'Computer Science',
      localizedNameAr: 'علوم الحاسوب',
      localizedNameEn: 'Computer Science',
      status: MajorStatus.PUBLISHED,
      completenessStatus: MajorImportCompletenessState.COMPLETE,
      sources: [{ sourceType: 'CATALOG_FILE', sourceName: 'majors-ar', sourceLocale: 'ar' }],
    };

    const result = projection.projectMajor(
      major,
      [
        { sectionKey: 'overview', locale: 'ar', content: 'نظرة عامة', reviewStatus: 'PUBLISHED' },
        { sectionKey: 'overview', locale: 'en', content: 'Overview', reviewStatus: 'PUBLISHED' },
        { sectionKey: 'careers', locale: 'ar', content: 'المهن', reviewStatus: 'APPROVED' },
        { sectionKey: 'careers', locale: 'en', content: 'Careers', reviewStatus: 'APPROVED' },
      ],
      'en',
    );

    expect(result.publicId).toBe('MJR-0001');
    expect(result.displayName).toBe('Computer Science');
    expect(result.contentSections).toHaveLength(2);
    expect(result.contentSections?.map((section) => section.content)).toEqual(['Overview', 'Careers']);
  });

  it('projects International Test names and approved localized content blocks', () => {
    const test = {
      id: 'test-1',
      canonicalName: 'International English Test',
      displayName: 'International English Test',
      localizedNameAr: 'اختبار اللغة الإنجليزية الدولي',
      localizedNameEn: 'International English Test',
      testCategory: 'LANGUAGE',
      providerName: 'Provider',
      status: 'PUBLISHED',
      isPubliclyVisible: true,
      isSourceVerified: true,
      currentPublishedVersionId: 'ver-1',
      versions: [
        {
          id: 'ver-1',
          testId: 'test-1',
          versionNumber: 1,
          status: 'PUBLISHED',
          sourceLocale: 'en',
          contentBlocks: [
            {
              id: 'b1',
              versionId: 'ver-1',
              blockKey: 'overview',
              blockType: 'DESCRIPTION',
              locale: 'ar',
              content: 'وصف',
              reviewStatus: 'APPROVED',
            },
            {
              id: 'b2',
              versionId: 'ver-1',
              blockKey: 'overview',
              blockType: 'DESCRIPTION',
              locale: 'en',
              content: 'Description',
              reviewStatus: 'APPROVED',
            },
          ],
        },
      ],
    } as unknown as InternationalTestDto;

    const result = projection.projectInternationalTest(test, 'ar');
    expect(result.id).toBe('test-1');
    expect(result.displayName).toBe('اختبار اللغة الإنجليزية الدولي');
    expect(result.localizedNameAr).toBeUndefined();
    expect(result.versions?.[0].contentBlocks?.map((block) => block.content)).toEqual(['وصف']);
  });

  it('uses the WP01 fallback contract for reference names', () => {
    const result = projection.projectReferenceCountry(
      {
        id: 'country-de',
        iso2Code: 'DE',
        iso3Code: 'DEU',
        name: 'Germany',
        nameAr: 'ألمانيا',
        isActive: true,
      },
      'ar',
    );
    expect(result.name).toBe('ألمانيا');
    expect(result.nameAr).toBeUndefined();
  });
});
