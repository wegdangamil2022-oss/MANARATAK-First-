import { UniversityAcademicProgramAuthoringInput, UniversityNormalizedDetailsUpdate } from '@manaratak/domain';
import type { PrismaClient } from '@prisma/client';

export type UniversityRelationshipValidationClient = Pick<PrismaClient,
  'referenceCountry' | 'administrativeRegion' | 'referenceCity' | 'degreeLevel' |
  'major' | 'majorLevelProfile' | 'referenceCurrency' | 'internationalTest' | 'internationalTestVariant' |
  'internationalTestVersion' | 'universityOrganizationUnit' | 'universityCampus'>;

export class UniversityCanonicalRelationshipValidator {
  constructor(private readonly client: UniversityRelationshipValidationClient) {}

  async validate(details: UniversityNormalizedDetailsUpdate): Promise<void> {
    const unique = (items: readonly { sourceReferenceId?: string; id?: string }[] | undefined, kind: string) => {
      const keys = new Set<string>();
      for (const item of items ?? []) {
        const key = item.sourceReferenceId?.trim() || item.id;
        if (!key) continue;
        if (keys.has(key)) throw new Error(`UNIVERSITY_${kind}_SOURCE_DUPLICATE`);
        keys.add(key);
      }
    };
    unique(details.campuses, 'CAMPUS');
    unique(details.organizationUnits, 'ORGANIZATION_UNIT');
    unique(details.academicPrograms, 'PROGRAM');
    const units = new Map((details.organizationUnits ?? [])
      .filter(unit => unit.sourceReferenceId)
      .map(unit => [unit.sourceReferenceId!, unit]));
    for (const unit of details.organizationUnits ?? []) {
      if (!unit.parentSourceReferenceId) continue;
      const path = new Set<string>();
      let current = unit;
      while (current?.parentSourceReferenceId && units.has(current.parentSourceReferenceId)) {
        if (path.has(current.parentSourceReferenceId) || current.parentSourceReferenceId === unit.sourceReferenceId)
          throw new Error('UNIVERSITY_ORGANIZATION_HIERARCHY_CYCLE');
        path.add(current.parentSourceReferenceId);
        const parent = units.get(current.parentSourceReferenceId)!;
        if (parent.unitType === 'DEPARTMENT') throw new Error('UNIVERSITY_DEPARTMENT_CANNOT_BE_PARENT');
        current = parent;
      }
    }
    for (const campus of details.campuses ?? []) await this.validateCampus(campus);
    for (const tuition of details.tuitionProfiles ?? []) {
      if (tuition.effectiveFrom && tuition.effectiveTo && tuition.effectiveFrom > tuition.effectiveTo)
        throw new Error('UNIVERSITY_TUITION_EFFECTIVE_RANGE_INVALID');
      await this.validateCurrency(tuition.currencyReferenceId, tuition.currencyCode);
      if (tuition.amount != null && (!Number.isFinite(tuition.amount) || tuition.amount < 0))
        throw new Error('UNIVERSITY_TUITION_AMOUNT_INVALID');
    }
    for (const profile of details.accommodationProfiles ?? []) {
      await this.validateCurrency(profile.currencyReferenceId, profile.currencyCode);
      await this.validateCurrency(profile.livingCostCurrencyReferenceId, profile.livingCostCurrencyCode);
    }
    for (const program of details.academicPrograms ?? []) {
      if (!program.degreeLevelId) throw new Error('UNIVERSITY_PROGRAM_DEGREE_LEVEL_REQUIRED');
      await this.validateProgram(program.degreeLevelId, program.majorId, program.majorMappingState);
      await this.validateAdmissionRequirements(program.admissionRequirements ?? []);
    }
  }

