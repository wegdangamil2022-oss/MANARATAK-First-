import {
  AdministrativeRegionDto,
  InternationalTestContentBlockDto,
  InternationalTestDto,
  InternationalTestVersionDto,
  MajorContentSectionDto,
  MajorDto,
  MajorPhaseLinkingService,
  PublicMajorDto,
  PublicUniversityDto,
  ReferenceCityDto,
  ReferenceCountryDto,
  ReferenceCurrencyDto,
  ReferenceLanguageDto,
  sanitizeUniversityOptionalFields,
  UniversityDto,
  UniversityLocalizedTextDto,
  UniversityLocalizedTextTargetType,
} from '@manaratak/domain';
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  resolveLocalizedLocale,
  type LocalizedLocaleResolution,
  type SupportedLocale,
} from '@manaratak/shared';

export interface LocalizedValueProjection<T> {
  value: T | undefined;
  resolution: LocalizedLocaleResolution;
}

type LocaleValues<T> = Partial<Record<SupportedLocale, T>>;
type JsonRecord = Record<string, unknown>;

const PUBLIC_UNIVERSITY_TRANSLATION_STATUSES = new Set(['PUBLISHED']);
const PUBLIC_MAJOR_SECTION_STATUSES = new Set(['PUBLISHED', 'APPROVED']);
const PUBLIC_TEST_BLOCK_STATUSES = new Set(['APPROVED']);

export class ApplicationLocaleProjectionService {
  constructor(private readonly fallbackLocale: SupportedLocale = DEFAULT_LOCALE) {}

  public resolveValue<T>(input: {
    requestedLocale: SupportedLocale;
    sourceLocale?: SupportedLocale | null;
    sourceValue?: T;
    localizedValues?: LocaleValues<T>;
  }): LocalizedValueProjection<T> {
    const localizedValues: LocaleValues<T> = { ...(input.localizedValues ?? {}) };
    const sourceLocale = input.sourceLocale ?? null;

    if (
      sourceLocale &&
      input.sourceValue !== undefined &&
      localizedValues[sourceLocale] === undefined
    ) {
      localizedValues[sourceLocale] = input.sourceValue;
    }

    const availableLocales = (Object.keys(localizedValues) as SupportedLocale[]).filter(
      (locale) => localizedValues[locale] !== undefined,
    );
    const resolution = resolveLocalizedLocale({
      requestedLocale: input.requestedLocale,
      sourceLocale,
      fallbackLocale: this.fallbackLocale,
      availableLocales,
    });

    if (resolution.locale && localizedValues[resolution.locale] !== undefined) {
      return { value: localizedValues[resolution.locale], resolution };
    }

    return { value: input.sourceValue, resolution };
  }

  public projectReferenceCountry(
    country: ReferenceCountryDto,
    locale: SupportedLocale,
  ): ReferenceCountryDto {
    return {
      ...country,
      name: this.projectReferenceName(country.name, country.nameAr, locale),
      nameAr: undefined,
    };
  }

  public projectReferenceCurrency(
    currency: ReferenceCurrencyDto,
    locale: SupportedLocale,
  ): ReferenceCurrencyDto {
    return {
      ...currency,
      name: this.projectReferenceName(currency.name, currency.nameAr, locale),
      nameAr: undefined,
    };
  }

  public projectReferenceLanguage(
    language: ReferenceLanguageDto,
    locale: SupportedLocale,
  ): ReferenceLanguageDto {
    return {
      ...language,
      name: this.projectReferenceName(language.name, language.nameAr, locale),
      nameAr: undefined,
    };
  }

  public projectReferenceCity(city: ReferenceCityDto, locale: SupportedLocale): ReferenceCityDto {
    return {
      ...city,
      name: this.projectReferenceName(city.name, city.nameAr, locale),
      nameAr: undefined,
      administrativeRegion: city.administrativeRegion
        ? this.projectAdministrativeRegion(city.administrativeRegion, locale)
        : city.administrativeRegion,
    };
  }

  public projectAdministrativeRegion(
    region: AdministrativeRegionDto,
    locale: SupportedLocale,
  ): AdministrativeRegionDto {
    return {
      ...region,
      name: this.projectReferenceName(region.name, region.nameAr, locale),
      nameAr: undefined,
    };
  }

