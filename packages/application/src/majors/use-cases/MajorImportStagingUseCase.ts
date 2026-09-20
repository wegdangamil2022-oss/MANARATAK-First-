import { ImportTargetDomain } from '@manaratak/domain';
import { ImportAdminUseCases } from '../../import-foundation/use-cases/ImportAdminUseCases';
import { MajorCatalogKind, MajorCatalogMarkdownParser, MajorCatalogRow } from '../services/MajorCatalogMarkdownParser';
import { MajorDetailDossierMarkdownParser, MajorDetailDossierRow } from '../services/MajorDetailDossierMarkdownParser';

export interface MajorTextImportFile {
  dataText: string;
  sourceFileName?: string;
  sourceSystem?: string;
}

export interface MajorMultiTextImportInput {
  catalogKind?: MajorCatalogKind;
  sourceSystem?: string;
  files: MajorTextImportFile[];
}

export class MajorImportStagingUseCase {
  constructor(private readonly importFoundation: ImportAdminUseCases) {}

  async importMajorCatalogText(input: MajorTextImportFile & { catalogKind?: MajorCatalogKind }) {
    const parsed = MajorCatalogMarkdownParser.parse(input.dataText, input.catalogKind);
    const staged = await this.importFoundation.stageNormalizedRows({
      ownerDomain: parsed.targetDomain,
      sourceSystem: input.sourceSystem || input.sourceFileName || `PHASE_10_${parsed.catalogKind}_CATALOG`,
      rows: parsed.rows.map((row) => ({ ...row, sourceFileName: input.sourceFileName }))
    });
    return { ...staged, summary: { ...staged.summary, catalogKind: parsed.catalogKind, skippedRows: parsed.skippedRows, importMode: 'CATALOG_IDENTITY_ONLY' } };
  }

  previewMajorCatalogText(input: Pick<MajorTextImportFile, 'dataText' | 'sourceFileName'> & { catalogKind?: MajorCatalogKind }) {
    const parsed = MajorCatalogMarkdownParser.parse(input.dataText, input.catalogKind);
    return {
      summary: {
        catalogKind: parsed.catalogKind,
        targetDomain: parsed.targetDomain,
        totalRecords: parsed.rows.length,
        skippedRows: parsed.skippedRows,
        importMode: 'CATALOG_IDENTITY_ONLY',
        sourceFileName: input.sourceFileName,
        duplicatePolicy: 'Major identity is resolved by the owning Major domain during promotion.',
        reviewPolicy: 'Records remain staged until the owning Major domain reviews and promotes them.'
      },
      previewRows: parsed.rows.slice(0, 25).map((row) => this.catalogPreview(row))
    };
  }

  async importMajorCatalogFiles(input: MajorMultiTextImportInput) {
    return this.importFiles(input, (file) => this.importMajorCatalogText({ ...file, catalogKind: input.catalogKind }));
  }

  previewMajorCatalogFiles(input: MajorMultiTextImportInput) {
    return this.previewFiles(input, (file) => this.previewMajorCatalogText({ ...file, catalogKind: input.catalogKind }));
  }

  async importMajorDetailDossierText(input: MajorTextImportFile & { catalogKind?: MajorCatalogKind }) {
    const parsed = MajorDetailDossierMarkdownParser.parse(input.dataText, input.catalogKind);
    const staged = await this.importFoundation.stageNormalizedRows({
      ownerDomain: parsed.targetDomain,
      sourceSystem: input.sourceSystem || input.sourceFileName || `PHASE_10_${parsed.catalogKind}_DETAIL_DOSSIER`,
      rows: parsed.rows.map((row) => ({ ...row, sourceFileName: input.sourceFileName }))
    });
    return {
      ...staged,
      summary: {
        ...staged.summary,
        catalogKind: parsed.catalogKind,
        skippedSections: parsed.skippedSections,
        totalContentSections: parsed.rows.reduce((sum, row) => sum + row.contentBlocks.length, 0),
        importMode: 'DETAIL_DOSSIER'
      }
    };
  }

  previewMajorDetailDossierText(input: Pick<MajorTextImportFile, 'dataText' | 'sourceFileName'> & { catalogKind?: MajorCatalogKind }) {
    const parsed = MajorDetailDossierMarkdownParser.parse(input.dataText, input.catalogKind);
    return {
      summary: {
        catalogKind: parsed.catalogKind,
        targetDomain: parsed.targetDomain,
        totalRecords: parsed.rows.length,
        skippedSections: parsed.skippedSections,
        totalContentSections: parsed.rows.reduce((sum, row) => sum + row.contentBlocks.length, 0),
        importMode: 'DETAIL_DOSSIER',
        sourceFileName: input.sourceFileName,
        duplicatePolicy: 'Dossier matching and version resolution belong to the owning Major domain.',
        reviewPolicy: 'Extracted sections remain reviewable until domain promotion.'
      },
      previewRows: parsed.rows.slice(0, 25).map((row) => this.dossierPreview(row))
    };
  }

