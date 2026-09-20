import { AssetReferencePolicy, assertAssetReferenceUsable } from '../asset-platform/AssetReferencePolicy';
import {
  IReferenceDataRepository,
  IReferenceResolutionRepository,
  IStudyDestinationRepository,
  PaginatedStudyDestinationResult,
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
  StudyDestinationVerificationStatus,
} from '@manaratak/domain';

export interface StudyDestinationAggregateDto {
  country: ReferenceCountryDto;
  profile: StudyDestinationProfileDto | null;
  studyLanguages: ReferenceLanguageDto[];
  livingCostCurrency: ReferenceCurrencyDto | null;
  readiness: StudyDestinationReadinessReport | null;
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
}

export interface PublicStudyDestinationDto extends StudyDestinationProfileDto {
  country: ReferenceCountryDto;
  studyLanguages: ReferenceLanguageDto[];
  livingCostCurrency: ReferenceCurrencyDto | null;
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
  ) {}

  public async listAdmin(filters: AdminStudyDestinationListFilters = {}): Promise<PaginatedStudyDestinationResult<AdminStudyDestinationListItem>> {
    const countries = await this.referenceData.listCountries({ activeOnly: true, q: filters.q, region: filters.region });
    const items = await Promise.all(countries.map(async (country) => {
      const profile = await this.repository.findByCountryReferenceId(country.id);
      return { country, profile, readiness: profile ? this.publishingPolicy.evaluate(profile) : null };
    }));
    const filtered = items.filter((item) => {
      if (filters.status === 'NO_PROFILE' && item.profile) return false;
      if (filters.status && filters.status !== 'NO_PROFILE' && item.profile?.status !== filters.status) return false;
      if (filters.completenessStatus && item.profile?.completenessStatus !== filters.completenessStatus) return false;
      return true;
    });
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
    const start = (page - 1) * pageSize;
    return {
      data: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    };
  }

  public async getAdminByCountryIso2(iso2Code: string): Promise<StudyDestinationAggregateDto> {
    const country = await this.requireCountry(iso2Code);
    const profile = await this.repository.findByCountryReferenceId(country.id);
    return this.aggregate(country, profile);
  }

  public async upsertProfile(iso2Code: string, input: StudyDestinationProfileInput): Promise<StudyDestinationAggregateDto> {
    await assertAssetReferenceUsable(this.assetReferences, input.imageAssetId, { purpose: 'STUDY_DESTINATION_IMAGE' });
    const country = await this.requireCountry(iso2Code);
    const normalized = await this.normalizeAndValidateInput(input);
    const existing = await this.repository.findByCountryReferenceId(country.id);
    let saved: StudyDestinationProfileDto;
    if (!existing) {
      saved = await this.repository.create({
        ...normalized,
        publicId: `std-${country.iso2Code.toUpperCase()}`,
        slug: country.iso2Code.toLowerCase(),
        countryReferenceId: country.id,
        status: StudyDestinationStatus.DRAFT,
        completenessStatus: StudyDestinationCompletenessStatus.INCOMPLETE,
      });
    } else {
      const sourceSensitiveChanged = this.hasSourceSensitiveChange(existing, normalized);
      const provisional = {
        ...existing,
        ...normalized,
        ...(sourceSensitiveChanged ? { sourceVerificationStatus: StudyDestinationVerificationStatus.UNVERIFIED } : {}),
      } as StudyDestinationProfileDto;
      const readiness = this.publishingPolicy.evaluate(provisional);
      const mustLeavePublishedState = existing.status === StudyDestinationStatus.PUBLISHED && sourceSensitiveChanged;
      saved = await this.repository.update(existing.id, {
        ...normalized,
        ...(sourceSensitiveChanged ? { sourceVerificationStatus: StudyDestinationVerificationStatus.UNVERIFIED } : {}),
        ...(mustLeavePublishedState ? { status: StudyDestinationStatus.DRAFT, publishedAt: null } : {}),
        completenessStatus: mustLeavePublishedState ? readiness.completenessStatus
          : existing.status === StudyDestinationStatus.PUBLISHED
            ? StudyDestinationCompletenessStatus.COMPLETE
            : readiness.completenessStatus,
      });
    }
    return this.aggregate(country, saved);
  }

  public async submitForReview(iso2Code: string): Promise<StudyDestinationAggregateDto> {
    const country = await this.requireCountry(iso2Code);
    const profile = await this.requireProfile(country.id);
    const readiness = this.publishingPolicy.evaluate(profile);
    if (!readiness.readyForReview) throw new Error('STUDY_DESTINATION_NOT_READY_FOR_REVIEW');
    const saved = await this.repository.update(profile.id, {
      status: StudyDestinationStatus.IN_REVIEW,
      completenessStatus: readiness.readyForPublish
        ? StudyDestinationCompletenessStatus.READY_TO_PUBLISH
        : StudyDestinationCompletenessStatus.READY_FOR_REVIEW,
    });
    return this.aggregate(country, saved);
  }

  public async verifySources(iso2Code: string): Promise<StudyDestinationAggregateDto> {
    const country = await this.requireCountry(iso2Code);
    const profile = await this.requireProfile(country.id);
    if (!profile.evidenceSources.length || !profile.sourceAuditDate) throw new Error('STUDY_DESTINATION_EVIDENCE_REQUIRED');
    profile.evidenceSources.forEach((source) => this.assertUrl(source.url, 'INVALID_EVIDENCE_URL'));
    const verifiedAt = new Date().toISOString();
    const saved = await this.repository.update(profile.id, {
      sourceVerificationStatus: StudyDestinationVerificationStatus.VERIFIED,
      evidenceSources: profile.evidenceSources.map((source) => ({ ...source, verifiedAt: source.verifiedAt ?? verifiedAt })),
    });
    const readiness = this.publishingPolicy.evaluate(saved);
    const final = await this.repository.update(saved.id, {
      completenessStatus: readiness.completenessStatus,
    });
    return this.aggregate(country, final);
  }

  public async publish(iso2Code: string): Promise<StudyDestinationAggregateDto> {
    const country = await this.requireCountry(iso2Code);
    const profile = await this.requireProfile(country.id);
    if (profile.status !== StudyDestinationStatus.IN_REVIEW) throw new Error('STUDY_DESTINATION_REVIEW_REQUIRED');
    const readiness = this.publishingPolicy.evaluate(profile);
    if (!readiness.readyForPublish) throw new Error('STUDY_DESTINATION_NOT_READY_TO_PUBLISH');
    const saved = await this.repository.update(profile.id, {
      status: StudyDestinationStatus.PUBLISHED,
      completenessStatus: StudyDestinationCompletenessStatus.COMPLETE,
      publishedAt: new Date().toISOString(),
    });
    return this.aggregate(country, saved);
  }

  public async archive(iso2Code: string): Promise<StudyDestinationAggregateDto> {
    const country = await this.requireCountry(iso2Code);
    const profile = await this.requireProfile(country.id);
    const saved = await this.repository.update(profile.id, { status: StudyDestinationStatus.ARCHIVED, publishedAt: null });
    return this.aggregate(country, saved);
  }

  public async listPublic(filters: Omit<StudyDestinationFilters, 'status' | 'completenessStatus'> = {}): Promise<PaginatedStudyDestinationResult<PublicStudyDestinationDto>> {
    const result = await this.repository.listPublished(filters);
    const data = (await Promise.all(result.data.map(async (profile) => {
      const match = await this.referenceResolution.resolveCountryCandidate({ id: profile.countryReferenceId });
      if (!match?.record?.isActive) return null;
      return this.publicDto(match.record, profile);
    }))).filter((item): item is PublicStudyDestinationDto => Boolean(item));
    return { ...result, data };
  }

  public async getPublicBySlug(slug: string): Promise<PublicStudyDestinationDto> {
    const profile = await this.repository.findBySlug(slug.trim().toLowerCase());
    if (!profile || profile.status !== StudyDestinationStatus.PUBLISHED) throw new Error('STUDY_DESTINATION_NOT_FOUND');
    const match = await this.referenceResolution.resolveCountryCandidate({ id: profile.countryReferenceId });
    if (!match?.record?.isActive) throw new Error('STUDY_DESTINATION_NOT_FOUND');
    return this.publicDto(match.record, profile);
  }

  private async aggregate(country: ReferenceCountryDto, profile: StudyDestinationProfileDto | null): Promise<StudyDestinationAggregateDto> {
    if (!profile) return { country, profile: null, studyLanguages: [], livingCostCurrency: null, readiness: null };
    const [studyLanguages, livingCostCurrency] = await Promise.all([
      Promise.all(profile.studyLanguageReferenceIds.map(async (id) => (await this.referenceResolution.resolveLanguageCandidate({ id }))?.record ?? null)),
      profile.livingCostCurrencyReferenceId
        ? this.referenceResolution.resolveCurrencyCandidate({ id: profile.livingCostCurrencyReferenceId }).then((match) => match?.record ?? null)
        : Promise.resolve(null),
    ]);
    return {
      country,
      profile,
      studyLanguages: studyLanguages.filter((item): item is ReferenceLanguageDto => Boolean(item)),
      livingCostCurrency,
      readiness: this.publishingPolicy.evaluate(profile),
    };
  }

  private async publicDto(country: ReferenceCountryDto, profile: StudyDestinationProfileDto): Promise<PublicStudyDestinationDto> {
    const aggregate = await this.aggregate(country, profile);
    return { ...profile, country, studyLanguages: aggregate.studyLanguages, livingCostCurrency: aggregate.livingCostCurrency };
  }

  private async requireCountry(iso2Code: string): Promise<ReferenceCountryDto> {
    const country = await this.referenceData.getCountry(iso2Code.trim().toUpperCase());
    if (!country || !country.isActive) throw new Error('STUDY_DESTINATION_COUNTRY_NOT_FOUND');
    return country;
  }

  private async requireProfile(countryReferenceId: string): Promise<StudyDestinationProfileDto> {
    const profile = await this.repository.findByCountryReferenceId(countryReferenceId);
    if (!profile) throw new Error('STUDY_DESTINATION_PROFILE_NOT_FOUND');
    return profile;
  }

  private async normalizeAndValidateInput(input: StudyDestinationProfileInput): Promise<StudyDestinationProfileInput> {
    const normalized: StudyDestinationProfileInput = {
      ...input,
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
      studyLanguageReferenceIds: input.studyLanguageReferenceIds ? [...new Set(input.studyLanguageReferenceIds.filter(Boolean))] : undefined,
      officialLinks: input.officialLinks?.map((link) => ({ ...link, labelAr: link.labelAr.trim(), labelEn: link.labelEn?.trim(), url: link.url.trim() })),
      evidenceSources: input.evidenceSources?.map((source) => ({ ...source, label: source.label.trim(), url: source.url.trim() })),
    };

    // Verification is an explicit workflow transition, never an editor-authored field.
    delete normalized.sourceVerificationStatus;

    if (normalized.visaOfficialUrl) this.assertUrl(normalized.visaOfficialUrl, 'INVALID_VISA_URL');
    normalized.officialLinks?.forEach((link) => this.assertUrl(link.url, 'INVALID_OFFICIAL_LINK_URL'));
    normalized.evidenceSources?.forEach((source) => this.assertUrl(source.url, 'INVALID_EVIDENCE_URL'));

    if (normalized.averageMonthlyLivingCostMin !== undefined && normalized.averageMonthlyLivingCostMin !== null && normalized.averageMonthlyLivingCostMin < 0) {
      throw new Error('INVALID_LIVING_COST_MINIMUM');
    }
    if (normalized.averageMonthlyLivingCostMax !== undefined && normalized.averageMonthlyLivingCostMax !== null && normalized.averageMonthlyLivingCostMax < 0) {
      throw new Error('INVALID_LIVING_COST_MAXIMUM');
    }
    if (typeof normalized.averageMonthlyLivingCostMin === 'number' && typeof normalized.averageMonthlyLivingCostMax === 'number' && normalized.averageMonthlyLivingCostMax < normalized.averageMonthlyLivingCostMin) {
      throw new Error('INVALID_LIVING_COST_RANGE');
    }

    if (normalized.livingCostCurrencyReferenceId) {
      const match = await this.referenceResolution.resolveCurrencyCandidate({ id: normalized.livingCostCurrencyReferenceId });
      if (!match?.record?.isActive) throw new Error('INVALID_LIVING_COST_CURRENCY_REFERENCE');
    }
    if (normalized.studyLanguageReferenceIds) {
      for (const id of normalized.studyLanguageReferenceIds) {
        const match = await this.referenceResolution.resolveLanguageCandidate({ id });
        if (!match?.record?.isActive) throw new Error('INVALID_STUDY_LANGUAGE_REFERENCE');
      }
    }
    return normalized;
  }

  private hasSourceSensitiveChange(existing: StudyDestinationProfileDto, input: StudyDestinationProfileInput): boolean {
    const keys: Array<keyof StudyDestinationProfileInput> = [
      'overviewAr', 'overviewEn', 'studySystemSummaryAr', 'studySystemSummaryEn',
      'admissionHighlightsAr', 'admissionHighlightsEn', 'visaSummaryAr', 'visaSummaryEn',
      'visaRequirementsAr', 'visaRequirementsEn', 'visaOfficialUrl', 'livingCostTier',
      'averageMonthlyLivingCostMin', 'averageMonthlyLivingCostMax', 'livingCostCurrencyReferenceId',
      'costHighlightsAr', 'costHighlightsEn', 'studentLifeHighlightsAr', 'studentLifeHighlightsEn',
      'officialLinks', 'sourceAuditDate', 'evidenceSources', 'studyLanguageReferenceIds',
    ];
    return keys.some((key) => {
      if (!(key in input)) return false;
      return JSON.stringify(existing[key as keyof StudyDestinationProfileDto] ?? null) !== JSON.stringify(input[key] ?? null);
    });
  }

  private assertUrl(value: string, code: string): void {
    try {
      const url = new URL(value);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error(code);
    } catch {
      throw new Error(code);
    }
  }
}
