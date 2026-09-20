import { createHash, randomUUID } from 'crypto';
import {
  CourseImportChangeState,
  ExternalCourseProviderDto,
  ExternalCourseProviderStatus,
  IExternalCourseProviderRepository,
  IImportedCourseLinkChecker,
  IImportedCourseOperationsRepository,
  ImportedCourseLinkCheckResult,
  ImportedCourseMasterRowContract,
} from '@manaratak/domain';
import { ImportAdminUseCases } from '../../import-foundation/use-cases/ImportAdminUseCases';
import {
  CourseArtifactPreflightInput,
  CourseImportArtifactUseCase,
} from './CourseImportArtifactUseCase';
import {
  CourseImportBatchTransferInput,
  CourseImportOperationsUseCases,
} from './CourseImportOperationsUseCases';

export type CourseProviderContinuationMode = 'FULL_SNAPSHOT' | 'INCREMENTAL';

export interface CourseProviderFileContinuationInput extends CourseArtifactPreflightInput {
  mode?: CourseProviderContinuationMode;
}

export interface CourseProviderConnectorFetchResult {
  rows: ImportedCourseMasterRowContract[];
  observedSignature: unknown;
  sourceFingerprint?: string;
  acquiredAt?: Date;
}

/**
 * Course-specific adapter registered by application composition. It consumes only
 * an already-approved provider definition; it does not replace Phase 06 source
 * connector/SSRF policy and cannot accept an arbitrary request URL.
 */
export interface ICourseProviderConnectorAdapter {
  connectorKey: string;
  connectorVersion: string;
  expectedSignature: unknown;
  mode: CourseProviderContinuationMode;
  fetch(input: {
    provider: ExternalCourseProviderDto;
    allowedDomains: readonly string[];
  }): Promise<CourseProviderConnectorFetchResult>;
}

export class CourseProviderConnectorRegistry {
  private readonly connectors = new Map<string, ICourseProviderConnectorAdapter>();

  public register(connector: ICourseProviderConnectorAdapter): void {
    const key = connector.connectorKey.trim();
    const version = connector.connectorVersion.trim();
    if (!key) throw new Error('COURSE_PROVIDER_CONNECTOR_KEY_REQUIRED');
    if (!version) throw new Error('COURSE_PROVIDER_CONNECTOR_VERSION_REQUIRED');
    const existing = this.connectors.get(key);
    if (existing && existing !== connector) {
      throw new Error(`COURSE_PROVIDER_CONNECTOR_ALREADY_REGISTERED:${key}`);
    }
    this.connectors.set(key, connector);
  }

  public resolve(connectorKey: string): ICourseProviderConnectorAdapter | undefined {
    return this.connectors.get(connectorKey.trim());
  }

  public list(): Array<{ connectorKey: string; connectorVersion: string; mode: CourseProviderContinuationMode }> {
    return [...this.connectors.values()]
      .map((connector) => ({
        connectorKey: connector.connectorKey,
        connectorVersion: connector.connectorVersion,
        mode: connector.mode,
      }))
      .sort((a, b) => a.connectorKey.localeCompare(b.connectorKey));
  }
}

export const defaultCourseProviderConnectorRegistry = new CourseProviderConnectorRegistry();

export interface CourseProviderDriftAlert {
  sourceId: string;
  connectorId: string;
  connectorVersion: string;
  detectedAt: string;
  driftType:
    | 'SCHEMA_MISMATCH'
    | 'PROVIDER_MISMATCH'
    | 'PROVIDER_UNRESOLVED'
    | 'LOW_YIELD'
    | 'CONNECTOR_VERSION_MISMATCH';
  severity: 'HIGH' | 'CRITICAL';
  previousSignature: unknown;
  currentSignature: unknown;
  sampleEvidence: string;
  recommendedAction: string;
}

export class CourseProviderDriftError extends Error {
  public constructor(public readonly alert: CourseProviderDriftAlert) {
    super(`COURSE_PROVIDER_SOURCE_DRIFT_BLOCKED:${alert.driftType}`);
    this.name = 'CourseProviderDriftError';
  }
}

export interface CourseProviderContinuationSummary {
  totalAnalyzed: number;
  newSinceLastImport: number;
  unchanged: number;
  changedLinks: number;
  metadataChanged: number;
  changedUrlAndMetadata: number;
  sameFileDuplicates: number;
  reviewRequired: number;
  readyToTransfer: number;
  blockedOrConflict: number;
  countsByChangeState: Record<string, number>;
}