  async importMajorDetailDossierFiles(input: MajorMultiTextImportInput) {
    return this.importFiles(input, (file) => this.importMajorDetailDossierText({ ...file, catalogKind: input.catalogKind }));
  }

  previewMajorDetailDossierFiles(input: MajorMultiTextImportInput) {
    return this.previewFiles(input, (file) => this.previewMajorDetailDossierText({ ...file, catalogKind: input.catalogKind }));
  }

  private normalizeFiles(files: MajorTextImportFile[]): MajorTextImportFile[] {
    const normalized = files.map((file) => ({
      ...file,
      dataText: file.dataText?.trim() ?? '',
      sourceFileName: file.sourceFileName?.trim() || undefined,
      sourceSystem: file.sourceSystem?.trim() || undefined
    })).filter((file) => file.dataText.length > 0);
    if (normalized.length === 0) throw new Error('At least one non-empty major import file is required.');
    return normalized;
  }

  private async importFiles(input: MajorMultiTextImportInput, run: (file: MajorTextImportFile) => Promise<any>) {
    const files = this.normalizeFiles(input.files);
    const results = [];
    for (const file of files) results.push(await run({ ...file, sourceSystem: file.sourceSystem || input.sourceSystem }));
    return {
      summary: {
        catalogKind: input.catalogKind ?? results[0]?.summary.catalogKind,
        totalFiles: files.length,
        totalRecords: results.reduce((sum, item) => sum + item.summary.totalRecords, 0),
        processedRecords: results.reduce((sum, item) => sum + item.summary.processedRecords, 0),
        failedRecords: results.reduce((sum, item) => sum + item.summary.failedRecords, 0),
        stagedRecords: results.reduce((sum, item) => sum + item.summary.stagedRecords, 0),
        skippedRows: results.reduce((sum, item) => sum + (item.summary.skippedRows || 0), 0),
        skippedSections: results.reduce((sum, item) => sum + (item.summary.skippedSections || 0), 0),
        totalContentSections: results.reduce((sum, item) => sum + (item.summary.totalContentSections || 0), 0),
        importMode: results[0]?.summary.importMode,
        batchIds: results.map((item) => item.batch?.id).filter(Boolean)
      },
      files: results.map((result, index) => ({ sourceFileName: files[index].sourceFileName, ...result }))
    };
  }

  private previewFiles(input: MajorMultiTextImportInput, run: (file: MajorTextImportFile) => any) {
    const files = this.normalizeFiles(input.files);
    const previews = files.map(run);
    return {
      summary: {
        catalogKind: input.catalogKind ?? previews[0]?.summary.catalogKind,
        targetDomain: previews[0]?.summary.targetDomain ?? ImportTargetDomain.Majors,
        totalFiles: files.length,
        totalRecords: previews.reduce((sum, item) => sum + item.summary.totalRecords, 0),
        skippedRows: previews.reduce((sum, item) => sum + (item.summary.skippedRows || 0), 0),
        skippedSections: previews.reduce((sum, item) => sum + (item.summary.skippedSections || 0), 0),
        totalContentSections: previews.reduce((sum, item) => sum + (item.summary.totalContentSections || 0), 0),
        importMode: previews[0]?.summary.importMode
      },
      files: previews.map((preview, index) => ({ sourceFileName: files[index].sourceFileName, ...preview }))
    };
  }

  private catalogPreview(row: MajorCatalogRow) {
    return {
      code: row.code, catalogKind: row.catalogKind, targetDomain: row.targetDomain,
      canonicalMajorName: row.canonicalMajorName, localizedNames: row.localizedNames,
      degreeLevel: row.degreeLevel, academicFieldOrDiscipline: row.academicFieldOrDiscipline,
      collegeOrFaculty: row.collegeOrFaculty, fellowshipType: row.fellowshipType,
      professionalDomain: row.professionalDomain
    };
  }

  private dossierPreview(row: MajorDetailDossierRow) {
    return {
      code: row.code, catalogKind: row.catalogKind, targetDomain: row.targetDomain,
      canonicalMajorName: row.canonicalMajorName, localizedNames: row.localizedNames,
      degreeLevel: row.degreeLevel, contentSectionCount: row.contentBlocks.length,
      contentSections: row.contentBlocks.slice(0, 8).map(({ blockKey, title, reviewStatus }) => ({ blockKey, title, reviewStatus }))
    };
  }
}
