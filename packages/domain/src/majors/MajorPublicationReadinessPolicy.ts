import {
  PublicationReadinessIssue,
  PublicationReadinessPolicy
} from '../publication-readiness/PublicationReadiness';
import { MajorDto } from './majors';
import { MajorImportCompletenessState, MajorStatus } from './enums';
import { hasMajorSourceIdentity } from './majors';

export class MajorPublicationReadinessPolicy implements PublicationReadinessPolicy<MajorDto> {
  public readonly domain = 'MAJORS';

  public evaluate(entity: MajorDto) {
    const blockingIssues: PublicationReadinessIssue[] = [];
    const hasDegreeReference = Boolean(entity.profiles?.some(profile => profile.degreeLevelId));
    const hasTaxonomyReference = Boolean(
      entity.academicFieldId ||
      entity.disciplineId ||
      entity.profiles?.some(profile => profile.academicFieldId || profile.disciplineId) ||
      entity.classificationMappings?.some(mapping => mapping.taxonomyNodeId)
    );
    const hasProfileScopedReadiness = Boolean(entity.profiles?.some(profile => {
      if (!profile.degreeLevelId) return false;
      const profileTaxonomy = Boolean(
        profile.academicFieldId ||
        profile.disciplineId ||
        profile.classificationMappings?.some(mapping => mapping.taxonomyNodeId)
      );
      const rootMappingForProfile = Boolean(
        profile.id &&
        entity.classificationMappings?.some(mapping => mapping.profileId === profile.id && mapping.taxonomyNodeId)
      );
      return profileTaxonomy || rootMappingForProfile;
    }));
    const hasSourceIdentity = hasMajorSourceIdentity(entity);

    if (entity.status !== MajorStatus.READY_TO_PUBLISH) {
      blockingIssues.push({ code: 'MAJOR_INVALID_PUBLICATION_STATUS', message: 'Major must be READY_TO_PUBLISH', field: 'status' });
    }
    if (entity.completenessStatus !== MajorImportCompletenessState.COMPLETE) {
      blockingIssues.push({ code: 'MAJOR_INCOMPLETE', message: 'Major completeness must be COMPLETE', field: 'completenessStatus' });
    }
    if (!entity.canonicalName?.trim() || !entity.canonicalDedupKey?.trim()) {
      blockingIssues.push({ code: 'MAJOR_CANONICAL_IDENTITY_MISSING', message: 'Canonical name and deduplication key are required' });
    }
    if (!hasDegreeReference) {
      blockingIssues.push({ code: 'MAJOR_CANONICAL_DEGREE_REFERENCE_MISSING', message: 'A canonical degree-level reference is required', field: 'profiles.degreeLevelId' });
    }
    if (!hasTaxonomyReference) {
      blockingIssues.push({ code: 'MAJOR_CANONICAL_TAXONOMY_REFERENCE_MISSING', message: 'A canonical taxonomy reference is required' });
    }
    if (!hasProfileScopedReadiness) {
      blockingIssues.push({
        code: 'MAJOR_PROFILE_SCOPED_PUBLICATION_REFERENCE_MISSING',
        message: 'A publishable MajorLevelProfile must carry both canonical DegreeLevel and taxonomy references',
        field: 'profiles',
      });
    }
    if (!hasSourceIdentity) {
      blockingIssues.push({ code: 'MAJOR_SOURCE_IDENTITY_MISSING', message: 'An import or official source identity is required' });
    }

    return { blockingIssues, warnings: [] };
  }
}
