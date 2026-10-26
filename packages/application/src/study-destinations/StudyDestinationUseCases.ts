import { createHash } from 'node:crypto';
import { assertStudyDestinationTranslationUnchanged, studyDestinationEnglishFields } from './StudyDestinationTranslationPolicy';
import { AtomicDomainMutationCoordinator } from '../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { AssetSecurityClassification } from '@manaratak/domain';
import {
  AssetReferencePolicy,
  assertAssetReferenceUsable,
} from '../asset-platform/AssetReferencePolicy';
import {
  IReferenceDataRepository,
  IReferenceResolutionRepository,
  IStudyDestinationRepository,
  PaginatedStudyDestinationResult,
  ReferenceCityDto,
  ReferenceCountryDto,
  ReferenceCurrencyDto,
  ReferenceLanguageDto,
  StudyDestinationCompletenessStatus,
  StudyDestinationFilters,
  StudyDestinationProfileDto,
  StudyDestinationProfileInput,
  StudyDestinationPublishingPolicy,
  StudyDestinationReadinessReport,
  StudyDestinationStatus,
  StudyDestinationAuthorityDecision,
  StudyDestinationMissingCheck,
  StudyDestinationVerificationStatus,
} from '@manaratak/domain';

const activeReference = (
  reference: { isActive: boolean; lifecycleState: string } | null | undefined,
): boolean => Boolean(reference?.isActive && reference.lifecycleState === 'ACTIVE');

export interface StudyDestinationAggregateDto {
  country: ReferenceCountryDto;
  profile: StudyDestinationProfileDto | null;
  studyLanguages: ReferenceLanguageDto[];
  livingCostCurrency: ReferenceCurrencyDto | null;
  readiness: StudyDestinationReadinessReport | null;
  fingerprint?: string | null;
  referenceWarnings?: string[];
  cities?: ReferenceCityDto[];
}

export interface AdminStudyDestinationListItem {
  country: ReferenceCountryDto;
  profile: StudyDestinationProfileDto | null;
  readiness: StudyDestinationReadinessReport | null;
}

export interface AdminStudyDestinationListFilters {
  q?: string;
  region?: string;
  status?: StudyDestinationStatus | 'NO_PROFILE';
  completenessStatus?: StudyDestinationCompletenessStatus;
  page?: number;
  pageSize?: number;
  missingCheck?: StudyDestinationMissingCheck;
}

type PublicContentKey =
  | 'publicId'
  | 'slug'
  | 'overviewAr'
  | 'overviewEn'
  | 'studySystemSummaryAr'
  | 'studySystemSummaryEn'
  | 'admissionHighlightsAr'
  | 'admissionHighlightsEn'
  | 'visaSummaryAr'
  | 'visaSummaryEn'
  | 'visaRequirementsAr'
  | 'visaRequirementsEn'
  | 'visaOfficialUrl'
  | 'livingCostTier'
  | 'averageMonthlyLivingCostMin'
  | 'averageMonthlyLivingCostMax'
  | 'costHighlightsAr'
  | 'costHighlightsEn'
  | 'studentLifeHighlightsAr'
  | 'studentLifeHighlightsEn'
  | 'officialLinks'
  | 'isFeatured';
export interface PublicStudyDestinationDto extends Pick<
  StudyDestinationProfileDto,
  PublicContentKey
> {
  country: Pick<
    ReferenceCountryDto,
    | 'id'
    | 'iso2Code'
    | 'iso3Code'
    | 'name'
    | 'nameAr'
    | 'officialName'
    | 'region'
    | 'subregion'
    | 'defaultCurrencyCode'
    | 'defaultLanguageCode'
    | 'callingCode'
  >;
  studyLanguages: Array<Pick<ReferenceLanguageDto, 'id' | 'name' | 'nameAr' | 'isoCode'>>;
  livingCostCurrency: Pick<ReferenceCurrencyDto, 'id' | 'name' | 'nameAr' | 'isoCode'> | null;
  cities: Array<{ id: string; name: string; nameAr?: string | null }>;
  image: { url: string; expiresAt: string } | null;
  lastReviewedAt: string;
  referenceWarnings: string[];
}
export interface StudyDestinationCommandContext {
  actorId: string;
  reason: string;
  expectedRevision: number;
  correlationId?: string;
}
export interface StudyDestinationReviewDecision {
  fingerprint: string;
  authorities: StudyDestinationAuthorityDecision[];
}
export interface StudyDestinationAssetDelivery {
  requestDeliveryGrant(input: {
    assetId: string;
    expiresInSeconds: number;
  }): Promise<{ url: string; expiresAt: string; headers: Readonly<Record<string, string>> }>;
}
const CONTENT_KEYS = [
  'overviewAr',
  'overviewEn',
  'studySystemSummaryAr',
  'studySystemSummaryEn',
  'admissionHighlightsAr',
  'admissionHighlightsEn',
  'visaSummaryAr',
  'visaSummaryEn',
  'visaRequirementsAr',
  'visaRequirementsEn',
  'visaOfficialUrl',
  'livingCostTier',
  'averageMonthlyLivingCostMin',
  'averageMonthlyLivingCostMax',
  'livingCostCurrencyReferenceId',
  'costHighlightsAr',
  'costHighlightsEn',
  'studentLifeHighlightsAr',
  'studentLifeHighlightsEn',
  'officialLinks',
  'sourceAuditDate',
  'evidenceSources',
  'imageAssetId',
  'isFeatured',
  'studyLanguageReferenceIds',
  'cityReferenceIds',
] as const;
export function studyDestinationFingerprint(profile: StudyDestinationProfileInput): string {
  const data = Object.fromEntries(
    CONTENT_KEYS.map((key) => [
      key,
      key === 'evidenceSources'
        ? (profile.evidenceSources ?? []).map(({ label, url, sourceType }) => ({
            label,
            url,
            sourceType,
          }))
        : (profile[key] ?? null),
    ]),
  );
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}
const normalizeTextArray = (items: string[] | undefined): string[] | undefined =>
  items?.map((item) => item.trim()).filter(Boolean);