  public projectUniversity(
    university: UniversityDto,
    locale: SupportedLocale,
  ): PublicUniversityDto {
    const sourceLocale = this.extractSourceLocale(university.sourceRecords);
    const translations = (university.translations ?? []).filter(
      (translation) =>
        isSupportedLocale(translation.locale) &&
        PUBLIC_UNIVERSITY_TRANSLATION_STATUSES.has(translation.reviewStatus ?? ''),
    );
    const localizedTexts = (university.localizedTexts ?? []).filter(
      (text) =>
        isSupportedLocale(text.locale) &&
        PUBLIC_UNIVERSITY_TRANSLATION_STATUSES.has(text.reviewStatus ?? ''),
    );

    const displayName = this.resolveValue<string>({
      requestedLocale: locale,
      sourceLocale,
      sourceValue: university.displayName,
      localizedValues: this.collectUniversityTranslationValues(translations, 'displayName'),
    }).value ?? university.displayName;

    const description = this.resolveValue<string>({
      requestedLocale: locale,
      sourceLocale,
      sourceValue: university.description,
      localizedValues: this.collectUniversityTranslationValues(translations, 'description'),
    }).value;

    const {
      id: _id,
      canonicalDedupKey: _canonicalDedupKey,
      sourceImportRecordId: _sourceImportRecordId,
      status: _status,
      completenessStatus: _completenessStatus,
      createdAt: _createdAt,
      optionalFields,
      translations: _translations,
      localizedTexts: _localizedTexts,
      localizedNames: _localizedNames,
      sourceRecords: _sourceRecords,
      ...publicData
    } = university;

    return {
      ...sanitizeUniversityOptionalFields(optionalFields),
      ...publicData,
      displayName,
      description,
      campuses: this.projectUniversityChildren(
        this.publicActiveUniversityChildren(university.campuses),
        'CAMPUS',
        localizedTexts,
        locale,
        sourceLocale,
      ),
      organizationUnits: this.projectUniversityChildren(
        this.publicActiveUniversityChildren(university.organizationUnits),
        'ORGANIZATION_UNIT',
        localizedTexts,
        locale,
        sourceLocale,
      ),
      academicPrograms: this.projectUniversityChildren(
        (university.academicPrograms ?? [])
          .filter((program) => program.status === 'ACTIVE')
          .map((program) => ({
            ...program,
            admissionRequirements: (program.admissionRequirements ?? []).filter((requirement) => requirement.status === 'ACTIVE'),
          })),
        'ACADEMIC_PROGRAM',
        localizedTexts,
        locale,
        sourceLocale,
      ) as PublicUniversityDto['academicPrograms'],
      tuitionProfiles: this.projectUniversityChildren(
        university.tuitionProfiles,
        'TUITION_PROFILE',
        localizedTexts,
        locale,
        sourceLocale,
      ),
      accommodationProfiles: this.projectUniversityChildren(
        university.accommodationProfiles,
        'ACCOMMODATION_PROFILE',
        localizedTexts,
        locale,
        sourceLocale,
      ),
      rankings: this.projectUniversityChildren(
        university.rankings,
        'RANKING',
        localizedTexts,
        locale,
        sourceLocale,
      ),
    } as PublicUniversityDto;
  }

  public projectMajor(
    major: MajorDto,
    contentSections: readonly MajorContentSectionDto[],
    locale: SupportedLocale,
  ): PublicMajorDto {
    const sourceLocale = this.extractMajorSourceLocale(major);
    const displayName = this.resolveValue<string>({
      requestedLocale: locale,
      sourceLocale,
      sourceValue: major.displayName,
      localizedValues: {
        ar: this.nonEmptyText(major.localizedNameAr),
        en: this.nonEmptyText(major.localizedNameEn),
      },
    }).value ?? major.displayName;

    const projectedSections = this.selectMajorSections(contentSections, locale, sourceLocale);
    const {
      id: _id,
      canonicalDedupKey: _canonicalDedupKey,
      sourceImportRecordId: _sourceImportRecordId,
      status: _status,
      completenessStatus: _completenessStatus,
      createdAt: _createdAt,
      optionalFields,
      localizedNameAr: _localizedNameAr,
      localizedNameEn: _localizedNameEn,
      ...publicData
    } = major;

    const projectedMajor = {
      ...(optionalFields ?? {}),
      ...publicData,
      displayName,
    } as PublicMajorDto;

    return {
      ...projectedMajor,
      contentSections: projectedSections.map((section) => ({
        sectionKey: section.sectionKey,
        title: section.title,
        content: section.content,
        reviewStatus: section.reviewStatus,
        metadata: section.metadata,
      })),
      phaseLinks: MajorPhaseLinkingService.buildLinks(major),
    };
  }

