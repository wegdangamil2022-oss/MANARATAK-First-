import { createHash } from 'crypto';
import {
  AssetId,
  AssetLifecycleState,
  IAssetRecordRepository,
  IAssetStorageGateway,
  IExternalCourseProviderRepository,
  ImportTargetDomain,
  ImportedCourseMasterRowContract,
} from '@manaratak/domain';
import { ImportAdminUseCases } from '../../import-foundation/use-cases/ImportAdminUseCases';
import {
  CourseMasterArtifactIssue,
  CourseMasterArtifactParser,
  CourseMasterParseResult,
} from '../parsers/CourseMasterArtifactParser';

export interface CourseArtifactPreflightInput {
  assetId: string;
  sourceSystem?: string;
  expectedSha256?: string;
}

export interface CourseArtifactProviderSummary {
  label: string;
  rowCount: number;
  resolved: boolean;
  providerId?: string;
  providerPublicId?: string;
  canonicalName?: string;
  domainMismatchCount: number;
}

export interface CourseArtifactPreflightResult {
  valid: boolean;
  artifact: {
    assetId: string;
    originalFilename: string;
    mimeType: string;
    byteSize: number;
    sha256: string;
    format: string;
    sheetName: string;
  };
  summary: {
    rowsFound: number;
    validRows: number;
    incompleteRows: number;
    ignoredBlankRows: number;
    providersDiscovered: number;
    providersResolved: number;
    providersUnresolved: number;
  };
  providers: CourseArtifactProviderSummary[];
  issues: CourseMasterArtifactIssue[];
  rowIssues: Array<{ sourceRowNumber: number; issues: CourseMasterArtifactIssue[] }>;
  unknownColumns: string[];
  security?: CourseMasterParseResult['security'];
}

const MAX_ASSET_READ_BYTES = 25 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const IMPORT_SCAN_PAGE_SIZE = 100;

function yesNo(value: string): boolean {
  return /^(yes|no)$/i.test(value.trim());
}

function validHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function nonemptySourceFields(row: ImportedCourseMasterRowContract): Array<[string, string]> {
  return [
    ['Certificate Type', row.certificateTypeRaw],
    ['Language', row.languageRaw],
    ['Study Level', row.studyLevelRaw],
    ['Course Duration', row.courseDurationRaw],
    ['Short Course Topics (4)', row.shortCourseTopicsRaw],
  ];
}

export class CourseImportArtifactUseCase {
  public constructor(
    private readonly assetRepository: IAssetRecordRepository,
    private readonly assetStorageGateway: IAssetStorageGateway,
    private readonly providerRepository: IExternalCourseProviderRepository,
    private readonly importAdminUseCases: ImportAdminUseCases,
  ) {}

  public async preflight(input: CourseArtifactPreflightInput): Promise<CourseArtifactPreflightResult> {
    return (await this.prepare(input)).preflight;
  }

  public async stage(input: CourseArtifactPreflightInput): Promise<{
    duplicateArtifact: boolean;
    existingBatchId?: string;
    preflight: CourseArtifactPreflightResult;
    staging?: unknown;
  }> {
    const prepared = await this.prepare(input);
    if (!prepared.preflight.valid) {
      throw new Error('COURSE_ARTIFACT_PREFLIGHT_FAILED');
    }

    const existingBatchId = await this.findExistingArtifactBatch(prepared.sha256);
    if (existingBatchId) {
      return {
        duplicateArtifact: true,
        existingBatchId,
        preflight: prepared.preflight,
      };
    }

    const errorIssuesByRow = new Map<number, CourseMasterArtifactIssue[]>();
    for (const entry of prepared.preflight.rowIssues) {
      const errors = entry.issues.filter((issue) => issue.severity === 'ERROR');
      if (errors.length > 0) errorIssuesByRow.set(entry.sourceRowNumber, errors);
    }

    const rows = prepared.parsed.rows.map(({ row, sourceRowNumber }) => ({
      ...row,
      _assetId: input.assetId,
      _artifactSha256: prepared.sha256,
      _sourceFilename: prepared.asset.metadata.originalFilename,
      _sourceSheetName: prepared.parsed.sheetName,
      _worksheetRowNumber: sourceRowNumber,
    }));

    const validationIssues = prepared.parsed.rows.map(({ sourceRowNumber }) =>
      errorIssuesByRow.get(sourceRowNumber) ?? [],
    );

    const staging = await this.importAdminUseCases.stageNormalizedRows({
      ownerDomain: ImportTargetDomain.Courses,
      sourceSystem: input.sourceSystem?.trim() || 'COURSE_MASTER_ARTIFACT',
      rows,
      validationIssues,
    });

    return {
      duplicateArtifact: false,
      preflight: prepared.preflight,
      staging,
    };
  }