export class StudyDestinationUseCases {
  public constructor(
    private readonly repository: IStudyDestinationRepository,
    private readonly referenceData: IReferenceDataRepository,
    private readonly referenceResolution: IReferenceResolutionRepository,
    private readonly publishingPolicy = new StudyDestinationPublishingPolicy(),
    private readonly assetReferences?: AssetReferencePolicy,
    private readonly atomic?: AtomicDomainMutationCoordinator,
    private readonly assetDelivery?: StudyDestinationAssetDelivery,
    private readonly transactionBound = false,
  ) {}

  public async listAdmin(
    filters: AdminStudyDestinationListFilters = {},
  ): Promise<PaginatedStudyDestinationResult<AdminStudyDestinationListItem>> {
    if (!this.repository.listAdminCountries)
      throw new Error('STUDY_DESTINATION_BOUNDED_READ_REQUIRED');
    const page = await this.repository.listAdminCountries(filters);
    return {
      ...page,
      data: page.data.map((item) => ({
        ...item,
        readiness: item.profile ? this.publishingPolicy.evaluate(item.profile) : null,
      })),
    };
  }

  public async getAdminByCountryIso2(iso2Code: string): Promise<StudyDestinationAggregateDto> {
    const country = await this.requireCountry(iso2Code);
    const profile = await this.repository.findByCountryReferenceId(country.id);
    return this.aggregate(country, profile);
  }

  public async upsertProfile(
    iso2Code: string,
    input: StudyDestinationProfileInput,
    expectedUpdatedAt?: string,
    context?: StudyDestinationCommandContext,
  ): Promise<StudyDestinationAggregateDto> {
    if (!this.transactionBound)
      return this.command(iso2Code, 'STUDY_DESTINATION_EDIT', context, (scope) =>
        scope.upsertProfile(iso2Code, input, expectedUpdatedAt, context),
      );
    await assertAssetReferenceUsable(this.assetReferences, input.imageAssetId, {
      purpose: 'STUDY_DESTINATION_IMAGE',
      allowedMimeTypePrefixes: ['image/'],
    });
    const country = await this.requireCountry(iso2Code);
    const normalized = await this.normalizeAndValidateInput(input);
    for (const id of normalized.cityReferenceIds ?? []) {
      const city = (await this.referenceResolution.resolveCityCandidate({ id }))?.record;
      if (city?.countryReferenceId !== country.id) throw new Error('INVALID_STUDY_CITY_COUNTRY');
    }
    const existing = await this.repository.findByCountryReferenceId(country.id);
    assertStudyDestinationTranslationUnchanged(existing, input);
    // Retain exact legacy English values on unrelated Arabic card saves.
    if (existing) for (const key of studyDestinationEnglishFields) {
      if (JSON.stringify(input[key] ?? null) === JSON.stringify(existing[key] ?? null)) delete normalized[key];
    }
    if (normalized.officialLinks && input.officialLinks) normalized.officialLinks = normalized.officialLinks.map((link, index) => ({
      ...link, labelEn: input.officialLinks![index].labelEn, noteEn: input.officialLinks![index].noteEn,
    }));
    if (expectedUpdatedAt && (!existing || existing.updatedAt !== expectedUpdatedAt))
      throw new Error('STUDY_DESTINATION_VERSION_CONFLICT');
    let saved: StudyDestinationProfileDto;
    if (!existing) {
      saved = await this.repository.create({
        ...normalized,
        governance: { lastEditorId: context!.actorId, proof: null },
        publicId: `std-${country.iso2Code.toUpperCase()}`,
        slug: country.iso2Code.toLowerCase(),
        countryReferenceId: country.id,
        status: StudyDestinationStatus.DRAFT,
        completenessStatus: StudyDestinationCompletenessStatus.INCOMPLETE,
      });
    } else {
      await this.normalizeAndValidateInput({ ...existing, ...normalized });
      const sourceSensitiveChanged = this.hasSourceSensitiveChange(existing, normalized);
      const provisional = {
        ...existing,
        ...normalized,
        governance: sourceSensitiveChanged
          ? { lastEditorId: context!.actorId, proof: null }
          : existing.governance,
        ...(sourceSensitiveChanged
          ? { sourceVerificationStatus: StudyDestinationVerificationStatus.UNVERIFIED }
          : {}),
      } as StudyDestinationProfileDto;
      const readiness = this.publishingPolicy.evaluate(provisional);
      provisional.governance = {
        ...provisional.governance,
        readiness: Object.fromEntries(readiness.checks.map((check) => [check.key, check.complete])),
      };
      const mustLeavePublishedState =
        existing.status === StudyDestinationStatus.PUBLISHED && sourceSensitiveChanged;
      saved = await this.repository.update(
        existing.id,
        {
          ...normalized,
          governance: provisional.governance,
          ...(sourceSensitiveChanged
            ? { sourceVerificationStatus: StudyDestinationVerificationStatus.UNVERIFIED }
            : {}),
          ...(mustLeavePublishedState
            ? { status: StudyDestinationStatus.DRAFT, publishedAt: null }
            : {}),
          completenessStatus: mustLeavePublishedState
            ? readiness.completenessStatus
            : existing.status === StudyDestinationStatus.PUBLISHED
              ? StudyDestinationCompletenessStatus.COMPLETE
              : readiness.completenessStatus,
        },
        existing.updatedAt,
        existing.revision,
      );
    }
    if (!existing) {
      const readiness = this.publishingPolicy.evaluate(saved);
      saved = await this.repository.update(
        saved.id,
        {
          governance: {
            ...saved.governance,
            readiness: Object.fromEntries(
              readiness.checks.map((check) => [check.key, check.complete]),
            ),
          },
          completenessStatus: readiness.completenessStatus,
        },
        saved.updatedAt,
        saved.revision,
      );
    }
    return this.aggregate(country, saved);
  }