const PROVIDER_FILE_PREFIX = 'COURSE_PROVIDER_FILE:';
const PROVIDER_CONNECTOR_PREFIX = 'COURSE_PROVIDER_CONNECTOR:';
const FULL_SNAPSHOT_LOW_YIELD_RATIO = 0.4;
const MIN_LOW_YIELD_BASELINE = 10;
const MAX_LINK_HEALTH_JOB_SIZE = 10;
const MIN_LINK_HEALTH_DELAY_MS = 750;
const MAX_LINK_HEALTH_DELAY_MS = 10_000;

export class CourseProviderContinuationUseCases {
  public constructor(
    private readonly providerRepository: IExternalCourseProviderRepository,
    private readonly artifactUseCase: CourseImportArtifactUseCase,
    private readonly operationsUseCases: CourseImportOperationsUseCases,
    private readonly importedOperationsRepository: IImportedCourseOperationsRepository,
    private readonly linkChecker: IImportedCourseLinkChecker,
    private readonly importAdminUseCases: ImportAdminUseCases,
    private readonly connectorRegistry: CourseProviderConnectorRegistry = defaultCourseProviderConnectorRegistry,
  ) {}

  public async getProviderStatus(providerRef: string) {
    const provider = await this.requireProvider(providerRef);
    const [canonical, freeCertificate, broken, needsReviewLinks, unknownLinks, reviewSummary, batches] = await Promise.all([
      this.importedOperationsRepository.listImportedCourses({ providerId: provider.id, page: 1, pageSize: 1 }),
      this.importedOperationsRepository.listImportedCourses({ providerId: provider.id, freeMode: 'FREE_CERTIFICATE', page: 1, pageSize: 1 }),
      this.importedOperationsRepository.listImportedCourses({ providerId: provider.id, linkHealth: 'BROKEN', page: 1, pageSize: 1 }),
      this.importedOperationsRepository.listImportedCourses({ providerId: provider.id, linkHealth: 'NEEDS_REVIEW', page: 1, pageSize: 1 }),
      this.importedOperationsRepository.listImportedCourses({ providerId: provider.id, linkHealth: 'UNKNOWN', page: 1, pageSize: 1 }),
      this.importedOperationsRepository.getProviderReviewSummary(provider.id),
      this.importedOperationsRepository.listProviderCourseBatches({ providerPublicId: provider.publicId, limit: 100 }),
    ]);

    const providerBatches = batches.data;
    const latestBatch = providerBatches[0] ?? null;
    const sourceHealth = provider.status !== ExternalCourseProviderStatus.APPROVED
      ? 'NEEDS_REVIEW'
      : broken.total > 0
        ? 'LINK_ISSUES'
        : needsReviewLinks.total + unknownLinks.total > 0
          ? 'VERIFICATION_PENDING'
          : provider.lastVerifiedAt
            ? 'HEALTHY'
            : 'UNVERIFIED';

    return {
      ...provider,
      continuation: {
        sourceHealth,
        canonicalCourseCount: canonical.total,
        freeCertificateCount: freeCertificate.total,
        brokenLinkCount: broken.total,
        needsVerificationCount: needsReviewLinks.total + unknownLinks.total,
        reviewRequiredCount: reviewSummary.reviewRequiredCount,
        changedLinkQueueCount: reviewSummary.changedLinkQueueCount,
        continuationBatchCount: batches.total,
        latestBatch,
        lastVerifiedAt: provider.lastVerifiedAt ?? null,
        connector: {
          configured: Boolean(provider.connectorKey),
          connectorKey: provider.connectorKey ?? null,
          connectorVersion: provider.connectorVersion ?? null,
          implementationRegistered: provider.connectorKey
            ? Boolean(this.connectorRegistry.resolve(provider.connectorKey))
            : false,
        },
      },
    };
  }

  public async preflightProviderFile(providerRef: string, input: CourseProviderFileContinuationInput) {
    const provider = await this.requireApprovedProvider(providerRef);
    this.assertFileStrategy(provider);
    const mode = input.mode ?? 'FULL_SNAPSHOT';
    const sourceSystem = this.providerFileSourceSystem(provider, mode);
    const preflight = await this.artifactUseCase.preflight({
      assetId: input.assetId,
      expectedSha256: input.expectedSha256,
      sourceSystem,
    });
    const alerts = await this.fileDriftAlerts(provider, mode, preflight);
    return {
      provider,
      mode,
      sourceSystem,
      preflight,
      driftAlerts: alerts,
      canStage: preflight.valid && alerts.length === 0,
    };
  }