  private async findExistingArtifactBatch(artifactSha256: string): Promise<string | undefined> {
    let page = 1;
    while (true) {
      const result = await this.importAdminUseCases.listRecords({
        dataType: ImportTargetDomain.Courses,
        page,
        pageSize: IMPORT_SCAN_PAGE_SIZE,
      });

      for (const record of result.data ?? []) {
        const raw = record.rawPayload;
        if (
          raw &&
          typeof raw === 'object' &&
          !Array.isArray(raw) &&
          (raw as Record<string, unknown>)._artifactSha256 === artifactSha256
        ) {
          return record.batchId ?? record.batch?.id;
        }
      }

      if (page * IMPORT_SCAN_PAGE_SIZE >= Number(result.total ?? 0)) return undefined;
      page += 1;
    }
  }

  private async prepare(input: CourseArtifactPreflightInput): Promise<{
    asset: any;
    sha256: string;
    parsed: CourseMasterParseResult;
    preflight: CourseArtifactPreflightResult;
  }> {
    if (!input.assetId?.trim()) throw new Error('COURSE_ARTIFACT_ASSET_ID_REQUIRED');

    const asset = await this.assetRepository.findById(new AssetId(input.assetId));
    if (!asset) throw new Error(`COURSE_ARTIFACT_ASSET_NOT_FOUND:${input.assetId}`);
    if (asset.state !== AssetLifecycleState.ACTIVE) {
      throw new Error(`COURSE_ARTIFACT_ASSET_NOT_ACTIVE:${asset.state}`);
    }
    if (!this.assetStorageGateway.read) {
      throw new Error('COURSE_ARTIFACT_STORAGE_READ_UNAVAILABLE');
    }

    const bytes = await this.assetStorageGateway.read(asset.locator, MAX_ASSET_READ_BYTES);
    const sha256 = createHash('sha256').update(Buffer.from(bytes)).digest('hex');

    if (input.expectedSha256) {
      const expected = input.expectedSha256.trim().toLowerCase();
      if (!SHA256_PATTERN.test(expected)) {
        throw new Error('COURSE_ARTIFACT_EXPECTED_SHA256_INVALID');
      }
      if (expected !== sha256) {
        throw new Error(`COURSE_ARTIFACT_SHA256_MISMATCH:${expected}:${sha256}`);
      }
    }

    const parsed = await CourseMasterArtifactParser.parse({
      bytes,
      originalFilename: asset.metadata.originalFilename,
      mimeType: asset.metadata.mimeType,
      declaredByteSize: asset.metadata.byteSize,
    });

    const preflight = await this.analyze(input.assetId, asset, sha256, parsed);
    return { asset, sha256, parsed, preflight };
  }

