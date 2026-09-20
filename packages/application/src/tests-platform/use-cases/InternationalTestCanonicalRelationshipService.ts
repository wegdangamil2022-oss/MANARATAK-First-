import {
  AcademicTaxonomyStatus,
  CanonicalDegreeLevelCode,
  IAcademicTaxonomyRepository,
  IDegreeLevelRepository,
  IReferenceResolver,
  UpsertInternationalTestAcademicTaxonomyRelationshipDto,
  UpsertInternationalTestDegreeRelationshipReference,
  UpsertInternationalTestDto,
  UpsertInternationalTestReferenceRelationshipDto,
} from '@manaratak/domain';

export interface CanonicalInternationalTestRelationships {
  countryRelationships?: UpsertInternationalTestReferenceRelationshipDto[];
  languageRelationships?: UpsertInternationalTestReferenceRelationshipDto[];
  academicTaxonomyRelationships?: UpsertInternationalTestAcademicTaxonomyRelationshipDto[];
  degreeRelationships?: UpsertInternationalTestDegreeRelationshipReference[];
}

/**
 * One fail-closed canonical relationship boundary for every Phase 9 write path.
 * Codes are compatibility/projection metadata; stable canonical IDs are authoritative.
 */
export class InternationalTestCanonicalRelationshipService {
  constructor(
    private readonly referenceResolver?: IReferenceResolver,
    private readonly degreeLevelRepository?: IDegreeLevelRepository,
    private readonly academicTaxonomyRepository?: IAcademicTaxonomyRepository,
  ) {}

  public async canonicalize(
    data: Partial<UpsertInternationalTestDto>,
  ): Promise<CanonicalInternationalTestRelationships> {
    return {
      ...(data.countryRelationships !== undefined
        ? { countryRelationships: await this.canonicalizeReferences('COUNTRY', data.countryRelationships) }
        : {}),
      ...(data.languageRelationships !== undefined
        ? { languageRelationships: await this.canonicalizeReferences('LANGUAGE', data.languageRelationships) }
        : {}),
      ...(data.academicTaxonomyRelationships !== undefined
        ? { academicTaxonomyRelationships: await this.canonicalizeTaxonomy(data.academicTaxonomyRelationships) }
        : {}),
      ...(data.degreeRelationships !== undefined
        ? { degreeRelationships: await this.canonicalizeDegrees(data.degreeRelationships) }
        : {}),
    };
  }

  private async canonicalizeReferences(
    type: 'COUNTRY' | 'LANGUAGE',
    relationships: UpsertInternationalTestReferenceRelationshipDto[],
  ): Promise<UpsertInternationalTestReferenceRelationshipDto[]> {
    if (!this.referenceResolver) throw new Error('Canonical Reference resolver is not configured');

    const result: UpsertInternationalTestReferenceRelationshipDto[] = [];
    for (const relationship of relationships) {
      if (!relationship.canonicalReferenceId?.trim()) {
        throw new Error(`${type}_CANONICAL_REFERENCE_ID_REQUIRED`);
      }
      if (!relationship.relationshipType?.trim()) {
        throw new Error(`${type}_RELATIONSHIP_TYPE_REQUIRED`);
      }

      const resolved = type === 'COUNTRY'
        ? await this.referenceResolver.resolveCountry({ id: relationship.canonicalReferenceId })
        : await this.referenceResolver.resolveLanguage({ id: relationship.canonicalReferenceId });
      if (!resolved?.active) {
        throw new Error(`Active canonical ${type} not found: ${relationship.canonicalReferenceId}`);
      }
      if (!resolved.standardCode?.trim()) {
        throw new Error(`Canonical ${type} standard code not found: ${relationship.canonicalReferenceId}`);
      }
      if (relationship.referenceCode &&
          relationship.referenceCode.trim().toUpperCase() !== resolved.standardCode.trim().toUpperCase()) {
        throw new Error(`${type}_REFERENCE_ID_CODE_MISMATCH`);
      }

      result.push({
        ...relationship,
        canonicalReferenceId: resolved.id,
        referenceCode: resolved.standardCode.trim(),
        relationshipType: relationship.relationshipType.trim(),
      });
    }
    return result;
  }

  private async canonicalizeTaxonomy(
    relationships: UpsertInternationalTestAcademicTaxonomyRelationshipDto[],
  ): Promise<UpsertInternationalTestAcademicTaxonomyRelationshipDto[]> {
    if (!this.academicTaxonomyRepository) {
      throw new Error('Canonical Academic Taxonomy repository is not configured');
    }

    const result: UpsertInternationalTestAcademicTaxonomyRelationshipDto[] = [];
    for (const relationship of relationships) {
      if (!relationship.taxonomyNodeId?.trim()) throw new Error('ACADEMIC_TAXONOMY_NODE_ID_REQUIRED');
      if (!relationship.relationshipType?.trim()) throw new Error('ACADEMIC_TAXONOMY_RELATIONSHIP_TYPE_REQUIRED');
      const node = await this.academicTaxonomyRepository.getNode(relationship.taxonomyNodeId);
      if (!node || node.status !== AcademicTaxonomyStatus.ACTIVE) {
        throw new Error(`Active canonical Academic Taxonomy node not found: ${relationship.taxonomyNodeId}`);
      }
      result.push({ ...relationship, taxonomyNodeId: node.nodeId, relationshipType: relationship.relationshipType.trim() });
    }
    return result;
  }

  private async canonicalizeDegrees(
    relationships: UpsertInternationalTestDegreeRelationshipReference[],
  ): Promise<UpsertInternationalTestDegreeRelationshipReference[]> {
    if (!this.degreeLevelRepository) throw new Error('Canonical DegreeLevel repository is not configured');

    const result: UpsertInternationalTestDegreeRelationshipReference[] = [];
    for (const relationship of relationships) {
      if (!relationship.degreeLevelId?.trim()) throw new Error('DEGREE_LEVEL_ID_REQUIRED');
      if (!relationship.relationshipType?.trim()) throw new Error('DEGREE_RELATIONSHIP_TYPE_REQUIRED');
      const degree = await this.degreeLevelRepository.getDegreeLevelById(relationship.degreeLevelId);
      if (!degree || degree.status !== 'ACTIVE') {
        throw new Error(`Active canonical DegreeLevel not found: ${relationship.degreeLevelId}`);
      }
      if (relationship.canonicalCode && relationship.canonicalCode !== degree.canonicalCode) {
        throw new Error('DEGREE_LEVEL_ID_CODE_MISMATCH');
      }
      result.push({
        ...relationship,
        degreeLevelId: degree.id,
        canonicalCode: degree.canonicalCode as CanonicalDegreeLevelCode,
        relationshipType: relationship.relationshipType.trim(),
      });
    }
    return result;
  }
}