  public async stageProviderFile(providerRef: string, input: CourseProviderFileContinuationInput) {
    const gate = await this.preflightProviderFile(providerRef, input);
    if (!gate.canStage) {
      await this.markProviderNeedsReview(gate.provider);
      throw new CourseProviderDriftError(
        gate.driftAlerts[0] ?? this.alert({
          provider: gate.provider,
          connectorId: gate.sourceSystem,
          connectorVersion: 'FILE',
          driftType: 'SCHEMA_MISMATCH',
          previousSignature: '11-column imported-course contract',
          currentSignature: gate.preflight.unknownColumns,
          sampleEvidence: 'Provider file failed course preflight.',
          recommendedAction: 'Correct the provider file and rerun preflight before staging.',
        }),
      );
    }

    const staged = await this.artifactUseCase.stage({
      assetId: input.assetId,
      expectedSha256: input.expectedSha256,
      sourceSystem: gate.sourceSystem,
    });
    const batchId = staged.existingBatchId ?? (staged.staging as any)?.batch?.id;
    if (!batchId) throw new Error('COURSE_PROVIDER_IMPORT_BATCH_ID_MISSING_AFTER_STAGE');
    const analysis = await this.operationsUseCases.analyzeBatch(batchId);
    return {
      ...staged,
      provider: gate.provider,
      mode: gate.mode,
      batchId,
      analysis,
      inventoryComparison: this.summarizeAnalysis(analysis),
    };
  }

  public async getChangedLinkQueue(providerRef: string, limit: number = 100) {
    const provider = await this.requireProvider(providerRef);
    const reviewRecords = await this.listProviderReviewRecords(provider.id, Math.min(500, Math.max(1, limit * 2)));
    const importChanges = reviewRecords
      .filter((item: any) =>
        item.changeState === CourseImportChangeState.URL_CHANGED ||
        item.changeState === CourseImportChangeState.URL_AND_METADATA_CHANGED,
      )
      .slice(0, limit);
    const broken = await this.importedOperationsRepository.listImportedCourses({
      providerId: provider.id,
      linkHealth: 'BROKEN',
      page: 1,
      pageSize: Math.min(100, Math.max(1, limit)),
    });

    return {
      providerId: provider.id,
      providerPublicId: provider.publicId,
      importChanges,
      brokenCanonicalLinks: broken.data,
      total: importChanges.length + broken.total,
    };
  }

  public async runLinkHealthJob(
    providerRef: string,
    input: { page?: number; limit?: number; delayMs?: number } = {},
  ) {
    const provider = await this.requireApprovedProvider(providerRef);
    if (provider.allowedDomains.length === 0) {
      throw new Error('COURSE_PROVIDER_ALLOWED_DOMAINS_REQUIRED');
    }
    const page = Math.max(1, Math.floor(input.page ?? 1));
    const limit = Math.min(MAX_LINK_HEALTH_JOB_SIZE, Math.max(1, Math.floor(input.limit ?? 10)));
    const delayMs = Math.min(
      MAX_LINK_HEALTH_DELAY_MS,
      Math.max(MIN_LINK_HEALTH_DELAY_MS, Math.floor(input.delayMs ?? 1_000)),
    );
    const courses = await this.importedOperationsRepository.listImportedCourses({
      providerId: provider.id,
      page,
      pageSize: limit,
    });
    const jobId = `course-link-health-${randomUUID()}`;
    const results: Array<{ courseId: string; result: ImportedCourseLinkCheckResult }> = [];

    for (let index = 0; index < courses.data.length; index += 1) {
      const course = courses.data[index];
      let result: ImportedCourseLinkCheckResult;
      try {
        result = await this.linkChecker.check({
          url: course.directCourseUrl,
          allowedDomains: provider.allowedDomains,
        });
      } catch (error) {
        result = {
          state: 'NEEDS_REVIEW',
          checkedAt: new Date(),
          detail: error instanceof Error ? error.message : 'COURSE_LINK_CHECK_FAILED',
        };
      }
      await this.importedOperationsRepository.recordLinkCheck(course.id, result, course.directCourseUrl);
      results.push({ courseId: course.id, result });
      if (index < courses.data.length - 1) await this.sleep(delayMs);
    }

    const counts = results.reduce<Record<string, number>>((acc, item) => {
      acc[item.result.state] = (acc[item.result.state] ?? 0) + 1;
      return acc;
    }, {});
    return {
      jobId,
      providerId: provider.id,
      page,
      pageSize: limit,
      delayMs,
      attempted: results.length,
      totalCanonicalCourses: courses.total,
      hasMore: page * limit < courses.total,
      nextPage: page * limit < courses.total ? page + 1 : null,
      counts,
      results,
    };
  }

  public async replayProviderBatch(providerRef: string, batchId: string) {
    const provider = await this.requireApprovedProvider(providerRef);
    await this.assertProviderContinuationBatch(provider, batchId);
    const analysis = await this.operationsUseCases.analyzeBatch(batchId, { force: true });
    return {
      providerId: provider.id,
      batchId,
      replayed: true,
      analysis,
      inventoryComparison: this.summarizeAnalysis(analysis),
    };
  }