  public async submitForReview(
    iso2Code: string,
    context?: StudyDestinationCommandContext,
  ): Promise<StudyDestinationAggregateDto> {
    if (!this.transactionBound)
      return this.command(iso2Code, 'STUDY_DESTINATION_SUBMIT_REVIEW', context, (scope) =>
        scope.submitForReview(iso2Code, context),
      );
    const country = await this.requireCountry(iso2Code);
    const profile = await this.requireProfile(country.id);
    if (profile.status === StudyDestinationStatus.PUBLISHED)
      throw new Error('STUDY_DESTINATION_ARCHIVE_BEFORE_REVIEW');
    const readiness = this.publishingPolicy.evaluate(profile);
    if (!readiness.readyForReview) throw new Error('STUDY_DESTINATION_NOT_READY_FOR_REVIEW');
    const saved = await this.repository.update(
      profile.id,
      {
        status: StudyDestinationStatus.IN_REVIEW,
        completenessStatus: readiness.readyForPublish
          ? StudyDestinationCompletenessStatus.READY_TO_PUBLISH
          : StudyDestinationCompletenessStatus.READY_FOR_REVIEW,
      },
      profile.updatedAt,
      profile.revision,
    );
    return this.aggregate(country, saved);
  }

  public async verifySources(
    iso2Code: string,
    context?: StudyDestinationCommandContext,
    decision?: StudyDestinationReviewDecision,
  ): Promise<StudyDestinationAggregateDto> {
    if (!this.transactionBound)
      return this.command(iso2Code, 'STUDY_DESTINATION_VERIFY_SOURCE', context, (scope) =>
        scope.verifySources(iso2Code, context, decision),
      );
    const country = await this.requireCountry(iso2Code),
      profile = await this.requireProfile(country.id);
    if (profile.status !== 'IN_REVIEW') throw new Error('STUDY_DESTINATION_REVIEW_REQUIRED');
    const authorId = profile.governance.lastEditorId;
    if (!authorId || authorId === context!.actorId)
      throw new Error('STUDY_DESTINATION_INDEPENDENT_REVIEWER_REQUIRED');
    const fingerprint = studyDestinationFingerprint(profile);
    if (!decision || decision.fingerprint !== fingerprint)
      throw new Error('STUDY_DESTINATION_REVIEW_FINGERPRINT_CONFLICT');
    await this.normalizeAndValidateInput(profile);
    this.assertFreshDate(profile.sourceAuditDate);
    this.validateAuthorities(profile, decision.authorities);
    const reviewedAt = new Date().toISOString();
    const governance: {
      lastEditorId?: string;
      readiness?: Record<string, boolean>;
      proof: NonNullable<StudyDestinationProfileDto['governance']['proof']>;
    } = {
      ...profile.governance,
      proof: {
        fingerprint,
        authorId,
        reviewerId: context!.actorId,
        reviewedRevision: profile.revision,
        reviewedAt,
        reason: context!.reason,
        authorities: decision.authorities,
      },
    };
    const evidenceSources = profile.evidenceSources.map((source) => ({
      ...source,
      verifiedAt: reviewedAt,
    }));
    const ready = this.publishingPolicy.evaluate({
      ...profile,
      governance,
      sourceVerificationStatus: StudyDestinationVerificationStatus.VERIFIED,
    });
    governance.readiness = Object.fromEntries(
      ready.checks.map((check) => [check.key, check.complete]),
    );
    const saved = await this.repository.update(
      profile.id,
      {
        governance,
        evidenceSources,
        sourceVerificationStatus: StudyDestinationVerificationStatus.VERIFIED,
        completenessStatus: ready.completenessStatus,
      },
      profile.updatedAt,
      profile.revision,
    );
    return this.aggregate(country, saved);
  }

