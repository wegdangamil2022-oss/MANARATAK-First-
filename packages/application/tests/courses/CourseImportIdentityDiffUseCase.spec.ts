import { describe, expect, it } from 'vitest';
import {
  CourseImportAnalysisDto,
  CourseImportChangeState,
  CourseImportMatchState,
  CourseSourceIdentityDto,
  CourseSourceIdentityStatus,
  CourseSourceIdentityStrategy,
  ExternalCourseProviderDto,
  ExternalCourseProviderImportStrategy,
  ExternalCourseProviderStatus,
  ICourseImportAnalysisRepository,
  IExternalCourseProviderRepository,
  ImportRecordStatus,
  UpsertCourseImportAnalysisInput,
} from '@manaratak/domain';
import { CourseImportIdentityDiffUseCase } from '../../src/courses/use-cases/CourseImportIdentityDiffUseCase';

const now = new Date('2026-08-22T00:00:00.000Z');

function provider(id: string, publicId: string, name: string, domains: string[]): ExternalCourseProviderDto {
  return {
    id,
    publicId,
    slug: publicId,
    canonicalName: name,
    normalizedCanonicalName: name.toLowerCase(),
    displayName: name,
    status: ExternalCourseProviderStatus.APPROVED,
    sourceTrustLevel: 'TEST',
    importStrategy: ExternalCourseProviderImportStrategy.FILE,
    allowedDomains: domains,
    aliases: [],
    createdAt: now,
    updatedAt: now,
  };
}

const wipo = provider('p-wipo', 'ecp-wipo-academy', 'WIPO Academy', ['wipo.int', 'welc.wipo.int']);
const hp = provider('p-hp', 'ecp-hp-life', 'HP LIFE', ['life-global.org']);

class ProviderRepo implements IExternalCourseProviderRepository {
  private readonly providers = [wipo, hp];
  async list() { return this.providers; }
  async findById(id: string) { return this.providers.find((item) => item.id === id) ?? null; }
  async findByPublicId(publicId: string) { return this.providers.find((item) => item.publicId === publicId) ?? null; }
  async resolveByName(name: string) { return this.providers.find((item) => item.canonicalName === name) ?? null; }
  async isDomainApproved(providerId: string, urlOrDomain: string) {
    const current = await this.findById(providerId);
    if (!current) return false;
    const host = new URL(urlOrDomain.includes('://') ? urlOrDomain : `https://${urlOrDomain}`).hostname;
    return current.allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  }
  async upsertSeedProvider(): Promise<ExternalCourseProviderDto> { throw new Error('not used'); }
}

class AnalysisRepo implements ICourseImportAnalysisRepository {
  identities: CourseSourceIdentityDto[] = [];
  analyses: CourseImportAnalysisDto[] = [];
  urls = new Map<string, Set<string>>();

  async findAnalysisByImportRecordId(id: string) {
    return this.analyses.find((item) => item.importRecordId === id) ?? null;
  }
  async findSourceIdentityByKey(providerId: string, sourceNativeKey: string, languageVersionKey: string) {
    return this.identities.find((item) => item.providerId === providerId && item.sourceNativeKey === sourceNativeKey && item.languageVersionKey === languageVersionKey) ?? null;
  }
  async findSourceIdentitiesByNormalizedTitle(providerId: string, title: string, language: string) {
    return this.identities.filter((item) => item.providerId === providerId && item.normalizedOriginalTitle === title && item.languageVersionKey === language);
  }
  async findSourceIdentitiesByNormalizedUrl(providerId: string, url: string, language: string) {
    return this.identities.filter((item) => item.providerId === providerId && item.languageVersionKey === language && this.urls.get(item.id)?.has(url));
  }
  async ensureSourceIdentity(input: any) {
    const existing = await this.findSourceIdentityByKey(input.providerId, input.sourceNativeKey, input.languageVersionKey);
    if (existing) return { identity: existing, created: false };
    const identity: CourseSourceIdentityDto = {
      id: `sid-${this.identities.length + 1}`,
      providerId: input.providerId,
      sourceNativeKey: input.sourceNativeKey,
      identityStrategy: input.identityStrategy,
      originalTitle: input.originalTitle,
      normalizedOriginalTitle: input.normalizedOriginalTitle,
      languageVersionKey: input.languageVersionKey,
      currentUrl: input.currentUrl,
      firstSeenAt: now,
      lastSeenAt: now,
      status: input.status ?? CourseSourceIdentityStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    };
    this.identities.push(identity);
    return { identity, created: true };
  }
  async touchSourceIdentity() {}
  async recordInitialUrl(input: any) {
    const current = this.urls.get(input.courseSourceIdentityId) ?? new Set<string>();
    current.add(input.normalizedUrl);
    this.urls.set(input.courseSourceIdentityId, current);
  }
  async findLatestAnalysisForSourceKey(providerId: string, key: string, language: string, exclude?: string) {
    return [...this.analyses].reverse().find((item) => {
      if (item.importRecordId === exclude || item.resolvedProviderId !== providerId || item.sourceNativeKey !== key) return false;
      const identity = item.normalizedPayload.identity as Record<string, unknown> | undefined;
      return identity?.languageVersionKey === language;
    }) ?? null;
  }
  async upsertAnalysis(input: UpsertCourseImportAnalysisInput) {
    const existing = await this.findAnalysisByImportRecordId(input.importRecordId);
    if (existing) {
      Object.assign(existing, input, { analyzedAt: input.analyzedAt ?? now, updatedAt: now });
      return existing;
    }
    const analysis: CourseImportAnalysisDto = {
      id: `analysis-${this.analyses.length + 1}`,
      ...input,
      analyzedAt: input.analyzedAt ?? now,
      createdAt: now,
      updatedAt: now,
    };
    this.analyses.push(analysis);
    return analysis;
  }
}

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sourceOrder: 1,
    providerLabel: 'WIPO Academy',
    courseName: 'General Course on Intellectual Property',
    directCourseUrl: 'https://welc.wipo.int/acc/index.jsf?cc=DL101E&lang=en&page=courseCatalog.xhtml',
    studyFreeRaw: 'Yes',
    freeCertificateRaw: 'Yes',
    certificateTypeRaw: 'Certificate',
    languageRaw: 'English',
    studyLevelRaw: 'Beginner',
    courseDurationRaw: '12 hours',
    shortCourseTopicsRaw: 'IP; patents; copyright; trademarks',
    _payloadFingerprint: 'raw-a',
    ...overrides,
  };
}