  async validateCampus(input: {
    countryReferenceId?: string;
    regionReferenceId?: string;
    cityReferenceId?: string;
  }): Promise<void> {
    const country = input.countryReferenceId
      ? await this.client.referenceCountry.findUnique({
          where: { id: input.countryReferenceId },
          select: { iso2Code: true, isActive: true },
        })
      : null;
    if (input.countryReferenceId && !country)
      throw new Error('UNIVERSITY_CAMPUS_COUNTRY_NOT_FOUND');
    if (country?.isActive === false) throw new Error('UNIVERSITY_CAMPUS_COUNTRY_NOT_ACTIVE');
    const region = input.regionReferenceId
      ? await this.client.administrativeRegion.findUnique({
          where: { id: input.regionReferenceId },
          select: { countryIso2Code: true, countryReferenceId: true, lifecycleState: true },
        })
      : null;
    if (input.regionReferenceId && !region) throw new Error('UNIVERSITY_CAMPUS_REGION_NOT_FOUND');
    if (region && region.lifecycleState !== 'ACTIVE') throw new Error('UNIVERSITY_CAMPUS_REGION_NOT_ACTIVE');
    const city = input.cityReferenceId
      ? await this.client.referenceCity.findUnique({
          where: { id: input.cityReferenceId },
          select: { countryIso2Code: true, countryReferenceId: true, administrativeRegionId: true, isActive: true },
        })
      : null;
    if (input.cityReferenceId && !city) throw new Error('UNIVERSITY_CAMPUS_CITY_NOT_FOUND');
    if (city?.isActive === false) throw new Error('UNIVERSITY_CAMPUS_CITY_NOT_ACTIVE');
    if (country && region && (country.iso2Code !== region.countryIso2Code ||
      (region.countryReferenceId && region.countryReferenceId !== input.countryReferenceId)))
      throw new Error('UNIVERSITY_CAMPUS_REGION_COUNTRY_MISMATCH');
    if (country && city && (country.iso2Code !== city.countryIso2Code ||
      (city.countryReferenceId && city.countryReferenceId !== input.countryReferenceId)))
      throw new Error('UNIVERSITY_CAMPUS_CITY_COUNTRY_MISMATCH');
    if (region && city && (city.administrativeRegionId !== input.regionReferenceId ||
      city.countryIso2Code !== region.countryIso2Code))
      throw new Error('UNIVERSITY_CAMPUS_CITY_REGION_MISMATCH');
    if (region && !country) throw new Error('UNIVERSITY_CAMPUS_REGION_COUNTRY_REQUIRED');
    if (city && !country) throw new Error('UNIVERSITY_CAMPUS_CITY_COUNTRY_REQUIRED');
  }

  async validateCurrency(currencyReferenceId?: string, currencyCode?: string | null): Promise<void> {
    if (!currencyReferenceId) {
      if (currencyCode?.trim()) throw new Error('UNIVERSITY_CANONICAL_CURRENCY_REQUIRED');
      return;
    }
    const currency = await this.client.referenceCurrency.findUnique({
      where: { id: currencyReferenceId },
      select: { isoCode: true, isActive: true, lifecycleState: true },
    });
    if (!currency || !currency.isActive || currency.lifecycleState !== 'ACTIVE')
      throw new Error('UNIVERSITY_CURRENCY_REFERENCE_NOT_ACTIVE');
    if (currencyCode?.trim() && currency.isoCode.toUpperCase() !== currencyCode.trim().toUpperCase())
      throw new Error('UNIVERSITY_CURRENCY_CODE_MISMATCH');
  }

  async validateProgramAuthoring(
    universityId: string,
    input: UniversityAcademicProgramAuthoringInput,
  ): Promise<void> {
    await this.validateProgram(input.degreeLevelId, input.majorId ?? undefined, input.majorMappingState);

    if (input.organizationUnitId) {
      const organizationUnit = await this.client.universityOrganizationUnit.findFirst({
        where: { id: input.organizationUnitId, universityId },
        select: { id: true },
      });
      if (!organizationUnit) throw new Error('UNIVERSITY_PROGRAM_ORGANIZATION_UNIT_NOT_FOUND');
    }

    const campusIds = [...new Set(input.campusIds ?? [])];
    if (campusIds.length) {
      const campuses = await this.client.universityCampus.findMany({
        where: { universityId, id: { in: campusIds } },
        select: { id: true },
      });
      if (campuses.length !== campusIds.length) throw new Error('UNIVERSITY_PROGRAM_CAMPUS_NOT_FOUND');
    }

    await this.validateAdmissionRequirements(input.admissionRequirements ?? []);
  }