  public async retryProviderTransfer(
    providerRef: string,
    batchId: string,
    input: Omit<CourseImportBatchTransferInput, 'batchId'>,
  ) {
    const provider = await this.requireApprovedProvider(providerRef);
    await this.assertProviderContinuationBatch(provider, batchId);
    return this.operationsUseCases.transferBatch({ ...input, batchId });
  }

  public async approveProviderSourceHealth(
    providerRef: string,
    input: { connectorVersion?: string } = {},
  ) {
    const provider = await this.requireProvider(providerRef);
    if (input.connectorVersion?.trim() && input.connectorVersion.trim() !== provider.connectorVersion) {
      throw new Error('COURSE_PROVIDER_CONNECTOR_VERSION_MUTATION_FORBIDDEN');
    }
    if (provider.connectorKey) {
      const implementation = this.connectorRegistry.resolve(provider.connectorKey);
      if (!implementation || implementation.connectorVersion !== provider.connectorVersion) {
        throw new Error('COURSE_PROVIDER_CONNECTOR_VERSION_MISMATCH');
      }
    }
    const connectorVersion = provider.connectorVersion;
    const updated = await this.providerRepository.upsertSeedProvider({
      publicId: provider.publicId,
      slug: provider.slug,
      canonicalName: provider.canonicalName,
      displayName: provider.displayName,
      providerType: provider.providerType ?? null,
      status: ExternalCourseProviderStatus.APPROVED,
      officialWebsite: provider.officialWebsite ?? null,
      operatingScope: provider.operatingScope ?? null,
      headquartersCountryReferenceId: provider.headquartersCountryReferenceId ?? null,
      sourceTrustLevel: provider.sourceTrustLevel,
      importStrategy: provider.importStrategy,
      connectorKey: provider.connectorKey ?? null,
      connectorVersion: connectorVersion ?? null,
      lastVerifiedAt: new Date(),
      aliases: provider.aliases.map((alias) => ({
        alias: alias.alias,
        locale: alias.locale,
        source: alias.source,
      })),
      allowedDomains: provider.allowedDomains,
    });
    return this.getProviderStatus(updated.id);
  }

  public async getConnectorStatus(providerRef: string) {
    const provider = await this.requireProvider(providerRef);
    const implementation = provider.connectorKey
      ? this.connectorRegistry.resolve(provider.connectorKey)
      : undefined;
    return {
      providerId: provider.id,
      providerPublicId: provider.publicId,
      importStrategy: provider.importStrategy,
      connectorKey: provider.connectorKey ?? null,
      connectorVersion: provider.connectorVersion ?? null,
      implementationRegistered: Boolean(implementation),
      implementationVersion: implementation?.connectorVersion ?? null,
      expectedSignature: implementation?.expectedSignature ?? null,
      mode: implementation?.mode ?? null,
    };
  }

