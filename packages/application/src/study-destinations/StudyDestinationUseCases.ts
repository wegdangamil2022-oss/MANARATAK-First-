import type {StudyDestinationPublicEnrichment} from './StudyDestinationPublicEnrichment';
import { AtomicDomainMutationCoordinator, AtomicMutationRequestContext } from '../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { createHash } from 'node:crypto';
import {
  AssetReferencePolicy,
  assertAssetReferenceUsable,
} from '../asset-platform/AssetReferencePolicy';
import {
  destinationRevisionDiff,
  AssetSecurityClassification,
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
  missingCheck?: 'OVERVIEW'|'ACADEMICS'|'VISA'|'LIVING_COST'|'OFFICIAL_LINKS'|'EVIDENCE';
  page?: number;
  pageSize?: number;
}

export type PublicStudyDestinationDto = Pick<StudyDestinationProfileDto,
  'publicId' | 'slug' | 'overviewAr' | 'overviewEn' | 'studySystemSummaryAr' | 'studySystemSummaryEn' |
  'admissionHighlightsAr' | 'admissionHighlightsEn' | 'visaSummaryAr' | 'visaSummaryEn' |
  'visaRequirementsAr' | 'visaRequirementsEn' | 'visaOfficialUrl' | 'livingCostTier' |
  'averageMonthlyLivingCostMin' | 'averageMonthlyLivingCostMax' | 'costHighlightsAr' | 'costHighlightsEn' |
  'studentLifeHighlightsAr' | 'studentLifeHighlightsEn' | 'officialLinks' | 'isFeatured'> & {
  country: Pick<ReferenceCountryDto, 'id'|'iso2Code'|'iso3Code'|'name'|'nameAr'|'officialName'|'region'|'subregion'|'defaultCurrencyCode'|'defaultLanguageCode'|'callingCode'|'isActive'>;
  studyLanguages: Array<Pick<ReferenceLanguageDto, 'id'|'name'|'nameAr'|'isoCode'|'isActive'>>;
  image?: {url:string;expiresAt:string}|null;
  livingCostCurrency: Pick<ReferenceCurrencyDto, 'id'|'name'|'nameAr'|'isoCode'|'isActive'> | null;
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
    private readonly atomicMutations?: AtomicDomainMutationCoordinator,
    private readonly publicEnrichment?: StudyDestinationPublicEnrichment,
  ) {}

  public async executeAdminMutation(iso2: string, action: string, context: AtomicMutationRequestContext & {reason: string; expectedUpdatedAt?: string}, operation: (owner: StudyDestinationUseCases) => Promise<StudyDestinationAggregateDto>) {
    if (!context.actorId || context.reason.trim().length < 3) throw new Error('STUDY_DESTINATION_ACTOR_REASON_REQUIRED');
    if (!this.atomicMutations || !this.repository.withTransaction) throw new Error('STUDY_DESTINATION_ATOMIC_PERSISTENCE_REQUIRED');
    const country = await this.requireCountry(iso2);
    return this.atomicMutations.execute({domain: 'STUDY_DESTINATIONS', aggregateType: 'STUDY_DESTINATION', aggregateId: country.id, action,
      context, auditMetadata: {reason: context.reason, expectedUpdatedAt: context.expectedUpdatedAt},
      outbox: {payload: {countryReferenceId: country.id, operation: action, requiresPublishedProfile: true}}}, async persistence => {
      const repository = this.repository.withTransaction!(persistence);
      if (!repository.lockCountry) throw new Error('STUDY_DESTINATION_OWNER_LOCK_REQUIRED');
      await repository.lockCountry(country.id);
      const current = await repository.findByCountryReferenceId(country.id);
      if (current && !context.expectedUpdatedAt) throw new Error('STUDY_DESTINATION_EXPECTED_REVISION_REQUIRED');
      if (current && current.updatedAt !== context.expectedUpdatedAt) throw new Error('STUDY_DESTINATION_VERSION_CONFLICT');
      const owner = new StudyDestinationUseCases(repository, this.referenceData, this.referenceResolution, this.publishingPolicy, this.assetReferences);
      const result=await operation(owner);
      if(!repository.appendRevision)throw new Error('STUDY_DESTINATION_HISTORY_PERSISTENCE_REQUIRED');
      if(result.profile)await repository.appendRevision(result.profile.id,context.actorId,action,context.reason,destinationRevisionDiff(current,result.profile),result.profile.sourceReviewProof??null);
      return result;
    });
  }

  async history(iso2:string,page=1){const country=await this.requireCountry(iso2);const profile=await this.requireProfile(country.id);if(!this.repository.revisionPage)throw new Error('STUDY_DESTINATION_HISTORY_UNAVAILABLE');return this.repository.revisionPage(profile.id,page);}
  async reviewPolicy(){return this.repository.reviewPolicy?.() ?? null;}
  async configureReviewPolicy(days:number|null,expectedUpdatedAt:string|null,context:AtomicMutationRequestContext & {reason:string}){
    if(days!==null&&(!Number.isSafeInteger(days)||days<1||days>36500))throw new Error('STUDY_DESTINATION_INVALID_REVIEW_POLICY');
    if(!this.atomicMutations||!this.repository.withTransaction||!context.actorId||context.reason.trim().length<3)throw new Error('STUDY_DESTINATION_ATOMIC_PERSISTENCE_REQUIRED');
    return this.atomicMutations.execute({domain:'STUDY_DESTINATIONS',aggregateType:'REVIEW_POLICY',aggregateId:'source-review',action:'STUDY_DESTINATION_REVIEW_POLICY_CHANGED',context,auditMetadata:{reason:context.reason,days}},async persistence=>{const repo=this.repository.withTransaction!(persistence);if(!repo.saveReviewPolicy)throw new Error('STUDY_DESTINATION_REVIEW_POLICY_UNAVAILABLE');return repo.saveReviewPolicy(days,expectedUpdatedAt);});
  }

  public async listAdmin(
    filters: AdminStudyDestinationListFilters = {},
  ): Promise<PaginatedStudyDestinationResult<AdminStudyDestinationListItem>> {
    const countries = await this.referenceData.listCountries({
      activeOnly: true,
      q: filters.q,
      region: filters.region,
    });
    const batch = this.repository.findByCountryReferenceIds ? await this.repository.findByCountryReferenceIds(countries.map(country => country.id)) : null;
    const byCountry = new Map(batch?.map(profile => [profile.countryReferenceId, profile]));
    const items = await Promise.all(
      countries.map(async (country) => {
        const profile = batch ? (byCountry.get(country.id) ?? null) : await this.repository.findByCountryReferenceId(country.id);
        return {
          country,
          profile,
          readiness: profile ? this.publishingPolicy.evaluate(profile) : null,
        };
      }),
    );
    const filtered = items.filter((item) => {
      if (filters.missingCheck && item.readiness && !item.readiness.checks.some(check => check.section === filters.missingCheck && !check.complete)) return false;
      if (filters.status === 'NO_PROFILE' && item.profile) return false;
      if (
        filters.status &&
        filters.status !== 'NO_PROFILE' &&
        item.profile?.status !== filters.status
      )
        return false;
      if (
        filters.completenessStatus &&
        item.profile?.completenessStatus !== filters.completenessStatus
      )
        return false;
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

  public async upsertProfile(
    iso2Code: string,
    input: StudyDestinationProfileInput,
    expectedUpdatedAt?: string,
    actorId?: string,
  ): Promise<StudyDestinationAggregateDto> {
    if (!actorId?.trim()) throw new Error('STUDY_DESTINATION_ACTOR_REQUIRED');
    await assertAssetReferenceUsable(this.assetReferences, input.imageAssetId, {
      purpose: 'STUDY_DESTINATION_IMAGE',
    });
    const country = await this.requireCountry(iso2Code);
    const normalized = await this.normalizeAndValidateInput(input);
    const existing = await this.repository.findByCountryReferenceId(country.id);
    if (expectedUpdatedAt && (!existing || existing.updatedAt !== expectedUpdatedAt))
      throw new Error('STUDY_DESTINATION_VERSION_CONFLICT');
    let saved: StudyDestinationProfileDto;
    if (!existing) {
      saved = await this.repository.create({
        ...normalized,
        lastEditedBy: actorId,
        publicId: `std-${country.iso2Code.toUpperCase()}`,
        slug: country.iso2Code.toLowerCase(),
        countryReferenceId: country.id,
        status: StudyDestinationStatus.DRAFT,
        completenessStatus: StudyDestinationCompletenessStatus.INCOMPLETE,
      });
    } else {
      if (!expectedUpdatedAt) throw new Error('STUDY_DESTINATION_EXPECTED_REVISION_REQUIRED');
      await this.normalizeAndValidateInput({ ...existing, ...normalized });
      const sourceSensitiveChanged = this.hasSourceSensitiveChange(existing, normalized);
      if (!sourceSensitiveChanged && normalized.evidenceSources && existing.sourceReviewProof && existing.sourceVerificationStatus === StudyDestinationVerificationStatus.VERIFIED) normalized.evidenceSources = existing.evidenceSources;
      const provisional = {
        ...existing,
        ...normalized,
        ...(sourceSensitiveChanged
          ? { sourceVerificationStatus: StudyDestinationVerificationStatus.UNVERIFIED }
          : {}),
      } as StudyDestinationProfileDto;
      const readiness = this.publishingPolicy.evaluate(provisional);
      const mustLeavePublishedState =
        existing.status === StudyDestinationStatus.PUBLISHED && sourceSensitiveChanged;
      saved = await this.repository.update(
        existing.id,
        {
          ...normalized,
          ...(sourceSensitiveChanged ? { lastEditedBy: actorId, sourceReviewProof: null } : {}),
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
      );
    }
    return this.aggregate(country, saved);
  }

  public async submitForReview(iso2Code: string): Promise<StudyDestinationAggregateDto> {
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
    );
    return this.aggregate(country, saved);
  }

  public async verifySources(iso2Code: string, review?: {actorId: string; reason: string; approvedOrigins: string[]}): Promise<StudyDestinationAggregateDto> {
    const country = await this.requireCountry(iso2Code);
    const profile = await this.requireProfile(country.id);
    if (!review?.actorId || !review.reason.trim() || !profile.lastEditedBy) throw new Error('STUDY_DESTINATION_REVIEW_PROOF_REQUIRED');
    if (review.actorId === profile.lastEditedBy) throw new Error('STUDY_DESTINATION_INDEPENDENT_REVIEW_REQUIRED');
    if (profile.status !== StudyDestinationStatus.IN_REVIEW) throw new Error('STUDY_DESTINATION_REVIEW_REQUIRED');
    const origins = this.sourceOrigins(profile);
    if (origins.some(origin => !review.approvedOrigins.includes(origin))) throw new Error('STUDY_DESTINATION_OFFICIAL_ORIGIN_REVIEW_REQUIRED');
    if (profile.sourceAuditDate && (!Number.isFinite(Date.parse(profile.sourceAuditDate)) || Date.parse(profile.sourceAuditDate) > Date.now())) throw new Error('STUDY_DESTINATION_INVALID_SOURCE_AUDIT_DATE');
    if (!profile.evidenceSources.length || !profile.sourceAuditDate)
      throw new Error('STUDY_DESTINATION_EVIDENCE_REQUIRED');
    profile.evidenceSources.forEach((source) => this.assertUrl(source.url, 'INVALID_EVIDENCE_URL'));
    const verifiedAt = new Date().toISOString();
    const verified = {
      ...profile,
      sourceVerificationStatus: StudyDestinationVerificationStatus.VERIFIED,
      evidenceSources: profile.evidenceSources.map((source) => ({
        ...source,
        verifiedAt,
      })),
    };
    const readiness = this.publishingPolicy.evaluate(verified);
    const final = await this.repository.update(
      profile.id,
      {
        sourceReviewProof: { actorId: review.actorId, reviewedAt: verifiedAt, fingerprint: this.sourceFingerprint(profile), reason: review.reason.trim(), approvedOrigins: origins },
        sourceVerificationStatus: verified.sourceVerificationStatus,
        evidenceSources: verified.evidenceSources,
        completenessStatus: readiness.completenessStatus,
      },
      profile.updatedAt,
    );
    return this.aggregate(country, final);
  }

  public async publish(iso2Code: string): Promise<StudyDestinationAggregateDto> {
    const country = await this.requireCountry(iso2Code);
    const profile = await this.requireProfile(country.id);
    await this.normalizeAndValidateInput(profile);
    this.assertReviewProof(profile,await this.reviewPolicy());
    await assertAssetReferenceUsable(this.assetReferences, profile.imageAssetId, {purpose: 'STUDY_DESTINATION_IMAGE', publicPublication: true, allowedClassifications: [AssetSecurityClassification.PUBLIC], allowedMimeTypePrefixes: ['image/']});
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
    );
    return this.aggregate(country, saved);
  }

  public async archive(iso2Code: string): Promise<StudyDestinationAggregateDto> {
    const country = await this.requireCountry(iso2Code);
    const profile = await this.requireProfile(country.id);
    const saved = await this.repository.update(
      profile.id,
      { status: StudyDestinationStatus.ARCHIVED, publishedAt: null },
      profile.updatedAt,
    );
    return this.aggregate(country, saved);
  }

  public async listPublic(
    filters: Omit<StudyDestinationFilters, 'status' | 'completenessStatus'> = {},
  ): Promise<PaginatedStudyDestinationResult<PublicStudyDestinationDto>> {
    const policy=await this.reviewPolicy();
    const result = await this.repository.listPublished(filters);
    const batch=this.referenceResolution.resolveActiveStudyReferences?await this.referenceResolution.resolveActiveStudyReferences({countryIds:result.data.map(profile=>profile.countryReferenceId),languageIds:[...new Set(result.data.flatMap(profile=>profile.studyLanguageReferenceIds))],currencyIds:[...new Set(result.data.flatMap(profile=>profile.livingCostCurrencyReferenceId?[profile.livingCostCurrencyReferenceId]:[]))]}):null;
    const countryById=new Map(batch?.countries.map(country=>[country.id,country]));
    const languageById=new Map(batch?.languages.map(language=>[language.id,language]));
    const currencyById=new Map(batch?.currencies.map(currency=>[currency.id,currency]));
    const data = (
      await Promise.all(
        result.data.map(async (profile) => {
          const match=batch?{record:countryById.get(profile.countryReferenceId)}:await this.referenceResolution.resolveCountryCandidate({id:profile.countryReferenceId});
          if (!match?.record?.isActive || !this.hasReviewProof(profile,policy)) return null;
          try { return await this.publicDto(match.record, profile,batch?{studyLanguages:profile.studyLanguageReferenceIds.map(id=>languageById.get(id)).filter((item):item is ReferenceLanguageDto=>!!item),livingCostCurrency:profile.livingCostCurrencyReferenceId?currencyById.get(profile.livingCostCurrencyReferenceId)??null:null}:undefined); } catch (error) {
            if (error instanceof Error && error.message === 'STUDY_DESTINATION_NOT_FOUND') return null;
            throw error;
          }
        }),
      )
    ).filter((item): item is PublicStudyDestinationDto => Boolean(item));
    return { ...result, data };
  }

  public async getPublicBySlug(slug: string): Promise<PublicStudyDestinationDto> {
    const profile = await this.repository.findBySlug(slug.trim().toLowerCase());
    if (!profile || profile.status !== StudyDestinationStatus.PUBLISHED)
      throw new Error('STUDY_DESTINATION_NOT_FOUND');
    const match = await this.referenceResolution.resolveCountryCandidate({
      id: profile.countryReferenceId,
    });
    if (!match?.record?.isActive || !this.hasReviewProof(profile,await this.reviewPolicy())) throw new Error('STUDY_DESTINATION_NOT_FOUND');
    return this.publicDto(match.record, profile);
  }

  public async getPublicCities(slug:string,page=1){
    const destination=await this.getPublicBySlug(slug);
    if(!this.publicEnrichment)throw new Error('STUDY_DESTINATION_CITIES_UNAVAILABLE');
    return this.publicEnrichment.cities(destination.country.iso2Code,page);
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
      };
    const [studyLanguages, livingCostCurrency] = await Promise.all([
      Promise.all(
        profile.studyLanguageReferenceIds.map(
          async (id) =>
            (await this.referenceResolution.resolveLanguageCandidate({ id }))?.record ?? null,
        ),
      ),
      profile.livingCostCurrencyReferenceId
        ? this.referenceResolution
            .resolveCurrencyCandidate({ id: profile.livingCostCurrencyReferenceId })
            .then((match) => match?.record ?? null)
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

  private async publicDto(
    country: ReferenceCountryDto,
    profile: StudyDestinationProfileDto,
    resolved?:{studyLanguages:ReferenceLanguageDto[];livingCostCurrency:ReferenceCurrencyDto|null},
  ): Promise<PublicStudyDestinationDto> {
    const aggregate = resolved ?? await this.aggregate(country, profile);
    if (aggregate.studyLanguages.length!==profile.studyLanguageReferenceIds.length || aggregate.studyLanguages.some(item => !item.isActive) || (profile.livingCostCurrencyReferenceId && !aggregate.livingCostCurrency?.isActive)) throw new Error('STUDY_DESTINATION_NOT_FOUND');
    const allowed = ['publicId','slug','overviewAr','overviewEn','studySystemSummaryAr','studySystemSummaryEn','admissionHighlightsAr','admissionHighlightsEn','visaSummaryAr','visaSummaryEn','visaRequirementsAr','visaRequirementsEn','visaOfficialUrl','livingCostTier','averageMonthlyLivingCostMin','averageMonthlyLivingCostMax','costHighlightsAr','costHighlightsEn','studentLifeHighlightsAr','studentLifeHighlightsEn','officialLinks','isFeatured'] as const;
    const content = Object.fromEntries(allowed.map(key => [key, profile[key]])) as Pick<PublicStudyDestinationDto, typeof allowed[number]>;
    const image=await this.publicEnrichment?.image(profile.imageAssetId) ?? null;
    return { ...content, image, country: { id: country.id, iso2Code: country.iso2Code, iso3Code: country.iso3Code, name: country.name, nameAr: country.nameAr, officialName: country.officialName, region: country.region, subregion: country.subregion, defaultCurrencyCode: country.defaultCurrencyCode, defaultLanguageCode: country.defaultLanguageCode, callingCode: country.callingCode, isActive: true },
      studyLanguages: aggregate.studyLanguages.map(item => ({id: item.id, name: item.name, nameAr: item.nameAr, isoCode: item.isoCode, isActive: true})),
      livingCostCurrency: aggregate.livingCostCurrency ? {id: aggregate.livingCostCurrency.id, name: aggregate.livingCostCurrency.name, nameAr: aggregate.livingCostCurrency.nameAr, isoCode: aggregate.livingCostCurrency.isoCode, isActive: true} : null };
  }

  private sourceOrigins(profile: StudyDestinationProfileDto): string[] {
    return [...new Set([...profile.evidenceSources.map(source => source.url), ...profile.officialLinks.map(link => link.url), ...(profile.visaOfficialUrl ? [profile.visaOfficialUrl] : [])].map(url => new URL(url).origin))].sort();
  }
  private sourceFingerprint(profile: StudyDestinationProfileDto): string {
    const keys = ['publicId','slug','countryReferenceId','overviewAr','overviewEn','studySystemSummaryAr','studySystemSummaryEn','admissionHighlightsAr','admissionHighlightsEn','visaSummaryAr','visaSummaryEn','visaRequirementsAr','visaRequirementsEn','visaOfficialUrl','livingCostTier','averageMonthlyLivingCostMin','averageMonthlyLivingCostMax','livingCostCurrencyReferenceId','costHighlightsAr','costHighlightsEn','studentLifeHighlightsAr','studentLifeHighlightsEn','officialLinks','sourceAuditDate','imageAssetId','studyLanguageReferenceIds','isFeatured'] as const;
    const facts = Object.fromEntries(keys.map(key => [key, profile[key]]));
    const evidenceSources = profile.evidenceSources.map(({verifiedAt, ...fact}) => fact);
    return createHash('sha256').update(JSON.stringify({...facts, evidenceSources})).digest('hex');
  }
  private hasReviewProof(profile: StudyDestinationProfileDto,policy?:{maxEvidenceAgeDays:number|null}|null): boolean {
    const proof = profile.sourceReviewProof;
    if(proof&&policy?.maxEvidenceAgeDays!=null&&Date.now()-Date.parse(proof.reviewedAt)>policy.maxEvidenceAgeDays*86400000)return false;
    return Boolean(proof && profile.sourceVerificationStatus === StudyDestinationVerificationStatus.VERIFIED && profile.lastEditedBy && proof.actorId !== profile.lastEditedBy && proof.fingerprint === this.sourceFingerprint(profile) && Number.isFinite(Date.parse(proof.reviewedAt)) && Date.parse(proof.reviewedAt) <= Date.now());
  }
  private assertReviewProof(profile: StudyDestinationProfileDto,policy?:{maxEvidenceAgeDays:number|null}|null): void {
    if (!this.hasReviewProof(profile,policy)) throw new Error('STUDY_DESTINATION_CURRENT_INDEPENDENT_REVIEW_REQUIRED');
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

  private async normalizeAndValidateInput(
    input: StudyDestinationProfileInput,
  ): Promise<StudyDestinationProfileInput> {
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
        label: source.label.trim(), url: source.url.trim(), sourceType: source.sourceType,
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

  private hasSourceSensitiveChange(
    existing: StudyDestinationProfileDto,
    input: StudyDestinationProfileInput,
  ): boolean {
    const keys: Array<keyof StudyDestinationProfileInput> = [
      'imageAssetId', 'isFeatured',
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
    ];
    return keys.some((key) => {
      if (!(key in input)) return false;
      if (key === 'evidenceSources') {
        const editable = (sources: typeof existing.evidenceSources) => sources.map(source => ({label: source.label, url: source.url, sourceType: source.sourceType}));
        return JSON.stringify(editable(existing.evidenceSources)) !== JSON.stringify(editable(input.evidenceSources ?? []));
      }
      if (key === 'studyLanguageReferenceIds') return JSON.stringify([...existing.studyLanguageReferenceIds].sort()) !== JSON.stringify([...(input.studyLanguageReferenceIds ?? [])].sort());
      return (
        JSON.stringify(existing[key as keyof StudyDestinationProfileDto] ?? null) !==
        JSON.stringify(input[key] ?? null)
      );
    });
  }

  private assertUrl(value: string, code: string): void {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error(code);
    } catch {
      throw new Error(code);
    }
  }
}
