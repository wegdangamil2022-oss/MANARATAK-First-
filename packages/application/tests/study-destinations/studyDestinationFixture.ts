import { vi } from 'vitest';
import { StudyDestinationPublishingPolicy } from '@manaratak/domain';
import {
  StudyDestinationUseCases,
  studyDestinationFingerprint,
} from '../../src/study-destinations/StudyDestinationUseCases';
import { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';

export const country = {
  id: 'country-ye',
  iso2Code: 'YE',
  iso3Code: 'YEM',
  name: 'Yemen',
  nameAr: 'اليمن',
  isActive: true,
  lifecycleState: 'ACTIVE',
};
export const language = {
  id: 'language-en',
  name: 'English',
  nameAr: 'الإنجليزية',
  isoCode: 'en',
  isActive: true,
  lifecycleState: 'ACTIVE',
};
export const currency = {
  id: 'currency-eur',
  name: 'Euro',
  isoCode: 'EUR',
  isActive: true,
  lifecycleState: 'ACTIVE',
};
export const city = {
  id: 'city-1',
  name: 'Sanaa',
  nameAr: 'صنعاء',
  countryReferenceId: country.id,
  isActive: true,
  lifecycleState: 'ACTIVE',
};
export const authorities = [
  {
    origin: 'https://education.gov.ye',
    authorityName: 'Education authority',
    evidenceUrl: 'https://education.gov.ye/about',
  },
];
export function build(extra: Record<string, unknown> = {}) {
  let profile: any = {
    revision: 1,
    governance: { lastEditorId: 'author', proof: null },
    cityReferenceIds: [city.id],
    id: 'profile',
    publicId: 'std-YE',
    slug: 'ye',
    countryReferenceId: country.id,
    status: 'IN_REVIEW',
    completenessStatus: 'READY_FOR_REVIEW',
    overviewAr: 'نظرة',
    overviewEn: 'Overview',
    studySystemSummaryAr: 'نظام',
    studySystemSummaryEn: 'System',
    admissionHighlightsAr: ['قبول'],
    admissionHighlightsEn: ['Admission'],
    visaSummaryAr: 'تأشيرة',
    visaSummaryEn: 'Visa',
    visaRequirementsAr: ['جواز'],
    visaRequirementsEn: ['Passport'],
    visaOfficialUrl: 'https://education.gov.ye/visa',
    livingCostTier: 'LOW',
    averageMonthlyLivingCostMin: 100,
    averageMonthlyLivingCostMax: 200,
    livingCostCurrencyReferenceId: currency.id,
    costHighlightsAr: [],
    costHighlightsEn: [],
    studentLifeHighlightsAr: [],
    studentLifeHighlightsEn: [],
    officialLinks: [
      {
        labelAr: 'الجهة',
        labelEn: 'Authority',
        url: 'https://education.gov.ye',
        category: 'GOVERNMENT_STUDY',
      },
    ],
    sourceVerificationStatus: 'UNVERIFIED',
    sourceAuditDate: new Date().toISOString(),
    evidenceSources: [
      {
        label: 'Authority',
        url: 'https://education.gov.ye/evidence',
        sourceType: 'GOVERNMENT',
        verifiedAt: '2099-01-01T00:00:00.000Z',
      },
    ],
    imageAssetId: null,
    studyLanguageReferenceIds: [language.id],
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...extra,
  };
  const audit: any[] = [],
    events: any[] = [];
  let fail: 'audit' | 'outbox' | undefined;
  const context = { boundaryId: 'test-boundary' };
  const repository: any = {
    withTransaction: vi.fn(() => repository),
    lockCountry: vi.fn(),
    lockReferences: vi.fn(),
    findByCountryReferenceId: vi.fn(async () => structuredClone(profile)),
    findBySlug: vi.fn(async () => structuredClone(profile)),
    listPublished: vi.fn(async () => ({
      data: [structuredClone(profile)],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    })),
    listAdminCountries: vi.fn(async () => ({
      data: [{ country, profile: structuredClone(profile) }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    })),
    update: vi.fn(async (_id: string, data: any, _time: string, revision: number) => {
      if (profile.revision !== revision) throw Error('STUDY_DESTINATION_VERSION_CONFLICT');
      profile = { ...profile, ...data, revision: revision + 1 };
      return structuredClone(profile);
    }),
  };
  const resolution: any = {
    resolveCountryCandidate: async () => ({ record: country }),
    resolveLanguageCandidate: async () => ({ record: language }),
    resolveCurrencyCandidate: async () => ({ record: currency }),
    resolveCityCandidate: async () => ({ record: city }),
    resolveDestinationReferences: vi.fn(async () => ({
      countries: [country],
      languages: [language],
      currencies: [currency],
      cities: [city],
    })),
  };
  const unitOfWork: any = {
    execute: async (work: any) => {
      const before = structuredClone(profile),
        a = audit.length,
        e = events.length;
      try {
        return await work(context);
      } catch (error) {
        profile = before;
        audit.length = a;
        events.length = e;
        throw error;
      }
    },
  };
  const executor = new AtomicAuditedOutboxMutationExecutor(
    unitOfWork,
    {
      saveInTransaction: async (record: any) => {
        if (fail === 'audit') throw Error('AUDIT_FAILURE');
        audit.push(record);
      },
    } as any,
    {
      appendInTransaction: async (event: any) => {
        if (fail === 'outbox') throw Error('OUTBOX_FAILURE');
        events.push(event);
      },
    } as any,
  );
  const asset = { assertUsable: vi.fn(async () => null) };
  const delivery = {
    requestDeliveryGrant: vi.fn(async () => ({
      url: 'https://images.gov.ye/signed',
      expiresAt: new Date(Date.now() + 240000).toISOString(),
      headers: {},
    })),
  };
  const service = new StudyDestinationUseCases(
    repository,
    { getCountry: async () => country } as any,
    resolution,
    new StudyDestinationPublishingPolicy(),
    asset as any,
    new AtomicDomainMutationCoordinator(executor),
    delivery,
  );
  const ctx = (actorId = 'reviewer', expectedRevision = profile.revision) => ({
    actorId,
    expectedRevision,
    reason: 'Reviewed the source documents',
    correlationId: 'corr-12',
  });
  const approve = () =>
    service.verifySources('YE', ctx(), {
      fingerprint: studyDestinationFingerprint(profile),
      authorities,
    });
  return {
    service,
    repository,
    resolution,
    asset,
    delivery,
    ctx,
    approve,
    audit,
    events,
    get: () => profile,
    setFail: (value: typeof fail) => {
      fail = value;
    },
  };
}