  public async runRegisteredConnector(providerRef: string) {
    const provider = await this.requireApprovedProvider(providerRef);
    this.assertConnectorStrategy(provider);
    if (provider.allowedDomains.length === 0) throw new Error('COURSE_PROVIDER_ALLOWED_DOMAINS_REQUIRED');
    const connectorKey = provider.connectorKey?.trim();
    const connectorVersion = provider.connectorVersion?.trim();
    if (!connectorKey) throw new Error('COURSE_PROVIDER_CONNECTOR_KEY_REQUIRED');
    if (!connectorVersion) throw new Error('COURSE_PROVIDER_CONNECTOR_VERSION_REQUIRED');
    const connector = this.connectorRegistry.resolve(connectorKey);
    if (!connector) throw new Error(`COURSE_PROVIDER_CONNECTOR_IMPLEMENTATION_NOT_REGISTERED:${connectorKey}`);

    if (connector.connectorVersion !== connectorVersion) {
      const alert = this.alert({
        provider,
        connectorId: connectorKey,
        connectorVersion,
        driftType: 'CONNECTOR_VERSION_MISMATCH',
        previousSignature: { configuredVersion: connectorVersion },
        currentSignature: { implementationVersion: connector.connectorVersion },
        sampleEvidence: `Provider registry expects ${connectorVersion}; implementation reports ${connector.connectorVersion}.`,
        recommendedAction: 'Review and approve the connector version before another execution.',
      });
      await this.markProviderNeedsReview(provider);
      throw new CourseProviderDriftError(alert);
    }

    const fetched = await connector.fetch({
      provider,
      allowedDomains: provider.allowedDomains,
    });
    const driftAlerts = await this.connectorDriftAlerts(provider, connector, fetched);
    if (driftAlerts.length > 0) {
      await this.markProviderNeedsReview(provider);
      throw new CourseProviderDriftError(driftAlerts[0]);
    }

    const sourceSystem = this.providerConnectorSourceSystem(provider, connector);
    const acquiredAt = fetched.acquiredAt ?? new Date();
    const suppliedFingerprint = fetched.sourceFingerprint?.trim().toLocaleLowerCase('en-US') ?? '';
    const sourceFingerprint = /^[a-f0-9]{64}$/.test(suppliedFingerprint)
      ? suppliedFingerprint
      : this.sha256(this.stableJson(fetched.rows));
    const rows = fetched.rows.map((row, index) => ({
      ...row,
      // Reuse the WP-IC-05 provenance contract: connector acquisitions must expose
      // a stable SHA-256 artifact-equivalent fingerprint before controlled transfer.
      _artifactSha256: sourceFingerprint,
      _sourceFilename: `${connector.connectorKey}@${connector.connectorVersion}`,
      _sourceSheetName: 'REGISTERED_CONNECTOR',
      _worksheetRowNumber: index + 1,
      _connectorKey: connector.connectorKey,
      _connectorVersion: connector.connectorVersion,
      _connectorExpectedSignature: connector.expectedSignature,
      _connectorObservedSignature: fetched.observedSignature,
      _connectorSourceFingerprint: sourceFingerprint,
      _connectorSuppliedFingerprint: fetched.sourceFingerprint ?? null,
      _connectorAcquiredAt: acquiredAt.toISOString(),
    }));
    const staged = await this.importAdminUseCases.stageNormalizedRows({
      ownerDomain: 'COURSES',
      sourceSystem,
      rows,
    });
    const batchId = staged.batch?.id;
    if (!batchId) throw new Error('COURSE_PROVIDER_CONNECTOR_BATCH_ID_MISSING_AFTER_STAGE');
    const analysis = await this.operationsUseCases.analyzeBatch(batchId);
    return {
      providerId: provider.id,
      providerPublicId: provider.publicId,
      connectorKey: connector.connectorKey,
      connectorVersion: connector.connectorVersion,
      sourceSystem,
      batchId,
      staging: staged,
      analysis,
      inventoryComparison: this.summarizeAnalysis(analysis),
    };
  }

  private async fileDriftAlerts(
    provider: ExternalCourseProviderDto,
    mode: CourseProviderContinuationMode,
    preflight: any,
  ): Promise<CourseProviderDriftAlert[]> {
    const alerts: CourseProviderDriftAlert[] = [];
    const providerEntries = Array.isArray(preflight.providers) ? preflight.providers : [];
    const resolved = providerEntries.filter((entry: any) => entry?.resolved);
    if (!preflight.valid) {
      alerts.push(this.alert({
        provider,
        connectorId: this.providerFileSourceSystem(provider, mode),
        connectorVersion: 'FILE',
        driftType: 'SCHEMA_MISMATCH',
        previousSignature: 'Imported course 11-column contract',
        currentSignature: {
          sheetName: preflight?.artifact?.sheetName ?? null,
          unknownColumns: preflight?.unknownColumns ?? [],
          issueCount: Array.isArray(preflight?.issues) ? preflight.issues.length : 0,
        },
        sampleEvidence: 'Course provider file did not pass the existing artifact preflight.',
        recommendedAction: 'Correct file schema/required values before staging.',
      }));
    }
    if (providerEntries.some((entry: any) => !entry?.resolved)) {
      alerts.push(this.alert({
        provider,
        connectorId: this.providerFileSourceSystem(provider, mode),
        connectorVersion: 'FILE',
        driftType: 'PROVIDER_UNRESOLVED',
        previousSignature: provider.canonicalName,
        currentSignature: providerEntries.map((entry: any) => entry?.label ?? null),
        sampleEvidence: 'At least one file provider label is unresolved.',
        recommendedAction: 'Resolve/approve provider aliases before staging.',
      }));
    }
    if (
      providerEntries.length !== 1 ||
      resolved.length !== 1 ||
      resolved[0]?.providerId !== provider.id
    ) {
      alerts.push(this.alert({
        provider,
        connectorId: this.providerFileSourceSystem(provider, mode),
        connectorVersion: 'FILE',
        driftType: 'PROVIDER_MISMATCH',
        previousSignature: { providerId: provider.id, canonicalName: provider.canonicalName },
        currentSignature: providerEntries.map((entry: any) => ({
          label: entry?.label ?? null,
          providerId: entry?.providerId ?? null,
          rowCount: entry?.rowCount ?? null,
        })),
        sampleEvidence: 'Provider-specific import must contain exactly one resolved provider matching the selected provider.',
        recommendedAction: 'Split the file by provider or choose the correct provider workspace.',
      }));
    }

    if (mode === 'FULL_SNAPSHOT') {
      const observed = Number(preflight?.summary?.rowsFound ?? 0);
      const baseline = await this.latestSnapshotBaseline(provider, PROVIDER_FILE_PREFIX)
        ?? (await this.importedOperationsRepository.listImportedCourses({ providerId: provider.id, page: 1, pageSize: 1 })).total;
      if (observed === 0 || (baseline >= MIN_LOW_YIELD_BASELINE && observed < Math.floor(baseline * FULL_SNAPSHOT_LOW_YIELD_RATIO))) {
        alerts.push(this.alert({
          provider,
          connectorId: this.providerFileSourceSystem(provider, mode),
          connectorVersion: 'FILE',
          driftType: 'LOW_YIELD',
          previousSignature: { previousFullSnapshotRows: baseline },
          currentSignature: { observedRows: observed },
          sampleEvidence: `Observed ${observed} rows versus baseline ${baseline}.`,
          recommendedAction: 'Confirm pagination/export completeness or use INCREMENTAL mode only when the file is intentionally partial.',
        }));
      }
    }
    return this.dedupeAlerts(alerts);
  }

