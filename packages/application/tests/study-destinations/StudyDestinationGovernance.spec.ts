import { describe, it, expect, vi } from 'vitest';
import { StudyDestinationPublishingPolicy } from '@absheer/domain';
import {
  StudyDestinationUseCases,
  studyDestinationFingerprint,
} from '../../src/study-destinations/StudyDestinationUseCases';
import { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';

const country = {
  id: 'country-ye',
  iso2Code: 'YE',
  iso3Code: 'YEM',
  name: 'Yemen',
  nameAr: 'اليمن',
  isActive: true,
  lifecycleState: 'ACTIVE',
};
const language = {
  id: 'language-en',
  name: 'English',
  nameAr: 'الإنجليزية',
  isoCode: 'en',
  isActive: true,
  lifecycleState: 'ACTIVE',
};
const currency = {
  id: 'currency-eur',
  name: 'Euro',
  isoCode: 'EUR',
  isActive: true,
  lifecycleState: 'ACTIVE',
};
const city = {
  id: 'city-1',
  name: 'Sanaa',
  nameAr: 'صنعاء',
  countryReferenceId: country.id,
  isActive: true,
  lifecycleState: 'ACTIVE',
};
const authorities = [
  {
    origin: 'https://education.gov.ye',
    authorityName: 'Education authority',
    evidenceUrl: 'https://education.gov.ye/about',
  },
];
function build(extra: Record<string, unknown> = {}) {
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

describe('Study destination governance and public contracts', () => {
  it('requires actor/reason/revision and rejects independent-review violations and stale fingerprints', async () => {
    const x = build();
    await expect(x.service.verifySources('YE')).rejects.toThrow('ACTOR_REASON_REQUIRED');
    await expect(
      x.service.verifySources('YE', x.ctx('author'), {
        fingerprint: studyDestinationFingerprint(x.get()),
        authorities,
      }),
    ).rejects.toThrow('INDEPENDENT_REVIEWER');
    await expect(
      x.service.verifySources('YE', x.ctx(), { fingerprint: '0'.repeat(64), authorities }),
    ).rejects.toThrow('FINGERPRINT_CONFLICT');
    await expect(
      x.service.verifySources('YE', x.ctx('reviewer', 0), {
        fingerprint: studyDestinationFingerprint(x.get()),
        authorities,
      }),
    ).rejects.toThrow('VERSION_CONFLICT');
    expect(x.audit).toHaveLength(0);
  });
  it('server certifies evidence, records actor/snapshots atomically and allows unchanged approved publication', async () => {
    const x = build();
    await x.approve();
    expect(x.get().evidenceSources[0].verifiedAt).not.toContain('2099');
    expect(x.get().governance.proof).toMatchObject({
      authorId: 'author',
      reviewerId: 'reviewer',
      fingerprint: studyDestinationFingerprint(x.get()),
    });
    await x.service.publish('YE', x.ctx());
    expect(x.get().status).toBe('PUBLISHED');
    expect(x.audit).toHaveLength(2);
    expect(x.events).toHaveLength(2);
    expect(JSON.stringify(x.audit)).toContain('corr-12');
    expect(JSON.stringify(x.audit)).toContain('snapshots');
    await expect(x.service.publish('YE', x.ctx('reviewer', 1))).rejects.toThrow('VERSION_CONFLICT');
  });
  it.each(['audit', 'outbox'] as const)(
    'rolls back profile, audit and event when %s persistence fails',
    async (failure) => {
      const x = build(),
        before = structuredClone(x.get());
      x.setFail(failure);
      await expect(x.approve()).rejects.toThrow('FAILURE');
      expect(x.get()).toEqual(before);
      expect(x.audit).toEqual([]);
      expect(x.events).toEqual([]);
    },
  );
  it.each(['2099-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z'])(
    'rejects noncurrent audit date %s',
    async (sourceAuditDate) => {
      const x = build({ sourceAuditDate });
      await expect(x.approve()).rejects.toThrow('STALE_REVIEW');
    },
  );
  it('requires English admission/visa/link coverage and honors configurable freshness', () => {
    const x = build({ admissionHighlightsEn: [], visaRequirementsEn: [] });
    const readiness = new StudyDestinationPublishingPolicy().evaluate(x.get());
    expect(readiness.readyForReview).toBe(false);
    expect(readiness.checks.filter((c) => !c.complete).map((c) => c.key)).toEqual(
      expect.arrayContaining(['admission-highlights-en', 'visa-requirements-en']),
    );
    const narrow = new StudyDestinationPublishingPolicy(
      1,
      () => Date.now() + 2 * 86400000,
    ).evaluate(x.get());
    expect(narrow.checks.find((c) => c.key === 'source-audit-date')?.complete).toBe(false);
  });
  it('requires approval for every origin and rejects invalid domains and undocumented exceptions', async () => {
    for (const url of [
      'https://example.invalid/visa',
      'http://education.gov.ye/visa',
      'https://unapproved.edu/visa',
    ]) {
      const x = build({ visaOfficialUrl: url });
      await expect(x.approve()).rejects.toThrow();
      expect(x.audit).toEqual([]);
    }
    const x = build();
    await expect(
      x.service.verifySources('YE', x.ctx(), {
        fingerprint: studyDestinationFingerprint(x.get()),
        authorities: [
          ...authorities,
          {
            origin: 'https://unapproved.edu',
            authorityName: 'University',
            evidenceUrl: 'https://unapproved.edu/about',
          },
        ],
      }),
    ).rejects.toThrow('EXCEPTION_REVIEW_REQUIRED');
  });
  it('invalidates image/featured changes and strips forged timestamp even on direct application commands', async () => {
    const x = build();
    await x.approve();
    await x.service.publish('YE', x.ctx());
    await x.service.upsertProfile(
      'YE',
      {
        isFeatured: true,
        imageAssetId: 'new-image',
        evidenceSources: [
          {
            label: 'Authority',
            url: 'https://education.gov.ye/evidence',
            sourceType: 'GOVERNMENT',
            verifiedAt: '2099-01-01T00:00:00.000Z',
          },
        ],
      },
      undefined,
      x.ctx('author'),
    );
    expect(x.get()).toMatchObject({ status: 'DRAFT', sourceVerificationStatus: 'UNVERIFIED' });
    expect(x.get().governance.proof).toBeNull();
    expect(x.get().evidenceSources[0].verifiedAt).toBeUndefined();
  });
  it('rechecks asset revocation at publication and public delivery', async () => {
    const x = build({ imageAssetId: 'image' });
    await x.approve();
    x.asset.assertUsable.mockRejectedValue(Error('ASSET_REVOKED'));
    await expect(x.service.publish('YE', x.ctx())).rejects.toThrow('ASSET_REVOKED');
    expect(x.get().status).toBe('IN_REVIEW');
    x.get().status = 'PUBLISHED';
    const dto = await x.service.getPublicBySlug('ye');
    expect(dto.image).toBeNull();
    expect(dto.referenceWarnings).toContain('IMAGE_REVIEW_REQUIRED');
    expect(x.delivery.requestDeliveryGrant).not.toHaveBeenCalled();
  });
  it('publishes an allowlist, safe image grant and curated canonical cities; omits inactive children', async () => {
    const x = build({ imageAssetId: 'image', internalOnlyMarker: 'secret' });
    await x.approve();
    await x.service.publish('YE', x.ctx());
    let dto = await x.service.getPublicBySlug('ye');
    expect(dto.image?.url).toContain('/signed');
    expect(dto.cities[0]).toEqual({ id: city.id, name: 'Sanaa', nameAr: 'صنعاء' });
    for (const key of [
      'id',
      'revision',
      'governance',
      'evidenceSources',
      'sourceAuditDate',
      'updatedAt',
      'imageAssetId',
      'internalOnlyMarker',
    ])
      expect(dto).not.toHaveProperty(key);
    x.resolution.resolveDestinationReferences.mockResolvedValue({
      countries: [country],
      languages: [{ ...language, isActive: false }],
      currencies: [{ ...currency, isActive: false }],
      cities: [{ ...city, countryReferenceId: 'another-country' }],
    });
    dto = await x.service.getPublicBySlug('ye');
    expect(dto.studyLanguages).toEqual([]);
    expect(dto.livingCostCurrency).toBeNull();
    expect(dto.averageMonthlyLivingCostMin).toBeNull();
    expect(dto.cities).toEqual([]);
    expect(dto.referenceWarnings).toHaveLength(3);
  });
  it('uses bounded page/batch owners and fails closed if country changes after the repository snapshot', async () => {
    const x = build();
    await x.approve();
    await x.service.publish('YE', x.ctx());
    x.resolution.resolveDestinationReferences.mockClear();
    await x.service.listPublic({ page: 1, pageSize: 20, q: 'Yemen' });
    expect(x.resolution.resolveDestinationReferences).toHaveBeenCalledTimes(1);
    await x.service.listAdmin({
      page: 2,
      pageSize: 20,
      status: 'NO_PROFILE',
      missingCheck: 'image',
    });
    expect(x.repository.listAdminCountries).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, missingCheck: 'image' }),
    );
    x.resolution.resolveDestinationReferences.mockResolvedValue({
      countries: [{ ...country, isActive: false }],
      languages: [],
      currencies: [],
      cities: [],
    });
    await expect(x.service.listPublic()).rejects.toThrow('REFERENCE_SNAPSHOT_CHANGED');
  });
});
