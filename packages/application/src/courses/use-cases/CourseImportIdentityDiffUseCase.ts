import { createHash } from 'crypto';
import {
  CourseImportAnalysisDto,
  CourseImportChangeState,
  CourseImportMatchState,
  CourseSourceIdentityDto,
  CourseSourceIdentityStatus,
  CourseSourceIdentityStrategy,
  ExternalCourseProviderDto,
  ExternalCourseProviderStatus,
  ICourseImportAnalysisRepository,
  IExternalCourseProviderRepository,
  ImportRecordStatus,
} from '@manaratak/domain';
import { CourseProviderNativeKeyAdapters } from '../services/CourseProviderNativeKeyAdapters';

interface StagedCourseRecord {
  id?: string;
  batchId?: string;
  status?: string;
  rawPayload?: unknown;
  normalizedPayload?: unknown;
}

export interface CourseImportRecordReader {
  listRecords(filters?: Record<string, unknown>): Promise<{
    data: StagedCourseRecord[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}

interface NormalizedStagedCourseRow {
  sourceOrder: string | number | null;
  providerLabel: string;
  courseName: string;
  directCourseUrl: string;
  studyFreeRaw: string;
  freeCertificateRaw: string;
  certificateTypeRaw: string;
  languageRaw: string;
  studyLevelRaw: string;
  courseDurationRaw: string;
  shortCourseTopicsRaw: string;
}

interface Fingerprints {
  identityFingerprint: string;
  urlFingerprint: string;
  metadataFingerprint: string;
  rawPayloadFingerprint: string;
}

interface PreparedRecord {
  record: StagedCourseRecord;
  importRecordId: string;
  rawPayload: Readonly<Record<string, unknown>>;
  row?: NormalizedStagedCourseRow;
  provider?: ExternalCourseProviderDto;
  normalizedTitle?: string;
  languageVersionKey?: string;
  normalizedUrl?: string;
  sourceNativeKey?: string;
  identityStrategy?: CourseSourceIdentityStrategy;
  nativeAdapter?: string;
  fingerprints?: Fingerprints;
  invalidReason?: string;
}

export interface CourseImportIdentityBatchResult {
  batchId: string;
  analyzed: number;
  reused: number;
  requiresReview: number;
  counts: Partial<Record<CourseImportChangeState, number>>;
  analyses: CourseImportAnalysisDto[];
}

const TRACKING_QUERY_KEYS = new Set(['gclid', 'fbclid', 'mc_cid', 'mc_eid']);
const PAGE_SIZE = 100;
const LANGUAGE_VERSION_ALIASES = new Map<string, string>([
  ['english', 'en'], ['eng', 'en'], ['en', 'en'],
  ['spanish', 'es'], ['spa', 'es'], ['es', 'es'],
  ['french', 'fr'], ['fra', 'fr'], ['fre', 'fr'], ['fr', 'fr'],
  ['arabic', 'ar'], ['ara', 'ar'], ['ar', 'ar'],
  ['german', 'de'], ['deu', 'de'], ['ger', 'de'], ['de', 'de'],
  ['portuguese', 'pt'], ['por', 'pt'], ['pt', 'pt'],
  ['italian', 'it'], ['ita', 'it'], ['it', 'it'],
  ['japanese', 'ja'], ['jpn', 'ja'], ['ja', 'ja'],
  ['chinese', 'zh'], ['zho', 'zh'], ['chi', 'zh'], ['zh', 'zh'],
  ['korean', 'ko'], ['kor', 'ko'], ['ko', 'ko'],
  ['russian', 'ru'], ['rus', 'ru'], ['ru', 'ru'],
  ['dutch', 'nl'], ['nld', 'nl'], ['dut', 'nl'], ['nl', 'nl'],
  ['turkish', 'tr'], ['tur', 'tr'], ['tr', 'tr'],
  ['hindi', 'hi'], ['hin', 'hi'], ['hi', 'hi'],
  ['indonesian', 'id'], ['ind', 'id'], ['id', 'id'],
  ['vietnamese', 'vi'], ['vie', 'vi'], ['vi', 'vi'],
  ['polish', 'pl'], ['pol', 'pl'], ['pl', 'pl'],
]);

export interface CourseImportAnalysisOptions {
  force?: boolean;
}

export class CourseImportIdentityDiffUseCase {
  public constructor(
    private readonly recordReader: CourseImportRecordReader,
    private readonly providerRepository: IExternalCourseProviderRepository,
    private readonly analysisRepository: ICourseImportAnalysisRepository,
    private readonly nativeKeyAdapters: CourseProviderNativeKeyAdapters = new CourseProviderNativeKeyAdapters(),
  ) {}

  public async analyzeBatch(batchId: string, options: CourseImportAnalysisOptions = {}): Promise<CourseImportIdentityBatchResult> {
    if (!batchId.trim()) throw new Error('COURSE_IMPORT_BATCH_ID_REQUIRED');
    const records = await this.readBatchRecords(batchId);
    const providerCache = new Map<string, ExternalCourseProviderDto | null>();
    const prepared: PreparedRecord[] = [];

    for (const record of records) {
      prepared.push(await this.prepareRecord(record, providerCache));
    }

    const groupFacts = this.buildSameBatchFacts(prepared);
    const analyses: CourseImportAnalysisDto[] = [];
    let reused = 0;
    let requiresReview = 0;
    const counts: Partial<Record<CourseImportChangeState, number>> = {};

    for (const item of prepared) {
      const existing = await this.analysisRepository.findAnalysisByImportRecordId(item.importRecordId);
      if (existing && !options.force) {
        analyses.push(existing);
        reused += 1;
        if (existing.requiresReview) requiresReview += 1;
        counts[existing.changeState] = (counts[existing.changeState] ?? 0) + 1;
        continue;
      }

      const analysis = await this.analyzePrepared(item, groupFacts, existing ?? undefined);
      analyses.push(analysis);
      if (analysis.requiresReview) requiresReview += 1;
      counts[analysis.changeState] = (counts[analysis.changeState] ?? 0) + 1;
    }

    return {
      batchId,
      analyzed: analyses.length - reused,
      reused,
      requiresReview,
      counts,
      analyses,
    };
  }

  private async readBatchRecords(batchId: string): Promise<StagedCourseRecord[]> {
    const records: StagedCourseRecord[] = [];
    let page = 1;
    while (true) {
      const result = await this.recordReader.listRecords({ batchId, page, pageSize: PAGE_SIZE });
      records.push(...(result.data ?? []));
      if (page * PAGE_SIZE >= Number(result.total ?? 0)) break;
      page += 1;
    }
    return records;
  }

  private async prepareRecord(
    record: StagedCourseRecord,
    providerCache: Map<string, ExternalCourseProviderDto | null>,
  ): Promise<PreparedRecord> {
    const importRecordId = String(record.id ?? '').trim();
    if (!importRecordId) throw new Error('COURSE_IMPORT_RECORD_ID_REQUIRED');
    const rawPayload = this.asObject(record.normalizedPayload ?? record.rawPayload) ?? {};
    const row = this.readMasterRow(rawPayload);
    if (!row) {
      return { record, importRecordId, rawPayload, invalidReason: 'COURSE_STAGED_MASTER_ROW_INVALID' };
    }

    const providerLabel = row.providerLabel.trim();
    let provider = providerCache.get(providerLabel);
    if (provider === undefined) {
      provider = providerLabel ? await this.providerRepository.resolveByName(providerLabel) : null;
      providerCache.set(providerLabel, provider);
    }
    if (!provider) {
      return { record, importRecordId, rawPayload, row, invalidReason: 'COURSE_PROVIDER_UNRESOLVED' };
    }
    if (provider.status !== ExternalCourseProviderStatus.APPROVED) {
      return { record, importRecordId, rawPayload, row, provider, invalidReason: `COURSE_PROVIDER_NOT_APPROVED:${provider.status}` };
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = this.normalizeUrl(row.directCourseUrl);
    } catch {
      return { record, importRecordId, rawPayload, row, provider, invalidReason: 'COURSE_DIRECT_URL_INVALID' };
    }

    if (!(await this.providerRepository.isDomainApproved(provider.id, normalizedUrl))) {
      return { record, importRecordId, rawPayload, row, provider, normalizedUrl, invalidReason: 'COURSE_PROVIDER_DOMAIN_NOT_APPROVED' };
    }

    const normalizedTitle = this.normalizeTitle(row.courseName);
    const languageVersionKey = this.normalizeLanguageVersion(row.languageRaw);
    const native = this.nativeKeyAdapters.resolve(provider, row.directCourseUrl, rawPayload);
    const identityStrategy = native
      ? native.adapter.startsWith('explicit-field:')
        ? CourseSourceIdentityStrategy.EXPLICIT_NATIVE_ID
        : CourseSourceIdentityStrategy.PROVIDER_URL_KEY
      : CourseSourceIdentityStrategy.PROVISIONAL_TITLE_LANGUAGE;
    const sourceNativeKey = native?.key ?? `title:${this.sha256(normalizedTitle)}`;
    const fingerprints = this.buildFingerprints({
      providerId: provider.id,
      sourceNativeKey,
      identityStrategy,
      languageVersionKey,
      normalizedUrl,
      row,
      rawPayload,
    });

    return {
      record,
      importRecordId,
      rawPayload,
      row,
      provider,
      normalizedTitle,
      languageVersionKey,
      normalizedUrl,
      sourceNativeKey,
      identityStrategy,
      nativeAdapter: native?.adapter,
      fingerprints,
    };
  }

  private buildSameBatchFacts(prepared: PreparedRecord[]) {
    const groups = new Map<string, PreparedRecord[]>();
    for (const item of prepared) {
      if (!item.provider || !item.sourceNativeKey || item.languageVersionKey === undefined) continue;
      const key = `${item.provider.id}|${item.sourceNativeKey}|${item.languageVersionKey}`;
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
    }

    const result = new Map<string, { kind: 'NONE' | 'IDENTICAL_DUPLICATES' | 'AMBIGUOUS' | 'CONFLICT'; firstId?: string }>();
    for (const group of groups.values()) {
      if (group.length === 1) {
        result.set(group[0].importRecordId, { kind: 'NONE' });
        continue;
      }
      const urlFingerprints = new Set(group.map((item) => item.fingerprints?.urlFingerprint));
      const metadataFingerprints = new Set(group.map((item) => item.fingerprints?.metadataFingerprint));
      const identical = urlFingerprints.size === 1 && metadataFingerprints.size === 1;
      if (identical) {
        const firstId = group[0].importRecordId;
        group.forEach((item, index) =>
          result.set(item.importRecordId, index === 0 ? { kind: 'NONE' } : { kind: 'IDENTICAL_DUPLICATES', firstId }),
        );
        continue;
      }

      const provisional = group.every(
        (item) => item.identityStrategy === CourseSourceIdentityStrategy.PROVISIONAL_TITLE_LANGUAGE,
      );
      for (const item of group) {
        result.set(item.importRecordId, { kind: provisional ? 'AMBIGUOUS' : 'CONFLICT' });
      }
    }
    return result;
  }

  private async analyzePrepared(
    item: PreparedRecord,
    groupFacts: Map<string, { kind: 'NONE' | 'IDENTICAL_DUPLICATES' | 'AMBIGUOUS' | 'CONFLICT'; firstId?: string }>,
    reanalysisBaseline?: CourseImportAnalysisDto,
  ): Promise<CourseImportAnalysisDto> {
    if (item.invalidReason || !item.row || !item.provider || !item.fingerprints || !item.sourceNativeKey ||
        item.languageVersionKey === undefined || !item.normalizedTitle || !item.normalizedUrl || !item.identityStrategy) {
      return this.persistAnalysis(item, {
        matchState: CourseImportMatchState.NOT_DUPLICATE,
        changeState: item.record.status === ImportRecordStatus.INCOMPLETE
          ? CourseImportChangeState.INCOMPLETE
          : CourseImportChangeState.INVALID,
        requiresReview: true,
        fieldDiffs: { reason: item.invalidReason ?? 'COURSE_IDENTITY_INPUT_INCOMPLETE' },
      });
    }

    if (item.record.status === ImportRecordStatus.INCOMPLETE) {
      return this.persistAnalysis(item, {
        matchState: CourseImportMatchState.NOT_DUPLICATE,
        changeState: CourseImportChangeState.INCOMPLETE,
        requiresReview: true,
        fieldDiffs: { reason: 'PHASE_06_STAGED_RECORD_INCOMPLETE' },
      });
    }

    const batchFact = groupFacts.get(item.importRecordId);
    if (batchFact?.kind === 'AMBIGUOUS' || batchFact?.kind === 'CONFLICT') {
      return this.persistAnalysis(item, {
        matchState: batchFact.kind === 'AMBIGUOUS'
          ? CourseImportMatchState.AMBIGUOUS
          : CourseImportMatchState.POSSIBLE_COLLISION,
        changeState: batchFact.kind === 'AMBIGUOUS'
          ? CourseImportChangeState.AMBIGUOUS_MATCH
          : CourseImportChangeState.CONFLICT,
        requiresReview: true,
        fieldDiffs: { reason: 'SAME_BATCH_IDENTITY_COLLISION' },
      });
    }

    let identity = await this.analysisRepository.findSourceIdentityByKey(
      item.provider.id,
      item.sourceNativeKey,
      item.languageVersionKey,
    );

    if (!identity) {
      const collision = await this.findCollisionCandidate(item);
      if (collision) {
        return this.persistAnalysis(item, {
          matchState: collision.ambiguous ? CourseImportMatchState.AMBIGUOUS : CourseImportMatchState.POSSIBLE_COLLISION,
          changeState: collision.ambiguous ? CourseImportChangeState.AMBIGUOUS_MATCH : CourseImportChangeState.CONFLICT,
          requiresReview: true,
          matchedCourseId: collision.identity.courseId,
          fieldDiffs: { reason: collision.reason, candidateSourceIdentityId: collision.identity.id },
        });
      }

      const ensured = await this.analysisRepository.ensureSourceIdentity({
        providerId: item.provider.id,
        sourceNativeKey: item.sourceNativeKey,
        identityStrategy: item.identityStrategy,
        originalTitle: item.row.courseName,
        normalizedOriginalTitle: item.normalizedTitle,
        languageVersionKey: item.languageVersionKey,
        currentUrl: item.row.directCourseUrl,
        status: CourseSourceIdentityStatus.ACTIVE,
      });
      identity = ensured.identity;
      if (ensured.created) {
        await this.analysisRepository.recordInitialUrl({
          courseSourceIdentityId: identity.id,
          url: item.row.directCourseUrl,
          normalizedUrl: item.normalizedUrl,
        });
      }
    } else {
      await this.analysisRepository.touchSourceIdentity(identity.id);
    }

    if (batchFact?.kind === 'IDENTICAL_DUPLICATES') {
      return this.persistAnalysis(item, {
        matchState: CourseImportMatchState.SAME_BATCH_DUPLICATE,
        changeState: CourseImportChangeState.UNCHANGED,
        matchedCourseId: identity.courseId,
        requiresReview: false,
        relationshipProposals: {
          sourceIdentityId: identity.id,
          duplicateOfImportRecordId: batchFact.firstId,
        },
      });
    }

    const baselineIdentity = reanalysisBaseline ? this.asObject(reanalysisBaseline.normalizedPayload.identity) : undefined;
    const baselineCompatible = Boolean(
      reanalysisBaseline
      && reanalysisBaseline.resolvedProviderId === item.provider.id
      && reanalysisBaseline.sourceNativeKey === item.sourceNativeKey
      && baselineIdentity?.languageVersionKey === item.languageVersionKey
      && this.readFingerprints(reanalysisBaseline.normalizedPayload),
    );
    const previous = baselineCompatible
      ? reanalysisBaseline
      : await this.analysisRepository.findLatestAnalysisForSourceKey(
          item.provider.id,
          item.sourceNativeKey,
          item.languageVersionKey,
          item.importRecordId,
        );

    if (!previous) {
      return this.persistAnalysis(item, {
        matchState: CourseImportMatchState.NOT_DUPLICATE,
        changeState: CourseImportChangeState.NEW,
        matchedCourseId: identity.courseId,
        requiresReview: false,
        relationshipProposals: { sourceIdentityId: identity.id },
      });
    }

    const previousFingerprints = this.readFingerprints(previous.normalizedPayload);
    if (!previousFingerprints) {
      return this.persistAnalysis(item, {
        matchState: CourseImportMatchState.POSSIBLE_COLLISION,
        changeState: CourseImportChangeState.CONFLICT,
        matchedCourseId: identity.courseId,
        requiresReview: true,
        fieldDiffs: { reason: 'PREVIOUS_ANALYSIS_FINGERPRINTS_MISSING' },
        relationshipProposals: { sourceIdentityId: identity.id },
      });
    }

    const urlChanged = previousFingerprints.urlFingerprint !== item.fingerprints.urlFingerprint;
    const metadataChanged = previousFingerprints.metadataFingerprint !== item.fingerprints.metadataFingerprint;
    const fieldDiffs = metadataChanged
      ? this.diffMetadata(this.readSemanticRow(previous.normalizedPayload), item.row)
      : undefined;

    if (!urlChanged && !metadataChanged) {
      return this.persistAnalysis(item, {
        matchState: CourseImportMatchState.CROSS_BATCH_UNCHANGED,
        changeState: CourseImportChangeState.UNCHANGED,
        matchedCourseId: identity.courseId,
        requiresReview: false,
        relationshipProposals: { sourceIdentityId: identity.id },
      });
    }

    const changeState = urlChanged && metadataChanged
      ? CourseImportChangeState.URL_AND_METADATA_CHANGED
      : urlChanged
        ? CourseImportChangeState.URL_CHANGED
        : CourseImportChangeState.METADATA_CHANGED;

    return this.persistAnalysis(item, {
      matchState: CourseImportMatchState.EXACT_EXISTING,
      changeState,
      matchedCourseId: identity.courseId,
      requiresReview: true,
      fieldDiffs,
      relationshipProposals: {
        sourceIdentityId: identity.id,
        ...(urlChanged ? {
          urlHistory: {
            action: 'PROPOSE_URL_CHANGE',
            currentUrl: identity.currentUrl,
            currentNormalizedUrl: this.normalizeUrl(identity.currentUrl),
            proposedUrl: item.row.directCourseUrl,
            proposedNormalizedUrl: item.normalizedUrl,
            providerDomainApproved: true,
            directCoursePageVerification: 'PENDING_CONTROLLED_TRANSFER_POLICY',
            importRecordId: item.importRecordId,
          },
        } : {}),
      },
    });
  }

  private async findCollisionCandidate(item: PreparedRecord): Promise<{
    identity: CourseSourceIdentityDto;
    ambiguous: boolean;
    reason: string;
  } | undefined> {
    if (!item.provider || !item.normalizedUrl || !item.normalizedTitle || item.languageVersionKey === undefined) return undefined;

    const urlCandidates = await this.analysisRepository.findSourceIdentitiesByNormalizedUrl(
      item.provider.id,
      item.normalizedUrl,
      item.languageVersionKey,
    );
    if (urlCandidates.length > 1) {
      return { identity: urlCandidates[0], ambiguous: true, reason: 'MULTIPLE_IDENTITIES_SHARE_EXACT_NORMALIZED_URL' };
    }
    if (urlCandidates.length === 1 && urlCandidates[0].sourceNativeKey !== item.sourceNativeKey) {
      return { identity: urlCandidates[0], ambiguous: false, reason: 'EXACT_URL_BELONGS_TO_DIFFERENT_STABLE_IDENTITY' };
    }

    const titleCandidates = await this.analysisRepository.findSourceIdentitiesByNormalizedTitle(
      item.provider.id,
      item.normalizedTitle,
      item.languageVersionKey,
    );
    if (titleCandidates.length > 1) {
      return { identity: titleCandidates[0], ambiguous: true, reason: 'MULTIPLE_IDENTITIES_SHARE_EXACT_PROVIDER_TITLE_LANGUAGE' };
    }
    if (
      titleCandidates.length === 1 &&
      titleCandidates[0].sourceNativeKey !== item.sourceNativeKey &&
      item.identityStrategy !== CourseSourceIdentityStrategy.PROVISIONAL_TITLE_LANGUAGE
    ) {
      return { identity: titleCandidates[0], ambiguous: true, reason: 'STRONG_IDENTITY_DISAGREES_WITH_EXISTING_PROVISIONAL_TITLE_IDENTITY' };
    }
    return undefined;
  }

  private async persistAnalysis(
    item: PreparedRecord,
    decision: {
      matchState: CourseImportMatchState;
      changeState: CourseImportChangeState;
      matchedCourseId?: string;
      requiresReview: boolean;
      fieldDiffs?: Record<string, unknown>;
      relationshipProposals?: Record<string, unknown>;
    },
  ): Promise<CourseImportAnalysisDto> {
    const normalizedPayload: Record<string, unknown> = {
      semanticRow: item.row ?? null,
      identity: item.provider && item.sourceNativeKey && item.identityStrategy && item.languageVersionKey !== undefined
        ? {
            providerId: item.provider.id,
            providerPublicId: item.provider.publicId,
            sourceNativeKey: item.sourceNativeKey,
            identityStrategy: item.identityStrategy,
            languageVersionKey: item.languageVersionKey,
            normalizedTitle: item.normalizedTitle,
            normalizedUrl: item.normalizedUrl,
            nativeAdapter: item.nativeAdapter ?? null,
          }
        : null,
      fingerprints: item.fingerprints ?? null,
      provenance: {
        artifactSha256: item.rawPayload._artifactSha256 ?? null,
        assetId: item.rawPayload._assetId ?? null,
        sourceFilename: item.rawPayload._sourceFilename ?? null,
        sourceSheetName: item.rawPayload._sourceSheetName ?? null,
        worksheetRowNumber: item.rawPayload._worksheetRowNumber ?? item.rawPayload._sourceRowNumber ?? null,
      },
    };

    return this.analysisRepository.upsertAnalysis({
      importRecordId: item.importRecordId,
      providerCandidateId: item.provider?.id,
      resolvedProviderId: item.provider?.id,
      sourceNativeKey: item.sourceNativeKey,
      normalizedPayload,
      eligibilityState: 'PENDING_WP_IC_05',
      completenessState: item.record.status === ImportRecordStatus.INCOMPLETE ? 'STAGED_INCOMPLETE' : 'STAGED_COMPLETE',
      matchState: decision.matchState,
      matchedCourseId: decision.matchedCourseId,
      changeState: decision.changeState,
      fieldDiffs: decision.fieldDiffs,
      relationshipProposals: decision.relationshipProposals,
      requiresReview: decision.requiresReview,
    });
  }

  private readMasterRow(payload: Readonly<Record<string, unknown>>): NormalizedStagedCourseRow | undefined {
    const stringValue = (key: string) => typeof payload[key] === 'string' ? String(payload[key]) : '';
    const sourceOrder = payload.sourceOrder;
    const providerLabel = stringValue('providerLabel');
    const courseName = stringValue('courseName');
    const directCourseUrl = stringValue('directCourseUrl');
    if (!providerLabel && !courseName && !directCourseUrl) return undefined;
    return {
      sourceOrder: typeof sourceOrder === 'string' || typeof sourceOrder === 'number' ? sourceOrder : null,
      providerLabel,
      courseName,
      directCourseUrl,
      studyFreeRaw: stringValue('studyFreeRaw'),
      freeCertificateRaw: stringValue('freeCertificateRaw'),
      certificateTypeRaw: stringValue('certificateTypeRaw'),
      languageRaw: stringValue('languageRaw'),
      studyLevelRaw: stringValue('studyLevelRaw'),
      courseDurationRaw: stringValue('courseDurationRaw'),
      shortCourseTopicsRaw: stringValue('shortCourseTopicsRaw'),
    };
  }

  private buildFingerprints(input: {
    providerId: string;
    sourceNativeKey: string;
    identityStrategy: CourseSourceIdentityStrategy;
    languageVersionKey: string;
    normalizedUrl: string;
    row: NormalizedStagedCourseRow;
    rawPayload: Readonly<Record<string, unknown>>;
  }): Fingerprints {
    const metadata = this.semanticMetadata(input.row);
    const rawPayloadFingerprint = typeof input.rawPayload._payloadFingerprint === 'string'
      ? input.rawPayload._payloadFingerprint
      : this.sha256(this.stableJson(input.rawPayload));
    return {
      identityFingerprint: this.sha256(this.stableJson({
        providerId: input.providerId,
        sourceNativeKey: input.sourceNativeKey,
        identityStrategy: input.identityStrategy,
        languageVersionKey: input.languageVersionKey,
      })),
      urlFingerprint: this.sha256(input.normalizedUrl),
      metadataFingerprint: this.sha256(this.stableJson(metadata)),
      rawPayloadFingerprint,
    };
  }

  private semanticMetadata(row: NormalizedStagedCourseRow): Record<string, string> {
    return {
      courseName: this.normalizeTextValue(row.courseName),
      studyFreeRaw: this.normalizeTextValue(row.studyFreeRaw),
      freeCertificateRaw: this.normalizeTextValue(row.freeCertificateRaw),
      certificateTypeRaw: this.normalizeTextValue(row.certificateTypeRaw),
      languageRaw: this.normalizeLanguageVersion(row.languageRaw),
      studyLevelRaw: this.normalizeTextValue(row.studyLevelRaw),
      courseDurationRaw: this.normalizeTextValue(row.courseDurationRaw),
      shortCourseTopicsRaw: this.normalizeTextValue(row.shortCourseTopicsRaw),
    };
  }

  private diffMetadata(previous: NormalizedStagedCourseRow | undefined, current: NormalizedStagedCourseRow): Record<string, unknown> {
    if (!previous) return { reason: 'PREVIOUS_SEMANTIC_ROW_MISSING' };
    const before = this.semanticMetadata(previous);
    const after = this.semanticMetadata(current);
    const fields: Record<string, { before: string; after: string }> = {};
    for (const key of Object.keys(after)) {
      if (before[key] !== after[key]) fields[key] = { before: before[key], after: after[key] };
    }
    return { fields };
  }

  private readSemanticRow(payload: Record<string, unknown>): NormalizedStagedCourseRow | undefined {
    const row = this.asObject(payload.semanticRow);
    return row ? this.readMasterRow(row) : undefined;
  }

  private readFingerprints(payload: Record<string, unknown>): Fingerprints | undefined {
    const value = this.asObject(payload.fingerprints);
    if (!value) return undefined;
    const keys: Array<keyof Fingerprints> = ['identityFingerprint', 'urlFingerprint', 'metadataFingerprint', 'rawPayloadFingerprint'];
    if (!keys.every((key) => typeof value[key] === 'string')) return undefined;
    return value as unknown as Fingerprints;
  }

  private normalizeTitle(value: string): string {
    return value
      .normalize('NFKC')
      .trim()
      .toLocaleLowerCase('en-US')
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/\s+/g, ' ');
  }

  private normalizeLanguageVersion(value: string): string {
    const normalized = this.normalizeTextValue(value).toLocaleLowerCase('en-US');
    if (!normalized) return '';
    const locale = normalized.replace(/_/g, '-');
    const alias = LANGUAGE_VERSION_ALIASES.get(locale);
    if (alias) return alias;
    const [base, ...rest] = locale.split('-');
    const canonicalBase = LANGUAGE_VERSION_ALIASES.get(base);
    return canonicalBase && rest.length > 0 ? [canonicalBase, ...rest].join('-') : locale;
  }

  private normalizeTextValue(value: string): string {
    return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  }

  private normalizeUrl(value: string): string {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:') throw new Error('COURSE_DIRECT_URL_HTTPS_REQUIRED');
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLocaleLowerCase('en-US').replace(/\.$/, '');
    if (parsed.port === '443') parsed.port = '';

    const keys = [...parsed.searchParams.keys()];
    for (const key of keys) {
      const lower = key.toLocaleLowerCase('en-US');
      if (lower.startsWith('utm_') || TRACKING_QUERY_KEYS.has(lower)) {
        parsed.searchParams.delete(key);
        continue;
      }
      if (
        lower === 'active-tab' &&
        (parsed.hostname === 'open.edu' || parsed.hostname.endsWith('.open.edu'))
      ) {
        parsed.searchParams.delete(key);
      }
    }

    const sorted = [...parsed.searchParams.entries()].sort(([aKey, aValue], [bKey, bValue]) =>
      aKey === bKey ? aValue.localeCompare(bValue) : aKey.localeCompare(bKey),
    );
    parsed.search = '';
    for (const [key, item] of sorted) parsed.searchParams.append(key, item);
    if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.toString();
  }

  private stableJson(value: unknown): string {
    const normalize = (item: unknown): unknown => {
      if (Array.isArray(item)) return item.map(normalize);
      if (item && typeof item === 'object') {
        return Object.fromEntries(
          Object.entries(item as Record<string, unknown>)
            .filter(([, entry]) => entry !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, entry]) => [key, normalize(entry)]),
        );
      }
      return item;
    };
    return JSON.stringify(normalize(value));
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private asObject(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
  }
}