  private async validateAdmissionRequirements(
    requirements: NonNullable<UniversityAcademicProgramAuthoringInput['admissionRequirements']>,
  ): Promise<void> {
    const requirementKeys = new Set<string>();
    for (const requirement of requirements) {
      if (requirement.minimumScore != null && (!Number.isFinite(requirement.minimumScore) || requirement.minimumScore < 0)) {
        throw new Error('UNIVERSITY_ADMISSION_TEST_MINIMUM_SCORE_INVALID');
      }
      const key = JSON.stringify([requirement.internationalTestId, requirement.testVariantId ?? null, requirement.testVersionId ?? null]);
      if (requirementKeys.has(key)) throw new Error('UNIVERSITY_ADMISSION_TEST_REQUIREMENT_DUPLICATE');
      requirementKeys.add(key);
      await this.validateTest(
        requirement.internationalTestId,
        requirement.testVariantId ?? undefined,
        requirement.testVersionId ?? undefined,
      );
    }
  }

  async validateProgram(
    degreeLevelId: string,
    majorId?: string,
    mappingState?: string,
  ): Promise<void> {
    const degree = await this.client.degreeLevel.findUnique({
      where: { id: degreeLevelId },
      select: { id: true, status: true },
    });
    if (!degree) throw new Error('UNIVERSITY_PROGRAM_DEGREE_LEVEL_NOT_FOUND');
    if (degree.status !== 'ACTIVE') throw new Error('UNIVERSITY_PROGRAM_DEGREE_LEVEL_NOT_ACTIVE');
    if (majorId && mappingState !== 'CANONICALLY_MAPPED')
      throw new Error('UNIVERSITY_PROGRAM_MAPPING_STATE_INCONSISTENT');
    if (!majorId) {
      if (mappingState === 'CANONICALLY_MAPPED') throw new Error('UNIVERSITY_PROGRAM_MAJOR_REFERENCE_REQUIRED');
      return;
    }
    const major = await this.client.major.findUnique({
      where: { id: majorId },
      select: { id: true, status: true },
    });
    if (!major) throw new Error('UNIVERSITY_PROGRAM_MAJOR_NOT_FOUND');
    if (['ARCHIVED', 'REJECTED'].includes(major.status)) throw new Error('UNIVERSITY_PROGRAM_MAJOR_NOT_ACTIVE');
    if (mappingState === 'CANONICALLY_MAPPED') {
      const profile = await this.client.majorLevelProfile.findFirst({
        where: { majorId, degreeLevelId },
        select: { id: true },
      });
      if (!profile) throw new Error('UNIVERSITY_PROGRAM_MAJOR_DEGREE_MISMATCH');
    }
  }

  async validateTest(testId: string, variantId?: string, versionId?: string): Promise<void> {
    const test = await this.client.internationalTest.findUnique({
      where: { id: testId },
      select: { id: true, status: true },
    });
    if (!test) throw new Error('UNIVERSITY_ADMISSION_TEST_NOT_FOUND');
    if (['ARCHIVED', 'REJECTED'].includes(test.status)) throw new Error('UNIVERSITY_ADMISSION_TEST_NOT_ACTIVE');
    if (variantId) {
      const variant = await this.client.internationalTestVariant.findUnique({
        where: { id: variantId },
        select: { testId: true },
      });
      if (!variant) throw new Error('UNIVERSITY_ADMISSION_TEST_VARIANT_NOT_FOUND');
      if (variant.testId !== testId) throw new Error('UNIVERSITY_ADMISSION_TEST_VARIANT_MISMATCH');
    }
    if (versionId) {
      const version = await this.client.internationalTestVersion.findUnique({
        where: { id: versionId },
        select: { testId: true },
      });
      if (!version) throw new Error('UNIVERSITY_ADMISSION_TEST_VERSION_NOT_FOUND');
      if (version.testId !== testId) throw new Error('UNIVERSITY_ADMISSION_TEST_VERSION_MISMATCH');
    }
  }
}