  public projectInternationalTest(
    test: InternationalTestDto,
    locale: SupportedLocale,
  ): InternationalTestDto {
    const sourceLocale = this.extractInternationalTestSourceLocale(test);
    const sourceDisplayName =
      this.nonEmptyText(test.displayName as string | undefined) ?? test.canonicalName;
    const displayName = this.resolveValue<string>({
      requestedLocale: locale,
      sourceLocale,
      sourceValue: sourceDisplayName,
      localizedValues: {
        ar: this.nonEmptyText(test.localizedNameAr),
        en: this.nonEmptyText(test.localizedNameEn),
      },
    }).value ?? sourceDisplayName;

    const {
      localizedNameAr: _localizedNameAr,
      localizedNameEn: _localizedNameEn,
      ...publicData
    } = test;

    return {
      ...publicData,
      displayName,
      family: test.family ? this.projectNamedCarrier(test.family, locale) : test.family,
      provider: test.provider ? this.projectNamedCarrier(test.provider, locale) : test.provider,
      versions: test.versions?.map((version) => this.projectInternationalTestVersion(version, locale)),
    };
  }

  private projectReferenceName(
    englishName: string,
    arabicName: string | null | undefined,
    locale: SupportedLocale,
  ): string {
    return this.resolveValue<string>({
      requestedLocale: locale,
      sourceLocale: 'en',
      sourceValue: englishName,
      localizedValues: {
        ar: this.nonEmptyText(arabicName),
        en: englishName,
      },
    }).value ?? englishName;
  }

  private collectUniversityTranslationValues(
    translations: NonNullable<UniversityDto['translations']>,
    field: 'displayName' | 'description',
  ): LocaleValues<string> {
    const values: LocaleValues<string> = {};
    for (const translation of translations) {
      if (!isSupportedLocale(translation.locale)) continue;
      const value = this.nonEmptyText(translation[field]);
      if (value !== undefined) values[translation.locale] = value;
    }
    return values;
  }

  private publicActiveUniversityChildren(collection: unknown[] | undefined): unknown[] | undefined {
    if (!Array.isArray(collection)) return collection;
    return collection.filter((item) =>
      !this.isRecord(item) || item.status === undefined || item.status === 'ACTIVE',
    );
  }

  private projectUniversityChildren(
    collection: unknown[] | undefined,
    targetType: UniversityLocalizedTextTargetType,
    localizedTexts: readonly UniversityLocalizedTextDto[],
    locale: SupportedLocale,
    sourceLocale: SupportedLocale | null,
  ): unknown[] | undefined {
    if (!Array.isArray(collection)) return collection;

    return collection.map((item) => {
      if (!this.isRecord(item) || typeof item.id !== 'string') return item;
      const targetTexts = localizedTexts.filter(
        (text) => text.targetType === targetType && text.targetId === item.id,
      );
      if (targetTexts.length === 0) return item;

      const projected: JsonRecord = { ...item };
      const fieldKeys = [...new Set(targetTexts.map((text) => text.fieldKey))];
      for (const fieldKey of fieldKeys) {
        const values: LocaleValues<string> = {};
        for (const text of targetTexts) {
          if (text.fieldKey !== fieldKey || !isSupportedLocale(text.locale)) continue;
          values[text.locale] = text.value;
        }
        const sourceValue = typeof item[fieldKey] === 'string' ? item[fieldKey] : undefined;
        const resolved = this.resolveValue<string>({
          requestedLocale: locale,
          sourceLocale,
          sourceValue,
          localizedValues: values,
        }).value;
        if (resolved !== undefined) projected[fieldKey] = resolved;
      }
      return projected;
    });
  }

