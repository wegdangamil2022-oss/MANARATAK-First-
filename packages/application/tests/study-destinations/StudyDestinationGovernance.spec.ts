import {describe,it,expect,vi} from 'vitest';
import {StudyDestinationPublishingPolicy} from '@manaratak/domain';
import {StudyDestinationUseCases,studyDestinationFingerprint} from '../../src/study-destinations/StudyDestinationUseCases';
import {build,authorities,country,city,language,currency} from './studyDestinationFixture';
describe('Study destination governance and public contracts', () => {
  it('retains exact hidden English values and literal pipes on an Arabic card save', async()=>{
    const x=build({overviewEn:'  Original | English  ',costHighlightsEn:[{label:'rent | source',value:'100 | monthly'}]});
    const before=structuredClone(x.get());
    await x.service.upsertProfile('YE',{overviewAr:'تم تحديث العربية',overviewEn:before.overviewEn,costHighlightsEn:before.costHighlightsEn},undefined,x.ctx('author'));
    expect(x.get().overviewEn).toBe(before.overviewEn);expect(x.get().costHighlightsEn).toEqual(before.costHighlightsEn);
    expect(x.get().visaRequirementsEn).toEqual(before.visaRequirementsEn);expect(x.get().officialLinks).toEqual(before.officialLinks);
  });
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