  public async publish(
    iso2Code: string,
    context?: StudyDestinationCommandContext,
  ): Promise<StudyDestinationAggregateDto> {
    if (!this.transactionBound)
      return this.command(iso2Code, 'STUDY_DESTINATION_PUBLISH', context, (scope) =>
        scope.publish(iso2Code, context),
      );
    const country = await this.requireCountry(iso2Code);
    const profile = await this.requireProfile(country.id);
    await this.normalizeAndValidateInput(profile);
    this.assertProof(profile);
    if (context!.actorId === profile.governance.lastEditorId)
      throw new Error('STUDY_DESTINATION_INDEPENDENT_PUBLISHER_REQUIRED');
    if (!this.repository.lockReferences)
      throw new Error('STUDY_DESTINATION_REFERENCE_LOCK_REQUIRED');
    await this.repository.lockReferences(profile);
    await assertAssetReferenceUsable(this.assetReferences, profile.imageAssetId, {
      purpose: 'STUDY_DESTINATION_IMAGE',
      allowedMimeTypePrefixes: ['image/'],
      publicPublication: true,
      allowedClassifications: [AssetSecurityClassification.PUBLIC],
    });
    if (profile.status !== StudyDestinationStatus.IN_REVIEW)
      throw new Error('STUDY_DESTINATION_REVIEW_REQUIRED');
    const readiness = this.publishingPolicy.evaluate(profile);
    if (!readiness.readyForPublish) throw new Error('STUDY_DESTINATION_NOT_READY_TO_PUBLISH');
    const saved = await this.repository.update(
      profile.id,
      {
        status: StudyDestinationStatus.PUBLISHED,
        completenessStatus: StudyDestinationCompletenessStatus.COMPLETE,
        publishedAt: new Date().toISOString(),
      },
      profile.updatedAt,
      profile.revision,
    );
    return this.aggregate(country, saved);
  }

  public async archive(
    iso2Code: string,
    context?: StudyDestinationCommandContext,
  ): Promise<StudyDestinationAggregateDto> {
    if (!this.transactionBound)
      return this.command(iso2Code, 'STUDY_DESTINATION_ARCHIVE', context, (scope) =>
        scope.archive(iso2Code, context),
      );
    const country = await this.requireCountry(iso2Code);
    const profile = await this.requireProfile(country.id);
    const saved = await this.repository.update(
      profile.id,
      { status: StudyDestinationStatus.ARCHIVED, publishedAt: null },
      profile.updatedAt,
      profile.revision,
    );
    return this.aggregate(country, saved);
  }