  private selectMajorSections(
    sections: readonly MajorContentSectionDto[],
    locale: SupportedLocale,
    sourceLocale: SupportedLocale | null,
  ): MajorContentSectionDto[] {
    const eligible = sections.filter(
      (section) =>
        section.reviewStatus === undefined || PUBLIC_MAJOR_SECTION_STATUSES.has(section.reviewStatus),
    );
    const groups = this.groupBy(eligible, (section) => section.sectionKey);
    const projected: MajorContentSectionDto[] = [];

    for (const group of groups.values()) {
      const localized = group.filter((section) => isSupportedLocale(section.locale));
      const availableLocales = localized
        .map((section) => section.locale)
        .filter((value): value is SupportedLocale => isSupportedLocale(value));
      const resolution = resolveLocalizedLocale({
        requestedLocale: locale,
        sourceLocale,
        fallbackLocale: this.fallbackLocale,
        availableLocales,
      });
      const selected = resolution.locale
        ? localized.find((section) => section.locale === resolution.locale)
        : undefined;
      projected.push(selected ?? group.find((section) => !section.locale) ?? group[0]);
    }

    return projected;
  }

  private projectInternationalTestVersion(
    version: InternationalTestVersionDto,
    locale: SupportedLocale,
  ): InternationalTestVersionDto {
    const sourceLocale = isSupportedLocale(version.sourceLocale) ? version.sourceLocale : null;
    return {
      ...version,
      contentBlocks: this.selectInternationalTestBlocks(
        version.contentBlocks ?? [],
        locale,
        sourceLocale,
      ),
    };
  }

  private selectInternationalTestBlocks(
    blocks: readonly InternationalTestContentBlockDto[],
    locale: SupportedLocale,
    sourceLocale: SupportedLocale | null,
  ): InternationalTestContentBlockDto[] {
    const eligible = blocks.filter((block) => PUBLIC_TEST_BLOCK_STATUSES.has(block.reviewStatus));
    const groups = this.groupBy(eligible, (block) => block.blockKey);
    const projected: InternationalTestContentBlockDto[] = [];

    for (const group of groups.values()) {
      const localized = group.filter((block) => isSupportedLocale(block.locale));
      const availableLocales = localized
        .map((block) => block.locale)
        .filter((value): value is SupportedLocale => isSupportedLocale(value));
      const resolution = resolveLocalizedLocale({
        requestedLocale: locale,
        sourceLocale,
        fallbackLocale: this.fallbackLocale,
        availableLocales,
      });
      const selected = resolution.locale
        ? localized.find((block) => block.locale === resolution.locale)
        : undefined;
      const fallback = group.find((block) => !block.locale);
      if (selected ?? fallback) projected.push((selected ?? fallback)!);
    }

    return projected;
  }

  private projectNamedCarrier<
    T extends {
      displayName: string;
      localizedNameAr?: string | null;
      localizedNameEn?: string | null;
    },
  >(carrier: T, locale: SupportedLocale): T {
    const displayName = this.resolveValue<string>({
      requestedLocale: locale,
      sourceLocale: 'en',
      sourceValue: carrier.displayName,
      localizedValues: {
        ar: this.nonEmptyText(carrier.localizedNameAr),
        en: this.nonEmptyText(carrier.localizedNameEn) ?? carrier.displayName,
      },
    }).value ?? carrier.displayName;

    return {
      ...carrier,
      displayName,
      localizedNameAr: undefined,
      localizedNameEn: undefined,
    };
  }

  private extractSourceLocale(records: unknown[] | undefined): SupportedLocale | null {
    if (!Array.isArray(records)) return null;
    for (const record of records) {
      if (!this.isRecord(record)) continue;
      if (isSupportedLocale(record.sourceLocale)) return record.sourceLocale;
    }
    return null;
  }

  private extractMajorSourceLocale(major: MajorDto): SupportedLocale | null {
    for (const source of major.sources ?? []) {
      if (isSupportedLocale(source.sourceLocale)) return source.sourceLocale;
    }
    return null;
  }

  private extractInternationalTestSourceLocale(test: InternationalTestDto): SupportedLocale | null {
    const versions = test.versions ?? [];
    const current = test.currentPublishedVersionId
      ? versions.find((version) => version.id === test.currentPublishedVersionId)
      : versions.find((version) => version.status === 'PUBLISHED');
    return current && isSupportedLocale(current.sourceLocale) ? current.sourceLocale : null;
  }

  private nonEmptyText(value: string | null | undefined): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private isRecord(value: unknown): value is JsonRecord {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    for (const item of items) {
      const groupKey = key(item);
      const existing = groups.get(groupKey);
      if (existing) existing.push(item);
      else groups.set(groupKey, [item]);
    }
    return groups;
  }
}