  private async connectorDriftAlerts(
    provider: ExternalCourseProviderDto,
    connector: ICourseProviderConnectorAdapter,
    fetched: CourseProviderConnectorFetchResult,
  ): Promise<CourseProviderDriftAlert[]> {
    const alerts: CourseProviderDriftAlert[] = [];
    if (this.stableJson(connector.expectedSignature) !== this.stableJson(fetched.observedSignature)) {
      alerts.push(this.alert({
        provider,
        connectorId: connector.connectorKey,
        connectorVersion: connector.connectorVersion,
        driftType: 'SCHEMA_MISMATCH',
        previousSignature: connector.expectedSignature,
        currentSignature: fetched.observedSignature,
        sampleEvidence: 'Registered connector observed a source signature that differs from its approved signature.',
        recommendedAction: 'Halt ingestion and review the official source structure/connector implementation.',
      }));
    }

    const malformedRows: Array<{ index: number; reason: string }> = [];
    for (let index = 0; index < fetched.rows.length; index += 1) {
      const row = fetched.rows[index];
      if (!row.courseName.trim() || !row.providerLabel.trim() || !row.directCourseUrl.trim()) {
        malformedRows.push({ index: index + 1, reason: 'REQUIRED_FIELD_MISSING' });
        continue;
      }
      if (!/^(yes|no)$/i.test(row.studyFreeRaw.trim()) || !/^(yes|no)$/i.test(row.freeCertificateRaw.trim())) {
        malformedRows.push({ index: index + 1, reason: 'FREE_STATE_NOT_EXPLICIT_YES_NO' });
        continue;
      }
      let approvedDomain = false;
      try {
        const parsed = new URL(row.directCourseUrl);
        approvedDomain = parsed.protocol === 'https:'
          && await this.providerRepository.isDomainApproved(provider.id, row.directCourseUrl);
      } catch {
        approvedDomain = false;
      }
      if (!approvedDomain) malformedRows.push({ index: index + 1, reason: 'DIRECT_URL_DOMAIN_NOT_APPROVED' });
    }
    if (malformedRows.length > 0) {
      alerts.push(this.alert({
        provider,
        connectorId: connector.connectorKey,
        connectorVersion: connector.connectorVersion,
        driftType: 'SCHEMA_MISMATCH',
        previousSignature: 'Validated imported-course connector row contract + approved provider domains',
        currentSignature: { malformedRowCount: malformedRows.length },
        sampleEvidence: JSON.stringify(malformedRows.slice(0, 10)),
        recommendedAction: 'Fix connector mapping/source output before staging any rows.',
      }));
    }

    const providerLabels = [...new Set(fetched.rows.map((row) => row.providerLabel.trim()).filter(Boolean))];
    for (const label of providerLabels) {
      const resolved = await this.providerRepository.resolveByName(label);
      if (!resolved) {
        alerts.push(this.alert({
          provider,
          connectorId: connector.connectorKey,
          connectorVersion: connector.connectorVersion,
          driftType: 'PROVIDER_UNRESOLVED',
          previousSignature: provider.canonicalName,
          currentSignature: label,
          sampleEvidence: `Connector emitted unresolved provider label: ${label}`,
          recommendedAction: 'Fix connector mapping or approve a provider alias before staging.',
        }));
      } else if (resolved.id !== provider.id) {
        alerts.push(this.alert({
          provider,
          connectorId: connector.connectorKey,
          connectorVersion: connector.connectorVersion,
          driftType: 'PROVIDER_MISMATCH',
          previousSignature: provider.id,
          currentSignature: resolved.id,
          sampleEvidence: `Connector emitted rows resolving to provider ${resolved.publicId}.`,
          recommendedAction: 'Do not mix providers in a registered provider connector.',
        }));
      }
    }

    if (connector.mode === 'FULL_SNAPSHOT') {
      const baseline = await this.latestSnapshotBaseline(provider, PROVIDER_CONNECTOR_PREFIX)
        ?? (await this.importedOperationsRepository.listImportedCourses({ providerId: provider.id, page: 1, pageSize: 1 })).total;
      const observed = fetched.rows.length;
      if (observed === 0 || (baseline >= MIN_LOW_YIELD_BASELINE && observed < Math.floor(baseline * FULL_SNAPSHOT_LOW_YIELD_RATIO))) {
        alerts.push(this.alert({
          provider,
          connectorId: connector.connectorKey,
          connectorVersion: connector.connectorVersion,
          driftType: 'LOW_YIELD',
          previousSignature: { previousFullSnapshotRows: baseline },
          currentSignature: { observedRows: observed },
          sampleEvidence: `Connector produced ${observed} rows versus baseline ${baseline}.`,
          recommendedAction: 'Review pagination, selector/schema changes, and source availability before retrying.',
        }));
      }
    }
    return this.dedupeAlerts(alerts);
  }