  public async listPublic(
    filters: Omit<StudyDestinationFilters, 'status' | 'completenessStatus'> = {},
  ): Promise<PaginatedStudyDestinationResult<PublicStudyDestinationDto>> {
    const result = await this.repository.listPublished(filters);
    const references = await this.batchReferences(result.data);
    const data: PublicStudyDestinationDto[] = [];
    for (const profile of result.data) {
      const country = references.countries.find(
        (c) => c.id === profile.countryReferenceId && activeReference(c),
      );
      if (!country) throw new Error('STUDY_DESTINATION_REFERENCE_SNAPSHOT_CHANGED');
      data.push(await this.publicDto(country, profile, references));
    }
    return { ...result, data };
  }
  public async getPublicBySlug(slug: string): Promise<PublicStudyDestinationDto> {
    const profile = await this.repository.findBySlug(slug.trim().toLowerCase());
    if (!profile || profile.status !== 'PUBLISHED') throw new Error('STUDY_DESTINATION_NOT_FOUND');
    const references = await this.batchReferences([profile]);
    const country = references.countries.find(
      (c) => c.id === profile.countryReferenceId && activeReference(c),
    );
    if (!country) throw new Error('STUDY_DESTINATION_NOT_FOUND');
    return this.publicDto(country, profile, references);
  }
  private async batchReferences(profiles: StudyDestinationProfileDto[]) {
    if (!this.referenceResolution.resolveDestinationReferences)
      throw new Error('STUDY_DESTINATION_BATCH_REFERENCES_REQUIRED');
    const ids = (
      key:
        | 'countryReferenceId'
        | 'studyLanguageReferenceIds'
        | 'livingCostCurrencyReferenceId'
        | 'cityReferenceIds',
    ) => [
      ...new Set(
        profiles.flatMap((p) => {
          const value = p[key];
          return Array.isArray(value) ? value : value ? [value] : [];
        }),
      ),
    ];
    return this.referenceResolution.resolveDestinationReferences({
      countryIds: ids('countryReferenceId'),
      languageIds: ids('studyLanguageReferenceIds'),
      currencyIds: ids('livingCostCurrencyReferenceId'),
      cityIds: ids('cityReferenceIds'),
    });
  }
  private async aggregate(
    country: ReferenceCountryDto,
    profile: StudyDestinationProfileDto | null,
  ): Promise<StudyDestinationAggregateDto> {
    if (!profile)
      return {
        country,
        profile: null,
        studyLanguages: [],
        livingCostCurrency: null,
        readiness: null,
        fingerprint: null,
      };
    const references = await this.batchReferences([profile]);
    const referenceWarnings = [
      references.languages.filter(activeReference).length !==
      profile.studyLanguageReferenceIds.length
        ? 'STUDY_LANGUAGES_REVIEW_REQUIRED'
        : '',
      !references.currencies.some(
        (c) => c.id === profile.livingCostCurrencyReferenceId && activeReference(c),
      )
        ? 'LIVING_COST_CURRENCY_REVIEW_REQUIRED'
        : '',
      references.cities.filter((c) => activeReference(c) && c.countryReferenceId === country.id)
        .length !== profile.cityReferenceIds.length
        ? 'CITY_REFERENCES_REVIEW_REQUIRED'
        : '',
    ].filter(Boolean);
    return {
      country,
      profile,
      referenceWarnings,
      cities: references.cities.filter(
        (c) => activeReference(c) && c.countryReferenceId === country.id,
      ),
      studyLanguages: references.languages.filter((l) => activeReference(l)),
      livingCostCurrency:
        references.currencies.find(
          (c) => c.id === profile.livingCostCurrencyReferenceId && activeReference(c),
        ) ?? null,
      readiness: this.publishingPolicy.evaluate(profile),
      fingerprint: studyDestinationFingerprint(profile),
    };
  }
  private async publicDto(
    country: ReferenceCountryDto,
    profile: StudyDestinationProfileDto,
    references: Awaited<ReturnType<StudyDestinationUseCases['batchReferences']>>,
  ): Promise<PublicStudyDestinationDto> {
    this.assertProof(profile);
    const warnings: string[] = [];
    const languages = references.languages
      .filter((l) => profile.studyLanguageReferenceIds.includes(l.id) && activeReference(l))
      .map(({ id, name, nameAr, isoCode }) => ({ id, name, nameAr, isoCode }));
    const currency = references.currencies.find(
      (c) => c.id === profile.livingCostCurrencyReferenceId && activeReference(c),
    );
    if (languages.length !== profile.studyLanguageReferenceIds.length)
      warnings.push('STUDY_LANGUAGES_REVIEW_REQUIRED');
    if (!currency) warnings.push('LIVING_COST_CURRENCY_REVIEW_REQUIRED');
    const cities = references.cities
      .filter(
        (c) =>
          profile.cityReferenceIds.includes(c.id) &&
          activeReference(c) &&
          c.countryReferenceId === country.id,
      )
      .map(({ id, name, nameAr }) => ({ id, name, nameAr }));
    if (cities.length !== profile.cityReferenceIds.length)
      warnings.push('CITY_REFERENCES_REVIEW_REQUIRED');
    let image: PublicStudyDestinationDto['image'] = null;
    if (profile.imageAssetId) {
      try {
        await assertAssetReferenceUsable(this.assetReferences, profile.imageAssetId, {
          purpose: 'STUDY_DESTINATION_IMAGE',
          allowedMimeTypePrefixes: ['image/'],
          publicPublication: true,
          allowedClassifications: [AssetSecurityClassification.PUBLIC],
        });
        if (!this.assetDelivery) throw new Error('IMAGE_DELIVERY_UNAVAILABLE');
        const grant = await this.assetDelivery.requestDeliveryGrant({
          assetId: profile.imageAssetId,
          expiresInSeconds: 300,
        });
        if (
          Object.keys(grant.headers).length ||
          new URL(grant.url).protocol !== 'https:' ||
          !Number.isFinite(Date.parse(grant.expiresAt)) ||
          Date.parse(grant.expiresAt) <= Date.now() ||
          Date.parse(grant.expiresAt) > Date.now() + 300000
        )
          throw new Error('IMAGE_DELIVERY_UNAVAILABLE');
        image = { url: grant.url, expiresAt: grant.expiresAt };
      } catch {
        warnings.push('IMAGE_REVIEW_REQUIRED');
      }
    }
    return {
      publicId: profile.publicId,
      slug: profile.slug,
      isFeatured: profile.isFeatured,
      overviewAr: profile.overviewAr,
      overviewEn: profile.overviewEn,
      studySystemSummaryAr: profile.studySystemSummaryAr,
      studySystemSummaryEn: profile.studySystemSummaryEn,
      admissionHighlightsAr: profile.admissionHighlightsAr,
      admissionHighlightsEn: profile.admissionHighlightsEn,
      visaSummaryAr: profile.visaSummaryAr,
      visaSummaryEn: profile.visaSummaryEn,
      visaRequirementsAr: profile.visaRequirementsAr,
      visaRequirementsEn: profile.visaRequirementsEn,
      visaOfficialUrl: profile.visaOfficialUrl,
      livingCostTier: currency ? profile.livingCostTier : null,
      averageMonthlyLivingCostMin: currency ? profile.averageMonthlyLivingCostMin : null,
      averageMonthlyLivingCostMax: currency ? profile.averageMonthlyLivingCostMax : null,
      costHighlightsAr: currency ? profile.costHighlightsAr : [],
      costHighlightsEn: currency ? profile.costHighlightsEn : [],
      studentLifeHighlightsAr: profile.studentLifeHighlightsAr,
      studentLifeHighlightsEn: profile.studentLifeHighlightsEn,
      officialLinks: profile.officialLinks.map(
        ({ labelAr, labelEn, url, category, noteAr, noteEn }) => ({
          labelAr,
          labelEn,
          url,
          category,
          noteAr,
          noteEn,
        }),
      ),
      country: {
        id: country.id,
        iso2Code: country.iso2Code,
        iso3Code: country.iso3Code,
        name: country.name,
        nameAr: country.nameAr,
        officialName: country.officialName,
        region: country.region,
        subregion: country.subregion,
        defaultCurrencyCode: country.defaultCurrencyCode,
        defaultLanguageCode: country.defaultLanguageCode,
        callingCode: country.callingCode,
      },
      studyLanguages: languages,
      livingCostCurrency: currency
        ? {
            id: currency.id,
            name: currency.name,
            nameAr: currency.nameAr,
            isoCode: currency.isoCode,
          }
        : null,
      cities,
      image,
      lastReviewedAt: profile.governance.proof!.reviewedAt,
      referenceWarnings: warnings,
    };
  }
  private assertFreshDate(value: string | null | undefined): void {
    if (!this.publishingPolicy.isAuditDateFresh(value))
      throw new Error('STUDY_DESTINATION_STALE_REVIEW');
  }
  private assertProof(profile: StudyDestinationProfileDto): void {
    StudyDestinationUseCases.assertApprovedProfile(profile, this.publishingPolicy);
  }
  /** Shared owner decision for public readers; callers must also enforce publication and country lifecycle. */
  public static assertApprovedProfile(
    profile: StudyDestinationProfileDto,
    publishingPolicy = new StudyDestinationPublishingPolicy(),
  ): void {
    const proof = profile.governance?.proof;
    if (
      !proof ||
      proof.fingerprint !== studyDestinationFingerprint(profile) ||
      !publishingPolicy.evaluate(profile).readyForPublish
    )
      throw new Error('STUDY_DESTINATION_APPROVED_REVISION_REQUIRED');
    if (
      !publishingPolicy.isAuditDateFresh(proof.reviewedAt) ||
      !publishingPolicy.isAuditDateFresh(profile.sourceAuditDate)
    )
      throw new Error('STUDY_DESTINATION_STALE_REVIEW');
    this.validateAuthorities(profile, proof.authorities);
  }
  private validateAuthorities(
    profile: StudyDestinationProfileDto,
    authorities: StudyDestinationAuthorityDecision[],
  ): void {
    StudyDestinationUseCases.validateAuthorities(profile, authorities);
  }
  private static validateAuthorities(
    profile: StudyDestinationProfileDto,
    authorities: StudyDestinationAuthorityDecision[],
  ): void {
    if (!authorities.length || authorities.length > 100)
      throw new Error('STUDY_DESTINATION_AUTHORITY_DECISIONS_REQUIRED');
    const origins = new Map<string, StudyDestinationAuthorityDecision>();
    for (const authority of authorities) {
      this.assertUrl(authority.origin, 'INVALID_AUTHORITY_ORIGIN');
      this.assertUrl(authority.evidenceUrl, 'INVALID_AUTHORITY_EVIDENCE');
      const url = new URL(authority.origin);
      if (
        url.origin !== authority.origin ||
        origins.has(url.origin) ||
        !authority.authorityName.trim()
      )
        throw new Error('INVALID_AUTHORITY_ORIGIN');
      const government = /(?:\.gov(?:\.[a-z]{2})?|\.gov\.uk|\.gouv\.fr)$/.test(url.hostname);
      if (
        !government &&
        (!authority.exceptionReason || authority.exceptionReason.trim().length < 30)
      )
        throw new Error('STUDY_DESTINATION_AUTHORITY_EXCEPTION_REVIEW_REQUIRED');
      origins.set(url.origin, authority);
    }
    for (const url of [
      ...profile.evidenceSources.map((s) => s.url),
      ...profile.officialLinks.map((l) => l.url),
      profile.visaOfficialUrl,
    ].filter((s): s is string => Boolean(s))) {
      this.assertUrl(url, 'INVALID_OFFICIAL_URL');
      if (!origins.has(new URL(url).origin))
        throw new Error('STUDY_DESTINATION_UNAPPROVED_AUTHORITY');
    }
  }
  private async command(
    iso2Code: string,
    action: string,
    context: StudyDestinationCommandContext | undefined,
    mutation: (scope: StudyDestinationUseCases) => Promise<StudyDestinationAggregateDto>,
  ): Promise<StudyDestinationAggregateDto> {
    if (!context?.actorId || !context.reason?.trim())
      throw new Error('STUDY_DESTINATION_ACTOR_REASON_REQUIRED');
    if (!Number.isSafeInteger(context.expectedRevision) || context.expectedRevision < 0)
      throw new Error('STUDY_DESTINATION_PRECONDITION_REQUIRED');
    if (!this.atomic || !this.repository.withTransaction)
      throw new Error('STUDY_DESTINATION_ATOMIC_PERSISTENCE_REQUIRED');
    const country = await this.requireCountry(iso2Code);
    const snapshots: {
      before: StudyDestinationProfileDto | null;
      after: StudyDestinationProfileDto | null;
    } = { before: null, after: null };
    return this.atomic.execute(
      {
        domain: 'STUDY_DESTINATIONS',
        aggregateType: 'COUNTRY_STUDY_PROFILE',
        aggregateId: country.id,
        action,
        context: { actorId: context.actorId, correlationId: context.correlationId },
        auditMetadata: {
          reason: context.reason,
          expectedRevision: context.expectedRevision,
          countryIso2Code: country.iso2Code,
          snapshots,
        },
        outbox: { payload: { countryReferenceId: country.id, action } },
      },
      async (persistence) => {
        const repository = this.repository.withTransaction!(persistence);
        if (!repository.lockCountry) throw new Error('STUDY_DESTINATION_OWNER_LOCK_REQUIRED');
        await repository.lockCountry(country.id);
        snapshots.before = await repository.findByCountryReferenceId(country.id);
        if ((snapshots.before?.revision ?? 0) !== context.expectedRevision)
          throw new Error('STUDY_DESTINATION_VERSION_CONFLICT');
        const scope = new StudyDestinationUseCases(
          repository,
          this.referenceData,
          this.referenceResolution,
          this.publishingPolicy,
          this.assetReferences,
          this.atomic,
          this.assetDelivery,
          true,
        );
        const value = await mutation(scope);
        snapshots.after = value.profile;
        return value;
      },
    );
  }
  private async requireCountry(iso2Code: string): Promise<ReferenceCountryDto> {
    const country = await this.referenceData.getCountry(iso2Code.trim().toUpperCase());
    if (!country || !activeReference(country))
      throw new Error('STUDY_DESTINATION_COUNTRY_NOT_FOUND');
    return country;
  }

