import {
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  DegreeLevelStatus,
  IAcademicTaxonomyRepository,
  IDegreeLevelRepository,
  MajorDto,
  MajorImportPayload,
  PublicationReadinessIssue,
} from '@manaratak/domain';
import { AcademicTaxonomyResolver, TaxonomyResolutionResult } from './AcademicTaxonomyResolver';

/** Resolves and validates Major references against the canonical Phase 8 stores. */
export class CanonicalMajorReferenceService {
  constructor(
    private readonly taxonomyRepository: IAcademicTaxonomyRepository,
    private readonly degreeLevelRepository: IDegreeLevelRepository,
  ) {}

  public async resolve(payload: MajorImportPayload): Promise<TaxonomyResolutionResult> {
    await this.assertPayloadReferencesActive(payload);
    const nodes = await this.taxonomyRepository.listNodes({ status: AcademicTaxonomyStatus.ACTIVE });
    return new AcademicTaxonomyResolver(nodes.map(node => ({
      id: node.nodeId,
      canonicalCode: node.canonicalCode,
      canonicalName: node.canonicalName,
      nodeType: node.nodeType,
    }))).resolve(payload);
  }

  public async assertPayloadReferencesActive(payload: MajorImportPayload): Promise<void> {
    if (payload.degreeLevelId) {
      const degree = await this.degreeLevelRepository.getDegreeLevelById(payload.degreeLevelId);
      if (!degree || degree.status !== DegreeLevelStatus.ACTIVE) {
        throw new Error('MAJOR_CANONICAL_DEGREE_REFERENCE_NOT_ACTIVE');
      }
    }
    await this.assertTaxonomyReference(payload.academicFieldId, AcademicTaxonomyNodeType.ACADEMIC_FIELD);
    await this.assertTaxonomyReference(payload.disciplineId, AcademicTaxonomyNodeType.DISCIPLINE);
  }

  public async publicationIssues(major: MajorDto): Promise<PublicationReadinessIssue[]> {
    const issues: PublicationReadinessIssue[] = [];
    const degreeIds = new Set((major.profiles ?? []).map(profile => profile.degreeLevelId).filter(Boolean) as string[]);
    for (const id of degreeIds) {
      const degree = await this.degreeLevelRepository.getDegreeLevelById(id);
      if (!degree || degree.status !== DegreeLevelStatus.ACTIVE) {
        issues.push({ code: 'MAJOR_CANONICAL_DEGREE_REFERENCE_NOT_ACTIVE', message: 'Degree-level reference must resolve to an active canonical entity', field: 'profiles.degreeLevelId' });
      }
    }

    const taxonomyIds = new Set<string>();
    if (major.academicFieldId) taxonomyIds.add(major.academicFieldId);
    if (major.disciplineId) taxonomyIds.add(major.disciplineId);
    for (const profile of major.profiles ?? []) {
      if (profile.academicFieldId) taxonomyIds.add(profile.academicFieldId);
      if (profile.disciplineId) taxonomyIds.add(profile.disciplineId);
      for (const mapping of profile.classificationMappings ?? []) taxonomyIds.add(mapping.taxonomyNodeId);
    }
    for (const mapping of major.classificationMappings ?? []) taxonomyIds.add(mapping.taxonomyNodeId);
    for (const id of taxonomyIds) {
      const node = await this.taxonomyRepository.getNode(id);
      if (!node || node.status !== AcademicTaxonomyStatus.ACTIVE) {
        issues.push({ code: 'MAJOR_CANONICAL_TAXONOMY_REFERENCE_NOT_ACTIVE', message: 'Taxonomy reference must resolve to an active canonical entity', field: 'classificationMappings.taxonomyNodeId' });
      }
    }
    return issues;
  }

  private async assertTaxonomyReference(id: string | undefined, expectedType: AcademicTaxonomyNodeType): Promise<void> {
    if (!id) return;
    const node = await this.taxonomyRepository.getNode(id);
    if (!node || node.status !== AcademicTaxonomyStatus.ACTIVE || node.nodeType !== expectedType) {
      throw new Error('MAJOR_CANONICAL_TAXONOMY_REFERENCE_NOT_ACTIVE');
    }
  }
}