  private summarizeAnalysis(analysis: any): CourseProviderContinuationSummary {
    const analyses = Array.isArray(analysis?.analyses) ? analysis.analyses : [];
    const countsByChangeState: Record<string, number> = {};
    let sameFileDuplicates = 0;
    let readyToTransfer = 0;
    let blockedOrConflict = 0;
    for (const item of analyses) {
      const state = String(item?.changeState ?? 'UNKNOWN');
      countsByChangeState[state] = (countsByChangeState[state] ?? 0) + 1;
      if (item?.matchState === 'SAME_BATCH_DUPLICATE') sameFileDuplicates += 1;
      const blocking = [
        CourseImportChangeState.AMBIGUOUS_MATCH,
        CourseImportChangeState.CONFLICT,
        CourseImportChangeState.INVALID,
        CourseImportChangeState.INCOMPLETE,
        CourseImportChangeState.REJECTED,
      ].includes(item?.changeState);
      if (blocking) blockedOrConflict += 1;
      if (!item?.requiresReview && !blocking && item?.matchState !== 'SAME_BATCH_DUPLICATE') {
        readyToTransfer += 1;
      }
    }
    return {
      totalAnalyzed: analyses.length,
      newSinceLastImport: countsByChangeState[CourseImportChangeState.NEW] ?? 0,
      unchanged: countsByChangeState[CourseImportChangeState.UNCHANGED] ?? 0,
      changedLinks: (countsByChangeState[CourseImportChangeState.URL_CHANGED] ?? 0)
        + (countsByChangeState[CourseImportChangeState.URL_AND_METADATA_CHANGED] ?? 0),
      metadataChanged: countsByChangeState[CourseImportChangeState.METADATA_CHANGED] ?? 0,
      changedUrlAndMetadata: countsByChangeState[CourseImportChangeState.URL_AND_METADATA_CHANGED] ?? 0,
      sameFileDuplicates,
      reviewRequired: analyses.filter((item: any) => Boolean(item?.requiresReview)).length,
      readyToTransfer,
      blockedOrConflict,
      countsByChangeState,
    };
  }

  private async assertProviderContinuationBatch(provider: ExternalCourseProviderDto, batchId: string): Promise<void> {
    const batch = await this.operationsUseCases.getBatch(batchId);
    const source = String(batch?.sourceSystem ?? '');
    if (!this.isProviderContinuationSource(provider, source)) {
      throw new Error('COURSE_PROVIDER_CONTINUATION_BATCH_PROVIDER_MISMATCH');
    }
  }

  private async latestSnapshotBaseline(
    provider: ExternalCourseProviderDto,
    prefix: string,
  ): Promise<number | null> {
    const matching = await this.importedOperationsRepository.listProviderCourseBatches({
      providerPublicId: provider.publicId,
      sourcePrefix: `${prefix}${provider.publicId}:FULL_SNAPSHOT`,
      limit: 1,
    });
    return matching.data.length ? Number(matching.data[0]?.totalRecords ?? 0) : null;
  }

  private isProviderContinuationSource(provider: ExternalCourseProviderDto, sourceSystem: string): boolean {
    return sourceSystem.startsWith(`${PROVIDER_FILE_PREFIX}${provider.publicId}:`)
      || sourceSystem.startsWith(`${PROVIDER_CONNECTOR_PREFIX}${provider.publicId}:`);
  }

  private async listProviderReviewRecords(providerId: string, limit: number): Promise<any[]> {
    const rows: any[] = [];
    let page = 1;
    while (rows.length < limit) {
      const result = await this.importedOperationsRepository.listProviderReviewQueue(providerId, { page, pageSize: 100 });
      rows.push(...result.data);
      if (page * result.pageSize >= result.total) break;
      page += 1;
    }
    return rows.slice(0, limit);
  }