  private async requireProfile(countryReferenceId: string): Promise<StudyDestinationProfileDto> {
    const profile = await this.repository.findByCountryReferenceId(countryReferenceId);
    if (!profile) throw new Error('STUDY_DESTINATION_PROFILE_NOT_FOUND');
    return profile;
  }

  private async normalizeAndValidateInput(
    input: StudyDestinationProfileInput,
  ): Promise<StudyDestinationProfileInput> {
    const normalized: StudyDestinationProfileInput = {
      ...Object.fromEntries(
        CONTENT_KEYS.filter((key) => key in input).map((key) => [key, input[key]]),
      ),
      overviewAr: input.overviewAr?.trim() || null,
      overviewEn: input.overviewEn?.trim() || null,
      studySystemSummaryAr: input.studySystemSummaryAr?.trim() || null,
      studySystemSummaryEn: input.studySystemSummaryEn?.trim() || null,
      admissionHighlightsAr: normalizeTextArray(input.admissionHighlightsAr),
      admissionHighlightsEn: normalizeTextArray(input.admissionHighlightsEn),
      visaSummaryAr: input.visaSummaryAr?.trim() || null,
      visaSummaryEn: input.visaSummaryEn?.trim() || null,
      visaRequirementsAr: normalizeTextArray(input.visaRequirementsAr),
      visaRequirementsEn: normalizeTextArray(input.visaRequirementsEn),
      studentLifeHighlightsAr: normalizeTextArray(input.studentLifeHighlightsAr),
      studentLifeHighlightsEn: normalizeTextArray(input.studentLifeHighlightsEn),
      studyLanguageReferenceIds: input.studyLanguageReferenceIds
        ? [...new Set(input.studyLanguageReferenceIds.filter(Boolean))]
        : undefined,
      officialLinks: input.officialLinks?.map((link) => ({
        ...link,
        labelAr: link.labelAr.trim(),
        labelEn: link.labelEn?.trim(),
        url: link.url.trim(),
      })),
      evidenceSources: input.evidenceSources?.map((source) => ({
        sourceType: source.sourceType,
        label: source.label.trim(),
        url: source.url.trim(),
      })),
    };

    // Omitted fields are partial updates, not requests to erase stored content.
    for (const key of Object.keys(normalized) as Array<keyof StudyDestinationProfileInput>) {
      if (!(key in input) || input[key] === undefined) delete normalized[key];
    }

    // Verification is an explicit workflow transition, never an editor-authored field.
    delete normalized.sourceVerificationStatus;

    if (normalized.visaOfficialUrl) this.assertUrl(normalized.visaOfficialUrl, 'INVALID_VISA_URL');
    normalized.officialLinks?.forEach((link) =>
      this.assertUrl(link.url, 'INVALID_OFFICIAL_LINK_URL'),
    );
    normalized.evidenceSources?.forEach((source) =>
      this.assertUrl(source.url, 'INVALID_EVIDENCE_URL'),
    );

    if (
      normalized.averageMonthlyLivingCostMin !== undefined &&
      normalized.averageMonthlyLivingCostMin !== null &&
      (!Number.isFinite(normalized.averageMonthlyLivingCostMin) ||
        normalized.averageMonthlyLivingCostMin < 0)
    ) {
      throw new Error('INVALID_LIVING_COST_MINIMUM');
    }
    if (
      normalized.averageMonthlyLivingCostMax !== undefined &&
      normalized.averageMonthlyLivingCostMax !== null &&
      (!Number.isFinite(normalized.averageMonthlyLivingCostMax) ||
        normalized.averageMonthlyLivingCostMax < 0)
    ) {
      throw new Error('INVALID_LIVING_COST_MAXIMUM');
    }
    if (
      typeof normalized.averageMonthlyLivingCostMin === 'number' &&
      typeof normalized.averageMonthlyLivingCostMax === 'number' &&
      normalized.averageMonthlyLivingCostMax < normalized.averageMonthlyLivingCostMin
    ) {
      throw new Error('INVALID_LIVING_COST_RANGE');
    }

    if (normalized.livingCostCurrencyReferenceId) {
      const match = await this.referenceResolution.resolveCurrencyCandidate({
        id: normalized.livingCostCurrencyReferenceId,
      });
      if (!activeReference(match?.record))
        throw new Error('INVALID_LIVING_COST_CURRENCY_REFERENCE');
    }
    if (normalized.studyLanguageReferenceIds) {
      for (const id of normalized.studyLanguageReferenceIds) {
        const match = await this.referenceResolution.resolveLanguageCandidate({ id });
        if (!activeReference(match?.record)) throw new Error('INVALID_STUDY_LANGUAGE_REFERENCE');
      }
    }
    if (normalized.cityReferenceIds) {
      normalized.cityReferenceIds = [...new Set(normalized.cityReferenceIds)];
      if (normalized.cityReferenceIds.length > 25) throw new Error('INVALID_STUDY_CITY_LIMIT');
      for (const id of normalized.cityReferenceIds) {
        const match = await this.referenceResolution.resolveCityCandidate({ id });
        if (!activeReference(match?.record)) throw new Error('INVALID_STUDY_CITY_REFERENCE');
      }
    }
    return normalized;
  }

