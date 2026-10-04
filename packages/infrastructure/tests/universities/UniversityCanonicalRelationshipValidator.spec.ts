import { describe, expect, it, vi } from 'vitest';
import { UniversityCanonicalRelationshipValidator } from '../../src/universities/UniversityCanonicalRelationshipValidator';

const client = () => ({
  referenceCountry: { findUnique: vi.fn().mockResolvedValue({ iso2Code: 'YE' }) },
  administrativeRegion: { findUnique: vi.fn().mockResolvedValue({ countryIso2Code: 'YE' }) },
  referenceCity: {
    findUnique: vi
      .fn()
      .mockResolvedValue({ countryIso2Code: 'YE', administrativeRegionId: 'region-1' }),
  },
  degreeLevel: { findUnique: vi.fn().mockResolvedValue({ id: 'degree-1', status: 'ACTIVE' }) },
  major: { findUnique: vi.fn().mockResolvedValue({ id: 'major-1' }) },
  majorLevelProfile: { findFirst: vi.fn().mockResolvedValue({ id: 'profile-1' }) },
  internationalTest: { findUnique: vi.fn().mockResolvedValue({ id: 'test-1' }) },
  internationalTestVariant: { findUnique: vi.fn().mockResolvedValue({ testId: 'test-1' }) },
  internationalTestVersion: { findUnique: vi.fn().mockResolvedValue({ testId: 'test-1' }) },
});

describe('UniversityCanonicalRelationshipValidator', () => {
  it('accepts compatible geography, degree-major, and test children', async () => {
    await expect(
      new UniversityCanonicalRelationshipValidator(client()).validate({
        campuses: [
          {
            name: 'Main',
            countryReferenceId: 'country-1',
            regionReferenceId: 'region-1',
            cityReferenceId: 'city-1',
          },
        ],
        academicPrograms: [
          {
            sourceProgramName: 'CS',
            degreeLevelId: 'degree-1',
            majorId: 'major-1',
            majorMappingState: 'CANONICALLY_MAPPED',
            admissionRequirements: [
              {
                internationalTestId: 'test-1',
                testVariantId: 'variant-1',
                testVersionId: 'version-1',
              },
            ],
          },
        ],
      }),
    ).resolves.toBeUndefined();
  });

  it.each([
    [
      'UNIVERSITY_PROGRAM_DEGREE_LEVEL_NOT_ACTIVE',
      (c: any) => c.degreeLevel.findUnique.mockResolvedValue({ id: 'degree-1', status: 'ARCHIVED' }),
    ],
    [
      'UNIVERSITY_CAMPUS_CITY_COUNTRY_MISMATCH',
      (c: any) =>
        c.referenceCity.findUnique.mockResolvedValue({
          countryIso2Code: 'SA',
          administrativeRegionId: 'region-1',
        }),
    ],
    [
      'UNIVERSITY_PROGRAM_MAJOR_DEGREE_MISMATCH',
      (c: any) => c.majorLevelProfile.findFirst.mockResolvedValue(null),
    ],
    [
      'UNIVERSITY_ADMISSION_TEST_VARIANT_MISMATCH',
      (c: any) => c.internationalTestVariant.findUnique.mockResolvedValue({ testId: 'test-2' }),
    ],
    [
      'UNIVERSITY_ADMISSION_TEST_VERSION_MISMATCH',
      (c: any) => c.internationalTestVersion.findUnique.mockResolvedValue({ testId: 'test-2' }),
    ],
  ])('rejects valid IDs with the wrong semantic parent: %s', async (message, alter) => {
    const c = client();
    alter(c);
    await expect(
      new UniversityCanonicalRelationshipValidator(c).validate({
        campuses: [
          {
            name: 'Main',
            countryReferenceId: 'country-1',
            regionReferenceId: 'region-1',
            cityReferenceId: 'city-1',
          },
        ],
        academicPrograms: [
          {
            sourceProgramName: 'CS',
            degreeLevelId: 'degree-1',
            majorId: 'major-1',
            majorMappingState: 'CANONICALLY_MAPPED',
            admissionRequirements: [
              {
                internationalTestId: 'test-1',
                testVariantId: 'variant-1',
                testVersionId: 'version-1',
              },
            ],
          },
        ],
      }),
    ).rejects.toThrow(message);
  });
});