  private assertFileStrategy(provider: ExternalCourseProviderDto): void {
    if (provider.importStrategy !== 'FILE' && provider.importStrategy !== 'MIXED') {
      throw new Error(`COURSE_PROVIDER_FILE_STRATEGY_NOT_ENABLED:${provider.importStrategy}`);
    }
  }

  private assertConnectorStrategy(provider: ExternalCourseProviderDto): void {
    if (provider.importStrategy !== 'CONNECTOR' && provider.importStrategy !== 'MIXED') {
      throw new Error(`COURSE_PROVIDER_CONNECTOR_STRATEGY_NOT_ENABLED:${provider.importStrategy}`);
    }
  }

  private async markProviderNeedsReview(provider: ExternalCourseProviderDto): Promise<void> {
    await this.providerRepository.upsertSeedProvider({
      publicId: provider.publicId,
      slug: provider.slug,
      canonicalName: provider.canonicalName,
      displayName: provider.displayName,
      providerType: provider.providerType ?? null,
      status: ExternalCourseProviderStatus.NEEDS_REVIEW,
      officialWebsite: provider.officialWebsite ?? null,
      operatingScope: provider.operatingScope ?? null,
      headquartersCountryReferenceId: provider.headquartersCountryReferenceId ?? null,
      sourceTrustLevel: provider.sourceTrustLevel,
      importStrategy: provider.importStrategy,
      connectorKey: provider.connectorKey ?? null,
      connectorVersion: provider.connectorVersion ?? null,
      lastVerifiedAt: provider.lastVerifiedAt ?? null,
      aliases: provider.aliases.map((alias) => ({
        alias: alias.alias,
        locale: alias.locale,
        source: alias.source,
      })),
      allowedDomains: provider.allowedDomains,
    });
  }

  private async requireProvider(providerRef: string): Promise<ExternalCourseProviderDto> {
    const ref = providerRef.trim();
    if (!ref) throw new Error('COURSE_PROVIDER_ID_REQUIRED');
    const provider = await this.providerRepository.findById(ref)
      ?? await this.providerRepository.findByPublicId(ref);
    if (!provider) throw new Error('COURSE_PROVIDER_NOT_FOUND');
    return provider;
  }

  private async requireApprovedProvider(providerRef: string): Promise<ExternalCourseProviderDto> {
    const provider = await this.requireProvider(providerRef);
    if (provider.status !== ExternalCourseProviderStatus.APPROVED) {
      throw new Error(`COURSE_PROVIDER_NOT_APPROVED:${provider.status}`);
    }
    return provider;
  }

  private providerFileSourceSystem(
    provider: ExternalCourseProviderDto,
    mode: CourseProviderContinuationMode,
  ): string {
    return `${PROVIDER_FILE_PREFIX}${provider.publicId}:${mode}`;
  }

  private providerConnectorSourceSystem(
    provider: ExternalCourseProviderDto,
    connector: ICourseProviderConnectorAdapter,
  ): string {
    return `${PROVIDER_CONNECTOR_PREFIX}${provider.publicId}:${connector.mode}:${connector.connectorKey}@${connector.connectorVersion}`;
  }

  private alert(input: {
    provider: ExternalCourseProviderDto;
    connectorId: string;
    connectorVersion: string;
    driftType: CourseProviderDriftAlert['driftType'];
    previousSignature: unknown;
    currentSignature: unknown;
    sampleEvidence: string;
    recommendedAction: string;
  }): CourseProviderDriftAlert {
    return {
      sourceId: input.provider.publicId,
      connectorId: input.connectorId,
      connectorVersion: input.connectorVersion,
      detectedAt: new Date().toISOString(),
      driftType: input.driftType,
      severity: input.driftType === 'LOW_YIELD' ? 'HIGH' : 'CRITICAL',
      previousSignature: input.previousSignature,
      currentSignature: input.currentSignature,
      sampleEvidence: input.sampleEvidence.slice(0, 1000),
      recommendedAction: input.recommendedAction,
    };
  }

  private dedupeAlerts(alerts: CourseProviderDriftAlert[]): CourseProviderDriftAlert[] {
    const seen = new Set<string>();
    return alerts.filter((alert) => {
      const key = `${alert.driftType}|${this.stableJson(alert.currentSignature)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private stableJson(value: unknown): string {
    const normalize = (item: unknown): unknown => {
      if (Array.isArray(item)) return item.map(normalize);
      if (item && typeof item === 'object') {
        return Object.fromEntries(
          Object.entries(item as Record<string, unknown>)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, nested]) => [key, normalize(nested)]),
        );
      }
      return item;
    };
    return JSON.stringify(normalize(value));
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