function batchReader(batches: Record<string, Array<Record<string, unknown>>>) {
  return {
    async listRecords(filters: Record<string, unknown> = {}) {
      const records = batches[String(filters.batchId)] ?? [];
      const page = Number(filters.page ?? 1);
      const pageSize = Number(filters.pageSize ?? 100);
      return {
        data: records.slice((page - 1) * pageSize, page * pageSize),
        total: records.length,
        page,
        pageSize,
      };
    },
  };
}

function record(id: string, payload: Record<string, unknown>) {
  return { id, status: ImportRecordStatus.COMPLETE, rawPayload: payload };
}

describe('WP-IC-04 stable identity / dedup / diff engine', () => {
  it('does not create a second identity proposal for an identical course across batches', async () => {
    const repo = new AnalysisRepo();
    const useCase = new CourseImportIdentityDiffUseCase(
      batchReader({ b1: [record('r1', row())], b2: [record('r2', row({ _payloadFingerprint: 'raw-b' }))] }),
      new ProviderRepo(), repo,
    );
    expect((await useCase.analyzeBatch('b1')).analyses[0].changeState).toBe(CourseImportChangeState.NEW);
    const second = (await useCase.analyzeBatch('b2')).analyses[0];
    expect(second.changeState).toBe(CourseImportChangeState.UNCHANGED);
    expect(second.matchState).toBe(CourseImportMatchState.CROSS_BATCH_UNCHANGED);
    expect(repo.identities).toHaveLength(1);
  });

  it('marks an exact duplicate inside one batch as SAME_BATCH_DUPLICATE without a second identity', async () => {
    const repo = new AnalysisRepo();
    const useCase = new CourseImportIdentityDiffUseCase(batchReader({ b1: [
      record('r1', row()),
      record('r2', row({ _payloadFingerprint: 'raw-b' })),
    ] }), new ProviderRepo(), repo);
    const result = await useCase.analyzeBatch('b1');
    expect(result.analyses[0].changeState).toBe(CourseImportChangeState.NEW);
    expect(result.analyses[1].matchState).toBe(CourseImportMatchState.SAME_BATCH_DUPLICATE);
    expect(result.analyses[1].changeState).toBe(CourseImportChangeState.UNCHANGED);
    expect(repo.identities).toHaveLength(1);
  });

  it('classifies a changed URL under the same stable provider-native ID as URL_CHANGED', async () => {
    const repo = new AnalysisRepo();
    const useCase = new CourseImportIdentityDiffUseCase(batchReader({
      b1: [record('r1', row())],
      b2: [record('r2', row({ directCourseUrl: 'https://www.wipo.int/academy/en/courses/distance_learning.html?cc=DL101E', _payloadFingerprint: 'raw-b' }))],
    }), new ProviderRepo(), repo);
    await useCase.analyzeBatch('b1');
    repo.identities[0].courseId = 'course-1';
    const result = (await useCase.analyzeBatch('b2')).analyses[0];
    expect(result.changeState).toBe(CourseImportChangeState.URL_CHANGED);
    expect(result.matchedCourseId).toBe('course-1');
    expect(repo.identities).toHaveLength(1);
    expect((result.relationshipProposals?.urlHistory as any)?.action).toBe('PROPOSE_URL_CHANGE');
  });

  it('classifies metadata-only changes as METADATA_CHANGED', async () => {
    const repo = new AnalysisRepo();
    const useCase = new CourseImportIdentityDiffUseCase(batchReader({
      b1: [record('r1', row())],
      b2: [record('r2', row({ courseDurationRaw: '14 hours', _payloadFingerprint: 'raw-b' }))],
    }), new ProviderRepo(), repo);
    await useCase.analyzeBatch('b1');
    const result = (await useCase.analyzeBatch('b2')).analyses[0];
    expect(result.changeState).toBe(CourseImportChangeState.METADATA_CHANGED);
    expect((result.fieldDiffs?.fields as any)?.courseDurationRaw.after).toBe('14 hours');
  });

  it('keeps identical titles from different providers as distinct identities', async () => {
    const repo = new AnalysisRepo();
    const useCase = new CourseImportIdentityDiffUseCase(batchReader({ b1: [
      record('r1', row()),
      record('r2', row({ providerLabel: 'HP LIFE', courseName: 'General Course on Intellectual Property', directCourseUrl: 'https://www.life-global.org/course/414-business-email' })),
    ] }), new ProviderRepo(), repo);
    const result = await useCase.analyzeBatch('b1');
    expect(result.analyses.map((item) => item.changeState)).toEqual([CourseImportChangeState.NEW, CourseImportChangeState.NEW]);
    expect(repo.identities).toHaveLength(2);
    expect(repo.identities[0].providerId).not.toBe(repo.identities[1].providerId);
  });

  it('queues provisional same-provider/title/language collisions for review instead of fuzzy merging', async () => {
    const repo = new AnalysisRepo();
    const hpBase = {
      providerLabel: 'HP LIFE',
      courseName: 'Business Basics',
      languageRaw: 'English',
      directCourseUrl: 'https://www.life-global.org/course/business-basics',
    };
    const useCase = new CourseImportIdentityDiffUseCase(batchReader({ b1: [
      record('r1', row(hpBase)),
      record('r2', row({ ...hpBase, directCourseUrl: 'https://www.life-global.org/course/business-basics-v2' })),
    ] }), new ProviderRepo(), repo);
    const result = await useCase.analyzeBatch('b1');
    expect(result.analyses.every((item) => item.changeState === CourseImportChangeState.AMBIGUOUS_MATCH)).toBe(true);
    expect(result.analyses.every((item) => item.requiresReview)).toBe(true);
    expect(repo.identities).toHaveLength(0);
  });

  it('canonicalizes equivalent language labels without creating a second stable identity', async () => {
    const repo = new AnalysisRepo();
    const useCase = new CourseImportIdentityDiffUseCase(batchReader({
      b1: [record('r1', row({ languageRaw: 'English' }))],
      b2: [record('r2', row({ languageRaw: 'en', _payloadFingerprint: 'raw-b' }))],
    }), new ProviderRepo(), repo);
    await useCase.analyzeBatch('b1');
    repo.identities[0].courseId = 'course-1';
    const result = (await useCase.analyzeBatch('b2')).analyses[0];
    expect(result.changeState).toBe(CourseImportChangeState.UNCHANGED);
    expect(result.matchedCourseId).toBe('course-1');
    expect(repo.identities).toHaveLength(1);
    expect(repo.identities[0].languageVersionKey).toBe('en');
  });

  it('canonicalizes regional language spelling and separators consistently', async () => {
    const repo = new AnalysisRepo();
    const useCase = new CourseImportIdentityDiffUseCase(batchReader({
      b1: [record('r1', row({ languageRaw: 'EN-us' }))],
      b2: [record('r2', row({ languageRaw: 'en_US', _payloadFingerprint: 'raw-b' }))],
    }), new ProviderRepo(), repo);
    await useCase.analyzeBatch('b1');
    const replay = (await useCase.analyzeBatch('b2')).analyses[0];
    expect(replay.changeState).toBe(CourseImportChangeState.UNCHANGED);
    expect(repo.identities).toHaveLength(1);
    expect(repo.identities[0].languageVersionKey).toBe('en-us');
  });

  it('canonicalizes Spanish aliases without collapsing Spanish into English', async () => {
    const repo = new AnalysisRepo();
    const useCase = new CourseImportIdentityDiffUseCase(batchReader({
      b1: [record('r1', row({ languageRaw: 'Spanish', directCourseUrl: 'https://welc.wipo.int/acc/index.jsf?cc=DL101E&lang=es&page=courseCatalog.xhtml' }))],
      b2: [record('r2', row({ languageRaw: 'spa', directCourseUrl: 'https://welc.wipo.int/acc/index.jsf?cc=DL101E&lang=es&page=courseCatalog.xhtml', _payloadFingerprint: 'raw-b' }))],
    }), new ProviderRepo(), repo);
    await useCase.analyzeBatch('b1');
    expect((await useCase.analyzeBatch('b2')).analyses[0].changeState).toBe(CourseImportChangeState.UNCHANGED);
    expect(repo.identities[0].languageVersionKey).toBe('es');
  });

  it('force reanalysis bypasses the cached record analysis while normal replay remains idempotent', async () => {
    const repo = new AnalysisRepo();
    const batches = { b1: [record('r1', row())] };
    const useCase = new CourseImportIdentityDiffUseCase(batchReader(batches), new ProviderRepo(), repo);
    const first = await useCase.analyzeBatch('b1');
    expect(first.reused).toBe(0);
    batches.b1[0].rawPayload = row({ courseDurationRaw: '99 hours', _payloadFingerprint: 'changed' });
    const cached = await useCase.analyzeBatch('b1');
    expect(cached.reused).toBe(1);
    expect((cached.analyses[0].normalizedPayload.semanticRow as any).courseDurationRaw).toBe('12 hours');
    const forced = await useCase.analyzeBatch('b1', { force: true });
    expect(forced.reused).toBe(0);
    expect((forced.analyses[0].normalizedPayload.semanticRow as any).courseDurationRaw).toBe('99 hours');
  });

  it('does not collapse legitimate language-specific versions', async () => {
    const repo = new AnalysisRepo();
    const useCase = new CourseImportIdentityDiffUseCase(batchReader({ b1: [
      record('r1', row({ languageRaw: 'English' })),
      record('r2', row({ languageRaw: 'Spanish', directCourseUrl: 'https://welc.wipo.int/acc/index.jsf?cc=DL101E&lang=es&page=courseCatalog.xhtml' })),
    ] }), new ProviderRepo(), repo);
    const result = await useCase.analyzeBatch('b1');
    expect(result.analyses.map((item) => item.changeState)).toEqual([CourseImportChangeState.NEW, CourseImportChangeState.NEW]);
    expect(repo.identities).toHaveLength(2);
    expect(repo.identities[0].languageVersionKey).not.toBe(repo.identities[1].languageVersionKey);
  });

  it('ignores tracking-only URL parameter changes in the URL fingerprint', async () => {
    const repo = new AnalysisRepo();
    const useCase = new CourseImportIdentityDiffUseCase(batchReader({
      b1: [record('r1', row())],
      b2: [record('r2', row({ directCourseUrl: 'https://welc.wipo.int/acc/index.jsf?mc_eid=x&cc=DL101E&utm_source=test&page=courseCatalog.xhtml&gclid=x&lang=en&fbclid=x&mc_cid=x', _payloadFingerprint: 'raw-b' }))],
    }), new ProviderRepo(), repo);
    await useCase.analyzeBatch('b1');
    const result = (await useCase.analyzeBatch('b2')).analyses[0];
    expect(result.changeState).toBe(CourseImportChangeState.UNCHANGED);
  });

  it('keeps a stable native identity when the title changes and reports a metadata diff', async () => {
    const repo = new AnalysisRepo();
    const useCase = new CourseImportIdentityDiffUseCase(batchReader({
      b1: [record('r1', row())],
      b2: [record('r2', row({ courseName: 'Updated General Course on Intellectual Property', _payloadFingerprint: 'raw-b' }))],
    }), new ProviderRepo(), repo);
    await useCase.analyzeBatch('b1');
    const result = (await useCase.analyzeBatch('b2')).analyses[0];
    expect(result.changeState).toBe(CourseImportChangeState.METADATA_CHANGED);
    expect(repo.identities).toHaveLength(1);
    expect(repo.identities[0].identityStrategy).toBe(CourseSourceIdentityStrategy.PROVIDER_URL_KEY);
  });

  it('fails closed for conflicting same-batch metadata under one strong native identity', async () => {
    const repo = new AnalysisRepo();
    const useCase = new CourseImportIdentityDiffUseCase(batchReader({ b1: [
      record('r1', row()),
      record('r2', row({ courseDurationRaw: '99 hours', _payloadFingerprint: 'raw-b' })),
    ] }), new ProviderRepo(), repo);
    const result = await useCase.analyzeBatch('b1');
    expect(result.analyses.every((item) => item.changeState === CourseImportChangeState.CONFLICT)).toBe(true);
    expect(repo.identities).toHaveLength(0);
  });
});