  private hasSourceSensitiveChange(
    existing: StudyDestinationProfileDto,
    input: StudyDestinationProfileInput,
  ): boolean {
    const keys: Array<keyof StudyDestinationProfileInput> = [
      'overviewAr',
      'overviewEn',
      'studySystemSummaryAr',
      'studySystemSummaryEn',
      'admissionHighlightsAr',
      'admissionHighlightsEn',
      'visaSummaryAr',
      'visaSummaryEn',
      'visaRequirementsAr',
      'visaRequirementsEn',
      'visaOfficialUrl',
      'livingCostTier',
      'averageMonthlyLivingCostMin',
      'averageMonthlyLivingCostMax',
      'livingCostCurrencyReferenceId',
      'costHighlightsAr',
      'costHighlightsEn',
      'studentLifeHighlightsAr',
      'studentLifeHighlightsEn',
      'officialLinks',
      'sourceAuditDate',
      'evidenceSources',
      'studyLanguageReferenceIds',
      'cityReferenceIds',
      'imageAssetId',
      'isFeatured',
    ];
    return keys.some((key) => {
      if (!(key in input)) return false;
      if (key === 'studyLanguageReferenceIds')
        return (
          JSON.stringify([...existing.studyLanguageReferenceIds].sort()) !==
          JSON.stringify([...(input.studyLanguageReferenceIds ?? [])].sort())
        );
      return (
        JSON.stringify(existing[key as keyof StudyDestinationProfileDto] ?? null) !==
        JSON.stringify(input[key] ?? null)
      );
    });
  }

  private assertUrl(value: string, code: string): void {
    StudyDestinationUseCases.assertUrl(value, code);
  }
  private static assertUrl(value: string, code: string): void {
    try {
      const url = new URL(value);
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.hash ||
        url.hostname === 'localhost' ||
        url.hostname.endsWith('.invalid') ||
        url.hostname.endsWith('.local') ||
        url.hostname.endsWith('.test') ||
        /^(?:[0-9.]+|\[)/.test(url.hostname)
      )
        throw new Error(code);
    } catch {
      throw new Error(code);
    }
  }
}
