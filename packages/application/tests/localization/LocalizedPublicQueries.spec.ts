import { describe, expect, it, vi } from 'vitest';
import {
  MajorImportCompletenessState,
  MajorStatus,
  UniversityImportCompletenessState,
  UniversityStatus,
  type IInternationalTestRepository,
  type IMajorRepository,
  type IUniversityRepository,
} from '@manaratak/domain';
import { LocalizedPublicUniversityUseCases } from '../../src/universities/use-cases/LocalizedPublicUniversityUseCases';
import { LocalizedPublicMajorUseCases } from '../../src/majors/use-cases/LocalizedPublicMajorUseCases';
import { LocalizedInternationalTestPublicUseCases } from '../../src/tests-platform/use-cases/LocalizedInternationalTestPublicUseCases';

describe('localized public query adapters', () => {
  it('projects University list results while preserving INS identity', async () => {
    const repository = {
      listPublished: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'u1',
            publicId: 'INS-ITA-0010',
            slug: 'florence',
            canonicalName: 'University of Florence',
            canonicalDedupKey: 'uof|it',
            displayName: 'University of Florence',
            status: UniversityStatus.PUBLISHED,
            completenessStatus: UniversityImportCompletenessState.COMPLETE,
            sourceRecords: [{ sourceLocale: 'en' }],
            translations: [
              { locale: 'ar', displayName: 'جامعة فلورنسا', reviewStatus: 'PUBLISHED' },
            ],
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
    } as unknown as IUniversityRepository;

    const result = await new LocalizedPublicUniversityUseCases(repository).listUniversities({}, 'ar');
    expect(result.data[0].publicId).toBe('INS-ITA-0010');
    expect(result.data[0].displayName).toBe('جامعة فلورنسا');
  });

  it('projects Major detail and filters mixed locale sections', async () => {
    const repository = {
      findBySlug: vi.fn().mockResolvedValue({
        id: 'm1',
        publicId: 'MJR-0001',
        slug: 'computer-science',
        canonicalName: 'Computer Science',
        canonicalDedupKey: 'computer-science',
        displayName: 'Computer Science',
        localizedNameAr: 'علوم الحاسوب',
        localizedNameEn: 'Computer Science',
        status: MajorStatus.PUBLISHED,
        completenessStatus: MajorImportCompletenessState.COMPLETE,
        sources: [{ sourceType: 'CATALOG_FILE', sourceName: 'catalog', sourceLocale: 'ar' }],
      }),
      listContentSections: vi.fn().mockResolvedValue([
        { sectionKey: 'overview', locale: 'ar', content: 'عربي', reviewStatus: 'PUBLISHED' },
        { sectionKey: 'overview', locale: 'en', content: 'English', reviewStatus: 'PUBLISHED' },
      ]),
    } as unknown as IMajorRepository;

    const result = await new LocalizedPublicMajorUseCases(repository).getMajor('computer-science', 'ar');
    expect(result.publicId).toBe('MJR-0001');
    expect(result.contentSections?.map((section) => section.content)).toEqual(['عربي']);
  });

  it('projects International Test result without changing test identity', async () => {
    const repository = {
      findPublishedBySlug: vi.fn().mockResolvedValue({
        id: 'test-1',
        canonicalName: 'IELTS',
        displayName: 'IELTS',
        localizedNameAr: 'آيلتس',
        testCategory: 'LANGUAGE',
        providerName: 'IELTS Partners',
        status: 'PUBLISHED',
        isPubliclyVisible: true,
        isSourceVerified: true,
      }),
    } as unknown as IInternationalTestRepository;

    const result = await new LocalizedInternationalTestPublicUseCases(repository).getPublishedBySlug('ielts', 'ar');
    expect(result.id).toBe('test-1');
    expect(result.displayName).toBe('آيلتس');
  });
});
