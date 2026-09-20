import { CsvImportStreamParser } from '../../import-foundation/parsers/CsvImportStreamParser';
import { NdjsonImportStreamParser } from '../../import-foundation/parsers/NdjsonImportStreamParser';
import { InlineDataParser } from '../../import-foundation/parsers/InlineDataParser';
import type { IImportRawSnapshotStore, ISourceRegistryGateway, AcquireImportSourceUseCase, ImportAdminUseCases } from '../../index.js';
import { ImportParseError, ParsedImportRow, type ImportSourceDefinition } from '@manaratak/domain';
import type { ScholarshipAcquisitionPlanner } from '../source-registry/ScholarshipAcquisitionPlanner';
import type { ScholarshipSourceConfiguration } from '../source-registry/ScholarshipSourceRegistryContracts';

export type ScholarshipImportNewResult =
  | { state: 'STAGED'; snapshot: Awaited<ReturnType<IImportRawSnapshotStore['store']>>; staging: Awaited<ReturnType<ImportAdminUseCases['stageNormalizedRows']>> }
  | { state: 'ACQUIRED_AWAITING_EXTRACTION_MAPPING'; snapshot: Awaited<ReturnType<IImportRawSnapshotStore['store']>>; reason: string }
  | { state: 'REJECTED_SOURCE'; reason: string }
  | { state: 'FAILED'; reason: string };

export class ScholarshipImportNewUseCase {
  constructor(
    private readonly sourceRegistry: ISourceRegistryGateway,
    private readonly planner: ScholarshipAcquisitionPlanner,
    private readonly acquisition: AcquireImportSourceUseCase,
    private readonly importAdmin: ImportAdminUseCases,
  ) {}
  async execute(input: { sourceId: string; targetUrl?: string; manualInput?: { rawBytes?: Uint8Array; structuredContent?: unknown; fileName?: string; contentType?: string; approvedAssetReference?: string }; parserHint?: 'json' | 'ndjson' | 'csv'; correlationId?: string; executionId?: string; importSessionId?: string }): Promise<ScholarshipImportNewResult> {
    const source = await this.sourceRegistry.getSource(input.sourceId);
    if (!source || source.metadata?.ownerDomain !== 'SCHOLARSHIPS') return { state: 'REJECTED_SOURCE', reason: 'SCHOLARSHIP_SOURCE_NOT_FOUND_OR_NOT_OWNED' };
    const configuration = this.configuration(source); let plan;
    try { plan = this.planner.prepare(configuration, input.targetUrl); } catch (error) { return { state: 'REJECTED_SOURCE', reason: error instanceof Error ? error.message : 'SCHOLARSHIP_SOURCE_REJECTED' }; }
    try {
      const manualInput = input.manualInput?.structuredContent !== undefined
        ? { rawBytes: new TextEncoder().encode(JSON.stringify(input.manualInput.structuredContent)), fileName: input.manualInput.fileName, contentType: input.manualInput.contentType ?? 'application/json', assetReference: input.manualInput.approvedAssetReference }
        : input.manualInput?.rawBytes ? { rawBytes: input.manualInput.rawBytes, fileName: input.manualInput.fileName, contentType: input.manualInput.contentType, assetReference: input.manualInput.approvedAssetReference } : undefined;
      const acquired = await this.acquisition.execute(source, { targetUrl: plan.targetUrl ?? undefined, manualInput });
      const rows = await this.rows(acquired.acquisition.rawBytes, input.parserHint, acquired.acquisition.contentType);
      if (!rows) return { state: 'ACQUIRED_AWAITING_EXTRACTION_MAPPING', snapshot: acquired.snapshot, reason: 'NO_APPROVED_GENERIC_EXTRACTION_MAPPING' };
      const staging = await this.importAdmin.stageNormalizedRows({ ownerDomain: 'SCHOLARSHIPS', sourceSystem: source.sourceId, rows, handoffContext: { artifactId: acquired.snapshot.artifactId, rawArtifactReference: acquired.snapshot.rawArtifactReference, correlationId: input.correlationId, executionId: input.executionId, importSessionId: input.importSessionId, attempt: acquired.attempts, referenceMetadata: { contentHash: acquired.snapshot.contentHash } } });
      return { state: 'STAGED', snapshot: acquired.snapshot, staging };
    } catch (error) { return { state: 'FAILED', reason: error instanceof Error ? error.message : 'SCHOLARSHIP_IMPORT_NEW_FAILED' }; }
  }
  private configuration(source: ImportSourceDefinition): ScholarshipSourceConfiguration {
    const metadata = source.metadata ?? {}; return { sourceId: source.sourceId, sourceName: source.displayName, baseUrl: source.baseUrl.startsWith('manual://') ? undefined : source.baseUrl, sourceType: (metadata.scholarshipSourceType as ScholarshipSourceConfiguration['sourceType']) ?? 'MANUAL_FILE', status: source.status === 'ACTIVE' ? 'ACTIVE' : 'DISABLED', acquisitionMode: (metadata.acquisitionMode as ScholarshipSourceConfiguration['acquisitionMode']) ?? 'MANUAL_FILE', allowedUrlScope: metadata.allowedUrlScope as ScholarshipSourceConfiguration['allowedUrlScope'], rateLimitPolicy: metadata.rateLimitPolicy as ScholarshipSourceConfiguration['rateLimitPolicy'], lastExecution: (metadata.lastExecution as ScholarshipSourceConfiguration['lastExecution']) ?? { state: 'NEVER_RUN' } };
  }
  private async rows(bytes: Uint8Array, hint?: 'json' | 'ndjson' | 'csv', contentType?: string): Promise<Array<Record<string, unknown>> | null> {
    const format = hint ?? (contentType?.includes('ndjson') ? 'ndjson' : contentType?.includes('csv') ? 'csv' : contentType?.includes('json') ? 'json' : undefined);
    if (format === 'json') { try { const value = await InlineDataParser.parse(new TextDecoder().decode(bytes)) as unknown[]; return value.length > 0 && value.every((row) => row && typeof row === 'object' && !Array.isArray(row)) ? value as Array<Record<string, unknown>> : null; } catch { return null; } }
    const parser = format === 'csv' ? new CsvImportStreamParser() : format === 'ndjson' ? new NdjsonImportStreamParser() : null;
    if (!parser) return null;
    const stream = { async *[Symbol.asyncIterator]() { yield bytes; } };
    const rows: Array<Record<string, unknown>> = [];
    for await (const output of parser.parse(stream, { batchId: 'scholarship-import-new' })) {
      if (output instanceof ImportParseError) return null;
      if (output instanceof ParsedImportRow) rows.push(output.raw);
    }
    return rows.length ? rows : null;
  }
}