  private async analyze(
    assetId: string,
    asset: any,
    sha256: string,
    parsed: CourseMasterParseResult,
  ): Promise<CourseArtifactPreflightResult> {
    const issues = [...parsed.issues];
    const rowIssues = new Map<number, CourseMasterArtifactIssue[]>();
    const providerRows = new Map<string, typeof parsed.rows>();

    for (const issue of parsed.issues) {
      if (issue.rowNumber === undefined) continue;
      rowIssues.set(issue.rowNumber, [...(rowIssues.get(issue.rowNumber) ?? []), issue]);
    }

    const addRowIssue = (sourceRowNumber: number, issue: CourseMasterArtifactIssue) => {
      const current = rowIssues.get(sourceRowNumber) ?? [];
      current.push(issue);
      rowIssues.set(sourceRowNumber, current);
      issues.push(issue);
    };

    for (const parsedRow of parsed.rows) {
      const { row, sourceRowNumber } = parsedRow;
      const providerLabel = row.providerLabel.trim();
      const group = providerRows.get(providerLabel) ?? [];
      group.push(parsedRow);
      providerRows.set(providerLabel, group);

      if (!providerLabel) {
        addRowIssue(sourceRowNumber, {
          code: 'COURSE_PROVIDER_REQUIRED',
          message: 'Platform / University is required.',
          severity: 'ERROR',
          rowNumber: sourceRowNumber,
          column: 'Platform / University',
        });
      }
      if (!row.courseName.trim()) {
        addRowIssue(sourceRowNumber, {
          code: 'COURSE_NAME_REQUIRED',
          message: 'Course Name is required.',
          severity: 'ERROR',
          rowNumber: sourceRowNumber,
          column: 'Course Name',
        });
      }
      if (!validHttpsUrl(row.directCourseUrl)) {
        addRowIssue(sourceRowNumber, {
          code: 'COURSE_DIRECT_URL_INVALID',
          message: 'Direct Course URL must be an absolute HTTPS URL.',
          severity: 'ERROR',
          rowNumber: sourceRowNumber,
          column: 'Direct Course URL',
        });
      }
      if (!yesNo(row.studyFreeRaw)) {
        addRowIssue(sourceRowNumber, {
          code: 'COURSE_STUDY_FREE_EXPLICIT_YES_NO_REQUIRED',
          message: 'Study Free must be explicit Yes or No.',
          severity: 'ERROR',
          rowNumber: sourceRowNumber,
          column: 'Study Free',
        });
      }
      if (!yesNo(row.freeCertificateRaw)) {
        addRowIssue(sourceRowNumber, {
          code: 'COURSE_FREE_CERTIFICATE_EXPLICIT_YES_NO_REQUIRED',
          message: 'Free Certificate must be explicit Yes or No.',
          severity: 'ERROR',
          rowNumber: sourceRowNumber,
          column: 'Free Certificate',
        });
      }
      for (const [column, value] of nonemptySourceFields(row)) {
        if (!value.trim()) {
          addRowIssue(sourceRowNumber, {
            code: 'COURSE_SOURCE_VALUE_REQUIRED',
            message: `${column} must contain the official value or an explicit source placeholder.`,
            severity: 'ERROR',
            rowNumber: sourceRowNumber,
            column,
          });
        }
      }
    }

    const providers: CourseArtifactProviderSummary[] = [];
    const domainApprovalCache = new Map<string, boolean>();
    for (const [label, rows] of providerRows.entries()) {
      if (!label) {
        providers.push({
          label,
          rowCount: rows.length,
          resolved: false,
          domainMismatchCount: rows.length,
        });
        continue;
      }

      const provider = await this.providerRepository.resolveByName(label);
      if (!provider) {
        for (const item of rows) {
          addRowIssue(item.sourceRowNumber, {
            code: 'COURSE_PROVIDER_UNRESOLVED',
            message: `Provider is not present in the approved registry: ${label}`,
            severity: 'ERROR',
            rowNumber: item.sourceRowNumber,
            column: 'Platform / University',
          });
        }
        providers.push({
          label,
          rowCount: rows.length,
          resolved: false,
          domainMismatchCount: 0,
        });
        continue;
      }

      let domainMismatchCount = 0;
      for (const item of rows) {
        if (!validHttpsUrl(item.row.directCourseUrl)) continue;
        const hostname = new URL(item.row.directCourseUrl).hostname.toLowerCase();
        const cacheKey = `${provider.id}|${hostname}`;
        let approved = domainApprovalCache.get(cacheKey);
        if (approved === undefined) {
          approved = await this.providerRepository.isDomainApproved(provider.id, hostname);
          domainApprovalCache.set(cacheKey, approved);
        }
        if (!approved) {
          domainMismatchCount += 1;
          addRowIssue(item.sourceRowNumber, {
            code: 'COURSE_PROVIDER_DOMAIN_NOT_APPROVED',
            message: `Direct Course URL is outside approved domains for ${provider.canonicalName}.`,
            severity: 'ERROR',
            rowNumber: item.sourceRowNumber,
            column: 'Direct Course URL',
          });
        }
      }

      providers.push({
        label,
        rowCount: rows.length,
        resolved: true,
        providerId: provider.id,
        providerPublicId: provider.publicId,
        canonicalName: provider.canonicalName,
        domainMismatchCount,
      });
    }

    let validRows = 0;
    let incompleteRows = 0;
    for (const item of parsed.rows) {
      const hasError = (rowIssues.get(item.sourceRowNumber) ?? []).some(
        (issue) => issue.severity === 'ERROR',
      );
      if (hasError) incompleteRows += 1;
      else validRows += 1;
    }

    const parserErrors = parsed.issues.filter((issue) => issue.severity === 'ERROR');
    const resolvedProviders = providers.filter((provider) => provider.resolved).length;

    return {
      valid: parserErrors.length === 0 && parsed.rows.length > 0,
      artifact: {
        assetId,
        originalFilename: asset.metadata.originalFilename,
        mimeType: asset.metadata.mimeType,
        byteSize: asset.metadata.byteSize,
        sha256,
        format: parsed.format,
        sheetName: parsed.sheetName,
      },
      summary: {
        rowsFound: parsed.rows.length,
        validRows,
        incompleteRows,
        ignoredBlankRows: parsed.ignoredBlankRows,
        providersDiscovered: providers.length,
        providersResolved: resolvedProviders,
        providersUnresolved: providers.length - resolvedProviders,
      },
      providers,
      issues,
      rowIssues: [...rowIssues.entries()]
        .sort(([a], [b]) => a - b)
        .map(([sourceRowNumber, rowIssueList]) => ({
          sourceRowNumber,
          issues: rowIssueList,
        })),
      unknownColumns: parsed.unknownColumns,
      security: parsed.security,
    };
  }
}
